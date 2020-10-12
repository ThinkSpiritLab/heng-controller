import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "./config/config-module/config.module";
import { RedisModule } from "./redis/redis.module";

@Module({
    imports: [ConfigModule, RedisModule],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
