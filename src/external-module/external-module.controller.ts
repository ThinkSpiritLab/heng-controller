import { Body, Controller, Get, Param, Post, Logger } from "@nestjs/common";
import { JudgeResultKind } from "heng-protocol";
import {
    CreateJudgeOutput,
    CreateJudgeRequest
} from "heng-protocol/external-protocol";
import { FinishJudgesArgs } from "heng-protocol/internal-protocol/ws";
import { ExternalModuleService } from "./external-module.service";
@Controller("judges")
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService
    ) {}
    private readonly logger = new Logger("ExternalController");

    // 分发任务
    @Post()
    async createJudgeReq(
        @Body() Body: CreateJudgeRequest
    ): Promise<CreateJudgeOutput> {
        return await this.externalmoduleService.createJudge(Body);
    }

    //用于debug,此处debug的作用为模拟“结果更新”：会触发更新评测结果的函数，调用回调url
    @Get("/test/reportFinish/:id")
    async test(@Param("id") id: string): Promise<void> {
        const Args: FinishJudgesArgs = {
            id: id,
            result: {
                cases: [
                    {
                        kind: JudgeResultKind.Accepted,
                        time: 103,
                        memory: 3462,
                        extraMessage: undefined
                    }
                ],
                extra: undefined
            }
        };
        this.externalmoduleService.responseFinish(Args.id, Args.result);
    }

    //用于debug，模拟客户端的回调url接口
    @Post("/testurl")
    async testurl(@Body() Body: CreateJudgeRequest): Promise<void> {
        this.logger.log(
            `模拟回调接口收到url一份,url的body信息为：${JSON.stringify(Body)}`
        );
    }
}
