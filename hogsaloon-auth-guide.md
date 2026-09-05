# Hogsaloon — Backend Authentication Code-Along Guide
> **Stack:** NestJS · MongoDB (Mongoose) · JWT · Passport  
> **Scope:** User registration, login, JWT auth guard, profile stub  
> **Time:** ~2 hours

---

## 0 · Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 18 | `node -v` |
| npm | ≥ 9 | `npm -v` |
| NestJS CLI | ≥ 10 | `nest --version` |
| MongoDB | running locally or Atlas URI | `mongosh` |
| Redis | running locally | `redis-cli ping` |

Install the NestJS CLI if you haven't already:

```bash
npm install -g @nestjs/cli
```

---

## 1 · Project Scaffold

Create a fresh NestJS project and install every dependency you'll need for auth in one go.

**Step 1 — Bootstrap the project**

```bash
nest new hogsaloon-backend
cd hogsaloon-backend
```

**Step 2 — Install dependencies**

```bash
npm install \
  @nestjs/mongoose mongoose \
  @nestjs/passport @nestjs/jwt \
  passport passport-jwt passport-local \
  bcrypt \
  class-validator class-transformer

npm install --save-dev \
  @types/passport-jwt @types/passport-local \
  @types/bcrypt
```

> **Tip:** `class-validator` and `class-transformer` are needed for DTO validation via the global `ValidationPipe`.

---

## 2 · Environment Variables

Create a `.env` file in the project root. Never commit this file — add it to `.gitignore`.

📄 `.env`
```env
MONGODB_URI=mongodb://localhost:27017/hogsaloon
JWT_SECRET=replace_this_with_a_long_random_string
JWT_EXPIRES_IN=7d
```

Install `@nestjs/config` to load these:

```bash
npm install @nestjs/config
```

---

## 3 · App Module

Wire Mongoose and ConfigModule into the root AppModule.

📄 `src/app.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
```

---

## 4 · User Schema & Module

### 4.1 Generate the Users module

```bash
nest generate module users
nest generate service users
```

### 4.2 Define the Mongoose schema

Keep profile fields (bio, interests, avatar) commented-out for now — you'll add them in the next phase.

📄 `src/users/schemas/user.schema.ts`
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true })
  hashedPassword: string;

  // ── profile fields (Phase 2) ──────────────────
  // @Prop() displayName: string;
  // @Prop() bio: string;
  // @Prop([String]) interests: string[];
  // @Prop() avatarUrl: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound index: both email and username must be unique
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
```

### 4.3 UsersModule

📄 `src/users/users.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### 4.4 UsersService

Provides the methods AuthService needs: create a user, find by email, find by username, find by ID.

📄 `src/users/users.service.ts`
```typescript
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: {
    email: string;
    username: string;
    hashedPassword: string;
  }): Promise<UserDocument> {
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
```

---

## 5 · Data Transfer Objects (DTOs)

DTOs carry and validate incoming request bodies. `class-validator` decorators do the heavy lifting.

### 5.1 Register DTO

📄 `src/auth/dto/register.dto.ts`
```typescript
import {
  IsEmail, IsString, MinLength, MaxLength, Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can only contain letters, numbers, and underscores',
  })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;
}
```

### 5.2 Login DTO

📄 `src/auth/dto/login.dto.ts`
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  // Accepts email or username
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

> **Tip:** Using a single `identifier` field lets the user log in with either email or username — you'll resolve which one it is in `AuthService`.

---

## 6 · Auth Module

### 6.1 Generate scaffolding

```bash
nest generate module auth
nest generate service auth
nest generate controller auth
```

### 6.2 AuthModule

📄 `src/auth/auth.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

### 6.3 AuthService

Handles hashing, validation, and token issuance.

📄 `src/auth/auth.service.ts`
```typescript
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Register ─────────────────────────────────────
  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      username: dto.username,
      hashedPassword,
    });

    return this.buildToken(user);
  }

  // ── Login ─────────────────────────────────────────
  async login(dto: LoginDto) {
    const identifier = dto.identifier.toLowerCase();

    // Resolve by email or username
    const isEmail = identifier.includes('@');
    const user = isEmail
      ? await this.usersService.findByEmail(identifier)
      : await this.usersService.findByUsername(identifier);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildToken(user);
  }

  // ── Token builder ─────────────────────────────────
  private buildToken(user: any) {
    const payload = { sub: user._id.toString(), username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
    };
  }
}
```

> **Note:** Always use the same generic error ("Invalid credentials") for both "user not found" and "wrong password". This prevents user enumeration attacks.

---

## 7 · JWT Strategy & Guard

### 7.1 JWT Strategy

Passport calls this whenever a protected route is hit. It decodes the token and attaches the user to the request.

📄 `src/auth/strategies/jwt.strategy.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; username: string }) {
    // Whatever you return here is attached to req.user
    return { userId: payload.sub, username: payload.username };
  }
}
```

### 7.2 JWT Auth Guard

A reusable guard — decorate any route with `@UseGuards(JwtAuthGuard)` to protect it.

📄 `src/auth/guards/jwt-auth.guard.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

> **Tip:** Keeping the guard in its own file makes it easy to extend later — e.g., adding role checks or refresh-token logic.

---

## 8 · Auth Controller

Exposes `POST /auth/register` and `POST /auth/login`. A protected `GET /auth/me` endpoint verifies the guard works.

📄 `src/auth/auth.controller.ts`
```typescript
import {
  Controller, Post, Get, Body, UseGuards, Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Protected route — used to verify the guard works
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: any) {
    return req.user; // { userId, username }
  }
}
```

---

## 9 · main.ts — Validation Pipe

Enable the global `ValidationPipe` so `class-validator` decorators on all DTOs are enforced automatically.

📄 `src/main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform payload types
    }),
  );

  await app.listen(3001);
  console.log('🐷  Hogsaloon backend listening on :3001');
}
bootstrap();
```

---

## 10 · Manual Testing with cURL

Start the server, then run these commands from a second terminal.

```bash
npm run start:dev
```

### 10.1 Register a user

```bash
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "username": "alice",
    "password": "supersecret123"
  }' | jq
```

Expected response:
```json
{
  "access_token": "<JWT>",
  "user": {
    "id": "...",
    "email": "alice@example.com",
    "username": "alice"
  }
}
```

### 10.2 Login

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"alice","password":"supersecret123"}' | jq
```

### 10.3 Access a protected route

Copy the `access_token` from the login response, then:

```bash
TOKEN="<paste your token here>"

curl -s http://localhost:3001/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected response:
```json
{
  "userId": "...",
  "username": "alice"
}
```

> **Warning:** If you get 401, double-check `JWT_SECRET` in `.env` matches what the server loaded. Restart the server after any `.env` change.

---

## 11 · Final Folder Structure

After completing all steps your `src/` directory should look like this:

```
src/
├── app.module.ts
├── main.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── dto/
│   │   ├── register.dto.ts
│   │   └── login.dto.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
└── users/
    ├── users.module.ts
    ├── users.service.ts
    └── schemas/
        └── user.schema.ts
```

---

## 12 · What's Next

With auth working, here's the recommended order for the next phases:

| Phase | Feature | Key tasks |
|---|---|---|
| 2 | Profile fields | Add bio, interests, displayName to schema; Cloudinary avatar upload endpoint |
| 3 | Matchmaking queue | Redis-backed queue service; Socket.IO gateway for real-time pairing |
| 4 | Ephemeral chat | Socket.IO chat room; 20-message rolling buffer in Redis; 5-hour TTL |
| 5 | Accept / Skip | Match proposal event; timeout handler; re-queue logic |

> **Tip:** Commit your code now before moving to Phase 2. A clean auth commit is a great checkpoint.
