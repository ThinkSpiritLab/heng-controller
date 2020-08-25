import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ConfigService } from "./config/config-module/config.service";
import { Config } from "./config/config";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly configService: ConfigService
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    // FIXME: remove this api in production
    @Get("/test")
    getConfig(): Config {
        console.log(this.configService.getConfig().server);
        return this.configService.getConfig();
    }
}
