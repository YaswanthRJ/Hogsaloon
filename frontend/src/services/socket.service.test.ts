import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store/gameStore';
import { useNotificationStore } from '../store/notificationStore';
import { connectSocket, disconnectSocket, inviteToGame, chooseRps } from './socket.service';

const socketMock = vi.hoisted(() => {
  const listeners = new Map<string, (data?: unknown) => void>();
  const socket = {
    connected: true,
    on: vi.fn((event: string, callback: (data?: unknown) => void) => {
      listeners.set(event, callback);
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  return { listeners, socket };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socketMock.socket),
}));

describe('socket game contract', () => {
  beforeEach(() => {
    disconnectSocket();
    useGameStore.getState().reset();
    useNotificationStore.getState().clear();
    socketMock.listeners.clear();
    socketMock.socket.emit.mockClear();
    socketMock.socket.on.mockClear();
    socketMock.socket.connected = true;
  });

  it('emits the selected game type and action payload', () => {
    connectSocket();
    inviteToGame('HAND_CRICKET');
    chooseRps('rps-2', 'PAPER');

    expect(socketMock.socket.emit).toHaveBeenNthCalledWith(1, 'game:invite', {
      gameType: 'HAND_CRICKET',
    });
    expect(socketMock.socket.emit).toHaveBeenNthCalledWith(2, 'game:rps:choose', {
      gameId: 'rps-2',
      choice: 'PAPER',
    });
  });

  it('shows a persistent actionable notification for an incoming invite', () => {
    connectSocket();
    socketMock.listeners.get('game:invited')?.({
      gameId: 'invite-3',
      gameType: 'RPS',
      inviterId: 'player-b',
    });

    expect(useGameStore.getState().invitation?.gameId).toBe('invite-3');
    expect(useNotificationStore.getState().notifications[0]).toMatchObject({
      title: 'Game invitation',
      persistent: true,
      actions: [
        { label: 'Decline' },
        { label: 'Accept' },
      ],
    });
  });
});