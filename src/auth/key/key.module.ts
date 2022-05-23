import { Module } from "@nestjs/common";
import { KeyController } from "./key.controller";
import { ConfigModule } from "../../config/config-module/config.module";
import { RedisModule } from "../../redis/redis.module";
import { KeyService } from "./key.service";
@Module({
    imports: [RedisModule, ConfigModule],
    controllers: [KeyController],
    providers: [KeyService],
    exports: [KeyService],
})
export class KeyModule {}
