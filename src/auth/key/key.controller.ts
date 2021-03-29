import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Logger,
    Post,
    Query
} from "@nestjs/common";
import { NotContains } from "class-validator";
import { FindAllKeysRecord, KeyPair, KeyResult, Root } from "../auth.decl";
import { NoAuth, Roles } from "../decorators/roles.decoraters";
import {
    KeyCriteriaArrDTO,
    KeyPairArrDTO,
    KeyPairDTO,
    RoleCriteria,
    RoleCriteriaArrDTO
} from "../dto/key.dto";
import { KeyService } from "./key.service";

@Controller("key")
// @UseGuards(RoleSignGuard)
// @UseFilters(AuthFilter)
export class KeyController {
    private logger: Logger = new Logger("KeyController");
    constructor(private readonly keyService: KeyService) {}

    /**
     * 生成并添加一个角色为roles的密钥对到redis中
     */

    @Roles(Root)
    @Post("generateAdd")
    generateAddKeyPair(@Body() roleCriteriaArrDTO: RoleCriteriaArrDTO) {
        return this.keyService.generateAddKeyPair(roleCriteriaArrDTO.list);
    }
    /**
     * 从redis中删除ak的roles角色，roles为空则删除所有角色
     */

    @Roles(Root)
    @Delete("del")
    async deleteKeyPair(@Body() keyCriteriaArrDTO: KeyCriteriaArrDTO) {
        return await this.keyService.deleteKeyPair(keyCriteriaArrDTO.list);
    }
    /**
     * 获取给定角色的所有密钥对
     */
    @Roles(Root)
    @Get("findAllByRoles")
    async findAllByRoles(
        @Body() roleCriteria: RoleCriteria
    ): Promise<FindAllKeysRecord> {
        return this.keyService.findAllByRoles(roleCriteria);
    }
    /**
     *
     */

    @Roles(Root)
    @Get("findOne")
    async findOne(
        @Body() keyCriteriaArrDTO: KeyCriteriaArrDTO
    ): Promise<KeyPair[]> {
        return await this.keyService.findOne(keyCriteriaArrDTO.list);
    }
    /**
     * 添加一个密钥对
     */

    @Roles(Root)
    @Post("add")
    async addKeyPair(
        @Body() keyPairArrDTO: KeyPairArrDTO
    ): Promise<KeyResult[]> {
        return await this.keyService.addKeyPair(keyPairArrDTO.list);
    }

    //测试部分

    //测试生成密钥对,但不添加进redis
    @NoAuth()
    @Get("test/generate")
    async testGenerateKey(@Query("roles") roles: string[]) {
        this.logger.debug(`测试生成密钥对：${KeyPairDTO}`);
        return await this.keyService.generateKeyPair(roles);
    }

    @NoAuth()
    @Post("test/add")
    async testAddKey(
        @Body() keyPairArrDTO: KeyPairArrDTO
    ): Promise<KeyResult[]> {
        this.logger.debug(`测试添加密钥对：${JSON.stringify(KeyPairDTO)}`);
        return await this.keyService.addKeyPair(keyPairArrDTO.list, true);
    }
    @NoAuth()
    @Get("test/findAllByRoles")
    async testGetAll(
        @Body() roleCriteria: RoleCriteria
    ): Promise<FindAllKeysRecord> {
        this.logger.debug("测试获取所有密钥对");
        return await this.keyService.findAllByRoles(roleCriteria, true);
    }
}
