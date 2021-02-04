import { Module } from "@nestjs/common";
import { RedisModule } from "src/redis/redis.module";
import { SchedulerService } from "src/scheduler/scheduler.service";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import { SchedulerController } from "./scheduler.debug.controller";

@Module({
    imports: [RedisModule],
    controllers: [SchedulerController],
    providers: [JudgeQueueService, SchedulerService, JudgerPoolService],
    exports: [JudgeQueueService, JudgerPoolService]
})
export class SchedulerModule {}
