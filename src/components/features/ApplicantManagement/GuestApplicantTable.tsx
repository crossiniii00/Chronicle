import React from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate, cn } from '@/utils/formatters';
import type { Application } from '@/types/application';

interface GuestApplicantTableProps {
    applicants: Application[];
    viewMode: 'active' | 'history';
    onRowClick?: (app: Application) => void;
    renderActions?: (app: Application) => React.ReactNode;
    emptyMessage?: string;
    activeAccount?: string;
    onStatusChange?: (app: Application, newStatus: string) => void;
}

export function GuestApplicantTable({ 
    applicants, 
    viewMode,
    onRowClick,
    renderActions,
    emptyMessage = "No candidates found in this registry.",
    activeAccount,
    onStatusChange
}: GuestApplicantTableProps) {
    
    const toTitleCase = (str?: string) => {
        if (!str) return '';
        // Handles names like "JOHNNY SILVERHAND" or "MANDARIN AGENT"
        return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    };
    
    // Robust date formatting to avoid "NaN"
    const formatSafeDate = (dateStr?: string, type: 'date' | 'time' | 'full' = 'full') => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '—';

        if (type === 'date') {
            return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'Asia/Manila' });
        }
        if (type === 'time') {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Manila' });
    };

    const columns = [
        { label: 'CANDIDATE', width: '25%' },
        { label: 'ACCOUNT', width: '20%' },
        { label: 'ENDORSED DATE', align: 'center' },
        { label: viewMode === 'active' ? 'SCHEDULE TIME' : 'FINAL DATE', align: 'center' },
        { label: 'STATUS', align: 'center' },
        { label: 'ACTIONS', align: 'center' }
    ];

    if (applicants.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm py-20 text-center">
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-[0.2em]">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f9fafb] border-b border-surface-200">
                            {columns.map((col) => (
                                <th 
                                    key={col.label}
                                    className={cn(
                                        "px-5 py-3 text-[10px] font-bold text-surface-450 uppercase tracking-widest border-r border-surface-200 last:border-0",
                                        col.align === 'center' ? "text-center" : "text-left"
                                    )}
                                    style={{ width: col.width }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200">
                        {applicants.map((app) => (
                            <tr 
                                key={app.id}
                                onClick={() => onRowClick?.(app)}
                                className={cn(
                                    "group transition-colors border-b border-surface-200 last:border-0",
                                    onRowClick ? "cursor-pointer hover:bg-surface-50" : "hover:bg-surface-50/50"
                                )}
                            >
                                {/* CANDIDATE */}
                                <td className="px-5 py-3 border-r border-surface-200">
                                    <div className="flex items-center gap-3">
                                        {app.pis?.photo_data_url ? (
                                            <img
                                                src={app.pis.photo_data_url}
                                                alt={app.applicant_name}
                                                className="w-8 h-8 object-cover border border-surface-200 rounded-sm shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-surface-100 border border-surface-200 flex items-center justify-center text-[10px] font-semibold text-surface-600 rounded-sm shrink-0">
                                                {app.applicant_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate tracking-tight">
                                                    {toTitleCase(app.applicant_name)}
                                                </p>
                                                {Boolean(
                                                    app.metadata?.is_reprofiled === true || 
                                                    app.metadata?.is_reprofiled === 'true' ||
                                                    (app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) ||
                                                    (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0)
                                                ) && (
                                                    <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-250 rounded-sm uppercase tracking-wide shrink-0">
                                                        Reprofile
                                                    </span>
                                                )}
                                                {(() => {
                                                    const notes = String(app.pis?.ops_validator_notes || app.metadata?.ops_validator_notes || '').toUpperCase();
                                                    const updater = String(app.pis?.last_updated_by || app.metadata?.last_updated_by || '').toUpperCase();
                                                    const isForcePass = notes.includes('FORCE PASS') || updater.includes('FORCE PASS');
                                                    const isForceFail = notes.includes('FORCE FAIL') || updater.includes('FORCE FAIL');
                                                    if (isForcePass) {
                                                        return <span className="px-1.5 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-sm uppercase tracking-wide shrink-0 shadow-sm" title="Forced Pass">P</span>;
                                                    }
                                                    if (isForceFail) {
                                                        return <span className="px-1.5 py-0.5 text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 rounded-sm uppercase tracking-wide shrink-0 shadow-sm" title="Forced Fail">F</span>;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <p className="text-[9px] font-semibold text-surface-400 uppercase tracking-wider mt-0.5">
                                                ID: {app.applicant_id || app.id.split('-')[0].toUpperCase()}
                                            </p>
                                            {(app.assigned_ops_validator_name || app.metadata?.assigned_ops_validator_name) && (
                                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">
                                                    Endorsed to: {toTitleCase(app.assigned_ops_validator_name || app.metadata?.assigned_ops_validator_name)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                {/* LOB */}
                                <td className="px-5 py-3 border-r border-surface-200">
                                    <p className="text-xs font-semibold text-surface-800 tracking-tight leading-tight">
                                        {(() => {
                                            const rawVal = app.department || app.endorsement_account || app.pis?.final_account || '';
                                            if (!rawVal) return 'Unassigned';
                                            const failedAccounts = app.metadata?.failed_accounts || [];
                                            const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));
                                            const accounts = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
                                            const remaining = accounts.filter((acc: string) => !failedSet.has(acc.toLowerCase()));
                                            
                                            if (activeAccount && activeAccount.toLowerCase() !== 'all') {
                                                const activeUpper = activeAccount.trim().toUpperCase();
                                                const matched = remaining.find(acc => acc.trim().toUpperCase() === activeUpper || acc.trim().toUpperCase().startsWith(activeUpper));
                                                if (matched) return toTitleCase(matched);
                                                
                                                const fallbackMatched = accounts.find(acc => acc.trim().toUpperCase() === activeUpper || acc.trim().toUpperCase().startsWith(activeUpper));
                                                if (fallbackMatched) return toTitleCase(fallbackMatched);
                                            }

                                            return toTitleCase(remaining[remaining.length - 1] || accounts[accounts.length - 1] || 'Unassigned');
                                        })()}
                                    </p>
                                </td>

                                {/* ENDORSED DATE */}
                                <td className="px-5 py-3 border-r border-surface-200 text-center">
                                    <div className="flex flex-col items-center">
                                        <p className="text-[10px] font-semibold text-surface-700 leading-none">
                                            {formatSafeDate(app.endorsement_meeting_date || app.updated_at, 'date')}
                                        </p>
                                        <p className="text-[10px] font-normal text-surface-400 mt-0.5">
                                            {new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(app.endorsement_meeting_date || app.updated_at))}
                                        </p>
                                    </div>
                                </td>

                                {/* SCHEDULE TIME / FINAL DATE */}
                                <td className="px-5 py-3 border-r border-surface-200 text-center">
                                    <div className="flex flex-col items-center">
                                        {(() => {
                                            const hasReschedule = Boolean(
                                                app.current_status === 'RESCHEDULED' ||
                                                app.metadata?.reschedule_date ||
                                                (app.pis as any)?.final_specific_status?.includes('Reschedule') ||
                                                app.metadata?.rescheduled_from_status ||
                                                app.metadata?.['Specific Status']?.includes('Reschedule')
                                            );
                                            
                                            const scheduledDate = app.endorsement_meeting_date || app.updated_at;
                                            const displayDate = app.metadata?.reschedule_date || scheduledDate;
                                            const isPendingNewSchedule = hasReschedule && !app.metadata?.reschedule_date;
                                            
                                            const formattedTime = formatSafeDate(displayDate, 'time');
                                            
                                            if (viewMode === 'active') {
                                                const activeFormattedDate = formatSafeDate(displayDate, 'date');
                                                return (
                                                    <>
                                                        {isPendingNewSchedule ? (
                                                            <p className="text-[10px] font-semibold text-surface-500 leading-none text-center italic">
                                                                Awaiting Schedule
                                                            </p>
                                                        ) : (
                                                            <p className="text-[10px] font-semibold text-[#0078d4] leading-none text-center">
                                                                {activeFormattedDate} {formattedTime !== 'Invalid Date' && formattedTime !== '—' && `- ${formattedTime}`}
                                                            </p>
                                                        )}
                                                        <p className={cn("text-[9px] font-normal mt-0.5", hasReschedule ? "text-[#d97706] font-bold" : "text-surface-400")}>
                                                            {hasReschedule ? 'Rescheduled' : 'Initial Schedule'}
                                                        </p>
                                                        {hasReschedule && (
                                                            <div className="mt-1 px-1.5 py-[3px] rounded-[3px] bg-[#d97706]/10 text-[#d97706] text-[8.5px] font-bold tracking-[0.05em] uppercase border border-[#d97706]/20 shadow-[0_0_8px_rgba(217,119,6,0.35)] flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#d97706] animate-pulse"></span>
                                                                RESCHEDULED
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            }

                                            const formattedDate = formatSafeDate(app.updated_at, 'date');
                                            const yearFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(app.updated_at));

                                            return (
                                                <>
                                                    <div className="flex items-center gap-1.5 justify-center">
                                                        {isPendingNewSchedule ? (
                                                            <p className="text-[10px] font-semibold text-surface-500 leading-none italic">
                                                                Awaiting Schedule
                                                            </p>
                                                        ) : (
                                                            <p className="text-[10px] font-semibold text-surface-700 leading-none">
                                                                {formattedDate} {formattedTime !== 'Invalid Date' && formattedTime !== '—' && `- ${formattedTime}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-normal text-surface-400 mt-0.5 mb-1.5">
                                                        {yearFormat}
                                                    </p>
                                                    {hasReschedule && (
                                                        <div className="px-1.5 py-[3px] rounded-[3px] bg-[#d97706]/10 text-[#d97706] text-[8.5px] font-bold tracking-[0.05em] uppercase border border-[#d97706]/20 shadow-[0_0_8px_rgba(217,119,6,0.35)] flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#d97706] animate-pulse"></span>
                                                            RESCHEDULED
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </td>

                                {/* STATUS */}
                                <td className="px-5 py-3 border-r border-surface-200 text-center" onClick={(e) => onStatusChange && e.stopPropagation()}>
                                    <div className="flex justify-center">
                                        {(() => {
                                             const rawStatus = String(app.final_verdict || app.current_status || 'PENDING').toUpperCase().trim();
                                             const status = rawStatus.replace(/_/g, ' ');
                                             const specStatus = String((app.pis as any)?.final_specific_status || app.metadata?.final_specific_status || '').toUpperCase().trim();
                                             const ovStatus = String((app.pis as any)?.ops_validator_status || app.metadata?.ops_validator_status || '').toUpperCase().trim();
                                             const finalResult = String(app.metadata?.final_interview_result || app.pis?.final_interview_result || '').toUpperCase().trim();
                                             
                                             const isHired = ['HIRED', 'HIRED PROCESSED', 'ACCEPTED OFFER'].includes(status);
                                             const isPassed = ['PASSED', 'CLIENT ASSESSMENT', 'CLIENT INTERVIEW', 'FOR JOB OFFER', 'FOR PAN', 'CONTRACT SENT', 'CONFIRMED TRAINING'].includes(status) || ovStatus === 'PASSED' || specStatus.includes('OV - PASSED') || specStatus.includes('OPS VALIDATOR PASSED');
                                             
                                             const failedAccounts = (app.metadata?.failed_accounts || []).map((f: string) => f.trim().toLowerCase());
                                             
                                             const accountsToCheck = [
                                                 (app.department || '').trim().toLowerCase(),
                                                 (app.endorsement_account || '').trim().toLowerCase(),
                                                 (app.pis?.final_account || '').trim().toLowerCase(),
                                                 activeAccount && activeAccount.toLowerCase() !== 'all' ? activeAccount.trim().toLowerCase() : ''
                                             ].filter(Boolean);

                                             const isFailedForActiveAccount = accountsToCheck.some(acc => failedAccounts.includes(acc));
                                             
                                             const isReprofiledCandidate = failedAccounts.length > 0 || app.metadata?.is_reprofiled === true || app.metadata?.is_reprofiled === 'true';
                                             const reprofileQueue = app.metadata?.reprofile_accounts || (app.pis as any)?.reprofile_accounts || [];
                                             const hasPendingReprofile = Array.isArray(reprofileQueue) && reprofileQueue.some((acc: any) => acc.status === 'PENDING' || acc.status === 'ACTIVE' || acc.status === 'WAITING' || acc.status === 'REPROFILE');

                                             const verdictStr = String(app.final_verdict || '').toUpperCase();
                                             
                                             // Note: strictly do not include finalResult or final_verdict here as they are populated during the recruitment phase and would mistakenly conclude scheduled Ops Val candidates
                                             const isConcludedVerdictForCurrentSession = Boolean(
                                                 ovStatus === 'PASSED' ||
                                                 ovStatus === 'FAILED' ||
                                                 ovStatus === 'NO_SHOW' ||
                                                 ovStatus.includes('NO SHOW') ||
                                                 specStatus.includes('OV - PASSED') ||
                                                 specStatus.includes('OV - FAILED')
                                             );

                                             const isScheduledSession = Boolean(
                                                 app.current_status === 'FINAL_INTERVIEW_SCHEDULED' ||
                                                 app.recruiter_s_scheduling_status === 'SCHEDULED' ||
                                                 (app.endorsement_meeting_date && app.endorsement_meeting_date !== '—')
                                             );

                                             let isFailed = false;
                                             if (
                                                 ovStatus === 'FAILED' || 
                                                 specStatus.includes('OV - FAILED') || 
                                                 specStatus.includes('OPS VALIDATOR FAILED') || 
                                                 ['FAILED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN'].includes(status)
                                             ) {
                                                 isFailed = true;
                                             } else if (isFailedForActiveAccount) {
                                                 isFailed = true;
                                             }

                                             const isNoShow = status.includes('NO SHOW') || specStatus.includes('NO SHOW') || ovStatus.includes('NO SHOW');

                                             let displayStatus = 'PENDING';
                                             if (isHired) {
                                                 displayStatus = 'Accepted Offer';
                                             } else if (isPassed) {
                                                 displayStatus = 'PASSED';
                                             } else if (isFailed) {
                                                 displayStatus = 'FAILED';
                                             } else if (isNoShow) {
                                                 displayStatus = 'NO_SHOW';
                                             } else if (!isConcludedVerdictForCurrentSession && isScheduledSession) {
                                                 displayStatus = 'PENDING';
                                             } else if (isReprofiledCandidate && !isFailedForActiveAccount && !isConcludedVerdictForCurrentSession) {
                                                 displayStatus = 'PENDING';
                                             } else if (hasPendingReprofile && !isConcludedVerdictForCurrentSession) {
                                                 displayStatus = 'PENDING';
                                             } else {
                                                 displayStatus = 'PENDING';
                                             }

                                             if (onStatusChange) {
                                                 const selectVal = displayStatus === 'FAILED' 
                                                     ? 'FAILED' 
                                                     : (displayStatus === 'PASSED' || displayStatus === 'Accepted Offer' 
                                                         ? 'PASSED' 
                                                         : (displayStatus === 'NO_SHOW' ? 'NO_SHOW' : 'PENDING'));
                                                 
                                                 return (
                                                     <select
                                                         value={selectVal}
                                                         onChange={(e) => {
                                                             const val = e.target.value;
                                                             if (val) {
                                                                 onStatusChange(app, val);
                                                             }
                                                         }}
                                                         className={cn(
                                                             "px-2.5 py-1 text-[11px] font-bold rounded-sm border focus:outline-none cursor-pointer tracking-wider transition-all",
                                                             selectVal === 'PASSED'
                                                                 ? "bg-emerald-50 text-emerald-700 border-emerald-300 focus:border-emerald-500 hover:bg-emerald-100"
                                                                 : selectVal === 'FAILED'
                                                                     ? "bg-red-50 text-red-700 border-red-300 focus:border-red-500 hover:bg-red-100"
                                                                     : selectVal === 'NO_SHOW'
                                                                         ? "bg-amber-50 text-amber-700 border-amber-300 focus:border-amber-500 hover:bg-amber-100"
                                                                         : "bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 focus:border-slate-400"
                                                         )}
                                                     >
                                                         {selectVal === 'PENDING' && <option value="PENDING" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold py-1">Pending</option>}
                                                         <option value="PASSED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold py-1">Passed</option>
                                                         <option value="FAILED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold py-1">Failed</option>
                                                         <option value="NO_SHOW" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold py-1">No show</option>
                                                     </select>
                                                 );
                                             }

                                             return <StatusBadge status={displayStatus as any} size="sm" schedulingStatus={app.recruiter_s_scheduling_status || app.metadata?.recruiter_s_scheduling_status} applicant={app} />;
                                        })()}
                                    </div>
                                </td>

                                {/* ACTIONS */}
                                <td className="px-5 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {renderActions?.(app)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
