import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports:[RedisModule],
  providers: [MatchmakingService],
  exports:[MatchmakingService]
})
export class MatchmakingModule {}
