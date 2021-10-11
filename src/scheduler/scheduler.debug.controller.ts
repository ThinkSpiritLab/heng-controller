import { Controller, UseGuards } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import { RoleSignGuard } from "src/auth/auth.guard";
@UseGuards(RoleSignGuard)
@Controller("/test/scheduler")
export class SchedulerController {
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly JudgerPool: JudgerPoolService
    ) {}
}
