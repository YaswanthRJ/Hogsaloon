import { useGameStore } from '../../store/gameStore';
import { GameHeader } from './GameHeader';
import { GameResult } from './GameResult';
import { HandCricketGame } from './hand-cricket/HandCricketGame';
import { RpsGame } from './rps/RpsGame';

export function GamePanel() {
  const activeGame = useGameStore((state) => state.activeGame);

  if (!activeGame) {
    return null;
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto border-b border-hog-border bg-hog-surface-alt px-5 py-4">
      <GameHeader activeGame={activeGame} />
      {activeGame.result ? (
        <GameResult activeGame={activeGame} />
      ) : activeGame.gameType === 'RPS' ? (
        <RpsGame activeGame={activeGame} />
      ) : (
        <HandCricketGame activeGame={activeGame} />
      )}
    </section>
  );
}
