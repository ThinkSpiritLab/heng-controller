import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { JudgerConfig } from "src/config/judger.config";
import { ConfigService } from "src/config/config-module/config.service";
import {
    ExitArgs,
    FinishJudgesArgs,
    CreateJudgeArgs,
    LogArgs,
    ReportStatusArgs,
    UpdateJudgesArgs
} from "heng-protocol/internal-protocol/ws";
import { JudgerGateway } from "./judger.gateway";
import {
    R_Hash_AllReport,
    R_Hash_ClosedToken,
    R_Hash_DisabledToken,
    R_Hash_OnlineToken,
    R_Hash_UnusedToken,
    R_Set_WsOwnTask_Suf,
    TokenStatus
} from "./judger.decl";
import WebSocket from "ws";
<<<<<<< HEAD
import { ExternalModuleService } from "src/external-module/external-module.service";
=======
import { ExternalService } from "src/external/external.service";
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
@Injectable()
export class JudgerService {
    private logger = new Logger("JudgerService");
    private readonly judgerConfig: JudgerConfig;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => JudgerGateway))
        private readonly judgerGateway: JudgerGateway,
<<<<<<< HEAD
        private readonly externalmoduleService: ExternalModuleService
=======
        private readonly externalmoduleService: ExternalService
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
    ) {
        this.judgerConfig = this.configService.getConfig().judger;
    }

    async getTokenStatusDic(): Promise<Record<string, TokenStatus>> {
        const ret: string[][] = (
            await this.redisService.client
                .multi()
                .hkeys(R_Hash_UnusedToken)
                .hkeys(R_Hash_OnlineToken)
                .hkeys(R_Hash_DisabledToken)
                .hkeys(R_Hash_ClosedToken)
                .exec()
        ).map(v => {
            if (v[0] !== null) {
                throw v[0];
            }
            return v[1];
        });
        const dic: Record<string, TokenStatus> = {};
        ret[0].forEach(wsId => {
            dic[wsId] = TokenStatus.Unused;
        });
        ret[1].forEach(wsId => {
            dic[wsId] = TokenStatus.Online;
        });
        ret[2].forEach(wsId => {
            dic[wsId] = TokenStatus.Disabled;
        });
        ret[3].forEach(wsId => {
            dic[wsId] = TokenStatus.Closed;
        });
        return dic;
    }

    /**
     * 获取 redis 中某任务的详细信息
     * @param taskId
     */
    async getJudgeRequestInfo(taskId: string): Promise<CreateJudgeArgs> {
<<<<<<< HEAD
        // const infoStr = await this.redisService.client.hget(
        //     // FIXME 设置键名
        //     "keyName_judgeInfo",
        //     taskId
        // );
        // if (!infoStr) {
        //     await this.redisService.client.hset(
        //         JudgeQueueService.illegalTask,
        //         taskId,
        //         Date.now()
        //     );
        //     throw new Error(`taskId: ${taskId} 找不到 JudgeInfo`);
        // }
        // const info: CreateJudgeArgs = JSON.parse(infoStr);
        // return info;
        // 将getJudgeINFO 改到External模块实现，直接返回CreateJudgeRequestArgs
=======
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
        const info = await this.externalmoduleService.getJudgeInfo(taskId);
        return info;
    }

    /**
     * 为评测机分配任务
     * @param wsId
     * @param taskId
     */
    async distributeTask(wsId: string, taskId: string): Promise<void> {
        if (
            !(await this.redisService.client.hexists(R_Hash_OnlineToken, wsId))
        ) {
            throw new Error(`Judger ${wsId.split(".")[0]} 不可用，可能已离线`);
        }
        await this.redisService.client.sadd(wsId + R_Set_WsOwnTask_Suf, taskId);
        await this.judgerGateway.callJudge(wsId, taskId).catch(async e => {
            await this.redisService.client.srem(
                wsId + R_Set_WsOwnTask_Suf,
                taskId
            );
            throw e;
        });
    }

    //----------------------------RPC-------------------------------------
    async solveExit(
        ws: WebSocket,
        wsId: string,
        { reconnect, reason }: ExitArgs
    ): Promise<void> {
        await this.judgerGateway.removeJudger(wsId);
        await this.judgerGateway.log(
            wsId,
            `主动请求下线，rebootDelay：${
                reconnect && reconnect.delay ? reconnect.delay : "无"
            }，reason：${reason ?? "无"}`
        );
    }

    async solveLog(
        ws: WebSocket,
        wsId: string,
        { level, code, message }: LogArgs
    ): Promise<void> {
        await this.judgerGateway.log(
            wsId,
            `level:${level}，code: ${code}，message: ${message}`
        );
    }

    async solveReportStatus(
        ws: WebSocket,
        wsId: string,
        args: ReportStatusArgs
    ): Promise<void> {
        await this.redisService.client.hset(
            R_Hash_AllReport,
            wsId,
            JSON.stringify(args)
        );
        this.judgerGateway.WsLifeRecord.set(wsId, Date.now());
    }

    async solveUpdateJudges(
        ws: WebSocket,
        wsId: string,
        args: UpdateJudgesArgs
    ): Promise<void> {
        if (
            !(await this.redisService.client.sismember(
<<<<<<< HEAD
                wsId + WsOwnTaskSuf,
=======
                wsId + R_Set_WsOwnTask_Suf,
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
                args.id
            ))
        ) {
            await this.judgerGateway.log(wsId, `回报无效任务状态：${args.id}`);
            // TODO 具体行为可能有改变
            return;
        }
<<<<<<< HEAD
        this.externalmoduleService.responseUpdate(args.id, args.state);
=======
        await this.externalmoduleService.responseUpdate(args.id, args.state);
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
    }

    async solveFinishJudges(
        ws: WebSocket,
        wsId: string,
        args: FinishJudgesArgs
    ): Promise<void> {
        try {
            if (
                !(await this.redisService.client.sismember(
<<<<<<< HEAD
                    wsId + WsOwnTaskSuf,
=======
                    wsId + R_Set_WsOwnTask_Suf,
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
                    args.id
                ))
            ) {
                await this.judgerGateway.log(
                    wsId,
                    `回报无效任务结果：${args.id}`
                );
                // TODO 具体行为可能有改变
                return;
            }
<<<<<<< HEAD
            this.externalmoduleService.responseFinish(args.id, args.result);
            await this.redisService.client.srem(wsId + WsOwnTaskSuf, args.id);
=======
            await this.externalmoduleService.responseFinish(
                args.id,
                args.result
            );
            await this.redisService.client.srem(
                wsId + R_Set_WsOwnTask_Suf,
                args.id
            );
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
        } finally {
            await this.judgerGateway.releaseJudger(wsId, 1);
        }
    }
}
