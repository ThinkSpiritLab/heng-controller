import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException
} from "@nestjs/common";
import * as crypto from "crypto";
import { ConfigService } from "src/config/config-module/config.service";
import { RootKeyPairConfig } from "src/config/key.config";
import { RedisService } from "src/redis/redis.service";
import {
    KEY_LENGTH_NOT_ROOT,
    FindAllKeysRecord,
    KeyPair,
    keyPoolsNames,
    KeyPoolsNamesArr,
    ToPoolName,
    ToRoleName,
    KEY_SHOW_LENGTH,
    RoleTypeDic,
    KeyResult,
    Root
} from "../auth.decl";
import { KeyCriteria, RoleCriteria } from "../dto/key.dto";
import { KeyPairDTO } from "../dto/key.dto";
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
        if (!key) return false;
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
    async generateKeyPair(roles: string[]): Promise<KeyPairDTO> {
        let { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
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
        //TODO 用root密钥对加密
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
    async generateAddKeyPair(
        allRoleCriteria: RoleCriteria[]
    ): Promise<KeyResult[]> {
        //modulusLength要达到一定长度，否则会报错密钥对太短
        const result: KeyResult[] = [];
        for (const each of allRoleCriteria) {
            try {
                const roles = each.roles;
                if (!roles || !roles.length) {
                    throw new Error("必须指定密钥对的角色！");
                }
                if (roles.includes(RoleTypeDic.root)) {
                    this.logger.error("无法添加root密钥对!");
                    throw new ForbiddenException("无法添加root密钥对!");
                }
                const keyPairDTO: KeyPairDTO = await this.generateKeyPair(
                    roles
                );
                const resultThis = await this.addKeyPair([keyPairDTO]);
                resultThis[0].sk = keyPairDTO.sk;
                result.push(resultThis[0]);
            } catch (error) {
                result.push({ message: error.message });
            }
        }
        return result;
    }
    /**
     * 根据ak注销密钥对或其权限
     * @param ak
     * @param roles 待注销的权限
     */
    async deleteKeyPair(allKeyCriteria: KeyCriteria[]): Promise<KeyResult[]> {
        const result: KeyResult[] = [];

        for (const keyCriteria of allKeyCriteria) {
            const ak = keyCriteria.ak;
            const roles = keyCriteria.roles;
            const affectedRoles = [];
            let num = 0;

            try {
                if (roles) {
                    if (roles.includes(RoleTypeDic.root)) {
                        const CANNOT_DEL_ROOT_KEY = "无法删除root密钥对!";
                        this.logger.error(CANNOT_DEL_ROOT_KEY);
                        result.push({
                            message: CANNOT_DEL_ROOT_KEY
                        });
                        throw new Error(CANNOT_DEL_ROOT_KEY);
                    }
                    for (const role of roles) {
                        this.logger.debug(`del ${role}`);
                        if (
                            await this.deleteKeyFieldValue(ToPoolName[role], ak)
                        )
                            affectedRoles.push(role), num++;
                    }
                    this.logger.debug(num);
                } else {
                    //不给roles删除所有角色
                    for (const poolName of KeyPoolsNamesArr) {
                        if (poolName == keyPoolsNames.root) continue;
                        if (await this.deleteKeyFieldValue(poolName, ak))
                            affectedRoles.push(ToRoleName[poolName]), num++;
                    }
                }
            } catch (error) {
                //有可能删不存在的权限或找不到密钥对
                this.logger.error(error.message);
                continue;
            }
            result.push({
                ak: ak,
                affectedRoles: affectedRoles,
                successNum: num
            });
        }
        return result;
    }
    /**
     * 返回所有的密钥对，一个值类型为KeyPair[]的字典
     */
    async findAllByRoles(
        roleCriteria: RoleCriteria,
        istest = false
    ): Promise<FindAllKeysRecord> {
        const ans: FindAllKeysRecord = {};
        if (istest) {
            ans["test"] = await this.getAllKeyFieldVals(keyPoolsNames["test"]);
            return ans;
        }
        const roles = roleCriteria.roles;
        let poolNames = KeyPoolsNamesArr;
        if (roles) poolNames = roles.map(role => ToPoolName[role]);
        for (let poolName of poolNames) {
            const ansEach = await this.getAllKeyFieldVals(poolName);
            ans[ToRoleName[poolName]] = ansEach;
        }

        return ans;
    }
    /**
     * 根据ak和roles查找包含roles中所有角色的密钥对
     *@param ak
     *@param roles?
     */
    async findOne(allkeyCriteria: KeyCriteria[]): Promise<KeyPair[]> {
        const result: KeyPair[] = [];
        for (const keyCriteria of allkeyCriteria) {
            const ak = keyCriteria.ak;
            let roles = keyCriteria.roles;
            let sk: string | null = null;
            const ansAllRoles: string[] = [];
            let ansSK: string | null = null;
            try {
                //先找一遍所有的集合，找到了就记下对应的角色
                for (const poolName of KeyPoolsNamesArr) {
                    sk = await this.getKeyFieldVal(poolName, ak);
                    if (sk == null) continue;
                    //之前找到了一个sk但这次又找到了一个不一样的sk
                    if (ansSK && ansSK != sk)
                        throw new InternalServerErrorException(
                            `ak${ak.substring(
                                0,
                                KEY_SHOW_LENGTH
                            )}对应的sk不唯一！已找到的sk：\n${sk}\n${ansSK}`
                        );
                    ansSK = sk;
                    ansAllRoles.push(ToRoleName[poolName]);
                }
                if (!ansAllRoles.length) {
                    throw new Error(
                        `密钥对${ak.substring(0, KEY_SHOW_LENGTH)}...不存在!`
                    );
                }
                //如果传入roles筛选条件,则密钥对含有的角色必须包含roles
                if (roles) {
                    roles = roles.map(role => {
                        role.toLowerCase();
                        if (!ansAllRoles.includes(role))
                            throw new Error(
                                `密钥对${ak.substring(
                                    0,
                                    KEY_SHOW_LENGTH
                                )}...无${role}角色或不存在!`
                            );
                        return role;
                    });
                }
            } catch (error) {
                this.logger.error(error.message);
                throw new NotFoundException({
                    message: error.message
                });
            }
            result.push({
                ak: ak,
                sk: ansSK,
                roles: ansAllRoles
            });
        }
        return result;
    }
    /**
     * 向redis中存入密钥对
     *@param KeyPair
     */
    async addKeyPair(
        allKeyPair: KeyPairDTO[],
        istest = false
    ): Promise<KeyResult[]> {
        const result: KeyResult[] = [];
        for (const keyPair of allKeyPair) {
            //可能是外部系统调的，所以controller中用DTO?此处校验已通过，所以不用DTO？
            let num = 0,
                affectedRoles: string[] = [];
            const ak = keyPair.ak,
                sk = keyPair.sk,
                roles = keyPair.roles;
            let message = "";
            //当前密钥对存在的角色和格式不正确的角色
            let existsRoles = [],
                incorrectRoles = [];

            for (const role of roles) {
                try {
                    if (role == Root) {
                        const CANNOT_ADD_ROOT_KEY = "无法添加root密钥对!";
                        message += CANNOT_ADD_ROOT_KEY + ";";
                        throw new Error(CANNOT_ADD_ROOT_KEY);
                    } else if (!ToPoolName[role]) {
                        incorrectRoles.push(role);
                        throw new Error(`不存在${role}角色`);
                    } else if (
                        await this.setKeyFieldVal(
                            istest ? keyPoolsNames["test"] : ToPoolName[role],
                            ak,
                            sk
                        )
                    ) {
                        num++, affectedRoles.push(RoleTypeDic[role]);
                    } else {
                        existsRoles.push(role);
                    }
                } catch (error) {
                    this.logger.error(error);
                }
            }

            if (existsRoles.length) message += `Exists Roles:${existsRoles};`;
            if (incorrectRoles.length)
                message += `Incorrect Roles:${incorrectRoles};`;
            result.push({
                ak: ak,
                successNum: num,
                affectedRoles: affectedRoles,
                message: message
            });
        }
        return result;
    }
}
