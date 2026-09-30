import type { RpsChoice } from './game.types.js';

export function isRpsChoice(value: unknown): value is RpsChoice {
  return value === 'ROCK' || value === 'PAPER' || value === 'SCISSORS';
}

export function getRpsWinner(
  choiceA: RpsChoice,
  choiceB: RpsChoice,
  playerA: string,
  playerB: string,
): string | null {
  if (choiceA === choiceB) {
    return null;
  }

  const playerAWins =
    (choiceA === 'ROCK' && choiceB === 'SCISSORS') ||
    (choiceA === 'PAPER' && choiceB === 'ROCK') ||
    (choiceA === 'SCISSORS' && choiceB === 'PAPER');

  return playerAWins ? playerA : playerB;
}