import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query
} from "@nestjs/common";
import { JudgerService } from "./judger.service";

@Controller("judger")
export class JudgerController {
    constructor(private judgerService: JudgerService) {}

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
}