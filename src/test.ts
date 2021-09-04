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
const url = "http://127.0.0.1:8080/v1/judges";
const query = {};
const ak =
    "7bd63764b3157e3b3a80b4b3f75731d33ce80fe92d37e9d44839424fc2672443b8ac8b20b308d8be2e269b735617d5b32ef42ded5641aa222f820af6cdd6501b4210e046209";
const sk =
    "819e30819b0201010430b7d59bee3176c30740f7de99372c4588327e288e18e90f18118596817743f39d7f78e54a83450111558ae930dde444a9a16403620004277b31d33ce800b4b3f757fe9d63764b3";
const data = {
    dynamicFiles: [
        {
            type: "remote",
            name: "in",
            file: {
                type: "direct",
                content: "3 7"
            }
        },
        {
            type: "remote",
            name: "out",
            file: {
                type: "direct",
                content: "10"
            }
        }
    ],
    judge: {
        type: "normal",
        user: {
            source: {
                type: "direct",
                content:
                    "#include <iostream>\n int main() {int a,b;std::cin>>a>>b;std::cout<<a+b; return 0;}"
            },
            environment: {
                language: "cxx",
                system: "linux",
                arch: "x64",
                options: {}
            },
            limit: {
                runtime: {
                    memory: 1024000,
                    cpuTime: 1000,
                    output: 1024000
                },
                compiler: {
                    memory: 102400000,
                    cpuTime: 5000,
                    output: 102400000,
                    message: 102400000
                }
            }
        }
    },
    test: {
        cases: [{ input: "in", output: "out" }],
        policy: "all"
    },
    callbackUrls: {
        update: "http://localhost:8080/v1/judges/testurl",
        finish: "http://localhost:8080/v1/judges/testurl"
    }
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
        console.log(e);
    });
