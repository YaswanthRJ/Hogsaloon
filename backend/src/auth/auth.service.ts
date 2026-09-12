import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly jwtService: JwtService,
    ) { }
    async register(dto: RegisterDto) {
        const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const user = await this.userService.create({
            email: dto.email,
            hashedPassword,
        })
        return this.buildToken(user)
    }

    async login(dto: LoginDto) {
        const user = await this.userService.findByEmail(dto.email.toLocaleLowerCase())

        if (!user) throw new UnauthorizedException('Invalid credentials');

        const valid = await bcrypt.compare(dto.password, user.hashedPassword);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        return this.buildToken(user);
    }

    async getMe(userId:string){
        const user = await this.userService.findById(userId);
        return user;
    }

    private buildToken(user: any) {
        const payload = { sub: user._id.toString(), email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user._id,
            },
        };
    }
}
