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
    UseFilters,
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
import { AuthFilter } from "../auth.filter";
import { RoleSignGuard } from "../auth.guard";
import { NoAuth, Roles } from "../decorators/roles.decoraters";
import {
    KeyCriteriaArrDTO,
    KeyPairArrDTO,
    KeyPairDTO,
    RoleCriteria,
    RoleCriteriaArrDTO,
    RootKeyPairDTO
} from "../dto/key.dto";
import { KeyService } from "./key.service";

@Controller("key")
@UseGuards(RoleSignGuard)
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
     * 对body提供的每个删除操作，依次从redis中删除符合给定条件的密钥对，其中role为空则直接删除该密钥对
     */

    @Roles(ROOT)
    @Delete("del")
    async deleteKeyPair(@Body() keyCriteriaArrDTO: KeyCriteriaArrDTO) {
        return await this.keyService.deleteKeyPair(keyCriteriaArrDTO.list);
    }
    /**
     * 从redis中获取roleCriteriaArrDTO.list中每个RoleCriteria.role对应的所有密钥对
     */
    @Roles(ROOT)
    @Get("findAllByRoles")
    async findAllByRoles(
        @Body() roleCriteriaArrDTO: RoleCriteriaArrDTO
    ): Promise<FindAllKeysRecord> {
        return this.keyService.findAllByRoles(roleCriteriaArrDTO.list);
    }
    /**
     * 对keyCriteriaArrDTO.list中各查询操作逐一进行查询
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

    @Roles(ROOT)
    @Post("modifyRootKey")
    async modifyRootKey(@Body() keyPairDTO: RootKeyPairDTO) {
        this.logger.log("更换Root密钥对");
        return this.keyService.modifyRootKey(keyPairDTO);
    }

    /**
     * --------------------------测试接口------------------------------
     */
    //测试生成密钥对,但不添加进redis
    @NoAuth()
    @Get("test/generate")
    async testGenerateKey(@Query("role") role: string) {
        this.logger.debug(`测试生成密钥对：${role}`);
        return await this.keyService.genKeyPair(role);
    }

    @NoAuth()
    @Post("test/add")
    async testAddKey(
        @Body() keyPairArrDTO?: { list: KeyPairDTO[] }
    ): Promise<KeyResult[]> {
        if (!keyPairArrDTO?.list || keyPairArrDTO?.list.length) {
            Object.assign(TEST_ADD_DATA, { list: [] });
            //直接赋值是浅拷贝！！！，不用any的原因是保留DTO校验功能
            for (let i = 1; i <= random(5) + 1; i++) {
                TEST_ADD_DATA.list.push(
                    await this.keyService.genKeyPair(
                        ROLES_EXCEPT_ROOT[random(ROLES_EXCEPT_ROOT.length - 1)]
                    )
                );
            }
        }
        keyPairArrDTO = TEST_ADD_DATA;
        this.logger.debug(`测试添加密钥对：${JSON.stringify(keyPairArrDTO)}`);
        return await this.keyService.addKeyPair(keyPairArrDTO.list, true);
    }
    @NoAuth()
    @Get("test/findAllByRoles")
    async testGetAll(
        @Body() allroleCriteria?: any
    ): Promise<FindAllKeysRecord> {
        if (!allroleCriteria.list)
            Object.assign(allroleCriteria, TEST_FIND_ALL_DATA);
        this.logger.debug(
            `测试获取${JSON.stringify(allroleCriteria.list)}的所有密钥对`
        );
        return await this.keyService.findAllByRoles(allroleCriteria.list, true);
    }
}
