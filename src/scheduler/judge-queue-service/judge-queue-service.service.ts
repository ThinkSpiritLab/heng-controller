import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class JudgeQueueService {
    static readonly pendingQueue = "JudgeQueue:pendingQueue";
    constructor(private readonly redisService: RedisService) {}

    /**
     * push a JudgeRequest to queue, return it's taskid
     */
    async push(taskId: string): Promise<string> {
        await this.redisService.client.lpush(
            JudgeQueueService.pendingQueue,
            taskId
        );
        return taskId;
    }

    async pop(): Promise<string> {
        return await this.redisService.withClient(async client => {
            return (
                await client.brpop(JudgeQueueService.pendingQueue, 0)
            )[1];
        });
    }
}
