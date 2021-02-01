import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger("SchedulerService");
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly judgerPoolService: JudgerPoolService
    ) {
        this.run();
    }

    async run(): Promise<void> {
        while (true) {
            try {
                const [taskId, token] = await Promise.all([
                    this.judgeQueue.pop(),
                    this.judgerPoolService.getToken()
                ]);

                // To be finished
                //-----------------------------------------
                const [judger, releaser] = token;
                // send request to judger
                console.log(
                    "task id: ",
                    taskId,
                    ", send to",
                    judger,
                    "wait for 5 sec..."
                );
                new Promise(r => setTimeout(r, 5000)).then(() => {
                    releaser(); // release token after judging
                    console.log("task id: ", taskId, " token released");
                });
                //-----------------------------------------
            } catch (error) {
                this.logger.log(error);
            }
        }
    }
}
