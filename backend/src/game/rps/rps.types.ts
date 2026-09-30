export type RpsChoice = 'ROCK' | 'PAPER' | 'SCISSORS';

export type RpsOutcome = 'WIN' | 'LOSS' | 'DRAW';

export interface RpsScore {
  round: number;
  winsA: number;
  winsB: number;
}

export interface RpsMatchState extends RpsScore {
  choiceA: RpsChoice | null;
  choiceB: RpsChoice | null;
}

export interface RpsRoundResolution extends RpsScore {
  roundWinnerId: string | null;
  matchWinnerId: string | null;
  finished: boolean;
}

export type RpsActionResult =
  | { status: 'WAITING'; gameId: string; opponentId: string }
  | {
      status: 'ROUND_RESULT';
      gameId: string;
      round: number;
      choiceA: RpsChoice;
      choiceB: RpsChoice;
      winsA: number;
      winsB: number;
      roundWinnerId: string | null;
      matchWinnerId: string | null;
      finished: boolean;
      playerA: string;
      playerB: string;
    };