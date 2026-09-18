import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SocketGateway } from './socket.gateway.js';
import { SocketService } from './socket.service.js';
import { MatchmakingModule } from '../matchmaking/matchmaking.module.js';
import { ChatsessionModule } from '../chatsession/chatsession.module.js';
import { SocketPresenceService } from './socket-presence.service.js';
import { ChatModule } from '../chat/chat.module.js';

@Module({
  imports: [AuthModule, MatchmakingModule, ChatsessionModule, ChatModule],
  providers: [SocketGateway, SocketService, SocketPresenceService],
})
export class SocketModule {}
