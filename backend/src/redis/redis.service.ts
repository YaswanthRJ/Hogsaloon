import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';


@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT ?? 6379),
        });
        this.client.on('connect', () => {
            console.log('Redis connected');
        });

        this.client.on('error', (error) => {
            console.error('Redis error:', error);
        });
    }
    getClient(): Redis {
        return this.client;
    }

    async onModuleDestroy() {
        await this.client.quit();
    }
}
