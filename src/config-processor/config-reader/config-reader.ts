/**
 * 配置读取器,用于读取配置文件
 */
interface ConfigReader<T>{

    /**
     * 将配置文件转换为对象
     */
    read():T;

}

export default ConfigReader;
