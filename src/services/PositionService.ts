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
    openingName?: string;
    manualRequirement?: number | null;
    manualJobOffers?: number | null;
    manualFallout?: number | null;
    manualActiveHires?: number | null;
    manualBalance?: number | null;
    manualDay1ShowUp?: number | null;
    salaryMatrixCategory?: string | null;
    classType?: string | null;
    rosterDate?: string | null;
    hiringReqHc?: number | null;
    totalOffersExtended?: number | null;
    netHiresInternal?: number | null;
    netHiresExternal?: number | null;
    joBalance?: number | null;
    notes?: string | null;
    country?: string | null;
    city?: string | null;
    requestDate?: string | null;
    approvalDate?: string | null;
    isBillable?: boolean | null;
    requesterName?: string | null;
    recruitmentProgress?: string | null;
    concatenate?: string | null;
    assignedCandidates?: string[];
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
    openingName?: string;
};

type PositionPayloadInput = Partial<Position> & {
    hiring_type?: string;
};

export class PositionService {
    static async getAll(): Promise<Position[]> {
        const response = await apiClient.get('/positions');
        const normalizeStr = (val: any): any => {
            if (Array.isArray(val)) {
                return val.map((v: any) => normalizeStr(v));
            }
            if (typeof val !== 'string' || !val) return val;
            return val.split(/[,|]/).map(part => {
                const t = part.trim().toUpperCase();
                if (t === 'DIA' || t === 'AGENT DIA' || t === 'AGENT-DIA' || t === 'AGENT - DIA') return 'AGENT - DIA';
                if (t === 'BDR' || t === 'AGENT BDR' || t === 'AGENT-BDR' || t === 'AGENT - BDR') return 'AGENT - BDR';
                return part.trim() || part;
            }).join(', ');
        };

        return (response.data as PositionApiResponse[]).map((position) => ({
            ...position,
            title: normalizeStr(position.title),
            department: normalizeStr(position.department),
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
            opening_name: position.opening_name ?? position.openingName ?? '',
            manual_requirement: position.manual_requirement ?? position.manualRequirement ?? null,
            manual_job_offers: position.manual_job_offers ?? position.manualJobOffers ?? null,
            manual_fallout: position.manual_fallout ?? position.manualFallout ?? null,
            manual_active_hires: position.manual_active_hires ?? position.manualActiveHires ?? null,
            manual_balance: position.manual_balance ?? position.manualBalance ?? null,
            manual_day_1_show_up: position.manual_day_1_show_up ?? position.manualDay1ShowUp ?? null,
            remaining_slots: Number(position.remaining_slots ?? position.remainingSlots ?? Math.max(0, Number(position.hiring_quota ?? position.hiringQuota ?? 0) - (Number(position.current_hired ?? position.currentHired ?? 0) + Number(position.manual_hired ?? position.manualHired ?? 0)))),
            category_id: position.category_id ?? null,
            country: position.country ?? null,
            city: position.city ?? null,
            notes: position.notes ?? null,
            requesterName: position.requester_name ?? position.requesterName ?? null,
            recruitmentProgress: position.recruitment_progress ?? position.recruitmentProgress ?? null,
            concatenate: position.concatenate ?? null,
            salaryMatrixCategory: position.salary_matrix_category ?? position.salaryMatrixCategory ?? null,
            classType: position.class_type ?? position.classType ?? null,
            rosterDate: position.roster_date ?? position.rosterDate ?? null,
            hiringReqHc: position.hiring_req_hc ?? position.hiringReqHc ?? null,
            totalOffersExtended: position.total_offers_extended ?? position.totalOffersExtended ?? null,
            netHiresInternal: position.net_hires_internal ?? position.netHiresInternal ?? null,
            netHiresExternal: position.net_hires_external ?? position.netHiresExternal ?? null,
            joBalance: position.jo_balance ?? position.joBalance ?? null,
            requestDate: position.request_date ?? position.requestDate ?? null,
            approvalDate: position.approval_date ?? position.approvalDate ?? null,
            isBillable: position.is_billable ?? position.isBillable ?? null,
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
        if (data.opening_name !== undefined) payload.openingName = data.opening_name;
        if ((data as any).openingName !== undefined) payload.openingName = (data as any).openingName;
        if ((data as any).opening_name !== undefined) payload.openingName = (data as any).opening_name;

        if (data.manual_requirement !== undefined) payload.manualRequirement = data.manual_requirement;
        if (data.manual_job_offers !== undefined) payload.manualJobOffers = data.manual_job_offers;
        if (data.manual_fallout !== undefined) payload.manualFallout = data.manual_fallout;
        if (data.manual_active_hires !== undefined) payload.manualActiveHires = data.manual_active_hires;
        if (data.manual_balance !== undefined) payload.manualBalance = data.manual_balance;
        if (data.manual_day_1_show_up !== undefined) payload.manualDay1ShowUp = data.manual_day_1_show_up;

        // New fields
        if (data.country !== undefined) payload.country = data.country;
        if (data.city !== undefined) payload.city = data.city;
        if (data.requester_name !== undefined) payload.requesterName = data.requester_name;
        if (data.recruitment_progress !== undefined) payload.recruitmentProgress = data.recruitment_progress;
        if (data.concatenate !== undefined) payload.concatenate = data.concatenate;
        if (data.salary_matrix_category !== undefined) payload.salaryMatrixCategory = data.salary_matrix_category;
        if (data.class_type !== undefined) payload.classType = data.class_type;
        if (data.roster_date !== undefined) payload.rosterDate = data.roster_date;
        if (data.hiring_req_hc !== undefined) payload.hiringReqHc = data.hiring_req_hc;
        if (data.total_offers_extended !== undefined) payload.totalOffersExtended = data.total_offers_extended;
        if (data.net_hires_internal !== undefined) payload.netHiresInternal = data.net_hires_internal;
        if (data.net_hires_external !== undefined) payload.netHiresExternal = data.net_hires_external;
        if (data.jo_balance !== undefined) payload.joBalance = data.jo_balance;
        if (data.notes !== undefined) payload.notes = data.notes;
        if (data.request_date !== undefined) payload.requestDate = data.request_date;
        if (data.approval_date !== undefined) payload.approvalDate = data.approval_date;
        if (data.is_billable !== undefined) payload.isBillable = data.is_billable;

        return payload;
    }
}
