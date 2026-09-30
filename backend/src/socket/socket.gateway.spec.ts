import { Test, TestingModule } from '@nestjs/testing';
import { SocketGateway } from './socket.gateway.js';
import { SocketService } from './socket.service.js';
import { MatchmakingService } from '../matchmaking/matchmaking.service.js';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import { ChatService } from '../chat/chat.service.js';
import { SocketPresenceService } from './socket-presence.service.js';
import { UsersService } from '../users/users.service.js';
import { GameService } from '../game/game.service.js';
import type { Server, Socket } from 'socket.io';

const gameServiceMock = {
  invite: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
  choose: vi.fn(),
  leave: vi.fn(),
  endForSession: vi.fn(),
};

const chatSessionServiceMock = {
  findByUserId: vi.fn(),
};

const chatServiceMock = {
  endSession: vi.fn(),
};

const presenceServiceMock = {
  getSockets: vi.fn(),
};

describe('SocketGateway', () => {
  let gateway: SocketGateway;
  let emissions: Array<{ socketId: string; event: string; payload: unknown }>;

  beforeEach(async () => {
    vi.clearAllMocks();
    emissions = [];
    presenceServiceMock.getSockets.mockImplementation((userId: string) => {
      return userId === 'player-a' ? ['socket-a'] : ['socket-b'];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [SocketGateway],
    }).useMocker((token) => {
      if (token === SocketService) {
        return { authenticate: vi.fn() };
      }

      if (
        token === MatchmakingService ||
        token === ChatsessionService
      ) {
        return chatSessionServiceMock;
      }

      if (token === ChatService) {
        return chatServiceMock;
      }

      if (token === SocketPresenceService) {
        return presenceServiceMock;
      }

      if (
        token === UsersService ||
        token === GameService
      ) {
        return token === GameService ? gameServiceMock : {};
      }
    }).compile();

    gateway = module.get<SocketGateway>(SocketGateway);
    gateway.server = {
      to: (socketId: string) => ({
        emit: (event: string, payload: unknown) => {
          emissions.push({ socketId, event, payload });
        },
      }),
    } as unknown as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('sends an invitation only to the other participant', async () => {
    gameServiceMock.invite.mockResolvedValueOnce({
      gameId: 'game-id',
      gameType: 'RPS',
      inviterId: 'player-a',
      inviteeId: 'player-b',
    });

    await gateway.handleGameInvite(
      { data: { userId: 'player-a' } } as unknown as Socket,
      { gameType: 'RPS' },
    );

    expect(emissions).toEqual([
      {
        socketId: 'socket-b',
        event: 'game:invited',
        payload: {
          gameId: 'game-id',
          gameType: 'RPS',
          inviterId: 'player-a',
        },
      },
    ]);
  });

  it('starts the game for both players after acceptance', async () => {
    gameServiceMock.accept.mockResolvedValueOnce({
      gameId: 'game-id',
      gameType: 'RPS',
      playerA: 'player-a',
      playerB: 'player-b',
    });

    await gateway.handleGameAccept(
      { data: { userId: 'player-b' } } as unknown as Socket,
      { gameId: 'game-id' },
    );

    expect(emissions).toEqual([
      {
        socketId: 'socket-a',
        event: 'game:started',
        payload: { gameId: 'game-id', gameType: 'RPS' },
      },
      {
        socketId: 'socket-b',
        event: 'game:started',
        payload: { gameId: 'game-id', gameType: 'RPS' },
      },
    ]);
  });

  it('rejects unauthenticated game actions', async () => {
    await expect(
      gateway.handleGameInvite(
        { data: {} } as unknown as Socket,
        { gameType: 'RPS' },
      ),
    ).rejects.toThrow('Unauthenticated');
    expect(gameServiceMock.invite).not.toHaveBeenCalled();
  });

  it('emits private player results after both choices are submitted', async () => {
    gameServiceMock.choose.mockResolvedValueOnce({
      status: 'RESULT',
      results: [
        {
          playerId: 'player-a',
          result: {
            gameId: 'game-id',
            yourChoice: 'ROCK',
            opponentChoice: 'SCISSORS',
            outcome: 'WIN',
          },
        },
        {
          playerId: 'player-b',
          result: {
            gameId: 'game-id',
            yourChoice: 'SCISSORS',
            opponentChoice: 'ROCK',
            outcome: 'LOSS',
          },
        },
      ],
    });

    await gateway.handleGameChoose(
      { data: { userId: 'player-b' } } as unknown as Socket,
      { gameId: 'game-id', choice: 'SCISSORS' },
    );

    expect(emissions).toHaveLength(2);
    expect(emissions[0]).toMatchObject({
      socketId: 'socket-a',
      event: 'game:result',
      payload: { yourChoice: 'ROCK', outcome: 'WIN' },
    });
    expect(emissions[1]).toMatchObject({
      socketId: 'socket-b',
      event: 'game:result',
      payload: { yourChoice: 'SCISSORS', outcome: 'LOSS' },
    });
  });

  it('does not include the first choice in the opponent notification', async () => {
    gameServiceMock.choose.mockResolvedValueOnce({
      status: 'WAITING',
      gameId: 'game-id',
      opponentId: 'player-b',
    });

    await gateway.handleGameChoose(
      { data: { userId: 'player-a' } } as unknown as Socket,
      { gameId: 'game-id', choice: 'PAPER' },
    );

    expect(emissions).toEqual([
      {
        socketId: 'socket-b',
        event: 'game:opponent-chose',
        payload: { gameId: 'game-id' },
      },
    ]);
  });

  it('ends an active game before ending its chat', async () => {
    chatSessionServiceMock.findByUserId.mockResolvedValueOnce({
      sessionId: 'session-id',
      userA: 'player-a',
      userB: 'player-b',
    });
    gameServiceMock.endForSession.mockResolvedValueOnce({
      gameId: 'game-id',
      gameType: 'RPS',
      playerA: 'player-a',
      playerB: 'player-b',
      reason: 'CHAT_ENDED',
    });
    chatServiceMock.endSession.mockResolvedValueOnce(undefined);

    await gateway.handleChatEnd(
      { data: { userId: 'player-a' } } as unknown as Socket,
    );

    expect(gameServiceMock.endForSession).toHaveBeenCalledWith('session-id');
    expect(gameServiceMock.endForSession.mock.invocationCallOrder[0]).toBeLessThan(
      chatServiceMock.endSession.mock.invocationCallOrder[0],
    );
    expect(emissions).toContainEqual({
      socketId: 'socket-b',
      event: 'game:ended',
      payload: { gameId: 'game-id', reason: 'CHAT_ENDED' },
    });
    expect(chatServiceMock.endSession).toHaveBeenCalledWith(
      'session-id',
      'player-a',
      'USER_ENDED',
    );
  });
});
