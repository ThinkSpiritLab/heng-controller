import { Injectable } from '@nestjs/common';
import { timeStamp } from 'console';
import { json } from 'express';
import e = require('express');
import { InternalProtocol } from "heng-protocol";
import { ExternalProtocol } from "heng-protocol";
import { RedisService } from  "src/redis/redis.service"
import CreateJudgeRequest = ExternalProtocol.Post.CreateJudgeRequest
@Injectable()
export class ExternalModuleService {
    constructor (
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
        return req;
    }

    async ReqPrc(request: CreateJudgeRequest): Promise<string> {
        if (request.body.extra != undefined) {
            request.body.extra.forEach(element => {
                const req = this.ReqCat(request,element);
                 
            });
        }
        this.redisService.client.set(request.body.mainJudge.taskId,JSON.stringify(request))
        return request.body.mainJudge.taskId
    }
    
}
