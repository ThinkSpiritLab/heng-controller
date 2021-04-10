import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException
} from "@nestjs/common";
import * as crypto from "crypto";
import { random } from "lodash";
import { ConfigService } from "src/config/config-module/config.service";
import { RootKeyPairConfig } from "src/config/key.config";
import { RedisService } from "src/redis/redis.service";
import {
    KEY_LENGTH_NOT_ROOT,
    FindAllKeysRecord,
    KeyPair,
    KEY_POOLS_NAMES_DIC,
    KEY_POOLS_NAMES_ARR,
    TO_POOL_NAME,
    TO_ROLE_NAME,
    KEY_SHOW_LENGTH,
    ROLE_TYPE_DIC,
    KeyResult,
    ROOT,
    TEST,
    CANNOT_ADD_ROOT_KEY,
    KEY_ROLE_NOT_EXIST,
    ROLE_TYPE_DIC_EXCEPT_ROOT,
    ROLES,
    ROLES_EXCEPT_ROOT
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
            KEY_POOLS_NAMES_DIC.root,
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
        return key.substring(100, 100 + KEY_LENGTH_NOT_ROOT);
    }
    async generateKeyPair(role: string): Promise<KeyPairDTO> {
        let { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
            namedCurve: "P-384",
            publicKeyEncoding: { type: "spki", format: "der" },
            privateKeyEncoding: { type: "pkcs8", format: "der" }
        });
        const publicKeyStr = this.processKey(publicKey.toString("hex"));
        const privateKeyStr = this.processKey(privateKey.toString("hex"));
        return {
            ak: publicKeyStr,
            sk: privateKeyStr,
            role: role
        };
    }
    /**
     * 生成某角色的密钥对并添加到redis中
     * @param role
     * */
    async generateAddKeyPair(
        allRoleCriteria: RoleCriteria[]
    ): Promise<KeyResult[]> {
        //modulusLength要达到一定长度，否则会报错密钥对太短
        const result: KeyResult[] = [];
        for (const each of allRoleCriteria) {
            try {
                const role = each.role;
                if (!role || !role.length) {
                    throw new Error(KEY_ROLE_NOT_EXIST);
                }
                if (role.toLowerCase() == ROLE_TYPE_DIC[ROOT]) {
                    this.logger.error(CANNOT_ADD_ROOT_KEY);
                    throw new ForbiddenException(CANNOT_ADD_ROOT_KEY);
                }
                const keyPairDTO: KeyPairDTO = await this.generateKeyPair(role);
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
            const roles = keyCriteria.role;
            const affectedRoles = [];
            let num = 0;

            try {
                if (roles) {
                    if (roles.includes(ROLE_TYPE_DIC.root)) {
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
                            await this.deleteKeyFieldValue(
                                TO_POOL_NAME[role],
                                ak
                            )
                        )
                            affectedRoles.push(role), num++;
                    }
                    this.logger.debug(num);
                } else {
                    //不给roles删除所有角色
                    for (const poolName of KEY_POOLS_NAMES_ARR) {
                        if (poolName == KEY_POOLS_NAMES_DIC.root) continue;
                        if (await this.deleteKeyFieldValue(poolName, ak))
                            affectedRoles.push(TO_ROLE_NAME[poolName]), num++;
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
        allRoleCriteria: RoleCriteria[],
        istest = false
    ): Promise<FindAllKeysRecord> {
        const ans: FindAllKeysRecord = {};
        // if (istest) {
        //     ans[TEST] = await this.getAllKeyFieldVals(
        //         KEY_POOLS_NAMES_DIC[TEST]
        //     );

        //     return ans;
        // }
        for (const roleCriteria of allRoleCriteria) {
            const role = roleCriteria.role;
            const poolName = TO_POOL_NAME[role];
            const ansEach = await this.getAllKeyFieldVals(poolName);
            ans[TO_ROLE_NAME[poolName]] = ansEach;
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
            let role = keyCriteria.role?.toLowerCase();
            let sk: string | null = null;
            let ansRole: string = "";
            let ansSK: string | null = null;
            try {
                //先找一遍所有的集合，找到了就记下对应的角色
                if (role) {
                    role = role.toLowerCase();
                    const poolName = TO_POOL_NAME[role];
                    sk = await this.getKeyFieldVal(poolName, ak);
                } else {
                    for (const poolName of KEY_POOLS_NAMES_ARR) {
                        sk = await this.getKeyFieldVal(poolName, ak);
                        if (sk) {
                            ansRole = TO_ROLE_NAME[poolName];

                            break;
                        }
                    }
                }

                if (sk == null) {
                    throw new Error(
                        `密钥对${ak.substring(0, KEY_SHOW_LENGTH)}...不存在!`
                    );
                }
                //如果条件有role
            } catch (error) {
                this.logger.error(error.message);
                throw new NotFoundException({
                    message: error.message
                });
            }
            ansSK = sk;

            result.push({
                ak: ak,
                sk: ansSK,
                role: ansRole
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
                role = keyPair.role.toLowerCase();
            let message = "";
            //当前密钥对存在的角色和格式不正确的角色
            let existsRoles = [],
                incorrectRoles = [];

            try {
                if (role == ROOT) {
                    message += CANNOT_ADD_ROOT_KEY + ";";
                    throw new Error(CANNOT_ADD_ROOT_KEY);
                } else if (!TO_POOL_NAME[role]) {
                    incorrectRoles.push(role);
                    throw new Error(`不存在${role}角色`);
                } else if (
                    await this.setKeyFieldVal(
                        istest
                            ? KEY_POOLS_NAMES_DIC["test"]
                            : TO_POOL_NAME[role],
                        ak,
                        sk
                    )
                ) {
                    num++, affectedRoles.push(ROLE_TYPE_DIC[role]);
                } else {
                    existsRoles.push(role);
                }
            } catch (error) {
                this.logger.error(error);
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
