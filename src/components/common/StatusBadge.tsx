import { ApplicationStatus } from '@/types';
import { getStatusClass, getStatusLabel } from '@/utils/formatters';

interface StatusBadgeProps {
    status: ApplicationStatus;
    size?: 'sm' | 'md';
    schedulingStatus?: string;
    applicant?: any;
}

export function StatusBadge({ status, size = 'md', schedulingStatus, applicant }: StatusBadgeProps) {
    const hasFailedSomeButNotAllAccounts = (() => {
        if (!applicant) return false;
        const depts = (applicant.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        const failedAccounts = applicant.metadata?.failed_accounts || [];
        return failedAccounts.length > 0 && depts.length > 0;
    })();

    const isReprofiled = (() => {
        if (!applicant) return false;
        const history = applicant.pis?.reprofile_history || applicant.metadata?.reprofile_history || [];
        const hasHistory = Array.isArray(history) && history.length > 0;
        const hasReprofileFlag = applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true' || applicant.pis?.is_reprofiled === true || applicant.pis?.is_reprofiled === 'true';
        const failedAccounts = applicant.metadata?.failed_accounts || [];
        return hasHistory || hasReprofileFlag || failedAccounts.length > 0 || hasFailedSomeButNotAllAccounts;
    })();

    const specStatus = String(applicant?.pis?.final_specific_status || applicant?.final_specific_status || '').toLowerCase();
    const statusStr = String(status || '').toUpperCase();
    // Only show "No Show" override from final_specific_status if current_status hasn't been
    // explicitly changed to a different active status by the user
    const isStatusExplicitlyChanged = statusStr && !statusStr.includes('NO') && !statusStr.includes('SHOW') && 
        !['FAILED', 'REJECTED', 'WITHDRAWN', 'CLOSED', 'FINAL_INTERVIEW', 'FINAL INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(statusStr);
    const isNoShow = (specStatus.includes('no show') || specStatus.includes('noshow')) && !isStatusExplicitlyChanged;

    const isScheduleLater = status === 'FINAL_INTERVIEW' || status === 'FINAL_INTERVIEW_SCHEDULED' || status === 'FINAL INTERVIEW' || status === 'FINAL INTERVIEW SCHEDULED' || status === 'FOR_SCHEDULING' || status === 'REPROFILE_FINAL_INTERVIEW' || status === 'REPROFILE' || (isReprofiled && status === 'ACCOUNT_ASSIGNMENT') || specStatus.includes('reprofil');
    const isScheduled = Boolean(
        applicant?.endorsement_meeting_date || 
        applicant?.metadata?.endorsement_meeting_date || 
        (applicant?.pis as any)?.endorsement_meeting_date ||
        applicant?.assigned_ops_validator_name ||
        applicant?.assigned_ops_validator_id ||
        applicant?.metadata?.assigned_ops_validator_name ||
        applicant?.metadata?.assigned_ops_validator_id ||
        applicant?.recruiter_s_scheduling_status === 'SCHEDULED' ||
        applicant?.metadata?.recruiter_s_scheduling_status === 'SCHEDULED' ||
        schedulingStatus === 'SCHEDULED'
    );
    let cls = getStatusClass(status);
    const textSize = size === 'sm' ? 'text-xs' : 'text-xs';
    
    let label = getStatusLabel(status);
    if (isNoShow) {
        cls = 'badge bg-purple-50 text-purple-700 border border-purple-200';
        label = 'No Show';
    } else if (isScheduleLater) {
        if (isScheduled) {
            cls = 'badge bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm font-bold';
            label = isReprofiled ? 'Reprofile Ops Val Interview' : 'Ops Val Scheduled';
        } else {
            label = isReprofiled ? 'For Reprofiling' : 'For Ops Val Scheduling';
        }
    } else if (status === 'RESCHEDULED') {
        const fromStatus = applicant?.metadata?.rescheduled_from_status;
        if (fromStatus === 'INITIAL_INTERVIEW') {
            label = 'Rescheduled - Initial';
        } else if (fromStatus === 'ASSESSMENT') {
            label = 'Rescheduled - Proficiency Assessment';
        } else {
            label = 'Rescheduled';
        }
    }

    return (
        <span className={`${cls} ${textSize}`}>
            {label}
        </span>
    );
}
