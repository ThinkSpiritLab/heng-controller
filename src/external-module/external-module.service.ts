import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Logger } from "@nestjs/common";
import {
    CreateJudgeArgs,
    FinishJudgesArgs,
    UpdateJudgesArgs
} from "heng-protocol/internal-protocol/ws";
import {
    CreateJudgeOutput,
    CreateJudgeRequest
} from "heng-protocol/external-protocol";
import axios from "axios";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger("ExternalModuleService");
    public readonly keys = {
        CBURLUpd: "ExtUrlUpd",
        CBURLFin: "ExtUrlFin",
        JudgeInfo: "ExtJudgeInfo",
        TaskId: "ExtTaskId",
        TaskTime: "ExtTime"
    };
    constructor(
        @Inject(forwardRef(() => JudgeQueueService))
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService
    ) {}

    // 创建评测任务
    async createJudge(req: CreateJudgeRequest): Promise<CreateJudgeOutput> {
        req.id = (
            await this.redisService.client.incr(this.keys.TaskId)
        ).toString();
        const Args: CreateJudgeArgs = {
            id: req.id,
            data: req.data,
            dynamicFiles: req.dynamicFiles,
            judge: req.judge,
            test: req.test
        };
        let mu = this.redisService.client.multi();
        mu = mu.hmset(this.keys.JudgeInfo, req.id, JSON.stringify(Args)); // 这里好像跑起来没问题...
        mu = mu.hmset(this.keys.CBURLUpd, req.id, req.callbackUrls.update);
        mu = mu.hmset(this.keys.CBURLFin, req.id, req.callbackUrls.finish);
        mu = mu.hmset(this.keys.TaskTime, req.id, Date.now());
        await mu.exec();
        await this.judgequeueService.push(String(req.id));
        this.logger.log(`评测任务已进入队列 id: ${req.id} `);
        req.id;
        return { id: req.id };
    }

    // 评测任务回调
    async responseUpdate(
        taskid: string,
        state: UpdateJudgesArgs
    ): Promise<void> {
        const url: string | null = (
            await this.redisService.client.hmget(
                this.keys.CBURLUpd,
                taskid.toString()
            )
        )[0];
        if (url == null) {
            this.logger.warn(`未找到更新状态id ${taskid} 的回调url`);
        } else {
            await axios.post(url, { taskid, state }).catch(error => {
                this.logger.log(
                    `更新taskid:${taskid}评测状态失败，该任务回调url: ${url} 无法正常连接`
                );
                throw error;
            });
        }
        this.logger.log(`已更新评测任务 id: ${taskid} 的状态`);
    }

    async responseFinish(
        taskid: string,
        result: FinishJudgesArgs
    ): Promise<void> {
        const url: string | null = (
            await this.redisService.client.hmget(
                this.keys.CBURLFin,
                taskid.toString()
            )
        )[0];
        console.log(url);
        if (url == null) {
            this.logger.warn(`未找到返回结果id ${taskid} 的回调url`);
        } else {
            await axios.post(url, { taskid, result }).catch(error => {
                this.logger.log(
                    `返回taskid:${taskid}评测结果失败，该任务回调url: ${url} 无法正常连接`
                );
                throw error;
            });
            console.log(url);
            const mu = this.redisService.client.multi();
            mu.hdel(this.keys.JudgeInfo, taskid);
            mu.hdel(this.keys.CBURLUpd, taskid);
            mu.hdel(this.keys.CBURLFin, taskid);
            mu.hdel(this.keys.TaskTime, taskid);
            await mu.exec();
            this.logger.log(`已返回评测任务id: ${taskid} 的结果`);
        }
    }

    async getJudgeInfo(taskId: string): Promise<CreateJudgeArgs> {
        const infoStr = await this.redisService.client.hget(
            this.keys.JudgeInfo,
            taskId
        );
        if (!infoStr) {
            await this.redisService.client.hset(
                JudgeQueueService.illegalTask,
                taskId,
                Date.now()
            );
            throw new Error(`taskId: ${taskId} 找不到 JudgeInfo`);
        }
        const info: CreateJudgeArgs = JSON.parse(infoStr);
        return info;
    }
}
