import React, { useState } from 'react';
import { Ban } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Department } from '@/services/DepartmentService';
import type { CancelledClass } from '../../AccountManagement';

interface CancelledTabProps {
    selectedAccount: Department;
    cancelledClasses: CancelledClass[];
    getDurationLabel: (start?: string | null, end?: string | null) => string;
    toDateInputValue: (value?: string | null) => string;
    setPendingDeleteId: (id: string | null) => void;
    setDeleteConfirmOpen: (open: boolean) => void;
}

export const CancelledTab: React.FC<CancelledTabProps> = ({
    selectedAccount,
    cancelledClasses,
    getDurationLabel,
    toDateInputValue,
    setPendingDeleteId,
    setDeleteConfirmOpen
}) => {
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    const accountCancelled = cancelledClasses.filter(
        c => c.department.trim().toLowerCase() === selectedAccount.name.trim().toLowerCase()
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-100 shadow-sm overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 dark:bg-slate-800/30">
                <div>
                    <h3 className="text-[13px] font-bold text-slate-705 uppercase tracking-wider">Cancelled Campaigns</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Aborted recruitment seasons</p>
                </div>
                <div className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none text-center shadow-inner">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Cancelled</span>
                    <span className="block text-[15px] font-bold text-rose-600 leading-tight tabular-nums">
                        {accountCancelled.length}
                    </span>
                </div>
            </div>
            {accountCancelled.length > 0 ? (
                <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {accountCancelled.map((item, index, arr) => {
                        const duration = getDurationLabel(toDateInputValue(item.startDate), toDateInputValue(item.endDate));
                        const seasonLabel = item.startDate || item.endDate
                            ? `${item.startDate ? new Date(item.startDate).toLocaleDateString() : 'No start'} – ${item.endDate ? new Date(item.endDate).toLocaleDateString() : 'No end'}`
                            : 'No season dates recorded';
                        const isExpanded = expandedCardId === item.id;

                        if (!isExpanded) {
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setExpandedCardId(item.id)}
                                    className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-400 rounded-none cursor-pointer hover:shadow-xs transition-colors px-4 py-3 flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-6 h-6 bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center text-[10px] font-bold rounded-none shrink-0 shadow-inner">
                                            {arr.length - index}
                                        </span>
                                        <div className="min-w-0">
                                            <h4 className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300 truncate">{seasonLabel}</h4>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{duration}</p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex flex-col items-end shrink-0">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Planned Quota</span>
                                        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">{item.quota} slots</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[9.5px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">Cancelled</span>
                                        <span className="text-[11px] text-rose-600 font-bold hover:text-rose-700">Expand</span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={item.id} className="border border-rose-300 bg-rose-50/10 rounded-none p-4.5 flex flex-col space-y-4">
                                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-6 h-6 bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center text-[10px] font-bold rounded-none shrink-0 shadow-inner">
                                            {arr.length - index}
                                        </span>
                                        <div className="min-w-0">
                                            <h4 className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 truncate">{seasonLabel}</h4>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{duration}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-start shrink-0">
                                        <div className="text-right">
                                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Aborted</span>
                                            <span className="block text-[11px] font-bold text-slate-600 mt-1">{new Date(item.cancelledAt).toLocaleDateString()}</span>
                                        </div>
                                        <button
                                            onClick={() => setExpandedCardId(null)}
                                            className="text-[10px] text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 font-bold px-2 py-0.5 rounded-none transition-colors cursor-pointer"
                                        >
                                            Collapse
                                        </button>
                                        <button
                                            onClick={() => { setPendingDeleteId(item.id); setDeleteConfirmOpen(true); }}
                                            className="text-[10px] text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold px-2 py-0.5 rounded-none transition-colors cursor-pointer"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Planned quota', value: item.quota, color: 'text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border-slate-100' },
                                        { label: 'Hired at abort', value: item.hiredCount, color: 'text-emerald-700 bg-emerald-50/30 border-emerald-100' },
                                        { label: 'Total processed', value: item.totalApplicants, color: 'text-indigo-600 bg-indigo-50/30 border-indigo-100' },
                                        { label: 'Fallout at abort', value: item.failedCount, color: 'text-rose-700 bg-rose-50/30 border-rose-100' }
                                    ].map(stat => (
                                        <div key={stat.label} className={cn("border p-3 rounded-none shadow-xs", stat.color)}>
                                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1.5">{stat.label}</span>
                                            <span className="block text-[14px] font-bold mt-1 leading-none">{stat.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-16 text-center">
                    <Ban size={32} className="mx-auto text-slate-300 mb-2.5" />
                    <p className="text-[11px] font-bold text-slate-400">No cancelled classes yet</p>
                </div>
            )}
        </div>
    );
};
