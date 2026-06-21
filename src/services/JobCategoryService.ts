import { apiClient } from '@/utils/apiClient';
import type { JobCategory } from '@/types/position';

export class JobCategoryService {
    static async getAll(): Promise<JobCategory[]> {
        const response = await apiClient.get('/job-categories');
        return response.data;
    }

    static async create(data: { name: string; description?: string; sort_order?: number }): Promise<JobCategory> {
        const response = await apiClient.post('/job-categories', data);
        return response.data;
    }

    static async update(id: string, data: Partial<{ name: string; description: string; sort_order: number }>): Promise<JobCategory> {
        const response = await apiClient.patch(`/job-categories/${id}`, data);
        return response.data;
    }

    static async delete(id: string): Promise<void> {
        await apiClient.delete(`/job-categories/${id}`);
    }

    static async assignPositions(categoryId: string, positionIds: string[]): Promise<void> {
        await apiClient.patch(`/job-categories/${categoryId}/positions`, {
            position_ids: positionIds,
        });
    }
}
