import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
const tokenBucket = "tokenBucket";
const tokenCount  = "tokenCount";

@Injectable()
export class JudgerPoolService {
    constructor(private readonly redisService: RedisService) { }

    async login(judgerId: string, power: number): Promise<void> {
        this.redisService.client.sadd(tokenBucket, judgerId);
        this.redisService.client.hset(tokenCount, judgerId, power);
    }

    async logout(judgerId: string): Promise<void> {
        this.redisService.client.srem(tokenBucket, judgerId);
        this.redisService.client.hdel(tokenCount, judgerId);
    }

    async selectJudger(): Promise<string> {
        let judgerId: string | null;
        let tokens = 0;
        do {
            judgerId = await this.redisService.client.srandmember(tokenBucket);
            tokens = Number(await this.redisService.client.hget(tokenCount, judgerId as string));
        } while (tokens === 0);
        await this.redisService.client.hincrby(tokenCount, judgerId as string, -1);
        return judgerId as string;
    }
}
