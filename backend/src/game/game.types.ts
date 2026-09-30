export type GameType = 'RPS';

export type GameStatus = 'INVITED' | 'PLAYING' | 'FINISHED';

export type RpsChoice = 'ROCK' | 'PAPER' | 'SCISSORS';

export type RpsOutcome = 'WIN' | 'LOSS' | 'DRAW';

export type GameEndReason = 'DECLINED' | 'LEFT' | 'CHAT_ENDED';

export interface GameSession {
  gameId: string;
  sessionId: string;
  gameType: GameType;
  playerA: string;
  playerB: string;
  status: GameStatus;
  createdAt: number;
}

export interface RpsGameSession extends GameSession {
  gameType: 'RPS';
  userAChoice: RpsChoice | null;
  userBChoice: RpsChoice | null;
  winnerId: string | null;
}

export interface GameInvitation {
  gameId: string;
  gameType: GameType;
  inviterId: string;
  inviteeId: string;
}

export interface GameParticipants {
  gameId: string;
  gameType: GameType;
  playerA: string;
  playerB: string;
}

export interface EndedGame extends GameParticipants {
  reason: GameEndReason;
}

export interface RpsPlayerResult {
  playerId: string;
  result: {
    gameId: string;
    yourChoice: RpsChoice;
    opponentChoice: RpsChoice;
    outcome: RpsOutcome;
  };
}

export type ChooseGameResult =
  | { status: 'WAITING'; gameId: string; opponentId: string }
  | { status: 'RESULT'; results: [RpsPlayerResult, RpsPlayerResult] };