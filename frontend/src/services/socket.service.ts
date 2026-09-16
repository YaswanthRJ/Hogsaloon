import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BASE_URL as string;

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinQueue(): void {
  if (!socket?.connected) {
    console.error('Cannot join queue: socket is not connected');
    return;
  }
  console.log("emitting join queue request")
  socket.emit('queue:join');
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
