import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Query
} from "@nestjs/common";
import { JudgerService } from "./judger.service";

@Controller("judger")
export class JudgerController {
    constructor(private judgerService: JudgerService) {}

    @Get()
    async getActiveJudger() {
        return this.judgerService.getJudgerInfo(
            await this.judgerService.getActiveToken()
        );
    }

    @Get("token")
    getToken(
        @Query("name") name: string,
        @Query("maxTaskCount") maxTaskCount: number,
        @Query("coreCount") coreCount: number,
        @Query("software") software: string
    ) {
        if (maxTaskCount !== undefined) {
            return this.judgerService.getToken({
                name,
                maxTaskCount,
                coreCount,
                software
            });
        } else {
            throw new HttpException(
                "maxTaskCount is necessary",
                HttpStatus.BAD_REQUEST
            );
        }
    }
    @Delete(":token")
    deleteToken(@Param("token") token: string) {
        return this.judgerService.deleteToken(token);
    }
    @Post("task")
    async addTask(@Body("token") token: string, @Body("taskid") taskid: string) {
        if (await this.judgerService.isActiveToken(token)) {
            return this.judgerService.addTask(token, taskid);
        } else {
            throw new HttpException(
                `Judger ${token} not online`,
                HttpStatus.SERVICE_UNAVAILABLE
            );
        }
    }
}
