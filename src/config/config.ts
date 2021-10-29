import { IsNotEmpty, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import {
    ProfileName,
    ProfileFromToml,
    ProfileFromObject,
    ProfileFromCommand,
    ProfileVaild
} from "src/profile-processor/profile.annoations";
import { ServerConfig } from "./server.config";
import { ProfileBase } from "src/profile-processor/profile.base";
import { RedisConfig } from "./redis.config";
import { JudgerConfig } from "./judger.config";
import { SchedulerConfig } from "./scheduler";
import { AuthConfig } from "./auth.config";
import { ExternaConfig } from "./external.config";
export const DEFAULT_CONFIG_PATHS = ["application.toml"];

export const DEFAULT_CONFIG = {
    server: {
        hostname: "localhost",
        port: 8080
    },
    redis: {
        server: {
            host: "localhost",
            port: 6379,
            db: 0,
            maxRetriesPerRequest: 4
        },
        pool: {
            maxPoolSize: 10,
            runCloseIdleConnMillis: 60000
        }
    } as RedisConfig,
    judger: {
        tokenExpire: 5000,
        listenTimeoutSec: 10,
        reportInterval: 3000,
        lifeCheckInterval: 6000,
        tokenGcInterval: 300000,
        tokenGcExpire: 300000,
        processPingInterval: 2000,
        processCheckInterval: 3000,
        flexibleTime: 1000,
        rpcTimeout: 3000
    } as JudgerConfig,
    scheduler: {
        illegalTaskExpire: 1800000,
        illegalTaskCleanInterval: 300000,
        backupExpire: 5000,
        backupRestoreInterval: 5000
    } as SchedulerConfig,
    external: {
        resultBackupExpire: 5000,
        resultBackupRestoreInterval: 30000
    } as ExternaConfig,
    auth: {
        keyLengthNotRoot: 64,
        keyLengthRootMin: 128,
        keyLengthRootMax: 256,
        nonceExpireSec: 10,
        timeStampExpireSec: 5
    } as AuthConfig
};

@ProfileVaild({
    whitelist: true,
    forbidNonWhitelisted: true
}) // 开启配置校验
@ProfileFromCommand() // 从命令行获取配置
@ProfileFromToml(DEFAULT_CONFIG_PATHS) // 从默认配置源获取配置
@ProfileFromObject(DEFAULT_CONFIG) // 设置默认配置
@ProfileName("主配置文件") // 设置配置文件名
export class Config extends ProfileBase {
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => ServerConfig)
    public readonly server!: ServerConfig;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => RedisConfig)
    public readonly redis!: RedisConfig;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => JudgerConfig)
    public readonly judger!: JudgerConfig;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => SchedulerConfig)
    public readonly scheduler!: SchedulerConfig;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => ExternaConfig)
    public readonly external!: ExternaConfig;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => AuthConfig)
    public readonly auth!: AuthConfig;
}
