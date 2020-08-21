import path from "path";

interface ConfigProcessorRootConfig{
    /**
     * 配置文件目录位置 (这个位置仅仅只是一个约定，你可以把配置文件存放在任何位置)
     */
    configDir:string;
}

/**
 * 程序根目录位置
 */
const root:string = path.join(__dirname,"../../");

const rootConfig:ConfigProcessorRootConfig = {
    configDir:path.join(root,"./config")
};

export default rootConfig;