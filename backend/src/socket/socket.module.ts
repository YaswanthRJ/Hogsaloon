import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SocketGateway } from './socket.gateway.js';
import { SocketService } from './socket.service.js';

@Module({
  imports: [AuthModule],
  providers: [SocketGateway, SocketService],
})
export class SocketModule {}
