import { SetMetadata, UseGuards } from "@nestjs/common";
import { RoleSignGuard } from "../auth.guard";

export const Roles = (...roles: string[]) => SetMetadata("roles", roles);
// UseGuards(RoleSignGuard);