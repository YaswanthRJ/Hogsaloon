import { useState } from 'react';
import { Gamepad2, MessageSquare } from 'lucide-react';
import {
  inviteToGame,
} from '../../services/socket.service';
import { GamePicker } from './GamePicker';
import { ChatTextInput } from './ChatTextInput';

type ChatInputMode = 'MESSAGE' | 'GAME_PICKER';
type GameType = 'RPS' | 'HAND_CRICKET';

export function ChatInput() {
  const [mode, setMode] =
    useState<ChatInputMode>('MESSAGE');

  const [selectedGame, setSelectedGame] =
    useState<GameType | null>(null);

  function toggleMode() {
    setMode((current) =>
      current === 'MESSAGE'
        ? 'GAME_PICKER'
        : 'MESSAGE',
    );

    setSelectedGame(null);
  }

  function handleGameSelect(gameType: GameType) {
    setSelectedGame(gameType);
  }

  function handleSubmit() {
    if (mode !== 'GAME_PICKER' || !selectedGame) {
      return;
    }

    inviteToGame(selectedGame);

    setSelectedGame(null);
    setMode('MESSAGE');
  }

  return (
    <div className="shrink-0 border-t border-hog-border p-4">
      <div className="flex min-w-0 gap-3">
        <div className="min-w-0 flex-1">
          {mode === 'MESSAGE' ? (
            <ChatTextInput />
          ) : (
            <GamePicker
              selectedGame={selectedGame}
              onSelect={handleGameSelect}
            />
          )}
        </div>

        <button
          type="button"
          aria-label={
            mode === 'MESSAGE'
              ? 'Choose a game'
              : 'Switch to message mode'
          }
          onClick={toggleMode}
          className="
            shrink-0 rounded-xl
            border border-hog-border
            px-4
            text-hog-text
            transition
            hover:bg-hog-surface-alt
          "
        >
          {mode === 'MESSAGE' ? (
            <Gamepad2 className="h-5 w-5" />
          ) : (
            <MessageSquare className="h-5 w-5" />
          )}
        </button>

        <button
          type="button"
          disabled={
            mode === 'GAME_PICKER' && !selectedGame
          }
          onClick={handleSubmit}
          className="
            shrink-0 rounded-xl
            bg-hog-primary
            px-5 py-3
            text-sm font-semibold
            text-hog-bg
            transition
            hover:bg-hog-primary-hover
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          Send
        </button>
      </div>
    </div>
  );
}