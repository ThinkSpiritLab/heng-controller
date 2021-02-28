import {
    Body,
    Controller,
    forwardRef,
    Get,
    Logger,
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
@UseGuards(RoleSignGuard)
export class KeyController {
    private readonly rootKeyPairConfig: RootKeyPairConfig;
    private logger: Logger = new Logger("KeyController");
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
        this.logger.log(`Root密钥对已读入!`);
    }

    //Get /generate
    @Roles("root")
    @Get("generate/:role")
    generateKeyPair(@Param("role") role: string) {
        return this.keyService.generateKeyPair(role);
    }
    @Roles("root")
    @Get("cancel/:ak")
    async cancelKeyPair(@Param("ak") ak: string) {
        await this.keyService.cancelKeyPair(ak);
    }
    /*获取所有key
     */
    @Roles("root")
    @Get("allkeys")
    async getAllKeyPairs(): Promise<KeyLists> {
        return this.keyService.getAllKeyPairs();
    }
    @Roles("root")
    @Get("getkey")
    async getKeyPairByAk(@Query("ak") ak: string): Promise<KeyPair> {
        return await this.keyService.getKeyPairByAk(ak);
    }

    @Roles("root")
    @Post("addkey")
    async addKeyPair(@Body() keyPair: KeyPairDto): Promise<number> {
        return await this.keyService.addKeyPair(keyPair);
    }
    //Post /del?accesKey= SecretKey=
}
