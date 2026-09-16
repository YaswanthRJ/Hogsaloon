import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RedisService } from '../redis/redis.service.js';
import {
    MATCHMAKING_QUEUE_KEY,
    MATCHMAKING_WAITING_USERS_KEY,
} from './matchmaking.constants.js';
import type { JoinQueueResult } from './matchmaking.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class MatchmakingService {
    private readonly joinScript: string;

    constructor(private readonly redisService: RedisService) {
        this.joinScript = readFileSync(
            join(__dirname, 'scripts', 'join-queue.lua'),
            'utf8',
        );
    }

    async joinQueue(userId: string): Promise<JoinQueueResult> {
        console.log('join queue called')
        const client = this.redisService.getClient();

        const entry = JSON.stringify({
            userId,
            joinedAt: Date.now(),
        });

        const result = (await client.eval(
            this.joinScript,
            2,
            MATCHMAKING_QUEUE_KEY,
            MATCHMAKING_WAITING_USERS_KEY,
            userId,
            entry,
        )) as string[];

        console.log('Redis matchmaking result:', result);

        const status = result[0];

        console.log('Matchmaking status:', status);

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
        console.log("no return")

        throw new Error(`Unknown matchmaking result: ${status}`);
    }
}