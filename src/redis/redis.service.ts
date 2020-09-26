import { Injectable } from "@nestjs/common";
import { createPool, Pool, Options } from "generic-pool";
import { createClient, RedisClient } from "redis";
import { ConfigService } from "src/config/config-module/config.service";
import { RedisConfig } from "src/config/redis.config";
import { promisify } from "util";

@Injectable()
export class RedisService {
    private readonly RedisPool: Pool<RedisClient>;
    private readonly RedisOption: RedisConfig;

    /**
     * create the Redis connection pool
     * @param configService inject ConfigService
     */
    constructor(private configService: ConfigService) {
        this.RedisOption = configService.getConfig().redis;
        this.RedisPool = createPool<RedisClient>(
            {
                create: async () => {
                    return createClient(this.RedisOption);
                },
                destroy: async (client: RedisClient) => {
                    client.quit();
                },
                validate: async (client: RedisClient) => {
                    return client.connected;
                }
            },
            this.RedisOption as Options
        );
    }

    /**
     * example
     */
    async set(key: string, val: string): Promise<boolean> {
        const client = await this.RedisPool.acquire();
        await promisify(client.set).bind(client)(key, val);
        await this.RedisPool.release(client);
        return true;
    }
}
