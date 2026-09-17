import { Test, TestingModule } from '@nestjs/testing';
import { ChatsessionService } from './chatsession.service.js';

describe('ChatsessionService', () => {
  let service: ChatsessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatsessionService],
    }).compile();

    service = module.get<ChatsessionService>(ChatsessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
