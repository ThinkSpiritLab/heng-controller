import { CanActivate, ExecutionContext, Injectable,Logger } from "@nestjs/common";
import { from, Observable,of } from "rxjs";
import { tap } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { RoleType } from "./roles/roles.type";
import * as iconv from "iconv-lite";
import { Request } from "express";
import {  WhiteHeaders,PublicHeadersType } from "./auth.decl";
import * as crypto from "crypto";

@Injectable()
export class RoleSignGuard implements CanActivate {
    private whiteUrlList: string[] = [];
    //test!!!
    private SecretKey = "12312vhvehru231v123123";
    private logger = new Logger("RoleSignGuard");
    constructor(private reflector: Reflector) {}
    canActivate(
        context: ExecutionContext
    ): boolean | Promise<boolean> | Observable<boolean> {
        const rolesRequired = this.reflector.get("roles", context.getHandler());
        this.logger.log(rolesRequired);
        let req = context.switchToHttp().getRequest() as Request;
        let headers = req.headers;
        //验证角色
        
        // if(req.)
        // console.log(req.url)
        if (this.whiteUrlList.indexOf(req.url) != -1) return true;
        //验证http请求头及签名
        if (!this.checkHeadersValid(req)) return false;
        this.logger.log(`用户${req.headers[PublicHeadersType.accesskey]}:http签名校验通过`);
        const role = this.getRoleByAccessKey(req);
        if (!role) return false;
        if (rolesRequired.indexOf(role) == -1) return false;
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
        return true;
        // const token = context.switchToRpc().getData().headers.token;
        // if (token) return true;
    }
    /* http请求头签名校验
        {http method}\n
        {url path}\n
        {query strings}\n
        {signed headers}\n
        {body hash}\n
    */
    checkHeadersValid(req: Request): boolean {
        //写成校验管道？？
        if (!req.headers["x-heng-signature"]) return false;
        //获取：
        // {http method}\n
        const httpMethod = req.method;
        console.log(httpMethod);
        // {url path}\n
        const urlPath = req.originalUrl;
        console.log(urlPath);
        // {query strings}\n 请求参数

        const queryStrings = req.url
            .split("?")[1]
            .split("&")
            .sort()
            .join("&");

        // console.log(queryStrings);
        // {signed headers}\n
        let tmpSortedHeaders = [];
        for (let headerName of WhiteHeaders) {
            let h:String|any=req.headers[headerName]
            tmpSortedHeaders.push(`${headerName.toLowerCase()}=${iconv.encode(h,"utf8")}`);
        }
        let signedHeaders = tmpSortedHeaders.sort().join("&");
        // console.log(signedHeaders);
        // {body hash}\n
        const bodyHash = crypto
            .createHash("sha256")
            .update(req.body ? req.body.toString() : "")
            .digest("hex");

        //参数合法性校验?
        //签名校验
        let examSignature = crypto
            .createHmac("sha256", this.SecretKey)
            .update(
                `${httpMethod}\n${urlPath}\n${queryStrings}\n${signedHeaders}\n${bodyHash}\n`
            )
            .digest("hex");
        // console.log(req.headers["x-heng-signature"]);
        // console.log(examSignature);
        if (examSignature != req.headers[PublicHeadersType.signature]) {
            console.log("header签名不一致!");
            return false;
        }
        return true;
    }
    //通过accessKey获取用户的角色
    getRoleByAccessKey(req: Request) {
        const accessKey = req.headers[PublicHeadersType.accesskey];
        if (!accessKey) return false;
        console.log(accessKey);
        //角色编码在accessKey中，解析出角色
        
        return ;
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
