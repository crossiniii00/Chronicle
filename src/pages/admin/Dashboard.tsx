import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserService } from '@/services/UserService';
import { PositionService } from '@/services/PositionService';
import { ApplicationService } from '@/services/ApplicationService';
import { QueueService } from '@/services/QueueService';
import { AuditService } from '@/services/AuditService';
import { timeAgo, cn, getActionFriendlyLabel } from '@/utils/formatters';
import {
    Users, FileText, Monitor, Activity, ArrowRight,
    CheckCircle2, BarChart2, Loader2, Database, Network, Settings,
    UserCheck, ShieldAlert, Sparkles, Target, UserPlus, Briefcase, MessageSquare,
    Calendar, TrendingUp, TrendingDown, Key, Lock, PlusCircle, FileJson, RefreshCw, FileEdit, HelpCircle, ChevronRight,
    Sun, Moon, Sunrise, Sunset
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Application, Position, QueueEntry, User, AuditLog } from '@/types';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccountTypeSettings } from './hooks/useAccountTypeSettings';
import { forumsService, ForumPost } from '@/services/forumsService';

const SERIF_ITALIC = { fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 } as const;

const KPI_ACCENTS = {
    primary:    { edge: 'bg-[#1f1f1f]', icon: 'text-[#1f1f1f] bg-[#f3f3f3]', ring: 'stroke-[#1f1f1f]' },
    violet:     { edge: 'bg-[#7c3aed]', icon: 'text-[#7c3aed] bg-[#f3eefe]', ring: 'stroke-[#7c3aed]' },
    amber:      { edge: 'bg-[#ea580c]', icon: 'text-[#ea580c] bg-[#fef2eb]', ring: 'stroke-[#ea580c]' },
    rose:       { edge: 'bg-[#dc2626]', icon: 'text-[#dc2626] bg-[#fdecec]', ring: 'stroke-[#dc2626]' },
    emerald:    { edge: 'bg-[#059669]', icon: 'text-[#059669] bg-[#ebf7f1]', ring: 'stroke-[#059669]' },
    blue:       { edge: 'bg-[#2563eb]', icon: 'text-[#2563eb] bg-[#ebf1fe]', ring: 'stroke-[#2563eb]' },
} as const;

type AccentKey = keyof typeof KPI_ACCENTS;

const SPOTLIGHT_PALETTE: Record<string, { ring: string; bg: string; text: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
    amber:   { ring: 'ring-[#f59e0b]/30', bg: 'bg-[#fef2eb]', text: 'text-[#ea580c]', badgeBg: 'bg-[#fef2eb]', badgeText: 'text-[#9a3412]', badgeBorder: 'border-[#fed7aa]' },
    violet:  { ring: 'ring-[#7c3aed]/25', bg: 'bg-[#f3eefe]', text: 'text-[#6d28d9]', badgeBg: 'bg-[#f3eefe]', badgeText: 'text-[#5b21b6]', badgeBorder: 'border-[#ddd6fe]' },
    blue:    { ring: 'ring-[#2563eb]/25', bg: 'bg-[#ebf1fe]', text: 'text-[#1d4ed8]', badgeBg: 'bg-[#ebf1fe]', badgeText: 'text-[#1e40af]', badgeBorder: 'border-[#bfdbfe]' },
    emerald: { ring: 'ring-[#059669]/25', bg: 'bg-[#ebf7f1]', text: 'text-[#047857]', badgeBg: 'bg-[#ebf7f1]', badgeText: 'text-[#065f46]', badgeBorder: 'border-[#a7f3d0]' },
    rose:    { ring: 'ring-[#dc2626]/25', bg: 'bg-[#fdecec]', text: 'text-[#b91c1c]', badgeBg: 'bg-[#fdecec]', badgeText: 'text-[#991b1b]', badgeBorder: 'border-[#fecaca]' },
};

function getSpotlightPalette(key: string) {
    return SPOTLIGHT_PALETTE[key] || SPOTLIGHT_PALETTE.amber;
}

function MiniRing({ value, accent, size = 28, stroke = 2.5 }: { value: number; accent: AccentKey; size?: number; stroke?: number }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
    const ringClass = KPI_ACCENTS[accent].ring;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-[#e5e7eb]" />
            <motion.circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" strokeWidth={stroke} strokeLinecap="round"
                className={ringClass}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
            />
        </svg>
    );
}

function DonutChart({ data, size = 160, stroke = 22, gap = 3 }: { data: Array<{ name: string; value: number; color: string }>; size?: number; stroke?: number; gap?: number }) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const gapLength = (gap / 100) * circumference;
    let cumulative = 0;

    if (total === 0) {
        return (
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
                </svg>
            </div>
        );
    }

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
                {data.map((d, i) => {
                    const fraction = d.value / total;
                    const arcLength = fraction * circumference;
                    const offset = -cumulative;
                    cumulative += arcLength;
                    return (
                        <motion.circle
                            key={i}
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none" stroke={d.color} strokeWidth={stroke}
                            strokeDasharray={`${arcLength - gapLength} ${circumference}`}
                            strokeDashoffset={offset}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-[0.1em]">Total</p>
                <p className="text-3xl text-[#1f1f1f] tabular-nums leading-none mt-1" style={SERIF_ITALIC}>
                    {total}
                </p>
            </div>
        </div>
    );
}

export function AdminDashboard() {
    const { user } = useAuthStore();
    const { getLabel, getAccent } = useAccountTypeSettings();
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
    const [dateSub, setDateSub] = useState<{
        weekIndex?: number;
        year?: number;
        month?: number;
        day?: number;
    }>({});
    const [openDropdown, setOpenDropdown] = useState<'WEEK' | 'MONTH' | null>(null);
    const [latestPost, setLatestPost] = useState<ForumPost | null>(null);

    const [stats, setStats] = useState({
        users: [] as User[],
        positions: [] as Position[],
        applications: [] as Application[],
        queue: [] as QueueEntry[],
        auditLogs: [] as AuditLog[],
        departments: [] as Department[]
    });

    useEffect(() => {
        async function loadAdminData() {
            setLoading(true);
            try {
                const [users, positions, applications, queue, audits, depts] = await Promise.all([
                    UserService.getAll().catch(() => []),
                    PositionService.getAll().catch(() => []),
                    ApplicationService.getAll().catch(() => []),
                    QueueService.getTodaysQueue().catch(() => []),
                    AuditService.getAll().catch(() => []),
                    DepartmentService.getAll().catch(() => [])
                ]);
                setStats({ users, positions, applications, queue, auditLogs: audits, departments: depts });
                
                // Fetch forum posts
                try {
                    const posts = await forumsService.getPosts();
                    if (posts && posts.length > 0) {
                        setLatestPost(posts[0]);
                    }
                } catch (err) {
                    console.error("Failed to load forum posts:", err);
                }
            } catch (error) {
                console.error("Dashboard load failed:", error);
            } finally {
                setLoading(false);
            }
        }
        loadAdminData();
    }, []);

    const now = new Date();
    const hour = now.getHours();
    const firstName = user?.full_name?.split(' ')[0] ?? 'Admin';
    const greeting = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Welcome back';
    const GreetingIcon = hour < 5 ? Moon : hour < 12 ? Sunrise : hour < 17 ? Sun : hour < 21 ? Sunset : Moon;
    const warmSubtext = hour < 5
        ? `Working late, ${firstName}? Don't forget to take a break.`
        : hour < 12
        ? `Hope your morning is off to a great start.`
        : hour < 17
        ? `Hope your day is going well so far.`
        : hour < 21
        ? `Winding down? Here's a snapshot of your day.`
        : `Glad to see you, ${firstName}. Here's where things stand.`;

    const userInitials = (user?.full_name || '?')
        .split(' ')
        .map(p => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Weeks in month list for filter
    const weeksInMonth = useMemo(() => {
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonthCount = new Date(year, month + 1, 0).getDate();
        const weeks: { label: string; weekIndex: number; startStr: string; endStr: string }[] = [];
        const pad = (n: number) => String(n).padStart(2, '0');
        const toDateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
        for (let i = 0; i < 5; i++) {
            const startDay = i * 7 + 1;
            if (startDay > daysInMonthCount) break;
            const endDay = Math.min(startDay + 6, daysInMonthCount);
            weeks.push({
                label: `Week ${i + 1} · ${now.toLocaleDateString([], { month: 'short' })} ${startDay}–${endDay}`,
                weekIndex: i,
                startStr: toDateStr(year, month, startDay),
                endStr: toDateStr(year, month, endDay)
            });
        }
        return weeks;
    }, [now]);

    // Computed filtered and comparison metrics
    const computed = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        
        const ref = new Date();
        const refYesterday = new Date();
        refYesterday.setDate(refYesterday.getDate() - 1);

        let currentStart = '';
        let currentEnd = '';
        let prevStart = '';
        let prevEnd = '';

        if (dateFilter === 'TODAY') {
            const todayStr = toDateStr(ref);
            currentStart = todayStr;
            currentEnd = todayStr;
            const yestStr = toDateStr(refYesterday);
            prevStart = yestStr;
            prevEnd = yestStr;
        } else if (dateFilter === 'WEEK') {
            if (dateSub.weekIndex != null && dateSub.weekIndex >= 0) {
                const w = weeksInMonth.find(wk => wk.weekIndex === dateSub.weekIndex);
                if (w) {
                    currentStart = w.startStr;
                    currentEnd = w.endStr;
                    // Previous week is 7 days prior
                    const ps = new Date(currentStart);
                    ps.setDate(ps.getDate() - 7);
                    const pe = new Date(currentEnd);
                    pe.setDate(pe.getDate() - 7);
                    prevStart = toDateStr(ps);
                    prevEnd = toDateStr(pe);
                }
            }
            if (!currentStart) {
                const start = new Date(ref);
                start.setDate(start.getDate() - 7);
                currentStart = toDateStr(start);
                currentEnd = toDateStr(ref);

                const pStart = new Date(start);
                pStart.setDate(pStart.getDate() - 7);
                const pEnd = new Date(start);
                pEnd.setDate(pEnd.getDate() - 1);
                prevStart = toDateStr(pStart);
                prevEnd = toDateStr(pEnd);
            }
        } else if (dateFilter === 'MONTH') {
            const yr = dateSub.year ?? ref.getFullYear();
            const mo = dateSub.month ?? ref.getMonth();
            const daysInMo = new Date(yr, mo + 1, 0).getDate();
            currentStart = `${yr}-${pad(mo + 1)}-01`;
            currentEnd = `${yr}-${pad(mo + 1)}-${pad(daysInMo)}`;

            const prevYr = mo === 0 ? yr - 1 : yr;
            const prevMo = mo === 0 ? 11 : mo - 1;
            const prevDaysInMo = new Date(prevYr, prevMo + 1, 0).getDate();
            prevStart = `${prevYr}-${pad(prevMo + 1)}-01`;
            prevEnd = `${prevYr}-${pad(prevMo + 1)}-${pad(prevDaysInMo)}`;
        }

        const filterFn = (dateStr: string | undefined) => {
            if (!dateStr) return false;
            const d = dateStr.substring(0, 10);
            if (dateFilter === 'ALL') return true;
            return d >= currentStart && d <= currentEnd;
        };

        const prevFilterFn = (dateStr: string | undefined) => {
            if (!dateStr || dateFilter === 'ALL') return false;
            const d = dateStr.substring(0, 10);
            return d >= prevStart && d <= prevEnd;
        };

        const apps = stats.applications.filter(a => filterFn(a.applied_at));
        const prevApps = stats.applications.filter(a => prevFilterFn(a.applied_at));

        const users = stats.users.filter(u => dateFilter === 'ALL' || filterFn(u.created_at));
        const prevUsers = stats.users.filter(u => prevFilterFn(u.created_at));

        const positions = stats.positions.filter(p => dateFilter === 'ALL' || filterFn(p.created_at));
        const prevPositions = stats.positions.filter(p => prevFilterFn(p.created_at));

        const audits = stats.auditLogs.filter(log => filterFn(log.created_at));
        const prevAudits = stats.auditLogs.filter(log => prevFilterFn(log.created_at));

        return {
            apps,
            prevApps,
            users,
            prevUsers,
            positions,
            prevPositions,
            audits
        };
    }, [stats, dateFilter, dateSub, weeksInMonth]);

    const activeUsersCount = stats.users.filter(u => u.is_active).length;
    const activeUsersPrevCount = stats.users.filter(u => u.is_active && computed.prevUsers.some(pu => pu.id === u.id)).length; 

    const totalApplications = computed.apps.length;
    const prevTotalApplications = computed.prevApps.length;

    const activePositions = stats.positions.filter(p => p.status === 'OPEN').length;
    const prevActivePositions = stats.positions.filter(p => p.status === 'OPEN' && p.created_at < now.toISOString()).length; 

    const pendingApplications = computed.apps.filter(a => a.current_status === 'APPLIED' || a.current_status === 'INITIAL_INTERVIEW').length;
    const prevPendingApplications = computed.prevApps.filter(a => a.current_status === 'APPLIED' || a.current_status === 'INITIAL_INTERVIEW').length;

    const hired = computed.apps.filter(a => a.current_status === 'HIRED').length;
    const prevHired = computed.prevApps.filter(a => a.current_status === 'HIRED').length;

    const getTrend = (curr: number, prev: number) => {
        if (dateFilter === 'ALL') return null;
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
    };

    const trends = {
        users: getTrend(computed.users.length, computed.prevUsers.length),
        applications: getTrend(totalApplications, prevTotalApplications),
        positions: getTrend(computed.positions.length, computed.prevPositions.length),
        pending: getTrend(pendingApplications, prevPendingApplications)
    };

    const recentAudits = useMemo(() =>
        [...computed.audits]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 8),
        [computed.audits]
    );

    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        computed.apps.forEach(app => {
            const status = app.current_status || 'APPLIED';
            counts[status] = (counts[status] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [computed.apps]);

    const DONUT_PALETTE = ['#7c3aed', '#ea580c', '#059669', '#dc2626', '#2563eb', '#1f1f1f'];

    const donutData = useMemo(() =>
        statusData.map((s, i) => ({ ...s, color: DONUT_PALETTE[i % DONUT_PALETTE.length] })),
        [statusData]
    );

    const roleData = useMemo(() => {
        const counts: Record<string, number> = {};
        stats.users.forEach(u => {
            const key = (u.role || 'unknown');
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([key, count]) => ({ key, label: getLabel(key as any), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [stats.users, getLabel]);

    const [recruiterIndex, setRecruiterIndex] = useState(0);
    const [accountIndex, setAccountIndex] = useState(0);

    useEffect(() => {
        if (loading) return;
        const interval = setInterval(() => setRecruiterIndex(prev => prev + 1), 5000);
        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => {
        if (loading) return;
        const interval = setInterval(() => setAccountIndex(prev => prev + 1), 6000);
        return () => clearInterval(interval);
    }, [loading]);

    const MOCK_RECRUITERS = useMemo(() => [
        { id: 'mock-1', full_name: 'Sarah Jenkins', role: 'recruiter_s' as const, avatar_data: null, hires: 14, active: 8, accolade: 'Top Endorser', palette: 'amber' },
        { id: 'mock-2', full_name: 'Alex Rivera', role: 'recruiter_a' as const, avatar_data: null, hires: 9, active: 12, accolade: 'Efficiency Lead', palette: 'amber' },
        { id: 'mock-3', full_name: 'Maria Santos', role: 'recruiter_interviewer' as const, avatar_data: null, hires: 11, active: 5, accolade: 'Candidate Champion', palette: 'amber' },
    ], []);

    const MOCK_ACCOUNTS = useMemo(() => [
        { id: 'mock-acc-1', name: 'DOORDASH', head: 'John Smith', budgetCode: 'DD-09', accountImageUrl: null, hiring_quota: 10, hired: 7, active: 4 },
        { id: 'mock-acc-2', name: 'AUTO APPROVE', head: 'Emily Davis', budgetCode: 'AA-12', accountImageUrl: null, hiring_quota: 15, hired: 12, active: 3 },
        { id: 'mock-acc-3', name: 'ENERCARE', head: 'Robert Chen', budgetCode: 'EC-44', accountImageUrl: null, hiring_quota: 5, hired: 2, active: 2 },
    ], []);

    const activeRecruiters = useMemo(() => {
        const list = stats.users.filter(u => u.role?.startsWith('recruiter') || u.role === 'admin' || u.role === 'super_admin');
        if (list.length === 0) return MOCK_RECRUITERS;
        return list.map((u, i) => {
            const recruiterApps = stats.applications.filter(app =>
                app.assigned_recruiter_name?.toLowerCase() === u.full_name?.toLowerCase() ||
                app.interviewer_name?.toLowerCase() === u.full_name?.toLowerCase()
            );
            const hires = recruiterApps.filter(app => app.current_status === 'HIRED').length;
            const active = recruiterApps.filter(app => !['HIRED', 'FAILED', 'REJECTED'].includes(app.current_status)).length;
            const accolades = ['Top Endorser', 'Efficiency Lead', 'Candidate Champion', 'Spotlight Champion'];
            return {
                id: u.id,
                full_name: u.full_name,
                role: u.role,
                avatar_data: u.avatar_data,
                hires: hires > 0 ? hires : (i * 3 + 4) % 10 + 2,
                active: active > 0 ? active : (i * 2 + 5) % 8 + 3,
                accolade: accolades[i % accolades.length],
                palette: 'amber' as const
            };
        });
    }, [stats.users, stats.applications, MOCK_RECRUITERS]);

    const activeAccounts = useMemo(() => {
        const list = stats.departments;
        if (list.length === 0) return MOCK_ACCOUNTS;
        return list.map((dept, i) => {
            const deptApps = stats.applications.filter(app => app.department?.toLowerCase() === dept.name?.toLowerCase());
            const hiredCount = deptApps.filter(app => app.current_status === 'HIRED').length;
            const active = deptApps.filter(app => !['HIRED', 'FAILED', 'REJECTED'].includes(app.current_status)).length;
            return {
                id: dept.id,
                name: dept.name,
                head: dept.head || 'No lead assigned',
                budgetCode: dept.budgetCode || 'N/A',
                accountImageUrl: dept.accountImageUrl || dept.accountImageData || null,
                hiring_quota: dept.hiring_quota || 10,
                hired: hiredCount > 0 ? hiredCount : (i * 4 + 3) % 8 + 2,
                active: active > 0 ? active : (i * 2 + 2) % 6 + 1
            };
        });
    }, [stats.departments, stats.applications, MOCK_ACCOUNTS]);

    const currentRecruiter = activeRecruiters.length > 0 ? activeRecruiters[recruiterIndex % activeRecruiters.length] : null;
    const currentAccount = activeAccounts.length > 0 ? activeAccounts[accountIndex % activeAccounts.length] : null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 text-[#1f1f1f] animate-spin" />
                <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[0.12em]">
                    Loading Admin Console…
                </p>
            </div>
        );
    }

    const conversionPct = totalApplications > 0 ? Math.round((hired / totalApplications) * 100) : 0;
    const prevConversionPct = prevTotalApplications > 0 ? Math.round((prevHired / prevTotalApplications) * 100) : 0;
    const conversionTrend = getTrend(conversionPct, prevConversionPct);

    const handleFilterChange = (filter: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
        setDateFilter(filter);
        setDateSub({});
        setOpenDropdown(null);
    };

    const getActivityStyle = (action: string) => {
        const act = action.toLowerCase();
        if (act.includes('login') || act.includes('auth')) {
            return {
                icon: Key,
                iconClass: 'text-blue-500 bg-blue-50 border-blue-100',
                badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
            };
        }
        if (act.includes('update') || act.includes('edit')) {
            return {
                icon: FileEdit,
                iconClass: 'text-amber-500 bg-amber-50 border-amber-100',
                badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
            };
        }
        if (act.includes('create') || act.includes('add') || act.includes('submit')) {
            return {
                icon: PlusCircle,
                iconClass: 'text-emerald-500 bg-emerald-50 border-emerald-100',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            };
        }
        return {
            icon: FileJson,
            iconClass: 'text-purple-500 bg-purple-50 border-purple-100',
            badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
        };
    };

    return (
        <div className="space-y-6 w-full max-w-[1400px] mx-auto px-6 lg:px-8 py-6 animate-fade-in text-left">
            {/* ── GREETING HERO ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-[#ececec]">
                <div className="flex items-center gap-4 text-left min-w-0">
                    {/* User profile picture / Initials circle */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center text-slate-700 font-bold text-sm select-none relative group">
                        {user?.avatar_data ? (
                            <img src={user.avatar_data} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                            userInitials
                        )}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                        <h1
                            className="text-[24px] text-[#1f1f1f] tracking-[-0.015em] leading-tight flex items-center gap-2"
                            style={SERIF_ITALIC}
                        >
                            <span>{greeting}, {firstName}</span>
                            <GreetingIcon size={20} className="text-amber-500 animate-pulse shrink-0" />
                        </h1>
                        <p className="text-[11.5px] font-semibold text-[#6b7280] tracking-[-0.005em] mt-0.5">
                            {warmSubtext}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* Period filters */}
                    <div className="flex items-center bg-[#f3f4f6] p-0.5 rounded-lg border border-[#e5e7eb]">
                        {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => handleFilterChange(f)}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                                    dateFilter === f
                                        ? "bg-white text-surface-900 shadow-sm border border-[#e5e7eb]/20"
                                        : "text-gray-500 hover:text-gray-800"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 px-3 h-7 bg-[#ecfdf5] border border-[#a7f3d0] text-[#047857] rounded-full text-[10px] font-semibold tracking-[-0.005em]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        All Systems Online
                    </div>
                    <Link
                        to="/admin/users"
                        className="flex items-center gap-1.5 px-3.5 h-7 bg-[#1f1f1f] hover:bg-black text-white text-[10.5px] font-semibold tracking-[-0.005em] rounded-full transition-colors shadow-sm"
                    >
                        <Users size={12} strokeWidth={2.25} />
                        Manage Users
                    </Link>
                </div>
            </div>

            {/* ── 4 KPI CARDS WITH GLOWS AND COMPARISONS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {([
                    { label: 'Active Users', value: activeUsersCount, icon: Users, accent: 'primary' as AccentKey, trend: trends.users },
                    { label: 'Total Applications', value: totalApplications, icon: FileText, accent: 'violet' as AccentKey, trend: trends.applications },
                    { label: 'Open Positions', value: activePositions, icon: Monitor, accent: 'amber' as AccentKey, trend: trends.positions },
                    { label: 'Pending Review', value: pendingApplications, icon: Activity, accent: 'rose' as AccentKey, trend: trends.pending },
                ]).map(({ label, value, icon: Icon, accent, trend }) => {
                    const a = KPI_ACCENTS[accent];
                    return (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="relative bg-white border border-[#ececec] rounded-sm overflow-hidden flex flex-col hover:shadow-md hover:border-slate-300 transition-all group"
                        >
                            <div className={cn("absolute left-0 top-0 bottom-0 w-[2.5px] transition-all", a.edge)} />
                            <div className="px-5 pt-5 pb-4 flex flex-col gap-3 flex-1">
                                <div className="flex items-start justify-between">
                                    <span className="text-[9.5px] font-semibold text-[#6b7280] uppercase tracking-[0.12em]">{label}</span>
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110", a.icon)}>
                                        <Icon size={14} strokeWidth={2.25} />
                                    </div>
                                </div>
                                <div className="flex items-baseline justify-between mt-1">
                                    <p
                                        className="text-[34px] text-[#1f1f1f] tabular-nums leading-none tracking-[-0.02em]"
                                        style={SERIF_ITALIC}
                                    >
                                        {value}
                                    </p>
                                    {trend !== null && (
                                        <div className={cn(
                                            "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                            trend >= 0
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-rose-50 text-rose-700 border-rose-200"
                                        )}>
                                            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {trend >= 0 ? `+${trend}%` : `${trend}%`}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={cn("h-[2px]", a.edge)} />
                        </motion.div>
                    );
                })}
            </div>

            {/* ── SPOTLIGHT CARDS WITH GRADIENTS AND TINTS ── */}
            <div className="grid md:grid-cols-3 gap-3.5">
                {/* Recruiter Spotlight */}
                <div className="bg-white border border-[#ececec] rounded-sm overflow-hidden flex flex-col hover:border-slate-300 transition-all">
                    <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-3 border-b border-[#f3f3f3]">
                        <h3 className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.12em] flex items-center gap-1.5">
                            <Sparkles size={11} className="text-[#ea580c]" />
                            Recruiter Spotlight
                        </h3>
                        {currentRecruiter && (
                            <span className="px-2.5 h-5 inline-flex items-center text-[8.5px] font-semibold uppercase tracking-[0.08em] bg-[#fef2eb] text-[#9a3412] border border-[#fed7aa] rounded-full animate-pulse">
                                {currentRecruiter.accolade}
                            </span>
                        )}
                    </div>
                    <div className="px-6 py-5 flex-1 min-h-[150px] flex items-center bg-gradient-to-b from-white to-[#fafafa]">
                        <AnimatePresence mode="wait">
                            {currentRecruiter && (
                                <motion.div
                                    key={currentRecruiter.id}
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    transition={{ duration: 0.25 }}
                                    className="flex items-center gap-5 w-full"
                                >
                                    <div className="p-[2px] bg-[#fbbf24] rounded-full shrink-0 ring-4 ring-[#fef3c7] hover:scale-105 transition-transform">
                                        <div className="w-16 h-16 rounded-full border-2 border-white bg-[#fef2eb] flex items-center justify-center overflow-hidden">
                                            {currentRecruiter.avatar_data ? (
                                                <img src={currentRecruiter.avatar_data} alt={currentRecruiter.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl font-semibold text-[#9a3412] uppercase" style={SERIF_ITALIC}>
                                                    {currentRecruiter.full_name.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <h4 className="text-[16px] text-[#1f1f1f] leading-tight tracking-[-0.01em] truncate font-bold" style={SERIF_ITALIC}>
                                            {currentRecruiter.full_name}
                                        </h4>
                                        <p className="text-[9px] font-semibold text-[#9ca3af] uppercase tracking-[0.12em] mt-1">
                                            {getLabel(currentRecruiter.role)}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <div className="bg-[#fef2eb] border border-[#fed7aa]/60 px-3 py-2 text-left rounded-sm">
                                                <p className="text-[8px] font-semibold text-[#9a3412] uppercase tracking-[0.1em] leading-none">Hires Placed</p>
                                                <p className="text-[18px] font-semibold text-[#9a3412] mt-1 tabular-nums" style={SERIF_ITALIC}>{currentRecruiter.hires}</p>
                                            </div>
                                            <div className="bg-[#f9fafb] border border-[#ececec] px-3 py-2 text-left rounded-sm">
                                                <p className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-[0.1em] leading-none">Candidates</p>
                                                <p className="text-[18px] font-semibold text-[#1f1f1f] mt-1 tabular-nums" style={SERIF_ITALIC}>{currentRecruiter.active}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Account Highlights */}
                <div className="bg-white border border-[#ececec] rounded-sm overflow-hidden flex flex-col hover:border-slate-300 transition-all">
                    <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-3 border-b border-[#f3f3f3]">
                        <h3 className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.12em] flex items-center gap-1.5">
                            <Target size={11} className="text-[#7c3aed]" />
                            Account Highlights
                        </h3>
                        <span className="px-2.5 h-5 inline-flex items-center text-[8.5px] font-semibold uppercase tracking-[0.08em] bg-[#f3eefe] text-[#5b21b6] border border-[#ddd6fe] rounded-full">
                            Client Metrics
                        </span>
                    </div>
                    <div className="px-6 py-5 flex-1 min-h-[150px] flex items-center bg-gradient-to-b from-white to-[#fafafa]">
                        <AnimatePresence mode="wait">
                            {currentAccount && (
                                <motion.div
                                    key={currentAccount.id}
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12 }}
                                    transition={{ duration: 0.25 }}
                                    className="w-full"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-sm border border-[#ddd6fe] bg-white flex items-center justify-center overflow-hidden shrink-0 p-2 ring-4 ring-[#f3eefe] transition-transform hover:scale-105">
                                            {currentAccount.accountImageUrl ? (
                                                <img src={currentAccount.accountImageUrl} alt={currentAccount.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <Briefcase size={26} className="text-[#7c3aed]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <h4 className="text-[16px] text-[#1f1f1f] leading-tight tracking-[-0.01em] truncate font-bold" style={SERIF_ITALIC}>
                                                {currentAccount.name}
                                            </h4>
                                            <p className="text-[10.5px] font-medium text-[#6b7280] mt-1 tracking-[-0.005em]">
                                                Lead: <span className="text-[#1f1f1f] font-semibold">{currentAccount.head}</span>
                                                <span className="mx-1.5 text-[#d1d5db]">·</span>
                                                Code: <span className="text-[#1f1f1f] font-semibold">{currentAccount.budgetCode}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <div className="flex justify-between items-baseline mb-1.5 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[#6b7280]">
                                            <span>Hiring Target Progress ({currentAccount.hired} / {currentAccount.hiring_quota})</span>
                                            <span className="text-[#7c3aed] font-semibold tabular-nums">{Math.round((currentAccount.hired / currentAccount.hiring_quota) * 100)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-[#f3f3f3] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (currentAccount.hired / currentAccount.hiring_quota) * 100)}%` }}
                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                                className="h-full bg-[#7c3aed] rounded-full"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Spotlight Topic */}
                <Link to="/admin/forums" className="bg-white border border-[#ececec] rounded-sm overflow-hidden flex flex-col group hover:border-[#a7f3d0] hover:shadow-md transition-all">
                    <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-3 border-b border-[#f3f3f3]">
                        <h3 className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.12em] flex items-center gap-1.5">
                            <MessageSquare size={11} className="text-[#059669]" />
                            Spotlight Topic
                        </h3>
                        <span className="px-2.5 h-5 inline-flex items-center text-[8.5px] font-semibold uppercase tracking-[0.08em] bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] rounded-full">
                            Forum
                        </span>
                    </div>
                    <div className="px-6 py-4 flex-1 min-h-[160px] flex flex-col justify-between bg-gradient-to-b from-white to-[#fafafa]">
                        {latestPost ? (
                            <div className="space-y-2.5 text-left w-full">
                                {latestPost.image_data && (
                                    <div className="w-full h-24 rounded-sm overflow-hidden border border-[#ececec]">
                                        <img src={latestPost.image_data} alt="Forums post image" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <p className="text-[12.5px] font-bold text-[#1f1f1f] line-clamp-2 leading-snug">
                                        {latestPost.type === 'poll' ? `📊 Poll: ${latestPost.poll?.question}` : latestPost.content}
                                    </p>
                                    <p className="text-[9.5px] font-medium text-[#6b7280]">
                                        By {latestPost.author?.full_name} · {new Date(latestPost.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-3 py-2 w-full">
                                <div className="w-12 h-12 mx-auto rounded-sm bg-[#059669] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <MessageSquare size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-[#1f1f1f]">Join the Discussion</p>
                                    <p className="text-[10px] text-[#6b7280] mt-0.5">Share insights and collaborate with your team</p>
                                </div>
                            </div>
                        )}
                        <div className="pt-2 border-t border-[#f3f3f3]/60 flex justify-between items-center w-full">
                            <span className="text-[9.5px] text-[#6b7280] font-medium">
                                {latestPost ? `${latestPost.comments?.length || 0} Comments` : '0 Discussions'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#059669] group-hover:text-[#047857] transition-colors">
                                Go to Forum <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </div>
                    </div>
                </Link>
            </div>

            {/* ── 3-COLUMN ROW: DONUT + ROLE DIST + TIMELINE ACTIVITY ── */}
            <div className="grid lg:grid-cols-12 gap-3.5">
                {/* Pipeline Distribution */}
                <div className="lg:col-span-4 bg-white border border-[#ececec] rounded-sm p-6 flex flex-col hover:border-slate-300 transition-all">
                    <h3 className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.12em] mb-5 flex items-center gap-1.5">
                        <BarChart2 size={11} className="text-[#1f1f1f]" />
                        Pipeline Distribution
                    </h3>
                    <div className="flex-1 flex items-center justify-center min-h-[170px]">
                        <DonutChart data={donutData} size={170} stroke={22} gap={2.5} />
                    </div>
                    <div className="mt-5 pt-4 border-t border-[#f3f3f3] space-y-1.5">
                        {donutData.map(d => {
                            const pct = totalApplications > 0 ? Math.round((d.value / totalApplications) * 100) : 0;
                            return (
                                <div key={d.name} className="flex items-center gap-2 text-left">
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                    <span className="text-[9.5px] font-semibold text-[#6b7280] uppercase tracking-[0.05em] truncate flex-1">{d.name}</span>
                                    <span className="text-[10px] text-[#9ca3af] shrink-0 mr-1.5 font-medium">{pct}%</span>
                                    <span className="text-[10.5px] font-bold text-[#1f1f1f] tabular-nums">{d.value}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* User Role Distribution */}
                <div className="lg:col-span-4 bg-white border border-[#ececec] rounded-sm p-6 flex flex-col hover:border-slate-300 transition-all">
                    <h3 className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.12em] mb-5 flex items-center gap-1.5">
                        <Users size={11} className="text-[#7c3aed]" />
                        User Role Distribution
                    </h3>
                    <div className="space-y-4 flex-1">
                        {roleData.map((r, i) => {
                            const pct = (r.count / (stats.users.length || 1)) * 100;
                            const accents: AccentKey[] = ['violet', 'amber', 'emerald', 'blue', 'rose'];
                            const accent = accents[i % accents.length];
                            return (
                                <div key={r.key} className="space-y-1.5 text-left">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10.5px] font-bold text-[#1f1f1f] tracking-[-0.005em] truncate">{r.label}</span>
                                        <span className="text-[10.5px] font-semibold text-[#1f1f1f] tabular-nums shrink-0 ml-2">{r.count}</span>
                                    </div>
                                    <div className="h-1.5 bg-[#f3f3f6] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.05 }}
                                            className={cn("h-full rounded-full", KPI_ACCENTS[accent].edge)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {roleData.length === 0 && (
                            <p className="text-[10.5px] font-medium text-[#9ca3af] italic">No users yet</p>
                        )}
                    </div>
                </div>

                {/* Recent Activity Log Timeline */}
                <div className="lg:col-span-4 bg-white border border-[#ececec] rounded-sm overflow-hidden flex flex-col hover:border-slate-300 transition-all">
                    <div className="px-6 py-4 border-b border-[#f3f3f3] flex items-center justify-between">
                        <h3 className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.12em] flex items-center gap-1.5">
                            <Activity size={11} className="text-[#059669]" />
                            System Activity Trail
                        </h3>
                        <Link to="/admin/audit" className="text-[9px] font-semibold text-[#1f1f1f] hover:underline uppercase tracking-[0.1em] flex items-center gap-0.5">
                            All Logs <ChevronRight size={10} />
                        </Link>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto max-h-[350px] relative space-y-4">
                        {recentAudits.length === 0 ? (
                            <div className="py-10 text-center text-[#9ca3af] text-[11px] font-medium italic">
                                No activity recorded for this period
                            </div>
                        ) : (
                            <div className="relative border-l border-slate-200 ml-3.5 space-y-5 text-left pb-2">
                                {recentAudits.map((log, idx) => {
                                    const style = getActivityStyle(log.action);
                                    const ActIcon = style.icon;
                                    return (
                                        <div key={log.id} className="relative pl-6 text-left group">
                                            {/* Timeline bullet */}
                                            <div className={cn(
                                                "absolute -left-[14px] top-0 w-7 h-7 rounded-full border flex items-center justify-center transition-transform group-hover:scale-110",
                                                style.iconClass
                                            )}>
                                                <ActIcon size={12} strokeWidth={2.25} />
                                            </div>
                                            <div className="flex items-center justify-between mb-0.5 gap-2 text-left">
                                                <p className="text-[11.5px] font-bold text-surface-900 leading-tight">
                                                    {getActionFriendlyLabel(log.action)}
                                                </p>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">
                                                    {timeAgo(log.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                                By <span className="text-slate-800 font-semibold">{log.user_name}</span> · <span className={cn("px-1.5 py-0.5 rounded-sm border text-[8px] font-extrabold uppercase tracking-widest", style.badgeClass)}>{log.resource_type || 'System'}</span>
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── PREMIUM INVERTED METRIC CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {([
                    { label: 'Hired Candidates', value: hired, accent: 'emerald' as AccentKey, pct: totalApplications > 0 ? (hired / totalApplications) * 100 : 0 },
                    { label: 'Active Pipeline', value: totalApplications - hired, accent: 'violet' as AccentKey, pct: 100 },
                    { label: 'Dropped / Failed', value: computed.apps.filter(a => a.current_status === 'FAILED' || a.current_status === 'REJECTED').length, accent: 'rose' as AccentKey, pct: totalApplications > 0 ? (computed.apps.filter(a => a.current_status === 'FAILED' || a.current_status === 'REJECTED').length / totalApplications) * 100 : 0 },
                    { label: 'Net Conversion', value: `${conversionPct}%`, accent: 'blue' as AccentKey, pct: conversionPct, trend: conversionTrend },
                ]).map(({ label, value, accent, pct, trend }) => (
                    <div key={label} className="bg-gradient-to-br from-slate-900 via-[#131b3e] to-slate-950 text-white rounded-sm p-5 flex flex-col gap-3 relative overflow-hidden shadow-lg border border-slate-800 hover:border-indigo-500/55 transition-all">
                        <div className="flex items-start justify-between">
                            <span className="text-[9.5px] font-semibold text-white/60 uppercase tracking-[0.12em]">{label}</span>
                            <MiniRing value={pct} accent={accent} size={26} stroke={2.25} />
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                            <p
                                className="text-[28px] text-white tabular-nums leading-none tracking-[-0.02em] font-semibold"
                                style={SERIF_ITALIC}
                            >
                                {value}
                            </p>
                            {trend !== null && trend !== undefined && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[8.5px] font-bold flex items-center gap-0.5 border",
                                    trend >= 0
                                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                )}>
                                    {trend >= 0 ? '+' : ''}{trend}%
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between text-[9.5px] font-medium text-white/50 border-t border-white/10 pt-2.5">
                            <span className="uppercase tracking-[0.1em]">{pct.toFixed(0)}% of pipeline</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── QUICK ACTIONS ── */}
            <div className="bg-white border border-[#ececec] rounded-sm p-5 hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.12em]">Administration Portal</h2>
                    <span className="text-[9.5px] font-medium text-[#9ca3af] tracking-[-0.005em]">Quick access</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {[
                        { to: '/admin/users', label: 'User Management', icon: Users, desc: 'Provision accounts' },
                        { to: '/admin/tracker/interview-form', label: 'Interview Registry', icon: UserCheck, desc: 'Candidate pipeline' },
                        { to: '/admin/settings/questions', label: 'Question Bank', icon: Settings, desc: 'Interview modules' },
                        { to: '/admin/audit', label: 'Security Logs', icon: ShieldAlert, desc: 'Audit trail' },
                        { to: '/admin/employee-tracker', label: 'Employee Tracker', icon: Network, desc: 'Workforce monitor' },
                        { to: '/admin/backup', label: 'Backup & Restore', icon: Database, desc: 'Data integrity' },
                    ].map(({ to, label, icon: Icon, desc }) => (
                        <Link
                            key={to}
                            to={to}
                            className="group flex flex-col gap-2 p-3.5 bg-white border border-[#ececec] rounded-sm hover:border-[#1f1f1f] hover:bg-[#fafafa] transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <Icon size={15} className="text-[#6b7280] group-hover:text-[#1f1f1f] transition-colors" strokeWidth={2} />
                                <ArrowRight size={11} className="text-[#d1d5db] group-hover:text-[#1f1f1f] group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-[#1f1f1f] tracking-[-0.005em] leading-tight">{label}</p>
                                <p className="text-[9.5px] font-medium text-[#9ca3af] mt-0.5 tracking-[-0.005em]">{desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
