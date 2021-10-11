import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { backOff } from "../scheduler.util";

@Injectable()
export class JudgerPoolService {
    static readonly R_List_TokenBucket = "JudgerPool:tokenBucket"; // list
    static readonly R_Set_AvailableToken = "JudgerPool:availableToken"; // set
    private readonly logger = new Logger("JudgerPoolService");
    constructor(private readonly redisService: RedisService) {}

    async init(): Promise<void> {
        // to keep the "empty" set in redis
        await this.redisService.client.sadd(
            JudgerPoolService.R_Set_AvailableToken,
            "$reserved"
        );
    }

    async login(judgerId: string, capacity: number): Promise<void> {
        if (
            await this.redisService.client.sismember(
                JudgerPoolService.R_Set_AvailableToken,
                judgerId
            )
        ) {
            throw new Error("评测机重复登录");
        }
        if (judgerId === "$reserved") {
            throw new Error("请勿使用保留评测机 ID");
        }
        this.logger.log(
            `tring to login: ${judgerId} with capacity of ${capacity}`
        );
        let mu = this.redisService.client.multi();
        mu.sadd(JudgerPoolService.R_Set_AvailableToken, judgerId);
        for (let i = 0; i < capacity; ++i) {
            mu = mu.lpush(JudgerPoolService.R_List_TokenBucket, judgerId);
        }
        mu.exec();
    }

    async logout(judgerId: string): Promise<void> {
        // 因为可能多次通知 logout，故不抛出异常
        // if (
        //     !(await this.redisService.client.sismember(
        //         JudgerPoolService.availableToken,
        //         judgerId
        //     ))
        // ) {
        //     throw new Error("评测机不存在");
        // }
        this.logger.log(`loging out: ${judgerId}`);
        this.redisService.client.srem(
            JudgerPoolService.R_Set_AvailableToken,
            judgerId
        );
        return;
    }

    async getToken(): Promise<string> {
        while (true) {
            let ret: [string, string] | null = null;
            try {
                ret = await this.redisService.withClient(async client => {
                    return client.brpop(JudgerPoolService.R_List_TokenBucket, 0);
                });
                if (ret === null) {
                    throw new Error("获取 token 失败");
                }
                if (
                    await this.redisService.client.sismember(
                        JudgerPoolService.R_Set_AvailableToken,
                        ret[1]
                    )
                ) {
                    return ret[1];
                }
            } catch (error) {
                await backOff(async () => {
                    if (ret && ret[1]) {
                        await this.releaseToken(ret[1], 1);
                        ret[1] = "";
                    }
                    this.logger.error(error);
                });
            }
        }
    }

    async releaseToken(token: string, capacity: number): Promise<void> {
        let mu = this.redisService.client.multi();
        for (let i = 0; i < capacity; i++) {
            mu = mu.lpush(JudgerPoolService.R_List_TokenBucket, token);
        }
        await mu.exec();
    }
}
