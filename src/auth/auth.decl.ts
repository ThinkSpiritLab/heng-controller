export enum PublicHeadersType {
    accesskey = "x-heng-accesskey",
    nonce = "x-heng-nonce",
    timestamp = "x-heng-timestamp",
    signature = "x-heng-signature"
};

export const WhiteHeaders = [
    "content-type",
    PublicHeadersType.accesskey,
    PublicHeadersType.nonce,
    PublicHeadersType.timestamp
];
export enum KeyPool{
    Admin="AdminKeys",
    User="UserKeys"
};