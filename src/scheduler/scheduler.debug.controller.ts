import { Body, Controller, Post } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { ExternalProtocol } from "heng-protocol";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import CreateJudgeRequest = ExternalProtocol.Post.CreateJudgeRequest;

@Controller("scheduler")
export class SchedulerController {
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly JudgerPool: JudgerPoolService
    ) {}

    @Post("/test/judgeQueue/push")
    async createJudge(
        @Body() createJudgeRequest: CreateJudgeRequest
    ): Promise<string> {
        return this.judgeQueue.push(createJudgeRequest.body.mainJudge);
    }

    @Post("/test/JudgerPool/login")
    async login(@Body() info: any): Promise<string> {
        this.JudgerPool.login(info["name"], info["maxTaskCount"]);
        return "login!";
    }

    @Post("/test/JudgerPool/logout")
    async logout(@Body() info: any): Promise<string> {
        this.JudgerPool.logout(info["name"]);
        return "logout!";
    }
}
