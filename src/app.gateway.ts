import { Logger } from "@nestjs/common";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets"

@WebSocketGateway(4001)
export class AppGateway implements OnGatewayConnection{
    @WebSocketServer()
    wss;
    private logger = new Logger('AppGateway')

    handleConnection(client){
        this.logger.log('New client connected')
        client.emit('connection','successfully connected to server')
        console.log('successfully connected to server')
    }
}