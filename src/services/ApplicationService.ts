import { apiClient } from '@/utils/apiClient';
import type { ApplicationStatus, ApplicationUpdatePatch, PersonalInfoSheet, Application } from '@/types/application';
import type { Position } from '@/types/position';

type SubmitPersonalInfo = Omit<PersonalInfoSheet, 'id' | 'application_id'> & Partial<Pick<PersonalInfoSheet, 'id' | 'application_id'>>;



export class ApplicationService {
    static async submit(payload: {
        applicant_id: string;
        applicant_name: string;
        applicant_email: string;
        position: Position;
        resume_file?: File;
        resume_name: string;
        pis: SubmitPersonalInfo;
        typing_test?: {
            wpm: number;
            accuracy: number;
            duration: number;
        };
        onProgress?: (progress: number) => void;
    }) {
        const formData = new FormData();
        formData.append('applicantName', payload.applicant_name);
        formData.append('applicantEmail', payload.applicant_email);
        formData.append('positionId', payload.position.id);
        formData.append('positionTitle', payload.position.title);
        formData.append('department', payload.position.department || '');
        formData.append('metadata', JSON.stringify(payload.pis || {}));
        if (payload.pis && payload.pis.hiring_source) {
            formData.append('hiring_source', payload.pis.hiring_source);
        }

        if (payload.typing_test) {
            formData.append('typing_test_wpm', payload.typing_test.wpm.toString());
            formData.append('typing_test_accuracy', payload.typing_test.accuracy.toString());
            formData.append('typing_test_duration_seconds', payload.typing_test.duration.toString());
        }

        if (payload.resume_file) {
            formData.append('resume', payload.resume_file);
            formData.append('resumeName', payload.resume_name);
        }

        try {
            const response = await apiClient.post('/applications/public', formData, {
                onUploadProgress: (progressEvent) => {
                    if (payload.onProgress && progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        payload.onProgress(percentCompleted);
                    }
                },
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            return response.data;
        } catch (error: any) {
            const serverMessage = error.response?.data?.message;
            if (serverMessage) {
                error.message = serverMessage;
            }
            console.error('[Application Submit Error Details]', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    static async createInternal(payload: any) {
        const response = await apiClient.post('/applications/internal', payload);
        return response.data;
    }

    static async getAll(): Promise<Application[]> {
        const response = await apiClient.get('/applications');
        return response.data;
    }

    static async getById(id: string): Promise<Application> {
        const response = await apiClient.get(`/applications/${id}`);
        return response.data;
    }

    static async updateStatus(payload: {
        id: string;
        fromStatus?: string;
        toStatus: ApplicationStatus;
        changedByName: string;
        reason?: string;
        patch?: ApplicationUpdatePatch;
    }) {
        const response = await apiClient.patch(`/applications/${payload.id}/status`, {
            toStatus: payload.toStatus,
            reason: payload.reason,
            patch: payload.patch
        });
        return response.data;
    }

    static async patch(id: string, patch: ApplicationUpdatePatch) {
        const response = await apiClient.patch(`/applications/${id}`, patch);
        return response.data;
    }

    static async delete(id: string) {
        await apiClient.delete(`/applications/${id}`);
    }

    static async submitTypingTest(applicationId: string, result: {
        promptText: string;
        typedText: string;
        durationSeconds: number;
    }) {
        const response = await apiClient.post(`/applications/${applicationId}/typing-test`, result);
        return response.data;
    }

    static async getStatusHistory(applicationId: string) {
        const response = await apiClient.get(`/applications/${applicationId}/status-history`);
        return response.data;
    }

    static async getAllStatusHistory() {
        const response = await apiClient.get('/applications/all/status-history');
        return response.data;
    }

    static async assignQueueNumber(
        applicationId: string,
        applicantName: string,
        applicantUserId: string,
        queueType: 'INITIAL' | 'FINAL' = 'INITIAL',
        interviewerId?: string,
        interviewerName?: string
    ) {
        const response = await apiClient.post(`/applications/${applicationId}/queue`, {
            queueType,
            interviewerId,
            interviewerName
        });
        return response.data;
    }

    static async bulkCreate(records: Partial<Application>[]) {
        const response = await apiClient.post('/applications/bulk', records);
        return response.data;
    }

    static async bulkDelete(ids: string[]) {
        await apiClient.post('/applications/bulk-delete', { ids });
    }

    static async bulkPatch(ids: string[], fields: Partial<Application>) {
        await apiClient.patch('/applications/bulk-patch', { ids, fields });
    }
}
