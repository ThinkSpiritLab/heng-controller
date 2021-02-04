import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class JudgerPoolService {
    static readonly tokenBucket = "JudgerPool:tokenBucket";
    static readonly availableToken = "JudgerPool:availableToken";
    private readonly logger = new Logger("JudgerPoolService");
    constructor(private readonly redisService: RedisService) {
        // to keep the "empty" set in redis
        this.redisService.client.sadd(
            JudgerPoolService.availableToken,
            "$reserved"
        );
    }

    async login(judgerId: string, capacity: number): Promise<void> {
        if (
            await this.redisService.client.sismember(
                JudgerPoolService.availableToken,
                judgerId
            )
        ) {
            throw new Error("[judger pool]评测机重复登录");
        }
        if (judgerId === "$reserved") {
            throw new Error("[judger pool]请勿使用保留评测机ID");
        }
        this.logger.log(
            `tring to login: ${judgerId} with capacity of ${capacity}`
        );
        let mu = this.redisService.client.multi();
        mu.sadd(JudgerPoolService.availableToken, judgerId);
        for (let i = 0; i < capacity; ++i) {
            mu = mu.lpush(JudgerPoolService.tokenBucket, judgerId);
        }
        mu.exec();
    }

    async logout(judgerId: string): Promise<void> {
        if (
            !(await this.redisService.client.sismember(
                JudgerPoolService.availableToken,
                judgerId
            ))
        ) {
            throw new Error("[judger pool]评测机不存在");
        }
        this.logger.log(`loging out: ${judgerId}`);
        this.redisService.client.srem(
            JudgerPoolService.availableToken,
            judgerId
        );
        return;
    }

    async getToken(): Promise<string> {
        let ret: [string, string] | undefined;
        while (true) {
            ret = await this.redisService.withClient(async client => {
                return client.brpop(JudgerPoolService.tokenBucket, 0);
            });
            if (ret === undefined) {
                throw new Error("[judger pool]获取 token 失败");
            }
            if (
                await this.redisService.client.sismember(
                    JudgerPoolService.availableToken,
                    ret[1]
                )
            ) {
                break;
            }
        }
        return ret[1];
    }

    async releaseToken(token: string): Promise<void> {
        this.redisService.client.lpush(JudgerPoolService.tokenBucket, token);
    }
}
