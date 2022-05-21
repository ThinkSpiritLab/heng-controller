import { Body, Controller, Post, Logger } from "@nestjs/common";
import {
    CreateJudgeOutput,
    CreateJudgeRequest,
} from "heng-protocol/external-protocol";
import { E_ROLE } from "src/auth/auth.decl";
import { NoAuthNoSignNoLog, Roles } from "src/auth/decorators/roles.decoraters";
import { ExternalService } from "./external.service";
import { CreateJudgeRequestDto } from "./external.dto";

@Controller("judges")
export class ExternalController {
    private readonly logger = new Logger("ExternalController");

    constructor(private readonly externalmoduleService: ExternalService) {}

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
    @NoAuthNoSignNoLog()
    @Post("/testurl")
    async testurl(@Body() Body: CreateJudgeRequest): Promise<void> {
        this.logger.log(`Receive: ${JSON.stringify(Body)}`);
    }
}
