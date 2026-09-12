import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
    Request,
    Res,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    private setAccessTokenCookie(res: Response, accessToken: string) {
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        });
    }

    @Post('register')
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { access_token } = await this.authService.register(dto);

        this.setAccessTokenCookie(res, access_token);

        return {
            message: 'Registration successful',
        };
    }

    @Post('login')
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { access_token } = await this.authService.login(dto);

        this.setAccessTokenCookie(res, access_token);

        return {
            message: 'Login successful',
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@Request() req: any) {
        const userProfile = await this.authService.getMe(req.user.userId);
        const profileCompleted = userProfile?.username != null;
        return {
            email: userProfile?.email,
            username: userProfile?.username,
            imageUrl: userProfile?.imageUrl,
            languages: userProfile?.languages,
            interests: userProfile?.interests,
            profileCompleted
        };
    }
}