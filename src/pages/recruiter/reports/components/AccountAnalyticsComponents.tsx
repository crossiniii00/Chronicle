import React, { useMemo, useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    ChevronDown, Target, TrendingUp, CheckCircle2, ShieldCheck, Activity,
    Search, ArrowRight, ArrowLeft, Monitor, Download, MoreVertical, ArrowUpRight
} from 'lucide-react';
import { cn } from '@/utils/formatters';

export interface AnalyticsTabProps {
    processedData: any[];
    globalMetrics: any;
    monthlyTrendData: any[];
    funnelData: any[];
    availableAccounts: string[];
    selectedDeptName: string | null;
    setSelectedDeptName: (val: string | null) => void;
    dateMode: 'all' | 'today' | '7' | '30' | '90' | 'current_month' | 'specific' | 'range';
    setDateMode: (val: any) => void;
    apps: any[];
}

/**
 * PREMIUM ANALYTICS CARD - GLASSMORPHISM STYLE
 */
export const PremiumAnalyticsCard = ({ 
    title, 
    children, 
    subtitle, 
    actionLabel, 
    onAction,
    icon: Icon = Target,
    statusColor = "text-blue-500",
    statusBg = "bg-blue-500/10",
    className
}: { 
    title: string, 
    children: React.ReactNode, 
    subtitle?: string, 
    actionLabel?: string, 
    onAction?: () => void,
    icon?: any,
    statusColor?: string,
    statusBg?: string,
    className?: string
}) => (
    <div className={cn("premium-glass-card rounded-2xl flex flex-col h-full overflow-hidden border border-white/40 group", className)}>
        <div className="p-6 pb-2 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className={cn("w-4 h-4 rounded-lg flex items-center justify-center", statusBg)}>
                            <Icon size={10} className={statusColor} />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
                    </div>
                    {subtitle && <p className="text-[11px] text-slate-400 font-semibold">{subtitle}</p>}
                </div>
                <div className="p-1.5 bg-slate-500/5 rounded-full border border-slate-500/10 opacity-40 group-hover:opacity-100 transition-opacity">
                    <ChevronDown size={14} className="text-slate-400" />
                </div>
            </div>

            <div className="flex-1">
                {children}
            </div>
        </div>
        {actionLabel && (
            <div className="mt-auto p-4 bg-white/30 backdrop-blur-md border-t border-white/20 flex justify-end">
                <button 
                    onClick={onAction}
                    className="group/btn flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-95"
                >
                    {actionLabel} 
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        )}
    </div>
);

export const GACard = PremiumAnalyticsCard;

export const GlassTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 backdrop-blur-md border border-slate-100 p-3 rounded-xl shadow-xl animate-fade-in flex flex-col gap-1.5 min-w-[140px] pointer-events-none">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <div className="space-y-1">
                    {payload.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                                {item.name}
                            </span>
                            <span className="text-[11px] font-black text-slate-900 tabular-nums">{item.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

/**
 * PREMIUM FUNNEL - DYNAMIC ENERGY BARS WITH CONVERSION INTELLIGENCE
 */
export const PremiumFunnel = ({ data, gapClass = "gap-4" }: { data: any[], gapClass?: string }) => {
    if (!data || data.length === 0) return null;
    const colors = [
        'from-blue-600 to-sky-400',
        'from-indigo-600 to-indigo-400',
        'from-emerald-600 to-teal-400',
        'from-violet-600 to-purple-400',
        'from-rose-600 to-pink-400',
    ];

    return (
        <div className={cn("flex flex-col w-full", gapClass)}>
            {data.map((item, idx) => {
                const max = data[0].count;
                const prevCount = idx > 0 ? data[idx - 1].count : max;
                const percentageOfTotal = max > 0 ? (item.count / max) * 100 : 0;
                const percentageOfPrev = prevCount > 0 ? (item.count / prevCount) * 100 : 0;
                const colorClass = item.color || colors[idx % colors.length];
                
                return (
                    <div key={idx} className="group/item relative">
                        <div className="flex justify-between items-end mb-1 px-1">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full bg-gradient-to-r", colorClass)} />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {item.stage}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                {idx > 0 && (
                                    <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                        {percentageOfPrev.toFixed(0)}% step
                                    </span>
                                )}
                                <span className="text-xs font-black text-slate-900 tabular-nums">
                                    {item.count.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-[1px] border border-slate-200/40 shadow-inner">
                            <div 
                                className={cn(
                                    "h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out",
                                    colorClass
                                )}
                                style={{ width: `${percentageOfTotal}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const GAFunnel = PremiumFunnel;

/**
 * ACCOUNT HIRING FUNNEL - RANKING VIEW
 */
export const AccountHiringFunnel = ({ data, limit = 5 }: { data: any[], limit?: number }) => {
    const sortedAccounts = [...data].sort((a, b) => b.total.Hired - a.total.Hired).slice(0, limit);
    
    const colors = [
        '#334155', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444',
        '#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#f97316'
    ];

    return (
        <div className="flex flex-col items-center py-4 w-full">
            {/* Optimized Sharp Funnel - 10% base for internal containment */}
            <div 
                className="w-[280px] aspect-[2/3] relative flex flex-col"
                style={{ 
                    clipPath: 'polygon(0% 0%, 100% 0%, 55% 100%, 45% 100%)' 
                }}
            >
                {sortedAccounts.map((acc, i) => {
                    const fontSize = i < 2 ? 'text-[10px]' : i < 4 ? 'text-[8px]' : 'text-[7px]';
                    const hireFontSize = i < 2 ? 'text-sm' : i < 4 ? 'text-[10px]' : 'text-[9px]';

                    return (
                        <div 
                            key={i} 
                            style={{ 
                                backgroundColor: colors[i % colors.length],
                                height: `${100/sortedAccounts.length}%`
                            }}
                            className="w-full flex flex-col items-center justify-center border-b border-white/5 last:border-0 group transition-all hover:brightness-110 relative overflow-hidden"
                        >
                            <div className="flex flex-col items-center px-4 text-center w-full">
                                <span className={cn(
                                    "font-black text-white/90 uppercase tracking-tighter truncate w-full",
                                    fontSize
                                )}>
                                    {acc.name}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className={cn("font-black text-white leading-none", hireFontSize)}>{acc.total.Hired}</span>
                                    <span className="text-[6px] font-bold text-white/50 uppercase tracking-tighter">Hires</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {limit <= 5 && (
                <div className="w-full mt-12 flex justify-center gap-6 border-t border-slate-50 pt-8">
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Top 5</p>
                        <p className="text-lg font-black text-slate-900 leading-none mt-1">
                            {sortedAccounts.reduce((sum, a) => sum + a.total.Hired, 0)}
                        </p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Total Hires</p>
                    </div>
                    <div className="w-px h-10 bg-slate-100" />
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lead Account</p>
                        <p className="text-lg font-black text-primary-600 leading-none mt-1">
                            {((sortedAccounts[0]?.total.Hired / sortedAccounts.reduce((sum, a) => sum + a.total.Hired, 1)) * 100).toFixed(0)}%
                        </p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Contribution</p>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * FULL ANALYSIS MODAL CONTENT RENDERER
 */
export const FullAnalysisContent = ({ 
    type, 
    data, 
    metrics, 
    trendData, 
    passFailData, 
    processedData, 
    selectedAccount, 
    setType 
}: { 
    type: string, 
    data: any[], 
    metrics: any, 
    trendData: any[], 
    passFailData: any[], 
    processedData: any[], 
    selectedAccount: string | null, 
    setType: (t: string) => void 
}) => {
    const [search, setSearch] = useState('');
    
    const insights = useMemo(() => {
        const first = trendData[0]?.hires || 0;
        const last = trendData[trendData.length - 1]?.hires || 0;
        const growth = first === 0 ? 0 : ((last - first) / first) * 100;
        
        return [
            { label: 'Growth', val: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`, desc: 'Global trend', color: growth > 0 ? 'text-emerald-600' : 'text-red-600' },
            { label: 'Avg Success', val: `${metrics.conversionRate.toFixed(1)}%`, desc: 'Network average', color: 'text-primary-600' },
            { label: 'Network Health', val: 'Excellent', desc: 'Overall status', color: 'text-amber-600' }
        ];
    }, [trendData, metrics]);

    const commonHeader = (title: string, sub: string) => (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-surface-100 pb-6 mb-8">
            <div>
                <h4 className="text-3xl font-bold text-surface-900 tracking-tight leading-none">{title}</h4>
                <p className="text-[11px] text-surface-400 font-semibold uppercase tracking-wider mt-2">{sub}</p>
            </div>
            {!selectedAccount ? (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Filter accounts..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-[240px]"
                    />
                </div>
            ) : (
                <div className="flex gap-3">
                    {insights.map((s, i) => (
                        <div key={i} className="px-4 py-3 bg-surface-50 border border-surface-100 rounded-xl min-w-[140px]">
                            <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wide block mb-1">{s.label}</span>
                            <span className={cn("text-lg font-bold block", s.color)}>{s.val}</span>
                            <span className="text-[9px] text-surface-400 font-medium block mt-0.5">{s.desc}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const filteredAccounts = useMemo(() => {
        return processedData.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    }, [processedData, search]);

    if (!selectedAccount) {
        return (
            <div className="p-8 space-y-8 overflow-x-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        {type === 'funnel' && (
                            <>
                                <h4 className="text-3xl font-bold text-surface-900 tracking-tight leading-none">Process Tracking</h4>
                                <p className="text-[11px] text-surface-400 font-semibold uppercase tracking-wider mt-2">See how many people move through the process across all accounts</p>
                            </>
                        )}
                        {type === 'realtime' && (
                            <>
                                <h4 className="text-3xl font-bold text-surface-900 tracking-tight leading-none">Goal Progress</h4>
                                <p className="text-[11px] text-surface-400 font-semibold uppercase tracking-wider mt-2">Checking if accounts are hitting their hiring targets</p>
                            </>
                        )}
                        {type === 'integrity' && (
                            <>
                                <h4 className="text-3xl font-bold text-surface-900 tracking-tight leading-none">Pass vs Fail</h4>
                                <p className="text-[11px] text-surface-400 font-semibold uppercase tracking-wider mt-2">Tracking candidate quality across the network</p>
                            </>
                        )}
                        {type === 'momentum' && (
                            <>
                                <h4 className="text-3xl font-bold text-surface-900 tracking-tight leading-none">Hiring Success</h4>
                                <p className="text-[11px] text-surface-400 font-semibold uppercase tracking-wider mt-2">Ranking accounts by their success rate and activity</p>
                            </>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Find an account..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-[240px]"
                        />
                    </div>
                </div>



                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-12">
                    {filteredAccounts.map((account, i) => {
                        const successRate = account.total.conversionRate || 0;
                        const goalRate = Math.min(100, (account.total.Hired / 25) * 100);
                        
                        return (
                            <div key={i} className="group relative bg-white border border-surface-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h5 className="text-base font-bold text-surface-900 group-hover:text-primary-600 transition-colors uppercase truncate max-w-[150px]">{account.name}</h5>
                                        <p className="text-[9px] text-surface-400 font-bold uppercase tracking-widest mt-1">Account</p>
                                    </div>
                                    <div className={cn(
                                        "px-2 py-1 rounded-lg text-[9px] font-black tracking-tighter uppercase",
                                        successRate > 70 ? "bg-emerald-50 text-emerald-600" : "bg-surface-50 text-surface-400"
                                    )}>
                                        {successRate.toFixed(1)}% Rating
                                    </div>
                                </div>

                                {type === 'funnel' && (
                                    <div className="space-y-4">
                                        {[
                                            { label: 'APPLICANTS', val: account.total.Applicants, color: 'bg-blue-500' },
                                            { label: 'ENDORSED', val: account.total.Endorsed || 0, color: 'bg-amber-500' },
                                            { label: 'HIRED', val: account.total.Hired, color: 'bg-emerald-500' },
                                            { label: 'PENDING', val: account.total.Active || 0, color: 'bg-purple-500' },
                                            { label: 'FAILED', val: account.total.Failed || 0, color: 'bg-red-500' }
                                        ].map((stage, si) => (
                                            <div key={si} className="relative">
                                                <div className="flex justify-between items-center text-[9px] font-bold mb-1.5">
                                                    <span className="text-surface-400 uppercase tracking-tight">{stage.label}</span>
                                                    <span className="text-surface-900">{stage.val}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-surface-50 rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn("h-full rounded-full transition-all duration-1000", stage.color)}
                                                        style={{ width: `${(stage.val / (account.total.Applicants || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {type === 'realtime' && (
                                    <div className="flex flex-col items-center py-4">
                                        <div className="relative w-24 h-24 mb-4">
                                            <svg className="w-full h-full -rotate-90">
                                                <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                                <circle 
                                                    cx="48" cy="48" r="40" fill="none" stroke="#3b82f6" strokeWidth="8" 
                                                    strokeDasharray={251.2}
                                                    strokeDashoffset={251.2 - (251.2 * goalRate) / 100}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-lg font-black text-surface-900 tracking-tighter leading-none">{goalRate.toFixed(0)}%</span>
                                                <span className="text-[7px] font-bold text-surface-400 uppercase tracking-widest mt-1">Goal</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 w-full border-t border-surface-50 pt-4">
                                            <div className="text-center">
                                                <span className="text-[8px] font-bold text-surface-400 uppercase block mb-1">Target</span>
                                                <span className="text-xs font-bold text-surface-900">25</span>
                                            </div>
                                            <div className="text-center border-l border-surface-50">
                                                <span className="text-[8px] font-bold text-surface-400 uppercase block mb-1">Hired</span>
                                                <span className="text-xs font-bold text-emerald-600">{account.total.Hired}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {type === 'integrity' && (
                                    <div className="flex items-center gap-6 py-2">
                                        <div className="w-20 h-20 shrink-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie 
                                                        data={[
                                                            { value: account.total.Endorsed || 0, fill: '#10b981' },
                                                            { value: account.total.Failed || 0, fill: '#ef4444' }
                                                        ]} 
                                                        innerRadius={25} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none"
                                                    >
                                                        <Cell fill="#10b981" />
                                                        <Cell fill="#ef4444" />
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <div className="flex justify-between text-[8px] font-bold">
                                                <span className="text-emerald-600">PASS</span>
                                                <span className="text-surface-900">{account.total.Endorsed || 0}</span>
                                            </div>
                                            <div className="flex justify-between text-[8px] font-bold">
                                                <span className="text-red-500">FAIL</span>
                                                <span className="text-surface-900">{account.total.Failed || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {type === 'momentum' && (
                                    <div className="space-y-6 py-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                                                <span className="text-[8px] font-bold text-primary-600 uppercase block mb-1">Success Rate</span>
                                                <span className="text-base font-black text-primary-900 tracking-tighter">{successRate.toFixed(1)}%</span>
                                            </div>
                                            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
                                                <span className="text-[8px] font-bold text-surface-400 uppercase block mb-1">Applicants</span>
                                                <span className="text-base font-black text-surface-900 tracking-tighter">{account.total.Applicants}</span>
                                            </div>
                                        </div>
                                        <div className="h-1 w-full bg-surface-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${successRate}%` }} />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-4 border-t border-surface-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-primary-500" />
                                        <span className="text-[8px] font-bold text-surface-400 uppercase tracking-widest">Details</span>
                                    </div>
                                    <button className="text-[9px] font-bold text-primary-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                        FULL REPORT <Activity size={8} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    switch (type) {
        case 'funnel':
            return (
                <div className="p-8">
                    {commonHeader('Hiring Process', 'Tracking how many people move through the stages')}
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 lg:col-span-8 bg-white border border-surface-100 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                            <div className="h-[400px] w-full flex items-center justify-center">
                                <GAFunnel data={data} />
                            </div>
                        </div>
                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                            <div className="p-6 bg-surface-900 text-white rounded-2xl">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-4">Account Stats</h5>
                                <div className="space-y-4">
                                    {data.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{item.stage}</span>
                                            <span className="text-base font-bold">{item.count.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 p-6 border border-surface-100 rounded-2xl bg-surface-50">
                                <h5 className="text-[10px] font-bold text-surface-900 uppercase tracking-widest mb-3">Key Observations</h5>
                                <ul className="space-y-3">
                                    <li className="text-[11px] text-surface-500 font-medium leading-relaxed flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                        Most candidates are passing the first stage successfully.
                                    </li>
                                    <li className="text-[11px] text-surface-500 font-medium leading-relaxed flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                                        Focus on speeding up the middle stages to reduce wait time.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'realtime':
            return (
                <div className="p-8">
                    {commonHeader('Goal Progress', 'Checking how close you are to your hiring target')}
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 lg:col-span-9 bg-white border border-surface-100 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                            <div className="h-[400px] w-full flex items-center justify-center">
                                <div className="relative w-64 h-64">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="128" cy="128" r="110" fill="none" stroke="#f1f5f9" strokeWidth="20" />
                                        <circle 
                                            cx="128" cy="128" r="110" fill="none" stroke="#3b82f6" strokeWidth="20" 
                                            strokeDasharray={691.15}
                                            strokeDashoffset={691.15 - (691.15 * (metrics.totalHired / (25 * processedData.length || 1) * 100)) / 100}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-black text-surface-900 tracking-tighter">{metrics.totalHired}</span>
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-2">Total Hires</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                            <div className="p-6 bg-surface-50 border border-surface-100 rounded-2xl">
                                <h5 className="text-[10px] font-bold text-surface-900 uppercase tracking-widest mb-4">Goal Status</h5>
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-[9px] font-bold text-surface-400 uppercase block mb-1">Target</span>
                                        <span className="text-2xl font-bold text-surface-900">{25 * (selectedAccount ? 1 : processedData.length)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold text-surface-400 uppercase block mb-1">Progress</span>
                                        <span className="text-2xl font-bold text-emerald-600">{((metrics.totalHired / (25 * (selectedAccount ? 1 : processedData.length))) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'integrity':
            return (
                <div className="p-8">
                    {commonHeader('Pass vs Fail Rates', 'Candidate quality and results')}
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 lg:col-span-8 bg-white border border-surface-100 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={passFailData} innerRadius={100} outerRadius={140} paddingAngle={8} dataKey="value" stroke="none">
                                            {passFailData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                            <div className="p-6 bg-surface-50 border border-surface-100 rounded-2xl">
                                <h5 className="text-[10px] font-bold text-surface-900 uppercase tracking-widest mb-4">Result Summary</h5>
                                <div className="space-y-4">
                                    {passFailData.map((pf: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center border-b border-surface-100 pb-2">
                                            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wide">{pf.name}</span>
                                            <span className="text-base font-bold text-surface-900">{pf.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'momentum':
            return (
                <div className="p-8">
                    {commonHeader('Hiring Success', 'Checking success rate per account')}
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 lg:col-span-9 bg-white border border-surface-100 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9' }} />
                                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                                        <Bar dataKey="total.Hired" name="Hired" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="total.Failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="total.Withdrawn" name="Withdrawn" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="total.Active" name="Pending" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                            <div className="p-6 bg-surface-50 border border-surface-100 rounded-2xl">
                                <h5 className="text-[10px] font-bold text-surface-900 uppercase tracking-widest mb-4">Quality Score</h5>
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-[9px] font-bold text-surface-400 uppercase block mb-1">Avg Success Rate</span>
                                        <span className="text-2xl font-bold text-surface-900">{metrics.conversionRate.toFixed(1)}%</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold text-surface-400 uppercase block mb-1">Pass Ratio</span>
                                        <span className="text-2xl font-bold text-emerald-600">High</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
};

/**
 * FULL ANALYSIS MODAL COMPONENT
 */
export const FullAnalysisModal = ({ 
    isOpen, 
    onClose, 
    type, 
    data, 
    metrics, 
    trend, 
    passFail, 
    processedData, 
    selectedAccount, 
    setType 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    type: string | null, 
    data: any[], 
    metrics: any, 
    trend: any[], 
    passFail: any[],
    processedData: any[],
    selectedAccount: string | null,
    setType: (t: string) => void
}) => {
    if (!isOpen || !type) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-6xl max-h-full overflow-hidden rounded-2xl shadow-xl border border-surface-100 flex flex-col zoom-in duration-300">
                <div className="sticky top-0 z-10 flex justify-between items-center px-8 py-5 border-b border-surface-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white">
                            <Activity size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-0.5">
                                {selectedAccount ? selectedAccount : 'All Accounts'} Report
                            </span>
                            <h3 className="text-lg font-bold text-surface-900 tracking-tight">Executive Breakdown</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-surface-50 text-surface-400 rounded-xl hover:bg-surface-100 hover:text-surface-900 transition-all">
                        <ArrowLeft size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <FullAnalysisContent 
                        type={type} 
                        data={data} 
                        metrics={metrics} 
                        trendData={trend} 
                        passFailData={passFail} 
                        processedData={processedData}
                        selectedAccount={selectedAccount}
                        setType={setType}
                    />
                </div>
                <div className="px-8 py-5 border-t border-surface-100 bg-surface-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wide">Last Update</span>
                            <span className="text-[10px] font-bold text-surface-900">{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="px-8 py-3 bg-surface-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all">
                        CLOSE REPORT
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * DEMOGRAPHIC DETAILS MODAL
 */
export const DemographicDetailsModal = ({
    isOpen,
    onClose,
    passingRateMetrics
}: {
    isOpen: boolean,
    onClose: () => void,
    passingRateMetrics: {
        genderData: any[],
        eduPassData: any[],
        fullAddressPassData: any[],
        showUpStats: any
    }
}) => {
    const [activeTab, setActiveTab] = useState<'gender' | 'education' | 'address' | 'showup'>('address');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredAddresses = (passingRateMetrics.fullAddressPassData || []).filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-4xl h-[80vh] overflow-hidden rounded-2xl shadow-2xl border border-slate-100 flex flex-col zoom-in duration-300">
                
                {/* Header */}
                <div className="sticky top-0 z-10 flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                            <Activity size={20} />
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                                Analytical Breakdown
                            </span>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Demographic & Show-Up Details</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all shrink-0">
                        <ArrowLeft size={18} />
                    </button>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 px-8 py-2 gap-2 shrink-0">
                    {(['address', 'education', 'gender', 'showup'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                activeTab === tab 
                                    ? "bg-slate-900 text-white shadow-sm" 
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            )}
                        >
                            {tab} Details
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    
                    {activeTab === 'address' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-base font-black text-slate-900">Address Pass Rates</h4>
                                    <p className="text-[11px] text-slate-400 font-medium">Full list of candidate locations ranked by volume</p>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder="Search address/city..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-[220px]"
                                    />
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-100">
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total Candidates</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Passed</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Pass Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredAddresses.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-semibold uppercase tracking-wider">No matching locations found</td>
                                            </tr>
                                        ) : (
                                            filteredAddresses.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-6 py-3.5 text-xs font-bold text-slate-900 uppercase">{item.name}</td>
                                                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-600 text-center">{item.total}</td>
                                                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-600 text-center">{item.passed}</td>
                                                    <td className="px-6 py-3.5 text-right">
                                                        <span className="text-xs font-black text-slate-900">{item.rate}%</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'education' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-base font-black text-slate-900">Educational Attainment</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Conversion success rates grouped by academic background</p>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-100">
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Education Level</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total Candidates</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Passed</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Pass Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(passingRateMetrics.eduPassData || []).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-6 py-3.5 text-xs font-bold text-slate-900 uppercase">{item.name}</td>
                                                <td className="px-6 py-3.5 text-xs font-semibold text-slate-600 text-center">{item.total}</td>
                                                <td className="px-6 py-3.5 text-xs font-semibold text-slate-600 text-center">{item.passed}</td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <span className="text-xs font-black text-slate-900">{item.rate}%</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'gender' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-base font-black text-slate-900">Gender Demographics</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Conversion success rates grouped by gender identity</p>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-100">
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Gender</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total Candidates</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Passed</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Pass Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(passingRateMetrics.genderData || []).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-6 py-3.5 text-xs font-bold text-slate-900 uppercase">{item.name}</td>
                                                <td className="px-6 py-3.5 text-xs font-semibold text-slate-600 text-center">{item.total}</td>
                                                <td className="px-6 py-3.5 text-xs font-semibold text-slate-600 text-center">{item.passed}</td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <span className="text-xs font-black text-slate-900">{item.rate}%</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'showup' && passingRateMetrics.showUpStats && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-base font-black text-slate-900">Training Day Show-Up Status</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Historical metrics for confirmed training attendances</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 flex flex-col justify-between h-[120px]">
                                    <span className="text-[10px] font-black text-emerald-700/60 uppercase tracking-widest">SHOWED UP</span>
                                    <h5 className="text-3xl font-black text-emerald-600 tabular-nums">{passingRateMetrics.showUpStats.showed}</h5>
                                    <p className="text-[11px] text-slate-400 font-bold">{passingRateMetrics.showUpStats.showUpRate}% overall rate</p>
                                </div>
                                <div className="p-6 rounded-2xl border border-rose-100 bg-rose-50/30 flex flex-col justify-between h-[120px]">
                                    <span className="text-[10px] font-black text-rose-700/60 uppercase tracking-widest">NO SHOW</span>
                                    <h5 className="text-3xl font-black text-rose-600 tabular-nums">{passingRateMetrics.showUpStats.noShow}</h5>
                                    <p className="text-[11px] text-slate-400 font-bold">{passingRateMetrics.showUpStats.noShowRate}% overall rate</p>
                                </div>
                                <div className="p-6 rounded-2xl border border-amber-100 bg-amber-50/30 flex flex-col justify-between h-[120px]">
                                    <span className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest">FALLOUT</span>
                                    <h5 className="text-3xl font-black text-amber-600 tabular-nums">{passingRateMetrics.showUpStats.fallout}</h5>
                                    <p className="text-[11px] text-slate-400 font-bold">{passingRateMetrics.showUpStats.falloutRate}% overall rate</p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {filteredAddresses.length} addresses tracked
                    </span>
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all">
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    );
};
