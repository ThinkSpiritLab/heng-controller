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
const url = "http://127.0.0.1:8080/v1/key/find";
const query = {};
const ak = "412e71316115915832e002814a8981be1152cfdefa33469becc4a49d16843462";
const sk = "a1cc7bb563cdca7ddf87af9bff68b90b73277d05fbe56d4ef58eac95cbdd7179";
const data = {
};

axios
    .request(
        sign.sign({
            method,
            url,
            params: query,
            data,
            ak,
            sk
        })
    )
    .then(ret => {
        console.log(ret.data);
    })
    .catch(e => {
        console.log(e.response && e.response.data);
    });
