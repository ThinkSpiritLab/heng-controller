import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { SchedulerConfig } from "src/config/scheduler";
import { ConfigService } from "src/config/config-module/config.service";
import { Queue } from "src/public/util/Queue";

@Injectable()
export class JudgeQueueService {
    static readonly R_Hash_IllegalTask = "JudgeQueue:illegalTask"; // hash, there may be some task lose judge detail without reasons, use it to avoid such task looping in judge queue
    private readonly logger = new Logger("JudgeQueueService");
    private readonly schedulerConfig: SchedulerConfig;
    public readonly judgeQueue: Queue<string>;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {
        this.schedulerConfig = this.configService.getConfig().scheduler;
        this.judgeQueue = new Queue<string>(
            "judge",
            redisService,
            this.schedulerConfig.backupExpire,
            this.schedulerConfig.backupRestoreInterval,
            this.schedulerConfig.backupBlockTimeoutSec
        );
    }

    init(): void {
        this.judgeQueue.init();

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
        await this.judgeQueue.push(taskId);
        await this.redisService.client.hdel(
            JudgeQueueService.R_Hash_IllegalTask,
            taskId
        );
    }

    async pop(): Promise<[string, () => Promise<number>]> {
        while (true) {
            try {
                const [taskId, resolve] = await this.judgeQueue.pop();
                if (
                    await this.redisService.client.hexists(
                        JudgeQueueService.R_Hash_IllegalTask,
                        taskId
                    )
                ) {
                    await resolve();
                    continue;
                }
                return [taskId, resolve];
            } catch (error) {
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
}
