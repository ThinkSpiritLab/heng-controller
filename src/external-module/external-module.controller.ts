import { Controller, Post } from '@nestjs/common';
import { ExternalProtocol } from "heng-protocol";
import { ReqPrc } from "./external-module.service"
import { JudgeQueueService } from "SchedulerModule";
import CreateJudgeRequest = ExternalProtocol.Post.CreateJudgeRequest
@Controller('external-module')
export class ExternalModuleController {
    constructor(
        private readonly scheduler: JudgeQueueService,
        private readonly reqprc: ReqPrc,
    ){}

    @Post("/get-req")
    async requestTransmit(request :CreateJudgeRequest): Promise <string> {//获得评测指令
        //处理评测指令
            //处理评测指令，返回taskid
        const taskid = await this.reqprc.push(request)
        //发放评测指令
        const requestresult = await this.scheduler.push(taskid)
        return requestresult
    }
}
