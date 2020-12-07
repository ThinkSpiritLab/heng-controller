import { Injectable } from "@nestjs/common";
import { JudgeQueueService } from "./judge-queue-service/judge-queue-service.service";
import { RedisService } from "src/redis/redis.service";
import { JudgerPoolService } from "./judger-pool/judger-pool.service";
import { ExternalProtocol } from "heng-protocol";
import TestCases = ExternalProtocol.Post.TestCases;
import File = ExternalProtocol.Post.File;

@Injectable()
export class SchedulerService {
    constructor(
        private readonly judgeQueue: JudgeQueueService,
        private readonly redisService: RedisService,
        private readonly judgerPoolService: JudgerPoolService
    ) {
        this.run();
    }

    async getTestCases(testData: File): Promise<TestCases> {
        const iscached = await this.redisService.client.hget("testDataCache", testData.id);
        if (iscached) {
            // this.redisService.client.del(taskId);
            return JSON.parse(iscached);
        }
        const ret: TestCases = [];
        console.log("not hit");
        // fetch date from stroage()
        const remoteDate = JSON.stringify({ id: "1", url: "file://txt" });
        // if (testData.)
        // set cache
        // await this.redisService.client.set(taskId, date);
        return ret;
        // return "testData";
    }

    async run(): Promise<void> {
        while (true) {
            const judgeRequest = await this.judgeQueue.pop();
            const judgeBody    = judgeRequest.body;
            let testCases: TestCases = [];
            if (judgeBody.mainJudge.data) {
                testCases = await this.getTestCases(judgeBody.mainJudge.data);
            } else if (judgeBody.mainJudge.test) {
                for (const {input, output} of judgeBody.mainJudge.test.cases) {
                    testCases.push({input, output});
                }
            }
            console.log(testCases);
            // 调用评测机交互模块
        }
    }
}
