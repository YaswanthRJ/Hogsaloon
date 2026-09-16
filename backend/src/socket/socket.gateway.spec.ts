import { Test, TestingModule } from '@nestjs/testing';
import { SocketGateway } from './socket.gateway.js';
import { SocketService } from './socket.service.js';

describe('SocketGateway', () => {
  let gateway: SocketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocketGateway],
    }).useMocker((token) => {
      if (token === SocketService) {
        return { authenticate: vi.fn() };
      }
    }).compile();

    gateway = module.get<SocketGateway>(SocketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
