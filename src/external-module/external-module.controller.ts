import { Controller, Post, Get, Render } from '@nestjs/common';
import * as ExternalProtocol from "heng-protocol/external-protocol";
import { RedisService } from "src/redis/redis.service"
import { ExternalModuleService } from "./external-module.service"
import CreateJudgeRequest = ExternalProtocol.CreateJudgeRequest
@Controller('external-module')
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService,
        private readonly redisService: RedisService
    ){}
    
    @Post("v1/judgers/token")
    async examinerLogin(request: string): Promise <string> {
        return this.externalmoduleService.ExaminerLogin(request)
    }

    @Post("/v1/judgeReq")
    async requestTransmit(request: CreateJudgeRequest): Promise <string> {//转发评测指令
        //处理评测指令
        const returnvalue = await this.externalmoduleService.ReqPrc(request)
        return returnvalue
    }

    @Get("/v1/judgeRes")
    async responseGet(taskid: Number): Promise<HttpResponse> {
        let set: string = 'Calbcks' + String(taskid)
        let x: HttpResponse = JSON.parse(String(this.redisService.client.get(set)))
        return x;
    }

    
}
