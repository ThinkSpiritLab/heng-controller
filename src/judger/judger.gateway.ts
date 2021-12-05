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
    R_List_SendMessageQueue_Suf,
    R_List_JudgerLog_Suf,
    R_Hash_AllReport,
    R_Hash_AllToken,
    Token,
    CallRecordItem,
    SendMessageQueueItem,
    WsResRecordItem,
    R_List_ResQueue_Suf,
    R_Hash_UnusedToken,
    R_Hash_OnlineToken,
    R_Hash_DisabledToken,
    R_Hash_ClosedToken,
    R_Set_ProcessOwnWs_Suf,
    R_Hash_ProcessLife,
    R_Set_WsOwnTask_Suf
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
import { getIp } from "src/public/util/request";

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
        private readonly judgerPoolService: JudgerPoolService,
        private readonly judgeQueueService: JudgeQueueService
    ) {
        this.judgerConfig = this.configService.getConfig().judger;
    }

    init(): void {
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
            this.checkProcessPing();
        }, Math.random() * this.judgerConfig.processPingInterval);

        // 监听本进程 res 队列
        setTimeout(() => this.listenProcessRes(), 0);

        // 检测本进程评测机心跳
        setTimeout(() => {
            setInterval(
                () => this.checkJudgerPing(),
                this.judgerConfig.lifeCheckInterval
            );
            this.checkJudgerPing();
        }, Math.random() * this.judgerConfig.lifeCheckInterval);

        // Token GC
        setTimeout(() => {
            setInterval(
                () => this.tokenGC(),
                this.judgerConfig.tokenGcInterval
            );
            this.tokenGC();
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
        const ip = getIp(req);
        const token: string =
            new URL("http://example.com" + req.url ?? "").searchParams.get(
                "token"
            ) ?? "";
        const isPathCorrect =
            req.url &&
            req.url.split("?")[0] ===
                this.configService.getConfig().server.globalPrefix +
                    "/judger/websocket";
        const isTokenVaild = await this.checkTokenVaild(token, ip);
        if (!isPathCorrect || !isTokenVaild) {
            client.close();
            client.terminate();
            return;
        }

        // 评测机上线后处理
        try {
            await this.processPing();
            await this.redisService.client
                .multi()
                .hdel(R_Hash_UnusedToken, token)
                .hset(R_Hash_OnlineToken, token, Date.now())
                .sadd(process.pid + R_Set_ProcessOwnWs_Suf, token)
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
            await this.log(token, String(error));
            client.close();
            client.terminate();
            throw error;
        }
        await this.callControl(token, {
            statusReportInterval: this.judgerConfig.reportInterval
        });
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
     * 发送 close 请求到 redis 消息队列
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
            wsId + R_List_SendMessageQueue_Suf,
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
                R_Hash_AllToken,
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
            .hset(R_Hash_UnusedToken, token, Date.now())
            .exec();
        await this.log(token, e);
        return token;
    }

    async checkTokenVaild(token: string, ip: string): Promise<boolean> {
        if (
            !(await this.redisService.client.hexists(R_Hash_UnusedToken, token))
        ) {
            this.logger.warn(`token ${token} 不存在或已使用`);
            return false;
        } // 检测 token 未使用
        const tokenInfo = JSON.parse(
            (await this.redisService.client.hget(R_Hash_AllToken, token)) ?? ""
        ) as Token;
        if (tokenInfo.ip !== ip) {
            this.logger.warn(
                `token ${token} 被盗用，原 ip：${tokenInfo.ip}，现 ip：${ip}`
            );
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
            .hdel(R_Hash_OnlineToken, wsId)
            .hset(R_Hash_DisabledToken, wsId, Date.now())
            .exec();
        await this.judgerPoolService.logout(wsId);
    }

    /**
     * 通知评测机池添加评测机
     * @param wsId
     */
    async addJudger(wsId: string): Promise<void> {
        await this.log(wsId, "请求评测机池添加此评测机");
        const infoStr = await this.redisService.client.hget(
            R_Hash_AllToken,
            wsId
        );
        if (!infoStr) throw new Error("token 记录丢失");
        const judgerInfo: Token = JSON.parse(infoStr);
        await this.judgerPoolService.login(wsId, judgerInfo.maxTaskCount);
    }

    /**
     * 一次评测结束后通知评测机池释放算力
     * @param wsId
     * @param capacity
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
    /**
     * 进程心跳
     */
    private async processPing(): Promise<void> {
        await this.redisService.client.hset(
            R_Hash_ProcessLife,
            String(process.pid),
            Date.now()
        );
    }

    /**
     * 检测其他进程心跳
     */
    private async checkProcessPing(): Promise<void> {
        const ret = await this.redisService.client.hgetall(R_Hash_ProcessLife);
        for (const pid in ret) {
            if (
                Date.now() - parseInt(ret[pid]) >
                this.judgerConfig.processPingInterval +
                    this.judgerConfig.flexibleTime
            ) {
                const tokens = await this.redisService.client.smembers(
                    pid + R_Set_ProcessOwnWs_Suf
                );
                let mu = this.redisService.client.multi();
                for (const token of tokens) {
                    const e = "所属进程离线，被其他进程清理";
                    await this.forceDisconnect(token, e);
                    await this.removeJudger(token);
                    await this.releaseWsAllTask(token);
                    await this.log(token, e);
                    mu = mu
                        .hdel(R_Hash_OnlineToken, token)
                        .hdel(R_Hash_DisabledToken, token)
                        .hset(R_Hash_ClosedToken, token, Date.now());
                }
                mu.del(pid + R_Set_ProcessOwnWs_Suf)
                    .hdel(R_Hash_ProcessLife, pid)
                    .del(pid + R_List_ResQueue_Suf);
                await mu.exec();
            }
        }
    }

    /**
     * 监听本进程 RPC Res 消息队列
     */
    private async listenProcessRes(): Promise<void> {
        while (true) {
            try {
                const resTuple = await this.redisService.withClient(client =>
                    client.brpop(
                        process.pid + R_List_ResQueue_Suf,
                        this.judgerConfig.listenTimeoutSec
                    )
                );
                if (!resTuple) continue;
                const res: Response = JSON.parse(resTuple[1]);
                const record = this.callRecord.get(res.seq);
                if (!record) throw new Error("callRecord 记录丢失");
                record.cb(res.body);
            } catch (error) {
                this.logger.error(String(error));
            }
        }
    }

    /**
     * 检测本进程评测机心跳
     */
    private async checkJudgerPing(): Promise<void> {
        this.WsLifeRecord.forEach(async (value, token) => {
            if (
                Date.now() - value >
                this.judgerConfig.reportInterval +
                    this.judgerConfig.flexibleTime
            ) {
                await this.forceDisconnect(token, "长时间未发送心跳");
            }

            // 用于防范 wsOnClose 调用失败
            if (
                Date.now() - value >
                5 * this.judgerConfig.reportInterval +
                    this.judgerConfig.flexibleTime
            ) {
                await this.wsOnClose(
                    {} as WebSocket,
                    token,
                    1006,
                    "长时间未关闭，手动调用 wsOnClose"
                );
            }
        });
    }

    /**
     * 清理过期 token
     */
    private async tokenGC(): Promise<void> {
        const ret = {
            ...(await this.redisService.client.hgetall(R_Hash_UnusedToken)),
            ...(await this.redisService.client.hgetall(R_Hash_ClosedToken))
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
        while (ws && ws.readyState === WebSocket.OPEN) {
            try {
                const msgTuple = await this.redisService.withClient(client =>
                    client.brpop(
                        wsId + R_List_SendMessageQueue_Suf,
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
                this.logger.error(String(error));
            }
        }
    }

    /**
     * WebSocket message 事件处理函数
     * @param ws
     * @param wsId
     * @param msg
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
     * WebSocket close 事件处理函数
     * @param ws
     * @param wsId
     * @param code
     * @param reason
     */
    private async wsOnClose(
        ws: WebSocket,
        wsId: string,
        code: number,
        reason: string
    ): Promise<void> {
        await this.removeJudger(wsId);
        await this.releaseWsAllTask(wsId);
        let e = "评测机断开连接，原因：";
        if (reason) {
            e += reason;
        } else {
            if (code === 1000) {
                e += "无";
            } else {
                e += "评测机可能意外断开";
            }
        }
        await this.log(wsId, e);
        await this.redisService.client
            .multi()
            .hdel(R_Hash_OnlineToken, wsId)
            .hdel(R_Hash_DisabledToken, wsId)
            .hset(R_Hash_ClosedToken, wsId, Date.now())
            .srem(process.pid + R_Set_ProcessOwnWs_Suf, wsId)
            .exec();
        this.WsLifeRecord.delete(wsId);
    }

    /**
     * WebSocket error 事件处理函数
     * @param ws
     * @param wsId
     * @param e
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
            wsId + R_List_JudgerLog_Suf,
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
        const allTask = await this.redisService.client.smembers(
            wsId + R_Set_WsOwnTask_Suf
        );

        await Promise.all(
            allTask.map(taskId => this.judgeQueueService.push(taskId))
        );

        await this.redisService.client.del(wsId + R_Set_WsOwnTask_Suf);
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
            .hdel(R_Hash_AllToken, wsId)
            .hdel(R_Hash_AllReport, wsId)
            .del(wsId + R_List_SendMessageQueue_Suf)
            .del(wsId + R_List_JudgerLog_Suf)
            .hdel(R_Hash_UnusedToken, wsId)
            .hdel(R_Hash_OnlineToken, wsId)
            .hdel(R_Hash_DisabledToken, wsId)
            .hdel(R_Hash_ClosedToken, wsId)
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
<<<<<<< HEAD
                    } else reject(new Error("Empty Response"));
=======
                    } else {
                        reject(new Error("Empty Response"));
                    }
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
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
                wsId + R_List_SendMessageQueue_Suf,
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
            record.pid + R_List_ResQueue_Suf,
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
                        message: String(e)
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
