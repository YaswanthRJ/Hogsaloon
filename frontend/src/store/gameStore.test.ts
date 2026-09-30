import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('keeps opponent submission separate from the local pending choice', () => {
    useGameStore.getState().startGame({
      gameId: 'game-1',
      gameType: 'RPS',
      state: { round: 1, winsA: 0, winsB: 0 },
    });
    useGameStore.getState().setOpponentChose('RPS');

    expect(useGameStore.getState().activeGame?.opponentChoicePhase).toBe('RPS');
    expect(useGameStore.getState().activeGame?.waitingPhase).toBeNull();

    useGameStore.getState().setOpponentWaiting('RPS');
    expect(useGameStore.getState().activeGame?.waitingPhase).toBe('RPS');
  });

  it('keeps the final result visible until the user dismisses it', () => {
    useGameStore.getState().startGame({
      gameId: 'game-2',
      gameType: 'RPS',
      state: {},
    });
    useGameStore.getState().setResult({
      gameId: 'game-2',
      gameType: 'RPS',
      winnerId: 'player-a',
      scoreA: 3,
      scoreB: 1,
      outcome: 'WINNER',
    });

    expect(useGameStore.getState().activeGame?.result?.scoreA).toBe(3);
    useGameStore.getState().dismissFinishedGame();
    expect(useGameStore.getState().activeGame).toBeNull();
  });
});