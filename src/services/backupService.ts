import { apiClient } from '@/utils/apiClient';

export interface BackupHistoryEntry {
    id: string;
    filename: string;
    size: number;
    created_at: string;
    type: 'full' | 'incremental' | 'settings';
    status: 'success' | 'failed';
}

export interface ActiveBackupInfo {
    filename: string;
    restored_at: string;
    size: number;
    exists: boolean;
}

export interface BackupSettings {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
    time: string;
    keepLast: number;
    compress: boolean;
}

export class BackupService {
    static async getSettings(): Promise<BackupSettings> {
        const response = await apiClient.get('/backups/settings');
        return response.data;
    }

    static async saveSettings(settings: BackupSettings): Promise<BackupSettings> {
        const response = await apiClient.post('/backups/settings', settings);
        return response.data;
    }

    static async getActiveBackup(): Promise<ActiveBackupInfo | null> {
        try {
            const response = await apiClient.get('/backups/active');
            return response.data;
        } catch {
            return null;
        }
    }

    static async createBackup(type: 'full' | 'incremental' | 'settings') {
        const response = await apiClient.post('/backups', { type });
        return response.data;
    }

    static async listBackups(): Promise<BackupHistoryEntry[]> {
        const response = await apiClient.get('/backups');
        return response.data;
    }

    static async restoreBackup(filename: string) {
        const response = await apiClient.post(`/backups/${encodeURIComponent(filename)}/restore`);
        return response.data;
    }

    static async deleteBackup(filename: string) {
        const response = await apiClient.delete(`/backups/${encodeURIComponent(filename)}`);
        return response.data;
    }

    static downloadBackup(filename: string) {
        const url = `/api/backups/${encodeURIComponent(filename)}/download`;
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    static async importBackup(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/backups/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
}
