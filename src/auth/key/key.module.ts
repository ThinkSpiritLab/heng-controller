import { Module } from "@nestjs/common";
import { KeyService } from "./key.service";
import { KeyController } from "./key.controller";

import { ConfigModule } from "src/config/config-module/config.module";
import { RedisModule } from "src/redis/redis.module";
@Module({
    imports: [RedisModule],
    providers: [KeyService],
    controllers: [KeyController]
})
export class KeyModule {}
