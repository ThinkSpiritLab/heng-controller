import { Injectable, Logger } from "@nestjs/common";
import { serialize } from "class-transformer";
import { generateKeyPairSync } from "crypto";
import { ConfigService } from "src/config/config-module/config.service";
import { RootKeyPairConfig } from "src/config/key.config";
import { RedisService } from "src/redis/redis.service";
import {
    KEY_LENGTH_NOT_ROOT,
    KeyListsDic,
    KeyPair,
    keyPoolsNames,
    keyPoolsNamesArr,
    toPoolName,
    toRoleName
} from "../auth.decl";
import { KeyPairDto } from "../dto/key.dto";
@Injectable()
export class KeyService {
    private readonly logger = new Logger("KeyService");
    private readonly rootKeyPairConfig: RootKeyPairConfig;
    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.rootKeyPairConfig = this.configService.getConfig().rootKeyPair;
        this.redisService.client.hset(
            keyPoolsNames.root,
            this.rootKeyPairConfig.rootAccessKey,
            this.rootKeyPairConfig.rootSecretKey
        );
        this.logger.log("Root密钥对已读入!");
    }
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
    async deleteKeyFieldValue(key: string, field: string) {
        return await this.redisService.client.hdel(key, field);
    }
    processKey(key: string) {
        return key
            .split("\n")
            .slice(1, 4)
            .join("")
            .replace("/", "A")
            .replace("+", "B")
            .substring(0, KEY_LENGTH_NOT_ROOT);
    }
    async generateKeyPair(roles: string[]): Promise<KeyPairDto> {
        let { publicKey, privateKey } = generateKeyPairSync("rsa", {
            modulusLength: KEY_LENGTH_NOT_ROOT * 16,
            publicKeyEncoding: {
                type: "spki",
                format: "pem"
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem"
            }
        });
        publicKey = this.processKey(publicKey);
        privateKey = this.processKey(privateKey);
        return {
            ak: publicKey,
            sk: privateKey,
            roles: roles
        };
    }
    /**
     * 生成某角色的密钥对并添加到redis中
     * @param roles
     * */
    async generateAddKeyPair(roles: string[]): Promise<KeyPair> {
        //modulusLength要达到一定长度，否则会报错密钥对太短
        const keyPair: KeyPairDto = await this.generateKeyPair(roles);
        this.addKeyPair(keyPair);
        return keyPair;
    }
    /**
     * 根据ak注销密钥对或其权限
     * @param accessKey
     * @param roles 待注销的权限
     */
    async deleteKeyPair(
        accessKey: string,
        roles?: string[]
    ): Promise<{ RemovedRoles: string[]; SccessNum: number }> {
        const removedRoles = [];
        let num = 0;
        try {
            if (roles) {
                for (const role of roles) {
                    this.logger.debug(`del ${role}`);
                    if (
                        await this.deleteKeyFieldValue(
                            toPoolName[role],
                            accessKey
                        )
                    )
                        removedRoles.push(role), num++;
                }
            } else {
                //不给roles删除所有角色
                for (const poolName of keyPoolsNamesArr) {
                    if (poolName == keyPoolsNames.root) continue;
                    if (await this.deleteKeyFieldValue(poolName, accessKey))
                        removedRoles.push(toRoleName[poolName]), num++;
                }
            }
        } catch (error) {
            //有可能删不存在的权限或找不到密钥对
            this.logger.error(error.message);
        }
        return { RemovedRoles: removedRoles, SccessNum: num };
    }
    /**
     * 返回所有的密钥对，一个值类型为KeyPair[]的字典
     */
    async getAllKeyPairs(istest: boolean = false): Promise<KeyListsDic> {
        const ans: KeyListsDic = {};
        if (istest) {
            ans["test"] = await this.getAllKeyFieldVals(keyPoolsNames["test"]);
            return ans;
        }
        for (const poolName of keyPoolsNamesArr) {
            const ansEach = await this.getAllKeyFieldVals(poolName);
            ans[toRoleName[poolName as string]] = ansEach;
        }
        return ans;
    }
    /**
     * 根据ak和特定的role查找密钥对
     *@param accessKey
     *@param role?
     */
    async getKeyPair(accessKey: string, role?: string): Promise<KeyPair> {
        let sk: string | null = null;
        const ansRoles: string[] = [];
        let ansSK: string | null = null;
        try {
            if (!role) {
                for (const poolName of keyPoolsNamesArr) {
                    sk = await this.getKeyFieldVal(poolName, accessKey);
                    if (!sk) continue;
                    role = toRoleName[poolName];
                    ansSK = sk;
                    ansRoles.push(role);
                }
                if (!ansRoles.length) {
                    throw new Error(
                        `密钥对${accessKey.substring(0, 6)}......不存在!`
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
        return { ak: ansSK ? accessKey : null, sk: ansSK, roles: ansRoles };
    }
    /**
     * 向redis中存入一个密钥对
     *@param KeyPair
     */
    async addKeyPair(
        keyPair: KeyPairDto,
        istest: boolean = false
    ): Promise<number> {
        //可能是外部系统调的，所以controller中用DTO?此处校验已通过，所以不用DTO？
        let num = 0;
        for (const role of keyPair.roles) {
            if (
                await this.setKeyFieldVal(
                    istest ? keyPoolsNames["test"] : toPoolName[role],
                    keyPair.ak,
                    keyPair.sk
                )
            )
                num++;
        }
        return num;
    }
}
