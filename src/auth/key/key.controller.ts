import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Logger,
    Post,
    Query,
    UseGuards
} from "@nestjs/common";
import { NotContains } from "class-validator";
import { random } from "lodash";
import {
    CANNOT_ADD_ROOT_KEY,
    FindAllKeysRecord,
    KeyPair,
    KeyResult,
    ROLES_EXCEPT_ROOT,
    ROOT,
    TEST_ADD_DATA,
    TEST_FIND_ALL_DATA
} from "../auth.decl";
import { RoleSignGuard } from "../auth.guard";
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
        @Body() roleCriteriaArrDTO: RoleCriteriaArrDTO
    ): Promise<FindAllKeysRecord> {
        return this.keyService.findAllByRoles(roleCriteriaArrDTO.list);
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
    async testGenerateKey(@Query("role") role: string) {
        this.logger.debug(`测试生成密钥对：${role}`);
        if (role == ROOT) {
            throw new ForbiddenException(CANNOT_ADD_ROOT_KEY);
        } else if (!ROLES_EXCEPT_ROOT.includes(role)) {
            throw new BadRequestException();
        }
        return await this.keyService.generateKeyPair(role);
    }

    @NoAuth()
    @Post("test/add")
    async testAddKey(
        @Body() keyPairArrDTO?: { list: KeyPairDTO[] }
    ): Promise<KeyResult[]> {
        this.logger.debug(`测试添加密钥对：${JSON.stringify(KeyPairDTO)}`);
        if (!keyPairArrDTO?.list) {
            keyPairArrDTO = TEST_ADD_DATA;
            Object.assign(keyPairArrDTO.list, [
                await this.keyService.generateKeyPair(
                    ROLES_EXCEPT_ROOT[random(ROLES_EXCEPT_ROOT.length - 1)]
                )
            ]);
        }
        console.log(keyPairArrDTO.list);
        return await this.keyService.addKeyPair(keyPairArrDTO.list, true);
    }
    @NoAuth()
    @Get("test/findAllByRoles")
    async testGetAll(
        @Body() allroleCriteria?: any
    ): Promise<FindAllKeysRecord> {
        this.logger.debug("测试获取所有密钥对");
        if (!allroleCriteria.list)
            Object.assign(allroleCriteria, TEST_FIND_ALL_DATA);
        this.logger.debug(allroleCriteria);
        return await this.keyService.findAllByRoles(allroleCriteria.list, true);
    }
}
