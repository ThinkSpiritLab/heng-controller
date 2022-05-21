import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Post,
    Req,
} from "@nestjs/common";
import { Request } from "express";
import { OptionalIntQuery } from "src/public/public.decorator";
import {
    E_ROLE,
    KeyPair,
    Log,
    ROLES_ARR,
    ROLE_LEVEL,
    ROLE_WITH_ROOT,
} from "../auth.decl";
import { RLog, Roles } from "../decorators/roles.decoraters";
import { DeleteDto, FindDto, GenAddDto } from "./key.dto";
import { KeyService } from "./key.service";

@Controller("key")
export class KeyController {
    // private logger: Logger = new Logger("KeyController");
    constructor(private readonly keyService: KeyService) {}

    @Roles(E_ROLE.ADMIN)
    @RLog("key/genAdd")
    @Post("genAdd")
    async genAddKeyPair(
        @Req() req: Request,
        @Body() body: GenAddDto
    ): Promise<KeyPair[]> {
        this.checkLevel(body.role, req.role);
        const ret: KeyPair[] = [];
        try {
            for (let i = 0; i < body.quantity; i++) {
                ret.push(
                    await this.keyService.genAddKeyPair(body.role, body.remark)
                );
            }
        } catch (error) {}
        return ret;
    }

    @Roles(E_ROLE.ADMIN)
    @RLog("key/del")
    @Post("del")
    async deleteKeyPair(
        @Req() req: Request,
        @Body() body: DeleteDto
    ): Promise<void> {
        const keyPair = await this.keyService.findOneByAkOrFail(body.ak);
        this.checkLevel(keyPair.role, req.role);
        await this.keyService.deleteKeyPair(body.ak);
    }

    @Roles(E_ROLE.ADMIN)
    @Post("find")
    async findAllByRoles(
        @Req() req: Request,
        @Body() body: FindDto
    ): Promise<KeyPair[]> {
        return (await this.keyService.findMany(body)).filter((keyPair) => {
            return req.role && ROLE_LEVEL[req.role] < ROLE_LEVEL[keyPair.role];
        });
    }

    @Get("allRoleType")
    allRoleType(): string[] {
        return ROLES_ARR;
    }

    @Roles()
    @Get("log")
    getLog(@OptionalIntQuery("page") page?: number): Promise<Log[]> {
        page = page ?? 1;
        return this.keyService.getLog(20 * (page - 1), 20 * page - 1);
    }

    private checkLevel(
        targetRole?: ROLE_WITH_ROOT,
        requestRole?: ROLE_WITH_ROOT
    ): void {
        if (targetRole === undefined) return;
        if (
            requestRole === undefined ||
            ROLE_LEVEL[targetRole] <= ROLE_LEVEL[requestRole]
        ) {
            throw new ForbiddenException();
        }
    }
}
