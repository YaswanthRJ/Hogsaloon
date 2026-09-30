import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getChatSessionKey } from '../chatsession/chatsession.constants.js';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import type { ChatSession } from '../chatsession/chatsession.types.js';
import { RedisService } from '../redis/redis.service.js';
import { getGameKey, getSessionGameKey } from './game.constants.js';
import { getRpsWinner, isRpsChoice } from './rps.rules.js';
import type {
  ChooseGameResult,
  EndedGame,
  GameEndReason,
  GameInvitation,
  GameParticipants,
  RpsChoice,
  RpsGameSession,
  RpsOutcome,
} from './game.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GAME_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class GameService {
  private readonly createGameScript: string;
  private readonly acceptGameScript: string;
  private readonly endGameScript: string;
  private readonly chooseGameScript: string;

  constructor(
    private readonly redisService: RedisService,
    private readonly chatSessionService: ChatsessionService,
  ) {
    this.createGameScript = this.readScript('create-game.lua');
    this.acceptGameScript = this.readScript('accept-game.lua');
    this.endGameScript = this.readScript('end-game.lua');
    this.chooseGameScript = this.readScript('choose-game.lua');
  }

  async invite(userId: string, gameType: unknown): Promise<GameInvitation> {
    if (gameType !== 'RPS') {
      throw new WsException('Unsupported game type');
    }

    const session = await this.getActiveChatForUser(userId);
    const inviteeId = session.userA === userId ? session.userB : session.userA;
    const gameId = randomUUID();
    const createdAt = Date.now();
    const result = await this.redisService.getClient().eval(
      this.createGameScript,
      3,
      getGameKey(gameId),
      getSessionGameKey(session.sessionId),
      getChatSessionKey(session.sessionId),
      gameId,
      session.sessionId,
      userId,
      inviteeId,
      gameType,
      String(createdAt),
      String(session.expiresAt),
      String(createdAt),
    ) as string[];

    this.expectResult(result, 'OK');

    return { gameId, gameType, inviterId: userId, inviteeId };
  }

  async accept(userId: string, gameIdValue: unknown): Promise<GameParticipants> {
    const gameId = this.parseGameId(gameIdValue);
    const game = await this.getGameForUser(gameId, userId);
    const now = Date.now();
    const result = await this.redisService.getClient().eval(
      this.acceptGameScript,
      3,
      getGameKey(gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      gameId,
      userId,
      String(now),
    ) as string[];

    this.expectResult(result, 'OK');
    return this.getParticipants(game);
  }

  async decline(userId: string, gameIdValue: unknown): Promise<EndedGame> {
    return this.endGame(userId, gameIdValue, 'DECLINE', 'DECLINED');
  }

  async leave(userId: string, gameIdValue: unknown): Promise<EndedGame> {
    return this.endGame(userId, gameIdValue, 'LEAVE', 'LEFT');
  }

  async choose(
    userId: string,
    gameIdValue: unknown,
    choiceValue: unknown,
  ): Promise<ChooseGameResult> {
    const gameId = this.parseGameId(gameIdValue);
    if (!isRpsChoice(choiceValue)) {
      throw new WsException('Invalid Rock Paper Scissors choice');
    }

    const game = await this.getGameForUser(gameId, userId);
    if (game.status !== 'PLAYING') {
      throw new WsException('Game is not in progress');
    }

    const ownChoice = game.playerA === userId ? game.userAChoice : game.userBChoice;
    if (ownChoice) {
      throw new WsException('Player has already chosen');
    }

    const firstResult = await this.runChoiceScript(
      game,
      gameId,
      userId,
      choiceValue,
      false,
      '',
      '',
    );

    if (firstResult[0] === 'WAITING') {
      return {
        status: 'WAITING',
        gameId,
        opponentId: firstResult[1],
      };
    }

    if (firstResult[0] !== 'RESULT_REQUIRED') {
      this.throwForResult(firstResult[0]);
    }

    const opponentChoice = firstResult[1];
    if (!isRpsChoice(opponentChoice)) {
      throw new Error('Invalid stored Rock Paper Scissors choice');
    }

    const choiceA = game.playerA === userId ? choiceValue : opponentChoice;
    const choiceB = game.playerB === userId ? choiceValue : opponentChoice;
    const winnerId = getRpsWinner(choiceA, choiceB, game.playerA, game.playerB);
    const finalResult = await this.runChoiceScript(
      game,
      gameId,
      userId,
      choiceValue,
      true,
      opponentChoice,
      winnerId ?? '',
    );

    this.expectResult(finalResult, 'RESULT');
    return this.createPlayerResults(
      gameId,
      finalResult[1],
      finalResult[2],
      finalResult[3] as RpsChoice,
      finalResult[4] as RpsChoice,
      finalResult[5] || null,
    );
  }

  async endForSession(sessionId: string): Promise<EndedGame | null> {
    const client = this.redisService.getClient();
    const gameId = await client.get(getSessionGameKey(sessionId));
    if (!gameId || !GAME_ID_PATTERN.test(gameId)) {
      return null;
    }

    const game = await this.readGame(gameId);
    if (!game) {
      return null;
    }

    const result = await client.eval(
      this.endGameScript,
      3,
      getGameKey(gameId),
      getSessionGameKey(sessionId),
      getChatSessionKey(sessionId),
      gameId,
      '',
      'CHAT_ENDED',
      String(Date.now()),
    ) as string[];

    if (result[0] === 'GAME_NOT_FOUND' || result[0] === 'GAME_NOT_ACTIVE') {
      return null;
    }

    this.expectResult(result, 'OK');
    return {
      gameId,
      gameType: game.gameType,
      playerA: result[1],
      playerB: result[2],
      reason: 'CHAT_ENDED',
    };
  }

  private async endGame(
    userId: string,
    gameIdValue: unknown,
    action: 'DECLINE' | 'LEAVE',
    reason: Extract<GameEndReason, 'DECLINED' | 'LEFT'>,
  ): Promise<EndedGame> {
    const gameId = this.parseGameId(gameIdValue);
    const game = await this.getGameForUser(gameId, userId);
    const result = await this.redisService.getClient().eval(
      this.endGameScript,
      3,
      getGameKey(gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      gameId,
      userId,
      action,
      String(Date.now()),
    ) as string[];

    this.expectResult(result, 'OK');
    return {
      gameId,
      gameType: game.gameType,
      playerA: result[1],
      playerB: result[2],
      reason,
    };
  }

  private async runChoiceScript(
    game: RpsGameSession,
    gameId: string,
    userId: string,
    choice: RpsChoice,
    finalize: boolean,
    expectedOpponentChoice: string,
    winnerId: string,
  ): Promise<string[]> {
    return await this.redisService.getClient().eval(
      this.chooseGameScript,
      3,
      getGameKey(gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      gameId,
      userId,
      choice,
      finalize ? '1' : '0',
      expectedOpponentChoice,
      winnerId,
      String(Date.now()),
    ) as string[];
  }

  private createPlayerResults(
    gameId: string,
    playerA: string,
    playerB: string,
    choiceA: RpsChoice,
    choiceB: RpsChoice,
    winnerId: string | null,
  ): ChooseGameResult {
    const outcomeFor = (playerId: string): RpsOutcome => {
      if (!winnerId) {
        return 'DRAW';
      }
      return winnerId === playerId ? 'WIN' : 'LOSS';
    };

    return {
      status: 'RESULT',
      results: [
        {
          playerId: playerA,
          result: {
            gameId,
            yourChoice: choiceA,
            opponentChoice: choiceB,
            outcome: outcomeFor(playerA),
          },
        },
        {
          playerId: playerB,
          result: {
            gameId,
            yourChoice: choiceB,
            opponentChoice: choiceA,
            outcome: outcomeFor(playerB),
          },
        },
      ],
    };
  }

  private async getActiveChatForUser(userId: string): Promise<ChatSession> {
    const session = await this.chatSessionService.findByUserId(userId);
    if (!session || !this.isActiveSession(session)) {
      throw new WsException('No active chat session');
    }
    if (session.userA !== userId && session.userB !== userId) {
      throw new WsException('User is not part of this chat');
    }
    return session;
  }

  private async getGameForUser(
    gameId: string,
    userId: string,
  ): Promise<RpsGameSession> {
    const game = await this.readGame(gameId);
    if (!game) {
      throw new WsException('Game not found');
    }
    if (game.playerA !== userId && game.playerB !== userId) {
      throw new WsException('User is not a participant in this game');
    }

    const [session, currentSession] = await Promise.all([
      this.chatSessionService.findById(game.sessionId),
      this.chatSessionService.findByUserId(userId),
    ]);
    if (
      !session ||
      !currentSession ||
      currentSession.sessionId !== game.sessionId ||
      !this.isActiveSession(session) ||
      !this.hasGameParticipants(session, game)
    ) {
      throw new WsException('Chat session is no longer active');
    }

    return game;
  }

  private async readGame(gameId: string): Promise<RpsGameSession | null> {
    const data = await this.redisService.getClient().hgetall(getGameKey(gameId));
    if (!data.gameId) {
      return null;
    }

    return {
      gameId: data.gameId,
      sessionId: data.sessionId,
      gameType: data.gameType as 'RPS',
      playerA: data.playerA,
      playerB: data.playerB,
      status: data.status as RpsGameSession['status'],
      createdAt: Number(data.createdAt),
      userAChoice: isRpsChoice(data.userAChoice) ? data.userAChoice : null,
      userBChoice: isRpsChoice(data.userBChoice) ? data.userBChoice : null,
      winnerId: data.winnerId || null,
    };
  }

  private isActiveSession(session: ChatSession): boolean {
    return session.status === 'ACTIVE' && Date.now() < session.expiresAt;
  }

  private hasGameParticipants(session: ChatSession, game: GameParticipants): boolean {
    return (
      (session.userA === game.playerA && session.userB === game.playerB) ||
      (session.userA === game.playerB && session.userB === game.playerA)
    );
  }

  private getParticipants(game: RpsGameSession): GameParticipants {
    return {
      gameId: game.gameId,
      gameType: game.gameType,
      playerA: game.playerA,
      playerB: game.playerB,
    };
  }

  private parseGameId(value: unknown): string {
    if (typeof value !== 'string' || !GAME_ID_PATTERN.test(value)) {
      throw new WsException('Invalid game ID');
    }
    return value;
  }

  private expectResult(result: string[], expected: string): void {
    if (result[0] !== expected) {
      this.throwForResult(result[0]);
    }
  }

  private throwForResult(code: string): never {
    const messages: Record<string, string> = {
      ACTIVE_GAME_EXISTS: 'A game is already active in this chat',
      ALREADY_CHOSEN: 'Player has already chosen',
      CHAT_INACTIVE: 'Chat session is no longer active',
      GAME_ID_EXISTS: 'Could not create game',
      GAME_NOT_ACTIVE: 'Game is no longer active',
      GAME_NOT_FOUND: 'Game not found',
      INVALID_ACTION: 'Invalid game action',
      INVALID_CHOICE: 'Invalid Rock Paper Scissors choice',
      INVALID_RESULT_STATE: 'Game choices changed; retry your choice',
      INVALID_STATUS: 'Game is not in the required state',
      NOT_INVITEE: 'Only the invited player can accept or decline',
      NOT_PLAYER: 'User is not a participant in this game',
    };
    throw new WsException(messages[code] ?? 'Game action could not be completed');
  }

  private readScript(fileName: string): string {
    return readFileSync(join(__dirname, 'scripts', fileName), 'utf8');
  }
}