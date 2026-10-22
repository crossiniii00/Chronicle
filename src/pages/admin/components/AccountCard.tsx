import React from 'react';
import { motion } from 'framer-motion';
import {
    Edit2, Shield, Trash2, ArrowUpRight, Activity, Briefcase, Clock, Building2, Power
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Department } from '@/services/DepartmentService';

export interface AccountCardDept extends Department {
    hiredCount: number;
    quota: number;
    progress: number;
    hiringType?: 'Billed' | 'Non-Billed';
    quotaStart?: string | null;
    quotaEnd?: string | null;
    activeOpeningCount?: number;
}

interface AccountCardProps {
    dept: AccountCardDept;
    viewMode: 'grid' | 'list';
    onSelect: (dept: AccountCardDept) => void;
    onEdit: (dept: Department) => void;
    onDelete: (dept: Department) => void;
}

const getDaysRemainingLabel = (endDateStr?: string | null) => {
    if (!endDateStr) return null;
    const cleanDateStr = endDateStr.includes('T') ? endDateStr.split('T')[0] : endDateStr;
    const end = new Date(`${cleanDateStr}T23:59:59`);
    const today = new Date();

    const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    const diffMs = endUTC - todayUTC;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Ended';
    if (days === 0) return 'Last Day';
    return `${days} day${days === 1 ? '' : 's'} left`;
};

export function AccountCard({ dept, viewMode, onSelect, onEdit, onDelete }: AccountCardProps) {
    const { hiredCount, quota, progress, hiringType, quotaEnd, activeOpeningCount } = dept;
    const isClosing = quota > 0 && progress >= 100;
    const isActive = quota > 0 && progress < 100;
    const daysRemaining = getDaysRemainingLabel(quotaEnd);
    const isAlmostUp = daysRemaining && (
        daysRemaining === 'Last Day' ||
        (daysRemaining.includes('day') && parseInt(daysRemaining) <= 3)
    );
    const [imgError, setImgError] = React.useState(false);
    const resolvedUrl = dept.accountImageUrl 
        ? (dept.accountImageUrl.startsWith('/') ? `/api${dept.accountImageUrl}` : dept.accountImageUrl) 
        : null;
    const coverImage = !imgError && resolvedUrl ? resolvedUrl : dept.accountImageData;

    const statusBarColor = !isActive && !isClosing
        ? 'bg-surface-300 dark:bg-slate-700'
        : isClosing
            ? 'bg-emerald-500'
            : 'bg-primary-600';

    const statusPill = isClosing
        ? { label: 'FILLED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
        : isActive
            ? { label: hiringType?.toUpperCase() || 'ACTIVE', cls: 'bg-primary-50 text-primary-700 border-primary-100' }
            : { label: 'OPEN', cls: 'bg-surface-50 dark:bg-slate-800 text-surface-600 dark:text-slate-400 border-surface-200 dark:border-slate-700' };

    if (viewMode === 'list') {
        return (
            <div
                className={cn(
                    "group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-700 hover:border-primary-400 hover:shadow-xs transition-all duration-300 relative text-left rounded-none mb-3",
                    daysRemaining === 'Ended' ? "bg-red-50/5 border-red-200" :
                        isAlmostUp ? "bg-amber-50/5 border-amber-200" : ""
                )}
                onClick={() => onSelect(dept)}
            >
                {/* Active Indicator Bar */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-[4px] rounded-none-l-sm", statusBarColor)} />

                {/* Left Section: Cover Image & Title Details */}
                <div className="flex items-center gap-4 min-w-[280px]">
                    <div className="h-12 w-20 overflow-hidden relative bg-surface-50 dark:bg-slate-800 border border-surface-200 dark:border-slate-700 shrink-0 flex items-center justify-center rounded-none-xs">
                        {dept.accountImageUrl ? (
                            <img src={dept.accountImageUrl.startsWith('/') ? `/api${dept.accountImageUrl}` : dept.accountImageUrl} alt={dept.name} className="w-full h-full object-cover" />
                        ) : dept.accountImageData ? (
                            <img src={`data:image/jpeg;base64,${dept.accountImageData}`} alt={dept.name} className="w-full h-full object-cover" />
                        ) : (
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(dept.name)}&background=random`} alt={dept.name} className="w-full h-full object-cover" />
                        )}
                    </div>

                    <div className="flex flex-col gap-1 text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-surface-900 dark:text-white truncate text-left uppercase tracking-tight">{dept.name}</h3>
                            {daysRemaining && quota > 0 && (
                                <span className={cn(
                                    "px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border shadow-3xs flex items-center gap-0.5 rounded-none-xs shrink-0",
                                    daysRemaining === 'Ended' ? "bg-red-50 text-red-650 border-red-200" :
                                        daysRemaining === 'Last Day' || parseInt(daysRemaining) < 5 ? "bg-amber-50 text-amber-600 border-amber-200" :
                                            "bg-white dark:bg-slate-900 text-surface-600 dark:text-slate-400 border-surface-200 dark:border-slate-700"
                                )}>
                                    <Clock size={8} className="shrink-0" />
                                    {daysRemaining}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] text-surface-400 font-black uppercase tracking-[0.14em] text-left">
                            {activeOpeningCount && activeOpeningCount > 0 ? `${activeOpeningCount} Active ${activeOpeningCount === 1 ? 'Opening' : 'Openings'}` : 'No Active Openings'}
                        </span>
                    </div>
                </div>

                {/* Middle Section: Meta Info Badges */}
                <div className="grid grid-cols-2 lg:flex lg:items-center gap-x-6 gap-y-2.5 text-left shrink-0">
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-surface-50 dark:bg-slate-800 border border-surface-200 dark:border-slate-700 rounded-none-xs text-[10.5px] text-surface-700 dark:text-slate-300 font-semibold min-w-[130px]">
                        <Shield size={12} className="text-surface-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[7.5px] font-black uppercase text-surface-400 tracking-wider leading-none mb-0.5">Account Lead</p>
                            <p className="truncate leading-tight text-surface-900 dark:text-white">{dept.head || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-surface-50 dark:bg-slate-800 border border-surface-200 dark:border-slate-700 rounded-none-xs text-[10.5px] text-surface-700 dark:text-slate-300 font-semibold min-w-[120px]">
                        <Briefcase size={12} className="text-surface-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[7.5px] font-black uppercase text-surface-400 tracking-wider leading-none mb-0.5">Budget Code</p>
                            <p className="truncate leading-tight text-surface-900 dark:text-white">{dept.budgetCode || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-surface-50 dark:bg-slate-800 border border-surface-200 dark:border-slate-700 rounded-none-xs text-[10.5px] text-surface-700 dark:text-slate-300 font-semibold min-w-[110px]">
                        <Activity size={12} className="text-surface-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[7.5px] font-black uppercase text-surface-400 tracking-wider leading-none mb-0.5">Hiring Type</p>
                            <p className="truncate leading-tight text-surface-900 dark:text-white">{hiringType || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Right Section: Progress & Quota Tracker */}
                <div className="flex items-center gap-6 shrink-0 md:justify-end">
                    <div className="flex flex-col gap-1.5 min-w-[160px] text-left">
                        <div className="flex justify-between items-center text-[10.5px] font-black uppercase tracking-wider">
                            <span className="text-primary-700">{hiredCount} / {quota} Hired</span>
                            <span className={cn(progress >= 100 ? "text-emerald-600" : "text-surface-500")}>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-surface-100 dark:bg-slate-800/50 border border-surface-200 dark:border-slate-700 overflow-hidden rounded-full">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                className={cn(
                                    "h-full transition-all duration-500 rounded-full",
                                    progress >= 100 ? "bg-emerald-500" : "bg-primary-600"
                                )}
                            />
                        </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(dept); }} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-900 border border-surface-300 dark:border-slate-600 text-surface-600 dark:text-slate-400 hover:bg-surface-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-all rounded-none-xs" title="Edit account">
                            <Edit2 size={11} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(dept); }} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-900 border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all rounded-none-xs" title="Delete account">
                            <Trash2 size={11} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "transition-all hover:border-primary-300 group relative flex flex-col min-h-[230px] text-left overflow-hidden border",
                daysRemaining === 'Ended' ? "border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.08)] bg-red-50/5" :
                    isAlmostUp ? "border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.08)] bg-amber-50/5" :
                        "bg-white dark:bg-slate-900 border-surface-200 dark:border-slate-700"
            )}
            onClick={() => onSelect(dept)}
        >
            <div className={cn("h-1 w-full shrink-0", statusBarColor)} />

            {/* Cover Photo */}
            <div className="h-28 w-full overflow-hidden relative bg-white dark:bg-slate-900 border-b border-surface-150 dark:border-slate-800 shrink-0">
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={dept.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Building2 size={32} className="text-neutral-400" />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <span className={cn(
                        "px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border shadow-sm",
                        statusPill.cls
                    )}>
                        {statusPill.label}
                    </span>
                </div>
                {daysRemaining && quota > 0 && (
                    <div className="absolute top-2 left-2">
                        <span className={cn(
                            "px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border shadow-sm",
                            daysRemaining === 'Ended' ? "bg-red-50 text-red-600 border-red-100" :
                                daysRemaining === 'Last Day' || parseInt(daysRemaining) < 5 ? "bg-amber-50 text-amber-600 border-amber-100" :
                                    "bg-white/90 dark:bg-slate-900/90 text-surface-600 dark:text-slate-400 border-surface-200 dark:border-slate-700"
                        )}>
                            <Clock size={8} className="inline mr-0.5" />{daysRemaining}
                        </span>
                    </div>
                )}
            </div>

            {/* Title Block */}
            <div className="px-3 pt-2.5 pb-1 flex items-start justify-between gap-3 text-left shrink-0">
                <div className="min-w-0 text-left">
                    <h3 className="text-[13px] font-black text-surface-900 dark:text-white group-hover:text-primary-700 transition-colors truncate text-left uppercase tracking-tight">
                        {dept.name}
                    </h3>
                     <p className="text-[9px] text-surface-400 font-black uppercase tracking-[0.14em] text-left mt-0.5">
                        {activeOpeningCount && activeOpeningCount > 0 ? `${activeOpeningCount} Active ${activeOpeningCount === 1 ? 'Opening' : 'Openings'}` : 'No Active Openings'}
                     </p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-surface-500 uppercase tracking-widest shrink-0">
                    <Shield size={9} className="text-surface-400" />
                    <span className="truncate max-w-[100px]">{dept.head || 'No lead'}</span>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 px-3 text-left py-1">
                {quota > 0 ? (
                    <div className="space-y-1 text-left">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col text-left">
                                <span className="text-[8px] font-bold text-surface-400 uppercase tracking-widest leading-none mb-1">Number of openings</span>
                                <span className="text-[11px] font-black text-primary-700">{hiredCount} <span className="text-surface-400 font-medium text-[9px]">/ {quota} Target</span></span>
                            </div>
                            <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 border",
                                isClosing
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-primary-50 text-primary-700 border-primary-100"
                            )}>
                                {Math.round(progress)}%
                            </span>
                        </div>
                        <div className="w-full h-1 bg-surface-100 dark:bg-slate-800/50 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                className={cn(
                                    "h-full transition-all duration-700 ease-out",
                                    "bg-emerald-500"
                                )}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[36px] flex flex-col justify-center border border-dashed border-surface-200 dark:border-slate-700 p-2 bg-surface-50 dark:bg-slate-800/60 text-left">
                        <p className="text-[8px] font-black text-surface-500 uppercase tracking-widest text-left">
                            No Active Quota
                        </p>
                        <p className="text-[8px] font-medium text-surface-400 mt-0.5 text-left leading-tight">
                            Create a hiring quota to start tracking.
                        </p>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-2.5 pt-1 flex gap-1.5 text-left shrink-0 justify-center">
                <button onClick={(e) => { e.stopPropagation(); onSelect(dept); }} className="flex-1 h-6 px-2.5 bg-surface-900 dark:bg-white dark:bg-slate-900 text-white dark:text-slate-900 dark:text-white text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1.5 text-left border border-black">
                    <Activity size={9} /> Open dashboard
                </button>
                <button onClick={(e) => { e.stopPropagation(); onEdit(dept); }} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-900 border border-surface-300 dark:border-slate-600 text-surface-600 dark:text-slate-400 hover:bg-surface-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-all text-left" title="Edit account">
                    <Edit2 size={10} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(dept); }} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-900 border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all text-left" title="Delete account">
                    <Trash2 size={10} />
                </button>
            </div>

            {/* Corner Decorative Element */}
            <div className="absolute bottom-3 right-3 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none">
                <ArrowUpRight size={28} className="text-surface-900 dark:text-white" />
            </div>
        </div>
    );
}
