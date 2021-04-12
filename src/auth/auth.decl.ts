import { ConfigService } from "src/config/config-module/config.service";
import {
    KeyCriteriaArrDTO,
    KeyPairArrDTO,
    RoleCriteriaArrDTO
} from "./dto/key.dto";
const configService = new ConfigService();
/**
 * 存角色的数组
 */
export const ROOT = "root";
export const JUDGER = "judger";
export const ADMIN = "admin";
export const USER = "user";
export const ROLES = [ROOT, ADMIN, JUDGER, USER];
export const ROLES_EXCEPT_ROOT = [ADMIN, JUDGER, USER];
//目前不要用等级比较
// export const RoleLevel: Dictionary = {
//     root: 3,
//     admin: 2,
//     judger: 2,
//     user: 1
// };
/**
 * 公共请求头
 */
export enum PUBLIC_HEADERS_TYPE {
    accesskey = "x-heng-accesskey",
    nonce = "x-heng-nonce",
    signature = "x-heng-signature",
    timestamp = "x-heng-timestamp"
}

export const WHITE_HEADERS = [
    "content-type",
    PUBLIC_HEADERS_TYPE.accesskey,
    PUBLIC_HEADERS_TYPE.nonce,
    PUBLIC_HEADERS_TYPE.timestamp
];

export interface KeyPair {
    ak: string | null;
    sk: string | null;
    role?: string;
}

export type FindAllKeysRecord = Record<string, Record<string, string>>;
export interface KeyResult {
    ak?: string;
    sk?: string;
    message?: string;
    success?: number; //某个密钥对要增删的role中成功的数量
    affectedRole?: string; //增删成功的role
}

//非root角色密钥对的长度 *
export const KEY_LENGTH_NOT_ROOT = configService.getConfig().auth
    .keyLengthNotRoot;
export const KEY_LENGTH_ROOT_MIN = configService.getConfig().auth
    .keyLengthRootMin;
export const KEY_LENGTH_ROOT_MAX = configService.getConfig().auth
    .keyLengthRootMax;
export const KEY_POOL_NAME_PRE = "KeyPool";

//错误：
export const CANNOT_ADD_ROOT_KEY = "无法添加root密钥对!";
export const KEY_ROLE_NOT_EXIST = "密钥对的角色未指定!";

// metadatas
export const MATADATA_PRE = "Metadata";
export const ROLES_METADATA = `${MATADATA_PRE}:roles`;
export const NO_AUTH_METADATA = `${MATADATA_PRE}:no-auth`;

/**存密钥对池名称的数组*/
export const KEY_POOLS_NAMES_ARR: string[] = [];
/**存每个角色对应的密钥对池名称的字典*/
export const KEY_POOLS_NAMES_DIC: Record<string, string> = {};
/*存角色对应的名称的字典，目前还未使用*/
export const ROLE_TYPE_DIC: Record<string, string> = {};
export const ROLE_TYPE_DIC_EXCEPT_ROOT: Record<string, string> = {};
/**角色名称转密钥对池名称 */
export const TO_POOL_NAME: Record<string, string> = {};
/**密钥对池名称转角色名称 */
export const TO_ROLE_NAME: Record<string, string> = {};

export const KEY_SHOW_LENGTH = 12;
ROLES.map(role => {
    KEY_POOLS_NAMES_ARR.push(`${KEY_POOL_NAME_PRE}:${role}`);
    KEY_POOLS_NAMES_DIC[role] = `${KEY_POOL_NAME_PRE}:${role}`;
    TO_ROLE_NAME[role] = KEY_POOLS_NAMES_DIC[role];
    TO_ROLE_NAME[`${KEY_POOL_NAME_PRE}:${role}`] = role;
    ROLE_TYPE_DIC[role] = role;
    if (role != ROOT) ROLE_TYPE_DIC_EXCEPT_ROOT[role] = role;
});
export const TEST = "test";
KEY_POOLS_NAMES_DIC["test"] = `${KEY_POOL_NAME_PRE}:test`;
Object.assign(TO_POOL_NAME, KEY_POOLS_NAMES_DIC);
export const TEST_FIND_ALL_DATA: RoleCriteriaArrDTO = { list: [] };
Object.assign(TEST_FIND_ALL_DATA.list, [
    { index: 0, role: "user" },
    { role: "admin" },
    { role: "asd" },
    { role: "" },
    { role: "root" }
]);
export const TEST_ADD_DATA: KeyPairArrDTO = { list: [] };
