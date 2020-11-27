import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

export class JudgerInfo {
    maxTaskCount = 0;
    coreCount?: number;
    name?: string;
    software?: string;
}

@Injectable()
export class JudgerService {
    constructor(private redisService: RedisService) {}
    public readonly Keys = {
        ActiveToken: "j:T:act",
        RegisteredToken: "j:T:reg",
        JudgerInfo: "j:j:info",
        JudgerStatus: "j:j:stat",
        TaskQue: (token: string) => `j:j:t:${token}`,
        ActiveQue: (token: string) => `j:j:a:${token}`
    };
    async getToken(info: JudgerInfo): Promise<string> {
        const token = String(new Date().getTime());
        if (await this.saveToken(token, info)) {
            return token;
        } else {
            throw "Fail";
        }
    }

    async getActiveToken(): Promise<string[]> {
        return await this.redisService.withClient(c => {
            return c.smembers(this.Keys.ActiveToken);
        });
    }

    async isActiveToken(token: string): Promise<boolean> {
        return (
            (await this.redisService.withClient(c => {
                return c.sismember(this.Keys.ActiveToken, token);
            })) === 1
        );
    }

    async getJudgerInfo(tokens: string[]): Promise<(JudgerInfo | null)[]> {
        return (
            await this.redisService.withClient(c => {
                return c.hmget(this.Keys.JudgerInfo, tokens);
            })
        ).map(s => s && JSON.parse(s));
    }

    async saveToken(token: string, info: JudgerInfo): Promise<boolean> {
        const res = await this.redisService.withClient(c => {
            return c
                .multi()
                .hset(this.Keys.JudgerInfo, token, JSON.stringify(info))
                .sadd(this.Keys.RegisteredToken, token)
                .exec();
        });
        return res.every(val => val[0] === null);
    }

    async checkToken(token: string): Promise<boolean> {
        return (
            (await this.redisService.withClient(c => {
                return c.smove(
                    this.Keys.RegisteredToken,
                    this.Keys.ActiveToken,
                    token
                );
            })) == 1
        );
    }

    async deleteToken(token: string): Promise<boolean> {
        const res = await this.redisService.withClient(c => {
            return c
                .multi()
                .hdel(this.Keys.JudgerInfo, token)
                .srem(this.Keys.RegisteredToken, token)
                .srem(this.Keys.ActiveToken, token)
                .srem(this.Keys.JudgerStatus, token)
                .exec();
        });
        return res.every(val => val[0] === null);
    }

    async addTask(token: string, taskid: string) {
        return await this.redisService.withClient(c => {
            return c.lpush(this.Keys.TaskQue(token), taskid);
        });
    }

    async getTask(token: string, timeout: number) {
        return await this.redisService.withClient(c => {
            return c.brpoplpush(
                this.Keys.TaskQue(token),
                this.Keys.ActiveQue(token),
                timeout
            );
        });
    }

    async removeActiveTask(token: string, taskid: string) {
        return await this.redisService.withClient(c => {
            return c.lrem(this.Keys.ActiveQue(token), 0, taskid);
        });
    }
}
