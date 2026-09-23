import React, { useEffect } from 'react';
import {
  endChat,
  joinQueue,
  requestChatHistory,
  sendMessage,
} from '../services/socket.service';

import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

export function MainPage() {
  const user = useAuthStore((s) => s.user);

  const state = useChatStore((s) => s.state);
  const messages = useChatStore((s) => s.messages);
  const otherUserId = useChatStore((s) => s.otherUserId);

  const handleFindSomeone = () => {
    useChatStore.getState().setState('SEARCHING');
    joinQueue();
  };

  useEffect(()=>{console.log(messages)},[messages])

  /*
   * IDLE
   */
  if (state === 'IDLE') {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl border p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              Welcome, {user?.username}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Ready to meet someone new?
            </p>
          </div>

          <button
            onClick={handleFindSomeone}
            className="rounded-lg bg-black px-6 py-3 text-white"
          >
            Find Someone
          </button>
        </div>
      </div>
    );
  }

  /*
   * SEARCHING
   */
  if (state === 'SEARCHING') {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl border p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              Finding someone...
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Looking for a compatible person.
            </p>
          </div>

          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
        </div>
      </div>
    );
  }

  /*
   * CHAT_ACTIVE
   */
  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col rounded-xl border">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="font-semibold">
              Chatting with someone
            </h2>

            <p className="text-xs text-gray-500">
              User: {otherUserId}
            </p>
          </div>

          <button
            onClick={endChat}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            End Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              No messages yet. Say hello.
            </p>
          ) : (
            messages.map((message) => {
              const isMine =
                message.senderId === user?._id;

              return (
                <div
                  key={message.messageId}
                  className={`flex ${
                    isMine
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      isMine
                        ? 'bg-black text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Test controls */}
        <ChatInput />

        <div className="border-t p-3">
          <button
            onClick={requestChatHistory}
            className="text-sm text-gray-500 underline"
          >
            Reload chat history
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatInput() {
  const [text, setText] = React.useState('');

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    sendMessage(trimmed);
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 border-t p-4"
    >
      <input
        value={text}
        onChange={(event) =>
          setText(event.target.value)
        }
        placeholder="Type a message..."
        className="flex-1 rounded-lg border px-4 py-2 outline-none"
        maxLength={1000}
      />

      <button
        type="submit"
        className="rounded-lg bg-black px-5 py-2 text-white"
      >
        Send
      </button>
    </form>
  );
}