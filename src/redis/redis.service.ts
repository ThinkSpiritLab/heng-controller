import { Injectable } from "@nestjs/common";
import { ConfigService } from "src/config/config-module/config.service";
import { createPool, Pool } from "generic-pool";
import { RedisSetting } from "./redis.decl";
import Redis from "ioredis";

@Injectable()
export class RedisService {
    private readonly redisConfig: RedisSetting;
    private readonly clientPool: Pool<Redis.Redis>;
    readonly client: Redis.Redis;

    /**
     * create the Redis connection pool.
     * @param configService inject ConfigService
     */
    constructor(private configService: ConfigService) {
        this.redisConfig = configService.getConfig().redis;

        // one keeplive client, which does not need to acquire and release.
        this.client = new Redis(this.redisConfig);

        this.clientPool = createPool<Redis.Redis>(
            {
                create: async () => {
                    return new Redis(this.redisConfig);
                },
                destroy: async (client: Redis.Redis) => {
                    client.quit();
                }
            },
            this.redisConfig
        );
    }

    async acquire(): Promise<Redis.Redis> {
        return await this.clientPool.acquire();
    }

    async release(_client: Redis.Redis): Promise<void> {
        return await this.clientPool.release(_client);
    }

    async withClient<T>(fun: (client: Redis.Redis) => Promise<T>): Promise<T> {
        const _client: Redis.Redis = await this.acquire();
        const res: T = await fun(_client);
        this.release(_client);
        return res;
    }
}
