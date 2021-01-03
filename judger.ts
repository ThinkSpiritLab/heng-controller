import WebSocket from "ws";
import axios, { AxiosResponse } from "axios";
import crypto from "crypto";

let status: { id: string; state: string }[] = [];
let result: { id: string; result: any }[] = [];

axios
    .get("http://127.0.0.1:8080/v1/judger/token", {
        data: {
            maxTaskCount: 10,
            name: "judger" + crypto.randomBytes(2).toString("hex")
        }
    })
    .then((e: AxiosResponse) => {
        console.log(e.data["token"]);
        const ws = new WebSocket(
            `http://127.0.0.1:8080/v1/judger/websocket?token=${e.data["token"]}`
        );
        ws.on("open", function open() {
            setInterval(() => {
                ws.send(
                    JSON.stringify({
                        type: "req",
                        seq: 1,
                        body: {
                            method: "ReportStatus",
                            args: { cpu: 100 }
                        }
                    })
                );
            }, 1000);
        });
        ws.on("error", e => {
            console.log(e);
            console.log("err");
        });
        ws.on("close", (e, r) => {
            console.log(e, r);
            process.exit();
        });
        ws.on("message", (s: string) => {
            console.log(s);
            const data = JSON.parse(s);
            if (data.type === "res") return;
            if (data.body.method == "Judge") {
                const id = data.body.args.id;
                setTimeout(async () => {
                    status.push({ id, state: "Judging" });
                    setTimeout(async () => {
                        result.push({
                            id,
                            result: {
                                result: {
                                    res: "ac"
                                }
                            }
                        });
                    }, 100);
                }, 1000);
            }
            ws.send(
                JSON.stringify({
                    seq: data.seq,
                    type: "res",
                    body: { output: null }
                })
            );
        });
        setInterval(() => {
            if (status.length !== 0) {
                ws.send(
                    JSON.stringify({
                        seq: 100,
                        type: "req",
                        body: {
                            method: "UpdateJudges",
                            args: status.splice(0)
                        }
                    })
                );
            }
        }, 1000);

        setInterval(() => {
            if (result.length !== 0) {
                ws.send(
                    JSON.stringify({
                        seq: 100,
                        type: "req",
                        body: {
                            method: "FinishJudges",
                            args: result.splice(0)
                        }
                    })
                );
            }
        }, 1000);
    });
