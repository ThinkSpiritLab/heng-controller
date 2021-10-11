export enum E_ROLE {
    ROOT = "root",
    ADMIN = "admin",
    OBSERVER = "observer",
    JUDGER = "judger",
    USER = "user"
}

export type ROLE = E_ROLE.ADMIN | E_ROLE.OBSERVER | E_ROLE.JUDGER | E_ROLE.USER;
export type ROLE_WITH_ROOT = E_ROLE.ROOT | ROLE;

export const ROLES_ARR = [
    E_ROLE.ADMIN,
    E_ROLE.OBSERVER,
    E_ROLE.JUDGER,
    E_ROLE.USER
];
export const ROLES_ARR_WITH_ROOT = [E_ROLE.ROOT, ...ROLES_ARR];

export const ROLE_LEVEL: Record<ROLE_WITH_ROOT, number> = {
    root: 0,
    admin: 1,
    observer: 2,
    judger: 2,
    user: 2
};

export interface KeyPairWithRoot {
    ak: string;
    sk: string;
    role: ROLE_WITH_ROOT;
}
export interface KeyPair extends KeyPairWithRoot {
    role: ROLE;
}

// export type FindAllKeysRecord = Record<string, Record<string, string>>;

// export interface KeyResult {
//     ak?: string;
//     sk?: string;
//     message?: string;
//     success?: number; // 某个密钥对要增删的 role 中成功的数量
//     affectedRole?: string; // 增删成功的 role
// }

// metadatas
export const MATADATA_PRE = "auth:";
export const ROLES_METADATA = `${MATADATA_PRE}roles`;
export const NO_AUTH_NO_SIGN_METADATA = `${MATADATA_PRE}no-auth-no-sign`;

export const KEY_SHOW_LENGTH = 12;

export const R_String_NONCE_PRE = "nonce:";

export const R_Hash_KeyPool = "KeyPool"; // hash

export function init(): void {
    // empty
}
