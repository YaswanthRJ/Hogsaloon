import type { MatchProfile } from '../../store/chatStore';

interface MatchProfileSidebarProps {
  matchProfile: MatchProfile;
}

export function MatchProfileSidebar({ matchProfile }: MatchProfileSidebarProps) {
  const matchName = matchProfile.username;

  return (
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
  );
}