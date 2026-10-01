import { useChatStore } from '../../store/chatStore';
import { MatchProfileSidebar } from './MatchProfileSidebar';
import { ChatHeader } from './ChatHeader';
import { ChatContent } from './ChatContent';

export function Chat() {
  const matchProfile = useChatStore((s) => s.matchProfile)!;

  return (
    <div className="flex min-h-full justify-center p-4 sm:p-6">
      <div className="flex w-full max-w-6xl overflow-hidden rounded-2xl border border-hog-border bg-hog-surface shadow-2xl">
        <MatchProfileSidebar matchProfile={matchProfile} />

        {/* Chat */}
        <section className="flex min-w-0 flex-1 flex-col">
          <ChatHeader matchProfile={matchProfile} />
          <ChatContent />
        </section>
      </div>
    </div>
  );
}