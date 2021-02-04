import { Body, Controller, Post } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { ExternalProtocol } from "heng-protocol";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import CreateJudgeRequest = ExternalProtocol.Post.CreateJudgeRequest;

@Controller("/test/scheduler")
export class SchedulerController {
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly JudgerPool: JudgerPoolService
    ) {}

    @Post("judgeQueue/push")
    async createJudge(
        @Body() createJudgeRequest: CreateJudgeRequest
    ): Promise<string> {
        await this.judgeQueue.push(createJudgeRequest.body.mainJudge.taskId);
        return createJudgeRequest.body.mainJudge.taskId;
    }

    @Post("JudgerPool/login")
    async login(
        @Body() info: { name: string; maxTaskCount: number }
    ): Promise<string> {
        await this.JudgerPool.login(info["name"], info["maxTaskCount"]);
        return "login!";
    }

    @Post("JudgerPool/logout")
    async logout(
        @Body() info: { name: string; maxTaskCount: number }
    ): Promise<string> {
        await this.JudgerPool.logout(info["name"]);
        return "logout!";
    }
}
