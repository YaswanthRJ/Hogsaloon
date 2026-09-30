import { io, type Socket } from 'socket.io-client';

import { useChatStore } from '../store/chatStore';
import type {
  ChatMessage,
  ChatStartedData,
} from '../store/chatStore';
import { useGameStore } from '../store/gameStore';
import type {
  GameInvitation,
  GameResult,
  GameType,
  HandCricketBallResult,
  OpponentChoicePhase,
  RpsRoundResult,
  StartedGame,
} from '../store/gameStore';
import { useNotificationStore } from '../store/notificationStore';

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

  socket.on('exception', (error: { message?: string } | string) => {
    useGameStore.getState().clearWaiting();
    useNotificationStore.getState().push({
      title: 'Game action failed',
      message:
        typeof error === 'string'
          ? error
          : error.message ?? 'Please try again.',
    });
  });

  /*
   * Match found
   */
  socket.on(
    'chat:started',
    (data: ChatStartedData) => {
      console.log('Chat started:', data);

      clearGameState();
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

      clearGameState();
      useChatStore
        .getState()
        .endChat();
    },
  );

  socket.on(
    'game:invited',
    (data: Omit<GameInvitation, 'notificationId'>) => {
      if (useGameStore.getState().invitation?.gameId === data.gameId) {
        return;
      }
      clearGameState();

      const notificationId = useNotificationStore.getState().push({
        title: 'Game invitation',
        message: `${data.inviterId} invited you to ${gameName(data.gameType)}.`,
        persistent: true,
        actions: [
          {
            label: 'Decline',
            dismissOnSelect: false,
            onSelect: () => respondToGameInvitation('game:decline', data.gameId),
          },
          {
            label: 'Accept',
            dismissOnSelect: false,
            onSelect: () => respondToGameInvitation('game:accept', data.gameId),
          },
        ],
      });
      useGameStore.getState().setInvitation({ ...data, notificationId });
    },
  );

  socket.on('game:started', (data: StartedGame) => {
    dismissGameInvitation();
    useGameStore.getState().startGame(data);
  });

  socket.on(
    'game:opponent-chose',
    (data: { gameId: string; phase: OpponentChoicePhase }) => {
      useGameStore.getState().setOpponentChose(data.phase);
    },
  );

  socket.on('game:rps:round-result', (data: RpsRoundResult) => {
    useGameStore.getState().setRpsRound(data);
  });

  socket.on('game:hand-cricket:toss-result', (data: Record<string, unknown>) => {
    useGameStore.getState().setTossResult(data);
  });

  socket.on('game:hand-cricket:innings-started', (data: Record<string, unknown>) => {
    useGameStore.getState().setInningsStarted(data);
  });

  socket.on('game:hand-cricket:ball-result', (data: HandCricketBallResult) => {
    useGameStore.getState().setHandCricketBall(data);
  });

  socket.on('game:result', (data: GameResult) => {
    useGameStore.getState().setResult(data);
  });

  socket.on('game:ended', () => {
    clearGameState();
  });

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

export function inviteToGame(gameType: GameType): void {
  emitGameEvent('game:invite', { gameType });
}

export function acceptGame(gameId: string): void {
  respondToGameInvitation('game:accept', gameId);
}

export function declineGame(gameId: string): void {
  respondToGameInvitation('game:decline', gameId);
}

export function leaveGame(gameId: string): void {
  emitGameEvent('game:leave', { gameId });
}

export function chooseRps(
  gameId: string,
  choice: RpsRoundResult['yourChoice'],
): void {
  useGameStore.getState().setOpponentWaiting('RPS');
  emitGameEvent('game:rps:choose', { gameId, choice });
}

export function submitHandCricketToss(gameId: string, number: number): void {
  useGameStore.getState().setOpponentWaiting('TOSS');
  emitGameEvent('game:hand-cricket:toss', { gameId, number });
}

export function chooseHandCricketBatOrBowl(
  gameId: string,
  decision: 'BAT' | 'BOWL',
): void {
  emitGameEvent('game:hand-cricket:bat-or-bowl', { gameId, decision });
}

export function submitHandCricketBall(gameId: string, number: number): void {
  useGameStore.getState().setOpponentWaiting('BALL');
  emitGameEvent('game:hand-cricket:ball', { gameId, number });
}

function emitGameEvent(event: string, data: Record<string, unknown>): void {
  if (!socket?.connected) {
    useGameStore.getState().clearWaiting();
    useNotificationStore.getState().push({
      title: 'Not connected',
      message: 'Reconnect to chat before starting or playing a game.',
    });
    return;
  }
  socket.emit(event, data);
}

function respondToGameInvitation(
  event: 'game:accept' | 'game:decline',
  gameId: string,
): void {
  emitGameEvent(event, { gameId });
}

function dismissGameInvitation(): void {
  const notificationId = useGameStore.getState().clearInvitation();
  if (notificationId) {
    useNotificationStore.getState().dismiss(notificationId);
  }
}

function clearGameState(): void {
  const notificationId = useGameStore.getState().reset();
  if (notificationId) {
    useNotificationStore.getState().dismiss(notificationId);
  }
}

function gameName(gameType: GameType): string {
  return gameType === 'RPS' ? 'Rock Paper Scissors' : 'Hand Cricket';
}