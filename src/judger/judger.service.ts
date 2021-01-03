import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { JudgerConfig } from "src/config/judger.config";
import { ConfigService } from "src/config/config-module/config.service";

@Injectable()
export class JudgerService {
    private logger = new Logger("Judger");
    private readonly judgerConfig: JudgerConfig;

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.judgerConfig = this.configService.getConfig().judger;
    }

    // 此 provider 目前闲置
}
