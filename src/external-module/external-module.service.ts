import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Logger } from "@nestjs/common";
import { CreateJudgeArgs } from "heng-protocol/internal-protocol/ws";
import {
    CreateJudgeOutput,
    CreateJudgeRequest
} from "heng-protocol/external-protocol";
import axios from "axios";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import { JudgeResult, JudgeState } from "heng-protocol";
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
        const mu = this.redisService.client.multi();
        await mu
            .hset(this.keys.JudgeInfo, req.id, JSON.stringify(Args))
            .hset(this.keys.CBURLUpd, req.id, req.callbackUrls.update)
            .hset(this.keys.CBURLFin, req.id, req.callbackUrls.finish)
            .hset(this.keys.TaskTime, req.id, Date.now())
            .exec();
        await this.judgequeueService.push(req.id);
        this.logger.log(`评测任务已进入队列 id: ${req.id} `);
        return { id: req.id };
    }

    // 评测任务回调
    async responseUpdate(taskid: string, state: JudgeState): Promise<void> {
        const url: string | null = await this.redisService.client.hget(
            this.keys.CBURLUpd,
            taskid.toString()
        );
        if (url === null) {
            this.logger.warn(`未找到更新状态id ${taskid} 的回调url`);
        } else {
            for (let i = 0; i < 8; i++) {
                try {
                    await axios.post(url, { taskid, state });
                    this.logger.log(`已更新评测任务 id: ${taskid} 的状态`);
                    return;
                } catch (error) {
                    this.logger.warn(
                        `更新taskid:${taskid}评测状态失败，该任务回调url: ${url} 无法正常连接，正在指数退避，等待${2 <<
                            i}秒后重试`
                    );
                    await this.timeOut(2 << (i * 1000));
                }
            }
        }
    }

    async responseFinish(taskid: string, result: JudgeResult): Promise<void> {
        const url: string | null = await this.redisService.client.hget(
            this.keys.CBURLFin,
            taskid.toString()
        );
        if (url == null) {
            this.logger.warn(`未找到返回结果id ${taskid} 的回调url`);
        } else {
            try {
                await axios.post(url, { taskid, result });
                this.logger.log(`已返回评测任务id: ${taskid} 的结果`);
            } catch (error) {
                this.logger.warn(
                    `返回taskid:${taskid}评测结果失败，该任务回调url: ${url} 无法正常连接`
                );
            }
        }
        this.cleanJudge(taskid);
    }

    async cleanJudge(taskid: string): Promise<void> {
        await this.redisService.client
            .multi()
            .hdel(this.keys.JudgeInfo, taskid)
            .hdel(this.keys.CBURLUpd, taskid)
            .hdel(this.keys.CBURLFin, taskid)
            .hdel(this.keys.TaskTime, taskid)
            .exec();
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

    async timeOut(time: number): Promise<Promise<void>> {
        return new Promise<void>(resolve => setTimeout(resolve, time));
    }
}
