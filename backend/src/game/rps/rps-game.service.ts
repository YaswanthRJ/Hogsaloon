import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getChatSessionKey } from '../../chatsession/chatsession.constants.js';
import { getGameKey, getSessionGameKey } from '../game.constants.js';
import type { GameSnapshot } from '../game.types.js';
import { RedisService } from '../../redis/redis.service.js';
import { isRpsChoice, resolveRpsRound } from './rps.rules.js';
import type { RpsActionResult, RpsMatchState } from './rps.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class RpsGameService {
  private readonly script: string;

  constructor(private readonly redisService: RedisService) {
    this.script = readFileSync(
      join(__dirname, 'scripts', 'rps-game.lua'),
      'utf8',
    );
  }

  createInitialState(): RpsMatchState {
    return {
      round: 1,
      winsA: 0,
      winsB: 0,
      choiceA: null,
      choiceB: null,
    };
  }

  async choose(
    game: GameSnapshot,
    userId: string,
    choiceValue: unknown,
  ): Promise<RpsActionResult> {
    if (!isRpsChoice(choiceValue)) {
      throw new WsException('Invalid Rock Paper Scissors choice');
    }

    const choice = choiceValue;
    const client = this.redisService.getClient();
    const firstResult = await client.eval(
      this.script,
      3,
      getGameKey(game.gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      'COMMIT',
      game.gameId,
      userId,
      choice,
      String(Date.now()),
    ) as string[];

    if (firstResult[0] === 'WAITING') {
      return {
        status: 'WAITING',
        gameId: game.gameId,
        opponentId: firstResult[1],
      };
    }
    if (firstResult[0] !== 'RESULT_REQUIRED') {
      this.throwForResult(firstResult[0]);
    }

    const storedState = JSON.parse(firstResult[1]) as RpsMatchState;
    const choiceA = game.playerA === userId ? choice : storedState.choiceA;
    const choiceB = game.playerB === userId ? choice : storedState.choiceB;
    if (!isRpsChoice(choiceA) || !isRpsChoice(choiceB)) {
      throw new Error('Invalid stored Rock Paper Scissors choices');
    }

    const resolution = resolveRpsRound(
      storedState,
      choiceA,
      choiceB,
      game.playerA,
      game.playerB,
    );
    const nextState: RpsMatchState = {
      round: resolution.finished ? resolution.round : resolution.round + 1,
      winsA: resolution.winsA,
      winsB: resolution.winsB,
      choiceA: null,
      choiceB: null,
    };

    const finalResult = await client.eval(
      this.script,
      3,
      getGameKey(game.gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      'FINALIZE',
      game.gameId,
      userId,
      choice,
      String(Date.now()),
      firstResult[1],
      JSON.stringify(nextState),
      firstResult[2],
      resolution.finished ? '1' : '0',
    ) as string[];

    if (finalResult[0] !== 'ROUND_RESULT') {
      this.throwForResult(finalResult[0]);
    }

    return {
      status: 'ROUND_RESULT',
      gameId: game.gameId,
      round: resolution.round,
      choiceA,
      choiceB,
      winsA: resolution.winsA,
      winsB: resolution.winsB,
      roundWinnerId: resolution.roundWinnerId,
      matchWinnerId: resolution.matchWinnerId,
      finished: resolution.finished,
      playerA: game.playerA,
      playerB: game.playerB,
    };
  }

  private throwForResult(code: string): never {
    const messages: Record<string, string> = {
      ALREADY_CHOSEN: 'Player has already chosen this round',
      CHAT_INACTIVE: 'Chat session is no longer active',
      GAME_NOT_ACTIVE: 'Game is no longer active',
      GAME_NOT_FOUND: 'Game not found',
      INVALID_STATUS: 'Game is not in progress',
      NOT_PLAYER: 'User is not a participant in this game',
      RESULT_STATE_CHANGED: 'Game round changed; retry your choice',
    };
    throw new WsException(messages[code] ?? 'Game action could not be completed');
  }
}