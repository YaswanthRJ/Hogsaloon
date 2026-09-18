import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import { ChatEndReason, ChatMessage } from './chat.types.js';
import { randomUUID } from 'node:crypto';
import { CHAT_MESSAGES_MAX_COUNT, getChatMessagesKey } from './chat.constant.js';
import { getChatSessionKey, getUserChatSessionKey } from '../chatsession/chatsession.constants.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly redisService: RedisService,
    private readonly chatSessionService: ChatsessionService,
  ) { }
  async sendMessage(
    userId: string,
    text: string,
  ): Promise<ChatMessage> {
    const session = await this.chatSessionService.findByUserId(userId);
    if (!session) {
      throw new Error("No active session");
    }
    if (session.status !== 'ACTIVE') {
      throw new Error("Session inactive");
    }
    if (Date.now() >= session.expiresAt) {
      await this.endSession(
        session.sessionId,
        userId,
        'EXPIRED',
      );

      throw new Error('Chat session has expired');
    }
    const isParticipant = userId === session.userA || userId === session.userB;

    if (!isParticipant) {
      throw new Error('User is not part of this chat');
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('Message cannot be empty');
    }
    const message: ChatMessage = {
      messageId: randomUUID(),
      text: trimmedText,
      senderId: userId,
      createdAt: Date.now()
    }
    const remainingSeconds = Math.max(
      1,
      Math.ceil(
        (session.expiresAt - Date.now()) / 1000,
      ),
    );

    const client = this.redisService.getClient();

    const messagesKey =
      getChatMessagesKey(session.sessionId);

    await client
      .multi()
      .rpush(
        messagesKey,
        JSON.stringify(message),
      )
      .ltrim(
        messagesKey,
        -CHAT_MESSAGES_MAX_COUNT,
        -1,
      )
      .expire(
        messagesKey,
        remainingSeconds,
      )
      .exec();

    return message;
  }

  async getMessages(
    userId: string,
  ): Promise<ChatMessage[]> {
    const session =
      await this.chatSessionService.findByUserId(userId);

    if (!session) {
      return [];
    }

    if (Date.now() >= session.expiresAt) {
      await this.endSession(
        session.sessionId,
        userId,
        'EXPIRED',
      );

      return [];
    }

    const isParticipant =
      session.userA === userId ||
      session.userB === userId;

    if (!isParticipant) {
      throw new Error('User is not part of this chat');
    }

    const client = this.redisService.getClient();

    const messages =
      await client.lrange(
        getChatMessagesKey(session.sessionId),
        0,
        -1,
      );

    return messages.map(
      (message) => JSON.parse(message) as ChatMessage,
    );
  }

  async endSession(
    sessionId: string,
    userId: string,
    reason: ChatEndReason,
  ): Promise<void> {
    const session =
      await this.chatSessionService.findById(sessionId);

    if (!session) {
      return;
    }

    const isParticipant =
      session.userA === userId ||
      session.userB === userId;

    if (!isParticipant) {
      throw new Error(
        'User is not part of this chat',
      );
    }

    const client = this.redisService.getClient();
    const sessionKey = getChatSessionKey(sessionId);

    await client
      .multi()
      .hset(sessionKey, {
        status: 'ENDED',
      })
      .expire(sessionKey, 60)
      .del(getChatMessagesKey(sessionId))
      .del(getUserChatSessionKey(session.userA))
      .del(getUserChatSessionKey(session.userB))
      .exec();

    console.log(
      `Chat session ${sessionId} ended`,
      {
        reason,
        userId,
      },
    );
  }
}
