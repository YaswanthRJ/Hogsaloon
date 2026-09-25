import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UpdateProfileDto } from './dto/updateprofile.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
     constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @Patch('profile')
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    console.log("got to controller", dto)
    return this.usersService.updateProfile(
      req.user.userId,
      dto,
      image,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req:any){
    return this.usersService.findById(req.user.userId)
  }
}
