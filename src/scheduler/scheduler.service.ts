import { Injectable, Logger } from "@nestjs/common";
import { JudgerService } from "../judger/judger.service";
import { RedisService } from "../redis/redis.service";
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
        for (;;) {
            let taskId = "",
                token = "",
                resolve: () => Promise<number>;
            try {
                token = await this.judgerPoolService.getToken();
                [taskId, resolve] = await this.judgeQueue.pop();

                await this.judgerService.distributeTask(token, taskId);

                token = "";
                await resolve();
            } catch (error) {
                this.logger.error(error);
                await backOff(async () => {
                    if (token) {
                        await this.judgerPoolService.releaseToken(token, 1);
                        token = "";
                    }
                });
            }
        }
    }
}
