import React from 'react';
import { ChevronRight, Building2, Users, Award, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { EmployeeStats } from '../hooks/useEmployeeTracker';

export const SectionHeader = ({ title, count, icon: Icon, colorClass }: any) => (
    <div className="flex items-center gap-3 mb-6 text-left">
        <div className={cn("p-2 rounded-sm border border-surface-200 bg-surface-50 text-surface-700", colorClass)}>
            <Icon size={16} />
        </div>
        <div>
            <h2 className="text-[15px] font-semibold text-surface-900 tracking-[-0.005em] leading-none">{title}</h2>
            <p className="text-[11.5px] font-normal text-surface-500 mt-1 tracking-[-0.005em]">
                Staff count: <span className="text-primary-600 font-semibold">{count}</span>
            </p>
        </div>
        <div className="flex-1 h-[1px] bg-surface-200/60 ml-4" />
    </div>
);

export const StaffCard = ({ stat, onClick }: { stat: EmployeeStats, onClick: () => void }) => {
    const isOps = stat.user.role === 'ops_validator';

    const efficiencyRate = stat.uniqueApplicants > 0
        ? Math.round((stat.endorsed / stat.uniqueApplicants) * 100)
        : 0;

    const avatarBg = isOps
        ? "bg-blue-50 text-blue-700 border border-blue-200/50"
        : "bg-indigo-50 text-indigo-700 border border-indigo-200/50";

    return (
        <div
            onClick={onClick}
            className="group relative bg-white border border-surface-200 hover:border-primary-500 hover:shadow-sm rounded-sm p-4 transition-all duration-200 cursor-pointer overflow-hidden text-left"
        >
            <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 transition-transform duration-200 overflow-hidden",
                    avatarBg
                )}>
                    {stat.user.avatar_data ? (
                        <img src={stat.user.avatar_data} alt={stat.user.full_name} className="w-full h-full object-cover" />
                    ) : (
                        stat.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-[13.5px] font-semibold text-surface-900 tracking-[-0.005em] leading-tight truncate group-hover:text-primary-650 transition-colors duration-150 capitalize">
                        {stat.user.full_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10.5px] font-medium text-surface-500 tracking-[-0.005em]">
                            {stat.user.role.replace('_', ' ')}
                        </span>
                        <span className="text-[10.5px] text-surface-300">•</span>
                        <span className="text-[10.5px] font-normal text-surface-400 tracking-[-0.005em]">
                            {stat.user.sector}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-surface-100 border-y border-surface-100 py-3 mb-4 relative z-10">
                <div className="text-center px-1">
                    <p className="text-[14px] font-semibold text-surface-900 leading-none tabular-nums">{stat.interviewed}</p>
                    <p className="text-[10px] font-medium text-surface-500 tracking-[-0.005em] mt-1">{isOps ? 'Pending' : 'Screened'}</p>
                </div>
                <div className="text-center px-1">
                    <p className="text-[14px] font-semibold text-emerald-600 leading-none tabular-nums">{stat.endorsed}</p>
                    <p className="text-[10px] font-medium text-surface-500 tracking-[-0.005em] mt-1">{isOps ? 'Passed' : 'Endorsed'}</p>
                </div>
                <div className="text-center px-1">
                    <p className="text-[14px] font-semibold text-rose-600 leading-none tabular-nums">{stat.failed}</p>
                    <p className="text-[10px] font-medium text-surface-500 tracking-[-0.005em] mt-1">{isOps ? 'Failed' : 'Dropped'}</p>
                </div>
            </div>

            {!isOps && efficiencyRate > 0 && (
                <div className="space-y-1 mb-4 relative z-10">
                    <div className="flex justify-between text-[10px] font-medium text-surface-500 tracking-[-0.005em]">
                        <span>Endorsement yield</span>
                        <span className="text-indigo-600 font-semibold tabular-nums">{efficiencyRate}%</span>
                    </div>
                    <div className="w-full h-1 bg-surface-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${efficiencyRate}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="pt-3 flex items-center justify-between text-xs font-medium relative z-10 border-t border-surface-50">
                <span className="inline-flex items-center gap-1 text-surface-500 text-[10px] tracking-[-0.005em]">
                    <Award size={10} className="text-surface-400" />
                    {stat.uniqueApplicants} screened
                </span>
                <div className="flex items-center gap-0.5 text-surface-400 group-hover:text-primary-600 transition-colors duration-150 text-[11px] font-medium">
                    Overview <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                </div>
            </div>
        </div>
    );
};

export const StaffTable = ({ stats, onRowClick, isOps }: { stats: EmployeeStats[], onRowClick: (s: EmployeeStats) => void, isOps?: boolean }) => (
    <div className="bg-white border border-surface-200 rounded-sm overflow-hidden shadow-sm mb-12">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-surface-50/50 border-b border-surface-200">
                        <th className="px-5 py-3.5 text-[11px] font-semibold text-surface-500 tracking-[-0.005em]">Staff member</th>
                        <th className="px-5 py-3.5 text-[11px] font-semibold text-surface-500 tracking-[-0.005em]">Sector / unit</th>
                        <th className="px-5 py-3.5 text-[11px] font-semibold text-surface-500 tracking-[-0.005em] text-center">{isOps ? 'Pending / queue' : 'Screened'}</th>
                        <th className="px-5 py-3.5 text-[11px] font-semibold text-emerald-600 tracking-[-0.005em] text-center">{isOps ? 'Passed' : 'Endorsed'}</th>
                        <th className="px-5 py-3.5 text-[11px] font-semibold text-rose-600 tracking-[-0.005em] text-center">{isOps ? 'Failed' : 'Dropped'}</th>
                        <th className="px-5 py-3.5 text-[11px] font-semibold text-surface-500 tracking-[-0.005em] text-center">Success rate</th>
                        <th className="px-5 py-3.5 text-[11px] font-semibold text-surface-500 tracking-[-0.005em] text-right">Activity log</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                    {stats.map((stat) => {
                        const efficiencyRate = stat.uniqueApplicants > 0
                            ? Math.round((stat.endorsed / stat.uniqueApplicants) * 100)
                            : 0;
                        const avatarBg = isOps
                            ? "bg-blue-50 text-blue-700"
                            : "bg-indigo-50 text-indigo-700";

                        return (
                            <tr
                                key={stat.user.id}
                                onClick={() => onRowClick(stat)}
                                className="hover:bg-surface-50/30 transition-colors cursor-pointer group"
                            >
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 overflow-hidden",
                                            avatarBg
                                        )}>
                                            {stat.user.avatar_data ? (
                                                <img src={stat.user.avatar_data} alt={stat.user.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                stat.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[12.5px] font-semibold text-surface-900 group-hover:text-primary-600 transition-colors duration-150 tracking-[-0.005em] capitalize">{stat.user.full_name}</p>
                                            <p className="text-[10px] font-medium text-surface-500 tracking-[-0.005em] mt-0.5">{stat.user.role.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-100 text-surface-700 text-[10.5px] font-medium tracking-[-0.005em] rounded-sm border border-surface-200/55">
                                        {stat.user.sector}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center text-[12.5px] font-semibold text-surface-900 tabular-nums">
                                    {stat.interviewed}
                                </td>
                                <td className="px-5 py-3.5 text-center text-[12.5px] font-semibold text-emerald-600 tabular-nums">
                                    {stat.endorsed}
                                </td>
                                <td className="px-5 py-3.5 text-center text-[12.5px] font-semibold text-rose-600 tabular-nums">
                                    {stat.failed}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50/60 text-indigo-700 text-[10px] font-medium tracking-[-0.005em] rounded-sm border border-indigo-100">
                                        <TrendingUp size={9} />
                                        {efficiencyRate}%
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-2 text-surface-400">
                                        <span className="inline-block px-2 py-0.5 bg-surface-50 text-surface-800 text-[10px] font-medium tracking-[-0.005em] rounded-sm border border-surface-200">
                                            {stat.totalHandled} ops
                                        </span>
                                        <ChevronRight size={12} className="group-hover:text-primary-600 transition-transform group-hover:translate-x-0.5 duration-150" />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
);
