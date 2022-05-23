import "express";
import { ROLE_WITH_ROOT } from "../../auth/auth.decl";

declare global {
    namespace Express {
        // These open interfaces may be extended in an application-specific manner via declaration merging.
        // See for example method-override.d.ts (https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/method-override/index.d.ts)
        interface Request {
            realIp: string; // real ip is appended for every http request
            role?: ROLE_WITH_ROOT; // role is append to req after passing Guard except **isNoAuthNoSign**
        }
        // interface Response {}
        // interface Application {}
    }
}
