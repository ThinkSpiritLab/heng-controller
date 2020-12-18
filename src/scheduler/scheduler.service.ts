import { Injectable } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";

@Injectable()
export class SchedulerService {
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly judgerPoolService: JudgerPoolService
    ) {
        this.run();
    }

    async run(): Promise<void> {
        while (true) {
            const judgeRequest = await this.judgeQueue.pop();
            const token = await this.judgerPoolService.getToken();

            // To be finished
            //-----------------------------------------
            let [judger, releaser] = token;
            // send request to judger
            console.log(
                "task id: ",
                judgeRequest.taskId,
                " wait for 5 sec..."
            );
            new Promise(r => setTimeout(r, 5000)).then(() => {
                releaser(); // release token after judging
                console.log(
                    "task id: ",
                    judgeRequest.taskId,
                    " token released"
                );
            });
            //-----------------------------------------
        }
    }
}
