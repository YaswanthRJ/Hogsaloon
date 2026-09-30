import { useState } from 'react';
import { inviteToGame, sendMessage } from '../../services/socket.service';

export function ChatInput() {
  const [text, setText] = useState('');
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = text.trim();

    if (!trimmed) return;

    sendMessage(trimmed);
    setText('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 gap-3 border-t border-hog-border p-4"
    >
      <input
        type="text"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message..."
        className="min-w-0 flex-1 rounded-xl border border-hog-border bg-hog-surface-alt px-4 py-3 text-sm text-hog-text outline-none placeholder:text-hog-text-muted focus:border-hog-primary"
      />

      <div className="relative">
        <button
          type="button"
          aria-label="Choose a game"
          aria-haspopup="menu"
          aria-expanded={isGameMenuOpen}
          onClick={() => setIsGameMenuOpen((open) => !open)}
          className="h-full rounded-xl border border-hog-border px-4 text-xl text-hog-text transition hover:bg-hog-surface-alt"
        >
          +
        </button>
        {isGameMenuOpen && (
          <div
            role="menu"
            className="absolute bottom-full right-0 z-20 mb-2 min-w-44 overflow-hidden rounded-xl border border-hog-border bg-hog-surface p-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                inviteToGame('RPS');
                setIsGameMenuOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-hog-text hover:bg-hog-surface-alt"
            >
              Rock Paper Scissors
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                inviteToGame('HAND_CRICKET');
                setIsGameMenuOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-hog-text hover:bg-hog-surface-alt"
            >
              Hand Cricket
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="rounded-xl bg-hog-primary px-5 py-3 text-sm font-semibold text-hog-bg transition hover:bg-hog-primary-hover"
      >
        Send
      </button>
    </form>
  );
}