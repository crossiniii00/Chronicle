export type PositionStatus = 'OPEN' | 'CLOSED';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract';
export type WorkArrangement = 'Remote' | 'Onsite' | 'Hybrid';

export interface Position {
    id: string;
    title: string;
    department: string;
    description: string;
    qualifications: string;
    hiring_quota: number;
    current_hired: number;
    manual_hired?: number;
    manualHired?: number;
    remaining_slots: number;
    quota_start_date?: string | null;
    quotaStartDate?: string | null;
    quota_end_date?: string | null;
    quotaEndDate?: string | null;
    status: PositionStatus;
    employment_type: EmploymentType;
    location: string;
    work_arrangement: WorkArrangement;
    created_at: string;
    created_by: string;
    hiring_request_id?: string;
    hiringRequestId?: string;
    training_start_date?: string | null;
    trainingStartDate?: string | null;
    hiring_quota_id?: string;
    hiringQuotaId?: string;
    hiring_type?: string;
    hiringType?: string;
    closed_date?: string;
    applicant_count?: number;
    time_limit_days?: number;
    type?: 'JOB_POSTING' | 'INTERNAL_QUOTA';
    image_url?: string;
    imageUrl?: string;
    category_id?: string | null;
}

export interface JobCategory {
    id: string;
    name: string;
    description?: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}
