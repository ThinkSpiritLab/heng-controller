import { Controller, Post, Req } from "@nestjs/common";
import * as InternalProtocol from "heng-protocol/internal-protocol";
import { ExternalModuleService } from "./external-module.service";
@Controller("external-module")
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService
    ) {}

    @Post("v1/judgers/token")
    async JudgeLogin(@Req() request: any): Promise<any> {
        // check signature valid
        // if (valid == 0) return errorinfo
        const body: InternalProtocol.HTTP.AcquireTokenRequest = request.query;
        return this.externalmoduleService.JudgeLogin(body);
    }
}
