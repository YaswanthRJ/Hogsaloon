import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SocketGateway } from './socket.gateway.js';
import { SocketService } from './socket.service.js';
import { MatchmakingModule } from '../matchmaking/matchmaking.module.js';

@Module({
  imports: [AuthModule, MatchmakingModule],
  providers: [SocketGateway, SocketService],
})
export class SocketModule {}
