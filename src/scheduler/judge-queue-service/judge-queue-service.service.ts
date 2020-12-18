import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { ExternalProtocol } from "heng-protocol";
import JudgeRequest = ExternalProtocol.Post.JudgeRequest;

@Injectable()
export class JudgeQueueService {
    static readonly pendingQueue = "JudgeQueue:pendingQueue";
    constructor(private readonly redisService: RedisService) {}

    /**
     * push a JudgeRequest to queue, return it's taskid
     */
    async push(judgeRequest: JudgeRequest): Promise<string> {
        await this.redisService.withClient(async client => {
            return client.rpush(
                JudgeQueueService.pendingQueue,
                JSON.stringify(judgeRequest)
            );
        });
        return judgeRequest.taskId;
    }

    async pop(): Promise<JudgeRequest> {
        return await this.redisService.withClient(async client => {
            const ret = (
                await client.blpop(JudgeQueueService.pendingQueue, 0)
            )[1];
            return JSON.parse(ret);
        });
    }
}
