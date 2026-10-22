import React, { useState, useEffect, useRef } from 'react';
import {
    User,
    Zap,
    Trash,
    AlertTriangle,
    Sparkles,
    Clock,
    Eye,
    EyeOff
} from 'lucide-react';
import { Application } from '@/types/application';
import { cn, formatCandidateName } from '@/utils/formatters';
import { getEndorsedOvBadgeLabel } from '@/utils/applicantBadges';
import { getReprofileQueue } from '@/utils/reprofileQueue';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { MedicalIndicator } from '@/components/common/MedicalIndicator';
import { ApplicationService } from '@/services/ApplicationService';
import { isStageDataComplete } from '@/utils/applicantDataValidation';
import { getInitialTabForApplicant } from '@/components/common/DetailModalPortal';

export function getNoShowStageLabel(applicant: any): string {
    const rawStatus = String(applicant.current_status || '').trim();
    const specStatus = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || applicant.specific_status || '').trim();
    const specLower = specStatus.toLowerCase();
    const rawLower = rawStatus.toLowerCase();
    const fromStatus = String(applicant.metadata?.rescheduled_from_status || applicant.metadata?.no_show_from_status || applicant.failure_details?.from_status || '').toUpperCase();

    if (rawLower.includes('typing') || specLower.includes('typing') || fromStatus === 'TYPING_TEST' || fromStatus === 'APPLIED') {
        if (!applicant.interview_completed_at || rawLower.includes('typing') || specLower.includes('typing')) {
            return 'NO SHOW - TYPING TEST';
        }
    }
    if (rawLower.includes('initial') || specLower.includes('initial') || rawLower.includes('queue') || specLower.includes('queue') || fromStatus === 'INITIAL_INTERVIEW') {
        return 'NO SHOW - INITIAL INTERVIEW';
    }
    if (rawLower.includes('assessment 2') || specLower.includes('assessment 2') || specLower.includes('assessment_ii') || fromStatus === 'ASSESSMENT_II') {
        return 'NO SHOW - PROFICIENCY ASSESSMENT 2';
    }
    if (rawLower.includes('assessment') || specLower.includes('assessment') || fromStatus === 'ASSESSMENT') {
        return 'NO SHOW - PROFICIENCY ASSESSMENT';
    }
    if (rawLower.includes('final') || specLower.includes('final') || rawLower.includes('ops') || specLower.includes('ops') || rawLower.includes('ov') || specLower.includes('ov') || fromStatus.includes('FINAL')) {
        return 'NO SHOW - OPS VALIDATOR';
    }

    if (rawLower.includes('no show -') || rawLower.includes('no_show_-_')) {
        const stagePart = rawStatus.split(/-|_-_/i).slice(1).join(' - ').trim();
        if (stagePart) return `NO SHOW - ${stagePart.toUpperCase()}`;
    }

    if (!applicant.typing_test_completed_at && !applicant.interview_completed_at && (applicant.typing_test_wpm === undefined || applicant.typing_test_wpm === null)) {
        return 'NO SHOW - TYPING TEST';
    }
    if (!applicant.interview_completed_at) {
        return 'NO SHOW - INITIAL INTERVIEW';
    }
    if (applicant.metadata?.assessment_score === undefined && applicant.metadata?.wonderlic_score === undefined) {
        return 'NO SHOW - PROFICIENCY ASSESSMENT';
    }
    return 'NO SHOW - OPS VALIDATOR';
}

function AnimatedAvatar({ sex, photoUrl, name }: { sex?: string; photoUrl?: string; name: string }) {
    const normalizedGender = (sex || '').toLowerCase().trim();
    const isFemale = normalizedGender === 'female' || normalizedGender === 'f';
    const avatarUrl = photoUrl || (isFemale ? '/default-avatar-female.png?v=3' : '/default-avatar-male.png?v=3');

    return (
        <div className="w-9 h-9 border border-surface-200 bg-surface-50 shrink-0 overflow-hidden rounded-none">
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        </div>
    );
}

interface ApplicantRowProps {
    applicant: Application;
    rowNumber: number;
    isSelectMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onLongPress?: (id: string) => void;
    onClick: () => void;
    onAction: (id: string, name: string, action: 'approve' | 'reject' | 'view' | 'delete' | 'view_pis' | 'hide' | 'unhide') => void;
    onPromote?: (app: Application) => void;
    isReprofileView?: boolean;
    isRejectedView?: boolean;
    onSetActiveReprofileAccount?: (app: Application, account: string) => void;
    shouldHidePosition?: boolean;
    activeTab?: string;
    isPendingTracker?: boolean;
    onRowMouseDown?: (id: string) => void;
    onRowMouseEnter?: (id: string) => void;
    isDuplicate?: boolean;
}

export const ApplicantRow = React.memo(function ApplicantRow({
    applicant,
    rowNumber,
    isSelectMode,
    isSelected,
    onSelect,
    onLongPress,
    onClick,
    onAction,
    onPromote,
    isReprofileView,
    isRejectedView,
    onSetActiveReprofileAccount,
    shouldHidePosition = false,
    activeTab,
    isPendingTracker,
    onRowMouseDown,
    onRowMouseEnter,
    isDuplicate,
}: ApplicantRowProps) {
    const { rooms } = useRoomStore();
    const { user } = useAuthStore();
    const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin';
    const [isClicked, setIsClicked] = useState(false);
    const [isHighlighted, setIsHighlighted] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);
    const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hasLongPressedRef = useRef(false);
    const specStatus = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase();
    const isNoShow = specStatus.includes('no show') || specStatus.includes('noshow');
    const [localFailedFrom, setLocalFailedFrom] = useState(applicant.failure_details?.from_status || '');
    const _isPendingTab = isPendingTracker || activeTab?.startsWith('pt_');
    const isRejected = ['REJECTED', 'FAILED'].includes(applicant.current_status || '');

    useEffect(() => {
        setLocalFailedFrom(applicant.failure_details?.from_status || '');
    }, [applicant.failure_details?.from_status]);

    useEffect(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search);
            const highlightId = searchParams.get('highlight');
            if (highlightId === applicant.id) {
                setIsHighlighted(true);
                document.body.classList.add('highlight-mode-active');

                setTimeout(() => {
                    rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);

                setTimeout(() => {
                    setIsHighlighted(false);
                    document.body.classList.remove('highlight-mode-active');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }, 5000);
            }
        } catch (e) {
            console.error(e);
        }
    }, [applicant.id]);

    useEffect(() => {
        return () => {
            if (isHighlighted) {
                document.body.classList.remove('highlight-mode-active');
            }
        };
    }, [isHighlighted]);

    useEffect(() => {
        try {
            const clicked = JSON.parse(localStorage.getItem('clicked_newly_applicants') || '[]');
            if (clicked.includes(applicant.id)) {
                setIsClicked(true);
            }
        } catch (e) {
            console.error(e);
        }
    }, [applicant.id]);

    const assignedRoom = rooms.find(r => r.current_application_id === applicant.id);
    const isOnlineRoom = assignedRoom?.room_type === 'online';
    const interviewMode = isOnlineRoom ? 'ONLINE' : (applicant.metadata?.interview_mode || 'ON-SITE');

    const hasTyping = applicant.typing_test_wpm !== undefined && applicant.typing_test_wpm !== null;
    const isTypingPassed = hasTyping && applicant.typing_test_wpm! >= 40 &&
        (applicant.typing_test_accuracy === undefined || applicant.typing_test_accuracy === null || parseFloat(String(applicant.typing_test_accuracy)) >= 90);
    const typingColor = isTypingPassed ? "text-green-600" : "text-rose-600";
    const hasAssessment = applicant.assessment_score !== undefined || applicant.pis?.leadership_score !== undefined;
    const endorsedOvBadgeLabel = getEndorsedOvBadgeLabel(applicant);
    const reprofileQueue = isReprofileView ? getReprofileQueue(applicant) : [];
    const activeReprofileAccount = reprofileQueue.find(item => item.status === 'ACTIVE');
    const waitingReprofileAccounts = reprofileQueue.filter(item => item.status === 'WAITING');
    const visibleWaitingAccounts = waitingReprofileAccounts.slice(0, 2);
    const hiddenWaitingCount = Math.max(waitingReprofileAccounts.length - visibleWaitingAccounts.length, 0);
    const hasReprofileQueue = reprofileQueue.length > 0;
    const isConcluded = ['PASSED', 'FAILED', 'HIRED', 'HIRED_PROCESSED', 'REJECTED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(applicant.current_status);

    const ACCEPTED_STATUSES = ['Accepted Offer', 'HIRED', 'PASSED', 'For Job Offer', 'Sent JO and BGC', 'For PAN'];
    const ONGOING_STATUSES = ['INITIAL_INTERVIEW', 'TYPING_TEST', 'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW'];
    const isNewlyAccepted = (() => {
        if (isClicked) return false;
        if (isConcluded) return false;
        const isOngoingOrHired = [...ACCEPTED_STATUSES, ...ONGOING_STATUSES].includes(applicant.current_status);
        if (!isOngoingOrHired) return false;
        const timestamp = applicant.hired_at || applicant.approved_at || applicant.updated_at;
        if (!timestamp) return false;
        const ts = new Date(timestamp).getTime();
        if (isNaN(ts)) return false;
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        return ts >= twentyFourHoursAgo;
    })();

    const newBadgeLabel = (() => {
        if (!isNewlyAccepted) return '';
        const statusUpper = String(applicant.current_status || '').toUpperCase();
        const validatorName = applicant.assigned_ops_validator_name || applicant.metadata?.assigned_ops_validator_name;

        if (statusUpper === 'FINAL_INTERVIEW_SCHEDULED' && validatorName) {
            return `NEWLY ENDORSED TO ${validatorName.trim().toUpperCase()}`;
        }
        if (statusUpper === 'FINAL_INTERVIEW') {
            return isReprofileView ? 'NEWLY REPROFILED' : 'NEWLY PASSED INITIAL';
        }
        if (statusUpper === 'TYPING_TEST') {
            return 'NEWLY UPDATED TYPING';
        }
        if (statusUpper === 'ASSESSMENT' || applicant.assessment_score) {
            return 'NEWLY UPDATED ASSESSMENT';
        }
        if (statusUpper === 'HIRED' || statusUpper === 'HIRED_PROCESSED') {
            return 'NEWLY HIRED';
        }
        if (statusUpper === 'ACCEPTED_OFFER' || statusUpper === 'ACCEPTED OFFER') {
            return 'NEWLY ACCEPTED OFFER';
        }
        if (statusUpper === 'FOR_JOB_OFFER' || statusUpper === 'FOR JOB OFFER') {
            return 'NEWLY FOR JOB OFFER';
        }
        return 'NEW';
    })();
    const reprofileStatusLabel = activeReprofileAccount
        ? 'Reprofile Active'
        : hasReprofileQueue
            ? 'Reprofile Waiting'
            : 'Reprofile';

    const isReprofiledAndPassed = (() => {
        const history = applicant.pis?.reprofile_history || applicant.metadata?.reprofile_history || [];
        const hasHistory = Array.isArray(history) && history.length > 0;
        const hasReprofileFlag = applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true' || (applicant.pis as any)?.is_reprofiled === true || (applicant.pis as any)?.is_reprofiled === 'true' || (applicant as any).is_reprofiled === true || (applicant as any).is_reprofiled === 'true';
        const hasFailedAccounts = (applicant.metadata?.failed_accounts?.length ?? 0) > 0 || ((applicant.pis as any)?.failed_accounts?.length ?? 0) > 0 || ((applicant as any).failed_accounts?.length ?? 0) > 0;
        const isReprofiled = hasHistory || hasReprofileFlag || hasFailedAccounts;

        const isConcludedStatus = ['PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'ACCEPTED_COFFER', 'For Job Offer', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'Sent JO and BGC', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'For PAN', 'FOR PAN', 'FOR_PAN'].includes(applicant.current_status);
        return isReprofiled && isConcludedStatus;
    })();

    const hasFailedAllAccounts = (() => {
        const depts = (applicant.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        if (depts.length === 0) return false;
        const failedAccounts = applicant.metadata?.failed_accounts || [];
        const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
        failedSet.delete('auto approve');
        return depts.every(d => failedSet.has(d));
    })();

    const hasFailedSomeButNotAllAccounts = (() => {
        const depts = (applicant.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        const failedAccounts = applicant.metadata?.failed_accounts || [];
        return failedAccounts.length > 0 && depts.length > 0;
    })();

    const isReprofiled = (() => {
        const history = applicant.pis?.reprofile_history || applicant.metadata?.reprofile_history || [];
        const hasHistory = Array.isArray(history) && history.length > 0;
        const hasReprofileFlag = applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true' || (applicant.pis as any)?.is_reprofiled === true || (applicant.pis as any)?.is_reprofiled === 'true';
        const failedAccounts = applicant.metadata?.failed_accounts || [];
        return hasHistory || hasReprofileFlag || failedAccounts.length > 0 || hasFailedSomeButNotAllAccounts;
    })();

    const isScheduled = Boolean(
        applicant.endorsement_meeting_date ||
        applicant.metadata?.endorsement_meeting_date ||
        (applicant.pis as any)?.endorsement_meeting_date ||
        applicant.assigned_ops_validator_name ||
        applicant.assigned_ops_validator_id ||
        applicant.metadata?.assigned_ops_validator_name ||
        applicant.metadata?.assigned_ops_validator_id ||
        applicant.recruiter_s_scheduling_status === 'SCHEDULED' ||
        applicant.metadata?.recruiter_s_scheduling_status === 'SCHEDULED'
    );
    const customStatusLabel = isNoShow
        ? getNoShowStageLabel(applicant)
        : hasFailedAllAccounts
            ? 'FAILED'
            : (applicant.current_status === 'FINAL_INTERVIEW' || applicant.current_status === 'FINAL_INTERVIEW_SCHEDULED' || applicant.current_status === 'FINAL INTERVIEW' || applicant.current_status === 'FINAL INTERVIEW SCHEDULED' || applicant.current_status === 'REPROFILE_FINAL_INTERVIEW' || applicant.current_status === 'REPROFILE' || (isReprofiled && applicant.current_status === 'ACCOUNT_ASSIGNMENT') || String(applicant.pis?.final_specific_status || '').toLowerCase().includes('reprofil'))
                ? (isReprofiled ? (isScheduled ? 'Reprofile Ops Val Interview' : 'For Reprofiling') : (isScheduled ? 'Final Interview Scheduled' : 'For Final Interview Scheduling'))
                : applicant.current_status === 'ASSESSMENT'
                    ? (() => {
                        const isSkipped = (() => {
                            const s = applicant.metadata?.skipped_stages;
                            if (Array.isArray(s)) return s.includes('assessment');
                            if (typeof s === 'string') {
                                try { const p = JSON.parse(s); return Array.isArray(p) && p.includes('assessment'); } catch { return false; }
                            }
                            return false;
                        })();
                        return (isStageDataComplete(applicant, 'assessment') || isSkipped) ? 'final interviewer' : 'Proficiency Assessment';
                    })()
                    : applicant.current_status === 'RESCHEDULED'
                        ? (() => {
                            const fromStatus = String(applicant.metadata?.rescheduled_from_status || '').toUpperCase();
                            if (fromStatus === 'INITIAL_INTERVIEW') return 'RESCHEDULED - INITIAL SCREENING';
                            if (fromStatus === 'ASSESSMENT') return 'RESCHEDULED - PROFICIENCY ASSESSMENT';
                            return 'RESCHEDULED';
                        })()
                        : (() => {
                            const statusStr = (applicant.current_status || '').replace(/_/g, ' ').toUpperCase();
                            if (statusStr === 'HIRED' || statusStr === 'HIRED PROCESSED' || statusStr === 'PROMOTED' || statusStr === 'PROMOTION' || statusStr === 'LATERAL TRANSFER') return 'Accepted Offer';
                            if (statusStr === 'PASSED') return 'For Job Offer';
                            if (statusStr === 'WAITING' || statusStr === 'WAITING (POOLED)' || statusStr === 'WAITING POOL' || statusStr === 'POOL' || statusStr === 'POOLED') return 'WAITING (POOLED)';
                            
                            if (statusStr === 'INTERVIEW IN PROGRESS') {
                                const specStatus = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase();
                                if (specStatus.includes('passed') || specStatus.includes('hired')) {
                                    return 'For Job Offer';
                                }
                                if (specStatus.includes('failed') || specStatus.includes('rejected')) {
                                    return 'FAILED';
                                }
                                const tab = getInitialTabForApplicant(applicant);
                                if (tab === 'verdict') return 'Pending Verdict';
                                if (tab === 'scheduling') return 'Final Interview Scheduled';
                            }
                            
                            return (applicant.current_status || '').replace(/_/g, ' ');
                        })();

    const statusLabel = (isReprofileView && !isConcluded) ? reprofileStatusLabel : customStatusLabel;

    const departmentNode = (() => {
        const meta = (applicant.metadata || {}) as any;
        const pis = ((applicant as any).pis || meta.pis || {}) as any;
        const failedArr = Array.isArray(meta.failed_accounts) ? meta.failed_accounts : [];
        const sources = [
            applicant.department,
            (applicant as any).initial_account_assignment || meta.initial_account_assignment || pis.initial_account_assignment,
            meta.final_account || pis.final_account,
            meta.target_account || pis.target_account,
            applicant.endorsement_account,
            ...failedArr
        ].filter(Boolean);
        const combinedStr = sources.join(', ');
        const accountList = combinedStr.split(',').map((s: string) => s.trim()).filter(Boolean);
        const uniqueAccounts = Array.from(new Set(accountList.map(a => a.toLowerCase()))).map(lower => {
            return accountList.find(a => a.toLowerCase() === lower) || lower;
        });
        const rawVal = uniqueAccounts.join(', ');
        if (!rawVal || /^(NULL|null|---|N\/A)$/.test(String(rawVal).trim())) {
            return <span className="text-[10px] text-surface-400 font-medium italic truncate leading-none mt-1.5 opacity-70">Unassigned</span>;
        }

        const failedAccounts = applicant.metadata?.failed_accounts || [];
        const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));
        failedSet.delete('auto approve');

        const accounts = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
        const remaining = accounts.filter((acc: string) => !failedSet.has(acc.toLowerCase()));

        const statusUpper = applicant.current_status?.toUpperCase() || '';
        const isFailed = statusUpper === 'REJECTED' || statusUpper === 'FAILED';

        if (isFailed) {
            const targetFailedList = accounts;

            return (
                <span className="text-[10px] flex flex-wrap gap-1 leading-none mt-1.5">
                    {targetFailedList.map((acc: string, idx: number) => {
                        const isReprofiledAcc = (applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true') &&
                            acc.toLowerCase() === (applicant.pis?.initial_account_assignment || applicant.metadata?.initial_account_assignment || '').toLowerCase();
                        const statusClass = "line-through text-rose-600 font-normal";

                        return (
                            <span key={idx} className={cn("inline-flex items-center gap-0.5", statusClass)}>
                                {isReprofiledAcc && (
                                    <span
                                        className="text-[10px] text-blue-600 font-black shrink-0 select-none mr-0.5 animate-pulse"
                                        style={{
                                            textShadow: '0 0 8px rgba(37, 99, 235, 0.95), 0 0 16px rgba(37, 99, 235, 0.45)',
                                            filter: 'drop-shadow(0 0 1px rgba(37, 99, 235, 0.65))'
                                        }}
                                        title="Original account assignment (Not Reprofile)"
                                    >
                                        @
                                    </span>
                                )}
                                <span>{acc}{idx < targetFailedList.length - 1 ? ',' : ''}</span>
                            </span>
                        );
                    })}
                </span>
            );
        }

        const isHiredOrJO = statusUpper === 'HIRED' ||
            statusUpper.includes('JOB_OFFER') ||
            statusUpper.includes('JOB OFFER') ||
            statusUpper === 'PASSED';

        let activeDisplayed = remaining;
        if (isHiredOrJO && remaining.length > 1) {
            activeDisplayed = [remaining[0]];
        }

        const displayedAccounts = accounts.filter((acc: string) => {
            const isAccFailed = failedSet.has(acc.toLowerCase());
            if (isAccFailed) return true;
            return activeDisplayed.includes(acc);
        });

        return (
            <span className="text-[10px] flex flex-wrap gap-1 leading-none mt-1.5">
                {displayedAccounts.map((acc: string, idx: number) => {
                    const isAccFailed = failedSet.has(acc.toLowerCase());
                    const isActive = !isAccFailed && acc.toLowerCase() === remaining[0]?.toLowerCase();
                    const isReprofiledAcc = (applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true') &&
                        acc.toLowerCase() === (applicant.pis?.initial_account_assignment || applicant.metadata?.initial_account_assignment || '').toLowerCase();
                    const isAutoApprove = acc.toLowerCase().includes('auto approve');
                    return (
                        <span key={idx} className={cn(
                            "inline-flex items-center gap-0.5",
                            isAutoApprove ? "text-emerald-600 font-black" :
                                isAccFailed ? "line-through text-rose-600 font-normal" :
                                    isActive ? "text-emerald-600 font-black" : "text-slate-400 font-semibold"
                        )}>
                            {isActive && (
                                <svg className="w-2.5 h-2.5 text-emerald-600 animate-in zoom-in-75 duration-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {isReprofiledAcc && (
                                <span
                                    className="text-[10px] text-blue-600 font-black shrink-0 select-none mr-0.5 animate-pulse"
                                    style={{
                                        textShadow: '0 0 8px rgba(37, 99, 235, 0.95), 0 0 16px rgba(37, 99, 235, 0.45)',
                                        filter: 'drop-shadow(0 0 1px rgba(37, 99, 235, 0.65))'
                                    }}
                                    title="Original account assignment (Not Reprofile)"
                                >
                                    @
                                </span>
                            )}
                            <span>{acc}{idx < displayedAccounts.length - 1 ? ',' : ''}</span>
                        </span>
                    );
                })}
            </span>
        );
    })();

    const initials = (applicant.applicant_name || '?')
        .split(' ')
        .map(n => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';

    const assessmentScore = applicant.assessment_score !== undefined ? applicant.assessment_score : (applicant.pis?.leadership_score || 0);
    const scoreTone = (() => {
        const scoreStr = String(assessmentScore).toUpperCase().trim();
        if (!scoreStr || scoreStr === '0' || scoreStr === 'NULL' || scoreStr === 'UNDEFINED') {
            return 'text-surface-900 font-medium';
        }
        if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(scoreStr)) {
            if (['B2', 'C1', 'C2'].includes(scoreStr)) {
                return 'text-emerald-600 font-bold';
            }
            return 'text-rose-600 font-bold';
        }
        const numScore = parseFloat(scoreStr) || 0;
        if (numScore >= 80) return 'text-emerald-600 font-bold';
        if (numScore >= 70) return 'text-amber-600 font-bold';
        return 'text-rose-600 font-bold';
    })();
    const statusTone = (() => {
        if (isNoShow) {
            return 'text-amber-700 bg-amber-50 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]';
        }
        const s = hasFailedAllAccounts ? 'FAILED' : String(applicant.current_status || '').toUpperCase();
        if (s === 'RESCHEDULED') {
            const fromStatus = String(applicant.metadata?.rescheduled_from_status || '').toUpperCase();
            if (fromStatus === 'INITIAL_INTERVIEW') return 'text-purple-700 bg-purple-50 border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]';
            if (fromStatus === 'ASSESSMENT') return 'text-blue-700 bg-blue-50 border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.15)]';
            return 'text-orange-700 bg-orange-50 border-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.15)]';
        }
        if (s === 'TYPING_TEST' || s === 'TYPING TEST') {
            return 'text-sky-700 bg-sky-50 border-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.15)]';
        }
        if (s === 'INITIAL_INTERVIEW' || s === 'INITIAL INTERVIEW') {
            return 'text-purple-700 bg-purple-50 border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]';
        }
        if (s.includes('WAITING') || s.includes('POOL')) {
            return 'text-purple-700 bg-purple-50 border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]';
        }
        if (s === 'FINAL_INTERVIEW' || s === 'FINAL_INTERVIEW_SCHEDULED' || s === 'FINAL INTERVIEW' || s === 'FINAL INTERVIEW SCHEDULED') {
            return 'status-schedule-later';
        }
        if (s.includes('DECLINE')) {
            return 'text-rose-700 bg-rose-50 border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)]';
        }
        if (s.includes('HIRE') || s.includes('PASS') || s.includes('ACCEPT') || s.includes('OFFER') || s.includes('PAN')) {
            return 'text-emerald-700 bg-emerald-50 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35)] font-bold';
        }
        if (s.includes('FAIL') || s.includes('REJECT') || s.includes('NOT ELIGIBLE') || s.includes('WITHDRAW')) {
            return 'text-rose-700 bg-rose-50 border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)]';
        }
        if (s.includes('PENDING') || s.includes('SCHEDULE') || s.includes('ASSESS') || s.includes('OPEN')) {
            return 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700';
        }
        if (s.includes('REAPPLI') || s === 'INVITED FOR REAPPLICATION') {
            return 'text-indigo-700 bg-indigo-50 border-indigo-300 shadow-[0_0_8px_rgba(79,70,229,0.15)] font-bold';
        }
        if (s === 'H2R INACTIVE') {
            return 'text-stone-600 bg-stone-100 border-stone-300 font-bold';
        }
        return 'text-surface-700 bg-surface-50/80 border-surface-200';
    })();

    const isClosed = applicant.current_status === 'CLOSED';
    const isDuplicateWarning = (applicant.metadata?.has_duplicate || isDuplicate) && activeTab === 'requests';

    return (
        <div
            ref={rowRef}
            className={cn(
                "group transition-all duration-200 ease-out cursor-pointer grid items-center h-16 relative hover:z-10 hover:shadow-sm hover:-translate-y-[1px] divide-x divide-surface-100 dark:divide-surface-800",
                isRejectedView
                    ? "grid-cols-[1.2fr_100px_140px_140px_1fr_90px_110px_90px_160px_110px_90px_120px_110px_90px]"
                    : isPendingTracker
                        ? "grid-cols-[1.2fr_100px_140px_140px_1fr_90px_110px_90px_160px_100px_90px_90px_120px_110px_90px]"
                        : shouldHidePosition
                            ? "grid-cols-[1.2fr_100px_140px_140px_90px_110px_90px_160px_100px_90px_120px_110px_90px]"
                            : "grid-cols-[1.2fr_100px_140px_140px_1fr_90px_110px_90px_160px_100px_90px_120px_110px_90px]",
                isHighlighted && "z-[100] ring-4 ring-[#ef3e36] ring-offset-2 animate-pulse bg-white dark:bg-slate-900 scale-[1.02] shadow-[0_10px_40px_-10px_rgba(239,62,54,0.5)] transition-all duration-300",
                isDuplicateWarning && "ring-2 ring-yellow-400 bg-yellow-50/50 hover:bg-yellow-50 shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse",
                isClosed && "opacity-50 grayscale hover:opacity-80 transition-opacity",
                isSelected
                    ? "bg-[#f4f5f7]"
                    : (isDuplicateWarning ? "" : "bg-white dark:bg-slate-900 hover:bg-[#fafafa]")
            )}
            onClick={() => {
                if (hasLongPressedRef.current) {
                    hasLongPressedRef.current = false;
                    return;
                }
                if (!isSelectMode) {
                    setIsClicked(true);
                    try {
                        const clicked = JSON.parse(localStorage.getItem('clicked_newly_applicants') || '[]');
                        if (!clicked.includes(applicant.id)) {
                            clicked.push(applicant.id);
                            localStorage.setItem('clicked_newly_applicants', JSON.stringify(clicked));
                        }
                    } catch (e) {
                        console.error(e);
                    }
                    onClick();
                } else {
                    onSelect?.(applicant.id);
                }
            }}
            onMouseEnter={() => {
                if (onRowMouseEnter) {
                    onRowMouseEnter(applicant.id);
                }
            }}
            onMouseDown={(e) => {
                if (e.button !== 0) return; // Only left-click
                if (onRowMouseDown) {
                    onRowMouseDown(applicant.id);
                }
                if (onLongPress && !isSelectMode) {
                    hasLongPressedRef.current = false;
                    touchTimerRef.current = setTimeout(() => {
                        onLongPress(applicant.id);
                        hasLongPressedRef.current = true;
                    }, 500);
                }
            }}
            onMouseUp={() => {
                if (touchTimerRef.current) {
                    clearTimeout(touchTimerRef.current);
                    touchTimerRef.current = null;
                }
            }}
            onMouseLeave={() => {
                if (touchTimerRef.current) {
                    clearTimeout(touchTimerRef.current);
                    touchTimerRef.current = null;
                }
            }}
            onTouchStart={() => {
                if (onLongPress && !isSelectMode) {
                    hasLongPressedRef.current = false;
                    touchTimerRef.current = setTimeout(() => {
                        onLongPress(applicant.id);
                        hasLongPressedRef.current = true;
                    }, 500);
                }
            }}
            onTouchEnd={() => {
                if (touchTimerRef.current) {
                    clearTimeout(touchTimerRef.current);
                    touchTimerRef.current = null;
                }
            }}
            onTouchCancel={() => {
                if (touchTimerRef.current) {
                    clearTimeout(touchTimerRef.current);
                    touchTimerRef.current = null;
                }
            }}
        >
            {/* Candidate Name */}
            <div className="flex items-center gap-3 pl-5 pr-4 min-w-0 h-full">
                {isSelectMode ? (
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect?.(applicant.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 shrink-0 rounded-sm border-surface-300 text-surface-900 focus:ring-surface-400 cursor-pointer pointer-events-none"
                    />
                ) : (
                    <div className="w-9 h-9 border border-surface-200 bg-surface-50 shrink-0 flex items-center justify-center rounded-none font-bold text-[12px] text-surface-700 select-none">
                        {rowNumber}.
                    </div>
                )}
                <div className="min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[13px] font-semibold text-surface-900 truncate leading-none">
                            {formatCandidateName(applicant.applicant_name)}
                        </h3>
                        {/* {applicant.master_column && applicant.master_column !== 'SHEET' && applicant.master_column !== 'SHEET1' && (
                            <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-rose-100 border border-rose-200" title="Candidate not found on the interview form">
                                <AlertTriangle size={10} className="text-rose-600" />
                            </div>
                        )} */}
                        {/* Badge removed and moved to Special Status column */}
                        {/* <MedicalIndicator application={applicant} size="xs" /> */}
                        {isNewlyAccepted && !isHighlighted && (
                            <span
                                className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest leading-none px-1.5 py-0.5 rounded-[4px] bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0"
                                title={newBadgeLabel}
                            >
                                <Sparkles size={8} className="text-emerald-500 animate-pulse" />
                                NEW
                            </span>
                        )}
                        {applicant.metadata?.pending_typing_retake && (
                            <span
                                className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white font-bold text-[10px] shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse shrink-0 cursor-help"
                                title="Pending Retake Submitted"
                            >
                                !
                            </span>
                        )}
                        {isDuplicateWarning && (
                            <span
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider leading-none px-1.5 py-0.5 rounded-[4px] bg-yellow-100 text-yellow-700 border border-yellow-300 shrink-0 shadow-sm"
                                title="This candidate has already applied."
                            >
                                <AlertTriangle size={10} className="text-yellow-600" />
                                {applicant.metadata?.duplicate_status ? `Already Applied - Status: ${applicant.metadata.duplicate_status.replace(/_/g, ' ')}` : 'Duplicate Application'}
                            </span>
                        )}
                        {isHighlighted && (
                            <div className="flex items-center gap-1.5 ml-2 relative z-50 pointer-events-none">
                                <span className="flex h-2 w-2 relative shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-650"></span>
                                </span>
                                <div className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-rose-500 text-white px-2 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-wider whitespace-nowrap shadow-md shadow-red-500/30 animate-bounce">
                                    <svg className="w-3 h-3 rotate-180 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Candidate Found
                                </div>
                            </div>
                        )}
                    </div>
                    {isReprofiledAndPassed ? (
                        <span
                            className="text-[9px] font-extrabold text-emerald-600 leading-none flex items-center gap-1"
                            title={`Reprofile successfully accomplished and passed for ${applicant.department}`}
                        >
                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping shrink-0" style={{ animationDuration: '2s' }} />
                            Reprofiled & Passed: {applicant.department}
                        </span>
                    ) : (isConcluded && ['PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'ACCEPTED_COFFER', 'For Job Offer', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'Sent JO and BGC', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'For PAN', 'FOR PAN', 'FOR_PAN'].includes(applicant.current_status)) ? (
                        <span
                            className="text-[9px] font-extrabold text-blue-600 leading-none flex items-center gap-1"
                            title={`Regularly passed for ${applicant.department}`}
                        >
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                            Regularly Passed: {applicant.department}
                        </span>
                    ) : isConcluded && getReprofileQueue(applicant).some(item => item.status === 'COMPLETED') ? (
                        <span
                            className="text-[9px] font-extrabold text-emerald-600 leading-none flex items-center gap-1"
                            title={`Reprofile successfully accomplished for ${applicant.department}`}
                        >
                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping shrink-0" style={{ animationDuration: '2s' }} />
                            Reprofile Accomplished: {applicant.department}
                        </span>
                    ) : ((applicant.pis?.reprofile_history?.length ?? 0) > 0 || (applicant.metadata?.reprofile_history?.length ?? 0) > 0 || applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true') ? (
                        <span
                            className="text-[9px] font-medium text-surface-500 leading-none"
                            title="This candidate went through a reprofile process"
                        >
                            Reprofiled
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Special Status */}
            <div className="px-4 h-full flex flex-col justify-center items-center min-w-0 text-center">
                {(() => {
                    const isPromoted = applicant.metadata?.is_promotion || String(applicant.current_status || '').toUpperCase() === 'PROMOTED';
                    const isLateral = applicant.metadata?.is_lateral_transfer || String(applicant.current_status || '').toUpperCase() === 'LATERAL_TRANSFER' || applicant.current_status === 'Lateral Transfer';

                    if (isPromoted) {
                        return <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">PROMOTED</span>;
                    }
                    if (isLateral) {
                        return <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200">LATERAL TRANSFER</span>;
                    }
                    return <span className="text-[11px] text-surface-300 font-medium leading-none">-</span>;
                })()}
            </div>

            {/* Assigned Recruiter/Final Interview */}
            <div className="px-4 h-full flex flex-col justify-center min-w-0">
                {endorsedOvBadgeLabel ? (
                    <div
                        className="flex items-center gap-1.5 text-surface-700"
                        title={endorsedOvBadgeLabel}
                    >
                        <Zap size={9} className="fill-current text-surface-500 shrink-0" />
                        <span className="text-[10px] font-semibold tracking-[0.02em] truncate leading-none">{endorsedOvBadgeLabel}</span>
                    </div>
                ) : (
                    <span className="text-[10px] text-surface-400 font-medium italic leading-none opacity-70">Unassigned</span>
                )}
            </div>

            {/* Initial Recruiter */}
            <div className="px-4 h-full flex flex-col justify-center min-w-0">
                {(() => {
                    const recruiterToShow = applicant.assigned_recruiter_name || applicant.interviewer_name;
                    return recruiterToShow ? (
                        <span className="text-[11px] text-surface-700 font-medium truncate leading-none" title={recruiterToShow}>
                            {recruiterToShow}
                        </span>
                    ) : (
                        <span className="text-[10px] text-surface-400 font-medium italic leading-none opacity-70">—</span>
                    );
                })()}
            </div>

            {/* Position / Dept */}
            {!shouldHidePosition && (
                <div className="px-4 h-full flex flex-col justify-center min-w-0">
                    <span className="text-[12px] text-surface-900 font-medium truncate leading-none">{(applicant.position_title || '').replace(/\[INTERNAL\]/gi, '[ON-CALL]')}</span>
                    {!isReprofileView && departmentNode}
                    {reprofileQueue.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 min-w-0 overflow-hidden">
                            {activeReprofileAccount && (
                                <span
                                    className="px-1.5 py-0.5 text-emerald-700 text-[9px] font-semibold leading-none flex items-center gap-1 shrink-0"
                                    title={`Active: ${activeReprofileAccount.account}`}
                                >
                                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                                    {activeReprofileAccount.account}
                                </span>
                            )}
                            {visibleWaitingAccounts.map(item => (
                                <button
                                    key={item.account}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetActiveReprofileAccount?.(applicant, item.account);
                                    }}
                                    className="px-1.5 py-0.5 text-surface-500 text-[9px] font-medium leading-none transition-colors hover:text-surface-900 shrink-0"
                                    title={`Set ${item.account} as active`}
                                >
                                    {item.account}
                                </button>
                            ))}
                            {hiddenWaitingCount > 0 && (
                                <span
                                    className="text-[9px] text-surface-400 font-medium leading-none shrink-0"
                                    title={waitingReprofileAccounts.map(item => item.account).join(', ')}
                                >
                                    +{hiddenWaitingCount}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Type Column */}
            <div className="px-2 h-full flex flex-col justify-center min-w-0">
                {(() => {
                    const candidateType = applicant.metadata?.candidate_type || (applicant.pis as any)?.candidate_type || applicant.metadata?.hiring_type || (applicant.pis as any)?.hiring_type || 'EXTERNAL';
                    return (
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest text-center py-1 px-2 rounded-full mx-auto",
                            candidateType === 'INTERNAL' ? "bg-indigo-50 text-indigo-600" :
                            candidateType === 'EXTERNAL' ? "bg-emerald-50 text-emerald-600" : "bg-surface-50 text-surface-400"
                        )}>
                            {candidateType || '—'}
                        </span>
                    );
                })()}
            </div>

            {isRejectedView ? (
                <>
                    {/* Typing Stats */}
                    <div className="px-4 h-full flex flex-col justify-center items-center text-center">
                        {hasTyping ? (
                            <>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn("text-[13px] font-semibold tabular-nums", typingColor)}>{applicant.typing_test_wpm}</span>
                                    <span className="text-[9px] font-medium text-surface-400 tracking-wider">wpm</span>
                                </div>
                                <span className="text-[9px] text-surface-500 font-medium tabular-nums mt-1">{applicant.typing_test_accuracy}% acc</span>
                            </>
                        ) : (
                            <span className="text-[12px] text-surface-200 font-light leading-none">—</span>
                        )}
                    </div>

                    {/* Failed At */}
                    <div className="px-4 h-full flex flex-col justify-center items-center">
                        <AppliedDate date={applicant.failure_details?.changed_at || applicant.updated_at} showTime={true} />
                    </div>
                </>
            ) : (
                <>
                    {/* Typing Stats */}
                    <div className="px-4 h-full flex flex-col justify-center items-center text-center">
                        {hasTyping ? (
                            <>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn("text-[13px] font-semibold tabular-nums", typingColor)}>{applicant.typing_test_wpm}</span>
                                    <span className="text-[9px] font-medium text-surface-400 tracking-wider">wpm</span>
                                </div>
                                <span className="text-[9px] text-surface-500 font-medium tabular-nums mt-1">{applicant.typing_test_accuracy}% acc</span>
                            </>
                        ) : (
                            <span className="text-[12px] text-surface-200 font-light leading-none">—</span>
                        )}
                    </div>

                    {/* Assessment Score */}
                    <div className="px-4 h-full flex flex-col justify-center items-center text-center">
                        {hasAssessment ? (
                            <>
                                <span className={cn("text-[13px] font-semibold tabular-nums leading-none", scoreTone)}>
                                    {assessmentScore}
                                    {!['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'HIGH', 'MODERATE', 'LOW'].includes(String(assessmentScore).toUpperCase()) && '%'}
                                </span>
                                <span className="text-[8.5px] text-surface-500 font-bold uppercase tracking-wider mt-1.5 leading-none">
                                    {(() => {
                                        const score = String(applicant.assessment_score || '').toUpperCase().trim();
                                        if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(score)) {
                                            return 'SpeechX';
                                        }
                                        if (applicant.pis?.personality_test || (applicant as any).personality_test) {
                                            return 'Personality & Critical Thinking';
                                        }
                                        if (applicant.pis?.critical_thinking_score || (applicant as any).critical_thinking_score) {
                                            return 'Critical Thinking';
                                        }
                                        if (['HIGH', 'MODERATE', 'LOW'].includes(score)) {
                                            return 'Leadership';
                                        }
                                        if (score && !isNaN(Number(score))) {
                                            return 'Proficiency / Wonderlic';
                                        }
                                        return 'Proficiency';
                                    })()}
                                </span>
                            </>
                        ) : (
                            <span className="text-[12px] text-surface-200 font-light leading-none">—</span>
                        )}
                    </div>
                </>
            )}

            {/* Application Status */}
            <div className="px-2 h-full flex flex-col items-center justify-center min-w-0 gap-1.5">
                <span className={cn(
                    "px-2 py-1 text-[9.5px] font-bold tracking-widest uppercase rounded-[4px] border text-center truncate w-full shrink-0",
                    (isReprofileView && !isConcluded)
                        ? "text-primary-700 bg-primary-50/60 border-primary-200/60"
                        : statusLabel === 'FAILED' || statusLabel.toUpperCase().includes('FAILED')
                            ? "text-rose-700 bg-rose-50 border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                            : (applicant.current_status === 'FINAL_INTERVIEW' || applicant.current_status === 'FINAL_INTERVIEW_SCHEDULED' || applicant.current_status === 'FINAL INTERVIEW' || applicant.current_status === 'FINAL INTERVIEW SCHEDULED')
                                ? (isScheduled ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" : "status-schedule-later")
                                : statusTone
                )}>
                    {statusLabel}
                </span>
                {(() => {
                    if (applicant.current_status === 'RESCHEDULED' && applicant.metadata?.reschedule_date) {
                        const rDate = new Date(applicant.metadata.reschedule_date);
                        rDate.setHours(23, 59, 59, 999);
                        const diff = rDate.getTime() - Date.now();
                        let timerText = '';
                        let colorClass = 'text-amber-500';
                        if (diff < 0) {
                            timerText = 'OVERDUE';
                            colorClass = 'text-rose-500';
                        } else {
                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                            if (days === 0) timerText = 'DUE TODAY';
                            else if (days === 1) timerText = '1 DAY LEFT';
                            else timerText = `${days} DAYS LEFT`;
                        }
                        return (
                            <span className={cn("text-[9px] font-black tabular-nums text-center tracking-wider flex items-center gap-1", colorClass)}>
                                <Clock className="w-3 h-3" />
                                {timerText}
                            </span>
                        );
                    }
                    return (applicant.updated_at || applicant.applied_at) ? (
                        <span className="text-[8.5px] text-surface-400 font-semibold tabular-nums text-center leading-none tracking-wide">
                            {new Date(applicant.updated_at || applicant.applied_at || applicant.created_at || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })} • {new Date(applicant.updated_at || applicant.applied_at || applicant.created_at || new Date()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}
                        </span>
                    ) : null;
                })()}
            </div>

            {/* Mode / Failed From */}
            {isRejectedView ? (() => {
                const resolveFailedFrom = () => {
                    const fs = String(applicant.failure_details?.from_status || '').toUpperCase();
                    if (fs && fs !== 'REJECTED' && fs !== 'FAILED') {
                        if (fs === 'TYPING_TEST') return 'TYPING TEST';
                        if (fs === 'APPLIED') return 'APPLIED';
                        if (fs === 'INITIAL_INTERVIEW' || fs === 'INTERVIEW_IN_PROGRESS' || fs === 'QUEUE_ASSIGNED') return 'INITIAL INTERVIEW';
                        if (fs === 'ACCOUNT_ASSIGNMENT') return 'ACCOUNT ASSIGNMENT';
                        if (fs === 'ASSESSMENT') return 'ASSESSMENT';
                        if (fs === 'FOR_SCHEDULING' || fs === 'FINAL_INTERVIEW' || fs === 'FINAL_INTERVIEW_SCHEDULED') return 'FINAL INTERVIEW';
                        if (fs === 'CLIENT_ASSESSMENT') return 'CLIENT ASSESSMENT';
                        if (fs === 'CLIENT_INTERVIEW') return 'CLIENT INTERVIEW';
                        if (fs === 'REPROFILE') return 'REPROFILE';
                    }
                    const appAny = applicant as any;
                    const specStatus = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase();
                    const remarks = String(applicant.master_remarks || (applicant.pis as any)?.master_remarks || applicant.metadata?.master_remarks || '').toLowerCase();
                    const opsVal = String(appAny.ops_validator_status || (applicant.pis as any)?.ops_validator_status || applicant.metadata?.ops_validator_status || '').toLowerCase();
                    const rejReason = String(applicant.rejection_reason || (applicant.pis as any)?.rejection_reason || applicant.metadata?.rejection_reason || '').toLowerCase();
                    const cStr = String(applicant.current_status || '').toLowerCase();
                    const finalResult = String(applicant.final_verdict || (applicant.pis as any)?.final_interview_result || applicant.metadata?.final_interview_result || '').toLowerCase();

                    if (
                        remarks.includes('ov') ||
                        opsVal.includes('fail') ||
                        finalResult.includes('reject') ||
                        finalResult.includes('fail') ||
                        rejReason.includes('reprofil') ||
                        cStr.includes('reprofil') ||
                        specStatus.includes('ov') ||
                        specStatus.includes('final interviewer')
                    ) {
                        return 'FINAL INTERVIEW';
                    }
                    if (specStatus.includes('typing') || cStr.includes('typing')) return 'TYPING TEST';
                    if (specStatus.includes('client assessment') || cStr.includes('client assessment')) return 'CLIENT ASSESSMENT';
                    if (specStatus.includes('client interview') || cStr.includes('client interview')) return 'CLIENT INTERVIEW';
                    if (specStatus.includes('account assignment') || cStr.includes('account assignment')) return 'ACCOUNT ASSIGNMENT';
                    if (specStatus.includes('assessment') || cStr.includes('assessment')) return 'ASSESSMENT';

                    const isInitialPassed = String(appAny.initial_interview_results || (applicant.pis as any)?.initial_interview_results || applicant.metadata?.initial_interview_results || '').toUpperCase().includes('PASS') || specStatus.includes('passed');
                    if (!isInitialPassed && (specStatus.includes('initial') || cStr.includes('initial'))) {
                        return 'INITIAL INTERVIEW';
                    }

                    return 'REJECTED';
                };

                const failedFromLabel = resolveFailedFrom();

                const failedFromColorTone = (() => {
                    if (failedFromLabel === 'TYPING TEST') return 'bg-amber-50 text-amber-700 border-amber-200';
                    if (failedFromLabel === 'ASSESSMENT') return 'bg-blue-50 text-blue-700 border-blue-200';
                    if (failedFromLabel === 'INITIAL INTERVIEW') return 'bg-rose-50 text-rose-750 border-rose-200';
                    if (failedFromLabel === 'FINAL INTERVIEW' || failedFromLabel === 'ACCOUNT ASSIGNMENT') return 'bg-purple-50 text-purple-700 border-purple-200';
                    if (failedFromLabel === 'CLIENT ASSESSMENT') return 'bg-violet-50 text-violet-700 border-violet-200';
                    if (failedFromLabel === 'CLIENT INTERVIEW') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    if (failedFromLabel === 'REJECTED') return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800';
                    return 'text-surface-450 border-surface-200 bg-surface-50/50';
                })();

                return (
                    <div className="px-2 h-full flex items-center justify-center min-w-0 text-center">
                        <span className={cn(
                            "px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-center rounded-full border truncate w-full",
                            failedFromColorTone
                        )}>
                            {failedFromLabel}
                        </span>
                    </div>
                );
            })() : activeTab === 'withdrawn' ? (() => {
                const specStatus = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase().trim();
                const fromStatus = String(applicant.failure_details?.from_status || '').toUpperCase().trim();

                let withdrewFromLabel = 'General';
                let withdrewFromColor = 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800';

                if (specStatus.includes('wonderlic') || (specStatus.includes('assessment') && !specStatus.includes('client')) || fromStatus === 'ASSESSMENT' || fromStatus === 'ASSESSMENT_II' || fromStatus === 'TYPING_TEST') {
                    withdrewFromLabel = 'Assessment';
                    withdrewFromColor = 'bg-blue-50 text-blue-700 border-blue-200';
                } else if (specStatus.includes('ov') || specStatus.includes('Final Interview') || specStatus.includes('final interviewer') || fromStatus === 'FINAL_INTERVIEW' || fromStatus === 'FINAL_INTERVIEW_SCHEDULED' || fromStatus === 'FINAL INTERVIEW' || fromStatus === 'FINAL INTERVIEW SCHEDULED') {
                    withdrewFromLabel = 'Final Interviewer';
                    withdrewFromColor = 'bg-purple-50 text-purple-750 border-purple-200';
                } else if (specStatus.includes('client assessment') || fromStatus === 'CLIENT_ASSESSMENT') {
                    withdrewFromLabel = 'Client Assessment';
                    withdrewFromColor = 'bg-amber-50 text-amber-700 border-amber-200';
                } else if (specStatus.includes('client interview') || fromStatus === 'CLIENT_INTERVIEW') {
                    withdrewFromLabel = 'Client Interview';
                    withdrewFromColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                } else if (specStatus.includes('initial') || fromStatus === 'INITIAL_INTERVIEW' || fromStatus === 'QUEUE_ASSIGNED' || fromStatus === 'INITIAL INTERVIEW') {
                    withdrewFromLabel = 'Initial Interview';
                    withdrewFromColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                }

                return (
                    <div className="px-2 h-full flex items-center justify-center min-w-0">
                        <span className={cn(
                            "px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-center rounded-full border truncate w-full",
                            withdrewFromColor
                        )}>
                            {withdrewFromLabel}
                        </span>
                    </div>
                );
            })() : (
                <div className="px-2 h-full flex items-center justify-center min-w-0">
                    {interviewMode && (
                        <span className={cn(
                            "text-[10px] font-medium tracking-[0.02em] truncate leading-none",
                            interviewMode === 'ONLINE' ? "text-purple-600" : "text-surface-500"
                        )}>
                            {interviewMode === 'ONLINE' ? 'Online' : 'On-site'}
                        </span>
                    )}
                </div>
            )}

            {/* Date Applied / Wait Time */}
            {isPendingTracker ? (
                <>
                    <div className="px-4 h-full flex flex-col justify-center items-center">
                        <AppliedDate date={applicant.updated_at || applicant.applied_at || applicant.created_at} showTime={true} />
                    </div>
                    <div className="px-4 h-full flex flex-col justify-center items-center">
                        <WaitTime applicant={applicant} />
                    </div>
                </>
            ) : (
                <div className="px-4 h-full flex flex-col justify-center items-center">
                    <AppliedDate date={applicant.applied_at} showTime={true} />
                </div>
            )}

            {/* Ops Val Interview */}
            <div className="px-4 h-full flex flex-col justify-center items-center text-center">
                <span className="text-[11px] font-semibold text-surface-700 tracking-tight">
                    {applicant.endorsement_meeting_date ? (
                        <AppliedDate date={applicant.endorsement_meeting_date} showTime={true} />
                    ) : (
                        <span className="text-surface-300 font-normal">—</span>
                    )}
                </span>
            </div>

            {/* Training Start Date */}
            <div className="px-4 h-full flex flex-col justify-center items-center text-center">
                <span className="text-[11px] font-semibold text-surface-700 tracking-tight">
                    {applicant.master_training_start_date || (applicant.pis as any)?.training_start_date || <span className="text-surface-300 font-normal">—</span>}
                </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center px-2 gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(applicant.id, applicant.applicant_name, 'view_pis'); }}
                    className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-md transition-all duration-200"
                    title="View PIS Dashboard"
                >
                    <User size={14} className="stroke-[2.5]" />
                </button>
                {isAdminOrSuperAdmin && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(applicant.id, applicant.applicant_name, applicant.is_hidden ? 'unhide' : 'hide'); }}
                        className={cn(
                            "p-1.5 active:scale-95 transition-all duration-200 rounded-md",
                            applicant.is_hidden 
                                ? "text-amber-600 bg-amber-50 hover:bg-amber-100" 
                                : "text-surface-400 hover:text-amber-600 hover:bg-amber-50"
                        )}
                        title={applicant.is_hidden ? "Unhide Candidate (Currently Hidden from Recruiters)" : "Hide Candidate from Recruiters"}
                    >
                        {applicant.is_hidden ? <EyeOff size={14} className="stroke-[2.5]" /> : <Eye size={14} className="stroke-[2.5]" />}
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(applicant.id, applicant.applicant_name, 'delete'); }}
                    className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 active:scale-95 rounded-md transition-all duration-200"
                    title="Purge Record"
                >
                    <Trash size={14} className="stroke-[2.5]" />
                </button>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render if the applicant reference or relevant UI states change
    if (prevProps.shouldHidePosition !== nextProps.shouldHidePosition) return false;
    if (prevProps.rowNumber !== nextProps.rowNumber) return false;
    if (prevProps.isSelectMode !== nextProps.isSelectMode) return false;
    if (prevProps.isSelected !== nextProps.isSelected) return false;
    if (prevProps.isDuplicate !== nextProps.isDuplicate) return false;
    if (prevProps.activeTab !== nextProps.activeTab) return false;
    if (prevProps.isPendingTracker !== nextProps.isPendingTracker) return false;
    if (prevProps.applicant !== nextProps.applicant) return false;

    // Ignore function prop changes (e.g., onAction, onClick) because they are often recreated inline by the parent list
    return true;
});

function AppliedDate({ date, showTime }: { date?: string | null, showTime?: boolean }) {
    if (!date) {
        return <span className="text-[12px] text-surface-200 font-light leading-none">—</span>;
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return <span className="text-[12px] text-surface-200 font-light leading-none">—</span>;
    }
    const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Manila' });
    const day = Number(new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'Asia/Manila' }).format(d));
    const year = Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Manila' }).format(d));
    const time = showTime ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }) : null;

    return (
        <div className="flex flex-col items-center leading-none whitespace-nowrap text-center">
            <span className="text-[11px] text-surface-700 font-medium tabular-nums">{month} {day}, {year}</span>
            {showTime && (
                <span className="text-[9px] text-surface-500 font-medium tabular-nums mt-1">{time}</span>
            )}
        </div>
    );
}

export function WaitTime({ applicant }: { applicant: Application }) {
    const [waitTimeStr, setWaitTimeStr] = useState<string>('—');
    const [waitColor, setWaitColor] = useState<string>('text-surface-500');

    useEffect(() => {
        const calculateWaitTime = () => {
            const timestamp = applicant.updated_at || applicant.created_at || applicant.applied_at;
            if (!timestamp) return;

            const start = new Date(timestamp).getTime();
            if (isNaN(start)) return;

            const diffMinutes = Math.floor((Date.now() - start) / 60000);

            if (diffMinutes < 60) {
                setWaitTimeStr(`${diffMinutes}m`);
                setWaitColor('text-emerald-600');
            } else if (diffMinutes < 1440) {
                const hrs = Math.floor(diffMinutes / 60);
                const mins = diffMinutes % 60;
                setWaitTimeStr(`${hrs}h ${mins}m`);
                setWaitColor(hrs >= 12 ? 'text-amber-600' : 'text-emerald-600');
            } else {
                const days = Math.floor(diffMinutes / 1440);
                const hrs = Math.floor((diffMinutes % 1440) / 60);
                setWaitTimeStr(`${days}d ${hrs}h`);
                setWaitColor(days >= 3 ? 'text-rose-600' : 'text-amber-600');
            }
        };

        calculateWaitTime();
        const interval = setInterval(calculateWaitTime, 60000);
        return () => clearInterval(interval);
    }, [applicant.updated_at, applicant.created_at, applicant.applied_at]);

    const isIdle = waitColor === 'text-rose-600';
    const isWarning = waitColor === 'text-amber-600' && waitTimeStr.includes('d');

    return (
        <div className="flex flex-col items-center leading-none relative group/wait">
            <div className="flex items-center gap-1.5">
                {isIdle && (
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                )}
                {isWarning && (
                    <span className="flex h-2 w-2 relative">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                )}
                <span className={cn("text-[11px] font-black tabular-nums tracking-wide uppercase", waitColor)}>
                    {waitTimeStr}
                </span>
            </div>
            <span className={cn(
                "text-[8px] font-bold tracking-widest uppercase mt-1",
                isIdle ? "text-rose-500" : isWarning ? "text-amber-500" : "text-surface-400"
            )}>
                {isIdle ? 'IDLE' : isWarning ? 'WARNING' : 'Wait Time'}
            </span>
        </div>
    );
}

