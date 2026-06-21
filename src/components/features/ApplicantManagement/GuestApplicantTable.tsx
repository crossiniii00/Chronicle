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
}

export function GuestApplicantTable({ 
    applicants, 
    viewMode,
    onRowClick,
    renderActions,
    emptyMessage = "No candidates found in this registry.",
    activeAccount
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
            return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        }
        if (type === 'time') {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const columns = [
        { label: 'CANDIDATE', width: '25%' },
        { label: 'POSITION', width: '20%' },
        { label: 'ENDORSED DATE', align: 'center' },
        { label: viewMode === 'active' ? 'SCHEDULE TIME' : 'FINAL DATE', align: 'center' },
        { label: 'STATUS', align: 'center' },
        { label: 'ACTIONS', align: 'center' }
    ];

    if (applicants.length === 0) {
        return (
            <div className="bg-white border border-surface-200 rounded-sm py-20 text-center">
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-[0.2em]">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-surface-200 rounded-sm overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f9fafb] border-b border-surface-200">
                            {columns.map((col) => (
                                <th 
                                    key={col.label}
                                    className={cn(
                                        "px-6 py-4 text-[10px] font-semibold text-surface-450 uppercase tracking-widest border-r border-surface-200 last:border-0",
                                        col.align === 'center' ? "text-center" : "text-left"
                                    )}
                                    style={{ width: col.width }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {applicants.map((app) => (
                            <tr 
                                key={app.id}
                                onClick={() => onRowClick?.(app)}
                                className={cn(
                                    "group transition-colors",
                                    onRowClick ? "cursor-pointer hover:bg-surface-50" : "hover:bg-surface-50/50"
                                )}
                            >
                                {/* CANDIDATE */}
                                <td className="px-6 py-5 border-r border-surface-200">
                                    <div className="flex items-center gap-4">
                                        {app.pis?.photo_data_url ? (
                                            <img
                                                src={app.pis.photo_data_url}
                                                alt={app.applicant_name}
                                                className="w-10 h-10 object-cover border border-surface-200 rounded-sm shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-surface-100 border border-surface-200 flex items-center justify-center text-xs font-semibold text-surface-600 rounded-sm shrink-0">
                                                {app.applicant_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-surface-900 leading-tight truncate tracking-tight">
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
                                            </div>
                                            <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider mt-0.5">
                                                ID: {app.applicant_id || app.id.split('-')[0].toUpperCase()}
                                            </p>
                                            {app.current_status !== 'FINAL_INTERVIEW' && (app.assigned_ops_validator_name || app.metadata?.assigned_ops_validator_name) && (
                                                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                                                    Endorsed to: {toTitleCase(app.assigned_ops_validator_name || app.metadata?.assigned_ops_validator_name)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                {/* POSITION */}
                                <td className="px-6 py-5 border-r border-surface-200">
                                    <p className="text-xs font-semibold text-surface-800 tracking-tight leading-tight">
                                        {toTitleCase(app.position_title)}
                                    </p>
                                </td>

                                {/* ENDORSED DATE */}
                                <td className="px-6 py-5 border-r border-surface-200 text-center">
                                    <div className="flex flex-col items-center">
                                        <p className="text-[10px] font-semibold text-surface-700 leading-none">
                                            {formatSafeDate(app.endorsement_meeting_date || app.updated_at, 'date')}
                                        </p>
                                        <p className="text-[10px] font-normal text-surface-400 mt-0.5">
                                            {new Date(app.endorsement_meeting_date || app.updated_at).getFullYear()}
                                        </p>
                                    </div>
                                </td>

                                {/* SCHEDULE TIME / FINAL DATE */}
                                <td className="px-6 py-5 border-r border-surface-200 text-center">
                                    {viewMode === 'active' ? (
                                        <div className="flex flex-col items-center">
                                            <p className="text-[10px] font-semibold text-[#0078d4] leading-none">
                                                {formatSafeDate(app.endorsement_meeting_date, 'time')}
                                            </p>
                                            <p className="text-[9px] font-normal text-surface-400 mt-0.5">
                                                Phase Evaluation
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <p className="text-[10px] font-semibold text-surface-700 leading-none">
                                                {formatSafeDate(app.updated_at, 'date')}
                                            </p>
                                            <p className="text-[10px] font-normal text-surface-400 mt-0.5">
                                                {new Date(app.updated_at).getFullYear()}
                                            </p>
                                        </div>
                                    )}
                                </td>

                                {/* STATUS */}
                                <td className="px-6 py-5 border-r border-surface-200 text-center">
                                    <div className="flex justify-center">
                                        {(() => {
                                             const status = (app.final_verdict || app.current_status || 'PENDING').toUpperCase();
                                             const isHired = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(status);
                                             const isPassed = ['PASSED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'For Job Offer', 'FOR_PAN', 'CONTRACT_SENT'].map(s => s.toUpperCase()).includes(status);
                                             const isFailed = ['FAILED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN', 'WITHDRAWN BY APPLICANT', 'NOT_ELIGIBLE_FOR_REHIRE'].map(s => s.toUpperCase()).includes(status);
                                             const isFailedForActiveAccount = activeAccount && app.metadata?.failed_accounts?.some(
                                                 (f: string) => f.trim().toLowerCase() === activeAccount.trim().toLowerCase()
                                             );
                                             
                                             let displayStatus = 'PENDING';
                                             if (isHired) displayStatus = 'Hired';
                                             else if (isPassed) displayStatus = 'PASSED';
                                             else if (isFailed || isFailedForActiveAccount) displayStatus = 'FAILED';
 
                                             return <StatusBadge status={displayStatus as any} size="sm" schedulingStatus={app.recruiter_s_scheduling_status || app.metadata?.recruiter_s_scheduling_status} applicant={app} />;
                                        })()}
                                    </div>
                                </td>

                                {/* ACTIONS */}
                                <td className="px-6 py-5 text-center">
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
