import { readTomlFile } from "./toml-reader.utils";

/**
 * toml文件路径解析器
 */
export default class TomlFileReader {
    public readonly target: string;
    /**
     * 通过一个toml文件获取TomlFileReader对象
     * @param path 目标文件路径
     */
    constructor(path: string) {
        this.target = path;
    }
    read(): unknown {
        return readTomlFile(this.target);
    }
}
