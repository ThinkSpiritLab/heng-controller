import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { KeyLists, KeyPair } from "../auth.decl";
import { Roles } from "../roles";
import { RoleType } from "../roles/roles.type";
import { KeyPairDto } from "./dto/key.dto";
import { KeyService } from "./key.service";

@Controller("key")
@Roles(RoleType.Root)
export class KeyController {
    constructor(private readonly keyService: KeyService) {}

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
