import { ApplicationStatus } from '@/types';

// Canonical timezone for all date display in the application
export const APP_TIMEZONE = 'Asia/Manila';

/** Get year/month/day/weekday in Manila timezone for a Date object */
export function toManilaDateParts(d: Date): { year: number; month: number; day: number; weekday: number } {
    // Use Intl to extract numeric parts in Manila timezone
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: APP_TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        weekday: 'short', // not used numerically but helps with formatting
    }).formatToParts(d);
    const year = Number(parts.find(p => p.type === 'year')?.value || d.getFullYear());
    const month = Number(parts.find(p => p.type === 'month')?.value || (d.getMonth() + 1)) - 1; // 0-indexed
    const day = Number(parts.find(p => p.type === 'day')?.value || d.getDate());
    // For weekday (0=Sun), create a date from the Manila parts and get the day
    const manilaDate = new Date(year, month, day);
    const weekday = manilaDate.getDay();
    return { year, month, day, weekday };
}

/** Get a comparable date string (YYYY-MM-DD) in Manila timezone */
export function toManilaDateString(d: Date): string {
    return d.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE }); // en-CA gives YYYY-MM-DD format
}

export function formatQueueNumber(n: number, prefix: string = 'Q'): string {
    if (prefix === 'ONL' || prefix === 'ON-CALL' || prefix === 'ONLINE') {
        return prefix;
    }
    return `${prefix}${String(n).padStart(3, '0')}`;
}

export function formatCandidateName(name: string | undefined | null): string {
    if (!name || typeof name !== 'string') return '';
    const trimmed = name.trim();
    if (!trimmed) return '';

    return trimmed
        .toLowerCase()
        .split(/\s+/)
        .map(word => {
            if (!word) return '';
            if (word.includes('-')) {
                return word.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

export function formatDate(iso: string): string {
    if (!iso || iso === '---') return '—';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso; // Return raw if not a date

    // Healing logic: Detect obviously wrong years for a 2024-2026 application
    // If year is 2001, it might be a typo for 2021 or 2024. 
    // For now, we display it but we can add a warning class in the UI.
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: APP_TIMEZONE });
}

export function formatDateTime(iso: string): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE });
}

export function calculateAge(birthDateString?: string | null): number | undefined {
    if (!birthDateString) return undefined;
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
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
    'FOR_JOB_OFFE': 'For Job Offer',
    'Withdrawn': 'Withdrawn',
    'For PAN': 'For PAN',
    'FOR_PAN': 'For PAN',
    'FOR PAN': 'For PAN',
    'PAN COMPLETED': 'PAN Completed',
    'PAN_COMPLETED': 'PAN Completed',
    'PAN Issued; for Signature': 'PAN Issued; For Signature',
    'PAN Issued; For Signature': 'PAN Issued; For Signature',
    'PAN ISSUED; FOR SIGNATURE': 'PAN Issued; For Signature',
    'PAN ISSUED FOR SIGNATURE': 'PAN Issued; For Signature',
    'PAN_ISSUED_FOR_SIGNATURE': 'PAN Issued; For Signature',
    'PAN_ISSUED;_FOR_SIGNATURE': 'PAN Issued; For Signature',
    'PAN FOR APPROVAL': 'PAN Out for Approval',
    'PAN_FOR_APPROVAL': 'PAN Out for Approval',
    'PAN OUT FOR APPROVAL': 'PAN Out for Approval',
    'PAN_OUT_FOR_APPROVAL': 'PAN Out for Approval',
    'PAN Out for Approval': 'PAN Out for Approval',
    'FOR PAN AND BI': 'For PAN and BI',
    'FOR_PAN_AND_BI': 'For PAN and BI',
    'External': 'External',
    'EXTERNAL': 'External',
    'Lateral Transfer': 'Accepted Offer',
    'LATERAL_TRANSFER': 'Accepted Offer',
    'LATERAL TRANSFER': 'Accepted Offer',
    'PROMOTED': 'Accepted Offer',
    'PROMOTION': 'Accepted Offer',
    'Promoted': 'Accepted Offer',
    'Sent JO and BGC': 'Sent JO and BGC',
    'SENT_JO_AND_BGC': 'Sent JO and BGC',
    'SENT JO AND BGC': 'Sent JO and BGC',
    'Assessment': 'Assessment',
    'Open': 'Open',
    'Closed': 'Closed',
    'Hired': 'Accepted Offer',
    'HIRED': 'Accepted Offer',
    'HIRED_PROCESSED': 'Accepted Offer',
    'HIRED PROCESSED': 'Accepted Offer',
    'PASSED': 'Passed',
    'Passed': 'Passed',
    'FINAL_INTERVIEW_SCHEDULED': 'For Ops Val Scheduling',
    'FINAL_INTERVIEW': 'For Ops Val Scheduling',
    'FINAL INTERVIEW SCHEDULED': 'For Ops Val Scheduling',
    'FINAL INTERVIEW': 'For Ops Val Scheduling',
    'FOR_SCHEDULING': 'For Ops Val Scheduling',
    'INTERVIEW_IN_PROGRESS': 'In Progress',
    'QUEUE_ASSIGNED': 'Queued',
    'ENDORSED': 'Endorsed',
    'TYPING_TEST': 'Typing Test',
    'INITIAL_INTERVIEW': 'Initial Interview',
    'REJECTED': 'Failed',
    'FAILED': 'Failed',
    'APPLIED': 'Typing Test',
    'MARKED_PENDING': 'Marked Pending',
    'WAITING': 'Waiting (Pooled)',
    'WAITING_(POOLED)': 'Waiting (Pooled)',
    'WAITING (POOLED)': 'Waiting (Pooled)',
    'WAITING POOL': 'Waiting (Pooled)',
    'Waiting': 'Waiting (Pooled)',
    'POOL': 'Waiting (Pooled)',
    'Pooled': 'Waiting (Pooled)'
};

export const STATUS_CSS: Record<string, string> = {
    'Accepted Offer': 'status-hired',
    'ACCEPTED_OFFER': 'status-hired',
    'ACCEPTED OFFER': 'status-hired',
    'For Job Offer': 'status-conditional',
    'FOR_JOB_OFFER': 'status-conditional',
    'FOR JOB OFFER': 'status-conditional',
    'FOR_JOB_OFFE': 'status-conditional',
    'Withdrawn': 'status-failed',
    'For PAN': 'status-for-pan',
    'FOR_PAN': 'status-for-pan',
    'FOR PAN': 'status-for-pan',
    'PAN COMPLETED': 'status-pan-completed',
    'PAN_COMPLETED': 'status-pan-completed',
    'PAN Issued; for Signature': 'status-pan-signature',
    'PAN Issued; For Signature': 'status-pan-signature',
    'PAN ISSUED; FOR SIGNATURE': 'status-pan-signature',
    'PAN ISSUED FOR SIGNATURE': 'status-pan-signature',
    'PAN_ISSUED_FOR_SIGNATURE': 'status-pan-signature',
    'PAN_ISSUED;_FOR_SIGNATURE': 'status-pan-signature',
    'PAN FOR APPROVAL': 'status-pan-approval',
    'PAN_FOR_APPROVAL': 'status-pan-approval',
    'PAN OUT FOR APPROVAL': 'status-pan-approval',
    'PAN_OUT_FOR_APPROVAL': 'status-pan-approval',
    'PAN Out for Approval': 'status-pan-approval',
    'FOR PAN AND BI': 'status-for-pan',
    'FOR_PAN_AND_BI': 'status-for-pan',
    'External': 'status-applied',
    'EXTERNAL': 'status-applied',
    'Applicant Form': 'status-applied',
    'Lateral Transfer': 'status-hired',
    'LATERAL_TRANSFER': 'status-hired',
    'LATERAL TRANSFER': 'status-hired',
    'PROMOTED': 'status-hired',
    'PROMOTION': 'status-hired',
    'Promoted': 'status-hired',
    'Sent JO and BGC': 'status-sent-jo',
    'SENT_JO_AND_BGC': 'status-sent-jo',
    'SENT JO AND BGC': 'status-sent-jo',
    'Assessment': 'status-assessment',
    'Open': 'status-applied',
    'Closed': 'status-failed',
    'Hired': 'status-hired',
    'HIRED': 'status-hired',
    'HIRED_PROCESSED': 'status-hired',
    'HIRED PROCESSED': 'status-hired',
    'PASSED': 'status-conditional',
    'Passed': 'status-conditional',
    'FINAL_INTERVIEW_SCHEDULED': 'status-schedule-later',
    'FINAL_INTERVIEW': 'status-schedule-later',
    'FINAL INTERVIEW SCHEDULED': 'status-schedule-later',
    'FINAL INTERVIEW': 'status-schedule-later',
    'FOR_SCHEDULING': 'status-schedule-later',
    'INTERVIEW_IN_PROGRESS': 'status-interview-in-progress',
    'QUEUE_ASSIGNED': 'status-queue-assigned',
    'ENDORSED': 'status-endorsed',
    'TYPING_TEST': 'status-typing-test',
    'INITIAL_INTERVIEW': 'status-initial-interview',
    'REJECTED': 'status-failed',
    'FAILED': 'status-failed',
    'APPLIED': 'status-applied',
    'MARKED_PENDING': 'status-schedule-later',
    'WAITING': 'status-waitlisted',
    'WAITING_(POOLED)': 'status-waitlisted',
    'WAITING (POOLED)': 'status-waitlisted',
    'WAITING POOL': 'status-waitlisted',
    'Waiting': 'status-waitlisted',
    'POOL': 'status-waitlisted',
    'Pooled': 'status-waitlisted'
};

export function getStatusClass(status: ApplicationStatus | string): string {
    if (!status) return 'badge status-applied';
    const key = String(status).trim();
    if (STATUS_CSS[key]) return `badge ${STATUS_CSS[key]}`;
    
    const normalizedKey = key.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (STATUS_CSS[normalizedKey]) return `badge ${STATUS_CSS[normalizedKey]}`;

    const upperKey = normalizedKey.toUpperCase();
    const match = Object.keys(STATUS_CSS).find(k => k.toUpperCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim() === upperKey);
    if (match) return `badge ${STATUS_CSS[match]}`;

    // Smart fallback for PAN variations
    if (upperKey.includes('PAN')) {
        if (upperKey.includes('APPROVAL') || upperKey.includes('OUT')) return 'badge status-pan-approval';
        if (upperKey.includes('SIGNATURE') || upperKey.includes('ISSUED')) return 'badge status-pan-signature';
        if (upperKey.includes('COMPLETED') || upperKey.includes('DONE')) return 'badge status-pan-completed';
        if (upperKey.includes('FOR PAN') || upperKey.includes('BI')) return 'badge status-for-pan';
    }

    return 'badge status-applied';
}

export function getStatusLabel(status: ApplicationStatus | string): string {
    if (!status) return '';
    const key = String(status).trim();
    if (STATUS_LABELS[key]) return STATUS_LABELS[key];

    const normalizedKey = key.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (STATUS_LABELS[normalizedKey]) return STATUS_LABELS[normalizedKey];

    const upperKey = normalizedKey.toUpperCase();
    const match = Object.keys(STATUS_LABELS).find(k => k.toUpperCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim() === upperKey);
    if (match) return STATUS_LABELS[match];

    // Smart fallback for PAN variations
    if (upperKey.includes('PAN')) {
        if (upperKey.includes('APPROVAL') || upperKey.includes('OUT')) return 'PAN Out for Approval';
        if (upperKey.includes('SIGNATURE') || upperKey.includes('ISSUED')) return 'PAN Issued; For Signature';
        if (upperKey.includes('COMPLETED') || upperKey.includes('DONE')) return 'PAN Completed';
        if (upperKey.includes('FOR PAN') || upperKey.includes('BI')) return 'For PAN';
    }

    return key;
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

export function parseApplicantName(nameStr: string) {
    if (!nameStr) return { first: '', middle: '', last: '' };
    nameStr = nameStr.trim();
    let first = '';
    let middle = '';
    let last = '';

    if (nameStr.includes(',')) {
        const parts = nameStr.split(',').map(s => s.trim());
        last = parts[0] || '';
        const firstAndMiddle = parts[1] || '';
        if (firstAndMiddle.includes('(') && firstAndMiddle.includes(')')) {
            const parenMatch = firstAndMiddle.match(/^(.*?)\s*\((.*?)\)\s*(.*)$/);
            if (parenMatch) {
                first = (parenMatch[1] + ' ' + parenMatch[3]).trim();
                middle = parenMatch[2];
            } else {
                first = firstAndMiddle;
            }
        } else {
            const subParts = firstAndMiddle.split(/\s+/);
            if (subParts.length === 1) {
                first = subParts[0];
            } else {
                first = subParts.slice(0, -1).join(' ');
                middle = subParts[subParts.length - 1];
            }
        }
    } else {
        if (nameStr.includes('(') && nameStr.includes(')')) {
            const parenMatch = nameStr.match(/^(.*?)\s*\((.*?)\)\s*(.*)$/);
            if (parenMatch) {
                first = parenMatch[1] || '';
                middle = parenMatch[2] || '';
                last = parenMatch[3] || '';
            } else {
                const parts = nameStr.split(/\s+/);
                if (parts.length === 1) {
                    first = parts[0];
                } else {
                    first = parts.slice(0, -1).join(' ');
                    last = parts[parts.length - 1];
                }
            }
        } else {
            const parts = nameStr.split(/\s+/);
            if (parts.length === 1) {
                first = parts[0];
            } else if (parts.length === 2) {
                first = parts[0];
                last = parts[1];
            } else {
                first = parts.slice(0, -2).join(' ');
                middle = parts[parts.length - 2];
                last = parts[parts.length - 1];
            }
        }
    }

    return { first: first.trim(), middle: middle.trim(), last: last.trim() };
}

export function capitalizeName(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/(^|[\s\-\/\(\).])([a-z])/g, (_, sep, char) => sep + char.toUpperCase());
}

export function getCandidateFirstName(app: any): string {
    const val = String(app?.master_first_name || app?.pis?.first_name || app?.first_name || '').trim();
    if (val) return capitalizeName(val);
    if (app?.applicant_name) {
        return capitalizeName(parseApplicantName(app.applicant_name).first);
    }
    return '';
}

export function getCandidateLastName(app: any): string {
    const val = String(app?.master_last_name || app?.pis?.last_name || app?.last_name || '').trim();
    if (val) return capitalizeName(val);
    if (app?.applicant_name) {
        return capitalizeName(parseApplicantName(app.applicant_name).last);
    }
    return '';
}

export function getCandidateMiddleName(app: any): string {
    const val = String(app?.master_middle_name || app?.pis?.middle_name || app?.middle_name || app?.pis?.nick_name || app?.metadata?.nick_name || app?.nick_name || '').trim();
    if (val) return capitalizeName(val);
    if (app?.applicant_name) {
        return capitalizeName(parseApplicantName(app.applicant_name).middle);
    }
    return '';
}

export function getCandidateFullName(app: any, fallback = 'Unknown Candidate'): string {
    if (!app) return fallback;
    const fn = getCandidateFirstName(app);
    const ln = getCandidateLastName(app);
    const builtName = `${fn} ${ln}`.trim();
    return builtName ? capitalizeName(builtName) : (app.applicant_name ? capitalizeName(app.applicant_name) : fallback);
}
