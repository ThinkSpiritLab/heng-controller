import { Module } from "@nestjs/common";
import { RedisModule } from "src/redis/redis.module";
import { SchedulerService } from "src/scheduler/scheduler.service";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import { SchedulerController } from "./scheduler.controller";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";

@Module({
    imports: [RedisModule],
    controllers: [SchedulerController],
    providers: [JudgeQueueService, SchedulerService, JudgerPoolService]
})
export class SchedulerModule {}
