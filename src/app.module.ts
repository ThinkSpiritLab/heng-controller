import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "./config/config-module/config.module";
import { RedisModule } from "./redis/redis.module";
import { JudgerModule } from "./judger/judger.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import {AuthModule} from "./auth/auth.module"
import { KeyModule } from "./auth/key/key.module";
@Module({
    imports: [ConfigModule, RedisModule, JudgerModule, SchedulerModule,AuthModule,KeyModule],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
