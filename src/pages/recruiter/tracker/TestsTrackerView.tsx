import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Keyboard, Search, CheckCircle, XCircle, Award, Percent, Hourglass, ArrowUpDown, BarChart3, Layers, FileText, Calendar, ChevronDown, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { cn, toManilaDateParts, toManilaDateString } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { ApplicationService } from '@/services/ApplicationService';
import { apiClient } from '@/utils/apiClient';
import { socketService } from '@/services/socketService';
import type { Application } from '@/types/application';
import { useToast } from '@/components/common/useToast';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AdvancedDateFilter, DateFilterState } from '@/components/common/AdvancedDateFilter';
import { InitialInterviewTab } from './components/tests-tracker-tabs/InitialInterviewTab';
import { ScheduledCandidatesTab } from './components/tests-tracker-tabs/ScheduledCandidatesTab';
import { OpsValInterviewTab } from './components/tests-tracker-tabs/OpsValInterviewTab';

interface TypingTestSettings {
    minWpm: number;
    minAccuracy: number;
}

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

function getJobPosition(c: any): string {
    return (c.position_applied_for || c.job_position || c.title || c.pis?.position_applied_for || c.pis?.custom_lob || c.metadata?.job_position || 'Unassigned').trim();
}

function checkAdvancedDateMatch(dateStr: any, filter: DateFilterState): boolean {
    if (!filter || filter.type === 'ALL') return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter.type === 'TODAY') {
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        return d >= startOfToday && d < startOfTomorrow;
    }

    if (filter.type === 'WEEK') {
        const dayOfWeek = startOfToday.getDay();
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        return d >= startOfWeek && d < endOfWeek;
    }

    if (filter.type === 'MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return d >= startOfMonth && d < endOfMonth;
    }

    if (filter.type === 'CUSTOM') {
        if (filter.start && filter.end) {
            const startD = new Date(filter.start + 'T00:00:00');
            const endD = new Date(filter.end + 'T23:59:59');
            return d >= startD && d <= endD;
        }
    }

    return true;
}

interface SingleDateFilterPopoverProps {
    labelPrefix: string;
    value: DateFilterState;
    onChange: (val: DateFilterState) => void;
    width?: string;
}

function SingleDateFilterPopover({ labelPrefix, value, onChange, width = "w-[145px]" }: SingleDateFilterPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (dropdownRef.current && !dropdownRef.current.contains(target as Node)) {
                if (target.closest && target.closest('.filter-dropdown-container')) {
                    return;
                }
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getLabel = () => {
        let dateStr = 'All';
        switch (value.type) {
            case 'TODAY': dateStr = 'Today'; break;
            case 'WEEK': dateStr = 'This Week'; break;
            case 'MONTH': dateStr = 'This Month'; break;
            case 'CUSTOM': {
                if (value.start && value.end && value.start === value.end) {
                    dateStr = value.start;
                } else if (value.start && value.end) {
                    dateStr = `${value.start}...`;
                } else {
                    dateStr = 'Custom';
                }
                break;
            }
            case 'ALL': dateStr = 'All'; break;
            default: dateStr = 'All'; break;
        }
        return `${labelPrefix}: ${dateStr}`;
    };

    const isActive = value.type !== 'ALL';

    return (
        <div className={cn("relative filter-dropdown-container", width)} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none text-[12px] font-semibold text-[#323130] dark:text-slate-300 focus:outline-none hover:bg-[#f3f2f1] transition-all flex items-center justify-between gap-1 cursor-pointer min-h-[32px] shadow-none truncate",
                    isActive && "border-[#323130] text-[#323130] dark:text-slate-300 bg-[#f3f2f1] font-bold"
                )}
            >
                <div className="flex items-center gap-1.5 truncate">
                    <Calendar size={11} className={cn(isActive ? "text-[#323130] dark:text-slate-300" : "text-[#605e5c] dark:text-slate-400")} />
                    <span className="truncate">{getLabel()}</span>
                </div>
                <ChevronDown size={11} className={cn("transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-[#323130] dark:text-slate-300")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 z-[100] shadow-xl rounded-none bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 p-1">
                    <AdvancedDateFilter
                        hideTrigger={true}
                        value={value}
                        onChange={(newState) => {
                            onChange(newState);
                        }}
                        onSelectComplete={() => setIsOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}

export function TestsTrackerView() {
    const { success: toastSuccess, error: toastError } = useToast();
    const [loading, setLoading] = useState(true);
    const [minPassingScore, setMinPassingScore] = useState<number>(80);
    const [activeMainTab, setActiveMainTab] = useState<'typing' | 'assessment' | 'initial' | 'scheduled' | 'ops_val'>('typing');
    const [applications, setApplications] = useState<Application[]>([]);
    const [activeMajorTab, setActiveMajorTab] = useState<'all' | 'onsite' | 'oncall'>('all');

    const getCandidateAssessmentType = useCallback((c: Application) => {
        const score = String(c.assessment_score || '').toUpperCase().trim();
        if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(score)) {
            return 'speech_x';
        }
        if (c.pis?.personality_test || (c as any).personality_test) {
            return 'personality';
        }
        if (c.pis?.critical_thinking_score || (c as any).critical_thinking_score) {
            return 'critical_thinking';
        }
        if (['HIGH', 'MODERATE', 'LOW'].includes(score)) {
            return 'leadership';
        }
        return 'speech_x';
    }, []);

    const getCandidateAssessmentTypeLabel = useCallback((type: string) => {
        switch (type) {
            case 'speech_x': return 'Speech X (CEFR)';
            case 'leadership': return 'Leadership Assessment';
            case 'personality': return 'Personality Map';
            case 'critical_thinking': return 'Critical Thinking Assessment';
            default: return 'Speech X (CEFR)';
        }
    }, []);

    const isCandidateOnCall = useCallback((app: Application) => {
        const positionTitle = (app.position_title || '').toLowerCase();
        const interviewMode = String(app.metadata?.interview_mode || '').toLowerCase();
        const preferredSetup = String(app.pis?.preferred_setup || '').toLowerCase();
        return positionTitle.includes('[on-call]') ||
            positionTitle.includes('[on call]') ||
            interviewMode === 'on-call' ||
            interviewMode === 'online' ||
            preferredSetup === 'on-call' ||
            preferredSetup === 'online';
    }, []);

    const filteredApplications = useMemo(() => {
        if (activeMajorTab === 'all') return applications;
        return applications.filter(app => {
            const onCall = isCandidateOnCall(app);
            if (activeMajorTab === 'oncall') return onCall;
            return !onCall; // onsite
        });
    }, [applications, activeMajorTab, isCandidateOnCall]);
    
    const [typingSettings, setTypingSettings] = useState<TypingTestSettings>({ minWpm: 40, minAccuracy: 95 });

    // ==========================================
    // GLOBAL FILTERS (Apply to all tabs)
    // ==========================================
    const [globalSearch, setGlobalSearch] = useState('');
    const [globalStatusFilter, setGlobalStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
    const [globalTestTypeFilter, setGlobalTestTypeFilter] = useState<string>('ALL');
    const [globalAccountFilter, setGlobalAccountFilter] = useState<string>('ALL');
    const [globalPositionFilter, setGlobalPositionFilter] = useState<string>('ALL');
    const [globalRecruiterFilter, setGlobalRecruiterFilter] = useState<string>('ALL');

    const [globalAppliedDate, setGlobalAppliedDate] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [globalTrainingDate, setGlobalTrainingDate] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [globalInterviewDate, setGlobalInterviewDate] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });

    const [typingSortField, setTypingSortField] = useState<keyof Application | 'status'>('typing_test_completed_at');
    const [typingSortDirection, setTypingSortDirection] = useState<'asc' | 'desc'>('desc');
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
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const handleUpdate = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log('[Socket] Applications updated, refreshing tests tracker...');
                loadData(true);
            }, 1200);
        };

        socket.on('applications:updated', handleUpdate);
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            socket.off('applications:updated', handleUpdate);
        };
    }, [loadData]);

    // ==========================================
    // TYPING TEST DATA DERIVATIONS
    // ==========================================
    const candidatesWithTypingTest = useMemo(() => {
        return filteredApplications.filter(app => app.typing_test_wpm !== undefined && app.typing_test_wpm !== null);
    }, [filteredApplications]);

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

    // Derive global filter options from all applications
    const globalAccounts = useMemo(() => {
        const set = new Set<string>();
        applications.forEach(c => {
            if (c.department) set.add(c.department.trim());
        });
        return Array.from(set).sort();
    }, [applications]);
    const [allRecruiters, setAllRecruiters] = useState<string[]>([]);
    useEffect(() => {
        import('./utils/tableHelpers').then(() => {});
        import('./components/tableUtils').then(mod => {
            mod.loadRecruiterOptions().then(recs => {
                if (recs && recs.length > 0) setAllRecruiters(recs);
            });
        });
    }, []);

    const globalRecruiters = useMemo(() => {
        const set = new Set<string>(allRecruiters);
        applications.forEach(c => {
            const name = (c.assigned_recruiter_name || c.interviewer_name || (c as any).metadata?.assigned_recruiter_name || '').trim();
            if (name) set.add(name);
        });
        return Array.from(set).sort();
    }, [applications, allRecruiters]);

    const globalPositions = useMemo(() => {
        const set = new Set<string>();
        applications.forEach(c => {
            if (globalAccountFilter === 'ALL' || (c.department || '').trim() === globalAccountFilter) {
                const pos = getJobPosition(c);
                if (pos && pos !== 'Unassigned') set.add(pos);
            }
        });
        return Array.from(set).sort();
    }, [applications, globalAccountFilter]);

    // Apply Global Filters to the root array so ALL tabs inherit them
    const globallyFilteredApplications = useMemo(() => {
        let result = filteredApplications;
        
        if (globalAccountFilter !== 'ALL') {
            result = result.filter(c => (c.department || '').trim() === globalAccountFilter);
        }
        if (globalPositionFilter !== 'ALL') {
            result = result.filter(c => getJobPosition(c) === globalPositionFilter);
        }
        if (globalRecruiterFilter !== 'ALL') {
            result = result.filter(c => {
                const rec = (c.assigned_recruiter_name || c.interviewer_name || (c as any).metadata?.assigned_recruiter_name || 'Unassigned').trim();
                return rec === globalRecruiterFilter;
            });
        }
        if (globalTestTypeFilter !== 'ALL') {
            result = result.filter(c => getCandidateAssessmentType(c) === globalTestTypeFilter);
        }
        
        result = result.filter(c => checkAdvancedDateMatch(c.applied_at || c.created_at, globalAppliedDate));
        result = result.filter(c => checkAdvancedDateMatch(c.master_training_start_date || (c as any).pis?.master_training_start_date || (c as any).pis?.training_start_date || c.hired_at, globalTrainingDate));
        result = result.filter(c => checkAdvancedDateMatch(c.updated_at || c.typing_test_completed_at || (c as any).pis?.interview_completed_at || c.applied_at, globalInterviewDate));
        
        return result;
    }, [filteredApplications, globalAccountFilter, globalPositionFilter, globalRecruiterFilter, globalTestTypeFilter, globalAppliedDate, globalTrainingDate, globalInterviewDate, getCandidateAssessmentType]);

    const timeFilteredTypingCandidates = useMemo(() => {
        // Since globallyFilteredApplications already applies dates/account/position/recruiter/test_type,
        // we just need to intersect it with evaluatedTypingCandidates.
        const globalIds = new Set(globallyFilteredApplications.map(app => app.id));
        return evaluatedTypingCandidates.filter(app => globalIds.has(app.id));
    }, [evaluatedTypingCandidates, globallyFilteredApplications]);

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

        if (globalStatusFilter === 'PASSED') {
            result = result.filter(c => c.passed);
        } else if (globalStatusFilter === 'FAILED') {
            result = result.filter(c => !c.passed);
        }

        if (globalSearch) {
            const q = globalSearch.toLowerCase();
            result = result.filter(c =>
                c.applicant_name.toLowerCase().includes(q) ||
                c.applicant_email.toLowerCase().includes(q) ||
                (c.position_title || '').toLowerCase().includes(q) ||
                (c.department || '').toLowerCase().includes(q) ||
                (c.assigned_recruiter_name || c.interviewer_name || '').toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            let valA: any;
            let valB: any;

            if (typingSortField === 'status') {
                valA = a.passed ? 1 : 0;
                valB = b.passed ? 1 : 0;
            } else if (typingSortField === 'assigned_recruiter_name') {
                valA = a.assigned_recruiter_name || a.interviewer_name || '';
                valB = b.assigned_recruiter_name || b.interviewer_name || '';
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
    }, [timeFilteredTypingCandidates, globalSearch, globalStatusFilter, typingSortField, typingSortDirection]);

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
        return filteredApplications.filter(app => app.assessment_score !== undefined && app.assessment_score !== null && String(app.assessment_score).trim() !== '');
    }, [filteredApplications]);

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
                    isPassed = upper === 'PASS' || upper === 'PASSED';
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

    const timeFilteredAssessmentCandidates = useMemo(() => {
        const globalIds = new Set(globallyFilteredApplications.map(app => app.id));
        return evaluatedAssessmentCandidates.filter(app => globalIds.has(app.id));
    }, [evaluatedAssessmentCandidates, globallyFilteredApplications]);

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

        if (globalStatusFilter === 'PASSED') {
            result = result.filter(c => c.passed);
        } else if (globalStatusFilter === 'FAILED') {
            result = result.filter(c => !c.passed);
        }
        
        if (globalSearch) {
            const q = globalSearch.toLowerCase();
            result = result.filter(c =>
                c.applicant_name.toLowerCase().includes(q) ||
                c.applicant_email.toLowerCase().includes(q) ||
                (c.position_title || '').toLowerCase().includes(q) ||
                (c.department || '').toLowerCase().includes(q) ||
                (c.assigned_recruiter_name || c.interviewer_name || '').toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            let valA: any;
            let valB: any;

            if (assessmentSortField === 'status') {
                valA = a.passed ? 1 : 0;
                valB = b.passed ? 1 : 0;
            } else if (assessmentSortField === 'assigned_recruiter_name') {
                valA = a.assigned_recruiter_name || a.interviewer_name || '';
                valB = b.assigned_recruiter_name || b.interviewer_name || '';
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
    }, [timeFilteredAssessmentCandidates, globalSearch, globalStatusFilter, assessmentSortField, assessmentSortDirection]);

    const handleSortAssessment = (field: keyof Application | 'status') => {
        if (assessmentSortField === field) {
            setAssessmentSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setAssessmentSortField(field);
            setAssessmentSortDirection('desc');
        }
    };

    if (loading) {
        return <LoadingScreen message="LOADING TESTS TRACKER..." />;
    }

    return (
        <div className="flex flex-col h-full animate-fade-in relative bg-surface-50/50">
            {/* Header */}
            <div className="flex flex-col shrink-0 bg-white dark:bg-slate-900">
                <div className="relative px-6 pt-5 pb-4 flex flex-col items-center justify-center bg-[#faf9f8]">
                    <div className="flex items-center gap-2">
                        <Layers size={20} className="text-[#323130] dark:text-slate-300 self-center" />
                        <h1 className="text-[28px] leading-none text-[#323130] dark:text-slate-300 font-semibold tracking-tight">
                            Tests Tracker
                        </h1>
                    </div>
                    {/* Major Tabs Switcher */}
                    <div className="inline-flex p-0.5 bg-[#edebe9] dark:bg-slate-800 mt-4 border border-[#e1dfdd] rounded-none shadow-sm">
                        <button
                            type="button"
                            onClick={() => setActiveMajorTab('all')}
                            className={cn(
                                "px-5 py-1.5 text-[12px] font-semibold transition-none uppercase tracking-wide cursor-pointer rounded-none",
                                activeMajorTab === 'all'
                                    ? "bg-white dark:bg-slate-900 text-[#323130] dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#edebe9] dark:border-slate-800"
                                    : "text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300 hover:bg-[#e1dfdd] border border-transparent"
                            )}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMajorTab('onsite')}
                            className={cn(
                                "px-5 py-1.5 text-[12px] font-semibold transition-none uppercase tracking-wide cursor-pointer rounded-none",
                                activeMajorTab === 'onsite'
                                    ? "bg-white dark:bg-slate-900 text-[#323130] dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#edebe9] dark:border-slate-800"
                                    : "text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300 hover:bg-[#e1dfdd] border border-transparent"
                            )}
                        >
                            On-Site
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMajorTab('oncall')}
                            className={cn(
                                "px-5 py-1.5 text-[12px] font-semibold transition-none uppercase tracking-wide cursor-pointer rounded-none",
                                activeMajorTab === 'oncall'
                                    ? "bg-white dark:bg-slate-900 text-[#323130] dark:text-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#edebe9] dark:border-slate-800"
                                    : "text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300 hover:bg-[#e1dfdd] border border-transparent"
                            )}
                        >
                            On-Call / Online
                        </button>
                    </div>
                    <div className="flex items-center gap-2.5 mt-3">
                        <div className="flex items-center gap-2 px-3 h-8 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 shadow-sm rounded-none">
                            <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-widest">Total Tested</span>
                            <span className="text-[14px] font-bold text-[#0078d4] tabular-nums leading-none">
                                {activeMainTab === 'typing' ? typingStats.total.toLocaleString() : assessmentStats.total.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 leading-none uppercase">Candidates</span>
                        </div>
                    </div>
                </div>

                {/* Main Tabs switcher */}
                <div className="flex items-center justify-center gap-4 px-6 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8]">
                    <button
                        onClick={() => setActiveMainTab('typing')}
                        className={cn(
                            "group flex items-center gap-2 px-4 py-3 text-[14px] font-semibold transition-none whitespace-nowrap relative cursor-pointer rounded-none border-b-[3px]",
                            activeMainTab === 'typing' ? "text-[#0078d4] border-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 border-transparent hover:text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1]"
                        )}
                    >
                        <Keyboard size={16} className={cn("shrink-0", activeMainTab === 'typing' ? "text-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 group-hover:text-[#323130] dark:text-slate-300")} />
                        <span>Typing Test Tracker</span>
                    </button>
                    
                    <button
                        onClick={() => setActiveMainTab('assessment')}
                        className={cn(
                            "group flex items-center gap-2 px-4 py-3 text-[14px] font-semibold transition-none whitespace-nowrap relative cursor-pointer rounded-none border-b-[3px]",
                            activeMainTab === 'assessment' ? "text-[#0078d4] border-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 border-transparent hover:text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1]"
                        )}
                    >
                        <FileText size={16} className={cn("shrink-0", activeMainTab === 'assessment' ? "text-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 group-hover:text-[#323130] dark:text-slate-300")} />
                        <span>Assessment Tracker</span>
                    </button>

                    <button
                        onClick={() => setActiveMainTab('initial')}
                        className={cn(
                            "group flex items-center gap-2 px-4 py-3 text-[14px] font-semibold transition-none whitespace-nowrap relative cursor-pointer rounded-none border-b-[3px]",
                            activeMainTab === 'initial' ? "text-[#0078d4] border-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 border-transparent hover:text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1]"
                        )}
                    >
                        <Search size={16} className={cn("shrink-0", activeMainTab === 'initial' ? "text-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 group-hover:text-[#323130] dark:text-slate-300")} />
                        <span>Initial Interview</span>
                    </button>

                    <button
                        onClick={() => setActiveMainTab('scheduled')}
                        className={cn(
                            "group flex items-center gap-2 px-4 py-3 text-[14px] font-semibold transition-none whitespace-nowrap relative cursor-pointer rounded-none border-b-[3px]",
                            activeMainTab === 'scheduled' ? "text-[#0078d4] border-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 border-transparent hover:text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1]"
                        )}
                    >
                        <Calendar size={16} className={cn("shrink-0", activeMainTab === 'scheduled' ? "text-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 group-hover:text-[#323130] dark:text-slate-300")} />
                        <span>Scheduled Candidates</span>
                    </button>

                    <button
                        onClick={() => setActiveMainTab('ops_val')}
                        className={cn(
                            "group flex items-center gap-2 px-4 py-3 text-[14px] font-semibold transition-none whitespace-nowrap relative cursor-pointer rounded-none border-b-[3px]",
                            activeMainTab === 'ops_val' ? "text-[#0078d4] border-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 border-transparent hover:text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1]"
                        )}
                    >
                        <Layers size={16} className={cn("shrink-0", activeMainTab === 'ops_val' ? "text-[#0078d4]" : "text-[#605e5c] dark:text-slate-400 group-hover:text-[#323130] dark:text-slate-300")} />
                        <span>Ops Val Interview</span>
                    </button>
                </div>
            </div>

            {/* Centralized Filters Toolbar */}
            <div className="flex items-center justify-center gap-2.5 py-3 bg-white dark:bg-slate-900 border-b border-[#edebe9] dark:border-slate-800 px-6 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex-wrap">
                {/* 3 Date Filters */}
                <SingleDateFilterPopover
                    labelPrefix="Applied Date"
                    value={globalAppliedDate}
                    onChange={setGlobalAppliedDate}
                />
                <SingleDateFilterPopover
                    labelPrefix="Training Start"
                    value={globalTrainingDate}
                    onChange={setGlobalTrainingDate}
                />
                <SingleDateFilterPopover
                    labelPrefix="Interview Date"
                    value={globalInterviewDate}
                    onChange={setGlobalInterviewDate}
                />

                {/* Status Filter */}
                <select
                    value={globalStatusFilter}
                    onChange={e => setGlobalStatusFilter(e.target.value as any)}
                    className="bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 text-[12px] px-2.5 py-1.5 rounded-none font-semibold text-[#323130] dark:text-slate-300 outline-none focus:border-[#0078d4] transition-colors cursor-pointer w-[120px] shadow-none shrink-0"
                >
                    <option value="ALL">All Status</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                </select>

                {/* Assessment Type Filter */}
                <select
                    value={globalTestTypeFilter}
                    onChange={e => setGlobalTestTypeFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 text-[12px] px-2.5 py-1.5 rounded-none font-semibold text-[#323130] dark:text-slate-300 outline-none focus:border-[#0078d4] transition-colors cursor-pointer w-[170px] shadow-none shrink-0 truncate"
                >
                    <option value="ALL">All Assessment Types</option>
                    <option value="speech_x">Speech X (CEFR)</option>
                    <option value="leadership">Leadership Assessment</option>
                    <option value="personality">Personality Map</option>
                    <option value="critical_thinking">Critical Thinking Assessment</option>
                </select>

                {/* Account Filter */}
                <select
                    value={globalAccountFilter}
                    onChange={e => {
                        setGlobalAccountFilter(e.target.value);
                        setGlobalPositionFilter('ALL');
                    }}
                    className="bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 text-[12px] px-2.5 py-1.5 rounded-none font-semibold text-[#323130] dark:text-slate-300 outline-none focus:border-[#0078d4] transition-colors cursor-pointer w-[135px] shadow-none text-left truncate shrink-0"
                >
                    <option value="ALL">All Accounts</option>
                    {globalAccounts.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>

                {/* Job Position Filter */}
                <select
                    value={globalPositionFilter}
                    onChange={e => setGlobalPositionFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 text-[12px] px-2.5 py-1.5 rounded-none font-semibold text-[#323130] dark:text-slate-300 outline-none focus:border-[#0078d4] transition-colors cursor-pointer w-[145px] shadow-none text-left truncate shrink-0"
                >
                    <option value="ALL">All Job Positions</option>
                    {globalPositions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                    ))}
                </select>

                {/* Recruiter Filter */}
                <select
                    value={globalRecruiterFilter}
                    onChange={e => setGlobalRecruiterFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 text-[12px] px-2.5 py-1.5 rounded-none font-semibold text-[#323130] dark:text-slate-300 outline-none focus:border-[#0078d4] transition-colors cursor-pointer w-[140px] shadow-none text-left truncate shrink-0"
                >
                    <option value="ALL">All Recruiters</option>
                    {globalRecruiters.map(rec => (
                        <option key={rec} value={rec}>{rec}</option>
                    ))}
                </select>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50 dark:bg-slate-800/20">
                
                {/* ==========================================
                    TYPING TEST TRACKER TAB CONTENT
                    ========================================== */}
                {activeMainTab === 'typing' && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { title: 'Total Tested', value: typingStats.total, subtitle: 'Completed assessments', color: 'border-slate-200 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 hover:shadow-[0_0_25px_rgba(100,116,139,0.12)]', icon: Keyboard, bg: 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/50' },
                                { title: 'Passed', value: typingStats.passed, subtitle: `Speed ≥ ${typingSettings.minWpm} WPM`, color: 'border-emerald-200/40 text-emerald-600 bg-emerald-50/40 hover:shadow-[0_0_25px_rgba(10,185,129,0.12)]', icon: CheckCircle, bg: 'bg-emerald-50/50 border border-emerald-200/40' },
                                { title: 'Failed', value: typingStats.failed, subtitle: `Speed < ${typingSettings.minWpm} WPM`, color: 'border-rose-200/40 text-rose-600 bg-rose-50/40 hover:shadow-[0_0_25px_rgba(244,63,94,0.12)]', icon: XCircle, bg: 'bg-rose-50/50 border border-rose-200/40' },
                                { title: 'Pass Rate', value: `${typingStats.passRate}%`, subtitle: 'Overall average rate', color: 'border-violet-200/40 text-violet-600 bg-violet-50/40 hover:shadow-[0_0_25px_rgba(139,92,246,0.12)]', icon: Award, bg: 'bg-violet-50/50 border border-violet-200/40' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800/60 flex items-center justify-between group transition-all duration-300">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
                                        <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2 font-sans tabular-nums">{stat.value}</h4>
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
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                                    <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Speed Distribution (WPM)</h3>
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
                                                <div className="w-full bg-slate-100 dark:bg-slate-800/50 h-2 rounded-full overflow-hidden">
                                                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Accuracy Distributions */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                                    <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Accuracy Distribution (%)</h3>
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
                                                <div className="w-full bg-slate-100 dark:bg-slate-800/50 h-2 rounded-full overflow-hidden">
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
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Passing Thresholds</h3>
                                        <Link
                                            to="/recruiter/settings/typing-test"
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors border border-slate-700/60"
                                        >
                                            <Settings size={12} className="text-slate-400" />
                                            Settings
                                        </Link>
                                    </div>
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
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-end">
                                <div className="relative w-72 shrink-0">
                                    <input
                                        type="text"
                                        placeholder="Search candidates, roles, accounts..."
                                        value={globalSearch}
                                        onChange={e => setGlobalSearch(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 pl-8 pr-4 py-1.5 rounded-none text-[13px] outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-colors"
                                    />
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605e5c] dark:text-slate-400" />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none text-[9px] uppercase tracking-widest">
                                            <th className="px-5 py-3 w-12 text-center">#</th>
                                            <th onClick={() => handleSortTyping('applicant_name')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-1">Candidate <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('position_title')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-1">Position <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('department')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-1">Account / Department <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('assigned_recruiter_name')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-1">Assigned Recruiter <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('typing_test_wpm')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Speed (WPM) <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('typing_test_accuracy')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Accuracy <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th className="px-5 py-3 text-right">Duration</th>
                                            <th onClick={() => handleSortTyping('typing_test_completed_at')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Completed Date <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortTyping('status')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors text-center">
                                                <div className="flex items-center gap-1 justify-center">Status <ArrowUpDown size={10} /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedAndFilteredTyping.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                                    No candidate records match active filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedAndFilteredTyping.map((c, index) => (
                                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/40 transition-colors">
                                                    <td className="px-5 py-3.5 text-center font-semibold text-slate-400 text-[10px]">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-[12px]">{c.applicant_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{c.applicant_email}</div>
                                                    </td>
                                                    <td className="px-5 py-3.5 font-bold text-slate-600">{c.position_title || 'N/A'}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 font-bold uppercase tracking-wider text-[9px] rounded-lg">
                                                            {c.department || 'GENERAL'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px] block">
                                                            {c.assigned_recruiter_name || c.interviewer_name || c.metadata?.assigned_recruiter_name || 'Unassigned'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-700 dark:text-slate-300">
                                                        {c.typing_test_wpm} <span className="text-[9px] font-bold text-slate-400">WPM</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-700 dark:text-slate-300">
                                                        {c.typing_test_accuracy}%
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                                                        {c.typing_test_duration_seconds ? `${c.typing_test_duration_seconds}s` : '---'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                                                        {c.typing_test_completed_at ? new Date(c.typing_test_completed_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: '2-digit',
                                                            year: 'numeric',
                                                            timeZone: 'Asia/Manila'
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
                                { title: 'Assessed Candidates', value: assessmentStats.total, subtitle: 'Completed test exams', color: 'border-slate-200 dark:border-slate-800/60 text-slate-800 dark:text-slate-200', icon: FileText, bg: 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/50' },
                                { title: 'Pass Rate', value: `${assessmentStats.passRate}%`, subtitle: `Passing threshold: ≥${minPassingScore}%`, color: 'border-violet-200/40 text-violet-600 bg-violet-50/40', icon: Award, bg: 'bg-violet-50/50 border border-violet-200/40' },
                                { title: 'Passed', value: assessmentStats.passed, subtitle: 'Qualified candidates', color: 'border-emerald-200/40 text-emerald-600 bg-emerald-50/40', icon: CheckCircle, bg: 'bg-emerald-50/50 border border-emerald-200/40' },
                                { title: 'Failed / Pending', value: assessmentStats.failed, subtitle: 'Unqualified candidates', color: 'border-rose-200/40 text-rose-600 bg-rose-50/40', icon: XCircle, bg: 'bg-rose-50/50 border border-rose-200/40' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800/60 flex items-center justify-between group transition-all duration-300">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
                                        <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2 font-sans tabular-nums">{stat.value}</h4>
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
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                                    <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Numeric Score Distribution</h3>
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
                                                <div className="w-full bg-slate-100 dark:bg-slate-800/50 h-2 rounded-full overflow-hidden">
                                                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CEFR Grade Distribution */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                                    <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Language Proficiency (CEFR)</h3>
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
                                            <div key={idx} className="flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                                <span className="w-24 shrink-0 font-bold">{item.label}</span>
                                                <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 h-1.5 rounded-full overflow-hidden mx-3">
                                                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                                                </div>
                                                <span className="w-12 text-right font-black tabular-nums text-slate-500 dark:text-slate-400">{item.count}</span>
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
                                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
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
                                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">
                                                Avg Score ({assessmentStats.passedNumeric}/{assessmentStats.totalNumeric} Pass)
                                            </span>
                                        </div>
                                        <div className="bg-slate-800/40 border border-slate-750 p-3 rounded-lg flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">CEFR Exams</span>
                                            <span className="text-xl font-extrabold text-purple-400 mt-1 tabular-nums">
                                                {assessmentStats.cefrPassRate}%
                                            </span>
                                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">
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
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-end">
                                <div className="relative w-72 shrink-0">
                                    <input
                                        type="text"
                                        placeholder="Search candidates, roles, accounts..."
                                        value={globalSearch}
                                        onChange={e => setGlobalSearch(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 pl-8 pr-4 py-1.5 rounded-none text-[13px] outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-colors"
                                    />
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605e5c] dark:text-slate-400" />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none text-[9px] uppercase tracking-widest">
                                            <th className="px-5 py-3 w-12 text-center">#</th>
                                            <th onClick={() => handleSortAssessment('applicant_name')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-1">Candidate <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('position_title')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-1">Position <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('department')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-1">Account / Department <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('assigned_recruiter_name')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-1">Assigned Recruiter <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th className="px-5 py-3 select-none">
                                                <div className="flex items-center gap-1">Test Type</div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('assessment_score')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Assessment Score <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('client_assessment_score')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Client Assessment <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('updated_at')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors text-right">
                                                <div className="flex items-center gap-1 justify-end">Last Updated <ArrowUpDown size={10} /></div>
                                            </th>
                                            <th onClick={() => handleSortAssessment('status')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/50 transition-colors text-center">
                                                <div className="flex items-center gap-1 justify-center">Evaluation <ArrowUpDown size={10} /></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedAndFilteredAssessment.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                                    No assessment records match active filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedAndFilteredAssessment.map((c, index) => (
                                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/40 transition-colors">
                                                    <td className="px-5 py-3.5 text-center font-semibold text-slate-400 text-[10px]">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-[12px]">{c.applicant_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{c.applicant_email}</div>
                                                    </td>
                                                    <td className="px-5 py-3.5 font-bold text-slate-600">{c.position_title || 'N/A'}</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 font-bold uppercase tracking-wider text-[9px] rounded-lg">
                                                            {c.department || 'GENERAL'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px] block">
                                                            {c.assigned_recruiter_name || c.interviewer_name || c.metadata?.assigned_recruiter_name || 'Unassigned'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                                            (() => {
                                                                const type = getCandidateAssessmentType(c);
                                                                if (type === 'speech_x') return 'bg-purple-50 text-purple-700 border-purple-200';
                                                                if (type === 'leadership') return 'bg-amber-50 text-amber-700 border-amber-200';
                                                                if (type === 'personality') return 'bg-emerald-50 text-emerald-750 border-emerald-200';
                                                                return 'bg-blue-50 text-blue-700 border-blue-200';
                                                            })()
                                                        }`}>
                                                            {getCandidateAssessmentTypeLabel(getCandidateAssessmentType(c))}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-700 dark:text-slate-300">
                                                        {c.isCEFR ? (
                                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 font-bold text-[10px] border border-violet-200 rounded">
                                                                {c.cefrVal} (CEFR)
                                                            </span>
                                                        ) : (
                                                            <span>{c.scoreVal}%</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-slate-700 dark:text-slate-300">
                                                        {c.client_assessment_score !== undefined && c.client_assessment_score !== null ? (
                                                            <span>{c.client_assessment_score}%</span>
                                                        ) : (
                                                            <span className="text-slate-350">---</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                                                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: '2-digit',
                                                            year: 'numeric',
                                                            timeZone: 'Asia/Manila'
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

                {activeMainTab === 'initial' && <InitialInterviewTab applications={globallyFilteredApplications} statusFilter={globalStatusFilter} />}
                {activeMainTab === 'scheduled' && <ScheduledCandidatesTab applications={globallyFilteredApplications} />}
                {activeMainTab === 'ops_val' && <OpsValInterviewTab applications={globallyFilteredApplications} statusFilter={globalStatusFilter} />}
            </div>
        </div>
    );
}
