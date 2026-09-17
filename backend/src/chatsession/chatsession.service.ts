import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { ChatSession } from './chatsession.types.js';
import { randomUUID } from 'crypto';
import { CHAT_SESSION_TTL_SECONDS, getChatSessionKey, getUserChatSessionKey } from './chatsession.constants.js';

@Injectable()
export class ChatsessionService {
    constructor(private readonly redisService: RedisService) { }

    async create(userA: string, userB: string): Promise<ChatSession> {
        const client = this.redisService.getClient();

        const sessionId = randomUUID();

        const createdAt = Date.now();

        const expiresAt =
            createdAt + CHAT_SESSION_TTL_SECONDS * 1000;

        const session: ChatSession = {
            sessionId,
            userA,
            userB,
            createdAt,
            expiresAt,
            status: 'ACTIVE',
        };

        const sessionKey = getChatSessionKey(sessionId);

        await client
            .multi()
            .hset(sessionKey, {
                sessionId: session.sessionId,
                userA: session.userA,
                userB: session.userB,
                createdAt: String(session.createdAt),
                expiresAt: String(session.expiresAt),
                status: session.status,
            })
            .expire(sessionKey, CHAT_SESSION_TTL_SECONDS)
            .set(
                getUserChatSessionKey(userA),
                sessionId,
                'EX',
                CHAT_SESSION_TTL_SECONDS,
            )
            .set(
                getUserChatSessionKey(userB),
                sessionId,
                'EX',
                CHAT_SESSION_TTL_SECONDS,
            )
            .exec();

        console.log('Match session created:', session);

        return session;
    }

    async findById(sessionId: string): Promise<ChatSession | null> {
        const client = this.redisService.getClient();

        const data = await client.hgetall(
            getChatSessionKey(sessionId),
        );

        if (!data.sessionId) {
            return null;
        }

        return {
            sessionId: data.sessionId,
            userA: data.userA,
            userB: data.userB,
            createdAt: Number(data.createdAt),
            expiresAt: Number(data.expiresAt),
            status: data.status as ChatSession['status'],
        };
    }

    async findByUserId(userId: string): Promise<ChatSession | null> {
        const client = this.redisService.getClient();

        const sessionId = await client.get(
            getUserChatSessionKey(userId),
        );

        if (!sessionId) {
            return null;
        }

        return this.findById(sessionId);
    }
}
