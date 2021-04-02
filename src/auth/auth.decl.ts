/**
 * 存角色的数组
 */
export const Root = "root";
export const Judger = "judger";
export const Admin = "admin";
export const User = "user";
export const RoleTypeArr = [Root, Admin, Judger, User];
export const RoleTypeArrExceptRoot = [Admin, Judger, User];
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
export enum PublicHeadersType {
    accesskey = "x-heng-accesskey",
    nonce = "x-heng-nonce",
    signature = "x-heng-signature",
    timestamp = "x-heng-timestamp"
}

export const WhiteHeaders = [
    "content-type",
    PublicHeadersType.accesskey,
    PublicHeadersType.nonce,
    PublicHeadersType.timestamp
];

export interface KeyPair {
    ak: string | null;
    sk: string | null;
    roles?: string[];
}

export type FindAllKeysRecord = Record<string, Record<string, string>>;
export interface KeyResult {
    ak?: string;
    sk?: string;
    message?: string;
    successNum?: number; //某个密钥对要增删的roles中成功的数量
    affectedRoles?: string[]; //增删成功的roles
}

//非root角色密钥对的长度 *
export const KEY_LENGTH_NOT_ROOT = 64;
export const keyPoolPre = "KeyPool";

// metadatas

export const MetadataPre = "Metadata";
export const ROLES_METADATA = `${MetadataPre}:roles`;
export const NO_AUTH_METADATA = `${MetadataPre}:no-auth`;
//Temp变量用于初始化要export的变量
const keyPoolsNamesArrTemp: string[] = [];
const keyPoolsNamesDicTemp: Record<string, string> = {};
const RoleTypeDicTemp: Record<string, string> = {};
const ToRoleNameTemp: Record<string, string> = {};
const RoleTypeDicExceptRootTemp: Record<string, string> = {};
RoleTypeArr.forEach(role => {
    keyPoolsNamesArrTemp.push(`${keyPoolPre}:${role}`);
    keyPoolsNamesDicTemp[role] = `${keyPoolPre}:${role}`;
    ToRoleNameTemp[`${keyPoolPre}:${role}`] = role;
    RoleTypeDicTemp[role] = role;
    if (role != Root) RoleTypeDicExceptRootTemp[role] = role;
});
keyPoolsNamesDicTemp["test"] = `${keyPoolPre}:test`;
/**存密钥对池名称的数组*/
export const KeyPoolsNamesArr = keyPoolsNamesArrTemp;
/**存每个角色对的密钥对池名称的字典*/
export const keyPoolsNames = keyPoolsNamesDicTemp;
/**存角色对应的名称的字典，目前还没啥用*/
export const RoleTypeDic = RoleTypeDicTemp;
export const RoleTypeDicExceptRoot = RoleTypeDicExceptRootTemp;
/**角色名称转密钥对池名称 */
export const ToPoolName = keyPoolsNames;
/**密钥对池名称转角色名称 */
export const ToRoleName = ToRoleNameTemp;

export const KEY_SHOW_LENGTH = 12;
