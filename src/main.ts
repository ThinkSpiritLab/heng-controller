import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "./config/config-module/config.service";
import { Logger } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ["debug", "log", "warn", "error", "verbose"]
    });
    app.useWebSocketAdapter(new WsAdapter(app));
    const configService = app.get(ConfigService);
    const { port, hostname } = configService.getServerConfig();
    const logger = new Logger("bootstrap");

    app.setGlobalPrefix("/v1");
    await app.listen(port, hostname);
    logger.log(`服务端已启动,于 ${hostname}:${port}`);
}
bootstrap();
