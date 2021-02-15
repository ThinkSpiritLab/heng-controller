import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import * as crypto from "crypto";
import { SchedulerConfig } from "src/config/scheduler";
import { ConfigService } from "src/config/config-module/config.service";

@Injectable()
export class JudgeQueueService {
    static readonly pendingQueue = "JudgeQueue:pendingQueue";
    static readonly illegalTask = "JudgeQueue:illegalTask"; // hash
    static readonly backupPre = "JudgeQueue:backup";
    private readonly logger = new Logger("JudgeQueueService");
    private readonly schedulerConfig: SchedulerConfig;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.schedulerConfig = this.configService.getConfig().scheduler;

        // 恢复未成功分配的任务
        setTimeout(() => {
            setInterval(
                () => this.checkBackupTask(),
                this.schedulerConfig.backupRestoreInterval
            );
        }, Math.random() * this.schedulerConfig.backupRestoreInterval);

        // 清理任务黑名单
        setTimeout(() => {
            setInterval(
                () => this.cleanIllegalTask(),
                this.schedulerConfig.illegalTaskCleanInterval
            );
        }, Math.random() * this.schedulerConfig.illegalTaskCleanInterval);
    }

    /**
     * push a JudgeRequest to queue, return it's taskid
     */
    async push(taskId: string): Promise<void> {
        await this.redisService.client
            .multi()
            .lpush(JudgeQueueService.pendingQueue, taskId)
            .hdel(JudgeQueueService.illegalTask, taskId)
            .exec();
        return;
    }

    async restoreBackupTask(backupKeyName: string): Promise<void> {
        if (backupKeyName)
            await this.redisService.client.rpoplpush(
                backupKeyName,
                JudgeQueueService.pendingQueue
            );
    }

    /**
     * return a backupKeyName and taskId
     */
    async pop(): Promise<[string, string]> {
        while (true) {
            let taskId = "";
            const backupKeyName =
                JudgeQueueService.backupPre +
                "|" +
                Date.now() +
                "|" +
                crypto.randomBytes(4).toString("hex");
            try {
                taskId = await this.redisService.withClient(async client => {
                    return await client.brpoplpush(
                        JudgeQueueService.pendingQueue,
                        backupKeyName,
                        0
                    );
                });
                if (
                    await this.redisService.client.hexists(
                        JudgeQueueService.illegalTask,
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
            JudgeQueueService.illegalTask
        );
        let mu = this.redisService.client.multi();
        for (const taskId in ret) {
            const timeStamp = parseInt(ret[taskId]);
            if (
                Date.now() - timeStamp >
                this.schedulerConfig.illegalTaskExpire
            ) {
                mu = mu.hdel(JudgeQueueService.illegalTask, taskId);
            }
        }
        await mu.exec();
    }

    private async checkBackupTask(): Promise<void> {
        const allBackupKeyName = await this.redisService.client.keys(
            JudgeQueueService.backupPre + "*"
        );
        for (const keyName of allBackupKeyName) {
            const timeStamp = parseInt(keyName.split("|")[1] ?? "0");
            if (Date.now() - timeStamp > this.schedulerConfig.backupExpire) {
                await this.restoreBackupTask(keyName);
            }
        }
    }
}
