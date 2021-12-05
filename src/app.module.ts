import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "./config/config-module/config.module";
import { RedisModule } from "./redis/redis.module";
import { JudgerModule } from "./judger/judger.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
<<<<<<< HEAD
import { ExternalModuleModule } from "./external-module/external-module.module";

=======
import { AuthModule } from "./auth/auth.module";
import { KeyModule } from "./auth/key/key.module";
import { ExternalModule } from "./external/external.module";
import { APP_GUARD } from "@nestjs/core";
import { RoleSignGuard } from "./auth/auth.guard";
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
@Module({
    imports: [
        ConfigModule,
        RedisModule,
        JudgerModule,
        SchedulerModule,
<<<<<<< HEAD
        ExternalModuleModule
=======
        ExternalModule,
        AuthModule,
        KeyModule
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: RoleSignGuard
        }
    ]
})
export class AppModule {}
