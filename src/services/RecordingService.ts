import { apiClient } from '@/utils/apiClient';

/**
 * Service to handle interview audio recordings.
 * Connects to the local Express backend server.
 */
export class RecordingService {
    /**
     * Uploads the recorded audio blob to the backend server.
     * Returns the relative path/URL to access the file statically.
     */
    static async upload(blob: Blob, applicationId: string): Promise<string> {
        console.log(`[RecordingService] Starting upload for application: ${applicationId}`);
        console.log(`[RecordingService] Blob size: ${blob.size} bytes, type: ${blob.type}`);

        const formData = new FormData();
        const extension = blob.type.split('/')[1] || 'webm';
        formData.append('recording', blob, `interview_${applicationId}.${extension}`);

        const response = await apiClient.post(`/applications/${applicationId}/upload-recording`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log(`[RecordingService] Upload complete. Path: ${response.data.url}`);
        return response.data.url;
    }
}
