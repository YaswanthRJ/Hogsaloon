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
import { ChatsessionService } from '../chatsession/chatsession.service.js';

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
    private readonly matchMakingService: MatchmakingService,
    private readonly chatSessionService: ChatsessionService,

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
  async handleQueueJoin(
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = socket.data.userId;

    if (!userId) {
      return;
    }

    console.log(
      `User ${userId} wants to find someone`,
    );

    const result =
      await this.matchMakingService.joinQueue(userId);

    console.log('Matchmaking result:', result);

    if (result.status === 'WAITING') {
      return;
    }

    if (result.status === 'DUPLICATE') {
      return;
    }

    if (result.status === 'MATCHED') {
      const first = JSON.parse(result.first);
      const second = JSON.parse(result.second);

      const session =
        await this.chatSessionService.create(
          first.userId,
          second.userId,
        );

      console.log(
        'Match session created:',
        session,
      );
    }
  }
}
