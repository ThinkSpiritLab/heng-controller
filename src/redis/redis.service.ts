import { Injectable } from "@nestjs/common";
import { ConfigService } from "src/config/config-module/config.service";
import Redis, { RedisOptions } from "ioredis";

@Injectable()
export class RedisService {
    private readonly redisOption: RedisOptions;
    private readonly client: Redis.Redis;

    /**
     * create the Redis connection pool
     * @param configService inject ConfigService
     */
    constructor(private configService: ConfigService) {
        this.redisOption = configService.getConfig().redis;

        // one keeplive client, do not need to acquire and release
        this.client = new Redis(this.redisOption);
    }

    /**
     * one simple example
     * @param key key
     * @param val value
     */
    async setKey(key: string, val: string): Promise<boolean> {
        await this.client.set(key, val);
        return true;
    }
}
