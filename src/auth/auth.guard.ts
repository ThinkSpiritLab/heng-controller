import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as crypto from "crypto";
import { Request } from "express";
import { Observable } from "rxjs";
import { ConfigService } from "src/config/config-module/config.service";
import { getAttr } from "src/public/util/request";
import {
    E_ROLE,
    KEY_SHOW_LENGTH,
    NO_AUTH_NO_SIGN_METADATA,
    REQUIRE_LOG,
    ROLE,
    ROLES_ARR,
    ROLES_METADATA as ROLE_METADATA,
    ROLE_WITH_ROOT,
} from "./auth.decl";
import { KeyService } from "./key/key.service";
import { Sign, EncryptParam, PUBLIC_HEADERS_TYPE } from "heng-sign-js";

const sign = new Sign(encrypt);

@Injectable()
export class RoleSignGuard implements CanActivate {
    private readonly logger = new Logger("RoleSignGuard");

    constructor(
        private reflector: Reflector,
        private readonly keyService: KeyService,
        private readonly configService: ConfigService
    ) {}

    canActivate(
        context: ExecutionContext
    ): boolean | Promise<boolean> | Observable<boolean> {
        const roleRequired: ROLE[] =
            this.reflector.get(ROLE_METADATA, context.getHandler()) ??
            ROLES_ARR;
        const isNoAuthNoSign: string | undefined = this.reflector.get(
            NO_AUTH_NO_SIGN_METADATA,
            context.getHandler()
        );
        if (isNoAuthNoSign) return true;
        const req: Request = context.switchToHttp().getRequest();
        const entry: string | undefined = this.reflector.get(
            REQUIRE_LOG,
            context.getHandler()
        );
        return this.validate(req, roleRequired).then(async (v) => {
            if (v && entry !== undefined) {
                await this.keyService.log(entry, req);
            }
            return v;
        });
    }

    async validate(req: Request, roleRequired: ROLE[]): Promise<boolean> {
        const accessKey =
            getAttr(req.headers, PUBLIC_HEADERS_TYPE.accesskey) ?? "";

        const keyPair = await this.keyService.guardFineOneByAkOrFail(accessKey);

        this.logger.log(
            `${keyPair.role} ${accessKey.substring(
                0,
                KEY_SHOW_LENGTH
            )} use api：${req.path} `
        );

        if (!(await this.checkNonceAndTimeStamp(req, keyPair.ak))) {
            this.logger.error(
                `Request expired or repeated. accessKey: ${accessKey.substring(
                    0,
                    KEY_SHOW_LENGTH
                )}... ip:${req.realIp}`
            );
            return false;
        }

        // 验证取出的密钥对的权限
        if (!this.checkPermissionValid(roleRequired, keyPair.role)) {
            this.logger.error(
                `Permission denied. accessKey: ${accessKey.substring(
                    0,
                    KEY_SHOW_LENGTH
                )}... ip:${req.realIp}`
            );
            return false;
        }
        this.logger.debug("Permission passed");

        // 验证签名及头部
        if (!this.checkSignValid(req, keyPair.ak, keyPair.sk)) {
            this.logger.error(
                `Signature check error. accessKey: ${accessKey.substring(
                    0,
                    KEY_SHOW_LENGTH
                )}... ip:${req.realIp}
                `
            );
            return false;
        }
        this.logger.debug("Signature check passed");

        this.logger.log("Guard passed");
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
            Math.abs(systemTime - timeStamp) >
                this.configService.getConfig().auth.timeStampExpireSec
        ) {
            this.logger.debug("Request expired");
            return false;
        }
        const nonce = getAttr(req.headers, PUBLIC_HEADERS_TYPE.nonce);
        if (!nonce || !(await this.keyService.checkNonce(ak, nonce))) {
            this.logger.debug("Request repeated");
            return false;
        }
        return true;
    }

    checkPermissionValid(
        roleRequired: ROLE[],
        hasRole: ROLE_WITH_ROOT
    ): boolean {
        this.logger.debug(`Required permission: ${roleRequired.toString()}`);
        if (hasRole == E_ROLE.ROOT) return true;
        if (roleRequired.includes(hasRole)) return true;
        return false;
    }

    checkSignValid(req: Request, ak: string, sk: string): boolean {
        const foundSign =
            getAttr(req.headers, PUBLIC_HEADERS_TYPE.signature) ?? "";

        if (!foundSign) {
            this.logger.error("Signature not provided");
            return false;
        }

        const nonce = getAttr(req.headers, PUBLIC_HEADERS_TYPE.nonce);
        const timestamp = getAttr(req.headers, PUBLIC_HEADERS_TYPE.timestamp);

        if (!(nonce && timestamp)) {
            return false;
        }

        const requiredSign = sign.generateSign({
            method: req.method,
            path: req.path,
            query: req.query,
            ak,
            sk,
            nonce,
            timestamp,
            data: req.body,
            content_type:
                getAttr(req.headers, PUBLIC_HEADERS_TYPE.content_type) ?? "",
        });

        this.logger.debug("Signature required: " + requiredSign);
        this.logger.debug("Signature found: " + foundSign);

        if (requiredSign === foundSign) {
            return true;
        }

        this.logger.error("Signature check failed");
        return false;
    }
}

function encrypt(param: EncryptParam) {
    if (param.algorithm === "SHA256") {
        return crypto.createHash("sha256").update(param.data).digest("hex");
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
