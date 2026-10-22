import React from 'react';
import { motion } from 'framer-motion';
import { Plus, UserCheck, ArrowUpRight, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface DashboardMetricsProps {
    dateFilter: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';
    todayAppsLength: number;
    filteredApplicationsLength: number;
    passedInitialLength: number;
    endorsedAppsLength: number;
    passedOpsValidatorLength: number;
    externalCount?: number;
    internalCount?: number;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
    dateFilter,
    todayAppsLength,
    filteredApplicationsLength,
    passedInitialLength,
    endorsedAppsLength,
    passedOpsValidatorLength,
    externalCount,
    internalCount
}) => {
    const metrics = [
        { 
            label: dateFilter === 'TODAY' ? 'Applied Today' : 'Applied', 
            value: dateFilter === 'TODAY' ? todayAppsLength : filteredApplicationsLength, 
            icon: Plus, 
            color: 'text-slate-800 dark:text-slate-200', 
            bg: 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/50', 
            glow: 'hover:shadow-[0_0_25px_rgba(100,116,139,0.12)]',
            border: 'border-slate-200 dark:border-slate-800/60'
        },
        { 
            label: 'Passed Initial Interview', 
            value: passedInitialLength, 
            icon: UserCheck, 
            color: 'text-violet-600', 
            bg: 'bg-violet-50/50 dark:bg-violet-900/20 border border-violet-200/40 dark:border-violet-800/50', 
            glow: 'hover:shadow-[0_0_25px_rgba(139,92,246,0.12)]',
            border: 'border-violet-100 dark:border-violet-800'
        },
        { 
            label: 'Applicants Endorsed', 
            value: endorsedAppsLength, 
            icon: ArrowUpRight, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/40 dark:border-amber-800/50', 
            glow: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.12)]',
            border: 'border-amber-100 dark:border-amber-800'
        },
        { 
            label: 'Passed Ops Validator Interview', 
            value: passedOpsValidatorLength, 
            icon: ShieldCheck, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/40 dark:border-emerald-800/50', 
            glow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]',
            border: 'border-emerald-100 dark:border-emerald-800'
        },
        { 
            label: 'External / Internal', 
            value: `${externalCount ?? 0} / ${internalCount ?? 0}`, 
            icon: Users, 
            color: 'text-sky-600', 
            bg: 'bg-sky-50/50 dark:bg-sky-900/20 border border-sky-200/40 dark:border-sky-800/50', 
            glow: 'hover:shadow-[0_0_25px_rgba(2,132,199,0.12)]',
            border: 'border-sky-100 dark:border-sky-800'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {metrics.map(({ label, value, icon: Icon, color, bg, glow, border }) => (
                <motion.div 
                    key={label} 
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className={cn(
                        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-none shadow-sm border flex flex-col justify-between group transition-all duration-300 min-h-[150px] relative overflow-hidden",
                        border,
                        glow
                    )}
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
                        <div className={cn("p-2 rounded-none transition-all group-hover:scale-105", bg)}>
                            <Icon size={16} className={color} />
                        </div>
                    </div>
                    <div>
                        <p 
                            className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1.5"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600 }}
                        >
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </p>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active applicants</span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
