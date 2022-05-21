export enum E_ROLE {
    ROOT = "root",
    ADMIN = "admin",
    OBSERVER = "observer",
    JUDGER = "judger",
    USER = "user",
}

export type ROLE = E_ROLE.ADMIN | E_ROLE.OBSERVER | E_ROLE.JUDGER | E_ROLE.USER;
export type ROLE_WITH_ROOT = E_ROLE.ROOT | ROLE;

export const ROLES_ARR = [
    E_ROLE.ADMIN,
    E_ROLE.OBSERVER,
    E_ROLE.JUDGER,
    E_ROLE.USER,
];
export const ROLES_ARR_WITH_ROOT = [E_ROLE.ROOT, ...ROLES_ARR];

export const ROLE_LEVEL: Record<ROLE_WITH_ROOT, number> = {
    root: 0,
    admin: 1,
    observer: 2,
    judger: 2,
    user: 2,
};

export interface KeyPairWithRoot {
    ak: string;
    sk: string;
    role: ROLE_WITH_ROOT;
    remark: string;
    createTime: string;
}
export interface KeyPair extends KeyPairWithRoot {
    role: ROLE;
}

// metadatas
export const MATADATA_PRE = "auth:";
export const ROLES_METADATA = `${MATADATA_PRE}roles`;
export const NO_AUTH_NO_SIGN_METADATA = `${MATADATA_PRE}no-auth-no-sign`;
export const REQUIRE_LOG = `${MATADATA_PRE}require-log`;

export const KEY_SHOW_LENGTH = 12;

export const R_String_NONCE_PRE = "nonce:";

export const R_Hash_KeyPool = "KeyPool"; // hash

export const R_List_Visit_Log = "controllerLog"; // list

export interface Log {
    payload: string;
    entry: string;
    createTime: string;
}

export function init(): void {
    // empty
}
