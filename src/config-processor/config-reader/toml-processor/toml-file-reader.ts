import ConfigReader from "../config-reader";
import {readTomlFile} from "./toml-reader.utils";

/**
 * toml文件路径解析器
 */
export default class TomlPathReader<T> implements ConfigReader<T>{
    public readonly target:string;
    /**
     * 通过一个toml文件获取TomlPathReader对象
     * @param path 目标文件路径
     */
    constructor(path:string){
        this.target=path;
    }
    read(): T {
        return readTomlFile(this.target);
    }
}
