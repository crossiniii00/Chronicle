import React, { useState, useEffect } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn, formatDate, getStatusLabel } from '@/utils/formatters';
import type { Application } from '@/types/application';

function getStatusPill(status: string | undefined) {
    if (!status) return 'bg-surface-100 text-surface-700 ring-surface-200';
    const STATUS_PILL_STYLES: Record<string, string> = {
        HIRED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        PASSED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        ACCEPTED_OFFER: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        'ACCEPTED OFFER': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        REJECTED: 'bg-rose-100 text-rose-700 ring-rose-200',
        FAILED: 'bg-rose-100 text-rose-700 ring-rose-200',
        WITHDRAWN: 'bg-surface-100 text-surface-700 ring-surface-200',
        NOT_ELIGIBLE_FOR_REHIRE: 'bg-rose-100 text-rose-700 ring-rose-200',
        FINAL_INTERVIEW: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
        FINAL_INTERVIEW_SCHEDULED: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
        CLIENT_INTERVIEW: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
        CLIENT_ASSESSMENT: 'bg-violet-100 text-violet-700 ring-violet-200',
        ASSESSMENT: 'bg-violet-100 text-violet-700 ring-violet-200',
        INITIAL_INTERVIEW: 'bg-sky-100 text-sky-700 ring-sky-200',
        INTERVIEW_IN_PROGRESS: 'bg-sky-100 text-sky-700 ring-sky-200',
        QUEUE_ASSIGNED: 'bg-sky-100 text-sky-700 ring-sky-200',
        TYPING_TEST: 'bg-amber-100 text-amber-700 ring-amber-200',
        APPLIED: 'bg-surface-100 text-surface-700 ring-surface-200',
        FOR_JOB_OFFER: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        'FOR JOB OFFER': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        FOR_PAN: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        SENT_JO_AND_BGC: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        'SENT JO AND BGC': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        ENDORSED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        FINAL_VERDICT: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        CONDITIONAL: 'bg-amber-100 text-amber-700 ring-amber-200',
        WAITLISTED: 'bg-amber-100 text-amber-700 ring-amber-200',
        OPEN: 'bg-surface-100 text-surface-700 ring-surface-200',
        PROMOTION: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        PROMOTED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        LATERAL_TRANSFER: 'bg-sky-100 text-sky-700 ring-sky-200',
        REPROFILED: 'bg-amber-100 text-amber-700 ring-amber-200',
    };
    return STATUS_PILL_STYLES[status.toUpperCase()] || 'bg-surface-100 text-surface-700 ring-surface-200';
}



export function ApplicationLogTab({ applicant }: { applicant: Application }) {
    const [loading, setLoading] = useState(true);
    const [historyApps, setHistoryApps] = useState<any[]>([]);
    const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
            try {
                const { ApplicationService } = await import('@/services/ApplicationService');
                const allApps = await ApplicationService.getAll();
                
                const matched = allApps.filter((a: any) => 
                    (a.applicant_email && applicant.applicant_email && a.applicant_email.toLowerCase() === applicant.applicant_email.toLowerCase()) ||
                    (applicant.applicant_id && a.applicant_id === applicant.applicant_id) ||
                    (a.applicant_name && applicant.applicant_name && a.applicant_name.toLowerCase() === applicant.applicant_name.toLowerCase())
                );
                
                matched.sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());
                
                const matchedWithHistory = await Promise.all(
                    matched.map(async (app) => {
                        try {
                            const transitions = await ApplicationService.getStatusHistory(app.id);
                            return { ...app, transitions };
                        } catch {
                            return { ...app, transitions: [] };
                        }
                    })
                );
                
                if (isMounted) {
                    setHistoryApps(matchedWithHistory);
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) setLoading(false);
            }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, [applicant]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 size={20} className="animate-spin text-[#0078D4]" />
                <p className="text-[12px] text-surface-500 font-medium">Loading application history...</p>
            </div>
        );
    }

    if (historyApps.length === 0) {
        return (
            <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                    <ClipboardList size={20} className="text-surface-300" />
                </div>
                <p className="text-[12.5px] text-surface-400 italic">No application records found.</p>
            </div>
        );
    }

    const toggleAppExpand = (appId: string) => {
        setExpandedApps(prev => ({ ...prev, [appId]: !prev[appId] }));
    };

    return (
        <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 mb-1">
                <ClipboardList size={14} className="text-[#0078D4]" />
                <h2 className="text-[10px] font-black text-[#0078D4] uppercase tracking-widest">Application Log</h2>
                <span className="text-[12px] text-surface-500 font-semibold">({historyApps.length} applications logged)</span>
            </div>
            
            <div className="space-y-6">
                {historyApps.map((app, index) => {
                    const statusUpper = (app.current_status || '').toUpperCase();
                    const isFail = ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(statusUpper);
                    const appliedDate = formatDate(app.applied_at);
                    const isExpanded = !!expandedApps[app.id];
                    
                    return (
                        <div
                            key={app.id}
                            className={cn(
                                "border rounded-lg p-5 shadow-sm transition-all",
                                isFail 
                                    ? "bg-rose-50/40 border-rose-200 hover:border-rose-300" 
                                    : "bg-white dark:bg-slate-900 border-surface-200 hover:border-surface-300 hover:shadow-md"
                            )}
                        >
                            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={cn(
                                            "text-[14px] font-bold tracking-tight",
                                            isFail ? "text-rose-900" : "text-surface-900"
                                        )}>
                                            {app.position_title || 'General Application'}
                                        </h3>
                                        {app.department && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 bg-surface-100 text-surface-600 rounded">
                                                {app.department}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10.5px] text-surface-500 mt-1 flex items-center gap-1.5 font-mono">
                                        Applied: {appliedDate}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1",
                                        isFail 
                                            ? "bg-rose-100 text-rose-700 ring-rose-200" 
                                            : getStatusPill(app.current_status)
                                    )}>
                                        {getStatusLabel(app.current_status)}
                                    </span>
                                </div>
                            </div>

                            {app.rejection_reason && (
                                <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-100 text-xs text-rose-800 leading-relaxed">
                                    <span className="font-bold block uppercase tracking-wider text-[9px] text-rose-500 mb-1">Rejection Reason:</span>
                                    {app.rejection_reason}
                                </div>
                            )}

                            {app.transitions && app.transitions.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-dashed border-surface-200">
                                    <button
                                        onClick={() => toggleAppExpand(app.id)}
                                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-600 focus:outline-none mb-1"
                                    >
                                        <span>Status History ({app.transitions.length})</span>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#0078D4]">
                                            {isExpanded ? 'Hide Details' : 'Show Details'}
                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="relative border-l-2 border-surface-200 pl-4 ml-2 mt-4 space-y-4 text-left animate-fade-in">
                                            {app.transitions.map((t: any, ti: number) => {
                                                const isTransFail = ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes((t.to_status || '').toUpperCase());
                                                return (
                                                    <div key={t.id || ti} className="relative animate-fade-in">
                                                        <span className={cn(
                                                            "absolute -left-[21px] top-1.5 w-2 h-2 rounded-full ring-4 ring-white",
                                                            isTransFail ? "bg-rose-500" : "bg-indigo-500"
                                                        )} />
                                                        <div className="text-[11.5px] text-surface-700">
                                                            <div className="flex items-baseline justify-between flex-wrap gap-2">
                                                                <div>
                                                                    Changed to{" "}
                                                                    <span className={cn(
                                                                        "font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                                                                        isTransFail 
                                                                            ? "bg-rose-100 text-rose-850 rounded-sm" 
                                                                            : "bg-indigo-50 text-indigo-805 rounded-sm"
                                                                    )}>
                                                                        {getStatusLabel(t.to_status)}
                                                                    </span>
                                                                    {t.from_status && (
                                                                        <span className="text-surface-400 text-[10px] ml-1.5 font-medium">
                                                                            (from {getStatusLabel(t.from_status)})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-surface-400 font-mono">
                                                                    {new Date(t.changed_at).toLocaleString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            </div>
                                                            {(t.changed_by_name || t.change_reason) && (
                                                                <p className="text-[10.5px] text-surface-500 mt-1 leading-relaxed">
                                                                    {t.changed_by_name && (
                                                                        <>
                                                                            By <span className="font-semibold text-surface-600">{t.changed_by_name}</span>
                                                                        </>
                                                                    )}
                                                                    {t.change_reason && (
                                                                        <>
                                                                            {" · "}
                                                                            <span className="italic">"{t.change_reason}"</span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
