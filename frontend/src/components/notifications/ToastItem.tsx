import { useEffect } from 'react';
import type { AppNotification } from '../../store/notificationStore';

interface Props {
  notification: AppNotification;
  onDismiss: (id: string) => void;
}

export function ToastItem({ notification, onDismiss }: Props) {
  useEffect(() => {
    if (notification.persistent) {
      return;
    }

    const timeout = window.setTimeout(
      () => onDismiss(notification.id),
      notification.durationMs ?? 6000,
    );
    return () => window.clearTimeout(timeout);
  }, [notification, onDismiss]);

  return (
    <section
      role="status"
      className="pointer-events-auto w-full max-w-sm rounded-xl border border-hog-border bg-hog-surface p-4 text-hog-text shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{notification.title}</h2>
          <p className="mt-1 text-sm text-hog-text-muted">
            {notification.message}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(notification.id)}
          className="rounded px-2 text-lg leading-5 text-hog-text-muted hover:bg-hog-surface-alt hover:text-hog-text"
        >
          ×
        </button>
      </div>
      {notification.actions?.length ? (
        <div className="mt-3 flex justify-end gap-2">
          {notification.actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onSelect();
                if (action.dismissOnSelect !== false) {
                  onDismiss(notification.id);
                }
              }}
              className="rounded-lg border border-hog-border px-3 py-1.5 text-sm font-medium hover:bg-hog-surface-alt"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}