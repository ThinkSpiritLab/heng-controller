import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { json } from "express";
import { JudgeResultKind } from "heng-protocol";
import { CreateJudgeRequest } from "heng-protocol/external-protocol";
import { FinishJudgesArgs } from "heng-protocol/internal-protocol/ws";
import { ExternalModuleService } from "./external-module.service";
@Controller("external-module")
export class ExternalModuleController {
    constructor(
        private readonly externalmoduleService: ExternalModuleService
    ) {}

    // 分发任务
    @Post("/judges")
    async CreateJudgeReq(@Body() Body: CreateJudgeRequest): Promise<any> {
        return await this.externalmoduleService.createjudge(Body);
    }

    // //用于debug
    // @Get("/test/:id")
    // async test(@Param("id") id: any): Promise<void>{
    //     const Args: FinishJudgesArgs =
    //     [{id:id,
    //         result: {
    //             cases: [{
    //                 kind: JudgeResultKind.Accepted,
    //                 time: 103,
    //                 memory: 3462,
    //                 extraMessage: undefined
    //             }],
    //             extra: undefined}
    //     }];
    //     this.externalmoduleService.responsefinish(Args[0].id,Args);
    // }

    // //用于debug httppost
    // @Post("/testurl")
    // async testurl(@Body() Body: CreateJudgeRequest): Promise<void>{
    //     console.log("收到url一份");
    //     console.log(Body);
    // }
}
