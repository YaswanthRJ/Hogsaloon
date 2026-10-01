import { endChat } from '../../services/socket.service';
import type { MatchProfile } from '../../store/chatStore';

interface ChatHeaderProps {
  matchProfile: MatchProfile;
}

export function ChatHeader({ matchProfile }: ChatHeaderProps) {
  const matchName = matchProfile.username;

  return (
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
  );
}