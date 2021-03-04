import { IsString } from "class-validator";

export enum PublicHeadersType {
    accesskey = "x-heng-accesskey",
    nonce = "x-heng-nonce",
    timestamp = "x-heng-timestamp",
    signature = "x-heng-signature"
}

export const WhiteHeaders = [
    "content-type",
    PublicHeadersType.accesskey,
    PublicHeadersType.nonce,
    PublicHeadersType.timestamp
];
export enum KeyPoolsName {
    Root = "rootKeys",
    Admin = "adminKeys",
    User = "userKeys",
    Judger = "judgerKeys"
}
export const KeyPoolsNameArr = [
    "rootKeys",
    "adminKeys",
    "userKeys",
    "judgerKeys"
];
export type KeyPair = {
    ak: string | null;
    sk: string | null;
    role?: string | null;
};

export type KeyLists = {
    adminKeys: Record<string, string>;
    userKeys: Record<string, string>;
};

export const keyLength=20;