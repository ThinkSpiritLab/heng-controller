import { Injectable } from '@nestjs/common';
import { ExternalProtocol } from "heng-protocol";
import { RedisService } from  "src/redis/redis.service"
import { JudgeQueueService } from "SchedulerModule";
import { Logger } from "@nestjs/common"
import CreateJudgeRequest = ExternalProtocol.Post.CreateJudgeRequest
import CreateJudgeResponse = ExternalProtocol.Post.CreateJudgesResponse
@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger('ExternalModuleService')
    constructor (
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService
    ){}
    
    ReqCat(request: CreateJudgeRequest, cat: ExternalProtocol.Post.ExtendJudgeRequest): CreateJudgeRequest {
        if (cat.judgeCallbackUrls == undefined ){
            cat.judgeCallbackUrls = request.body.mainJudge.judgeCallbackUrls
        }
        let mainJudge: ExternalProtocol.Post.JudgeRequest = {
            taskId: cat.taskId,
            judge: cat.judge,
            judgeCallbackUrls: cat.judgeCallbackUrls,
        }
        let Body : ExternalProtocol.Post.CreateJudgePayload = {
            mainJudge: mainJudge
        }
        let req: CreateJudgeRequest = {
            nonce: request.nonce,
            timestamp: request.timestamp,
            body:Body,
            accesskey: request.accesskey,
            signature: request.signature
        }
        this.logger.log('[ExternalModule-ReqPrc-ReqCat]:${cat.taskId} cat finished')
        return req;
    }

    async ReqPrc(request: CreateJudgeRequest): Promise<string> {
        if (request.body.extra != undefined) {
            request.body.extra.forEach(async element => {
                const req = this.ReqCat(request,element);
                await this.redisService.client.set(request.body.mainJudge.taskId,JSON.stringify(req))
                await this.judgequeueService.push(element.taskId)
                this.logger.log('[ExternalModule-ReqPrc]:${element.taskId} pushed')
            });
        }
        this.redisService.client.set(request.body.mainJudge.taskId,JSON.stringify(request))
        await this.judgequeueService.push(request.body.mainJudge.taskId)
        this.logger.log('[ExternalModule-ReqPrc]:${request.body.mainJudge.taskId} pushed')
        return '[ExternalModule] 转发评测指令完成'
    }
    
    async ResultGet(response: CreateJudgeResponse) {
        response
    }
}
