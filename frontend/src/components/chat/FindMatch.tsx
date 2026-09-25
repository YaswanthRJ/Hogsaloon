import { useChatStore } from '../../store/chatStore';
import { joinQueue } from '../../services/socket.service';

export function FindMatch() {
  const setState = useChatStore((s) => s.setState);

  function handleFindMatch() {
    setState('SEARCHING');
    joinQueue();
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <section className="flex w-full max-w-xl flex-col items-center text-center">
        <p className="text-xl font-semibold tracking-tight text-hog-text">
          Meet someone new.
        </p>

        <p className="mt-5 max-w-md text-base leading-7 text-hog-text-muted">
          Connect with someone at random based on your interests and language
          preferences. No browsing, no swiping. Just start talking.
        </p>

        <button
          type="button"
          onClick={handleFindMatch}
          className="mt-8 rounded-xl bg-hog-primary px-7 py-3.5 font-semibold text-hog-bg transition hover:bg-hog-primary-hover focus:outline-none focus:ring-2 focus:ring-hog-primary/40"
        >
          Find Someone
        </button>

        <p className="mt-4 text-xs text-hog-text-muted">
          You can end the conversation whenever you want.
        </p>
      </section>
    </div>
  );
}