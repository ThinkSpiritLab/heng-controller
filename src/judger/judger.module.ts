import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { ConfigModule } from "src/config/config-module/config.module";
<<<<<<< HEAD
import { ExternalModuleModule } from "src/external-module/external-module.module";
=======
import { ExternalModule } from "src/external/external.module";
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
import { RedisModule } from "src/redis/redis.module";
import { SchedulerModule } from "src/scheduler/scheduler.module";
import { JudgerController } from "./judger.controller";
import { JudgerGateway } from "./judger.gateway";
import { JudgerService } from "./judger.service";

@Module({
    imports: [
        RedisModule,
        ConfigModule,
        forwardRef(() => SchedulerModule),
<<<<<<< HEAD
        forwardRef(() => ExternalModuleModule)
=======
        forwardRef(() => ExternalModule),
        AuthModule
>>>>>>> ed9aa5cccba16fe641e4e5ea65051f8cc84444d4
    ],
    providers: [JudgerGateway, JudgerService],
    controllers: [JudgerController],
    exports: [JudgerGateway, JudgerService]
})
export class JudgerModule {}
