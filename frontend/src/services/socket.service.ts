import { io, type Socket } from 'socket.io-client';

import { useChatStore } from '../store/chatStore';
import type {
  ChatMessage,
  ChatStartedData,
} from '../store/chatStore';

const SOCKET_URL = import.meta.env.VITE_BASE_URL as string;

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) {
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

  /*
   * Match found
   */
  socket.on(
    'chat:started',
    (data: ChatStartedData) => {
      console.log('Chat started:', data);

      useChatStore
        .getState()
        .startChat(data);
    },
  );

  /*
   * New message
   */
  socket.on(
    'chat:message',
    (message: ChatMessage) => {
      useChatStore
        .getState()
        .addMessage(message);
    },
  );

  /*
   * Chat history
   */
  socket.on(
    'chat:history',
    (messages: ChatMessage[]) => {
      useChatStore
        .getState()
        .setMessages(messages);
    },
  );

  /*
   * Chat ended by either participant
   * or because the session expired.
   */
  socket.on(
    'chat:ended',
    (data: {
      reason: 'USER_ENDED' | 'EXPIRED';
    }) => {
      console.log(
        'Chat ended:',
        data.reason,
      );

      useChatStore
        .getState()
        .endChat();
    },
  );

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinQueue(): void {
  if (!socket?.connected) {
    console.error(
      'Cannot join queue: socket is not connected',
    );

    return;
  }

  console.log('Emitting queue:join');

  socket.emit('queue:join');
}

export function sendMessage(text: string): void {
  if (!socket?.connected) {
    console.error(
      'Cannot send message: socket is not connected',
    );

    return;
  }

  socket.emit('chat:send', {
    text,
  });
}

export function requestChatHistory(): void {
  if (!socket?.connected) {
    console.error(
      'Cannot request chat history: socket is not connected',
    );

    return;
  }

  socket.emit('chat:history');
}

export function endChat(): void {
  if (!socket?.connected) {
    console.error(
      'Cannot end chat: socket is not connected',
    );

    return;
  }

  socket.emit('chat:end');
}

export function disconnectSocket(): void {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
}