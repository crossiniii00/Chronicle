import React from 'react';
import { ChevronRight, Trash, Mail, Phone, Calendar, Zap } from 'lucide-react';
import { cn, formatDateTime } from '@/utils/formatters';
import type { Application } from '@/types/application';
import { getEndorsedOvBadgeLabel } from '@/utils/applicantBadges';
import { getReprofileQueue } from '@/utils/reprofileQueue';
import { MedicalIndicator } from '@/components/common/MedicalIndicator';

type ApplicantAction = 'approve' | 'reject' | 'view' | 'delete';

interface ApplicantCardProps {
    applicant: Application;
    isSelectMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onAction: (id: string, name: string, action: ApplicantAction) => void;
    isReprofileView?: boolean;
    onSetActiveReprofileAccount?: (app: Application, account: string) => void;
}

export function ApplicantCard({
    applicant,
    isSelectMode,
    isSelected,
    onSelect,
    onAction,
    isReprofileView,
    onSetActiveReprofileAccount
}: ApplicantCardProps) {
    const endorsedOvBadgeLabel = getEndorsedOvBadgeLabel(applicant);
    const reprofileQueue = isReprofileView ? getReprofileQueue(applicant) : [];
    const activeReprofileAccount = reprofileQueue.find(item => item.status === 'ACTIVE');
    const isConcluded = ['PASSED', 'FAILED', 'HIRED', 'HIRED_PROCESSED', 'REJECTED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(applicant.current_status);
    const isReprofiledAndPassed = (() => {
        const history = applicant.pis?.reprofile_history || applicant.metadata?.reprofile_history || [];
        const hasHistory = Array.isArray(history) && history.length > 0;
        const hasReprofileFlag = applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true';
        const isReprofiled = hasHistory || hasReprofileFlag;
        
        const isConcludedStatus = ['PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'ACCEPTED_COFFER', 'For Job Offer', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'Sent JO and BGC', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'For PAN', 'FOR PAN', 'FOR_PAN'].includes(applicant.current_status);
        return isReprofiled && isConcludedStatus;
    })();

    const reprofileStatusLabel = activeReprofileAccount ? 'Reprofile Active' : reprofileQueue.length > 0 ? 'Reprofile Waiting' : 'Reprofile';
    const statusLabel = (isReprofileView && !isConcluded)
        ? reprofileStatusLabel
        : isReprofiledAndPassed
            ? 'Reprofiled & Passed'
            : applicant.current_status.replace(/_/g, ' ');

    return (
        <div
            onClick={() => isSelectMode && onSelect ? onSelect(applicant.id) : onAction(applicant.id, applicant.applicant_name, 'view')}
            className={cn(
                "border p-6 rounded-lg shadow-sm cursor-pointer group transition-all",
                isSelected ? "bg-primary-50 border-primary-300" : "bg-white border-surface-200 hover:border-primary-400 hover:shadow-md"
            )}
        >
            <div className="flex justify-between items-start mb-5">
                {isSelectMode ? (
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect?.(applicant.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded-sm border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                ) : (
                    <div className="w-10 h-10 bg-surface-50 rounded-lg flex items-center justify-center text-primary-700 font-bold text-lg border border-surface-200 overflow-hidden group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm">
                        {applicant.pis?.photo_data_url ? (
                            <img src={applicant.pis.photo_data_url} alt={applicant.applicant_name} className="w-full h-full object-cover" />
                        ) : (
                            applicant.applicant_name.charAt(0)
                        )}
                    </div>
                )}
                <div className="flex flex-col items-end gap-2">
                    <div className={cn(
                        "px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md border shadow-sm",
                        (isReprofileView && !isConcluded)
                            ? "bg-primary-50 text-primary-700 border-primary-100"
                            : `status-${applicant.current_status.toLowerCase().replace(/_/g, '-')}`
                    )}>
                        {statusLabel}
                    </div>
                </div>
            </div>

            <div className="space-y-1 mb-5">
                <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-bold text-surface-900 group-hover:text-primary-700 transition-colors leading-none tracking-tight truncate">
                        {applicant.applicant_name}
                    </h3>
                    <MedicalIndicator application={applicant} size="sm" />
                </div>
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider truncate">
                    {applicant.position_title}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {endorsedOvBadgeLabel && (
                        <div
                            className="flex items-center gap-1.5 px-2 py-0.5 bg-primary-50 text-primary-600 border border-primary-100 rounded-full w-fit max-w-full shadow-sm"
                            title={endorsedOvBadgeLabel}
                        >
                            <Zap size={8} className="fill-current" />
                            <span className="text-[8px] font-bold uppercase tracking-widest leading-none truncate">{endorsedOvBadgeLabel}</span>
                        </div>
                    )}
                    {isReprofiledAndPassed ? (
                        <div
                            className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full w-fit max-w-full shadow-sm animate-pulse"
                            title={`Reprofile successfully accomplished and passed for ${applicant.department}`}
                        >
                            <span className="text-[8px] font-black uppercase tracking-wider leading-none">✅ Reprofiled & Passed: {applicant.department}</span>
                        </div>
                    ) : (isConcluded && ['PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'ACCEPTED_COFFER', 'For Job Offer', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'Sent JO and BGC', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'For PAN', 'FOR PAN', 'FOR_PAN'].includes(applicant.current_status)) ? (
                        <div
                            className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full w-fit max-w-full shadow-sm"
                            title={`Regularly passed for ${applicant.department}`}
                        >
                            <span className="text-[8px] font-black uppercase tracking-wider leading-none">🔵 Regularly Passed: {applicant.department}</span>
                        </div>
                    ) : isConcluded && getReprofileQueue(applicant).some(item => item.status === 'COMPLETED') ? (
                        <div
                            className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full w-fit max-w-full shadow-sm animate-pulse"
                            title={`Reprofile successfully accomplished for ${applicant.department}`}
                        >
                            <span className="text-[8px] font-black uppercase tracking-wider leading-none">✅ Reprofile Accomplished: {applicant.department}</span>
                        </div>
                    ) : ((applicant.pis?.reprofile_history?.length ?? 0) > 0 || (applicant.metadata?.reprofile_history?.length ?? 0) > 0 || applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true') ? (
                        <div
                            className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full w-fit max-w-full shadow-sm"
                            title="This candidate went through a reprofile process"
                        >
                            <span className="text-[8px] font-black uppercase tracking-wider leading-none">🔄 Reprofiled</span>
                        </div>
                    ) : null}
                </div>
                {reprofileQueue.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {reprofileQueue.map(item => {
                            const isActive = item.status === 'ACTIVE';
                            if (isActive) {
                                return (
                                    <span
                                        key={item.account}
                                        className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm"
                                        title={`Active: ${item.account}`}
                                    >
                                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping shrink-0" style={{ animationDuration: '2s' }} />
                                        Active: {item.account}
                                    </span>
                                );
                            }
                            return (
                                <button
                                    key={item.account}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetActiveReprofileAccount?.(applicant, item.account);
                                    }}
                                    className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50/60 text-amber-700 text-[8px] font-bold uppercase tracking-wider leading-none transition-all hover:bg-amber-100 hover:border-amber-300 hover:scale-[1.02] shrink-0 shadow-sm"
                                    title={`Set ${item.account} as active`}
                                >
                                    {item.account}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-[10px] text-[#605e5c] font-medium">
                    <Mail size={12} className="text-[#a19f9d]" />
                    <span className="truncate">{applicant.applicant_email}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#605e5c] font-medium">
                    <Calendar size={12} className="text-[#a19f9d]" />
                    <span>{formatDateTime(applicant.applied_at)}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-surface-100">
                <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">{applicant.department || 'GENERAL'}</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction(applicant.id, applicant.applicant_name, 'delete');
                        }}
                        className="p-2 text-surface-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all animate-none"
                        title="Delete Record"
                    >
                        <Trash size={14} />
                    </button>
                    <ChevronRight size={16} className="text-surface-300 group-hover:text-primary-500 transition-colors animate-none" />
                </div>
            </div>
        </div>
    );
}
