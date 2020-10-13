import { ValidateNested } from "class-validator";
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
    } as RedisConfig
};

@ProfileVaild({
    whitelist: true,
    forbidNonWhitelisted: true
}) //开启配置校验
@ProfileFromCommand() //从命令行获取配置
@ProfileFromToml(DEFAULT_CONFIG_PATHS) //从默认配置源获取配置
@ProfileFromObject(DEFAULT_CONFIG) //设置默认配置
@ProfileName("主配置文件") //设置配置文件名
export class Config extends ProfileBase {
    @ValidateNested()
    @Type(() => ServerConfig)
    public readonly server!: ServerConfig;

    @ValidateNested()
    @Type(() => RedisConfig)
    public readonly redis!: RedisConfig;
}
