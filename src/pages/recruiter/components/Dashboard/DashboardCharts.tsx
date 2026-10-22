import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { BarChart2, Users, Trophy } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface DashboardChartsProps {
    statusData: Array<{ name: string; value: number }>;
    accountData: Array<{ name: string; count: number }>;
    topPassedAccountsData: Array<{ name: string; count: number; hired?: number; active?: number; failed?: number; passed?: number }>;
    topOpsValidatorsData?: Array<{ name: string; handled: number; passed: number; failed: number; passRate: number }>;
    isRecruiterS: boolean;
    filteredApplicationsLength: number;
}

const COLORS = ['#0f172a', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
    statusData,
    accountData,
    topPassedAccountsData,
    topOpsValidatorsData,
    isRecruiterS,
    filteredApplicationsLength
}) => {
    const getBarGradient = (name: string) => {
        const key = name.toUpperCase();
        if (key.includes('NVIDIA')) return 'from-emerald-500 to-lime-600';
        if (key.includes('AMD')) return 'from-red-600 to-rose-700';
        if (key.includes('MICROSOFT')) return 'from-sky-500 to-blue-600';
        if (key.includes('APPLE')) return 'from-slate-700 to-slate-900';
        if (key.includes('AMAZON')) return 'from-amber-500 to-orange-600';
        if (key.includes('GOOGLE')) return 'from-blue-500 to-indigo-600';
        if (key.includes('GENERAL')) return 'from-slate-700 to-slate-900';
        return 'from-violet-400 to-purple-600';
    };

    const getPassedBarGradient = (name: string) => {
        const key = name.toUpperCase();
        if (key.includes('NVIDIA')) return 'from-emerald-400 to-teal-500';
        if (key.includes('AMD')) return 'from-red-500 to-rose-600';
        if (key.includes('MICROSOFT')) return 'from-sky-400 to-blue-500';
        if (key.includes('APPLE')) return 'from-slate-600 to-slate-800';
        if (key.includes('AMAZON')) return 'from-amber-400 to-orange-500';
        if (key.includes('GOOGLE')) return 'from-blue-400 to-indigo-500';
        return 'from-emerald-400 to-teal-500';
    };

    const maxPassedCount = Math.max(...topPassedAccountsData.map(a => a.count), 1);

    return (
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
            {/* Status Chart */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-[11px] font-black text-surface-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <BarChart2 size={14} className="text-black" /> Pipeline Distribution
                    </h3>
                    <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ fontSize: '10px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 max-h-[120px] overflow-y-auto scrollbar-thin">
                    {statusData.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-[9px] font-bold text-surface-600 uppercase truncate">{s.name}</span>
                            <span className="text-[9px] font-black text-surface-900 ml-auto">{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Accounts / Auto Approve Analysis */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-[11px] font-black text-surface-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Users size={14} className="text-violet-500" /> {isRecruiterS ? 'Auto Approve Analysis' : 'Top Active Accounts'}
                    </h3>
                    <div className="space-y-4">
                        {accountData.length > 0 ? (
                            accountData.map((acc, i) => (
                                <div key={acc.name} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        <span className="truncate">{acc.name}</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white">{acc.count.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800/50/80 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(acc.count / (filteredApplicationsLength || 1)) * 100}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className={cn("h-full rounded-full bg-gradient-to-r", getBarGradient(acc.name))}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] text-slate-400 font-bold uppercase py-12 text-center">No active accounts</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top 5 Most Passed Accounts */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-[11px] font-black text-surface-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Trophy size={14} className="text-emerald-500" /> Top Passed Accounts
                    </h3>
                    <div className="space-y-4">
                        {topPassedAccountsData.length > 0 ? (
                            topPassedAccountsData.map((acc, i) => (
                                <div key={acc.name} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        <span className="truncate">{acc.name}</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white">{acc.count.toLocaleString()} passed</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800/50/80 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(acc.count / maxPassedCount) * 100}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className={cn("h-full rounded-full bg-gradient-to-r", getPassedBarGradient(acc.name))}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider opacity-70 mt-1">
                                        <span className="text-emerald-600">{(acc.hired || 0).toLocaleString()} Hires</span>
                                        <span className="text-blue-600">{(acc.active || 0).toLocaleString()} Active</span>
                                        <span className="text-red-500">{(acc.failed || 0).toLocaleString()} Failed</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] text-slate-400 font-bold uppercase py-12 text-center">No passed accounts in range</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Operations Validators */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-[11px] font-black text-surface-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Trophy size={14} className="text-blue-500" /> Top Ops Validators
                    </h3>
                    <div className="space-y-4">
                        {topOpsValidatorsData && topOpsValidatorsData.length > 0 ? (
                            topOpsValidatorsData.map((val, i) => (
                                <div key={val.name} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        <span className="truncate">{val.name}</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white">{val.passRate}% Pass Rate</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800/50/80 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${val.passRate}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-600"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider opacity-70 mt-1">
                                        <span className="text-slate-600">{val.handled.toLocaleString()} Handled</span>
                                        <span className="text-emerald-600">{val.passed.toLocaleString()} Passed</span>
                                        <span className="text-red-500">{val.failed.toLocaleString()} Failed</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] text-slate-400 font-bold uppercase py-12 text-center">No operations validators</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
