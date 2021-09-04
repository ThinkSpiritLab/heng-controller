import { Controller, UseGuards } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import { RoleSignGuard } from "src/auth/auth.guard";
@UseGuards(RoleSignGuard)
@Controller("/test/scheduler")
export class SchedulerController {
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly JudgerPool: JudgerPoolService
    ) {}

    // @Roles(ROOT)
    // @Post("judgeQueue/push")
    // async createJudge(
    //     @Body() createJudgeRequest: CreateJudgeRequest
    // ): Promise<string> {
    //     await this.judgeQueue.push(createJudgeRequest.id);
    //     return createJudgeRequest.id;
    // }

    // @Roles(ROOT)
    // @Post("JudgerPool/login")
    // async login(
    //     @Body() info: { name: string; maxTaskCount: number }
    // ): Promise<string> {
    //     await this.JudgerPool.login(info["name"], info["maxTaskCount"]);
    //     return "login!";
    // }

    // @Roles(ROOT)
    // @Post("JudgerPool/logout")
    // async logout(
    //     @Body() info: { name: string; maxTaskCount: number }
    // ): Promise<string> {
    //     await this.JudgerPool.logout(info["name"]);
    //     return "logout!";
    // }
}
