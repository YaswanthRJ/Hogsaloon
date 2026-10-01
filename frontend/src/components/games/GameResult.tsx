import { useAuthStore } from '../../store/authStore';
import type { ActiveGame } from '../../store/gameStore';

interface GameResultProps {
  activeGame: ActiveGame;
}

export function GameResult({ activeGame }: GameResultProps) {
  const userId = useAuthStore((state) => state.user?._id);
  const result = activeGame.result;

  if (!result) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-hog-border bg-hog-surface p-3">
      <p className="font-medium text-hog-text">
        {result.outcome === 'DRAW'
          ? 'The game is a draw.'
          : result.winnerId === userId
            ? 'You won.'
            : 'Your opponent won.'}
      </p>
      <p className="mt-1 text-sm text-hog-text-muted">
        Score: {result.scoreA}–{result.scoreB}
      </p>
    </div>
  );
}