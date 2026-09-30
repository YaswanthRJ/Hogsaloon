import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { GamePanel } from './GamePanel';
import {
  chooseRps,
  submitHandCricketToss,
} from '../../services/socket.service';

vi.mock('../../services/socket.service', () => ({
  chooseRps: vi.fn(),
  leaveGame: vi.fn(),
  submitHandCricketToss: vi.fn(),
  chooseHandCricketBatOrBowl: vi.fn(),
  submitHandCricketBall: vi.fn(),
}));

describe('GamePanel', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useAuthStore.getState().setUser({
      _id: 'player-a',
      email: 'player@example.com',
      username: 'player',
      imageUrl: '',
      interests: [],
      languages: [],
      profileCompleted: true,
    });
    vi.clearAllMocks();
  });

  it('sends the chosen RPS hand with the active game ID', () => {
    useGameStore.getState().startGame({
      gameId: 'rps-1',
      gameType: 'RPS',
      state: { round: 1, winsA: 0, winsB: 0 },
    });
    render(<GamePanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Rock' }));

    expect(chooseRps).toHaveBeenCalledWith('rps-1', 'ROCK');
  });

  it('submits only the toss number; the call comes from server state', () => {
    useGameStore.getState().startGame({
      gameId: 'cricket-1',
      gameType: 'HAND_CRICKET',
      state: {
        phase: 'TOSS',
        playerA: 'player-a',
        playerB: 'player-b',
        callA: 'ODD',
        callB: 'EVEN',
      },
    });
    render(<GamePanel />);

    expect(screen.getByText('Your assigned toss call: ODD')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Choose a toss number (1–10)'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(submitHandCricketToss).toHaveBeenCalledWith('cricket-1', 7);
  });
});