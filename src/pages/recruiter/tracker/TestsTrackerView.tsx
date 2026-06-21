import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Keyboard, Search, CheckCircle, XCircle, Award, Percent, Hourglass, ArrowUpDown, BarChart3, Layers, FileText } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion } from 'framer-motion';
import { ApplicationService } from '@/services/ApplicationService';
import { apiClient } from '@/utils/apiClient';
import { socketService } from '@/services/socketService';
import type { Application } from '@/types/application';
import { useToast } from '@/components/common/useToast';

interface TypingTestSettings {
    minWpm: number;
    minAccuracy: number;
}

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function TestsTrackerView() {
    const { error: toastError } = useToast();
    const [activeMainTab, setActiveMainTab] = useState<'typing' | 'assessment'>('typing');
    const [applications, setApplications] = useState<Application[]>([]);
    
    // Typing test settings
    const [typingSettings, setTypingSettings] = useState<TypingTestSettings>({ minWpm: 40, minAccuracy: 95 });
    // Assessment settings
    const [minPassingScore, setMinPassingScore] = useState<number>(80);

    const [loading, setLoading] = useState(true);
    
    // Filters for Typing Test tab
    const [typingSearch, setTypingSearch] = useState('');
    const [typingStatusFilter, setTypingStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
    const [typingDateFilter, setTypingDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
    const [typingAccountFilter, setTypingAccountFilter] = useState<string>('ALL');
    const [typingSortField, setTypingSortField] = useState<keyof Application | 'status'>('typing_test_completed_at');
    const [typingSortDirection, setTypingSortDirection] = useState<'asc' | 'desc'>('desc');

    // Filters for Assessment Tracker tab
    const [assessmentSearch, setAssessmentSearch] = useState('');
    const [assessmentStatusFilter, setAssessmentStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
    const [assessmentTypeFilter, setAssessmentTypeFilter] = useState<'ALL' | 'NUMERIC' | 'CEFR'>('ALL');
    const [assessmentDateFilter, setAssessmentDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
    const [assessmentAccountFilter, setAssessmentAccountFilter] = useState<string>('ALL');
    const [assessmentSortField, setAssessmentSortField] = useState<keyof Application | 'status'>('updated_at');
    const [assessmentSortDirection, setAssessmentSortDirection] = useState<'asc' | 'desc'>('desc');

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [apps, settingsRes] = await Promise.all([
                ApplicationService.getAll(),
                apiClient.get('/report-configs/typing_test_settings').catch(() => ({ data: { config_data: null } }))
            ]);

            setApplications(apps);
            if (settingsRes.data && settingsRes.data.config_data) {
                setTypingSettings({
                    minWpm: settingsRes.data.config_data.minWpm ?? 40,
                    minAccuracy: settingsRes.data.config_data.minAccuracy ?? 95
                });
            }
        } catch (err) {
            console.error('Failed to load tests tracker data:', err);
            if (!silent) toastError('Error', 'Failed to retrieve candidate records.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [toastError]);

    useEffect(() => {
        loadData();

        const socket = socketService.getSocket();
        const handleUpdate = () => {
            console.log('[Socket] Applications updated, refreshing tests tracker...');
            loadData(true);
        };

        socket.on('applications:updated', handleUpdate);
        return () => {
            socket.off('applications:updated', handleUpdate);
        };
    }, [loadData]);

    // ==========================================
    // TYPING TEST DATA DERIVATIONS
    // ==========================================
    const candidatesWithTypingTest = useMemo(() => {
        return applications.filter(app => app.typing_test_wpm !== undefined && app.typing_test_wpm !== null);
    }, [applications]);

    const evaluatedTypingCandidates = useMemo(() => {
        return candidatesWithTypingTest.map(app => {
            const wpm = app.typing_test_wpm ?? 0;
            const accuracy = app.typing_test_accuracy ?? 0;
            const isPassed = wpm >= typingSettings.minWpm && accuracy >= typingSettings.minAccuracy;
            return {
                ...app,
                passed: isPassed
            };
        });
    }, [candidatesWithTypingTest, typingSettings]);

    const typingAccounts = useMemo(() => {
        const set = new Set<string>();
        evaluatedTypingCandidates.forEach(c => {
            if (c.department) set.add(c.department.trim());
        });
        return Array.from(set).sort();
    }, [evaluatedTypingCandidates]);

    const timeFilteredTypingCandidates = useMemo(() => {
        let result = evaluatedTypingCandidates;
        if (typingAccountFilter !== 'ALL') {
            result = result.filter(c => (c.department || '').trim() === typingAccountFilter);
        }
        if (typingDateFilter === 'ALL') return result;
        const now = new Date();
        return result.filter(c => {
            if (!c.typing_test_completed_at) return false;
            const date = new Date(c.typing_test_completed_at);
            if (isNaN(date.getTime())) return false;

            if (typingDateFilter === 'TODAY') {
                return date.toDateString() === now.toDateString();
            } else if (typingDateFilter === 'WEEK') {
                const startOfWeek = new Date(now);
                const day = startOfWeek.getDay() || 7;
                if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
                startOfWeek.setHours(0, 0, 0, 0);
                return date >= startOfWeek;
            } else if (typingDateFilter === 'MONTH') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [evaluatedTypingCandidates, typingDateFilter, typingAccountFilter]);

    const typingStats = useMemo(() => {
        const total = timeFilteredTypingCandidates.length;
        const passed = timeFilteredTypingCandidates.filter(c => c.passed).length;
        const failed = total - passed;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        let totalWpm = 0;
        let totalAcc = 0;
        timeFilteredTypingCandidates.forEach(c => {
            totalWpm += c.typing_test_wpm ?? 0;
            totalAcc += c.typing_test_accuracy ?? 0;
        });
        const avgWpm = total > 0 ? Math.round(totalWpm / total) : 0;
        const avgAcc = total > 0 ? Math.round(totalAcc / total) : 0;

        const ranges = { under30: 0, from30to40: 0, from40to50: 0, over50: 0 };
        timeFilteredTypingCandidates.forEach(c => {
            const w = c.typing_test_wpm ?? 0;
            if (w < 30) ranges.under30++;
            else if (w < 40) ranges.from30to40++;
            else if (w < 50) ranges.from40to50++;
            else ranges.over50++;
        });

        const accRanges = { under90: 0, from90to95: 0, from95to98: 0, over98: 0 };
        timeFilteredTypingCandidates.forEach(c => {
            const a = c.typing_test_accuracy ?? 0;
            if (a < 90) accRanges.under90++;
            else if (a < 95) accRanges.from90to95++;
            else if (a < 98) accRanges.from95to98++;
            else accRanges.over98++;
        });

        return { total, passed, failed, passRate, avgWpm, avgAcc, ranges, accRanges };
    }, [timeFilteredTypingCandidates]);

    const sortedAndFilteredTyping = useMemo(() => {
        let result = [...timeFilteredTypingCandidates];

        if (typingStatusFilter === 'PASSED') {
            result = result.filter(c => c.passed);
        } else if (typingStatusFilter === 'FAILED') {
            result = result.filter(c => !c.passed);
        }

        if (typingSearch) {
            const q = typingSearch.toLowerCase();
            result = result.filter(c =>
                c.applicant_name.toLowerCase().includes(q) ||
                c.applicant_email.toLowerCase().includes(q) ||
                (c.position_title || '').toLowerCase().includes(q) ||
                (c.department || '').toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            let valA: any;
            let valB: any;

            if (typingSortField === 'status') {
                valA = a.passed ? 1 : 0;
                valB = b.passed ? 1 : 0;
            } else {
                valA = a[typingSortField];
                valB = b[typingSortField];
            }

            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            if (typeof valA === 'string') {
                return typingSortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            } else {
                return typingSortDirection === 'asc' ? valA - valB : valB - valA;
            }
        });

        return result;
    }, [timeFilteredTypingCandidates, typingSearch, typingStatusFilter, typingSortField, typingSortDirection]);

    const handleSortTyping = (field: keyof Application | 'status') => {
        if (typingSortField === field) {
            setTypingSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setTypingSortField(field);
            setTypingSortDirection('desc');
        }
    };

    // ==========================================
    // ASSESSMENT DATA DERIVATIONS
    // ==========================================
    const candidatesWithAssessment = useMemo(() => {
        return applications.filter(app => app.assessment_score !== undefined && app.assessment_score !== null);
    }, [applications]);

    const evaluatedAssessmentCandidates = useMemo(() => {
        return candidatesWithAssessment.map(app => {
            const rawScore = app.assessment_score;
            let isCEFR = false;
            let isPassed = false;
            let scoreVal = 0;
            let cefrVal = '';

            const isCEFRString = (val: any) => {
                if (typeof val !== 'string') return false;
                const upper = val.toUpperCase().trim();
                return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(upper);
            };

            if (isCEFRString(rawScore)) {
                isCEFR = true;
                cefrVal = String(rawScore).toUpperCase().trim();
                isPassed = ['B2', 'C1', 'C2'].includes(cefrVal);
            } else {
                const parsed = parseFloat(String(rawScore));
                if (!isNaN(parsed)) {
                    scoreVal = parsed;
                    isPassed = parsed >= minPassingScore;
                } else {
                    const upper = String(rawScore).toUpperCase().trim();
                    if (upper.includes('A1') || upper.includes('A2') || upper.includes('B1') || upper.includes('B2') || upper.includes('C1') || upper.includes('C2')) {
                        isCEFR = true;
                        cefrVal = upper.match(/[ABC][12]/)?.[0] || 'B1';
                        isPassed = ['B2', 'C1', 'C2'].includes(cefrVal);
                    }
                }
            }

            return {
                ...app,
                isCEFR,
                scoreVal,
                cefrVal,
                passed: isPassed
            };
        });
    }, [candidatesWithAssessment, minPassingScore]);

    const assessmentAccounts = useMemo(() => {
        const set = new Set<string>();
        evaluatedAssessmentCandidates.forEach(c => {
            if (c.department) set.add(c.department.trim());
        });
        return Array.from(set).sort();
    }, [evaluatedAssessmentCandidates]);

    const timeFilteredAssessmentCandidates = useMemo(() => {
        let result = evaluatedAssessmentCandidates;
        if (assessmentAccountFilter !== 'ALL') {
            result = result.filter(c => (c.department || '').trim() === assessmentAccountFilter);
        }
        if (assessmentDateFilter === 'ALL') return result;
        const now = new Date();
        return result.filter(c => {
            const dateStr = c.updated_at || c.applied_at;
            if (!dateStr) return false;
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return false;

            if (assessmentDateFilter === 'TODAY') {
                return date.toDateString() === now.toDateString();
            } else if (assessmentDateFilter === 'WEEK') {
                const startOfWeek = new Date(now);
                const day = startOfWeek.getDay() || 7;
                if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
                startOfWeek.setHours(0, 0, 0, 0);
                return date >= startOfWeek;
            } else if (assessmentDateFilter === 'MONTH') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [evaluatedAssessmentCandidates, assessmentDateFilter, assessmentAccountFilter]);

    const assessmentStats = useMemo(() => {
        const total = timeFilteredAssessmentCandidates.length;
        const passed = timeFilteredAssessmentCandidates.filter(c => c.passed).length;
        const failed = total - passed;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        const numericApps = timeFilteredAssessmentCandidates.filter(c => !c.isCEFR);
        const totalNumeric = numericApps.length;
        let sumNumeric = 0;
        numericApps.forEach(c => { sumNumeric += c.scoreVal; });
        const avgNumericScore = totalNumeric > 0 ? Math.round(sumNumeric / totalNumeric) : 0;

        const scoreRanges = { under60: 0, from60to80: 0, from80to90: 0, over90: 0 };
        numericApps.forEach(c => {
            if (c.scoreVal < 60) scoreRanges.under60++;
            else if (c.scoreVal < 80) scoreRanges.from60to80++;
            else if (c.scoreVal < 90) scoreRanges.from80to90++;
            else scoreRanges.over90++;
        });

        const cefrApps = timeFilteredAssessmentCandidates.filter(c => c.isCEFR);
        const totalCEFR = cefrApps.length;
        const cefrDistribution = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
        cefrApps.forEach(c => {
            const key = c.cefrVal as keyof typeof cefrDistribution;
            if (cefrDistribution[key] !== undefined) {
                cefrDistribution[key]++;
            }
        });

        const passedNumeric = numericApps.filter(c => c.passed).length;
        const numericPassRate = totalNumeric > 0 ? Math.round((passedNumeric / totalNumeric) * 100) : 0;

        const passedCEFR = cefrApps.filter(c => c.passed).length;
        const cefrPassRate = totalCEFR > 0 ? Math.round((passedCEFR / totalCEFR) * 100) : 0;

        return {
            total,
            passed,
            failed,
            passRate,
            totalNumeric,
            avgNumericScore,
            scoreRanges,
            totalCEFR,
            cefrDistribution,
            passedNumeric,
            numericPassRate,
            passedCEFR,
            cefrPassRate
        };
    }, [timeFilteredAssessmentCandidates]);

    const sortedAndFilteredAssessment = useMemo(() => {
        let result = [...timeFilteredAssessmentCandidates];

        if (assessmentStatusFilter === 'PASSED') {
            result = result.filter(c => c.passed);
        } else if (assessmentStatusFilter === 'FAILED') {
            result = result.filter(c => !c.passed);
        }

        if (assessmentTypeFilter === 'NUMERIC') {
            result = result.filter(c => !c.isCEFR);
        } else if (assessmentTypeFilter === 'CEFR') {
            result = result.filter(c => c.isCEFR);
        }

        if (assessmentSearch) {
            const q = assessmentSearch.toLowerCase();
            result = result.filter(c =>
                c.applicant_name.toLowerCase().includes(q) ||
                c.applicant_email.toLowerCase().includes(q) ||
                (c.position_title || '').toLowerCase().includes(q) ||
                (c.department || '').toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            let valA: any;
            let valB: any;

            if (assessmentSortField === 'status') {
                valA = a.passed ? 1 : 0;
                valB = b.passed ? 1 : 0;
            } else if (assessmentSortField === 'assessment_score') {
                valA = a.isCEFR ? a.cefrVal : a.scoreVal;
                valB = b.isCEFR ? b.cefrVal : b.scoreVal;
            } else {
                valA = a[assessmentSortField];
                valB = b[assessmentSortField];
            }

            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            if (typeof valA === 'string') {
                return assessmentSortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            } else {
                return assessmentSortDirection === 'asc' ? valA - valB : valB - valA;
            }
        });

        return result;
    }, [timeFilteredAssessmentCandidates, assessmentSearch, assessmentStatusFilter, assessmentTypeFilter, assessmentSortField, assessmentSortDirection]);

    const handleSortAssessment = (field: keyof Application | 'status') => {
        if (assessmentSortField === field) {
            setAssessmentSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setAssessmentSortField(field);
            setAssessmentSortDirection('desc');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-8 h-8 border-2 border-[#04154D] border-t-transparent rounded-full animate-spin" />
                <p className="text-[12px] font-medium text-surface-400 tracking-[-0.005em]">Loading Tests Tracker...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-fade-in relative bg-surface-50/50">
            {/* Header */}
            <div className="flex flex-col border-b border-slate-200/60 shrink-0 bg-white">
                <div className="relative px-6 pt-5 pb-3 flex flex-col items-center justify-center border-b border-surface-100">
                    <div className="flex items-center gap-2.5">
                        <Layers size={17} className="text-[#605e5c] self-center" />
                        <h1
                            className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            Tests Tracker
                        </h1>
                    </div>
                    <div className="flex items-center gap-2.5 mt-3">
                        <div className="flex items-center gap-1.5 px-2.5 h-7 bg-slate-50 border border-slate-200/60 rounded-lg shadow-sm">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Tested</span>
                            <span className="text-[12px] font-extrabold text-slate-900 tabular-nums leading-none">
                                {activeMainTab === 'typing' ? typingStats.total.toLocaleString() : assessmentStats.total.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 leading-none">candidates</span>
                        </div>
                    </div>
                </div>

                {/* Main Tabs switcher */}
                <div className="flex items-center justify-center gap-9 px-6">
                    <button
                        onClick={() => setActiveMainTab('typing')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative cursor-pointer",
                            activeMainTab === 'typing' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <Keyboard size={15} className="shrink-0 transition-colors text-surface-400 group-hover:text-surface-600" />
                        <span>Typing Test Tracker</span>
                        {activeMainTab === 'typing' && (
                            <motion.span
                                layoutId="tests-tracker-tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-emerald-500"
                                transition={SPRING}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveMainTab('assessment')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative cursor-pointer",
                            activeMainTab === 'assessment' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <FileText size={15} className="shrink-0 transition-colors text-surface-400 group-hover:text-surface-600" />
                        <span>Assessment Tracker</span>
                        {activeMainTab === 'assessment' && (
                            <motion.span
                                layoutId="tests-tracker-tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-purple-500"
                                transition={SPRING}
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* Centralized Filters Toolbar */}
            <div className="flex items-center justify-center gap-4 py-3 bg-white border-b border-slate-200/60 px-6 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                {activeMainTab === 'typing' ? (
                    <>
                        {/* Date Filter */}
                        <select
                            value={typingDateFilter}
                            onChange={e => setTypingDateFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-colors cursor-pointer min-w-[130px] shadow-sm"
                        >
                            <option value="ALL">All Dates</option>
                            <option value="TODAY">Today</option>
                            <option value="WEEK">This Week</option>
                            <option value="MONTH">This Month</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={typingStatusFilter}
                            onChange={e => setTypingStatusFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-colors cursor-pointer min-w-[130px] shadow-sm"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PASSED">Passed</option>
                            <option value="FAILED">Failed</option>
                        </select>

                        {/* Account Filter */}
                        <select
                            value={typingAccountFilter}
                            onChange={e => setTypingAccountFilter(e.target.value)}
                            className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-colors cursor-pointer min-w-[160px] shadow-sm text-left"
                        >
                            <option value="ALL">All Accounts</option>
                            {typingAccounts.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </>
                ) : (
                    <>
                        {/* Date Filter */}
                        <select
                            value={assessmentDateFilter}
                            onChange={e => setAssessmentDateFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-semibold text-slate-700 outline-none focus:border-purple-500 transition-colors cursor-pointer min-w-[130px] shadow-sm"
                        >
                            <option value="ALL">All Dates</option>
                            <option value="TODAY">Today</option>
                            <option value="WEEK">This Week</option>
                            <option value="MONTH">This Month</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={assessmentStatusFilter}
                            onChange={e => setAssessmentStatusFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-semibold text-slate-700 outline-none focus:border-purple-500 transition-colors cursor-pointer min-w-[130px] shadow-sm"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PASSED">Passed</option>
                            <option value="FAILED">Failed</option>
                        </select>

                        {/* Type Filter */}
                        <select
                            value={assessmentTypeFilter}
                            onChange={e => setAssessmentTypeFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-semibold text-slate-700 outline-none focus:border-purple-500 transition-colors cursor-pointer min-w-[135px] shadow-sm"
                        >
                            <option value="ALL">All Types</option>
                            <option value="NUMERIC">Numeric Only</option>
                            <option value="CEFR">CEFR Grades</option>
                        </select>

                        {/* Account Filter */}
                        <select
                            value={assessmentAccountFilter}
                            onChange={e => setAssessmentAccountFilter(e.target.value)}
                            className="bg-white border border-slate-200 text-xs px-3 py-1.5 rounded-lg font-semibold text-slate-700 outline-none focus:border-purple-500 transition-colors cursor-pointer min-w-[160px] shadow-sm text-left"
                        >
                            <option value="ALL">All Accounts</option>
                            {assessmentAccounts.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/20">
                
                {/* ==========================================
                    TYPING TEST TRACKER TAB CONTENT
                    ========================================== */}
                {activeMainTab === 'typing' && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { title: 'Total Tested', value: typingStats.total, subtitle: 'Completed assessments', color: 'border-slate-200/60 text-slate-800 hover:shadow-[0_0_25px_rgba(100,116,139,0.12)]', icon: Keyboard, bg: 'bg-slate-50 border border-slate-200/50' },
                                { title: 'Passed', value: typingStats.passed, subtitle: `Speed ≥ ${typingSettings.minWpm} WPM`, color: 'border-emerald-200/40 text-emerald-600 bg-emerald-50/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]', icon: CheckCircle, bg: 'bg-emerald-50/50 border border-emerald-200/40' },
                                { title: 'Failed', value: typingStats.failed, subtitle: `Speed < ${typingSettings.minWpm} WPM`, color: 'border-rose-200/40 text-rose-600 bg-rose-50/40 hover:shadow-[0_0_25px_rgba(244,63,94,0.12)]', icon: XCircle, bg: 'bg-rose-50/50 border border-rose-200/40' },
                                { title: 'Pass Rate', value: `${typingStats.passRate}%`, subtitle: 'Overall average rate', color: 'border-violet-200/40 text-violet-600 bg-violet-50/40 hover:shadow-[0_0_25px_rgba(139,92,246,0.12)]', icon: Award, bg: 'bg-violet-50/50 border border-violet-200/40' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200/60 flex items-center justify-between group transition-all duration-300">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.title}</p>
                                        <h4 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2 font-sans tabular-nums">{stat.value}</h4>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{stat.subtitle}</p>
                                    </div>
                                    <div className={cn("p-2.5 rounded-xl transition-all group-hover:scale-110", stat.bg)}>
                                        <stat.icon size={18} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Distributions & settings */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Speed Distributions */}
                            <div className="bg-white border border-slate-200/60 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Speed Distribution (WPM)</h3>
                                    <span className="text-[10px] font-bold text-slate-400">Avg: {typingStats.avgWpm} WPM</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Under 30 WPM', count: typingStats.ranges.under30, color: 'bg-rose-500' },
                                        { label: '30 - 40 WPM', count: typingStats.ranges.from30to40, color: 'bg-amber-500' },
                                        { label: '40 - 50 WPM', count: typingStats.ranges.from40to50, color: 'bg-blue-500' },
                                        { label: '50+ WPM', count: typingStats.ranges.over50, color: 'bg-emerald-500' }
                                    ].map((item, idx) => {
                                        const percent = typingStats.total > 0 ? Math.round((item.count / typingStats.total) * 100) : 0;
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-[11px] font-medium text-slate-600">
                                                    <span>{item.label}</span>
                                                    <span className="tabular-nums font-bold">{item.count} ({percent}%)</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Accuracy Distributions */}
                            <div className="bg-white border border-slate-200/60 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Accuracy Distribution (%)</h3>
                                    <span className="text-[10px] font-bold text-slate-400">Avg: {typingStats.avgAcc}%</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Under 90%', count: typingStats.accRanges.under90, color: 'bg-rose-500' },
                                        { label: '90% - 95%', count: typingStats.accRanges.from90to95, color: 'bg-amber-500' },
                                        { label: '95% - 98%', count: typingStats.accRanges.from95to98, color: 'bg-blue-500' },
                                        { label: '98% - 100%', count: typingStats.accRanges.over98, color: 'bg-emerald-500' }
                                    ].map((item, idx) => {
                                        const percent = typingStats.total > 0 ? Math.round((item.count / typingStats.total) * 100) : 0;
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-[11px] font-medium text-slate-600">
                                                    <span>{item.label}</span>
                                                    <span className="tabular-nums font-bold">{item.count} ({percent}%)</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Threshold Settings Info */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
                                <div className="space-y-3 z-10">
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-800">Passing Thresholds</h3>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        Candidates must satisfy both criteria below in their typing test to pass automatically:
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 py-1">
                                        <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg flex flex-col justify-center items-center text-center">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Min Speed</span>
                                            <span className="text-2xl font-black text-sky-400 mt-0.5 tabular-nums">{typingSettings.minWpm}</span>
                                            <span className="text-[9px] text-slate-400">Words / Min</span>
                                        </div>
                                        <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg flex flex-col justify-center items-center text-center">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Min Accuracy</span>
                                            <span className="text-2xl font-black text-emerald-400 mt-0.5 tabular-nums">{typingSettings.minAccuracy}%</span>
                                            <span className="text-[9px] text-slate-400">Accuracy Rate</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* List Section */}
                        <div className="bg-white border border-slate-200/60 rounded-xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-200 bg-slate-50/30 flex items-center justify-end">
                                <div className="relative w-72">
                                    <input
                                        type="text"
                                        placeholder="Search candidates, roles, accounts..."
                                        value={typingSearch}
                                        onChange={e => setTypingSearch(e.target.value)}
                                        className="w-full bg-white border border-slate-200 pl-8 pr-4 py-1.5 rounded-lg text-xs outline-none focus:border-black transition-colors"
                                    />
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-400 font-bold border-b border-slate-200 select-none text-[9px] uppercase tracking-widest">
                                            <th onClick={() => handleSortTyping('applicant_name')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-1">Candidate <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('position_title')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-1">Position <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('department')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-1">Account / Department <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('typing_test_wpm')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Speed (WPM) <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('typing_test_accuracy')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Accuracy <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th className="px-5 py-3 text-right">Duration</th>
                                            <th onClick={() => handleSortTyping('typing_test_completed_at')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Completed Date <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('status')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center">
                                                <div className="flex items-center gap-1 justify-center">Status <ArrowUpDown size={10} /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedAndFilteredTyping.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                                    No candidate records match active filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedAndFilteredTyping.map(c => (
                                                <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-bold text-slate-800 text-[12px]">{c.applicant_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{c.applicant_email}</div>
                                                    </td>
                                                    <td className="px-5 py-3.5 font-bold text-slate-600">{c.position_title || 'N/A'}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[9px] rounded-lg">
                                                            {c.department || 'GENERAL'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-700">
                                                        {c.typing_test_wpm} <span className="text-[9px] font-bold text-slate-400">WPM</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-700">
                                                        {c.typing_test_accuracy}%
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-500">
                                                        {c.typing_test_duration_seconds ? `${c.typing_test_duration_seconds}s` : '---'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-medium text-slate-500 tabular-nums">
                                                        {c.typing_test_completed_at ? new Date(c.typing_test_completed_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: '2-digit',
                                                            year: 'numeric'
                                                        }) : '---'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.passed
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            }`}>
                                                            {c.passed ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                            {c.passed ? 'PASSED' : 'FAILED'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* ==========================================
                    ASSESSMENT TRACKER TAB CONTENT
                    ========================================== */}
                {activeMainTab === 'assessment' && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { title: 'Assessed Candidates', value: assessmentStats.total, subtitle: 'Completed test exams', color: 'border-slate-200/60 text-slate-800', icon: FileText, bg: 'bg-slate-50 border border-slate-200/50' },
                                { title: 'Pass Rate', value: `${assessmentStats.passRate}%`, subtitle: `Passing threshold: ≥${minPassingScore}%`, color: 'border-violet-200/40 text-violet-600 bg-violet-50/40', icon: Award, bg: 'bg-violet-50/50 border border-violet-200/40' },
                                { title: 'Passed', value: assessmentStats.passed, subtitle: 'Qualified candidates', color: 'border-emerald-200/40 text-emerald-600 bg-emerald-50/40', icon: CheckCircle, bg: 'bg-emerald-50/50 border border-emerald-200/40' },
                                { title: 'Failed / Pending', value: assessmentStats.failed, subtitle: 'Unqualified candidates', color: 'border-rose-200/40 text-rose-600 bg-rose-50/40', icon: XCircle, bg: 'bg-rose-50/50 border border-rose-200/40' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200/60 flex items-center justify-between group transition-all duration-300">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.title}</p>
                                        <h4 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2 font-sans tabular-nums">{stat.value}</h4>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{stat.subtitle}</p>
                                    </div>
                                    <div className={cn("p-2.5 rounded-xl transition-all group-hover:scale-110", stat.bg)}>
                                        <stat.icon size={18} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Distributions */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Numeric distribution */}
                            <div className="bg-white border border-slate-200/60 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Numeric Score Distribution</h3>
                                    <span className="text-[10px] font-bold text-slate-400">Avg: {assessmentStats.avgNumericScore}%</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Below 60%', count: assessmentStats.scoreRanges.under60, color: 'bg-rose-500' },
                                        { label: '60% - 80%', count: assessmentStats.scoreRanges.from60to80, color: 'bg-amber-500' },
                                        { label: '80% - 90%', count: assessmentStats.scoreRanges.from80to90, color: 'bg-blue-500' },
                                        { label: '90%+', count: assessmentStats.scoreRanges.over90, color: 'bg-emerald-500' }
                                    ].map((item, idx) => {
                                        const percent = assessmentStats.totalNumeric > 0 ? Math.round((item.count / assessmentStats.totalNumeric) * 100) : 0;
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-[11px] font-medium text-slate-600">
                                                    <span>{item.label}</span>
                                                    <span className="tabular-nums font-bold">{item.count} ({percent}%)</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CEFR Grade Distribution */}
                            <div className="bg-white border border-slate-200/60 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Language Proficiency (CEFR)</h3>
                                    <span className="text-[10px] font-bold text-slate-400">Total: {assessmentStats.totalCEFR}</span>
                                </div>
                                <div className="space-y-2.5">
                                    {[
                                        { label: 'C2 (Expert)', count: assessmentStats.cefrDistribution.C2, color: 'bg-emerald-600' },
                                        { label: 'C1 (Advanced)', count: assessmentStats.cefrDistribution.C1, color: 'bg-emerald-500' },
                                        { label: 'B2 (Vantage)', count: assessmentStats.cefrDistribution.B2, color: 'bg-blue-500' },
                                        { label: 'B1 (Threshold)', count: assessmentStats.cefrDistribution.B1, color: 'bg-amber-500' },
                                        { label: 'A2 (Waystage)', count: assessmentStats.cefrDistribution.A2, color: 'bg-rose-450' },
                                        { label: 'A1 (Beginner)', count: assessmentStats.cefrDistribution.A1, color: 'bg-rose-500' }
                                    ].map((item, idx) => {
                                        const percent = assessmentStats.totalCEFR > 0 ? Math.round((item.count / assessmentStats.totalCEFR) * 100) : 0;
                                        return (
                                            <div key={idx} className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                                                <span className="w-24 shrink-0 font-bold">{item.label}</span>
                                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden mx-3">
                                                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                                                </div>
                                                <span className="w-12 text-right font-black tabular-nums text-slate-500">{item.count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Assessment Performance Analysis */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
                                <div className="space-y-4 z-10">
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-800 font-sans">Performance Analysis</h3>
                                    
                                    {/* Overall Pass/Fail split bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                            <span>Overall Pass Rate</span>
                                            <span className="text-emerald-400 tabular-nums">{assessmentStats.passRate}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${assessmentStats.passRate}%` }} />
                                            <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${100 - assessmentStats.passRate}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {assessmentStats.passed} Passed</span>
                                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {assessmentStats.failed} Failed</span>
                                        </div>
                                    </div>

                                    {/* Core Performance Grid */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-slate-800/40 border border-slate-750 p-3 rounded-lg flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Numeric Exams</span>
                                            <span className="text-xl font-extrabold text-sky-400 mt-1 tabular-nums">
                                                {assessmentStats.avgNumericScore}%
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                                                Avg Score ({assessmentStats.passedNumeric}/{assessmentStats.totalNumeric} Pass)
                                            </span>
                                        </div>
                                        <div className="bg-slate-800/40 border border-slate-750 p-3 rounded-lg flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">CEFR Exams</span>
                                            <span className="text-xl font-extrabold text-purple-400 mt-1 tabular-nums">
                                                {assessmentStats.cefrPassRate}%
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                                                Pass Rate ({assessmentStats.passedCEFR}/{assessmentStats.totalCEFR} Pass)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-slate-400 leading-relaxed pt-1.5 border-t border-slate-800/50">
                                        💡 <span className="text-slate-300 font-semibold">Insights:</span> Out of <span className="text-white font-bold">{assessmentStats.total}</span> total candidates evaluated in this date range, <span className="text-sky-300 font-semibold">{assessmentStats.totalNumeric}</span> took numeric exams, while <span className="text-purple-300 font-semibold">{assessmentStats.totalCEFR}</span> took CEFR linguistic proficiency assessments.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* List Section */}
                        <div className="bg-white border border-slate-200/60 rounded-xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-200 bg-slate-50/30 flex items-center justify-end">
                                <div className="relative w-72">
                                    <input
                                        type="text"
                                        placeholder="Search candidates, roles, accounts..."
                                        value={assessmentSearch}
                                        onChange={e => setAssessmentSearch(e.target.value)}
                                        className="w-full bg-white border border-slate-200 pl-8 pr-4 py-1.5 rounded-lg text-xs outline-none focus:border-black transition-colors"
                                    />
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-400 font-bold border-b border-slate-200 select-none text-[9px] uppercase tracking-widest">
                                            <th onClick={() => handleSortAssessment('applicant_name')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-1">Candidate <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('position_title')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-1">Position <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('department')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-1">Account / Department <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('assessment_score')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Assessment Score <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('client_assessment_score')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Client Assessment <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('updated_at')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Last Updated <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('status')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-center">
                                                <div className="flex items-center gap-1 justify-center">Evaluation <ArrowUpDown size={10} /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedAndFilteredAssessment.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                                    No assessment records match active filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedAndFilteredAssessment.map(c => (
                                                <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-bold text-slate-800 text-[12px]">{c.applicant_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{c.applicant_email}</div>
                                                    </td>
                                                    <td className="px-5 py-3.5 font-bold text-slate-600">{c.position_title || 'N/A'}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[9px] rounded-lg">
                                                            {c.department || 'GENERAL'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-700">
                                                        {c.isCEFR ? (
                                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 font-bold text-[10px] border border-violet-200 rounded">
                                                                {c.cefrVal} (CEFR)
                                                            </span>
                                                        ) : (
                                                            <span>{c.scoreVal}%</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-700">
                                                        {c.client_assessment_score !== undefined && c.client_assessment_score !== null ? (
                                                            <span>{c.client_assessment_score}%</span>
                                                        ) : (
                                                            <span className="text-slate-350">---</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-medium text-slate-500 tabular-nums">
                                                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: '2-digit',
                                                            year: 'numeric'
                                                        }) : '---'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.passed
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            }`}>
                                                            {c.passed ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                            {c.passed ? 'PASSED' : 'FAILED'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
