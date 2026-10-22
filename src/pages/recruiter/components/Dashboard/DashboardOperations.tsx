import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Monitor, GraduationCap, BarChart3, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface DashboardOperation {
    to: string;
    label: string;
    color: string;
    icon: any;
    desc: string;
    bg: string;
}

interface DashboardOperationsProps {
    operations?: DashboardOperation[];
}

export const DashboardOperations: React.FC<DashboardOperationsProps> = ({ operations: propOperations }) => {
    const defaultOperations = [
        { to: '/recruiter/tracker/interview-form', label: 'Interview Form', color: 'text-slate-900 dark:text-white', icon: FileText, desc: 'Candidate evaluations', bg: 'hover:border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800 dark:bg-slate-800/20' },
        { to: '/recruiter/interview/queue', label: 'Queue Console', color: 'text-violet-600', icon: Monitor, desc: 'Real-time lobby control', bg: 'hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/10 dark:hover:bg-violet-900/20' },
        { to: '/recruiter/tracker/masterlist', label: 'Masterlist', color: 'text-emerald-600', icon: GraduationCap, desc: 'Candidate database', bg: 'hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/20' },
        { to: '/recruiter/reports', label: 'Reports', color: 'text-amber-600', icon: BarChart3, desc: 'Performance & data', bg: 'hover:border-amber-200 dark:hover:border-amber-800 hover:bg-amber-50/10 dark:hover:bg-amber-900/20' },
    ];
    
    const operations = propOperations || defaultOperations;

    return (
        <div className="space-y-4">
            <h2 
                className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]"
                style={{ fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 }}
            >
                Quick Operations
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {operations.map(({ to, label, color, icon: Icon, desc, bg }) => (
                    <Link 
                        key={to} 
                        to={to} 
                        className={cn(
                            "flex items-center gap-4 p-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800/60 rounded-none transition-all group shadow-sm hover:shadow-premium duration-300 hover:scale-[1.01] active:scale-[0.99]", 
                            bg
                        )}
                    >
                        <div className="w-11 h-11 rounded-none flex items-center justify-center bg-slate-50 dark:bg-slate-800 group-hover:bg-white dark:bg-slate-900 transition-all duration-300 border border-slate-100 dark:border-slate-700 shadow-sm group-hover:scale-105">
                            <Icon size={18} className={color} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                {label}
                            </div>
                            <div className="text-[9px] font-semibold text-slate-400 truncate mt-0.5 uppercase tracking-widest">
                                {desc}
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-900 dark:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                ))}
            </div>
        </div>
    );
};
