import { Controller,Get } from "@nestjs/common";
import { JudgerService } from "./judger.service";

@Controller("judger")
export class JudgerController
{
    constructor(private judgerService: JudgerService) { }
    
    @Get("token")
    getToken() {
        return this.judgerService.getToken();
    }
}
