import { Injectable } from '@nestjs/common';

@Injectable()
export class SocketPresenceService {
    private readonly userSockets = new Map<string, Set<string>>()

    add(userId: string, socketId: string): void {
    let sockets = this.userSockets.get(userId);

    if (!sockets) {
      sockets = new Set<string>();
      this.userSockets.set(userId, sockets);
    }

    sockets.add(socketId);

    console.log(
      `Socket ${socketId} registered for user ${userId}`,
    );
  }
  remove(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);

    if (!sockets) {
      return;
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.userSockets.delete(userId);
    }

    console.log(
      `Socket ${socketId} removed for user ${userId}`,
    );
  }

  getSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);

    if (!sockets) {
      return [];
    }

    return [...sockets];
  }

  isOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);

    return !!sockets && sockets.size > 0;
  }
}