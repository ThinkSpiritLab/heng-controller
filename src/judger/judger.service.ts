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
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";

@Injectable()
export class JudgerService {
    private logger = new Logger("Judger");
    private readonly judgerConfig: JudgerConfig;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => JudgerGateway))
        private readonly judgerGateway: JudgerGateway
    ) {
        this.judgerConfig = this.configService.getConfig().judger;
    }

    /**
     * 外部交互 please fill this
     * 获取 redis 中某任务的详细信息
     * @param taskId
     */
    async getJudgeRequestInfo(taskId: string): Promise<CreateJudgeArgs> {
        // FIXME/DEBUG
        if (
            !(await this.redisService.client.sismember("pendingTask", taskId))
        ) {
            await this.redisService.client.hset(
                JudgeQueueService.illegalTask,
                taskId,
                Date.now()
            );
            throw new Error(`taskId: ${taskId} 找不到 JudgeInfo`);
        }
        return { id: taskId } as CreateJudgeArgs;

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
        let mu = this.redisService.client.multi();
        args.forEach(({ id }) => {
            mu = mu.sismember(wsId + WsOwnTaskSuf, id);
        });
        const ret: number[] = (await mu.exec()).map(value => value[1]);
        const vaildResult = args.filter(({}, index) => ret[index]);
        // FIXME 留作 DEBUG，一般出现此错误说明有 BUG
        if (args.length > vaildResult.length)
            this.judgerGateway.log(
                wsId,
                `回报无效任务状态 ${args.length - vaildResult.length} 个`
            );
        // TODO 通知外部系统
    }

    async solveFinishJudges(
        ws: WebSocket,
        wsId: string,
        args: FinishJudgesArgs
    ): Promise<void> {
        let mu = this.redisService.client.multi();
        args.forEach(({ id }) => {
            mu = mu.sismember(wsId + WsOwnTaskSuf, id);
        });
        const ret: number[] = (await mu.exec()).map(value => value[1]);
        const vaildResult = args.filter(({}, index) => ret[index]);
        // FIXME 留作 DEBUG，一般出现此错误说明有 BUG
        if (args.length > vaildResult.length)
            this.judgerGateway.log(
                wsId,
                `回报无效任务结果 ${args.length - vaildResult.length} 个`
            );

        // TODO 通知外部系统

        mu = this.redisService.client.multi();
        for (const { id } of vaildResult) {
            mu = mu.srem(wsId + WsOwnTaskSuf, id);

            // FIXME/DEBUG
            mu = mu.srem("pendingTask", id);
        }
        await mu.exec();
        await this.judgerGateway.releaseJudger(wsId, vaildResult.length);
    }
}
