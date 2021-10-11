import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import * as crypto from "crypto";
import { SchedulerConfig } from "src/config/scheduler";
import { ConfigService } from "src/config/config-module/config.service";

@Injectable()
export class JudgeQueueService {
    static readonly R_List_PendingQueue = "JudgeQueue:pendingQueue";
    static readonly R_Hash_IllegalTask = "JudgeQueue:illegalTask"; // hash, there may be some task lose judge detail without reasons, use it to avoid such task looping in judge queue
    static readonly R_List_Backup_Pre = "JudgeQueue:backup"; // 'R_List_Backup_Pre|timestamp|tid'
    private readonly logger = new Logger("JudgeQueueService");
    private readonly schedulerConfig: SchedulerConfig;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {
        this.schedulerConfig = this.configService.getConfig().scheduler;
    }

    init(): void {
        // 恢复未成功分配的任务
        setTimeout(() => {
            setInterval(
                () => this.checkBackupTask(),
                this.schedulerConfig.backupRestoreInterval
            );
            this.checkBackupTask();
        }, Math.random() * this.schedulerConfig.backupRestoreInterval);

        // 清理任务黑名单
        setTimeout(() => {
            setInterval(
                () => this.cleanIllegalTask(),
                this.schedulerConfig.illegalTaskCleanInterval
            );
            this.cleanIllegalTask();
        }, Math.random() * this.schedulerConfig.illegalTaskCleanInterval);
    }

    /**
     * push a JudgeRequest to queue, return it's taskid
     */
    async push(taskId: string): Promise<void> {
        await this.redisService.client
            .multi()
            .lpush(JudgeQueueService.R_List_PendingQueue, taskId)
            .hdel(JudgeQueueService.R_Hash_IllegalTask, taskId)
            .exec();
        return;
    }

    async restoreBackupTask(backupKeyName: string): Promise<void> {
        if (backupKeyName)
            await this.redisService.client.rpoplpush(
                backupKeyName,
                JudgeQueueService.R_List_PendingQueue
            );
    }

    /**
     * return a backupKeyName and taskId
     */
    async pop(): Promise<[string, string]> {
        while (true) {
            let taskId = "";
            let backupKeyName = "";
            try {
                backupKeyName =
                    JudgeQueueService.R_List_Backup_Pre +
                    "|" +
                    Date.now() +
                    "|" +
                    crypto.randomBytes(8).toString("hex");
                taskId = await this.redisService.withClient(async client => {
                    return await client.brpoplpush(
                        JudgeQueueService.R_List_PendingQueue,
                        backupKeyName,
                        0
                    );
                });
                if (!taskId) {
                    continue;
                }
                if (
                    await this.redisService.client.hexists(
                        JudgeQueueService.R_Hash_IllegalTask,
                        taskId
                    )
                ) {
                    await this.redisService.client.del(backupKeyName);
                    continue;
                }
                return [backupKeyName, taskId];
            } catch (error) {
                await this.restoreBackupTask(backupKeyName);
                this.logger.error(error);
            }
        }
    }

    private async cleanIllegalTask(): Promise<void> {
        const ret = await this.redisService.client.hgetall(
            JudgeQueueService.R_Hash_IllegalTask
        );
        let mu = this.redisService.client.multi();
        for (const taskId in ret) {
            const timeStamp = parseInt(ret[taskId]);
            if (
                Date.now() - timeStamp >
                this.schedulerConfig.illegalTaskExpire
            ) {
                mu = mu.hdel(JudgeQueueService.R_Hash_IllegalTask, taskId);
            }
        }
        await mu.exec();
    }

    private async checkBackupTask(): Promise<void> {
        const allBackupKeyName = await this.redisService.client.keys(
            JudgeQueueService.R_List_Backup_Pre + "*"
        );
        for (const keyName of allBackupKeyName) {
            const timeStamp = parseInt(keyName.split("|")[1] ?? "0");
            if (Date.now() - timeStamp > this.schedulerConfig.backupExpire) {
                await this.restoreBackupTask(keyName);
            }
        }
    }
}
