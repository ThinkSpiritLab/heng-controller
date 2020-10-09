import {
    PROFILE_META_MAGIC,
    ProfileMeta,
    defaultProfileMeta
} from "./profile.meta";
import { ProfileBase } from "./profile.base";
import { validate, ValidationError } from "class-validator";
import { Logger } from "@nestjs/common";
import * as _ from "lodash";
import { exit } from "process";

function getConstructor<C, T extends { new (...args: unknown[]): C }>(
    obj: C
): T {
    return Object.getPrototypeOf(obj)["constructor"];
}

/**
 * 获取一个类型的配置元数据信息
 * @param constructor 类型的构造器
 */
export function getProfileMeta<
    T extends { new (...args: unknown[]): ProfileBase }
>(constructor: T): ProfileMeta {
    let meta: ProfileMeta = Reflect.getMetadata(
        PROFILE_META_MAGIC,
        constructor
    );
    if (!meta) {
        Reflect.defineMetadata(
            PROFILE_META_MAGIC,
            _.cloneDeep(defaultProfileMeta),
            constructor
        );
        meta = Reflect.getMetadata(PROFILE_META_MAGIC, constructor);
    }
    return meta;
}

export function getProfile<C, T extends { new (...args: unknown[]): C }>(
    type: T
): Record<string, unknown> {
    const info: ProfileMeta = getProfileMeta(type);
    return info.profile;
}

function errorFormat(
    errors: ValidationError[],
    indentation: string,
    times: number
): string {
    let msg = "";
    if (!errors) {
        return msg;
    }
    errors.forEach(err => {
        let v: string;
        if (typeof err.value === "string") {
            v = `字符串"${err.property}"='${err.value}'`;
        } else if (err.value instanceof Array) {
            v = `数组[${err.property}]`;
        } else if (typeof err.value === "object") {
            const info = getProfileMeta(getConstructor(err.value));
            v = `子配置文件[${err.property} ${info.name}]`;
        } else {
            v = `字段"${err.property}"=${err.value}`;
        }
        msg += `${indentation.repeat(times)}${v} 格式错误,原因:\n`;
        for (const key in err.constraints) {
            msg += `${indentation.repeat(times + 1)}${key ? key + " - " : ""}${
                err.constraints[key]
            }\n`;
        }
        msg += errorFormat(err.children, indentation, times + 1);
    });
    return msg;
}

/**
 * 校验一个配置
 * @param profile 目标配置
 */
export async function vaildProfile<T extends ProfileBase>(
    profile: T
): Promise<void> {
    const logger = new Logger("配置校验器");
    const info = getProfileMeta(getConstructor(profile));
    if (info.vaild === true) {
        info.hasVailded = true;
        const errors: ValidationError[] = await validate(
            profile,
            info.vaildOptions
        );
        if (errors.length > 0) {
            let msg = `\n${info.name}格式错误:\n`;
            msg += errorFormat(errors, "\t", 0);
            logger.error(msg);
            if (info.exitWhenVaildError) {
                logger.error("校验失败，结束程序");
                exit(-1);
            }
            _.merge(info.vaildError, errors);
        }
    }
    return;
}
