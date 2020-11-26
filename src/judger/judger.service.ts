import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class JudgerService {
    constructor(private redisService: RedisService) {}

    async getToken(): Promise<string> {
        let token = new Date().toISOString();
        if (await this.saveToken(token)) {
            return token;
        } else {
            throw "Fail";
        }
    }
    async saveToken(token: string): Promise<Boolean> {
        return (
            (await this.redisService.withClient((c) => {
                return c.sadd("token", token);
            })) == 1
        );
    }

    async deleteToken(token: string): Promise<Boolean> {
        return (
            (await this.redisService.withClient((c) => {
                return c.srem("token", token);
            })) == 1
        );
    }
}
