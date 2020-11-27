import { Logger } from "@nestjs/common";
import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    WebSocketGateway,
    WebSocketServer
} from "@nestjs/websockets";
import { Server } from "ws";
import WebSocket from "ws";
import { IncomingMessage } from "http";
import { JudgerService } from "./judger.service";

@WebSocketGateway({ path: "/judger/ws" })
export class JudgerGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
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
        setImmediate(this.listenQueue, connect, token, this.judgerService);
        connect.on("ping", this.handlePing(token));
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
        while (await judgerService.isActiveToken(token)) {
            let taskid = await judgerService.getTask(token, 30);
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
    handleDisconnect(@ConnectedSocket() client: WebSocket) {
        Logger.log("Client disconnected", "WebSocketGateway");
    }

    handleConnection(@ConnectedSocket() client: WebSocket, ...args: any[]) {
        Logger.log(`args: ${args.length}`, "WebSocketGateway");
    }
}
