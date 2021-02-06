import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "./config/config-module/config.module";
import { RedisModule } from "./redis/redis.module";
import { ExternalModuleController } from './external-module/external-module.controller';
import { ExternalModuleService } from './external-module/external-module.service';

@Module({
    imports: [ConfigModule, RedisModule],
    controllers: [AppController, ExternalModuleController],
    providers: [AppService, ExternalModuleService]
})
export class AppModule {}
