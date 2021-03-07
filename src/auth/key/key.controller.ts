import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    Logger,
    Param,
    Post,
    Query,
    UseFilters,
    UseGuards,
    UsePipes
} from "@nestjs/common";
import { IsNotEmpty } from "class-validator";
import { Http2ServerResponse } from "http2";
import { ConfigService } from "src/config/config-module/config.service";
import { RootKeyPairConfig } from "src/config/key.config";
import { RedisService } from "src/redis/redis.service";
import {
    KeyListsDic,
    KeyPair,
    keyPoolsNames,
    roleType,
    RoleTypeArr
} from "../auth.decl";
import { AuthFilter } from "../auth.filter";
import { RoleSignGuard } from "../auth.guard";
import { AuthPipe } from "../auth.pipe";
import { Roles } from "../decorators/roles.decoraters";
import { KeyPairDto } from "../dto/key.dto";
import { KeyService } from "./key.service";

@Controller("key")
@UseGuards(RoleSignGuard)
export class KeyController {
    private readonly rootKeyPairConfig: RootKeyPairConfig;
    private logger: Logger = new Logger("KeyController");
    constructor(
        private readonly keyService: KeyService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        //Q:初始化到底放在哪？
        this.rootKeyPairConfig = this.configService.getConfig().rootKeyPair;
        this.redisService.client.hset(
            keyPoolsNames.root,
            this.rootKeyPairConfig.rootAccessKey,
            this.rootKeyPairConfig.rootSecretKey
        );
        // console.log(
        //     this.rootKeyPairConfig.rootAccessKey,
        //     this.rootKeyPairConfig.rootSecretKey
        // );
        this.logger.log(`Root密钥对已读入!`);
    }

    /**
     * POST /generate
     * */
    // @Roles("root")
    @Post("generate")
    @UseFilters(AuthFilter)
    @UsePipes(new AuthPipe(RoleTypeArr))
    generateAddKeyPair(@Query("roles") roles: string | string[]) {
        roles = (roles as string).split(",");
        if (roles.includes(roleType.root)) {
            this.logger.error("无法添加root密钥对!");
            throw new ForbiddenException("无法添加root密钥对!");
        }
        return this.keyService.generateAddKeyPair(roles);
    }
    // @Roles("root")
    @Delete("del")
    @UseFilters(AuthFilter)
    @UsePipes(new AuthPipe())
    async deleteKeyPair(
        @Query("ak") ak: string,
        @Query("roles") roles?: string | string[]
    ) {
        if (roles) {
            roles = (roles as string).split(",");
            if (roles.includes(roleType.root)) {
                this.logger.error("无法删除root密钥对!");
                throw new ForbiddenException("无法删除root密钥对!");
            }
        }
        let delRes = await this.keyService.deleteKeyPair(
            ak,
            roles ? (roles as string[]) : undefined
        );
        let deledRoles: string[] | null = [];
        delRes
            .toString()
            .split(",")
            .filter(r => {
                return r == "0" || r == "1";
            })
            .forEach((r, i) => {
                if (r == "1")
                    (this.logger.debug(delRes[i]), deledRoles as string[]).push(
                        (roles as string[])[i]
                    );
            });
        //FIXME:事务返回的类型未知
        if (roles) {
            return `ak:${ak}删除${
                deledRoles.length ? deledRoles + "权限成功!" : "0个权限"
            }`;
        } else {
            return `ak:${ak}删除${deledRoles}权限成功!`;
        }
    }
    /*获取所有key
     */
    @Roles("root")
    @Get("getall")
    async getAllKeyPairs(): Promise<KeyListsDic> {
        return this.keyService.getAllKeyPairs();
    }
    @Roles("root")
    @Get("get")
    async getKeyPairByAK(
        @Query("ak") ak: string,
        @Query("role") role?: string
    ): Promise<KeyPair> {
        return await this.keyService.getKeyPair(ak, role);
    }

    @Roles("root")
    @UsePipes(new AuthPipe())
    @Post("add")
    async addKeyPair(@Body() keyPairDto: KeyPairDto): Promise<number> {
        return await this.keyService.addKeyPair(keyPairDto);
    }
}
