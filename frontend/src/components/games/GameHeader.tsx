import { leaveGame } from '../../services/socket.service';
import { useGameStore, type ActiveGame } from '../../store/gameStore';

interface GameHeaderProps {
  activeGame: ActiveGame;
}

export function GameHeader({ activeGame }: GameHeaderProps) {
  const dismissFinishedGame = useGameStore((state) => state.dismissFinishedGame);

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-semibold text-hog-text">
          {activeGame.gameType === 'RPS' ? 'Rock Paper Scissors' : 'Hand Cricket'}
        </h2>
        <p className="mt-1 text-xs text-hog-text-muted">
          {gameStatusText(
            activeGame.result,
            activeGame.waitingPhase,
            activeGame.opponentChoicePhase !== null,
          )}
        </p>
      </div>
      {activeGame.result ? (
        <button
          type="button"
          onClick={dismissFinishedGame}
          className="shrink-0 rounded-lg border border-hog-border px-3 py-1.5 text-sm text-hog-text-muted hover:bg-hog-surface"
        >
          Done
        </button>
      ) : (
        <button
          type="button"
          onClick={() => leaveGame(activeGame.gameId)}
          className="shrink-0 rounded-lg border border-hog-border px-3 py-1.5 text-sm text-hog-text-muted hover:bg-hog-surface"
        >
          Leave game
        </button>
      )}
    </header>
  );
}

function gameStatusText(
  result: ActiveGame['result'],
  waitingPhase: ActiveGame['waitingPhase'],
  opponentSubmitted: boolean,
): string {
  if (result) return 'Game finished';
  if (waitingPhase) return 'Waiting for the other player';
  if (opponentSubmitted) return 'Your opponent has submitted';
  return 'Play while you chat';
}