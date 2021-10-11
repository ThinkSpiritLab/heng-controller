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
import { Result } from "./external-module.decl";
import { ConfigService } from "src/config/config-module/config.service";
import { ExternaConfig } from "src/config/external.config";

@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger("ExternalService");
    private readonly externalConfig: ExternaConfig;
    public static RedisKeys = {
        R_Hash_CbUrlUpd: "ExtUrlUpd", // hash
        R_Hash_CbUrlFin: "ExtUrlFin", // hash
        R_Hash_JudgeInfo: "ExtJudgeInfo", // hash
        R_Hash_TaskTime: "ExtTime", // hash // TODO recording when the task is submmited, recoed, but no effect
        R_List_ResultQueue: "ResultQueue", // list
        R_List_ResultBackup_Pre: "ExternalResult:back" // list 'R_List_ResultBackup_Pre|timestamp|tid'
    };
    constructor(
        private readonly configService: ConfigService,
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService
    ) {
        this.externalConfig = this.configService.getConfig().external;
    }

    init(): void {
        // 恢复未成功发送的结果
        setTimeout(() => {
            setInterval(
                () => this.checkBackupResult(),
                this.externalConfig.resultBackupRestoreInterval
            );
            this.checkBackupResult();
        }, Math.random() * this.externalConfig.resultBackupRestoreInterval);

        this.startResultTransfer();
    }

    private async startResultTransfer(): Promise<void> {
        while (true) {
            try {
                const backupKeyName =
                    ExternalModuleService.RedisKeys.R_List_ResultBackup_Pre +
                    "|" +
                    Date.now() +
                    "|" +
                    crypto.randomBytes(8).toString("hex");
                const retString = await this.redisService.withClient(
                    async client => {
                        return await client.brpoplpush(
                            ExternalModuleService.RedisKeys.R_List_ResultQueue,
                            backupKeyName,
                            0
                        );
                    }
                );
                if (!retString) continue;
                const ret: Result = JSON.parse(retString);
                if (ret.type === "update") {
                    const url = await this.redisService.client.hget(
                        ExternalModuleService.RedisKeys.R_Hash_CbUrlUpd,
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
                        await axios.post(url, data);
                    }
                    await this.redisService.client.del(backupKeyName);
                } else {
                    const url = await this.redisService.client.hget(
                        ExternalModuleService.RedisKeys.R_Hash_CbUrlFin,
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
                        await axios.post(url, data);
                    }
                    await this.cleanJudge(ret.taskId);
                    await this.redisService.client.del(backupKeyName);
                }
            } catch (error) {
                this.logger.error(String(error));
            }
        }
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
                ExternalModuleService.RedisKeys.R_Hash_JudgeInfo,
                id,
                JSON.stringify(Args)
            )
            .hset(
                ExternalModuleService.RedisKeys.R_Hash_CbUrlUpd,
                id,
                req.callbackUrls.update
            )
            .hset(
                ExternalModuleService.RedisKeys.R_Hash_CbUrlFin,
                id,
                req.callbackUrls.finish
            )
            .hset(ExternalModuleService.RedisKeys.R_Hash_TaskTime, id, Date.now())
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
        await this.redisService.client.lpush(
            ExternalModuleService.RedisKeys.R_List_ResultQueue,
            JSON.stringify(ret)
        );
    }

    async responseFinish(taskId: string, result: JudgeResult): Promise<void> {
        const ret: Result = {
            type: "finish",
            taskId,
            result
        };
        await this.redisService.client.lpush(
            ExternalModuleService.RedisKeys.R_List_ResultQueue,
            JSON.stringify(ret)
        );
        // this.cleanJudge(taskId);
    }

    private async cleanJudge(taskId: string): Promise<void> {
        await this.redisService.client
            .multi()
            .hdel(ExternalModuleService.RedisKeys.R_Hash_JudgeInfo, taskId)
            .hdel(ExternalModuleService.RedisKeys.R_Hash_CbUrlUpd, taskId)
            .hdel(ExternalModuleService.RedisKeys.R_Hash_CbUrlFin, taskId)
            .hdel(ExternalModuleService.RedisKeys.R_Hash_TaskTime, taskId)
            .exec();
    }

    async getJudgeInfo(taskId: string): Promise<CreateJudgeArgs> {
        const infoStr = await this.redisService.client.hget(
            ExternalModuleService.RedisKeys.R_Hash_JudgeInfo,
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

    async restoreBackupResult(backupKeyName: string): Promise<void> {
        if (backupKeyName)
            await this.redisService.client.rpoplpush(
                backupKeyName,
                ExternalModuleService.RedisKeys.R_List_ResultQueue
            );
    }

    private async checkBackupResult(): Promise<void> {
        const allBackupKeyName = await this.redisService.client.keys(
            ExternalModuleService.RedisKeys.R_List_ResultBackup_Pre + "*"
        );
        for (const keyName of allBackupKeyName) {
            const timeStamp = parseInt(keyName.split("|")[1] ?? "0");
            if (
                Date.now() - timeStamp >
                this.externalConfig.resultBackupExpire
            ) {
                this.logger.debug(`restore result: ${keyName}`);
                await this.restoreBackupResult(keyName);
            }
        }
    }
}
