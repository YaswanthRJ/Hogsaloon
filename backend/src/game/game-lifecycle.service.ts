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
import { HandCricketGameService } from './hand-cricket/hand-cricket-game.service.js';
import type {
  HandCricketInningsStarted,
  HandCricketNumberResult,
} from './hand-cricket/hand-cricket.types.js';
import { getGameKey, getSessionGameKey } from './game.constants.js';
import { RpsGameService } from './rps/rps-game.service.js';
import type { RpsActionResult } from './rps/rps.types.js';
import type {
  EndedGame,
  GameEndReason,
  GameInvitation,
  GameSnapshot,
  GameStarted,
  GameType,
} from './game.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GAME_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class GameLifecycleService {
  private readonly createGameScript: string;
  private readonly acceptGameScript: string;
  private readonly endGameScript: string;

  constructor(
    private readonly redisService: RedisService,
    private readonly chatSessionService: ChatsessionService,
    private readonly rpsGameService: RpsGameService,
    private readonly handCricketGameService: HandCricketGameService,
  ) {
    this.createGameScript = this.readScript('create-game.lua');
    this.acceptGameScript = this.readScript('accept-game.lua');
    this.endGameScript = this.readScript('end-game.lua');
  }

  async invite(userId: string, gameTypeValue: unknown): Promise<GameInvitation> {
    if (gameTypeValue !== 'RPS' && gameTypeValue !== 'HAND_CRICKET') {
      throw new WsException('Unsupported game type');
    }
    const gameType: GameType = gameTypeValue;
    const session = await this.getActiveChatForUser(userId);
    const inviteeId = session.userA === userId ? session.userB : session.userA;
    const gameId = randomUUID();
    const createdAt = Date.now();
    const state = this.createInitialState(gameType, session.userA, session.userB);
    const result = await this.redisService.getClient().eval(
      this.createGameScript,
      3,
      getGameKey(gameId),
      getSessionGameKey(session.sessionId),
      getChatSessionKey(session.sessionId),
      gameId,
      session.sessionId,
      session.userA,
      session.userB,
      gameType,
      String(createdAt),
      JSON.stringify(state),
      String(session.expiresAt),
      String(createdAt),
    ) as string[];
    this.expectResult(result, 'OK');
    return { gameId, gameType, inviterId: userId, inviteeId };
  }

  async accept(userId: string, gameIdValue: unknown): Promise<GameStarted> {
    const gameId = this.parseGameId(gameIdValue);
    const game = await this.getGameForUser(gameId, userId);
    const result = await this.redisService.getClient().eval(
      this.acceptGameScript,
      3,
      getGameKey(gameId),
      getSessionGameKey(game.sessionId),
      getChatSessionKey(game.sessionId),
      gameId,
      userId,
      String(Date.now()),
    ) as string[];
    this.expectResult(result, 'OK');
    return {
      gameId,
      gameType: game.gameType,
      playerA: game.playerA,
      playerB: game.playerB,
      state: game.state,
    };
  }

  async decline(userId: string, gameIdValue: unknown): Promise<EndedGame> {
    return this.endGame(userId, gameIdValue, 'DECLINE', 'DECLINED');
  }

  async leave(userId: string, gameIdValue: unknown): Promise<EndedGame> {
    return this.endGame(userId, gameIdValue, 'LEAVE', 'LEFT');
  }

  async chooseRps(
    userId: string,
    gameIdValue: unknown,
    choice: unknown,
  ): Promise<RpsActionResult> {
    const game = await this.getGameForUser(this.parseGameId(gameIdValue), userId);
    if (game.gameType !== 'RPS') {
      throw new WsException('Game is not Rock Paper Scissors');
    }
    return this.rpsGameService.choose(game, userId, choice);
  }

  async submitHandCricketToss(
    userId: string,
    gameIdValue: unknown,
    number: unknown,
  ): Promise<HandCricketNumberResult> {
    const game = await this.getGameForUser(this.parseGameId(gameIdValue), userId);
    if (game.gameType !== 'HAND_CRICKET') {
      throw new WsException('Game is not Hand Cricket');
    }
    return this.handCricketGameService.submitTossNumber(game, userId, number);
  }

  async chooseHandCricketBatOrBowl(
    userId: string,
    gameIdValue: unknown,
    decision: unknown,
  ): Promise<HandCricketInningsStarted> {
    const game = await this.getGameForUser(this.parseGameId(gameIdValue), userId);
    if (game.gameType !== 'HAND_CRICKET') {
      throw new WsException('Game is not Hand Cricket');
    }
    return this.handCricketGameService.chooseBatOrBowl(game, userId, decision);
  }

  async submitHandCricketBall(
    userId: string,
    gameIdValue: unknown,
    number: unknown,
  ): Promise<HandCricketNumberResult> {
    const game = await this.getGameForUser(this.parseGameId(gameIdValue), userId);
    if (game.gameType !== 'HAND_CRICKET') {
      throw new WsException('Game is not Hand Cricket');
    }
    return this.handCricketGameService.submitBallNumber(game, userId, number);
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

  async getGameForUser(gameId: string, userId: string): Promise<GameSnapshot> {
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

  private async readGame(gameId: string): Promise<GameSnapshot | null> {
    const data = await this.redisService.getClient().hgetall(getGameKey(gameId));
    if (!data.gameId) {
      return null;
    }
    if (data.gameType !== 'RPS' && data.gameType !== 'HAND_CRICKET') {
      throw new WsException('Unsupported stored game type');
    }
    return {
      gameId: data.gameId,
      sessionId: data.sessionId,
      gameType: data.gameType,
      playerA: data.playerA,
      playerB: data.playerB,
      status: data.status as GameSnapshot['status'],
      createdAt: Number(data.createdAt),
      state: JSON.parse(data.state) as Record<string, unknown>,
      stateJson: data.state,
    };
  }

  private createInitialState(
    gameType: GameType,
    playerA: string,
    playerB: string,
  ): Record<string, unknown> {
    if (gameType === 'RPS') {
      return this.rpsGameService.createInitialState() as unknown as Record<string, unknown>;
    }
    return this.handCricketGameService.createInitialState(playerA, playerB) as unknown as Record<string, unknown>;
  }

  private isActiveSession(session: ChatSession): boolean {
    return session.status === 'ACTIVE' && Date.now() < session.expiresAt;
  }

  private hasGameParticipants(session: ChatSession, game: GameSnapshot): boolean {
    return (
      (session.userA === game.playerA && session.userB === game.playerB) ||
      (session.userA === game.playerB && session.userB === game.playerA)
    );
  }

  private parseGameId(value: unknown): string {
    if (typeof value !== 'string' || !GAME_ID_PATTERN.test(value)) {
      throw new WsException('Invalid game ID');
    }
    return value;
  }

  private expectResult(result: string[], expected: string): void {
    if (result[0] !== expected) {
      const messages: Record<string, string> = {
        ACTIVE_GAME_EXISTS: 'A game is already active in this chat',
        CHAT_INACTIVE: 'Chat session is no longer active',
        GAME_ID_EXISTS: 'Could not create game',
        GAME_NOT_ACTIVE: 'Game is no longer active',
        GAME_NOT_FOUND: 'Game not found',
        INVALID_STATUS: 'Game is not in the required state',
        NOT_INVITEE: 'Only the invited player can accept or decline',
        NOT_PLAYER: 'User is not a participant in this game',
      };
      throw new WsException(messages[result[0]] ?? 'Game action could not be completed');
    }
  }

  private readScript(fileName: string): string {
    return readFileSync(join(__dirname, 'scripts', fileName), 'utf8');
  }
}