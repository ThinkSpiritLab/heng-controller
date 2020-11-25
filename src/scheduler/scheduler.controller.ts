import { Body, Controller, Post } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { CreateJudgeRequest } from "src/protocol/external-protocol/HttpProtocolPostDefinition";

@Controller("scheduler")
export class SchedulerController {
    constructor(private readonly judgeQueue: JudgeQueueService) {}

    @Post("/test/redis/pendingQueue")
    async createJudge(
        @Body() createJudgeRequest: CreateJudgeRequest
    ): Promise<string> {
        this.judgeQueue.push(createJudgeRequest);
        return "true";
    }
}
