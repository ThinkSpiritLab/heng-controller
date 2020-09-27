import { Injectable } from "@nestjs/common";
import { createPool, Pool, Options } from "generic-pool";
import { ConfigService } from "src/config/config-module/config.service";
import { RedisConfig } from "src/config/redis.config";
import Redis = require("ioredis");

@Injectable()
export class RedisService {
    private readonly RedisPool: Pool<Redis.Redis>;
    private readonly RedisOption: RedisConfig;
    private readonly client: Redis.Redis;

    /**
     * create the Redis connection pool
     * @param configService inject ConfigService
     */
    constructor(private configService: ConfigService) {
        this.RedisOption = configService.getConfig().redis;

        // one keeplive client, don't need to acquire and release
        this.client = new Redis(this.RedisOption);

        this.RedisPool = createPool<Redis.Redis>(
            {
                create: async () => {
                    return new Redis(this.RedisOption);
                },
                destroy: async (client: Redis.Redis) => {
                    client.quit();
                }
            },
            this.RedisOption as Options
        );
    }

    /**
     * one simple example
     * @param key key
     * @param val value
     */
    async set(key: string, val: string): Promise<boolean> {
        const client = await this.RedisPool.acquire();
        await client.set(key, val);
        await this.RedisPool.release(client);
        return true;
    }
}
