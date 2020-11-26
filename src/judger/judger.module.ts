import { Module } from "@nestjs/common";
import { JudgerService } from "./judger.service";
import { JudgerController } from "./judger.controller";
import { RedisModule } from "src/redis/redis.module";
import { JudgerGateway } from "./judger.gateway";

@Module({
    imports: [RedisModule],
    providers: [JudgerService, JudgerGateway],
    controllers: [JudgerController]
})
export class JudgerModule {}
