import { forwardRef, Module } from "@nestjs/common";
import { RedisModule } from "src/redis/redis.module";
import { SchedulerService } from "src/scheduler/scheduler.service";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import { SchedulerController } from "./scheduler.debug.controller";
import { JudgerModule } from "src/judger/judger.module";

@Module({
    imports: [RedisModule, forwardRef(() => JudgerModule)],
    controllers: [SchedulerController],
    providers: [JudgeQueueService, SchedulerService, JudgerPoolService],
    exports: [JudgeQueueService, JudgerPoolService]
})
export class SchedulerModule {}
