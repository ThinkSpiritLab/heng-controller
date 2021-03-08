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
import { JudgerService } from "./judger.service";
import { RedisService } from "src/redis/redis.service";
import { JudgerGateway } from "./judger.gateway";
import { GetToken } from "./dto/judger.dto";
import {
    AcquireTokenOutput,
    ErrorInfo
} from "heng-protocol/internal-protocol/http";
import {
    ClosedToken,
    DisabledToken,
    JudgerLogSuf,
    OnlineToken
} from "./judger.decl";
import { RoleLevel } from "src/auth/auth.decl";
import { Roles } from "src/auth/decorators/roles.decoraters";

@Controller("judger")
export class JudgerController {
    private readonly logger = new Logger("judger controller");
    constructor(
        private readonly judgerService: JudgerService,
        private readonly redisService: RedisService,
        private readonly judgerGateway: JudgerGateway
    ) {}

    @Roles("judger","admin")
    @Post("token")
    async getToken(
        @Body() body: GetToken,
        @Req() req: Request
    ): Promise<AcquireTokenOutput | ErrorInfo> {
        try {
            const ip = String(
                req.headers["x-forwarded-for"] ?? "unknown"
            ).split(",")[0];
            const res: AcquireTokenOutput = {
                token: await this.judgerGateway.getToken(
                    body.maxTaskCount,
                    body.coreCount ?? 0,
                    body.name ?? ip,
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
    @Roles("judger")
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
    @Roles("judger")
    @Post("task/:wsId/:taskId")
    async testJudgeRequest(
        @Param("taskId") taskId: string,
        @Param("wsId") wsId: string
    ): Promise<void> {
        this.logger.debug(`为评测机 ${wsId} 分发任务 ${taskId}`);
        return await this.judgerService.distributeTask(wsId, taskId);
    }

    // 测试 Exit
    @Roles("judger")
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
    @Roles("judger")
    @Post("close/:wsId")
    async testClose(
        @Param("taskId") taskId: string,
        @Param("wsId") wsId: string
    ): Promise<void> {
        return await this.judgerGateway.forceDisconnect(wsId, "管理员主动断开");
    }

    @Roles("judger")
    @Get("log/:wsId")
    async getLog(@Param("wsId") wsId: string): Promise<string[]> {
        return await this.redisService.client.lrange(
            wsId + JudgerLogSuf,
            0,
            10000
        );
    }

    @Roles("judger")
    @Get("alltoken")
    async getAllToken(): Promise<{ [key: string]: string[] }> {
        return {
            online: await this.redisService.client.hkeys(OnlineToken),
            disabled: await this.redisService.client.hkeys(DisabledToken),
            closed: await this.redisService.client.hkeys(ClosedToken)
        };
    }

    /**
     * 返回一个 ErrorResponse
     * @param code
     * @param message
     */
    makeErrorResponse(code: number, message: string): ErrorInfo {
        const res: ErrorInfo = {
            code: code,
            message: message
        };
        return res;
    }
}
