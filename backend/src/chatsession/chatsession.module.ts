import { Module } from '@nestjs/common';
import { ChatsessionService } from './chatsession.service.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports:[RedisModule],
   providers: [ChatsessionService],
  exports: [ChatsessionService],
})
export class ChatsessionModule {}
