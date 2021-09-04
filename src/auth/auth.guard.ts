import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as crypto from "crypto";
import { Request } from "express";
import { Observable } from "rxjs";
import { ConfigService } from "src/config/config-module/config.service";
import { getAttr } from "src/public/util/request";
import {
    KeyPair,
    KEY_SHOW_LENGTH,
    NO_AUTH_NO_SIGN_METADATA,
    PUBLIC_HEADERS_TYPE,
    ROLES_METADATA as ROLE_METADATA,
    ROOT
} from "./auth.decl";
import { KeyService } from "./key/key.service";
import { Sign, EncryptParam } from "heng-sign-js";

@Injectable()
export class RoleSignGuard implements CanActivate {
    private readonly logger = new Logger("RoleSignGuard");
    private readonly sign = new Sign(encrypt, true);

    constructor(
        private reflector: Reflector,
        private readonly keyService: KeyService,
        private readonly configService: ConfigService
    ) {}
    canActivate(
        context: ExecutionContext
    ): boolean | Promise<boolean> | Observable<boolean> {
        const roleRequired: string[] = this.reflector.get(
            ROLE_METADATA,
            context.getHandler()
        );
        const isNoAuthNoSign = this.reflector.get(
            NO_AUTH_NO_SIGN_METADATA,
            context.getHandler()
        );
        if (isNoAuthNoSign) return true;
        const req: Request = context.switchToHttp().getRequest();
        return this.validate(req, roleRequired);
    }

    async validate(req: Request, roleRequired: string[]): Promise<boolean> {
        const accessKey =
            getAttr(req.headers, PUBLIC_HEADERS_TYPE.accesskey) ?? "";
        if (!accessKey) {
            this.logger.error("未提供 AccesKey！");
            return false;
        }
        const keyCriteriaArr = [
            {
                ak: accessKey
            }
        ];
        const keyPairs: KeyPair[] = await this.keyService.findOne(
            keyCriteriaArr
        );
        // TODO review
        const keyPair = keyPairs[0];
        if (!keyPair.ak || !keyPair.sk || !keyPair.role) {
            this.logger.error(
                `不存在 AccesKey ${accessKey.substring(0, KEY_SHOW_LENGTH)}`
            );
            return false;
        }
        this.logger.debug(
            ` ${keyPair.role} ${accessKey.substring(
                0,
                KEY_SHOW_LENGTH
            )} 调用 api：${req.path} `
        );

        if (!(await this.checkNonceAndTimeStamp(req, keyPair.ak))) {
            this.logger.error(
                `请求过期或重复！accessKey: ${accessKey.substring(
                    0,
                    KEY_SHOW_LENGTH
                )}... ip:${req.realIp}`
            );
            return false;
        }

        // 验证取出的密钥对的权限
        if (!this.checkPermissionValid(roleRequired, keyPair.role)) {
            this.logger.error(
                `权限不足！accessKey: ${accessKey.substring(
                    0,
                    KEY_SHOW_LENGTH
                )}... ip:${req.realIp}`
            );
            return false;
        }
        this.logger.debug("密钥对权限校验通过");

        // 验证签名及头部
        if (!this.checkSignValid(req, keyPair.sk)) {
            this.logger.error(
                `签名异常！accessKey: ${accessKey.substring(
                    0,
                    KEY_SHOW_LENGTH
                )}... ip:${req.realIp}
                `
            );
            return false;
        }
        this.logger.debug("签名校验通过");

        this.logger.debug("校验通过");
        req.role = keyPair.role;
        return true;
    }

    async checkNonceAndTimeStamp(req: Request, ak: string): Promise<boolean> {
        const timeStamp = parseInt(
            getAttr(req.headers, PUBLIC_HEADERS_TYPE.timestamp) ?? ""
        );
        const systemTime = Date.now() / 1000;
        if (
            !timeStamp ||
            systemTime - timeStamp >
                this.configService.getConfig().auth.timeStampExpire ||
            systemTime - timeStamp < -1
        ) {
            this.logger.debug("请求过期");
            return false;
        }
        const nonce = getAttr(req.headers, PUBLIC_HEADERS_TYPE.nonce);
        if (!nonce || !(await this.keyService.checkNonce(ak, nonce))) {
            this.logger.debug("请求重复");
            return false;
        }
        return true;
    }

    checkPermissionValid(roleRequired: string[], hasRole: string): boolean {
        this.logger.debug(`Require Permission:${roleRequired}`);
        if (!roleRequired || roleRequired.length === 0) return true;
        if (hasRole == ROOT) return true;
        if (roleRequired.includes(hasRole)) return true;
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
    checkSignValid(req: Request, secretKey: string): boolean {
        const foundSign =
            getAttr(req.headers, PUBLIC_HEADERS_TYPE.signature) ?? "";

        if (!foundSign) {
            this.logger.error("未提供 signature!");
            return false;
        }

        const requiredSign = this.sign.generateSign({
            method: req.method,
            path: req.path,
            query: req.query,
            ak: getAttr(req.headers, PUBLIC_HEADERS_TYPE.accesskey) ?? "",
            sk: secretKey,
            nonce: getAttr(req.headers, PUBLIC_HEADERS_TYPE.nonce) ?? "",
            timestamp:
                getAttr(req.headers, PUBLIC_HEADERS_TYPE.timestamp) ?? "",
            data: req.body,
            content_type:
                getAttr(req.headers, PUBLIC_HEADERS_TYPE.content_type) ?? ""
        });

        this.logger.debug("Signature required: " + requiredSign);
        this.logger.debug("Signature found: " + foundSign);

        if (requiredSign === foundSign) {
            return true;
        }

        this.logger.error("签名校验失败！");
        return false;
    }
}

function encrypt(param: EncryptParam) {
    if (param.algorithm === "SHA256") {
        return crypto
            .createHash("sha256")
            .update(param.data)
            .digest("hex");
    } else if (param.algorithm === "HmacSHA256") {
        if (!param.key) {
            throw new Error("no key provided");
        }
        return crypto
            .createHmac("sha256", param.key)
            .update(param.data)
            .digest("hex");
    }
    return "";
}
