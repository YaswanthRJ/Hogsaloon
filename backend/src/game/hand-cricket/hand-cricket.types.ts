export type TossCall = 'ODD' | 'EVEN';

export type BatOrBowl = 'BAT' | 'BOWL';

export type HandCricketPhase =
  | 'TOSS'
  | 'TOSS_DECISION'
  | 'INNINGS'
  | 'FINISHED';

export interface HandCricketState {
  phase: HandCricketPhase;
  playerA: string;
  playerB: string;
  callA: TossCall;
  callB: TossCall;
  tossNumberA: number | null;
  tossNumberB: number | null;
  tossWinnerId: string | null;
  battingPlayerId: string | null;
  bowlingPlayerId: string | null;
  inningsNumber: 1 | 2 | null;
  firstInningsScore: number | null;
  scoreA: number | null;
  scoreB: number | null;
  currentInningsScore: number;
  ballsBowled: number;
  pendingNumberA: number | null;
  pendingNumberB: number | null;
  winnerId: string | null;
}

export interface HandCricketBallResolution {
  state: HandCricketState;
  ball: {
    inningsNumber: 1 | 2;
    ballNumber: number;
    batterId: string;
    batterNumber: number;
    bowlerId: string;
    bowlerNumber: number;
    runs: number;
    out: boolean;
    inningsScore: number;
  };
  inningsEnded: boolean;
  finished: boolean;
  winnerId: string | null;
}

export type HandCricketNumberResult =
  | { status: 'WAITING'; gameId: string; opponentId: string; phase: 'TOSS' | 'INNINGS' }
  | {
      status: 'TOSS_RESULT';
      gameId: string;
      callA: TossCall;
      callB: TossCall;
      numberA: number;
      numberB: number;
      winningCall: TossCall;
      tossWinnerId: string;
      playerA: string;
      playerB: string;
    }
  | {
      status: 'BALL_RESULT';
      gameId: string;
      ball: HandCricketBallResolution['ball'];
      inningsEnded: boolean;
      finished: boolean;
      winnerId: string | null;
      scoreA: number | null;
      scoreB: number | null;
      nextBattingPlayerId: string | null;
      nextBowlingPlayerId: string | null;
      inningsNumber: 1 | 2;
      nextInningsNumber: 1 | 2 | null;
    };

export interface HandCricketInningsStarted {
  gameId: string;
  inningsNumber: 1 | 2;
  battingPlayerId: string;
  bowlingPlayerId: string;
  target: number | null;
}