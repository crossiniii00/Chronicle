import React, { useMemo } from 'react';
import { Application } from '@/types/application';
import {
    Users, Target, Activity, Layout,
    PieChart, Briefcase, UserCheck,
    TrendingUp, Calendar, Zap, GraduationCap
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import { AccountPerformanceFunnel } from '../../reports/components/AccountPerformanceFunnel';

interface PivotAnalysisProps {
    data: Application[];
}

export function InterviewPivotAnalysis({ data }: PivotAnalysisProps) {
    const analysis = useMemo(() => {
        const stats = {
            byAccount: {} as Record<string, number>,
            byPosition: {} as Record<string, number>,
            byRecruiter: {} as Record<string, number>,
            byCategory: {
                'HIRED/PASSED': 0,
                'IN PROGRESS': 0,
                'FAILED': 0,
                'WITHDRAWN': 0,
                'OTHER': 0
            },
            byDetailedStatus: {} as Record<string, number>,
            byInitialResult: {} as Record<string, number>,
            byTypingSpeed: {} as Record<string, number>,
            byClientInterview: {} as Record<string, number>,
            byOpsValidator: {} as Record<string, number>,
            bySource: {} as Record<string, number>,
            byEducation: {} as Record<string, number>,
            conversion: {
                totalHired: 0,
                todayApplicants: 0,
                todayHires: 0
            },
            funnelData: {} as Record<string, { Applicants: number, Endorsed: number, Hired: number, Failed: number, Withdrawn: number, yieldRate: number }>
        };

        const todayStr = new Date().toISOString().split('T')[0];

        const anomalyKeywords = [
            'YES', 'ASAP', 'NO', 'WILLING', 'NEXT WEEK', 'EFFECTIVE DATE', 'TBD', '-', 'N/A',
            'NOTICE', 'WEEK', 'MONTH', 'MARCH', 'APRIL', 'IMMEDIATELY', 'ANYTIME', 'PROCESS', 'HAVE', 'WORK',
            'FLEXIBLE', 'DEPENDS', 'TEST', 'START', 'FEBRUARY', 'BILINGUAL', 'UNKNOWN'
        ];

        data.forEach(app => {
            const p = (app.pis || {}) as any;
            
            // Specialized Statuses & Breakdown (Aggressive Discovery Helper)
            const fuzzyGet = (keys: string[]) => {
                const searchKeys = keys.flatMap(k => [
                    k, k.toUpperCase(), k.toLowerCase(), 
                    k.replace(/ /g, '_').toLowerCase(), 
                    k.replace(/ /g, '_').toUpperCase(),
                    `pis_${k.toLowerCase()}`
                ]);

                for (const k of searchKeys) {
                    const val = p[k] || (app as any)[k];
                    if (val !== undefined && val !== null && val !== '' && val !== 'N/A' && val !== '-') {
                        return String(val).trim();
                    }
                }
                
                // Deep scan for keys containing specific words if still not found
                if (keys.some(k => k.toLowerCase().includes('interview'))) {
                    const allPKeys = Object.keys(p);
                    const interviewKey = allPKeys.find(k => k.toLowerCase().includes('interview') && k.toLowerCase().includes('result'));
                    if (interviewKey) {
                        const val = p[interviewKey];
                        if (val && val !== 'N/A' && val !== '-') return String(val).trim();
                    }
                }

                return null;
            };

            // 1. Normalize Account with Smart Recovery
            const recoveryMap: Record<string, string> = {
                'DD': 'DOORDASH',
                'DOORDASH': 'DOORDASH',
                'ENER': 'ENERCARE',
                'ENERCARE': 'ENERCARE',
                'EXACT': 'ABBOTT',
                'ABBOTT': 'ABBOTT',
                'OONI': 'OONI',
                'PURO': 'PUROLATOR',
                'PUROLATOR': 'PUROLATOR',
                'AUTO': 'AUTO APPROVE',
                'GRID': 'GRIDMATIC',
                'IW': 'IWIRELESS',
                'NJS': 'NJS'
            };

            const rawDept = (app.department || '').trim().toUpperCase();
            const initialAssign = String(p.initial_account_assignment || p['INITIAL ACCOUNT ASSIGNMENT'] || p['INITITAL ACCOUNT ASSIGNMENT'] || p['Account Assignment'] || '').trim().toUpperCase();
            
            let account = 'UNASSIGNED FINAL ACCOUNTS';

            // Try primary department first
            if (rawDept && !anomalyKeywords.some(word => rawDept.includes(word)) && !/^\d/.test(rawDept) && rawDept.length <= 30) {
                account = rawDept;
            } else {
                // Try recovery from notes
                for (const [code, fullName] of Object.entries(recoveryMap)) {
                    if (initialAssign.includes(code)) {
                        account = fullName;
                        break;
                    }
                }
            }

            if (account === 'ABBOTT') account = 'ABBOTT';
            if (account.includes('PUROLATOR')) account = 'PUROLATOR';
            
            stats.byAccount[account] = (stats.byAccount[account] || 0) + 1;

            // 2. Normalize Position
            const pos = (app.position_title || 'Unspecified').trim().toUpperCase().replace(/ & /g, ' AND ');
            stats.byPosition[pos] = (stats.byPosition[pos] || 0) + 1;

            // 3. Normalize Recruiter (Merge by First Name)
            const rawRecruiter = (app.assigned_recruiter_name || 'Unassigned').trim().toUpperCase();
            const recruiter = rawRecruiter.split(' ')[0]; // Group by First Name
            stats.byRecruiter[recruiter] = (stats.byRecruiter[recruiter] || 0) + 1;

            // 4. Hiring Source (Source Intelligence) - Prioritize Detailed Column
            const sourceKeys = [
                'hiring_source_detailed',
                'hiring_source',
                'Where did you hear that we are hiring', 
                'WHERE DID YOU HEAR THAT WE ARE HIRING?', 
                'Hiring Source', 
                'Source'
            ];
            const rawSource = (fuzzyGet(sourceKeys) || 'Unknown Source').trim().toUpperCase();
            // Group generic imports together
            const source = (rawSource.includes('IMPORT') || rawSource === 'N/A') ? 'IMPORT' : rawSource;
            stats.bySource[source] = (stats.bySource[source] || 0) + 1;

            // 4.5. Highest Educational Background
            const eduKeys = [
                'Highest Educational Background',
                'highest_education',
                'Educational Attainment',
                'Education',
                'education'
            ];
            const rawEducation = (fuzzyGet(eduKeys) || (app as any).highest_education || 'Unspecified').trim().toUpperCase();
            stats.byEducation[rawEducation] = (stats.byEducation[rawEducation] || 0) + 1;

            // 5. Specialized Statuses & Breakdown
            const initialRes = (fuzzyGet(['Initial Interview', 'Initial Interview Result', 'Initial Interview Results', 'initial_interview_results', 'initial_interview_result', 'II Result', 'II Results']) || 'Pending').toUpperCase();
            stats.byInitialResult[initialRes] = (stats.byInitialResult[initialRes] || 0) + 1;

            const opsValStatus = (fuzzyGet(['Ops Val Status', 'Ops Validator Status', 'ops_validator_status', 'ops_val_status', 'Ops Val']) || 'Pending').toUpperCase();
            stats.byOpsValidator[opsValStatus] = (stats.byOpsValidator[opsValStatus] || 0) + 1;

            const clientIntStatus = (fuzzyGet(['Client Interview Status', 'Client Interview Status (if applicable)', 'client_interview_status', 'client_interview_status', 'Client Interview']) || 'Pending').toUpperCase();
            stats.byClientInterview[clientIntStatus] = (stats.byClientInterview[clientIntStatus] || 0) + 1;

            // Typing Speed Ranges
            const wpmRaw = app.typing_test_wpm || fuzzyGet(['Typing Speed', 'WPM', 'Typing Speed (WPM)', 'typing_test_wpm', 'typing_speed_num', 'typing_speed']);
            const wpm = Number(wpmRaw || 0);
            let wpmRange = '0-30 WPM';
            if (wpm >= 60) wpmRange = '60+ WPM (Pro)';
            else if (wpm >= 50) wpmRange = '50-59 WPM (Expert)';
            else if (wpm >= 40) wpmRange = '40-49 WPM (Advanced)';
            else if (wpm >= 35) wpmRange = '35-39 WPM (Standard)';
            else if (wpm > 0) wpmRange = '1-34 WPM (Basic)';
            
            if (wpm > 0) {
                stats.byTypingSpeed[wpmRange] = (stats.byTypingSpeed[wpmRange] || 0) + 1;
            }

            // 6. Group Statuses & Detailed Breakdown
            const status = (app.current_status || '').toUpperCase();
            const specific = String(p.final_specific_status || p['Final Specific Status'] || p['Specific Status'] || '').trim().toUpperCase();
            
            if (specific && specific !== 'N/A') {
                stats.byDetailedStatus[specific] = (stats.byDetailedStatus[specific] || 0) + 1;
            }

            const isFailed = status.includes('FAIL') || status.includes('NOT_ELIGIBLE') || status.includes('REJECT') || specific.includes('FAILED') || specific.includes('REJECTED');

            if (status.includes('HIRE') || status.includes('PASSED') || status.includes('OFFER')) {
                stats.byCategory['HIRED/PASSED']++;
            } else if (isFailed) {
                stats.byCategory['FAILED']++;
            } else if (status.includes('WITHDRAW') || status.includes('DECLINE')) {
                stats.byCategory['WITHDRAWN']++;
            } else if (status.includes('PENDING') || status.includes('PROGRESS') || status.includes('SCHEDULE') || status.includes('PAN') || status === 'APPLIED') {
                stats.byCategory['IN PROGRESS']++;
            } else {
                stats.byCategory['OTHER']++;
            }

            // 6. Conversion Tracking - Strict Hired definition
            const isHired = status === 'HIRED' || status === 'HIRED_PROCESSED';
            const isEndorsed = isHired || ['PASSED', 'OPEN', 'FOR JOB OFFER', 'FOR PAN'].some(s => status.includes(s));
            
            if (isHired) {
                stats.conversion.totalHired++;
            }

            // Check if applied today
            if (app.applied_at?.startsWith(todayStr)) {
                stats.conversion.todayApplicants++;
            }

            // Check if hired today (either hired_at is today or it was updated to hired today)
            const wasHiredToday = app.hired_at?.startsWith(todayStr) || (isHired && app.updated_at?.startsWith(todayStr));
            if (wasHiredToday) {
                stats.conversion.todayHires++;
            }

            // 7. Funnel Data (Account-specific)
            if (!stats.funnelData[account]) {
                stats.funnelData[account] = { Applicants: 0, Endorsed: 0, Hired: 0, Failed: 0, Withdrawn: 0, yieldRate: 0 };
            }
            stats.funnelData[account].Applicants++;
            if (isEndorsed) {
                stats.funnelData[account].Endorsed++;
            }
            if (isHired) {
                stats.funnelData[account].Hired++;
            }
            if (isFailed) {
                stats.funnelData[account].Failed++;
            }
            if (status.includes('WITHDRAW') || status.includes('DECLINE')) {
                stats.funnelData[account].Withdrawn++;
            }
        });

        // Calculate Yield Rates
        Object.values(stats.funnelData).forEach(f => {
            f.yieldRate = f.Applicants > 0 ? (f.Hired / f.Applicants) * 100 : 0;
        });

        return stats;
    }, [data]);

    const MetricCard = ({ title, icon: Icon, stats, color, limit = 8 }: { title: string, icon: any, stats: Record<string, number>, color: string, limit?: number }) => {
        const items = Object.entries(stats)
            .filter(([label]) => label && label !== 'N/A' && label !== 'UNKNOWN')
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        const total = Object.values(stats).reduce((a, b) => a + b, 0);

        return (
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm flex flex-col overflow-hidden">
                <div className={cn("px-4 py-3 text-white flex items-center justify-between", color)}>
                    <div className="flex items-center gap-2">
                        <Icon size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">{title}</span>
                    </div>
                </div>
                <div className="p-4 space-y-3 flex-1">
                    {items.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-surface-400 font-bold uppercase tracking-widest">
                            No Data Available
                        </div>
                    ) : items.map(([label, count]) => {
                        const pct = ((count / total) * 100).toFixed(0);
                        return (
                            <div key={label} className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-bold text-[#323130] dark:text-slate-300 uppercase">
                                    <span className="truncate pr-4">{label.replace(/_/g, ' ')}</span>
                                    <span>{count}</span>
                                </div>
                                <div className="h-1 bg-[#f3f2f1] rounded-none overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-none transition-all duration-700", color.replace('bg-', 'bg-').split('/')[0])}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Top Row: Core Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#002060] p-6 rounded-none text-white shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Users size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <Users size={20} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Total Pipeline</span>
                    </div>
                    <div className="text-4xl font-black">{data.length}</div>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="px-2 py-0.5 bg-white/20 dark:bg-slate-900/20 rounded-none text-[8px] font-black uppercase">
                            {analysis.conversion.todayApplicants} New Today
                        </div>
                    </div>
                </div>

                {/* Overall Conversion Card */}
                <div className="bg-[#5c2d91] p-6 rounded-none text-white shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <TrendingUp size={20} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Conversion Rate</span>
                    </div>
                    <div className="text-4xl font-black">
                        {data.length > 0 ? ((analysis.conversion.totalHired / data.length) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest mt-2 opacity-60">
                        {analysis.conversion.totalHired} Total Hires
                    </div>
                </div>

                {/* Today's Conversion Card */}
                <div className="bg-[#107c10] p-6 rounded-none text-white shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Zap size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <Zap size={20} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Daily Output</span>
                    </div>
                    <div className="text-4xl font-black">{analysis.conversion.todayHires}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest mt-2 opacity-60">
                        Accepted Offers Today
                    </div>
                </div>

                <div className="bg-[#d13438] p-6 rounded-none text-white shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Activity size={80} />
                    </div>
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <Activity size={20} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Pipeline Fallout</span>
                    </div>
                    <div className="text-4xl font-black">{analysis.byCategory['FAILED']}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest mt-2 opacity-60">
                        Failed / Ineligible
                    </div>
                </div>
            </div>

            {/* Detailed Pivot Grid - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MetricCard
                    title="Account Distribution"
                    icon={Layout}
                    stats={analysis.byAccount}
                    color="bg-[#002060]"
                />
                <MetricCard
                    title="Recruiter Activity"
                    icon={Users}
                    stats={analysis.byRecruiter}
                    color="bg-[#d13438]"
                />
                <MetricCard
                    title="Position Target"
                    icon={Briefcase}
                    stats={analysis.byPosition}
                    color="bg-[#0078d4]"
                />
            </div>

            {/* Detailed Pivot Grid - Row 2 (Specialized Analysis) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Initial Interview Results"
                    icon={Activity}
                    stats={analysis.byInitialResult}
                    color="bg-[#002060]"
                />
                <MetricCard
                    title="Ops Val Status"
                    icon={Target}
                    stats={analysis.byOpsValidator}
                    color="bg-[#d13438]"
                />
                <MetricCard
                    title="Client Interview Status"
                    icon={Briefcase}
                    stats={analysis.byClientInterview}
                    color="bg-[#107c10]"
                />
                <MetricCard
                    title="Typing Speed Distribution"
                    icon={Zap}
                    stats={analysis.byTypingSpeed}
                    color="bg-[#5c2d91]"
                />
            </div>

            {/* Detailed Pivot Grid - Row 3 (Secondary Analysis) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <MetricCard
                    title="Detailed Status Analysis"
                    icon={Activity}
                    stats={analysis.byDetailedStatus}
                    color="bg-[#444444]"
                />
                <MetricCard
                    title="Educational Background"
                    icon={GraduationCap}
                    stats={analysis.byEducation}
                    color="bg-[#0078d4]"
                />
                <MetricCard
                    title="Source Intelligence"
                    icon={UserCheck}
                    stats={analysis.bySource}
                    color="bg-[#5c2d91]"
                />
            </div>


            <div className="bg-[#f3f2f1] p-4 border-l-4 border-[#002060] rounded-none">
                <p className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                    Analysis based on real-time data from the Interview Sheet. Statuses are grouped by outcome to provide a cleaner operational overview.
                </p>
            </div>
        </div>
    );
}
