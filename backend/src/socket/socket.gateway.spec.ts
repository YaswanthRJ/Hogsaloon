import { Test, TestingModule } from '@nestjs/testing';
import { SocketGateway } from './socket.gateway.js';
import { SocketService } from './socket.service.js';
import { MatchmakingService } from '../matchmaking/matchmaking.service.js';
import { ChatsessionService } from '../chatsession/chatsession.service.js';
import { ChatService } from '../chat/chat.service.js';
import { SocketPresenceService } from './socket-presence.service.js';
import { UsersService } from '../users/users.service.js';

describe('SocketGateway', () => {
  let gateway: SocketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocketGateway],
    }).useMocker((token) => {
      if (token === SocketService) {
        return { authenticate: vi.fn() };
      }

      if (
        token === MatchmakingService ||
        token === ChatsessionService ||
        token === ChatService ||
        token === SocketPresenceService ||
        token === UsersService
      ) {
        return {};
      }
    }).compile();

    gateway = module.get<SocketGateway>(SocketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
