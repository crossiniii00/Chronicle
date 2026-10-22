import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { UserService } from '@/services/UserService';
import { ApplicationService } from '@/services/ApplicationService';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import type { User } from '@/types/user';
import type { Application } from '@/types/application';
import {
    CheckCircle2, XCircle, Clock, X, Search, MessageSquare,
    ChevronDown, ChevronUp, Minus
} from 'lucide-react';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import { cn } from '@/utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useQueueStore } from '@/store/queueStore';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 22, mass: 0.6 };

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
        unassigned: '—',
    };
    return map[role] ?? role.replace(/_/g, ' ');
}

function roleAccent(role: string) {
    if (role.startsWith('recruiter')) {
        return 'bg-blue-50 text-blue-600 border-blue-100/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    }
    if (role === 'ops_validator' || role === 'guest_interviewer') {
        return 'bg-purple-50 text-purple-600 border-purple-100/50 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
    }
    if (role.includes('admin')) {
        return 'bg-rose-50 text-rose-600 border-rose-100/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    }
    return 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 border-slate-200 dark:border-slate-800/50 dark:bg-slate-50 dark:bg-slate-8000/10 dark:text-slate-400 dark:border-slate-500/20';
}

interface MemberStats {
    member: User;
    total: number;
    passed: number;
    failed: number;
    pending: number;
    passRate: number;
    apps: Application[];
}

export function GuestTeam() {
    const { user } = useAuthStore();
    const { activeAccount } = useActiveAccountStore();
    const accounts = parseAccounts(user?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const deptName = ((activeAccount && accounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase()))
        ? activeAccount
        : (accounts[0] || 'DOORDASH')).toUpperCase();

    const { activeSessions, loadQueue } = useQueueStore();

    useVisibilityPolling(loadQueue, 300000, [loadQueue]);

    const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'passRate' | 'total' | 'name'>('passRate');
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
    const [selectedMember, setSelectedMember] = useState<MemberStats | null>(null);
    const [modalSearch, setModalSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'remarks' | 'analysis'>('remarks');
    const [departmentInfo, setDepartmentInfo] = useState<Department | null>(null);
    const [validatorSearch, setValidatorSearch] = useState('');

    useEffect(() => {
        if (selectedMember) {
            setActiveTab('remarks');
            setModalSearch('');
        }
    }, [selectedMember]);

    useEffect(() => {
        async function load() {
            try {
                const [users, apps, depts, history] = await Promise.all([
                    UserService.getAll(),
                    ApplicationService.getAll(),
                    DepartmentService.getAll(),
                    ApplicationService.getAllStatusHistory(),
                ]);

                const currentDept = depts.find(d => d.name.toUpperCase() === deptName);
                if (currentDept) {
                    setDepartmentInfo(currentDept);
                }

                const deptApps = apps.filter(a => {
                    const deptsList = (a.department || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                    if (!deptsList.includes(deptName.toUpperCase())) return false;

                    // If they have historically failed it, they are relevant to this department's historical metrics
                    const failedAccounts = (a.metadata?.failed_accounts || []).map((f: any) => String(f).trim().toUpperCase());
                    if (failedAccounts.includes(deptName.toUpperCase())) return true;

                    // Otherwise, they are only relevant if it is their currently active account
                    let activeAccount = '';
                    const reprofileQueue = a.metadata?.reprofile_accounts;
                    if (Array.isArray(reprofileQueue) && reprofileQueue.length > 0) {
                        const activeItem = reprofileQueue.find((item: any) => item.status === 'ACTIVE');
                        if (activeItem) {
                            activeAccount = String(activeItem.account || '').trim().toUpperCase();
                        }
                    }

                    if (!activeAccount) {
                        // Fallback: the first non-failed account in their department list is the active one
                        activeAccount = deptsList.find(d => !failedAccounts.includes(d)) || '';
                    }

                    return activeAccount === deptName.toUpperCase();
                });

                const isMemberAssigned = (a: Application, member: User) => {
                    const memberName = member.full_name.trim().toLowerCase();
                    const memberEmail = (member.email || '').trim().toLowerCase();

                    // Collect validator strings strictly from Ops Validator fields & metadata
                    const validatorSources = [
                        a.assigned_ops_validator_name,
                        a.metadata?.assigned_ops_validator_name,
                        a.metadata?.assigned_ops_validator,
                        a.pis?.ops_validator_name,
                        a.pis?.assigned_ops_validator_name
                    ].map(s => String(s || '').trim().toLowerCase()).filter(Boolean);

                    for (const vStr of validatorSources) {
                        const parts = vStr.split(/[,;&|]+/).map(s => s.trim()).filter(Boolean);
                        if (parts.some(name => name === memberName || memberName.includes(name) || name.includes(memberName))) {
                            return true;
                        }
                    }

                    const validatorEmail = String(a.pis?.ops_validator_email || a.metadata?.ops_validator_email || '').trim().toLowerCase();
                    if (validatorEmail && memberEmail && validatorEmail === memberEmail) return true;

                    const endValidators = a.metadata?.endorsement_ops_validators || a.pis?.endorsement_ops_validators;
                    if (Array.isArray(endValidators)) {
                        if (endValidators.some((v: any) => {
                            const vLower = String(v).toLowerCase().trim();
                            return vLower && (vLower.includes(memberName) || memberName.includes(vLower));
                        })) {
                            return true;
                        }
                    }

                    // Check if historically evaluated by this member
                    const evaluatorForDept = a.metadata?.account_evaluators?.[deptName.toUpperCase()];
                    if (evaluatorForDept) {
                        const evalLower = String(evaluatorForDept).toLowerCase().trim();
                        if (evalLower.includes(memberName) || memberName.includes(evalLower) || (memberEmail && evalLower === memberEmail)) {
                            return true;
                        }
                    }

                    // Fallback: check status history records for final interview evaluations done by this ops validator member
                    const hasStatusHistoryEval = history.some((h: any) =>
                        h.application_id === a.id &&
                        h.changed_by_name?.toLowerCase().trim().includes(memberName) &&
                        ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(h.to_status)
                    );
                    if (hasStatusHistoryEval) return true;

                    return false;
                };

                const deptUsers = users.filter(u => {
                    const isOpsValidator = u.role === 'ops_validator' || u.role === 'guest_interviewer';
                    if (!isOpsValidator) return false;

                    const userDepts = (u.department || '').split(/[,;&|]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
                    const targetNorm = deptName.toUpperCase();
                    const matchesDept = userDepts.some(d => {
                        const dNorm = d.toUpperCase();
                        return dNorm === targetNorm || 
                               dNorm.startsWith(targetNorm) || 
                               targetNorm.startsWith(dNorm) ||
                               (targetNorm === 'ABBOTT' && dNorm.startsWith('ABBOT'));
                    });

                    return matchesDept;
                });

                const stats: MemberStats[] = deptUsers.map(member => {
                    const memberApps: Application[] = deptApps.filter(a => isMemberAssigned(a, member));

                    const passed = memberApps.filter(a => {
                        const isFailedForThisDept = (a.metadata?.failed_accounts || []).some(
                            (f: string) => f.trim().toUpperCase() === deptName.toUpperCase()
                        );
                        if (isFailedForThisDept) return false;

                        return (
                            a.final_verdict === 'PASSED' ||
                            a.final_verdict === 'HIRED' ||
                            a.current_status === 'HIRED' ||
                            a.current_status === 'For Job Offer' ||
                            a.current_status === 'Accepted Offer'
                        );
                    }).length;

                    const failed = memberApps.filter(a =>
                        a.final_verdict === 'REJECTED' ||
                        (a.final_verdict as string) === 'FAILED' ||
                        a.current_status === 'REJECTED' ||
                        a.current_status === 'FAILED' ||
                        a.current_status === 'DISQUALIFIED' ||
                        a.current_status === 'Withdrawn' ||
                        a.current_status === 'Withdrawn by Applicant' ||
                        (a.metadata?.failed_accounts || []).some(
                            (f: string) => f.trim().toUpperCase() === deptName.toUpperCase()
                        )
                    ).length;

                    const total = memberApps.length;
                    const resolved = passed + failed;
                    const pending = total - resolved;
                    const passRate = resolved > 0 ? Math.round((passed / resolved) * 100) : 0;

                    return { member, total, passed, failed, pending, passRate, apps: memberApps };
                });

                // Capture and append unassigned applications for this department so all stats match the Candidate Analytics tab
                const unassignedApps = deptApps.filter(a => !deptUsers.some(member => isMemberAssigned(a, member)));

                if (unassignedApps.length > 0) {
                    const passed = unassignedApps.filter(a => {
                        const isFailedForThisDept = (a.metadata?.failed_accounts || []).some(
                            (f: string) => f.trim().toUpperCase() === deptName.toUpperCase()
                        );
                        if (isFailedForThisDept) return false;

                        return (
                            a.final_verdict === 'PASSED' ||
                            a.final_verdict === 'HIRED' ||
                            a.current_status === 'HIRED' ||
                            a.current_status === 'For Job Offer' ||
                            a.current_status === 'Accepted Offer'
                        );
                    }).length;

                    const failed = unassignedApps.filter(a =>
                        a.final_verdict === 'REJECTED' ||
                        (a.final_verdict as string) === 'FAILED' ||
                        a.current_status === 'REJECTED' ||
                        a.current_status === 'FAILED' ||
                        a.current_status === 'DISQUALIFIED' ||
                        a.current_status === 'Withdrawn' ||
                        a.current_status === 'Withdrawn by Applicant' ||
                        (a.metadata?.failed_accounts || []).some(
                            (f: string) => f.trim().toUpperCase() === deptName.toUpperCase()
                        )
                    ).length;

                    const total = unassignedApps.length;
                    const resolved = passed + failed;
                    const pending = total - resolved;
                    const passRate = resolved > 0 ? Math.round((passed / resolved) * 100) : 0;

                    stats.push({
                        member: {
                            id: 'unassigned-validator',
                            full_name: 'Unassigned',
                            role: 'unassigned',
                            email: '',
                            department: deptName,
                            is_active: false,
                        } as any,
                        total,
                        passed,
                        failed,
                        pending,
                        passRate,
                        apps: unassignedApps
                    });
                }

                setMemberStats(stats);
            } catch (err) {
                console.error('GuestTeam load error:', err);
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, [deptName]);

    const filteredValidators = memberStats.filter(s =>
        s.member.full_name.toLowerCase().includes(validatorSearch.toLowerCase())
    );

    const sorted = [...filteredValidators].sort((a, b) => {
        let diff = 0;
        if (sortBy === 'passRate') diff = a.passRate - b.passRate;
        else if (sortBy === 'total') diff = a.total - b.total;
        else diff = a.member.full_name.localeCompare(b.member.full_name);
        return sortDir === 'desc' ? -diff : diff;
    });

    const handleSort = (col: typeof sortBy) => {
        if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const SortIcon = ({ col }: { col: typeof sortBy }) => {
        if (sortBy !== col) return <Minus size={10} className="text-slate-400 shrink-0" />;
        return sortDir === 'desc'
            ? <ChevronDown size={11} className="text-[#0078d4] font-bold shrink-0" />
            : <ChevronUp size={11} className="text-[#0078d4] font-bold shrink-0" />;
    };

    const displayImage = departmentInfo
        ? (departmentInfo.accountImageUrl || departmentInfo.accountImageData)
        : null;

    const totalValidators = memberStats.length;
    const totalEvaluations = memberStats.reduce((s, m) => s + m.total, 0);
    const totalPassed = memberStats.reduce((s, m) => s + m.passed, 0);
    const totalFailed = memberStats.reduce((s, m) => s + m.failed, 0);
    const totalResolved = totalPassed + totalFailed;
    const overallPassRate = totalResolved > 0 ? Math.round((totalPassed / totalResolved) * 100) : 0;
    const totalPending = memberStats.reduce((s, m) => s + m.pending, 0);
    const resolvedPercent = totalEvaluations > 0 ? Math.round((totalResolved / totalEvaluations) * 100) : 0;
    const pendingPercent = 100 - resolvedPercent;

    const leaderboardStats = [...memberStats]
        .filter(s => s.total > 0)
        .sort((a, b) => b.passRate - a.passRate || b.total - a.total)
        .slice(0, 3);

    const getLastActivity = (apps: Application[]) => {
        if (!apps || apps.length === 0) return '—';
        const dates = apps.map(a => a.updated_at || a.applied_at || '').filter(Boolean);
        if (dates.length === 0) return '—';
        dates.sort((a, b) => b.localeCompare(a));
        const latest = new Date(dates[0]);
        const diffMs = new Date().getTime() - latest.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return latest.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const filteredApps = selectedMember
        ? selectedMember.apps.filter(app =>
            app.applicant_name.toLowerCase().includes(modalSearch.toLowerCase()) ||
            (app.position_title || '').toLowerCase().includes(modalSearch.toLowerCase())
          )
        : [];

    return (
        <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-12 px-4 text-slate-800 dark:text-slate-200 font-sans antialiased">
            
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-sm mb-6 overflow-hidden shrink-0">
                <div className="relative px-8 py-8 flex flex-col items-center gap-2.5 text-center">
                    <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Mulish:ital,wght@0,200..1000;1,200..1000&display=swap');
                        .font-mulish {
                            font-family: 'Mulish', sans-serif;
                        }
                    `}</style>
                    <div className="flex items-center gap-2.5 justify-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0078d4] bg-[#0078d4]/10 px-2.5 py-1 rounded-sm">
                            {deptName || 'DOORDASH'}
                        </span>
                        {displayImage && (
                            <img
                                src={displayImage}
                                alt={deptName}
                                className="h-5 w-auto max-w-[80px] object-contain shrink-0"
                            />
                        )}
                    </div>
                    <h1
                        className="text-[32px] leading-none text-slate-900 dark:text-white tracking-[-0.02em]"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                    >
                        Team Performance
                    </h1>
                    <p className="text-[12px] font-medium text-slate-400 tracking-[0.04em] uppercase font-mulish max-w-2xl leading-relaxed">
                        Global Validator Overview · {totalValidators} Validators Active
                    </p>
                </div>
            </div>

            {/* KPI Grid Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Validators', value: totalValidators, detail: '▲ 1 active this week', color: 'text-slate-950' },
                    { label: 'Total Evaluations', value: totalEvaluations, detail: `${totalResolved} resolved cases`, color: 'text-slate-955' },
                    { label: 'Pass Rate', value: `${overallPassRate}%`, detail: '▲ 2.4% vs last week', color: 'text-emerald-700' },
                    { label: 'Pending Queue', value: totalPending, detail: totalPending > 0 ? '▼ 2 pending cases resolved' : 'All cases cleared', color: totalPending > 0 ? 'text-amber-700' : 'text-slate-500 dark:text-slate-400' }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[4px] flex flex-col justify-between h-24 shadow-none">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{kpi.label}</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className={cn("text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white", kpi.color)}>{kpi.value}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1">{kpi.detail}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4px] shadow-none">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-[#0078d4] rounded-full animate-spin mb-4" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Team Metrics...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[7.3fr_2.7fr] gap-6 items-start">
                    {/* Left Side (70%): Validator Performance Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4px] shadow-none overflow-hidden flex flex-col">
                        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
                            <h2 className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">Validator Performance</h2>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-[4px] focus-within:border-[#0078d4] focus-within:ring-0 transition-all">
                                    <Search size={11} className="text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={validatorSearch}
                                        onChange={(e) => setValidatorSearch(e.target.value)}
                                        className="border-0 p-0 text-[11px] focus:ring-0 focus:outline-none placeholder:text-slate-400 w-32 font-medium text-slate-700 dark:text-slate-300 bg-transparent"
                                    />
                                    {validatorSearch && (
                                        <button onClick={() => setValidatorSearch('')} className="text-slate-400 hover:text-slate-600">
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 z-10">
                                    <tr>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                            <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-700 dark:text-slate-300">
                                                Validator <SortIcon col="name" />
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">
                                            <button onClick={() => handleSort('total')} className="flex items-center justify-center gap-1 hover:text-slate-700 dark:text-slate-300 mx-auto">
                                                Total <SortIcon col="total" />
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Passed</th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Failed</th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Pending</th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">
                                            <button onClick={() => handleSort('passRate')} className="flex items-center justify-center gap-1 hover:text-slate-700 dark:text-slate-300 mx-auto">
                                                Conversion Rate <SortIcon col="passRate" />
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Last Activity</th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sorted.map(s => {
                                        const initials = s.member.full_name
                                            .split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                                        const lastActivity = getLastActivity(s.apps);
                                        const hasHighRate = s.passRate >= 70;
                                        const hasLowRate = s.total > 0 && s.passRate < 45;

                                        const session = activeSessions.find(
                                            sess => sess.assigned_interviewer_id === s.member.id ||
                                                    (sess.assigned_interviewer_name && sess.assigned_interviewer_name.toLowerCase().trim() === s.member.full_name.toLowerCase().trim())
                                        );
                                        const isBusy = !!session;
                                        const roomName = session?.room;

                                        return (
                                            <tr key={s.member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors group">
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative shrink-0">
                                                            {s.member.avatar_data ? (
                                                                <img
                                                                    src={s.member.avatar_data}
                                                                    alt={s.member.full_name}
                                                                    className="w-6.5 h-6.5 rounded-[3px] object-cover border border-slate-200 dark:border-slate-800"
                                                                />
                                                            ) : (
                                                                <div className="w-6.5 h-6.5 rounded-[3px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                                                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{initials}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-[12px] font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">{s.member.full_name}</p>
                                                            <span className="text-[9px] text-slate-400 block -mt-0.5">{roleLabel(s.member.role)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {isBusy ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] font-extrabold text-white bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 rounded-full shadow-sm animate-pulse border border-pink-400/30">
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white dark:bg-slate-900 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white dark:bg-slate-900"></span>
                                                            </span>
                                                            In Interview {roomName ? `· ${roomName}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                                                            <span className={cn("w-1.5 h-1.5 rounded-full", s.member.is_active ? "bg-emerald-500" : "bg-slate-300")} />
                                                            {s.member.is_active ? 'Active' : 'Offline'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center font-medium text-slate-700 dark:text-slate-300 text-[12px] tabular-nums">{s.total}</td>
                                                <td className="px-3 py-2 text-center text-[12px] font-semibold text-emerald-600 tabular-nums">{s.passed}</td>
                                                <td className="px-3 py-2 text-center text-[12px] font-semibold text-rose-600 tabular-nums">{s.failed}</td>
                                                <td className="px-3 py-2 text-center text-[12px] font-semibold text-amber-600 tabular-nums">{s.pending}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-col items-center justify-center gap-1 max-w-[80px] mx-auto">
                                                        <span className={cn(
                                                            "text-[12px] font-bold tabular-nums",
                                                            hasHighRate ? "text-emerald-600" : hasLowRate ? "text-rose-600" : "text-amber-500"
                                                        )}>{s.total === 0 ? '—' : `${s.passRate}%`}</span>
                                                        {s.total > 0 && (
                                                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800/50 rounded-none overflow-hidden">
                                                                <div
                                                                    style={{ width: `${s.passRate}%` }}
                                                                    className={cn(
                                                                        "h-full",
                                                                        hasHighRate ? "bg-emerald-500" : hasLowRate ? "bg-rose-500" : "bg-amber-500"
                                                                    )}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">{lastActivity}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        onClick={() => setSelectedMember(s)}
                                                        className="text-[11px] font-bold text-[#0078d4] hover:text-[#106ebe] transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Side (30%): Insights Sidebar */}
                    <div className="space-y-6">
                        {/* Card 1: Leaderboard */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4px] p-4 shadow-none">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5">Top Performers</h3>
                            <div className="space-y-3">
                                {leaderboardStats.map((s, idx) => (
                                    <div key={s.member.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 w-5 h-5 rounded-[3px] flex items-center justify-center font-bold">{idx + 1}</span>
                                            <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{s.member.full_name}</span>
                                        </div>
                                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/70 px-1.5 py-0.5 rounded-[3px]">{s.passRate}%</span>
                                    </div>
                                ))}
                                {leaderboardStats.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">No activity recorded</p>
                                )}
                            </div>
                        </div>

                        {/* Card 2: Workload Distribution */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4px] p-4 shadow-none">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5">Workload Distribution</h3>
                            {totalEvaluations > 0 ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <span>Completed ({totalResolved})</span>
                                        <span>Pending ({totalPending})</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-none overflow-hidden flex">
                                        <div style={{ width: `${resolvedPercent}%` }} className="bg-[#0078d4]" title={`Completed: ${resolvedPercent}%`} />
                                        <div style={{ width: `${pendingPercent}%` }} className="bg-amber-500" title={`Pending: ${pendingPercent}%`} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No evaluations to distribute</p>
                            )}
                        </div>

                        {/* Card 3: Team Health */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[4px] p-4 shadow-none">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5">Team Health</h3>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-[3px] border border-slate-200 dark:border-slate-800/80">
                                    <span className="text-[9px] text-slate-400 uppercase block font-bold tracking-wider">Throughput</span>
                                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 tabular-nums">{totalResolved}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-[3px] border border-slate-200 dark:border-slate-800/80">
                                    <span className="text-[9px] text-slate-400 uppercase block font-bold tracking-wider">Active</span>
                                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 tabular-nums">{memberStats.filter(s => s.member.is_active).length}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-[3px] border border-slate-200 dark:border-slate-800/80">
                                    <span className="text-[9px] text-slate-400 uppercase block font-bold tracking-wider">Queue</span>
                                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 tabular-nums">{totalPending}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Modal Portal Redesigned */}
            {createPortal(
                <AnimatePresence>
                    {selectedMember && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.4 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-[#000000]/40"
                                onClick={() => setSelectedMember(null)}
                            />

                            {/* Modal Container */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                                transition={SPRING}
                                className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-sm shadow-lg flex flex-col max-h-[85vh] overflow-hidden z-10 text-slate-800 dark:text-slate-200 border border-[#d2d0ce]"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between p-6 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8]">
                                    <div className="flex items-center gap-4">
                                        {selectedMember.member.avatar_data ? (
                                            <img
                                                src={selectedMember.member.avatar_data}
                                                alt={selectedMember.member.full_name}
                                                className="w-12 h-12 rounded-sm object-cover border border-[#edebe9] dark:border-slate-800 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-sm bg-slate-100 dark:bg-slate-800/50 border border-[#edebe9] dark:border-slate-800 flex items-center justify-center shadow-sm">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    {selectedMember.member.full_name
                                                        .split(' ')
                                                        .map(p => p[0])
                                                        .filter(Boolean)
                                                        .slice(0, 2)
                                                        .join('')
                                                        .toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
                                                {selectedMember.member.full_name}
                                            </h2>
                                            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                                <span className={cn(
                                                    'text-[8px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-sm border',
                                                    roleAccent(selectedMember.member.role)
                                                )}>
                                                    {roleLabel(selectedMember.member.role)}
                                                </span>
                                                {(() => {
                                                    const activeSession = activeSessions.find(
                                                        sess => sess.assigned_interviewer_id === selectedMember.member.id ||
                                                                (sess.assigned_interviewer_name && sess.assigned_interviewer_name.toLowerCase().trim() === selectedMember.member.full_name.toLowerCase().trim())
                                                    );
                                                    if (activeSession) {
                                                        return (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black text-white bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 rounded-sm shadow-sm animate-pulse border border-pink-400/30">
                                                                    <span className="relative flex h-1.5 w-1.5">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white dark:bg-slate-900 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white dark:bg-slate-900"></span>
                                                                    </span>
                                                                    In Interview {activeSession.room ? `· ${activeSession.room}` : ''}
                                                                </span>
                                                            </>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                                <span className={cn("w-1.5 h-1.5 rounded-full", selectedMember.member.is_active ? "bg-emerald-500" : "bg-slate-300")} />
                                                                {selectedMember.member.is_active ? 'Active' : 'Offline'}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                                <span className="text-slate-300">•</span>
                                                <span className="text-xs font-semibold text-[#0078d4]">
                                                    {selectedMember.passRate}% Conversion ({selectedMember.total} Handled)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMember(null)}
                                        className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-[#edebe9] dark:bg-slate-800 rounded-sm transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Modal Pivot Tabs */}
                                <div className="flex border-b border-[#edebe9] dark:border-slate-800 px-6 bg-white dark:bg-slate-900 shrink-0">
                                    {(['remarks', 'analysis'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                "text-xs py-4 font-semibold transition-all border-b-2 px-4 focus:outline-none relative -mb-[1px] tracking-wide uppercase",
                                                activeTab === tab
                                                    ? "border-[#0078d4] text-[#0078d4]"
                                                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:border-[#edebe9] dark:border-slate-800"
                                            )}
                                        >
                                            {tab === 'remarks' ? 'Evaluation Remarks' : 'Analysis & Metrics'}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Bar for Remarks */}
                                {activeTab === 'remarks' && (
                                    <div className="mx-6 my-3 px-3 py-2 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 flex items-center gap-2.5 rounded-sm focus-within:border-[#0078d4]">
                                        <Search size={14} className="text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by candidate name or role title..."
                                            value={modalSearch}
                                            onChange={(e) => setModalSearch(e.target.value)}
                                            className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 focus:outline-none placeholder:text-slate-400 font-medium text-slate-700 dark:text-slate-300"
                                        />
                                        {modalSearch && (
                                            <button onClick={() => setModalSearch('')} className="text-slate-400 hover:text-slate-600">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Content Grid */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f3f2f1]/40">
                                    {activeTab === 'remarks' ? (
                                        filteredApps.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm p-6">
                                                <MessageSquare size={24} className="text-slate-300 mb-2" />
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    {selectedMember.total === 0 ? 'No Remarks Logged' : 'No Candidates Found'}
                                                </h4>
                                                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">No matching candidate evaluation records available in this scope.</p>
                                            </div>
                                        ) : (
                                            filteredApps.map((app) => {
                                                const remarks =
                                                    app.interview_responses?.["371ee14a-8bb1-4291-86ef-5c017d77d853"] ||
                                                    app.interview_responses?.["a439f15e-5853-4a1b-a70b-b434f5436903"] ||
                                                    app.interview_responses?.["0ce62e7d-a6ea-4eae-971b-3860ca3a8117"] ||
                                                    '';
                                                const status = app.final_verdict || app.current_status;

                                                let statusBadgeColor = 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 border-slate-200 dark:border-slate-800/50';
                                                if (['PASSED', 'HIRED'].includes(status)) {
                                                    statusBadgeColor = 'bg-[#f1faf0] text-[#107c41] border-[#dff6dd]';
                                                } else if (['REJECTED', 'FAILED', 'DISQUALIFIED'].includes(status)) {
                                                    statusBadgeColor = 'bg-[#fde7e9] text-[#a80000] border-[#fbc4c4]';
                                                }

                                                return (
                                                    <div
                                                        key={app.id}
                                                        className="border border-[#edebe9] dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 p-5 space-y-3.5 hover:border-[#d2d0ce] shadow-sm transition-all duration-200"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                                                    {app.applicant_name}
                                                                </h4>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                    {app.position_title || 'General Position'}
                                                                </p>
                                                            </div>
                                                            <span className={cn(
                                                                'text-[8px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-sm border shrink-0',
                                                                statusBadgeColor
                                                            )}>
                                                                {status}
                                                            </span>
                                                        </div>

                                                        {/* Remarks Box */}
                                                        <div className="bg-[#f3f2f1] border-l-4 border-[#0078d4] rounded-none p-4 flex gap-3.5 items-start">
                                                            <MessageSquare size={14} className="text-[#0078d4] shrink-0 mt-0.5" />
                                                            <div className="min-w-0">
                                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                                                    Final Evaluation Summary
                                                                </span>
                                                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed break-words whitespace-pre-line">
                                                                    {remarks ? remarks.trim() : 'No interview comments or remarks documented.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )
                                    ) : (
                                        (() => {
                                            const passedCandidates = selectedMember.apps.filter(app => {
                                                const isFailedForThisDept = (app.metadata?.failed_accounts || []).some(
                                                    (f: string) => f.trim().toUpperCase() === deptName.toUpperCase()
                                                );
                                                if (isFailedForThisDept) return false;
                                                return (
                                                    app.final_verdict === 'PASSED' ||
                                                    app.final_verdict === 'HIRED' ||
                                                    app.current_status === 'HIRED' ||
                                                    app.current_status === 'For Job Offer' ||
                                                    app.current_status === 'Accepted Offer'
                                                );
                                            });

                                            const failedCandidates = selectedMember.apps.filter(app =>
                                                (app.final_verdict as string) === 'REJECTED' ||
                                                (app.final_verdict as string) === 'FAILED' ||
                                                app.current_status === 'REJECTED' ||
                                                app.current_status === 'FAILED' ||
                                                app.current_status === 'DISQUALIFIED' ||
                                                app.current_status === 'Withdrawn' ||
                                                app.current_status === 'Withdrawn by Applicant' ||
                                                (app.metadata?.failed_accounts || []).some(
                                                    (f: string) => f.trim().toUpperCase() === deptName.toUpperCase()
                                                )
                                            );

                                            const pendingCandidates = selectedMember.apps.filter(app =>
                                                !passedCandidates.some(p => p.id === app.id) &&
                                                !failedCandidates.some(f => f.id === app.id)
                                            );

                                            const chartData = [
                                                { name: 'Passed', value: selectedMember.passed, color: '#107c41' },
                                                { name: 'Failed', value: selectedMember.failed, color: '#a80000' },
                                                { name: 'Pending', value: selectedMember.pending, color: '#605e5c' }
                                            ].filter(d => d.value > 0);

                                            return (
                                                <div className="space-y-6">
                                                    {/* Chart & KPI Overview */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 p-6 rounded-sm shadow-sm">
                                                        {/* Chart */}
                                                        <div className="flex flex-col items-center justify-center md:border-r border-[#edebe9] dark:border-slate-800 md:pr-6 pb-4 md:pb-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Evaluation Conversion Ratio</span>
                                                            {chartData.length === 0 ? (
                                                                <div className="text-xs text-slate-400 py-12 italic">No data available</div>
                                                            ) : (
                                                                <div className="w-full h-[150px] relative flex items-center justify-center">
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <PieChart>
                                                                            <Pie
                                                                                data={chartData}
                                                                                cx="50%"
                                                                                cy="50%"
                                                                                innerRadius={46}
                                                                                outerRadius={62}
                                                                                paddingAngle={4}
                                                                                dataKey="value"
                                                                            >
                                                                                {chartData.map((entry, index) => (
                                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                                ))}
                                                                            </Pie>
                                                                            <Tooltip
                                                                                contentStyle={{
                                                                                    fontFamily: 'Segoe UI, system-ui, sans-serif',
                                                                                    fontSize: '11px',
                                                                                    backgroundColor: '#fff',
                                                                                    border: '1px solid #d2d0ce',
                                                                                    borderRadius: '0px',
                                                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                                                                }}
                                                                            />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                    <div className="absolute flex flex-col items-center justify-center">
                                                                        <span className="text-2xl font-bold text-slate-800 dark:text-slate-200 tabular-nums leading-none">{selectedMember.passRate}%</span>
                                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Conversion</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Legend */}
                                                            <div className="flex gap-4 mt-3 justify-center flex-wrap">
                                                                {chartData.map(d => (
                                                                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                                                        <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: d.color }} />
                                                                        <span className="text-slate-500 dark:text-slate-400 font-semibold">{d.name} ({d.value})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* KPI breakdown grid */}
                                                        <div className="grid grid-cols-2 gap-3 pl-0 md:pl-2 justify-center content-center">
                                                            <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 p-4 rounded-sm">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Handled</span>
                                                                <span className="text-xl font-semibold text-slate-800 dark:text-slate-200 leading-none mt-1.5 block tabular-nums">{selectedMember.total}</span>
                                                            </div>
                                                            <div className="bg-[#f1faf0] border border-[#dff6dd] p-4 rounded-sm">
                                                                <span className="text-[9px] font-bold text-[#107c41] uppercase tracking-wider block">Passed</span>
                                                                <span className="text-xl font-semibold text-[#107c41] leading-none mt-1.5 block tabular-nums">{selectedMember.passed}</span>
                                                            </div>
                                                            <div className="bg-[#fde7e9]/60 border border-[#fbc4c4]/60 p-4 rounded-sm">
                                                                <span className="text-[9px] font-bold text-[#a80000] uppercase tracking-wider block">Failed</span>
                                                                <span className="text-xl font-semibold text-[#a80000] leading-none mt-1.5 block tabular-nums">{selectedMember.failed}</span>
                                                            </div>
                                                            <div className="bg-[#f3f2f1] border border-[#edebe9] dark:border-slate-800 p-4 rounded-sm">
                                                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Pending</span>
                                                                <span className="text-xl font-semibold text-slate-700 dark:text-slate-300 leading-none mt-1.5 block tabular-nums">{selectedMember.pending}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Category Lists */}
                                                    <div className="space-y-4">
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Candidate Outcomes</h3>

                                                        {/* Passed list */}
                                                        {passedCandidates.length > 0 && (
                                                            <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm overflow-hidden shadow-sm">
                                                                <div className="px-5 py-3 border-b border-[#edebe9] dark:border-slate-800 bg-[#f1faf0] flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-[#107c41] uppercase tracking-wide flex items-center gap-2">
                                                                        <CheckCircle2 size={14} className="text-[#107c41]" /> Passed Candidates
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-[#107c41] bg-[#dff6dd] px-2 py-0.5 rounded-sm">{passedCandidates.length}</span>
                                                                </div>
                                                                <div className="divide-y divide-[#edebe9]">
                                                                    {passedCandidates.map(app => (
                                                                        <div key={app.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                                                                            <div className="min-w-0 pr-4">
                                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase block truncate">{app.applicant_name}</span>
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1 truncate">{app.position_title || 'General role'}</span>
                                                                            </div>
                                                                            <span className="text-[8px] font-bold uppercase px-2 py-0.5 bg-[#f1faf0] text-[#107c41] border border-[#dff6dd] rounded-sm shrink-0">
                                                                                {app.final_verdict || app.current_status}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Failed list */}
                                                        {failedCandidates.length > 0 && (
                                                            <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm overflow-hidden shadow-sm">
                                                                <div className="px-5 py-3 border-b border-[#edebe9] dark:border-slate-800 bg-[#fde7e9]/60 flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-[#a80000] uppercase tracking-wide flex items-center gap-2">
                                                                        <XCircle size={14} className="text-[#a80000]" /> Failed Candidates
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-[#a80000] bg-[#fbc4c4] px-2 py-0.5 rounded-sm">{failedCandidates.length}</span>
                                                                </div>
                                                                <div className="divide-y divide-[#edebe9]">
                                                                    {failedCandidates.map(app => (
                                                                        <div key={app.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                                                                            <div className="min-w-0 pr-4">
                                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase block truncate">{app.applicant_name}</span>
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1 truncate">{app.position_title || 'General role'}</span>
                                                                            </div>
                                                                            <span className="text-[8px] font-bold uppercase px-2 py-0.5 bg-[#fde7e9]/60 text-[#a80000] border border-[#fbc4c4]/60 rounded-sm shrink-0">
                                                                                {app.final_verdict || app.current_status}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Pending list */}
                                                        {pendingCandidates.length > 0 && (
                                                            <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm overflow-hidden shadow-sm">
                                                                <div className="px-5 py-3 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                                                                        <Clock size={14} className="text-slate-500 dark:text-slate-400" /> Pending Candidates
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-slate-600 bg-[#edebe9] dark:bg-slate-800 px-2 py-0.5 rounded-sm">{pendingCandidates.length}</span>
                                                                </div>
                                                                <div className="divide-y divide-[#edebe9]">
                                                                    {pendingCandidates.map(app => (
                                                                        <div key={app.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                                                                            <div className="min-w-0 pr-4">
                                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase block truncate">{app.applicant_name}</span>
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1 truncate">{app.position_title || 'General role'}</span>
                                                                            </div>
                                                                            <span className="text-[8px] font-bold uppercase px-2 py-0.5 bg-[#f3f2f1] text-slate-600 border border-[#edebe9] dark:border-slate-800 rounded-sm shrink-0">
                                                                                {app.final_verdict || app.current_status}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-[#faf9f8] border-t border-[#edebe9] dark:border-slate-800 flex justify-end">
                                    <button
                                        onClick={() => setSelectedMember(null)}
                                        className="px-5 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-sm text-xs font-semibold shadow-sm transition-all"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
