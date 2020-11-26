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
            let token = new URL(req.url, "ws://ws.org").searchParams.get(
                "token"
            );
            if (
                token !== null &&
                (await this.judgerService.checkToken(token))
            ) {
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

    afterInit(server: Server) {
        this.server.on("connection", (c, r) => this.handleConnect(c, r));
        Logger.log(`Inited on ${this.server.address()}`, "WebSocketGateway");
    }
    handleDisconnect(@ConnectedSocket() client: WebSocket) {
        Logger.log(`Client disconnected`, "WebSocketGateway");
    }

    handleConnection(@ConnectedSocket() client: WebSocket, ...args: any[]) {
        Logger.log(`args: ${args.length}`, "WebSocketGateway");
    }
}
