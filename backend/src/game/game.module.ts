import { Module } from '@nestjs/common';
import { ChatsessionModule } from '../chatsession/chatsession.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { GameLifecycleService } from './game-lifecycle.service.js';
import { RpsGameService } from './rps/rps-game.service.js';
import { HandCricketGameService } from './hand-cricket/hand-cricket-game.service.js';

@Module({
  imports: [ChatsessionModule, RedisModule],
  providers: [GameLifecycleService, RpsGameService, HandCricketGameService],
  exports: [GameLifecycleService],
})
export class GameModule {}