import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { JudgerService } from "src/judger/judger.service";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger("SchedulerService");
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly judgerPoolService: JudgerPoolService,
        private readonly judgerService: JudgerService
    ) {
        this.run();
        // FIXME 压测
        // setInterval(() => {
        //     this.judgeQueue.push(
        //         Math.random()
        //             .toString(35)
        //             .slice(2)
        //     );
        // }, 50);
    }

    async run(): Promise<void> {
        while (true) {
            let taskId = "",
                token = "";
            try {
                [taskId, token] = await Promise.all([
                    this.judgeQueue.pop(),
                    this.judgerPoolService.getToken()
                ]);

                await this.judgerService.distributeTask(token, taskId);
            } catch (error) {
                // FIXME taskId 不安全
                if (taskId) await this.judgeQueue.push(taskId);
                if (token) await this.judgerPoolService.releaseToken(token, 1);
                this.logger.error(error);
            }
        }
    }
}
