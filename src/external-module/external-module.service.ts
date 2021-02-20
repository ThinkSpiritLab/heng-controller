import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { random } from "lodash";
import {
    AcquireTokenOutput,
    AcquireTokenRequest,
    ErrorInfo
} from "heng-protocol/internal-protocol/http";
import {
    CreateJudgeRequest,
    ExitArgs,
    FinishJudgesResponse,
    ReportStatusRequest,
    ReportStatusResponse,
    UpdateJudgesRequest,
    UpdateJudgesResponse
} from "heng-protocol/internal-protocol/ws";
import * as external from "heng-protocol/external-protocol"
import moment from "moment";
import { JudgerGateway } from "src/judger/judger.gateway";
import { JudgerService } from "src/judger/judger.service";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import { type } from "os";
@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger("ExternalModuleService");
    constructor(
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService,
        private readonly gateway: JudgerGateway,
        private readonly judgerservice: JudgerService
    ) {}
    // 协议内外转换
    async judgereqconvert(taskid: number,exreq: external.CreateJudgeRequest): Promise <CreateJudgeRequest> {
        await this.redisService.client.hmset("ExternalModule:calbckurl:upd",taskid,exreq.callbackUrls.update)
        await this.redisService.client.hmset("ExternalModule:calbckurl:fin",taskid,exreq.callbackUrls.finish)
        await this.redisService.client.incr("ExternalModule:seq");
        const seq:number = parseInt(await this.redisService.client.get("ExternalModule:seq") || "0" )
        const inreq: CreateJudgeRequest = {
            type: "req",
            body: {
                method:"CreateJudge",
                args: exreq
            },
            seq:seq,
            time:moment().format("YYYY-MM-DDTHH:mm:ssZ")
        }
        return inreq        ;
    }

    // 创建评测任务
    async createjudge(req: external.CreateJudgeRequest): Promise<void> {
        await this.redisService.client.incr("taskSeq");
        const taskid: number = parseInt(await this.redisService.client.get("taskSeq") || "0" );
        const inreq: CreateJudgeRequest = await this.judgereqconvert(taskid,req);
        await this.redisService.client.hmset("Taskids", taskid, JSON.stringify(inreq));
        console.log("发送id为: ${taskid} 的任务");
        await this.judgequeueService.push(String(taskid));
    }

    // 评测任务回调
    async responseupdate(res: UpdateJudgesRequest): Promise<UpdateJudgesResponse> {
        const ret : external.UpdateJudgeCallback = {
            id: res.body.args[0].id, 
            state: res.body.args[0].state,
            seq:
        }
        return ret
    }

    async responsefinish(res:FinishJudgesRequest):Promise<FinishJudgesResponse> {


    }

}