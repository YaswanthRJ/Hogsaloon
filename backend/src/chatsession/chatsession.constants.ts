export const CHAT_SESSION_TTL_SECONDS = 5 * 60 * 60;

export const CHAT_SESSION_KEY_PREFIX = 'ChatSession:';

export const USER_CHAT_SESSION_KEY_PREFIX = 'user:chat:';

export function getChatSessionKey(sessionId: string): string {
  return `${CHAT_SESSION_KEY_PREFIX}${sessionId}`;
}

export function getUserChatSessionKey(userId: string): string {
  return `${USER_CHAT_SESSION_KEY_PREFIX}${userId}`;
}