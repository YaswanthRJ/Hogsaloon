export type ChatSessionStatus = 'ACTIVE' | 'ENDED';

export interface ChatSession {
  sessionId: string;
  userA: string;
  userB: string;
  createdAt: number;
  expiresAt: number;
  status: ChatSessionStatus;
}