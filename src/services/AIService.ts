import { apiClient } from '@/utils/apiClient';

export type HiringType = 'Billed' | 'Non-Billed';

export interface QuotaHistoryItem {
    quota?: number;
    hiredCount?: number;
    totalApplicants?: number;
    inPipeline?: number;
    failedCount?: number;
    startDate?: string | null;
    endDate?: string | null;
    durationDays?: number;
    hiringType?: HiringType;
}

export interface SuggestQuotaPayload {
    department: string;
    history: QuotaHistoryItem[];
    currentQuota?: number;
}

export interface SuggestQuotaResult {
    suggestedQuota: number;
    hiringType: HiringType;
    durationDays: number;
    reasoning: string;
    source?: 'stub' | 'openai' | 'anthropic' | 'gemini' | 'opencode_zen';
}

export interface SummarizeInterviewPayload {
    notes?: string;
    ratingReason?: string;
}

export interface SummarizeInterviewResult {
    summary: string;
    riskFlags: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    source?: 'stub' | 'openai' | 'anthropic' | 'gemini' | 'opencode_zen';
}

export interface SuggestHiringRequestIdPayload {
    department: string;
    periodStart?: string;
    periodEnd?: string;
    hiringType?: HiringType;
}

export interface SuggestHiringRequestIdResult {
    hiringRequestId: string;
    confidence: number;
    source?: 'stub' | 'openai' | 'anthropic' | 'gemini' | 'opencode_zen';
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
    role: ChatRole;
    content: string;
}

export interface ChatPayload {
    messages: ChatMessage[];
}

export type ApplicantColumn = 'name' | 'position' | 'status' | 'school' | 'education' | 'course' | 'department' | 'gender' | 'rating' | 'score' | 'wpm' | 'accuracy' | 'applied' | 'hired';

export interface AnalyticsConfig {
    title: string;
    description: string | null;
    viz: 'bar' | 'pie' | 'line' | 'area' | 'funnel' | 'table' | 'kpi' | 'applicant_list';
    filters: Record<string, string | undefined>;
    group_by: string | null;
    metric: 'passing_rate' | 'hired' | 'failed' | 'in_pipeline' | 'total' | 'count';
    reason: string | null;
    limit?: number;
    search?: string | null;
    sort_by?: string | null;
    columns?: ApplicantColumn[] | null;
}

export interface ApplicantRow {
    id: string;
    name: string | null;
    email: string | null;
    position: string | null;
    department: string | null;
    currentStatus: string | null;
    appliedAt: string | null;
    gender: string | null;
    highestEducation: string | null;
    school: string | null;
    course: string | null;
    degree: string | null;
    assessmentScore: number | null;
    clientAssessmentScore: number | null;
    typingTestWpm: number | null;
    typingTestAccuracy: number | null;
    personalRating: number | null;
    hiredAt: string | null;
    masterHiringRequestId: string | null;
    masterWave: string | null;
    masterBasicSalary: number | null;
}

export interface SearchApplicantsResult {
    total: number;
    sortBy?: string | null;
    applicants: ApplicantRow[];
}

export type UIAction =
    | { type: 'navigate'; path: string; search: Record<string, string> | null; target: string | null; message: string | null; reason: string | null }
    | { type: 'logout'; reason: string | null }
    | { type: 'refresh'; reason: string | null }
    | { type: 'open_modal'; modalId: string; params: Record<string, string> | null; reason: string | null }
    | { type: 'open_analytics_dashboard'; config: AnalyticsConfig }
    | { type: 'open_applicant'; applicantId: string | null; applicantName: string | null; reason: string | null }
    | { type: 'highlight_applicant'; applicantId: string; applicantName: string | null; color: string; reason: string | null }
    | { type: 'edit_applicant'; applicantId: string; applicantName: string | null; field: string; fieldLabel?: string | null; oldValue: unknown; newValue: unknown; reason: string | null; committed: boolean };

export interface ChatResult {
    reply: string;
    source?: 'stub' | 'openai' | 'anthropic' | 'gemini' | 'opencode_zen';
    actions?: UIAction[] | null;
}

export interface AIStatus {
    provider: string;
    openaiConfigured: boolean;
    anthropicConfigured: boolean;
    geminiConfigured: boolean;
    opencodeZenConfigured: boolean;
    openaiModel: string;
    anthropicModel: string;
    geminiModel: string;
    opencodeZenModel: string;
    opencodeZenBaseUrl: string;
}

export class AIService {
    static async getStatus(): Promise<AIStatus> {
        const { data } = await apiClient.get('/ai/status');
        return data;
    }

    static async suggestQuota(payload: SuggestQuotaPayload): Promise<SuggestQuotaResult> {
        const { data } = await apiClient.post('/ai/suggest-quota', payload);
        return data;
    }

    static async summarizeInterview(payload: SummarizeInterviewPayload): Promise<SummarizeInterviewResult> {
        const { data } = await apiClient.post('/ai/summarize-interview', payload);
        return data;
    }

    static async suggestHiringRequestId(payload: SuggestHiringRequestIdPayload): Promise<SuggestHiringRequestIdResult> {
        const { data } = await apiClient.post('/ai/suggest-hiring-request-id', payload);
        return data;
    }

    static async chat(payload: ChatPayload): Promise<ChatResult> {
        const { data } = await apiClient.post('/ai/chat', payload);
        return data;
    }

    static async aggregateApplicants(filters: Record<string, string | undefined>, groupBy?: string | null): Promise<unknown> {
        const payload: { filters: Record<string, string | undefined>; group_by?: string | null } = { filters };
        if (groupBy) payload.group_by = groupBy;
        const { data } = await apiClient.post('/ai/aggregate-applicants', payload);
        return data;
    }

    static async searchApplicants(payload: {
        filters?: Record<string, string | undefined>;
        limit?: number;
        search?: string | null;
        sort_by?: string | null;
    }): Promise<SearchApplicantsResult> {
        const body = {
            filters: payload.filters || {},
            limit: payload.limit ?? 50,
            ...(payload.search ? { search: payload.search } : {}),
            ...(payload.sort_by ? { sort_by: payload.sort_by } : {}),
        };
        const { data } = await apiClient.post('/ai/search-applicants', body);
        return data;
    }

    static async getFunnel(payload: {
        filters?: Record<string, string | undefined>;
        group_by?: string | null;
    } = {}): Promise<{
        stages: Array<{ key: string; label: string; count: number; conversionFromTopPct: number; conversionFromPrevPct: number }>;
        topCount: number;
        filters: Record<string, unknown>;
        groupBy?: string;
        groups?: Array<{ key: string; label: string; topCount: number; stages: Array<{ key: string; label: string; count: number; conversionFromTopPct: number; conversionFromPrevPct: number }> }>;
    }> {
        const body: { filters: Record<string, string | undefined>; group_by?: string } = { filters: payload.filters || {} };
        if (payload.group_by) body.group_by = payload.group_by;
        const { data } = await apiClient.post('/ai/funnel-applicants', body);
        return data;
    }

    static async synthesizeSpeech(payload: {
        text: string;
        voice_id?: string;
        model_id?: string;
        stability?: number;
        similarity_boost?: number;
    }): Promise<Blob> {
        const { data } = await apiClient.post('/ai/tts', payload, { responseType: 'blob' });
        return data as Blob;
    }
}
