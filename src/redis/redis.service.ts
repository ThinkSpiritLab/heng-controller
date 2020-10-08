import { Injectable } from "@nestjs/common";
import { ConfigService } from "src/config/config-module/config.service";
import { createPool, Pool, Options } from "generic-pool";
import Redis, { RedisOptions } from "ioredis";

@Injectable()
export class RedisService {
    /**
     * Always use this.client directly.
     */
    readonly client: Redis.Redis;

    /**
     * Use clientPool only when using blocking commands.
     */
    private readonly clientPool: Pool<Redis.Redis>;

    /**
     * Init this.client and this.clientPool.
     * @param configService inject ConfigService
     */
    constructor(private configService: ConfigService) {
        const redisConfig = configService.getConfig().redis;
        const redisServerConfig = {
            host: redisConfig.host,
            port: redisConfig.port,
            username: redisConfig.username,
            password: redisConfig.password,
            db: redisConfig.db,
            path: redisConfig.path,
            keyPrefix: redisConfig.keyPrefix,
            maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
            connectTimeout: redisConfig.connectTimeout
        } as RedisOptions;
        const redisPoolConfig = {
            min: redisConfig.minPoolSize,
            max: redisConfig.maxPoolSize
        } as Options;

        this.client = new Redis(redisServerConfig);

        this.clientPool = createPool<Redis.Redis>(
            {
                create: async () => {
                    return new Redis(redisServerConfig);
                },
                destroy: async (client: Redis.Redis) => {
                    client.quit();
                }
            },
            redisPoolConfig
        );
    }

    /**
     * Get a client from this.clientPool.
     */
    async acquire(): Promise<Redis.Redis> {
        return await this.clientPool.acquire();
    }

    /**
     * Release a client to this.clientPool.
     * @param client the client to be released which was got by this.acquire().
     */
    async release(client: Redis.Redis): Promise<void> {
        return await this.clientPool.release(client);
    }

    /**
     * Execute an async arrow function which contains (blocking) redis commands.
     * @param fun an async arrow function, pass in a param: client.
     * @returns return the arrow function's return vlaue by a Promise.
     */
    async withClient<T>(fun: (client: Redis.Redis) => Promise<T>): Promise<T> {
        const client: Redis.Redis = await this.acquire();
        const res: T = await fun(client);
        await this.release(client);
        return res;
    }
}
