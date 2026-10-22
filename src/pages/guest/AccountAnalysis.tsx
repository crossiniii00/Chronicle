import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Loader2, CheckCircle2, Search, Activity, Clock,
    Users, Building2, Target, Sparkles, MapPin, X, Layers, UserCheck
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
        <div className="border-t border-[#E1DFDD] pt-3 mt-4">
            <h3 className="text-[11px] font-bold text-[#605E5C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#0078D4]" />
                {title}
            </h3>
            <ul className="space-y-1.5">
                {insights.map((insight, idx) => {
                    const isPositive = insight.type === 'positive';
                    const isWarning = insight.type === 'warning';
                    return (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                isPositive ? "bg-[#107C41]" : isWarning ? "bg-[#D13438]" : "bg-[#0078D4]"
                            )} />
                            <span className="text-[#242424] leading-normal font-medium">
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
    
    const colors = ['#0078D4', '#107C41', '#F2C811', '#D13438', '#8764B8', '#00B7C3', '#005A9E', '#004578', '#10B981', '#F59E0B'];
    
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
                    <span className="text-xl font-bold text-[#242424] tabular-nums">{total}</span>
                    <span className="text-[9px] uppercase font-bold text-[#605E5C] tracking-wider">Evaluated</span>
                </div>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {stats.map((stat, idx) => {
                    const color = colors[idx % colors.length];
                    const pct = total > 0 ? Math.round((stat.total / total) * 100) : 0;
                    return (
                        <div key={stat.member.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="font-semibold text-[#242424] truncate">{stat.member.full_name}</span>
                            </div>
                            <span className="text-[#605E5C] font-bold text-[11px] tabular-nums ml-2">{stat.total} ({pct}%)</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export function AccountAnalysis({ defaultAccount }: { defaultAccount?: string }) {
    const data = useAccountAnalysisData(defaultAccount);
    const [activeTab, setActiveTab] = useState<'candidate' | 'team'>('candidate');
    const [addressView, setAddressView] = useState<'table' | 'bar' | 'pie'>('table');
    const [drilldownSearch, setDrilldownSearch] = useState('');
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);

    const teamInsights = useMemo(() => {
        const insights: Insight[] = [];
        if (!data.teamStats || data.teamStats.length === 0) return insights;

        const sortedByVolume = [...data.teamStats].sort((a, b) => b.total - a.total);
        const topEvaluator = sortedByVolume[0];
        if (topEvaluator && topEvaluator.total > 0) {
            insights.push({
                type: 'positive',
                text: `Top Volume: ${topEvaluator.member.full_name} has completed the highest number of evaluations (${topEvaluator.total} candidates).`
            });
        }

        const sortedByPassRate = [...data.teamStats].filter(s => s.total >= 3).sort((a, b) => b.passRate - a.passRate);
        if (sortedByPassRate.length > 0) {
            const highestPass = sortedByPassRate[0];
            const lowestPass = sortedByPassRate[sortedByPassRate.length - 1];
            if (highestPass.passRate - lowestPass.passRate >= 30) {
                insights.push({
                    type: 'warning',
                    text: `Pass Rate Variance: High variance detected across validators (${highestPass.passRate}% vs ${lowestPass.passRate}%). Alignment sync recommended.`
                });
            }
        }

        const totalPending = data.teamStats.reduce((acc, curr) => acc + curr.pending, 0);
        if (totalPending > 0) {
            insights.push({
                type: 'neutral',
                text: `Active Backlog: The team currently has ${totalPending} pending candidate evaluations awaiting final review.`
            });
        }

        return insights;
    }, [data.teamStats]);

    if (data.loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 bg-[#F3F2F1]">
                <Loader2 className="w-9 h-9 text-[#0078D4] animate-spin" />
                <p className="text-xs font-bold text-[#605E5C] uppercase tracking-widest">Synchronizing Account Metrics...</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#F3F2F1] text-[#242424] font-sans p-4 space-y-4">
            
            {/* --- TOP HEADER & CONTROLS TOOLBAR --- */}
            <div className="w-full bg-white dark:bg-slate-900 border border-[#D1D5DB] shadow-2xs rounded-none px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                
                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 bg-[#F3F2F1] p-1 border border-[#E1DFDD]">
                    <button
                        onClick={() => setActiveTab('candidate')}
                        className={cn(
                            "px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer",
                            activeTab === 'candidate' 
                                ? "bg-[#0078D4] text-white shadow-2xs" 
                                : "text-[#605E5C] hover:text-[#242424] bg-transparent"
                        )}
                    >
                        Candidate Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('team')}
                        className={cn(
                            "px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer",
                            activeTab === 'team' 
                                ? "bg-[#0078D4] text-white shadow-2xs" 
                                : "text-[#605E5C] hover:text-[#242424] bg-transparent"
                        )}
                    >
                        Team Analytics
                    </button>
                </div>

                {/* Filters & Control Panel */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Scope Toggle for Ops Validator */}
                    {data.authUser?.role === 'ops_validator' && (
                        <div className="flex bg-[#F3F2F1] p-0.5 border border-[#E1DFDD] shrink-0">
                            <button
                                onClick={() => data.setViewScope('MY')}
                                className={cn(
                                    "px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border-none cursor-pointer",
                                    data.viewScope === 'MY' ? "bg-[#0078D4] text-white shadow-2xs" : "text-[#605E5C] hover:text-[#242424] bg-transparent"
                                )}
                            >
                                My Candidates
                            </button>
                            <button
                                onClick={() => data.setViewScope('TEAM')}
                                className={cn(
                                    "px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border-none cursor-pointer",
                                    data.viewScope === 'TEAM' ? "bg-[#0078D4] text-white shadow-2xs" : "text-[#605E5C] hover:text-[#242424] bg-transparent"
                                )}
                            >
                                Team Candidates
                            </button>
                        </div>
                    )}

                    {/* Account / Department Dropdown Filter */}
                    <div className="flex items-center gap-2 px-3 h-8 bg-white dark:bg-slate-900 border border-[#D1D5DB] text-xs font-medium text-[#242424] hover:bg-[#F3F2F1] transition-all relative cursor-pointer">
                        <Building2 size={13} className="text-[#0078D4]" />
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
                        <span className="truncate max-w-[140px] font-bold text-[#242424]">{data.selectedDept === 'ALL' ? 'All Accounts' : data.selectedDept}</span>
                        <span className="text-[#605E5C] text-[9px]">▼</span>
                    </div>

                    {/* Operations Validator Dropdown Filter */}
                    <div className="flex items-center gap-2 px-3 h-8 bg-white dark:bg-slate-900 border border-[#D1D5DB] text-xs font-medium text-[#242424] hover:bg-[#F3F2F1] transition-all relative cursor-pointer">
                        <UserCheck size={13} className="text-[#107C41]" />
                        <select
                            value={data.selectedValidator}
                            onChange={(e) => data.setSelectedValidator(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        >
                            <option value="ALL">All Ops Validators</option>
                            {data.availableValidators.map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                        <span className="truncate max-w-[150px] font-bold text-[#107C41]">
                            {data.selectedValidator === 'ALL' ? 'All Ops Validators' : data.selectedValidator}
                        </span>
                        <span className="text-[#605E5C] text-[9px]">▼</span>
                    </div>

                    {/* LOB Dropdown */}
                    {data.availableLobs && data.availableLobs.length > 0 && (
                        <div className="flex items-center gap-2 px-3 h-8 bg-white dark:bg-slate-900 border border-[#D1D5DB] text-xs font-medium text-[#242424] hover:bg-[#F3F2F1] transition-all relative cursor-pointer">
                            <Layers size={13} className="text-[#605E5C]" />
                            <select
                                value={data.selectedLob}
                                onChange={(e) => data.setSelectedLob(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            >
                                <option value="ALL">All LOBs</option>
                                {data.availableLobs.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                            <span className="truncate max-w-[120px]">{data.selectedLob === 'ALL' ? 'All LOBs' : data.selectedLob}</span>
                            <span className="text-[#605E5C] text-[9px]">▼</span>
                        </div>
                    )}

                    {/* Hiring Quota History Filter */}
                    <div className="flex items-center gap-2 px-3 h-8 bg-white dark:bg-slate-900 border border-[#D1D5DB] text-xs font-medium text-[#242424] hover:bg-[#F3F2F1] transition-all relative cursor-pointer">
                        <Target size={13} className="text-[#605E5C]" />
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
                        <span className="truncate max-w-[150px]">
                            {data.selectedQuotaId === 'ACTIVE'
                                ? 'Active Quota'
                                : (() => {
                                    const selectedItem = data.quotaHistory.find(h => h.id === data.selectedQuotaId);
                                    return selectedItem ? `${selectedItem.department} (${selectedItem.quota})` : 'Quota History';
                                })()
                            }
                        </span>
                        <span className="text-[#605E5C] text-[9px]">▼</span>
                    </div>

                    {/* Date Range Filter */}
                    <div className={cn(
                        "flex items-center gap-2 px-3 h-8 bg-white dark:bg-slate-900 border border-[#D1D5DB] text-xs font-medium text-[#242424] hover:bg-[#F3F2F1] transition-all relative cursor-pointer",
                        data.selectedQuotaId !== 'ACTIVE' && "opacity-60 cursor-not-allowed hover:bg-white dark:bg-slate-900"
                    )}>
                        <Clock size={13} className="text-[#605E5C]" />
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
                        <span className="text-[#605E5C] text-[9px]">▼</span>
                    </div>
                </div>
            </div>

            {activeTab === 'candidate' ? (
                <>
                    {/* --- KPI CARDS ROW --- */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        
                        {/* Card 1: Total Candidates */}
                        <div 
                            onClick={() => data.setDrilldown({ title: 'Total Candidates', stageKey: 'total', filter: 'ALL' })}
                            className="bg-white dark:bg-slate-900 p-4 border border-[#D1D5DB] hover:border-[#0078D4] transition-all cursor-pointer shadow-2xs flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#EFF6FF] text-[#0078D4] shrink-0 border border-[#B4D6FA]">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#605E5C] tracking-wider block">Total Candidates</span>
                                    <div className="text-2xl font-bold text-[#242424] tabular-nums mt-0.5">{data.counts.total}</div>
                                </div>
                            </div>
                            <div className="w-1 h-8 bg-[#0078D4]" />
                        </div>

                        {/* Card 2: Concluded Pass Rate */}
                        <div 
                            onClick={() => data.setDrilldown({ title: 'Passed Final Interview Candidates', stageKey: 'final', filter: 'PASSED' })}
                            className="bg-white dark:bg-slate-900 p-4 border border-[#D1D5DB] hover:border-[#107C41] transition-all cursor-pointer shadow-2xs flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#DFF6DD] text-[#107C41] shrink-0 border border-[#A6E5A2]">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#605E5C] tracking-wider block">Concluded Pass Rate</span>
                                    <div className="text-2xl font-bold text-[#242424] tabular-nums mt-0.5">
                                        {data.statusAnalysis.final.passed + data.statusAnalysis.final.failed > 0
                                            ? `${Math.round((data.statusAnalysis.final.passed / (data.statusAnalysis.final.passed + data.statusAnalysis.final.failed)) * 100)}%`
                                            : '0%'
                                        }
                                    </div>
                                </div>
                            </div>
                            <div className="w-1 h-8 bg-[#107C41]" />
                        </div>

                        {/* Card 3: Avg Time to Wait */}
                        <div 
                            onClick={() => data.setDrilldown({ title: 'Candidates Waiting in Screening (Applied)', stageKey: 'applied', filter: 'ALL' })}
                            className="bg-white dark:bg-slate-900 p-4 border border-[#D1D5DB] hover:border-[#D13438] transition-all cursor-pointer shadow-2xs flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#FDE7E9] text-[#D13438] shrink-0 border border-[#F9B9BC]">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#605E5C] tracking-wider block">Avg. Applied Wait</span>
                                    <div className="text-2xl font-bold text-[#242424] tabular-nums mt-0.5">
                                        {data.waitingTimes.applied > 0 ? `${(data.waitingTimes.applied).toFixed(1)}h` : '0.0h'}
                                    </div>
                                </div>
                            </div>
                            <div className="w-1 h-8 bg-[#D13438]" />
                        </div>

                        {/* Card 4: Active Pipeline */}
                        <div 
                            onClick={() => data.setDrilldown({ title: 'Active Pipeline Candidates', stageKey: 'pending', filter: 'PENDING' })}
                            className="bg-white dark:bg-slate-900 p-4 border border-[#D1D5DB] hover:border-[#F2C811] transition-all cursor-pointer shadow-2xs flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#FFF8D6] text-[#D97706] shrink-0 border border-[#FDE047]">
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#605E5C] tracking-wider block">Active Pipeline</span>
                                    <div className="text-2xl font-bold text-[#242424] tabular-nums mt-0.5">{data.counts.pending}</div>
                                </div>
                            </div>
                            <div className="w-1 h-8 bg-[#F2C811]" />
                        </div>
                    </div>

                    {/* --- ROW 1: HIRING QUOTA & OPS VAL ANALYSIS --- */}
                    <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-4">
                        
                        {/* Hiring Quota Status */}
                        <div className="xl:col-span-5 bg-white dark:bg-slate-900 p-5 border border-[#D1D5DB] shadow-2xs space-y-4 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-[#E1DFDD] pb-3">
                                    <div>
                                        <h2 className="text-sm font-bold text-[#242424]">Hiring Quota Status</h2>
                                        <p className="text-[11px] text-[#605E5C] mt-0.5">Hiring progress against account limits.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-[#EFF6FF] border border-[#0078D4] text-[10px] font-bold text-[#0078D4] uppercase">
                                            {data.quotaAnalysis.accountName}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-1 text-[10px] font-bold uppercase border",
                                            data.quotaAnalysis.remaining === 0 
                                                ? "bg-[#DFF6DD] text-[#107C41] border-[#A6E5A2]" 
                                                : data.quotaAnalysis.hired > 0 
                                                    ? "bg-[#FFF8D6] text-[#D97706] border-[#FDE047]" 
                                                    : "bg-[#FDE7E9] text-[#D13438] border-[#F9B9BC]"
                                        )}>
                                            {data.quotaAnalysis.remaining === 0 ? 'Met' : data.quotaAnalysis.hired > 0 ? 'Active' : 'Unfilled'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div 
                                        onClick={() => data.setDrilldown({ title: `${data.quotaAnalysis.accountName} - Target Quota`, stageKey: 'total', filter: 'ALL' })}
                                        className="bg-[#F3F2F1] hover:bg-[#E1DFDD] p-3 border border-[#E1DFDD] cursor-pointer transition-all"
                                    >
                                        <span className="text-[10px] uppercase font-bold text-[#605E5C]">Target Quota</span>
                                        <div className="text-xl font-bold text-[#242424] mt-0.5">{data.quotaAnalysis.quota}</div>
                                    </div>
                                    <div 
                                        onClick={() => data.setDrilldown({ title: `${data.quotaAnalysis.accountName} - Hires Filled`, stageKey: 'hired', filter: 'ALL' })}
                                        className="bg-[#DFF6DD] hover:bg-[#C3F2C0] p-3 border border-[#A6E5A2] cursor-pointer transition-all"
                                    >
                                        <span className="text-[10px] uppercase font-bold text-[#107C41]">Hires Filled</span>
                                        <div className="text-xl font-bold text-[#107C41] mt-0.5">{data.quotaAnalysis.hired}</div>
                                    </div>
                                    <div 
                                        onClick={() => data.setDrilldown({ title: `${data.quotaAnalysis.accountName} - Remaining Slots`, stageKey: 'remaining', filter: 'ALL' })}
                                        className="bg-[#FDE7E9] hover:bg-[#FBC4C8] p-3 border border-[#F9B9BC] cursor-pointer transition-all"
                                    >
                                        <span className="text-[10px] uppercase font-bold text-[#D13438]">Remaining Slots</span>
                                        <div className="text-xl font-bold text-[#D13438] mt-0.5">{data.quotaAnalysis.remaining}</div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <QuotaProgressBar current={data.quotaAnalysis.hired} target={data.quotaAnalysis.quota} />
                                </div>
                            </div>

                            {/* Quota Insights & Highlights */}
                            <div className="bg-[#F8F9FA] border border-[#E1DFDD] p-3 space-y-2 text-xs">
                                <div className="flex items-center justify-between text-[#605E5C] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E1DFDD] pb-1.5">
                                    <span>Account Quota Summary</span>
                                    <span className="text-[#0078D4] font-bold">
                                        {data.quotaAnalysis.quota > 0 ? Math.round((data.quotaAnalysis.hired / data.quotaAnalysis.quota) * 100) : 0}% Target Met
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex flex-col">
                                        <span className="text-[#605E5C] text-[10px] uppercase">Active Target</span>
                                        <span className="font-bold text-[#242424]">{data.quotaAnalysis.accountName}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[#605E5C] text-[10px] uppercase">Slot Capacity</span>
                                        <span className="font-bold text-[#242424]">{data.quotaAnalysis.remaining} Open Slots</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Operations Validation (Ops Val) Pass Rate Analysis */}
                        <div className="xl:col-span-7 bg-white dark:bg-slate-900 p-5 border border-[#D1D5DB] shadow-2xs flex flex-col justify-between space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1DFDD] pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-bold text-[#242424]">Ops Val Pass Rate Analysis</h2>
                                        <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#0078D4] text-[10px] font-bold uppercase border border-[#B4D6FA]">Ops Val Dedicated</span>
                                    </div>
                                    <p className="text-[11px] text-[#605E5C] mt-0.5">Evaluation metrics and per-validator performance tracking.</p>
                                </div>
                                <div className="bg-[#DFF6DD] border border-[#A6E5A2] px-3.5 py-1.5 text-right shrink-0">
                                    <span className="text-[9.5px] font-bold uppercase text-[#107C41] tracking-wider block">Pass Rate</span>
                                    <span className="text-lg font-bold text-[#107C41]">{data.opsValAnalysis?.passRate || 0}%</span>
                                </div>
                            </div>

                            {/* Summary KPI Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                <div className="p-2.5 bg-[#F3F2F1] border border-[#E1DFDD]">
                                    <span className="text-[9.5px] uppercase font-bold text-[#605E5C] block">Total</span>
                                    <span className="text-base font-bold text-[#242424] mt-0.5 block">{data.opsValAnalysis?.totalEvaluated || 0}</span>
                                </div>
                                <div className="p-2.5 bg-[#DFF6DD] border border-[#A6E5A2]">
                                    <span className="text-[9.5px] uppercase font-bold text-[#107C41] block">Passed</span>
                                    <span className="text-base font-bold text-[#107C41] mt-0.5 block">{data.opsValAnalysis?.passed || 0}</span>
                                </div>
                                <div className="p-2.5 bg-[#FDE7E9] border border-[#F9B9BC]">
                                    <span className="text-[9.5px] uppercase font-bold text-[#D13438] block">Failed</span>
                                    <span className="text-base font-bold text-[#D13438] mt-0.5 block">{data.opsValAnalysis?.failed || 0}</span>
                                </div>
                                <div className="p-2.5 bg-[#FFF8D6] border border-[#FDE047]">
                                    <span className="text-[9.5px] uppercase font-bold text-[#D97706] block">Pending</span>
                                    <span className="text-base font-bold text-[#D97706] mt-0.5 block">{data.opsValAnalysis?.pending || 0}</span>
                                </div>
                                <div className="p-2.5 bg-[#F3F2F1] border border-[#D1D5DB]">
                                    <span className="text-[9.5px] uppercase font-bold text-[#605E5C] block">No Show</span>
                                    <span className="text-base font-bold text-[#605E5C] mt-0.5 block">{data.opsValAnalysis?.noShow || 0}</span>
                                </div>
                            </div>

                            {/* Per Validator Breakdown */}
                            {data.opsValAnalysis?.validatorBreakdown && data.opsValAnalysis.validatorBreakdown.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-[#242424] uppercase tracking-wider">Validator Performance Breakdown</h3>
                                    <div className="max-h-52 overflow-y-auto custom-scrollbar border border-[#E1DFDD]">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-[#F3F2F1] text-[#605E5C] uppercase font-bold text-[10px] tracking-wider border-b border-[#E1DFDD] sticky top-0 z-10">
                                                <tr>
                                                    <th className="py-2 px-3">Validator Name</th>
                                                    <th className="py-2 px-3 text-center">Evaluated</th>
                                                    <th className="py-2 px-3 text-center">Passed</th>
                                                    <th className="py-2 px-3 text-center">Failed</th>
                                                    <th className="py-2 px-3 text-center">Pending</th>
                                                    <th className="py-2 px-3 text-center">No Show</th>
                                                    <th className="py-2 px-3 text-right">Pass Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#F3F2F1] font-medium bg-white dark:bg-slate-900">
                                                {data.opsValAnalysis.validatorBreakdown.map((val: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-[#EFF6FF] transition-colors">
                                                        <td className="py-2 px-3 text-[#242424] font-bold">{val.name}</td>
                                                        <td className="py-2 px-3 text-center text-[#242424] tabular-nums">{val.totalEvaluated}</td>
                                                        <td className="py-2 px-3 text-center text-[#107C41] font-bold tabular-nums">{val.passed}</td>
                                                        <td className="py-2 px-3 text-center text-[#D13438] tabular-nums">{val.failed}</td>
                                                        <td className="py-2 px-3 text-center text-[#D97706] tabular-nums">{val.pending}</td>
                                                        <td className="py-2 px-3 text-center text-[#605E5C] tabular-nums">{val.noShow}</td>
                                                        <td className="py-2 px-3 text-right font-bold tabular-nums">
                                                            <span className={`px-2 py-0.5 text-[10px] ${val.passRate >= 70 ? 'bg-[#DFF6DD] text-[#107C41]' : val.passRate >= 50 ? 'bg-[#FFF8D6] text-[#D97706]' : 'bg-[#FDE7E9] text-[#D13438]'}`}>
                                                                {val.passRate}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- ROW 2: FINAL RESULTS & TREND --- */}
                    <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-4">
                        
                        {/* Final Interview Candidate Results */}
                        <div className="xl:col-span-5 bg-white dark:bg-slate-900 p-5 border border-[#D1D5DB] shadow-2xs flex flex-col justify-between space-y-4">
                            <div>
                                <div className="border-b border-[#E1DFDD] pb-3 mb-3">
                                    <h2 className="text-sm font-bold text-[#242424]">Final Interview Candidate Results</h2>
                                    <p className="text-[11px] text-[#605E5C] mt-0.5">Pass/fail distribution for candidates evaluated in the final interview stage.</p>
                                </div>
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
                            <InsightList title="Key Performance Insights" insights={data.finalInsights} />
                        </div>

                        {/* Pipeline Activity & Interview Volume Trend */}
                        <div className="xl:col-span-7 bg-white dark:bg-slate-900 p-5 border border-[#D1D5DB] shadow-2xs flex flex-col justify-between space-y-4">
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1DFDD] pb-3 mb-3">
                                    <div>
                                        <h2 className="text-sm font-bold text-[#242424]">Pipeline Activity & Volume Trend</h2>
                                        <p className="text-[11px] text-[#605E5C] mt-0.5">Daily candidate endorsements vs passed final interviews.</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 bg-[#0078D4]" />
                                            <span className="text-[#242424]">Endorsed</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 bg-[#107C41]" />
                                            <span className="text-[#242424]">Passed Final</span>
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

                    {/* --- ROW 3: PIPELINE STAGE PASS/FAIL & GEOGRAPHICAL DEMOGRAPHICS --- */}
                    <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-4">
                        
                        {/* Pipeline Stage Pass/Fail Rates */}
                        <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-5 border border-[#D1D5DB] shadow-2xs space-y-4">
                            <div className="border-b border-[#E1DFDD] pb-3">
                                <h2 className="text-sm font-bold text-[#242424]">Pipeline Stage Pass/Fail Rates</h2>
                                <p className="text-[11px] text-[#605E5C] mt-0.5">Evaluation performance across typing test, technical assessment, and initial interview.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Typing Test */}
                                <div 
                                    onClick={() => data.setDrilldown({ title: 'Typing Assessment Details', stageKey: 'typing', filter: 'ALL' })}
                                    className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 flex flex-col justify-between hover:border-[#0078D4] transition-all cursor-pointer"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-[#242424] uppercase tracking-wider">Typing Assessment</h3>
                                            <span className="text-[10px] font-bold text-[#605E5C]">{data.statusAnalysis.typing.total} Takers</span>
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
                                    className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 flex flex-col justify-between hover:border-[#0078D4] transition-all cursor-pointer"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-[#242424] uppercase tracking-wider">Technical Assessment</h3>
                                            <span className="text-[10px] font-bold text-[#605E5C]">{data.statusAnalysis.assessment.total} Takers</span>
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
                                    className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 flex flex-col justify-between hover:border-[#0078D4] transition-all cursor-pointer"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-[#242424] uppercase tracking-wider">Initial Interview</h3>
                                            <span className="text-[10px] font-bold text-[#605E5C]">{data.statusAnalysis.initial.total} Takers</span>
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

                        {/* Geographic Breakdown */}
                        <div className="xl:col-span-4 bg-white dark:bg-slate-900 p-5 border border-[#D1D5DB] shadow-2xs">
                            <DemographicGroupCard
                                title="Geographic Pass/Fail Rates"
                                icon={MapPin}
                                data={data.addressDemographics.slice(0, 4)}
                                viewMode={addressView}
                                setViewMode={setAddressView}
                                insights={data.addressInsights}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    {/* Team Performance Overview Header & aggregated stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-900 border border-[#D1D5DB] p-4 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#605E5C] tracking-wider">Active Team Members</span>
                                <div className="text-2xl font-bold text-[#242424] mt-0.5">{data.teamStats.length}</div>
                            </div>
                            <div className="p-2.5 bg-[#EFF6FF] text-[#0078D4] border border-[#B4D6FA]">
                                <Users size={18} />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-[#D1D5DB] p-4 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#107C41] tracking-wider">Average Pass Rate</span>
                                <div className="text-2xl font-bold text-[#107C41] mt-0.5">
                                    {data.teamStats.length > 0 
                                        ? `${Math.round(data.teamStats.reduce((acc, curr) => acc + curr.passRate, 0) / data.teamStats.length)}%`
                                        : '0%'
                                    }
                                </div>
                            </div>
                            <div className="p-2.5 bg-[#DFF6DD] text-[#107C41] border border-[#A6E5A2]">
                                <CheckCircle2 size={18} />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-[#D1D5DB] p-4 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#D13438] tracking-wider">Total Evaluated</span>
                                <div className="text-2xl font-bold text-[#242424] mt-0.5">
                                    {data.teamStats.reduce((acc, curr) => acc + curr.total, 0)}
                                </div>
                            </div>
                            <div className="p-2.5 bg-[#FDE7E9] text-[#D13438] border border-[#F9B9BC]">
                                <Activity size={18} />
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-[#D1D5DB] p-5 shadow-2xs">
                            <h3 className="text-xs font-bold text-[#242424] uppercase tracking-wider mb-4 border-b border-[#E1DFDD] pb-2">Team Verdicts Breakdown</h3>
                            <div className="flex justify-center py-2">
                                <PassFailDonut
                                    passed={data.teamStats.reduce((acc, curr) => acc + curr.passed, 0)}
                                    failed={data.teamStats.reduce((acc, curr) => acc + curr.failed, 0)}
                                    pending={data.teamStats.reduce((acc, curr) => acc + curr.pending, 0)}
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-[#D1D5DB] p-5 shadow-2xs">
                            <h3 className="text-xs font-bold text-[#242424] uppercase tracking-wider mb-4 border-b border-[#E1DFDD] pb-2">Validator Workload Distribution</h3>
                            <WorkloadDonut stats={data.teamStats} />
                        </div>
                    </div>

                    {/* Team Insights Section */}
                    {teamInsights.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-[#D1D5DB] p-5 shadow-2xs">
                            <InsightList title="Team Performance Insights" insights={teamInsights} />
                        </div>
                    )}

                    {/* Validators Table Card */}
                    <div className="bg-white dark:bg-slate-900 border border-[#D1D5DB] overflow-hidden shadow-2xs">
                        <div className="p-3.5 border-b border-[#E1DFDD] bg-[#F9FAFB]">
                            <h2 className="text-xs font-bold text-[#242424] uppercase tracking-wider">Team Performance & Pass Rates</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#E1DFDD] bg-[#F3F2F1]">
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">Validator</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">Role</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#605E5C] uppercase tracking-wider text-center">Total Cases</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#605E5C] uppercase tracking-wider text-center">Passed</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#605E5C] uppercase tracking-wider text-center">Failed</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#605E5C] uppercase tracking-wider text-center">Pending</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#605E5C] uppercase tracking-wider text-right">Pass Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1DFDD] text-xs">
                                    {data.teamStats.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#605E5C] font-medium">
                                                No validators found for the selected filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.teamStats.map((stat) => {
                                            const initials = stat.member.full_name
                                                .split(' ')
                                                .map((p: string) => p[0])
                                                .filter(Boolean)
                                                .slice(0, 2)
                                                .join('')
                                                .toUpperCase();

                                            return (
                                                <tr key={stat.member.id} className="hover:bg-[#EFF6FF] transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-none bg-[#EFF6FF] text-[#0078D4] border border-[#B4D6FA] flex items-center justify-center text-xs font-bold shrink-0">
                                                                {initials}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-[#242424]">{stat.member.full_name}</div>
                                                                <div className="text-[10px] text-[#605E5C]">{stat.member.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-[#605E5C] font-semibold text-[11px]">
                                                        {roleLabel(stat.member.role)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-[#242424] tabular-nums">
                                                        {stat.total}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-[#107C41] tabular-nums">
                                                        {stat.passed}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-[#D13438] tabular-nums">
                                                        {stat.failed}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-[#D97706] tabular-nums">
                                                        {stat.pending}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-20 bg-[#F3F2F1] h-1.5 border border-[#D1D5DB] overflow-hidden shrink-0">
                                                                <div 
                                                                    className="h-full bg-[#107C41]" 
                                                                    style={{ width: `${stat.passRate}%` }} 
                                                                />
                                                            </div>
                                                            <span className="text-xs font-bold text-[#242424] w-8 tabular-nums">
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

            {/* Drilldown Modal */}
            {data.drilldown && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-none shadow-2xl border border-[#D1D5DB] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col font-sans"
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 border-b border-[#E1DFDD] flex items-center justify-between bg-white dark:bg-slate-900">
                            <div>
                                <h3 className="text-xs font-bold text-[#242424] uppercase tracking-wider">
                                    {data.drilldown.title}
                                </h3>
                                <p className="text-[11px] text-[#605E5C] mt-0.5">
                                    {data.drilldownCandidates.length} {data.drilldownCandidates.length === 1 ? 'candidate' : 'candidates'} found
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    data.setDrilldown(null);
                                    setDrilldownSearch('');
                                }}
                                className="p-1 hover:bg-[#F3F2F1] text-[#605E5C] hover:text-[#242424] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search and Action Bar */}
                        <div className="p-3 border-b border-[#E1DFDD] bg-[#F9FAFB] flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search size={13} className="absolute left-2.5 top-2.5 text-[#605E5C]" />
                                <input
                                    type="text"
                                    placeholder="Search candidate name, email, phone or status..."
                                    value={drilldownSearch}
                                    onChange={(e) => setDrilldownSearch(e.target.value)}
                                    className="w-full pl-8 pr-4 py-1.5 border border-[#D1D5DB] text-xs font-medium focus:outline-none focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] bg-white dark:bg-slate-900 transition-all text-[#242424]"
                                />
                            </div>
                        </div>

                        {/* Candidate List */}
                        <div className="flex-1 overflow-y-auto p-4 min-h-[300px] custom-scrollbar">
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
                                        <div className="flex flex-col items-center justify-center py-16 text-center text-[#605E5C]">
                                            <Search size={26} className="text-[#a19f9d] mb-2" />
                                            <p className="text-xs font-bold uppercase tracking-wider">No matching candidates</p>
                                            <p className="text-[11px] mt-0.5">Try adjusting your search query.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[#E1DFDD] text-[#605E5C] font-bold uppercase tracking-wider text-[10px] bg-[#F3F2F1]">
                                                    <th className="py-2 px-3">Candidate Name</th>
                                                    <th className="py-2 px-3">Contact Details</th>
                                                    <th className="py-2 px-3 text-center">Stage Status</th>
                                                    <th className="py-2 px-3 text-center">Overall Status</th>
                                                    <th className="py-2 px-3 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E1DFDD]">
                                                {filtered.map(app => {
                                                    const name = app.applicant_name || '';
                                                    const outcome = app.stageOutcome || 'PENDING';
                                                    
                                                    let outcomeBadge = (
                                                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-[#FFF8D6] text-[#D97706] border border-[#FDE047]">
                                                            Pending
                                                        </span>
                                                    );
                                                    if (outcome === 'PASSED') {
                                                        outcomeBadge = (
                                                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-[#DFF6DD] text-[#107C41] border border-[#A6E5A2]">
                                                                Passed
                                                            </span>
                                                        );
                                                    } else if (outcome === 'FAILED') {
                                                        outcomeBadge = (
                                                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-[#FDE7E9] text-[#D13438] border border-[#F9B9BC]">
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
                                                            className="hover:bg-[#EFF6FF] transition-colors cursor-pointer group"
                                                        >
                                                            <td className="py-2.5 px-3">
                                                                <div className="font-bold text-[#242424] group-hover:text-[#0078D4] transition-colors">{name}</div>
                                                                <div className="text-[10px] text-[#605E5C]">{app.position_title || 'General Application'}</div>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <div className="text-[#242424] font-medium">{app.applicant_email || 'No Email'}</div>
                                                                <div className="text-[10px] text-[#605E5C]">{app.pis?.phone || 'No Phone'}</div>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                {outcomeBadge}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <span className="text-[11px] font-semibold text-[#242424]">
                                                                    {displayStatus}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <button 
                                                                    className="text-[10px] font-bold uppercase tracking-wider text-[#0078D4] hover:underline"
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
