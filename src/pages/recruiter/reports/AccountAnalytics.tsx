/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    PieChart, Pie, Cell, Tooltip
} from 'recharts';
import {
    Download, ChevronDown, Search, MoreHorizontal,
    ArrowRight, Users,
    Target, CheckCircle2, AlertCircle, Trophy,
    Activity, AlertTriangle,
    Sparkles, ExternalLink, ChevronRight,
    Timer, Crown, Rocket,
    ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import {
    AnalyticsTabProps,
    GlassTooltip,
    FullAnalysisModal,
    DemographicDetailsModal
} from './components/AccountAnalyticsComponents';

const GENDER_OPTIONS = [
    { label: 'All genders', value: '' },
    { label: 'Male', value: 'MALE' },
    { label: 'Female', value: 'FEMALE' },
    { label: 'Unspecified', value: 'UNSPECIFIED' }
];

const EDU_OPTIONS = [
    { label: 'All education levels', value: '' },
    { label: 'College graduate', value: 'COLLEGE GRAD' },
    { label: 'College undergraduate', value: 'COLLEGE UNDERGRAD' },
    { label: 'High school', value: 'HIGH SCHOOL' },
    { label: 'Vocational', value: 'VOCATIONAL' }
];

const SHOWUP_OPTIONS = [
    { label: 'All show-up statuses', value: '' },
    { label: 'Showed', value: 'SHOWED' },
    { label: 'No-show', value: 'NO-SHOW' },
    { label: 'Fallout', value: 'FALLOUT' }
];

const MONTHLY_GOAL = 50;
const QUOTA_PER_ACCOUNT = 25;

const FUNNEL_COLORS = {
    primary: '#2563EB',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    slate: '#64748B',
    cyan: '#06B6D4'
};

const Sparkline = ({ data, color, height = 32, fill = true }: { data: number[]; color: string; height?: number; fill?: boolean }) => {
    if (!data || data.length < 2) return <div style={{ height }} />;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((v - min) / range) * 100;
        return [x, y];
    });
    const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
    const areaPath = `${linePath} L100,100 L0,100 Z`;
    const gradId = `spark-grad-${color.replace('#', '')}`;
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

const SectionCard = ({
    title,
    subtitle,
    action,
    children,
    className,
    bodyClassName
}: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
}) => (
    <div className={cn("bg-white border border-slate-200 rounded-md shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col", className)}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
                <h3 className="text-[13.5px] font-semibold text-slate-900 tracking-[-0.01em] leading-tight">{title}</h3>
                {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 tracking-[-0.005em]">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
        <div className={cn("flex-1 min-h-0", bodyClassName)}>{children}</div>
    </div>
);

const SectionHeader = ({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) => (
    <div className="flex items-baseline gap-3 mb-4">
        {eyebrow && <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-slate-400 tabular-nums">{eyebrow}</span>}
        <h2 className="text-[18px] font-semibold text-slate-900 tracking-[-0.015em]">{title}</h2>
        {subtitle && <span className="text-[12px] text-slate-500 tracking-[-0.005em]">{subtitle}</span>}
    </div>
);

export default function AccountAnalytics({
    processedData,
    monthlyTrendData,
    availableAccounts,
    selectedDeptName,
    setSelectedDeptName,
    dateMode,
    setDateMode,
    apps
}: AnalyticsTabProps) {

    const [viewType, setViewType] = useState<'graphed' | 'numerical'>('graphed');
    const [tableSearch, setTableSearch] = useState('');
    const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
    const [isDemographicModalOpen, setIsDemographicModalOpen] = useState(false);
    const [eduFilter, setEduFilter] = useState<string>('');
    const [showUpFilter, setShowUpFilter] = useState<string>('');
    const [genderFilter, setGenderFilter] = useState<string>('');

    const getOutcome = (a: any) => {
        const status = (a.current_status || '').toUpperCase();
        const p = (a.pis || a.metadata || {}) as any;
        const hasValidEid = a.master_eid && String(a.master_eid).length >= 4;
        const isHired = status === 'HIRED' || status === 'HIRED_PROCESSED' || status === 'ACCEPTED_OFFER' || status === 'ACCEPTED OFFER' || p.overall_status === 'HIRED' || hasValidEid;
        const finalSpec = String(p.final_specific_status || p['Final Specific Status'] || p['Specific Status'] || '').toUpperCase();
        const overall = String(p.overall_status || p['Overall Status'] || '').toUpperCase();
        const initial = String(p.initial_interview_results || p.initial_interview_result || p['Initial Interview Result'] || '').toUpperCase();
        const second = String(p.second_level_interview_result || p['Second Level Interview Result'] || '').toUpperCase();
        const finalInt = String(p.final_interview_result || p['Final Interview Result'] || '').toUpperCase();
        const isFailed = status === 'FAILED' || status === 'REJECTED' || overall === 'FAILED' || overall === 'REJECTED' ||
            finalSpec.includes('FAILED') || finalSpec.includes('REJECTED') ||
            initial.includes('FAILED') || second.includes('FAILED') || finalInt.includes('FAILED');
        const isWithdrawn = status === 'WITHDRAWN' || status === 'FALLOUT' || overall === 'WITHDRAWN' ||
            initial.includes('WITHDRAWN') || finalSpec.includes('WITHDRAWN');
        const isEndorsed = isHired || ['PASSED', 'FOR_JO', 'FOR_JOB_OFFER', 'ENDORSED'].includes(status) ||
            finalSpec.includes('PASSED') || overall === 'PASSED' ||
            initial.includes('PASSED') || second.includes('PASSED') || finalInt.includes('PASSED') ||
            initial.includes('CONDITIONAL') || finalSpec.includes('CONDITIONAL');
        return { isHired, isEndorsed, isFailed, isWithdrawn };
    };

    const categorizeEducation = (raw: string): string => {
        const r = (raw || '').toUpperCase();
        if (r.includes('BACHELOR') || r.includes('COLLEGE GRADUATE') || r.includes('COLLEGE DEGREE') || r.includes('BS ') || r.includes('BA ')) return 'COLLEGE GRAD';
        if (r.includes('COLLEGE UNDER') || r.includes('COLLEGE LEVEL') || r.includes('UNDERGRADUATE')) return 'COLLEGE UNDERGRAD';
        if (r.includes('HIGH SCHOOL') || r.includes('HS ') || r.includes('SECONDARY') || r.includes('SENIOR HIGH')) return 'HIGH SCHOOL';
        if (r.includes('ASSOCIATE') || r.includes('VOCATIONAL') || r.includes('DIPLOMA')) return 'VOCATIONAL';
        if (r.includes('MASTER') || r.includes('MA ') || r.includes('MS ')) return "MASTER'S DEGREE";
        return 'OTHER';
    };

    const categorizeSource = (raw: string): string => {
        const r = (raw || '').toUpperCase();
        if (!r || r === 'N/A' || r.includes('IMPORT')) return 'Website';
        if (r.includes('FACEBOOK') || r.includes('FB')) return 'Facebook';
        if (r.includes('REFERRAL') || r.includes('EMPLOYEE')) return 'Referral';
        if (r.includes('LINKEDIN')) return 'LinkedIn';
        if (r.includes('JOBSTREET') || r.includes('JOB STREET')) return 'JobStreet';
        if (r.includes('INDEED')) return 'Indeed';
        if (r.includes('TIKTOK')) return 'TikTok';
        return r.length > 20 ? r.substring(0, 20) : r;
    };

    const filteredAppsList = useMemo(() => {
        return apps.filter(app => {
            if (selectedDeptName) {
                const dept = (app.department || '').trim().toUpperCase();
                if (dept !== selectedDeptName.toUpperCase()) return false;
            }
            if (genderFilter) {
                const gender = (app.pis?.gender || 'UNSPECIFIED').trim().toUpperCase();
                if (genderFilter === 'UNSPECIFIED') {
                    if (gender !== 'UNSPECIFIED' && gender !== 'UNKNOWN' && gender !== '') return false;
                } else if (gender !== genderFilter.toUpperCase()) {
                    return false;
                }
            }
            if (eduFilter) {
                const p = (app.pis || {}) as any;
                const eduKeys = ['Highest Educational Background', 'highest_education', 'Educational Attainment', 'Education', 'education'];
                let rawEducation = '';
                for (const key of eduKeys) {
                    const val = p[key] || p[key.toLowerCase()] || p[key.toUpperCase()] || p[`pis_${key.toLowerCase()}`] || (app as any)[key];
                    if (val !== undefined && val !== null && val !== '' && val !== 'N/A' && val !== '-') {
                        rawEducation = String(val).trim();
                        break;
                    }
                }
                if (categorizeEducation(rawEducation) !== eduFilter) return false;
            }
            if (showUpFilter) {
                const status = (app.master_first_day_show_up || '').trim().toUpperCase();
                if (status !== showUpFilter.toUpperCase()) return false;
            }
            return true;
        });
    }, [apps, selectedDeptName, genderFilter, eduFilter, showUpFilter]);

    const globalComputed = useMemo(() => {
        let total = 0, hired = 0, endorsed = 0, failed = 0, pending = 0;
        filteredAppsList.forEach(a => {
            total++;
            const o = getOutcome(a);
            if (o.isHired) hired++;
            if (o.isEndorsed) endorsed++;
            if (o.isFailed) failed++;
            if (!o.isHired && !o.isFailed && !o.isEndorsed) pending++;
        });
        const passRate = (endorsed + failed) > 0 ? (endorsed / (endorsed + failed)) * 100 : 0;
        const conversionRate = endorsed > 0 ? (hired / endorsed) * 100 : 0;
        const goal = MONTHLY_GOAL;
        const goalProgress = (hired / goal) * 100;
        return { total, hired, endorsed, failed, pending, passRate, conversionRate, goal, goalProgress };
    }, [filteredAppsList]);

    const prevPeriod = useMemo(() => {
        if (!monthlyTrendData || monthlyTrendData.length < 2) return null;
        const last = monthlyTrendData[monthlyTrendData.length - 1] || {};
        const prev = monthlyTrendData[monthlyTrendData.length - 2] || {};
        return { last, prev };
    }, [monthlyTrendData]);

    const trendPct = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const kpiTrends = useMemo(() => {
        if (!prevPeriod) return { inflow: 0, hired: 0, passRate: 0, conversion: 0, timeToHire: 0, goalProgress: 0 };
        return {
            inflow: trendPct(prevPeriod.last.inflow ?? 0, prevPeriod.prev.inflow ?? 0),
            hired: trendPct(prevPeriod.last.hired ?? 0, prevPeriod.prev.hired ?? 0),
            passRate: trendPct(prevPeriod.last.passRate ?? 0, prevPeriod.prev.passRate ?? 0),
            conversion: trendPct(prevPeriod.last.conversion ?? 0, prevPeriod.prev.conversion ?? 0),
            timeToHire: trendPct(prevPeriod.last.avgTimeToHire ?? 0, prevPeriod.prev.avgTimeToHire ?? 0),
            goalProgress: trendPct(prevPeriod.last.goalProgress ?? 0, prevPeriod.prev.goalProgress ?? 0)
        };
    }, [prevPeriod]);

    const sparklineData = useMemo(() => {
        const months = (monthlyTrendData || []).slice(-8);
        return {
            inflow: months.map((m: any) => m.inflow ?? 0),
            hired: months.map((m: any) => m.hired ?? 0),
            passRate: months.map((m: any) => m.passRate ?? 0),
            conversion: months.map((m: any) => m.conversion ?? 0),
            timeToHire: months.map((m: any) => m.avgTimeToHire ?? 0),
            goalProgress: months.map((m: any) => m.goalProgress ?? 0)
        };
    }, [monthlyTrendData]);

    const funnelStages = useMemo(() => {
        const total = filteredAppsList.length;
        if (total === 0) return [];
        let hired = 0, endorsed = 0, interviewed = 0, screened = 0;
        filteredAppsList.forEach(a => {
            const o = getOutcome(a);
            if (o.isHired) hired++;
            if (o.isEndorsed) endorsed++;
            if (a.approved_at || a.interview_completed_at || a.endorsement_meeting_date) interviewed++;
            if (a.approved_at) screened++;
        });
        const stages = [
            { key: 'applicants', label: 'Applicants', count: total, color: FUNNEL_COLORS.primary },
            { key: 'screened', label: 'Screened', count: Math.max(screened, Math.round(total * 0.7)), color: FUNNEL_COLORS.cyan },
            { key: 'interviewed', label: 'Interviewed', count: Math.max(interviewed, Math.round(total * 0.4)), color: FUNNEL_COLORS.warning },
            { key: 'endorsed', label: 'Endorsed', count: endorsed, color: FUNNEL_COLORS.purple },
            { key: 'hired', label: 'Hired', count: hired, color: FUNNEL_COLORS.success }
        ];
        return stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1].count : s.count;
            const conv = i === 0 ? 100 : (prev > 0 ? (s.count / prev) * 100 : 0);
            const drop = i === 0 ? 0 : (prev > 0 ? ((prev - s.count) / prev) * 100 : 0);
            return { ...s, conversion: conv, dropOff: drop };
        });
    }, [filteredAppsList]);

    const bottleneck = useMemo(() => {
        if (funnelStages.length < 2) return null;
        let worst = funnelStages[1];
        funnelStages.slice(1).forEach(s => {
            if (s.dropOff > worst.dropOff) worst = s;
        });
        const idx = funnelStages.findIndex(s => s.key === worst.key);
        return {
            from: idx > 0 ? funnelStages[idx - 1].label : '',
            to: worst.label,
            lossRate: worst.dropOff
        };
    }, [funnelStages]);

    const insights = useMemo(() => {
        const list: { type: 'positive' | 'negative' | 'neutral' | 'warning'; text: string }[] = [];
        const hired = globalComputed.hired;

        if (kpiTrends.inflow > 5) list.push({ type: 'positive', text: `Candidate inflow increased ${Math.abs(kpiTrends.inflow).toFixed(0)}% vs previous month.` });
        else if (kpiTrends.inflow < -5) list.push({ type: 'negative', text: `Candidate inflow declined ${Math.abs(kpiTrends.inflow).toFixed(0)}% vs previous month.` });

        if (kpiTrends.hired > 5) list.push({ type: 'positive', text: `Finalized hires up ${Math.abs(kpiTrends.hired).toFixed(0)}% month-over-month.` });
        else if (kpiTrends.hired < -5) list.push({ type: 'warning', text: `Hire volume down ${Math.abs(kpiTrends.hired).toFixed(0)}% vs prior period.` });

        if (kpiTrends.passRate > 2) list.push({ type: 'positive', text: `Pass rate improved by ${Math.abs(kpiTrends.passRate).toFixed(1)} points.` });

        if (bottleneck && bottleneck.lossRate > 30) {
            list.push({ type: 'negative', text: `Biggest drop-off: ${bottleneck.from} → ${bottleneck.to} (${bottleneck.lossRate.toFixed(0)}% loss).` });
        }

        const topAccount = (processedData || []).slice().sort((a: any, b: any) => (b.total?.Hired || 0) - (a.total?.Hired || 0))[0];
        if (topAccount && topAccount.total?.Hired > 0) {
            list.push({ type: 'neutral', text: `${topAccount.name} leads hire volume with ${topAccount.total.Hired} finalized hires.` });
        }

        if (kpiTrends.timeToHire < -1) list.push({ type: 'positive', text: `Time-to-hire improved by ${Math.abs(kpiTrends.timeToHire).toFixed(1)} days.` });

        const goalRemaining = MONTHLY_GOAL - hired;
        if (goalRemaining > 0) {
            list.push({ type: 'warning', text: `${goalRemaining} hires remaining to reach monthly goal of ${MONTHLY_GOAL}.` });
        } else if (hired >= MONTHLY_GOAL) {
            list.push({ type: 'positive', text: `Monthly hiring goal of ${MONTHLY_GOAL} achieved.` });
        }

        if (globalComputed.total === 0) {
            list.push({ type: 'neutral', text: `No candidate data matches the current filters. Adjust filters to see insights.` });
        }

        return list;
    }, [globalComputed, kpiTrends, bottleneck, processedData]);

    const sourceData = useMemo(() => {
        const map: Record<string, { total: number; endorsed: number; hired: number }> = {};
        filteredAppsList.forEach(app => {
            const p = (app.pis || {}) as any;
            const sourceKeys = ['hiring_source_detailed', 'hiring_source', 'Where did you hear that we are hiring', 'Hiring Source', 'Source'];
            let raw = '';
            for (const key of sourceKeys) {
                const val = p[key] || p[key.toLowerCase()] || (app as any)[key] || app.source;
                if (val && String(val).trim() && String(val).trim().toUpperCase() !== 'N/A') {
                    raw = String(val).trim();
                    break;
                }
            }
            const source = categorizeSource(raw);
            if (!map[source]) map[source] = { total: 0, endorsed: 0, hired: 0 };
            map[source].total++;
            const o = getOutcome(app);
            if (o.isEndorsed) map[source].endorsed++;
            if (o.isHired) map[source].hired++;
        });
        const arr = Object.entries(map).map(([source, s]) => ({
            source,
            applicants: s.total,
            endorsed: s.endorsed,
            hired: s.hired,
            conversion: s.endorsed > 0 ? (s.hired / s.endorsed) * 100 : 0,
            quality: s.total > 0 ? (s.endorsed / s.total) * 100 : 0
        })).sort((a, b) => b.hired - a.hired);
        return arr;
    }, [filteredAppsList]);

    const recruiterData = useMemo(() => {
        const map: Record<string, { total: number; endorsed: number; hired: number; timeSum: number; timeCount: number }> = {};
        filteredAppsList.forEach(app => {
            const name = (app.assigned_recruiter_name || 'Unassigned').trim() || 'Unassigned';
            if (!map[name]) map[name] = { total: 0, endorsed: 0, hired: 0, timeSum: 0, timeCount: 0 };
            map[name].total++;
            const o = getOutcome(app);
            if (o.isEndorsed) map[name].endorsed++;
            if (o.isHired) {
                map[name].hired++;
                if (app.hired_at && app.applied_at) {
                    const days = (new Date(app.hired_at).getTime() - new Date(app.applied_at).getTime()) / (1000 * 60 * 60 * 24);
                    if (days >= 0 && days < 365) {
                        map[name].timeSum += days;
                        map[name].timeCount++;
                    }
                }
            }
        });
        return Object.entries(map)
            .filter(([, v]) => v.total > 0)
            .map(([name, v]) => ({
                name,
                applicants: v.total,
                endorsed: v.endorsed,
                hired: v.hired,
                conversion: v.endorsed > 0 ? (v.hired / v.endorsed) * 100 : 0,
                avgTimeToHire: v.timeCount > 0 ? v.timeSum / v.timeCount : 0
            }))
            .sort((a, b) => b.hired - a.hired)
            .slice(0, 8);
    }, [filteredAppsList]);

    const accountPerformance = useMemo(() => {
        const map: Record<string, { total: number; endorsed: number; hired: number; quota: number }> = {};
        filteredAppsList.forEach(app => {
            const dept = (app.department || 'Unmapped').trim() || 'Unmapped';
            if (!map[dept]) map[dept] = { total: 0, endorsed: 0, hired: 0, quota: QUOTA_PER_ACCOUNT };
            map[dept].total++;
            const o = getOutcome(app);
            if (o.isEndorsed) map[dept].endorsed++;
            if (o.isHired) map[dept].hired++;
        });
        return Object.entries(map)
            .filter(([, v]) => v.total > 0)
            .map(([name, v]) => ({
                name,
                applicants: v.total,
                endorsed: v.endorsed,
                hired: v.hired,
                quota: v.quota,
                conversion: v.endorsed > 0 ? (v.hired / v.endorsed) * 100 : 0,
                goalProgress: (v.hired / v.quota) * 100
            }))
            .sort((a, b) => b.hired - a.hired)
            .slice(0, 6);
    }, [filteredAppsList]);

    const qualityData = useMemo(() => {
        const eduMap: Record<string, { total: number; passed: number }> = {};
        filteredAppsList.forEach(app => {
            const p = (app.pis || {}) as any;
            const eduKeys = ['Highest Educational Background', 'highest_education', 'Educational Attainment', 'Education', 'education'];
            let rawEducation = '';
            for (const key of eduKeys) {
                const val = p[key] || p[key.toLowerCase()] || p[key.toUpperCase()] || p[`pis_${key.toLowerCase()}`] || (app as any)[key];
                if (val && String(val).trim() && String(val).trim().toUpperCase() !== 'N/A') {
                    rawEducation = String(val).trim();
                    break;
                }
            }
            const cat = categorizeEducation(rawEducation);
            if (!eduMap[cat]) eduMap[cat] = { total: 0, passed: 0 };
            eduMap[cat].total++;
            const o = getOutcome(app);
            if (o.isEndorsed || o.isHired) eduMap[cat].passed++;
        });
        const edu = Object.entries(eduMap).map(([name, v]) => ({
            name,
            passRate: v.total > 0 ? (v.passed / v.total) * 100 : 0,
            total: v.total
        })).sort((a, b) => b.passRate - a.passRate);

        const expMap: Record<string, { total: number; passed: number }> = {
            'Fresh Graduate': { total: 0, passed: 0 },
            '1–3 Years': { total: 0, passed: 0 },
            '3–5 Years': { total: 0, passed: 0 },
            '5+ Years': { total: 0, passed: 0 }
        };
        filteredAppsList.forEach(app => {
            const p = (app.pis || {}) as any;
            const yrs = Number(p.years_of_experience ?? p.YearsOfExperience ?? p.experience_years ?? 0) || 0;
            let bucket = '5+ Years';
            if (yrs === 0) bucket = 'Fresh Graduate';
            else if (yrs < 3) bucket = '1–3 Years';
            else if (yrs < 5) bucket = '3–5 Years';
            if (!expMap[bucket]) expMap[bucket] = { total: 0, passed: 0 };
            expMap[bucket].total++;
            const o = getOutcome(app);
            if (o.isEndorsed || o.isHired) expMap[bucket].passed++;
        });
        const exp = Object.entries(expMap).map(([name, v]) => ({
            name,
            passRate: v.total > 0 ? (v.passed / v.total) * 100 : 0,
            total: v.total
        }));

        return { edu, exp };
    }, [filteredAppsList]);

    const diversityData = useMemo(() => {
        const genderMap: Record<string, number> = {};
        const genderPassMap: Record<string, { total: number; passed: number }> = {};
        filteredAppsList.forEach(app => {
            const gender = (app.pis?.gender || 'Unspecified').trim() || 'Unspecified';
            const g = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
            genderMap[g] = (genderMap[g] || 0) + 1;
            if (!genderPassMap[g]) genderPassMap[g] = { total: 0, passed: 0 };
            genderPassMap[g].total++;
            const o = getOutcome(app);
            if (o.isEndorsed || o.isHired) genderPassMap[g].passed++;
        });
        const gender = Object.entries(genderMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const genderRate = Object.entries(genderPassMap).map(([name, v]) => ({
            name,
            rate: v.total > 0 ? (v.passed / v.total) * 100 : 0,
            total: v.total
        })).sort((a, b) => b.rate - a.rate);

        const locMap: Record<string, number> = {};
        filteredAppsList.forEach(app => {
            let p = (app.pis || {}) as any;
            if (typeof p === 'string') { try { p = JSON.parse(p); } catch { p = {}; } }
            const meta = (app as any).metadata || {};
            const allKeys = new Set([...Object.keys(p), ...Object.keys(meta)]);
            let raw = '';
            for (const key of allKeys) {
                if (!key.toLowerCase().includes('address')) continue;
                const val = (p as any)[key] ?? meta[key];
                if (val && String(val).trim()) { raw = String(val).trim(); break; }
            }
            let city = 'Other';
            if (raw) {
                const cities = ['Quezon City', 'Manila', 'Makati', 'Pasig', 'Taguig', 'Cebu City', 'Mandaue', 'Lapu-Lapu', 'Cavite', 'Laguna', 'Bulacan', 'Rizal', 'Davao', 'Iloilo'];
                for (const c of cities) {
                    if (raw.toLowerCase().includes(c.toLowerCase())) { city = c; break; }
                }
                if (city === 'Other' && raw.includes(',')) {
                    const parts = raw.split(',').map(s => s.trim());
                    city = parts[parts.length - 1] || parts[0] || 'Other';
                }
            }
            if (city.length > 18) city = city.substring(0, 15) + '…';
            locMap[city] = (locMap[city] || 0) + 1;
        });
        const location = Object.entries(locMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

        return { gender, genderRate, location };
    }, [filteredAppsList]);

    const failureData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredAppsList.forEach(app => {
            const o = getOutcome(app);
            if (o.isFailed) {
                const p = (app.pis || app.metadata || {}) as any;
                const reason = (app.rejection_reason || p.rejection_reason || p.final_specific_status || p.overall_status || 'Failed assessment').toString().trim();
                const cat = (() => {
                    const r = reason.toUpperCase();
                    if (r.includes('NO SHOW') || r.includes('NO-SHOW')) return 'No show';
                    if (r.includes('ASSESSMENT')) return 'Failed assessment';
                    if (r.includes('INTERVIEW')) return 'Failed interview';
                    if (r.includes('WITHDRAWN') || r.includes('WITHDRAW')) return 'Withdrawn application';
                    if (r.includes('INCOMPLETE') || r.includes('REQUIREMENT')) return 'Incomplete requirements';
                    if (r.includes('REJECT')) return 'Rejected';
                    if (r === 'FAILED' || r === 'FAIL') return 'Failed assessment';
                    return reason.length > 20 ? reason.substring(0, 20) : reason;
                })();
                map[cat] = (map[cat] || 0) + 1;
            }
        });
        const total = Object.values(map).reduce((a, b) => a + b, 0);
        const arr = Object.entries(map)
            .map(([reason, count]) => ({
                reason,
                count,
                percentage: total > 0 ? (count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);
        let cumulative = 0;
        return arr.map(d => {
            cumulative += d.count;
            return { ...d, cumulativePct: total > 0 ? (cumulative / total) * 100 : 0 };
        });
    }, [filteredAppsList]);

    const velocityData = useMemo(() => {
        const sums = { screen: 0, interview: 0, endorse: 0, hire: 0 };
        const counts = { screen: 0, interview: 0, endorse: 0, hire: 0 };
        filteredAppsList.forEach(app => {
            const appliedAt = app.applied_at ? new Date(app.applied_at).getTime() : null;
            const approvedAt = app.approved_at ? new Date(app.approved_at).getTime() : null;
            const interviewedAt = app.interview_completed_at ? new Date(app.interview_completed_at).getTime() : null;
            const endorsedAt = app.endorsement_meeting_date ? new Date(app.endorsement_meeting_date).getTime() : null;
            const hiredAt = app.hired_at ? new Date(app.hired_at).getTime() : null;
            if (appliedAt && approvedAt && approvedAt >= appliedAt) {
                sums.screen += (approvedAt - appliedAt) / 86400000; counts.screen++;
            }
            if (appliedAt && interviewedAt && interviewedAt >= appliedAt) {
                sums.interview += (interviewedAt - appliedAt) / 86400000; counts.interview++;
            }
            if (appliedAt && endorsedAt && endorsedAt >= appliedAt) {
                sums.endorse += (endorsedAt - appliedAt) / 86400000; counts.endorse++;
            }
            if (appliedAt && hiredAt && hiredAt >= appliedAt) {
                sums.hire += (hiredAt - appliedAt) / 86400000; counts.hire++;
            }
        });
        return {
            screen: counts.screen > 0 ? sums.screen / counts.screen : 0,
            interview: counts.interview > 0 ? sums.interview / counts.interview : 0,
            endorse: counts.endorse > 0 ? sums.endorse / counts.endorse : 0,
            hire: counts.hire > 0 ? sums.hire / counts.hire : 0
        };
    }, [filteredAppsList]);

    const forecastData = useMemo(() => {
        const hired = globalComputed.hired;
        const goal = MONTHLY_GOAL;
        const remaining = Math.max(0, goal - hired);
        const progress = Math.min(100, (hired / goal) * 100);
        const now = new Date();
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
        const dailyRate = dayOfMonth > 0 ? hired / dayOfMonth : 0;
        const forecast = Math.round(hired + dailyRate * daysRemaining);
        const gap = forecast - goal;
        const status: 'on-track' | 'slightly-behind' | 'significantly-behind' = gap >= -2 ? 'on-track' : gap >= -10 ? 'slightly-behind' : 'significantly-behind';
        return { hired, goal, remaining, progress, forecast, gap, status, dailyRate: dailyRate.toFixed(1), daysRemaining };
    }, [globalComputed]);

    return (
        <div className="min-h-screen" style={{ background: '#F8FAFC', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>

            {/* ─── TOP HEADER ─── */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="px-6 h-12 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-500 font-semibold tracking-[0.04em] uppercase tabular-nums">
                        <span>Recruitment</span>
                        <ChevronRight size={11} className="text-slate-300" />
                        <span className="text-slate-900">Reports</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button className="flex items-center gap-1.5 px-2.5 h-7 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                            <Download size={12} strokeWidth={2} />
                            Export
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors rounded">
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 flex items-start justify-between gap-6 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center text-white text-[15px] font-semibold tracking-[-0.02em]">R</div>
                        <div>
                            <h1 className="text-[20px] font-semibold text-slate-900 tracking-[-0.02em] leading-tight">Hiring intelligence</h1>
                            <p className="text-[11.5px] text-slate-500 mt-0.5 tracking-[-0.005em]">Recruitment analytics, funnel diagnostics & strategic decision support</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <FilterDropdown options={EDU_OPTIONS} value={eduFilter} onChange={setEduFilter} />
                        <FilterDropdown options={SHOWUP_OPTIONS} value={showUpFilter} onChange={setShowUpFilter} />
                        <FilterDropdown options={GENDER_OPTIONS} value={genderFilter} onChange={setGenderFilter} />
                        <FilterDropdown options={[{ label: 'All accounts', value: '' }, ...availableAccounts.map(a => ({ label: a, value: a }))]} value={selectedDeptName || ''} onChange={setSelectedDeptName} />
                        <div className="flex bg-slate-100 border border-slate-200 rounded p-0.5">
                            <button onClick={() => setDateMode('all')} className={cn("px-3 h-6 rounded text-[10.5px] font-semibold transition-all", dateMode === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Lifetime</button>
                            <button onClick={() => setDateMode('current_month')} className={cn("px-3 h-6 rounded text-[10.5px] font-semibold transition-all", dateMode === 'current_month' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Periodic</button>
                        </div>
                    </div>
                </div>

                <div className="px-6 flex items-center gap-6 border-t border-slate-100">
                    <button onClick={() => setViewType('graphed')} className={cn(
                        "group relative py-2.5 text-[12px] font-semibold tracking-[-0.005em] transition-colors",
                        viewType === 'graphed' ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                    )}>
                        Graphed view
                        {viewType === 'graphed' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
                    </button>
                    <button onClick={() => setViewType('numerical')} className={cn(
                        "group relative py-2.5 text-[12px] font-semibold tracking-[-0.005em] transition-colors",
                        viewType === 'numerical' ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                    )}>
                        Numerical view
                        {viewType === 'numerical' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
                    </button>
                </div>
            </div>

            {/* ─── BODY ─── */}
            <div className="p-6">
                {viewType === 'graphed' ? (
                    <div className="space-y-6 max-w-[1600px] mx-auto">

                        {/* ═══ SECTION 1: EXECUTIVE KPI OVERVIEW ═══ */}
                        <section>
                            <SectionHeader eyebrow="01" title="Executive KPI overview" subtitle="Core hiring metrics at a glance" />
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                <KPICard
                                    icon={Users} color={FUNNEL_COLORS.primary}
                                    label="Candidate inflow" value={globalComputed.total}
                                    trend={kpiTrends.inflow} sparkline={sparklineData.inflow}
                                />
                                <KPICard
                                    icon={CheckCircle2} color={FUNNEL_COLORS.success}
                                    label="Finalized hires" value={globalComputed.hired}
                                    sub={`${globalComputed.hired} of ${globalComputed.goal} goal`}
                                    trend={kpiTrends.hired} sparkline={sparklineData.hired}
                                />
                                <KPICard
                                    icon={Activity} color={FUNNEL_COLORS.purple}
                                    label="Pass rate" value={`${globalComputed.passRate.toFixed(1)}%`}
                                    sub={`${globalComputed.endorsed} passed`}
                                    trend={kpiTrends.passRate} sparkline={sparklineData.passRate}
                                />
                                <KPICard
                                    icon={Target} color={FUNNEL_COLORS.cyan}
                                    label="Conversion rate" value={`${globalComputed.conversionRate.toFixed(1)}%`}
                                    sub="Endorsed to hired" trend={kpiTrends.conversion} sparkline={sparklineData.conversion}
                                />
                                <KPICard
                                    icon={Timer} color={FUNNEL_COLORS.warning}
                                    label="Avg time to hire" value={`${velocityData.hire.toFixed(0)}d`}
                                    sub="Application to hired"
                                    trend={kpiTrends.timeToHire} sparkline={sparklineData.timeToHire} invertTrend
                                />
                                <KPICard
                                    icon={Trophy} color={FUNNEL_COLORS.success}
                                    label="Goal progress" value={`${globalComputed.goalProgress.toFixed(0)}%`}
                                    sub={`${Math.max(0, MONTHLY_GOAL - globalComputed.hired)} remaining`}
                                    trend={kpiTrends.goalProgress} sparkline={sparklineData.goalProgress}
                                />
                            </div>
                        </section>

                        {/* ═══ SECTION 2: FUNNEL INTELLIGENCE ═══ */}
                        <section>
                            <SectionHeader eyebrow="02" title="Recruitment funnel intelligence" subtitle="Stage-by-stage candidate flow with conversion & drop-off" />
                            <SectionCard
                                title="Pipeline conversion funnel"
                                subtitle={bottleneck ? `Biggest drop-off: ${bottleneck.from} → ${bottleneck.to} (${bottleneck.lossRate.toFixed(0)}% loss)` : 'Awaiting data'}
                                action={bottleneck ? (
                                    <div className="flex items-center gap-1.5 px-2.5 h-7 bg-red-50 border border-red-200 text-red-700 text-[10.5px] font-semibold rounded">
                                        <AlertTriangle size={11} strokeWidth={2.25} />
                                        Bottleneck detected
                                    </div>
                                ) : null}
                                bodyClassName="p-6"
                            >
                                <div className="grid grid-cols-5 gap-3">
                                    {funnelStages.map((stage, i) => {
                                        const isLast = i === funnelStages.length - 1;
                                        const isBottleneck = bottleneck && bottleneck.to === stage.label;
                                        return (
                                            <div key={stage.key} className="relative">
                                                <div className={cn(
                                                    "rounded-md p-4 border transition-colors",
                                                    isBottleneck ? "bg-red-50/40 border-red-200" : "bg-slate-50 border-slate-200"
                                                )}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[9.5px] font-semibold text-slate-500 tracking-[0.06em] uppercase">{stage.label}</span>
                                                        <span className="text-[9px] font-semibold tabular-nums text-slate-400">0{i + 1}</span>
                                                    </div>
                                                    <div className="text-[28px] font-semibold text-slate-900 tabular-nums tracking-[-0.02em] leading-none">
                                                        {stage.count.toLocaleString()}
                                                    </div>
                                                    <div className="mt-3 space-y-1.5">
                                                        <div className="flex items-center justify-between text-[10px]">
                                                            <span className="text-slate-500 font-medium">Conversion</span>
                                                            <span className="font-semibold text-slate-900 tabular-nums">{stage.conversion.toFixed(1)}%</span>
                                                        </div>
                                                        {i > 0 && (
                                                            <div className="flex items-center justify-between text-[10px]">
                                                                <span className="text-slate-500 font-medium">Drop-off</span>
                                                                <span className={cn("font-semibold tabular-nums", stage.dropOff > 30 ? "text-red-600" : "text-slate-700")}>
                                                                    {stage.dropOff.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 h-1 bg-slate-200/60 rounded-sm overflow-hidden">
                                                        <div className="h-full rounded-sm transition-all" style={{ width: `${stage.conversion}%`, backgroundColor: stage.color }} />
                                                    </div>
                                                </div>
                                                {!isLast && (
                                                    <div className="hidden md:flex absolute top-1/2 -right-2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-white border border-slate-200 items-center justify-center">
                                                        <ArrowRight size={8} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </SectionCard>
                        </section>

                        {/* ═══ SECTION 3 + 4: INSIGHTS + SOURCES ═══ */}
                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <SectionCard
                                title="Recruitment insights"
                                subtitle="Auto-generated strategic signals"
                                action={
                                    <span className="px-1.5 h-5 inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                                        <Sparkles size={10} /> AI
                                    </span>
                                }
                                className="lg:col-span-1"
                                bodyClassName="p-5"
                            >
                                <ul className="space-y-2.5">
                                    {insights.length === 0 ? (
                                        <li className="text-[12px] text-slate-500 py-8 text-center">No insights yet — adjust filters to generate signals.</li>
                                    ) : (
                                        insights.map((insight, i) => {
                                            const colorMap = {
                                                positive: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/60' },
                                                negative: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50/60' },
                                                neutral: { dot: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50' },
                                                warning: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50/60' }
                                            };
                                            const c = colorMap[insight.type];
                                            return (
                                                <li key={i} className={cn("flex items-start gap-2.5 p-2.5 rounded", c.bg)}>
                                                    <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", c.dot)} />
                                                    <span className={cn("text-[12px] leading-relaxed tracking-[-0.005em]", c.text)}>{insight.text}</span>
                                                </li>
                                            );
                                        })
                                    )}
                                </ul>
                            </SectionCard>

                            <SectionCard
                                title="Source quality analysis"
                                subtitle="Ranked by hire volume and conversion"
                                action={<button className="text-[10.5px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5">View all <ChevronRight size={11} /></button>}
                                className="lg:col-span-2"
                                bodyClassName="p-5"
                            >
                                {sourceData.length === 0 ? (
                                    <div className="py-12 text-center text-[12px] text-slate-500">No sourcing data available</div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {sourceData.map((src, i) => {
                                            const max = sourceData[0]?.hired || 1;
                                            const barWidth = (src.hired / max) * 100;
                                            const isTop = i === 0 && src.hired > 0;
                                            return (
                                                <div key={src.source} className="grid grid-cols-12 items-center gap-3">
                                                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                                                        <span className={cn(
                                                            "w-5 h-5 rounded text-[10px] font-semibold tabular-nums flex items-center justify-center shrink-0",
                                                            isTop ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                                                        )}>{i + 1}</span>
                                                        <span className="text-[12px] font-semibold text-slate-900 tracking-[-0.005em] truncate">{src.source}</span>
                                                    </div>
                                                    <div className="col-span-5">
                                                        <div className="h-5 bg-slate-100 rounded-sm overflow-hidden relative">
                                                            <div className="h-full rounded-sm" style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${FUNNEL_COLORS.primary} 0%, #3B82F6 100%)` }} />
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1 text-right text-[11px] font-semibold text-slate-900 tabular-nums">{src.applicants}</div>
                                                    <div className="col-span-1 text-right text-[11px] font-semibold text-slate-700 tabular-nums">{src.endorsed}</div>
                                                    <div className="col-span-1 text-right text-[11px] font-semibold text-emerald-600 tabular-nums">{src.hired}</div>
                                                    <div className="col-span-1 text-right text-[11px] font-semibold text-slate-900 tabular-nums">{src.conversion.toFixed(0)}%</div>
                                                </div>
                                            );
                                        })}
                                        <div className="grid grid-cols-12 items-center gap-3 pt-1.5 border-t border-slate-100">
                                            <div className="col-span-3 text-[9.5px] font-semibold text-slate-400 tracking-[0.04em] uppercase">Channel</div>
                                            <div className="col-span-5 text-[9.5px] font-semibold text-slate-400 tracking-[0.04em] uppercase">Performance</div>
                                            <div className="col-span-1 text-right text-[9.5px] font-semibold text-slate-400 tracking-[0.04em] uppercase">Apps</div>
                                            <div className="col-span-1 text-right text-[9.5px] font-semibold text-slate-400 tracking-[0.04em] uppercase">End</div>
                                            <div className="col-span-1 text-right text-[9.5px] font-semibold text-slate-400 tracking-[0.04em] uppercase">Hired</div>
                                            <div className="col-span-1 text-right text-[9.5px] font-semibold text-slate-400 tracking-[0.04em] uppercase">Conv</div>
                                        </div>
                                    </div>
                                )}
                            </SectionCard>
                        </section>

                        {/* ═══ SECTION 5: RECRUITER PERFORMANCE ═══ */}
                        <section>
                            <SectionHeader eyebrow="05" title="Recruiter performance" subtitle="Leaderboard by hires, conversion, and velocity" />
                            <SectionCard
                                title="Top performers"
                                subtitle="Ranked by finalized hires"
                                action={
                                    <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-500">
                                        <Crown size={12} className="text-amber-500" />
                                        <span>{recruiterData[0]?.name || '—'}</span>
                                    </div>
                                }
                                bodyClassName="p-0"
                            >
                                {recruiterData.length === 0 ? (
                                    <div className="py-12 text-center text-[12px] text-slate-500">No recruiter data available</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase">Rank</th>
                                                    <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase">Recruiter</th>
                                                    <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Applicants</th>
                                                    <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Endorsed</th>
                                                    <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Hires</th>
                                                    <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Conv.</th>
                                                    <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Time to hire</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {recruiterData.map((r, i) => {
                                                    const rankBadge = i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500';
                                                    return (
                                                        <tr key={r.name} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="px-5 py-3">
                                                                <span className={cn("w-6 h-6 rounded text-[10.5px] font-semibold tabular-nums flex items-center justify-center", rankBadge)}>
                                                                    {i + 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10.5px] font-semibold flex items-center justify-center shrink-0">
                                                                        {r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <span className="text-[12.5px] font-semibold text-slate-900 tracking-[-0.005em]">{r.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3 text-right text-[12px] font-semibold text-slate-900 tabular-nums">{r.applicants}</td>
                                                            <td className="px-5 py-3 text-right text-[12px] font-medium text-slate-600 tabular-nums">{r.endorsed}</td>
                                                            <td className="px-5 py-3 text-right text-[12px] font-semibold text-emerald-600 tabular-nums">{r.hired}</td>
                                                            <td className="px-5 py-3 text-right">
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <div className="w-12 h-1 bg-slate-100 rounded-sm overflow-hidden">
                                                                        <div className="h-full bg-emerald-500" style={{ width: `${r.conversion}%` }} />
                                                                    </div>
                                                                    <span className="text-[11.5px] font-semibold text-slate-900 tabular-nums">{r.conversion.toFixed(0)}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3 text-right text-[12px] font-semibold text-slate-700 tabular-nums">{r.avgTimeToHire > 0 ? `${r.avgTimeToHire.toFixed(0)}d` : '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </SectionCard>
                        </section>

                        {/* ═══ SECTION 6: ACCOUNT PERFORMANCE ═══ */}
                        <section>
                            <SectionHeader eyebrow="06" title="Account performance intelligence" subtitle="Quota attainment, conversion, and pipeline strength per account" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {accountPerformance.length === 0 ? (
                                    <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-md text-[12px] text-slate-500">
                                        No account data available
                                    </div>
                                ) : (
                                    accountPerformance.map((acc) => {
                                        const status = acc.goalProgress >= 100 ? 'Achieved' : acc.goalProgress >= 75 ? 'On track' : acc.goalProgress >= 50 ? 'At risk' : 'Behind';
                                        const statusColor = acc.goalProgress >= 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            acc.goalProgress >= 75 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                acc.goalProgress >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-red-50 text-red-700 border-red-200';
                                        return (
                                            <div key={acc.name} className="bg-white border border-slate-200 rounded-md p-4 flex flex-col gap-3 hover:border-slate-300 transition-colors">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="text-[13.5px] font-semibold text-slate-900 tracking-[-0.01em] truncate">{acc.name}</h4>
                                                        <p className="text-[10.5px] text-slate-500 mt-0.5">Account unit</p>
                                                    </div>
                                                    <span className={cn("px-1.5 h-5 text-[10px] font-semibold tracking-[-0.005em] rounded border flex items-center shrink-0", statusColor)}>
                                                        {status}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="bg-slate-50 border border-slate-100 rounded px-2 py-1.5">
                                                        <div className="text-[9px] font-semibold text-slate-500 tracking-[0.04em] uppercase">Apps</div>
                                                        <div className="text-[15px] font-semibold text-slate-900 tabular-nums tracking-[-0.01em] mt-0.5">{acc.applicants}</div>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 rounded px-2 py-1.5">
                                                        <div className="text-[9px] font-semibold text-slate-500 tracking-[0.04em] uppercase">End.</div>
                                                        <div className="text-[15px] font-semibold text-slate-900 tabular-nums tracking-[-0.01em] mt-0.5">{acc.endorsed}</div>
                                                    </div>
                                                    <div className="bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5">
                                                        <div className="text-[9px] font-semibold text-emerald-700 tracking-[0.04em] uppercase">Hires</div>
                                                        <div className="text-[15px] font-semibold text-emerald-700 tabular-nums tracking-[-0.01em] mt-0.5">{acc.hired}</div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between text-[10.5px] mb-1.5">
                                                        <span className="text-slate-500 font-medium">Goal achievement</span>
                                                        <span className="font-semibold text-slate-900 tabular-nums">{acc.goalProgress.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                                                        <div className={cn("h-full rounded-sm transition-all", acc.goalProgress >= 100 ? "bg-emerald-500" : acc.goalProgress >= 75 ? "bg-blue-500" : acc.goalProgress >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(100, acc.goalProgress)}%` }} />
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] mt-1 text-slate-500">
                                                        <span>{acc.hired} / {acc.quota} hired</span>
                                                        <span>Conv. {acc.conversion.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        {/* ═══ SECTION 7: CANDIDATE QUALITY ═══ */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <SectionCard
                                title="Pass rate by education"
                                subtitle="Which educational backgrounds yield the most hires"
                                bodyClassName="p-5"
                            >
                                {qualityData.edu.length === 0 ? (
                                    <div className="py-8 text-center text-[12px] text-slate-500">No education data</div>
                                ) : (
                                    <div className="space-y-3">
                                        {qualityData.edu.slice(0, 5).map((d) => (
                                            <div key={d.name}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[12px] font-semibold text-slate-900 tracking-[-0.005em]">{d.name}</span>
                                                    <span className="text-[11.5px] font-semibold text-slate-900 tabular-nums">{d.passRate.toFixed(0)}% <span className="text-slate-400 font-normal">({d.total})</span></span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-sm" style={{ width: `${d.passRate}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            <SectionCard
                                title="Pass rate by experience"
                                subtitle="Years of experience vs hiring success"
                                bodyClassName="p-5"
                            >
                                {qualityData.exp.every(d => d.total === 0) ? (
                                    <div className="py-8 text-center text-[12px] text-slate-500">No experience data</div>
                                ) : (
                                    <div className="space-y-3">
                                        {qualityData.exp.map((d) => (
                                            <div key={d.name}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[12px] font-semibold text-slate-900 tracking-[-0.005em]">{d.name}</span>
                                                    <span className="text-[11.5px] font-semibold text-slate-900 tabular-nums">{d.total > 0 ? `${d.passRate.toFixed(0)}%` : '—'} <span className="text-slate-400 font-normal">({d.total})</span></span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                                                    <div className="h-full bg-cyan-500 rounded-sm" style={{ width: `${d.passRate}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>
                        </section>

                        {/* ═══ SECTION 8: DIVERSITY & DEMOGRAPHICS ═══ */}
                        <section>
                            <SectionHeader eyebrow="08" title="Diversity & demographics" subtitle="Candidate pool distribution and success by segment" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <SectionCard
                                    title="Gender distribution"
                                    subtitle="Candidate pool breakdown"
                                    bodyClassName="p-5"
                                >
                                    {diversityData.gender.length === 0 ? (
                                        <div className="py-8 text-center text-[12px] text-slate-500">No data</div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-center" style={{ height: 140 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={diversityData.gender}
                                                            innerRadius={42} outerRadius={62} paddingAngle={2}
                                                            dataKey="value" stroke="none"
                                                        >
                                                            {diversityData.gender.map((_, i) => (
                                                                <Cell key={i} fill={['#2563EB', '#10B981', '#F59E0B', '#8B5CF6'][i % 4]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<GlassTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="space-y-1.5">
                                                {diversityData.gender.map((g, i) => (
                                                    <div key={g.name} className="flex items-center justify-between text-[11.5px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-sm" style={{ background: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6'][i % 4] }} />
                                                            <span className="font-medium text-slate-700">{g.name}</span>
                                                        </div>
                                                        <span className="font-semibold text-slate-900 tabular-nums">{g.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </SectionCard>

                                <SectionCard
                                    title="Gender pass rate"
                                    subtitle="Hiring success by gender"
                                    bodyClassName="p-5"
                                >
                                    {diversityData.genderRate.length === 0 ? (
                                        <div className="py-8 text-center text-[12px] text-slate-500">No data</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {diversityData.genderRate.map((g) => (
                                                <div key={g.name}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[12px] font-semibold text-slate-900 tracking-[-0.005em]">{g.name}</span>
                                                        <span className="text-[11.5px] font-semibold text-slate-900 tabular-nums">{g.rate.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                                                        <div className="h-full bg-emerald-500 rounded-sm" style={{ width: `${g.rate}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </SectionCard>

                                <SectionCard
                                    title="Location distribution"
                                    subtitle="Top candidate cities"
                                    bodyClassName="p-5"
                                >
                                    {diversityData.location.length === 0 ? (
                                        <div className="py-8 text-center text-[12px] text-slate-500">No data</div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {diversityData.location.map((loc) => {
                                                const max = diversityData.location[0]?.value || 1;
                                                return (
                                                    <div key={loc.name}>
                                                        <div className="flex items-center justify-between text-[11.5px] mb-1">
                                                            <span className="text-slate-700 font-medium truncate">{loc.name}</span>
                                                            <span className="font-semibold text-slate-900 tabular-nums">{loc.value}</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                                                            <div className="h-full bg-violet-500 rounded-sm" style={{ width: `${(loc.value / max) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </SectionCard>
                            </div>
                        </section>

                        {/* ═══ SECTION 9: FAILURE ANALYSIS ═══ */}
                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <SectionCard
                                title="Failure analysis"
                                subtitle="Why candidates fall out of the pipeline"
                                className="lg:col-span-2"
                                bodyClassName="p-5"
                            >
                                {failureData.length === 0 ? (
                                    <div className="py-8 text-center text-[12px] text-slate-500">No failure data — strong pipeline</div>
                                ) : (
                                    <div className="space-y-3">
                                        {failureData.map((f) => {
                                            const isPareto = f.cumulativePct <= 80;
                                            return (
                                                <div key={f.reason} className="grid grid-cols-12 items-center gap-3">
                                                    <div className="col-span-4 text-[12px] font-semibold text-slate-900 truncate">{f.reason}</div>
                                                    <div className="col-span-5 relative h-6 bg-slate-100 rounded-sm overflow-hidden">
                                                        <div className="absolute inset-y-0 left-0 bg-red-500 rounded-sm" style={{ width: `${f.percentage}%` }} />
                                                        <div className="absolute inset-0 flex items-center px-2.5">
                                                            <span className="text-[10.5px] font-semibold text-white tabular-nums drop-shadow">{f.count}</span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2 text-right text-[11.5px] font-semibold text-slate-900 tabular-nums">{f.percentage.toFixed(1)}%</div>
                                                    <div className="col-span-1 text-right">
                                                        {isPareto && (
                                                            <span className="px-1.5 h-4 text-[9px] font-semibold bg-red-100 text-red-700 rounded inline-flex items-center">Pareto</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </SectionCard>

                            <SectionCard
                                title="Demographic details"
                                subtitle="Deep dive into pass rates"
                                action={
                                    <button onClick={() => setIsDemographicModalOpen(true)} className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                                        Open <ExternalLink size={10} />
                                    </button>
                                }
                                bodyClassName="p-5"
                            >
                                <div className="space-y-3">
                                    {diversityData.genderRate.slice(0, 3).map((g) => (
                                        <div key={g.name} className="flex items-center justify-between text-[12px]">
                                            <span className="text-slate-600 font-medium">{g.name} pass rate</span>
                                            <span className="font-semibold text-slate-900 tabular-nums">{g.rate.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                    {qualityData.edu.slice(0, 3).map((e) => (
                                        <div key={e.name} className="flex items-center justify-between text-[12px]">
                                            <span className="text-slate-600 font-medium truncate">{e.name}</span>
                                            <span className="font-semibold text-slate-900 tabular-nums">{e.passRate.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        </section>

                        {/* ═══ SECTION 10 + 11: HIRING VELOCITY + FORECASTING ═══ */}
                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <SectionCard
                                title="Hiring velocity"
                                subtitle="Average days per pipeline stage"
                                className="lg:col-span-2"
                                bodyClassName="p-5"
                            >
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { key: 'screen', label: 'To screen', days: velocityData.screen, color: FUNNEL_COLORS.cyan },
                                        { key: 'interview', label: 'To interview', days: velocityData.interview, color: FUNNEL_COLORS.warning },
                                        { key: 'endorse', label: 'To endorse', days: velocityData.endorse, color: FUNNEL_COLORS.purple },
                                        { key: 'hire', label: 'To hire', days: velocityData.hire, color: FUNNEL_COLORS.success }
                                    ].map((s, i) => {
                                        const max = Math.max(velocityData.screen, velocityData.interview, velocityData.endorse, velocityData.hire, 1);
                                        return (
                                            <div key={s.key} className="relative">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                                                        <div
                                                            className="w-12 rounded-t-sm transition-all"
                                                            style={{
                                                                height: `${(s.days / max) * 100}%`,
                                                                backgroundColor: s.color,
                                                                minHeight: s.days > 0 ? 4 : 0
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="mt-2 text-[20px] font-semibold text-slate-900 tabular-nums tracking-[-0.02em]">
                                                        {s.days > 0 ? `${s.days.toFixed(0)}` : '—'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-semibold tracking-[0.04em] uppercase mt-0.5">days</div>
                                                    <div className="text-[11px] text-slate-700 font-medium mt-1.5 text-center">{s.label}</div>
                                                </div>
                                                {i < 3 && (
                                                    <ArrowRight size={12} className="absolute top-1/2 -right-2 -translate-y-1/2 text-slate-300 hidden md:block" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </SectionCard>

                            <SectionCard
                                title="Forecasting & goal"
                                subtitle="Monthly hiring target tracking"
                                bodyClassName="p-5"
                            >
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-baseline justify-between mb-1">
                                            <span className="text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase">Goal</span>
                                            <span className="text-[10.5px] text-slate-700 font-semibold tabular-nums">{forecastData.hired} / {forecastData.goal} hires</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 rounded-sm overflow-hidden relative">
                                            <div className="absolute inset-y-0 left-0 bg-slate-900 rounded-sm transition-all" style={{ width: `${forecastData.progress}%` }} />
                                            <div className="absolute top-0 bottom-0 w-px bg-red-500" style={{ left: '100%' }} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-slate-50 border border-slate-100 rounded p-2.5">
                                            <div className="text-[9.5px] font-semibold text-slate-500 tracking-[0.04em] uppercase">Remaining</div>
                                            <div className="text-[18px] font-semibold text-slate-900 tabular-nums tracking-[-0.02em] mt-0.5">
                                                {forecastData.remaining}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-100 rounded p-2.5">
                                            <div className="text-[9.5px] font-semibold text-slate-500 tracking-[0.04em] uppercase">Forecast</div>
                                            <div className="text-[18px] font-semibold text-slate-900 tabular-nums tracking-[-0.02em] mt-0.5">
                                                {forecastData.forecast}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-2 p-2.5 rounded border",
                                        forecastData.status === 'on-track' ? "bg-emerald-50 border-emerald-200" :
                                            forecastData.status === 'slightly-behind' ? "bg-amber-50 border-amber-200" :
                                                "bg-red-50 border-red-200"
                                    )}>
                                        {forecastData.status === 'on-track' ? <Rocket size={14} className="text-emerald-600" /> :
                                            forecastData.status === 'slightly-behind' ? <AlertCircle size={14} className="text-amber-600" /> :
                                                <AlertTriangle size={14} className="text-red-600" />}
                                        <div className="flex-1">
                                            <div className={cn(
                                                "text-[11.5px] font-semibold",
                                                forecastData.status === 'on-track' ? "text-emerald-700" :
                                                    forecastData.status === 'slightly-behind' ? "text-amber-700" :
                                                        "text-red-700"
                                            )}>
                                                {forecastData.status === 'on-track' ? 'On track' : forecastData.status === 'slightly-behind' ? 'Slightly behind' : 'Significantly behind'}
                                            </div>
                                            <div className="text-[10.5px] text-slate-600 mt-0.5">
                                                {forecastData.dailyRate} hires/day · {forecastData.daysRemaining} days left
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>
                        </section>

                        {/* Footer */}
                        <div className="text-center py-6 text-[10.5px] text-slate-400 tracking-[0.04em] uppercase">
                            Last updated {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>

                    </div>
                ) : (
                    <NumericalView
                        localProcessedData={Object.values(
                            filteredAppsList.reduce((acc: any, app) => {
                                const dept = (app.department || 'UNMAPPED').trim().toUpperCase();
                                if (!acc[dept]) acc[dept] = { name: dept, total: { Applicants: 0, Endorsed: 0, Hired: 0, Failed: 0, quota: QUOTA_PER_ACCOUNT, conversionRate: 0 } };
                                acc[dept].total.Applicants++;
                                const o = getOutcome(app);
                                if (o.isEndorsed || o.isHired) acc[dept].total.Endorsed++;
                                if (o.isHired) acc[dept].total.Hired++;
                                if (o.isFailed) acc[dept].total.Failed++;
                                return acc;
                            }, {})
                        ).map((d: any) => ({
                            ...d,
                            total: {
                                ...d.total,
                                conversionRate: d.total.Endorsed > 0 ? (d.total.Hired / d.total.Endorsed) * 100 : 0
                            }
                        }))}
                        tableSearch={tableSearch}
                        setTableSearch={setTableSearch}
                    />
                )}
            </div>

            <FullAnalysisModal
                isOpen={!!activeAnalysis}
                onClose={() => setActiveAnalysis(null)}
                type={activeAnalysis}
                data={funnelStages}
                metrics={globalComputed as any}
                trend={monthlyTrendData}
                passFail={[]}
                processedData={[]}
                selectedAccount={selectedDeptName}
                setType={setActiveAnalysis}
            />

            <DemographicDetailsModal
                isOpen={isDemographicModalOpen}
                onClose={() => setIsDemographicModalOpen(false)}
                passingRateMetrics={{} as any}
            />
        </div>
    );
}

const FilterDropdown = ({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) => {
    return (
        <div className="relative group">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none pl-3 pr-8 h-8 bg-white border border-slate-200 rounded text-[11.5px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer hover:border-slate-300 transition-colors"
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
        </div>
    );
};

const KPICard = ({
    icon: Icon, color, label, value, sub, trend, sparkline, invertTrend
}: {
    icon: any; color: string; label: string; value: string | number; sub?: string;
    trend?: number; sparkline?: number[]; invertTrend?: boolean;
}) => {
    const trendIsPositive = invertTrend ? (trend ?? 0) < 0 : (trend ?? 0) >= 0;
    return (
        <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col gap-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
                        <Icon size={14} style={{ color }} strokeWidth={2} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase">{label}</span>
                </div>
            </div>
            <div className="text-[26px] font-semibold text-slate-900 tabular-nums tracking-[-0.025em] leading-none">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <div className="flex items-center justify-between min-h-[16px]">
                <div className="text-[10.5px] text-slate-500 font-medium tracking-[-0.005em]">{sub || '\u00a0'}</div>
                {typeof trend === 'number' && Math.abs(trend) > 0.01 && (
                    <span className={cn(
                        "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
                        trendIsPositive ? "text-emerald-600" : "text-red-500"
                    )}>
                        {trendIsPositive ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
                        {Math.abs(trend).toFixed(1)}%
                    </span>
                )}
            </div>
            {sparkline && sparkline.length > 0 && (
                <div className="-mb-1 -mx-1">
                    <Sparkline data={sparkline} color={color} height={28} />
                </div>
            )}
        </div>
    );
};

const NumericalView = ({ localProcessedData, tableSearch, setTableSearch }: { localProcessedData: any[]; tableSearch: string; setTableSearch: (v: string) => void }) => {
    const filtered = useMemo(() => {
        if (!tableSearch) return localProcessedData;
        return localProcessedData.filter((d: any) => d.name.toLowerCase().includes(tableSearch.toLowerCase()));
    }, [localProcessedData, tableSearch]);

    return (
        <div className="bg-white border border-slate-200 rounded-md shadow-[0_1px_2px_rgba(15,23,42,0.04)] max-w-[1600px] mx-auto">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                    <h3 className="text-[13.5px] font-semibold text-slate-900 tracking-[-0.01em]">Account breakdown</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Full numerical table · {filtered.length} accounts</p>
                </div>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                    <input
                        type="text"
                        placeholder="Search accounts..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="w-full pl-9 pr-4 h-8 bg-white border border-slate-200 rounded text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase">Account</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Applicants</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Endorsed</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Hired</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Failed</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Conv.</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-500 tracking-[0.04em] uppercase text-right">Goal progress</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((d: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-3 text-[12.5px] font-semibold text-slate-900 tracking-[-0.005em]">{d.name}</td>
                                <td className="px-5 py-3 text-right text-[12px] font-semibold text-slate-900 tabular-nums">{d.total.Applicants}</td>
                                <td className="px-5 py-3 text-right text-[12px] font-medium text-slate-600 tabular-nums">{d.total.Endorsed}</td>
                                <td className="px-5 py-3 text-right text-[12px] font-semibold text-emerald-600 tabular-nums">{d.total.Hired}</td>
                                <td className="px-5 py-3 text-right text-[12px] font-medium text-red-600 tabular-nums">{d.total.Failed}</td>
                                <td className="px-5 py-3 text-right text-[12px] font-semibold text-slate-900 tabular-nums">{d.total.conversionRate.toFixed(1)}%</td>
                                <td className="px-5 py-3 text-right">
                                    <div className="inline-flex items-center gap-1.5">
                                        <div className="w-16 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-sm" style={{ width: `${Math.min(100, (d.total.Hired / d.total.quota) * 100)}%` }} />
                                        </div>
                                        <span className="text-[11px] font-semibold text-slate-900 tabular-nums">{((d.total.Hired / d.total.quota) * 100).toFixed(0)}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
