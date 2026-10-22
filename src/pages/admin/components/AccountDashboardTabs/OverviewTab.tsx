import React from 'react';
import { motion } from 'framer-motion';
import { 
    Clock, BarChart3, Edit2, Lock, 
    TrendingUp, Target, UserCheck, Activity 
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Department } from '@/services/DepartmentService';
import type { AccountDashboardData, Opening } from '../AccountDashboardModal';

interface OverviewTabProps {
    accountDashboardData: AccountDashboardData;
    selectedAccount: Department;
    setSelectedHistoryDashboard: (val: any) => void;
    setEditingPositionId: (id: string | null) => void;
    setQuotaForm: (val: number) => void;
    setQuotaManualHired: (val: number) => void;
    setQuotaStartDate: (date: string) => void;
    setQuotaEndDate: (date: string) => void;
    setQuotaHiringType: (val: string) => void;
    setQuotaTrainingStartDate: (date: string) => void;
    setQuotaHiringQuotaId: (val: string) => void;
    setQuotaOpeningName: (val: string) => void;
    setQuotaCountry: (val: string) => void;
    setQuotaCity: (val: string) => void;
    setQuotaRequesterName: (val: string) => void;
    setQuotaRecruitmentProgress: (val: string) => void;
    setQuotaConcatenate: (val: string) => void;
    setQuotaModal: (open: boolean) => void;
    setCloseConfirm: (open: boolean) => void;
    setDeleteLobConfirm: (open: boolean) => void;
    toDateInputValue: (value?: string | null) => string;
    todayInputValue: () => string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
    accountDashboardData,
    selectedAccount,
    setSelectedHistoryDashboard,
    setEditingPositionId,
    setQuotaForm,
    setQuotaManualHired,
    setQuotaStartDate,
    setQuotaEndDate,
    setQuotaHiringType,
    setQuotaTrainingStartDate,
    setQuotaHiringQuotaId,
    setQuotaOpeningName,
    setQuotaCountry,
    setQuotaCity,
    setQuotaRequesterName,
    setQuotaRecruitmentProgress,
    setQuotaConcatenate,
    setQuotaModal,
    setCloseConfirm,
    setDeleteLobConfirm,
    toDateInputValue,
    todayInputValue,
}) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-left">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                        <div>
                            <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Line of Business</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Currently active Lines of Business and quotas</p>
                        </div>
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-none shadow-2xs">
                            {accountDashboardData.openings.length} Active
                        </span>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-800/10">
                        {accountDashboardData.openings.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {accountDashboardData.openings.map((opening) => {
                                    const pct = Math.round(opening.progress);
                                    return (
                                        <div key={opening.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 rounded-none p-5 hover:shadow-xs hover:border-slate-300 dark:border-slate-700 transition-all duration-200 flex flex-col justify-between gap-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1.5 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-[13px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate max-w-[280px]">
                                                            {opening.name}
                                                        </h4>
                                                        <span className={cn(
                                                            "px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider rounded-none border shrink-0",
                                                            opening.hiringType === 'Billed'
                                                                ? "bg-blue-50 text-blue-700 border-blue-150"
                                                                : "bg-amber-50 text-amber-700 border-amber-150"
                                                        )}>
                                                            {opening.hiringType}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-400">
                                                        <span className="bg-slate-50 dark:bg-slate-800 border border-slate-150 px-1.5 py-0.5 rounded-none">ID: {opening.hiringQuotaId || 'N/A'}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1"><Clock size={10} /> {opening.durationLabel}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="block text-[13px] font-black text-slate-700 dark:text-slate-300">{opening.hired} <span className="text-slate-400 font-medium text-[11px]">/ {opening.quota} Target</span></span>
                                                    <span className={cn(
                                                        "inline-block px-1.5 py-0.5 text-[9px] font-extrabold rounded-none border mt-1",
                                                        pct >= 100 ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-blue-50 text-blue-700 border-blue-150"
                                                    )}>
                                                        {pct}% Attained
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/50 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, opening.progress)}%` }}
                                                        className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-[#0078d4]")}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSelectedHistoryDashboard({
                                                                id: opening.id,
                                                                department: selectedAccount?.name || '',
                                                                quota: opening.quota,
                                                                hiredCount: opening.hired,
                                                                totalApplicants: opening.totalApplicants,
                                                                inPipeline: opening.inPipeline,
                                                                failedCount: opening.failedCount,
                                                                startDate: opening.quotaStart,
                                                                endDate: opening.quotaEnd,
                                                                hiringType: opening.hiringType,
                                                                manualHires: opening.manualHired,
                                                                trainingStartDate: opening.trainingStartDate,
                                                                hiringQuotaId: opening.hiringQuotaId,
                                                                openingName: opening.name,
                                                                country: opening.country,
                                                                city: opening.city,
                                                                notes: opening.notes,
                                                                requesterName: opening.requesterName,
                                                                recruitmentProgress: opening.recruitmentProgress,
                                                                concatenate: opening.concatenate,
                                                                closedAt: null as any
                                                            });
                                                        }}
                                                        className="flex items-center gap-1 h-7 px-3 bg-white dark:bg-slate-900 border border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-none cursor-pointer transition-all hover:border-slate-350 shadow-3xs"
                                                    >
                                                        <BarChart3 size={10} /> Dashboard
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingPositionId(opening.id);
                                                            setQuotaForm(opening.quota);
                                                            setQuotaManualHired(opening.manualHired);
                                                            setQuotaStartDate(opening.quotaStart ? toDateInputValue(opening.quotaStart) : '');
                                                            setQuotaEndDate(opening.quotaEnd ? toDateInputValue(opening.quotaEnd) : '');
                                                            setQuotaHiringType(opening.hiringType);
                                                            setQuotaTrainingStartDate(opening.trainingStartDate ? toDateInputValue(opening.trainingStartDate) : '');
                                                            setQuotaHiringQuotaId(opening.hiringQuotaId || '');
                                                            setQuotaOpeningName(opening.name);
                                                            setQuotaCountry(opening.country || '');
                                                            setQuotaCity(opening.city || '');
                                                            setQuotaRequesterName(opening.requesterName || '');
                                                            setQuotaRecruitmentProgress(opening.recruitmentProgress || '');
                                                            setQuotaConcatenate(opening.concatenate || '');
                                                            setQuotaModal(true);
                                                        }}
                                                        className="flex items-center gap-1 h-7 px-3 bg-white dark:bg-slate-900 border border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded-none cursor-pointer transition-all hover:border-slate-350 shadow-3xs"
                                                    >
                                                        <Edit2 size={10} /> Edit LOB
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingPositionId(opening.id);
                                                            setCloseConfirm(true);
                                                        }}
                                                        className="flex items-center gap-1 h-7 px-3 bg-white dark:bg-slate-900 border border-rose-250 hover:bg-rose-50 hover:text-rose-600 text-[10px] font-bold text-rose-500 rounded-none cursor-pointer transition-all hover:border-rose-350 shadow-3xs"
                                                    >
                                                        <Lock size={10} /> Conclude LOB Quota
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingPositionId(opening.id);
                                                            setDeleteLobConfirm(true);
                                                        }}
                                                        className="flex items-center gap-1 h-7 px-3 bg-white dark:bg-slate-900 border border-red-250 hover:bg-red-50 hover:text-red-700 text-[10px] font-bold text-red-600 rounded-none cursor-pointer transition-all hover:border-red-350 shadow-3xs"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-400 font-bold text-[11.5px] bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-none">
                                No active Lines of Business found. Click "+ Add LOB" to create one.
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col divide-y divide-slate-200 text-left">
                    <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/30">
                        <h3 className="text-[13px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Account Diagnostics</h3>
                    </div>

                    <div className="p-5 space-y-3.5">
                        {[
                            { label: 'Overall Progress', value: `${Math.round(accountDashboardData.progress)}%`, icon: TrendingUp, color: 'text-emerald-700 bg-emerald-50 border-emerald-150' },
                            { label: 'Total Active Quota', value: accountDashboardData.totalQuota, icon: Target, color: 'text-[#0078d4] bg-blue-50 border-blue-150' },
                            { label: 'Total Hired', value: accountDashboardData.totalHired, icon: UserCheck, color: 'text-indigo-700 bg-indigo-50 border-indigo-150' },
                            { label: 'Remaining Target', value: accountDashboardData.remaining, icon: Activity, color: 'text-amber-700 bg-amber-50 border-amber-150' }
                        ].map((m) => (
                            <div key={m.label} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/20 p-3 rounded-none border border-slate-200 dark:border-slate-800/80">
                                <div className="flex items-center gap-2.5">
                                    <div className={cn("w-6 h-6 rounded-none flex items-center justify-center border shadow-3xs", m.color)}>
                                        <m.icon size={11} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[11.5px] font-bold text-slate-600">{m.label}</span>
                                </div>
                                <span className="text-[13px] font-black text-slate-700 dark:text-slate-300">
                                    {m.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="p-5 bg-slate-50 dark:bg-slate-800/10 space-y-3">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Account Overview</span>
                        {[
                            { label: 'Manager', value: selectedAccount.head || 'Unassigned' },
                            { label: 'Budget code', value: selectedAccount.budgetCode || 'N/A' },
                            { label: 'Created', value: new Date(selectedAccount.created_at).toLocaleDateString() },
                            { label: 'Total candidates', value: accountDashboardData.totalApplicants.toString() }
                        ].map((row) => (
                            <div key={row.label} className="flex justify-between items-center text-[11.5px]">
                                <span className="text-slate-500 dark:text-slate-400 font-bold">{row.label}</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-300">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
