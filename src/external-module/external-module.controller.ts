import { Body, Controller, Post } from "@nestjs/common";
import { CreateJudgeRequest } from "heng-protocol/external-protocol";
import { ExternalModuleService } from "./external-module.service";
@Controller("external-module")
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService
    ) {}

    // 分发任务
    @Post("/v1/judges")
    async CreateJudgeReq(@Body() req: CreateJudgeRequest): Promise<void> {
        return await this.externalmoduleService.createjudge(req);
    }
}
