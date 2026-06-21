import { ApplicationStatus } from '@/types';
import { getStatusClass, STATUS_LABELS } from '@/utils/formatters';

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

    const isScheduleLater = status === 'FINAL_INTERVIEW' && schedulingStatus === 'PENDING';
    const cls = isScheduleLater ? 'badge status-schedule-later' : getStatusClass(status);
    const textSize = size === 'sm' ? 'text-xs' : 'text-xs';
    
    let label = STATUS_LABELS[status] || status;
    if (isScheduleLater) {
        label = hasFailedSomeButNotAllAccounts ? 'Scheduling to next account' : 'Scheduled for Later';
    }

    return (
        <span className={`${cls} ${textSize}`}>
            {label}
        </span>
    );
}
