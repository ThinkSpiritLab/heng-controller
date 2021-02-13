import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { JudgerService } from "src/judger/judger.service";
import { RedisService } from "src/redis/redis.service";
import { setTimeout } from "timers";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger("SchedulerService");
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly judgerPoolService: JudgerPoolService,
        private readonly judgerService: JudgerService,
        private readonly redisService: RedisService
    ) {
        this.run();

        // FIXME 压测
        setInterval(async () => {
            // 运行前设置 addTask 键，填充一定任务
            if (await this.redisService.client.get("addTask")) {
                let mu = this.redisService.client.multi();
                for (let i = 0; i < 20000; i++) {
                    const taskId = Math.random()
                        .toString(35)
                        .slice(2);
                    mu = mu
                        .lpush(JudgeQueueService.pendingQueue, taskId)
                        // 用于测试是否丢失任务
                        .sadd("pendingTask", taskId);
                }
                await mu.exec();
            }
        }, 10000);
    }

    async run(): Promise<void> {
        while (true) {
            let taskId = "",
                token = "",
                backupKeyName = "";
            try {
                token = await this.judgerPoolService.getToken();
                [backupKeyName, taskId] = await this.judgeQueue.pop();

                await this.judgerService.distributeTask(token, taskId);

                await this.redisService.client.del(backupKeyName);
            } catch (error) {
                let interval = 10;
                const cb = async (resolve: (value: unknown) => void) => {
                    try {
                        await this.judgeQueue.restoreBackupTask(backupKeyName);
                        if (token)
                            await this.judgerPoolService.releaseToken(token, 1);
                        this.logger.error(error);
                        resolve(0);
                    } catch (error) {
                        interval = interval * 2;
                        setTimeout(() => cb(resolve), interval);
                        this.logger.error(error);
                    }
                };
                await new Promise(cb);
            }
        }
    }
}
