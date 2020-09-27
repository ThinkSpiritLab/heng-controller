import { Controller, Get, Param } from "@nestjs/common";
import { AppService } from "./app.service";
import { ConfigService } from "./config/config-module/config.service";
import { Config } from "./config/config";
import { RedisService } from "./redis/redis.service";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    // FIXME: remove this api in production
    @Get("/test")
    getConfig(): Config {
        console.log(this.configService.getConfig().server);
        return this.configService.getConfig();
    }

    @Get("/redis/:key/:val")
    async testRedis(
        @Param("key") key: string,
        @Param("val") val: string
    ): Promise<string> {
        await this.redisService.setKey(key, val);
        return `add ${key} => ${val}`;
    }
}
