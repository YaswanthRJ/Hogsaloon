export type GameType = 'RPS' | 'HAND_CRICKET';

export type GameStatus = 'INVITED' | 'PLAYING' | 'FINISHED';

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

export interface GameSnapshot extends GameSession {
  state: Record<string, unknown>;
  stateJson: string;
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

export interface GameStarted extends GameParticipants {
  state: Record<string, unknown>;
}

export interface EndedGame extends GameParticipants {
  reason: GameEndReason;
}
