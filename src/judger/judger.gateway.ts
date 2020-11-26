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
import { RedisService } from "src/redis/redis.service";

@WebSocketGateway({ path: "/judger/ws" })
export class JudgerGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;
    constructor(private redisService: RedisService) {}

    afterInit(server: Server) {
        this.server.on("connection", async (s, r) => {
            Logger.log(`Connect with req ${r.url}`, "WebSocketGateway");
            if (r.url !== undefined) {
                let url = new URL(r.url, "ws://ws.org");
                let token = url.searchParams.get("token");
                if (token !== null && await this.redisService.deleteToken(token)) {
                    return;
                } else {
                    Logger.log(
                        "Refused Connect as badtoken",
                        "WebSocketGateway"
                    );
                    s.close();
                }
            } else {
                Logger.log("Refused Connect as no url", "WebSocketGateway");
                s.close();
            }
        });
        Logger.log(`Inited on ${this.server.address()}`, "WebSocketGateway");
    }
    handleDisconnect(@ConnectedSocket() client: WebSocket) {
        Logger.log(`Client disconnected`, "WebSocketGateway");
    }

    handleConnection(@ConnectedSocket() client: WebSocket, ...args: any[]) {
        Logger.log(`args: ${args.length}`, "WebSocketGateway");
    }
}
