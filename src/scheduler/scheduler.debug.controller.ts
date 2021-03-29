import {
    Body,
    Controller,
    Post,
    UseGuards,
    UsePipes,
    ValidationPipe
} from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { CreateJudgeRequest } from "heng-protocol/external-protocol";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import { Roles } from "src/auth/decorators/roles.decoraters";
import { StringToArrPipe } from "src/auth/pipes/stringToArr.pipe";
import { RoleSignGuard } from "src/auth/auth.guard";
import { Admin, Root } from "src/auth/auth.decl";
@UseGuards(RoleSignGuard)
@Controller("/test/scheduler")
export class SchedulerController {
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly JudgerPool: JudgerPoolService
    ) {}

    @Roles(Root)
    @Post("judgeQueue/push")
    async createJudge(
        @Body() createJudgeRequest: CreateJudgeRequest
    ): Promise<string> {
        await this.judgeQueue.push(createJudgeRequest.id);
        return createJudgeRequest.id;
    }

    @Roles(Root)
    @Post("JudgerPool/login")
    async login(
        @Body() info: { name: string; maxTaskCount: number }
    ): Promise<string> {
        await this.JudgerPool.login(info["name"], info["maxTaskCount"]);
        return "login!";
    }

    @Roles(Root)
    @Post("JudgerPool/logout")
    async logout(
        @Body() info: { name: string; maxTaskCount: number }
    ): Promise<string> {
        await this.JudgerPool.logout(info["name"]);
        return "logout!";
    }
}
