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

const usrCode = `
#include <bits/stdc++.h>
using namespace std;
#define ll long long
#define ull unsigned long long
#define db double
#define ld long double
#define inf 0x7fffffff
#define eps 1e-6
// #define mod 998244353
#define maxn 10000007

int n;
int a[maxn];
int lowbit(int x) { return x & (-x); }

void insert(int pos)
{
    while (pos <= n)
    {
        a[pos]++;
        pos += lowbit(pos);
    }
}

int query(int x)
{
    int ans = 0;
    while (x > 0)
    {
        ans += a[x];
        x -= lowbit(x);
    }
    return ans;
}

int main(void)
{
    int n, a;
    cin >> n >> a;
    while (--a)
    {
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
        insert(a);
        query(a);
    }
    cout << query(0);
    return 0;
}
`;
const data = {
    dynamicFiles: [
        {
            type: "remote",
            name: "in",
            file: {
                type: "direct",
                content: "10000000 10000000"
            }
        },
        {
            type: "remote",
            name: "out",
            file: {
                type: "direct",
                content: "0"
            }
        }
    ],
    judge: {
        type: "normal",
        user: {
            source: {
                type: "direct",
                content: usrCode
            },
            environment: {
                language: "cpp",
                system: "Linux",
                arch: "x64",
                options: {}
            },
            limit: {
                runtime: {
                    memory: 128 * 1024 * 1024,
                    cpuTime: 1000,
                    output: 64 * 1024 * 1024
                },
                compiler: {
                    memory: 512 * 1024 * 1024,
                    cpuTime: 5000,
                    output: 64 * 1024 * 1024,
                    message: 512 * 1024
                }
            }
        }
    },
    test: {
        cases: [{ input: "in", output: "out" }],
        policy: "all"
    },
    callbackUrls: {
        update: "http://127.0.0.1:8080/v1/judges/testurl",
        finish: "http://127.0.0.1:8080/v1/judges/testurl"
    }
};

// let cnt = 0;
// setInterval(() => {
//     console.log(cnt++);
//     axios
//         .request(
//             sign.sign({
//                 method,
//                 url,
//                 params: query,
//                 data,
//                 ak,
//                 sk
//             })
//         )
//         .then(ret => {
//             console.log(ret.data);
//         })
//         .catch(e => {
//             console.log(e.response && e.response.data);
//         });
// }, 100);
axios
    .request(
        sign.sign({
            method: "GET",
            url: "http://127.0.0.1:8080/v1/test",
            // params: query,
            // data,
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
