import { Module } from "@nestjs/common";
import { RedisModule } from "src/redis/redis.module";
import { SchedulerController } from "src/scheduler/scheduler.controller";
import { SchedulerService } from "src/scheduler/scheduler.service";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";

@Module({
    imports: [RedisModule, SchedulerModule],
    controllers: [SchedulerController],
    providers: [JudgeQueueService, SchedulerService]
})
export class SchedulerModule {}
