import { Injectable } from '@nestjs/common';
import { RedisService } from  "src/redis/redis.service"
import { Logger } from "@nestjs/common"
import * as crypto from "crypto"
import { random } from 'lodash';
import { AcquireTokenOutput, AcquireTokenRequest, ErrorInfo } from 'heng-protocol/internal-protocol/http';
import { CreateJudgeRequest, ExitArgs, ReportStatusRequest, ReportStatusResponse } from 'heng-protocol/internal-protocol/ws'
import moment from 'moment'
import { JudgerGateway } from 'src/judger/judger.gateway'
import { JudgerService } from 'src/judger/judger.service'
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service"
@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger('ExternalModuleService')
    constructor (
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService,
        private readonly gateway: JudgerGateway,
        private readonly judgerservice: JudgerService,
    ){}
    


    //评测机注册，建立ws连接
    async JudgeLogin(req: AcquireTokenRequest): Promise <ErrorInfo | AcquireTokenOutput> {
        let errorinfo : ErrorInfo = {
            code:1,
            message:'名称与已有内容重复',
        } 
        if (await this.redisService.client.hexists('logon',req.name) == 1) 
            return errorinfo
        
        // 生成token并返回
        let token = await crypto
        .createHmac("sha256",'secretkey')
        .update(String(random()))
        .digest('hex')
        let tokenoutput : AcquireTokenOutput = {
            token: token
        }
        this.redisService.client.hmset('Onlinetoken',token,req.name)
        return tokenoutput
    }

    // 发送评测任务并等待回调
    async createjudge(req: CreateJudgeRequest): Promise <void> {
        if (await this.redisService.client.get('Taskids') == null)
            await this.redisService.client.set('Taskids','1')
        let taskid : number = parseInt(await this.redisService.client.get('Taskids') || '0')+1
        await this.redisService.client.set('Taskids',taskid)
        this.redisService.client.hmset('Task',taskid,JSON.stringify(req))
        console.log('发送id为: ${taskid} 的任务')
        await this.judgequeueService.push(String(taskid))
        //塞入队列后，等待评测机评测完毕后将结果回调
        //Q:评测机直接调用url还是在这里调用呢？
        //await this.clientgateway.emit('callbackurl',JSON.stringify(req))
    }

    //心跳不太会写


    //Exit，控制端要求下线
    async Exit(
        wsId: string,
        {reason}: ExitArgs
    ): Promise<void> {
        await this.gateway.forceDisconnect(wsId,reason || 'no reason');
        console.log('控制端要求下线')
    }


    async getLog(
        wsId: string
    ): Promise<string> {
        console.log(' 读取 Id为 ${wsId} 的评测机的日志 ')
       return await this.judgerservice.getlog(wsId)
    }


    async reportStatus(
        reportstatus: ReportStatusRequest
    ): Promise <ReportStatusResponse>{
        console.log('报告状况')
        try{
        return await this.judgerservice.reportStatus(reportstatus) //调用api?
        } catch (error){
            let ret: ReportStatusResponse = {
                type : "res",
                seq: 3,
                time: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
                body : {
                    error: {
                        code: 504,
                        message: '等待超时'
                    }
                }
            }
            return ret
        }
    }
}