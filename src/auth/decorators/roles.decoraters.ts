import { CustomDecorator, SetMetadata } from "@nestjs/common";
import { NO_AUTH_NO_SIGN_METADATA, ROLES_METADATA } from "../auth.decl";

export const Roles = (...roles: string[]): CustomDecorator<string> =>
    SetMetadata(ROLES_METADATA, roles);
export const NoAuthNoSign = (): CustomDecorator<string> =>
    SetMetadata(NO_AUTH_NO_SIGN_METADATA, "1");
