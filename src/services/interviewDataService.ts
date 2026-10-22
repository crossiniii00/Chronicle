import { ApplicationService } from '@/services/ApplicationService';

export interface DailyStats {
    date: string;
    total_count: number;
    endorsed_count: number;
    endorsedOver_count: number;
    endorsedOps_count: number;
    passed_count: number;
    failed_count: number;
    interviews: InterviewRecord[];
}

export interface InterviewRecord {
    id: string;
    applicant_name: string;
    position_title: string;
    room_name: string;
    queue_type: 'INITIAL' | 'FINAL';
    status: 'PASSED' | 'ENDORSED' | 'ENDORSED_OVER' | 'ENDORSED_OPS' | 'DROPPED' | 'FAILED' | 'PENDING' | 'SCREENED';
    created_at: string;
    completed_at?: string;
    interviewer_name: string;
    department: string;
    raw_status?: string;
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
                endorsedOver_count: 0,
                endorsedOps_count: 0,
                passed_count: 0,
                failed_count: 0,
                interviews: []
            };
        }

        // Track which application IDs are already accounted for per day
        const dailyLatestMap: Record<string, Record<string, InterviewRecord>> = {};

        const nameLower = interviewerName.toLowerCase();

        // === SOURCE 1: Direct application records (Interview Form data & Tracker logic) ===
        allApps.forEach(app => {
            const isAssignedRecruiter = (app.assigned_recruiter_name || app.interviewer_name || '').toLowerCase() === nameLower;
            const scheduledByThem = (app.scheduled_by || '').toLowerCase() === nameLower;
            const appHistory = history.filter((h: any) => h.application_id === app.id && (h.changed_by_name || '').toLowerCase() === nameLower);
            
            // Check if they had interaction with this app
            if (!isAssignedRecruiter && !scheduledByThem && appHistory.length === 0) return;

            // Figure out the date they last interacted
            const activityDate = app.interview_completed_at || app.endorsement_meeting_date || app.created_at || (appHistory[0] && appHistory[0].changed_at);
            if (!activityDate) return;
            const dateStr = new Date(activityDate).toISOString().split('T')[0];
            
            if (dateStr < startDate || dateStr > endDate) return;
            if (!statsMap[dateStr]) return;
            if (!dailyLatestMap[dateStr]) dailyLatestMap[dateStr] = {};

            const isFailedStatus = ['FAILED', 'REJECTED'].includes(app.current_status || '');
            const isPassedStatus = [
                'ASSESSMENT', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 
                'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR JOB OFFER',
                'PASSED', 'HIRED', 'SENT_JO_AND_BGC', 'ACCEPTED_OFFER', 'CONTRACT_SENT', 'ENDORSED'
            ].includes(app.current_status || '');
            
            const didDropInHistory = appHistory.some((h: any) => ['FAILED', 'REJECTED'].includes(h.to_status));
            const didPassInHistory = appHistory.some((h: any) => ['ASSESSMENT', 'FINAL_INTERVIEW'].includes(h.to_status));
            
            const specStatus = String((app.pis as any)?.final_specific_status || (app.pis as any)?.specific_status || '').toLowerCase();
            const isNoShowStatus = specStatus.includes('no show') || specStatus.includes('noshow');
            const hasFinalResult = isPassedStatus || isFailedStatus || isNoShowStatus;
            const isFullyScheduled = !!app.endorsement_meeting_date || hasFinalResult || app.current_status === 'REPROFILE_FINAL_INTERVIEW';

            // calculate scheduledCount
            const accountSchedules = app.metadata?.account_schedules || {};
            let scheduledCount = 0;
            for (const scheduler of Object.values(accountSchedules)) {
                if ((scheduler as string).toLowerCase() === nameLower) scheduledCount++;
            }
            if (scheduledCount === 0 && scheduledByThem) scheduledCount = 1;

            let added = false;

            if (isAssignedRecruiter) {
                let status: InterviewRecord['status'] = 'SCREENED';
                if (isPassedStatus || didPassInHistory) {
                    status = 'ENDORSED_OVER';
                } else if (isFailedStatus || didDropInHistory) {
                    status = 'DROPPED';
                }
                
                dailyLatestMap[dateStr][`${app.id}-OVER`] = {
                    id: `${app.id}-OVER`,
                    applicant_name: app.applicant_name || 'Unknown',
                    position_title: app.position_title || 'General',
                    room_name: app.interview_room || 'Virtual Room',
                    queue_type: 'INITIAL',
                    status,
                    created_at: activityDate,
                    interviewer_name: interviewerName,
                    department: app.department || 'General',
                    raw_status: app.current_status || ''
                };
                added = true;
            }

            if (scheduledCount > 0 && isFullyScheduled) {
                for (let i = 0; i < scheduledCount; i++) {
                    dailyLatestMap[dateStr][`${app.id}-OPS-${i}`] = {
                        id: `${app.id}-OPS-${i}`,
                        applicant_name: app.applicant_name || 'Unknown',
                        position_title: app.position_title || 'General',
                        room_name: app.interview_room || 'Virtual Room',
                        queue_type: 'INITIAL',
                        status: 'ENDORSED_OPS',
                        created_at: activityDate,
                        interviewer_name: interviewerName,
                        department: app.department || 'General',
                        raw_status: app.current_status || ''
                    };
                    added = true;
                }
            }
            
            // If they interacted with it but it's neither of the above (just history)
            if (!added && appHistory.length > 0) {
                let status: InterviewRecord['status'] = 'SCREENED';
                if (isPassedStatus || didPassInHistory) status = 'ENDORSED_OVER';
                else if (isFailedStatus || didDropInHistory) status = 'DROPPED';
                
                dailyLatestMap[dateStr][`${app.id}-HIST`] = {
                    id: `${app.id}-HIST`,
                    applicant_name: app.applicant_name || 'Unknown',
                    position_title: app.position_title || 'General',
                    room_name: app.interview_room || 'Virtual Room',
                    queue_type: 'INITIAL',
                    status,
                    created_at: activityDate,
                    interviewer_name: interviewerName,
                    department: app.department || 'General',
                    raw_status: app.current_status || ''
                };
            }
        });

        // Populate statsMap from merged sources
        Object.keys(dailyLatestMap).forEach(dateStr => {
            const applicantsOnDay = Object.values(dailyLatestMap[dateStr]);

            applicantsOnDay.forEach(record => {
                statsMap[dateStr].interviews.push(record);
                
                if (record.status !== 'ENDORSED_OPS') {
                    statsMap[dateStr].total_count++;
                }

                if (record.status === 'ENDORSED_OVER') {
                    statsMap[dateStr].endorsedOver_count++;
                } else if (record.status === 'ENDORSED_OPS') {
                    statsMap[dateStr].endorsedOps_count++;
                } else if (record.status === 'DROPPED' || record.status === 'FAILED') {
                    statsMap[dateStr].failed_count++;
                } else if (record.status === 'PASSED') {
                    statsMap[dateStr].passed_count++;
                } else if (record.status === 'ENDORSED') {
                    statsMap[dateStr].endorsed_count++;
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
