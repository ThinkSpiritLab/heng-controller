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
const url = "http://h2.xcpc.top/v1/judges";
const query = {};
const ak = "c34811887fec183e5853947f40563f80716fed27a2950723a057c0fb5937851c";
const sk = "a9ed1c6516a39dd3738689f09eb7e2c571031ebd1769d42f0d6130d337362142";

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
                    message: 100 * 1024
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

let cnt = 0;
setInterval(() => {
    console.log(cnt++);
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
}, 100);
