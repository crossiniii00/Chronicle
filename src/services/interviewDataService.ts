import { ApplicationService } from '@/services/ApplicationService';

export interface DailyStats {
    date: string;
    total_count: number;
    endorsed_count: number;
    failed_count: number;
    interviews: InterviewRecord[];
}

export interface InterviewRecord {
    id: string;
    applicant_name: string;
    position_title: string;
    room_name: string;
    queue_type: 'INITIAL' | 'FINAL';
    status: 'PASSED' | 'ENDORSED' | 'FAILED' | 'PENDING' | 'SCREENED';
    created_at: string;
    completed_at?: string;
    interviewer_name: string;
    department: string;
}

export async function fetchInterviewerStats(
    interviewerName: string,
    startDate: string,
    endDate: string
): Promise<DailyStats[]> {
    try {
        const [history, allApps] = await Promise.all([
            ApplicationService.getAllStatusHistory() || [],
            ApplicationService.getAll() || []
        ]);

        const currentStatusMap = new Map(allApps.map(app => [app.id, app.current_status]));

        const statsMap: Record<string, DailyStats> = {};

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

        // Initialize all days in the range with zeroed stats
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            statsMap[dateStr] = {
                date: dateStr,
                total_count: 0,
                endorsed_count: 0,
                failed_count: 0,
                interviews: []
            };
        }

        // Track which application IDs are already accounted for per day
        const dailyLatestMap: Record<string, Record<string, InterviewRecord>> = {};

        const nameLower = interviewerName.toLowerCase();

        // === SOURCE 1: Direct application records (Interview Form data) ===
        // Match by interviewer_name or assigned_recruiter_name
        allApps.forEach(app => {
            const interviewerMatch = (app.interviewer_name || '').toLowerCase() === nameLower;
            const recruiterMatch = (app.assigned_recruiter_name || '').toLowerCase() === nameLower;
            if (!interviewerMatch && !recruiterMatch) return;

            // Determine date from interview_completed_at only (do not fall back to updated_at/applied_at to avoid lumping imported data on the import date)
            const activityDate = app.interview_completed_at;
            if (!activityDate) return;
            const dateStr = new Date(activityDate).toISOString().split('T')[0];
            if (dateStr < startDate || dateStr > endDate) return;
            if (!statsMap[dateStr]) return;

            if (!dailyLatestMap[dateStr]) dailyLatestMap[dateStr] = {};

            const statusUpper = (app.current_status || '').toUpperCase();
            let workbenchStatus: InterviewRecord['status'] = 'PENDING';

            if (['PASSED', 'HIRED', 'HIRED_PROCESSED', 'ENDORSED', 'CONDITIONAL', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER'].includes(statusUpper)) {
                workbenchStatus = ['PASSED', 'HIRED', 'HIRED_PROCESSED'].includes(statusUpper) ? 'PASSED' : 'ENDORSED';
            } else if (['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE', 'WITHDRAWN'].includes(statusUpper)) {
                workbenchStatus = 'FAILED';
            } else if (app.interview_completed_at || app.interview_responses) {
                workbenchStatus = 'SCREENED';
            }

            dailyLatestMap[dateStr][app.id] = {
                id: app.id,
                applicant_name: app.applicant_name || 'Unknown',
                position_title: app.position_title || 'General',
                room_name: app.interview_room || 'Virtual Room',
                queue_type: 'INITIAL',
                status: workbenchStatus,
                created_at: activityDate,
                interviewer_name: app.interviewer_name || app.assigned_recruiter_name || interviewerName,
                department: app.department || 'General'
            };
        });

        // === SOURCE 2: Status history (supplement for records not caught by source 1) ===
        const relevantHistory = history.filter((h: any) => {
            const dateStr = h.changed_at.split('T')[0];
            return h.changed_by_name === interviewerName &&
                dateStr >= startDate &&
                dateStr <= endDate;
        });

        relevantHistory.sort((a: any, b: any) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

        relevantHistory.forEach((h: any) => {
            const dateStr = h.changed_at.split('T')[0];
            if (!statsMap[dateStr]) return;
            if (!dailyLatestMap[dateStr]) dailyLatestMap[dateStr] = {};

            // Skip if already captured from application source
            if (dailyLatestMap[dateStr][h.application_id]) return;

            const currentAppStatus = currentStatusMap.get(h.application_id);
            const statusToCheck = currentAppStatus || h.to_status;

            let workbenchStatus: InterviewRecord['status'] = 'PENDING';
            if (['PASSED', 'HIRED', 'ENDORSED', 'CONDITIONAL', 'ACCEPTED_OFFER'].includes(statusToCheck)) {
                workbenchStatus = ['PASSED', 'HIRED'].includes(statusToCheck) ? 'PASSED' : 'ENDORSED';
            } else if (['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE', 'WITHDRAWN'].includes(statusToCheck)) {
                workbenchStatus = 'FAILED';
            }

            dailyLatestMap[dateStr][h.application_id] = {
                id: h.id,
                applicant_name: h.applicant_name,
                position_title: h.position_title,
                room_name: h.room_name || 'Virtual Room',
                queue_type: 'INITIAL',
                status: workbenchStatus,
                created_at: h.changed_at,
                interviewer_name: h.changed_by_name,
                department: h.department || 'General'
            };
        });

        // Populate statsMap from merged sources
        Object.keys(dailyLatestMap).forEach(dateStr => {
            const applicantsOnDay = Object.values(dailyLatestMap[dateStr]);

            applicantsOnDay.forEach(record => {
                statsMap[dateStr].interviews.push(record);
                statsMap[dateStr].total_count++;

                if (['ENDORSED', 'PASSED'].includes(record.status)) {
                    statsMap[dateStr].endorsed_count++;
                } else if (record.status === 'FAILED') {
                    statsMap[dateStr].failed_count++;
                }
            });

            statsMap[dateStr].interviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });

        return Object.values(statsMap).sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
        console.error('Fetch Interviewer Stats Critical Error:', err);
        return [];
    }
}

export function generateCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const daysArr = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
        daysArr.push({
            date: current.toISOString().split('T')[0],
            day: current.getDate(),
            isCurrentMonth: current.getMonth() === month && current.getFullYear() === year,
            fullDate: current.toISOString().split('T')[0]
        });
        current.setDate(current.getDate() + 1);
    }

    return daysArr;
}
