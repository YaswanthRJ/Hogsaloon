import { CircleDot, Hand } from 'lucide-react';

type GameType = 'RPS' | 'HAND_CRICKET';

interface GamePickerProps {
  selectedGame: GameType | null;
  onSelect: (gameType: GameType) => void;
}

const games = [
  {
    type: 'RPS' as const,
    icon: Hand,
    name: 'Rock Paper Scissors',
    description: 'Best of five',
  },
  {
    type: 'HAND_CRICKET' as const,
    icon: CircleDot,
    name: 'Hand Cricket',
    description: '2 overs',
  },
];

export function GamePicker({
  selectedGame,
  onSelect,
}: GamePickerProps) {
  return (
    <div className="flex h-full min-w-0 gap-2">
      {games.map((game) => {
        const isSelected =
          selectedGame === game.type;

        const Icon = game.icon;

        return (
          <div
            key={game.type}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={() => onSelect(game.type)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(game.type);
              }
            }}
            className={`
              flex min-w-0 flex-1 cursor-pointer
              items-center justify-center
              rounded-xl border
              bg-hog-surface-alt
              transition
              sm:justify-start
              sm:gap-3
              sm:px-3
              ${
                isSelected
                  ? 'border-hog-primary'
                  : 'border-hog-border hover:border-hog-primary'
              }
            `}
          >
            <Icon className="h-6 w-6 shrink-0 text-hog-text" />

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium text-hog-text">
                {game.name}
              </p>

              <p className="truncate text-xs text-hog-text-muted">
                {game.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}