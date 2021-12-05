import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "../config/config-module/config.module";
import { RedisModule } from "../redis/redis.module";
import { SchedulerModule } from "../scheduler/scheduler.module";
import { ExternalController } from "./external.controller";
import { ExternalService } from "./external.service";
@Module({
    imports: [RedisModule, ConfigModule, forwardRef(() => SchedulerModule)],
    providers: [ExternalService],
    controllers: [ExternalController],
    exports: [ExternalService]
})
export class ExternalModule {}
