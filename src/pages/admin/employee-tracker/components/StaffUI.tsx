import React from 'react';
import { ChevronRight, TrendingUp, ArrowUpRight } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { EmployeeStats } from '../hooks/useEmployeeTracker';
import type { UserRole } from '@/types';

export const SectionHeader = ({ title, count, icon: Icon }: any) => (
    <div className="flex items-center gap-3 mb-2 text-left">
        <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-none bg-[#f3f2f1] text-[#323130] dark:text-slate-300">
                <Icon size={15} />
            </div>
            <div>
                <h2 className="text-[15px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.01em] leading-none">{title}</h2>
                <p className="text-[11px] font-normal text-[#605e5c] dark:text-slate-400 mt-1">
                    <span className="font-semibold text-[#0078d4] tabular-nums">{count}</span> staff members
                </p>
            </div>
        </div>
        <div className="flex-1 h-px bg-[#edebe9] dark:bg-slate-800 ml-2" />
    </div>
);

export const StaffCard = ({ stat, onClick, getLabel }: { stat: EmployeeStats, onClick: () => void, getLabel?: (role: UserRole) => string }) => {
    const isOps = stat.user.role === 'ops_validator';

    const totalEndorsed = isOps ? stat.endorsed : stat.endorsedOver;
    const efficiencyRate = stat.interviewed > 0
        ? Math.round((totalEndorsed / stat.interviewed) * 100)
        : 0;

    const metrics = isOps
        ? [
            { label: 'Queue', value: stat.interviewed, color: 'text-[#323130] dark:text-slate-300' },
            { label: 'Passed', value: stat.endorsed, color: 'text-[#107c10]' },
            { label: 'Failed', value: stat.failed, color: 'text-[#d13438]' },
        ]
        : [
            { label: 'Screened', value: stat.interviewed, color: 'text-[#323130] dark:text-slate-300' },
            { label: 'Init. Pass', value: stat.endorsedOver, color: 'text-[#107c10]' },
            { label: 'End. Ops', value: stat.endorsedOps, color: 'text-[#0078d4]' },
            { label: 'Dropped', value: stat.failed, color: 'text-[#d13438]' },
            { label: 'No Show', value: stat.noShow, color: 'text-[#ca5010]' },
        ];

    return (
        <div
            onClick={onClick}
            className="group relative bg-white dark:bg-slate-900 border border-[#e1dfdd] hover:border-[#c8c6c4] dark:border-slate-700 rounded-none transition-all duration-200 cursor-pointer overflow-hidden text-left hover:shadow-md"
        >
            {/* Top accent line */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-[2px] transition-all duration-200",
                isOps ? "bg-[#0078d4]" : "bg-[#8764b8]",
                "opacity-0 group-hover:opacity-100"
            )} />

            <div className="p-4 pb-3">
                {/* Profile Header */}
                <div className="flex items-start gap-3 mb-4">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[11px] overflow-hidden shrink-0 border",
                        isOps
                            ? "bg-[#deecf9] border-[#c7dff7] text-[#0078d4]"
                            : "bg-[#e8daef] border-[#d7c4e2] text-[#8764b8]"
                    )}>
                        {stat.user.avatar_data ? (
                            <img src={stat.user.avatar_data} alt={stat.user.full_name} className="w-full h-full object-cover" />
                        ) : (
                            stat.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-[13px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.01em] leading-tight truncate group-hover:text-[#0078d4] transition-colors duration-200 capitalize">
                            {stat.user.full_name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={cn(
                                "text-[9px] font-semibold px-1.5 py-[1px] rounded-none uppercase tracking-wide",
                                isOps
                                    ? "text-[#0078d4] bg-[#deecf9]"
                                    : "text-[#8764b8] bg-[#e8daef]"
                            )}>
                                {getLabel ? getLabel(stat.user.role) : stat.user.role.replace(/_/g, ' ')}
                            </span>
                            {stat.user.sector && (
                                <span className="text-[9px] font-medium text-[#605e5c] dark:text-slate-400 bg-[#f3f2f1] px-1.5 py-[1px] rounded-none uppercase tracking-wide">
                                    {stat.user.sector}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className={cn(
                    "grid gap-0 bg-[#faf9f8] rounded-none border border-[#f3f2f1] overflow-hidden mb-3",
                    isOps ? "grid-cols-3" : "grid-cols-5"
                )}>
                    {metrics.map((m, i) => (
                        <div
                            key={i}
                            className={cn(
                                "text-center py-2.5 px-1",
                                i > 0 && "border-l border-[#f3f2f1]"
                            )}
                        >
                            <p className={cn("text-[15px] font-bold leading-none tabular-nums", m.color)}>
                                {m.value}
                            </p>
                            <p className="text-[9px] font-medium text-[#a19f9d] tracking-wide uppercase mt-1.5">
                                {m.label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Efficiency Bar */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                        <div className="w-full h-[3px] bg-[#edebe9] dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-700 ease-out",
                                    efficiencyRate >= 60 ? "bg-[#107c10]" :
                                        efficiencyRate >= 30 ? "bg-[#ca5010]" :
                                            efficiencyRate > 0 ? "bg-[#d13438]" : "bg-[#edebe9] dark:bg-slate-800"
                                )}
                                style={{ width: `${Math.min(efficiencyRate, 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <TrendingUp size={10} className={cn(
                            efficiencyRate >= 60 ? "text-[#107c10]" :
                                efficiencyRate >= 30 ? "text-[#ca5010]" : "text-[#a19f9d]"
                        )} />
                        <span className={cn(
                            "text-[11px] font-bold tabular-nums",
                            efficiencyRate >= 60 ? "text-[#107c10]" :
                                efficiencyRate >= 30 ? "text-[#ca5010]" : "text-[#a19f9d]"
                        )}>
                            {efficiencyRate}%
                        </span>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-2 border-t border-[#f3f2f1]">
                    <span className="text-[10px] font-medium text-[#a19f9d] tabular-nums">
                        {stat.totalHandled} total actions
                    </span>
                    <div className="flex items-center gap-1 text-[#0078d4] text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        View details
                        <ArrowUpRight size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StaffTable = ({ stats, onRowClick, isOps, getLabel }: { stats: EmployeeStats[], onRowClick: (s: EmployeeStats) => void, isOps?: boolean, getLabel?: (role: UserRole) => string }) => {
    const handleCopy = (e: React.ClipboardEvent) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const container = document.createElement('div');
        for (let i = 0; i < selection.rangeCount; i++) {
            container.appendChild(selection.getRangeAt(i).cloneContents());
        }

        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            (table as HTMLElement).style.borderCollapse = 'collapse';
            (table as HTMLElement).style.fontFamily = 'Calibri, sans-serif';
        });

        const cells = container.querySelectorAll('th, td');
        cells.forEach(cell => {
            (cell as HTMLElement).style.border = '1px solid #d4d4d4';
            (cell as HTMLElement).style.padding = '4px 8px';
        });

        const rows = container.querySelectorAll('tr');
        rows.forEach(row => {
            row.querySelectorAll('td, th').forEach(cell => {
                (cell as HTMLElement).style.border = '1px solid #d4d4d4';
                (cell as HTMLElement).style.padding = '4px 8px';
            });
        });

        let htmlData = container.innerHTML;
        if (!container.querySelector('table') && container.querySelector('tr, td, th')) {
            htmlData = `<table style="border-collapse: collapse; font-family: Calibri, sans-serif;">${htmlData}</table>`;
        }

        e.clipboardData.setData('text/html', htmlData);
        e.clipboardData.setData('text/plain', selection.toString());
        e.preventDefault();
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-none overflow-hidden mb-6 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" onCopy={handleCopy}>
                <thead>
                    <tr className="bg-[#faf9f8]">
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd]">Staff member</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd]">Sector</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd] text-center">{isOps ? 'Queue' : 'Screened'}</th>
                        {isOps ? (
                            <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd] text-center">Passed</th>
                        ) : (
                            <>
                                <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd] text-center">Init. Pass</th>
                                <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd] text-center">End. Ops</th>
                            </>
                        )}
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd] text-center">{isOps ? 'Failed' : 'Dropped'}</th>
                        {!isOps && (
                            <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd] text-center">No-Show</th>
                        )}
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd] text-center">Rate</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[0.02em] uppercase border-b border-[#e1dfdd] text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f2f1]">
                    {stats.map((stat) => {
                        const totalEndorsed = isOps ? stat.endorsed : stat.endorsedOver;
                        const efficiencyRate = stat.interviewed > 0
                            ? Math.round((totalEndorsed / stat.interviewed) * 100)
                            : 0;

                        return (
                            <tr
                                key={stat.user.id}
                                onClick={() => onRowClick(stat)}
                                className="hover:bg-[#f3f2f1]/50 transition-colors cursor-pointer group"
                            >
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 overflow-hidden border",
                                            isOps
                                                ? "bg-[#deecf9] border-[#c7dff7] text-[#0078d4]"
                                                : "bg-[#e8daef] border-[#d7c4e2] text-[#8764b8]"
                                        )}>
                                            {stat.user.avatar_data ? (
                                                <img src={stat.user.avatar_data} alt={stat.user.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                stat.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[12.5px] font-semibold text-[#323130] dark:text-slate-300 group-hover:text-[#0078d4] transition-colors duration-150 tracking-[-0.005em] capitalize">{stat.user.full_name}</p>
                                            <p className="text-[10px] font-medium text-[#a19f9d] tracking-wide uppercase mt-0.5">{getLabel ? getLabel(stat.user.role) : stat.user.role.replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 bg-[#faf9f8] text-[#605e5c] dark:text-slate-400 text-[10.5px] font-medium rounded-none border border-[#edebe9] dark:border-slate-800">
                                        {stat.user.sector}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-center text-[13px] font-bold text-[#323130] dark:text-slate-300 tabular-nums">
                                    {stat.interviewed}
                                </td>
                                {isOps ? (
                                    <td className="px-5 py-3 text-center text-[13px] font-bold text-[#107c10] tabular-nums">
                                        {stat.endorsed}
                                    </td>
                                ) : (
                                    <>
                                        <td className="px-5 py-3 text-center text-[13px] font-bold text-[#107c10] tabular-nums">
                                            {stat.endorsedOver}
                                        </td>
                                        <td className="px-5 py-3 text-center text-[13px] font-bold text-[#0078d4] tabular-nums">
                                            {stat.endorsedOps}
                                        </td>
                                    </>
                                )}
                                <td className="px-5 py-3 text-center text-[13px] font-bold text-[#d13438] tabular-nums">
                                    {stat.failed}
                                </td>
                                {!isOps && (
                                    <td className="px-5 py-3 text-center text-[13px] font-bold text-[#323130] dark:text-slate-300 tabular-nums">
                                        {stat.noShow}
                                    </td>
                                )}
                                <td className="px-5 py-3 text-center">
                                    <div className="inline-flex items-center gap-1">
                                        <div className="w-12 h-[3px] bg-[#edebe9] dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full",
                                                    efficiencyRate >= 60 ? "bg-[#107c10]" :
                                                        efficiencyRate >= 30 ? "bg-[#ca5010]" : "bg-[#d13438]"
                                                )}
                                                style={{ width: `${Math.min(efficiencyRate, 100)}%` }}
                                            />
                                        </div>
                                        <span className={cn(
                                            "text-[11px] font-bold tabular-nums ml-1",
                                            efficiencyRate >= 60 ? "text-[#107c10]" :
                                                efficiencyRate >= 30 ? "text-[#ca5010]" : "text-[#a19f9d]"
                                        )}>
                                            {efficiencyRate}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2 text-[#605e5c] dark:text-slate-400">
                                        <span className="text-[10px] font-semibold text-[#a19f9d] tabular-nums">
                                            {stat.totalHandled}
                                        </span>
                                        <ChevronRight size={12} className="text-[#c8c6c4] group-hover:text-[#0078d4] transition-all group-hover:translate-x-0.5 duration-150" />
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
};
