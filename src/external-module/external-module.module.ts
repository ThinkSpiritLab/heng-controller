import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule } from "src/config/config-module/config.module";
import { RedisModule } from "src/redis/redis.module";
import { SchedulerModule } from "src/scheduler/scheduler.module";
import { ExternalModuleController } from "src/external-module/external-module.controller";
import { ExternalModuleService } from "src/external-module/external-module.service";
@Module({
    imports: [RedisModule, ConfigModule, forwardRef(() => SchedulerModule)],
    providers: [ExternalModuleService],
    controllers: [ExternalModuleController],
    exports: [ExternalModuleService]
})
export class ExternalModuleModule {}
