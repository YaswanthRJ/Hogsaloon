import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingService } from './matchmaking.service.js';
import { RedisService } from '../redis/redis.service.js';

describe('MatchmakingService', () => {
  let service: MatchmakingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        {
          provide: RedisService,
          useValue: {
            getClient: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
