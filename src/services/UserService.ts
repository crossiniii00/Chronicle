import { apiClient } from '@/utils/apiClient';
import type { User } from '@/types/user';

export class UserService {
    static async getAll(): Promise<User[]> {
        const response = await apiClient.get('/auth/users');
        return response.data;
    }

    static async getMe(): Promise<User> {
        const response = await apiClient.get('/auth/me');
        return response.data;
    }

    static async add(userData: Partial<User>): Promise<User> {
        try {
            const response = await apiClient.post('/auth/users', userData);
            return response.data;
        } catch (error: any) {
            console.error('[UserService] Provisioning Error:', error.response?.data || error.message);
            throw error;
        }
    }

    static async update(id: string, patch: Partial<User>): Promise<User> {
        const response = await apiClient.patch(`/auth/users/${id}`, patch);
        return response.data;
    }

    static async updateMe(patch: Partial<User>): Promise<User> {
        const response = await apiClient.patch('/auth/me', patch);
        return response.data.user;
    }

    static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await apiClient.patch('/auth/me/password', {
            current_password: currentPassword,
            new_password: newPassword,
        });
    }


    static async delete(id: string): Promise<void> {
        await apiClient.delete(`/auth/users/${id}`);
    }
}
