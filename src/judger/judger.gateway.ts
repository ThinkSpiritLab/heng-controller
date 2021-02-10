import { forwardRef, Inject, Logger } from "@nestjs/common";
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
} from "./judger.decl";
import {
    ControlArgs,
    ExitArgs,
    CreateJudgeArgs,
    JudgerArgs,
    JudgerMethod,
    Request,
    Response,
    LogArgs,
    ReportStatusArgs,
    UpdateJudgesArgs,
    FinishJudgesArgs,
    ControllerRequest
} from "heng-protocol/internal-protocol/ws";
import moment from "moment";
import * as crypto from "crypto";
import { ErrorInfo } from "heng-protocol/internal-protocol/http";
import { setInterval } from "timers";
import { JudgerService } from "./judger.service";
import { JudgerPoolService } from "src/scheduler/judger-pool/judger-pool.service";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";

@WebSocketGateway()
export class JudgerGateway implements OnGatewayInit, OnGatewayConnection {
    private readonly logger = new Logger("Gateway");
    private readonly judgerConfig: JudgerConfig;
    private readonly callRecord = new Map<number, CallRecordItem>();
    private readonly wsRepRecord = new Map<string, WsResRecordItem>();
    readonly WsLifeRecord = new Map<string, number>();

    private callSeq = 0;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => JudgerService))
        private readonly judgerService: JudgerService,
        private readonly judgerPoolService: JudgerPoolService
    ) {
        this.judgerConfig = this.configService.getConfig().judger;

        // 定期注册本进程心跳
        setInterval(
            () => this.processPing(),
            this.judgerConfig.processPingInterval
        );

        // 其他进程存活检测
        setTimeout(() => {
            setInterval(
                () => this.checkProcessPing(),
                this.judgerConfig.processCheckInterval
            );
        }, Math.random() * this.judgerConfig.processPingInterval);

        // 监听本进程 res 队列
        setTimeout(() => this.listenProcessRes(), 0);

        // 检测本进程评测机心跳
        setTimeout(() => {
            setInterval(
                () => this.checkJudgerPing(),
                this.judgerConfig.lifeCheckInterval
            );
        }, Math.random() * this.judgerConfig.lifeCheckInterval);

        // Token GC
        setTimeout(() => {
            setInterval(
                () => this.tokenGC(),
                this.judgerConfig.tokenGcInterval
            );
        }, Math.random() * this.judgerConfig.tokenGcInterval);
    }

    async afterInit(): Promise<void> {
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
        const isPathCorrect =
            req.url && req.url.split("?")[0] === "/v1/judger/websocket";
        const isTokenVaild = await this.checkTokenVaild(token, ip);
        if (!isPathCorrect || !isTokenVaild) {
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

            client.on("message", msg => this.wsOnMessage(client, token, msg));
            client.on("close", (code: number, reason: string) =>
                this.wsOnClose(client, token, code, reason)
            );
            client.on("error", e => this.wsOnError(client, token, e));

            this.listenMessageQueue(client, token);

            await this.addJudger(token);

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
        //         this.judgerService
        //             .distributeTask(
        //                 token,
        //                 Math.random()
        //                     .toString(35)
        //                     .slice(2)
        //             )
        //             .catch(() => {
        //                 clearInterval(timer);
        //             });
        //     } else {
        //         clearInterval(timer);
        //     }
        // }, 10);
    }

    //------------------------ws/评测机连接-----------------------------------
    /**
     * 发送 JudgeRequestMessage 到 redis 消息队列
     * @param wsId
     * @param taskId
     */
    async callJudge(wsId: string, taskId: string): Promise<void> {
        const judgeInfo: CreateJudgeArgs = await this.judgerService.getJudgeRequestInfo(
            taskId
        );
        await this.call(wsId, {
            method: "CreateJudge",
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
     * @param reason
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

    //---------------------------------token------------------------------
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

    async checkTokenVaild(token: string, ip: string): Promise<boolean> {
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

    //---------------------------与评测机池交互-----------------------------
    /**
     * 通知评测机池移除评测机
     * 可重复调用
     * @param wsId
     */
    async removeJudger(wsId: string): Promise<void> {
        await this.log(wsId, "请求评测机池移除此评测机");
        await this.redisService.client
            .multi()
            .hdel(OnlineToken, wsId)
            .hset(DisabledToken, wsId, Date.now())
            .exec();
        await this.judgerPoolService.logout(wsId);
    }

    /**
     * 通知评测机池添加评测机
     * 评测机池 please fill this
     * @param wsId
     */
    async addJudger(wsId: string): Promise<void> {
        await this.log(wsId, "请求评测机池添加此评测机");
        const infoStr = await this.redisService.client.hget(AllToken, wsId);
        if (!infoStr) throw new Error("token 记录丢失");
        const judgerInfo: Token = JSON.parse(infoStr);
        await this.judgerPoolService.login(wsId, judgerInfo.maxTaskCount);
    }

    /**
     * 一次评测结束后通知评测机池释放算力
     * 评测机池 please fill this
     * @param wsId
     */
    async releaseJudger(wsId: string, capacity: number): Promise<void> {
        this.logger.debug(
            `已请求评测机池释放评测机 ${
                wsId.split(".")[0]
            } 的 ${capacity} 份算力`
        );
        await this.judgerPoolService.releaseToken(wsId, capacity);
    }
    //----------------------------WebSocket/Basic--------------------------
    private async processPing(): Promise<void> {
        await this.redisService.client.hset(
            ProcessLife,
            String(process.pid),
            Date.now()
        );
    }

    private async checkProcessPing(): Promise<void> {
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
                    await this.log(token, "所属进程离线，被其他进程清理");
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
    }

    private async listenProcessRes(): Promise<void> {
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
    }

    private async checkJudgerPing(): Promise<void> {
        this.WsLifeRecord.forEach(async (value, token) => {
            if (
                Date.now() - value >
                this.judgerConfig.reportInterval +
                    this.judgerConfig.flexibleTime
            ) {
                await this.forceDisconnect(token, "长时间未发生心跳");
            }
        });
    }

    private async tokenGC(): Promise<void> {
        const ret = {
            ...(await this.redisService.client.hgetall(UnusedToken)),
            ...(await this.redisService.client.hgetall(ClosedToken))
        };
        for (const token in ret) {
            if (
                Date.now() - parseInt(ret[token]) >
                this.judgerConfig.tokenGcExpire + this.judgerConfig.flexibleTime
            ) {
                await this.cleanToken(token);
            }
        }
    }

    /**
     * 监听消息队列
     * @param ws
     * @param wsId
     */
    private async listenMessageQueue(
        ws: WebSocket,
        wsId: string
    ): Promise<void> {
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
                if (msg.closeReason !== undefined) {
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
    }

    /**
     * 获取处理 message 事件的函数
     * @param ws
     * @param wsId
     */
    private async wsOnMessage(
        ws: WebSocket,
        wsId: string,
        msg: WebSocket.Data
    ): Promise<void> {
        if (typeof msg !== "string") return;
        let wsMsg: Response | ControllerRequest;
        // try catch 可考虑移除
        try {
            wsMsg = JSON.parse(msg);
        } catch (error) {
            const e = "解析 message 的 JSON 出错";
            await this.log(wsId, e);
            throw new Error(e);
        }
        if (wsMsg.type === "res") {
            await this.handleJudgerResponse(ws, wsId, wsMsg);
        } else if (wsMsg.type === "req") {
            await this.handleJudgerRequest(ws, wsId, wsMsg);
        }
    }

    /**
     * 获取处理 close 事件的函数
     * @param ws
     * @param wsId
     */
    private async wsOnClose(
        ws: WebSocket,
        wsId: string,
        code: number,
        reason: string
    ): Promise<void> {
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
    }

    /**
     * 获取处理 error 事件的函数
     * @param ws
     * @param wsId
     */
    private async wsOnError(
        ws: WebSocket,
        wsId: string,
        e: Error
    ): Promise<void> {
        const emsg = `触发 WebSocket 的 error 事件：${e}`;
        await this.removeJudger(wsId);
        await this.forceDisconnect(wsId, emsg);
        await this.log(wsId, emsg);
    }

    /**
     * 用于记录评测机的各种 log
     * msg 不需要携带 wsId 和时间
     * @param wsId
     * @param msg
     */
    async log(wsId: string, msg: string): Promise<void> {
        await this.redisService.client.lpush(
            wsId + JudgerLogSuf,
            `${moment().format("YYYY-MM-DDTHH:mm:ssZ")} ${msg}`
        );
        this.logger.warn(`评测机 ${wsId.split(".")[0]}: ${msg}`);
    }

    /**
     * 重新分配评测机的所有任务
     * 仅用于评测机已经失效的情况下
     * 可重复调用
     * @param wsId
     */
    private async releaseWsAllTask(wsId: string): Promise<void> {
        const ret = await this.redisService.client
            .multi()
            .get(wsId + WsTaskLockSuf)
            .smembers(wsId + WsOwnTaskSuf)
            .setex(wsId + WsTaskLockSuf, 2, process.pid)
            .exec();
        if (ret[0][1] !== null) throw new Error("其他进程正在清理");
        const allTask: string[] = ret[1][1];

        // 可选 JudgeQueueService.push，但是没有 multi
        let mu = this.redisService.client.multi();
        allTask.forEach(
            taskId => (mu = mu.lpush(JudgeQueueService.pendingQueue, taskId))
        );
        await mu.exec();

        await this.redisService.client.del(wsId + WsOwnTaskSuf);
        this.log(wsId, `重新分配了 ${allTask.length} 个任务`);
    }

    /**
     * 清理 redis 中评测机的记录
     * 可重复调用
     * @param wsId
     */
    async cleanToken(wsId: string): Promise<void> {
        await this.forceDisconnect(wsId, "清理 token");
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

    /**
     * RPC 基础
     * @param wsId
     * @param body
     */
    private call(
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

    /**
     * 处理评测机发过来的 Response
     * @param ws
     * @param wsId
     * @param res
     */
    private async handleJudgerResponse(
        ws: WebSocket,
        wsId: string,
        res: Response
    ): Promise<void> {
        const record = this.wsRepRecord.get(wsId + res.seq);
        if (!record) {
            const e = "wsMsgRecord 记录不存在";
            await this.log(wsId, e);
            throw new Error(e);
        }
        res.seq = record.seq;
        await this.redisService.client.lpush(
            record.pid + ResQueueSuf,
            JSON.stringify(res)
        );
    }

    /**
     * 处理评测机发过来的 Request
     * @param ws
     * @param wsId
     * @param req
     */
    private async handleJudgerRequest(
        ws: WebSocket,
        wsId: string,
        req: ControllerRequest
    ): Promise<void> {
        const buildRes = <R>(body: Response<R>["body"]): Response<R> => ({
            type: "res",
            time: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
            seq: req.seq,
            body
        });
        const reply = async <R>(f: () => Promise<R>): Promise<void> => {
            let res;
            try {
                res = buildRes({ output: (await f()) ?? null });
            } catch (e) {
                res = buildRes({
                    error: {
                        code: 500,
                        message: e.message
                    }
                });
            }
            ws.send(JSON.stringify(res));
        };

        if (req.body.method === "Exit") {
            const args: ExitArgs = req.body.args;
            await reply(() => this.judgerService.solveExit(ws, wsId, args));
        } else if (req.body.method === "Log") {
            const args: LogArgs = req.body.args;
            await reply(() => this.judgerService.solveLog(ws, wsId, args));
        } else if (req.body.method === "ReportStatus") {
            const args: ReportStatusArgs = req.body.args;
            await reply(() =>
                this.judgerService.solveReportStatus(ws, wsId, args)
            );
        } else if (req.body.method === "UpdateJudges") {
            const args: UpdateJudgesArgs = req.body.args;
            await reply(() =>
                this.judgerService.solveUpdateJudges(ws, wsId, args)
            );
        } else if (req.body.method === "FinishJudges") {
            const args: FinishJudgesArgs = req.body.args;
            await reply(() =>
                this.judgerService.solveFinishJudges(ws, wsId, args)
            );
        } else {
            const res = buildRes({
                error: {
                    code: 400,
                    message: "error method"
                }
            });
            ws.send(JSON.stringify(res));
        }
    }
}
