import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, Building2, Users, Calendar, Grid, List, Briefcase, RefreshCw, TrendingUp, Activity, BarChart3, Clock, UserCheck, AlertCircle, Hash, Crown, ChevronDown, Check, X } from 'lucide-react';
import { useEmployeeTracker } from './employee-tracker/hooks/useEmployeeTracker';
import { TrackerHeader, EmployeeDetailModal } from './employee-tracker/components/TrackerOverlays';
import { SectionHeader, StaffCard, StaffTable } from './employee-tracker/components/StaffUI';
import { cn } from '@/utils/formatters';
import { AdvancedDateFilter } from '@/components/common/AdvancedDateFilter';
import { motion, AnimatePresence } from 'framer-motion';

const isSupportDept = (name: string, depts: any[]) => {
    const dept = (depts || []).find((d: any) => (d.name || '').toUpperCase() === name.toUpperCase());
    const lower = name.toLowerCase();
    if (dept?.type) return dept.type === 'SUPPORT_ROLES';
    return ['admin', 'hr', 'support', 'recruitment', 'it', 'facilities', 'finance', 'human resources', 'engagement', 'operations', 'safety', 'security', 'ta', 'training', 'workforce', 'managerial position', 'safety officer', 'team leader intern', 'team leader position', 'support and leadership', 'revenue & invoicing', 'quality assurance', 'training & development', 'engagement & social media', 'it department', 'client engagement & asset control', 'process optimization'].includes(lower) || lower.includes('support');
};

const getAccountImage = (accountName: string, depts: any[]) => {
    const dept = (depts || []).find((d: any) => (d.name || '').toUpperCase() === accountName.toUpperCase());
    if (dept && (dept.accountImageUrl || dept.accountImageData)) {
        if (dept.accountImageUrl) {
            return dept.accountImageUrl.startsWith('/') ? `/api${dept.accountImageUrl}` : dept.accountImageUrl;
        }
        return `data:image/jpeg;base64,${dept.accountImageData}`;
    }
    return '/contactpoint-logo.png?v=2';
};

function CustomAccountDropdown({
    value,
    onChange,
    options,
    departments
}: {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    departments: any[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        return options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    const regularAccounts = filteredOptions.filter(o => !isSupportDept(o, departments));
    const supportAccounts = filteredOptions.filter(o => isSupportDept(o, departments));

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-[220px] h-[34px] bg-[#faf9f8] border border-[#e1dfdd] rounded-none pl-3 pr-2 text-[12px] font-medium text-[#323130] dark:text-slate-300 cursor-pointer focus:outline-none focus:border-[#0078d4] transition-colors"
            >
                <div className="flex items-center gap-2 truncate">
                    <Building2 size={13} className="text-[#605e5c] dark:text-slate-400 shrink-0" />
                    <span className="truncate">{value === 'ALL' ? 'All Accounts' : value}</span>
                </div>
                <ChevronDown size={14} className={cn("text-[#605e5c] transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.1 }}
                        className="absolute top-full left-0 mt-1 w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 max-h-[300px] flex flex-col"
                    >
                        <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                                <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search accounts..."
                                    className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-none text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#0078d4]"
                                    autoFocus
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-y-auto scrollbar-thin py-1 flex-1">
                            <button
                                onClick={() => { onChange('ALL'); setIsOpen(false); }}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-[12px] font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                                    value === 'ALL' ? "bg-indigo-50/50 text-[#0078d4]" : "text-slate-700 dark:text-slate-300"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Building2 size={14} className={value === 'ALL' ? "text-[#0078d4]" : "text-slate-400"} />
                                    All Accounts
                                </div>
                                {value === 'ALL' && <Check size={14} className="text-[#0078d4]" />}
                            </button>

                            {regularAccounts.length > 0 && (
                                <div className="mt-2 mb-1 px-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Accounts</h4>
                                </div>
                            )}
                            {regularAccounts.map(acc => (
                                <button
                                    key={acc}
                                    onClick={() => { onChange(acc); setIsOpen(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                                        value === acc ? "bg-indigo-50/50 text-[#0078d4]" : "text-slate-700 dark:text-slate-300"
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        <img src={getAccountImage(acc, departments)} alt={acc} className="w-5 h-5 object-contain bg-white shrink-0 border border-slate-100 p-0.5 rounded-sm" onError={(e) => { e.currentTarget.src = '/contactpoint-logo.png?v=2'; }} />
                                        <span className="truncate">{acc}</span>
                                    </div>
                                    {value === acc && <Check size={14} className="text-[#0078d4] shrink-0" />}
                                </button>
                            ))}

                            {supportAccounts.length > 0 && (
                                <div className="mt-2 mb-1 px-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Support Hiring Roles</h4>
                                </div>
                            )}
                            {supportAccounts.map(acc => (
                                <button
                                    key={acc}
                                    onClick={() => { onChange(acc); setIsOpen(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-[12px] font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                                        value === acc ? "bg-indigo-50/50 text-[#0078d4]" : "text-slate-700 dark:text-slate-300"
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        <img src={getAccountImage(acc, departments)} alt={acc} className="w-5 h-5 object-contain bg-white shrink-0 border border-slate-100 p-0.5 rounded-sm" onError={(e) => { e.currentTarget.src = '/contactpoint-logo.png?v=2'; }} />
                                        <span className="truncate">{acc}</span>
                                    </div>
                                    {value === acc && <Check size={14} className="text-[#0078d4] shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function EmployeeTracker() {
    const {
        loading, selectedUser, setSelectedUser,
        searchQuery, setSearchQuery,
        deptFilter, setDeptFilter,
        jobFilter, setJobFilter,
        dateFilter, setDateFilter,
        modalTab, setModalTab, modalStatFilter, setModalStatFilter,
        viewMode, setViewMode, activeTab, setActiveTab,
        groupedStats, positions, updateApplicantStatus,
        accountsList, recruiterRolesList, getLabel, departments
    } = useEmployeeTracker();

    // Compute KPI aggregates for the active tab
    const kpiData = useMemo(() => {
        const stats = activeTab === 'ops' ? groupedStats.ops : groupedStats.recruiters;
        const totalStaff = stats.length;
        const totalActivity = stats.reduce((sum, s) => sum + s.totalHandled, 0);
        const totalPending = stats.reduce((sum, s) => sum + s.interviewed, 0);
        const totalEndorsed = activeTab === 'ops'
            ? stats.reduce((sum, s) => sum + s.endorsed, 0)
            : stats.reduce((sum, s) => sum + s.endorsedOver + s.endorsedOps, 0);
        const totalFailed = stats.reduce((sum, s) => sum + s.failed, 0);
        const successRate = totalActivity > 0 ? Math.round((totalEndorsed / totalActivity) * 100) : 0;

        // Find top 5 performers
        const sortedStats = [...stats].sort((a, b) => {
            const aEndorsed = activeTab === 'ops' ? a.endorsed : a.endorsedOver + a.endorsedOps;
            const bEndorsed = activeTab === 'ops' ? b.endorsed : b.endorsedOver + b.endorsedOps;
            return bEndorsed - aEndorsed;
        });
        const topPerformers = sortedStats.slice(0, 5);

        return { totalStaff, totalActivity, totalPending, totalEndorsed, totalFailed, successRate, topPerformers };
    }, [groupedStats, activeTab]);

    const hasActiveFilters = deptFilter !== 'ALL' || jobFilter !== 'ALL' || dateFilter.type !== 'MONTH' || searchQuery !== '';

    return (
        <div className="space-y-0 pb-20 max-w-[1440px] mx-auto text-left">
            <TrackerHeader />

            {/* ═══════════ Command Bar ═══════════ */}
            <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-[#e1dfdd] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-8 py-3">
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        {/* Search */}
                        <div className="relative w-full md:w-72 group text-left">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c] dark:text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search staff by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 h-[34px] bg-[#faf9f8] border border-[#e1dfdd] rounded-none text-[12px] font-medium text-[#323130] dark:text-slate-300 placeholder-[#a19f9d] focus:outline-none focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 transition-all"
                            />
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block w-px h-5 bg-[#e1dfdd]" />

                        {/* Account / Role Filter */}
                        <div className="relative">
                            {activeTab === 'ops' ? (
                                <CustomAccountDropdown
                                    value={deptFilter}
                                    onChange={setDeptFilter}
                                    options={accountsList}
                                    departments={departments}
                                />
                            ) : (
                                <>
                                    <select
                                        value={deptFilter}
                                        onChange={(e) => setDeptFilter(e.target.value)}
                                        className="appearance-none h-[34px] bg-[#faf9f8] border border-[#e1dfdd] rounded-none pl-8 pr-8 text-[12px] font-medium text-[#323130] dark:text-slate-300 cursor-pointer focus:outline-none focus:border-[#0078d4] transition-colors"
                                    >
                                        <option value="ALL">All Account Types</option>
                                        {recruiterRolesList.map((role: string) => (
                                            <option key={role} value={role}>{getLabel(role)}</option>
                                        ))}
                                    </select>
                                    <Users size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605e5c] dark:text-slate-400 pointer-events-none" />
                                </>
                            )}
                        </div>

                        {/* Position Filter (Recruiter only) */}
                        {activeTab !== 'ops' && (
                            <div className="relative">
                                <select
                                    value={jobFilter}
                                    onChange={(e) => setJobFilter(e.target.value)}
                                    className="appearance-none h-[34px] bg-[#faf9f8] border border-[#e1dfdd] rounded-none pl-8 pr-8 text-[12px] font-medium text-[#323130] dark:text-slate-300 cursor-pointer focus:outline-none focus:border-[#0078d4] transition-colors max-w-[200px] truncate"
                                >
                                    <option value="ALL">All Positions</option>
                                    {positions.map(pos => (
                                        <option key={pos.id} value={pos.id}>{pos.title}</option>
                                    ))}
                                </select>
                                <Briefcase size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605e5c] dark:text-slate-400 pointer-events-none" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Advanced Date Filter */}
                        <AdvancedDateFilter value={dateFilter} onChange={setDateFilter} />

                        {/* View Switcher */}
                        <div className="flex items-center border border-[#e1dfdd] rounded-none p-0.5 bg-[#faf9f8]">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-1.5 rounded-none transition-all",
                                    viewMode === 'grid' ? "bg-white dark:bg-slate-900 text-[#0078d4] shadow-sm" : "text-[#605e5c] dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-900/60"
                                )}
                                title="Grid View"
                            >
                                <Grid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-1.5 rounded-none transition-all",
                                    viewMode === 'list' ? "bg-white dark:bg-slate-900 text-[#0078d4] shadow-sm" : "text-[#605e5c] dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-900/60"
                                )}
                                title="List View"
                            >
                                <List size={14} />
                            </button>
                        </div>

                        {/* Reset */}
                        {hasActiveFilters && (
                            <button
                                onClick={() => {
                                    setDeptFilter('ALL');
                                    setJobFilter('ALL');
                                    setDateFilter({ type: 'MONTH', start: null, end: null });
                                    setSearchQuery('');
                                }}
                                className="flex items-center gap-1.5 px-3 h-[34px] text-[11px] font-semibold text-[#a4262c] hover:bg-[#fde7e9] rounded-none border border-transparent hover:border-[#f1bbbc] transition-all"
                            >
                                <RefreshCw size={12} />
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* ═══════════ Pivot Tabs ═══════════ */}
                <div className="flex items-center px-8 gap-0 border-t border-[#f3f2f1]">
                    {[
                        { id: 'ops', label: 'Operations Validator', icon: Building2, count: groupedStats.ops.length },
                        { id: 'recruiter', label: 'Recruiters', icon: Users, count: groupedStats.recruiters.length }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "relative flex items-center gap-2 px-5 py-3 text-[13px] font-semibold tracking-[-0.01em] transition-all outline-none",
                                activeTab === tab.id
                                    ? "text-[#0078d4]"
                                    : "text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300 hover:bg-[#faf9f8]"
                            )}
                        >
                            <tab.icon size={15} className={activeTab === tab.id ? "text-[#0078d4]" : "text-[#a19f9d]"} />
                            {tab.label}
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums",
                                activeTab === tab.id ? "bg-[#0078d4]/10 text-[#0078d4]" : "bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400"
                            )}>
                                {tab.count}
                            </span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0078d4] rounded-none-t" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══════════ KPI Analysis Section ═══════════ */}
            <div className="px-8 pt-6 pb-2 space-y-4">
                {/* KPI Row — Single compact row of 5 stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Active Staff', value: kpiData.totalStaff, icon: Users, accent: '#0078d4' },
                        { label: activeTab === 'ops' ? 'Total Queue' : 'Total Screened', value: kpiData.totalPending, icon: Clock, accent: '#8764b8' },
                        { label: activeTab === 'ops' ? 'Total Passed' : 'Total Endorsed', value: kpiData.totalEndorsed, icon: UserCheck, accent: '#107c10' },
                        { label: 'Total Failed', value: kpiData.totalFailed, icon: AlertCircle, accent: '#d13438' },
                        { label: 'Total Actions', value: kpiData.totalActivity, icon: Activity, accent: '#605e5c' },
                    ].map((kpi, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
                            className="group relative bg-white dark:bg-slate-900 rounded-none border border-[#e1dfdd] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default"
                            style={{ borderLeftWidth: '3px', borderLeftColor: kpi.accent }}
                        >
                            {/* Watermark icon */}
                            <kpi.icon
                                size={48}
                                strokeWidth={1}
                                className="absolute -top-1 -right-1 pointer-events-none transition-transform duration-500 group-hover:scale-110"
                                style={{ color: kpi.accent, opacity: 0.06 }}
                            />
                            <div className="relative p-4">
                                <p className="text-[10px] font-bold text-[#a19f9d] tracking-[0.08em] uppercase mb-2">{kpi.label}</p>
                                <p
                                    className="text-[28px] font-extrabold leading-none tabular-nums tracking-tight"
                                    style={{ color: kpi.accent }}
                                >
                                    {kpi.value.toLocaleString()}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Top 5 Performers — Horizontal strip */}
                {kpiData.topPerformers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                        className="bg-gradient-to-r from-[#fffbf0] via-white to-[#faf9f8] border border-[#edebe9] dark:border-slate-800 rounded-none p-4 shadow-sm"
                    >
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ffb900]/15">
                                <Crown size={13} className="text-[#ffb900]" />
                            </div>
                            <h3 className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 tracking-[0.06em] uppercase">Top 5 Performers</h3>
                            <div className="flex-1 h-px bg-gradient-to-r from-[#edebe9] to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                            {kpiData.topPerformers.map((perf, index) => {
                                const endorsements = activeTab === 'ops' ? perf.endorsed : perf.endorsedOver + perf.endorsedOps;
                                const total = perf.interviewed;
                                const rate = total > 0 ? Math.round((endorsements / total) * 100) : 0;
                                return (
                                    <motion.div
                                        key={perf.user.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.45 + index * 0.08, duration: 0.3 }}
                                        className={cn(
                                            "flex items-center gap-2.5 p-2.5 rounded-none transition-all duration-200",
                                            index === 0
                                                ? "bg-gradient-to-br from-[#fff8e1] to-[#fff4ce] border border-[#f5e6a3] shadow-sm ring-1 ring-[#ffb900]/10"
                                                : "bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 hover:border-[#c8c6c4] dark:border-slate-700 hover:shadow-sm"
                                        )}
                                    >
                                        {/* Rank */}
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0",
                                            index === 0
                                                ? "bg-[#ffb900] text-white shadow-sm"
                                                : index === 1
                                                    ? "bg-[#c0c0c0] text-white"
                                                    : index === 2
                                                        ? "bg-[#cd7f32] text-white"
                                                        : "bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400 border border-[#edebe9] dark:border-slate-800"
                                        )}>
                                            {index === 0 ? <Crown size={11} fill="currentColor" /> : index + 1}
                                        </div>
                                        {/* Avatar */}
                                        <div className="w-8 h-8 rounded-full bg-[#f3f2f1] border border-[#edebe9] dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-[#323130] dark:text-slate-300 overflow-hidden shrink-0">
                                            {perf.user.avatar_data ? (
                                                <img src={perf.user.avatar_data} alt={perf.user.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                perf.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11.5px] font-bold text-[#323130] dark:text-slate-300 truncate capitalize leading-tight">{perf.user.full_name}</p>
                                            <p className="text-[9.5px] text-[#605e5c] dark:text-slate-400 truncate mt-0.5">
                                                <span className="font-bold text-[#107c10]">{endorsements}</span> of {total} · <span className="font-semibold">{rate}%</span>
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* ═══════════ Staff Directory ═══════════ */}
            <div className="px-8 pt-4 pb-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array(8).fill(0).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 border border-[#e1dfdd] h-56 animate-pulse rounded-none" />
                        ))}
                    </div>
                ) : (groupedStats.ops.length === 0 && groupedStats.recruiters.length === 0) ? (
                    <div className="py-20 bg-[#faf9f8] border border-dashed border-[#e1dfdd] rounded-none text-center">
                        <Hash size={32} className="mx-auto text-[#c8c6c4] mb-3" />
                        <p className="text-[13px] font-semibold text-[#a19f9d]">No operational records match the current filters</p>
                        <p className="text-[11px] text-[#c8c6c4] mt-1">Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                        {activeTab === 'ops' ? (
                            <div className="space-y-8">
                                <SectionHeader
                                    title="Operations Hub"
                                    count={groupedStats.ops.length}
                                    icon={Building2}
                                />
                                {(() => {
                                    const groups: Record<string, typeof groupedStats.ops> = {};
                                    groupedStats.ops.forEach(stat => {
                                        const depts = stat.user.department
                                            ? stat.user.department.split(',').map(d => d.trim().toUpperCase()).filter(Boolean)
                                            : [];
                                        if (depts.length === 0) {
                                            const label = stat.user.sector?.trim().toUpperCase() || 'UNASSIGNED';
                                            groups[label] = groups[label] || [];
                                            groups[label].push(stat);
                                        } else {
                                            depts.forEach(dept => {
                                                groups[dept] = groups[dept] || [];
                                                groups[dept].push(stat);
                                            });
                                        }
                                    });

                                    const sortedAccounts = Object.keys(groups).sort();
                                    if (sortedAccounts.length === 0) {
                                        return <p className="text-[12px] text-[#a19f9d] italic">No staff members found.</p>;
                                    }

                                    return sortedAccounts.map(accountName => (
                                        <div key={accountName} className="space-y-4">
                                            {/* Account Group Header */}
                                            <div className="flex items-center gap-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-5 bg-[#0078d4] rounded-full" />
                                                    <h4 className="text-[13px] font-bold text-[#323130] dark:text-slate-300 tracking-[-0.01em]">
                                                        {accountName}
                                                    </h4>
                                                    <span className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 bg-[#f3f2f1] px-2 py-0.5 rounded-full tabular-nums">
                                                        {groups[accountName].length}
                                                    </span>
                                                </div>
                                                <div className="flex-1 h-px bg-[#edebe9] dark:bg-slate-800" />
                                            </div>
                                            {viewMode === 'grid' ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {groups[accountName].map(stat => <StaffCard key={stat.user.id} stat={stat} onClick={() => setSelectedUser(stat)} getLabel={getLabel} />)}
                                                </div>
                                            ) : (
                                                <StaffTable stats={groups[accountName]} onRowClick={setSelectedUser} isOps={true} getLabel={getLabel} />
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <SectionHeader
                                    title="Recruitment Command"
                                    count={groupedStats.recruiters.length}
                                    icon={Users}
                                />
                                {(() => {
                                    const groups: Record<string, typeof groupedStats.recruiters> = {};
                                    groupedStats.recruiters.forEach(stat => {
                                        const roleLabel = getLabel(stat.user.role) || 'Recruiter';
                                        groups[roleLabel] = groups[roleLabel] || [];
                                        groups[roleLabel].push(stat);
                                    });

                                    const sortedRoles = Object.keys(groups).sort();
                                    if (sortedRoles.length === 0) {
                                        return <p className="text-[12px] text-[#a19f9d] italic">No staff members found.</p>;
                                    }

                                    return sortedRoles.map(roleName => (
                                        <div key={roleName} className="space-y-4">
                                            {/* Role Group Header */}
                                            <div className="flex items-center gap-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-5 bg-[#8764b8] rounded-full" />
                                                    <h4 className="text-[13px] font-bold text-[#323130] dark:text-slate-300 tracking-[-0.01em]">
                                                        {roleName}
                                                    </h4>
                                                    <span className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 bg-[#f3f2f1] px-2 py-0.5 rounded-full tabular-nums">
                                                        {groups[roleName].length}
                                                    </span>
                                                </div>
                                                <div className="flex-1 h-px bg-[#edebe9] dark:bg-slate-800" />
                                            </div>
                                            {viewMode === 'grid' ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {groups[roleName].map(stat => <StaffCard key={stat.user.id} stat={stat} onClick={() => setSelectedUser(stat)} getLabel={getLabel} />)}
                                                </div>
                                            ) : (
                                                <StaffTable stats={groups[roleName]} onRowClick={setSelectedUser} isOps={false} getLabel={getLabel} />
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <EmployeeDetailModal
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                modalTab={modalTab}
                setModalTab={setModalTab}
                modalStatFilter={modalStatFilter}
                setModalStatFilter={setModalStatFilter}
                updateApplicantStatus={updateApplicantStatus}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
            />
        </div>
    );
}
