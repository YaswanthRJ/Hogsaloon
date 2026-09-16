import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SocketService {
  constructor(private readonly jwtService: JwtService) {}

  async authenticate(cookieHeader?: string): Promise<string> {
    const token = this.getAccessToken(cookieHeader);
    if (!token) {
      throw new Error('Missing access token');
    }

    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
    if (!payload.sub) {
      throw new Error('Missing subject claim');
    }

    return payload.sub;
  }

  private getAccessToken(cookieHeader?: string): string | undefined {
    const accessToken = cookieHeader
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('access_token='));

    return accessToken
      ? decodeURIComponent(accessToken.slice('access_token='.length))
      : undefined;
  }
}
