import TomlPathReader from "./config-reader/toml-processor/toml-file-reader";
import path from "path";
import configProcessorRootConfig from "./config-processor.root-config";

/**
 * 加载配置文件
 * @param path path
 */
export function ReadProfile(path:string){
    return function<T extends {new (...args:unknown[]):unknown}>(constructor:T):void{
        const reader:TomlPathReader<T> = new TomlPathReader<T>(path);
        Object.assign(constructor.prototype,reader.read());
    };
}

/* eslint-disable */
/**
 * 通过相对路径加载配置文件
 * @param relativePath 相对config目录的路径
 */
export default function ReadProfileRelative(relativePath:string):Function{
    relativePath = path.join(configProcessorRootConfig.configDir,relativePath);
    return function<T extends {new (...args:unknown[]):unknown}>(constructor:T):void{
        const reader:TomlPathReader<T> = new TomlPathReader<T>(relativePath);
        Object.assign(constructor.prototype,reader.read());
    };
}