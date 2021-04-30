import { SetMetadata, UseGuards } from "@nestjs/common";
import { NO_AUTH_METADATA, ROLES_METADATA } from "../auth.decl";

export const Roles = (...roles: string[]) => SetMetadata(ROLES_METADATA, roles);
export const NoAuth = () => SetMetadata(NO_AUTH_METADATA, true);
