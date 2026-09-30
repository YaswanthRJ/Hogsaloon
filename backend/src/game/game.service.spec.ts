import { WsException } from '@nestjs/websockets';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import type { ChatSession } from '../chatsession/chatsession.types.js';
import { RedisService } from '../redis/redis.service.js';
import { GameService } from './game.service.js';
import { getRpsWinner, isRpsChoice } from './rps.rules.js';

describe('GameService', () => {
  const session: ChatSession = {
    sessionId: 'session-id',
    userA: 'player-a',
    userB: 'player-b',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    status: 'ACTIVE',
  };

  let service: GameService;
  let redisClient: {
    eval: ReturnType<typeof vi.fn>;
    hgetall: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let chatSessionService: {
    findById: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    redisClient = {
      eval: vi.fn(),
      hgetall: vi.fn(),
      get: vi.fn(),
    };
    chatSessionService = {
      findById: vi.fn().mockResolvedValue(session),
      findByUserId: vi.fn().mockResolvedValue(session),
    };
    service = new GameService(
      { getClient: () => redisClient } as unknown as RedisService,
      chatSessionService as unknown as ChatsessionService,
    );
  });

  it('validates RPS choices and determines the winner', () => {
    expect(isRpsChoice('ROCK')).toBe(true);
    expect(isRpsChoice('LIZARD')).toBe(false);
    expect(getRpsWinner('ROCK', 'SCISSORS', 'player-a', 'player-b')).toBe(
      'player-a',
    );
    expect(getRpsWinner('PAPER', 'SCISSORS', 'player-a', 'player-b')).toBe(
      'player-b',
    );
    expect(getRpsWinner('PAPER', 'PAPER', 'player-a', 'player-b')).toBeNull();
  });

  it('creates an invitation with the chat session expiry', async () => {
    redisClient.eval.mockResolvedValueOnce(['OK']);

    const invitation = await service.invite('player-a', 'RPS');

    expect(invitation).toMatchObject({
      gameType: 'RPS',
      inviterId: 'player-a',
      inviteeId: 'player-b',
    });
    expect(redisClient.eval).toHaveBeenCalledTimes(1);
    const call = redisClient.eval.mock.calls[0] as unknown[];
    expect(call[11]).toBe(String(session.expiresAt));
  });

  it('rejects invitations without an active chat or supported game type', async () => {
    await expect(service.invite('player-a', 'UNKNOWN')).rejects.toBeInstanceOf(
      WsException,
    );
    chatSessionService.findByUserId.mockResolvedValueOnce(null);
    await expect(service.invite('player-a', 'RPS')).rejects.toBeInstanceOf(
      WsException,
    );
    expect(redisClient.eval).not.toHaveBeenCalled();
  });

  it('rejects a concurrent invitation when the session already has a game', async () => {
    redisClient.eval.mockResolvedValueOnce(['ACTIVE_GAME_EXISTS']);

    await expect(service.invite('player-a', 'RPS')).rejects.toThrow(
      'A game is already active in this chat',
    );
  });

  it('returns only the opponent-chose signal before both choices are made', async () => {
    redisClient.hgetall.mockResolvedValueOnce({
      gameId: '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      sessionId: session.sessionId,
      gameType: 'RPS',
      playerA: 'player-a',
      playerB: 'player-b',
      status: 'PLAYING',
      createdAt: String(Date.now()),
      userAChoice: '',
      userBChoice: '',
      winnerId: '',
    });
    redisClient.eval.mockResolvedValueOnce(['WAITING', 'player-b']);

    const result = await service.choose(
      'player-a',
      '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      'ROCK',
    );

    expect(result).toEqual({
      status: 'WAITING',
      gameId: '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      opponentId: 'player-b',
    });
  });

  it('returns personalized results after the second choice', async () => {
    redisClient.hgetall.mockResolvedValueOnce({
      gameId: '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      sessionId: session.sessionId,
      gameType: 'RPS',
      playerA: 'player-a',
      playerB: 'player-b',
      status: 'PLAYING',
      createdAt: String(Date.now()),
      userAChoice: '',
      userBChoice: '',
      winnerId: '',
    });
    redisClient.eval
      .mockResolvedValueOnce(['RESULT_REQUIRED', 'ROCK'])
      .mockResolvedValueOnce([
        'RESULT',
        'player-a',
        'player-b',
        'ROCK',
        'SCISSORS',
        'player-a',
      ]);

    const result = await service.choose(
      'player-b',
      '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      'SCISSORS',
    );

    expect(result).toEqual({
      status: 'RESULT',
      results: [
        {
          playerId: 'player-a',
          result: {
            gameId: '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
            yourChoice: 'ROCK',
            opponentChoice: 'SCISSORS',
            outcome: 'WIN',
          },
        },
        {
          playerId: 'player-b',
          result: {
            gameId: '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
            yourChoice: 'SCISSORS',
            opponentChoice: 'ROCK',
            outcome: 'LOSS',
          },
        },
      ],
    });
  });

  it('rejects a player who has already chosen', async () => {
    redisClient.hgetall.mockResolvedValueOnce({
      gameId: '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      sessionId: session.sessionId,
      gameType: 'RPS',
      playerA: 'player-a',
      playerB: 'player-b',
      status: 'PLAYING',
      createdAt: String(Date.now()),
      userAChoice: 'ROCK',
      userBChoice: '',
      winnerId: '',
    });

    await expect(
      service.choose(
        'player-a',
        '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
        'PAPER',
      ),
    ).rejects.toThrow('Player has already chosen');
    expect(redisClient.eval).not.toHaveBeenCalled();
  });

  it('rejects malformed game IDs', async () => {
    await expect(service.accept('player-a', 'not-a-uuid')).rejects.toThrow(
      'Invalid game ID',
    );
    expect(redisClient.hgetall).not.toHaveBeenCalled();
  });
});