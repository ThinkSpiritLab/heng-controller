import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import {
    CreateJudgeRequest,
    CreateJudgesResponse
} from "src/protocol/external-protocol/HttpProtocolPostDefinition";

// Key of pending queue in redis
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
        return this.redisService.withClient(async client => {
            const response = JSON.parse(
                (await client.blpop(pendingQueue, 0))[1]
            );
            return response;
        });
    }
}
