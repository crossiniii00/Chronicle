import { apiClient } from '@/utils/apiClient';

export class ReportConfigService {
    static async getAll(): Promise<Record<string, Record<string, any>>> {
        const response = await apiClient.get('/report-configs');
        return response.data;
    }

    static async getById(id: string): Promise<Record<string, any> | null> {
        const response = await apiClient.get(`/report-configs/${id}`);
        return response.data?.config_data || null;
    }

    static async update(id: string, data: Record<string, any>): Promise<void> {
        await apiClient.post(`/report-configs/${id}`, data);
    }
}
