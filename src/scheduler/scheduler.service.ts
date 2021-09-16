import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { JudgerService } from "src/judger/judger.service";
import { RedisService } from "src/redis/redis.service";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import { backOff } from "./scheduler.util";

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger("SchedulerService");
    constructor(
        private readonly redisService: RedisService,
        private readonly judgeQueue: JudgeQueueService,
        private readonly judgerPoolService: JudgerPoolService,
        private readonly judgerService: JudgerService
    ) {}

    async run(): Promise<void> {
        while (true) {
            let taskId = "",
                token = "",
                backupKeyName = "";
            try {
                token = await this.judgerPoolService.getToken();
                [backupKeyName, taskId] = await this.judgeQueue.pop();

                await this.judgerService.distributeTask(token, taskId);

                token = "";
                await this.redisService.client.del(backupKeyName);
            } catch (error) {
                await backOff(async () => {
                    await this.judgeQueue.restoreBackupTask(backupKeyName);
                    if (token) {
                        await this.judgerPoolService.releaseToken(token, 1);
                        token = "";
                    }
                    this.logger.error(error);
                });
            }
        }
    }
}
