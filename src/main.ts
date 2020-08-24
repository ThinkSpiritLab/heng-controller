import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { parseCommand } from "./config/cli-options";
import { ConfigService } from "./config/config.service";

async function bootstrap() {
    await parseCommand();

    const app = await NestFactory.create(AppModule, {
        logger: ["debug", "log", "warn", "error", "verbose"]
    });

    const configService = app.get(ConfigService);
    const { port, hostname } = configService.getServerConfig();

    await app.listen(port, hostname);
}
bootstrap();
