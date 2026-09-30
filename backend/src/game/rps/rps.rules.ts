import type { RpsChoice, RpsRoundResolution, RpsScore } from './rps.types.js';

export const RPS_MAX_ROUNDS = 5;
export const RPS_WINS_TO_MATCH = 3;

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

export function resolveRpsRound(
  score: RpsScore,
  choiceA: RpsChoice,
  choiceB: RpsChoice,
  playerA: string,
  playerB: string,
): RpsRoundResolution {
  const roundWinnerId = getRpsWinner(choiceA, choiceB, playerA, playerB);
  const winsA = score.winsA + (roundWinnerId === playerA ? 1 : 0);
  const winsB = score.winsB + (roundWinnerId === playerB ? 1 : 0);
  const finished =
    winsA >= RPS_WINS_TO_MATCH ||
    winsB >= RPS_WINS_TO_MATCH ||
    score.round >= RPS_MAX_ROUNDS;

  let matchWinnerId: string | null = null;
  if (winsA !== winsB && (winsA >= RPS_WINS_TO_MATCH || winsB >= RPS_WINS_TO_MATCH || finished)) {
    matchWinnerId = winsA > winsB ? playerA : playerB;
  }

  return {
    round: score.round,
    winsA,
    winsB,
    roundWinnerId,
    matchWinnerId,
    finished,
  };
}

export function getRpsOutcome(
  playerId: string,
  matchWinnerId: string | null,
): 'WIN' | 'LOSS' | 'DRAW' {
  if (!matchWinnerId) {
    return 'DRAW';
  }
  return playerId === matchWinnerId ? 'WIN' : 'LOSS';
}