import { Module } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ConfigProvider } from "./config.provider";

@Module({
    imports: [],
    controllers: [],
    providers: [ConfigProvider, ConfigService],
    exports: [ConfigService]
})
export class ConfigModule {}
