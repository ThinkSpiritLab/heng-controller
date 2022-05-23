import { CustomDecorator, SetMetadata } from "@nestjs/common";
import {
    NO_AUTH_NO_SIGN_METADATA,
    REQUIRE_LOG,
    ROLE,
    ROLES_METADATA,
} from "../auth.decl";

export const Roles = (...roles: ROLE[]): CustomDecorator<string> =>
    SetMetadata(ROLES_METADATA, roles);
export const NoAuthNoSignNoLog = (): CustomDecorator<string> =>
    SetMetadata(NO_AUTH_NO_SIGN_METADATA, "1");
export const RLog = (entry: string): CustomDecorator<string> =>
    SetMetadata(REQUIRE_LOG, entry);
