import { Sign, EncryptParam } from "heng-sign-js";
import axios from "axios";
import * as crypto from "crypto";
function encrypt(param: EncryptParam) {
    if (param.algorithm === "SHA256") {
        return crypto
            .createHash("sha256")
            .update(param.data)
            .digest("hex");
    } else if (param.algorithm === "HmacSHA256") {
        if (!param.key) {
            throw new Error("no key provided");
        }
        return crypto
            .createHmac("sha256", param.key)
            .update(param.data)
            .digest("hex");
    }
    return "";
}
const sign = new Sign(encrypt);
const method = "post";
const url = "http://127.0.0.1:8080/v1/judger/token";
const query = {};
const ak =
    "7bd63764b3157e3b3a80b4b3f75731d33ce80fe92d37e9d44839424fc2672443b8ac8b20b308d8be2e269b735617d5b32ef42ded5641aa222f820af6cdd6501b4210e046209";
const sk =
    "819e30819b0201010430b7d59bee3176c30740f7de99372c4588327e288e18e90f18118596817743f39d7f78e54a83450111558ae930dde444a9a16403620004277b31d33ce800b4b3f757fe9d63764b3";
const data = { maxTaskCount: 1 };
axios.request(
    sign.sign({
        method,
        url,
        params: query,
        data,
        ak,
        sk
    })
).then((ret) => {
    console.log(ret.data);
}).catch((e) => {
    console.log(e);
});
