import {
    ProfileMeta,
    profileProcessorConfig,
    ProfileOptions,
} from "./profile.meta";
import * as _ from "lodash";
import path from "path";
import fs from "fs";
import { Logger } from "@nestjs/common";
import TomlFileReader from "./toml-processor/toml-file-reader";
import { ProfileBase } from "./profile.base";
import { getProfileMeta } from "./profile.functions";
import { getCommandProfile } from "./command-processor/command.profile";

const logger = new Logger("配置文件解析器");

/**
 * 为当前配置文件命名
 * @param name 配置文件的名字
 */
export function ProfileName(
    name = "配置文件"
): <T extends { new (...args: unknown[]): ProfileBase }>(
    constructor: T
) => void {
    return function <T extends { new (...args: unknown[]): ProfileBase }>(
        constructor: T
    ): void {
        const info: ProfileMeta = getProfileMeta(constructor);
        info.name = name;
    };
}

/**
 * 从toml文件中读取配置
 * @param paths toml文件路径
 * @param option 配置项
 * @field useRelativePath 是否使用相对路径,默认为true
 */
export function ProfileFromToml(
    paths: string[],
    option = {
        /**
         * 使用相对路径访问文件
         */
        useRelativePath: true,
    }
): <T extends { new (...args: unknown[]): ProfileBase }>(
    constructor: T
) => void {
    if (option.useRelativePath) {
        paths = paths.map((p) =>
            path.join(profileProcessorConfig.configRoot, p)
        );
    }
    return function <T extends { new (...args: unknown[]): ProfileBase }>(
        constructor: T
    ): void {
        const info = getProfileMeta(constructor);
        logger.log(`通过toml载入${info.name}:`);
        paths.forEach((p) => {
            if (!fs.existsSync(p)) {
                logger.warn(` ${p}下找不到配置文件`);
                return;
            } else {
                logger.log(` 载入配置:${p}`);
            }
            const reader = new TomlFileReader(p);
            const data = reader.read();
            _.merge(info.profile, data);
        });
    };
}

/**
 * 直接从对象中读取配置
 * @param objects 对象数组
 */
export function ProfileFromObject(...objects: Record<string, unknown>[]) {
    return function <T extends { new (...args: unknown[]): ProfileBase }>(
        constructor: T
    ): void {
        const info = getProfileMeta(constructor);
        objects.forEach((obj) => {
            _.merge(info.profile, obj);
        });
    };
}

/**
 * 从命令行中获取配置
 */
export function ProfileFromCommand() {
    return function <T extends { new (...args: unknown[]): ProfileBase }>(
        constructor: T
    ): void {
        const info = getProfileMeta(constructor);
        const obj = getCommandProfile();
        _.merge(info.profile, obj);
        logger.log(`${info.name}载入了命令行参数`);
    };
}

/**
 * 修改配置处理选项
 * @param option 配置
 */
export function ProfileOption(option: ProfileOptions) {
    return function <T extends { new (...args: unknown[]): ProfileBase }>(
        constructor: T
    ): void {
        const info = getProfileMeta(constructor);
        _.merge(info, option);
    };
}

/**
 * 设置配置文件是否校验
 * @param vaild 是否校验配置
 */
export function ProfileVaild(options = {}, vaild = true) {
    return function <T extends { new (...args: unknown[]): ProfileBase }>(
        constructor: T
    ): void {
        const info = getProfileMeta(constructor);
        info.vaild = vaild;
        _.merge(info.vaildOptions, options);
        logger.log(`已${vaild ? "启用" : "禁用"}${info.name}的校验功能。`);
    };
}
