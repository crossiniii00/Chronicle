import { apiClient } from '@/utils/apiClient';
import { NotificationType, Notification } from '@/types/misc';

export class NotificationService {
    static async getByUserId(userId: string): Promise<Notification[]> {
        const response = await apiClient.get(`/notifications/${userId}`);
        return response.data;
    }

    static async markAsRead(id: string): Promise<void> {
        await apiClient.patch(`/notifications/${id}/read`);
    }

    static async markAllRead(userId: string): Promise<void> {
        await apiClient.patch(`/notifications/user/${userId}/read-all`);
    }

    static async delete(id: string): Promise<void> {
        await apiClient.delete(`/notifications/${id}`);
    }

    static async deleteBulk(ids: string[]): Promise<void> {
        await apiClient.post('/notifications/delete-bulk', { ids });
    }

    static async notify(userId: string, title: string, message: string, type: NotificationType = 'system_announcement') {
        const response = await apiClient.post('/notifications', {
            userId,
            title,
            message,
            type
        });
        return response.data;
    }
}
