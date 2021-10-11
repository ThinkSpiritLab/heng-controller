import {
    Body,
    Controller,
    ForbiddenException,
    Post,
    Req,
    UseGuards
} from "@nestjs/common";
import { Request } from "express";
import { E_ROLE, KeyPair, ROLE_LEVEL, ROLE_WITH_ROOT } from "../auth.decl";
import { RoleSignGuard } from "../auth.guard";
import { Roles } from "../decorators/roles.decoraters";
import { DeleteDto, FindDto, GenAddDto } from "./key.dto";
import { KeyService } from "./key.service";

@Controller("key")
@UseGuards(RoleSignGuard)
export class KeyController {
    // private logger: Logger = new Logger("KeyController");
    constructor(private readonly keyService: KeyService) {}

    @Roles(E_ROLE.ADMIN)
    @Post("genAdd")
    async genAddKeyPair(
        @Req() req: Request,
        @Body() body: GenAddDto
    ): Promise<KeyPair[]> {
        this.checkLevel(body.role, req.role);
        const ret: KeyPair[] = [];
        try {
            for (let i = 0; i < body.quantity; i++) {
                ret.push(await this.keyService.genAddKeyPair(body.role));
            }
        } catch (error) {}
        return ret;
    }

    @Roles(E_ROLE.ADMIN)
    @Post("del")
    async deleteKeyPair(
        @Req() req: Request,
        @Body() body: DeleteDto
    ): Promise<void> {
        const keyPair = await this.keyService.findOneOrFail(body.ak);
        this.checkLevel(keyPair.role, req.role);
        await this.keyService.deleteKeyPair(body.ak);
    }

    @Roles(E_ROLE.ADMIN)
    @Post("find")
    findAllByRoles(
        @Req() req: Request,
        @Body() body: FindDto
    ): Promise<KeyPair[]> {
        this.checkLevel(body.role ?? E_ROLE.ADMIN, req.role);
        return this.keyService.findMany(body);
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
