import { Body, Controller, Post, Logger } from "@nestjs/common";
import {
    CreateJudgeOutput,
    CreateJudgeRequest
} from "heng-protocol/external-protocol";
import { NoAuthNoSign } from "src/auth/decorators/roles.decoraters";
import { ExternalModuleService } from "./external-module.service";
import { CreateJudgeRequestDto } from "./external.dto";

@Controller("judges")
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService
    ) {}
    private readonly logger = new Logger("ExternalController");

    // 分发任务
    @Post()
    @NoAuthNoSign()
    async createJudgeReq(
        @Body() body: CreateJudgeRequestDto
    ): Promise<CreateJudgeOutput> {
        return await this.externalmoduleService.createJudge(
            body as CreateJudgeRequest
        );
    }

    // 用于debug，模拟客户端的回调url接口
    @Post("/testurl")
    @NoAuthNoSign()
    async testurl(@Body() Body: CreateJudgeRequest): Promise<void> {
        this.logger.log(`Receive: ${JSON.stringify(Body)}`);
    }
}
