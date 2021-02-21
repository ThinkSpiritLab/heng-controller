import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Logger } from "@nestjs/common";
import { CreateJudgeRequest } from "heng-protocol/internal-protocol/ws";
import * as external from "heng-protocol/external-protocol";
import moment from "moment";
import { JudgerService } from "src/judger/judger.service";
import { JudgeQueueService } from "src/scheduler/judge-queue-service/judge-queue-service.service";
import { AxiosInstance } from "axios";
import { JudgeResult, JudgeState } from "heng-protocol";
@Injectable()
export class ExternalModuleService {
    private readonly logger = new Logger("ExternalModuleService");
    constructor(
        private readonly judgequeueService: JudgeQueueService,
        private readonly redisService: RedisService,
        private readonly judgerservice: JudgerService,
        private readonly axiosService: AxiosInstance
    ) {}

    // 协议内外转换
    async judgereqconvert(
        taskid: number,
        exreq: external.CreateJudgeRequest
    ): Promise<CreateJudgeRequest> {
        await this.redisService.client.hmset(
            "ExternalModule:calbckurl:upd",
            taskid,
            exreq.callbackUrls.update
        );
        await this.redisService.client.hmset(
            "ExternalModule:calbckurl:fin",
            taskid,
            exreq.callbackUrls.finish
        );
        await this.redisService.client.incr("ExternalModule:seq");
        const seq: number = parseInt(
            (await this.redisService.client.get("ExternalModule:seq")) || "0"
        );
        const inreq: CreateJudgeRequest = {
            type: "req",
            body: {
                method: "CreateJudge",
                args: exreq
            },
            seq: seq,
            time: moment().format("YYYY-MM-DDTHH:mm:ssZ")
        };
        return inreq;
    }

    // 创建评测任务
    async createjudge(req: external.CreateJudgeRequest): Promise<void> {
        await this.redisService.client.incr("taskSeq");
        const taskid: number = parseInt(
            (await this.redisService.client.get("taskSeq")) || "0"
        );
        const inreq: CreateJudgeRequest = await this.judgereqconvert(
            taskid,
            req
        );
        await this.redisService.client.hmset(
            "Taskids",
            taskid,
            JSON.stringify(inreq)
        );
        this.logger.log("发送评测任务 id: ${taskid} ");
        await this.judgequeueService.push(String(taskid));
    }

    // 评测任务回调
    async responseupdate(taskid: number, state: JudgeState): Promise<any> {
        const url: string =
            (
                await this.redisService.client.hmget(
                    "ExternalModule:calbckurl:upd",
                    taskid.toString()
                )
            )[0] || "";
        await this.axiosService.post(url, { taskid, state });
        this.logger.log("更新评测任务状态 id: ${taskid} ");
    }

    async responsefinish(taskid: number, result: JudgeResult): Promise<any> {
        const url: string =
            (
                await this.redisService.client.hmget(
                    "ExternalModule:calbckurl:upd",
                    taskid.toString()
                )
            )[0] || "";
        await this.axiosService.post(url, { taskid, result });
        this.logger.log("返回评测任务结果 id: ${taskid} ");
    }
}
