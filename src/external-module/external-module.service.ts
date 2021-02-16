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
    


    //�����ע�ᣬ����ws����
    async JudgeLogin(req: AcquireTokenRequest): Promise <ErrorInfo | AcquireTokenOutput> {
        let errorinfo : ErrorInfo = {
            code:1,
            message:'���������������ظ�',
        } 
        if (await this.redisService.client.hexists('logon',req.name) == 1) 
            return errorinfo
        
        // ����token������
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

    // �����������񲢵ȴ��ص�
    async createjudge(req: CreateJudgeRequest): Promise <void> {
        if (await this.redisService.client.get('Taskids') == null)
            await this.redisService.client.set('Taskids','1')
        let taskid : number = parseInt(await this.redisService.client.get('Taskids') || '0')+1
        await this.redisService.client.set('Taskids',taskid)
        this.redisService.client.hmset('Task',taskid,JSON.stringify(req))
        console.log('����idΪ: ${taskid} ������')
        await this.judgequeueService.push(String(taskid))
        //������к󣬵ȴ������������Ϻ󽫽���ص�
        //Q:�����ֱ�ӵ���url��������������أ�
        //await this.clientgateway.emit('callbackurl',JSON.stringify(req))
    }

    //������̫��д


    //Exit�����ƶ�Ҫ������
    async Exit(
        wsId: string,
        {reason}: ExitArgs
    ): Promise<void> {
        await this.gateway.forceDisconnect(wsId,reason || 'no reason');
        console.log('���ƶ�Ҫ������')
    }


    async getLog(
        wsId: string
    ): Promise<string> {
        console.log(' ��ȡ IdΪ ${wsId} �����������־ ')
       return await this.judgerservice.getlog(wsId)
    }


    async reportStatus(
        reportstatus: ReportStatusRequest
    ): Promise <ReportStatusResponse>{
        console.log('����״��')
        try{
        return await this.judgerservice.reportStatus(reportstatus) //����api?
        } catch (error){
            let ret: ReportStatusResponse = {
                type : "res",
                seq: 3,
                time: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
                body : {
                    error: {
                        code: 504,
                        message: '�ȴ���ʱ'
                    }
                }
            }
            return ret
        }
    }
}