export const CHAT_MESSAGES_KEY_PREFIX = 'ChatMessages:';

export const CHAT_MESSAGES_MAX_COUNT = 20;

export function getChatMessagesKey(sessionId: string): string {
  return `${CHAT_MESSAGES_KEY_PREFIX}${sessionId}`;
}