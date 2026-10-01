import type { ChatMessage } from '../../store/chatStore';

interface MessageListProps {
  messages: ChatMessage[];
  userId: string | undefined;
}

export function MessageList({ messages, userId }: MessageListProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
      <div className="flex flex-col gap-3">
        {messages.map((message) => {
          const isMine = message.senderId === userId;

          return (
            <div
              key={message.messageId}
              className={`flex ${
                isMine ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={
                  isMine
                    ? 'max-w-[75%] rounded-2xl rounded-br-md bg-hog-primary px-4 py-2.5 text-hog-bg'
                    : 'max-w-[75%] rounded-2xl rounded-bl-md bg-hog-surface-alt px-4 py-2.5 text-hog-text'
                }
              >
                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6">
                  {message.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}