import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { KeyPool } from "../auth.decl";
import * as nacl from "tweetnacl";
@Injectable()
export class KeyService {
    constructor(private readonly redisService: RedisService) {

        let keyPair = nacl.sign.keyPair();
        let publicKey = keyPair.publicKey;
        let secretKey = Buffer.from(keyPair.secretKey);
        this.redisService.client.sadd(KeyPool.Admin, `${publicKey}-${secretKey}`),
            console.log(keyPair.publicKey);
    }
    //获取密钥对
    
}
