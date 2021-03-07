import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Logger,
    Param,
    Post,
    Query,
    UseGuards,
    UsePipes
} from "@nestjs/common";
import { ConfigService } from "src/config/config-module/config.service";
import { RootKeyPairConfig } from "src/config/key.config";
import { RedisService } from "src/redis/redis.service";
import { KeyListsDic, KeyPair, keyPoolsNames, roleType } from "../auth.decl";
import { RoleSignGuard } from "../auth.guard";
import { AuthPipe } from "../auth.pipe";
import { Roles } from "../decorators/roles.decoraters";
import { KeyPairDto } from "./dto/key.dto";
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

    //Get /generate
    @Roles("root")
    @Post("generate")
    generateAddKeyPair(@Query("roles") roles: string|string[]) {
        roles=(roles as string).split(",")
        if (roleType.root in roles) {
            this.logger.error("无法添加root密钥对!");
            throw new ForbiddenException("无法添加root密钥对!");
        }
        return this.keyService.generateAddKeyPair(roles);
    }
    @Roles("root")
    @Delete("del")
    async deleteKeyPair(
        @Query("ak") ak: string,
        @Query("roles") roles?: string | string[]
    ) {
        if (roles) roles = (roles as string).split(",");
        await this.keyService.deleteKeyPair(ak, roles?(roles as string[]):undefined);
    }
    @Roles("root")
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
