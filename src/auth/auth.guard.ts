import {
    CanActivate,
    ExecutionContext,
    forwardRef,
    Inject,
    Injectable,
    Logger
} from "@nestjs/common";
import { from, Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { RoleType } from "./roles/roles.type";
import * as iconv from "iconv-lite";
import { Request } from "express";
import { WhiteHeaders, PublicHeadersType, KeyPair } from "./auth.decl";
import * as crypto from "crypto";
import { KeyService } from "./key/key.service";

@Injectable()
export class RoleSignGuard implements CanActivate {
    private whiteUrlList: string[] = [];
    //test!!!
    private logger = new Logger("RoleSignGuard");
    constructor(
        private reflector: Reflector,
        @Inject(forwardRef(() => KeyService))
        private readonly keyService: KeyService
    ) {}
    canActivate(
        context: ExecutionContext
    ): boolean | Promise<boolean> | Observable<boolean> {
        const rolesRequired: string[] = this.reflector.get(
            "roles",
            context.getHandler()
        );
        let req = context.switchToHttp().getRequest();
        // console.log("rolesReq", rolesRequired);
        // console.log(req.body);
        if (!rolesRequired) return true;

        if (this.whiteUrlList.indexOf(req.url) != -1) return true;
        //验证http请求头及签名
        const accessKey = req.headers[PublicHeadersType.accesskey] as string;
        if (!accessKey) return false;
        return this.validate(req, rolesRequired, accessKey);
        // return of(rolesRequired.indexOf(role)).pipe(
        //     tap(value => {
        //         if (value) {
        //             throw new ForbiddenException(
        //                 "对不起，你不是管理员",
        //                 "AdminGuard"
        //             );
        //         }
        //     })
        // );
    }

    async validate(
        req: Request,
        rolesRequired: string[],
        accessKey: string
    ): Promise<boolean> {
        let keyPair: KeyPair = await this.keyService.getKeyPairByAk(accessKey);
        if (!keyPair.sk) return false;
        // console.log(keyPair.role as string);
        if (rolesRequired.indexOf(keyPair.role as string) == -1) {
            this.logger.error(`权限不足 ${new Date()} ip:${req.ip}`);
            return false;
        }
        return this.checkHeadersValid(req, keyPair.sk);
    }
    /**
     *   http请求头签名校验
     *    {http method}\n
     *    {url path}\n
     *    {query strings}\n
     *    {signed headers}\n
     *    {body hash}\n
     */
    async checkHeadersValid(req: Request, secretKey: string): Promise<boolean> {
        //写成校验管道？？
        if (!req.headers[PublicHeadersType.signature]) return false;
        //获取：
        // {http method}\n
        const httpMethod = req.method;
        console.log(httpMethod);
        // {url path}\n
        const urlPath = req.originalUrl;
        console.log(urlPath);
        // {query strings}\n 请求参数
        const queryStrings =
            urlPath.indexOf("?") == -1
                ? ""
                : urlPath
                      .split("?")[1]
                      .split("&")
                      .sort()
                      .join("&");
        console.log("querystrings", queryStrings);
        // {signed headers}\n
        let tmpSortedHeaders = [];
        for (let headerName of WhiteHeaders) {
            let h: string | any = req.headers[headerName];
            if (!h) {
                console.log("请求头不合法！");
                return false;
            }
            tmpSortedHeaders.push(
                `${headerName.toLowerCase()}=${iconv.encode(h, "utf8")}`
            );
        }
        let signedHeaders = tmpSortedHeaders.sort().join("&");
        // console.log(signedHeaders);
        // {body hash}\n
        const bodyHash = crypto
            .createHash("sha256")
            .update(req.body ? JSON.stringify(req.body) : "")
            .digest("hex");
        console.log("body", req.body);
        //参数合法性校验?
        //计算得的签名

        let examSignature = crypto
            .createHmac("sha256", secretKey)
            .update(
                `${httpMethod}\n${urlPath}\n${queryStrings}\n${signedHeaders}\n${bodyHash}\n`
            )
            .digest("hex");
        console.log(
            `${httpMethod}\n${urlPath}\n${queryStrings}\n${signedHeaders}\n${bodyHash}\n`
        );
        console.log(req.headers["x-heng-signature"]);
        console.log(examSignature);
        if (examSignature != req.headers[PublicHeadersType.signature]) {
            this.logger.error(`header签名不一致! ${new Date()} ip:${req.ip}`);
            return false;
        }
        return true;
    }
}

// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Observable } from 'rxjs';

// @Injectable()
// export class LoginGuard implements CanActivate {
//   canActivate(
//     context: ExecutionContext,
//   ): boolean | Promise<boolean> | Observable<boolean> {
//     const req = context.switchToHttp().getRequest<Request | any>();
//     // 获取cookie
//     const cookie = req.signedCookies;
//     // console.log(cookie.userId);
//     console.log(typeof req);
//     console.log(typeof req.headers)
//     // 获取session
//     const session = req.session;
//     console.log(session.userName);
//     console.log(req.header('user-agent'));
//     return true;
//   }
// }
