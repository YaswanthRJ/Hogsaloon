import { create } from 'zustand';

export interface ChatMessage {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ChatStartedData {
  sessionId: string;
  expiresAt: number;
  otherUserId: string;
}

interface ChatState {
  sessionId: string | null;
  expiresAt: number | null;
  otherUserId: string | null;

  messages: ChatMessage[];

  startChat: (data: ChatStartedData) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  endChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  expiresAt: null,
  otherUserId: null,

  messages: [],

  startChat: (data) =>
    set({
      sessionId: data.sessionId,
      expiresAt: data.expiresAt,
      otherUserId: data.otherUserId,
      messages: [],
    }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) =>
    set({
      messages,
    }),

  endChat: () =>
    set({
      sessionId: null,
      expiresAt: null,
      otherUserId: null,
      messages: [],
    }),
}));