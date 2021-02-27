import {
    Body,
    Controller,
    forwardRef,
    Get,
    Param,
    Post,
    Query,
    UseGuards
} from "@nestjs/common";
import { ConfigService } from "src/config/config-module/config.service";
import { RedisService } from "src/redis/redis.service";
import { RootKeyPairConfig } from "src/config/key.config";
import { KeyLists, KeyPair, KeyPoolsName } from "../auth.decl";
import { RoleSignGuard } from "../auth.guard";
import { Roles } from "../roles";
import { RoleType } from "../roles/roles.type";
import { KeyPairDto } from "./dto/key.dto";
import { KeyService } from "./key.service";

@Controller("key")
export class KeyController {
    private readonly rootKeyPairConfig: RootKeyPairConfig;
    constructor(
        private readonly keyService: KeyService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.rootKeyPairConfig = this.configService.getConfig().rootKeyPair;
        this.redisService.client.hset(
            KeyPoolsName.Root,
            this.rootKeyPairConfig.rootAccessKey,
            this.rootKeyPairConfig.rootSecretKey
        );
        // console.log(
        //     this.rootKeyPairConfig.rootAccessKey,
        //     this.rootKeyPairConfig.rootSecretKey
        // );
        console.log(`Root密钥对已读入!`);
    }

    //Get /generate
    @Get("generate/:role")
    generateKeyPair(@Param("role") role: string) {
        return this.keyService.generateKeyPair(role);
    }
    @Get("cancel/:ak")
    async cancelKeyPair(@Param("ak") ak: string) {
        await this.keyService.cancelKeyPair(ak);
    }
    /*获取所有key
     */
    @Roles("root")
    @UseGuards(RoleSignGuard)
    @Get("allkeys")
    async getAllKeyPairs(): Promise<KeyLists> {
        return this.keyService.getAllKeyPairs();
    }
    @Get("getkey")
    async getKeyPairByAk(@Query("ak") ak: string): Promise<KeyPair> {
        return await this.keyService.getKeyPairByAk(ak);
    }
    //
    @Post("addkey")
    async addKeyPair(@Body() keyPair: KeyPairDto): Promise<number> {
        return await this.keyService.addKeyPair(keyPair);
    }
    //Post /del?accesKey= SecretKey=
}
