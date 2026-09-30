import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WsException,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketService } from './socket.service.js';
import { MatchmakingService } from '../matchmaking/matchmaking.service.js';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import { ChatService } from '../chat/chat.service.js';
import { SocketPresenceService } from './socket-presence.service.js';
import { UsersService } from '../users/users.service.js';
import { GameLifecycleService } from '../game/game-lifecycle.service.js';

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
    private readonly gameService: GameLifecycleService,

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
        state: participants.state,
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

  @SubscribeMessage('game:rps:choose')
  async handleRpsChoose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameId?: unknown; choice?: unknown },
  ) {
    const result = await this.gameService.chooseRps(
      this.requireUserId(socket),
      data?.gameId,
      data?.choice,
    );

    if (result.status === 'WAITING') {
      this.emitToUsers(
        [result.opponentId],
        'game:opponent-chose',
        { gameId: result.gameId, phase: 'RPS' },
      );
      return;
    }

    for (const playerId of [result.playerA, result.playerB]) {
      const playerA = playerId === result.playerA;
      this.emitToUsers(
        [playerId],
        'game:rps:round-result',
        {
          gameId: result.gameId,
          round: result.round,
          yourChoice: playerA ? result.choiceA : result.choiceB,
          opponentChoice: playerA ? result.choiceB : result.choiceA,
          outcome: result.roundWinnerId === null
            ? 'DRAW'
            : result.roundWinnerId === playerId
              ? 'WIN'
              : 'LOSS',
          yourWins: playerA ? result.winsA : result.winsB,
          opponentWins: playerA ? result.winsB : result.winsA,
        },
      );
    }

    if (result.finished) {
      this.emitToUsers(
        [result.playerA, result.playerB],
        'game:result',
        {
          gameId: result.gameId,
          gameType: 'RPS',
          winnerId: result.matchWinnerId,
          scoreA: result.winsA,
          scoreB: result.winsB,
          outcome: result.matchWinnerId ? 'WINNER' : 'DRAW',
        },
      );
    }
  }

  @SubscribeMessage('game:hand-cricket:toss')
  async handleHandCricketToss(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameId?: unknown; number?: unknown },
  ) {
    const result = await this.gameService.submitHandCricketToss(
      this.requireUserId(socket),
      data?.gameId,
      data?.number,
    );
    if (result.status === 'WAITING') {
      this.emitToUsers(
        [result.opponentId],
        'game:opponent-chose',
        { gameId: result.gameId, phase: 'TOSS' },
      );
      return;
    }
    if (result.status !== 'TOSS_RESULT') {
      throw new WsException('Unexpected hand-cricket toss result');
    }
    this.emitToUsers(
      [result.playerA, result.playerB],
      'game:hand-cricket:toss-result',
      {
        gameId: result.gameId,
        callA: result.callA,
        callB: result.callB,
        numberA: result.numberA,
        numberB: result.numberB,
        winningCall: result.winningCall,
        tossWinnerId: result.tossWinnerId,
      },
    );
  }

  @SubscribeMessage('game:hand-cricket:bat-or-bowl')
  async handleHandCricketDecision(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameId?: unknown; decision?: unknown },
  ) {
    const innings = await this.gameService.chooseHandCricketBatOrBowl(
      this.requireUserId(socket),
      data?.gameId,
      data?.decision,
    );
    this.emitToUsers(
      [innings.battingPlayerId, innings.bowlingPlayerId],
      'game:hand-cricket:innings-started',
      innings,
    );
  }

  @SubscribeMessage('game:hand-cricket:ball')
  async handleHandCricketBall(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { gameId?: unknown; number?: unknown },
  ) {
    const result = await this.gameService.submitHandCricketBall(
      this.requireUserId(socket),
      data?.gameId,
      data?.number,
    );
    if (result.status === 'WAITING') {
      this.emitToUsers(
        [result.opponentId],
        'game:opponent-chose',
        { gameId: result.gameId, phase: 'BALL' },
      );
      return;
    }
    if (result.status !== 'BALL_RESULT') {
      throw new WsException('Unexpected hand-cricket ball result');
    }

    this.emitToUsers(
      [result.ball.batterId, result.ball.bowlerId],
      'game:hand-cricket:ball-result',
      result,
    );
    if (result.finished) {
      this.emitToUsers(
        [result.ball.batterId, result.ball.bowlerId],
        'game:result',
        {
          gameId: result.gameId,
          gameType: 'HAND_CRICKET',
          winnerId: result.winnerId,
          scoreA: result.scoreA,
          scoreB: result.scoreB,
          outcome: result.winnerId ? 'WINNER' : 'DRAW',
        },
      );
    } else if (result.inningsEnded) {
      const firstScore = result.scoreA ?? result.scoreB ?? 0;
      this.emitToUsers(
        [result.ball.batterId, result.ball.bowlerId],
        'game:hand-cricket:innings-started',
        {
          gameId: result.gameId,
          inningsNumber: result.nextInningsNumber,
          battingPlayerId: result.nextBattingPlayerId,
          bowlingPlayerId: result.nextBowlingPlayerId,
          target: result.nextInningsNumber === 2 ? firstScore + 1 : null,
        },
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
