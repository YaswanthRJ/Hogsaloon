import { chooseRps } from '../../services/socket.service';
import type { ActiveGame } from '../../store/gameStore';

interface RpsGameProps {
  activeGame: ActiveGame;
}

export function RpsGame({ activeGame }: RpsGameProps) {
  const { gameId, state } = activeGame;
  const waitingForOpponent = activeGame.waitingPhase !== null;

  return (
    <div className="mt-3">
      <p className="text-sm text-hog-text">
        Round {activeGame.lastRpsRound?.round ?? numberFrom(state.round, 1)}
        {' · '}
        You {activeGame.lastRpsRound?.yourWins ?? numberFrom(state.winsA, 0)}
        {' – '}
        {activeGame.lastRpsRound?.opponentWins ?? numberFrom(state.winsB, 0)}
        {' opponent'}
      </p>
      {activeGame.lastRpsRound && (
        <p className="mt-1 text-sm text-hog-text-muted">
          You chose {activeGame.lastRpsRound.yourChoice}; opponent chose{' '}
          {activeGame.lastRpsRound.opponentChoice}.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {(['ROCK', 'PAPER', 'SCISSORS'] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={waitingForOpponent}
            onClick={() => chooseRps(gameId, choice)}
            className="rounded-lg border border-hog-border bg-hog-surface px-3 py-2 text-sm font-medium text-hog-text hover:bg-hog-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {choice[0] + choice.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}