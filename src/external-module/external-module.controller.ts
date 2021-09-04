import { Body, Controller, Post, Logger } from "@nestjs/common";
import {
    CreateJudgeOutput,
    CreateJudgeRequest
} from "heng-protocol/external-protocol";
import { NoAuthNoSign } from "src/auth/decorators/roles.decoraters";
import { ExternalModuleService } from "./external-module.service";

@Controller("judges")
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService
    ) {}
    private readonly logger = new Logger("ExternalController");

    // 分发任务
    // TODO no validator
    @Post()
    async createJudgeReq(
        @Body() Body: CreateJudgeRequest
    ): Promise<CreateJudgeOutput> {
        return await this.externalmoduleService.createJudge(Body);
    }

    // 用于debug,此处debug的作用为模拟“结果更新”：会触发更新评测结果的函数，调用回调url
    // @Get("/test/reportFinish/:id")
    // async test(@Param("id") id: string): Promise<void> {
    //     const Args: FinishJudgesArgs = {
    //         id: id,
    //         result: {
    //             cases: [
    //                 {
    //                     kind: JudgeResultKind.Accepted,
    //                     time: 103,
    //                     memory: 3462,
    //                     extraMessage: undefined
    //                 }
    //             ],
    //             extra: undefined
    //         }
    //     };
    //     this.externalmoduleService.responseFinish(Args.id, Args.result);
    // }

    // 用于debug，模拟客户端的回调url接口
    @Post("/testurl")
    @NoAuthNoSign()
    async testurl(@Body() Body: CreateJudgeRequest): Promise<void> {
        this.logger.log(`Receive: ${JSON.stringify(Body)}`);
    }
}
