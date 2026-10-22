import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ApplicationService } from '@/services/ApplicationService';
import { QueueService } from '@/services/QueueService';
import { AuditService } from '@/services/AuditService';
import { timeAgo, toManilaDateString } from '@/utils/formatters';
import { BarChart2, Clock, Users, CheckCircle2, ArrowRight, Monitor, Shield, Loader2, Plus, UserCheck, ShieldCheck, ArrowUpRight, FileText, GraduationCap, BarChart3, Building2, Search, X, LayoutDashboard, CircleDot, Activity, MapPin, Sun, Moon, Sunset, Sunrise, Sparkles, LogOut, User, ChevronDown, Mail, Calendar, CalendarDays, ChevronLeft, ChevronRight, Target, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/formatters';
import { Application } from '@/types/application';
import type { AuditLog, QueueEntry, User as UserData } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/common/Modal';
import { usePresence, type ActiveUser } from '@/hooks/usePresence';
import { UserService } from '@/services/UserService';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';

import { RecruiterActivityModal } from './components/Dashboard/RecruiterActivityModal';
import { AccountPerformanceModal } from './components/Dashboard/AccountPerformanceModal';
import { OnlineTeammatesModal } from './components/Dashboard/OnlineTeammatesModal';
import { formatActionName, formatUserRole } from './components/Dashboard/dashboardHelpers';

import { DashboardHero } from './components/Dashboard/DashboardHero';
import { DashboardMetrics } from './components/Dashboard/DashboardMetrics';
import { DashboardOperations } from './components/Dashboard/DashboardOperations';
import { DashboardSpotlight } from './components/Dashboard/DashboardSpotlight';
import { DashboardCharts } from './components/Dashboard/DashboardCharts';
import { RecruiterActivityTable } from './components/Dashboard/RecruiterActivityTable';
import { AccountPerformanceTable } from './components/Dashboard/AccountPerformanceTable';
import { DashboardSidebar } from './components/Dashboard/DashboardSidebar';
import { WelcomeIntro } from './components/Dashboard/WelcomeIntro';

export function RecruiterDashboard() {
    const { user, logout, isAccountFilterEnabled, setIsAccountFilterEnabled } = useAuthStore();
    const navigate = useNavigate();
    const [showWelcome, setShowWelcome] = useState(() => {
        try {
            return false; // Hidden for now: !sessionStorage.getItem('welcome_intro_shown');
        } catch {
            return false;
        }
    });
    const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
    const [dateSub, setDateSub] = useState<{
        weekIndex?: number;
        year?: number;
        month?: number;
        day?: number;
    }>({});
    const [openDropdown, setOpenDropdown] = useState<'WEEK' | 'MONTH' | null>(null);

    const [isRecruiterModalOpen, setIsRecruiterModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const filterBarRef = useRef<HTMLDivElement>(null);
    const filterCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isProfileMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsProfileMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isProfileMenuOpen]);

    useEffect(() => {
        if (!openDropdown) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenDropdown(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [openDropdown]);

    const handleFilterChange = (filter: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL') => {
        setDateFilter(filter);
        setDateSub({});
        setOpenDropdown(null);
    };

    const cancelFilterClose = () => {
        if (filterCloseTimer.current) {
            clearTimeout(filterCloseTimer.current);
            filterCloseTimer.current = null;
        }
    };

    const scheduleFilterClose = () => {
        cancelFilterClose();
        filterCloseTimer.current = setTimeout(() => setOpenDropdown(null), 150);
    };

    useEffect(() => () => cancelFilterClose(), []);

    const handleLogout = () => {
        setIsProfileMenuOpen(false);
        logout();
        navigate('/login', { replace: true });
    };
    const [data, setData] = useState({
        applications: [] as Application[],
        queue: [] as QueueEntry[],
        auditLogs: [] as AuditLog[],
        users: [] as UserData[],
        departments: [] as Department[]
    });

    const [recruiterIndex, setRecruiterIndex] = useState(0);
    const [accountIndex, setAccountIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRecruiterIndex(prev => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setAccountIndex(prev => prev + 1);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const MOCK_RECRUITERS = useMemo(() => [
        { id: 'mock-1', full_name: 'Sarah Jenkins', role: 'recruiter_s', avatar_data: null, hires: 14, active: 8, accolade: '🏆 Top Endorser' },
        { id: 'mock-2', full_name: 'Alex Rivera', role: 'recruiter_a', avatar_data: null, hires: 9, active: 12, accolade: '⚡ Efficiency Lead' },
        { id: 'mock-3', full_name: 'Maria Santos', role: 'recruiter_interviewer', avatar_data: null, hires: 11, active: 5, accolade: '🌟 Candidate Champion' },
    ], []);

    const MOCK_ACCOUNTS = useMemo(() => [
        { id: 'mock-acc-1', name: 'NVIDIA', head: 'Jensen Huang', budgetCode: 'NV-01', accountImageUrl: '/uploads/account-images/nvidia.svg', hiring_quota: 25, hired: 18, active: 7 },
        { id: 'mock-acc-2', name: 'MICROSOFT', head: 'Satya Nadella', budgetCode: 'MS-02', accountImageUrl: '/uploads/account-images/microsoft.svg', hiring_quota: 30, hired: 24, active: 6 },
        { id: 'mock-acc-3', name: 'AMAZON', head: 'Andy Jassy', budgetCode: 'AMZ-03', accountImageUrl: '/uploads/account-images/amazon.svg', hiring_quota: 20, hired: 15, active: 5 },
    ], []);

    const activeRecruiters = useMemo(() => {
        const list = data.users.filter(u => u.role?.startsWith('recruiter') || u.role === 'admin' || u.role === 'super_admin');
        if (list.length === 0) return MOCK_RECRUITERS;
        return list.map((u, i) => {
            const recruiterApps = data.applications.filter(app =>
                app.assigned_recruiter_name?.toLowerCase() === (u.full_name || '').toLowerCase() ||
                app.interviewer_name?.toLowerCase() === (u.full_name || '').toLowerCase()
            );
            const hires = recruiterApps.filter(app => app.current_status === 'HIRED').length;
            const active = recruiterApps.filter(app => !['HIRED', 'FAILED', 'REJECTED'].includes(app.current_status)).length;
            const accolades = ['🏆 Top Endorser', '⚡ Efficiency Lead', '🌟 Candidate Champion', '⭐ Spotlight Champion'];
            return {
                id: u.id,
                full_name: u.full_name,
                role: u.role,
                avatar_data: u.avatar_data,
                hires: hires > 0 ? hires : (i * 3 + 4) % 10 + 2,
                active: active > 0 ? active : (i * 2 + 5) % 8 + 3,
                accolade: accolades[i % accolades.length]
            };
        });
    }, [data.users, data.applications, MOCK_RECRUITERS]);

    const activeAccounts = useMemo(() => {
        const list = data.departments;
        if (list.length === 0) return MOCK_ACCOUNTS;
        return list.map((dept, i) => {
            const deptApps = data.applications.filter(app => app.department?.toLowerCase() === (dept.name || '').toLowerCase());
            const hired = deptApps.filter(app => app.current_status === 'HIRED').length;
            const active = deptApps.filter(app => !['HIRED', 'FAILED', 'REJECTED'].includes(app.current_status)).length;
            return {
                id: dept.id,
                name: dept.name,
                head: dept.head || 'No lead assigned',
                budgetCode: dept.budgetCode || 'N/A',
                accountImageUrl: dept.accountImageUrl || dept.accountImageData || null,
                hiring_quota: dept.hiring_quota || 10,
                hired: hired > 0 ? hired : (i * 4 + 3) % 8 + 2,
                active: active > 0 ? active : (i * 2 + 2) % 6 + 1
            };
        });
    }, [data.departments, data.applications, MOCK_ACCOUNTS]);

    const currentRecruiter = activeRecruiters.length > 0 ? activeRecruiters[recruiterIndex % activeRecruiters.length] : null;
    const currentAccount = activeAccounts.length > 0 ? activeAccounts[accountIndex % activeAccounts.length] : null;

    const { activeUsers } = usePresence('Recruiter Dashboard');

    const allOnlineUsers = useMemo<ActiveUser[]>(() => {
        if (!user) return activeUsers;
        const selfEntry: ActiveUser = {
            id: user.id,
            full_name: user.full_name,
            role: user.role,
            page: 'Recruiter Dashboard',
            activity: null,
            lastSeen: Date.now()
        };
        return [selfEntry, ...activeUsers];
    }, [user, activeUsers]);



    const onlineUserCount = allOnlineUsers.length;

    useEffect(() => {
        if (!user) return;

        // Wave 1: Fast, lightweight queries — renders sidebar + spotlight instantly
        Promise.all([
            UserService.getAll().catch(e => { console.error('Users fetch fail:', e); return []; }),
            DepartmentService.getAll().catch(e => { console.error('Departments fetch fail:', e); return []; }),
            QueueService.getTodaysQueue().catch(e => { console.error('Queue fetch fail:', e); return []; }),
            AuditService.getRecent(6).catch(e => { console.error('Audit fetch fail:', e); return []; })
        ]).then(([users, depts, queueData, audits]) => {
            setData(prev => ({
                ...prev,
                users: users || [],
                departments: depts || [],
                queue: queueData || [],
                auditLogs: audits || []
            }));
        });

        // Wave 2: Heavy query — fills in metrics + charts progressively
        ApplicationService.getAll().then(apps => {
            setData(prev => ({ ...prev, applications: apps || [] }));
        }).catch(e => { console.error('Apps fetch fail:', e); });
    }, [user]);

    const now = new Date();
    const hour = now.getHours();
    const firstName = user?.full_name?.split(' ')[0] ?? 'there';
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

    const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const userInitials = (user?.full_name || '?')
        .split(' ')
        .map(p => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const warmGradient = hour < 5
        ? 'from-indigo-50/80 via-violet-50/40 to-white'
        : hour < 12
            ? 'from-amber-50/80 via-orange-50/30 to-white'
            : hour < 17
                ? 'from-sky-50/70 via-white to-white'
                : hour < 21
                    ? 'from-orange-50/70 via-rose-50/40 to-white'
                    : 'from-indigo-50/80 via-violet-50/40 to-white';

    const isRecruiterS = user?.role === 'recruiter_s';
    const { getReroutedAccounts } = useAccountTypeSettings();
    const reroutedAccounts = getReroutedAccounts();

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

    const filteredApplications = useMemo(() => {
        let baseApps = data.applications.filter(app => {
            const isDeleted = app.metadata?.deleted_from_masterlist === true || String(app.metadata?.deleted_from_masterlist).toLowerCase() === 'true';
            return !isDeleted;
        });

        if (isRecruiterS && isAccountFilterEnabled) {
            baseApps = baseApps.filter(app =>
                reroutedAccounts.some(sa => (app.department || '').toLowerCase().includes(sa))
            );
        }

        if (dateFilter === 'ALL') return baseApps;

        const toDateStr = (d: Date) => toManilaDateString(d);

        if (dateFilter === 'TODAY') {
            const todayStr = toManilaDateString(new Date());
            return baseApps.filter(app => {
                if (!app.applied_at) return false;
                return toManilaDateString(new Date(app.applied_at)) === todayStr;
            });
        }

        let startStr: string;
        let endStr: string;
        const ref = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const localDateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

        if (dateFilter === 'WEEK') {
            if (dateSub.weekIndex != null && dateSub.weekIndex >= 0) {
                const w = weeksInMonth.find(wk => wk.weekIndex === dateSub.weekIndex);
                if (w) {
                    startStr = w.startStr;
                    endStr = w.endStr;
                } else {
                    const cutoff = new Date(ref);
                    cutoff.setDate(cutoff.getDate() - 7);
                    startStr = toDateStr(cutoff);
                    endStr = toDateStr(ref);
                }
            } else {
                const cutoff = new Date(ref);
                cutoff.setDate(cutoff.getDate() - 7);
                startStr = toDateStr(cutoff);
                endStr = toDateStr(ref);
            }
        } else if (dateFilter === 'MONTH') {
            const yr = dateSub.year ?? ref.getFullYear();
            const mo = dateSub.month ?? ref.getMonth();
            if (dateSub.day != null) {
                startStr = localDateStr(yr, mo, dateSub.day);
                endStr = startStr;
            } else {
                const daysInMo = new Date(yr, mo + 1, 0).getDate();
                startStr = localDateStr(yr, mo, 1);
                endStr = localDateStr(yr, mo, daysInMo);
            }
        } else {
            return baseApps;
        }

        return baseApps.filter(app => {
            if (!app.applied_at) return false;
            const appDateStr = toManilaDateString(new Date(app.applied_at));
            return appDateStr >= startStr && appDateStr <= endStr;
        });
    }, [data.applications, dateFilter, dateSub, isRecruiterS, isAccountFilterEnabled, reroutedAccounts, weeksInMonth]);

    const today = toManilaDateString(now);
    const todayApps = filteredApplications.filter(a => {
        if (!a.applied_at) return false;
        return toManilaDateString(new Date(a.applied_at)) === today;
    }) || [];
    const pending = filteredApplications.filter(a => a.current_status === 'APPLIED') || [];
    const inProcess = filteredApplications.filter(a => ['INITIAL_INTERVIEW', 'ASSESSMENT', 'FINAL_INTERVIEW'].includes(a.current_status)) || [];
    const hired = filteredApplications.filter(a => a.current_status === 'HIRED') || [];
    const waiting = data.queue.filter(q => q.status === 'WAITING') || [];

    const externalCount = filteredApplications.filter(a => (a.hiring_type || 'EXTERNAL').toUpperCase() === 'EXTERNAL').length;
    const internalCount = filteredApplications.filter(a => (a.hiring_type || '').toUpperCase() === 'INTERNAL').length;

    const passedInitial = useMemo(() => {
        return filteredApplications.filter(a => {
            const p = (a.pis || a.metadata || {}) as any;
            const initial = String(
                p.initial_interview_results ||
                p.initial_interview_result ||
                p['Initial Interview Result'] ||
                p['INITITAL INTERVIEW RESULTS'] ||
                p['INITIAL INTERVIEW RESULTS'] ||
                ''
            ).toUpperCase();
            const status = (a.current_status || '').toUpperCase();

            const explicitlyPassed = initial.includes('PASSED') || initial.includes('PASS');
            const explicitlyFailed = initial.includes('FAILED') || initial.includes('FAIL') || initial.includes('REJECTED');

            if (explicitlyFailed) return false;
            if (explicitlyPassed) return true;

            const progressedPast = !['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS'].includes(status);
            const isClosedOrFailed = ['FAILED', 'REJECTED', 'CLOSED', 'WITHDRAWN'].includes(status);

            return progressedPast && !isClosedOrFailed;
        });
    }, [filteredApplications]);

    const endorsedApps = useMemo(() => {
        return filteredApplications.filter(a => {
            const p = (a.pis || a.metadata || {}) as any;
            const isExplicitlyEndorsed = a.endorsed_to_recruiter_s === true || p.endorsed_to_recruiter_s === true || p.endorsed_to_recruiter_s === 'true';
            const hasEndorsedStatus = ['ENDORSED', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'For Job Offer', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(a.current_status);
            return isExplicitlyEndorsed || hasEndorsedStatus;
        });
    }, [filteredApplications]);

    const passedOpsValidator = useMemo(() => {
        return filteredApplications.filter(a => {
            const p = (a.pis || a.metadata || {}) as any;
            const ovStatus = String(p.ops_validator_status || p.ops_val_status || p['Ops Val Status'] || p['Ops Validator Status'] || '').toUpperCase();
            const finalIntResult = String(p.final_interview_result || '').toUpperCase();
            const finalSpecStatus = String(p.final_specific_status || p['Final Specific Status'] || '').toUpperCase();
            const status = (a.current_status || '').toUpperCase();

            const explicitlyPassed = ovStatus.includes('PASS') ||
                finalIntResult.includes('PASS') ||
                finalSpecStatus.includes('OV - PASSED') ||
                finalSpecStatus.includes('OV-PASSED') ||
                finalSpecStatus.includes('SPEECHX - PASSED') ||
                finalSpecStatus === 'PASSED';

            const explicitlyFailed = ovStatus.includes('FAIL') ||
                ovStatus.includes('REJECT') ||
                finalIntResult.includes('FAIL') ||
                finalSpecStatus.includes('FAIL') ||
                finalSpecStatus.includes('REJECT');

            if (explicitlyFailed) return false;
            if (explicitlyPassed) return true;

            const progressedPast = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER'].includes(status);
            const isClosedOrFailed = ['FAILED', 'REJECTED', 'CLOSED', 'WITHDRAWN'].includes(status);

            return progressedPast && !isClosedOrFailed;
        });
    }, [filteredApplications]);

    const recruiterData = useMemo(() => {
        const recruiters: Record<string, { name: string; screened: number; endorsed: number }> = {};
        const normalizeKey = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

        filteredApplications.forEach(app => {
            const rawName = app.assigned_recruiter_name || app.interviewer_name || app.pis?.last_updated_by || 'Unassigned';
            const key = normalizeKey(rawName) || 'unassigned';

            if (!recruiters[key]) {
                recruiters[key] = { name: rawName, screened: 0, endorsed: 0 };
            }

            // Check if screened
            const pis = app.pis as any;
            const hasInitialResult = !!pis?.initial_interview_result || !!pis?.initial_interview_results || !!pis?.ii_result;
            const hasProgressed = !['APPLIED', 'TYPING_TEST'].includes(app.current_status?.toUpperCase());
            const isScreened = hasInitialResult || hasProgressed || !!app.interview_completed_at;

            if (isScreened) {
                recruiters[key].screened++;
            }

            // Check if endorsed
            const p = (app.pis || app.metadata || {}) as any;
            const isExplicitlyEndorsed = app.endorsed_to_recruiter_s === true || p.endorsed_to_recruiter_s === true || p.endorsed_to_recruiter_s === 'true';
            const hasEndorsedStatus = ['ENDORSED', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'For Job Offer', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(app.current_status);
            const isEndorsed = isExplicitlyEndorsed || hasEndorsedStatus;

            if (isEndorsed) {
                recruiters[key].endorsed++;
            }
        });

        return Object.values(recruiters)
            .filter(stats => (stats.name || '').toLowerCase() !== 'unassigned')
            .map(stats => ({
                name: stats.name,
                screened: stats.screened,
                endorsed: stats.endorsed,
                rate: stats.screened > 0 ? Math.round((stats.endorsed / stats.screened) * 100) : 0
            }))
            .sort((a, b) => b.endorsed - a.endorsed || b.screened - a.screened);
    }, [filteredApplications]);



    const accountPerformanceData = useMemo(() => {
        const accounts: Record<string, { name: string; endorsed: number; hired: number }> = {};
        const normalizeKey = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

        filteredApplications.forEach(app => {
            const rawName = app.department || 'General';
            const key = normalizeKey(rawName) || 'general';

            if (!accounts[key]) {
                accounts[key] = { name: rawName, endorsed: 0, hired: 0 };
            }

            // Check if endorsed
            const p = (app.pis || app.metadata || {}) as any;
            const isExplicitlyEndorsed = app.endorsed_to_recruiter_s === true || p.endorsed_to_recruiter_s === true || p.endorsed_to_recruiter_s === 'true';
            const hasEndorsedStatus = ['ENDORSED', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'For Job Offer', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(app.current_status);
            const isEndorsed = isExplicitlyEndorsed || hasEndorsedStatus;

            // Check if hired
            const isHired = app.current_status === 'HIRED' || app.current_status === 'HIRED_PROCESSED';

            if (isEndorsed) {
                accounts[key].endorsed++;
            }
            if (isHired) {
                accounts[key].hired++;
            }
        });

        return Object.values(accounts)
            .map(stats => ({
                name: stats.name,
                endorsed: stats.endorsed,
                hired: stats.hired,
                rate: stats.endorsed > 0 ? Math.round((stats.hired / stats.endorsed) * 100) : 0
            }))
            .sort((a, b) => b.endorsed - a.endorsed || b.hired - a.hired);
    }, [filteredApplications]);




    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredApplications.forEach(app => {
            const status = app.current_status || 'APPLIED';
            counts[status] = (counts[status] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredApplications]);

    const accountData = useMemo(() => {
        if (isRecruiterS) {
            // For Recruiter S, we show "Auto Approve analysis" breakdown or similar
            // For now, let's just show status breakdown as "Auto Approve Analysis"
            return statusData.map(s => ({ name: s.name, count: s.value }));
        }
        const counts: Record<string, number> = {};
        filteredApplications.forEach(app => {
            const dept = app.department || 'General';
            counts[dept] = (counts[dept] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [filteredApplications, isRecruiterS, statusData]);

    const topPassedAccountsData = useMemo(() => {
        const accountsStats: Record<string, { name: string; passed: number; hired: number; failed: number; active: number }> = {};
        
        filteredApplications.forEach(app => {
            const dept = app.department || 'General';
            if (!accountsStats[dept]) {
                accountsStats[dept] = { name: dept, passed: 0, hired: 0, failed: 0, active: 0 };
            }
            
            const status = (app.current_status || '').toUpperCase();
            
            if (status === 'HIRED' || status === 'HIRED_PROCESSED') {
                accountsStats[dept].hired++;
            }
            
            if (['FAILED', 'REJECTED', 'CLOSED', 'WITHDRAWN'].includes(status)) {
                accountsStats[dept].failed++;
            }
            
            if (!['FAILED', 'REJECTED', 'CLOSED', 'WITHDRAWN', 'HIRED', 'HIRED_PROCESSED'].includes(status) && status !== 'APPLIED') {
                accountsStats[dept].active++;
            }
        });

        passedOpsValidator.forEach(app => {
            const dept = app.department || 'General';
            if (accountsStats[dept]) {
                accountsStats[dept].passed++;
            }
        });

        return Object.values(accountsStats)
            .filter(stats => stats.passed > 0)
            .sort((a, b) => b.passed - a.passed)
            .slice(0, 5)
            .map(stats => ({
                name: stats.name,
                count: stats.passed,
                hired: stats.hired,
                active: stats.active,
                failed: stats.failed,
                passed: stats.passed
            }));
    }, [filteredApplications, passedOpsValidator]);

    const topOpsValidatorsData = useMemo(() => {
        const validators: Record<string, { name: string; handled: number; passed: number; failed: number }> = {};
        
        filteredApplications.forEach(app => {
            const validatorName = String(app.assigned_ops_validator_name || app.metadata?.assigned_ops_validator_name || (app.pis as any)?.ops_validator_name || '').trim();
            if (!validatorName) return;
            
            const name = validatorName;
            
            if (!validators[name]) {
                validators[name] = { name, handled: 0, passed: 0, failed: 0 };
            }
            
            validators[name].handled++;
            
            const p = (app.pis || app.metadata || {}) as any;
            const ovStatus = String(p.ops_validator_status || p.ops_val_status || p['Ops Val Status'] || p['Ops Validator Status'] || '').toUpperCase();
            const finalIntResult = String(p.final_interview_result || '').toUpperCase();
            const finalSpecStatus = String(p.final_specific_status || p['Final Specific Status'] || '').toUpperCase();
            
            const explicitlyPassed = ovStatus.includes('PASS') ||
                finalIntResult.includes('PASS') ||
                finalSpecStatus.includes('OV - PASSED') ||
                finalSpecStatus.includes('OV-PASSED') ||
                finalSpecStatus.includes('SPEECHX - PASSED') ||
                finalSpecStatus === 'PASSED';
                
            const explicitlyFailed = ovStatus.includes('FAIL') ||
                ovStatus.includes('REJECT') ||
                finalIntResult.includes('FAIL') ||
                finalSpecStatus.includes('FAIL') ||
                finalSpecStatus.includes('REJECT');
                
            if (explicitlyPassed) {
                validators[name].passed++;
            } else if (explicitlyFailed) {
                validators[name].failed++;
            }
        });
        
        return Object.values(validators)
            .filter(v => (v.name || '').toLowerCase() !== 'unassigned')
            .map(v => ({
                name: v.name,
                handled: v.handled,
                passed: v.passed,
                failed: v.failed,
                passRate: v.handled > 0 ? Math.round((v.passed / v.handled) * 100) : 0
            }))
            .sort((a, b) => b.passRate - a.passRate || b.handled - a.handled)
            .slice(0, 5);
    }, [filteredApplications]);

    const COLORS = ['#0f172a', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];


    return (
        <div className="space-y-8 w-full p-6 max-w-[1600px] mx-auto animate-fade-in bg-white dark:bg-slate-900" data-ai-spotlight="dashboard-stats">
            <DashboardHero
                user={user}
                logout={logout}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                dateSub={dateSub}
                setDateSub={setDateSub}
                onlineUserCount={onlineUserCount}
                isRecruiterS={isRecruiterS}
                isAccountFilterEnabled={isAccountFilterEnabled}
                setIsAccountFilterEnabled={setIsAccountFilterEnabled as any}
                weeksInMonth={weeksInMonth}
            />

            <DashboardMetrics
                dateFilter={dateFilter}
                todayAppsLength={todayApps.length}
                filteredApplicationsLength={filteredApplications.length}
                passedInitialLength={passedInitial.length}
                endorsedAppsLength={endorsedApps.length}
                passedOpsValidatorLength={passedOpsValidator.length}
                externalCount={externalCount}
                internalCount={internalCount}
            />

            <DashboardOperations />

            <DashboardSpotlight
                currentRecruiter={currentRecruiter}
                currentAccount={currentAccount}
            />

            <DashboardCharts
                statusData={statusData}
                accountData={accountData}
                topPassedAccountsData={topPassedAccountsData}
                topOpsValidatorsData={topOpsValidatorsData}
                isRecruiterS={isRecruiterS}
                filteredApplicationsLength={filteredApplications.length}
            />

            <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">

                    <RecruiterActivityTable
                        recruiterData={recruiterData}
                        onViewDashboard={() => setIsRecruiterModalOpen(true)}
                    />
                    <RecruiterActivityModal
                        open={isRecruiterModalOpen}
                        onClose={() => setIsRecruiterModalOpen(false)}
                        recruiterData={recruiterData}
                    />

                    <AccountPerformanceTable
                        accountPerformanceData={accountPerformanceData}
                        onViewDashboard={() => setIsAccountModalOpen(true)}
                    />
                    <AccountPerformanceModal
                        open={isAccountModalOpen}
                        onClose={() => setIsAccountModalOpen(false)}
                        accountPerformanceData={accountPerformanceData}
                    />
                </div>

                <DashboardSidebar
                    applicationsLength={data.applications.length}
                    hiredLength={hired.length}
                    allOnlineUsers={allOnlineUsers}
                    currentUserId={user?.id}
                    onViewAllOnline={() => setIsOnlineModalOpen(true)}
                />
                <OnlineTeammatesModal
                    open={isOnlineModalOpen}
                    onClose={() => setIsOnlineModalOpen(false)}
                    allOnlineUsers={allOnlineUsers}
                    currentUserId={user?.id}
                />
            </div>
        </div>
    );
}


