import path from "path";

/**
 * 定义了一个配置文件类所具有的元数据
 */
export interface ProfileMeta {
    /**
     * 配置文件名
     */
    name: string;
    /**
     * 是否开启校验
     */
    vaild: boolean;
    /**
     * 当校验失败时是否退出程序
     */
    exitWhenVaildError: boolean;
    /**
     * 配置文件原始数据
     */
    profile: Record<string, unknown>;
    /**
     * 存储子配置信息
     */
    children: Array<ProfileChild>;
}

export interface ProfileChild {
    type: { new (...args: unknown[]): unknown };
    prop: string;
    array?: boolean;
}

/**
 * 配置文件元数据键。<br>
 * 配置文件将会以此键存储在所标识类的元数据中。
 */
export const PROFILE_META_MAGIC = "profile_meta";

/**
 * 默认配置文件元数据
 */
export const defaultProfileMeta: ProfileMeta = {
    name: "配置文件",
    vaild: false,
    exitWhenVaildError: true,
    profile: {},
    children: []
};

/**
 * 配置文件解析器默认配置
 */
export const profileProcessorConfig = {
    configRoot: path.join(__dirname, "../../config")
};
