import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { ExternalProtocol } from "heng-protocol";
import CreateJudgeRequest = ExternalProtocol.Post.CreateJudgeRequest;
import CreateJudgesResponse = ExternalProtocol.Post.CreateJudgesResponse;
// Key of pending queue in the redis
const pendingQueue = "pendingQueue";

@Injectable()
export class JudgeQueueService {
    constructor(private readonly redisService: RedisService) {}

    async push(
        judgeRequest: CreateJudgeRequest
    ): Promise<CreateJudgesResponse> {
        await this.redisService.withClient(async client => {
            return client.rpush(pendingQueue, JSON.stringify(judgeRequest));
        });
        // should return JudgeResponse
        const judgeResponse: CreateJudgesResponse = {
            statuscode: 201,
            body: [JSON.stringify(judgeRequest)]
        };
        return judgeResponse;
    }

    async pop(): Promise<CreateJudgeRequest> {
        return await this.redisService.withClient(async client => {
            const ret = (await client.blpop(pendingQueue, 0))[1];
            return JSON.parse(ret);
        });
    }
}
