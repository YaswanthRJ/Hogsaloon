import { useChatStore } from '../../store/chatStore';

export function Searching() {
  const endChat = useChatStore((s) => s.endChat);

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <h1 className="text-xl font-semibold tracking-tight text-hog-text">
          Finding someone...
        </h1>

        <p className="mt-4 text-base leading-7 text-hog-text-muted">
          We're looking for someone who matches your interests and language
          preferences.
        </p>

        <button
          type="button"
          onClick={endChat}
          className="mt-8 rounded-xl border border-hog-border px-5 py-3 text-sm font-medium text-hog-text-muted transition hover:bg-hog-surface hover:text-hog-text"
        >
          Cancel
        </button>
      </section>
    </div>
  );
}