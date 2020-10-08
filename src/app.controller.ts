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
        console.log(this.configService.getConfig());
        return this.configService.getConfig();
    }

    @Get("/test/redis/:key/:val")
    async testRedis(
        @Param("key") key: string,
        @Param("val") val: string
    ): Promise<string> {
        await this.redisService.client.set(key, val);
        console.log(`[redis] set ${key} => ${val}`);
        return `[redis] set ${key} => ${val}`;
    }

    @Get("/test/redispool")
    async testRedisPool(): Promise<string> {
        console.log(
            "[redis] Please enter `RPUSH mylist anyValue` in redis-cli in 60s."
        );
        // const client = await this.redisService.acquire();
        // const [key, value] = await client.blpop("mylist", 60);
        // await this.redisService.release(client);
        const [key, value] = await this.redisService.withClient(client =>
            client.blpop("mylist", 60)
        );
        console.log(`[redis] BLPOP [${key}, ${value}]`);
        return `BLPOP [${key}, ${value}]`;
    }
}
