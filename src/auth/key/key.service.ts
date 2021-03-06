import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import {
    keyPoolsNames,
    KeyPair,
    KeyListsDic,
    keyPoolsNamesArr,
    keyLength,
    toPoolName,
    toRoleName
} from "../auth.decl";
import { generateKeyPairSync } from "crypto";
import { KeyPairDto } from "./dto/key.dto";
@Injectable()
export class KeyService {
    private readonly logger = new Logger("KeyService");
    constructor(private readonly redisService: RedisService) {}
    /**
     * 数据库操作
     */
    async setKeyFieldVal(
        key: string,
        field: string,
        val: string
    ): Promise<boolean> {
        return (await this.redisService.client.hset(key, field, val)) > 0;
    }
    async getKeyFieldVal(key: string, field: string) {
        return await this.redisService.client.hget(key, field);
    }
    async getAllKeyFieldVals(key: string) {
        return await this.redisService.client.hgetall(key);
    }
    /**
     * 生成某角色的密钥对不添加
     * @param role
     * */
    async generateAddKeyPair(role: string): Promise<KeyPair> {
        if (!(toPoolName[role] in keyPoolsNames)) {
            this.logger.error(`${Date.now}尝试生成非法角色的密钥对`);
            throw new Error(`没有角色${toPoolName[role]}!`);
        }
        //hset
        //FIXME:modulusLength多长？log存盘？
        const { publicKey, privateKey } = generateKeyPairSync("rsa", {
            modulusLength: keyLength,
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
        keyPair.roles?.push(role);
        this.addKeyPair(keyPair);
        return keyPair;
    }
    /**
     * 根据ak注销密钥对或其权限
     * @param ak
     * @param roles 待注销的权限
     */
    async deleteKeyPair(accessKey: string, roles?: string[]): Promise<void> {
        let exe = this.redisService.client.multi();
        if (roles) {
            for (let role of roles) {
                exe.hdel(toPoolName[role], accessKey);
            }
        } else {
            for (let poolName of keyPoolsNamesArr) {
                if (poolName == keyPoolsNames.root) continue;
                if (roles) exe.hdel(poolName, accessKey);
            }
        }
        try {
            exe.exec();
        } catch (error) {
            //有可能删不存在的权限或找不到密钥对
            this.logger.error(error.message);
        }
    }
    /**
     * 取所有的密钥对
     */
    async getAllKeyPairs(): Promise<KeyListsDic> {
        let ans: KeyListsDic = {};
        for (let poolName of keyPoolsNamesArr) {
            let ansEach = await this.getAllKeyFieldVals(poolName);
            ans[toRoleName[poolName as string]] = ansEach;
        }
        return ans;
    }
    /**
     * 根据ak和特定的role查找密钥对
     *
     */
    async getKeyPair(accessKey: string, role?: string): Promise<KeyPair> {
        let sk: string | null = null;
        let ansRoles: string[] = [];
        try {
            if (!role) {
                for (let poolName of keyPoolsNamesArr) {
                    sk = await this.getKeyFieldVal(poolName, accessKey);
                    if (!sk) continue;
                    role = toRoleName[poolName];
                    ansRoles.push(role);
                }
                if (!ansRoles.length) {
                    throw new Error(
                        `密钥对${accessKey.substring(0, 6)}...不存在!`
                    );
                }
            } else {
                role = role.toLowerCase();
                sk = await this.getKeyFieldVal(toPoolName[role], accessKey);
                if (!sk)
                    throw new Error(
                        `密钥对${accessKey.substring(
                            0,
                            6
                        )}...无${role}角色或不存在!`
                    );
            }
        } catch (error) {
            this.logger.error(error.message);
        }
        return { ak: sk ? accessKey : null, sk: sk, roles: ansRoles };
    }
    /**
     *
     */
    async addKeyPair(keyPair: KeyPair): Promise<number> {
        //可能是外部系统调的，所以用DTO?此处校验已通过
        let num = 0;
        for (let role of keyPair.roles as string[]) {
            if (
                await this.setKeyFieldVal(
                    toPoolName[role],
                    keyPair.ak as string,
                    keyPair.sk as string
                )
            )
                num++;
        }
        return num;
    }
}
