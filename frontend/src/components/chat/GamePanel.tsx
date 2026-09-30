import { useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import {
  chooseHandCricketBatOrBowl,
  chooseRps,
  leaveGame,
  submitHandCricketBall,
  submitHandCricketToss,
} from '../../services/socket.service';

export function GamePanel() {
  const activeGame = useGameStore((state) => state.activeGame);
  const dismissFinishedGame = useGameStore((state) => state.dismissFinishedGame);
  const userId = useAuthStore((state) => state.user?._id);
  const [number, setNumber] = useState('');

  if (!activeGame) {
    return null;
  }

  const { gameId, gameType, state } = activeGame;
  const phase = typeof state.phase === 'string' ? state.phase : '';
  const opponentSubmitted = activeGame.opponentChoicePhase !== null;
  const waitingForOpponent = activeGame.waitingPhase !== null;

  return (
    <section className="shrink-0 border-b border-hog-border bg-hog-surface-alt px-5 py-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-hog-text">
            {gameType === 'RPS' ? 'Rock Paper Scissors' : 'Hand Cricket'}
          </h2>
          <p className="mt-1 text-xs text-hog-text-muted">
            {gameStatusText(activeGame.result, activeGame.waitingPhase, opponentSubmitted)}
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
            onClick={() => leaveGame(gameId)}
            className="shrink-0 rounded-lg border border-hog-border px-3 py-1.5 text-sm text-hog-text-muted hover:bg-hog-surface"
          >
            Leave game
          </button>
        )}
      </header>

      {activeGame.result ? (
        <div className="mt-3 rounded-lg border border-hog-border bg-hog-surface p-3">
          <p className="font-medium text-hog-text">
            {activeGame.result.outcome === 'DRAW'
              ? 'The game is a draw.'
              : activeGame.result.winnerId === userId
                ? 'You won.'
                : 'Your opponent won.'}
          </p>
          <p className="mt-1 text-sm text-hog-text-muted">
            Score: {activeGame.result.scoreA}–{activeGame.result.scoreB}
          </p>
        </div>
      ) : gameType === 'RPS' ? (
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
      ) : (
        <div className="mt-3">
          {phase === 'TOSS' && (
            <>
              <p className="text-sm text-hog-text">
                Your assigned toss call: {assignedTossCall(state, userId)}
              </p>
              <NumberForm
                label="Choose a toss number (1–10)"
                value={number}
                disabled={waitingForOpponent}
                onChange={setNumber}
                onSubmit={() => {
                  submitHandCricketToss(gameId, Number(number));
                  setNumber('');
                }}
              />
            </>
          )}

          {phase === 'TOSS_DECISION' && (
            <div className="mt-2">
              <p className="text-sm text-hog-text-muted">
                Toss: {numberFrom(state.tossNumberA, 0)} + {numberFrom(state.tossNumberB, 0)}
                {' = '}
                {numberFrom(state.tossNumberA, 0) + numberFrom(state.tossNumberB, 0)}
                {' · '}
                {state.winningCall === 'EVEN' ? 'Even' : 'Odd'}
              </p>
              {state.tossWinnerId === userId ? (
                <>
                  <p className="text-sm text-hog-text">You won the toss. Choose to bat or bowl.</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => chooseHandCricketBatOrBowl(gameId, 'BAT')}
                      className="rounded-lg border border-hog-border bg-hog-surface px-3 py-2 text-sm text-hog-text hover:bg-hog-bg"
                    >
                      Bat
                    </button>
                    <button
                      type="button"
                      onClick={() => chooseHandCricketBatOrBowl(gameId, 'BOWL')}
                      className="rounded-lg border border-hog-border bg-hog-surface px-3 py-2 text-sm text-hog-text hover:bg-hog-bg"
                    >
                      Bowl
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-hog-text-muted">Waiting for the toss winner to choose.</p>
              )}
            </div>
          )}

          {phase === 'INNINGS' && (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-hog-text">
                <span>Innings {numberFrom(state.inningsNumber, 1)} of 2</span>
                <span>
                  {state.battingPlayerId === userId ? 'You are batting' : 'You are bowling'}
                </span>
                <span>
                  Over {Math.floor(numberFrom(state.ballsBowled, 0) / 6)}.
                  {numberFrom(state.ballsBowled, 0) % 6}
                  {' / 2'}
                </span>
                <span>Current runs {numberFrom(state.currentInningsScore, 0)}</span>
                {typeof state.firstInningsScore === 'number' && (
                  <span>First innings {state.firstInningsScore}</span>
                )}
                {typeof state.target === 'number' && <span>Target {state.target}</span>}
              </div>
              {activeGame.lastHandCricketBall && (
                <p className="mt-1 text-sm text-hog-text-muted">
                  Last ball: {activeGame.lastHandCricketBall.ball.batterNumber} vs{' '}
                  {activeGame.lastHandCricketBall.ball.bowlerNumber}
                  {' · '}
                  {activeGame.lastHandCricketBall.ball.out
                    ? 'Out'
                    : `${activeGame.lastHandCricketBall.ball.runs} run${activeGame.lastHandCricketBall.ball.runs === 1 ? '' : 's'}`}
                </p>
              )}
              <NumberForm
                label="Choose a number (1–10)"
                value={number}
                disabled={waitingForOpponent}
                onChange={setNumber}
                onSubmit={() => {
                  submitHandCricketBall(gameId, Number(number));
                  setNumber('');
                }}
              />
            </>
          )}

          {waitingForOpponent && (
            <p role="status" className="mt-2 text-sm text-hog-text-muted">
              Your choice is locked in. Waiting for the other player.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

interface NumberFormProps {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function NumberForm({ label, value, disabled, onChange, onSubmit }: NumberFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const number = Number(value);
    if (Number.isInteger(number) && number >= 1 && number <= 10) {
      onSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-hog-text-muted">
        {label}
        <input
          type="number"
          min={1}
          max={10}
          step={1}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-24 rounded-lg border border-hog-border bg-hog-surface px-3 py-2 text-sm text-hog-text outline-none focus:border-hog-primary disabled:opacity-50"
        />
      </label>
      <button
        type="submit"
        disabled={disabled || !value}
        className="rounded-lg bg-hog-primary px-3 py-2 text-sm font-semibold text-hog-bg hover:bg-hog-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit
      </button>
    </form>
  );
}

function assignedTossCall(
  state: Record<string, unknown>,
  userId: string | undefined,
): string {
  const call = state.playerA === userId ? state.callA : state.callB;
  return typeof call === 'string' ? call : '—';
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function gameStatusText(
  result: { outcome: 'WINNER' | 'DRAW' } | null,
  waitingPhase: string | null,
  opponentSubmitted: boolean,
): string {
  if (result) return 'Game finished';
  if (waitingPhase) return 'Waiting for the other player';
  if (opponentSubmitted) return 'Your opponent has submitted';
  return 'Play while you chat';
}