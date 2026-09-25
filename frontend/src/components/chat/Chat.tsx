import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { endChat } from '../../services/socket.service';
import { ChatInput } from './ChatInput';

export function Chat() {
  const user = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages);
  const matchProfile = useChatStore((s) => s.matchProfile)!;
  const matchName = matchProfile.username;

  return (
    <div className="flex min-h-full justify-center p-4 sm:p-6">
      <div className="flex w-full max-w-6xl overflow-hidden rounded-2xl border border-hog-border bg-hog-surface shadow-2xl">
        {/* Profile */}
        <aside className="hidden w-72 shrink-0 border-r border-hog-border bg-hog-surface-alt p-6 md:flex md:flex-col">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-hog-pig">
              <img
                src={matchProfile.imageUrl}
                alt={matchName}
                className="h-full w-full object-cover"
              />
            </div>

            <h2 className="mt-4 text-xl font-semibold text-hog-text">
              {matchName}
            </h2>

            <p className="mt-2 text-sm leading-6 text-hog-text-muted">
              Get to know your match.
            </p>
          </div>

          <div className="mt-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-hog-text-muted">
              Interests
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {matchProfile.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-hog-bg px-3 py-1.5 text-xs text-hog-text"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-hog-text-muted">
              Languages
            </h3>

            <p className="mt-2 text-sm text-hog-text">
              {matchProfile.languages.join(', ')}
            </p>
          </div>
        </aside>

        {/* Chat */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-hog-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-hog-pig">
                <img
                  src={matchProfile.imageUrl}
                  alt={matchName}
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <h1 className="font-semibold text-hog-text">
                  {matchName}
                </h1>

                <p className="text-xs text-hog-text-muted">
                  Connected
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={endChat}
              className="rounded-lg px-3 py-2 text-sm font-medium text-hog-text-muted transition hover:bg-hog-surface-alt hover:text-hog-text"
            >
              End Chat
            </button>
          </header>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
            <div className="flex flex-col gap-3">
              {messages.map((message) => {
                const isMine = message.senderId === user?._id;

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

          {/* Input */}
          <ChatInput />
        </section>
      </div>
    </div>
  );
}