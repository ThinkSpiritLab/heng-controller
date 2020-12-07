import { Body, Controller, Post } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { ExternalProtocol } from "heng-protocol";
import CreateJudgeRequest = ExternalProtocol.Post.CreateJudgeRequest;
import CreateJudgesResponse = ExternalProtocol.Post.CreateJudgesResponse;

@Controller("scheduler")
export class SchedulerController {
    constructor(private readonly judgeQueueService: JudgeQueueService) {}

    @Post("/test/redis/pendingQueue")
    async createJudge(
        @Body() createJudgeRequest: CreateJudgeRequest
    ): Promise<CreateJudgesResponse> {
        return this.judgeQueueService.push(createJudgeRequest);
    }
}
