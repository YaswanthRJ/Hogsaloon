import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInput } from './ChatInput';
import { inviteToGame, sendMessage } from '../../services/socket.service';

vi.mock('../../services/socket.service', () => ({
  inviteToGame: vi.fn(),
  sendMessage: vi.fn(),
}));

describe('ChatInput', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens game choices and invites after selection without submitting a message', async () => {
    const user = userEvent.setup();
    render(<ChatInput />);

    await user.click(screen.getByRole('button', { name: 'Choose a game' }));
    await user.click(screen.getByRole('menuitem', { name: 'Hand Cricket' }));

    expect(inviteToGame).toHaveBeenCalledWith('HAND_CRICKET');
    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('keeps normal message submission unchanged', () => {
    render(<ChatInput />);
    fireEvent.change(screen.getByPlaceholderText('Write a message...'), {
      target: { value: 'hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(sendMessage).toHaveBeenCalledWith('hello');
    expect(inviteToGame).not.toHaveBeenCalled();
  });
});