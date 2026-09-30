import { RedisService } from '../../redis/redis.service.js';
import { RpsGameService } from './rps-game.service.js';

describe('RpsGameService', () => {
  it('clears both hidden choices before the next round', async () => {
    const evalMock = vi.fn()
      .mockResolvedValueOnce([
        'RESULT_REQUIRED',
        JSON.stringify({
          round: 1,
          winsA: 0,
          winsB: 0,
          choiceA: 'ROCK',
          choiceB: null,
        }),
        'ROCK',
      ])
      .mockResolvedValueOnce(['ROUND_RESULT']);
    const service = new RpsGameService(
      { getClient: () => ({ eval: evalMock }) } as unknown as RedisService,
    );

    const result = await service.choose(
      {
        gameId: 'game-id',
        sessionId: 'session-id',
        gameType: 'RPS',
        playerA: 'player-a',
        playerB: 'player-b',
        status: 'PLAYING',
        createdAt: Date.now(),
        state: {},
      },
      'player-b',
      'PAPER',
    );

    const finalizeCall = evalMock.mock.calls[1] as unknown[];
    const nextState = JSON.parse(finalizeCall[11] as string) as {
      choiceA: unknown;
      choiceB: unknown;
    };

    expect(result).toMatchObject({ status: 'ROUND_RESULT', round: 1 });
    expect(nextState).toMatchObject({ choiceA: null, choiceB: null });
  });
});