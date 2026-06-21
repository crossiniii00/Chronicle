import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
    Loader2, CheckCircle2, Search, Activity, Clock,
    Users, Building2, Target, Sparkles, MapPin, X
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application } from '@/types';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';

// Modular sub-components
import { QuotaProgressBar } from './account-analysis/charts/QuotaProgressBar';
import { PassFailDonut } from './account-analysis/charts/PassFailDonut';
import { DemographicGroupCard } from './account-analysis/charts/DemographicGroupCard';
import { ActivityTrendChart } from './account-analysis/charts/ActivityTrendChart';
import { useAccountAnalysisData } from './account-analysis/useAccountAnalysisData';
import { type Range, RANGE_OPTIONS, type Insight } from './account-analysis/types';

// ── Reusable inline insight list ────────────────────────────────────────────
function InsightList({ title, insights }: { title: string; insights: Insight[] }) {
    if (insights.length === 0) return null;
    return (
        <div className="border-t border-[#edebe9] pt-4 mt-auto">
            <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#0078d4]" />
                {title}
            </h3>
            <ul className="space-y-2">
                {insights.map((insight, idx) => {
                    const isPositive = insight.type === 'positive';
                    const isWarning = insight.type === 'warning';
                    return (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                isPositive ? "bg-[#107c10]" : isWarning ? "bg-[#a4262c]" : "bg-[#0078d4]"
                            )} />
                            <span className="text-[#323130] leading-relaxed font-medium">
                                {insight.text}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function roleLabel(role: string) {
    const map: Record<string, string> = {
        recruiter_s: 'Lead Recruiter',
        recruiter_a: 'Senior Recruiter',
        recruiter_interviewer: 'Interviewer',
        recruiter_jc: 'Jr. Recruiter',
        recruiter_sy: 'Sr. Recruiter',
        ops_validator: 'Operations Validator',
        admin: 'Admin',
        super_admin: 'Super Admin',
        guest_interviewer: 'Operations Validator',
    };
    return map[role] ?? role.replace(/_/g, ' ');
}

const WorkloadDonut = React.memo(function WorkloadDonut({ stats }: { stats: any[] }) {
    const total = stats.reduce((acc, curr) => acc + curr.total, 0);
    const r = 35;
    const cx = 50;
    const cy = 50;
    const circ = 2 * Math.PI * r;
    
    const colors = ['#0078d4', '#107c10', '#ffb900', '#a4262c', '#8764b8', '#00b7c3', '#005a9e', '#004578', '#10b981', '#f59e0b'];
    
    let currentOffset = 0;
    return (
        <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f2f1" strokeWidth="12" />
                    {total > 0 ? (
                        stats.map((stat, idx) => {
                            const len = (stat.total / total) * circ;
                            const color = colors[idx % colors.length];
                            const offset = currentOffset;
                            currentOffset += len;
                            if (stat.total === 0) return null;
                            return (
                                <circle
                                    key={stat.member.id}
                                    cx={cx} cy={cy} r={r} fill="none"
                                    stroke={color} strokeWidth="12"
                                    strokeDasharray={`${len} ${circ}`}
                                    strokeDashoffset={-offset}
                                />
                            );
                        })
                    ) : (
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#edebe9" strokeWidth="12" />
                    )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-bold text-[#201f1e] tabular-nums">{total}</span>
                    <span className="text-[9px] font-bold text-[#605e5c] uppercase tracking-wider">Total Cases</span>
                </div>
            </div>
            <div className="flex-1 space-y-2.5 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
                {stats.map((stat, idx) => {
                    const share = total > 0 ? Math.round((stat.total / total) * 100) : 0;
                    const color = colors[idx % colors.length];
                    if (stat.total === 0) return null;
                    return (
                        <div key={stat.member.id} className="flex items-center justify-between text-xs border-b border-[#f3f2f1] pb-1.5 last:border-0 last:pb-0 animate-fade-in">
                            <div className="flex items-center gap-2 truncate">
                                {stat.member.avatar_data ? (
                                    <img 
                                        src={stat.member.avatar_data} 
                                        alt={stat.member.full_name} 
                                        className="w-5 h-5 rounded-full object-cover shrink-0 border-2" 
                                        style={{ borderColor: color }}
                                    />
                                ) : (
                                    <div 
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" 
                                        style={{ backgroundColor: color }}
                                    >
                                        {stat.member.full_name
                                            .split(' ')
                                            .map((p: any) => p[0])
                                            .filter(Boolean)
                                            .slice(0, 2)
                                            .join('')
                                            .toUpperCase() || '?'}
                                    </div>
                                )}
                                <span className="text-[#323130] font-medium truncate">{stat.member.full_name}</span>
                            </div>
                            <span className="font-semibold text-[#201f1e] shrink-0 tabular-nums">{stat.total} ({share}%)</span>
                        </div>
                    );
                })}
                {total === 0 && (
                    <div className="text-xs text-[#605e5c] font-medium py-4">No evaluations logged yet.</div>
                )}
            </div>
        </div>
    );
});

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════
export function AccountAnalysis() {
    const data = useAccountAnalysisData();

    // UI-local state
    const [drilldownSearch, setDrilldownSearch] = useState('');
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [addressView, setAddressView] = useState<'table' | 'bar' | 'pie'>('table');
    const [activeTab, setActiveTab] = useState<'candidate' | 'team'>('candidate');

    const teamInsights = useMemo(() => {
        const insights: Insight[] = [];
        if (data.teamStats.length === 0) return insights;

        // Workload leader
        const sortedByWorkload = [...data.teamStats].sort((a, b) => b.total - a.total);
        if (sortedByWorkload[0] && sortedByWorkload[0].total > 0) {
            insights.push({
                type: 'neutral',
                text: `${sortedByWorkload[0].member.full_name} is managing the highest workload with ${sortedByWorkload[0].total} total evaluations.`
            });
        }

        // Top pass rate (at least 2 resolved cases to be representative)
        const sortedByPassRate = [...data.teamStats]
            .filter(s => (s.passed + s.failed) >= 2)
            .sort((a, b) => b.passRate - a.passRate);
        if (sortedByPassRate[0] && sortedByPassRate[0].passRate > 0) {
            insights.push({
                type: 'positive',
                text: `${sortedByPassRate[0].member.full_name} has the highest candidate conversion rate at ${sortedByPassRate[0].passRate}% (min. 2 resolved cases).`
            });
        }

        // High pending backlog warning
        const highPending = data.teamStats.filter(s => s.pending > 3);
        if (highPending.length > 0) {
            insights.push({
                type: 'warning',
                text: `Backlog Alert: ${highPending.map(s => s.member.full_name).join(', ')} currently have more than 3 pending evaluations in their queues.`
            });
        } else {
            // General queue health
            const totalPending = data.teamStats.reduce((acc, curr) => acc + curr.pending, 0);
            if (totalPending === 0) {
                insights.push({
                    type: 'positive',
                    text: `Outstanding Queue Health: All pending evaluations have been successfully cleared by the team.`
                });
            } else {
                insights.push({
                    type: 'neutral',
                    text: `Active Backlog: The team has ${totalPending} pending candidate evaluations awaiting final review.`
                });
            }
        }

        return insights;
    }, [data.teamStats]);

    if (data.loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 bg-[#f3f2f1]">
                <Loader2 className="w-10 h-10 text-[#0078d4] animate-spin" />
                <p className="text-xs font-bold text-[#605e5c] uppercase tracking-widest">Synchronizing Metrics...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#323130] font-sans py-10 pb-20">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="bg-white border border-[#edebe9] rounded-sm shadow-sm mb-8 overflow-hidden shrink-0">
                    <div className="relative px-8 py-8 flex flex-col items-center gap-2 text-center">
                        <style>{`
                            @import url('https://fonts.googleapis.com/css2?family=Mulish:ital,wght@0,200..1000;1,200..1000&display=swap');
                            .font-mulish {
                                font-family: 'Mulish', sans-serif;
                            }
                        `}</style>
                        <h1
                            className="text-[32px] leading-none text-[#323130] tracking-[-0.02em]"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            Analytics Dashboard
                        </h1>
                        <p className="text-[12px] font-medium text-[#605e5c] tracking-[0.04em] uppercase font-mulish max-w-2xl leading-relaxed">
                            Operational throughput and candidate evaluation metrics for the <span className="font-bold text-[#0078d4]">{data.quotaAnalysis.accountName}</span> account.
                        </p>
                    </div>

                    {/* --- NAVIGATION TABS --- */}
                    <div className="flex justify-center gap-9 overflow-x-auto no-scrollbar px-8 border-t border-[#edebe9]">
                        <button
                            onClick={() => setActiveTab('candidate')}
                            className={cn(
                                "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                                activeTab === 'candidate' ? "text-[#323130]" : "text-surface-500 hover:text-surface-800"
                            )}
                        >
                            <span className={cn("transition-colors", activeTab === 'candidate' && "text-[#323130]")}>Candidate Analytics</span>
                            {activeTab === 'candidate' && (
                                <motion.span
                                    layoutId="analysis-tab-underline"
                                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#0078d4]"
                                    transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                                />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('team')}
                            className={cn(
                                "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                                activeTab === 'team' ? "text-[#323130]" : "text-surface-500 hover:text-surface-800"
                            )}
                        >
                            <span className={cn("transition-colors", activeTab === 'team' && "text-[#323130]")}>Team Analytics</span>
                            {activeTab === 'team' && (
                                <motion.span
                                    layoutId="analysis-tab-underline"
                                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#0078d4]"
                                    transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                                />
                            )}
                        </button>
                    </div>

                    {/* Filter and control panel */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 px-8 py-4 border-t border-[#edebe9] bg-[#faf9f8]">
                        {/* Department dropdown */}
                        {(!data.authUser?.department || data.authUser?.role === 'admin') && (
                            <div className="flex items-center gap-2.5 px-4 h-9 bg-white border border-[#edebe9] text-[10px] font-bold uppercase tracking-wider text-[#323130] rounded-md shadow-sm hover:bg-[#f3f2f1] hover:border-surface-300 transition-all relative cursor-pointer">
                                <Building2 size={13} className="text-[#605e5c]" />
                                <select
                                    value={data.selectedDept}
                                    onChange={(e) => data.setSelectedDept(e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                >
                                    <option value="ALL">All Accounts</option>
                                    {data.availableDepts.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <span>{data.selectedDept === 'ALL' ? 'All Accounts' : data.selectedDept}</span>
                                <span className="text-surface-400 text-[8px]">▼</span>
                            </div>
                        )}

                        {/* Hiring Quota History Filter */}
                        <div className="flex items-center gap-2.5 px-4 h-9 bg-white border border-[#edebe9] text-[10px] font-bold uppercase tracking-wider text-[#323130] rounded-md shadow-sm hover:bg-[#f3f2f1] hover:border-surface-300 transition-all relative cursor-pointer">
                            <Target size={13} className="text-[#605e5c]" />
                            <select
                                value={data.selectedQuotaId}
                                onChange={(e) => data.setSelectedQuotaId(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            >
                                <option value="ACTIVE">Active Quota</option>
                                {data.quotaHistory
                                    .filter(h => data.selectedDept === 'ALL' ? true : h.department.toUpperCase() === data.selectedDept)
                                    .map(h => {
                                        const dateStr = h.startDate && h.closedAt
                                            ? `${new Date(h.startDate).toLocaleDateString()} - ${new Date(h.closedAt).toLocaleDateString()}`
                                            : h.closedAt ? `Ended ${new Date(h.closedAt).toLocaleDateString()}` : `ID: ${h.id.slice(0, 8)}`;
                                        return (
                                            <option key={h.id} value={h.id}>
                                                {h.department} - Quota: {h.quota} ({dateStr})
                                            </option>
                                        );
                                    })}
                            </select>
                            <span>
                                {data.selectedQuotaId === 'ACTIVE'
                                    ? 'Active Quota'
                                    : (() => {
                                        const selectedItem = data.quotaHistory.find(h => h.id === data.selectedQuotaId);
                                        return selectedItem ? `${selectedItem.department} (Quota: ${selectedItem.quota})` : 'Quota History';
                                    })()
                                }
                            </span>
                            <span className="text-surface-400 text-[8px]">▼</span>
                        </div>

                        {/* Date range filter */}
                        <div className={cn(
                            "flex items-center gap-2.5 px-4 h-9 bg-white border border-[#edebe9] text-[10px] font-bold uppercase tracking-wider text-[#323130] rounded-md shadow-sm hover:bg-[#f3f2f1] hover:border-surface-300 transition-all relative cursor-pointer",
                            data.selectedQuotaId !== 'ACTIVE' && "opacity-60 cursor-not-allowed hover:bg-white"
                        )}>
                            <Clock size={13} className="text-[#605e5c]" />
                            <select
                                value={data.range}
                                onChange={(e) => data.setRange(e.target.value as Range)}
                                disabled={data.selectedQuotaId !== 'ACTIVE'}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                            >
                                {RANGE_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                            <span>{data.selectedQuotaId !== 'ACTIVE' ? 'Custom Range (Quota)' : RANGE_OPTIONS.find(o => o.id === data.range)?.label}</span>
                            <span className="text-surface-400 text-[8px]">▼</span>
                        </div>
                    </div>
                </div>

                {activeTab === 'candidate' ? (
                    <>
                        {/* KPI Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Card 1: Total Candidates */}
                    <div 
                        onClick={() => data.setDrilldown({ title: 'Total Candidates', stageKey: 'total', filter: 'ALL' })}
                        className="bg-white p-5 border border-[#edebe9] rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:border-[#0078d4] transition-all duration-200 cursor-pointer"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-[#0078d4]/10 text-[#0078d4] rounded-md transition-transform duration-200 group-hover:scale-105">
                                <Users size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#605e5c] tracking-wider">Total Candidates</span>
                                <div className="text-2xl font-bold text-[#323130] tabular-nums mt-0.5">{data.counts.total}</div>
                            </div>
                        </div>
                        <div className="w-1 h-9 rounded-full bg-[#0078d4] opacity-80" />
                    </div>

                    {/* Card 2: Concluded Pass Rate */}
                    <div 
                        onClick={() => data.setDrilldown({ title: 'Passed Final Interview Candidates', stageKey: 'final', filter: 'PASSED' })}
                        className="bg-white p-5 border border-[#edebe9] rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:border-[#107c10] transition-all duration-200 cursor-pointer"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-[#107c10]/10 text-[#107c10] rounded-md transition-transform duration-200 group-hover:scale-105">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#605e5c] tracking-wider">Concluded Pass Rate</span>
                                <div className="text-2xl font-bold text-[#323130] tabular-nums mt-0.5">
                                    {data.statusAnalysis.final.passed + data.statusAnalysis.final.failed > 0
                                        ? `${Math.round((data.statusAnalysis.final.passed / (data.statusAnalysis.final.passed + data.statusAnalysis.final.failed)) * 100)}%`
                                        : '0%'
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="w-1 h-9 rounded-full bg-[#107c10] opacity-80" />
                    </div>

                    {/* Card 3: Avg Time to Wait */}
                    <div 
                        onClick={() => data.setDrilldown({ title: 'Candidates Waiting in Screening (Applied)', stageKey: 'applied', filter: 'ALL' })}
                        className="bg-white p-5 border border-[#edebe9] rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:border-[#a4262c] transition-all duration-200 cursor-pointer"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-[#a4262c]/10 text-[#a4262c] rounded-md transition-transform duration-200 group-hover:scale-105">
                                <Clock size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#605e5c] tracking-wider">Avg. Applied Wait</span>
                                <div className="text-2xl font-bold text-[#323130] tabular-nums mt-0.5">
                                    {data.waitingTimes.applied > 0 ? `${(data.waitingTimes.applied).toFixed(1)}h` : '0.0h'}
                                </div>
                            </div>
                        </div>
                        <div className="w-1 h-9 rounded-full bg-[#a4262c] opacity-80" />
                    </div>

                    {/* Card 4: Active Pipeline */}
                    <div 
                        onClick={() => data.setDrilldown({ title: 'Active Pipeline Candidates', stageKey: 'pending', filter: 'PENDING' })}
                        className="bg-white p-5 border border-[#edebe9] rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:border-[#ffb900] transition-all duration-200 cursor-pointer"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-[#ffb900]/10 text-[#ffb900] rounded-md transition-transform duration-200 group-hover:scale-105">
                                <Activity size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#605e5c] tracking-wider">Active Pipeline</span>
                                <div className="text-2xl font-bold text-[#323130] tabular-nums mt-0.5">{data.counts.pending}</div>
                            </div>
                        </div>
                        <div className="w-1 h-9 rounded-full bg-[#ffb900] opacity-80" />
                    </div>
                </div>

                {/* Hiring Quota Status */}
                <div className="bg-white p-6 border border-surface-200 rounded-sm shadow-sm mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-bold text-surface-900">Hiring Quota Status</h2>
                            <p className="text-[11px] text-surface-500 mt-0.5">Hiring progress against account limits.</p>
                        </div>
                        <div className="px-2 py-0.5 bg-[#f3f2f1] border border-surface-200 rounded-sm text-[10px] font-bold uppercase tracking-wider text-[#0078d4]">
                            {data.quotaAnalysis.accountName}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                        <div 
                            onClick={() => data.setDrilldown({ title: `${data.quotaAnalysis.accountName} - Total Candidates (Target Quota)`, stageKey: 'total', filter: 'ALL' })}
                            className="bg-[#f3f2f1] hover:bg-[#edebe9] p-3 rounded-sm cursor-pointer transition-all border border-transparent hover:border-slate-300"
                        >
                            <span className="text-[10px] uppercase font-bold text-surface-500">Target Quota</span>
                            <div className="text-xl font-bold text-surface-900 mt-0.5">{data.quotaAnalysis.quota}</div>
                        </div>
                        <div 
                            onClick={() => data.setDrilldown({ title: `${data.quotaAnalysis.accountName} - Hires Filled`, stageKey: 'hired', filter: 'ALL' })}
                            className="bg-[#f3f2f1] hover:bg-[#edebe9] p-3 rounded-sm cursor-pointer transition-all border border-transparent hover:border-[#107c10]/30"
                        >
                            <span className="text-[10px] uppercase font-bold text-[#107c10]">Hires Filled</span>
                            <div className="text-xl font-bold text-[#107c10] mt-0.5">{data.quotaAnalysis.hired}</div>
                        </div>
                        <div 
                            onClick={() => data.setDrilldown({ title: `${data.quotaAnalysis.accountName} - Remaining Slots (Active Candidates)`, stageKey: 'remaining', filter: 'ALL' })}
                            className="bg-[#f3f2f1] hover:bg-[#edebe9] p-3 rounded-sm cursor-pointer transition-all border border-transparent hover:border-[#a4262c]/30"
                        >
                            <span className="text-[10px] uppercase font-bold text-[#a4262c]">Remaining Slots</span>
                            <div className="text-xl font-bold text-[#a4262c] mt-0.5">{data.quotaAnalysis.remaining}</div>
                        </div>
                    </div>

                    <QuotaProgressBar current={data.quotaAnalysis.hired} target={data.quotaAnalysis.quota} />
                </div>

                {/* Middle Section: Pass/Fail Rate & Pipeline Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Final Interview Candidate Results & Insights */}
                    <div className="bg-white p-6 border border-surface-200 rounded-sm shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="mb-4">
                                <h2 className="text-sm font-bold text-surface-900">Final Interview Candidate Results</h2>
                                <p className="text-[11px] text-surface-500 mt-0.5">Pass/fail statistics of candidates evaluated in the final interview stage.</p>
                            </div>
                            <div className="mb-6">
                                <PassFailDonut 
                                    passed={data.statusAnalysis.final.passed} 
                                    failed={data.statusAnalysis.final.failed} 
                                    pending={data.statusAnalysis.final.pending} 
                                    onSelect={(filter) => data.setDrilldown({ 
                                        title: `Final Interview: ${filter === 'ALL' ? 'Total Candidates' : filter.charAt(0) + filter.slice(1).toLowerCase()}`, 
                                        stageKey: 'final', 
                                        filter 
                                    })}
                                />
                            </div>
                        </div>
                        <InsightList title="Key Performance Insights" insights={data.finalInsights} />
                    </div>

                    {/* Candidate Application & Interview Activity Trend */}
                    <div className="bg-white p-6 border border-surface-200 rounded-sm shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-sm font-bold text-surface-900">Pipeline Activity & Interview Volume Trend</h2>
                                    <p className="text-[11px] text-surface-500 mt-0.5">Daily tracking of candidate endorsements and passed final interviews over time.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-[#0078d4]" />
                                        <span className="text-[#323130]">Candidates Endorsed</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-[#107c10]" />
                                        <span className="text-[#323130]">Passed Final Interviews</span>
                                    </div>
                                </div>
                            </div>
                            <ActivityTrendChart 
                                data={data.activityTrend} 
                                onSelectDot={(dateLabel, type) => data.setDrilldown({
                                    title: `${type === 'endorsed' ? 'Candidates Endorsed' : 'Passed Final Interviews'} on ${dateLabel}`,
                                    stageKey: type === 'endorsed' ? 'total' : 'final',
                                    filter: type === 'endorsed' ? 'ALL' : 'PASSED',
                                    dateLabel
                                })}
                            />
                        </div>
                        <InsightList title="Key Trend Insights" insights={data.trendInsights} />
                    </div>
                </div>

                {/* Pipeline Stage Pass/Fail Rates Section */}
                <div className="bg-white p-6 border border-surface-200 rounded-sm shadow-sm mb-6">
                    <div className="mb-6 text-left">
                        <h2 className="text-sm font-bold text-surface-900">Pipeline Stage Pass/Fail Rates</h2>
                        <p className="text-[11px] text-surface-500 mt-0.5">Performance statistics of evaluated candidates across key interview and test stages.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Typing Test */}
                        <div 
                            onClick={() => data.setDrilldown({ title: 'Typing Assessment Details', stageKey: 'typing', filter: 'ALL' })}
                            className="bg-[#f3f2f1]/20 border border-[#edebe9] p-5 rounded-sm flex flex-col justify-between text-left hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all duration-200"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider">Typing Assessment</h3>
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{data.statusAnalysis.typing.total} Takers</span>
                                </div>
                                <PassFailDonut 
                                    passed={data.statusAnalysis.typing.passed} 
                                    failed={data.statusAnalysis.typing.failed} 
                                    pending={data.statusAnalysis.typing.pending} 
                                    onSelect={(filter) => data.setDrilldown({ 
                                        title: `Typing Assessment: ${filter === 'ALL' ? 'Total Candidates' : filter.charAt(0) + filter.slice(1).toLowerCase()}`, 
                                        stageKey: 'typing', 
                                        filter 
                                    })}
                                />
                            </div>
                        </div>

                        {/* Technical Assessment */}
                        <div 
                            onClick={() => data.setDrilldown({ title: 'Technical Assessment Details', stageKey: 'assessment', filter: 'ALL' })}
                            className="bg-[#f3f2f1]/20 border border-[#edebe9] p-5 rounded-sm flex flex-col justify-between text-left hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all duration-200"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider">Technical Assessment</h3>
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{data.statusAnalysis.assessment.total} Takers</span>
                                </div>
                                <PassFailDonut 
                                    passed={data.statusAnalysis.assessment.passed} 
                                    failed={data.statusAnalysis.assessment.failed} 
                                    pending={data.statusAnalysis.assessment.pending} 
                                    onSelect={(filter) => data.setDrilldown({ 
                                        title: `Technical Assessment: ${filter === 'ALL' ? 'Total Candidates' : filter.charAt(0) + filter.slice(1).toLowerCase()}`, 
                                        stageKey: 'assessment', 
                                        filter 
                                    })}
                                />
                            </div>
                        </div>

                        {/* Initial Interview */}
                        <div 
                            onClick={() => data.setDrilldown({ title: 'Initial Interview Details', stageKey: 'initial', filter: 'ALL' })}
                            className="bg-[#f3f2f1]/20 border border-[#edebe9] p-5 rounded-sm flex flex-col justify-between text-left hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all duration-200"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider">Initial Interview</h3>
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{data.statusAnalysis.initial.total} Takers</span>
                                </div>
                                <PassFailDonut 
                                    passed={data.statusAnalysis.initial.passed} 
                                    failed={data.statusAnalysis.initial.failed} 
                                    pending={data.statusAnalysis.initial.pending} 
                                    onSelect={(filter) => data.setDrilldown({ 
                                        title: `Initial Interview: ${filter === 'ALL' ? 'Total Candidates' : filter.charAt(0) + filter.slice(1).toLowerCase()}`, 
                                        stageKey: 'initial', 
                                        filter 
                                    })}
                                />
                            </div>
                        </div>
                    </div>

                    <InsightList title="Key Funnel Insights" insights={data.stageInsights} />
                </div>

                {/* Geographic breakdown row */}
                <div className="grid grid-cols-1 gap-6 mt-6">
                    <DemographicGroupCard
                        title="Geographic location pass / fail rates"
                        icon={MapPin}
                        data={data.addressDemographics.slice(0, 4)}
                        viewMode={addressView}
                        setViewMode={setAddressView}
                        insights={data.addressInsights}
                    />
                </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        {/* Team Performance Overview Header & aggregated stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-[#edebe9] p-5 rounded-sm flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#605e5c] tracking-wider">Active Team Members</span>
                                    <div className="text-2xl font-bold text-[#323130] mt-0.5">{data.teamStats.length}</div>
                                </div>
                                <div className="p-3 bg-[#0078d4]/10 text-[#0078d4] rounded-sm">
                                    <Users size={20} />
                                </div>
                            </div>

                            <div className="bg-white border border-[#edebe9] p-5 rounded-sm flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#107c10] tracking-wider">Average Pass Rate</span>
                                    <div className="text-2xl font-bold text-[#107c10] mt-0.5 font-mulish">
                                        {data.teamStats.length > 0 
                                            ? `${Math.round(data.teamStats.reduce((acc, curr) => acc + curr.passRate, 0) / data.teamStats.length)}%`
                                            : '0%'
                                        }
                                    </div>
                                </div>
                                <div className="p-3 bg-[#107c10]/10 text-[#107c10] rounded-sm">
                                    <CheckCircle2 size={20} />
                                </div>
                            </div>

                            <div className="bg-white border border-[#edebe9] p-5 rounded-sm flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#a4262c] tracking-wider">Total Evaluated</span>
                                    <div className="text-2xl font-bold text-[#323130] mt-0.5 font-mulish">
                                        {data.teamStats.reduce((acc, curr) => acc + curr.total, 0)}
                                    </div>
                                </div>
                                <div className="p-3 bg-[#a4262c]/10 text-[#a4262c] rounded-sm">
                                    <Activity size={20} />
                                </div>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Card 1: Team Verdicts Breakdown */}
                            <div className="bg-white border border-[#edebe9] p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                <h3 className="text-xs font-bold text-[#323130] uppercase tracking-wider mb-5">Team Verdicts Breakdown</h3>
                                <div className="flex justify-center py-2">
                                    <PassFailDonut
                                        passed={data.teamStats.reduce((acc, curr) => acc + curr.passed, 0)}
                                        failed={data.teamStats.reduce((acc, curr) => acc + curr.failed, 0)}
                                        pending={data.teamStats.reduce((acc, curr) => acc + curr.pending, 0)}
                                    />
                                </div>
                            </div>

                            {/* Card 2: Validator Workload share */}
                            <div className="bg-white border border-[#edebe9] p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                <h3 className="text-xs font-bold text-[#323130] uppercase tracking-wider mb-5">Validator Workload Distribution</h3>
                                <WorkloadDonut stats={data.teamStats} />
                            </div>
                        </div>

                        {/* Team Insights Section */}
                        {teamInsights.length > 0 && (
                            <div className="bg-white border border-[#edebe9] p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                <InsightList title="Team Performance Insights" insights={teamInsights} />
                            </div>
                        )}

                        {/* Validators Table card */}
                        <div className="bg-white border border-[#edebe9] rounded-sm overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                            <div className="p-4 border-b border-[#edebe9] bg-[#faf9f8]">
                                <h2 className="text-xs font-bold text-[#323130] uppercase tracking-wider">Team Performance & Pass Rates</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#edebe9] bg-[#f8f9fa]">
                                            <th className="px-6 py-3 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Validator</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider text-center">Total Cases</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider text-center">Passed</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider text-center">Failed</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider text-center">Pending</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Pass Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#edebe9]">
                                        {data.teamStats.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-10 text-center text-xs text-[#605e5c] font-medium">
                                                    No validators found for the selected filter criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            data.teamStats.map((stat) => {
                                                const initials = stat.member.full_name
                                                    .split(' ')
                                                    .map(p => p[0])
                                                    .filter(Boolean)
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase();

                                                return (
                                                    <tr key={stat.member.id} className="hover:bg-[#f3f2f1]/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-[#0078d4]/10 text-[#0078d4] flex items-center justify-center text-xs font-bold shrink-0">
                                                                    {initials}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-[#323130]">{stat.member.full_name}</div>
                                                                    <div className="text-[10px] text-[#605e5c]">{stat.member.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-[10.5px] font-semibold text-[#605e5c] bg-[#f3f2f1] px-2 py-0.5 rounded-sm">
                                                                {roleLabel(stat.member.role)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-semibold text-[#323130] tabular-nums">
                                                            {stat.total}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-medium text-[#107c10] tabular-nums">
                                                            {stat.passed}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-medium text-[#a4262c] tabular-nums">
                                                            {stat.failed}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-medium text-[#ffb900] tabular-nums">
                                                            {stat.pending}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-24 bg-[#f3f2f1] h-2 rounded-full overflow-hidden shrink-0">
                                                                    <div 
                                                                        className="h-full bg-[#107c10]" 
                                                                        style={{ width: `${stat.passRate}%` }} 
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-bold text-[#323130] w-8 tabular-nums">
                                                                    {stat.passRate}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Drilldown Modal */}
            {data.drilldown && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-md shadow-xl border border-[#edebe9] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-[#f3f2f1] flex items-center justify-between bg-[#f8f9fa]">
                            <div>
                                <h3 className="text-sm font-bold text-[#323130] uppercase tracking-wider">
                                    {data.drilldown.title}
                                </h3>
                                <p className="text-[11px] text-[#605e5c] mt-0.5 font-medium">
                                    {data.drilldownCandidates.length} {data.drilldownCandidates.length === 1 ? 'candidate' : 'candidates'} found
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    data.setDrilldown(null);
                                    setDrilldownSearch('');
                                }}
                                className="p-1.5 hover:bg-[#f3f2f1] rounded-sm text-[#605e5c] hover:text-[#323130] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search and Action Bar */}
                        <div className="p-4 border-b border-[#f3f2f1] bg-[#f8f9fa]/50 flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-2.5 text-[#605e5c]" />
                                <input
                                    type="text"
                                    placeholder="Search candidate name, email, phone or status..."
                                    value={drilldownSearch}
                                    onChange={(e) => setDrilldownSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-[#edebe9] text-xs font-semibold rounded-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] bg-white transition-all placeholder-[#a19f9d]"
                                />
                            </div>
                        </div>

                        {/* Candidate List */}
                        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                            {(() => {
                                const searchLower = drilldownSearch.trim().toLowerCase();
                                const filtered = data.drilldownCandidates.filter(c => {
                                    if (!searchLower) return true;
                                    const fullName = (c.applicant_name || '').toLowerCase();
                                    const email = (c.applicant_email || '').toLowerCase();
                                    const phone = (c.pis?.phone || '').toLowerCase();
                                    const status = (c.current_status || '').toLowerCase();
                                    const stageOutcome = (c.stageOutcome || '').toLowerCase();
                                    return (
                                        fullName.includes(searchLower) ||
                                        email.includes(searchLower) ||
                                        phone.includes(searchLower) ||
                                        status.includes(searchLower) ||
                                        stageOutcome.includes(searchLower)
                                    );
                                });

                                if (filtered.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-16 text-center text-[#605e5c]">
                                            <Search size={28} className="text-[#a19f9d] mb-3" />
                                            <p className="text-xs font-bold uppercase tracking-wider">No matching candidates</p>
                                            <p className="text-[11px] mt-1">Try expanding your search query or choosing another list.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[#edebe9] text-[#605e5c] font-bold uppercase tracking-wider text-[10px]">
                                                    <th className="pb-3 pr-4 font-bold">Candidate Name</th>
                                                    <th className="pb-3 px-4 font-bold">Contact Details</th>
                                                    <th className="pb-3 px-4 font-bold text-center">Stage Status</th>
                                                    <th className="pb-3 px-4 font-bold text-center">Overall Status</th>
                                                    <th className="pb-3 pl-4 font-bold text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#f3f2f1]">
                                                {filtered.map(app => {
                                                    const name = app.applicant_name || '';
                                                    const outcome = app.stageOutcome || 'PENDING';
                                                    
                                                    let outcomeBadge = (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffb900]/10 text-[#8a6a00] border border-[#ffb900]/20">
                                                            Pending
                                                        </span>
                                                    );
                                                    if (outcome === 'PASSED') {
                                                        outcomeBadge = (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#107c10]/10 text-[#107c10] border border-[#107c10]/20">
                                                                Passed
                                                            </span>
                                                        );
                                                    } else if (outcome === 'FAILED') {
                                                        outcomeBadge = (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#a4262c]/10 text-[#a4262c] border border-[#a4262c]/20">
                                                                Failed
                                                            </span>
                                                        );
                                                    }

                                                    const displayStatus = (app.current_status || 'Applied')
                                                        .replace(/_/g, ' ')
                                                        .toLowerCase()
                                                        .replace(/\b\w/g, c => c.toUpperCase());

                                                    return (
                                                        <tr 
                                                            key={app.id} 
                                                            onClick={() => setSelectedApplicant(app)}
                                                            className="hover:bg-[#f3f2f1]/30 transition-colors cursor-pointer group"
                                                        >
                                                            <td className="py-3.5 pr-4">
                                                                <div className="font-bold text-[#323130] group-hover:text-[#0078d4] transition-colors">{name}</div>
                                                                <div className="text-[10px] text-[#605e5c] mt-0.5">{app.position_title || 'General Application'}</div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="text-[#323130] font-medium">{app.applicant_email || 'No Email'}</div>
                                                                <div className="text-[10px] text-[#605e5c] mt-0.5">{app.pis?.phone || 'No Phone'}</div>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                {outcomeBadge}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                <span className="text-[11px] font-semibold text-[#323130]">
                                                                    {displayStatus}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 pl-4 text-right">
                                                                <button 
                                                                    className="text-[10px] font-bold uppercase tracking-wider text-[#0078d4] hover:underline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedApplicant(app);
                                                                    }}
                                                                >
                                                                    View Profile
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Profile Viewer */}
            {selectedApplicant && (
                <FullscreenProfileView
                    open={true}
                    onClose={() => setSelectedApplicant(null)}
                    applicant={selectedApplicant}
                    pisOnly={false}
                    guestDeskMode={true}
                />
            )}
        </div>
    );
}
