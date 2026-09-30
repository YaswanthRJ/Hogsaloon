import { WsException } from '@nestjs/websockets';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import type { ChatSession } from '../chatsession/chatsession.types.js';
import { RedisService } from '../redis/redis.service.js';
import { HandCricketGameService } from './hand-cricket/hand-cricket-game.service.js';
import { GameLifecycleService } from './game-lifecycle.service.js';
import { RpsGameService } from './rps/rps-game.service.js';

describe('GameLifecycleService', () => {
  const session: ChatSession = {
    sessionId: 'session-id',
    userA: 'player-a',
    userB: 'player-b',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    status: 'ACTIVE',
  };

  let service: GameLifecycleService;
  let redisClient: {
    eval: ReturnType<typeof vi.fn>;
    hgetall: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let chatSessionService: {
    findById: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
  };
  let rpsGameService: {
    createInitialState: ReturnType<typeof vi.fn>;
    choose: ReturnType<typeof vi.fn>;
  };
  let handCricketGameService: {
    createInitialState: ReturnType<typeof vi.fn>;
    submitTossNumber: ReturnType<typeof vi.fn>;
    chooseBatOrBowl: ReturnType<typeof vi.fn>;
    submitBallNumber: ReturnType<typeof vi.fn>;
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
    rpsGameService = {
      createInitialState: vi.fn().mockReturnValue({
        round: 1,
        winsA: 0,
        winsB: 0,
        choiceA: null,
        choiceB: null,
      }),
      choose: vi.fn(),
    };
    handCricketGameService = {
      createInitialState: vi.fn().mockReturnValue({
        phase: 'TOSS',
        callA: 'ODD',
        callB: 'EVEN',
      }),
      submitTossNumber: vi.fn(),
      chooseBatOrBowl: vi.fn(),
      submitBallNumber: vi.fn(),
    };
    service = new GameLifecycleService(
      { getClient: () => redisClient } as unknown as RedisService,
      chatSessionService as unknown as ChatsessionService,
      rpsGameService as unknown as RpsGameService,
      handCricketGameService as unknown as HandCricketGameService,
    );
  });

  it('creates a Hand Cricket invitation with opposite toss calls and chat expiry', async () => {
    redisClient.eval.mockResolvedValueOnce(['OK']);

    const invitation = await service.invite('player-a', 'HAND_CRICKET');

    const call = redisClient.eval.mock.calls[0] as unknown[];
    const initialState = JSON.parse(call[11] as string) as {
      callA: string;
      callB: string;
      phase: string;
    };
    expect(invitation).toMatchObject({
      gameType: 'HAND_CRICKET',
      inviterId: 'player-a',
      inviteeId: 'player-b',
    });
    expect(['ODD', 'EVEN']).toContain(initialState.callA);
    expect(initialState.callA).not.toBe(initialState.callB);
    expect(initialState.phase).toBe('TOSS');
    expect(call[12]).toBe(String(session.expiresAt));
  });

  it('lets the other chat participant accept when the inviter is chat userB', async () => {
    const gameId = '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831';
    redisClient.eval
      .mockResolvedValueOnce(['OK'])
      .mockResolvedValueOnce(['OK']);

    const invitation = await service.invite('player-b', 'RPS');
    redisClient.hgetall.mockResolvedValueOnce({
      gameId,
      sessionId: session.sessionId,
      gameType: 'RPS',
      playerA: 'player-b',
      playerB: 'player-a',
      status: 'INVITED',
      createdAt: String(Date.now()),
      state: JSON.stringify({ round: 1, winsA: 0, winsB: 0 }),
    });

    const game = await service.accept('player-a', invitation.gameId);
    const createCall = redisClient.eval.mock.calls[0] as unknown[];

    expect(createCall[7]).toBe('player-b');
    expect(createCall[8]).toBe('player-a');
    expect(game).toMatchObject({
      playerA: 'player-b',
      playerB: 'player-a',
      gameType: 'RPS',
    });
  });

  it('rejects unsupported games and users without an active chat', async () => {
    await expect(service.invite('player-a', 'UNKNOWN')).rejects.toBeInstanceOf(
      WsException,
    );
    chatSessionService.findByUserId.mockResolvedValueOnce(null);
    await expect(service.invite('player-a', 'RPS')).rejects.toBeInstanceOf(
      WsException,
    );
    expect(redisClient.eval).not.toHaveBeenCalled();
  });

  it('rejects a second active game in the same chat', async () => {
    redisClient.eval.mockResolvedValueOnce(['ACTIVE_GAME_EXISTS']);

    await expect(service.invite('player-a', 'RPS')).rejects.toThrow(
      'A game is already active in this chat',
    );
  });

  it('dispatches hand-cricket toss actions to the hand-cricket service', async () => {
    redisClient.hgetall.mockResolvedValueOnce({
      gameId: '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      sessionId: session.sessionId,
      gameType: 'HAND_CRICKET',
      playerA: 'player-a',
      playerB: 'player-b',
      status: 'PLAYING',
      createdAt: String(Date.now()),
      state: JSON.stringify({ phase: 'TOSS' }),
    });
    handCricketGameService.submitTossNumber.mockResolvedValueOnce({
      status: 'WAITING',
      gameId: '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      opponentId: 'player-b',
      phase: 'TOSS',
    });

    const result = await service.submitHandCricketToss(
      'player-a',
      '2b4bb97b-85b8-4cd9-8f30-e3f2ce9a5831',
      4,
    );

    expect(result.status).toBe('WAITING');
    expect(handCricketGameService.submitTossNumber).toHaveBeenCalledWith(
      expect.objectContaining({ gameType: 'HAND_CRICKET' }),
      'player-a',
      4,
    );
    expect(rpsGameService.choose).not.toHaveBeenCalled();
  });
});