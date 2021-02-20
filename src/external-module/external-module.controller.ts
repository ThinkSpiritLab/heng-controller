import { Controller, Post, Req } from "@nestjs/common";
import { CreateJudgeOutput, CreateJudgeRequest } from "heng-protocol/external-protocol";
import * as InternalProtocol from "heng-protocol/internal-protocol";
import { ExternalModuleService } from "./external-module.service";
@Controller("external-module")
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService,
        private readonly seq: number
    ) {}

    // �ַ�����
    @Post("/v1/judges")
    async CreateJudgeReq(req: CreateJudgeRequest): Promise<void> {
        return await this.externalmoduleService.createjudge(req);
    }

    // ����ص�
    @Post("/v1/judges")
    async JudgeCalback(req:)
}
