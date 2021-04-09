import {
    BadRequestException,
    Body,
    CanActivate,
    ExecutionContext,
    forwardRef,
    Inject,
    Injectable,
    Logger
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as crypto from "crypto";
import { raw, Request } from "express";
import { Observable } from "rxjs";
import {
    KeyPair,
    KEY_SHOW_LENGTH,
    NO_AUTH_METADATA,
    PUBLIC_HEADERS_TYPE,
    ROLES_METADATA,
    WHITE_HEADERS
} from "./auth.decl";
import { KeyService } from "./key/key.service";

@Injectable()
export class RoleSignGuard implements CanActivate {
    private logger = new Logger("RoleSignGuard");
    private rawBody: any;
    constructor(
        private reflector: Reflector,
        @Inject(forwardRef(() => KeyService))
        private readonly keyService: KeyService
    ) {}
    canActivate(
        context: ExecutionContext
    ): boolean | Promise<boolean> | Observable<boolean> {
        const rolesRequired: string[] = this.reflector.get(
            ROLES_METADATA,
            context.getHandler()
        );
        const isNoAuth = this.reflector.get(
            NO_AUTH_METADATA,
            context.getHandler()
        );
        if (isNoAuth) return true;
        const req = context.switchToHttp().getRequest();
        this.logger.debug("Went into guard");
        //TODO:获取rawBody
        // this.rawBody = Buffer.alloc(JSON.stringify(req.body).length);
        // let reqData: any = [];
        // let size = 0;
        // req.on("data", function(data: any) {
        //     reqData.push(data);
        //     size += data.length;
        // });
        // const self = this;
        // req.on("end", function() {
        //     self.rawBody = Buffer.concat(reqData, size);
        // });
        // console.log(this.rawBody);

        // if (this.whiteUrlList.indexOf(req.url) != -1) return true;
        //验证http请求头及签名
        const accessKey = req.headers[PUBLIC_HEADERS_TYPE.accesskey];
        return this.validate(req, rolesRequired, accessKey);
    }

    async validate(
        req: Request,
        rolesRequired: string[],
        accessKey: string
    ): Promise<boolean> {
        if (!accessKey) {
            this.logger.error("未提供AccesKey!");
            return false;
        }
        const keyPairs: KeyPair[] = await this.keyService.findOne([
            {
                ak: accessKey
            }
        ]);
        const keyPair = keyPairs[0];
        if (!keyPair.sk || !keyPair.roles) {
            this.logger.error(
                `不存在AccesKey${accessKey.substring(0, KEY_SHOW_LENGTH)}`
            );
            return false;
        }
        this.logger.debug(
            ` ${keyPair.roles?.join("/")} ${accessKey.substring(
                0,
                6
            )} 调用api: ${req.path} `
        );
        //TODO 明确log中记不记录IP?
        if (!this.checkPermissionValid(rolesRequired, keyPair.roles)) {
            this.logger.error(
                `权限不足! accessKey:${accessKey.substring(
                    0,
                    KEY_SHOW_LENGTH
                )}... ip:${req.headers["x-forwarded-for"]}`
            );
            return false;
        }
        if (!(await this.checkHeadersValid(req, keyPair.sk))) {
            this.logger.error(
                `header异常! accessKey:${accessKey.substring(
                    0,
                    KEY_SHOW_LENGTH
                )}... ip:${req.headers["x-forwarded-for"]}
                `
            );
            return false;
        }
        return true;
    }
    checkPermissionValid(rolesRequired: string[], hasRoles: string[]) {
        this.logger.debug(`Require Permission:${rolesRequired}`);
        if (!rolesRequired) return true;
        if (hasRoles.includes("root")) return true;
        for (const role of hasRoles) {
            if (rolesRequired.includes(role)) return true;
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
    async checkHeadersValid(
        req: Request,

        secretKey: string
    ): Promise<boolean> {
        //写成校验管道？？
        if (!req.headers[PUBLIC_HEADERS_TYPE.signature]) {
            this.logger.error("未提供signature!");
            return false;
        }
        // {http method}\n
        const httpMethod = req.method;
        // console.log(httpMethod);
        // {url path}\n
        const urlPath = req.path;
        // {query strings}\n 请求参数
        let queryStrings = "";
        //FIXME:如何才能去掉这里的as
        const toLowerCaseandSort = (arr: typeof req.query) => {
            const keys = Object.keys(arr);
            const keyValueTuples: [string, string][] = keys.map(key => {
                return [
                    encodeURIComponent(key.toLowerCase()),
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
        this.logger.debug(`querystrings ${queryStrings}`);
        // {signed headers}\n
        const whiteHeadersArrTemp = [];
        //IncommingHttpHeaders已自动转为小写
        //whiteHeaders先排好序，根据
        for (const headerName of WHITE_HEADERS.sort()) {
            const h: string | any = req.headers[headerName];
            if (!h) {
                this.logger.error(`header格式不合法！缺少参数${headerName}等`);
                return false;
            }
            whiteHeadersArrTemp.push(
                `${headerName.toLowerCase()}=${encodeURIComponent(h)}`
            );
        }
        const signedHeaders = whiteHeadersArrTemp.join("&");
        // this.logger.debug(`signedHeaders:${signedHeaders}`);

        // {body hash}\n
        //FIXME: body格式为表单时会报错The "data" argument must be of type string or an instance of Buffer
        const bodyHash = crypto
            .createHash("sha256")
            .update(this.rawBody)
            .digest("hex");
        //计算得的签名
        const examSignature = crypto
            .createHmac("sha256", secretKey)
            .update(
                `${httpMethod}\n${urlPath}\n${queryStrings}\n${signedHeaders}\n${bodyHash}\n`
            )
            .digest("hex");
        this.logger.debug(
            "String to sign:\n" +
                `${httpMethod}\n${urlPath}\n${queryStrings}\n${signedHeaders}\n${bodyHash}\n`
        );
        this.logger.debug("Signature_find: " + req.headers["x-heng-signature"]);
        this.logger.debug("Signature_required: " + examSignature);
        if (examSignature != req.headers[PUBLIC_HEADERS_TYPE.signature]) {
            this.logger.error("header签名不一致,可能被篡改!");
            return false;
        }
        return true;
    }
}
