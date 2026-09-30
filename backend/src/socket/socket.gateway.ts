import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketService } from './socket.service.js';
import { MatchmakingService } from '../matchmaking/matchmaking.service.js';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import { ChatService } from '../chat/chat.service.js';
import { SocketPresenceService } from './socket-presence.service.js';
import { UsersService } from '../users/users.service.js';
import { GameService } from '../game/game.service.js';

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
    private readonly usersService: UsersService,
    private readonly gameService: GameService,

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

    const profile = await this.usersService.getMatchProfile(userId);

    const result =
      await this.matchMakingService.joinQueue(userId, {
        interests: profile.interests,
        languages: profile.languages,
      });

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

      const [firstProfile, secondProfile] = await Promise.all([
        this.usersService.getMatchProfile(first.userId),
        this.usersService.getMatchProfile(second.userId),
      ]);

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
            matchProfile: secondProfile,
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
            matchProfile: firstProfile,
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

    const endedGame = await this.gameService.endForSession(
      session.sessionId,
    );

    if (endedGame) {
      this.emitToUsers(
        [endedGame.playerA, endedGame.playerB],
        'game:ended',
        {
          gameId: endedGame.gameId,
          reason: endedGame.reason,
        },
      );
    }

    await this.chatService.endSession(
      session.sessionId,
      userId,
      'USER_ENDED',
    );

    this.emitToUsers(
      [userId, otherUserId],
      'chat:ended',
      { reason: 'USER_ENDED' },
    );
  }

  @SubscribeMessage('game:invite')
  async handleGameInvite(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameType?: unknown },
  ) {
    const invitation = await this.gameService.invite(
      this.requireUserId(socket),
      data?.gameType,
    );

    this.emitToUsers(
      [invitation.inviteeId],
      'game:invited',
      {
        gameId: invitation.gameId,
        gameType: invitation.gameType,
        inviterId: invitation.inviterId,
      },
    );
  }

  @SubscribeMessage('game:accept')
  async handleGameAccept(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameId?: unknown },
  ) {
    const participants = await this.gameService.accept(
      this.requireUserId(socket),
      data?.gameId,
    );

    this.emitToUsers(
      [participants.playerA, participants.playerB],
      'game:started',
      {
        gameId: participants.gameId,
        gameType: participants.gameType,
      },
    );
  }

  @SubscribeMessage('game:decline')
  async handleGameDecline(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameId?: unknown },
  ) {
    const endedGame = await this.gameService.decline(
      this.requireUserId(socket),
      data?.gameId,
    );
    this.emitGameEnded(endedGame);
  }

  @SubscribeMessage('game:choose')
  async handleGameChoose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameId?: unknown; choice?: unknown },
  ) {
    const result = await this.gameService.choose(
      this.requireUserId(socket),
      data?.gameId,
      data?.choice,
    );

    if (result.status === 'WAITING') {
      this.emitToUsers(
        [result.opponentId],
        'game:opponent-chose',
        { gameId: result.gameId },
      );
      return;
    }

    for (const playerResult of result.results) {
      this.emitToUsers(
        [playerResult.playerId],
        'game:result',
        playerResult.result,
      );
    }
  }

  @SubscribeMessage('game:leave')
  async handleGameLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameId?: unknown },
  ) {
    const endedGame = await this.gameService.leave(
      this.requireUserId(socket),
      data?.gameId,
    );
    this.emitGameEnded(endedGame);
  }

  private emitGameEnded(game: {
    gameId: string;
    playerA: string;
    playerB: string;
    reason: string;
  }): void {
    this.emitToUsers(
      [game.playerA, game.playerB],
      'game:ended',
      { gameId: game.gameId, reason: game.reason },
    );
  }

  private requireUserId(socket: Socket): string {
    const userId = socket.data.userId;
    if (typeof userId !== 'string' || !userId) {
      throw new WsException('Unauthenticated');
    }
    return userId;
  }

  private emitToUsers(
    userIds: string[],
    event: string,
    payload: unknown,
  ): void {
    const socketIds = new Set(
      userIds.flatMap((userId) =>
        this.socketPresenceService.getSockets(userId),
      ),
    );

    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, payload);
    }
  }
}
