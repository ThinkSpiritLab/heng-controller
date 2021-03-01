import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Logger } from "@nestjs/common";
import {
    CreateJudgeArgs,
    FinishJudgesArgs,
    UpdateJudgesArgs
} from "heng-protocol/internal-protocol/ws";
import { CreateJudgeRequest } from "heng-protocol/external-protocol";
import axios from "axios";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import moment from "moment";
@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger("ExternalModuleService");
    public readonly keys = {
        CBURLUpd: "Ext:UrlUpd",
        CBURLFin: "Ext:UrlFin",
        JudgeInfo: "Ext:JudgeINFO",
        TaskId: "Ext:TaskId",
        TaskTime: "Ext:time"
    };
    constructor(
        @Inject(forwardRef(() => JudgeQueueService))
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService
    ) {}

    // 创建评测任务
    async createjudge(req: CreateJudgeRequest): Promise<void> {
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
        mu.hmset(this.keys.JudgeInfo, req.id, JSON.stringify(Args));
        mu.hmset(this.keys.CBURLUpd, req.id, req.callbackUrls.update);
        mu.hmset(this.keys.CBURLFin, req.id, req.callbackUrls.finish);
        mu.hmset(
            this.keys.TaskTime,
            req.id,
            moment().format("YYYY-MM-DDTHH:mm:ssZ")
        );
        await mu.exec();
        await this.judgequeueService.push(String(req.id));
        this.logger.log(`评测任务已进入队列 id: ${req.id} `);
    }

    // 评测任务回调
    async responseupdate(
        taskid: string,
        state: UpdateJudgesArgs
    ): Promise<void> {
        const url: any = (
            await this.redisService.client.hmget(
                this.keys.CBURLUpd,
                taskid.toString()
            )
        )[0];
        if (url == null) {
            this.logger.log("警告：未找到更新状态回调url");
        }
        await axios.post(url, { taskid, state });
        this.logger.log(`已更新评测任务 id: ${taskid} 的状态`);
    }

    async responsefinish(
        taskid: string,
        result: FinishJudgesArgs
    ): Promise<any> {
        const url = (
            await this.redisService.client.hmget(
                this.keys.CBURLFin,
                taskid.toString()
            )
        )[0];
        if (url == null) {
            this.logger.log(`警告：未找到评测任务id ${taskid} 的回调url`);
        } else {
            await axios.post(url, { taskid, result });
            const mu = this.redisService.client.multi();
            mu.del(this.keys.JudgeInfo, taskid);
            mu.del(this.keys.CBURLUpd, taskid);
            mu.del(this.keys.CBURLFin, taskid);
            mu.del(this.keys.TaskTime, taskid);
            await mu.exec();
            this.logger.log(`已返回评测任务id: ${taskid}的结果`);
        }
    }

    async getJudgeINFO(taskId: string): Promise<CreateJudgeArgs> {
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
