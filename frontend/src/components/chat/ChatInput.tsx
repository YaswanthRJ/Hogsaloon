import { useState } from 'react';
import { sendMessage } from '../../services/socket.service';

export function ChatInput() {
  const [text, setText] = useState('');

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

      <button
        type="submit"
        className="rounded-xl bg-hog-primary px-5 py-3 text-sm font-semibold text-hog-bg transition hover:bg-hog-primary-hover"
      >
        Send
      </button>
    </form>
  );
}