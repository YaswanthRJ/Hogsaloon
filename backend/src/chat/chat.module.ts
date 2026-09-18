import { Module } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { RedisModule } from '../redis/redis.module.js';
import { ChatsessionModule } from '../chatsession/chatsession.module.js';

@Module({
  imports: [RedisModule, ChatsessionModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
