import { apiClient } from '@/utils/apiClient';
import type { Position } from '@/types/position';

export interface HiringQuotaHistory {
    id: string;
    department: string;
    positionId?: string | null;
    quota: number;
    hiredCount: number;
    totalApplicants: number;
    inPipeline: number;
    failedCount: number;
    startDate?: string | null;
    endDate?: string | null;
    hiringType?: string;
    manualHires?: number;
    trainingStartDate?: string | null;
    hiringQuotaId?: string;
    closedAt: string;
    createdAt?: string;
}

type PositionApiResponse = Position & {
    hiringQuota?: number;
    hiringType?: string;
    currentHired?: number;
    manualHired?: number;
    employmentType?: Position['employment_type'];
    workArrangement?: Position['work_arrangement'];
    requirements?: string;
    quotaStartDate?: string | null;
    quotaEndDate?: string | null;
    remainingSlots?: number;
    trainingStartDate?: string | null;
    training_start_date?: string | null;
    hiringQuotaId?: string;
    hiring_quota_id?: string;
};

type PositionPayloadInput = Partial<Position> & {
    hiring_type?: string;
};

export class PositionService {
    static async getAll(): Promise<Position[]> {
        const response = await apiClient.get('/positions');
        return (response.data as PositionApiResponse[]).map((position) => ({
            ...position,
            hiring_quota: Number(position.hiring_quota ?? position.hiringQuota ?? 0),
            hiring_type: position.hiring_type ?? position.hiringType ?? 'Billed',
            current_hired: Number(position.current_hired ?? position.currentHired ?? 0),
            manual_hired: Number(position.manual_hired ?? position.manualHired ?? 0),
            employment_type: position.employment_type ?? position.employmentType,
            work_arrangement: position.work_arrangement ?? position.workArrangement,
            qualifications: position.qualifications ?? position.requirements ?? '',
            quota_start_date: position.quota_start_date ?? position.quotaStartDate ?? null,
            quota_end_date: position.quota_end_date ?? position.quotaEndDate ?? null,
            training_start_date: position.training_start_date ?? position.trainingStartDate ?? null,
            hiring_quota_id: position.hiring_quota_id ?? position.hiringQuotaId ?? '',
            remaining_slots: Number(position.remaining_slots ?? position.remainingSlots ?? Math.max(0, Number(position.hiring_quota ?? position.hiringQuota ?? 0) - (Number(position.current_hired ?? position.currentHired ?? 0) + Number(position.manual_hired ?? position.manualHired ?? 0)))),
            category_id: position.category_id ?? null,
        }));
    }

    static async getAllOpen(): Promise<Position[]> {
        const positions = await this.getAll();
        return positions.filter(p => p.status === 'OPEN');
    }

    static async add(data: Partial<Position>): Promise<string> {
        const response = await apiClient.post('/positions', this.toApiPayload(data));
        return response.data.id;
    }

    static async update(id: string, patch: Partial<Position>): Promise<void> {
        await apiClient.patch(`/positions/${id}`, this.toApiPayload(patch));
    }

    static async delete(id: string): Promise<void> {
        await apiClient.delete(`/positions/${id}`);
    }

    static async updateApplicantCount(id: string, amount: number): Promise<void> {
        // In the real backend, this is usually calculated via SQL counts, 
        // but for compatibility with existing UI logic:
        await apiClient.patch(`/positions/${id}/count`, { amount });
    }

    static async getQuotaHistory(department?: string): Promise<HiringQuotaHistory[]> {
        const response = await apiClient.get('/positions/quota-history', {
            params: department ? { department } : undefined
        });
        return response.data;
    }

    static async archiveQuotaHistory(data: Omit<HiringQuotaHistory, 'id' | 'closedAt' | 'createdAt'>): Promise<void> {
        await apiClient.post('/positions/quota-history', data);
    }

    static async deleteQuotaHistory(id: string): Promise<void> {
        await apiClient.delete(`/positions/quota-history/${id}`);
    }

    static async updateQuotaHistory(id: string, data: Partial<HiringQuotaHistory>): Promise<void> {
        await apiClient.patch(`/positions/quota-history/${id}`, data);
    }

    static async getQuotaRequests(department?: string): Promise<any[]> {
        const response = await apiClient.get('/positions/quota-requests', {
            params: department ? { department } : undefined
        });
        return response.data;
    }

    static async addQuotaRequest(data: any): Promise<void> {
        await apiClient.post('/positions/quota-requests', data);
    }

    static async updateQuotaRequestStatus(id: string, status: string): Promise<void> {
        await apiClient.patch(`/positions/quota-requests/${id}`, { status });
    }

    private static toApiPayload(data: PositionPayloadInput): Record<string, unknown> {
        const payload: Record<string, unknown> = {};

        if (data.title !== undefined) payload.title = data.title;
        if (data.department !== undefined) payload.department = data.department;
        if (data.description !== undefined) payload.description = data.description;
        if (data.qualifications !== undefined) payload.qualifications = data.qualifications;
        if (data.hiring_quota !== undefined) payload.hiringQuota = data.hiring_quota;
        if (data.current_hired !== undefined) payload.currentHired = data.current_hired;
        if (data.manual_hired !== undefined) payload.manualHired = data.manual_hired;
        if (data.quota_start_date !== undefined) payload.quotaStartDate = data.quota_start_date;
        if (data.quota_end_date !== undefined) payload.quotaEndDate = data.quota_end_date;
        if (data.training_start_date !== undefined) payload.trainingStartDate = data.training_start_date;
        if (data.hiring_quota_id !== undefined) payload.hiringQuotaId = data.hiring_quota_id;
        if (data.status !== undefined) payload.status = data.status;
        if (data.employment_type !== undefined) payload.employmentType = data.employment_type;
        if (data.location !== undefined) payload.location = data.location;
        if (data.work_arrangement !== undefined) payload.workArrangement = data.work_arrangement;
        if (data.hiring_type !== undefined) payload.hiringType = data.hiring_type;
        if (data.category_id !== undefined) payload.category_id = data.category_id;

        return payload;
    }
}
