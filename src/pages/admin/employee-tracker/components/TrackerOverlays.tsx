import React, { useMemo, useState } from 'react';
import {
    Building2, Users, Briefcase, Calendar, X, Clock,
    XCircle, Activity, Check, X as XIcon,
    BarChart3, UserCheck, AlertCircle
} from 'lucide-react';
import { cn, formatDateTime, timeAgo } from '@/utils/formatters';
import { CalendarDropdown } from '@/components/common/CalendarDropdown';
import type { EmployeeStats } from '../hooks/useEmployeeTracker';

export function TrackerHeader() {
    return (
        <div className="bg-white border-b border-surface-200">
            <div className="relative px-6 pt-5 pb-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2.5">
                    <Activity size={17} className="text-[#605e5c] self-center" />
                    <h1
                        className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                    >
                        Employee Activity Hub
                    </h1>
                </div>
                <span className="text-[12px] font-medium text-surface-400 tracking-[-0.005em] mt-1.5">
                    Real-time performance audit, load distribution, and yield rates across all pipelines.
                </span>
            </div>
        </div>
    );
}

interface EmployeeDetailModalProps {
    selectedUser: EmployeeStats | null;
    setSelectedUser: (s: EmployeeStats | null) => void;
    modalTab: 'applicants' | 'endorsed' | 'failed' | 'logs';
    setModalTab: (t: 'applicants' | 'endorsed' | 'failed' | 'logs') => void;
    modalDateFilter: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';
    setModalDateFilter: (f: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL') => void;
    modalCustomDate: string;
    setModalCustomDate: (d: string) => void;
    modalStatFilter: 'ALL' | 'SCREENED' | 'ENDORSED' | 'DROPPED' | 'PENDING' | 'PASSED' | 'FAILED';
    setModalStatFilter: (f: 'ALL' | 'SCREENED' | 'ENDORSED' | 'DROPPED' | 'PENDING' | 'PASSED' | 'FAILED') => void;
    updateApplicantStatus?: (appId: string, toStatus: string) => void;
}

export function EmployeeDetailModal({
    selectedUser, setSelectedUser, modalTab, setModalTab,
    modalDateFilter, setModalDateFilter, modalCustomDate, setModalCustomDate,
    modalStatFilter, setModalStatFilter, updateApplicantStatus
}: EmployeeDetailModalProps) {
    const [accountFilter, setAccountFilter] = useState<string>('ALL');

    const uniqueAccounts = useMemo(() => {
        if (!selectedUser) return [];
        const depts = new Set(selectedUser.detailedApplicants.map(a => a.department).filter(Boolean));
        return Array.from(depts).sort();
    }, [selectedUser]);

    if (!selectedUser) return null;

    const isOps = selectedUser.user.role === 'ops_validator';
    const avatarGradient = isOps
        ? 'from-blue-600 to-cyan-500'
        : 'from-purple-600 to-indigo-500';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
            <div
                onClick={() => setSelectedUser(null)}
                className="absolute inset-0 bg-surface-900/40 backdrop-blur-md transition-opacity duration-300"
            />

            <div className="relative z-10 max-w-5xl w-full bg-white rounded-sm shadow-2xl border border-surface-200/80 overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Modal Header */}
                <div className="p-5 border-b border-surface-100 flex flex-col md:flex-row md:items-center justify-between bg-surface-50/50 gap-4">
                    <div className="flex items-center gap-4 text-left">
                        <div className={cn(
                            'w-14 h-14 bg-gradient-to-br rounded-sm flex items-center justify-center font-semibold text-lg text-white shadow-lg shrink-0 overflow-hidden',
                            avatarGradient
                        )}>
                            {selectedUser.user.avatar_data ? (
                                <img src={selectedUser.user.avatar_data} alt={selectedUser.user.full_name} className="w-full h-full object-cover" />
                            ) : (
                                selectedUser.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <div>
                            <h2 className="text-[22px] font-semibold text-surface-900 tracking-[-0.005em] leading-none capitalize">
                                {selectedUser.user.full_name}
                            </h2>
                            <div className="flex items-center gap-2.5 mt-2">
                                <span className={cn(
                                    'inline-flex items-center gap-1 px-2.5 py-0.5 text-[10.5px] font-medium tracking-[-0.005em] rounded-full border',
                                    isOps ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                                )}>
                                    <Users size={10} /> {selectedUser.user.role.replace('_', ' ')}
                                </span>
                                <span className="text-[10.5px] font-normal text-surface-500 tracking-[-0.005em]">
                                    &bull; {selectedUser.user.sector}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Header Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center bg-surface-100 border border-surface-200/60 rounded-sm p-0.5">
                            {([
                                { id: 'ALL', label: 'All time' },
                                { id: 'TODAY', label: 'Today' },
                                { id: 'WEEK', label: 'Week' },
                                { id: 'MONTH', label: 'Month' }
                            ] as const).map((btn) => (
                                <button
                                    key={btn.id}
                                    onClick={() => {
                                        setModalDateFilter(btn.id);
                                        setModalCustomDate('');
                                    }}
                                    className={cn(
                                        'px-3 h-7 text-[11px] font-medium tracking-[-0.005em] rounded-sm transition-all duration-200',
                                        (modalDateFilter === btn.id && !modalCustomDate)
                                            ? 'bg-white text-primary-600 shadow-sm'
                                            : 'text-surface-600 hover:text-surface-900'
                                    )}
                                >
                                    {btn.label}
                                </button>
                            ))}
                            <div className="h-4 w-[1px] bg-surface-300 mx-1" />
                            <CalendarDropdown
                                value={modalCustomDate}
                                onChange={(date) => {
                                    setModalCustomDate(date);
                                    setModalDateFilter('ALL');
                                }}
                            />
                        </div>

                        <div className="relative">
                            <select
                                value={accountFilter}
                                onChange={(e) => setAccountFilter(e.target.value)}
                                className="appearance-none bg-white border border-surface-200 rounded-sm h-7 pl-3 pr-8 text-[11.5px] font-medium tracking-[-0.005em] text-surface-700 cursor-pointer hover:border-primary-500 focus:outline-none transition-colors"
                            >
                                <option value="ALL">All units</option>
                                {uniqueAccounts.map(acc => (
                                    <option key={acc} value={acc}>{acc}</option>
                                ))}
                            </select>
                            <Building2 size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                        </div>

                        <button
                            onClick={() => setSelectedUser(null)}
                            className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-sm transition-all duration-200 text-surface-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col min-h-0">

                    {/* Performance Cards Banner */}
                    <div className="px-5 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { id: isOps ? 'PENDING' : 'SCREENED', label: isOps ? 'Queue pending' : 'Total screened', value: selectedUser.interviewed, icon: Clock, color: 'text-blue-600', border: 'border-t-blue-500', bg: 'hover:bg-blue-50/30' },
                            { id: isOps ? 'PASSED' : 'ENDORSED', label: isOps ? 'Passed action' : 'Endorsed action', value: selectedUser.endorsed, icon: UserCheck, color: 'text-emerald-600', border: 'border-t-emerald-500', bg: 'hover:bg-emerald-50/30' },
                            { id: isOps ? 'FAILED' : 'DROPPED', label: isOps ? 'Failed action' : 'Dropped action', value: selectedUser.failed, icon: AlertCircle, color: 'text-rose-600', border: 'border-t-rose-500', bg: 'hover:bg-rose-50/30' },
                            { id: 'ALL', label: 'Endorsement yield', value: selectedUser.totalHandled > 0 ? `${Math.round((selectedUser.endorsed / selectedUser.totalHandled) * 100)}%` : '0%', icon: BarChart3, color: 'text-indigo-600', border: 'border-t-indigo-500', bg: 'hover:bg-indigo-50/30' }
                        ].map((s, i) => (
                            <button
                                key={i}
                                onClick={() => s.id !== 'ALL' && setModalStatFilter(modalStatFilter === s.id ? 'ALL' : (s.id as any))}
                                className={cn(
                                    'p-3.5 bg-white border border-surface-200/80 rounded-sm border-t-4 flex items-center justify-between shadow-sm transition-all duration-200',
                                    s.border, s.bg, modalStatFilter === s.id && 'ring-2 ring-inset ring-primary-500/10 bg-surface-50/50'
                                )}
                            >
                                <div className="text-left">
                                    <p className="text-[10.5px] font-semibold text-surface-500 tracking-[-0.005em] mb-1">{s.label}</p>
                                    <h4 className={cn('text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums', s.color)}>{s.value}</h4>
                                </div>
                                <s.icon size={22} className={cn('opacity-20', s.color)} />
                            </button>
                        ))}
                    </div>

                    {/* Section Selector Tabs */}
                    <div className="px-5 pt-6 space-y-5 flex-1 flex flex-col min-h-0 text-left">
                        <div className="flex gap-8 border-b border-surface-200">
                            {([
                                { id: 'applicants', label: isOps ? 'All pending' : 'All interviewed', icon: Users },
                                { id: 'endorsed', label: isOps ? 'Passed candidates' : 'Endorsed candidates', icon: UserCheck },
                                { id: 'failed', label: 'Dropped / failed', icon: XCircle },
                                { id: 'logs', label: 'Live system log', icon: Activity }
                            ] as const).map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setModalTab(t.id);
                                        if (t.id === 'endorsed') setModalStatFilter(isOps ? 'PASSED' : 'ENDORSED');
                                        else if (t.id === 'failed') setModalStatFilter(isOps ? 'FAILED' : 'DROPPED');
                                        else if (t.id === 'applicants') setModalStatFilter('ALL');
                                    }}
                                    className={cn(
                                        'pb-3 text-[12.5px] font-medium tracking-[-0.005em] flex items-center gap-2 transition-all relative duration-200',
                                        modalTab === t.id ? 'text-primary-600' : 'text-surface-500 hover:text-surface-800'
                                    )}
                                >
                                    <t.icon size={14} />
                                    {t.label}
                                    {modalTab === t.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-600 to-indigo-600 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* List Content Container */}
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col pb-5">
                            {(modalTab === 'applicants' || modalTab === 'endorsed' || modalTab === 'failed') ? (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="bg-white border border-surface-200 rounded-sm overflow-hidden flex-1 overflow-y-auto custom-scrollbar shadow-sm">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 z-20">
                                                <tr className="bg-surface-50 border-b border-surface-200">
                                                    <th className="px-5 py-3 text-[11px] font-semibold text-surface-500 tracking-[-0.005em]">Applicant name</th>
                                                    <th className="px-5 py-3 text-[11px] font-semibold text-surface-500 tracking-[-0.005em]">Department / program</th>
                                                    <th className="px-5 py-3 text-[11px] font-semibold text-surface-500 tracking-[-0.005em]">Assigned position</th>
                                                    <th className="px-5 py-3 text-[11px] font-semibold text-surface-500 tracking-[-0.005em] text-right">Actions / timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-100">
                                                {selectedUser.detailedApplicants
                                                    .filter(app => {
                                                        const appDate = new Date(app.lastActionAt);
                                                        const now = new Date();

                                                        if (modalCustomDate) {
                                                            const custom = new Date(modalCustomDate);
                                                            if (appDate.toDateString() !== custom.toDateString()) return false;
                                                        } else if (modalDateFilter === 'TODAY') {
                                                            if (appDate.toDateString() !== now.toDateString()) return false;
                                                        } else if (modalDateFilter === 'WEEK') {
                                                            const diff = now.getTime() - appDate.getTime();
                                                            if (diff > 7 * 24 * 60 * 60 * 1000) return false;
                                                        } else if (modalDateFilter === 'MONTH') {
                                                            if (appDate.getMonth() !== now.getMonth() || appDate.getFullYear() !== now.getFullYear()) return false;
                                                        }

                                                        if (accountFilter !== 'ALL' && app.department !== accountFilter) return false;

                                                        if (modalTab === 'endorsed') return app.status === (isOps ? 'PASSED' : 'ENDORSED');
                                                        if (modalTab === 'failed') return app.status === (isOps ? 'FAILED' : 'DROPPED');
                                                        return modalStatFilter === 'ALL' || app.status === modalStatFilter;
                                                    })
                                                    .map((app) => (
                                                        <tr key={app.id} className="hover:bg-surface-50/50 transition-colors cursor-pointer group">
                                                            <td className="px-5 py-3.5">
                                                                <p className="text-[13px] font-semibold text-surface-900 group-hover:text-primary-600 transition-colors duration-200 tracking-[-0.005em]">{app.name}</p>
                                                                <div className="flex gap-1.5 mt-1.5">
                                                                    <span className={cn(
                                                                        'px-2 py-0.5 text-[10px] font-medium border rounded-full tracking-[-0.005em]',
                                                                        (app.status === 'ENDORSED' || app.status === 'PASSED') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                            (app.status === 'DROPPED' || app.status === 'FAILED') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                                'bg-blue-50 text-blue-700 border-blue-200'
                                                                    )}>
                                                                        {app.status}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-surface-100 text-surface-700 text-[10.5px] font-medium tracking-[-0.005em] rounded-sm border border-surface-200/50">
                                                                    <Building2 size={10} className="text-surface-400" />
                                                                    {app.department}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                <div className="flex items-center gap-2">
                                                                    <Briefcase size={13} className="text-surface-400" />
                                                                    <span className="text-[12px] font-medium text-surface-700 tracking-[-0.005em]">{app.jobTitle}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5 text-right">
                                                                {isOps && app.status === 'PENDING' ? (
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateApplicantStatus?.(app.id, 'PASSED');
                                                                            }}
                                                                            className="px-3 h-7 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-medium tracking-[-0.005em] rounded-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                                                                        >
                                                                            <Check size={11} /> Pass
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateApplicantStatus?.(app.id, 'FAILED');
                                                                            }}
                                                                            className="px-3 h-7 bg-gradient-to-r from-rose-600 to-red-600 text-white text-[11px] font-medium tracking-[-0.005em] rounded-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                                                                        >
                                                                            <XIcon size={11} /> Fail
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[12px] font-semibold text-surface-900 tracking-[-0.005em] tabular-nums">{formatDateTime(app.lastActionAt).split(',')[0]}</p>
                                                                        <p className="text-[10px] font-medium text-surface-500 tracking-[-0.005em] tabular-nums">{formatDateTime(app.lastActionAt).split(',')[1]}</p>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col min-h-0 bg-white border border-surface-200 rounded-sm p-5 overflow-y-auto custom-scrollbar shadow-sm">
                                    <div className="space-y-0 border-l-2 border-surface-100 ml-2">
                                        {selectedUser.recentActivity
                                            .filter(log => {
                                                const logDate = new Date(log.changed_at);
                                                const now = new Date();

                                                if (modalCustomDate) {
                                                    const custom = new Date(modalCustomDate);
                                                    if (logDate.toDateString() !== custom.toDateString()) return false;
                                                } else if (modalDateFilter === 'TODAY') {
                                                    if (logDate.toDateString() !== now.toDateString()) return false;
                                                } else if (modalDateFilter === 'WEEK') {
                                                    const diff = now.getTime() - logDate.getTime();
                                                    if (diff > 7 * 24 * 60 * 60 * 1000) return false;
                                                } else if (modalDateFilter === 'MONTH') {
                                                    if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) return false;
                                                }
                                                return true;
                                            })
                                            .map((log, idx) => (
                                                <div key={log.id} className="relative pl-8 pb-7 last:pb-2 group">
                                                    <div className={cn(
                                                        'absolute left-[-6px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white transition-transform group-hover:scale-125 duration-200',
                                                        idx === 0 ? 'border-primary-600 bg-primary-50 ring-4 ring-primary-100' : 'border-surface-300'
                                                    )} />
                                                    <p className={cn(
                                                        'text-[13px] font-semibold leading-none tracking-[-0.005em]',
                                                        idx === 0 ? 'text-primary-600' : 'text-surface-800'
                                                    )}>
                                                        {log.to_status.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-[11.5px] text-surface-600 font-normal mt-1 tracking-[-0.005em]">
                                                        Action initiated by <span className="font-semibold text-surface-700">{log.changed_by_name}</span>
                                                        {log.change_reason && <span className="block mt-1 bg-surface-50 border border-surface-200/50 p-2 rounded-sm italic text-[11px] text-surface-600">&ldquo;{log.change_reason}&rdquo;</span>}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-3 mt-2.5">
                                                        <p className="text-[10.5px] font-semibold text-primary-600 tracking-[-0.005em] flex items-center gap-1.5 bg-primary-50 px-2 py-0.5 rounded-sm border border-primary-100">
                                                            <Calendar size={10} /> {new Date(log.changed_at).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-[10.5px] font-semibold text-emerald-600 tracking-[-0.005em] flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100">
                                                            <Clock size={10} /> {new Date(log.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <span className="text-[10.5px] font-normal text-surface-500 tracking-[-0.005em] italic">
                                                            ({timeAgo(log.changed_at)})
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
