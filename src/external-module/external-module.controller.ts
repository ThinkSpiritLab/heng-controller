import { Body, Controller, Post, Logger } from "@nestjs/common";
import {
    CreateJudgeOutput,
    CreateJudgeRequest
} from "heng-protocol/external-protocol";
import { E_ROLE } from "src/auth/auth.decl";
import { NoAuthNoSign, Roles } from "src/auth/decorators/roles.decoraters";
import { ExternalModuleService } from "./external-module.service";
import { CreateJudgeRequestDto } from "./external.dto";

@Controller("judges")
export class ExternalModuleController {
    private readonly logger = new Logger("ExternalController");

    constructor(
        private readonly externalmoduleService: ExternalModuleService
    ) {}

    // 分发任务
    @Roles(E_ROLE.USER)
    @Post()
    async createJudgeReq(
        @Body() body: CreateJudgeRequestDto
    ): Promise<CreateJudgeOutput> {
        return await this.externalmoduleService.createJudge(
            body as CreateJudgeRequest
        );
    }

    // 用于debug，模拟客户端的回调url接口
    @NoAuthNoSign()
    @Post("/testurl")
    async testurl(@Body() Body: CreateJudgeRequest): Promise<void> {
        this.logger.log(`Receive: ${JSON.stringify(Body)}`);
    }
}
