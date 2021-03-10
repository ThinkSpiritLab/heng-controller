export interface dictionary<T = any> {
    [key: string]: T;
}
export const RoleTypeArr = ["root", "admin", "judger", "user"];
//buya9o等级比较
export const RoleLevel: dictionary = {
    root: 3,
    admin: 2,
    judger: 2,
    user: 1
};
export enum PublicHeadersType {
    accesskey = "x-heng-accesskey",
    nonce = "x-heng-nonce",
    timestamp = "x-heng-timestamp",
    signature = "x-heng-signature"
}

export const whiteHeaders = [
    "content-type",
    PublicHeadersType.accesskey,
    PublicHeadersType.nonce,
    PublicHeadersType.timestamp
];
//FIXME:改名

export type KeyPair = {
    ak: string | null;
    sk: string | null;
    roles?: string[] | null;
};

export type KeyListsDic = dictionary<Record<string, string>>;

export const keyLength = 50;
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
export const keyPoolsNamesArr = keyPoolsNamesArrTemp;
export const keyPoolsNames = keyPoolsNamesDicTemp;
export const roleType = roleTypeDicTemp;
export const toPoolName = keyPoolsNames;
export const toRoleName = toRoleNameTemp;
