import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

class JudgerInfo {
    maxTaskCount: number = 0;
    coreCount?: number;
    name?: string;
    software?: string;
}

@Injectable()
export class JudgerService {
    constructor(private redisService: RedisService) {}

    async getToken(info: JudgerInfo): Promise<string> {
        let token = new Date().toISOString();
        if (await this.saveToken(token, info)) {
            return token;
        } else {
            throw "Fail";
        }
    }
    async saveToken(token: string, info: JudgerInfo): Promise<Boolean> {
        let res = await this.redisService.withClient(c => {
            return c
                .multi()
                .hset("j:info", token, JSON.stringify(info))
                .sadd("j:regT", token)
                .exec();
        });
        Logger.log(
            `Redis Res ${JSON.stringify(res)}`,
            "WebSocketGateway:saveToken"
        );
        return res.every(val => val[0] === null);
    }

    async checkToken(token: string): Promise<Boolean> {
        return (
            (await this.redisService.withClient(c => {
                return c.smove("j:regT", "j:actT", token);
            })) == 1
        );
    }

    async deleteToken(token: string): Promise<Boolean> {
        let res = await this.redisService.withClient(c => {
            return c
                .multi()
                .hdel("j:info", token)
                .srem("j:regT", token)
                .srem("j:actT", token)
                .exec();
        });
        Logger.log(
            `Redis Res ${JSON.stringify(res)}`,
            "WebSocketGateway:delToken"
        );
        return res.every(val => val[0] === null);
    }
}
