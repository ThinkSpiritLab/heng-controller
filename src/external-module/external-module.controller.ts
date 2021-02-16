import { Controller, Post, Req, Body, Head, Get } from '@nestjs/common';
import * as InternalProtocol from "heng-protocol/internal-protocol";
import { RedisService } from "src/redis/redis.service"
import { ExternalModuleService } from "./external-module.service"
@Controller('external-module')
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService,
    ){}
    
    @Post("v1/judgers/token")
    async JudgeLogin(@Req() request): Promise <any> {
        let header = request.headers
        // check signature valid
        // if (valid == 0) return errorinfo
        let body: InternalProtocol.HTTP.AcquireTokenRequest = request.query
        return this.externalmoduleService.JudgeLogin(body)
    }
    
}
