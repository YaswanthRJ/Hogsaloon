import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastItem } from './ToastItem';

describe('ToastItem', () => {
  it('runs an action and dismisses the notification', () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ToastItem
        notification={{
          id: 'invite-1',
          title: 'Game invitation',
          message: 'A player invited you.',
          persistent: true,
          actions: [{ label: 'Accept', onSelect }],
        }}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledWith('invite-1');
  });

  it('keeps an actionable notification until server confirmation when configured', () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ToastItem
        notification={{
          id: 'invite-2',
          title: 'Game invitation',
          message: 'A player invited you.',
          persistent: true,
          actions: [{ label: 'Accept', onSelect, dismissOnSelect: false }],
        }}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});