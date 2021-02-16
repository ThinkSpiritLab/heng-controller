import { AppGateway } from "./app.gateway";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "./config/config-module/config.module";
import { RedisModule } from "./redis/redis.module";
<<<<<<< HEAD
import { JudgerModule } from "./judger/judger.module";
import { SchedulerModule } from "./scheduler/scheduler.module";

@Module({
    imports: [ConfigModule, RedisModule, JudgerModule, SchedulerModule],
    controllers: [AppController],
    providers: [AppService]
=======
import { ExternalModuleController } from './external-module/external-module.controller';
import { ExternalModuleService } from './external-module/external-module.service';

@Module({
    imports: [ConfigModule, RedisModule],
    controllers: [AppController, ExternalModuleController],
    providers: [AppService, ExternalModuleService, AppGateway]
>>>>>>> em
})
export class AppModule {}
