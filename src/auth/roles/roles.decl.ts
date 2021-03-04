export enum RoleType {
    Admin = "admin",
    Judger = "judger",
    User = "user",
    Root = "root"
}
export const RoleLevel: { [key: string]: number } = {
    root: 3,
    admin: 2,
    judger: 2,
    user: 1
};
