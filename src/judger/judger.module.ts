import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { ConfigModule } from "src/config/config-module/config.module";
import { ExternalModuleModule } from "src/external-module/external-module.module";
import { RedisModule } from "src/redis/redis.module";
import { SchedulerModule } from "src/scheduler/scheduler.module";
import { JudgerController } from "./judger.controller";
import { JudgerGateway } from "./judger.gateway";
import { JudgerService } from "./judger.service";

@Module({
    imports: [
        RedisModule,
        ConfigModule,
        forwardRef(() => SchedulerModule),
        forwardRef(() => ExternalModuleModule),
        AuthModule
    ],
    providers: [JudgerGateway, JudgerService],
    controllers: [JudgerController],
    exports: [JudgerGateway, JudgerService]
})
export class JudgerModule {}
