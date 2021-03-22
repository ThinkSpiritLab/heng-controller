import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "./config/config-module/config.module";
import { RedisModule } from "./redis/redis.module";
import { JudgerModule } from "./judger/judger.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { ExternalModuleModule } from "./external-module/external-module.module";

@Module({
    imports: [
        ConfigModule,
        RedisModule,
        JudgerModule,
        SchedulerModule,
        ExternalModuleModule
    ],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
