import { forwardRef, Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { SchedulerService } from "../scheduler/scheduler.service";
import { JudgeQueueService } from "../scheduler/judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import { JudgerModule } from "../judger/judger.module";
import { ConfigModule } from "../config/config-module/config.module";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [
        RedisModule,
        ConfigModule,
        forwardRef(() => JudgerModule),
        forwardRef(() => AuthModule),
    ],
    providers: [JudgeQueueService, SchedulerService, JudgerPoolService],
    exports: [JudgeQueueService, JudgerPoolService],
})
export class SchedulerModule {}
