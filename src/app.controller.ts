import { Controller, Get, UseGuards } from "@nestjs/common";
import { AppService } from "./app.service";
import { ConfigService } from "./config/config-module/config.service";
import { RedisService } from "./redis/redis.service";
import { RoleSignGuard } from "./auth/auth.guard";
import { Roles } from "./auth/decorators/roles.decoraters";

@UseGuards(RoleSignGuard)
@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {}

    @Get()
    @Roles()
    getHello(): string {
        return this.appService.getHello();
    }

    // FIXME: remove this api in production
    // @Roles(ROOT)
    // @Get("/test")
    // getConfig(): Config {
    //     console.log(this.configService.getConfig());
    //     return this.configService.getConfig();
    // }

    // @Roles(ROOT)
    // @Get("/test/redis/:key/:val")
    // async testRedis(
    //     @Param("key") key: string,
    //     @Param("val") val: string
    // ): Promise<string> {
    //     await this.redisService.client.set(key, val);
    //     console.log(`[redis] set ${key} => ${val}`);
    //     return `[redis] set ${key} => ${val}`;
    // }

    // @Roles(ROOT)
    // @Get("/test/redispool")
    // async testRedisPool(): Promise<string> {
    //     console.log(
    //         "[redis] Please enter `ZADD myzset 1 oneMember` in redis-cli in 60s."
    //     );
    //     // const client = await this.redisService.acquire();
    //     // const [key, value] = await client.bzpopmin("myzset", 60);
    //     // await this.redisService.release(client);
    //     const [
    //         zset,
    //         member,
    //         score
    //     ] = await this.redisService.withClient(async client =>
    //         client.bzpopmin("myzset", 60)
    //     );
    //     console.log(`[redis] BZPOPMIN [${zset}, ${member}, ${score}]`);
    //     return `BZPOPMIN [${zset}, ${member}, ${score}]`;
    // }
}
