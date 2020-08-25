import fs from "fs";
import toml from "@iarna/toml";

/**
 * 读取一段toml字符串，将其转为对象
 * @param input 目标toml字符串
 */
function readToml(input: string) {
    return toml.parse(input);
}
/**
 * 读取指定路径的toml配置文件
 * @param path 目标路径
 */
function readTomlFile(path: string) {
    const tomlFile: Buffer = fs.readFileSync(path);
    const data = readToml(tomlFile.toString());
    return data;
}

/**
 * 实现ConfigReader接口，用于读取toml配置文件
 */
export { readToml, readTomlFile };
