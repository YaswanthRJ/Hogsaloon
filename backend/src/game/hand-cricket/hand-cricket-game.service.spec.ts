import { RedisService } from '../../redis/redis.service.js';
import { HandCricketGameService } from './hand-cricket-game.service.js';
import type { GameSnapshot } from '../game.types.js';
import type { HandCricketState } from './hand-cricket.types.js';

describe('HandCricketGameService', () => {
  const game: GameSnapshot = {
    gameId: 'game-id',
    sessionId: 'session-id',
    gameType: 'HAND_CRICKET',
    playerA: 'player-a',
    playerB: 'player-b',
    status: 'PLAYING',
    createdAt: Date.now(),
    state: {},
    stateJson: '{}',
  };

  function createService(evalMock: ReturnType<typeof vi.fn>) {
    return new HandCricketGameService(
      { getClient: () => ({ eval: evalMock }) } as unknown as RedisService,
    );
  }

  it('does not reveal a first toss number', async () => {
    const evalMock = vi.fn().mockResolvedValueOnce(['WAITING', 'player-b']);
    const service = createService(evalMock);

    const result = await service.submitTossNumber(game, 'player-a', 8);

    expect(result).toEqual({
      status: 'WAITING',
      gameId: 'game-id',
      opponentId: 'player-b',
      phase: 'TOSS',
    });
    expect(JSON.stringify(result)).not.toContain('8');
  });

  it('resolves the toss only after both numbers are stored', async () => {
    const pendingState: HandCricketState = {
      phase: 'TOSS',
      playerA: 'player-a',
      playerB: 'player-b',
      callA: 'ODD',
      callB: 'EVEN',
      tossNumberA: null,
      tossNumberB: null,
      tossWinnerId: null,
      battingPlayerId: null,
      bowlingPlayerId: null,
      inningsNumber: null,
      firstInningsScore: null,
      scoreA: null,
      scoreB: null,
      currentInningsScore: 0,
      ballsBowled: 0,
      pendingNumberA: 3,
      pendingNumberB: null,
      winnerId: null,
    };
    const evalMock = vi.fn()
      .mockResolvedValueOnce(['RESOLVE', JSON.stringify(pendingState), '3'])
      .mockResolvedValueOnce(['OK']);
    const service = createService(evalMock);

    const result = await service.submitTossNumber(game, 'player-b', 4);
    const nextState = JSON.parse(
      (evalMock.mock.calls[1] as unknown[])[12] as string,
    ) as HandCricketState;

    expect(result).toMatchObject({
      status: 'TOSS_RESULT',
      numberA: 3,
      numberB: 4,
      winningCall: 'ODD',
      tossWinnerId: 'player-a',
    });
    expect(nextState).toMatchObject({
      phase: 'TOSS_DECISION',
      tossNumberA: 3,
      tossNumberB: 4,
      pendingNumberA: null,
      pendingNumberB: null,
    });
  });

  it('resolves a ball from the batter and bowler numbers after both submit', async () => {
    const inningsState: HandCricketState = {
      phase: 'INNINGS',
      playerA: 'player-a',
      playerB: 'player-b',
      callA: 'ODD',
      callB: 'EVEN',
      tossNumberA: 1,
      tossNumberB: 2,
      tossWinnerId: 'player-a',
      battingPlayerId: 'player-a',
      bowlingPlayerId: 'player-b',
      inningsNumber: 1,
      firstInningsScore: null,
      scoreA: 0,
      scoreB: null,
      currentInningsScore: 0,
      ballsBowled: 0,
      pendingNumberA: null,
      pendingNumberB: 1,
      winnerId: null,
    };
    const evalMock = vi.fn()
      .mockResolvedValueOnce(['RESOLVE', JSON.stringify(inningsState), '1'])
      .mockResolvedValueOnce(['OK']);
    const service = createService(evalMock);

    const result = await service.submitBallNumber(game, 'player-a', 8);
    const nextState = JSON.parse(
      (evalMock.mock.calls[1] as unknown[])[12] as string,
    ) as HandCricketState;

    expect(result).toMatchObject({
      status: 'BALL_RESULT',
      ball: {
        batterId: 'player-a',
        batterNumber: 8,
        bowlerNumber: 1,
        runs: 8,
        out: false,
      },
    });
    expect(nextState.currentInningsScore).toBe(8);
    expect(nextState.pendingNumberA).toBeNull();
    expect(nextState.pendingNumberB).toBeNull();
  });

  it('labels the final ball of the first innings and reports the next innings', async () => {
    const inningsState: HandCricketState = {
      phase: 'INNINGS',
      playerA: 'player-a',
      playerB: 'player-b',
      callA: 'ODD',
      callB: 'EVEN',
      tossNumberA: 1,
      tossNumberB: 2,
      tossWinnerId: 'player-a',
      battingPlayerId: 'player-a',
      bowlingPlayerId: 'player-b',
      inningsNumber: 1,
      firstInningsScore: null,
      scoreA: 10,
      scoreB: null,
      currentInningsScore: 10,
      ballsBowled: 11,
      pendingNumberA: null,
      pendingNumberB: 1,
      winnerId: null,
    };
    const evalMock = vi.fn()
      .mockResolvedValueOnce(['RESOLVE', JSON.stringify(inningsState), '1'])
      .mockResolvedValueOnce(['OK']);
    const service = createService(evalMock);

    const result = await service.submitBallNumber(game, 'player-a', 2);

    expect(result).toMatchObject({
      status: 'BALL_RESULT',
      inningsNumber: 1,
      nextInningsNumber: 2,
      inningsEnded: true,
      finished: false,
      scoreA: 12,
    });
  });
});