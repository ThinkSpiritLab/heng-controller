import { Injectable } from '@nestjs/common';
import { RedisService } from  "src/redis/redis.service"
// import { JudgeQueueService } from "SchedulerModule";
import { Logger } from "@nestjs/common"
import * as InternalProtocol from "heng-protocol/Internal-protocol"
import * as crypto from "crypto"
import InHTTP = InternalProtocol.HTTP
import { random } from 'lodash';
import { AcquireTokenOutput, AcquireTokenRequest, ErrorInfo } from 'heng-protocol/Internal-protocol/http';
import {} from "heng-protocol/external-protocol"
import { CreateJudgeRequest } from 'heng-protocol/Internal-protocol/ws';
import { AppGateway } from 'src/app.gateway';
@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger('ExternalModuleService')
    constructor (
       //  private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService,
        private readonly gateway: AppGateway
    ){}
    
    async JudgeLogin(req: AcquireTokenRequest): Promise <ErrorInfo | AcquireTokenOutput> {
        let errorinfo : InHTTP.ErrorInfo = {
            code:1,
            message:'error:名称冲突',
        } 
        if (await this.redisService.client.hexists('logon',req.name) == 1) 
            return errorinfo
        
        // 生成token并返回
        let token = crypto
        .createHmac("sha256",'secretkey')
        .update(String(random()))
        .digest('hex')
        let tokenoutput : AcquireTokenOutput = {
            token: token
        }
        this.redisService.client.hmset('Onlinetoken',token,req.name)
        return tokenoutput
    }

    
    // debug
    async createjudge(): Promise <void> {
        let judgerequest : CreateJudgeRequest
        this.gateway.emit()
    }

}
