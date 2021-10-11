import {
    Body,
    Controller,
    Get,
    Logger,
    Param,
    Post,
    Req
} from "@nestjs/common";
import { Request } from "express";
import {
    AcquireTokenOutput,
    ErrorInfo
} from "heng-protocol/internal-protocol/http";
import { E_ROLE } from "src/auth/auth.decl";
import { Roles } from "src/auth/decorators/roles.decoraters";
import { RedisService } from "src/redis/redis.service";
import { GetToken } from "./dto/judger.dto";
import {
    R_Hash_ClosedToken,
    R_Hash_DisabledToken,
    R_List_JudgerLog_Suf,
    R_Hash_OnlineToken
} from "./judger.decl";
import { JudgerGateway } from "./judger.gateway";
import { JudgerService } from "./judger.service";

@Controller("judger")
export class JudgerController {
    private readonly logger = new Logger("JudgerController");
    constructor(
        private readonly judgerService: JudgerService,
        private readonly redisService: RedisService,
        private readonly judgerGateway: JudgerGateway
    ) {}

    @Roles(E_ROLE.JUDGER)
    @Post("token")
    async getToken(
        @Body() body: GetToken,
        @Req() req: Request
    ): Promise<AcquireTokenOutput | ErrorInfo> {
        try {
            const ip = req.realIp;
            const res: AcquireTokenOutput = {
                token: await this.judgerGateway.getToken(
                    body.maxTaskCount,
                    body.coreCount ?? 0,
                    (body.name ?? ip).replace(/\./g, "_"),
                    body.software ?? "unknown",
                    ip
                )
            };
            return res;
        } catch (error) {
            return this.makeErrorResponse(500, "内部错误");
        }
    }

    //-------------------------FIXME/DEBUG------------------------------
    @Roles(E_ROLE.ADMIN)
    @Post("task")
    async testMultiJudgeRequest(
        @Body("body") allRequest: { taskId: string; wsId: string }[]
    ): Promise<void> {
        allRequest.forEach(async r => {
            this.logger.debug(`为评测机 ${r.wsId} 分发任务 ${r.taskId}`);
            return await this.judgerService.distributeTask(r.wsId, r.taskId);
        });
    }

    // 测试分发任务
    @Roles(E_ROLE.ADMIN)
    @Post("task/:wsId/:taskId")
    async testJudgeRequest(
        @Param("taskId") taskId: string,
        @Param("wsId") wsId: string
    ): Promise<void> {
        this.logger.debug(`为评测机 ${wsId} 分发任务 ${taskId}`);
        return await this.judgerService.distributeTask(wsId, taskId);
    }

    // 测试 Exit
    @Roles(E_ROLE.ADMIN)
    @Post("exit/:wsId")
    async testExit(
        @Param("taskId") taskId: string,
        @Param("wsId") wsId: string
    ): Promise<void> {
        return await this.judgerGateway.callExit(wsId, {
            reason: "管理员手动操作"
        });
    }

    // 测试 Close
    @Roles(E_ROLE.ADMIN)
    @Post("close/:wsId")
    async testClose(
        @Param("taskId") taskId: string,
        @Param("wsId") wsId: string
    ): Promise<void> {
        return await this.judgerGateway.forceDisconnect(wsId, "管理员主动断开");
    }

    @Roles(E_ROLE.ADMIN)
    @Get("log/:wsId")
    async getLog(@Param("wsId") wsId: string): Promise<string[]> {
        return await this.redisService.client.lrange(
            wsId + R_List_JudgerLog_Suf,
            0,
            10000
        );
    }

    @Roles(E_ROLE.ADMIN)
    @Get("alltoken")
    async getAllToken(): Promise<{ [key: string]: string[] }> {
        return {
            online: await this.redisService.client.hkeys(R_Hash_OnlineToken),
            disabled: await this.redisService.client.hkeys(
                R_Hash_DisabledToken
            ),
            closed: await this.redisService.client.hkeys(R_Hash_ClosedToken)
        };
    }

    /**
     * 返回一个 ErrorResponse
     * @param code
     * @param message
     */
    private makeErrorResponse(code: number, message: string): ErrorInfo {
        const res: ErrorInfo = {
            code: code,
            message: message
        };
        return res;
    }
}
