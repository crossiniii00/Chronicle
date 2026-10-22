import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import {
    ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
    PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, LabelList,
    FunnelChart, Funnel
} from 'recharts';
import {
    Activity, Award, BarChart2, BookOpen, Brain, Briefcase, Calendar, CheckCircle2, ChevronDown, Clock, Cpu, Filter, GraduationCap, Grid,
    Layers, Layout, LayoutGrid, Award as Medal, ShieldAlert, Star, TrendingUp, Trophy, User, Users, XCircle, Search, Sparkles, AlertTriangle, RefreshCw, Maximize2, FileText, Printer, Download, PieChart as PieChartIcon, Target, Zap, GitMerge, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/formatters';
import { AdvancedDateFilter, type DateFilterState } from '@/components/common/AdvancedDateFilter';
import { CalendarDropdown } from '@/components/common/CalendarDropdown';
import { EndorsementsAnalysis } from './components/EndorsementsAnalysis';
import { AccountAnalysis } from '@/pages/guest/AccountAnalysis';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#6366f1'];

import { getTrueAccounts, getTrueAccount, getAppStrictLob } from './hooks/useRecruiterReports';
export { getTrueAccounts, getTrueAccount, getAppStrictLob };

export function getCandidateName(c: any): string {
    if (!c) return 'Unknown Candidate';
    const pis = c.pis || c.metadata?.pis || {};
    const meta = c.metadata || {};

    const directFn = c.first_name || pis.first_name || meta.first_name || '';
    const directLn = c.last_name || pis.last_name || meta.last_name || '';
    const combined = [directFn, directLn].filter(Boolean).join(' ').trim();
    if (combined) return combined;

    const fullName = (
        c.applicant_name ||
        c.candidate_name ||
        c.name ||
        c.full_name ||
        pis.applicant_name ||
        pis.candidate_name ||
        pis.full_name ||
        pis.name ||
        meta.applicant_name ||
        meta.candidate_name ||
        meta.full_name ||
        meta.name ||
        ''
    ).trim();

    return fullName || 'Unknown Candidate';
}

export function getCandidateEmail(c: any): string {
    if (!c) return '-';
    const pis = c.pis || c.metadata?.pis || {};
    const meta = c.metadata || {};

    return (
        c.email ||
        c.applicant_email ||
        pis.email ||
        meta.email ||
        meta.applicant_email ||
        '-'
    );
}

export function EditableLobSelect({
    candidate,
    mhrtAccounts,
    departmentsList = [],
    onUpdate
}: {
    candidate: any,
    mhrtAccounts: any[],
    departmentsList?: any[],
    onUpdate?: (appId: string, newLob: string) => void
}) {
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isCustoming, setIsCustoming] = useState(false);
    const [customValue, setCustomValue] = useState('');
    const accountName = getTrueAccount(candidate);
    const currentLob = getAppStrictLob(candidate, mhrtAccounts);

    useEffect(() => {
        if (saveStatus === 'saved') {
            const timer = setTimeout(() => setSaveStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const availableLobOptions = useMemo(() => {
        const accUpper = accountName.toUpperCase();
        const set = new Set<string>();

        // 1. Account LOBs from mhrtAccounts for THIS account
        (mhrtAccounts || [])
            .filter((a: any) => (a.account || '').trim().toUpperCase() === accUpper)
            .forEach((a: any) => {
                const l = String(a.lob || '').trim().toUpperCase();
                if (l && l !== 'UNSPECIFIED JOB POSITION') set.add(l);
            });

        // 2. Account LOBs from departmentsList for THIS account
        const deptObj = (departmentsList || []).find((d: any) => (d.name || '').trim().toUpperCase() === accUpper);
        if (deptObj && (deptObj.subAccounts || deptObj.sub_accounts)) {
            const subs = deptObj.subAccounts || deptObj.sub_accounts || [];
            subs.forEach((s: any) => {
                const name = String(s.name || s).trim().toUpperCase();
                if (name && name !== 'UNSPECIFIED JOB POSITION') {
                    set.add(name);
                }
            });
        }

        // 3. Always allow current LOB to be selectable if set
        if (currentLob && currentLob !== 'UNSPECIFIED JOB POSITION') {
            set.add(currentLob.toUpperCase());
        }

        if (accUpper === 'ONCOURSE') {
            set.add('AGENT');
        }

        return Array.from(set).sort();
    }, [mhrtAccounts, departmentsList, accountName, candidate, currentLob]);

    const saveLob = async (val: string) => {
        const cleanVal = val.trim().toUpperCase();
        if (!cleanVal || cleanVal === currentLob) {
            setIsCustoming(false);
            return;
        }
        setSaveStatus('saving');
        try {
            if (!candidate.pis) candidate.pis = {};
            candidate.pis.custom_lob = cleanVal;
            if (!candidate.metadata) candidate.metadata = {};
            candidate.metadata.custom_lob = cleanVal;

            await fetch(`/api/applications/${candidate.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pis: { ...(candidate.pis || {}), custom_lob: cleanVal },
                    metadata: { ...(candidate.metadata || {}), custom_lob: cleanVal }
                })
            });

            if (onUpdate) onUpdate(candidate.id, cleanVal);
            setSaveStatus('saved');
        } catch (err) {
            console.error('Failed to update candidate LOB:', err);
            setSaveStatus('idle');
        } finally {
            setIsCustoming(false);
        }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === '__ADD_CUSTOM__') {
            setIsCustoming(true);
            setCustomValue('');
            return;
        }
        await saveLob(val);
    };

    const isUnspecified = currentLob === 'UNSPECIFIED JOB POSITION';

    if (isCustoming) {
        return (
            <div className="inline-flex items-center gap-1">
                <input
                    type="text"
                    autoFocus
                    value={customValue}
                    onChange={e => setCustomValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') saveLob(customValue);
                        if (e.key === 'Escape') setIsCustoming(false);
                    }}
                    placeholder="Type Job Position..."
                    className="text-sm font-semibold py-1 px-2 border border-indigo-400 rounded-none outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 w-32 shadow-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button
                    onClick={() => saveLob(customValue)}
                    disabled={saveStatus === 'saving' || !customValue.trim()}
                    className="px-2 py-1 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-none transition-colors"
                >
                    Save
                </button>
                <button
                    onClick={() => setIsCustoming(false)}
                    className="px-1.5 py-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <div className="relative inline-flex items-center">
            <select
                value={currentLob}
                disabled={saveStatus === 'saving'}
                onChange={handleChange}
                className={`text-sm font-semibold py-1 px-2.5 pr-7 rounded-none border outline-none cursor-pointer appearance-none transition-all shadow-sm ${isUnspecified
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:border-amber-400 focus:ring-2 focus:ring-amber-400'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 focus:ring-2 focus:ring-indigo-400'
                    }`}
                title="Click to change or assign Job Position"
            >
                {isUnspecified && <option value="UNSPECIFIED JOB POSITION">UNSPECIFIED JOB POSITION</option>}

                {availableLobOptions.length > 0 && (
                    <optgroup label="Available Job Positions">
                        {availableLobOptions.map(lob => (
                            <option key={lob} value={lob}>
                                {lob}
                            </option>
                        ))}
                    </optgroup>
                )}

                {!isUnspecified && !availableLobOptions.includes(currentLob) && (
                    <option value={currentLob}>{currentLob}</option>
                )}

                <option value="__ADD_CUSTOM__">+ Add Custom Job Position...</option>
            </select>
            <div className="pointer-events-none absolute right-2 flex items-center text-slate-400">
                {saveStatus === 'saving' ? (
                    <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-none animate-spin"></span>
                ) : (
                    <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                )}
            </div>
            {saveStatus === 'saved' && (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full p-0.5 shadow-sm border border-emerald-200 z-50 animate-bounce">
                    <CheckCircle2 size={14} className="stroke-[3]" />
                </span>
            )}
        </div>
    );
}

export default function AccountAnalytics({ reportsState }: { reportsState: any }) {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin' || user?.role === 'ops_val_admin';
    const { isExclusiveMode, setIsExclusiveMode } = reportsState;

    const getAccountImage = (accountName: string) => {
        const dept = (reportsState.departmentsList || []).find((d: any) => (d.name || '').toUpperCase() === accountName.toUpperCase());
        if (dept && (dept.accountImageUrl || dept.accountImageData)) {
            if (dept.accountImageUrl) {
                return dept.accountImageUrl.startsWith('/') ? `/api${dept.accountImageUrl}` : dept.accountImageUrl;
            }
            return `data:image/jpeg;base64,${dept.accountImageData}`;
        }
        return '/contactpoint-logo.png?v=2';
    };
    const formatTakers = (total: number, passed: number, ongoing: number = 0) => {
        if (!total || total === 0) return <span className="text-slate-300">-</span>;
        const failed = Math.max(0, total - passed - ongoing);
        const displayTotal = Math.max(total, passed + ongoing);
        return (
            <div className="flex items-center justify-center gap-3 text-sm tabular-nums font-semibold tracking-wide">
                <span className="text-slate-700 dark:text-slate-300 min-w-[12px]">{displayTotal}</span>
                <span className="text-emerald-600 min-w-[12px]">{passed}</span>
                <span className={failed > 0 ? "text-rose-500 min-w-[12px]" : "text-slate-400 min-w-[12px]"}>{failed}</span>
                <span className={ongoing > 0 ? "text-amber-600 min-w-[12px]" : "text-slate-400 min-w-[12px]"}>{ongoing}</span>
            </div>
        );
    };

    const renderStageHeader = (title: string) => (
        <th className="py-2 text-center align-bottom min-w-[100px]">
            <div className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-1.5">{title}</div>
            <div className="flex items-center justify-center gap-3 text-xs font-bold pb-1 border-b border-slate-100 mx-4">
                <span className="text-slate-400 min-w-[12px]" title="T = Total">T</span>
                <span className="text-emerald-500 min-w-[12px]" title="P = Passed">P</span>
                <span className="text-rose-400 min-w-[12px]" title="F = Failed">F</span>
                <span className="text-amber-500 min-w-[12px]" title="O = Ongoing">O</span>
            </div>
        </th>
    );
    const [rightTab, setRightTab] = useState<'sourcing' | 'education' | 'experience' | 'fresh_grad'>('sourcing');
    const [tagRecruiter, setTagRecruiter] = useState<string>('');
    const [activeDashboardTab, setActiveDashboardTab] = useState<'REPORT' | 'PENDING_TRACKER' | 'ENDORSEMENTS' | 'ACCOUNT_ANALYSIS'>('REPORT');
    const [selectedFunnelStage, setSelectedFunnelStage] = useState<{ name: string, candidates: any[] } | null>(null);
    const [selectedLOBMetric, setSelectedLOBMetric] = useState<{ account: string, lob: string, metric: 'applied' | 'hires' | 'ongoing' } | null>(null);
    const [modalTab, setModalTab] = useState<'all' | 'passed' | 'failed' | 'active'>('all');

    // Microsoft-style Filters
    const [modalStatusFilter, setModalStatusFilter] = useState<string>('All');
    const [modalRecruiterFilter, setModalRecruiterFilter] = useState<string>('All');
    const [modalDateFilter, setModalDateFilter] = useState<string>('');
    const [modalLobSearch, setModalLobSearch] = useState<string>('');
    const [modalLobDateFilter, setModalLobDateFilter] = useState<string>('');
    const [modalLobRecruiterFilter, setModalLobRecruiterFilter] = useState<string>('All');
    const [modalLobStatusFilter, setModalLobStatusFilter] = useState<string>('All');
    const [modalLobDateType, setModalLobDateType] = useState<string>('Training Start Date');

    const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
    const [lobUpdateTrigger, setLobUpdateTrigger] = useState<number>(0);
    const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);

    const weeklyData = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const weeklyApps = (reportsState.apps || []).filter((app: any) => {
            const appDateStr = app.created_at || app.applied_at || app.date_applied;
            if (!appDateStr) return false;
            const appDate = new Date(appDateStr);
            return !isNaN(appDate.getTime()) && appDate >= startOfWeek && appDate <= endOfWeek;
        });

        const targetPool = weeklyApps.length > 0 ? weeklyApps : (reportsState.apps || []);

        let totalAssigned = targetPool.length;
        let totalHires = 0;
        let totalOngoing = 0;
        let totalFailed = 0;

        const accountBreakdown: { [acc: string]: { assigned: number, hires: number, ongoing: number } } = {};

        targetPool.forEach((app: any) => {
            const acc = getTrueAccount(app);
            if (!acc || acc.trim().toUpperCase() === 'UNASSIGNED') return;

            if (!accountBreakdown[acc]) {
                accountBreakdown[acc] = { assigned: 0, hires: 0, ongoing: 0 };
            }
            accountBreakdown[acc].assigned++;

            const status = (app.current_status || '').toUpperCase();
            if (status.includes('HIRED') || status.includes('ACCEPTED')) {
                totalHires++;
                accountBreakdown[acc].hires++;
            } else if (status.includes('FAIL') || status.includes('REJECT')) {
                totalFailed++;
            } else {
                totalOngoing++;
                accountBreakdown[acc].ongoing++;
            }
        });

        return {
            startOfWeekStr: startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            endOfWeekStr: endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            totalAssigned,
            totalHires,
            totalOngoing,
            totalFailed,
            hireRate: Math.round((totalHires / Math.max(totalAssigned, 1)) * 100),
            accountBreakdown
        };
    }, [reportsState.apps, lobUpdateTrigger]);

    const handleExportWeeklyCSV = () => {
        const rows = [
            ['Weekly Recruitment Analytics Report'],
            [`Period: ${weeklyData.startOfWeekStr} - ${weeklyData.endOfWeekStr}`],
            [''],
            ['Account Name', 'Assigned Candidates', 'Weekly Hires', 'Hire Rate (%)', 'Ongoing Pipeline'],
        ];

        Object.entries(weeklyData.accountBreakdown)
            .filter(([acc]) => acc && acc.trim().toUpperCase() !== 'UNASSIGNED')
            .forEach(([acc, stats]) => {
                const hr = Math.round((stats.hires / Math.max(stats.assigned, 1)) * 100);
                rows.push([acc, String(stats.assigned), String(stats.hires), `${hr}%`, String(stats.ongoing)]);
            });

        rows.push(['']);
        rows.push(['TOTAL', String(weeklyData.totalAssigned), String(weeklyData.totalHires), `${weeklyData.hireRate}%`, String(weeklyData.totalOngoing)]);

        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Weekly_Recruitment_Report_${weeklyData.startOfWeekStr.replace(/ /g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintWeeklyReport = () => {
        window.print();
    };

    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
    const [isLobDropdownOpen, setIsLobDropdownOpen] = useState(false);
    const [isHiringTypeDropdownOpen, setIsHiringTypeDropdownOpen] = useState(false);
    const [accountSearch, setAccountSearch] = useState('');
    const [lobSearch, setLobSearch] = useState('');
    const accountDropdownRef = useRef<HTMLDivElement>(null);
    const lobDropdownRef = useRef<HTMLDivElement>(null);
    const hiringTypeDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isInsideAnyDropdown = (
                (accountDropdownRef.current && accountDropdownRef.current.contains(event.target as Node)) ||
                (lobDropdownRef.current && lobDropdownRef.current.contains(event.target as Node)) ||
                (hiringTypeDropdownRef.current && hiringTypeDropdownRef.current.contains(event.target as Node))
            );

            // Only close them if the user clicks completely outside of all filters
            if (!isInsideAnyDropdown) {
                setIsAccountDropdownOpen(false);
                setIsLobDropdownOpen(false);
                setIsHiringTypeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const categorizeCandidateForStage = (c: any, stageName: string) => {
        const status = (c.current_status || '').toUpperCase();
        const outcome = getOutcome(c);

        if (outcome.isHired) return 'passed';
        if (outcome.isWithdrawn || outcome.isFailed || status.includes('FAIL') || status.includes('REJECT')) return 'failed';

        if (stageName === 'Applied') {
            if (['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED'].includes(status)) return 'active';
            return 'passed';
        }
        if (stageName === 'Typing Test') {
            if (['TYPING_TEST'].includes(status)) return 'active';
            return 'passed';
        }
        if (stageName === 'Proficiency assessment 1 & 2' || stageName === 'Assessment') {
            if (['ASSESSMENT', 'ASSESSMENT_II', 'ASSESSMENT II'].includes(status)) return 'active';
            return 'passed';
        }
        if (stageName === 'Ops Val') {
            if (['ACCOUNT_ASSIGNMENT', 'ACCOUNT_ASSIGNMENT_INTERVIEW', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW', 'FINAL INTERVIEW SCHEDULED'].includes(status)) return 'active';
            return 'passed';
        }
        if (stageName === 'Client Assess' || stageName === 'Client Assessment') {
            if (['CLIENT_ASSESSMENT'].includes(status)) return 'active';
            return 'passed';
        }
        if (stageName === 'Client Interview') {
            if (['CLIENT_INTERVIEW', 'CLIENT INTERVIEW', 'CLIENT_INTERVIEW_SCHEDULED', 'CLIENT INTERVIEW SCHEDULED'].includes(status)) return 'active';
            return 'passed';
        }
        if (stageName === 'For Job Offer') {
            if (['FOR_JOB_OFFER', 'FOR JOB OFFER', 'FOR JOB OFFER'].includes(status)) return 'active';
            return 'passed';
        }

        // Generic fallback for later stages
        if (status.includes('SCHEDULE')) return 'active';
        return 'passed';
    };

    const displayCandidates = useMemo(() => {
        if (!selectedFunnelStage) return [];

        let candidates = selectedFunnelStage.candidates;

        if (modalTab !== 'all') {
            candidates = candidates.filter(c => categorizeCandidateForStage(c, selectedFunnelStage.name) === modalTab);
        }

        if (modalStatusFilter !== 'All') {
            candidates = candidates.filter(c => {
                const s = (c.current_status || '').toUpperCase().replace(/_/g, ' ');
                return s === modalStatusFilter.toUpperCase();
            });
        }

        if (modalRecruiterFilter !== 'All') {
            candidates = candidates.filter(c => {
                const rec = c.assigned_recruiter_name || 'Unassigned';
                return rec === modalRecruiterFilter;
            });
        }

        if (modalDateFilter) {
            candidates = candidates.filter(c => {
                const d = c.applied_at || c.created_at;
                if (!d) return false;
                const dStr = new Date(d).toISOString().split('T')[0];
                return dStr === modalDateFilter;
            });
        }

        return candidates;
    }, [selectedFunnelStage, modalTab, modalStatusFilter, modalRecruiterFilter, modalDateFilter]);

    const filterOptions = useMemo(() => {
        if (!selectedFunnelStage) return { statuses: [], recruiters: [] };

        const statuses = new Set<string>();
        const recruiters = new Set<string>();

        selectedFunnelStage.candidates.forEach(c => {
            const s = (c.current_status || '').toUpperCase().replace(/_/g, ' ');
            if (s) statuses.add(s);

            const r = c.assigned_recruiter_name || 'Unassigned';
            if (r) recruiters.add(r);
        });

        return {
            statuses: Array.from(statuses).sort(),
            recruiters: Array.from(recruiters).sort()
        };
    }, [selectedFunnelStage]);

    const {
        filteredApps,
        availableAccounts,
        availableLobs,
        availableRecruiters,
        getOutcome,
        categorizeEducation,
        categorizeExperience,
        // Filter states
        selectedDeptNames, setSelectedDeptNames,
        lobFilters, setLobFilters,
        hiringTypeFilters, setHiringTypeFilters,
        selectedRecruiterName, setSelectedRecruiterName,
        dateAppliedFilter, setDateAppliedFilter,
        initialInterviewFilter, setInitialInterviewFilter,
        trainingStartFilter, setTrainingStartFilter,
        opsValFilter, setOpsValFilter,
        availableStartDates,
        positions
    } = reportsState;


    // --- Dynamic Computations ---
    const computedMetrics = useMemo(() => {
        const total = filteredApps.length;
        if (total === 0) {
            return {
                total: 0,
                hired: 0,
                endorsed: 0,
                failed: 0,
                withdrawn: 0,
                active: 0,
                passRate: 0,
                conversionRate: 0,
                avgTime: 0,
                scheduled: 0,
                reprofileRate: 0,
                stageFunnel: [],
                stagePassRates: [],
                sourceData: [],
                recruiterData: [],
                accountAssignments: [],
                eduData: [],
                freshGradStats: { fresh: { count: 0, hired: 0 }, exp: { count: 0, hired: 0 } },
                experienceData: [],
                tagCounts: { noShow: 0, notEligible: 0, waitlisted: 0, blacklisted: 0, withdrawn: 0, promotion: 0, lateralTransfer: 0, endorsedOv: 0 },
                accountMetricsData: [],
                dotChartData: [],
                perAccountData: [] as any[],
                aiInsights: [],
                hiringTypeData: [],
                pendingTracker: {
                    initialInterview: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
                    typingTest: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
                    speechX: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
                    personalityTest: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
                    opsVal: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
                    clientAssess: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
                    clientInterview: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
                    forJobOffer: { count: 0, waitTimeSum: 0, waitTimeCount: 0 }
                }
            };
        }

        let hired = 0;
        let endorsed = 0;
        let failed = 0;
        let withdrawn = 0;
        let active = 0;
        let scheduled = 0;
        let totalTime = 0;
        let timeCount = 0;
        let reprofileCount = 0;

        // Stage metrics count
        const hasSpecializedClientGlobal = (reportsState.mhrtAccounts || []).some((a: any) => a.has_client_interview);
        const stages = {
            applied: 0,
            appliedFailed: 0,
            passedInitial: 0,
            assigned: 0,
            typing: 0,
            typingPassed: 0,
            assessment: 0,
            assessmentPassed: 0,
            opsVal: 0,
            opsValPassed: 0,
            scheduling: 0,
            clientAssessment: 0,
            clientAssessmentPassed: 0,
            clientInterview: 0,
            clientInterviewPassed: 0
        };

        const funnelStages = {
            s1_reached: 0, s1_passed: 0, s1_candidates: [] as any[],
            s2_reached: 0, s2_passed: 0, s2_candidates: [] as any[],
            s3_reached: 0, s3_passed: 0, s3_candidates: [] as any[],
            s4_reached: 0, s4_passed: 0, s4_candidates: [] as any[],
            s5_reached: 0, s5_passed: 0, s5_candidates: [] as any[],
            s6_reached: 0, s6_passed: 0, s6_candidates: [] as any[],
            s7_reached: 0, s7_passed: 0, s7_candidates: [] as any[]
        };

        // Demographics & Recruiter performance maps
        const eduCounts: Record<string, { count: number; passed: number }> = {};
        const sourceCounts: Record<string, { count: number; passed: number; hired: number }> = {};
        const recruiterMap = new Map<string, { screened: number; passed: number; failed: number; assigned: number; endorsed: number; hired: number }>();
        const accountMap = new Map<string, { count: number; hired: number; failed: number; endorsed: number; scheduled: number; typingPassed: number; typingTotal: number; typingOngoing: number; assessmentPassed: number; assessmentTotal: number; assessmentOngoing: number; opsValPassed: number; opsValTotal: number; clientAssPassed: number; clientAssTotal: number; clientAssOngoing: number; clientIntPassed: number; clientIntTotal: number; clientIntOngoing: number; ongoing: number; internalCount: number; externalCount: number; hiredInternalCount: number; hiredExternalCount: number; lobs: Record<string, { count: number, hired: number, ongoing: number, internalCount: number, externalCount: number, hiredInternalCount: number, hiredExternalCount: number, candidates_applied: any[], candidates_hired: any[], candidates_ongoing: any[] }> }>();
        const gradStats = {
            fresh: { count: 0, hired: 0, typingSum: 0, typingCount: 0 },
            exp: { count: 0, hired: 0, typingSum: 0, typingCount: 0 }
        };
        const expCounts: Record<string, { count: number; passed: number; hired: number }> = {};

        // Recruiter-specific tag counters
        let tagNoShow = 0;
        let tagNotEligible = 0;
        let tagWaitlisted = 0;
        let tagBlacklisted = 0;
        let tagWithdrawn = 0;
        let tagPromotion = 0;
        let tagLateralTransfer = 0;
        let tagEndorsedOv = 0;

        const pendingTracker = {
            initialInterview: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
            typingTest: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
            speechX: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
            personalityTest: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
            opsVal: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
            clientAssess: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
            clientInterview: { count: 0, waitTimeSum: 0, waitTimeCount: 0 },
            forJobOffer: { count: 0, waitTimeSum: 0, waitTimeCount: 0 }
        };

        const getWaitTimeHours = (app: any) => {
            const timestamp = app.updated_at || app.created_at || app.applied_at;
            if (!timestamp) return 0;
            const diff = new Date().getTime() - new Date(timestamp).getTime();
            return diff / (1000 * 60 * 60);
        };

        filteredApps.forEach((app: any) => {
            const outcome = getOutcome(app);
            const status = (app.current_status || '').toUpperCase();
            const recName = app.assigned_recruiter_name || app.interviewer_name || 'Unassigned';
            const p = (app.pis || {}) as any;
            const finalSpec = String(p.final_specific_status || p['Final Specific Status'] || p['Specific Status'] || '').toUpperCase();
            const ovStatus = String(p.ops_validator_status || p.ops_val_status || p['Ops Val Status'] || p['Ops Validator Status'] || '').toUpperCase();
            const clientIntStatus = String(p.client_interview_status || p['Client Interview Status'] || '').toUpperCase();
            const finalIntResult = String(p.final_interview_result || '').toUpperCase();

            // Check recruiter filter specifically for tag tracking
            const matchesTagRecruiter = !tagRecruiter || recName.toUpperCase() === tagRecruiter.toUpperCase();
            if (matchesTagRecruiter) {
                if (status === 'NO_SHOW' || status === 'NO SHOW' || app.metadata?.show_up === 'NO-SHOW' || app.master_first_day_show_up === 'NO-SHOW') {
                    tagNoShow++;
                }
                if (status.includes('NOT_ELIGIBLE') || status.includes('NOT ELIGIBLE')) {
                    tagNotEligible++;
                }
                if (status.includes('WAITLIST')) {
                    tagWaitlisted++;
                }
                if (status.includes('BLACKLIST')) {
                    tagBlacklisted++;
                }
                if (outcome.isWithdrawn) {
                    tagWithdrawn++;
                }
                if (app.metadata?.is_promotion || status.includes('PROMOTED') || status.includes('PROMOTION') || status === 'Promoted') {
                    tagPromotion++;
                }
                if (status.includes('LATERAL') || status === 'Lateral Transfer') {
                    tagLateralTransfer++;
                }
                // Endorsed to OV: candidate has an OV status assigned or has progressed to/past OV
                const hasOvAssigned = ovStatus && ovStatus !== '' && ovStatus !== 'PENDING';
                const progressedPastOv = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 'FOR_PAN', 'SENT_JO_AND_BGC'].includes(status);
                if (hasOvAssigned || progressedPastOv || p.ops_validator_email) {
                    tagEndorsedOv++;
                }
            }

            if (outcome.isHired) { hired++; funnelStages.s7_candidates.push(app); }
            if (outcome.isEndorsed) endorsed++;
            if (outcome.isFailed) failed++;
            if (outcome.isWithdrawn) withdrawn++;
            if (!outcome.isHired && !outcome.isFailed && !outcome.isEndorsed && !outcome.isWithdrawn) active++;

            const waitHrs = getWaitTimeHours(app);
            const addPending = (key: keyof typeof pendingTracker) => {
                pendingTracker[key].count++;
                pendingTracker[key].waitTimeSum += waitHrs;
                pendingTracker[key].waitTimeCount++;
            };

            const isConcludedApp = outcome.isHired || outcome.isFailed || outcome.isWithdrawn || ['HIRED', 'FAILED', 'REJECTED', 'WITHDRAWN', 'NO_SHOW', 'NO SHOW'].includes(status);
            if (!isConcludedApp) {
                if (status === 'INITIAL_INTERVIEW' || status === 'QUEUE_ASSIGNED' || status === 'APPLIED') {
                    addPending('initialInterview');
                } else if (status === 'TYPING_TEST') {
                    addPending('typingTest');
                } else if (status === 'ASSESSMENT') {
                    if (!app.wonderlic_status || String(app.wonderlic_status).toUpperCase() === 'PENDING') {
                        addPending('personalityTest');
                    } else if (!app.pis?.speechx_score && !app.metadata?.speechx_status) {
                        addPending('speechX');
                    }
                } else if (status === 'CLIENT_ASSESSMENT') {
                    addPending('clientAssess');
                } else if (status === 'ACCOUNT_ASSIGNMENT' || status === 'ACCOUNT_ASSIGNMENT_INTERVIEW' || status === 'FINAL_INTERVIEW' || status === 'FINAL_INTERVIEW_SCHEDULED' || status === 'FINAL INTERVIEW' || status === 'FINAL INTERVIEW SCHEDULED') {
                    const ovCompleted = ovStatus.includes('PASS') || ovStatus.includes('FAIL') || finalIntResult.includes('PASS') || finalIntResult.includes('FAIL');
                    if (!ovCompleted) {
                        addPending('opsVal');
                    }
                } else if (status === 'CLIENT_INTERVIEW' || status === 'CLIENT INTERVIEW' || status === 'CLIENT_INTERVIEW_SCHEDULED' || status === 'CLIENT INTERVIEW SCHEDULED') {
                    addPending('clientInterview');
                } else if (status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER') {
                    addPending('forJobOffer');
                }
            }

            if (status.includes('SCHEDULE')) scheduled++;
            if (status.includes('REPROFILE') || app.metadata?.reprofile_queue || app.reprofile_queue) {
                reprofileCount++;
            }

            if (app.applied_at && app.updated_at) {
                const start = new Date(app.applied_at).getTime();
                const end = new Date(app.updated_at).getTime();
                if (!isNaN(start) && !isNaN(end) && end >= start) {
                    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
                    totalTime += days;
                    timeCount++;
                }
            }

            // ── STAGE COUNTING (synced with Dashboard logic) ──
            stages.applied++;

            // Passed Initial: check multiple PIS fields
            const iiResult = String(p.initial_interview_results || p.initial_interview_result || p.ii_result || p['Initial Interview Result'] || p['Initial Interview Results'] || '').toUpperCase();
            if (iiResult === 'PASSED' || outcome.isEndorsed || outcome.isHired) {
                stages.passedInitial++;
            } else if (status === 'REJECTED' || status === 'FAILED' || status.includes('NOT_ELIGIBLE')) {
                stages.appliedFailed++;
            }

            if (app.department || app.assigned_recruiter_name) {
                stages.assigned++;
            }

            if (app.typing_test_wpm != null) {
                stages.typing++;
                if ((app.typing_test_wpm || 0) >= 35) stages.typingPassed++;
            }

            // Assessment: check assessment_score, overall_assessment, assessment_scores obj, or status
            const rawScore = app.assessment_score;
            const upperScore = String(rawScore || '').toUpperCase().trim();
            const isCEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(upperScore) || upperScore.match(/[ABC][12]/) != null;

            let isPassed = false;
            if (isCEFR) {
                const cefr = upperScore.match(/[ABC][12]/)?.[0] || 'B1';
                isPassed = ['B2', 'C1', 'C2'].includes(cefr);
            } else if (rawScore != null) {
                const parsed = parseFloat(String(rawScore));
                isPassed = !isNaN(parsed) && parsed >= 70;
            }

            const hasAss = Object.keys(app.metadata?.assessment_scores || p.assessment_scores || {}).length > 0
                || app.assessment_score != null
                || (p.overall_assessment && p.overall_assessment !== '')
                || status === 'ASSESSMENT'
                || status.includes('ASSESSMENT');
            if (hasAss) {
                stages.assessment++;
                const scores = app.metadata?.assessment_scores || p.assessment_scores || {};
                const hasScoresObj = Object.keys(scores).length > 0;
                const passAny = hasScoresObj
                    ? Object.values(scores).some((val: any) => (val.status || '').toUpperCase() === 'PASSED' || (parseFloat(String(val.score || val)) >= 70))
                    : isPassed
                    || (p.overall_assessment || '').toUpperCase() === 'PASSED'
                    || status.includes('CLIENT') || outcome.isEndorsed || outcome.isHired;
                if (passAny) stages.assessmentPassed++;
            }

            const hasOpsVal = ovStatus !== '' || !!p.ops_validator_email || !!app.metadata?.ACCOUNT_ASSIGNMENT_status
                || finalSpec.includes('OV') || finalSpec.includes('SPEECHX');
            if (hasOpsVal) {
                stages.opsVal++;
                const ovPassed = ovStatus.includes('PASS') || finalIntResult.includes('PASS')
                    || finalSpec.includes('OV - PASSED') || finalSpec.includes('OV-PASSED')
                    || finalSpec.includes('SPEECHX - PASSED') || finalSpec === 'PASSED';
                const ovFailed = ovStatus.includes('FAIL') || ovStatus.includes('REJECT')
                    || finalIntResult.includes('FAIL') || finalSpec.includes('FAIL');
                const progressedPast = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER'].includes(status);
                if (ovPassed || (progressedPast && !ovFailed)) {
                    stages.opsValPassed++;
                }
            }

            if (status.includes('SCHEDULE') || app.metadata?.scheduled_date) {
                stages.scheduling++;
            }

            // Client Assessment
            const hasClientAss = status === 'FINAL_INTERVIEW_SCHEDULED' || status === 'FINAL_INTERVIEW' || status === 'CLIENT_ASSESSMENT' || status === 'CLIENT_INTERVIEW' || status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER' || outcome.isHired;
            if (hasClientAss) {
                stages.clientAssessment++;
                if (status === 'FINAL_INTERVIEW' || status === 'CLIENT_INTERVIEW' || status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER' || outcome.isEndorsed || outcome.isHired) {
                    stages.clientAssessmentPassed++;
                }
            }

            // Client Interview
            const hasClientInt = status === 'FINAL_INTERVIEW' || status === 'CLIENT_INTERVIEW' || status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER' || outcome.isHired;
            if (hasClientInt) {
                stages.clientInterview++;
                if (status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER' || outcome.isHired || outcome.isEndorsed) {
                    stages.clientInterviewPassed++;
                }
            }

            // --- Sequential Funnel Cohort calculations ---
            const isInitialPassed = iiResult === 'PASSED' || outcome.isEndorsed || outcome.isHired || (status !== 'INITIAL_INTERVIEW' && status !== 'QUEUE_ASSIGNED' && status !== 'FAILED' && status !== 'REJECTED' && !status.includes('FAIL'));
            const isTypingPassed = (app.typing_test_wpm !== null && app.typing_test_wpm >= 40 && (app.typing_test_accuracy === null || parseFloat(String(app.typing_test_accuracy)) >= 90)) || outcome.isEndorsed || outcome.isHired || (status !== 'INITIAL_INTERVIEW' && status !== 'QUEUE_ASSIGNED' && status !== 'TYPING_TEST' && status !== 'FAILED' && status !== 'REJECTED' && !status.includes('FAIL'));

            // s1 (Applied)
            funnelStages.s1_reached++; funnelStages.s1_candidates.push(app);
            if (isInitialPassed) funnelStages.s1_passed++; // passed initial interview

            // s2 (Typing Test)
            if (isInitialPassed) {
                funnelStages.s2_reached++; funnelStages.s2_candidates.push(app);
                if (isTypingPassed) funnelStages.s2_passed++; // passed typing test
            }

            // s3 (Assessment)
            const hasAssessmentScore = app.assessment_score !== null && app.assessment_score !== undefined;
            let isAssessmentPassed = false;
            if (hasAssessmentScore) {
                const rawScore = app.assessment_score;
                const upperScore = String(rawScore || '').toUpperCase().trim();
                const isCEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(upperScore) || upperScore.match(/[ABC][12]/) != null;

                if (isCEFR) {
                    const cefr = upperScore.match(/[ABC][12]/)?.[0] || 'B1';
                    isAssessmentPassed = ['B2', 'C1', 'C2'].includes(cefr);
                } else {
                    const parsed = parseFloat(String(rawScore));
                    isAssessmentPassed = !isNaN(parsed) && parsed >= 70;
                }
            }
            if (isInitialPassed && isTypingPassed) {
                funnelStages.s3_reached++; funnelStages.s3_candidates.push(app); // Reached assessment

                // If they passed typing, did they pass assessment?
                // Also pass if they are already endorsed or have a later status
                const isS3PassedExplicit = hasAssessmentScore && isAssessmentPassed;
                const progressedPastS3 = (status !== 'INITIAL_INTERVIEW' && status !== 'QUEUE_ASSIGNED' && status !== 'TYPING_TEST' && status !== 'ASSESSMENT' && status !== 'ASSESSMENT_II' && status !== 'FAILED' && status !== 'REJECTED' && !status.includes('FAIL'));

                if (isS3PassedExplicit || progressedPastS3 || outcome.isEndorsed || outcome.isHired) {
                    funnelStages.s3_passed++;
                    isAssessmentPassed = true;
                }
            }

            const s3_passed = isInitialPassed && isTypingPassed && isAssessmentPassed;

            const isScheduledOV = status === 'FINAL_INTERVIEW_SCHEDULED' && !!app.endorsement_meeting_date;
            const hasFinalResultOV = ['PASSED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'HIRED', 'HIRED_PROCESSED', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER'].includes(status) ||
                ((status === 'REJECTED' || status === 'FAILED') && (finalIntResult === 'FAILED' || ovStatus === 'FAILED' || finalSpec.includes('FAIL') || ovStatus.includes('FAIL')));
            const reachedActualInterview = isScheduledOV || hasFinalResultOV || ['ACCOUNT_ASSIGNMENT', 'ACCOUNT_ASSIGNMENT_INTERVIEW', 'FINAL_INTERVIEW'].includes(status);

            const s4_reached = s3_passed && reachedActualInterview;
            const ovPassed = ovStatus.includes('PASS') || finalIntResult.includes('PASS')
                || finalSpec.includes('OV - PASSED') || finalSpec.includes('OV-PASSED')
                || finalSpec.includes('SPEECHX - PASSED') || finalSpec === 'PASSED';
            const ovFailed = ovStatus.includes('FAIL') || ovStatus.includes('REJECT')
                || finalIntResult.includes('FAIL') || finalSpec.includes('FAIL');
            const progressedPast = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER'].includes(status);
            const isOpsValPassed = ovPassed || (progressedPast && !ovFailed);
            const s4_passed = s4_reached && isOpsValPassed;
            if (s4_reached) {
                funnelStages.s4_reached++;
                funnelStages.s4_candidates.push(app);
            }
            if (s4_passed) funnelStages.s4_passed++;

            const s5_reached = s4_passed;
            const isClientAssessmentPassed = status === 'FINAL_INTERVIEW' || status === 'CLIENT_INTERVIEW' || status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER' || outcome.isEndorsed || outcome.isHired;
            const s5_passed = s5_reached && isClientAssessmentPassed;
            if (s5_reached) {
                funnelStages.s5_reached++;
                funnelStages.s5_candidates.push(app);
            }
            if (s5_passed) funnelStages.s5_passed++;

            const s6_reached = s5_passed;
            const isClientInterviewPassed = status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER' || outcome.isHired || outcome.isEndorsed;
            const s6_passed = s6_reached && isClientInterviewPassed;
            if (s6_reached) {
                funnelStages.s6_reached++;
                funnelStages.s6_candidates.push(app);
            }
            if (s6_passed) funnelStages.s6_passed++;

            const s7_reached = s6_passed;
            const s7_passed = s7_reached && outcome.isHired;
            if (s7_reached) {
                funnelStages.s7_reached++;
            }
            if (s7_passed) funnelStages.s7_passed++;

            // ── DEMOGRAPHICS ──
            const edu = categorizeEducation(p.highest_education || '');
            if (!eduCounts[edu]) eduCounts[edu] = { count: 0, passed: 0 };
            eduCounts[edu].count++;
            if (outcome.isEndorsed) eduCounts[edu].passed++;

            const rawSource = p.candidate_source || p.hiring_source || 'Website';
            const srcKey = rawSource.toUpperCase().includes('REFER') ? 'Referrals' :
                rawSource.toUpperCase().includes('FACEBOOK') ? 'Facebook' :
                    rawSource.toUpperCase().includes('LINKEDIN') ? 'LinkedIn' :
                        rawSource.toUpperCase().includes('INDEED') ? 'Indeed' : 'Job Portals / Others';
            if (!sourceCounts[srcKey]) sourceCounts[srcKey] = { count: 0, passed: 0, hired: 0 };
            sourceCounts[srcKey].count++;
            if (outcome.isEndorsed) sourceCounts[srcKey].passed++;
            if (outcome.isHired) sourceCounts[srcKey].hired++;

            if (!recruiterMap.has(recName)) {
                recruiterMap.set(recName, { screened: 0, passed: 0, failed: 0, assigned: 0, endorsed: 0, hired: 0 });
            }
            const recStat = recruiterMap.get(recName)!;
            recStat.screened++;
            if (iiResult === 'PASSED') {
                recStat.passed++;
            } else if (iiResult === 'FAILED') {
                recStat.failed++;
            }
            if (app.department) recStat.assigned++;
            if (outcome.isEndorsed) recStat.endorsed++;
            if (outcome.isHired) recStat.hired++;

            // ── PER-ACCOUNT TRACKING ──
            const mhrtAccounts = reportsState.mhrtAccounts || [];

            // Known base accounts to forcefully group variants
            const KNOWN_ACCOUNTS = [
                'ENERCARE', 'ONCOURSE', 'DOORDASH', 'ABBOTT', 'AUTO APPROVE',
                'KELLER POSTMAN', 'TELLIHEALTH', 'PAESSLER', 'PUROLATOR',
                'TFG', 'FINANCE', 'RIIPEN', 'REGENCY', 'NJS', 'THE SAVINGS GROUP',
                'TEAM LEADER POSITION', 'HUMAN RESOURCES', 'GLOBAL MEET', 'GRIDMATIC',
                'HARDROCK', 'IWIRELESS', 'MANAGERIAL POSITION', 'ADMIN OPS SHARED COST',
                'AMBIENCE AIR', 'FACILITIES', 'IT', 'ADMIN', 'EXACT SCIENCES', 'TENNIS CHANNEL',
                'QUALITY ASSURANCE', 'WORKFORCE', 'SAFETY OFFICER', 'TPV'
            ];

            const rawAccounts = getTrueAccounts(app);
            const depts = rawAccounts.map((s: string, index: number) => {
                let rawDept = s.trim().toUpperCase();

                // First try known base accounts
                let matchedKnown = KNOWN_ACCOUNTS.find(acc => rawDept.startsWith(acc));

                // Also check MHRT accounts for a longer prefix match
                let bestMatch = mhrtAccounts.reduce((best: any, current: any) => {
                    const accName = (current.account || '').trim().toUpperCase();
                    if (accName && rawDept.startsWith(accName)) {
                        if (!best || accName.length > (best.account || '').trim().length) {
                            return current;
                        }
                    }
                    return best;
                }, null);

                let actualDept = rawDept;
                let extractedLob = '';

                // Prefer the longer match between KNOWN_ACCOUNTS and mhrtAccounts
                let longestPrefix = '';
                if (matchedKnown && bestMatch) {
                    longestPrefix = matchedKnown.length >= (bestMatch.account || '').trim().length ? matchedKnown : (bestMatch.account || '').trim().toUpperCase();
                } else if (matchedKnown) {
                    longestPrefix = matchedKnown;
                } else if (bestMatch) {
                    longestPrefix = (bestMatch.account || '').trim().toUpperCase();
                }

                if (longestPrefix) {
                    actualDept = longestPrefix;
                    extractedLob = rawDept.substring(longestPrefix.length).replace(/^[- ]+/, '').trim();
                    if (!extractedLob && bestMatch) {
                        extractedLob = String(bestMatch.lob || '').toUpperCase();
                    }
                } else {
                    // Fallback splitting if no exact match but there's a dash
                    if (rawDept.includes(' - ')) {
                        const parts = rawDept.split(' - ');
                        actualDept = parts[0].trim();
                        extractedLob = parts.slice(1).join(' - ').trim();
                    }
                }

                return { dept: actualDept, lobOverride: extractedLob, isPrimary: index === 0 };
            }).filter((d: any) => d.dept);

            const processedDeptsForApp = new Set<string>();
            const isOngoing = !outcome.isHired && !outcome.isFailed && !outcome.isWithdrawn;
            depts.forEach(({ dept, lobOverride, isPrimary }: { dept: string, lobOverride: string, isPrimary: boolean }) => {
                const isOncourse = dept.toUpperCase() === 'ONCOURSE';
                if (!accountMap.has(dept)) {
                    const initialLobs: any = {};

                    // Add official registered LOBs from mhrtAccounts for THIS account
                    mhrtAccounts.filter((a: any) => (a.account || '').trim().toUpperCase() === dept).forEach((a: any) => {
                        const lName = String(a.lob || '').trim().toUpperCase();
                        if (lName && lName !== 'UNSPECIFIED JOB POSITION') {
                            if (isOncourse || lName !== 'AGENT') {
                                initialLobs[lName] = { count: 0, hired: 0, ongoing: 0, internalCount: 0, externalCount: 0, hiredInternalCount: 0, hiredExternalCount: 0, candidates_applied: [], candidates_hired: [], candidates_ongoing: [] };
                            }
                        }
                    });

                    // Also add LOBs from departmentsList (sub_accounts / subAccounts)
                    const deptObj = (reportsState.departmentsList || []).find((d: any) => (d.name || '').trim().toUpperCase() === dept);
                    if (deptObj && (deptObj.subAccounts || deptObj.sub_accounts)) {
                        const subs = deptObj.subAccounts || deptObj.sub_accounts || [];
                        subs.forEach((s: any) => {
                            const name = String(s.name || s).trim().toUpperCase();
                            if (name && name !== 'UNSPECIFIED JOB POSITION') {
                                initialLobs[name] = { count: 0, hired: 0, ongoing: 0, internalCount: 0, externalCount: 0, hiredInternalCount: 0, hiredExternalCount: 0, candidates_applied: [], candidates_hired: [], candidates_ongoing: [] };
                            }
                        });
                    }

                    // Default fallback LOB key for THIS account
                    const defaultKey = isOncourse ? 'AGENT' : 'UNSPECIFIED JOB POSITION';
                    if (!initialLobs[defaultKey]) {
                        initialLobs[defaultKey] = { count: 0, hired: 0, ongoing: 0, internalCount: 0, externalCount: 0, hiredInternalCount: 0, hiredExternalCount: 0, candidates_applied: [], candidates_hired: [], candidates_ongoing: [] };
                    }

                    accountMap.set(dept, { count: 0, hired: 0, failed: 0, endorsed: 0, scheduled: 0, typingPassed: 0, typingTotal: 0, typingOngoing: 0, assessmentPassed: 0, assessmentTotal: 0, assessmentOngoing: 0, opsValPassed: 0, opsValTotal: 0, clientAssPassed: 0, clientAssTotal: 0, clientAssOngoing: 0, clientIntPassed: 0, clientIntTotal: 0, clientIntOngoing: 0, ongoing: 0, lobs: initialLobs, internalCount: 0, externalCount: 0, hiredInternalCount: 0, hiredExternalCount: 0 });
                }
                const accStat = accountMap.get(dept)!;
                const globalType = String(app.hiring_type || app.metadata?.hiring_type || '').toUpperCase();
                if (!processedDeptsForApp.has(dept)) {
                    processedDeptsForApp.add(dept);
                    accStat.count++;
                    if (isOngoing) accStat.ongoing++;
                    if (globalType === 'INTERNAL' || globalType === 'BILLED') {
                        accStat.internalCount++;
                    } else {
                        accStat.externalCount++;
                    }
                }
                if (outcome.isHired) {
                    accStat.hired++;
                    if (globalType === 'INTERNAL' || globalType === 'BILLED') {
                        accStat.hiredInternalCount++;
                    } else {
                        accStat.hiredExternalCount++;
                    }
                }
                if (outcome.isFailed) accStat.failed++;
                if (outcome.isEndorsed) accStat.endorsed++;
                if (status.includes('SCHEDULE') || app.metadata?.scheduled_date) accStat.scheduled++;
                if (app.typing_test_wpm != null || status === 'TYPING_TEST') { accStat.typingTotal++; if ((app.typing_test_wpm || 0) >= 35) accStat.typingPassed++; if (status === 'TYPING_TEST') accStat.typingOngoing++; }
                if (hasAss || status === 'ASSESSMENT') {
                    accStat.assessmentTotal++;
                    if (status === 'ASSESSMENT') accStat.assessmentOngoing++;
                    const ascores = app.metadata?.assessment_scores || app.pis?.assessment_scores || {};
                    const passAny = Object.keys(ascores).length > 0
                        ? Object.values(ascores).some((v2: any) => (v2.status || '').toUpperCase() === 'PASSED' || parseFloat(String(v2.score || v2)) >= 70)
                        : isPassed || (p.overall_assessment || '').toUpperCase() === 'PASSED' || status.includes('CLIENT') || outcome.isEndorsed || outcome.isHired;
                    if (passAny) accStat.assessmentPassed++;
                }
                if (app.metadata?.ACCOUNT_ASSIGNMENT_status || app.pis?.ACCOUNT_ASSIGNMENT_status) { accStat.opsValTotal++; if (String(app.metadata?.ACCOUNT_ASSIGNMENT_status || app.pis?.ACCOUNT_ASSIGNMENT_status).toUpperCase() === 'PASSED') accStat.opsValPassed++; }
                if (hasClientAss || status === 'CLIENT_ASSESSMENT') {
                    accStat.clientAssTotal++;
                    if (status === 'CLIENT_ASSESSMENT') accStat.clientAssOngoing++;
                    if (status === 'FINAL_INTERVIEW' || status === 'CLIENT_INTERVIEW' || status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER' || outcome.isEndorsed || outcome.isHired) {
                        accStat.clientAssPassed++;
                    }
                }
                if (hasClientInt || status === 'CLIENT_INTERVIEW' || status === 'CLIENT_INTERVIEW_SCHEDULED') {
                    accStat.clientIntTotal++;
                    if (status === 'CLIENT_INTERVIEW' || status === 'CLIENT_INTERVIEW_SCHEDULED') accStat.clientIntOngoing++;
                    if (status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER' || outcome.isHired || outcome.isEndorsed) {
                        accStat.clientIntPassed++;
                    }
                }

                // Strict per-account LOB extraction using getAppStrictLob
                let targetLobKey = getAppStrictLob(app, mhrtAccounts, reportsState.departmentsList);

                if (!accStat.lobs[targetLobKey]) {
                    targetLobKey = isOncourse ? 'AGENT' : 'UNSPECIFIED JOB POSITION';
                }

                accStat.lobs[targetLobKey].count++;
                accStat.lobs[targetLobKey].candidates_applied.push(app);
                const typeLob = String(app.hiring_type || app.metadata?.hiring_type || '').toUpperCase();
                if (outcome.isHired) {
                    accStat.lobs[targetLobKey].hired++;
                    accStat.lobs[targetLobKey].candidates_hired.push(app);
                    if (typeLob === 'INTERNAL' || typeLob === 'BILLED') {
                        accStat.lobs[targetLobKey].hiredInternalCount++;
                    } else {
                        accStat.lobs[targetLobKey].hiredExternalCount++;
                    }
                }
                if (isOngoing) {
                    accStat.lobs[targetLobKey].ongoing++;
                    accStat.lobs[targetLobKey].candidates_ongoing.push(app);
                }
                if (typeLob === 'INTERNAL' || typeLob === 'BILLED') {
                    accStat.lobs[targetLobKey].internalCount++;
                } else {
                    accStat.lobs[targetLobKey].externalCount++;
                }
            });

            const isFresh = (app.pis?.work_experience || []).length === 0;
            const targetGrad = isFresh ? gradStats.fresh : gradStats.exp;
            targetGrad.count++;
            if (outcome.isHired) targetGrad.hired++;
            if (app.typing_test_wpm) {
                targetGrad.typingSum += app.typing_test_wpm;
                targetGrad.typingCount++;
            }

            const expCat = categorizeExperience(app.pis?.work_experience || []);
            if (!expCounts[expCat]) expCounts[expCat] = { count: 0, passed: 0, hired: 0 };
            expCounts[expCat].count++;
            if (outcome.isEndorsed) expCounts[expCat].passed++;
            if (outcome.isHired) expCounts[expCat].hired++;
        });

        const s1_active = filteredApps.filter((a: any) => { const o = getOutcome(a); const s = String(a.current_status || '').toUpperCase(); return !o.isHired && !o.isFailed && !o.isWithdrawn && ['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'APPLIED'].includes(s); }).length;
        const s2_active = filteredApps.filter((a: any) => { const o = getOutcome(a); const s = String(a.current_status || '').toUpperCase(); return !o.isHired && !o.isFailed && !o.isWithdrawn && ['TYPING_TEST'].includes(s); }).length;
        const s3_active = 0;
        const s4_active = filteredApps.filter((a: any) => { const o = getOutcome(a); const s = String(a.current_status || '').toUpperCase(); return !o.isHired && !o.isFailed && !o.isWithdrawn && ['ASSESSMENT'].includes(s); }).length;
        const s5_active = filteredApps.filter((a: any) => {
            const o = getOutcome(a);
            const s = String(a.current_status || '').toUpperCase();
            const p = (a.pis || {}) as any;
            const ovStatus = String(p.ops_validator_status || p.ops_val_status || p['Ops Val Status'] || p['Ops Validator Status'] || '').toUpperCase();
            const finalIntResult = String(p.final_interview_result || '').toUpperCase();
            const ovCompleted = ovStatus.includes('PASS') || ovStatus.includes('FAIL') || finalIntResult.includes('PASS') || finalIntResult.includes('FAIL');
            return !o.isHired && !o.isFailed && !o.isWithdrawn && !ovCompleted && ['ACCOUNT_ASSIGNMENT', 'ACCOUNT_ASSIGNMENT_INTERVIEW', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW', 'FINAL INTERVIEW SCHEDULED'].includes(s);
        }).length;
        const s6_active = filteredApps.filter((a: any) => { const o = getOutcome(a); const s = String(a.current_status || '').toUpperCase(); return !o.isHired && !o.isFailed && !o.isWithdrawn && ['CLIENT_ASSESSMENT', 'CLIENT ASSESSMENT'].includes(s); }).length;
        const s7_active = filteredApps.filter((a: any) => { const o = getOutcome(a); const s = String(a.current_status || '').toUpperCase(); return !o.isHired && !o.isFailed && !o.isWithdrawn && ['CLIENT_INTERVIEW', 'CLIENT INTERVIEW', 'CLIENT_INTERVIEW_SCHEDULED', 'CLIENT INTERVIEW SCHEDULED'].includes(s); }).length;

        const stageFunnel = [
            {
                name: 'Typing Test',
                count: funnelStages.s2_passed,
                candidates: funnelStages.s2_candidates,
                pct: Math.round((funnelStages.s2_passed / Math.max(funnelStages.s1_reached, 1)) * 100),
                total: funnelStages.s1_reached,
                passed: funnelStages.s2_passed,
                active: s2_active,
                failed: Math.max(0, funnelStages.s1_reached - funnelStages.s2_passed - s2_active),
                passRate: funnelStages.s1_reached > 0 ? Math.round((funnelStages.s2_passed / funnelStages.s1_reached) * 100) : 0
            },
            {
                name: 'Assessment',
                count: funnelStages.s3_passed,
                candidates: funnelStages.s3_candidates,
                pct: Math.round((funnelStages.s3_passed / Math.max(funnelStages.s1_reached, 1)) * 100),
                total: funnelStages.s3_reached,
                passed: funnelStages.s3_passed,
                active: s4_active,
                failed: Math.max(0, funnelStages.s3_reached - funnelStages.s3_passed - s4_active),
                passRate: funnelStages.s3_reached > 0 ? Math.round((funnelStages.s3_passed / funnelStages.s3_reached) * 100) : 0
            },
            {
                name: 'Operations Validator Interview',
                count: funnelStages.s4_passed,
                candidates: funnelStages.s4_candidates,
                pct: Math.round((funnelStages.s4_passed / Math.max(funnelStages.s1_reached, 1)) * 100),
                total: funnelStages.s3_passed,
                passed: funnelStages.s4_passed,
                active: s5_active,
                failed: Math.max(0, funnelStages.s3_passed - funnelStages.s4_passed - s5_active),
                passRate: funnelStages.s3_passed > 0 ? Math.round((funnelStages.s4_passed / funnelStages.s3_passed) * 100) : 0
            },
            {
                name: 'Client Assessment',
                count: funnelStages.s5_passed,
                candidates: funnelStages.s5_candidates,
                pct: Math.round((funnelStages.s5_passed / Math.max(funnelStages.s1_reached, 1)) * 100),
                total: funnelStages.s4_passed,
                passed: funnelStages.s5_passed,
                active: s6_active,
                failed: Math.max(0, funnelStages.s4_passed - funnelStages.s5_passed - s6_active),
                passRate: funnelStages.s4_passed > 0 ? Math.round((funnelStages.s5_passed / funnelStages.s4_passed) * 100) : 0
            },
            {
                name: 'Hired',
                count: hired,
                candidates: funnelStages.s7_candidates,
                pct: Math.round((hired / Math.max(funnelStages.s1_reached, 1)) * 100),
                total: hired,
                passed: hired,
                active: 0,
                failed: 0,
                passRate: 100
            }
        ];

        if (hasSpecializedClientGlobal) {
            stageFunnel.splice(stageFunnel.length - 1, 0, {
                name: 'Client Interview',
                count: funnelStages.s6_passed,
                candidates: funnelStages.s6_candidates,
                pct: Math.round((funnelStages.s6_passed / Math.max(funnelStages.s1_reached, 1)) * 100),
                total: funnelStages.s5_passed,
                passed: funnelStages.s6_passed,
                active: s7_active,
                failed: Math.max(0, funnelStages.s5_passed - funnelStages.s6_passed - s7_active),
                passRate: funnelStages.s5_passed > 0 ? Math.round((funnelStages.s6_passed / funnelStages.s5_passed) * 100) : 0
            });
        }

        const stagePassRates = [
            { name: 'Typing Pass Rate', rate: stages.typing > 0 ? Math.round((stages.typingPassed / stages.typing) * 100) : 0 },
            { name: 'Assessment Pass Rate', rate: stages.assessment > 0 ? Math.round((stages.assessmentPassed / stages.assessment) * 100) : 0 },
            { name: 'Ops Validator Rate', rate: stages.opsVal > 0 ? Math.round((stages.opsValPassed / stages.opsVal) * 100) : 0 },
            { name: 'Client Assessment Rate', rate: stages.clientAssessment > 0 ? Math.round((stages.clientAssessmentPassed / stages.clientAssessment) * 100) : 0 }
        ];

        if (hasSpecializedClientGlobal) {
            stagePassRates.push({ name: 'Client Interview Rate', rate: stages.clientInterview > 0 ? Math.round((stages.clientInterviewPassed / stages.clientInterview) * 100) : 0 });
        }

        const eduData = Object.keys(eduCounts).map(key => ({
            name: key,
            value: eduCounts[key].count,
            passRate: Math.round((eduCounts[key].passed / Math.max(eduCounts[key].count, 1)) * 100)
        }));

        const sourceData = Object.keys(sourceCounts).map(key => ({
            name: key,
            value: sourceCounts[key].count,
            hireRate: Math.round((sourceCounts[key].hired / Math.max(sourceCounts[key].count, 1)) * 100)
        }));

        const recruiterData = Array.from(recruiterMap.entries())
            .filter(([name]) => name.toUpperCase() !== 'UNASSIGNED')
            .map(([name, stats]) => ({
                name,
                ...stats,
                passRate: Math.round((stats.passed / Math.max(stats.screened, 1)) * 100)
            }));

        const experienceData = Object.keys(expCounts).map(key => ({
            name: key,
            count: expCounts[key].count,
            passRate: Math.round((expCounts[key].passed / Math.max(expCounts[key].count, 1)) * 100),
            hiringRate: Math.round((expCounts[key].hired / Math.max(expCounts[key].count, 1)) * 100)
        }));

        const accountAssignments = Array.from(accountMap.entries())
            .filter(([name]) => name.toUpperCase() !== 'UNASSIGNED')
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                hires: stats.hired,
                passRate: Math.round((stats.endorsed / Math.max(stats.count, 1)) * 100)
            })).sort((a, b) => b.count - a.count);

        // Per-Account Detailed Breakdown (for Overall view or selected account view)
        const perAccountData = Array.from(accountMap.entries())
            .filter(([n]) => n !== 'UNASSIGNED' && (selectedDeptNames.length === 0 || selectedDeptNames.some((d: string) => d.toUpperCase() === n.toUpperCase())))
            .map(([name, s]) => ({
                name,
                count: s.count,
                hired: s.hired,
                failed: s.failed,
                endorsed: s.endorsed,
                scheduled: s.scheduled,
                ongoing: s.ongoing,
                externalCount: s.externalCount,
                internalCount: s.internalCount,
                hiredInternalCount: s.hiredInternalCount,
                hiredExternalCount: s.hiredExternalCount,
                lobs: s.lobs,
                passRate: Math.round((s.endorsed / Math.max(s.count, 1)) * 100),
                hireRate: Math.round((s.hired / Math.max(s.count, 1)) * 100),
                failRate: Math.round((s.failed / Math.max(s.count, 1)) * 100),
                typingTotal: s.typingTotal,
                typingPassed: s.typingPassed,
                typingOngoing: s.typingOngoing,
                assessmentTotal: s.assessmentTotal,
                assessmentPassed: s.assessmentPassed,
                assessmentOngoing: s.assessmentOngoing,
                clientAssTotal: s.clientAssTotal,
                clientAssPassed: s.clientAssPassed,
                clientAssOngoing: s.clientAssOngoing,
                clientIntTotal: s.clientIntTotal,
                clientIntPassed: s.clientIntPassed,
                clientIntOngoing: s.clientIntOngoing,
                opsValTotal: s.opsValTotal,
                opsValPassed: s.opsValPassed
            })).sort((a, b) => b.count - a.count);

        // Account Performance Matrix (Pass, Hiring, Fail Rates)
        const accountMetricsData = Array.from(accountMap.entries()).map(([name, stats]) => {
            const passVal = Math.round((stats.endorsed / Math.max(stats.count, 1)) * 100);
            const hireVal = Math.round((stats.hired / Math.max(stats.count, 1)) * 100);
            const failVal = Math.round((stats.failed / Math.max(stats.count, 1)) * 100);
            return {
                name: name.substring(0, 10),
                'Pass Rate (%)': passVal,
                'Hiring Rate (%)': hireVal,
                'Fail Rate (%)': failVal
            };
        }).slice(0, 5); // top 5 accounts

        // Dot Chart Data mapping (Scatter Plot of recruiters Screened vs Hired)
        const dotChartData = recruiterData.map((r, i) => ({
            x: r.screened,
            y: r.hired,
            size: r.passRate,
            name: r.name
        }));

        const aiInsights = [];
        if (accountAssignments.length > 0) {
            aiInsights.push({ text: `Account ${accountAssignments[0].name} leads in total candidate endorsements.`, type: 'info' });
        }
        if (recruiterData.length > 0) {
            const topRec = [...recruiterData].sort((a, b) => b.hired - a.hired)[0];
            aiInsights.push({ text: `Recruiter ${topRec.name} yielded the highest hire output of ${topRec.hired} candidates.`, type: 'success' });
        }

        const hiringTypeData = [
            { name: 'Internal', count: 0, passed: 0 },
            { name: 'External', count: 0, passed: 0 },
        ];
        filteredApps.forEach((app: any) => {
            const type = (app.hiring_type || (app as any).metadata?.hiring_type || '').toUpperCase();
            const isInternal = type.includes('INTERNAL') || type === 'BILLED';
            const outcome = getOutcome(app);
            if (isInternal) {
                hiringTypeData[0].count++;
                if (outcome.isEndorsed || outcome.isHired) hiringTypeData[0].passed++;
            } else {
                hiringTypeData[1].count++;
                if (outcome.isEndorsed || outcome.isHired) hiringTypeData[1].passed++;
            }
        });

        return {
            hasSpecializedClientGlobal,
            total,
            hired,
            endorsed,
            failed,
            withdrawn,
            active,
            passRate: Math.round((endorsed / Math.max(endorsed + failed, 1)) * 100),
            conversionRate: Math.round((hired / Math.max(endorsed, 1)) * 100),
            avgTime: timeCount > 0 ? Math.round(totalTime / timeCount) : 0,
            scheduled,
            reprofileRate: Math.round((reprofileCount / total) * 100),
            stageFunnel,
            stagePassRates,
            sourceData,
            recruiterData,
            accountAssignments,
            eduData,
            freshGradStats: gradStats,
            experienceData,
            tagCounts: {
                noShow: tagNoShow,
                notEligible: tagNotEligible,
                waitlisted: tagWaitlisted,
                blacklisted: tagBlacklisted,
                withdrawn: tagWithdrawn,
                promotion: tagPromotion,
                lateralTransfer: tagLateralTransfer,
                endorsedOv: tagEndorsedOv
            },
            perAccountData,
            accountMetricsData,
            dotChartData,
            aiInsights,
            hiringTypeData,
            pendingTracker
        };
    }, [filteredApps, getOutcome, categorizeEducation, categorizeExperience, tagRecruiter, lobUpdateTrigger]);

    const isOverall = selectedDeptNames.length === 0;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-800/80 select-none overflow-y-auto">
            <Modal
                open={!!selectedFunnelStage}
                onClose={() => setSelectedFunnelStage(null)}
                title={selectedFunnelStage ? `Pipeline Stage: ${selectedFunnelStage.name}` : 'Pipeline Stage'}
                size="7xl"
            >

                <div className="flex flex-col bg-white dark:bg-slate-900">
                    {/* Filters Bar */}
                    <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</label>
                            <select
                                value={modalStatusFilter}
                                onChange={e => setModalStatusFilter(e.target.value)}
                                className="w-full text-xs py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            >
                                <option value="All">All Statuses</option>
                                {filterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recruiter</label>
                            <select
                                value={modalRecruiterFilter}
                                onChange={e => setModalRecruiterFilter(e.target.value)}
                                className="w-full text-xs py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                            >
                                <option value="All">All Recruiters</option>
                                {filterOptions.recruiters.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Applied</label>
                            <input
                                type="date"
                                value={modalDateFilter}
                                onChange={e => setModalDateFilter(e.target.value)}
                                className="w-full text-xs py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700 dark:text-slate-300"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 justify-end">
                            <div className="h-[14px]"></div>
                            <button onClick={() => {
                                setModalStatusFilter('All');
                                setModalRecruiterFilter('All');
                                setModalDateFilter('');
                            }} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 underline px-2 py-1.5">
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="p-0 max-h-[65vh] overflow-y-auto">
                        {displayCandidates.length > 0 ? (
                            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider z-10 shadow-xs">
                                    <tr>
                                        <th className="px-4 py-3 w-10 text-center text-slate-400">#</th>
                                        <th className="px-4 py-3 w-52">Applicant Name</th>
                                        <th className="px-4 py-3 w-64">Email</th>
                                        <th className="px-4 py-3 w-36">Status</th>
                                        <th className="px-4 py-3 min-w-[150px]">Position Title</th>
                                        <th className="px-4 py-3 w-40">Endorsing Recruiter</th>
                                        <th className="px-4 py-3 w-40">Assigned Account</th>
                                        <th className="px-4 py-3 w-48 text-center">Job Position</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-900">
                                    {displayCandidates.map((c: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/90 transition-colors group">
                                            <td className="px-4 py-2.5 text-center text-slate-400 font-medium group-hover:text-slate-500 dark:text-slate-400 text-sm">
                                                {i + 1}
                                            </td>
                                            <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                {getCandidateName(c)}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-medium text-sm truncate max-w-[220px]" title={getCandidateEmail(c)}>
                                                {getCandidateEmail(c)}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center">
                                                    <span className={`px-2.5 py-0.5 rounded-none text-sm font-bold border tracking-wide uppercase ${(c.current_status || '').toUpperCase().includes('HIRED') || (c.current_status || '').toUpperCase().includes('ACCEPTED')
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : (c.current_status || '').toUpperCase().includes('FAIL') || (c.current_status || '').toUpperCase().includes('REJECT')
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        }`}>
                                                        {(c.current_status || 'Unknown').replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600 font-medium text-xs truncate max-w-[180px]" title={c.position_title || 'N/A'}>
                                                {c.position_title || 'N/A'}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600 font-medium text-sm truncate max-w-[160px]" title={c.assigned_recruiter_name || c.interviewer_name || 'System'}>
                                                {c.assigned_recruiter_name || c.interviewer_name || 'System'}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                                                    {getTrueAccount(c)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <EditableLobSelect candidate={c} mhrtAccounts={reportsState.mhrtAccounts || []} departmentsList={reportsState.departmentsList || []}
                                                    onUpdate={() => setLobUpdateTrigger(prev => prev + 1)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                                <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm font-medium">No candidates found</div>
                                <div className="text-xs mt-1 text-slate-400">Try adjusting your filters to see more results.</div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Weekly Report Executive Modal */}
            <Modal
                open={isWeeklyReportModalOpen}
                onClose={() => setIsWeeklyReportModalOpen(false)}
                title="Weekly Recruitment Performance & Conversion Report"
                size="xl"
            >
                <div className="p-6 bg-slate-50 dark:bg-slate-800 flex flex-col gap-6 max-h-[80vh] overflow-y-auto print:bg-white dark:bg-slate-900 print:max-h-none text-left">
                    {/* Executive Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-none shadow-lg border border-slate-800 flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
                                <Calendar className="w-4 h-4" />
                                <span>Weekly Executive Performance Summary</span>
                            </div>
                            <h2 className="text-xl font-black mt-1 tracking-tight">
                                {weeklyData.startOfWeekStr} – {weeklyData.endOfWeekStr}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Enterprise account pipeline conversion, onboarding metrics, and candidate distribution
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleExportWeeklyCSV}
                                className="px-3.5 py-2 bg-white/10 dark:bg-slate-900/10 hover:bg-white/20 dark:hover:bg-slate-900/20 text-white text-xs font-bold rounded-none border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                                Export CSV
                            </button>
                            <button
                                onClick={handlePrintWeeklyReport}
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-none shadow transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Print / Save PDF
                            </button>
                        </div>
                    </div>

                    {/* Executive Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-none shadow-xs">
                            <div className="text-sm font-extrabold text-slate-400 uppercase tracking-wider">Weekly Assigned</div>
                            <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{weeklyData.totalAssigned}</div>
                            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Candidates in Pipeline</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-emerald-200/80 p-4 rounded-none shadow-xs bg-emerald-50/20">
                            <div className="text-sm font-extrabold text-emerald-600 uppercase tracking-wider">Weekly Hires</div>
                            <div className="text-2xl font-black text-emerald-600 mt-1">{weeklyData.totalHires}</div>
                            <div className="text-sm font-semibold text-emerald-700 mt-1">Successful Hires</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-blue-200/80 p-4 rounded-none shadow-xs bg-blue-50/20">
                            <div className="text-sm font-extrabold text-blue-600 uppercase tracking-wider">Hire Conversion</div>
                            <div className="text-2xl font-black text-blue-600 mt-1">{weeklyData.hireRate}%</div>
                            <div className="text-sm font-semibold text-blue-700 mt-1">Hires / Total Assigned</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-amber-200/80 p-4 rounded-none shadow-xs bg-amber-50/20">
                            <div className="text-sm font-extrabold text-amber-600 uppercase tracking-wider">Active Pipeline</div>
                            <div className="text-2xl font-black text-amber-600 mt-1">{weeklyData.totalOngoing}</div>
                            <div className="text-sm font-semibold text-amber-700 mt-1">Ongoing Candidate Pool</div>
                        </div>
                    </div>

                    {/* Weekly Account Performance Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-none overflow-hidden shadow-xs">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-600" />
                                Per-Account Weekly Performance Matrix
                            </h3>
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                {Object.keys(weeklyData.accountBreakdown).length} Accounts Active
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-800/50/70 text-slate-600 text-sm font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3">Account Name</th>
                                        <th className="px-4 py-3 text-center">Assigned Candidates</th>
                                        <th className="px-4 py-3 text-center">Weekly Hires</th>
                                        <th className="px-4 py-3 text-center">Hire Rate (%)</th>
                                        <th className="px-4 py-3 text-center">Ongoing Pipeline</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(weeklyData.accountBreakdown).map(([acc, stats], idx) => {
                                        const hr = Math.round((stats.hires / Math.max(stats.assigned, 1)) * 100);
                                        return (
                                            <tr key={acc} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors">
                                                <td className="px-5 py-3 font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                    <span className="text-slate-400 text-sm">{idx + 1}.</span>
                                                    {acc}
                                                </td>
                                                <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">{stats.assigned}</td>
                                                <td className="px-4 py-3 text-center font-bold text-emerald-600">{stats.hires}</td>
                                                <td className="px-4 py-3 text-center font-semibold text-blue-600">{hr}%</td>
                                                <td className="px-4 py-3 text-center font-medium text-amber-600">{stats.ongoing}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Modal>



            <div className="p-5 space-y-5">
                {/* Global Filters Panel */}
                <div className="bg-[#0B1A42] border border-[#162758] shadow-md rounded-lg p-5 text-left mb-6 relative z-[200]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 items-start">

                        {/* Exclusive Toggle */}
                        {isAdminOrSuperAdmin && (
                            <div className="flex flex-col gap-2 relative">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 invisible">Exclusive</label>
                                <button
                                    type="button"
                                    onClick={() => setIsExclusiveMode(!isExclusiveMode)}
                                    className={cn(
                                        "w-full h-8 flex items-center justify-center gap-1.5 px-3 text-[12.5px] font-medium transition-all rounded-[6px] border shadow-sm hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out",
                                        isExclusiveMode
                                            ? "bg-[#0078D4] border-[#0078D4] text-white shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10"
                                            : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                                    )}
                                    title="Toggle Hidden Candidates"
                                >
                                    {isExclusiveMode ? <EyeOff size={14} strokeWidth={2.5} className="text-white" /> : <Eye size={14} strokeWidth={2.5} className="text-slate-400" />}
                                    Hidden (Exclusive)
                                </button>
                            </div>
                        )}

                        {/* Account Multi-Select Checklist */}
                        <div className="flex flex-col gap-2 relative" ref={accountDropdownRef}>
                            <label className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider pl-1">Target Account</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                                    className={cn(
                                        "w-full h-8 pl-3 pr-8 flex items-center gap-2.5 text-[12.5px] font-medium transition-all rounded-[6px] border shadow-sm hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out text-left",
                                        selectedDeptNames.length > 0 || isAccountDropdownOpen
                                            ? "bg-[#0078D4] border-[#0078D4] text-white shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10"
                                            : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                                    )}
                                >
                                    {selectedDeptNames.length === 0 ? (
                                        <><Layers className={cn("w-4 h-4 shrink-0", selectedDeptNames.length > 0 || isAccountDropdownOpen ? "text-white" : "text-slate-400")} /> <span className="truncate">All Accounts</span></>
                                    ) : selectedDeptNames.length <= 2 ? (
                                        <><Layers className="w-4 h-4 text-white shrink-0" /> <span className="truncate">{selectedDeptNames.join(', ')}</span></>
                                    ) : (
                                        <><Layers className="w-4 h-4 text-white shrink-0" /> <span>{selectedDeptNames.length} accounts</span></>
                                    )}
                                    {selectedDeptNames.length > 0 && (
                                        <span className="ml-auto mr-5 bg-white/20 text-white text-[10px] font-black rounded w-4 h-4 flex items-center justify-center shrink-0">{selectedDeptNames.length}</span>
                                    )}
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", (selectedDeptNames.length > 0 || isAccountDropdownOpen) ? "text-white rotate-180" : "text-slate-400")} />
                                    </div>
                                </button>

                                {isAccountDropdownOpen && (
                                    <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
                                        {/* Search + Actions */}
                                        <div className="p-2 border-b border-slate-100 space-y-1.5">
                                            <input
                                                type="text"
                                                placeholder="Search accounts..."
                                                value={accountSearch}
                                                onChange={(e) => setAccountSearch(e.target.value)}
                                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-none text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-400 placeholder-slate-400"
                                                autoFocus
                                            />
                                            <div className="flex items-center justify-between px-1">
                                                <button type="button" onClick={() => setSelectedDeptNames([...availableAccounts])} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Select All</button>
                                                <button type="button" onClick={() => setSelectedDeptNames([])} className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors">Clear All</button>
                                            </div>
                                        </div>
                                        {/* Checklist */}
                                        <div className="overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
                                            {availableAccounts
                                                .filter((acc: string) => !accountSearch || acc.toUpperCase().includes(accountSearch.toUpperCase()))
                                                .map((acc: string) => {
                                                    const isChecked = selectedDeptNames.some((d: string) => d.toUpperCase() === acc.toUpperCase());
                                                    return (
                                                        <label
                                                            key={acc}
                                                            className={cn(
                                                                "w-full px-3 py-2 rounded-none text-xs font-bold flex items-center gap-2.5 transition-colors text-left uppercase cursor-pointer",
                                                                isChecked ? "bg-indigo-50 text-indigo-700" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                                                            )}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    if (isChecked) {
                                                                        setSelectedDeptNames((prev: string[]) => prev.filter((d: string) => d.toUpperCase() !== acc.toUpperCase()));
                                                                    } else {
                                                                        setSelectedDeptNames((prev: string[]) => [...prev, acc]);
                                                                    }
                                                                }}
                                                                className="w-3.5 h-3.5 rounded-none border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer accent-indigo-600"
                                                            />
                                                            <img
                                                                src={getAccountImage(acc)}
                                                                alt={acc}
                                                                className="w-5 h-5 rounded-none object-contain border border-slate-200 dark:border-slate-800 p-0.5 shrink-0 bg-white dark:bg-slate-900"
                                                                onError={(e) => { e.currentTarget.src = '/contactpoint-logo.png?v=2'; }}
                                                            />
                                                            <span className="truncate">{acc}</span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Job Position Multi-Select Checklist */}
                        <div className="flex flex-col gap-2 relative" ref={lobDropdownRef}>
                            <label className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider pl-1">Job Position</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsLobDropdownOpen(!isLobDropdownOpen)}
                                    className={cn(
                                        "w-full h-8 pl-3 pr-8 flex items-center gap-2.5 text-[12.5px] font-medium transition-all rounded-[6px] border shadow-sm hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out text-left",
                                        lobFilters.length > 0 || isLobDropdownOpen
                                            ? "bg-[#0078D4] border-[#0078D4] text-white shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10"
                                            : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                                    )}
                                >
                                    <Briefcase className={cn("w-4 h-4 shrink-0", (lobFilters.length > 0 || isLobDropdownOpen) ? "text-white" : "text-slate-400")} />
                                    {lobFilters.length === 0 ? (
                                        <span className="truncate">All Job Positions</span>
                                    ) : lobFilters.length === 1 ? (
                                        <span className="truncate">{lobFilters[0]}</span>
                                    ) : (
                                        <span>{lobFilters.length} positions</span>
                                    )}
                                    {lobFilters.length > 0 && (
                                        <span className="ml-auto mr-5 bg-white/20 text-white text-[10px] font-black rounded w-4 h-4 flex items-center justify-center shrink-0">{lobFilters.length}</span>
                                    )}
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", (lobFilters.length > 0 || isLobDropdownOpen) ? "text-white rotate-180" : "text-slate-400")} />
                                    </div>
                                </button>

                                {isLobDropdownOpen && (
                                    <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
                                        <div className="p-2 border-b border-slate-100 space-y-1.5">
                                            <input
                                                type="text"
                                                placeholder="Search positions..."
                                                value={lobSearch}
                                                onChange={(e) => setLobSearch(e.target.value)}
                                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-none text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400 placeholder-slate-400"
                                                autoFocus
                                            />
                                            <div className="flex items-center justify-between px-1">
                                                <button type="button" onClick={() => setLobFilters([...availableLobs])} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">Select All</button>
                                                <button type="button" onClick={() => setLobFilters([])} className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors">Clear All</button>
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
                                            {availableLobs
                                                .filter((lob: any) => !lobSearch || String(lob).toUpperCase().includes(lobSearch.toUpperCase()))
                                                .map((lob: any) => {
                                                    const isChecked = lobFilters.some((f: string) => f.toUpperCase() === String(lob).toUpperCase());
                                                    return (
                                                        <label
                                                            key={lob}
                                                            className={cn(
                                                                "w-full px-3 py-2 rounded-none text-xs font-bold flex items-center gap-2.5 transition-colors text-left uppercase cursor-pointer",
                                                                isChecked ? "bg-blue-50 text-blue-700" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                                                            )}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    if (isChecked) {
                                                                        setLobFilters((prev: string[]) => prev.filter((f: string) => f.toUpperCase() !== String(lob).toUpperCase()));
                                                                    } else {
                                                                        setLobFilters((prev: string[]) => [...prev, String(lob)]);
                                                                    }
                                                                }}
                                                                className="w-3.5 h-3.5 rounded-none border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer accent-blue-600"
                                                            />
                                                            <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                            <span className="truncate">{lob}</span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hiring Type Multi-Select Checklist */}
                        <div className="flex flex-col gap-2 relative" ref={hiringTypeDropdownRef}>
                            <label className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider pl-1">Hiring Type</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsHiringTypeDropdownOpen(!isHiringTypeDropdownOpen)}
                                    className={cn(
                                        "w-full h-8 pl-3 pr-8 flex items-center gap-2.5 text-[12.5px] font-medium transition-all rounded-[6px] border shadow-sm hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out text-left",
                                        hiringTypeFilters.length > 0 || isHiringTypeDropdownOpen
                                            ? "bg-[#0078D4] border-[#0078D4] text-white shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10"
                                            : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                                    )}
                                >
                                    <Users className={cn("w-4 h-4 shrink-0", (hiringTypeFilters.length > 0 || isHiringTypeDropdownOpen) ? "text-white" : "text-slate-400")} />
                                    {hiringTypeFilters.length === 0 ? (
                                        <span>All Types</span>
                                    ) : (
                                        <span>{hiringTypeFilters.join(' & ')}</span>
                                    )}
                                    {hiringTypeFilters.length > 0 && (
                                        <span className="ml-auto mr-5 bg-white/20 text-white text-[10px] font-black rounded w-4 h-4 flex items-center justify-center shrink-0">{hiringTypeFilters.length}</span>
                                    )}
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", (hiringTypeFilters.length > 0 || isHiringTypeDropdownOpen) ? "text-white rotate-180" : "text-slate-400")} />
                                    </div>
                                </button>

                                {isHiringTypeDropdownOpen && (
                                    <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xl z-50 p-1.5 space-y-0.5">
                                        {['INTERNAL', 'EXTERNAL'].map(type => {
                                            const isChecked = hiringTypeFilters.includes(type);
                                            return (
                                                <label
                                                    key={type}
                                                    className={cn(
                                                        "w-full px-3 py-2.5 rounded-none text-xs font-bold flex items-center gap-2.5 transition-colors text-left uppercase cursor-pointer",
                                                        isChecked ? "bg-emerald-50 text-emerald-700" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            if (isChecked) {
                                                                setHiringTypeFilters((prev: string[]) => prev.filter((f: string) => f !== type));
                                                            } else {
                                                                setHiringTypeFilters((prev: string[]) => [...prev, type]);
                                                            }
                                                        }}
                                                        className="w-3.5 h-3.5 rounded-none border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer accent-emerald-600"
                                                    />
                                                    <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span>{type}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 relative">
                            <label className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Date Applied
                            </label>
                            <div className="relative z-50">
                                <AdvancedDateFilter value={dateAppliedFilter} onChange={setDateAppliedFilter} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 relative">
                            <label className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Initial Interview
                            </label>
                            <div className="relative z-40">
                                <AdvancedDateFilter value={initialInterviewFilter} onChange={setInitialInterviewFilter} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 relative">
                            <label className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Training Start
                            </label>
                            <div className="relative z-30">
                                <AdvancedDateFilter value={trainingStartFilter} onChange={setTrainingStartFilter} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 relative">
                            <label className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Ops Validator
                            </label>
                            <div className="relative z-20">
                                <AdvancedDateFilter value={opsValFilter} onChange={setOpsValFilter} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center w-full border-b border-slate-200 dark:border-slate-800 mb-6 mt-6">
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => setActiveDashboardTab('REPORT')}
                            className={cn(
                                "px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2.5",
                                activeDashboardTab === 'REPORT'
                                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 border-b-2 border-transparent"
                            )}
                        >
                            <BarChart2 size={16} className={activeDashboardTab === 'REPORT' ? "text-blue-600" : "text-slate-400"} />
                            Account Overview
                        </button>
                        <button
                            onClick={() => setActiveDashboardTab('PENDING_TRACKER')}
                            className={cn(
                                "px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2.5",
                                activeDashboardTab === 'PENDING_TRACKER'
                                    ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50/30"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 border-b-2 border-transparent"
                            )}
                        >
                            <Clock size={16} className={activeDashboardTab === 'PENDING_TRACKER' ? "text-amber-600" : "text-slate-400"} />
                            Pending Tracker
                        </button>
                        <button
                            onClick={() => setActiveDashboardTab('ENDORSEMENTS')}
                            className={cn(
                                "px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2.5",
                                activeDashboardTab === 'ENDORSEMENTS'
                                    ? "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/30"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 border-b-2 border-transparent"
                            )}
                        >
                            <Users size={16} className={activeDashboardTab === 'ENDORSEMENTS' ? "text-indigo-600" : "text-slate-400"} />
                            Endorsements
                        </button>
                        <button
                            onClick={() => setActiveDashboardTab('ACCOUNT_ANALYSIS')}
                            className={cn(
                                "px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2.5",
                                activeDashboardTab === 'ACCOUNT_ANALYSIS'
                                    ? "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/30"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 border-b-2 border-transparent"
                            )}
                        >
                            <PieChartIcon size={16} className={activeDashboardTab === 'ACCOUNT_ANALYSIS' ? "text-indigo-600" : "text-slate-400"} />
                            Account Analysis
                        </button>
                    </div>
                </div>

                {activeDashboardTab === 'ACCOUNT_ANALYSIS' ? (
                    <div className="animate-fade-in relative min-h-[500px] w-full">
                        <AccountAnalysis />
                    </div>
                ) : activeDashboardTab === 'ENDORSEMENTS' ? (
                    <EndorsementsAnalysis apps={filteredApps} departmentsList={reportsState.departmentsList} />
                ) : activeDashboardTab === 'PENDING_TRACKER' ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-6 rounded-none shadow-sm text-left animate-fade-in space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                Pending Tracker Analysis
                            </h3>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-none border border-slate-200 dark:border-slate-800">
                                Real-Time Bottleneck Metrics
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[
                                { key: 'initialInterview', label: 'Initial Interview', emoji: '🧑‍💻', color: 'bg-indigo-50 border-indigo-100 text-indigo-700', hex: '#4f46e5' },
                                { key: 'typingTest', label: 'Typing Test', emoji: '⌨️', color: 'bg-blue-50 border-blue-100 text-blue-700', hex: '#2563eb' },
                                { key: 'speechX', label: 'SpeechX', emoji: '🎙️', color: 'bg-violet-50 border-violet-100 text-violet-700', hex: '#7c3aed' },
                                { key: 'personalityTest', label: 'Personality Test', emoji: '🧠', color: 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-700', hex: '#c026d3' },
                                { key: 'opsVal', label: 'Ops Val', emoji: '📋', color: 'bg-emerald-50 border-emerald-100 text-emerald-700', hex: '#059669' },
                                { key: 'clientAssess', label: 'Client Assess', emoji: '🏢', color: 'bg-teal-50 border-teal-100 text-teal-700', hex: '#0d9488' },
                                { key: 'clientInterview', label: 'Client Interview', emoji: '💼', color: 'bg-amber-50 border-amber-100 text-amber-700', hex: '#d97706' },
                                { key: 'forJobOffer', label: 'For Job Offer', emoji: '🤝', color: 'bg-rose-50 border-rose-100 text-rose-700', hex: '#e11d48' },
                            ].filter(stage => stage.key !== 'clientInterview' || computedMetrics.hasSpecializedClientGlobal).map((stage, idx) => {
                                const data = computedMetrics.pendingTracker[stage.key as keyof typeof computedMetrics.pendingTracker];
                                const avgHours = data?.waitTimeCount > 0 ? (data.waitTimeSum / data.waitTimeCount) : 0;
                                const formattedWait = avgHours > 24
                                    ? `${(avgHours / 24).toFixed(1)} days`
                                    : `${Math.round(avgHours)} hours`;

                                return (
                                    <div key={idx} className={cn("border rounded-none p-4 flex flex-col justify-between min-h-[110px] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden", stage.color)}>
                                        <div className="flex items-start justify-between z-10 relative">
                                            <p className="text-sm font-bold uppercase tracking-wider opacity-80">{stage.emoji} {stage.label}</p>
                                            <span className="text-sm font-bold bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded-none shadow-sm opacity-90">Pending</span>
                                        </div>
                                        <div className="mt-3 z-10 relative flex items-end justify-between">
                                            <h3 className="text-3xl font-extrabold tracking-tight tabular-nums leading-none">
                                                {data?.count || 0}
                                            </h3>
                                            <div className="text-right">
                                                <span className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-0.5">Avg Wait</span>
                                                <span className="text-xs font-bold bg-white/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-none shadow-sm flex items-center gap-1">
                                                    <Clock size={10} className="opacity-70" />
                                                    {data?.count > 0 ? formattedWait : '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.03] pointer-events-none transform -rotate-12">
                                            {stage.emoji}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CHART SECTION */}
                        {(() => {
                            const stagesList = [
                                { key: 'initialInterview', label: 'Initial', hex: '#4f46e5' },
                                { key: 'typingTest', label: 'Typing', hex: '#2563eb' },
                                { key: 'speechX', label: 'SpeechX', hex: '#7c3aed' },
                                { key: 'personalityTest', label: 'Personality', hex: '#c026d3' },
                                { key: 'opsVal', label: 'Ops Val', hex: '#059669' },
                                { key: 'clientAssess', label: 'C. Assess', hex: '#0d9488' },
                                { key: 'clientInterview', label: 'C. Interview', hex: '#d97706' },
                                { key: 'forJobOffer', label: 'Job Offer', hex: '#e11d48' },
                            ];

                            const chartData = stagesList.map(s => {
                                const d = computedMetrics.pendingTracker[s.key as keyof typeof computedMetrics.pendingTracker] || { count: 0, waitTimeSum: 0, waitTimeCount: 0 };
                                const avgHrs = d.waitTimeCount > 0 ? (d.waitTimeSum / d.waitTimeCount) : 0;
                                return {
                                    name: s.label,
                                    count: d.count,
                                    avgWaitHours: Math.round(avgHrs * 10) / 10,
                                    fill: s.hex
                                };
                            });

                            const hasData = chartData.some(d => d.count > 0);

                            return hasData && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 border-t border-slate-100 pt-6">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-none p-4">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                                            <BarChart2 className="w-4 h-4 text-indigo-500" />
                                            Volume Distribution
                                        </h4>
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" />
                                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                        {chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-none p-4">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-amber-500" />
                                            Average Wait Time (Hours)
                                        </h4>
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" />
                                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val: any) => [`${val} hrs`, 'Wait Time']} />
                                                    <Bar dataKey="avgWaitHours" radius={[4, 4, 0, 0]}>
                                                        {chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.7} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-none p-4">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-emerald-500" />
                                            Bottleneck Share
                                        </h4>
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartData.filter(d => d.count > 0)}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={2}
                                                        dataKey="count"
                                                    >
                                                        {chartData.filter(d => d.count > 0).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 rounded-none p-4">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                                            <Activity className="w-4 h-4 text-rose-500" />
                                            Volume vs Wait Time
                                        </h4>
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis type="number" dataKey="count" name="Candidates" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                    <YAxis type="number" dataKey="avgWaitHours" name="Wait Time (Hrs)" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                    <ZAxis type="category" dataKey="name" name="Stage" />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Scatter data={chartData.filter(d => d.count > 0)} shape="circle">
                                                        {chartData.filter(d => d.count > 0).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Scatter>
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <>
                        {/* ═══════ OVERALL ACCOUNTS — Card Grid (Replaces Table) ═══════ */}
                        {computedMetrics.perAccountData.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-5 rounded-none shadow-sm text-left mb-6">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <LayoutGrid className="w-4 h-4 text-indigo-500" />
                                    {isOverall ? '📋 Per-Account Pipeline Overview' : `📋 ${selectedDeptNames.join(', ')} Pipeline Overview`}
                                </h3>

                                <div className={cn(
                                    "grid gap-4",
                                    isOverall ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                                )}>
                                    {computedMetrics.perAccountData.map((acc, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => isOverall ? setExpandedAccount(expandedAccount === acc.name ? null : acc.name) : null}
                                            className={cn(
                                                "bg-white dark:bg-slate-900 border shadow-sm transition-all flex flex-col overflow-hidden",
                                                isOverall ? "rounded-none border-slate-200 dark:border-slate-800/60 cursor-pointer hover:border-blue-300 hover:shadow-md" : "rounded-none border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-800 p-6",
                                                expandedAccount === acc.name ? "ring-2 ring-blue-500 border-blue-500" : ""
                                            )}
                                        >
                                            <div className={cn("flex flex-col", isOverall ? "p-4" : "")}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-slate-900 rounded-none flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800/60 shadow-sm p-1.5">
                                                            <img
                                                                src={getAccountImage(acc.name)}
                                                                alt={acc.name}
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => { e.currentTarget.src = '/contactpoint-logo.png?v=2'; }}
                                                            />
                                                        </div>
                                                        <h4 className={cn("font-bold text-slate-800 dark:text-slate-200 tracking-tight truncate", isOverall ? "text-sm" : "text-xl")}>
                                                            {acc.name}
                                                        </h4>
                                                    </div>
                                                    {isOverall && (
                                                        <Maximize2 className="w-4 h-4 text-slate-400 hover:text-blue-500 transition-colors shrink-0" />
                                                    )}
                                                </div>

                                                <div className={cn("grid text-center items-stretch", isOverall ? "grid-cols-5 gap-1" : "grid-cols-5 gap-2")}>
                                                    <div className="flex flex-col items-center justify-center p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-100/50 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">
                                                        <span className={cn("font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mb-1.5", isOverall ? "text-[10px]" : "text-[10px]")}>Assigned</span>
                                                        <span className={cn("font-black text-slate-700 dark:text-slate-300 leading-none tabular-nums", isOverall ? "text-lg" : "text-2xl")}>{acc.count}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center p-2.5 bg-emerald-50/80 rounded border border-emerald-100/50 transition-colors hover:bg-emerald-100/60">
                                                        <span className={cn("font-bold text-emerald-600 uppercase tracking-wider leading-none mb-1.5", isOverall ? "text-[10px]" : "text-[10px]")}>Hires</span>
                                                        <span className={cn("font-black text-emerald-700 leading-none tabular-nums", isOverall ? "text-lg" : "text-2xl")}>{acc.hired}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center p-2.5 bg-blue-50/80 rounded border border-blue-100/50 transition-colors hover:bg-blue-100/60">
                                                        <span className={cn("font-bold text-blue-600 uppercase tracking-wider leading-none mb-1.5", isOverall ? "text-[10px]" : "text-[10px]")}>Hire Rate</span>
                                                        <span className={cn("font-black text-blue-700 leading-none tabular-nums", isOverall ? "text-lg" : "text-2xl")}>{acc.count > 0 ? ((acc.hired / acc.count) * 100).toFixed(1) : '0.0'}%</span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center p-2.5 bg-amber-50/80 rounded border border-amber-100/50 transition-colors hover:bg-amber-100/60">
                                                        <span className={cn("font-bold text-amber-600 uppercase tracking-wider leading-none mb-1.5", isOverall ? "text-[10px]" : "text-[10px]")}>On Going</span>
                                                        <span className={cn("font-black text-amber-700 leading-none tabular-nums", isOverall ? "text-lg" : "text-2xl")}>{acc.ongoing}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center p-2.5 bg-purple-50/80 rounded border border-purple-100/50 transition-colors hover:bg-purple-100/60">
                                                        <span className={cn("font-bold text-purple-600 uppercase tracking-wider leading-none mb-1.5", isOverall ? "text-[10px]" : "text-[10px]")}>Ext / Int</span>
                                                        <span className={cn("font-black text-purple-700 leading-none tabular-nums", isOverall ? "text-lg" : "text-2xl")}>{acc.externalCount || 0} / {acc.internalCount || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                                {expandedAccount && (() => {
                                    const acc = computedMetrics.perAccountData.find(a => a.name === expandedAccount);
                                    if (!acc) return null;

                                    let activeCandidates: any[] = [];
                                    let initialCandidates: any[] = [];
                                    if (selectedLOBMetric && selectedLOBMetric.account === acc.name) {
                                        const lobStats = acc.lobs[selectedLOBMetric.lob];
                                        if (lobStats) {
                                            initialCandidates = selectedLOBMetric.metric === 'applied' ? lobStats.candidates_applied
                                                : selectedLOBMetric.metric === 'hires' ? lobStats.candidates_hired
                                                    : lobStats.candidates_ongoing;

                                            let baseCandidates = [...initialCandidates];

                                            if (modalLobSearch) {
                                                const s = modalLobSearch.toLowerCase();
                                                baseCandidates = baseCandidates.filter((c: any) =>
                                                    getCandidateName(c).toLowerCase().includes(s) ||
                                                    getCandidateEmail(c).toLowerCase().includes(s) ||
                                                    (c.master_eid || '').toLowerCase().includes(s) ||
                                                    (c.eid || '').toLowerCase().includes(s)
                                                );
                                            }
                                            if (modalLobRecruiterFilter !== 'All') {
                                                baseCandidates = baseCandidates.filter((c: any) => {
                                                    const r = c.assigned_recruiter_name || c.interviewer_name || 'System';
                                                    return r === modalLobRecruiterFilter;
                                                });
                                            }
                                            if (modalLobStatusFilter !== 'All') {
                                                baseCandidates = baseCandidates.filter((c: any) => {
                                                    const s = c.current_status || 'Unknown';
                                                    return s === modalLobStatusFilter;
                                                });
                                            }
                                            if (modalLobDateFilter) {
                                                baseCandidates = baseCandidates.filter((c: any) => {
                                                    let d = '';
                                                    if (modalLobDateType === 'Training Start Date') {
                                                        d = c.master_training_start_date || c.pis?.master_training_start_date || c.pis?.training_start_date || c.pis?.confirmed_training_date;
                                                    } else if (modalLobDateType === 'Applied Date') {
                                                        d = c.created_at;
                                                    } else if (modalLobDateType === 'Initial Interview Date') {
                                                        d = c.initial_interview_date;
                                                    } else if (modalLobDateType === 'Ops Validator Interview Date') {
                                                        d = c.ops_validator_interview_date;
                                                    }
                                                    if (!d) return false;
                                                    return String(d).startsWith(modalLobDateFilter);
                                                });
                                            }
                                            activeCandidates = baseCandidates;
                                        }
                                    }

                                    return (
                                        <Modal
                                            open={!!expandedAccount}
                                            onClose={() => {
                                                setExpandedAccount(null);
                                                setSelectedLOBMetric(null);
                                                setModalLobSearch('');
                                                setModalLobDateFilter('');
                                            }}
                                            title={selectedLOBMetric ? (
                                                <div className="flex flex-col xl:flex-row xl:items-center justify-between w-full gap-4">
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <button onClick={() => setSelectedLOBMetric(null)} className="p-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-none transition-all hover:scale-105 group active:scale-95 shadow-sm">
                                                            <Grid className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                                        </button>
                                                        <div className="w-2.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-none shadow-sm"></div>
                                                        <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                            {acc.name} <span className="font-light text-slate-300">|</span> <span className="text-slate-700 dark:text-slate-300">{selectedLOBMetric.lob}</span> <span className="px-2.5 py-0.5 rounded-none bg-slate-100 dark:bg-slate-800/50 text-sm font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase border border-slate-200 dark:border-slate-800 shadow-inner ml-2">{selectedLOBMetric.metric.toUpperCase()}</span>
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-end shrink-0 mr-8 w-full xl:w-auto mt-4 xl:mt-0 gap-2">
                                                        {isAdminOrSuperAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsExclusiveMode(!isExclusiveMode)}
                                                                className={cn(
                                                                    "h-9 flex items-center justify-center gap-1.5 px-3 text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none border shadow-sm shrink-0",
                                                                    isExclusiveMode
                                                                        ? "bg-slate-900 border-slate-900 text-white dark:text-slate-900"
                                                                        : "bg-white dark:bg-slate-900 border-surface-200 dark:border-slate-800 text-surface-700 dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-slate-800"
                                                                )}
                                                                title="Toggle Hidden Candidates"
                                                            >
                                                                {isExclusiveMode ? <Eye size={14} strokeWidth={2.5} /> : <EyeOff size={14} strokeWidth={2.5} />}
                                                                Hidden (Exclusive)
                                                            </button>
                                                        )}

                                                        <div className="relative flex items-center h-9 border border-surface-200 dark:border-slate-800 bg-white dark:bg-slate-900 group rounded-[4px] shadow-sm overflow-hidden shrink-0">
                                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 group-focus-within:text-indigo-500 transition-colors" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search candidates..."
                                                                value={modalLobSearch}
                                                                onChange={e => setModalLobSearch(e.target.value)}
                                                                className="pl-8 pr-3 py-1 bg-transparent text-xs w-48 focus:outline-none transition-colors h-full"
                                                            />
                                                        </div>

                                                        <select
                                                            value={modalLobRecruiterFilter}
                                                            onChange={e => setModalLobRecruiterFilter(e.target.value)}
                                                            className="px-3 h-9 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none focus:bg-slate-50 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors max-w-[140px] truncate cursor-pointer rounded-[4px] shadow-sm shrink-0"
                                                        >
                                                            <option value="All">All Recruiters</option>
                                                            {Array.from(new Set(initialCandidates.map(c => c.assigned_recruiter_name || c.interviewer_name || 'System'))).filter(Boolean).sort().map(r => (
                                                                <option key={r as string} value={r as string}>{r as string}</option>
                                                            ))}
                                                        </select>

                                                        <select
                                                            value={modalLobStatusFilter}
                                                            onChange={e => setModalLobStatusFilter(e.target.value)}
                                                            className="px-3 h-9 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none focus:bg-slate-50 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors max-w-[140px] truncate cursor-pointer rounded-[4px] shadow-sm shrink-0"
                                                        >
                                                            <option value="All">All Statuses</option>
                                                            {Array.from(new Set(initialCandidates.map(c => c.current_status || 'Unknown'))).filter(Boolean).sort().map(s => (
                                                                <option key={s as string} value={s as string}>{(s as string).replace(/_/g, ' ')}</option>
                                                            ))}
                                                        </select>

                                                        <div className="flex items-center h-9 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-[4px] shadow-sm overflow-hidden shrink-0">
                                                            <select
                                                                value={modalLobDateType}
                                                                onChange={e => setModalLobDateType(e.target.value)}
                                                                className="px-2 h-full bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-r border-slate-300 dark:border-slate-700 outline-none cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors"
                                                            >
                                                                <option value="Training Start Date">Training Start Date</option>
                                                                <option value="Applied Date">Applied Date</option>
                                                                <option value="Initial Interview Date">Init. Interview</option>
                                                                <option value="Ops Validator Interview Date">Ops Val. Interview</option>
                                                            </select>
                                                            <input
                                                                type="date"
                                                                value={modalLobDateFilter}
                                                                onChange={e => setModalLobDateFilter(e.target.value)}
                                                                className="px-3 h-full bg-transparent text-xs text-slate-700 dark:text-slate-300 font-medium outline-none cursor-pointer min-w-[120px]"
                                                            />
                                                        </div>

                                                        {(modalLobSearch || modalLobDateFilter || modalLobRecruiterFilter !== 'All' || modalLobStatusFilter !== 'All') && (
                                                            <button
                                                                onClick={() => { setModalLobSearch(''); setModalLobDateFilter(''); setModalLobRecruiterFilter('All'); setModalLobStatusFilter('All'); }}
                                                                className="px-4 h-9 bg-slate-800 text-white text-sm font-bold uppercase tracking-widest hover:bg-rose-600 transition-colors rounded-none border-l border-slate-800"
                                                            >
                                                                Clear Filters
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col w-full">
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl font-semibold text-[#242424] uppercase tracking-normal">
                                                                {acc.name}
                                                            </span>
                                                            <span className="text-sm font-normal text-[#616161]">| Unspecified Job Position</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-1">
                                                                <button className="p-2 text-[#616161] hover:bg-[#F5F5F5] transition-colors rounded-none" title="Filter"><Filter size={16} /></button>
                                                                <button className="p-2 text-[#616161] hover:bg-[#F5F5F5] transition-colors rounded-none" title="Date Range"><Calendar size={16} /></button>
                                                                <button className="p-2 text-[#616161] hover:bg-[#F5F5F5] transition-colors rounded-none" title="Export"><Download size={16} /></button>
                                                                <button className="p-2 text-[#616161] hover:bg-[#F5F5F5] transition-colors rounded-none" title="Refresh"><RefreshCw size={16} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            size={selectedLOBMetric ? "full" : "2xl"}
                                        >
                                            {selectedLOBMetric ? (
                                                <div className="flex flex-col flex-1 h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-800/50">
                                                    <div className="bg-white dark:bg-slate-900 flex flex-col flex-1 h-full overflow-hidden shadow-sm">
                                                        <div className="p-0 flex-1 h-full overflow-y-auto scrollbar-thin">
                                                            {activeCandidates.length > 0 ? (
                                                                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                                                                    <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 border-collapse table-fixed">
                                                                        <thead className="sticky top-0 bg-[#f3f2f1] border-b border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-600 uppercase tracking-wider z-10">
                                                                            <tr>
                                                                                <th className="px-4 py-2.5 w-12 text-center border-r border-slate-200 dark:border-slate-800">#</th>
                                                                                <th className="px-4 py-2.5 w-48 border-r border-slate-200 dark:border-slate-800">Applicant Name</th>
                                                                                <th className="px-4 py-2.5 w-48 border-r border-slate-200 dark:border-slate-800">Email</th>
                                                                                <th className="px-4 py-2.5 w-32 border-r border-slate-200 dark:border-slate-800">Status</th>
                                                                                <th className="px-4 py-2.5 w-36 border-r border-slate-200 dark:border-slate-800">Training Date</th>
                                                                                <th className="px-4 py-2.5 w-40 border-r border-slate-200 dark:border-slate-800">Position Title</th>
                                                                                <th className="px-4 py-2.5 w-36 border-r border-slate-200 dark:border-slate-800">Recruiter</th>
                                                                                <th className="px-4 py-2.5 w-40 border-r border-slate-200 dark:border-slate-800">Assigned Account</th>
                                                                                <th className="px-4 py-2.5 w-48">Job Position</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-200 bg-white dark:bg-slate-900">
                                                                            {activeCandidates.map((c: any, i: number) => (
                                                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-none group text-xs">
                                                                                    <td className="px-4 py-2 text-center text-slate-400 font-medium border-r border-slate-100">
                                                                                        {i + 1}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 font-medium text-slate-900 dark:text-white border-r border-slate-100 truncate text-base" title={getCandidateName(c)}>
                                                                                        {getCandidateName(c)}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-slate-600 border-r border-slate-100 truncate" title={getCandidateEmail(c)}>
                                                                                        {getCandidateEmail(c)}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 border-r border-slate-100">
                                                                                        <div className="flex items-center">
                                                                                            <span className={`px-2 py-0.5 rounded-none text-sm font-bold tracking-wide uppercase ${(c.current_status || '').toUpperCase().includes('HIRED') || (c.current_status || '').toUpperCase().includes('ACCEPTED')
                                                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                                                : (c.current_status || '').toUpperCase().includes('FAIL') || (c.current_status || '').toUpperCase().includes('REJECT') || (c.current_status || '').toUpperCase().includes('NO SHOW')
                                                                                                    ? 'bg-rose-100 text-rose-800'
                                                                                                    : 'bg-indigo-100 text-indigo-800'
                                                                                                }`}>
                                                                                                {(c.current_status || 'Unknown').replace(/_/g, ' ')}
                                                                                            </span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-slate-600 border-r border-slate-100 truncate">
                                                                                        {c.master_training_start_date || c.pis?.master_training_start_date || c.pis?.training_start_date || c.pis?.confirmed_training_date || 'TBD'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-slate-600 border-r border-slate-100 truncate" title={c.position_title || 'N/A'}>
                                                                                        {c.position_title || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-slate-600 border-r border-slate-100 truncate" title={c.assigned_recruiter_name || c.interviewer_name || 'System'}>
                                                                                        {c.assigned_recruiter_name || c.interviewer_name || 'System'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 border-r border-slate-100 truncate">
                                                                                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate" title={getTrueAccount(c)}>
                                                                                            {getTrueAccount(c)}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-1.5">
                                                                                        <EditableLobSelect candidate={c} mhrtAccounts={reportsState.mhrtAccounts || []} departmentsList={reportsState.departmentsList || []}
                                                                                            onUpdate={() => setLobUpdateTrigger(prev => prev + 1)}
                                                                                        />
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                                                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-none flex items-center justify-center mb-4">
                                                                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="text-sm font-bold text-slate-600">No candidates found for this metric</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-5 bg-slate-50 dark:bg-slate-800/80 max-h-[70vh] overflow-y-auto scrollbar-thin">

                                                    <div className="space-y-8 p-2 bg-gradient-to-br from-slate-50 to-white min-h-[600px] rounded-xl w-full">
                                                        {Object.entries(acc.lobs || {}).filter(([_, s]: [string, any]) => s.count > 0).sort((a, b) => (b[1] as any).count - (a[1] as any).count).map(([lobName, lobStats]: [string, any]) => {
                                                            // Funnel Stages
                                                            let fApplied = lobStats.candidates_applied.length;
                                                            let fInterviewed = 0;
                                                            let fRecruiterAssessment = 0;
                                                            let fOpsValidation = 0;
                                                            let fClientInterview = 0;
                                                            let fForJobOffer = 0;
                                                            let fSentJobOffer = 0;
                                                            let fTotalSigned = 0;

                                                            let statusCounts: Record<string, number> = {};
                                                            let sourceCounts: Record<string, number> = {};

                                                            lobStats.candidates_applied.forEach((app: any) => {
                                                                const status = (app.current_status || 'UNKNOWN').toUpperCase();
                                                                if (!statusCounts[status]) statusCounts[status] = 0;
                                                                statusCounts[status]++;

                                                                const source = String(app.metadata?.candidate_source || app.pis?.candidate_source || app.metadata?.source || 'Other').trim();
                                                                const cleanSource = source.length > 15 ? source.substring(0, 15) + '...' : source;
                                                                if (!sourceCounts[cleanSource]) sourceCounts[cleanSource] = 0;
                                                                sourceCounts[cleanSource]++;

                                                                const p = app.pis || app.metadata?.pis || {};
                                                                const isFailed = status === 'REJECTED' || status === 'FAILED' || status.includes('FAIL');
                                                                const outcome = getOutcome(app);

                                                                // Stage 8: Total Signed
                                                                const isSigned = outcome.isHired || status === 'HIRED' || status === 'ACCEPTED' || status === 'TOTAL SIGNED' || status === 'ONBOARDING' || status === 'ACTIVE';
                                                                if (isSigned) fTotalSigned++;

                                                                // Stage 7: Sent Job Offer
                                                                const isSentJobOffer = isSigned || status === 'SENT_JOB_OFFER' || status === 'SENT JOB OFFER' || status === 'OFFERED';
                                                                if (isSentJobOffer) fSentJobOffer++;

                                                                // Stage 6: For Job Offer
                                                                const isForJobOffer = isSentJobOffer || outcome.isEndorsed || status === 'FOR_JOB_OFFER' || status === 'FOR JOB OFFER';
                                                                if (isForJobOffer) fForJobOffer++;

                                                                // Stage 5: Completed Client Interview
                                                                const finalIntResult = String(app.metadata?.final_interview_status || app.pis?.final_interview_status || p['Final Interview Status'] || '').toUpperCase();
                                                                const isClientInterviewPassed = isForJobOffer || finalIntResult.includes('PASS') || (!isFailed && ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(status));
                                                                if (isClientInterviewPassed) fClientInterview++;

                                                                // Stage 4: Completed Ops Validation
                                                                const isOpsPassed = isClientInterviewPassed || (!isFailed && status === 'FINAL_INTERVIEW');
                                                                if (isOpsPassed) fOpsValidation++;

                                                                // Stage 3: Completed Recruiter Assessment
                                                                let isAssessmentPassed = isOpsPassed || (!isFailed && status === 'ASSESSMENT');
                                                                const rawScore = app.assessment_score;
                                                                if (rawScore != null) {
                                                                    const upperScore = String(rawScore).toUpperCase().trim();
                                                                    const isCEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(upperScore) || upperScore.match(/[ABC][12]/) != null;
                                                                    if (isCEFR) {
                                                                        const cefr = upperScore.match(/[ABC][12]/)?.[0] || 'B1';
                                                                        if (['B2', 'C1', 'C2'].includes(cefr)) isAssessmentPassed = true;
                                                                    } else {
                                                                        const parsed = parseFloat(String(rawScore));
                                                                        if (!isNaN(parsed) && parsed >= 70) isAssessmentPassed = true;
                                                                    }
                                                                }
                                                                if (isAssessmentPassed) fRecruiterAssessment++;

                                                                // Stage 2: Interviewed
                                                                const iiResult = String(p.initial_interview_results || p.initial_interview_result || p.ii_result || p['Initial Interview Result'] || p['Initial Interview Results'] || '').toUpperCase();
                                                                const isInterviewed = isAssessmentPassed || iiResult === 'PASSED' || (!isFailed && status !== 'INITIAL_INTERVIEW' && status !== 'APPLIED');
                                                                if (isInterviewed) fInterviewed++;
                                                            });

                                                            const isSpecializedClient = ['KELLER POSTMAN', 'AUTO APPROVE', 'TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].some(d => (acc.name || lobName || '').toUpperCase().includes(d));

                                                            const funnelData = [
                                                                { stage: 'Applied', count: fApplied, fill: 'from-[#C8C6C4] to-[#A19F9D]' },
                                                                { stage: 'Interviewed', count: fInterviewed, fill: 'from-[#0078D4] to-[#005A9E]' },
                                                                { stage: 'Recruiter Assessment', count: fRecruiterAssessment, fill: 'from-[#5C2D91] to-[#32145A]' },
                                                                { stage: 'Ops Validation', count: fOpsValidation, fill: 'from-[#A4262C] to-[#8E192E]' },
                                                            ];
                                                            if (isSpecializedClient) {
                                                                funnelData.push({ stage: 'Client Interview', count: fClientInterview, fill: 'from-[#CA5010] to-[#983C0C]' });
                                                            }
                                                            funnelData.push({ stage: 'For Job Offer', count: fForJobOffer, fill: 'from-[#038387] to-[#005E61]' });
                                                            funnelData.push({ stage: 'Sent Job Offer', count: fSentJobOffer, fill: 'from-[#008272] to-[#004B50]' });
                                                            funnelData.push({ stage: 'Total Signed', count: fTotalSigned, fill: 'from-[#107C10] to-[#0B5A0B]' });

                                                            const pieData = Object.keys(statusCounts).map(s => {
                                                                let fill = '#94a3b8';
                                                                if (s.includes('HIRED') || s.includes('ACCEPTED') || s === 'ACTIVE') fill = '#10b981';
                                                                else if (s.includes('FAIL') || s.includes('REJECT') || s.includes('NO_SHOW')) fill = '#f43f5e';
                                                                else if (s.includes('WAITING') || s.includes('RESCHED')) fill = '#0ea5e9';
                                                                else if (s.includes('INTERVIEW')) fill = '#3b82f6';
                                                                else if (s.includes('WITHDRAWN') || s.includes('INACTIVE')) fill = '#d946ef';
                                                                return { name: s, value: statusCounts[s], fill };
                                                            }).sort((a, b) => b.value - a.value);

                                                            const sourceChartData = Object.keys(sourceCounts).map(s => ({
                                                                name: s,
                                                                count: sourceCounts[s]
                                                            })).sort((a, b) => b.count - a.count).slice(0, 7);

                                                            const maxFunnel = Math.max(...funnelData.map(d => d.count), 1);

                                                            return (
                                                                <div key={lobName} className="mb-8 last:mb-0">
                                                                    {/* Header & Active Count */}
                                                                    <div className="pb-4 mb-6 border-b border-[#E1E1E1] flex items-center justify-between">
                                                                        <h4 className="text-lg font-semibold text-[#242424] uppercase tracking-wide flex items-center gap-2">
                                                                            {lobName === 'Default' ? 'OVERVIEW' : lobName}
                                                                        </h4>
                                                                        <div
                                                                            onClick={() => setSelectedLOBMetric({ account: acc.name, lob: lobName, metric: 'ongoing' })}
                                                                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 p-1.5 -mx-1.5 rounded transition-colors group"
                                                                        >
                                                                            <div className="w-2 h-2 rounded-full bg-[#107C10]"></div>
                                                                            <span className="text-sm font-normal text-[#616161] group-hover:text-[#242424] transition-colors">
                                                                                {lobStats.candidates_ongoing.length} Active Candidates
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* KPI Ribbon */}
                                                                    <div className="bg-[#FFFFFF] border border-[#E1E1E1] mb-6 flex items-stretch divide-x divide-[#E1E1E1]">
                                                                        <div
                                                                            onClick={() => setSelectedLOBMetric({ account: acc.name, lob: lobName, metric: 'applied' })}
                                                                            className="flex-1 p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors group"
                                                                        >
                                                                            <p className="text-xs font-semibold text-[#616161] uppercase tracking-wider mb-2 group-hover:text-[#0078D4] transition-colors">Assigned</p>
                                                                            <p className="text-4xl font-bold text-[#0078D4]">{lobStats.count}</p>
                                                                        </div>
                                                                        <div
                                                                            onClick={() => setSelectedLOBMetric({ account: acc.name, lob: lobName, metric: 'hires' })}
                                                                            className="flex-1 p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors group"
                                                                        >
                                                                            <p className="text-xs font-semibold text-[#616161] uppercase tracking-wider mb-2 group-hover:text-emerald-600 transition-colors">Hires</p>
                                                                            <div className="flex items-baseline gap-3">
                                                                                <p className="text-4xl font-bold text-[#242424]">{lobStats.hired}</p>
                                                                                <p className="text-xs font-medium text-[#616161] uppercase">{lobStats.hiredExternalCount} Ext / {lobStats.hiredInternalCount} Int</p>
                                                                            </div>
                                                                        </div>
                                                                        <div
                                                                            onClick={() => setSelectedLOBMetric({ account: acc.name, lob: lobName, metric: 'hires' })}
                                                                            className="flex-1 p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors group"
                                                                        >
                                                                            <p className="text-xs font-semibold text-[#616161] uppercase tracking-wider mb-2 group-hover:text-blue-600 transition-colors">Hire Rate</p>
                                                                            <p className="text-4xl font-bold text-[#242424]">{lobStats.count > 0 ? Math.round((lobStats.hired / lobStats.count) * 100) : 0}%</p>
                                                                        </div>
                                                                        <div
                                                                            onClick={() => setSelectedLOBMetric({ account: acc.name, lob: lobName, metric: 'applied' })}
                                                                            className="flex-1 p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors group"
                                                                        >
                                                                            <p className="text-xs font-semibold text-[#616161] uppercase tracking-wider mb-2 group-hover:text-purple-600 transition-colors">Sourcing (Ext / Int)</p>
                                                                            <div className="flex items-baseline gap-2">
                                                                                <p className="text-4xl font-bold text-[#242424]">{lobStats.externalCount}</p>
                                                                                <p className="text-xl font-normal text-[#E1E1E1]"> / </p>
                                                                                <p className="text-4xl font-bold text-[#242424]">{lobStats.internalCount}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Charts Area */}
                                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                                                                        {/* Pipeline Progression (Left 7 cols) */}
                                                                        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E1E1E1] p-6 flex flex-col">
                                                                            <h5 className="text-sm font-semibold text-[#242424] mb-6">Pipeline Progression</h5>
                                                                            <div className="flex-1 flex flex-col justify-center space-y-4 pr-4">
                                                                                {funnelData.map((d, i) => {
                                                                                    const width = Math.max((d.count / maxFunnel) * 100, 1);
                                                                                    const colors = ['#0078D4', '#107C10', '#D83B01', '#8764B8', '#00B7C3', '#E3008C', '#FFB900', '#008272', '#C239B3', '#D13438'];
                                                                                    const barColor = colors[i % colors.length];
                                                                                    return (
                                                                                        <div key={i} className="flex items-center gap-4">
                                                                                            <div className="w-[140px] text-right">
                                                                                                <span className="text-xs font-medium text-[#616161]">{d.stage}</span>
                                                                                            </div>
                                                                                            <div className="flex-1 flex items-center gap-3">
                                                                                                <div className="h-6 rounded-none transition-all duration-500" style={{ width: `${width}%`, backgroundColor: barColor }} />
                                                                                                <span className="text-sm font-bold text-[#242424] tabular-nums">{d.count}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>

                                                                        {/* Sources & Statuses (Right 5 cols) */}
                                                                        <div className="lg:col-span-5 flex flex-col gap-6">
                                                                            {/* Candidate Sources */}
                                                                            <div className="bg-[#FFFFFF] border border-[#E1E1E1] p-6 flex-1">
                                                                                <h5 className="text-sm font-semibold text-[#242424] mb-4">Candidate Sources</h5>
                                                                                <div className="h-[180px] w-full">
                                                                                    {sourceChartData.length > 0 ? (
                                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                                            <BarChart data={sourceChartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                                                                                <XAxis type="number" hide />
                                                                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#616161' }} width={80} />
                                                                                                <Tooltip cursor={{ fill: '#F5F5F5' }} contentStyle={{ fontSize: 12, borderRadius: 0, border: '1px solid #E1E1E1', boxShadow: 'none' }} />
                                                                                                <Bar dataKey="count" radius={0} barSize={20}>
                                                                                                    {sourceChartData.map((entry, index) => {
                                                                                                        const colors = ['#00B7C3', '#E3008C', '#FFB900', '#008272', '#0078D4', '#107C10', '#D83B01', '#8764B8'];
                                                                                                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                                                                                    })}
                                                                                                </Bar>
                                                                                            </BarChart>
                                                                                        </ResponsiveContainer>
                                                                                    ) : (
                                                                                        <div className="h-full flex items-center justify-center text-sm text-[#616161]">No Data</div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Statuses (Table Format) */}
                                                                            <div className="bg-[#FFFFFF] border border-[#E1E1E1] p-6 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar">
                                                                                <h5 className="text-sm font-semibold text-[#242424] mb-4">Statuses</h5>
                                                                                {pieData.length > 0 ? (
                                                                                    <div className="flex flex-col gap-2">
                                                                                        {pieData.map((s, i) => (
                                                                                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F5F5F5] last:border-0">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.fill }}></div>
                                                                                                    <span className="text-xs text-[#242424] truncate max-w-[180px]" title={s.name}>{s.name}</span>
                                                                                                </div>
                                                                                                <span className="text-xs font-bold text-[#242424] tabular-nums">{s.value}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="h-full flex items-center justify-center text-sm text-[#616161]">No Data</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Conversion Journey */}
                                                                    <div className="bg-[#FFFFFF] border border-[#E1E1E1] p-6">
                                                                        <h5 className="text-sm font-semibold text-[#242424] mb-6">Conversion Journey</h5>
                                                                        <div className="flex items-center w-full">
                                                                            {(
                                                                                function () {
                                                                                    const metrics: Array<{ label: string; from: number; to: number; isEnd?: boolean }> = [
                                                                                        { label: "INT", from: fInterviewed, to: fRecruiterAssessment },
                                                                                        { label: "ASSMT", from: fRecruiterAssessment, to: fOpsValidation }
                                                                                    ];
                                                                                    if (isSpecializedClient) {
                                                                                        metrics.push({ label: "OPS", from: fOpsValidation, to: fClientInterview });
                                                                                        metrics.push({ label: "CLIENT", from: fClientInterview, to: fForJobOffer });
                                                                                    } else {
                                                                                        metrics.push({ label: "OPS", from: fOpsValidation, to: fForJobOffer });
                                                                                    }
                                                                                    metrics.push({ label: "OFFER", from: fForJobOffer, to: fTotalSigned });
                                                                                    metrics.push({ label: "HIRED", from: fTotalSigned, to: fTotalSigned, isEnd: true });
                                                                                    return metrics;
                                                                                })().map((m, idx, arr) => {
                                                                                    const next = arr[idx + 1];
                                                                                    const rate = (next && m.from > 0) ? Math.min(100, Math.round((next.from / m.from) * 100)) : 0;

                                                                                    return (
                                                                                        <React.Fragment key={idx}>
                                                                                            <div className="flex flex-col items-center min-w-[80px]">
                                                                                                <span className="text-[10px] font-semibold text-[#616161] uppercase mb-2">{m.label}</span>
                                                                                                <div className="w-12 h-12 bg-[#F5F5F5] border border-[#E1E1E1] flex items-center justify-center mb-2 rounded-sm">
                                                                                                    <span className="text-lg font-bold text-[#242424]">{m.from}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                            {!m.isEnd && (
                                                                                                <div className="flex-1 flex flex-col items-center justify-center px-2">
                                                                                                    <span className="text-[10px] font-bold text-[#0078D4] mb-1">{rate}%</span>
                                                                                                    <div className="w-full h-[2px] bg-[#E1E1E1] relative">
                                                                                                        <div className="absolute top-0 left-0 h-full bg-[#0078D4]" style={{ width: `${rate}%` }} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </React.Fragment>
                                                                                    );
                                                                                })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                            )}
                                        </Modal>
                                    );
                                })()}
                            </div>
                        )}
                        {/* Process Funnel & Account Performance Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left">
                            {/* Funnel Visual Progress (7 Columns) */}
                            <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-8 rounded-none shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Layers className="w-4 h-4 text-blue-500" />
                                        🔽 Recruitment Pipeline Funnel
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-none text-sm font-bold text-slate-600 uppercase tracking-widest shadow-sm">
                                        Total Applied: <span className="text-blue-600 text-sm font-black ml-1">{computedMetrics.total}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {computedMetrics.stageFunnel.map((step, idx) => (
                                        <div key={idx} className="group relative space-y-2 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none hover:border-[#0078D4] transition-all duration-200 cursor-pointer overflow-hidden"
                                            onClick={() => setSelectedFunnelStage({ name: step.name, candidates: step.candidates })}>
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                            <div className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                                                <span>{idx + 1}. {step.name}</span>
                                                {step.name === 'Hired' ? (
                                                    <span className="text-blue-600 font-extrabold">{step.count} Hired</span>
                                                ) : (
                                                    <span className="text-[10.5px] text-slate-400 font-normal">
                                                        Total: <strong className="text-slate-700 dark:text-slate-300 font-bold">{step.total}</strong> |
                                                        Pass: <strong className="text-emerald-600 font-bold">{step.passed}</strong> |
                                                        {step.active > 0 && (
                                                            <>Active: <strong className="text-amber-500 font-bold">{step.active}</strong> | </>
                                                        )}
                                                        -                                                        Fail: <strong className="text-rose-500 font-bold">{step.failed}</strong> |
                                                        Rate: <strong className="text-blue-600 font-bold">{step.passRate}%</strong>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800/50 h-2 rounded-none overflow-hidden">
                                                <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-none transition-all duration-700" style={{ width: `${step.pct}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-none text-xs">
                                    <p className="text-blue-700 font-bold text-sm mb-0.5">💡 Funnel Insight</p>
                                    <p className="text-blue-600/80 text-sm leading-relaxed">
                                        The sharpest drop-off occurs between {computedMetrics.stageFunnel.length > 3 ? computedMetrics.stageFunnel[2].name : 'Assigned'} and {computedMetrics.stageFunnel.length > 4 ? computedMetrics.stageFunnel[3].name : 'Typing Test'}, suggesting pre-screening calibration improvements could boost throughput.
                                    </p>
                                </div>
                            </div>

                            {/* Account Performance Matrix (5 Columns) */}
                            <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-8 rounded-none shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                        <Medal className="w-4 h-4 text-emerald-500" />
                                        🏆 Account Performance Comparison
                                    </h3>
                                    <div className="h-56">
                                        {computedMetrics.accountMetricsData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={computedMetrics.accountMetricsData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} />
                                                    <YAxis tick={{ fontSize: 9 }} />
                                                    <Tooltip />
                                                    <Legend wrapperStyle={{ fontSize: 9 }} />
                                                    <Bar dataKey="Pass Rate (%)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                                    <Bar dataKey="Hiring Rate (%)" fill="#10b981" radius={[3, 3, 0, 0]} />
                                                    <Bar dataKey="Fail Rate (%)" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-350 font-bold uppercase tracking-widest text-xs">
                                                No account metrics logged
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-none text-xs mt-3">
                                    <p className="font-bold text-emerald-700 text-sm mb-0.5">📈 Account Yield Analytics</p>
                                    <p className="text-emerald-600/80 text-sm leading-relaxed">
                                        This charts the top accounts comparing pass, hire, and fail rates. Accounts with high fail rates may need assessment calibration.
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Hiring Type Analysis */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left mt-8 mb-8">
                            <div className="xl:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-8 rounded-none shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <Users className="w-4 h-4 text-emerald-500" />
                                    🌎 Hiring Type Pipeline Breakdown
                                </h3>
                                <div className="h-56">
                                    {computedMetrics.hiringTypeData.some(d => d.count > 0) ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={computedMetrics.hiringTypeData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                                                <Bar dataKey="count" name="Total Filtered" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="passed" name="Endorsed/Hired" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-350 font-bold uppercase tracking-widest text-xs">
                                            No hiring type data available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Recruiter Performance & Tag Dispositions Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left mb-8">
                            {/* Left: Recruiter Performance Analysis (6 Columns) */}
                            <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-8 rounded-none shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    🏅 Recruiter Performance
                                </h3>
                                <div className="overflow-x-auto max-h-[300px] scrollbar-thin">

                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                                <th className="py-2.5 font-bold text-slate-450 uppercase text-[9.5px]">Recruiter</th>
                                                <th className="py-2.5 font-bold text-slate-450 uppercase text-[9.5px] text-center">Screened</th>
                                                <th className="py-2.5 font-bold text-slate-450 uppercase text-[9.5px] text-center">Passed</th>
                                                <th className="py-2.5 font-bold text-slate-450 uppercase text-[9.5px] text-center">Failed</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {computedMetrics.recruiterData.map((rec) => (
                                                <tr key={rec.name} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                                                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{rec.name}</td>
                                                    <td className="py-3 text-center font-bold text-slate-700 dark:text-slate-300 tabular-nums">{rec.screened}</td>
                                                    <td className="py-3 text-center font-bold text-emerald-600 tabular-nums">{rec.passed}</td>
                                                    <td className="py-3 text-center font-bold text-red-500 tabular-nums">{rec.failed}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right: Tag Dispositions Filtered by Recruiter (6 Columns) */}
                            <div className="xl:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-5 rounded-none shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <ShieldAlert className="w-4 h-4 text-red-500" />
                                        🏷️ Pipeline Tags
                                    </h3>
                                    <select
                                        value={tagRecruiter}
                                        onChange={(e) => setTagRecruiter(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800/60 px-2 py-1 rounded-none text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none uppercase cursor-pointer"
                                    >
                                        <option value="">All Recruiters</option>
                                        {availableRecruiters.map((rec: string) => (
                                            <option key={rec} value={rec}>{rec}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                                    {[
                                        { label: '🚫 No Show', count: computedMetrics.tagCounts.noShow, color: 'text-amber-600' },
                                        { label: '⛔ Not Eligible', count: computedMetrics.tagCounts.notEligible, color: 'text-zinc-600' },
                                        { label: '⏳ Waitlisted', count: computedMetrics.tagCounts.waitlisted, color: 'text-blue-600' },
                                        { label: '🔒 Blacklisted', count: computedMetrics.tagCounts.blacklisted, color: 'text-red-700' },
                                        { label: '🚪 Withdrawn', count: computedMetrics.tagCounts.withdrawn, color: 'text-slate-500 dark:text-slate-400' },
                                        { label: '⬆️ Promotion', count: computedMetrics.tagCounts.promotion, color: 'text-purple-600' },
                                        { label: '↔️ Lateral Transfer', count: computedMetrics.tagCounts.lateralTransfer, color: 'text-indigo-600' },
                                        { label: '✅ Endorsed to OV', count: computedMetrics.tagCounts.endorsedOv, color: 'text-emerald-700' }
                                    ].map((tag, idx) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/50 p-3 rounded-none flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors">
                                            <span className="text-sm font-bold text-slate-600">{tag.label}</span>
                                            <span className={cn("text-sm font-extrabold tabular-nums", tag.color)}>{tag.count}</span>
                                        </div>
                                    ))}
                                    <div className="col-span-2 bg-blue-50/40 border border-blue-100 p-3 rounded-none flex items-center justify-between text-xs">
                                        <span className="font-bold text-blue-700">🏢 Most Chosen Account</span>
                                        <span className="font-extrabold text-blue-800 uppercase">
                                            {computedMetrics.accountAssignments[0]?.name || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sourcing, Education, Experience Tabbed Panel */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 rounded-none shadow-sm flex flex-col text-left">
                            <div className="flex border-b border-slate-150 text-xs shrink-0 font-bold">
                                {[
                                    { key: 'sourcing', label: '📡 Source Analysis' },
                                    { key: 'education', label: '🎓 Education' },
                                    { key: 'experience', label: '💼 Experience' },
                                    { key: 'fresh_grad', label: '🌱 Fresh Grad' }
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setRightTab(tab.key as any)}
                                        className={cn(
                                            "flex-1 py-3 text-center border-r last:border-r-0 border-slate-150 uppercase transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 cursor-pointer",
                                            rightTab === tab.key ? "bg-slate-50 dark:bg-slate-800/80 text-blue-600 border-b-2 border-b-blue-600" : "text-slate-500 dark:text-slate-400"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-8 min-h-[250px]">
                                {rightTab === 'sourcing' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                        <div className="h-52">
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Acquisition Sources</p>
                                            <ResponsiveContainer width="100%" height="90%">
                                                <PieChart>
                                                    <Pie data={computedMetrics.sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}>
                                                        {computedMetrics.sourceData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2 flex flex-col justify-center max-h-48 overflow-y-auto scrollbar-thin">
                                            {computedMetrics.sourceData.map((src, idx) => (
                                                <div key={idx} className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{src.name}</span>
                                                    <span className="font-black text-slate-800 dark:text-slate-200 tabular-nums">{src.value} ({src.hireRate}% hire)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {rightTab === 'education' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                        <div className="h-52">
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Education Distribution</p>
                                            <ResponsiveContainer width="100%" height="90%">
                                                <PieChart>
                                                    <Pie data={computedMetrics.eduData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={55}>
                                                        {computedMetrics.eduData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2 flex flex-col justify-center max-h-48 overflow-y-auto scrollbar-thin">
                                            {computedMetrics.eduData.map((edu, idx) => (
                                                <div key={idx} className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{edu.name}</span>
                                                    <span className="font-black text-slate-850 tabular-nums">{edu.value} ({edu.passRate}% pass)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {rightTab === 'experience' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                        <div className="h-52">
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Experience Tenure Distribution</p>
                                            <ResponsiveContainer width="100%" height="90%">
                                                <BarChart data={computedMetrics.experienceData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                                                    <YAxis tick={{ fontSize: 8 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="count" fill="#10b981" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2 flex flex-col justify-center max-h-48 overflow-y-auto scrollbar-thin">
                                            {computedMetrics.experienceData.map((exp, idx) => (
                                                <div key={idx} className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{exp.name}</span>
                                                    <span className="font-black text-slate-850 tabular-nums">{exp.count} ({exp.hiringRate}% hire)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {rightTab === 'fresh_grad' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                        <div className="h-52">
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Graduate Classification Split</p>
                                            <ResponsiveContainer width="100%" height="90%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'Fresh Graduate', value: computedMetrics.freshGradStats.fresh.count },
                                                            { name: 'Experienced', value: computedMetrics.freshGradStats.exp.count }
                                                        ]}
                                                        dataKey="value"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={35}
                                                        outerRadius={55}
                                                    >
                                                        <Cell fill="#10b981" />
                                                        <Cell fill="#3b82f6" />
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-4 flex flex-col justify-center">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-150 rounded-none">
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Fresh Graduate Pool: {computedMetrics.freshGradStats.fresh.count}</h4>
                                                <p className="text-sm text-emerald-600 font-bold">
                                                    Hiring Conversion: {computedMetrics.freshGradStats.fresh.count > 0 ? Math.round((computedMetrics.freshGradStats.fresh.hired / computedMetrics.freshGradStats.fresh.count) * 100) : 0}%
                                                </p>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-150 rounded-none">
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Experienced Pool: {computedMetrics.freshGradStats.exp.count}</h4>
                                                <p className="text-sm text-blue-600 font-bold">
                                                    Hiring Conversion: {computedMetrics.freshGradStats.exp.count > 0 ? Math.round((computedMetrics.freshGradStats.exp.hired / computedMetrics.freshGradStats.exp.count) * 100) : 0}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recruiter Performance Dot Scatter Plot Section */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-5 rounded-none shadow-sm text-left">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                <User className="w-4 h-4 text-purple-500" />
                                🔵 Recruiter Productivity Scatter Matrix
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="md:col-span-2 h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="x" name="Screened" unit=" candidates" tick={{ fontSize: 9 }} />
                                            <YAxis dataKey="y" name="Hired" unit=" hires" tick={{ fontSize: 9 }} />
                                            <ZAxis dataKey="size" range={[50, 400]} name="Pass Rate" unit="%" />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                            <Scatter name="Recruiters" data={computedMetrics.dotChartData} fill="#8b5cf6">
                                                {computedMetrics.dotChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col justify-center p-4 bg-purple-50/50 border border-purple-100 rounded-none text-xs">
                                    <p className="font-bold text-purple-700 text-sm mb-0.5">🧩 Efficiency Analysis</p>
                                    <p className="text-purple-600/80 text-sm leading-relaxed">
                                        Each dot represents a recruiter. X-axis is screening volume, Y-axis is hires delivered. Dot size indicates their endorsement quality rate.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* AI Recruitment Insights */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-5 rounded-none shadow-sm text-left">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                <Sparkles className="w-4 h-4 text-purple-600 fill-current" />
                                ✨ AI Recruitment Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {computedMetrics.aiInsights?.map((insight: any, idx: number) => (
                                    <div key={idx} className="flex gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800/50 rounded-none text-xs text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors">
                                        <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                        <p className="font-semibold leading-relaxed">{insight.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}


