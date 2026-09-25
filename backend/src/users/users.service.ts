import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema.js';
import { Model } from 'mongoose';
import { UpdateProfileDto } from './dto/updateprofile.dto.js';
import { ImageService } from '../image/image.service.js';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        private readonly imageService: ImageService,
    ) { }

    async create(data: { email: string; hashedPassword: string; }): Promise<UserDocument> {
        try {
            return await this.userModel.create(data);
        } catch (err: any) {
            if (err.code === 11000) {
                // Duplicate key — email already taken
                throw new ConflictException('Email  already in use');
            }
            throw err;
        }
    }
    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }

    async findByUsername(username: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ username }).exec();
    }

    async findById(id: string): Promise<UserDocument | null> {
        return this.userModel.findById(id).exec();
    }

    async updateProfile(
        userId: string,
        data: UpdateProfileDto,
        image?: Express.Multer.File,
    ): Promise<UserDocument> {
        let imageUrl = data.imageUrl;

        if (image) {
            const uploadedImage = await this.imageService.uploadImageBytes(
                image.buffer,
                `users/${userId}/profile`,
            );
            imageUrl = uploadedImage.secureUrl;
        }

        const profileData = {
            ...data,
            ...(imageUrl !== undefined ? { imageUrl } : {}),
        };

        const user = await this.userModel
            .findByIdAndUpdate(
                userId,
                { $set: profileData },
                {
                    new: true,
                    runValidators: true,
                },).exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    
}
