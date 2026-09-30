import { create } from 'zustand';

export type GameType = 'RPS' | 'HAND_CRICKET';
export type OpponentChoicePhase = 'RPS' | 'TOSS' | 'BALL';

export interface GameInvitation {
  gameId: string;
  gameType: GameType;
  inviterId: string;
  notificationId: string;
}

export interface StartedGame {
  gameId: string;
  gameType: GameType;
  state: Record<string, unknown>;
}

export interface RpsRoundResult {
  gameId: string;
  round: number;
  yourChoice: 'ROCK' | 'PAPER' | 'SCISSORS';
  opponentChoice: 'ROCK' | 'PAPER' | 'SCISSORS';
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  yourWins: number;
  opponentWins: number;
}

export interface HandCricketBallResult {
  gameId: string;
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
  scoreA: number | null;
  scoreB: number | null;
  nextBattingPlayerId: string | null;
  nextBowlingPlayerId: string | null;
  inningsNumber: 1 | 2;
  nextInningsNumber: 1 | 2 | null;
}

export interface GameResult {
  gameId: string;
  gameType: GameType;
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
  outcome: 'WINNER' | 'DRAW';
}

export interface ActiveGame extends StartedGame {
  waitingPhase: OpponentChoicePhase | null;
  opponentChoicePhase: OpponentChoicePhase | null;
  lastRpsRound: RpsRoundResult | null;
  lastHandCricketBall: HandCricketBallResult | null;
  result: GameResult | null;
}

interface GameStore {
  invitation: GameInvitation | null;
  activeGame: ActiveGame | null;
  setInvitation: (invitation: GameInvitation) => void;
  clearInvitation: () => string | null;
  startGame: (game: StartedGame) => string | null;
  setOpponentWaiting: (phase: OpponentChoicePhase) => void;
  setOpponentChose: (phase: OpponentChoicePhase) => void;
  clearWaiting: () => void;
  setRpsRound: (result: RpsRoundResult) => void;
  setTossResult: (result: Record<string, unknown>) => void;
  setInningsStarted: (result: Record<string, unknown>) => void;
  setHandCricketBall: (result: HandCricketBallResult) => void;
  setResult: (result: GameResult) => void;
  dismissFinishedGame: () => void;
  reset: () => string | null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  invitation: null,
  activeGame: null,

  setInvitation: (invitation) => set({ invitation }),

  clearInvitation: () => {
    const notificationId = get().invitation?.notificationId ?? null;
    set({ invitation: null });
    return notificationId;
  },

  startGame: (game) => {
    const notificationId = get().invitation?.notificationId ?? null;
    set({
      invitation: null,
      activeGame: {
        ...game,
        waitingPhase: null,
        opponentChoicePhase: null,
        lastRpsRound: null,
        lastHandCricketBall: null,
        result: null,
      },
    });
    return notificationId;
  },

  setOpponentWaiting: (phase) => {
    set((state) => ({
      activeGame: state.activeGame
        ? { ...state.activeGame, waitingPhase: phase }
        : null,
    }));
  },

  setOpponentChose: (phase) => {
    set((state) => ({
      activeGame: state.activeGame
        ? { ...state.activeGame, opponentChoicePhase: phase }
        : null,
    }));
  },

  clearWaiting: () => {
    set((state) => ({
      activeGame: state.activeGame
        ? { ...state.activeGame, waitingPhase: null }
        : null,
    }));
  },

  setRpsRound: (result) => {
    set((state) => ({
      activeGame: state.activeGame
        ? {
            ...state.activeGame,
            waitingPhase: null,
            opponentChoicePhase: null,
            lastRpsRound: result,
            state: {
              ...state.activeGame.state,
              round: result.round + 1,
            },
          }
        : null,
    }));
  },

  setTossResult: (result) => {
    set((state) => ({
      activeGame: state.activeGame
        ? {
            ...state.activeGame,
            waitingPhase: null,
            opponentChoicePhase: null,
            state: { ...state.activeGame.state, ...result, phase: 'TOSS_DECISION' },
          }
        : null,
    }));
  },

  setInningsStarted: (result) => {
    set((state) => ({
      activeGame: state.activeGame
        ? {
            ...state.activeGame,
            waitingPhase: null,
            opponentChoicePhase: null,
            state: {
              ...state.activeGame.state,
              ...result,
              phase: 'INNINGS',
              currentInningsScore: 0,
              ballsBowled: 0,
              pendingNumberA: null,
              pendingNumberB: null,
            },
          }
        : null,
    }));
  },

  setHandCricketBall: (result) => {
    set((state) => ({
      activeGame: state.activeGame
        ? {
            ...state.activeGame,
            waitingPhase: null,
            opponentChoicePhase: null,
            lastHandCricketBall: result,
            state: {
              ...state.activeGame.state,
              scoreA: result.scoreA,
              scoreB: result.scoreB,
              currentInningsScore: result.ball.inningsScore,
              ballsBowled: result.ball.ballNumber,
              pendingNumberA: null,
              pendingNumberB: null,
            },
          }
        : null,
    }));
  },

  setResult: (result) => {
    set((state) => ({
      activeGame: state.activeGame
        ? { ...state.activeGame, waitingPhase: null, result }
        : null,
    }));
  },

  dismissFinishedGame: () => {
    set((state) => ({
      activeGame: state.activeGame?.result ? null : state.activeGame,
    }));
  },

  reset: () => {
    const notificationId = get().invitation?.notificationId ?? null;
    set({ invitation: null, activeGame: null });
    return notificationId;
  },
}));