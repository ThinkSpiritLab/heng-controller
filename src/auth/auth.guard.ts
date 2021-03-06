import {
    CanActivate,
    ExecutionContext,
    forwardRef,
    Inject,
    Injectable,
    Logger
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as crypto from "crypto";
import { Request } from "express";
import { Observable } from "rxjs";
import {
    KeyPair,
    PublicHeadersType,
    RoleLevel,
    whiteHeaders
} from "./auth.decl";
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
        // console.log("rolesReq", roleRequired);
        // console.log(req.body);
        if (!rolesRequired) return true;

        // if (this.whiteUrlList.indexOf(req.url) != -1) return true;
        //验证http请求头及签名
        const accessKey = req.headers[PublicHeadersType.accesskey] as string;
        return this.validate(req, rolesRequired, accessKey);
    }

    async validate(
        req: Request,
        rolesRequired: string[],
        accessKey: string
    ): Promise<boolean> {
        if (!accessKey) return false;
        let keyPair: KeyPair = await this.keyService.getKeyPair(accessKey);
        if (!keyPair.sk || !keyPair.roles) {
            this.logger.error(`不存在AccesKey${accessKey.substr(0, 6)}`);
            return false;
        }
        // console.log(keyPair.role as string);
        this.logger.log(
            ` ${keyPair.roles?.join("/")} ${accessKey.substring(
                0,
                6
            )} 调用api: ${req.path} `
        );
        if (!this.checkPermissionValid(rolesRequired, keyPair.roles)) {
            this.logger.error(
                `权限不足! accessKey:${accessKey.substring(0, 6)} ip:${req.ip}`
            );
            return false;
        }
        if (!this.checkHeadersValid(req, keyPair.sk)) {
            this.logger.error(
                `header签名不一致! accessKey:${accessKey.substring(0, 6)} ip:${
                    req.ip
                }`
            );
            return false
        }
        return true;
    }
    checkPermissionValid(rolesRequired: string[], hasRoles: string[]) {
        for (let role of hasRoles) {
            if (role in rolesRequired) return true;
        }
        return false;
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
        // console.log(httpMethod);
        // {url path}\n
        const urlPath = req.path;
        // {query strings}\n 请求参数
        let queryStrings = "";
        console.log(req.query);
        let toLowerCaseandSort = (arr: typeof req.query) => {
            let keys = Object.keys(arr);
            let keyValueTuples: [string, string][] = keys.map(key => {
                return [
                    encodeURIComponent((key as string).toLowerCase()),
                    encodeURIComponent((arr[key] as string).toLowerCase())
                ];
            });
            keyValueTuples.sort((a, b) => {
                return a < b ? -1 : 1;
            });
            let dictionaryString = "";
            keyValueTuples.forEach((q, i) => {
                dictionaryString += `&${q.join("=")}`;
            });
            return dictionaryString.substring(1);
        };
        queryStrings = toLowerCaseandSort(req.query);
        // console.log("querystrings", queryStrings);
        // {signed headers}\n
        let whiteHeadersArr = [];
        //IncommingHttpHeaders已自动转为小写
        //whiteHeaders先排好序，根据
        for (let headerName of whiteHeaders.sort()) {
            let h: string | any = req.headers[headerName];
            if (!h) {
                console.log("请求头名称不合法！");
                return false;
            }
            whiteHeadersArr.push(
                `${headerName.toLowerCase()}=${encodeURIComponent(h)}`
            );
        }
        let signedHeaders = whiteHeadersArr.join("&");
        // console.log(signedHeaders);
        // {body hash}\n
        const bodyHash = crypto
            .createHash("sha256")
            .update(req.body ? JSON.stringify(req.body) : "")
            .digest("hex");
        // console.log("body", req.body);
        //计算得的签名
        let examSignature = crypto
            .createHmac("sha256", secretKey)
            .update(
                `${httpMethod}\n${urlPath}\n${queryStrings}\n${signedHeaders}\n${bodyHash}\n`
            )
            .digest("hex");
        console.log(
            "string to sign:\n",
            `${httpMethod}\n${urlPath}\n${queryStrings}\n${signedHeaders}\n${bodyHash}\n`
        );
        // console.log(req.headers["x-heng-signature"]);
        // console.log(examSignature);
        if (examSignature != req.headers[PublicHeadersType.signature]) {
            return false;
        }
        return true;
    }
}
