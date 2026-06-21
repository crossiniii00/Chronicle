import React, { useState, useEffect } from 'react';
import {
    User,
    Zap,
    Trash
} from 'lucide-react';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { getEndorsedOvBadgeLabel } from '@/utils/applicantBadges';
import { getReprofileQueue } from '@/utils/reprofileQueue';
import { useRoomStore } from '@/store/roomStore';
import { MedicalIndicator } from '@/components/common/MedicalIndicator';

function AnimatedAvatar({ gender, photoUrl, name }: { gender?: string; photoUrl?: string; name: string }) {
    const normalizedGender = (gender || '').toLowerCase().trim();
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
    isSelectMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onClick: () => void;
    onAction: (id: string, name: string, action: 'approve' | 'reject' | 'view' | 'delete') => void;
    onPromote?: (app: Application) => void;
    isReprofileView?: boolean;
    onSetActiveReprofileAccount?: (app: Application, account: string) => void;
}

export function ApplicantRow({
    applicant,
    isSelectMode,
    isSelected,
    onSelect,
    onClick,
    onAction,
    onPromote,
    isReprofileView,
    onSetActiveReprofileAccount
}: ApplicantRowProps) {
    const { rooms } = useRoomStore();
    const [isClicked, setIsClicked] = useState(false);

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

    const hasTyping = applicant.typing_test_wpm !== undefined;
    const hasAssessment = applicant.assessment_score !== undefined;
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
    const schedulingStatus = applicant.recruiter_s_scheduling_status || applicant.metadata?.recruiter_s_scheduling_status;

    const isReprofiledAndPassed = (() => {
        const history = applicant.pis?.reprofile_history || applicant.metadata?.reprofile_history || [];
        const hasHistory = Array.isArray(history) && history.length > 0;
        const hasReprofileFlag = applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true';
        const isReprofiled = hasHistory || hasReprofileFlag;

        const isConcludedStatus = ['PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'ACCEPTED_COFFER', 'For Job Offer', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'Sent JO and BGC', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'For PAN', 'FOR PAN', 'FOR_PAN'].includes(applicant.current_status);
        return isReprofiled && isConcludedStatus;
    })();

    const hasFailedAllAccounts = (() => {
        const depts = (applicant.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        if (depts.length === 0) return false;
        const failedAccounts = applicant.metadata?.failed_accounts || [];
        const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
        return depts.every(d => failedSet.has(d));
    })();

    const hasFailedSomeButNotAllAccounts = (() => {
        const depts = (applicant.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        const failedAccounts = applicant.metadata?.failed_accounts || [];
        return failedAccounts.length > 0 && depts.length > 0;
    })();

    const customStatusLabel = hasFailedAllAccounts
        ? 'FAILED'
        : isReprofiledAndPassed
            ? 'Reprofiled & Passed'
            : ['PASSED', 'For Job Offer', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'For PAN', 'FOR PAN', 'FOR_PAN'].includes(applicant.current_status)
                ? 'Regularly Passed'
                : ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'Accepted Offer', 'Sent JO and BGC', 'SENT_JO_AND_BGC', 'SENT JO AND BGC'].includes(applicant.current_status)
                ? 'Regular Hired'
                    : (applicant.current_status === 'FINAL_INTERVIEW' && schedulingStatus === 'PENDING')
                        ? (hasFailedSomeButNotAllAccounts ? 'Scheduling to next account' : 'Scheduled for Later')
                        : applicant.current_status.replace(/_/g, ' ');

    const statusLabel = (isReprofileView && !isConcluded) ? reprofileStatusLabel : customStatusLabel;

    const departmentNode = (() => {
        const pis = (applicant as any).pis || {};
        const rawVal = pis.final_account || applicant.endorsement_account || applicant.department || '';
        if (!rawVal || /^(NULL|null|---|N\/A)$/.test(String(rawVal).trim())) {
            return <span className="text-[10px] text-surface-400 font-normal truncate leading-none mt-1.5">Operations</span>;
        }

        const failedAccounts = applicant.metadata?.failed_accounts || [];
        const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));

        const accounts = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);

        const statusUpper = applicant.current_status?.toUpperCase() || '';
        const isFailed = statusUpper === 'REJECTED' || statusUpper === 'FAILED';

        if (isFailed) {
            return (
                <span className="text-[10px] flex flex-wrap gap-1 leading-none mt-1.5">
                    {accounts.map((acc: string, idx: number) => {
                        const isAccFailed = failedSet.has(acc.toLowerCase());
                        const isActive = !isAccFailed && acc.toLowerCase() === remaining[0]?.toLowerCase();
                        const isReprofiledAcc = (applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true') &&
                            acc.toLowerCase() === (applicant.pis?.initial_account_assignment || applicant.metadata?.initial_account_assignment || '').toLowerCase();
                        return (
                            <span key={idx} className={cn(
                                "inline-flex items-center gap-0.5",
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
                                <span>{acc}{idx < accounts.length - 1 ? ',' : ''}</span>
                            </span>
                        );
                    })}
                </span>
            );
        }

        const remaining = accounts.filter((acc: string) => !failedSet.has(acc.toLowerCase()));
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
                    return (
                        <span key={idx} className={cn(
                            "inline-flex items-center gap-0.5",
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

    const assessmentScore = applicant.assessment_score || 0;
    const scoreTone = (() => {
        const scoreStr = String(assessmentScore).toUpperCase().trim();
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
        const s = hasFailedAllAccounts ? 'FAILED' : String(applicant.current_status || '').toUpperCase();
        if (s === 'TYPING_TEST' || s === 'TYPING TEST') {
            return 'text-sky-700 bg-sky-50 border-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.15)]';
        }
        if (s === 'INITIAL_INTERVIEW' || s === 'INITIAL INTERVIEW') {
            return 'text-amber-700 bg-amber-50 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]';
        }
        if (s === 'FINAL_INTERVIEW') {
            return 'text-violet-700 bg-violet-50 border-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.3)] font-bold';
        }
        if (s === 'FINAL_INTERVIEW_SCHEDULED' || s === 'FINAL INTERVIEW SCHEDULED') {
            return 'text-blue-700 bg-blue-50 border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.45)] font-bold animate-pulse';
        }
        if (s.includes('HIRE') || s.includes('PASS') || s.includes('ACCEPT')) {
            return 'text-emerald-700 bg-emerald-50 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35)] font-bold';
        }
        if (s.includes('FAIL') || s.includes('REJECT') || s.includes('NOT ELIGIBLE') || s.includes('WITHDRAW')) {
            return 'text-rose-700 bg-rose-50 border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)]';
        }
        if (s.includes('PENDING') || s.includes('SCHEDULE') || s.includes('ASSESS') || s.includes('OPEN')) {
            return 'text-slate-700 bg-slate-50 border-slate-300';
        }
        return 'text-surface-700 bg-surface-50/80 border-surface-200';
    })();

    return (
        <div
            className={cn(
                "group transition-colors cursor-pointer grid grid-cols-[1.2fr_180px_1fr_110px_90px_160px_100px_90px_110px] items-center",
                "h-16",
                isSelected
                    ? "bg-[#f4f5f7]"
                    : "bg-white hover:bg-[#fafafa]"
            )}
            onClick={() => {
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
                }
                isSelectMode && onSelect ? onSelect(applicant.id) : onClick();
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
                        className="w-3.5 h-3.5 rounded-sm border-surface-300 text-surface-900 focus:ring-surface-400 cursor-pointer"
                    />
                ) : (
                    <AnimatedAvatar
                        gender={applicant.pis?.gender}
                        photoUrl={applicant.pis?.photo_data_url}
                        name={applicant.applicant_name}
                    />
                )}
                <div className="min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[13px] font-semibold text-surface-900 truncate leading-none">
                            {applicant.applicant_name}
                        </h3>
                        <MedicalIndicator application={applicant} size="xs" />
                        {isNewlyAccepted && (
                            <span
                                className="text-[9px] font-black uppercase tracking-wider leading-none px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shrink-0 animate-pulse"
                                title="Newly updated applicant record"
                            >
                                {newBadgeLabel}
                            </span>
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

            {/* Assigned Recruiter/Ops Val */}
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
                    <span className="text-[11px] text-surface-300 font-medium leading-none">Unassigned</span>
                )}
            </div>

            {/* Position / Dept */}
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

            {/* Typing Stats */}
            <div className="px-4 h-full flex flex-col justify-center items-center text-center">
                {hasTyping ? (
                    <>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[13px] font-semibold text-surface-900 tabular-nums">{applicant.typing_test_wpm}</span>
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
                    <span className={cn("text-[13px] font-semibold tabular-nums leading-none", scoreTone)}>
                        {assessmentScore}
                        {!['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(String(assessmentScore).toUpperCase()) && '%'}
                    </span>
                ) : (
                    <span className="text-[12px] text-surface-200 font-light leading-none">—</span>
                )}
            </div>

            {/* Application Status */}
            <div className="px-2 h-full flex items-center justify-center min-w-0">
                <span className={cn(
                    "px-2.5 py-1 text-[10px] font-semibold tracking-[0.02em] rounded-full border text-center truncate w-full shrink-0",
                    (isReprofileView && !isConcluded)
                        ? "text-primary-700 bg-primary-50/60 border-primary-200/60"
                        : (applicant.current_status === 'FINAL_INTERVIEW' && schedulingStatus === 'PENDING')
                            ? "status-schedule-later"
                            : statusTone
                )}>
                    {statusLabel}
                </span>
            </div>

            {/* Interview Mode */}
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

            {/* Date Applied */}
            <div className="px-4 h-full flex flex-col justify-center items-center">
                <AppliedDate date={applicant.applied_at} />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center px-2 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(applicant.id, applicant.applicant_name, 'view'); }}
                    className="p-1.5 text-surface-400 hover:text-surface-900 hover:bg-surface-100 transition-colors"
                    title="Detailed View"
                >
                    <User size={13} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(applicant.id, applicant.applicant_name, 'delete'); }}
                    className="p-1.5 text-surface-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Purge Record"
                >
                    <Trash size={13} />
                </button>
            </div>
        </div>
    );
}

function AppliedDate({ date }: { date?: string | null }) {
    if (!date) {
        return <span className="text-[12px] text-surface-200 font-light leading-none">—</span>;
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return <span className="text-[12px] text-surface-200 font-light leading-none">—</span>;
    }
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    return (
        <div className="flex flex-col items-center leading-none">
            <span className="text-[12px] text-surface-700 font-medium tabular-nums">{month} {day}</span>
            <span className="text-[9px] text-surface-400 font-normal tabular-nums mt-1">{year}</span>
        </div>
    );
}
