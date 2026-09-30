import { getRpsOutcome, resolveRpsRound } from './rps.rules.js';

describe('Rock Paper Scissors match rules', () => {
  it('finishes immediately when a player reaches three wins', () => {
    const resolution = resolveRpsRound(
      { round: 3, winsA: 2, winsB: 1 },
      'PAPER',
      'ROCK',
      'player-a',
      'player-b',
    );

    expect(resolution).toMatchObject({
      round: 3,
      winsA: 3,
      winsB: 1,
      roundWinnerId: 'player-a',
      matchWinnerId: 'player-a',
      finished: true,
    });
  });

  it('uses the fifth round as the match limit and allows a draw', () => {
    const resolution = resolveRpsRound(
      { round: 5, winsA: 2, winsB: 2 },
      'SCISSORS',
      'SCISSORS',
      'player-a',
      'player-b',
    );

    expect(resolution.finished).toBe(true);
    expect(resolution.matchWinnerId).toBeNull();
    expect(getRpsOutcome('player-a', resolution.matchWinnerId)).toBe('DRAW');
  });

  it('does not finish before the limit when neither player has three wins', () => {
    const resolution = resolveRpsRound(
      { round: 2, winsA: 1, winsB: 1 },
      'ROCK',
      'SCISSORS',
      'player-a',
      'player-b',
    );

    expect(resolution.finished).toBe(false);
    expect(resolution.matchWinnerId).toBeNull();
  });
});