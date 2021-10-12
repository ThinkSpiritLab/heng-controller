import {
    BadRequestException,
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
import {
    ControllerTaskStatus,
    GetToken,
    JudgerDetail,
    SystemStatus
} from "./judger.dto";
import { JudgerGateway } from "./judger.gateway";
import { JudgerService } from "./judger.service";
import os from "os";
import { HardwareStatus, StatusReport } from "heng-protocol";
import { ExternalModuleService } from "src/external-module/external-module.service";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import {
    R_Hash_AllReport,
    R_Hash_AllToken,
    R_List_JudgerLog_Suf,
    Token,
    TokenStatus
} from "./judger.decl";
import { ReportStatusArgs } from "heng-protocol/internal-protocol/ws";

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

    //------------------------- ADMIN ------------------------------
    @Roles(E_ROLE.ADMIN)
    @Post(":wsId/exit")
    async lettExit(@Param("wsId") wsId: string): Promise<void> {
        return await this.judgerGateway.callExit(wsId, {
            reason: "管理员手动操作"
        });
    }

    @Roles(E_ROLE.ADMIN)
    @Post(":wsId/close")
    async letClose(@Param("wsId") wsId: string): Promise<void> {
        return await this.judgerGateway.forceDisconnect(wsId, "管理员主动断开");
    }

    @Roles(E_ROLE.ADMIN, E_ROLE.OBSERVER)
    @Get(":wsId/info")
    async getJugderStatus(@Param("wsId") wsId: string): Promise<JudgerDetail> {
        const tokenStatusDic = await this.judgerService.getTokenStatusDic();
        const infoString = await this.redisService.client.hget(
            R_Hash_AllToken,
            wsId
        );
        if (infoString === null) {
            throw new BadRequestException();
        }
        const reportString = await this.redisService.client.hget(
            R_Hash_AllReport,
            wsId
        );
        return {
            log: await this.redisService.client.lrange(
                wsId + R_List_JudgerLog_Suf,
                0,
                100
            ),
            report: reportString
                ? (JSON.parse(reportString) as ReportStatusArgs).report
                : undefined,
            info: JSON.parse(infoString),
            status: tokenStatusDic[wsId] ?? TokenStatus.Unused
        };
    }

    // @Roles(E_ROLE.ADMIN, E_ROLE.OBSERVER)
    // @Get(":wsId/log")
    // getJugderLog(@Param("wsId") wsId: string): Promise<string[]> {
    //     return this.redisService.client.lrange(
    //         wsId + R_List_JudgerLog_Suf,
    //         0,
    //         100
    //     );
    // }

    @Roles(E_ROLE.ADMIN, E_ROLE.OBSERVER)
    @Get("systemStatus")
    async stat(): Promise<SystemStatus> {
        const loadavg = os.loadavg() as [number, number, number];
        const controllerHardware: HardwareStatus = {
            cpu: {
                percentage: loadavg[0] / os.cpus().length,
                loadavg
            },
            memory: { percentage: 1 - os.freemem() / os.totalmem() }
        };
        const redisRet = (
            await this.redisService.client
                .multi()
                .hlen(ExternalModuleService.RedisKeys.R_Hash_JudgeInfo)
                .llen(JudgeQueueService.R_List_PendingQueue)
                .llen(ExternalModuleService.RedisKeys.R_List_ResultQueue)
                .hgetall(R_Hash_AllReport)
                .hgetall(R_Hash_AllToken)
                .exec()
        ).map(v => {
            if (v[0] !== null) {
                throw v[0];
            }
            return v[1];
        });
        const controllerTask: ControllerTaskStatus = {
            inDb: redisRet[0],
            inQueue: redisRet[1],
            cbQueue: redisRet[2]
        };
        const allReport = redisRet[3];
        const allToken = redisRet[4];
        const judgers: {
            wsId: string;
            info: Token;
            report?: StatusReport;
            status: TokenStatus;
        }[] = [];

        const tokenStatusDic = await this.judgerService.getTokenStatusDic();

        for (const wsId in allToken) {
            judgers.push({
                wsId,
                info: JSON.parse(allToken[wsId]),
                report: allReport[wsId]
                    ? (JSON.parse(allReport[wsId]) as ReportStatusArgs).report
                    : undefined,
                status: tokenStatusDic[wsId] ?? TokenStatus.Unused
            });
        }
        return {
            controller: {
                hardware: controllerHardware,
                task: controllerTask
            },
            judgers
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
