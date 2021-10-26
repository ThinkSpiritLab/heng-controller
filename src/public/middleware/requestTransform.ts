import { Request, Response, NextFunction } from "express";
import { getAttr } from "src/public/util/request";

/**
 * append real ip to Request
 * @param req 
 * @param res 
 * @param next 
 */
export async function requestTransform(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    req.realIp = getAttr(req.headers, "x-real-ip") ?? req.ip;
    next();
}
