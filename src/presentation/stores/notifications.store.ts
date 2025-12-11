import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsState {
  items: NotificationItem[];
  unread: number;
  isLoaded: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (n: NotificationItem) => void;
  markAllRead: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      unread: 0,
      isLoaded: false,
      fetchNotifications: async () => {
        if (get().isLoaded) return;
        try {
          const res = await fetch("/api/notifications");
          if (!res.ok) return;
          const data = await res.json();
          set({
            items: data.notifications || [],
            unread: data.unreadCount || 0,
            isLoaded: true,
          });
        } catch (e) {
          /* ignore */
        }
      },
      addNotification: (n: NotificationItem) => {
        set((state) => {
          const existing = state.items.find((x) => x.id === n.id);
          if (existing) return state;
          return {
            items: [n, ...state.items].slice(0, 50),
            unread: state.unread + 1,
          };
        });
      },
      markAllRead: async () => {
        set({
          unread: 0,
          items: get().items.map((n) => ({ ...n, isRead: true })),
        });
        try {
          await fetch("/api/notifications", { method: "PATCH" });
        } catch (e) {
          /* ignore */
        }
      },
    }),
    { name: "notifications-store" }
  )
);
