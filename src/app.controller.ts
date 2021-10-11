import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ConfigService } from "./config/config-module/config.service";
import { RedisService } from "./redis/redis.service";
import { NoAuthNoSign, Roles } from "./auth/decorators/roles.decoraters";
import { Config } from "./config/config";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {}

    @NoAuthNoSign()
    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Roles()
    @Get("/test")
    getConfig(): Config {
        console.log(this.configService.getConfig());
        return this.configService.getConfig();
    }
}
