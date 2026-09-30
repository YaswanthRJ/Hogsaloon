import {
  beginInnings,
  createHandCricketState,
  resolveBall,
  resolveToss,
} from './hand-cricket.rules.js';

describe('Hand cricket rules', () => {
  it('assigns opposite toss calls and resolves the winning call by parity', () => {
    const state = createHandCricketState('player-a', 'player-b', () => 0.1);
    const afterToss = resolveToss(state, 2, 4);

    expect(state.callA).toBe('ODD');
    expect(state.callB).toBe('EVEN');
    expect(afterToss.tossWinnerId).toBe('player-b');
    expect(afterToss.phase).toBe('TOSS_DECISION');
  });

  it('ends an innings on equal numbers and counts the dismissal ball', () => {
    const state = beginInnings(
      resolveToss(createHandCricketState('player-a', 'player-b', () => 0.1), 1, 2),
      'BAT',
    );
    const result = resolveBall(state, 7, 7);

    expect(result.ball).toMatchObject({
      ballNumber: 1,
      batterId: 'player-a',
      batterNumber: 7,
      bowlerNumber: 7,
      runs: 0,
      out: true,
    });
    expect(result.inningsEnded).toBe(true);
    expect(result.state.inningsNumber).toBe(2);
    expect(result.state.ballsBowled).toBe(0);
  });

  it('awards the batter number as runs and switches innings after 12 balls', () => {
    let state = beginInnings(
      resolveToss(createHandCricketState('player-a', 'player-b', () => 0.1), 1, 2),
      'BAT',
    );

    for (let ball = 0; ball < 11; ball += 1) {
      state = resolveBall(state, 6, 1).state;
    }
    const result = resolveBall(state, 5, 1);

    expect(result.ball.ballNumber).toBe(12);
    expect(result.ball.runs).toBe(5);
    expect(result.inningsEnded).toBe(true);
    expect(result.state.inningsNumber).toBe(2);
    expect(result.state.firstInningsScore).toBe(71);
  });

  it('finishes the chase as soon as the target is passed', () => {
    const firstInnings = beginInnings(
      resolveToss(createHandCricketState('player-a', 'player-b', () => 0.1), 1, 2),
      'BAT',
    );
    const stateAfterFirst = {
      ...firstInnings,
      inningsNumber: 2 as const,
      firstInningsScore: 3,
      scoreB: 3,
      battingPlayerId: 'player-a',
      bowlingPlayerId: 'player-b',
    };

    const result = resolveBall(stateAfterFirst, 4, 2);

    expect(result.finished).toBe(true);
    expect(result.winnerId).toBe('player-a');
    expect(result.state.phase).toBe('FINISHED');
    expect(result.state.scoreA).toBe(4);
    expect(result.state.scoreB).toBe(3);
  });

  it('finishes tied scores as a draw at the end of the second innings', () => {
    const state = {
      phase: 'INNINGS' as const,
      playerA: 'player-a',
      playerB: 'player-b',
      callA: 'ODD' as const,
      callB: 'EVEN' as const,
      tossNumberA: 1,
      tossNumberB: 2,
      tossWinnerId: 'player-a',
      battingPlayerId: 'player-b',
      bowlingPlayerId: 'player-a',
      inningsNumber: 2 as const,
      firstInningsScore: 4,
      scoreA: 4,
      scoreB: null,
      currentInningsScore: 3,
      ballsBowled: 11,
      pendingNumberA: null,
      pendingNumberB: null,
      winnerId: null,
    };

    const result = resolveBall(state, 2, 1);

    expect(result.finished).toBe(true);
    expect(result.winnerId).toBeNull();
    expect(result.state.scoreA).toBe(4);
    expect(result.state.scoreB).toBe(4);
  });
});