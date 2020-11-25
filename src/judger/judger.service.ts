import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class JudgerService {
    constructor(private redisService: RedisService) {}

    async getToken(): Promise<string> {
        let token = new Date().toISOString();
        if (await this.redisService.saveToken(token)) {
            return token;
        } else {
            throw "Fail";
        }
    }
}
