import { create } from 'zustand';

export type ChatState =
  | 'IDLE'
  | 'SEARCHING'
  | 'CHAT_ACTIVE';

export interface ChatMessage {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface MatchProfile {
  username: string;
  imageUrl: string;
  interests: string[];
  languages: string[];
}

export interface ChatStartedData {
  sessionId: string;
  expiresAt: number;
  otherUserId: string;
  matchProfile: MatchProfile;
}

interface ChatStore {
  // Global app flow
  state: ChatState;

  // Current chat session
  sessionId: string | null;
  expiresAt: number | null;
  otherUserId: string | null;
  matchProfile: MatchProfile | null;

  // Current chat messages
  messages: ChatMessage[];

  // Flow
  setState: (state: ChatState) => void;

  // Chat session
  startChat: (data: ChatStartedData) => void;
  endChat: () => void;

  // Messages
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  state: 'IDLE',

  sessionId: null,
  expiresAt: null,
  otherUserId: null,
  matchProfile: null,

  messages: [],

  setState: (state) => {
    set({ state });
  },

  startChat: (data) => {
    set({
      state: 'CHAT_ACTIVE',
      sessionId: data.sessionId,
      expiresAt: data.expiresAt,
      otherUserId: data.otherUserId,
      matchProfile: data.matchProfile,
      messages: [],
    });
  },

  endChat: () => {
    set({
      state: 'IDLE',
      sessionId: null,
      expiresAt: null,
      otherUserId: null,
      matchProfile: null,
      messages: [],
    });
  },

  addMessage: (message) => {
    set((state) => {
      if (
        state.messages.some(
          (existingMessage) =>
            existingMessage.messageId === message.messageId,
        )
      ) {
        return state;
      }

      return {
        messages: [...state.messages, message],
      };
    });
  },

  setMessages: (messages) => {
    set({
      messages,
    });
  },
}));