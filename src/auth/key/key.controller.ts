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
    UseFilters,
    UseGuards,
    UsePipes,
    ValidationPipe
} from "@nestjs/common";
import {
    KeyListsDic,
    KeyPair,
    roleType,
    RoleTypeArr,
    Root
} from "../auth.decl";
import { AuthFilter } from "../auth.filter";
import { RoleSignGuard } from "../auth.guard";
import { StringToArrPipe } from "../pipes/stringToArr.pipe";
// import { RolesSchema } from "../auth.schema";
import { NoAuth, Roles } from "../decorators/roles.decoraters";
import { KeyPairDTO } from "../dto/key.dto";
import { KeyService } from "./key.service";
//FIXME: 去掉as

//TODO:改接口为body
@Controller("key")
@UseGuards(RoleSignGuard)
@UseFilters(AuthFilter)
// @UsePipes(new ValidationPipe())
export class KeyController {
    private logger: Logger = new Logger("KeyController");
    constructor(private readonly keyService: KeyService) {}

    /**
     * 生成并添加一个角色为roles的密钥对到redis中
     *
     */
    @Roles(Root)
    @Post("generate")
    generateAddKeyPair(
        @Query("roles", new StringToArrPipe(RoleTypeArr, false)) roles: string[]
    ) {
        if (roles.includes(roleType.root)) {
            this.logger.error("无法添加root密钥对!");
            throw new ForbiddenException("无法添加root密钥对!");
        }
        return this.keyService.generateAddKeyPair(roles);
    }
    /**
     * 从redis中删除ak的roles角色，roles为空则删除所有角色
     */
    @Roles(Root)
    @Delete("del")
    async deleteKeyPair(
        @Query("ak") ak: string,
        @Query("roles", new StringToArrPipe(RoleTypeArr)) roles?: string[]
    ) {
        if (roles) {
            if (roles.includes(roleType.root)) {
                this.logger.error("无法删除root密钥对!");
                throw new ForbiddenException("无法删除root密钥对!");
            }
        }
        const {
            RemovedRoles: removedRoles,
            SccessNum: sucessNum
        } = await this.keyService.deleteKeyPair(
            ak,
            roles ? (roles as string[]) : undefined
        );
        if (!sucessNum) return "删除失败或密钥对已删除!";
        if (roles) {
            return `ak:${ak}删除${
                removedRoles.length ? removedRoles + "权限成功!" : "0个权限"
            }`;
        } else {
            return `ak:${ak}删除${removedRoles}权限成功!`;
        }
    }
    /**
     * 获取所有角色的密钥对
     */
    @Roles(Root)
    @Get("getall")
    async getAllKeyPairs(): Promise<KeyListsDic> {
        return this.keyService.getAllKeyPairs();
    }
    /**
     * 根据AccessKeyAK和role查询密钥对
     */
    @Roles(Root)
    @Get("get")
    async getKeyPair(
        @Query("ak") ak: string,
        @Query("roles", new StringToArrPipe(RoleTypeArr)) roles?: string[]
    ): Promise<KeyPair> {
        return await this.keyService.getKeyPair(ak, roles);
    }
    /**
     * 添加一个密钥对
     */
    @Roles(Root)
    @Post("add")
    async addKeyPair(@Body() keyPairDTO: KeyPairDTO): Promise<number> {
        return await this.keyService.addKeyPair(keyPairDTO);
    }

    //测试部分

    //测试生成密钥对,但不添加进redis
    @NoAuth()
    @Get("test/generate")
    async testGenerateKey(
        @Query("roles", new StringToArrPipe(RoleTypeArr)) roles: string[]
    ) {
        this.logger.debug(`测试生成密钥对：${KeyPairDTO}`);
        // roles = (roles as string).split(",");
        return await this.keyService.generateKeyPair(roles);
    }

    @NoAuth()
    @Post("test/add")
    async testAddKey(@Body() KeyPairDTO: KeyPairDTO): Promise<number> {
        this.logger.debug(`测试添加密钥对：${JSON.stringify(KeyPairDTO)}`);
        return await this.keyService.addKeyPair(KeyPairDTO, true);
    }
    @NoAuth()
    @Get("test/getall")
    async testGetAll() {
        this.logger.debug("测试获取所有密钥对");
        return await this.keyService.getAllKeyPairs(true);
    }
}
