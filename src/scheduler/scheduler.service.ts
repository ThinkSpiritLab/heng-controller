import { Injectable } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { File } from "../protocol/external-protocol/HttpProtocolPostDefinition";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class SchedulerService {
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly redisService: RedisService
    ) {
        this.run();
    }

    // 上传数据 ?

    async getTestDate(taskId: string): Promise<File> {
        const isCached = await this.redisService.client.get(taskId);
        if (isCached) {
            console.log("cache hit, and it will be deleted");
            this.redisService.client.del(taskId);
            return JSON.parse(isCached);
        }

        // fetch date from stroage()
        const date = JSON.stringify({ id: "1", url: "file://txt"});
        await this.redisService.client.set(taskId, date);
        return { id: "1", url: "file://txt" };
    }

    async run(): Promise<void> {
        while (true) {
            const judgeRequest = await this.judgeQueue.pop();
            const testDate = await this.getTestDate(judgeRequest.body.mainJudge.taskId);
            // console.log(testDate);
            // 查询 Redis 缓存 or 从存储获取数据
            // scheduler()
            // 丢给内核
            // 获取结果
            // 评测结果返回给控制端
        }
    }
}
