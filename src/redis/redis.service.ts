import { Injectable } from "@nestjs/common";
import { createPool, Pool } from "generic-pool";
import { ConfigService } from "src/config/config-module/config.service";
import { RedisSetting } from "./redis.decl";
import Redis from "ioredis";

@Injectable()
export class RedisService {
    private readonly redisPool: Pool<Redis.Redis>;
    private readonly redisOption: RedisSetting;
    private readonly client: Redis.Redis;

    /**
     * create the Redis connection pool
     * @param configService inject ConfigService
     */
    constructor(private configService: ConfigService) {
        this.redisOption = configService.getConfig().redis;

        // one keeplive client, do not need to acquire and release
        this.client = new Redis(this.redisOption);

        this.redisPool = createPool<Redis.Redis>(
            {
                create: async () => {
                    return new Redis(this.redisOption);
                },
                destroy: async (client: Redis.Redis) => {
                    client.quit();
                }
            },
            this.redisOption
        );
    }

    /**
     * one simple example
     * @param key key
     * @param val value
     */
    async set(key: string, val: string): Promise<boolean> {
        // const client = await this.redisPool.acquire();
        await this.client.set(key, val);
        // await this.redisPool.release(client);
        return true;
    }
}
