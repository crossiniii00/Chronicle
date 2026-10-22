import { apiClient } from '@/utils/apiClient';

export interface DashboardStatsResponse {
    metrics: {
        activeUsersCount: number;
        activeApplicantsCount: number;
        totalApplications: number;
        activePositions: number;
        pendingApplications: number;
        hired: number;
        conversionPct: number;
        internalAppliedToday: number;
        externalAppliedToday: number;
        internalCandidatesCount?: number;
        externalCandidatesCount?: number;
    };
    trends: {
        activeApplicants: number | null;
        applications: number | null;
        positions: number | null;
        pending: number | null;
        hired: number | null;
        conversion: number | null;
    };
    recentAudits: any[];
    statusData: { name: string; value: number }[];
    roleDataRaw: { key: string; count: number }[];
    activeRecruiters: any[] | null;
    activeAccounts: any[] | null;
}

export const StatsService = {
    async getDashboardStats(dateFilter: string, start?: string | null, end?: string | null): Promise<DashboardStatsResponse> {
        let url = `/stats/dashboard?dateFilter=${dateFilter}`;
        if (start && end) {
            url += `&start=${start}&end=${end}`;
        }
        const response = await apiClient.get(url);
        return response.data;
    }
};
