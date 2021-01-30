import { Logger } from "@nestjs/common";
import {
    OnGatewayConnection,
    OnGatewayInit,
    WebSocketGateway
} from "@nestjs/websockets";
import { RedisService } from "src/redis/redis.service";
import WebSocket from "ws";
import { IncomingMessage } from "http";
import { URL } from "url";
import { JudgerConfig } from "src/config/judger.config";
import { ConfigService } from "src/config/config-module/config.service";
import {
    SendMessageQueueSuf,
    JudgerLogSuf,
    AllReport,
    AllToken,
    Token,
    CallRecordItem,
    SendMessageQueueItem,
    WsResRecordItem,
    ResQueueSuf,
    UnusedToken,
    OnlineToken,
    DisabledToken,
    ClosedToken,
    ProcessOwnWsSuf,
    ProcessLife,
    WsOwnTaskSuf,
    WsTaskLockSuf
} from "./decl/judger.decl";
import {
    ControlArgs,
    ExitArgs,
    JudgeArgs,
    JudgerArgs,
    JudgerMethod,
    Request,
    Response,
    ControllerMethod,
    ControllerArgs,
    LogArgs,
    ReportStatusArgs,
    UpdateJudgesArgs,
    FinishJudgesArgs
} from "./decl/ws";
import moment from "moment";
import * as crypto from "crypto";
import { ErrorInfo } from "./decl/http";
import { setInterval } from "timers";

@WebSocketGateway(undefined, {
    // 此处 path 不生效！检测 path 加在 handleConnection 里面
    path: "/judger/websocket"
})
export class JudgerGateway implements OnGatewayInit, OnGatewayConnection {
    private readonly logger = new Logger("Gateway");
    private readonly judgerConfig: JudgerConfig;
    private readonly callRecord = new Map<number, CallRecordItem>();
    private readonly wsRepRecord = new Map<string, WsResRecordItem>();
    private readonly methods = new Map<
        ControllerMethod,
        (ws: WebSocket, wsId: string, args: any) => Promise<unknown>
    >();
    private readonly WsLifeRecord = new Map<string, number>();

    private callSeq = 0;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.judgerConfig = this.configService.getConfig().judger;

        this.methods.set(
            "Log",
            async (
                ws: WebSocket,
                wsId: string,
                { level, code, message }: LogArgs
            ) => {
                await this.log(
                    wsId,
                    `level:${level}，code: ${code}，message: ${message}`
                );
            }
        );

        this.methods.set(
            "Exit",
            async (
                ws: WebSocket,
                wsId: string,
                { reboot, rebootDelay, reason }: ExitArgs
            ) => {
                await this.removeJudger(wsId);
                await this.log(
                    wsId,
                    `主动请求下线，reboot：${reboot}，rebootDelay：${rebootDelay ??
                        "无"}，reason：${reason ?? "无"}`
                );
            }
        );

        this.methods.set(
            "ReportStatus",
            async (ws: WebSocket, wsId: string, args: ReportStatusArgs) => {
                await this.redisService.client.hset(
                    AllReport,
                    wsId,
                    JSON.stringify(args)
                );
                this.WsLifeRecord.set(wsId, Date.now());
            }
        );

        this.methods.set(
            "UpdateJudges",
            async (ws: WebSocket, wsId: string, args: UpdateJudgesArgs) => {
                let mu = this.redisService.client.multi();
                args.forEach(({ id }) => {
                    mu = mu.sismember(wsId + WsOwnTaskSuf, id);
                });
                const ret: number[] = (await mu.exec()).map(value => value[1]);
                const vaildResult = args.filter(({}, index) => ret[index]);
                // FIXME 留作 DEBUG，一般出现此错误说明有 BUG
                if (args.length > vaildResult.length)
                    this.log(
                        wsId,
                        `回报无效任务状态 ${args.length -
                            vaildResult.length} 个`
                    );
                // TODO 通知外部系统
            }
        );

        this.methods.set(
            "FinishJudges",
            async (ws: WebSocket, wsId: string, args: FinishJudgesArgs) => {
                let mu = this.redisService.client.multi();
                args.forEach(({ id }) => {
                    mu = mu.sismember(wsId + WsOwnTaskSuf, id);
                });
                const ret: number[] = (await mu.exec()).map(value => value[1]);
                const vaildResult = args.filter(({}, index) => ret[index]);
                // FIXME 留作 DEBUG，一般出现此错误说明有 BUG
                if (args.length > vaildResult.length)
                    this.log(
                        wsId,
                        `回报无效任务结果 ${args.length -
                            vaildResult.length} 个`
                    );

                // TODO 通知外部系统

                mu = this.redisService.client.multi();
                for (const { id } of vaildResult) {
                    mu = mu.srem(wsId + WsOwnTaskSuf, id);
                }
                await mu.exec();
                await this.releaseJudger(wsId, vaildResult.length);
            }
        );

        // 定期注册本进程心跳
        setInterval(async () => {
            await this.redisService.client.hset(
                ProcessLife,
                String(process.pid),
                Date.now()
            );
        }, this.judgerConfig.processPingInterval);

        // 监听本进程 res 队列
        setTimeout(async () => {
            while (true) {
                try {
                    const resTuple = await this.redisService.withClient(
                        async client =>
                            await client.brpop(
                                process.pid + ResQueueSuf,
                                this.judgerConfig.listenTimeoutSec
                            )
                    );
                    if (!resTuple) continue;
                    const res: Response = JSON.parse(resTuple[1]);
                    const record = this.callRecord.get(res.seq);
                    if (!record) throw new Error("callRecord 记录丢失");
                    record.cb(res.body);
                } catch (error) {
                    this.logger.error(error.message);
                }
            }
        }, 0);

        // 检测本进程评测机心跳
        setTimeout(() => {
            setInterval(async () => {
                this.WsLifeRecord.forEach(async (value, token) => {
                    if (
                        Date.now() - value >
                        this.judgerConfig.reportInterval +
                            this.judgerConfig.flexibleTime
                    ) {
                        await this.forceDisconnect(token, "长时间未发生心跳");
                    }
                });
            }, this.judgerConfig.lifeCheckInterval);
        }, Math.random() * this.judgerConfig.lifeCheckInterval);

        // Token GC
        setTimeout(() => {
            setInterval(async () => {
                const ret = {
                    ...(await this.redisService.client.hgetall(UnusedToken)),
                    ...(await this.redisService.client.hgetall(ClosedToken))
                };
                for (const token in ret) {
                    if (
                        Date.now() - parseInt(ret[token]) >
                        this.judgerConfig.tokenGcExpire +
                            this.judgerConfig.flexibleTime
                    ) {
                        await this.cleanToken(token);
                    }
                }
            }, this.judgerConfig.tokenGcInterval);
        }, Math.random() * this.judgerConfig.tokenGcInterval);

        // 其他进程存活检测
        setTimeout(() => {
            setInterval(async () => {
                const ret = await this.redisService.client.hgetall(ProcessLife);
                for (const pid in ret) {
                    if (
                        Date.now() - parseInt(ret[pid]) >
                        this.judgerConfig.processPingInterval +
                            this.judgerConfig.flexibleTime
                    ) {
                        const tokens = await this.redisService.client.smembers(
                            pid + ProcessOwnWsSuf
                        );
                        let mu = this.redisService.client.multi();
                        for (const token of tokens) {
                            await this.removeJudger(token);
                            await this.releaseWsAllTask(token);
                            mu = mu
                                .hdel(OnlineToken, token)
                                .hdel(DisabledToken, token)
                                .hset(ClosedToken, token, Date.now());
                        }
                        mu.del(pid + ProcessOwnWsSuf)
                            .hdel(ProcessLife, pid)
                            .del(pid + ResQueueSuf);
                        await mu.exec();
                    }
                }
            }, this.judgerConfig.processCheckInterval);
        }, Math.random() * this.judgerConfig.processPingInterval);
    }

    async afterInit(server: WebSocket.Server): Promise<void> {
        this.logger.log("WebSocket 网关已启动");
    }

    async handleConnection(
        client: WebSocket,
        req: IncomingMessage
    ): Promise<void> {
        // 检查 path 和 token 合法性
        const ip = String(req.headers["x-forwarded-for"] ?? "unknown").split(
            ","
        )[0];
        const token: string =
            new URL("http://example.com" + req.url ?? "").searchParams.get(
                "token"
            ) ?? "";
        if (
            !req.url ||
            !req.url.startsWith(this.judgerConfig.webSocketPath) ||
            !(await this.checkToken(token, ip))
        ) {
            client.close();
            client.terminate();
            return;
        }

        // 评测机上线后处理
        try {
            await this.redisService.client
                .multi()
                .hdel(UnusedToken, token)
                .hset(OnlineToken, token, Date.now())
                .sadd(process.pid + ProcessOwnWsSuf, token)
                .exec();
            this.WsLifeRecord.set(token, Date.now());
            client.on("message", this.getSolveMessage(client, token));
            client.on("close", this.getSolveClose(client, token));
            client.on("error", this.getSolveError(client, token));

            setTimeout(this.getListenMessageQueue(client, token), 0);
            await this.log(token, `上线，pid：${process.pid}`);
        } catch (error) {
            await this.log(token, error.message);
            client.close();
            client.terminate();
            throw error;
        }
        await this.callControl(token, {
            statusReportInterval: this.judgerConfig.reportInterval
        });

        // FIXME 粗暴的压测
        // const timer = setInterval(() => {
        //     if (client.readyState === WebSocket.OPEN) {
        //         this.distributeTask(
        //             token,
        //             Math.random()
        //                 .toString(35)
        //                 .slice(2)
        //         );
        //     } else {
        //         clearInterval(timer);
        //     }
        // }, 10);
    }

    // 目前未使用
    // handleDisconnect(client: WebSocket): void {
    // ...
    // }

    //------------------------ws/评测机连接 [可调用]-------------------------------
    /**
     * 发送 JudgeRequestMessage 到 redis 消息队列
     * @param wsId
     * @param taskId
     * @param transId
     */
    async callJudge(wsId: string, taskId: string): Promise<void> {
        const judgeInfo: JudgeArgs = await this.getJudgeRequestInfo(taskId);
        await this.call(wsId, {
            method: "Judge",
            args: judgeInfo
        });
    }

    /**
     * 发送控制消息
     * @param wsId
     * @param reportInterval
     */
    async callControl(wsId: string, args: ControlArgs): Promise<void> {
        await this.call(wsId, {
            method: "Control",
            args: args
        });
    }

    /**
     * 要求评测机下线
     * @param wsId
     * @param args
     */
    async callExit(wsId: string, args: ExitArgs): Promise<void> {
        await this.call(wsId, {
            method: "Exit",
            args: args
        });
        await this.removeJudger(wsId);
        const e = `控制端请求评测机下线，原因：${args.reason ?? "无"}`;
        await this.log(wsId, e);
    }

    /**
     * 控制端主动与评测机断连
     * 发生 close 请求到 redis 消息队列
     * @param wsId
     * @param code
     * @param reason
     * @param expectedRecoveryTime
     */
    async forceDisconnect(wsId: string, reason: string): Promise<void> {
        await this.removeJudger(wsId);
        const msg: SendMessageQueueItem = {
            pid: process.pid,
            closeReason: reason
            // req : undefined
        } as SendMessageQueueItem;
        await this.redisService.client.lpush(
            wsId + SendMessageQueueSuf,
            JSON.stringify(msg)
        );
        const e = `控制端强制断开连接，原因：${reason}`;
        await this.log(wsId, e);
    }

    //---------------------------外部交互[请填充]--------------------------
    /**
     * 外部交互 please fill this
     * 获取 redis 中某任务的详细信息
     * @param taskId
     */
    private async getJudgeRequestInfo(taskId: string): Promise<JudgeArgs> {
        const infoStr = await this.redisService.client.hget(
            // FIXME 设置键名
            "keyName_judgeInfo",
            taskId
        );
        if (!infoStr) throw new Error(`taskId: ${taskId} 找不到 JudgeInfo`);
        const info: JudgeArgs = JSON.parse(infoStr);
        return info;
    }

    //---------------------------与评测机池交互[请填充]----------------------
    // TODO
    /**
     * 为评测机分配任务
     * @param wsId
     * @param taskId
     */
    async distributeTask(wsId: string, taskId: string): Promise<void> {
        if (!(await this.redisService.client.hexists(OnlineToken, wsId))) {
            throw new Error("Judger 不可用");
        }
        await this.redisService.client.sadd(wsId + WsOwnTaskSuf, taskId);
        await this.callJudge(wsId, taskId).catch(async e => {
            await this.redisService.client.srem(wsId + WsOwnTaskSuf, taskId);
            throw e;
        });
    }

    /**
     * 通知评测机池移除评测机
     * 评测机池 please fill this
     * @param wsId
     */
    private async removeJudger(wsId: string): Promise<void> {
        await this.log(wsId, "已请求评测机池移除此评测机");
        await this.redisService.client
            .multi()
            .hdel(OnlineToken, wsId)
            .hset(DisabledToken, wsId, Date.now())
            .exec();
        // await this.poolService.removeJudger(wsId);
    }

    /**
     * 通知评测机池添加评测机
     * 评测机池 please fill this
     * @param wsId
     */
    private async addJudger(wsId: string): Promise<void> {
        await this.log(wsId, "已请求评测机池添加此评测机");
        const infoStr = await this.redisService.client.hget(AllToken, wsId);
        if (!infoStr) throw new Error("token 记录丢失");
        const judgerInfo: Token = JSON.parse(infoStr);
        // await this.poolService.addJudger(wsId, judgerInfo.maxTaskCount);
    }

    /**
     * 一次评测结束后通知评测机池释放算力
     * 评测机池 please fill this
     * @param wsId
     */
    private async releaseJudger(wsId: string, capacity: number): Promise<void> {
        this.logger.debug(
            `已请求评测机池释放评测机 ${
                wsId.split(".")[0]
            } 的 ${capacity} 份算力`
        );
        //......
    }

    //---------------------------token------------------------------------
    async getToken(
        maxTaskCount: number,
        coreCount: number,
        name: string,
        software: string,
        ip: string
    ): Promise<string> {
        const token =
            name +
            "." +
            crypto
                .createHmac("sha256", String(Date.now()))
                .update(maxTaskCount + coreCount + name + software + ip)
                .digest("hex");
        const e = `ip: ${ip}，获取了 token`;
        await this.redisService.client
            .multi()
            .hset(
                AllToken,
                token,
                JSON.stringify({
                    maxTaskCount,
                    coreCount,
                    name,
                    software,
                    ip,
                    createTime: moment().format("YYYY-MM-DDTHH:mm:ssZ")
                } as Token)
            )
            .hset(UnusedToken, token, Date.now())
            .exec();
        await this.log(token, e);
        return token;
    }

    async checkToken(token: string, ip: string): Promise<boolean> {
        if (!(await this.redisService.client.hexists(UnusedToken, token))) {
            this.logger.warn(`token ${token} 不存在或已使用`);
            return false;
        } // 检测 token 未使用
        const tokenInfo = JSON.parse(
            (await this.redisService.client.hget(AllToken, token)) ?? ""
        ) as Token;
        if (tokenInfo.ip !== ip) {
            this.logger.warn(`token ${token} 被盗用`);
            return false;
        } // 检测 ip 是否相同
        if (
            Date.parse(tokenInfo.createTime) + this.judgerConfig.tokenExpire <
            Date.now()
        ) {
            this.logger.warn(`token ${token} 已过期`);
            return false;
        } // 检测 token 有效期
        return true;
    }

    //----------------------------WebSocket-------------------------------
    /**
     * 监听消息队列
     * @param ws
     * @param wsId
     */
    getListenMessageQueue(ws: WebSocket, wsId: string): () => Promise<void> {
        return async (): Promise<void> => {
            let wsSeq = 0;
            while (ws && ws.readyState <= WebSocket.OPEN) {
                try {
                    const msgTuple = await this.redisService.withClient(
                        async client =>
                            await client.brpop(
                                wsId + SendMessageQueueSuf,
                                this.judgerConfig.listenTimeoutSec
                            )
                    );
                    if (!msgTuple) continue;
                    const msg: SendMessageQueueItem = JSON.parse(msgTuple[1]);
                    if (msg.closeReason) {
                        ws.close(1000, msg.closeReason);
                        continue;
                    }
                    const seq = (wsSeq = wsSeq + 1);
                    this.wsRepRecord.set(wsId + seq, {
                        pid: msg.pid,
                        seq: msg.req.seq
                    });
                    msg.req.seq = seq;
                    setTimeout(() => {
                        this.wsRepRecord.delete(wsId + seq);
                    }, 10000);
                    ws.send(JSON.stringify(msg.req));
                } catch (error) {
                    this.logger.error(error.message);
                }
            }
        };
    }

    /**
     * 获取处理 message 事件的函数
     * @param ws
     * @param wsId
     */
    private getSolveMessage(
        ws: WebSocket,
        wsId: string
    ): (msg: string) => Promise<void> {
        return async (msg: string): Promise<void> => {
            let wsMsg: Response | Request<ControllerMethod, ControllerArgs>;
            // try catch 可考虑移除
            try {
                wsMsg = JSON.parse(msg);
            } catch (error) {
                const e = "解析 message 的 JSON 出错";
                await this.log(wsId, e);
                throw new Error(e);
            }
            if (wsMsg.type === "res") {
                const record = this.wsRepRecord.get(wsId + wsMsg.seq);
                if (!record) {
                    const e = "wsMsgRecord 记录不存在";
                    await this.log(wsId, e);
                    throw new Error(e);
                }
                wsMsg.seq = record.seq;
                await this.redisService.client.lpush(
                    record.pid + ResQueueSuf,
                    JSON.stringify(wsMsg)
                );
            } else if (wsMsg.type === "req") {
                const fun = this.methods.get(wsMsg.body.method);
                let error: ErrorInfo | undefined = undefined;
                let output: unknown;
                if (!fun) {
                    error = {
                        code: 400,
                        message: "error method"
                    };
                } else {
                    try {
                        output = (await fun(ws, wsId, wsMsg.body.args)) ?? null;
                    } catch (e) {
                        error = {
                            code: 500,
                            message: e.message
                        };
                    }
                }
                const res: Response = {
                    type: "res",
                    time: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
                    seq: wsMsg.seq,
                    body: { output: null }
                };
                if (error !== undefined) {
                    res.body = { error };
                } else {
                    res.body = { output };
                }
                ws.send(JSON.stringify(res));
            }
        };
    }

    /**
     * 获取处理 close 事件的函数
     * @param ws
     * @param wsId
     */
    private getSolveClose(
        ws: WebSocket,
        wsId: string
    ): (code: number, reason: string) => Promise<void> {
        return async (code: number, reason: string): Promise<void> => {
            await this.removeJudger(wsId);
            await this.releaseWsAllTask(wsId);
            const e = `评测机断开连接，原因：${
                reason === ""
                    ? code === 1000
                        ? "无"
                        : "评测机可能意外断开"
                    : reason
            }`;
            await this.log(wsId, e);
            await this.redisService.client
                .multi()
                .hdel(OnlineToken, wsId)
                .hdel(DisabledToken, wsId)
                .hset(ClosedToken, wsId, Date.now())
                .srem(process.pid + ProcessOwnWsSuf, wsId)
                .exec();
            this.WsLifeRecord.delete(wsId);
        };
    }

    /**
     * 获取处理 error 事件的函数
     * @param ws
     * @param wsId
     */
    private getSolveError(
        ws: WebSocket,
        wsId: string
    ): (e: Error) => Promise<void> {
        return async (e: Error): Promise<void> => {
            const emsg = `触发 WebSocket 的 error 事件：${e}`;
            await this.removeJudger(wsId);
            await this.forceDisconnect(wsId, emsg);
            await this.log(wsId, emsg);
        };
    }

    /**
     * 用于记录评测机的各种 log
     * msg 不需要携带 wsId 和时间
     * @param wsId
     * @param msg
     */
    private async log(wsId: string, msg: string): Promise<void> {
        await this.redisService.client.lpush(
            wsId + JudgerLogSuf,
            `${moment().format("YYYY-MM-DDTHH:mm:ssZ")} ${msg}`
        );
        this.logger.warn(`评测机 ${wsId.split(".")[0]}: ${msg}`);
    }

    /**
     * 重新分配评测机的所有任务
     * 仅用于评测机已经失效的情况下
     * @param wsId
     */
    private async releaseWsAllTask(wsId: string) {
        const ret = await this.redisService.client
            .multi()
            .get(wsId + WsTaskLockSuf)
            .smembers(wsId + WsOwnTaskSuf)
            .setex(wsId + WsTaskLockSuf, 2, process.pid)
            .exec();
        if (ret[0][1] !== null) return;
        const allTask: string[] = ret[1][1];
        let mu = this.redisService.client.multi();

        // FIXME 设置任务队列键名
        allTask.forEach(taskId => (mu = mu.lpush("taskQueue_keyName", taskId)));

        await mu.exec();
        await this.redisService.client.del(wsId + WsOwnTaskSuf);
        this.log(wsId, `重新分配 ${allTask.length} 个任务`);
    }

    /**
     * 清理 redis 中的记录
     * @param wsId
     */
    private async cleanToken(wsId: string): Promise<void> {
        await this.releaseWsAllTask(wsId);
        await this.redisService.client
            .multi()
            .hdel(AllToken, wsId)
            .hdel(AllReport, wsId)
            .del(wsId + SendMessageQueueSuf)
            .del(wsId + JudgerLogSuf)
            .hdel(UnusedToken, wsId)
            .hdel(OnlineToken, wsId)
            .hdel(DisabledToken, wsId)
            .hdel(ClosedToken, wsId)
            .exec();
        this.WsLifeRecord.delete(wsId);
    }

    call(
        wsId: string,
        body: { method: JudgerMethod; args: JudgerArgs }
    ): Promise<unknown> {
        return new Promise<unknown>((resolve, reject) => {
            const seq = (this.callSeq = this.callSeq + 1);
            const c: CallRecordItem = {
                cb: (body: { output?: unknown; error?: ErrorInfo }) => {
                    if (body.error) {
                        reject(
                            new Error(
                                `code: ${body.error.code}, message: ${body.error.message}`
                            )
                        );
                    }
                    if (body.output !== undefined) {
                        resolve(body.output);
                    }
                    reject(new Error("Empty Response"));
                    const ctx = this.callRecord.get(seq);
                    if (ctx) clearTimeout(ctx.timer);
                    this.callRecord.delete(seq);
                },
                timer: setTimeout(() => {
                    reject(new Error("Timeout"));
                    this.callRecord.delete(seq);
                }, this.judgerConfig.rpcTimeout)
            };
            this.callRecord.set(seq, c);
            const req: Request<JudgerMethod, JudgerArgs> = {
                type: "req",
                time: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
                seq: seq,
                body: body
            };
            const reqMsg: SendMessageQueueItem = {
                pid: process.pid,
                req: req
            };
            this.redisService.client.lpush(
                wsId + SendMessageQueueSuf,
                JSON.stringify(reqMsg)
            );
        });
    }
}
