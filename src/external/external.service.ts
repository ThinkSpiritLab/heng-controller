import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Logger } from "@nestjs/common";
import { CreateJudgeArgs } from "heng-protocol/internal-protocol/ws";
import {
    CreateJudgeOutput,
    CreateJudgeRequest,
    FinishJudgeCallback,
    UpdateJudgeCallback
} from "heng-protocol/external-protocol";
import axios from "axios";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import { JudgeResult, JudgeState } from "heng-protocol";
import * as crypto from "crypto";
import { Result } from "./external.decl";
import { ConfigService } from "src/config/config-module/config.service";
import { ExternaConfig } from "src/config/external.config";
import { Queue } from "src/public/util/Queue";
import https from "https";

@Injectable()
export class ExternalService {
    private readonly logger = new Logger("ExternalService");
    private readonly externalConfig: ExternaConfig;
    public readonly cbQueue: Queue<Result>;
    public static RedisKeys = {
        R_Hash_CbUrlUpd: "ExtUrlUpd", // hash
        R_Hash_CbUrlFin: "ExtUrlFin", // hash
        R_Hash_JudgeInfo: "ExtJudgeInfo", // hash
        R_Hash_TaskTime: "ExtTime" // hash // TODO recording when the task is submmited, recoed, but no effect
    };
    agent = new https.Agent({
        rejectUnauthorized: false
    });

    constructor(
        private readonly configService: ConfigService,
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService
    ) {
        this.externalConfig = this.configService.getConfig().external;
        this.cbQueue = new Queue<Result>(
            "result",
            redisService,
            this.externalConfig.resultBackupExpire,
            this.externalConfig.resultBackupRestoreInterval,
            this.externalConfig.resultBackupBlockTimeoutSec,
            async (ret: Result, resolve: () => Promise<number>) => {
                if (ret.type === "update") {
                    const url = await this.redisService.client.hget(
                        ExternalService.RedisKeys.R_Hash_CbUrlUpd,
                        ret.taskId
                    );
                    if (!url) {
                        this.logger.warn(
                            `未找到任务 ${ret.taskId} 的状态更新 url`
                        );
                    } else {
                        const data: UpdateJudgeCallback = {
                            state: ret.state
                        };
                        await axios
                            .post(url, data, {
                                httpsAgent: this.agent,
                                timeout: this.externalConfig.sendResultTimeout
                            })
                            .catch(e => {
                                console.log(e.response && e.response.data);
                                throw e;
                            });
                    }
                } else {
                    const url = await this.redisService.client.hget(
                        ExternalService.RedisKeys.R_Hash_CbUrlFin,
                        ret.taskId
                    );
                    if (!url) {
                        this.logger.warn(
                            `未找到任务 ${ret.taskId} 的结果更新 url`
                        );
                    } else {
                        const data: FinishJudgeCallback = {
                            result: ret.result
                        };
                        await axios
                            .post(url, data, {
                                httpsAgent: this.agent,
                                timeout: this.externalConfig.sendResultTimeout
                            })
                            .catch(e => {
                                console.log(e.response && e.response.data);
                                throw e;
                            });
                    }
                    await this.cleanJudge(ret.taskId);
                }
                await resolve();
                return;
            }
        );
    }

    init(): void {
        this.cbQueue.init();
        this.cbQueue.start();
    }

    // 创建评测任务
    async createJudge(req: CreateJudgeRequest): Promise<CreateJudgeOutput> {
        const id = crypto.randomBytes(32).toString("hex");
        const Args: CreateJudgeArgs = {
            id: id,
            data: req.data,
            dynamicFiles: req.dynamicFiles,
            judge: req.judge,
            test: req.test
        };
        await this.redisService.client
            .multi()
            .hset(
                ExternalService.RedisKeys.R_Hash_JudgeInfo,
                id,
                JSON.stringify(Args)
            )
            .hset(
                ExternalService.RedisKeys.R_Hash_CbUrlUpd,
                id,
                req.callbackUrls.update
            )
            .hset(
                ExternalService.RedisKeys.R_Hash_CbUrlFin,
                id,
                req.callbackUrls.finish
            )
            .hset(ExternalService.RedisKeys.R_Hash_TaskTime, id, Date.now())
            .exec();
        await this.judgequeueService.push(id);
        this.logger.log(`评测任务 ${id} 已进入队列`);
        return null;
    }

    async responseUpdate(taskId: string, state: JudgeState): Promise<void> {
        const ret: Result = {
            type: "update",
            taskId,
            state
        };
        await this.cbQueue.push(ret);
    }

    async responseFinish(taskId: string, result: JudgeResult): Promise<void> {
        const ret: Result = {
            type: "finish",
            taskId,
            result
        };
        await this.cbQueue.push(ret);
    }

    private async cleanJudge(taskId: string): Promise<void> {
        await this.redisService.client
            .multi()
            .hdel(ExternalService.RedisKeys.R_Hash_JudgeInfo, taskId)
            .hdel(ExternalService.RedisKeys.R_Hash_CbUrlUpd, taskId)
            .hdel(ExternalService.RedisKeys.R_Hash_CbUrlFin, taskId)
            .hdel(ExternalService.RedisKeys.R_Hash_TaskTime, taskId)
            .exec();
    }

    async getJudgeInfo(taskId: string): Promise<CreateJudgeArgs> {
        const infoStr = await this.redisService.client.hget(
            ExternalService.RedisKeys.R_Hash_JudgeInfo,
            taskId
        );
        if (!infoStr) {
            await this.redisService.client.hset(
                JudgeQueueService.R_Hash_IllegalTask,
                taskId,
                Date.now()
            );
            throw new Error(`taskId: ${taskId} 找不到 JudgeInfo`);
        }
        const info: CreateJudgeArgs = JSON.parse(infoStr);
        return info;
    }
}
