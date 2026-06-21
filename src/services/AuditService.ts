import { apiClient } from '@/utils/apiClient';

export interface AuditLog {
    id: string;
    user_id?: string;
    user_name?: string;
    user_role?: string;
    user_avatar?: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    ip_address?: string;
    details?: Record<string, unknown>;
    success: boolean;
    created_at: string;
}

export const AuditService = {
    getAll: async (): Promise<AuditLog[]> => {
        const response = await apiClient.get('/audit');
        return response.data;
    },
    getAllLogs: async (): Promise<AuditLog[]> => {
        const response = await apiClient.get('/audit');
        return response.data;
    },
    getRecentLogs: async (): Promise<AuditLog[]> => {
        const response = await apiClient.get('/audit');
        return response.data.slice(0, 50);
    },
    bulkDelete: async (ids: string[]): Promise<{ success: boolean; count: number }> => {
        const response = await apiClient.post('/audit/bulk-delete', { ids });
        return response.data;
    }
};
