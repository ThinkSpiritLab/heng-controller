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
import { FindAllKeysRecord, KeyPair, KeyResult, ROOT } from "../auth.decl";
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
     * 为每个条件添加一个具有其属性roles[]中的角色的密钥对到redis中
     */

    @Roles(ROOT)
    @Post("generateAdd")
    generateAddKeyPair(@Body() roleCriteriaArrDTO: RoleCriteriaArrDTO) {
        return this.keyService.generateAddKeyPair(roleCriteriaArrDTO.list);
    }
    /**
     * 对每个删除操作，从redis中批量删除给定条件的密钥对或其部分角色，roles为空则删除该密钥对
     */

    @Roles(ROOT)
    @Delete("del")
    async deleteKeyPair(@Body() keyCriteriaArrDTO: KeyCriteriaArrDTO) {
        return await this.keyService.deleteKeyPair(keyCriteriaArrDTO.list);
    }
    /**
     * 获取roleCriteria.roles[]中角色的所有密钥对
     */
    @Roles(ROOT)
    @Get("findAllByRoles")
    async findAllByRoles(
        @Body() roleCriteria: RoleCriteria
    ): Promise<FindAllKeysRecord> {
        return this.keyService.findAllByRoles(roleCriteria);
    }
    /**
     * 对每个查询操作
     */

    @Roles(ROOT)
    @Get("findOne")
    async findOne(
        @Body() keyCriteriaArrDTO: KeyCriteriaArrDTO
    ): Promise<KeyPair[]> {
        return await this.keyService.findOne(keyCriteriaArrDTO.list);
    }
    /**
     * 对每个添加操作，添加一个密钥对到对应角色的密钥对池
     */

    @Roles(ROOT)
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
