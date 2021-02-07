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
    async requestTransmit(request :CreateJudgeRequest): Promise <string> {//�������ָ��
        //��������ָ��
            //��������ָ�����taskid
        const taskid = await this.externalmoduleService.ReqPrc(request)
        //��������ָ��
        const requestresult = await this.scheduler.push(taskid)
        // ����������
        return requestresult
    }
}
