import { useNotificationStore } from '../../store/notificationStore';
import { ToastItem } from './ToastItem';

export function ToastHost() {
  const notifications = useNotificationStore((state) => state.notifications);
  const dismiss = useNotificationStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions removals"
      className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
    >
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}