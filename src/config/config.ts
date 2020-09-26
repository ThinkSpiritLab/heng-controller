import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import {
    ProfileName,
    ProfileFromObject,
    ProfileFromToml,
    ProfileFromCommand,
    ProfileVaild
} from "src/profile-processor/profile.annoations";
import { ServerConfig } from "./server.config";
import { ProfileBase } from "src/profile-processor/profile.base";
import { RedisConfig } from "./redis.config";
import { ClientOpts } from "redis";

export const DEFAULT_CONFIG_PATHS = ["application.toml"];

export const DEFAULT_CONFIG = {
    server: {
        hostname: "localhost",
        port: 8080
    },
    redis: {
        port: 6379,
        host: "localhost",
        password: undefined,
        db: 0,
        prefix: undefined,
        url: undefined, // example:"redis://[[user]:authpassword@]127.0.0.1:6379[/4]",

        min: 1,
        max: 10
    } as ClientOpts
};

@ProfileVaild() //开启配置校验
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
