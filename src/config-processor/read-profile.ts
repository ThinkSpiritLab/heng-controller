import TomlPathReader from "./config-reader/toml-processor/toml-file-reader";
import path from "path";
import configProcessorRootConfig from "./config-processor.root-config";
import { VAILD_MAGIC_PROP, VaildMark } from "./config-vaild";
import { Profile } from "./profile";

/**
 * 实现深拷贝
 */
function deepAssign(
    target: Record<string, unknown>,
    ...source: Record<string, unknown>[]
): void {
    source.forEach(src => {
        for (const key in src) {
            if (key.startsWith("_")) {
                continue;
            }
            if (typeof target[key] !== "object") {
                target[key] = src[key];
            } else {
                if (typeof src[key] !== "object") {
                    throw new Error(`类型${typeof src[key]}不能与object合并`);
                }
                deepAssign(
                    <Record<string, unknown>>target[key],
                    <Record<string, unknown>>src[key]
                );
            }
        }
    });
}

/**
 * 加载配置文件
 * @param ...path 路径，在后面的重复配置将会覆盖前面的配置
 */
export function ReadProfile(...path: string[]) {
    return function<T extends { new (...args: unknown[]): unknown }>(
        constructor: T
    ): void {
        path.forEach(p => {
            const reader = new TomlPathReader<Record<string, unknown>>(p);
            deepAssign(constructor.prototype, reader.read());
        });
        vaildObject(constructor.prototype);
    };
}

/**
 * 通过相对路径加载配置文件
 * @param relativePath 相对config目录的路径，在后面的重复配置将会覆盖前面的配置
 */
export default function ReadProfileRelative(
    ...relativePath: string[]
): <T extends { new (...args: unknown[]): unknown }>(constructor: T) => void {
    const absolutePath: string[] = relativePath.map(p =>
        path.join(configProcessorRootConfig.configDir, p)
    );
    return function<T extends { new (...args: unknown[]): unknown }>(
        constructor: T
    ): void {
        absolutePath.forEach(p => {
            const reader = new TomlPathReader<Record<string, unknown>>(p);
            deepAssign(constructor.prototype, reader.read());
        });
        vaildObject(constructor.prototype);
    };
}

function vaildObject(obj: Record<string, unknown>): void {
    if (!obj[VAILD_MAGIC_PROP]) return;
    const profileName = obj[PROFILE_NAME_MAGIC]
        ? obj[PROFILE_NAME_MAGIC]
        : "配置文件";
    (<Array<VaildMark>>obj[VAILD_MAGIC_PROP]).forEach((v: VaildMark) => {
        if (!v.vaild(obj[v.prop])) {
            if (v.message) {
                throw new Error(`${profileName}加载失败!\n` + v.message);
            } else {
                throw new Error(
                    `${profileName}加载失败!\n字段${v.prop}校验未通过`
                );
            }
        }
    });
    for (const key in obj) {
        if (typeof obj[key] === "object" && Object.getPrototypeOf(obj[key])) {
            vaildObject(<Record<string, unknown>>obj[key]);
        }
    }
}

export function Type(
    type: unknown
): <T extends Profile>(target: T, key: string) => void {
    return function<T extends Profile>(target: T, key: string): void {
        const t = <Record<string, unknown>>target;
        if (t[key] === undefined) {
            t[key] = {
                __proto__: type
            };
        }
    };
}

const PROFILE_NAME_MAGIC = "_PROFILE_NAME_MAGIC_";

/**
 * 指定配置文件名
 * @param name 配置文件名
 */
export function ProfileName(
    name: string
): <T extends { new (...args: unknown[]): unknown }>(constructor: T) => void {
    return function<T extends { new (...args: unknown[]): unknown }>(
        constructor: T
    ): void {
        constructor.prototype[PROFILE_NAME_MAGIC] = name;
    };
}
