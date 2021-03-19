//手动开一个字典
export interface dictionary<T = any> {
    [key: string]: T;
}
/**
 * 存角色的数组
 */
export const RoleTypeArr = ["root", "admin", "judger", "user"];
//目前不要用等级比较
// export const RoleLevel: dictionary = {
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

export const whiteHeaders = [
    "content-type",
    PublicHeadersType.accesskey,
    PublicHeadersType.nonce,
    PublicHeadersType.timestamp
];

export type KeyPair = {
    ak: string | null;
    sk: string | null;
    roles?: string[] | null;
};

export type KeyListsDic = dictionary<Record<string, string>>;
/** 非root角色密钥对的长度 */
export const keyLength = 64;
export const keyPoolPre = "KeyPool";
const keyPoolsNamesArrTemp = [];
const keyPoolsNamesDicTemp: dictionary<string> = {};
const roleTypeDicTemp: dictionary<string> = {};
const toRoleNameTemp: dictionary<string> = {};
for (const role of RoleTypeArr) {
    keyPoolsNamesArrTemp.push(`${keyPoolPre}:${role}`);
    keyPoolsNamesDicTemp[role] = `${keyPoolPre}:${role}`;
    toRoleNameTemp[`${keyPoolPre}:${role}`] = role;
    roleTypeDicTemp[role] = role;
}
/**存密钥对池名称的数组*/
export const keyPoolsNamesArr = keyPoolsNamesArrTemp;
/**存每个角色对的密钥对池名称的字典*/
export const keyPoolsNames = keyPoolsNamesDicTemp;
/**存角色对应的名称的字典，目前还没啥用*/
export const roleType = roleTypeDicTemp;
/**角色名称转密钥对池名称 */
export const toPoolName = keyPoolsNames;
/**密钥对池名称转角色名称 */
export const toRoleName = toRoleNameTemp;
