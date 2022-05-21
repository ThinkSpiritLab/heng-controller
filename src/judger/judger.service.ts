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
    UpdateJudgesArgs,
} from "heng-protocol/internal-protocol/ws";
import { JudgerGateway } from "./judger.gateway";
import {
    R_Hash_AllReport,
    R_Hash_ClosedToken,
    R_Hash_DisabledToken,
    R_Hash_OnlineToken,
    R_Hash_UnusedToken,
    R_Set_WsOwnTask_Suf,
    TokenStatus,
} from "./judger.decl";
import WebSocket from "ws";
import { ExternalService } from "src/external/external.service";
@Injectable()
export class JudgerService {
    private logger = new Logger("JudgerService");
    private readonly judgerConfig: JudgerConfig;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => JudgerGateway))
        private readonly judgerGateway: JudgerGateway,
        private readonly externalmoduleService: ExternalService
    ) {
        this.judgerConfig = this.configService.getConfig().judger;
    }

    async getTokenStatusDic(): Promise<Record<string, TokenStatus>> {
        const multiRet = await this.redisService.client
            .multi()
            .hkeys(R_Hash_UnusedToken)
            .hkeys(R_Hash_OnlineToken)
            .hkeys(R_Hash_DisabledToken)
            .hkeys(R_Hash_ClosedToken)
            .exec();
        if (multiRet === null) {
            throw new Error("Redis error");
        }
        const ret: string[][] = multiRet.map((v) => {
            if (v[0] !== null) {
                throw v[0];
            }
            return v[1] as string[];
        });
        const dic: Record<string, TokenStatus> = {};
        ret[0].forEach((wsId) => {
            dic[wsId] = TokenStatus.Unused;
        });
        ret[1].forEach((wsId) => {
            dic[wsId] = TokenStatus.Online;
        });
        ret[2].forEach((wsId) => {
            dic[wsId] = TokenStatus.Disabled;
        });
        ret[3].forEach((wsId) => {
            dic[wsId] = TokenStatus.Closed;
        });
        return dic;
    }

    /**
     * 获取 redis 中某任务的详细信息
     * @param taskId
     */
    async getJudgeRequestInfo(taskId: string): Promise<CreateJudgeArgs> {
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
        await this.judgerGateway.callJudge(wsId, taskId).catch(async (e) => {
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
                wsId + R_Set_WsOwnTask_Suf,
                args.id
            ))
        ) {
            await this.judgerGateway.log(wsId, `回报无效任务状态：${args.id}`);
            // TODO 具体行为可能有改变
            return;
        }
        await this.externalmoduleService.responseUpdate(args.id, args.state);
    }

    async solveFinishJudges(
        ws: WebSocket,
        wsId: string,
        args: FinishJudgesArgs
    ): Promise<void> {
        try {
            if (
                !(await this.redisService.client.sismember(
                    wsId + R_Set_WsOwnTask_Suf,
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
            await this.externalmoduleService.responseFinish(
                args.id,
                args.result
            );
            await this.redisService.client.srem(
                wsId + R_Set_WsOwnTask_Suf,
                args.id
            );
        } finally {
            await this.judgerGateway.releaseJudger(wsId, 1);
        }
    }
}
