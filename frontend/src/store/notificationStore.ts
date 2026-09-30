import { create } from 'zustand';

export interface NotificationAction {
  label: string;
  onSelect: () => void;
  dismissOnSelect?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  actions?: NotificationAction[];
  persistent?: boolean;
  durationMs?: number;
}

interface NotificationStore {
  notifications: AppNotification[];
  push: (notification: Omit<AppNotification, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let nextNotificationId = 0;

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  push: (notification) => {
    const id = `notification-${Date.now()}-${nextNotificationId++}`;
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
    return id;
  },

  dismiss: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id,
      ),
    }));
  },

  clear: () => set({ notifications: [] }),
}));