import { Injectable } from "@nestjs/common";
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
import * as crypto from "crypto";

@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger("ExternalModuleService");
    public readonly ExtRedisKeys = {
        CBURLUpd: "ExtUrlUpd", // hash
        CBURLFin: "ExtUrlFin", // hash
        JudgeInfo: "ExtJudgeInfo", // hash
        TaskId: "ExtTaskId", // string, increasing nonce
        TaskTime: "ExtTime" // hash // TODO recording when the task is submmited, recoed, but no effect
    };
    constructor(
        // TODO why use Inject
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService
    ) {}

    // 创建评测任务
    async createJudge(req: CreateJudgeRequest): Promise<CreateJudgeOutput> {
        let id = crypto
            .createHmac("sha256", String(Date.now()))
            .update(req.callbackUrls.finish + req.callbackUrls.update)
            .digest("hex");
        const Args: CreateJudgeArgs = {
            id: id,
            data: req.data,
            dynamicFiles: req.dynamicFiles,
            judge: req.judge,
            test: req.test
        };
        const mu = this.redisService.client.multi();
        await mu
            .hset(this.ExtRedisKeys.JudgeInfo, id, JSON.stringify(Args))
            .hset(this.ExtRedisKeys.CBURLUpd, id, req.callbackUrls.update)
            .hset(this.ExtRedisKeys.CBURLFin, id, req.callbackUrls.finish)
            .hset(this.ExtRedisKeys.TaskTime, id, Date.now())
            .exec();
        await this.judgequeueService.push(id);
        this.logger.log(`评测任务 ${id} 已进入队列`);
        return null;
    }

    // 评测任务回调
    async responseUpdate(taskid: string, state: JudgeState): Promise<void> {
        const url: string | null = await this.redisService.client.hget(
            this.ExtRedisKeys.CBURLUpd,
            taskid
        );
        if (url === null) {
            this.logger.warn(`未找到任务 ${taskid} 的状态更新 url`);
        } else {
            for (let i = 0; i < 8; i++) {
                try {
                    await axios.post(url, { state });
                    this.logger.log(
                        `已更新评测任务 ${taskid} 的状态：${state}`
                    );
                    break;
                } catch (error) {
                    this.logger.warn(
                        `更新taskid:${taskid}评测状态失败，该任务回调url: ${url} 无法正常连接，等待${2 <<
                            i}秒后重试`
                    );
                    await this.timeOut((2 << i) * 1000);
                }
            }
        }
    }

    async responseFinish(taskid: string, result: JudgeResult): Promise<void> {
        const url: string | null = await this.redisService.client.hget(
            this.ExtRedisKeys.CBURLFin,
            taskid.toString()
        );
        if (url == null) {
            this.logger.warn(`未找到任务 ${taskid} 的结果更新 url`);
        } else {
            for (let i = 0; i < 8; i++) {
                try {
                    await axios.post(url, { result });
                    this.logger.log(`已返回评测任务 ${taskid} 的结果`);
                    break;
                } catch (error) {
                    this.logger.warn(
                        `返回taskid:${taskid}评测结果失败，该任务回调url: ${url} 无法正常连接，等待${2 <<
                            i}秒后重试`
                    );
                    await this.timeOut((2 << i) * 1000);
                }
            }
        }
        this.cleanJudge(taskid);
    }

    async cleanJudge(taskid: string): Promise<void> {
        await this.redisService.client
            .multi()
            .hdel(this.ExtRedisKeys.JudgeInfo, taskid)
            .hdel(this.ExtRedisKeys.CBURLUpd, taskid)
            .hdel(this.ExtRedisKeys.CBURLFin, taskid)
            .hdel(this.ExtRedisKeys.TaskTime, taskid)
            .exec();
    }

    async getJudgeInfo(taskId: string): Promise<CreateJudgeArgs> {
        const infoStr = await this.redisService.client.hget(
            this.ExtRedisKeys.JudgeInfo,
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

    async timeOut(ms: number): Promise<Promise<void>> {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }
}
