import { apiClient } from '@/utils/apiClient';
import type { QueueEntry } from '@/types';

export class QueueService {
    /**
     * Orchestrates assigning a queue number through the backend.
     */
    static async assignQueue(payload: {
        applicationId: string;
        applicantName: string;
        queueType?: 'INITIAL' | 'FINAL';
        interviewerId?: string;
        interviewerName?: string;
        queuePrefix?: string;
    }) {
        const response = await apiClient.post(`/applications/${payload.applicationId}/queue`, {
            queueType: payload.queueType || 'INITIAL',
            queuePrefix: payload.queuePrefix,
            interviewerId: payload.interviewerId,
            interviewerName: payload.interviewerName
        });
        return response.data;
    }

    static async getTodayActive(type?: 'INITIAL' | 'FINAL') {
        const response = await apiClient.get('/queue/active', { params: { type } });
        return response.data;
    }

    static async getTodaysQueue() {
        const response = await apiClient.get('/queue/today');
        return response.data;
    }

    static async delete(id: string) {
        await apiClient.delete(`/queue/${id}`);
    }

    static async update(id: string, patch: Partial<QueueEntry> & Record<string, unknown>) {
        await apiClient.patch(`/queue/${id}`, patch);
    }

    static async resetQueue() {
        const response = await apiClient.post('/queue/reset');
        return response.data;
    }
}
