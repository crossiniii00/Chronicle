import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { DemographicRow, Insight } from '../types';

interface DemographicGroupCardProps {
    title: string;
    icon: any;
    data: DemographicRow[];
    viewMode: 'table' | 'bar' | 'pie';
    setViewMode: (val: 'table' | 'bar' | 'pie') => void;
    insights?: Insight[];
}

export const DemographicGroupCard = React.memo(function DemographicGroupCard({
    title,
    icon: Icon,
    data,
    viewMode,
    setViewMode,
    insights
}: DemographicGroupCardProps) {
    const colors = ['#0078d4', '#107c10', '#8b5cf6', '#f59e0b', '#a4262c', '#00b7c3', '#004b7f'];
    const totalAll = data.reduce((sum, item) => sum + item.total, 0) || 1;

    return (
        <div className="bg-white p-5 border border-surface-200 rounded-sm shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#f3f2f1] pb-3">
                <h3 className="text-xs font-bold text-[#323130] uppercase tracking-wider flex items-center gap-2">
                    <Icon size={16} className="text-[#0078d4]" />
                    {title}
                </h3>
                <div className="flex bg-[#f3f2f1] p-0.5 rounded-sm self-start sm:self-auto border border-[#edebe9]">
                    {(['table', 'bar', 'pie'] as const).map(mode => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setViewMode(mode)}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold rounded-sm uppercase tracking-wider transition-all",
                                viewMode === mode
                                    ? "bg-white text-[#0078d4] shadow-sm font-black"
                                    : "text-[#605e5c] hover:text-[#323130]"
                            )}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {viewMode === 'table' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#edebe9] text-[#605e5c] font-bold">
                                <th className="py-2.5 pr-4">Category</th>
                                <th className="py-2.5 px-4 text-center">Total</th>
                                <th className="py-2.5 px-4 text-center">Passed</th>
                                <th className="py-2.5 px-4 text-center">Failed</th>
                                <th className="py-2.5 pl-4 text-right">Pass Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f3f2f1]">
                            {data.map(item => (
                                <tr key={item.label} className="hover:bg-[#f3f2f1]/40 transition-colors">
                                    <td className="py-2.5 pr-4 font-semibold text-[#323130] truncate max-w-[150px]" title={item.label}>
                                        {item.label}
                                    </td>
                                    <td className="py-2.5 px-4 text-center text-[#323130] font-medium">{item.total}</td>
                                    <td className="py-2.5 px-4 text-center text-[#107c10] font-bold">{item.passed}</td>
                                    <td className="py-2.5 px-4 text-center text-[#a4262c] font-bold">{item.failed}</td>
                                    <td className="py-2.5 pl-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="font-bold text-[#323130]">{Math.round(item.passRate)}%</span>
                                            <div className="w-12 h-1.5 bg-[#f3f2f1] rounded-full overflow-hidden inline-block border border-[#edebe9]">
                                                <div 
                                                    className="h-full bg-[#107c10]" 
                                                    style={{ width: `${item.passRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {viewMode === 'bar' && (
                <div className="space-y-4 pt-1">
                    {data.map((item, idx) => (
                        <div key={item.label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#323130] truncate max-w-[200px]" title={item.label}>
                                    {item.label} <span className="text-[10px] font-normal text-[#605e5c]">({item.total} candidates)</span>
                                </span>
                                <span className="font-bold text-[#107c10]">{Math.round(item.passRate)}% pass rate</span>
                            </div>
                            <div className="h-4 bg-[#f3f2f1] border border-[#edebe9] rounded-sm overflow-hidden relative flex items-center">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.passRate}%` }}
                                    transition={{ duration: 0.8, delay: idx * 0.05 }}
                                    className="h-full bg-[#107c10]"
                                />
                                <span className="absolute left-2 text-[9px] font-bold text-white z-10 drop-shadow-sm">
                                    {item.passed} Passed / {item.failed} Failed
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'pie' && (
                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    <div className="relative w-28 h-28 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="38" fill="none" stroke="#f3f2f1" strokeWidth="12" />
                            {(() => {
                                const r = 38;
                                const circ = 2 * Math.PI * r;
                                let offset = 0;
                                return data.map((item, idx) => {
                                    const len = (item.total / totalAll) * circ;
                                    const res = (
                                        <circle
                                            key={item.label}
                                            cx="50" cy="50" r={r} fill="none"
                                            stroke={colors[idx % colors.length]} strokeWidth="12"
                                            strokeDasharray={`${len} ${circ}`}
                                            strokeDashoffset={-offset}
                                        />
                                    );
                                    offset += len;
                                    return res;
                                });
                              })()}
                        </svg>
                    </div>
                    <div className="flex-1 grid grid-cols-1 gap-x-4 gap-y-2.5 w-full">
                        {data.map((item, idx) => {
                            const pct = totalAll > 0 ? (item.total / totalAll) * 100 : 0;
                            return (
                                <div key={item.label} className="flex items-center justify-between text-xs border-b border-[#f3f2f1] pb-1.5 last:border-none">
                                    <div className="flex items-center gap-2 truncate max-w-[150px]">
                                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                                        <span className="text-[#323130] font-semibold truncate" title={item.label}>{item.label}</span>
                                    </div>
                                    <span className="font-bold text-[#323130] ml-2 shrink-0">{item.total} candidates <span className="text-surface-400 font-normal">({Math.round(pct)}%)</span></span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {insights && insights.length > 0 && (
                <div className="border-t border-[#edebe9] pt-4 mt-auto">
                    <h4 className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-[#0078d4]" />
                        Key Segment Insights
                    </h4>
                    <ul className="space-y-1.5">
                        {insights.map((insight, idx) => {
                            const isPositive = insight.type === 'positive';
                            const isWarning = insight.type === 'warning';
                            return (
                                <li key={idx} className="flex items-start gap-2 text-xs">
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                        isPositive ? "bg-[#107c10]" : isWarning ? "bg-[#a4262c]" : "bg-[#0078d4]"
                                    )} />
                                    <span className="text-[#323130] leading-normal font-medium">{insight.text}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
});
