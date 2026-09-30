import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getChatSessionKey } from '../../chatsession/chatsession.constants.js';
import { getGameKey, getSessionGameKey } from '../game.constants.js';
import type { GameSnapshot } from '../game.types.js';
import { RedisService } from '../../redis/redis.service.js';
import {
  beginInnings,
  createHandCricketState,
  resolveBall,
  resolveToss,
  validateHandNumber,
} from './hand-cricket.rules.js';
import type {
  BatOrBowl,
  HandCricketInningsStarted,
  HandCricketNumberResult,
  HandCricketState,
} from './hand-cricket.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class HandCricketGameService {
  private readonly numberScript: string;
  private readonly decisionScript: string;

  constructor(private readonly redisService: RedisService) {
    this.numberScript = readFileSync(
      join(__dirname, 'scripts', 'hand-cricket-number.lua'),
      'utf8',
    );
    this.decisionScript = readFileSync(
      join(__dirname, 'scripts', 'hand-cricket-decision.lua'),
      'utf8',
    );
  }

  createInitialState(playerA: string, playerB: string): HandCricketState {
    return createHandCricketState(
      playerA,
      playerB,
      () => randomInt(0, 2) / 2,
    );
  }

  async submitTossNumber(
    game: GameSnapshot,
    userId: string,
    value: unknown,
  ): Promise<HandCricketNumberResult> {
    if (!validateHandNumber(value)) {
      throw new WsException('Toss numbers must be between 1 and 10');
    }

    const result = await this.submitNumber(game, userId, value, 'TOSS');
    if (result[0] === 'WAITING') {
      return {
        status: 'WAITING',
        gameId: game.gameId,
        opponentId: result[1],
        phase: 'TOSS',
      };
    }
    if (result[0] !== 'RESOLVE') {
      this.throwForResult(result[0]);
    }

    const oldState = JSON.parse(result[1]) as HandCricketState;
    const numberA = userId === game.playerA ? value : Number(result[2]);
    const numberB = userId === game.playerB ? value : Number(result[2]);
    const nextState = resolveToss(oldState, numberA, numberB);
    const finalized = await this.finalizeNumbers(
      game,
      userId,
      value,
      'TOSS',
      result[1],
      nextState,
      Number(result[2]),
    );
    this.expectOk(finalized);

    const winningCall = (numberA + numberB) % 2 === 0 ? 'EVEN' : 'ODD';
    return {
      status: 'TOSS_RESULT',
      gameId: game.gameId,
      callA: oldState.callA,
      callB: oldState.callB,
      numberA,
      numberB,
      winningCall,
      tossWinnerId: nextState.tossWinnerId!,
      playerA: game.playerA,
      playerB: game.playerB,
    };
  }

  async chooseBatOrBowl(
    game: GameSnapshot,
    userId: string,
    decisionValue: unknown,
  ): Promise<HandCricketInningsStarted> {
    if (decisionValue !== 'BAT' && decisionValue !== 'BOWL') {
      throw new WsException('Decision must be BAT or BOWL');
    }
    const decision = decisionValue as BatOrBowl;
    const state = game.state as unknown as HandCricketState;
    const nextState = beginInnings(state, decision);
    const result = await this.redisService.getClient().eval(
      this.decisionScript,
      3,
      getGameKey(game.gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      game.gameId,
      userId,
      String(Date.now()),
      game.stateJson,
      JSON.stringify(nextState),
    ) as string[];
    this.expectOk(result);

    return {
      gameId: game.gameId,
      inningsNumber: 1,
      battingPlayerId: nextState.battingPlayerId!,
      bowlingPlayerId: nextState.bowlingPlayerId!,
      target: null,
    };
  }

  async submitBallNumber(
    game: GameSnapshot,
    userId: string,
    value: unknown,
  ): Promise<HandCricketNumberResult> {
    if (!validateHandNumber(value)) {
      throw new WsException('Ball numbers must be between 1 and 10');
    }
    const result = await this.submitNumber(game, userId, value, 'INNINGS');
    if (result[0] === 'WAITING') {
      return {
        status: 'WAITING',
        gameId: game.gameId,
        opponentId: result[1],
        phase: 'INNINGS',
      };
    }
    if (result[0] !== 'RESOLVE') {
      this.throwForResult(result[0]);
    }

    const oldState = JSON.parse(result[1]) as HandCricketState;
    const numberA = userId === game.playerA ? value : Number(result[2]);
    const numberB = userId === game.playerB ? value : Number(result[2]);
    const resolution = resolveBall(oldState, numberA, numberB);
    const finalized = await this.finalizeNumbers(
      game,
      userId,
      value,
      'INNINGS',
      result[1],
      resolution.state,
      Number(result[2]),
    );
    this.expectOk(finalized);

    return {
      status: 'BALL_RESULT',
      gameId: game.gameId,
      ball: resolution.ball,
      inningsEnded: resolution.inningsEnded,
      finished: resolution.finished,
      winnerId: resolution.winnerId,
      scoreA: resolution.state.scoreA,
      scoreB: resolution.state.scoreB,
      nextBattingPlayerId: resolution.finished
        ? null
        : resolution.state.battingPlayerId,
      nextBowlingPlayerId: resolution.finished
        ? null
        : resolution.state.bowlingPlayerId,
      inningsNumber: resolution.ball.inningsNumber,
      nextInningsNumber: resolution.finished
        ? null
        : resolution.inningsEnded
          ? resolution.state.inningsNumber
          : null,
    };
  }

  private async submitNumber(
    game: GameSnapshot,
    userId: string,
    value: number,
    phase: 'TOSS' | 'INNINGS',
  ): Promise<string[]> {
    return await this.redisService.getClient().eval(
      this.numberScript,
      3,
      getGameKey(game.gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      'COMMIT',
      phase,
      game.gameId,
      userId,
      String(value),
      String(Date.now()),
    ) as string[];
  }

  private async finalizeNumbers(
    game: GameSnapshot,
    userId: string,
    value: number,
    phase: 'TOSS' | 'INNINGS',
    expectedStateJson: string,
    nextState: HandCricketState,
    opponentNumber: number,
  ): Promise<string[]> {
    return await this.redisService.getClient().eval(
      this.numberScript,
      3,
      getGameKey(game.gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      'FINALIZE',
      phase,
      game.gameId,
      userId,
      String(value),
      String(Date.now()),
      expectedStateJson,
      JSON.stringify(nextState),
      String(opponentNumber),
      nextState.phase === 'FINISHED' ? '1' : '0',
    ) as Promise<string[]>;
  }

  private expectOk(result: string[]): void {
    if (result[0] !== 'OK') {
      this.throwForResult(result[0]);
    }
  }

  private throwForResult(code: string): never {
    const messages: Record<string, string> = {
      ALREADY_SUBMITTED: 'Player already submitted for this phase',
      CHAT_INACTIVE: 'Chat session is no longer active',
      GAME_NOT_ACTIVE: 'Game is no longer active',
      GAME_NOT_FOUND: 'Game not found',
      INVALID_PHASE: 'Game is not in the required phase',
      NOT_PLAYER: 'User is not a participant in this game',
      NOT_TOSS_WINNER: 'Only the toss winner can choose to bat or bowl',
      STATE_CHANGED: 'Game state changed; retry your action',
    };
    throw new WsException(messages[code] ?? 'Game action could not be completed');
  }
}