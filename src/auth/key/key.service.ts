import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException
} from "@nestjs/common";
import * as crypto from "crypto";
import { random } from "lodash";
import { ConfigService } from "src/config/config-module/config.service";
import { AuthConfig } from "src/config/auth.config";
import { RedisService } from "src/redis/redis.service";
import * as fs from "fs";
import {
    KEY_LENGTH_NOT_ROOT,
    KEY_LENGTH_ROOT_MIN,
    FindAllKeysRecord,
    KeyPair,
    KEY_POOLS_NAMES_DIC,
    KEY_POOLS_NAMES_ARR,
    TO_POOL_NAME,
    TO_ROLE_NAME,
    KEY_SHOW_LENGTH,
    KeyResult,
    ROOT,
    TEST,
    CANNOT_ADD_ROOT_KEY,
    KEY_ROLE_NOT_EXIST,
    KEY_LENGTH_ROOT_MAX,
    R_NONCE_PRE
} from "../auth.decl";
import { KeyCriteria, RoleCriteria } from "../dto/key.dto";
import { KeyPairDTO } from "../dto/key.dto";
@Injectable()
export class KeyService {
    private readonly logger = new Logger("KeyService");
    private readonly authConfig: AuthConfig;
    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.authConfig = this.configService.getConfig().auth;
    }

    async init(): Promise<void> {
        await this.redisService.client.hset(
            KEY_POOLS_NAMES_DIC.root,
            this.authConfig.rootAccessKey,
            this.authConfig.rootSecretKey
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

    getKeyFieldVal(key: string, field: string): Promise<string | null> {
        return this.redisService.client.hget(key, field);
    }

    getAllKeyFieldVals(key: string): Promise<Record<string, string>> {
        return this.redisService.client.hgetall(key);
    }

    deleteKeyFieldValue(key: string, field: string): Promise<number> {
        return this.redisService.client.hdel(key, field);
    }

    cutKey(key: string, isROOT = false): string {
        const beginTake = isROOT ? 50 : 100;
        const takeLength = isROOT
            ? KEY_LENGTH_ROOT_MIN +
              random(KEY_LENGTH_ROOT_MAX - KEY_LENGTH_ROOT_MIN)
            : KEY_LENGTH_NOT_ROOT;
        return key.substring(beginTake, beginTake + takeLength);
    }

    async genKeyPair(role: string): Promise<KeyPairDTO> {
        const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
            namedCurve: "P-384",
            publicKeyEncoding: { type: "spki", format: "der" },
            privateKeyEncoding: { type: "pkcs8", format: "der" }
        });
        const publicKeyStr = this.cutKey(
            publicKey.toString("hex"),
            role == ROOT
        );
        const privateKeyStr = this.cutKey(
            privateKey.toString("hex"),
            role == ROOT
        );
        return {
            ak: publicKeyStr,
            sk: privateKeyStr,
            role: role
        };
    }
    /**
     * 生成某角色的密钥对并添加到redis中
     * @param allRoleCriteria
     * */
    async generateAddKeyPair(
        allRoleCriteria: RoleCriteria[]
    ): Promise<KeyResult[]> {
        //modulusLength要达到一定长度，否则会报错密钥对太短
        const result: KeyResult[] = [];
        for (const each of allRoleCriteria) {
            try {
                const roleEach = each.role;
                if (!roleEach || !roleEach.length) {
                    throw new Error(KEY_ROLE_NOT_EXIST);
                }
                if (roleEach.toLowerCase() == ROOT) {
                    this.logger.error(CANNOT_ADD_ROOT_KEY);
                    throw new ForbiddenException(CANNOT_ADD_ROOT_KEY);
                }
                const keyPairDTO: KeyPairDTO = await this.genKeyPair(roleEach);
                const resultThis = await this.addKeyPair([keyPairDTO]);
                resultThis[0].sk = keyPairDTO.sk;
                result.push(resultThis[0]);
            } catch (error) {
                result.push({ message: String(error) });
            }
        }
        return result;
    }
    /**
     * 根据ak注销密钥对或其权限
     * @param allKeyCriteria
     */
    async deleteKeyPair(allKeyCriteria: KeyCriteria[]): Promise<KeyResult[]> {
        const result: KeyResult[] = [];

        for (const keyCriteria of allKeyCriteria) {
            const ak = keyCriteria.ak;
            const role = keyCriteria.role;
            let affectedRole = "";
            let num = 0;

            try {
                if (role) {
                    if (role == ROOT) {
                        const CANNOT_DEL_ROOT_KEY = "不可删除root密钥对!";
                        this.logger.error(CANNOT_DEL_ROOT_KEY);
                        result.push({
                            message: CANNOT_DEL_ROOT_KEY
                        });
                        throw new Error(CANNOT_DEL_ROOT_KEY);
                    }

                    this.logger.debug(`del ${role}`);
                    if (await this.deleteKeyFieldValue(TO_POOL_NAME[role], ak))
                        (affectedRole = role), num++;

                    this.logger.debug(num);
                } else {
                    //未提供role的情况
                    for (const poolName of KEY_POOLS_NAMES_ARR) {
                        if (poolName == KEY_POOLS_NAMES_DIC.root) continue;
                        if (await this.deleteKeyFieldValue(poolName, ak))
                            (affectedRole = TO_ROLE_NAME[poolName]), num++;
                    }
                }
            } catch (error) {
                //有可能删不存在的权限或找不到密钥对
                this.logger.error(error);
                continue;
            }
            result.push({
                ak: ak,
                affectedRole: affectedRole,
                success: num
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
        if (istest) {
            ans[TEST] = await this.getAllKeyFieldVals(
                KEY_POOLS_NAMES_DIC[TEST]
            );

            return ans;
        }
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
            let existsRole = "";
            let existsSk = "";
            try {
                //找一遍所有的集合找出所有的密钥对
                for (const poolName of KEY_POOLS_NAMES_ARR) {
                    sk = await this.getKeyFieldVal(poolName, ak);
                    if (sk) {
                        if (existsSk != "")
                            throw new Error(
                                `密钥对${ak.substring(
                                    0,
                                    KEY_SHOW_LENGTH
                                )}...存在多个角色,或ak对应的sk不唯一!`
                            );
                        existsSk = sk;
                        existsRole = TO_ROLE_NAME[poolName];
                    }
                }
                if (existsSk == null || !existsSk.length) {
                    throw new Error(
                        `密钥对${ak.substring(0, KEY_SHOW_LENGTH)}...不存在!`
                    );
                }
                if (role) {
                    //条件给了role则判断是否和查询到的角色一致
                    role = role.toLowerCase();
                    if (role != existsRole)
                        throw new Error(
                            `密钥对${ak.substring(
                                0,
                                KEY_SHOW_LENGTH
                            )}...角色为${existsRole},非${role}!`
                        );
                }
            } catch (error) {
                this.logger.error(error);
                throw new NotFoundException({
                    message: error
                });
            }
            result.push({
                ak: ak,
                sk: existsSk,
                role: existsRole
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
            // 此处校验已通过，所以不用DTO
            let num = 0,
                affectedRole = "";
            const ak = keyPair.ak,
                sk = keyPair.sk,
                role = keyPair.role.toLowerCase();

            let message = "";
            // 当前密钥对存在的角色和格式不正确的角色
            const existsRoles = [],
                incorrectRoles = [];

            try {
                if (role == ROOT) {
                    message += CANNOT_ADD_ROOT_KEY + ";";
                    throw new Error(CANNOT_ADD_ROOT_KEY);
                } else if (!TO_POOL_NAME[role]) {
                    incorrectRoles.push(role);
                    throw new Error(`${role}角色名称不正确`);
                }
                for (const poolName of KEY_POOLS_NAMES_ARR) {
                    const roleName = TO_ROLE_NAME[poolName];
                    const skResult = await this.getKeyFieldVal(poolName, ak);
                    if (skResult) {
                        if (skResult != sk) {
                            message += "已存在另一ak相等，但sk不相等的密钥对!";
                            existsRoles.push(roleName);
                        } else {
                            message += `该密钥对已存在,角色为${roleName}!`;
                            existsRoles.push(roleName);
                        }
                        throw new Error(message);
                    }
                }
                if (
                    await this.setKeyFieldVal(
                        istest
                            ? KEY_POOLS_NAMES_DIC["test"]
                            : TO_POOL_NAME[role],
                        ak,
                        sk
                    )
                ) {
                    num++, (affectedRole = role);
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
                success: num,
                affectedRole: affectedRole,
                message: message
            });
        }
        return result;
    }

    modifyRootKey(keyPair: KeyPairDTO): Promise<boolean> {
        this.redisService.client.del(TO_POOL_NAME[ROOT]);
        fs.writeFileSync("config/newRootKeys.json", JSON.stringify(keyPair));
        return this.setKeyFieldVal(TO_POOL_NAME[ROOT], keyPair.ak, keyPair.sk);
    }

    async checkNonce(ak: string, nonce: string): Promise<boolean> {
        const ret = await this.redisService.client
            .multi()
            .exists(R_NONCE_PRE + ak + ":" + nonce)
            .setex(R_NONCE_PRE + ak + ":" + nonce, 5, "1")
            .exec();
        return !ret[0][0] && !ret[1][0] && !ret[0][1];
    }
}
