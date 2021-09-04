import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";
import { getAttr } from "src/public/util/request";

export async function requestTransform(
    req: Request,
    res: Response,
    next: NextFunction
) {
    req.realIp = getAttr(req.headers, "x-forwarded-for") ?? req.ip;
    next();

    // let process = crypto.createHash("sha256");
    // req.on("data", chunk => {
    //     console.log("data");
    //     process.update(chunk);
    // });
    // req.on("end", () => {
    //     console.log("end");
    //     console.log(req);
    //     req.bodyHash = process.digest("hex");
    //     next();
    // });
}
