import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { BarChart2, Users } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface DashboardChartsProps {
    statusData: Array<{ name: string; value: number }>;
    accountData: Array<{ name: string; count: number }>;
    isRecruiterS: boolean;
    filteredApplicationsLength: number;
}

const COLORS = ['#0f172a', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
    statusData,
    accountData,
    isRecruiterS,
    filteredApplicationsLength
}) => {
    const getBarGradient = (name: string) => {
        const key = name.toUpperCase();
        if (key.includes('GENERAL')) return 'from-slate-700 to-slate-900';
        if (key.includes('DOORDASH')) return 'from-orange-500 to-rose-500';
        if (key.includes('EXACT')) return 'from-emerald-400 to-teal-600';
        if (key.includes('ENERCARE')) return 'from-sky-400 to-indigo-600';
        return 'from-violet-400 to-purple-600';
    };

    return (
        <div className="grid md:grid-cols-2 gap-6">
            {/* Status Chart */}
            <div className="bg-white border border-surface-200 rounded-sm p-6 shadow-sm">
                <h3 className="text-[11px] font-black text-surface-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <BarChart2 size={14} className="text-black" /> Pipeline Distribution
                </h3>
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
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
                <div className="grid grid-cols-2 gap-2 mt-4">
                    {statusData.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-[9px] font-bold text-surface-600 uppercase truncate">{s.name}</span>
                            <span className="text-[9px] font-black text-surface-900 ml-auto">{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Accounts / Auto Approve Analysis */}
            <div className="bg-white border border-surface-200 rounded-sm p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-[11px] font-black text-surface-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Users size={14} className="text-violet-500" /> {isRecruiterS ? 'Auto Approve Analysis' : 'Top Active Accounts'}
                    </h3>
                    <div className="space-y-4">
                        {accountData.map((acc, i) => (
                            <div key={acc.name} className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                    <span className="truncate">{acc.name}</span>
                                    <span className="font-extrabold text-slate-900">{acc.count.toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-slate-100/80 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(acc.count / (filteredApplicationsLength || 1)) * 100}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className={cn("h-full rounded-full bg-gradient-to-r", getBarGradient(acc.name))}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
