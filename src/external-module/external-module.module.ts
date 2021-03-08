import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "../config/config-module/config.module";
import { RedisModule } from "../redis/redis.module";
import { SchedulerModule } from "../scheduler/scheduler.module";
import { ExternalModuleController } from "../external-module/external-module.controller";
import { ExternalModuleService } from "../external-module/external-module.service";
@Module({
    imports: [RedisModule, ConfigModule, forwardRef(() => SchedulerModule)],
    providers: [ExternalModuleService],
    controllers: [ExternalModuleController],
    exports: [ExternalModuleService]
})
export class ExternalModuleModule {}
