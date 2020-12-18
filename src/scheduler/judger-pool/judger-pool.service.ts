import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class JudgerPoolService {
    static readonly tokenBucket = "JudgerPool:tokenBucket";
    static readonly tokenCount = "JudgerPool:tokenCount";
    private readonly logger = new Logger("JudgerPoolService");
    constructor(private readonly redisService: RedisService) {}

    private async getTokenReleaser(
        token: string
    ): Promise<() => Promise<void>> {
        return async () => {
            this.redisService.client
                .multi()
                .sadd(JudgerPoolService.tokenBucket, token)
                .lpush(JudgerPoolService.tokenCount, 0)
                .exec();
        };
    }

    async login(judgerId: string, capacity: number): Promise<number> {
        this.logger.log(
            `tring to login: ${judgerId} with capacity of ${capacity}`
        );
        for (let i = 0; i < capacity; ++i) {
            this.redisService.client
                .multi()
                .sadd(
                    JudgerPoolService.tokenBucket,
                    judgerId + ":" + i.toString()
                )
                .lpush(JudgerPoolService.tokenCount, 0)
                .exec();
        }
        return 0;
    }

    async logout(judgerId: string): Promise<number> {
        this.logger.log(`loging out: ${judgerId}`);
        for (let i = 0; ; ++i) {
            const token = judgerId + ":" + i.toString();
            if (
                (await this.redisService.client.sismember(
                    JudgerPoolService.tokenBucket,
                    token
                )) == 1
            ) {
                this.redisService.client
                    .multi()
                    .rpop(JudgerPoolService.tokenCount)
                    .srem(JudgerPoolService.tokenBucket, token)
                    .exec();
            } else {
                break;
            }
        }
        return 0;
    }

    async getToken(): Promise<[string, () => Promise<void>]> {
        await this.redisService.withClient(async client => {
            return client.blpop(JudgerPoolService.tokenCount, "0");
        });
        const token = (await this.redisService.client.spop(
            JudgerPoolService.tokenBucket
        )) as string;
        return [token, await this.getTokenReleaser(token)];
    }
}
