import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "./config/config-module/config.service";
import { Logger, ValidationPipe, INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import { requestTransform } from "./public/middleware/requestTransform";
import { SchedulerService } from "./scheduler/scheduler.service";
import { JudgeQueueService } from "./scheduler/judge-queue-service/judge-queue-service.service";
import { JudgerPoolService } from "./scheduler/judger-pool/judger-pool.service";
import { KeyService } from "./auth/key/key.service";
import { JudgerGateway } from "./judger/judger.gateway";
import { ExternalService } from "./external/external.service";
import * as authDecl from "./auth/auth.decl";

async function init(app: INestApplication) {
    app.get(SchedulerService).run();
    app.get(JudgeQueueService).init();
    await app.get(JudgerPoolService).init();
    await app.get(KeyService).init();
    app.get(JudgerGateway).init();
    app.get(ExternalService).init();
    authDecl.init();
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ["debug", "log", "warn", "error", "verbose"],
    });
    await init(app);
    app.useWebSocketAdapter(new WsAdapter(app));
    const configService = app.get(ConfigService);
    const { port, hostname, globalPrefix } = configService.getServerConfig();
    const logger = new Logger("bootstrap");

    app.setGlobalPrefix(globalPrefix);
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            skipMissingProperties: false,
            forbidUnknownValues: true,
        })
    );
    app.use(requestTransform);
    await app.listen(port, hostname);
    logger.log(`服务端已启动,于 ${hostname}:${port}`);
}
bootstrap();
