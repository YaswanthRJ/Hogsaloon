import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema.js';
import { UsersController } from './users.controller.js';
import { PassportModule } from '@nestjs/passport';
import { ImageModule } from '../image/image.module.js';

@Module({
  imports: [
    PassportModule.register({}),
    ImageModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule { }
