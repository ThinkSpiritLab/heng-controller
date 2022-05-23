import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConfigModule } from "../config/config-module/config.module";
import { ExternalModule } from "../external/external.module";
import { RedisModule } from "../redis/redis.module";
import { SchedulerModule } from "../scheduler/scheduler.module";
import { JudgerController } from "./judger.controller";
import { JudgerGateway } from "./judger.gateway";
import { JudgerService } from "./judger.service";

@Module({
    imports: [
        RedisModule,
        ConfigModule,
        forwardRef(() => SchedulerModule),
        forwardRef(() => ExternalModule),
        AuthModule,
    ],
    providers: [JudgerGateway, JudgerService],
    controllers: [JudgerController],
    exports: [JudgerGateway, JudgerService],
})
export class JudgerModule {}
