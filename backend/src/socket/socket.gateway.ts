import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SocketService } from './socket.service.js';
import { MatchmakingService } from '../matchmaking/matchmaking.service.js';

@WebSocketGateway(
  {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true,
    },
  },
)
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly socketService: SocketService,
    private readonly matchMakingService: MatchmakingService
  ) { }

  async handleConnection(socket: Socket) {
    try {
      socket.data.userId = await this.socketService.authenticate(
        socket.handshake.headers.cookie,
      );
      console.log("connected to socket", socket.data.userId)
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;

    if (!userId) {
      return;
    }

    console.log(`User ${userId} disconnected`);
  }

  @SubscribeMessage('queue:join')
  async handleQueueJoin(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId;

    console.log(`User ${userId} wants to find someone`);

    await this.matchMakingService.joinQueue(userId);
  }
}
