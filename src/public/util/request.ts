import { Request } from "express";
import { IncomingMessage } from "http";

export function getAttr(dict: any, key: string): string | null {
    const val = dict[key];
    if (val === undefined) {
        return null;
    } else if (val instanceof Array) {
        if (val.length && typeof val[val.length - 1] === "string") {
            return val[val.length - 1];
        }
    } else if (typeof val === "string") {
        return val;
    }
    return null;
}

export function getIp(req: Request | IncomingMessage): string {
    if ("ip" in req) {
        return getAttr(req.headers, "x-forwarded-for") ?? req.ip;
    } else {
        return getAttr(req.headers, "x-forwarded-for") ?? "unknown";
    }
}
