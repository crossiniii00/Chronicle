import { ApplicationStatus } from '@/types';

export function formatQueueNumber(n: number): string {
    return `Q${String(n).padStart(3, '0')}`;
}

export function formatDate(iso: string): string {
    if (!iso || iso === '---') return '—';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso; // Return raw if not a date

    // Healing logic: Detect obviously wrong years for a 2024-2026 application
    // If year is 2001, it might be a typo for 2021 or 2024. 
    // For now, we display it but we can add a warning class in the UI.
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export const STATUS_LABELS: Record<string, string> = {
    'Accepted Offer': 'Accepted Offer',
    'ACCEPTED_OFFER': 'Accepted Offer',
    'ACCEPTED OFFER': 'Accepted Offer',
    'For Job Offer': 'For Job Offer',
    'FOR_JOB_OFFER': 'For Job Offer',
    'FOR JOB OFFER': 'For Job Offer',
    'Withdrawn': 'Withdrawn',
    'For PAN': 'For PAN',
    'Applicant Form': 'Applicant Form',
    'Lateral Transfer': 'Lateral Transfer',
    'Sent JO and BGC': 'Sent JO and BGC',
    'SENT_JO_AND_BGC': 'Sent JO and BGC',
    'SENT JO AND BGC': 'Sent JO and BGC',
    'Assessment': 'Assessment',
    'Open': 'Open',
    'Closed': 'Closed',
    'Hired': 'Hired',
    'PASSED': 'Passed',
    'FINAL_INTERVIEW_SCHEDULED': 'Scheduled',
    'FINAL_INTERVIEW': 'Final Interview',
    'INTERVIEW_IN_PROGRESS': 'In Progress',
    'QUEUE_ASSIGNED': 'Queued',
    'ENDORSED': 'Endorsed',
    'TYPING_TEST': 'Typing Test',
    'INITIAL_INTERVIEW': 'Initial Interview',
    'REJECTED': 'Rejected',
    'FAILED': 'Failed',
    'APPLIED': 'Applied'
};

export const STATUS_CSS: Record<string, string> = {
    'Accepted Offer': 'status-hired',
    'ACCEPTED_OFFER': 'status-hired',
    'ACCEPTED OFFER': 'status-hired',
    'For Job Offer': 'status-conditional',
    'FOR_JOB_OFFER': 'status-conditional',
    'FOR JOB OFFER': 'status-conditional',
    'Withdrawn': 'status-failed',
    'For PAN': 'status-waitlisted',
    'Applicant Form': 'status-applied',
    'Lateral Transfer': 'status-lateral-transfer',
    'Sent JO and BGC': 'status-queue-assigned',
    'SENT_JO_AND_BGC': 'status-queue-assigned',
    'SENT JO AND BGC': 'status-queue-assigned',
    'Assessment': 'status-assessment',
    'Open': 'status-applied',
    'Closed': 'status-failed',
    'Hired': 'status-hired',
    'PASSED': 'status-passed',
    'FINAL_INTERVIEW_SCHEDULED': 'status-schedule-later',
    'FINAL_INTERVIEW': 'status-final-interview',
    'INTERVIEW_IN_PROGRESS': 'status-interview-in-progress',
    'QUEUE_ASSIGNED': 'status-queue-assigned',
    'ENDORSED': 'status-endorsed',
    'TYPING_TEST': 'status-typing-test',
    'INITIAL_INTERVIEW': 'status-initial-interview',
    'REJECTED': 'status-rejected',
    'FAILED': 'status-failed',
    'APPLIED': 'status-applied'
};

export function getStatusClass(status: ApplicationStatus): string {
    return `badge ${STATUS_CSS[status] || 'status-applied'}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

export const EDUCATION_LEVELS = [
    'High School Diploma', 'Associate Degree', "Bachelor's Degree", "Master's Degree", 'Doctoral Degree', 'Vocational/Technical', 'Some College', 'Other'
];

export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];

export const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export const PROFICIENCY_LEVELS = ['Basic', 'Conversational', 'Proficient', 'Fluent', 'Native'];

export const DEPARTMENT_OPTIONS = ['Engineering', 'Human Resources', 'Marketing', 'Sales', 'Operations', 'Finance', 'Product', 'Analytics', 'Legal', 'Customer Success'];

// Generate mock chart data
export function generateDailyData(days = 7) {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        data.push({
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            applied: Math.floor(Math.random() * 15) + 3,
            approved: Math.floor(Math.random() * 10) + 2,
            hired: Math.floor(Math.random() * 4),
            failed: Math.floor(Math.random() * 5) + 1,
        });
    }
    return data;
}

export function getActionFriendlyLabel(action: string): string {
    if (!action) return 'System Event';
    const act = action.toUpperCase().trim();
    
    const mapping: Record<string, string> = {
        'AUTH.LOGIN': 'User Logged In',
        'AUTH.LOGOUT': 'User Logged Out',
        'APPLICATION.STATUS.UPDATE': 'Application Status Updated',
        'APPLICATION.DOCUMENT.UPLOAD': 'Document Uploaded',
        'SYSTEM.CONFIG.CHANGE': 'System Settings Changed',
        'INTERVIEW_ROOM.JOIN': 'Joined Interview Room',
        'INTERVIEW_ROOM.LEAVE': 'Left Interview Room',
        'APPLICATION BULK PATCH': 'Bulk Updated Applications',
        'APPLICATION_BULK_PATCH': 'Bulk Updated Applications',
        'CREATE_USER': 'User Account Created',
        'UPDATE_USER': 'User Account Updated',
        'DELETE_USER': 'User Account Deleted',
        'CREATE_POSITION': 'Job Posting Created',
        'UPDATE_POSITION': 'Job Posting Updated',
        'DELETE_POSITION': 'Job Posting Deleted',
        'CREATE_DEPARTMENT': 'Account Created',
        'UPDATE_DEPARTMENT': 'Account Updated',
        'DELETE_DEPARTMENT': 'Account Deleted',
    };

    if (mapping[act]) {
        return mapping[act];
    }

    return action
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

