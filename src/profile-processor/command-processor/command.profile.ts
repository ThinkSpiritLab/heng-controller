import program from "commander";
import { readToml, readTomlFile } from "../toml-processor/toml-reader.utils";
import * as _ from "lodash";
import { Logger } from "@nestjs/common";

let hasInited = false;
const commandProfile = {};
const logger = new Logger("命令行解析器");

/**
 * 手动初始化commander<br>
 * 无需调用，初始化会在第一次获取命令行配置时
 */
export function initCommander(): void {
    if (hasInited) return;
    hasInited = true;
    program
        .option<Record<string, unknown>>(
            "-p,--profile [profiles...]",
            "直接添加配置",
            parseProfile,
            {}
        )
        .option<Record<string, unknown>>(
            "-s,--string-profile [profiles...]",
            "直接添加配置,将值强制解析为字符串",
            parseStringProfile,
            {}
        )
        .option(
            "-l,--load-profile <paths..>",
            "载入指定位置的toml配置文件",
            parseProfilePath,
            {}
        );

    program.parse(process.argv);
}

/**
 * 将命令行输入的配置转换为对象<br>
 * <b>注意：</b>-p命令会将"true"类似的字符串优先解析为true:boolean,如果要强制解析字符串，请使用-s
 * @param value 新值
 * @param oldProfiles 旧值
 */
function parseProfile(
    value: string,
    oldProfiles: Record<string, unknown>
): Record<string, unknown> {
    const keys: string[] = value.substr(0, value.indexOf("=")).split(".");
    const v = value.substr(value.indexOf("=") + 1);
    let obj: Record<string, unknown>;
    try {
        obj = readToml(keys[keys.length - 1] + "=" + v);
    } catch (e) {
        value = keys[keys.length - 1] + "=\"" + v + "\"";
        obj = readToml(value);
    }
    const formedObj: Record<string, unknown> = {};
    let dynamicObj = formedObj;
    for (let i = 0; i < keys.length - 1; i++) {
        dynamicObj[keys[i]] = {};
        dynamicObj = <Record<string, unknown>>dynamicObj[keys[i]];
    }
    dynamicObj[keys[keys.length - 1]] = obj[keys[keys.length - 1]];
    logger.log(`添加命令行配置${value}`);
    _.merge(commandProfile, formedObj);
    _.merge(oldProfiles, formedObj);
    return oldProfiles;
}

/**
 * 解析字符串型配置
 * @param value 新值
 * @param oldProfiles 旧值
 */
function parseStringProfile(
    value: string,
    oldProfiles: Record<string, unknown>
): Record<string, unknown> {
    const keys: string[] = value.substr(0, value.indexOf("=")).split(".");
    const v = value.substr(value.indexOf("=") + 1);
    value = keys[keys.length - 1] + "=\"" + v + "\"";
    const obj = readToml(value);
    const formedObj: Record<string, unknown> = {};
    let dynamicObj = formedObj;
    for (let i = 0; i < keys.length - 1; i++) {
        dynamicObj[keys[i]] = {};
        dynamicObj = <Record<string, unknown>>dynamicObj[keys[i]];
    }
    dynamicObj[keys[keys.length - 1]] = obj[keys[keys.length - 1]];
    logger.log(`添加命令行配置${value}`);
    _.merge(commandProfile, formedObj);
    _.merge(oldProfiles, formedObj);
    return oldProfiles;
}

/**
 * 将命令行输入的配置路径转换为对象
 * @param path 路径
 * @param oldProfiles 旧值
 */
function parseProfilePath(
    path: string,
    oldProfiles: Record<string, unknown>
): Record<string, unknown> {
    const obj: Record<string, unknown> = readTomlFile(path);
    logger.log(`从${path}载入命令行配置`);
    _.merge(commandProfile, obj);
    _.merge(oldProfiles, obj);
    return oldProfiles;
}

/**
 * 获取来自命令行的配置
 */
export function getCommandProfile(): Record<string, unknown> {
    if (!hasInited) initCommander();
    return commandProfile;
}
