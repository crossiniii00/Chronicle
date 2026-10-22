import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { WeekDropdown } from '@/pages/recruiter/components/Dashboard/WeekDropdown';
import { MonthDropdown } from '@/pages/recruiter/components/Dashboard/MonthDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    CheckCircle,
    XCircle,
    Star,
    Target,
    MessageSquare,
    Award,
    Bookmark,
    Clock,
    LayoutDashboard,
    X,
    Search,
    Sparkles,
    Moon,
    Sunrise,
    Sun,
    Sunset,
    ArrowRight,
    History,
    Building2,
    ChevronDown
} from 'lucide-react';
import type { Application } from '@/types/application';
import { useAuthStore } from '@/store/authStore';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import { useToast } from '@/components/common/useToast';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';
import { checkValidatorAssignment, AnimatedNumber, isMatchingAccount } from './dashboardUtils';
import { formatDate, cn } from '@/utils/formatters';

export function FinalInterviewDashboard() {
    const { user: authUser } = useAuthStore();
    const { activeAccount, setActiveAccount } = useActiveAccountStore();
    const navigate = useNavigate();
    const [applications, setApplications] = useState<Application[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [departmentInfo, setDepartmentInfo] = useState<Department | null>(null);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { error, success } = useToast();
    const [selectedMetricCard, setSelectedMetricCard] = useState<'active' | 'passed' | 'failed' | 'rate' | null>(null);
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [isEditingQuota, setIsEditingQuota] = useState(false);
    const [tempQuota, setTempQuota] = useState(0);
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
    const [viewScope, setViewScope] = useState<'MY' | 'TEAM'>('MY');
    const [dateSub, setDateSub] = useState<{
        weekIndex?: number;
        year?: number;
        month?: number;
        day?: number;
    }>({});
    const [openDropdown, setOpenDropdown] = useState<'WEEK' | 'MONTH' | null>(null);
    const filterBarRef = useRef<HTMLDivElement>(null);
    const filterCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const now = useMemo(() => new Date(), []);

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

    // Parse user's assigned accounts
    const accounts = useMemo(() => parseAccounts(authUser?.department), [authUser?.department]);
    const hasMultipleAccounts = accounts.length > 1;

    // Determine the active department name to filter by
    const departmentName = useMemo(() => {
        if (activeAccount && accounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase())) {
            return activeAccount;
        }
        return accounts[0] || 'DOORDASH';
    }, [activeAccount, accounts]);

    // Auto-set active account on first load if not set or invalid
    useEffect(() => {
        if (accounts.length > 0) {
            if (!activeAccount || !accounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase())) {
                setActiveAccount(accounts[0]);
            }
        }
    }, [accounts, activeAccount, setActiveAccount]);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [fetchedApps, fetchedPositions, fetchedDepts] = await Promise.all([
                ApplicationService.getAll(),
                PositionService.getAll(),
                DepartmentService.getAll().catch(() => [])
            ]);
            setApplications(fetchedApps);
            setPositions(fetchedPositions);
            setAllDepartments(fetchedDepts || []);

            const currentDept = fetchedDepts.find((d: any) => d.name.toUpperCase() === departmentName.toUpperCase());
            if (currentDept) {
                setDepartmentInfo(currentDept);
            }
        } catch (err) {
            error('Registry Sync Failed', 'Failed to synchronize workspace statistics.');
        } finally {
            setIsLoading(false);
        }
    }, [error, departmentName]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // Update departmentInfo when activeAccount changes
    useEffect(() => {
        if (allDepartments.length > 0) {
            const currentDept = allDepartments.find((d: any) => d.name.toUpperCase() === departmentName.toUpperCase());
            if (currentDept) setDepartmentInfo(currentDept);
            else setDepartmentInfo(null);
        }
    }, [departmentName, allDepartments]);

    // Filter by the currently active account and selected date range
    const deptFilteredApps = useMemo(() => {
        let baseApps = applications.filter(a =>
            isMatchingAccount(a, departmentName)
        );

        if (dateFilter === 'ALL') return baseApps;

        const toDateStr = (d: Date) => d.toISOString().substring(0, 10);

        if (dateFilter === 'TODAY') {
            const todayStr = toDateStr(new Date());
            return baseApps.filter(app => app.applied_at?.startsWith(todayStr));
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
            const appDateStr = app.applied_at?.substring(0, 10);
            if (!appDateStr) return false;
            return appDateStr >= startStr && appDateStr <= endStr;
        });
    }, [applications, departmentName, dateFilter, dateSub, weeksInMonth]);

    const isActuallyAssignedValidator = (app: Application) => {
        if (!authUser) return false;
        const metadata = app.metadata || {};
        const assignedId = String(app.assigned_ops_validator_id || metadata.assigned_ops_validator_id || '').trim();
        const assignedName = String(app.assigned_ops_validator_name || metadata.assigned_ops_validator_name || (app as any).pis?.ops_validator_name || '').trim().toLowerCase();
        const validatorEmail = String((app as any).pis?.ops_validator_email || metadata.ops_validator_email || '').trim().toLowerCase();

        const userEmail = String(authUser.email || '').trim().toLowerCase();
        const userName = String(authUser.full_name || '').trim().toLowerCase();
        const userId = String(authUser.id || authUser.uuid || '').trim();

        const matchesId = userId && assignedId === userId;
        const matchesEmail = userEmail && validatorEmail === userEmail;
        const matchesName = userName && assignedName.includes(userName);

        return Boolean(matchesId || matchesEmail || matchesName);
    };

    const isAssignedToCurrentValidator = (app: Application) => {
        if (authUser?.role === 'ops_validator' || (authUser?.role && (authUser.role.startsWith('custom') || authUser.role.startsWith('custom_')))) {
            return isMatchingAccount(app, departmentName);
        }
        return isActuallyAssignedValidator(app) && isMatchingAccount(app, departmentName);
    };

    // Filter based on selected viewScope (My Candidates vs Team Candidates)
    const dashboardFilteredApps = useMemo(() => {
        if (viewScope === 'MY') {
            return deptFilteredApps.filter(isActuallyAssignedValidator);
        }
        return deptFilteredApps.filter(isAssignedToCurrentValidator);
    }, [deptFilteredApps, viewScope, authUser, departmentName]);

    // Active Queue Candidates (Tab 1: Interview schedules)
    const activeCandidates = dashboardFilteredApps.filter(a => {
        const isFailedForActiveAccount = a.metadata?.failed_accounts?.some(
            (f: string) => f.trim().toLowerCase() === departmentName.trim().toLowerCase()
        );
        if (isFailedForActiveAccount) return false;

        const hasMeetingDate = !!a.endorsement_meeting_date;
        const hasValidator = !!(a.assigned_ops_validator_id || a.assigned_ops_validator_name || a.metadata?.assigned_ops_validator_id || a.metadata?.assigned_ops_validator_name);
        if (!hasMeetingDate || !hasValidator) return false;

        const statusUpper = String(a.current_status || '').toUpperCase();

        const currentLower = String(a.current_status || '').toLowerCase();
        const overallLower = String(a.overall_status || '').toLowerCase();
        const opsValLower = String(a.metadata?.ops_validator_status || (a as any).pis?.ops_validator_status || '').toLowerCase();
        const isRescheduled = (
            a.current_status === 'FINAL_INTERVIEW_SCHEDULED' ||
            a.current_status === 'RESCHEDULED' ||
            String(a.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String((a as any).pis?.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String(a.metadata?.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String(a.metadata?.ops_validator_status || '').toUpperCase().includes('RESCHEDULE') ||
            String((a as any).pis?.ops_validator_status || '').toUpperCase().includes('RESCHEDULE')
        );

        const isNoShow = !isRescheduled && (
            currentLower.includes('no show') || currentLower.includes('no_show') || currentLower.includes('noshow')
            || overallLower.includes('no show') || overallLower.includes('no_show') || overallLower.includes('noshow')
            || opsValLower.includes('no show') || opsValLower.includes('no_show') || opsValLower.includes('noshow')
            || String(a.final_verdict || '').toLowerCase().includes('no show')
        );

        if (isNoShow) return false;

        const isActiveStatus = [
            'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'ENDORSED', 'ACCOUNT_ASSIGNMENT'
        ].includes(statusUpper) || (statusUpper === 'QUEUE_ASSIGNED' && a.queue_type === 'FINAL');

        return isActiveStatus;
    });

    // Past Candidates (Tab 2: Interview Records)
    const pastCandidates = dashboardFilteredApps.filter(a => {
        const statusUpper = String(a.current_status || '').toUpperCase();

        const currentLower = String(a.current_status || '').toLowerCase();
        const overallLower = String(a.overall_status || '').toLowerCase();
        const opsValLower = String(a.metadata?.ops_validator_status || (a as any).pis?.ops_validator_status || '').toLowerCase();

        const isRescheduled = (
            a.current_status === 'FINAL_INTERVIEW_SCHEDULED' ||
            a.current_status === 'RESCHEDULED' ||
            String(a.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String((a as any).pis?.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String(a.metadata?.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String(a.metadata?.ops_validator_status || '').toUpperCase().includes('RESCHEDULE') ||
            String((a as any).pis?.ops_validator_status || '').toUpperCase().includes('RESCHEDULE')
        );

        const isNoShow = !isRescheduled && (
            currentLower.includes('no show') || currentLower.includes('no_show') || currentLower.includes('noshow')
            || overallLower.includes('no show') || overallLower.includes('no_show') || overallLower.includes('noshow')
            || opsValLower.includes('no show') || opsValLower.includes('no_show') || opsValLower.includes('noshow')
            || String(a.final_verdict || '').toLowerCase().includes('no show')
        );

        if (isNoShow) return false;

        const isPast = [
            'PASSED', 'FAILED', 'HIRED', 'HIRED_PROCESSED', 'REJECTED',
            'FINAL_VERDICT', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW',
            'FOR_JOB_OFFER', 'FOR JOB OFFER', 'FOR_PAN', 'FOR PAN',
            'CONTRACT_SENT', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'WITHDRAWN',
            'DISQUALIFIED', 'NOT_ELIGIBLE_FOR_REHIRE'
        ].includes(statusUpper);

        const specUpper = String(a.final_specific_status || (a as any).pis?.final_specific_status || a.metadata?.final_specific_status || a.metadata?.['Specific Status'] || '').toUpperCase();
        const finalResultUpper = String(a.metadata?.final_interview_result || (a as any).pis?.final_interview_result || '').toUpperCase();

        const hasOpsValFinished = [
            'PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER',
            'FOR_JOB_OFFER', 'FOR JOB OFFER', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW',
            'FOR_PAN', 'FOR PAN', 'CONTRACT_SENT'
        ].includes(statusUpper) || ['PASSED', 'FAILED'].includes(opsValLower.toUpperCase()) || ['PASSED', 'FAILED'].includes(finalResultUpper) || specUpper.includes('OV -') || specUpper.includes('OPERATIONS VALIDATOR') || specUpper.includes('FINAL INTERVIEW');

        const hasSchedule = !!(a.endorsement_meeting_date || a.metadata?.endorsement_meeting_date || (a as any).pis?.endorsement_meeting_date);

        return isPast && hasOpsValFinished && hasSchedule;
    });

    // No Show Candidates (Tab 3: Interview No Show)
    const noShowCandidates = dashboardFilteredApps.filter(a => {
        const currentLower = String(a.current_status || '').toLowerCase();
        const overallLower = String(a.overall_status || '').toLowerCase();
        const opsValLower = String(a.metadata?.ops_validator_status || (a as any).pis?.ops_validator_status || '').toLowerCase();
        const specLower = String(a.final_specific_status || (a as any).pis?.final_specific_status || a.metadata?.final_specific_status || '').toLowerCase();

        const isRescheduled = (
            a.current_status === 'FINAL_INTERVIEW_SCHEDULED' ||
            a.current_status === 'RESCHEDULED' ||
            String(a.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String((a as any).pis?.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String(a.metadata?.final_specific_status || '').toUpperCase().includes('RESCHEDULE') ||
            String(a.metadata?.ops_validator_status || '').toUpperCase().includes('RESCHEDULE') ||
            String((a as any).pis?.ops_validator_status || '').toUpperCase().includes('RESCHEDULE')
        );

        const isNoShow = !isRescheduled && (
            currentLower.includes('no show') || currentLower.includes('no_show') || currentLower.includes('noshow')
            || overallLower.includes('no show') || overallLower.includes('no_show') || overallLower.includes('noshow')
            || opsValLower.includes('no show') || opsValLower.includes('no_show') || opsValLower.includes('noshow')
            || specLower.includes('no show') || specLower.includes('no_show') || specLower.includes('noshow')
            || String(a.final_verdict || '').toLowerCase().includes('no show')
        );

        return isNoShow;
    });

    // Passed Verdicts inside Interview Records Tab
    const passedCandidates = pastCandidates.filter(a => {
        const isFailedForThisDept = (a.metadata?.failed_accounts || []).some(
            (f: string) => f.trim().toUpperCase() === departmentName.toUpperCase()
        );
        if (isFailedForThisDept) return false;

        const status = a.final_verdict || a.current_status;
        const statusUpper = String(status || '').toUpperCase();
        return [
            'PASSED', 'HIRED', 'HIRED_PROCESSED', 'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW', 'FINAL_VERDICT', 'FOR_JOB_OFFER', 'FOR JOB OFFER',
            'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'FOR_PAN', 'FOR PAN', 'CONTRACT_SENT'
        ].includes(statusUpper);
    });

    // Failed Verdicts inside Interview Records Tab
    const failedCandidates = pastCandidates.filter(a => {
        const isFailedForThisDept = (a.metadata?.failed_accounts || []).some(
            (f: string) => f.trim().toUpperCase() === departmentName.toUpperCase()
        );
        if (isFailedForThisDept) return true;

        const status = a.final_verdict || a.current_status;
        const statusUpper = String(status || '').toUpperCase();
        return [
            'FAILED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN',
            'WITHDRAWN BY APPLICANT', 'NOT_ELIGIBLE_FOR_REHIRE'
        ].includes(statusUpper);
    });

    const totalConcluded = passedCandidates.length + failedCandidates.length;
    const passRate = totalConcluded > 0 ? Math.round((passedCandidates.length / totalConcluded) * 100) : 0;

    // Quota Discovery
    const internalPos = positions.find((p: any) =>
        p.department?.trim().toUpperCase() === departmentName.toUpperCase() &&
        p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA')
    );
    const databaseQuota = internalPos ? Number(internalPos.hiring_quota) : 15; // default 15 if not set
    const passedCandidatesForQuota = dashboardFilteredApps.filter(a => {
        const status = a.final_verdict || a.current_status;
        const statusUpper = String(status || '').toUpperCase();
        return [
            'PASSED', 'HIRED', 'HIRED_PROCESSED', 'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW', 'FINAL_VERDICT', 'FOR_JOB_OFFER', 'FOR JOB OFFER',
            'ACCEPTED_OFFER', 'ACCEPTED OFFER'
        ].includes(statusUpper);
    });
    const remainingSlots = Math.max(0, databaseQuota - passedCandidatesForQuota.length);
    const attainment = databaseQuota > 0 ? Math.round((passedCandidatesForQuota.length / databaseQuota) * 100) : 0;

    const latestPassedCandidate = passedCandidates && passedCandidates.length > 0 ? passedCandidates[0] : null;

    const handleUpdateQuota = async (newQuota: number) => {
        try {
            if (internalPos) {
                await PositionService.update(internalPos.id, { hiring_quota: newQuota });
                success('Quota Updated', `Department hiring quota adjusted to ${newQuota}.`);
            } else {
                await PositionService.add({
                    title: `[INTERNAL] ${departmentName} Quota`,
                    department: departmentName,
                    qualifications: 'ACCOUNT_INTERNAL_QUOTA',
                    hiring_quota: newQuota,
                    status: 'OPEN',
                    employment_type: 'Full-time'
                });
                success('Quota Created', `Department hiring quota initialized to ${newQuota}.`);
            }
            void loadData();
        } catch (err) {
            error('Update Failed', 'Failed to update department hiring quota.');
        }
    };

    // Greeting setup
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const GreetingIcon = hour < 6 ? Moon : hour < 12 ? Sunrise : hour < 17 ? Sun : Sunset;
    const greetingEmoji = hour < 12 ? '🌅☕' : hour < 17 ? '☀️👋' : '🌙✨';

    const QUOTES = [
        "Quality is not an act, it is a habit. Let's find the best fit today! 🎯",
        "Every candidate has a unique story. Happy evaluating! 🌟",
        "Efficiency meets excellence. Time to clear the queue! ⚡",
        "Focus on building great teams. Great teams build great products! 🤝",
        "Precision in selection, empathy in evaluation. Let's go! 🚀",
        "Success begins with the right people in the right seats. 💎"
    ];

    const randomQuote = useMemo(() => {
        const day = new Date().getDate();
        return QUOTES[day % QUOTES.length];
    }, []);

    // Upcoming schedules (scheduled for today)
    const todayStr = new Date().toISOString().substring(0, 10);
    const upcomingSchedules = activeCandidates.filter(c => {
        const schedTime = (c as any).scheduled_time || (c.metadata as any)?.scheduled_time || (c.pis as any)?.scheduled_time;
        if (!schedTime) return false;
        return String(schedTime).substring(0, 10) === todayStr;
    });

    // Recent activity history (last 5 concluded candidates sorted by updated_at)
    const recentActivity = [...passedCandidates, ...failedCandidates]
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
        .slice(0, 5);

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Registry...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 p-6 animate-fade-in text-left">
            {/* Warm Welcome Hero Banner */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative z-10 rounded-sm border border-surface-200 bg-white dark:bg-slate-900 shadow-sm"
            >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-50 to-transparent blur-2xl" />
                    <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-blue-50 to-transparent blur-3xl" />
                </div>

                <div className="relative p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full shadow-md overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                            <span className="text-xl font-bold text-blue-600">
                                {authUser?.full_name?.split(' ').map(n => n[0]).join('') || 'OV'}
                            </span>
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-bold uppercase tracking-[0.1em] text-blue-600">
                                    <Sparkles size={9} className="text-blue-500 animate-pulse" />
                                    Validator Dashboard
                                </span>
                            </div>
                            <h1
                                className="text-2xl md:text-[32px] text-surface-900 tracking-tight leading-none"
                                style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                            >
                                {greeting}, {authUser?.full_name?.split(' ')[0] || 'Validator'} {greetingEmoji}
                            </h1>
                            <p className="text-[12px] text-surface-500 mt-2 font-medium">
                                Account validation console for <span className="font-bold text-surface-700">{departmentName.toUpperCase()}</span>.
                                <span className="block mt-1.5 text-surface-400 italic font-normal text-[11px]">"{randomQuote}"</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Account Switcher Toggle */}
                        {hasMultipleAccounts && (
                            <div className="relative">
                                <button
                                    onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left min-w-[180px] group"
                                >
                                    <Building2 size={14} className="text-blue-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-[8px] font-bold text-surface-400 uppercase tracking-widest leading-none">Active Account</span>
                                        <span className="block text-[12px] font-bold text-surface-800 tracking-tight mt-0.5 truncate">{departmentName.toUpperCase()}</span>
                                    </div>
                                    <ChevronDown size={14} className={cn(
                                        "text-surface-400 transition-transform duration-200 shrink-0",
                                        accountDropdownOpen && "rotate-180"
                                    )} />
                                </button>
                                <AnimatePresence>
                                    {accountDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setAccountDropdownOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                                transition={{ duration: 0.12 }}
                                                className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-xl z-50 min-w-[200px] overflow-hidden"
                                            >
                                                <div className="px-3 py-2 border-b border-surface-100">
                                                    <span className="text-[8px] font-black text-surface-400 uppercase tracking-widest">Switch Account</span>
                                                </div>
                                                {accounts.map(acct => {
                                                    const isActive = acct.toUpperCase() === departmentName.toUpperCase();
                                                    return (
                                                        <button
                                                            key={acct}
                                                            onClick={() => {
                                                                setActiveAccount(acct);
                                                                setAccountDropdownOpen(false);
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all",
                                                                isActive
                                                                    ? "bg-blue-50 border-l-2 border-blue-500"
                                                                    : "hover:bg-surface-50 border-l-2 border-transparent"
                                                            )}
                                                        >
                                                            <Building2 size={13} className={cn(
                                                                isActive ? "text-blue-600" : "text-surface-400"
                                                            )} />
                                                            <span className={cn(
                                                                "text-[11px] font-semibold tracking-tight",
                                                                isActive ? "text-blue-700" : "text-surface-600"
                                                            )}>
                                                                {acct.toUpperCase()}
                                                            </span>
                                                            {isActive && (
                                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Date Filter Segmented Control */}
                        <div
                            ref={filterBarRef}
                            className="flex bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm p-1 rounded-sm border border-surface-200 relative z-30 shadow-sm"
                            onMouseLeave={scheduleFilterClose}
                        >
                            {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((filter) => {
                                const hasDropdown = filter === 'WEEK' || filter === 'MONTH';
                                const isOpen = openDropdown === filter;
                                const isActive = dateFilter === filter;
                                const subLabel =
                                    filter === 'WEEK' && dateSub.weekIndex != null && dateSub.weekIndex >= 0
                                        ? `W${dateSub.weekIndex + 1}`
                                        : filter === 'MONTH' && dateSub.month != null
                                            ? `${now.toLocaleDateString([], { month: 'short' }).toUpperCase()}${dateSub.day != null ? ` ${dateSub.day}` : ''}`
                                            : null;

                                return (
                                    <div
                                        key={filter}
                                        className="relative"
                                    >
                                        <motion.button
                                            whileTap={{ scale: 0.92 }}
                                            transition={{ type: 'spring', stiffness: 700, damping: 18 }}
                                            onClick={() => {
                                                if (hasDropdown) {
                                                    if (!isActive) setDateFilter(filter);
                                                    setOpenDropdown(isOpen ? null : filter);
                                                } else {
                                                    handleFilterChange(filter);
                                                }
                                            }}
                                            className={cn(
                                                "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest relative z-10 transition-colors duration-150 rounded-sm flex items-center gap-1 active:scale-95",
                                                isActive
                                                    ? "text-white"
                                                    : "text-surface-500 hover:text-surface-700"
                                            )}
                                        >
                                            {filter}
                                            {subLabel && (
                                                <span className={cn(
                                                    "ml-0.5 px-1.5 py-0.5 rounded-sm text-[8px] font-bold",
                                                    isActive ? "bg-white/20 dark:bg-slate-900/20 text-white" : "bg-black/5 text-surface-700"
                                                )}>
                                                    {subLabel}
                                                </span>
                                            )}
                                            {hasDropdown && (
                                                <ChevronDown size={9} className={cn("transition-transform", isOpen && "rotate-180")} />
                                            )}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="validatorActiveFilterBg"
                                                    className="absolute inset-0 bg-black shadow-sm rounded-sm z-[-1]"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 22, mass: 0.7 }}
                                                />
                                            )}
                                        </motion.button>

                                        <AnimatePresence>
                                            {filter === 'WEEK' && isOpen && (
                                                <WeekDropdown
                                                    key="week-dropdown"
                                                    weeks={weeksInMonth}
                                                    selected={dateSub.weekIndex}
                                                    onSelect={(idx) => {
                                                        setDateSub({ weekIndex: idx });
                                                        setDateFilter('WEEK');
                                                        setOpenDropdown(null);
                                                    }}
                                                    onMouseEnter={cancelFilterClose}
                                                />
                                            )}

                                            {filter === 'MONTH' && isOpen && (
                                                <MonthDropdown
                                                    key="month-dropdown"
                                                    year={dateSub.year ?? now.getFullYear()}
                                                    month={dateSub.month ?? now.getMonth()}
                                                    day={dateSub.day}
                                                    onPickMonth={(yr, mo) => setDateSub(s => ({ ...s, year: yr, month: mo, day: undefined }))}
                                                    onPickDay={(d) => {
                                                        setDateSub(s => ({ ...s, year: s.year ?? now.getFullYear(), month: s.month ?? now.getMonth(), day: d }));
                                                        setDateFilter('MONTH');
                                                        setOpenDropdown(null);
                                                    }}
                                                    onClose={() => setOpenDropdown(null)}
                                                    onMouseEnter={cancelFilterClose}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-surface-500 bg-surface-50 border border-surface-200 px-4 py-2 rounded-sm shadow-inner shrink-0">
                            <GreetingIcon size={14} className="text-amber-500" />
                            <span>Shift active</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Scope Switcher for Ops Validator */}
            <div className="flex justify-start border-b border-surface-200 gap-1 pb-px">
                <button
                    onClick={() => setViewScope('MY')}
                    className={cn(
                        "px-4 py-2 text-[11px] font-bold uppercase tracking-wider relative transition-all border-b-2 border-0 cursor-pointer bg-transparent",
                        viewScope === 'MY'
                            ? "text-blue-600 border-blue-500"
                            : "text-surface-500 border-transparent hover:text-surface-700"
                    )}
                >
                    My Candidates
                </button>
                <button
                    onClick={() => setViewScope('TEAM')}
                    className={cn(
                        "px-4 py-2 text-[11px] font-bold uppercase tracking-wider relative transition-all border-b-2 border-0 cursor-pointer bg-transparent",
                        viewScope === 'TEAM'
                            ? "text-blue-600 border-blue-500"
                            : "text-surface-500 border-transparent hover:text-surface-700"
                    )}
                >
                    Team Candidates
                </button>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { key: 'active', label: 'Active Queue', value: activeCandidates.length, icon: Calendar, color: 'text-[#0078d4]', bg: 'bg-[#eff6fc] dark:bg-slate-800/35 border border-[#edebe9] dark:border-slate-800 hover:border-[#0078d4]/40 hover:bg-[#eff6fc] dark:bg-slate-800/60' },
                    { key: 'passed', label: 'Passed Verdicts', value: passedCandidates.length, icon: CheckCircle, color: 'text-[#107c10]', bg: 'bg-[#dff6dd]/15 border border-[#edebe9] dark:border-slate-800 hover:border-[#107c10]/40 hover:bg-[#dff6dd]/30' },
                    { key: 'failed', label: 'Failed Verdicts', value: failedCandidates.length, icon: XCircle, color: 'text-[#a80000]', bg: 'bg-[#fde7e9]/15 border border-[#edebe9] dark:border-slate-800 hover:border-[#a80000]/40 hover:bg-[#fde7e9]/30' },
                    { key: 'rate', label: 'Success Rate', value: `${passRate}%`, icon: Star, color: 'text-[#b15c00]', bg: 'bg-[#fcf4e6]/20 border border-[#edebe9] dark:border-slate-800 hover:border-[#b15c00]/40 hover:bg-[#fcf4e6]/40' },
                ].map(({ key, label, value, icon: Icon, color, bg }) => (
                    <motion.div
                        key={label}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setSelectedMetricCard(key as any);
                        }}
                        className={cn("bg-white dark:bg-slate-900 p-5 rounded-sm shadow-sm border border-surface-200 flex flex-col justify-between min-h-[130px] relative overflow-hidden transition-all duration-150 cursor-pointer hover:shadow-md", bg)}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">{label}</span>
                            <div className="p-1.5 rounded-sm bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800">
                                <Icon size={14} className={color} />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[#323130] dark:text-slate-300 tracking-tight leading-none">
                                <AnimatedNumber value={value} />
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Hiring Quota Spotlight Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-white via-blue-50/10 to-emerald-50/10 border border-blue-200/60 rounded-sm p-8 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-150/10 rounded-full blur-3xl -z-10 group-hover:bg-blue-150/20 transition-colors duration-500" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-150/5 rounded-full blur-3xl -z-10 group-hover:bg-emerald-150/15 transition-colors duration-500" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-surface-200/80 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-sm border border-blue-200 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-1.5">
                            {departmentInfo && (departmentInfo.accountImageUrl || departmentInfo.accountImageData) ? (
                                <img
                                    src={departmentInfo.accountImageUrl || departmentInfo.accountImageData || ''}
                                    alt={departmentName}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <Target size={24} className="text-blue-600 animate-pulse" />
                            )}
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50/80 border border-blue-200/50 px-2.5 py-0.5 rounded-sm uppercase tracking-widest inline-flex items-center gap-1.5">
                                Account Spotlight <span className="text-blue-400">•</span> {departmentName.toUpperCase()}
                            </span>
                            <h2
                                className="text-2xl text-surface-900 tracking-tight leading-tight mt-1"
                                style={{ fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 }}
                            >
                                Hiring Quota Status
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3" />
                </div>

                {isEditingQuota && (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        void handleUpdateQuota(tempQuota);
                        setIsEditingQuota(false);
                    }} className="mb-6 flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 border border-surface-200 rounded-sm max-w-md shadow-inner">
                        <div className="flex-1 min-w-[120px]">
                            <label className="block text-[8px] font-black text-surface-400 uppercase tracking-widest mb-1.5">New Quota Target</label>
                            <input
                                type="number"
                                min="0"
                                value={tempQuota}
                                onChange={(e) => setTempQuota(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-1.5 border border-surface-200 text-xs font-semibold focus:border-blue-500 focus:ring-0 rounded-sm bg-white dark:bg-slate-900"
                                placeholder="Enter quota target..."
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 mt-4 self-end">
                            <button
                                type="submit"
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm transition-all"
                            >
                                Save Target
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditingQuota(false)}
                                className="px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-surface-700 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-8 space-y-4 text-left">
                        <div className="flex justify-between items-end text-xs font-bold text-surface-600 uppercase tracking-wider">
                            <span>Quota Attainment Progress</span>
                            <span className="text-blue-600 font-extrabold text-sm">{attainment}% Filled</span>
                        </div>
                        <div className="h-4 w-full bg-surface-150 rounded-full overflow-hidden border border-surface-200 p-0.5 shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, attainment)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-4 grid grid-cols-3 gap-3">
                        <div className="p-4 bg-white dark:bg-slate-900 border border-surface-200/80 rounded-sm text-center shadow-sm">
                            <span className="block text-[8px] font-black text-surface-400 uppercase tracking-widest">Hires Filled</span>
                            <span className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-1.5 block">
                                {passedCandidatesForQuota.length}
                            </span>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-900 border border-surface-200/80 rounded-sm text-center shadow-sm">
                            <span className="block text-[8px] font-black text-surface-400 uppercase tracking-widest">Total Quota</span>
                            <span className="text-2xl font-extrabold text-surface-800 tracking-tight mt-1.5 block">
                                {databaseQuota}
                            </span>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-900 border border-surface-200/80 rounded-sm text-center shadow-sm">
                            <span className="block text-[8px] font-black text-surface-400 uppercase tracking-widest">Remaining</span>
                            <span className="text-2xl font-extrabold text-blue-600 tracking-tight mt-1.5 block">
                                {remainingSlots}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Spotlight Grid Section */}
            <div className="space-y-4">
                <h2 className="text-[11px] font-black text-surface-450 uppercase tracking-[0.2em] font-sans text-left">
                    Dashboard Spotlights
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Operations Validator Spotlight */}
                    <div className="bg-gradient-to-br from-white via-amber-50/10 to-orange-50/5 border border-amber-200/60 rounded-sm p-6 shadow-sm flex flex-col justify-between min-h-[260px] relative overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-200/10 rounded-full blur-3xl -z-10 group-hover:bg-amber-200/25 transition-colors duration-500" />

                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-amber-100/60 mb-4">
                                <h3 className="text-[10px] font-black text-amber-750 uppercase tracking-widest flex items-center gap-1.5">
                                    <Award size={13} className="text-amber-500 animate-pulse" />
                                    Operations Validator Spotlight
                                </h3>
                                <span className="px-2 py-0.5 text-[8px] font-bold uppercase bg-amber-50 border border-amber-200 text-amber-700 tracking-wider rounded-full">
                                    Profile
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-300 p-0.5 shadow-md shrink-0">
                                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-black text-amber-650 text-base uppercase">
                                        {authUser?.full_name?.split(' ').map(n => n[0]).join('') || 'OV'}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-surface-850 tracking-tight leading-snug">{authUser?.full_name}</h4>
                                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-wider mt-0.5">
                                        {authUser?.role || 'Validator'} · {departmentName}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-5">
                                <div className="bg-white/60 dark:bg-slate-900/60 border border-amber-100/60 p-2.5 rounded-sm shadow-xs">
                                    <span className="block text-[8px] font-black text-amber-600 uppercase tracking-wider leading-none">Your Verdicts</span>
                                    <span className="text-sm font-extrabold text-amber-800 mt-1 block">{passedCandidates.length + failedCandidates.length} concluded</span>
                                </div>
                                <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-150 p-2.5 rounded-sm shadow-xs">
                                    <span className="block text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">Pass Rate</span>
                                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1 block">{passRate}% success</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-amber-100/60 mt-4 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                                Active Console Session
                            </span>
                            <a
                                href="/final-interview/schedules"
                                className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors"
                            >
                                Your Schedules <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        </div>
                    </div>

                    {/* Passed Candidate Spotlight */}
                    <div className="bg-gradient-to-br from-white via-blue-50/10 to-indigo-50/5 border border-blue-200/60 rounded-sm p-6 shadow-sm flex flex-col justify-between min-h-[260px] relative overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-200/10 rounded-full blur-3xl -z-10 group-hover:bg-blue-200/25 transition-colors duration-500" />

                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-blue-100/60 mb-4">
                                <h3 className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                                    <Bookmark size={13} className="text-blue-500 animate-pulse" />
                                    Passed Candidate Spotlight
                                </h3>
                                <span className="px-2 py-0.5 text-[8px] font-bold uppercase bg-blue-50 border border-blue-200 text-blue-700 tracking-wider rounded-full">
                                    Hire Spotlight
                                </span>
                            </div>

                            {latestPassedCandidate ? (
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="text-sm font-bold text-surface-850 tracking-tight leading-snug">{latestPassedCandidate.applicant_name}</h4>
                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">
                                            {latestPassedCandidate.position_title || 'Operations Agent'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 text-center py-4">
                                    <Bookmark size={20} className="mx-auto text-blue-400 opacity-60" />
                                    <p className="text-xs text-surface-700 font-bold">No candidates passed yet</p>
                                    <p className="text-[10px] text-surface-400 font-medium">Conclude pending interviews to see hires placed in the spotlight.</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-blue-100/60 mt-4 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-surface-450 uppercase tracking-wider">
                                Latest approved hire
                            </span>
                            {latestPassedCandidate ? (
                                <button
                                    onClick={() => setSelectedApplicant(latestPassedCandidate)}
                                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                                >
                                    View Profile <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            ) : <span />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Operations */}
            <div className="space-y-4">
                <h2 className="text-[11px] font-black text-surface-450 uppercase tracking-[0.2em] font-sans text-left">Quick Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { to: '/final-interview/desk', label: 'Interview Desk', desc: 'Evaluate pending candidates', icon: Clock, color: 'text-blue-600' },
                        { to: '/final-interview/schedules', label: 'Schedules / Calendar', desc: 'Manage interview times', icon: Calendar, color: 'text-emerald-600' },
                        { to: '/final-interview/analysis', label: 'Analytics Insights', desc: 'View statistics', icon: LayoutDashboard, color: 'text-purple-600' },
                    ].map(({ to, label, desc, icon: Icon, color }) => (
                        <a
                            key={to}
                            href={to}
                            className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm hover:border-surface-400 hover:shadow-md transition-all duration-200 active:scale-[0.99] text-left"
                        >
                            <div className="w-10 h-10 rounded-sm flex items-center justify-center bg-surface-50 border border-surface-150 shrink-0">
                                <Icon size={18} className={color} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-surface-800 uppercase tracking-wider">{label}</div>
                                <div className="text-[10px] font-medium text-surface-400 truncate mt-0.5">{desc}</div>
                            </div>
                            <ArrowRight size={14} className="text-surface-300 shrink-0" />
                        </a>
                    ))}
                </div>
            </div>

            {/* Split Section: Upcoming & History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
                {/* Upcoming Schedules Today */}
                <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm p-6 flex flex-col min-h-[300px]">
                    <div className="flex items-center justify-between pb-4 border-b border-surface-150 mb-4">
                        <h3 className="text-xs font-black text-surface-800 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} className="text-blue-600" />
                            Upcoming Today
                        </h3>
                        <span className="text-[10px] font-bold text-surface-450 uppercase">{upcomingSchedules.length} Scheduled</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {upcomingSchedules.length > 0 ? (
                            upcomingSchedules.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-3.5 bg-surface-50/50 border border-surface-200/60 rounded-sm">
                                    <div>
                                        <h4 className="text-xs font-bold text-surface-800">{c.applicant_name}</h4>
                                        <p className="text-[10px] font-medium text-surface-400 mt-0.5">{c.position_title || 'Cebu Operations Agent'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2.5 py-0.5 rounded-sm bg-blue-50 border border-blue-100 text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                                            {(c as any).scheduled_time ? new Date((c as any).scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-surface-400">
                                <Calendar size={24} className="mb-2 text-surface-300" />
                                <p className="text-xs font-semibold uppercase tracking-wider">No evaluations scheduled today</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity history */}
                <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm p-6 flex flex-col min-h-[300px]">
                    <div className="flex items-center justify-between pb-4 border-b border-surface-150 mb-4">
                        <h3 className="text-xs font-black text-surface-800 uppercase tracking-wider flex items-center gap-2">
                            <History size={14} className="text-emerald-600" />
                            Recent Activities
                        </h3>
                        <span className="text-[10px] font-bold text-surface-450 uppercase">Last 5 verdicts</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {recentActivity.length > 0 ? (
                            recentActivity.map(c => {
                                const status = c.final_verdict || c.current_status;
                                const isPassed = ['PASSED', 'HIRED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'For Job Offer', 'Accepted Offer'].includes(status);
                                return (
                                    <div key={c.id} className="flex items-center justify-between p-3.5 bg-surface-50/50 border border-surface-200/60 rounded-sm">
                                        <div>
                                            <h4 className="text-xs font-bold text-surface-800">{c.applicant_name}</h4>
                                            <p className="text-[10px] font-medium text-surface-400 mt-0.5">{c.position_title || 'Cebu Operations Agent'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "px-2.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border",
                                                isPassed
                                                    ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                                    : "bg-rose-50 border-rose-100 text-rose-600"
                                            )}>
                                                {isPassed ? 'PASSED' : 'FAILED'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-surface-400">
                                <History size={24} className="mb-2 text-surface-300" />
                                <p className="text-xs font-semibold uppercase tracking-wider">No recent validation history</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Dedicated Pop-up Dashboard Modal */}
            {createPortal(
                <AnimatePresence>
                    {selectedMetricCard && (
                        <div key="metric-modal" className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm z-[999] flex items-center justify-center p-4 md:p-8">
                            {/* Backdrop Click Dismiss */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => { setSelectedMetricCard(null); setModalSearchTerm(''); }}
                                className="absolute inset-0"
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.98, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: 4 }}
                                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] relative text-left z-10"
                            >
                                {/* Modal Header */}
                                <div className="px-8 py-6 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-9 h-9 rounded-sm flex items-center justify-center border border-transparent",
                                            selectedMetricCard === 'active' ? "bg-blue-50 text-blue-600" :
                                                selectedMetricCard === 'passed' ? "bg-emerald-50 text-emerald-600" :
                                                    selectedMetricCard === 'failed' ? "bg-rose-50 text-rose-600" :
                                                        "bg-amber-50 text-amber-600"
                                        )}>
                                            {selectedMetricCard === 'active' && <Calendar size={16} />}
                                            {selectedMetricCard === 'passed' && <CheckCircle size={16} />}
                                            {selectedMetricCard === 'failed' && <XCircle size={16} />}
                                            {selectedMetricCard === 'rate' && <Star size={16} />}
                                        </div>
                                        <div>
                                            <h3
                                                className="text-base font-bold text-slate-900 dark:text-white tracking-tight"
                                            >
                                                {selectedMetricCard === 'active' ? 'Active Queue Dashboard' :
                                                    selectedMetricCard === 'passed' ? 'Passed Verdicts Registry' :
                                                        selectedMetricCard === 'failed' ? 'Failed Verdicts Registry' :
                                                            'Success Rate Cohort'}
                                            </h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.08em] mt-0.5">
                                                Total of {(() => {
                                                    let list: Application[] = [];
                                                    if (selectedMetricCard === 'active') list = activeCandidates;
                                                    else if (selectedMetricCard === 'passed') list = passedCandidates;
                                                    else if (selectedMetricCard === 'failed') list = failedCandidates;
                                                    else if (selectedMetricCard === 'rate') list = [...passedCandidates, ...failedCandidates];
                                                    return list.length;
                                                })()} candidates listed for {departmentName.toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedMetricCard(null); setModalSearchTerm(''); }}
                                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors rounded-sm hover:bg-slate-100 dark:bg-slate-800/50"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>

                                {/* Modal Search Bar */}
                                <div className="px-8 pb-5 bg-white dark:bg-slate-900 shrink-0">
                                    <div className="relative group">
                                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, ID, or position..."
                                            value={modalSearchTerm}
                                            onChange={(e) => setModalSearchTerm(e.target.value)}
                                            className="w-full pl-11 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50/60 text-xs font-semibold focus:bg-slate-150/30 transition-all rounded-sm placeholder:text-slate-400 border border-transparent focus:border-transparent focus:ring-0 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Modal Table Content */}
                                <div className="flex-1 overflow-y-auto px-8 pb-8 bg-white dark:bg-slate-900">
                                    {(() => {
                                        let list: Application[] = [];
                                        if (selectedMetricCard === 'active') list = activeCandidates;
                                        else if (selectedMetricCard === 'passed') list = passedCandidates;
                                        else if (selectedMetricCard === 'failed') list = failedCandidates;
                                        else if (selectedMetricCard === 'rate') list = [...passedCandidates, ...failedCandidates];

                                        const filtered = list.filter(c =>
                                            !modalSearchTerm ||
                                            c.applicant_name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                                            (c.applicant_id || c.id || '').toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                                            (c.position_title || '').toLowerCase().includes(modalSearchTerm.toLowerCase())
                                        );

                                        if (filtered.length > 0) {
                                            return (
                                                <div className="overflow-hidden bg-white dark:bg-slate-900">
                                                    <table className="w-full text-xs text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-semibold select-none border-b border-slate-100">
                                                                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[9px]">Candidate</th>
                                                                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[9px]">Position</th>
                                                                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[9px]">Status</th>
                                                                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[9px] text-center">Verdict</th>
                                                                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[9px] text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filtered.map(c => {
                                                                const status = c.final_verdict || c.current_status;
                                                                const isPassed = ['PASSED', 'HIRED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'For Job Offer', 'Accepted Offer'].includes(status);
                                                                const isFailed = ['FAILED', 'REJECTED', 'DISQUALIFIED', 'Withdrawn', 'Withdrawn by Applicant'].includes(status);

                                                                let verdictBadge = (
                                                                    <span className="px-2 py-0.5 rounded-sm text-[9px] font-bold bg-blue-50 border border-blue-100/55 text-blue-600 uppercase tracking-wider">
                                                                        PENDING
                                                                    </span>
                                                                );
                                                                if (isPassed) {
                                                                    verdictBadge = (
                                                                        <span className="px-2 py-0.5 rounded-sm text-[9px] font-bold bg-emerald-50 border border-emerald-100/55 text-emerald-600 uppercase tracking-wider">
                                                                            PASSED
                                                                        </span>
                                                                    );
                                                                } else if (isFailed) {
                                                                    verdictBadge = (
                                                                        <span className="px-2 py-0.5 rounded-sm text-[9px] font-bold bg-rose-50 border border-rose-100/55 text-rose-600 uppercase tracking-wider">
                                                                            FAILED
                                                                        </span>
                                                                    );
                                                                }

                                                                return (
                                                                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors border-b border-slate-100/70 last:border-0">
                                                                        <td className="py-3.5 px-4">
                                                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{c.applicant_name}</div>
                                                                            <div className="text-[10px] text-slate-400 mt-0.5">{c.applicant_email || c.id}</div>
                                                                        </td>
                                                                        <td className="py-3.5 px-4 font-semibold text-slate-650">
                                                                            {c.position_title || 'Operations Agent'}
                                                                        </td>
                                                                        <td className="py-3.5 px-4">
                                                                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-slate-600 font-bold uppercase tracking-wider text-[9px] border border-slate-200 dark:border-slate-800/50">
                                                                                {c.current_status?.replace(/_/g, ' ')}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3.5 px-4 text-center">
                                                                            {verdictBadge}
                                                                        </td>
                                                                        <td className="py-3.5 px-4 text-right">
                                                                            <button
                                                                                onClick={() => setSelectedApplicant(c)}
                                                                                className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#005a9e] text-white text-[10px] font-semibold uppercase tracking-wider rounded-sm shadow-sm transition-all hover:shadow-md active:scale-95 cursor-pointer"
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
                                        } else {
                                            return (
                                                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-sm flex flex-col items-center justify-center p-8">
                                                    <div className="w-14 h-14 rounded-sm bg-slate-50 dark:bg-slate-800 border border-slate-100 flex items-center justify-center mb-4 text-slate-400 animate-pulse">
                                                        <Search size={22} />
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">No matching candidates found</h4>
                                                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium max-w-sm leading-relaxed">
                                                        We couldn't find any candidate matching "{modalSearchTerm}". Try adjusting your search term.
                                                    </p>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

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

