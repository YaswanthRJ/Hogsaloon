import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema.js';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    ) { }

    async create(data: { email: string; username: string; hashedPassword: string; }): Promise<UserDocument> {
        try {
            return await this.userModel.create(data);
        } catch (err: any) {
            if (err.code === 11000) {
                // Duplicate key — email or username already taken
                throw new ConflictException('Email or username already in use');
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

}
