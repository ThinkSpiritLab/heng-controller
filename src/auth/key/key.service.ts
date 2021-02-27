import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { KeyPoolsName, KeyPair, KeyLists, KeyPoolsNameArr } from "../auth.decl";
import { RootKeyPairConfig } from "src/config/key.config";
import { ConfigService } from "src/config/config-module/config.service";
import * as crypto from "crypto";
import { generateKeyPairSync } from "crypto";
import { KeyPairDto } from "./dto/key.dto";
import { RoleType } from "../roles/roles.type";
@Injectable()
export class KeyService {
    private readonly logger = new Logger("KeyService");
    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        // this.rootKeyPairConfig = this.configService.getConfig().rootKeyPair;
        /*root key加入redis？
         */
        // console.log(
        //     this.rootKeyPairConfig.rootAccessKey,
        //     this.rootKeyPairConfig.rootSecretKey
        // );
    }
    //生成某角色的密钥对
    async generateKeyPair(role: string): Promise<KeyPair> {
        //hset
        const { publicKey, privateKey } = generateKeyPairSync("rsa", {
            modulusLength: 1024,
            publicKeyEncoding: {
                type: "spki",
                format: "pem"
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem"
            }
        });

        let keyPair: KeyPair = {
            ak: publicKey,
            sk: privateKey
        };
        if (!(role + "Keys" in KeyPoolsName)) {
            this.logger.error(`${Date.now}尝试添加非法角色的密钥对`);
            throw new Error(`没有角色${role + "Keys"}!`);
        }
        await this.redisService.client.hset(
            role + "Keys",
            keyPair.ak as any,
            keyPair.sk as any
        );
        return keyPair;
    }
    //注销密钥对

    async cancelKeyPair(ak: string): Promise<void> {
        await this.redisService.client
            .multi()
            .hdel(KeyPoolsName.Admin, ak)
            .hdel(KeyPoolsName.User, ak)
            .exec();
    }

    async getAllKeyPairs(): Promise<KeyLists> {
        await this.redisService.client.hkeys(KeyPoolsName.Admin);
        const adminKeys = await this.redisService.client.hgetall(
            KeyPoolsName.Admin
        );
        const userKeys = await this.redisService.client.hgetall(
            KeyPoolsName.User
        );

        return { adminKeys: adminKeys, userKeys: userKeys };
    }
    async getKeyPairByAk(ak: string, role?: string): Promise<KeyPair> {
        let sk: string | null = null;
        try {
            if (!role) {
                for (let pool of KeyPoolsNameArr) {
                    sk = await this.redisService.client.hget(pool, ak);
                    if (sk){role = pool.split("K")[0]; break;}
                }
            } else {
                sk = await this.redisService.client.hget(
                    role.toLowerCase() + "Keys",
                    ak
                );
            }
            if (!sk) throw new Error("密钥对不存在或已丢失!");
        } catch (error) {
            this.logger.error(error.message);
        }
        return { ak: sk ? ak : null, sk: sk, role: role };
    }

    async addKeyPair(keyPair: KeyPairDto): Promise<number> {
        //长度要求？？
        return await this.redisService.client.hset(
            keyPair.role + "Keys",
            keyPair.ak,
            keyPair.sk
        );
    }
}
