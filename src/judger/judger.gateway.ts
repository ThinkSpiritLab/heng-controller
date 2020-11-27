import { Logger } from "@nestjs/common";
import {
    ConnectedSocket,
    OnGatewayInit,
    WebSocketGateway,
    WebSocketServer
} from "@nestjs/websockets";
import { Server } from "ws";
import WebSocket from "ws";
import { IncomingMessage } from "http";
import { JudgerService } from "./judger.service";

@WebSocketGateway({ path: "/judger/ws" })
export class JudgerGateway implements OnGatewayInit {
    @WebSocketServer()
    server!: Server;
    constructor(private judgerService: JudgerService) {}

    async handleConnect(
        connect: WebSocket,
        req: IncomingMessage
    ): Promise<void> {
        Logger.log(`Connect with req ${req.url}`, "WebSocketGateway");
        if (req.url !== undefined) {
            const token = new URL(req.url, "ws://ws.org").searchParams.get(
                "token"
            );
            if (
                token !== null &&
                (await this.judgerService.checkToken(token))
            ) {
                this.registerConnection(connect, token);
                return;
            } else {
                Logger.log(
                    "Refused Connect because of badtoken",
                    "WebSocketGateway"
                );
                connect.close();
            }
        } else {
            Logger.log("Refused Connect as no url", "WebSocketGateway");
            connect.close();
        }
    }

    registerConnection(connect: WebSocket, token: string) {
        const judgerService = this.judgerService;
        setImmediate(this.listenQueue, connect, token, this.judgerService);
        connect.on("ping", this.handlePing(token));
        connect.on("close", (code: number, reason: string) => {
            Logger.log(
                `Connect Close ${token} , code : ${code} , reason : ${reason}`,
                "WebSocketGateway:handleClose"
            );
            judgerService.deleteToken(token);
        });
    }

    handlePing(token: string) {
        return (ping: any) => {
            Logger.log(
                `Ping from ${token} with ${ping}`,
                "WebSocketGateway:handlePing"
            );
        };
    }

    async listenQueue(
        connect: WebSocket,
        token: string,
        judgerService: JudgerService
    ) {
        while (connect.readyState !== WebSocket.CLOSED) {
            const taskid = await judgerService.getTask(token, 30);
            Logger.log(`GetTaskId ${taskid}`, "WebSocketGateway:listenQueue");
            if (taskid !== null) {
                connect.send(taskid);
            }
        }
        connect.close();
        return;
    }

    afterInit(server: Server) {
        this.server.on("connection", (c, r) => this.handleConnect(c, r));
        Logger.log(`Inited on ${this.server.address()}`, "WebSocketGateway");
    }
}
