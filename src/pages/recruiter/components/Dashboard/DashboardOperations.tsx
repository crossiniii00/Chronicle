import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Monitor, GraduationCap, BarChart3, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/formatters';

export const DashboardOperations: React.FC = () => {
    const operations = [
        { to: '/recruiter/tracker/interview-form', label: 'Interview Form', color: 'text-slate-900', icon: FileText, desc: 'Candidate evaluations', bg: 'hover:border-slate-300 hover:bg-slate-50/20' },
        { to: '/recruiter/interview/queue', label: 'Queue Console', color: 'text-violet-600', icon: Monitor, desc: 'Real-time lobby control', bg: 'hover:border-violet-200 hover:bg-violet-50/10' },
        { to: '/recruiter/tracker/masterlist', label: 'Masterlist', color: 'text-emerald-600', icon: GraduationCap, desc: 'Candidate database', bg: 'hover:border-emerald-200 hover:bg-emerald-50/10' },
        { to: '/recruiter/reports', label: 'Reports', color: 'text-amber-600', icon: BarChart3, desc: 'Performance & data', bg: 'hover:border-amber-200 hover:bg-amber-50/10' },
    ];

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
                            "flex items-center gap-4 p-5 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl transition-all group shadow-sm hover:shadow-premium duration-300 hover:scale-[1.01] active:scale-[0.99]", 
                            bg
                        )}
                    >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-50 group-hover:bg-white transition-all duration-300 border border-slate-100 shadow-sm group-hover:scale-105">
                            <Icon size={18} className={color} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                                {label}
                            </div>
                            <div className="text-[9px] font-semibold text-slate-400 truncate mt-0.5 uppercase tracking-widest">
                                {desc}
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                ))}
            </div>
        </div>
    );
};
