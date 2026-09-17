import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SocketGateway } from './socket.gateway.js';
import { SocketService } from './socket.service.js';
import { MatchmakingModule } from '../matchmaking/matchmaking.module.js';
import { ChatsessionModule } from '../chatsession/chatsession.module.js';

@Module({
  imports: [AuthModule, MatchmakingModule, ChatsessionModule],
  providers: [SocketGateway, SocketService],
})
export class SocketModule {}
