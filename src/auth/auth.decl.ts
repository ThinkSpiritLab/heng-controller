import { IsString } from "_class-validator@0.12.2@class-validator";

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
    User = "userKeys"
}
export type KeyPair ={
    ak: string | null;
    sk: string | null;
    role?: string | null;
};

export type KeyLists = {
    adminKeys: Record<string, string>;
    userKeys: Record<string, string>;
};
