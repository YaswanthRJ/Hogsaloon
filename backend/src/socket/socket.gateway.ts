import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketService } from './socket.service.js';
import { MatchmakingService } from '../matchmaking/matchmaking.service.js';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import { ChatService } from '../chat/chat.service.js';
import { SocketPresenceService } from './socket-presence.service.js';

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
    private readonly chatService: ChatService,
    private readonly socketPresenceService: SocketPresenceService,

  ) { }

  @WebSocketServer()
  server: Server;

  async handleConnection(socket: Socket) {
    try {
      const userId =
        await this.socketService.authenticate(
          socket.handshake.headers.cookie,
        );

      socket.data.userId = userId;

      this.socketPresenceService.add(
        userId,
        socket.id,
      );

      console.log(
        'Connected to socket:',
        userId,
        socket.id,
      );
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;

    if (!userId) {
      return;
    }

    this.socketPresenceService.remove(
      userId,
      socket.id,
    );

    void this.matchMakingService
      .removeFromQueue(userId)
      .catch((error) => {
        console.error(
          `Failed to remove user ${userId} from queue on disconnect`,
          error,
        );
      });

    console.log(
      `User ${userId} disconnected`,
    );
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

      const firstSockets =
        this.socketPresenceService.getSockets(
          first.userId,
        );

      const secondSockets =
        this.socketPresenceService.getSockets(
          second.userId,
        );

      for (const socketId of firstSockets) {
        this.server.to(socketId).emit(
          'chat:started',
          {
            sessionId: session.sessionId,
            expiresAt: session.expiresAt,
            otherUserId: second.userId,
          },
        );
      }

      for (const socketId of secondSockets) {
        this.server.to(socketId).emit(
          'chat:started',
          {
            sessionId: session.sessionId,
            expiresAt: session.expiresAt,
            otherUserId: first.userId,
          },
        );
      }
    }
  }

  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { text: string },
  ) {
    const userId = socket.data.userId;

    const message =
      await this.chatService.sendMessage(
        userId,
        data.text,
      );
    const session = await this.chatSessionService.findByUserId(userId);

    if (!session) {
      return;
    }
    const firstSockets =
      this.socketPresenceService.getSockets(
        session.userA,
      );

    const secondSockets =
      this.socketPresenceService.getSockets(
        session.userB,
      );

    const recipientSockets = [
      ...new Set([
        ...firstSockets,
        ...secondSockets,
      ]),
    ];

    for (const socketId of recipientSockets) {
      this.server.to(socketId).emit(
        'chat:message',
        message,
      );
    }
  }

  @SubscribeMessage('chat:history')
  async handleChatHistory(
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = socket.data.userId;

    if (!userId) {
      return;
    }

    const messages =
      await this.chatService.getMessages(userId);

    socket.emit(
      'chat:history',
      messages,
    );
  }

  @SubscribeMessage('chat:end')
  async handleChatEnd(
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = socket.data.userId;

    if (!userId) {
      return;
    }

    const session =
      await this.chatSessionService.findByUserId(
        userId,
      );

    if (!session) {
      return;
    }

    const otherUserId =
      session.userA === userId
        ? session.userB
        : session.userA;

    await this.chatService.endSession(
      session.sessionId,
      userId,
      'USER_ENDED',
    );

    const userSockets =
      this.socketPresenceService.getSockets(
        userId,
      );

    const otherUserSockets =
      this.socketPresenceService.getSockets(
        otherUserId,
      );

    for (const socketId of userSockets) {
      this.server.to(socketId).emit(
        'chat:ended',
        {
          reason: 'USER_ENDED',
        },
      );
    }

    for (const socketId of otherUserSockets) {
      this.server.to(socketId).emit(
        'chat:ended',
        {
          reason: 'USER_ENDED',
        },
      );
    }
  }
}
