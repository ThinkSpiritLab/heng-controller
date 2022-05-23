import { Sign, Encrypt } from "heng-sign-js";
import axios from "axios";
import * as crypto from "crypto";

const encrypt: Encrypt = {
    SHA256(data: string): string {
        return crypto.createHash("sha256").update(data).digest("hex");
    },
    HmacSHA256(key: string, data: string): string {
        return crypto.createHmac("sha256", key).update(data).digest("hex");
    },
};

const ak =
    "1754b3bf6e5687046af11da6f12ba418c4340f2b6011b430c9da11b0e05b10191f895c5333009d59651209595b4b35065484e706959cac37d949e15bd5a8ab28";
const sk =
    "c16ef3ed7871dcbdf65b827117537399725d28e6f1ea8329ac0c0675ee8fa65b9311dfdcf92114546cd05adfe8c7eaf25ec382c18869875e23d81af48b097f8b";
const sign = new Sign(encrypt, ak, sk, true);

const instance = axios.create();
instance.interceptors.request.use(sign.sign);

const method = "post";
const url = "http://127.0.0.1:8080/c/v1/key/find";
const query = {};
const data = {};

instance
    .request({
        method,
        url,
        params: query,
        data,
    })
    .then((ret) => {
        console.log(ret.data);
    })
    .catch((e) => {
        console.log(e.response && e.response.data);
    });
