import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { User } from './schemas/user.schema.js';
import { ImageService } from '../image/image.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const findByIdAndUpdate = vi.fn();
  const findById = vi.fn();
  const uploadImageBytes = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: { findById, findByIdAndUpdate },
        },
        { provide: ImageService, useValue: { uploadImageBytes } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stores the Cloudinary URL when a profile image is uploaded', async () => {
    const updatedUser = {} as any;
    const image = { buffer: Buffer.from('image') } as Express.Multer.File;

    uploadImageBytes.mockResolvedValue({
      publicId: 'users/user-id/profile',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/profile.jpg',
    });
    findByIdAndUpdate.mockReturnValue({
      exec: vi.fn().mockResolvedValue(updatedUser),
    });

    await service.updateProfile('user-id', { username: 'test_user' }, image);

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'user-id',
      {
        $set: {
          username: 'test_user',
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/profile.jpg',
        },
      },
      { new: true, runValidators: true },
    );
  });

  it('returns only public match profile fields', async () => {
    const exec = vi.fn().mockResolvedValue({
      username: 'Rando',
      imageUrl: 'https://example.com/profile.jpg',
      interests: ['Music'],
      languages: ['English'],
      email: 'private@example.com',
      hashedPassword: 'private-password',
    });
    const lean = vi.fn().mockReturnValue({ exec });
    const select = vi.fn().mockReturnValue({ lean });
    findById.mockReturnValue({ select });

    await expect(service.getMatchProfile('user-id')).resolves.toEqual({
      username: 'Rando',
      imageUrl: 'https://example.com/profile.jpg',
      interests: ['Music'],
      languages: ['English'],
    });

    expect(findById).toHaveBeenCalledWith('user-id');
    expect(select).toHaveBeenCalledWith(
      'username imageUrl interests languages',
    );
  });
});
