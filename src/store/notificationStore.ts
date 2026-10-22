import { create } from 'zustand';
import { Notification } from '@/types';
import { NotificationService } from '@/services/NotificationService';
import { useAuthStore } from './authStore';

interface NotificationStore {
    notifications: Notification[];
    unreadCount: number;

    loadNotifications: (userId: string) => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    deleteBulkNotifications: (ids: string[]) => Promise<void>;
    addNotification: (n: Omit<Notification, 'id' | 'is_read' | 'created_at'>) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,

    loadNotifications: async (userId: string) => {
        try {
            // const notifs = await NotificationService.getByUserId(userId);
            // set({ notifications: notifs, unreadCount: notifs.filter(n => !n.is_read).length });
            set({ notifications: [], unreadCount: 0 });
        } catch (error) {
            console.error(error);
        }
    },

    markRead: async (id: string) => {
        try {
            const authStore = useAuthStore.getState();
            const userId = authStore.user?.id;
            if (!userId) return;
            
            await NotificationService.markAsRead(id);
            get().loadNotifications(userId);
        } catch (error) {
            console.error(error);
        }
    },

    markAllRead: async () => {
        try {
            const authStore = useAuthStore.getState();
            const userId = authStore.user?.id;
            if (!userId) return;
            
            await NotificationService.markAllRead(userId);
            get().loadNotifications(userId);
        } catch (error) {
            console.error(error);
        }
    },

    deleteNotification: async (id: string) => {
        try {
            const authStore = useAuthStore.getState();
            const userId = authStore.user?.id;
            if (!userId) return;
            
            await NotificationService.delete(id);
            get().loadNotifications(userId);
        } catch (error) {
            console.error(error);
        }
    },

    deleteBulkNotifications: async (ids: string[]) => {
        try {
            const authStore = useAuthStore.getState();
            const userId = authStore.user?.id;
            if (!userId) return;
            
            await NotificationService.deleteBulk(ids);
            get().loadNotifications(userId);
        } catch (error) {
            console.error(error);
        }
    },

    addNotification: async (n) => {
        try {
            await NotificationService.notify(n.user_id, n.title, n.message, n.notification_type);
            get().loadNotifications(n.user_id);
        } catch (error) {
            console.error(error);
        }
    },
}));
