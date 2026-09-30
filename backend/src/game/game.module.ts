import { Module } from '@nestjs/common';
import { ChatsessionModule } from '../chatsession/chatsession.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { GameService } from './game.service.js';

@Module({
  imports: [ChatsessionModule, RedisModule],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}