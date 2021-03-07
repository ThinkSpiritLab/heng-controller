import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { JudgeResultKind } from "heng-protocol";
import {
    CreateJudgeOutput,
    CreateJudgeRequest
} from "heng-protocol/external-protocol";
import { FinishJudgesArgs } from "heng-protocol/internal-protocol/ws";
import { ExternalModuleService } from "./external-module.service";
@Controller("external-module")
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService
    ) {}

    // 分发任务
    @Post("/judges")
    async CreateJudgeReq(
        @Body() Body: CreateJudgeRequest
    ): Promise<CreateJudgeOutput> {
        return await this.externalmoduleService.createJudge(Body);
    }

    //用于debug,此处debug的作用为模拟更新结果的函数
    @Get("/test/:id")
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
        this.externalmoduleService.responseFinish(Args.id, Args);
    }

    //用于debug，模拟客户端的回调url接口
    @Post("/testurl")
    async testurl(@Body() Body: CreateJudgeRequest): Promise<void> {
        console.log("收到url一份,url的body信息为：");
        console.log(Body);
    }
}
