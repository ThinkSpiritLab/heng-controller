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
import { AllReport, OnlineToken, WsOwnTaskSuf } from "./judger.decl";
import WebSocket from "ws";
import { ExternalModuleService } from "src/external-module/external-module.service";
@Injectable()
export class JudgerService {
    private logger = new Logger("JudgerService");
    private readonly judgerConfig: JudgerConfig;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => JudgerGateway))
        private readonly judgerGateway: JudgerGateway,
        private readonly externalmoduleService: ExternalModuleService
    ) {
        this.judgerConfig = this.configService.getConfig().judger;
    }

    /**
     * 外部交互 please fill this
     * 获取 redis 中某任务的详细信息
     * @param taskId
     */
    async getJudgeRequestInfo(taskId: string): Promise<CreateJudgeArgs> {
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
        const info = await this.externalmoduleService.getJudgeInfo(taskId);
        return info;
    }

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
        await this.judgerGateway.callJudge(wsId, taskId).catch(async e => {
            await this.redisService.client.srem(wsId + WsOwnTaskSuf, taskId);
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
            AllReport,
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
                wsId + WsOwnTaskSuf,
                args.id
            ))
        ) {
            await this.judgerGateway.log(wsId, `回报无效任务状态：${args.id}`);
            // TODO 具体行为可能有改变
            return;
        }
        this.externalmoduleService.responseUpdate(args.id, args.state);
    }

    async solveFinishJudges(
        ws: WebSocket,
        wsId: string,
        args: FinishJudgesArgs
    ): Promise<void> {
        try {
            if (
                !(await this.redisService.client.sismember(
                    wsId + WsOwnTaskSuf,
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
            this.externalmoduleService.responseFinish(args.id, args.result);
            await this.redisService.client.srem(wsId + WsOwnTaskSuf, args.id);
        } finally {
            await this.judgerGateway.releaseJudger(wsId, 1);
        }
    }
}
