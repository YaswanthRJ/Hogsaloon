export const GAME_KEY_PREFIX = 'Game:';
export const SESSION_GAME_KEY_PREFIX = 'session:game:';

export function getGameKey(gameId: string): string {
  return `${GAME_KEY_PREFIX}${gameId}`;
}

export function getSessionGameKey(sessionId: string): string {
  return `${SESSION_GAME_KEY_PREFIX}${sessionId}`;
}