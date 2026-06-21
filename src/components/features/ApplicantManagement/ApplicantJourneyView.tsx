import React from 'react';
import { ChevronRight, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { cn, timeAgo } from '@/utils/formatters';
import type { Application } from '@/types/application';

type JourneyApplication = Application & { action?: 'delete' | 'approve' | 'reject' };

interface ApplicantJourneyViewProps {
    applications: Application[];
    onViewSubmission: (app: JourneyApplication) => void;
    isRequestsView?: boolean; // Add flag to identify if this is requests view
}

function AnimatedAvatar({ gender, photoUrl, name }: { gender?: string; photoUrl?: string; name: string }) {
    const normalizedGender = (gender || '').toLowerCase().trim();
    const isFemale = normalizedGender === 'female' || normalizedGender === 'f';
    const avatarUrl = photoUrl || (isFemale ? '/default-avatar-female.png?v=3' : '/default-avatar-male.png?v=3');

    return (
        <div className="w-10 h-10 border border-surface-200 bg-surface-50 shrink-0 overflow-hidden rounded-none">
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        </div>
    );
}

export function ApplicantJourneyView({ applications, onViewSubmission, isRequestsView }: ApplicantJourneyViewProps) {
    return (
        <div className="bg-white border border-surface-200 rounded-none overflow-hidden">
            <div className="bg-surface-50 px-6 py-3 flex items-center gap-2 border-b border-surface-200">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Candidate Registry</p>
                <span className="text-surface-300">•</span>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{applications.length} Records</p>
            </div>
            <div className="divide-y divide-surface-100">
                {applications.map((app) => (
                    <div
                        key={app.id}
                        onClick={() => onViewSubmission(app)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onViewSubmission(app);
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        className="w-full text-left px-6 py-4 hover:bg-surface-50 transition-colors flex items-center gap-6 cursor-pointer focus:outline-none focus:bg-surface-50"
                    >
                        <AnimatedAvatar
                            gender={app.pis?.gender}
                            photoUrl={app.pis?.photo_data_url}
                            name={app.applicant_name}
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                            <div>
                                <p className="text-sm font-bold text-surface-900 tracking-tight">{app.applicant_name}</p>
                                <p className="text-xs font-medium text-surface-500 mt-0.5 truncate">{app.applicant_email}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider leading-none mb-1">Position</p>
                                <p className="text-xs font-semibold text-surface-900 leading-tight">
                                    {app.position_title} 
                                    <span className="text-surface-300 mx-1">•</span> 
                                    {(() => {
                                        const pis = (app as any).pis || {};
                                        const rawVal = pis.final_account || app.endorsement_account || app.department || '';
                                        if (!rawVal) return 'Operations';
                                        
                                        const failedAccounts = app.metadata?.failed_accounts || [];
                                        const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));
                                        const accounts = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
                                        const remaining = accounts.filter(acc => !failedSet.has(acc.toLowerCase()));
                                        
                                        const statusUpper = app.current_status?.toUpperCase() || '';
                                        const isFailed = statusUpper === 'REJECTED' || statusUpper === 'FAILED';
                                        
                                        if (isFailed) {
                                            return (
                                                <span className="inline-flex flex-wrap gap-1">
                                                    {accounts.map((acc, idx) => {
                                                        const isAccFailed = failedSet.has(acc.toLowerCase());
                                                        const isActive = !isAccFailed && acc.toLowerCase() === remaining[0]?.toLowerCase();
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
                                                                <span>{acc}{idx < accounts.length - 1 ? ',' : ''}</span>
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
                                        let displayedAccounts = remaining;
                                        if (isHiredOrJO && remaining.length > 1) {
                                            displayedAccounts = [remaining[0]];
                                        }
                                        return (
                                            <span className="inline-flex flex-wrap gap-1">
                                                {displayedAccounts.map((acc, idx) => {
                                                    const isActive = acc.toLowerCase() === remaining[0]?.toLowerCase();
                                                    return (
                                                        <span key={idx} className={cn(
                                                            "inline-flex items-center gap-0.5",
                                                            isActive ? "text-emerald-600 font-black" : "text-slate-400 font-semibold"
                                                        )}>
                                                            {isActive && (
                                                                <svg className="w-2.5 h-2.5 text-emerald-600 animate-in zoom-in-75 duration-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                            <span>{acc}{idx < displayedAccounts.length - 1 ? ',' : ''}</span>
                                                        </span>
                                                    );
                                                })}
                                            </span>
                                        );
                                    })()}
                                </p>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                {(() => {
                                    const depts = (app.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                                    const failedAccounts = app.metadata?.failed_accounts || [];
                                    const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
                                    const hasFailedAllAccounts = depts.length > 0 && depts.every(d => failedSet.has(d));
                                    const statusText = hasFailedAllAccounts ? 'FAILED' : app.current_status;

                                    return (
                                        <span className={cn(
                                            "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-none border",
                                            `status-${statusText.toLowerCase().replace(/_/g, '-')}`
                                        )}>
                                            {statusText.replace(/_/g, ' ')}
                                        </span>
                                    );
                                })()}
                                <span className="text-[11px] font-medium text-surface-400">Updated {timeAgo(app.updated_at || app.applied_at)}</span>
                                {(isRequestsView || ['PASSED', 'REJECTED', 'FAILED', 'HIRED'].includes(app.current_status)) && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                        {/* Removed check and x buttons */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewSubmission({ ...app, action: 'delete' });
                                            }}
                                            className="p-2 text-surface-300 hover:text-red-600 hover:bg-red-50 rounded-none transition-all outline-none"
                                            title="Delete Record"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                                <ChevronRight size={16} className="text-surface-300" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
