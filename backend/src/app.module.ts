import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SocketModule } from './socket/socket.module.js';
import { RedisModule } from './redis/redis.module.js';
import { MatchmakingModule } from './matchmaking/matchmaking.module.js';
import { ChatsessionModule } from './chatsession/chatsession.module.js';
import { ChatModule } from './chat/chat.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory:(config: ConfigService)=>({
        uri: config.get<string>('MONGODB_URI')
      }),
      inject:[ConfigService],
    }),
    UsersModule,
    AuthModule,
    SocketModule,
    RedisModule,
    MatchmakingModule,
    ChatsessionModule,
    ChatModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
