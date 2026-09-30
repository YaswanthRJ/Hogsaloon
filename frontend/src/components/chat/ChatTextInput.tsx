import { useState } from 'react';
import { sendMessage } from '../../services/socket.service';

export function ChatTextInput() {
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
      className="h-full"
    >
      <input
        type="text"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message..."
        className="
          h-full w-full rounded-xl
          border border-hog-border
          bg-hog-surface-alt
          px-4 py-3
          text-sm text-hog-text
          outline-none
          placeholder:text-hog-text-muted
          focus:border-hog-primary
        "
      />
    </form>
  );
}