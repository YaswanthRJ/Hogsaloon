import { WsException } from '@nestjs/websockets';
import type {
  BatOrBowl,
  HandCricketBallResolution,
  HandCricketState,
} from './hand-cricket.types.js';

export const HAND_CRICKET_MAX_BALLS = 12;

export function createHandCricketState(
  playerA: string,
  playerB: string,
  random: () => number = Math.random,
): HandCricketState {
  const playerACall = random() < 0.5 ? 'ODD' : 'EVEN';
  return {
    phase: 'TOSS',
    playerA,
    playerB,
    callA: playerACall,
    callB: playerACall === 'ODD' ? 'EVEN' : 'ODD',
    tossNumberA: null,
    tossNumberB: null,
    tossWinnerId: null,
    battingPlayerId: null,
    bowlingPlayerId: null,
    inningsNumber: null,
    firstInningsScore: null,
    scoreA: null,
    scoreB: null,
    currentInningsScore: 0,
    ballsBowled: 0,
    pendingNumberA: null,
    pendingNumberB: null,
    winnerId: null,
  };
}

export function validateHandNumber(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 10;
}

export function resolveToss(
  state: HandCricketState,
  numberA: number,
  numberB: number,
): HandCricketState {
  assertTossInput(state, numberA, numberB);

  const winningCall = (numberA + numberB) % 2 === 0 ? 'EVEN' : 'ODD';
  const tossWinnerId = state.callA === winningCall ? state.playerA : state.playerB;

  return {
    ...state,
    phase: 'TOSS_DECISION',
    tossNumberA: numberA,
    tossNumberB: numberB,
    tossWinnerId,
    pendingNumberA: null,
    pendingNumberB: null,
  };
}

export function beginInnings(
  state: HandCricketState,
  decision: BatOrBowl,
): HandCricketState {
  if (state.phase !== 'TOSS_DECISION' || !state.tossWinnerId) {
    throw new WsException('Toss decision is not available');
  }

  const otherPlayerId =
    state.tossWinnerId === state.playerA ? state.playerB : state.playerA;
  const battingPlayerId = decision === 'BAT' ? state.tossWinnerId : otherPlayerId;

  return {
    ...state,
    phase: 'INNINGS',
    battingPlayerId,
    bowlingPlayerId:
      battingPlayerId === state.playerA ? state.playerB : state.playerA,
    inningsNumber: 1,
    firstInningsScore: null,
    scoreA: null,
    scoreB: null,
    currentInningsScore: 0,
    ballsBowled: 0,
  };
}

export function resolveBall(
  state: HandCricketState,
  numberA: number,
  numberB: number,
): HandCricketBallResolution {
  if (
    state.phase !== 'INNINGS' ||
    !state.inningsNumber ||
    !state.battingPlayerId ||
    !state.bowlingPlayerId
  ) {
    throw new WsException('An innings is not in progress');
  }
  if (!validateHandNumber(numberA) || !validateHandNumber(numberB)) {
    throw new WsException('Hand cricket numbers must be between 1 and 10');
  }
  if (state.ballsBowled >= HAND_CRICKET_MAX_BALLS) {
    throw new WsException('Innings ball limit reached');
  }

  const batterNumber =
    state.battingPlayerId === state.playerA ? numberA : numberB;
  const bowlerNumber =
    state.bowlingPlayerId === state.playerA ? numberA : numberB;
  const out = batterNumber === bowlerNumber;
  const runs = out ? 0 : batterNumber;
  const ballsBowled = state.ballsBowled + 1;
  const currentInningsScore = state.currentInningsScore + runs;
  const passedTarget =
    state.inningsNumber === 2 &&
    currentInningsScore > (state.firstInningsScore ?? -1);
  const inningsEnded =
    out || ballsBowled >= HAND_CRICKET_MAX_BALLS || passedTarget;

  let nextState: HandCricketState = {
    ...state,
    currentInningsScore,
    ballsBowled,
    pendingNumberA: null,
    pendingNumberB: null,
  };
  let finished = false;
  let winnerId: string | null = null;

  if (inningsEnded && state.inningsNumber === 1) {
    const firstInningsScore = currentInningsScore;
    nextState = {
      ...nextState,
      inningsNumber: 2,
      firstInningsScore,
      scoreA: state.battingPlayerId === state.playerA ? firstInningsScore : null,
      scoreB: state.battingPlayerId === state.playerB ? firstInningsScore : null,
      battingPlayerId: state.bowlingPlayerId,
      bowlingPlayerId: state.battingPlayerId,
      currentInningsScore: 0,
      ballsBowled: 0,
    };
  } else if (inningsEnded) {
    const scoreA = state.battingPlayerId === state.playerA
      ? currentInningsScore
      : state.scoreA ?? 0;
    const scoreB = state.battingPlayerId === state.playerB
      ? currentInningsScore
      : state.scoreB ?? 0;
    winnerId = scoreA === scoreB
      ? null
      : scoreA > scoreB
        ? state.playerA
        : state.playerB;
    finished = true;
    nextState = {
      ...nextState,
      phase: 'FINISHED',
      scoreA,
      scoreB,
      winnerId,
    };
  } else if (state.inningsNumber === 1) {
    nextState = {
      ...nextState,
      scoreA: state.battingPlayerId === state.playerA ? currentInningsScore : null,
      scoreB: state.battingPlayerId === state.playerB ? currentInningsScore : null,
    };
  }

  return {
    state: nextState,
    ball: {
      inningsNumber: state.inningsNumber,
      ballNumber: ballsBowled,
      batterId: state.battingPlayerId,
      batterNumber,
      bowlerId: state.bowlingPlayerId,
      bowlerNumber,
      runs,
      out,
      inningsScore: currentInningsScore,
    },
    inningsEnded,
    finished,
    winnerId,
  };
}

function assertTossInput(
  state: HandCricketState,
  numberA: number,
  numberB: number,
): void {
  if (state.phase !== 'TOSS') {
    throw new WsException('Toss is not in progress');
  }
  if (!validateHandNumber(numberA) || !validateHandNumber(numberB)) {
    throw new WsException('Toss numbers must be between 1 and 10');
  }
}