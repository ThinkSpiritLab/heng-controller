import { Module } from "@nestjs/common";
import { ConfigModule } from "../config/config-module/config.module";
import { RedisService } from "./redis.service";

@Module({
    imports: [ConfigModule],
    controllers: [],
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule {}
