import { Module } from "@nestjs/common";
import { KeyController } from "./key.controller";
import { ConfigModule } from "src/config/config-module/config.module";
import { RedisModule } from "src/redis/redis.module";
import { KeyService } from "./key.service";
@Module({
    imports: [RedisModule,ConfigModule],
    providers: [KeyService],
    controllers: [KeyController]
})
export class KeyModule {}
