import { apiClient } from '@/utils/apiClient';
import type { InterviewRoom } from '@/types/misc';

export class RoomService {
    static async getAll(): Promise<InterviewRoom[]> {
        const response = await apiClient.get('/rooms');
        return response.data;
    }

    static async add(data: Partial<InterviewRoom>): Promise<string> {
        const response = await apiClient.post('/rooms', data);
        return response.data.id;
    }

    static async update(id: string, patch: Partial<InterviewRoom>): Promise<void> {
        await apiClient.patch(`/rooms/${id}`, patch);
    }

    static async delete(id: string): Promise<void> {
        await apiClient.delete(`/rooms/${id}`);
    }
}
