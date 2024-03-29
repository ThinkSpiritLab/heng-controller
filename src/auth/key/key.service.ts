import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { ConfigService } from "../../config/config-module/config.service";
import { AuthConfig } from "../../config/auth.config";
import { RedisService } from "../../redis/redis.service";
import {
    KeyPairWithRoot,
    R_String_NONCE_PRE,
    R_Hash_KeyPool,
    ROLE,
    E_ROLE,
    KeyPair,
    Log,
    R_List_Visit_Log,
} from "../auth.decl";
import moment from "moment";
import { Request } from "express";

@Injectable()
export class KeyService {
    private readonly logger = new Logger("KeyService");
    private readonly authConfig: AuthConfig;
    private readonly rootKeyPair: KeyPairWithRoot;
    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.authConfig = this.configService.getConfig().auth;
        this.rootKeyPair = {
            ak: this.authConfig.rootAccessKey,
            sk: this.authConfig.rootSecretKey,
            role: E_ROLE.ROOT,
            remark: "root",
            createTime: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
        };
        this.logger.log("root 密钥对已读入");
    }

    async init(): Promise<void> {
        const akLen = this.rootKeyPair.ak.length;
        const skLen = this.rootKeyPair.sk.length;
        if (
            !(
                akLen >= this.authConfig.keyLengthRootMin &&
                akLen <= this.authConfig.keyLengthRootMax &&
                skLen >= this.authConfig.keyLengthRootMin &&
                skLen <= this.authConfig.keyLengthRootMax
            )
        ) {
            throw new Error("root key too long or too short");
        }
    }

    async getAllKeyPair(): Promise<KeyPair[]> {
        // String(ak) -> JsonString(keyPair)
        const ret = await this.redisService.client.hgetall(R_Hash_KeyPool);
        const keyPairs: KeyPair[] = [];
        for (const ak in ret) {
            keyPairs.push(JSON.parse(ret[ak]));
        }
        return keyPairs;
    }

    async deleteKeyPair(ak: string): Promise<void> {
        await this.redisService.client.hdel(R_Hash_KeyPool, ak);
    }

    private cutKey(key: string): string {
        const beginTake = 100;
        const takeLength = this.authConfig.keyLengthNotRoot;
        return key.substring(beginTake, beginTake + takeLength);
    }

    private genKeyPair(role: ROLE, remark: string): KeyPair {
        const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
            namedCurve: "P-384",
            publicKeyEncoding: { type: "spki", format: "der" },
            privateKeyEncoding: { type: "pkcs8", format: "der" },
        });
        const publicKeyStr = this.cutKey(publicKey.toString("hex"));
        const privateKeyStr = this.cutKey(privateKey.toString("hex"));
        return {
            ak: publicKeyStr,
            sk: privateKeyStr,
            role: role,
            remark,
            createTime: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
        };
    }

    /**
     * 生成某角色的密钥对并添加到 redis 中
     * success: ak, sk
     * error: message
     * */
    async genAddKeyPair(role: ROLE, remark: string): Promise<KeyPair> {
        const keyPair = this.genKeyPair(role, remark);
        await this.addKeyPair(keyPair);
        return keyPair;
    }

    async findMany({
        ak,
        sk,
        role,
    }: {
        ak?: string;
        sk?: string;
        role?: ROLE;
    }): Promise<KeyPair[]> {
        let result: KeyPair[] = await this.getAllKeyPair();
        if (ak !== undefined) {
            result = result.filter((keyPair) => {
                return keyPair.ak === ak;
            });
        }
        if (sk !== undefined) {
            result = result.filter((keyPair) => {
                return keyPair.sk === sk;
            });
        }
        if (role !== undefined) {
            result = result.filter((keyPair) => {
                return keyPair.role === role;
            });
        }
        return result;
    }

    async findOneByAkOrFail(ak: string): Promise<KeyPair> {
        const kpStr = await this.redisService.client.hget(R_Hash_KeyPool, ak);
        if (kpStr === null) {
            throw new Error("Key not found");
        }
        return JSON.parse(kpStr);
    }

    async guardFineOneByAkOrFail(ak: string): Promise<KeyPairWithRoot> {
        if (ak === this.rootKeyPair.ak) {
            return this.rootKeyPair;
        }
        return this.findOneByAkOrFail(ak);
    }

    /**
     * 向 redis 中存入密钥对
     * @param KeyPair
     */
    async addKeyPair(keyPair: KeyPair): Promise<void> {
        if (keyPair.ak === this.rootKeyPair.ak) {
            throw new BadRequestException();
        }
        if ((await this.findMany({ ak: keyPair.ak })).length) {
            throw new BadRequestException("key already exists");
        }
        await this.redisService.client.hset(
            R_Hash_KeyPool,
            keyPair.ak,
            JSON.stringify(keyPair)
        );
    }

    async checkNonce(ak: string, nonce: string): Promise<boolean> {
        const ret = await this.redisService.client
            .multi()
            .exists(R_String_NONCE_PRE + ak + ":" + nonce)
            .setex(
                R_String_NONCE_PRE + ak + ":" + nonce,
                this.authConfig.nonceExpireSec,
                "1"
            )
            .exec();
        return ret !== null && !ret[0][0] && !ret[1][0] && !ret[0][1];
    }

    async log(entry: string, req: Request): Promise<void> {
        const l: Log = {
            entry,
            createTime: moment().format("YYYY-MM-DDTHH:mm:ssZ"),
            payload: JSON.stringify({
                method: req.method,
                url: req.originalUrl,
                header: req.headers,
                realIp: req.realIp,
                role: req.role ?? "guest",
                body: req.body,
            }),
        };
        await this.redisService.client.lpush(
            R_List_Visit_Log,
            JSON.stringify(l)
        );
    }

    async getLog(start: number, stop: number): Promise<Log[]> {
        return (
            await this.redisService.client.lrange(R_List_Visit_Log, start, stop)
        ).map((s) => JSON.parse(s));
    }
}
