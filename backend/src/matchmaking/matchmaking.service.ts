import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RedisService } from '../redis/redis.service.js';
import {
    MATCHMAKING_QUEUE_KEY,
    MATCHMAKING_WAITING_USERS_KEY,
} from './matchmaking.constants.js';
import type {
    JoinQueueResult,
    MatchmakingPreferences,
} from './matchmaking.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class MatchmakingService {
    private readonly joinScript: string;
    private readonly removeFromQueueScript: string;

    constructor(private readonly redisService: RedisService) {
        this.joinScript = readFileSync(
            join(__dirname, 'scripts', 'join-queue.lua'),
            'utf8',
        );
        this.removeFromQueueScript = readFileSync(
            join(__dirname, 'scripts', 'remove-from-queue.lua'),
            'utf8',
        );
    }

    async joinQueue(
        userId: string,
        preferences: MatchmakingPreferences,
    ): Promise<JoinQueueResult> {
        const client = this.redisService.getClient();

        const entry = JSON.stringify({
            userId,
            joinedAt: Date.now(),
            interests: preferences.interests,
            languages: preferences.languages,
        });

        const result = (await client.eval(
            this.joinScript,
            2,
            MATCHMAKING_QUEUE_KEY,
            MATCHMAKING_WAITING_USERS_KEY,
            userId,
            entry,
        )) as string[];

        const status = result[0];

        if (status === 'DUPLICATE') {
            return {
                status: 'DUPLICATE',
            };
        }

        if (status === 'WAITING') {
            return {
                status: 'WAITING',
            };
        }

        if (status === 'MATCHED') {
            return {
                status: 'MATCHED',
                first: result[1],
                second: result[2],
            };
        }
        throw new Error(`Unknown matchmaking result: ${status}`);
    }

    async removeFromQueue(userId: string): Promise<void> {
        const client = this.redisService.getClient();

        await client.eval(
            this.removeFromQueueScript,
            2,
            MATCHMAKING_QUEUE_KEY,
            MATCHMAKING_WAITING_USERS_KEY,
            userId,
        );
    }
}