import { Controller, Post } from '@nestjs/common';
import { ExternalProtocol } from "heng-protocol";
import { ExternalModuleService } from "./external-module.service"
import { JudgeQueueService } from "SchedulerModule";
import CreateJudgeRequest = ExternalProtocol.Post.CreateJudgeRequest
@Controller('external-module')
export class ExternalModuleController {
    constructor(
        private readonly scheduler: JudgeQueueService,
        private readonly externalmoduleService: ExternalModuleService,
    ){}

    @Post("/v1/judges")
    async requestTransmit(request :CreateJudgeRequest): Promise <string> {//获得评测指令
        //处理评测指令
            //处理评测指令，返回taskid
        const taskid = await this.externalmoduleService.ReqPrc(request)
        //发放评测指令
        const requestresult = await this.scheduler.push(taskid)
        // 返回评测结果
        return requestresult
    }
}
