export interface ChatMessage {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export type ChatEndReason =
  | 'USER_ENDED'
  | 'EXPIRED';