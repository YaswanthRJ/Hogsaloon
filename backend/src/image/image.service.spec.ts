import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ImageService } from './image.service.js';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => 'cloudinary://test-key:test-secret@test-cloud',
          },
        },
      ],
    }).compile();

    service = module.get<ImageService>(ImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
