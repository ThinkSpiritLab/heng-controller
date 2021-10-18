import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { ConfigModule } from "src/config/config-module/config.module";
import { ExternalModule } from "src/external/external.module";
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
        forwardRef(() => ExternalModule),
        AuthModule
    ],
    providers: [JudgerGateway, JudgerService],
    controllers: [JudgerController],
    exports: [JudgerGateway, JudgerService]
})
export class JudgerModule {}
