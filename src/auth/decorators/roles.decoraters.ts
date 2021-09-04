import { SetMetadata } from "@nestjs/common";
import { NO_AUTH_NO_SIGN_METADATA, ROLES_METADATA } from "../auth.decl";

export const Roles = (...roles: string[]) => SetMetadata(ROLES_METADATA, roles);
export const NoAuthNoSign = () => SetMetadata(NO_AUTH_NO_SIGN_METADATA, "1");
