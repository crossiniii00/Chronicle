import { useState, useMemo } from 'react';
import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import { type SHFilters } from '../constants';
import { useAuthStore } from '@/store/authStore';
import { loadReroutedAccounts } from '@/pages/admin/hooks/useAccountTypeSettings';
import { MONTHS } from '../masterlist/constants';
import { DateFilterState } from '@/components/common/AdvancedDateFilter';

interface FiltersProps {
    applications: Application[];
    questions: InterviewQuestion[];
    allDepartments: any[];
    localChanges?: Record<string, Record<string, any>>;
}

export function useInterviewFilters({ applications, questions, allDepartments, localChanges }: FiltersProps) {
    const { user, isAccountFilterEnabled } = useAuthStore();
    const isRecruiterS = user?.role === 'recruiter_s';
    const [search, setSearch] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('Sheet');
    const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
    const [shFilters, setShFilters] = useState<SHFilters>({
        position: [],
        initial: [],
        second: [],
        final: []
    });

    const [dateRange, setDateRange] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [dateAddedFilter, setDateAddedFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [interviewConcludedFilter, setInterviewConcludedFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [selectedStatus, setSelectedStatus] = useState<string[]>(['ALL']);
    const [selectedEducation, setSelectedEducation] = useState<string[]>(['ALL']);
    const [selectedGender, setSelectedGender] = useState<string[]>(['ALL']);
    const [selectedInitialAccountFilter, setSelectedInitialAccountFilter] = useState<string>('ALL');
    const [selectedOverallStatusFilter, setSelectedOverallStatusFilter] = useState<string>('ALL');
    const [selectedFinalAccountFilter, setSelectedFinalAccountFilter] = useState<string>('ALL');
    const [selectedHireType, setSelectedHireType] = useState<string>('ALL');
    const [activePassedMonth, setActivePassedMonth] = useState<string>('ALL');
    const [selectedYear, setSelectedYear] = useState<string>('ALL');
    const [isExclusiveMode, setIsExclusiveMode] = useState(false);
    const [isOfficialEndorsement, setIsOfficialEndorsement] = useState(false);

    const availablePassedMonths = useMemo(() => {
        return ['December', 'November', 'October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January'];
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        applications.forEach(a => {
            const dateStr = a.applied_at;
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    years.add(String(d.getFullYear()));
                }
            }
        });
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [applications]);

    const initialAccountOptions = useMemo(() => {
        const set = new Set<string>();
        applications.forEach(a => {
            const v = (a.pis?.initial_account_assignment || (a as any).initial_account_assignment || a.department)?.toString().trim();
            if (v) {
                v.split(/[,|]/).forEach((part: string) => {
                    const cleanPart = part.trim().toUpperCase();
                    if (cleanPart) set.add(cleanPart);
                });
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [applications]);

    const finalAccountOptions = useMemo(() => {
        const set = new Set<string>();
        applications.forEach(a => {
            const v = (a.pis?.final_account || (a as any).final_account)?.toString().trim();
            if (v) {
                v.split(/[,|]/).forEach((part: string) => {
                    const cleanPart = part.trim().toUpperCase();
                    if (cleanPart) set.add(cleanPart);
                });
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [applications]);

    const educationOptions = useMemo(() => {
        const set = new Set<string>();
        applications.forEach(a => {
            const v = (a.pis?.highest_education || (a as any).highest_education)?.toString().trim();
            if (v) set.add(v);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [applications]);

    const genderOptions = useMemo(() => {
        const set = new Set<string>();
        applications.forEach(a => {
            const v = (a.pis?.sex || (a as any).sex)?.toString().trim();
            if (v) set.add(v);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [applications]);

    const activeQuestions = useMemo(() => {
        const typePriority: Record<string, number> = {
            'initial': 1,
            'technical': 2,
            'behavioral': 3,
            'final': 4
        };

        return questions
            .filter(q => q.is_active)
            .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0));
    }, [questions]);

    const filteredList = useMemo(() => {
        const list = applications.filter(a => {
            if (a.metadata?.deleted_from_sheet) return false;
            const isHiddenRecord = a.is_hidden === true || (a.is_hidden as any) === 1 || String(a.is_hidden).toLowerCase() === 'true' || String(a.is_hidden) === '1';
            if (isExclusiveMode && !isHiddenRecord) return false;
            if (!isExclusiveMode && isHiddenRecord) return false;

            const hasPendingChanges = localChanges && localChanges[a.id] && Object.keys(localChanges[a.id]).length > 0;
            if (hasPendingChanges) {
                return true;
            }

            const col = a.master_column || 'SHEET';
            const status = (a.current_status || 'PENDING').toUpperCase();
            const p = (a.pis || a.metadata || {}) as any;
            const specificStatus = String(p.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase();

            const initialResult = String(
                p.initial_interview_results ||
                p.initial_interview_result ||
                p['Initial Interview Result'] ||
                p['INITITAL INTERVIEW RESULTS'] ||
                p.ii_result ||
                ''
            ).toUpperCase();
            const isBlacklist = status.includes('BLACKLIST') || specificStatus.includes('BLACKLIST');
            const isNotEligible = status.includes('NOT_ELIGIBLE') || status.includes('NOT ELIGIBLE') || specificStatus.includes('NOT ELIGIBLE') || specificStatus.includes('NOT_ELIGIBLE');
            const isWaitlist = status.includes('WAITLIST') || specificStatus.includes('WAITLIST');
            const isWithdrawn = status.includes('WITHDRAW') || status.includes('WITHDREW') || specificStatus.includes('WITHDRAW') || specificStatus.includes('WITHDREW');
            const isPromoted = status.includes('PROMOTED') || status.includes('PROMOTION') || specificStatus.includes('PROMOTED') || specificStatus.includes('PROMOTION');
            const isLateral = status.includes('LATERAL') || specificStatus.includes('LATERAL');
            const isNoShow = status.includes('NO_SHOW') || status.includes('NO SHOW') || specificStatus.includes('NO_SHOW') || specificStatus.includes('NO SHOW');

            const fromStatus = String(a.failure_details?.from_status || '').toUpperCase();
            const isTypingTestOrApplied = fromStatus === 'TYPING_TEST' || fromStatus === 'APPLIED' || a.current_status === 'TYPING_TEST' || specificStatus.includes('TYPING TEST');
            const hasInterviewData = !!a.interview_completed_at || (a.interview_responses && Object.keys(a.interview_responses).length > 0) || initialResult.includes('PASSED');
            if (isTypingTestOrApplied && !hasInterviewData) return false;

            const isStatusOrSpecificFlagged = isBlacklist || isNotEligible || isWaitlist || isWithdrawn || isPromoted || isLateral;

            const isFinalStage = ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'ASSESSMENT', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'PASSED', 'WAITLISTED', 'CONDITIONAL', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'PAN COMPLETED', 'CONTRACT_SENT', 'CONTRACT SENT', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING'].includes(status);
            const isFailedOrRejected = ['FAILED', 'REJECTED'].includes(status);
            const isExplicitResult = initialResult.includes('PASSED') || initialResult.includes('FAILED') || initialResult.includes('REJECTED');
            const hasPassedInitial = isExplicitResult || isFinalStage || isStatusOrSpecificFlagged || isFailedOrRejected;
            // Removed restriction that prevents applications from showing up if they haven't passed initial interview

            const normalizedActiveTab = activeTab.toUpperCase();

            if (normalizedActiveTab === 'BLACKLIST' || normalizedActiveTab === 'BLACKLISTED') {
                if (!isBlacklist) return false;
            } else if (normalizedActiveTab === 'NOT_ELIGIBLE' || normalizedActiveTab === 'NOT_ELIGIBLE_FOR_REHIRE') {
                if (!isNotEligible) return false;
            } else if (normalizedActiveTab === 'WAITLISTED') {
                if (!isWaitlist) return false;
            } else if (normalizedActiveTab === 'WITHDRAWN') {
                if (!isWithdrawn) return false;
            } else if (normalizedActiveTab === 'PROMOTED') {
                if (!isPromoted) return false;
            } else if (normalizedActiveTab === 'LATERAL_TRANSFER') {
                if (!isLateral) return false;
            } else {
                if (isBlacklist || isNotEligible) return false;
            }

            const isHired = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(status);
            const isEndorsed = isHired || ['PASSED', 'WAITLISTED', 'CONDITIONAL', 'OPEN', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'PAN COMPLETED', 'CONTRACT_SENT', 'CONTRACT SENT', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING'].includes(status);

            const isInitialPipeline = ['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS'].includes(status);

            const failedAtOrAboveInitial = ['FAILED', 'REJECTED'].includes(status) && fromStatus !== 'TYPING_TEST' && fromStatus !== 'APPLIED';

            let matchesTab = false;
            if (normalizedActiveTab === 'PIVOT') {
                matchesTab = !isInitialPipeline && (col.toUpperCase() === 'SHEET' || isEndorsed);
            } else if (normalizedActiveTab === 'OFFICEFORMS_TABLE') {
                matchesTab = col === 'OfficeForms_Table' || isEndorsed || failedAtOrAboveInitial;
            } else if (normalizedActiveTab === 'SHEET') {
                const isOnCall = String(p.interview_mode || (a as any).interview_mode || '').toUpperCase() === 'ONLINE';
                const passedInitial = initialResult.includes('PASSED') || (a.interview_responses && Object.keys(a.interview_responses).length > 0) || !!a.interview_completed_at;
                const isOnCallException = isOnCall && passedInitial;
                matchesTab = col.toUpperCase() === 'SHEET' || isHired || isEndorsed || isFinalStage || failedAtOrAboveInitial || ['CLOSED', 'FAILED', 'REJECTED', 'WITHDRAWN', 'NO_SHOW', 'NO SHOW'].includes(status) || isOnCallException;
            } else if (normalizedActiveTab === 'SHEET1') {
                matchesTab = col.toUpperCase() === 'SHEET1';
            } else if (normalizedActiveTab === 'BILINGUALS' || normalizedActiveTab === 'TEAM_LEADER') {
                matchesTab = true; 
            } else {
                matchesTab = true;
            }

            if (!matchesTab) return false;

            if (isOfficialEndorsement) {
                const oeStatusList = ['FOR JOB OFFER', 'FOR_JOB_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'PAN COMPLETED', 'CONTRACT_SENT', 'CONTRACT SENT', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING'];
                const isOE = oeStatusList.includes(status);
                if (!isOE) return false;
            }

            if (normalizedActiveTab === 'BILINGUALS') {
                const isBilingual = a.position_title?.toLowerCase().includes('bilingual') || false;
                if (!isBilingual) return false;
            }

            if (normalizedActiveTab === 'TEAM_LEADER') {
                const isTL = a.position_title?.toLowerCase().includes('team leader') || false;
                if (!isTL) return false;
            }

            const matchesSearch = !search || (() => {
                const term = search.toLowerCase();
                const terms = term.split('|').map(t => t.trim()).filter(t => t.length >= 2);
                if (terms.length === 0) return true;
                
                const allColLabels = [
                    'wave', 'account', 'position', 'status', 'remarks', 'eid', 
                    'last name', 'middle name', 'first name', 'date of birth', 
                    'contact', 'email', 'training', 'salary', 'allowance', 
                    'exam', 'typing', 'source', 'recruiter', 'neo', 'peme', 
                    'phic', 'discord', 'bgc', 'nbi', 'bi', 'rcbc', 'h2r',
                    'department', 'hiring request id', 'position applying for',
                    'interview date', 'summary of background', 'current status',
                    'candidate\'s name', 'preferred set-up', 'willing to relocate',
                    'salary expectation', 'tenure as tl', 'total bpo exp', 'background and experience'
                ];
                
                const isColMatch = terms.some(t => allColLabels.some(c => c.includes(t)));
                if (isColMatch) return true;

                const searchFields = (obj: any, target: string): boolean => {
                    if (!obj) return false;
                    return Object.values(obj).some(val => {
                        if (typeof val === 'string' || typeof val === 'number') {
                            return String(val).toLowerCase().includes(target);
                        }
                        if (typeof val === 'object') {
                            return searchFields(val, target);
                        }
                        return false;
                    });
                };

                // Tokenized name matching: split each term by spaces and check if all tokens match the name
                const nameLower = (a.applicant_name || '').toLowerCase();
                const tokenizedMatch = terms.some(t => {
                    const tokens = t.split(' ').filter(tk => tk.length >= 2);
                    if (tokens.length > 1) {
                        return tokens.every(tk => nameLower.includes(tk));
                    }
                    return false;
                });
                if (tokenizedMatch) return true;
                
                return terms.some(t => searchFields(a, t));
            })();

            const matchesAccount = (selectedAccount === 'PRIORITY' || (!selectedAccount && isRecruiterS && isAccountFilterEnabled))
                ? loadReroutedAccounts().some(sa => (a.department || '').toLowerCase().includes(sa.toLowerCase()))
                : (!selectedAccount || selectedAccount === 'ALL' ? true : (a.department || '').trim().toLowerCase() === selectedAccount.trim().toLowerCase());

            const matchesIncomplete = !showOnlyIncomplete || (() => {
                const responses = a.interview_responses || {};
                const answeredCount = activeQuestions.filter(q => !!responses[q.id] && responses[q.id].trim() !== '').length;
                return answeredCount < activeQuestions.length;
            })();

            if (activeTab === 'SUPPORT HIRING') {
                const pis = a.pis;
                if (shFilters.position.length > 0 && !shFilters.position.includes(a.position_title)) return false;

                const initialVal = pis?.initial_interview_result || 'Pending';
                if (shFilters.initial.length > 0 && !shFilters.initial.includes(initialVal)) return false;

                const initialVal2 = pis?.second_level_interview_result || 'Pending';
                if (shFilters.second.length > 0 && !shFilters.second.includes(initialVal2)) return false;

                const finalVal = pis?.final_interview_result || 'Pending';
                if (shFilters.final.length > 0 && !shFilters.final.includes(finalVal)) return false;
            }

            let matchesDate = true;
            if (dateRange.start || dateRange.end) {
                const searchDateStr = String((a.pis?.start_time || a.applied_at || a.updated_at || '')).split(' ')[0];
                const appDate = new Date(searchDateStr);
                if (!isNaN(appDate.getTime())) {
                    const start = dateRange.start ? new Date(dateRange.start) : null;
                    const end = dateRange.end ? new Date(dateRange.end) : null;
                    if (start) start.setHours(0, 0, 0, 0);
                    if (end) end.setHours(23, 59, 59, 999);
                    if (start && appDate < start) matchesDate = false;
                    if (end && appDate > end) matchesDate = false;
                } else {
                    matchesDate = false;
                }
            }

            if (matchesDate && (dateAddedFilter.start || dateAddedFilter.end)) {
                const searchDateStr = String(a.applied_at || '').split(' ')[0];
                const appDate = new Date(searchDateStr);
                if (!isNaN(appDate.getTime())) {
                    const start = dateAddedFilter.start ? new Date(dateAddedFilter.start) : null;
                    const end = dateAddedFilter.end ? new Date(dateAddedFilter.end) : null;
                    if (start) start.setHours(0, 0, 0, 0);
                    if (end) end.setHours(23, 59, 59, 999);
                    if (start && appDate < start) matchesDate = false;
                    if (end && appDate > end) matchesDate = false;
                } else {
                    matchesDate = false;
                }
            }

            if (matchesDate && (interviewConcludedFilter.start || interviewConcludedFilter.end)) {
                const searchDateStr = String(a.interview_completed_at || a.updated_at || '').split(' ')[0];
                const appDate = new Date(searchDateStr);
                if (!isNaN(appDate.getTime())) {
                    const start = interviewConcludedFilter.start ? new Date(interviewConcludedFilter.start) : null;
                    const end = interviewConcludedFilter.end ? new Date(interviewConcludedFilter.end) : null;
                    if (start) start.setHours(0, 0, 0, 0);
                    if (end) end.setHours(23, 59, 59, 999);
                    if (start && appDate < start) matchesDate = false;
                    if (end && appDate > end) matchesDate = false;
                } else {
                    matchesDate = false;
                }
            }

            const getFuzzyStatus = () => {
                const p = (a.pis || {}) as any;
                return p.final_specific_status || p['Final Specific Status'] || p['Specific Status'] || '';
            };
            const appSpecificStatus = String(getFuzzyStatus()).trim().toUpperCase();
            const matchesStatus = selectedStatus.includes('ALL') || selectedStatus.includes(appSpecificStatus);

            const appEducation = ((a.pis?.highest_education || (a as any).highest_education)?.toString() || '').trim().toLowerCase();
            const matchesEducation = selectedEducation.includes('ALL') || selectedEducation.includes(appEducation);

            const appGender = ((a.pis?.sex || (a as any).sex)?.toString() || '').trim().toLowerCase();
            const matchesGender = selectedGender.includes('ALL') || selectedGender.includes(appGender);

            const initAccVal = ((a.pis?.initial_account_assignment || (a as any).initial_account_assignment || a.department)?.toString() || '').trim().toLowerCase();
            const initAccParts = initAccVal.split(/[,|]/).map((p: string) => p.trim()).filter(Boolean);
            const matchesInitialAcc = selectedInitialAccountFilter === 'ALL' || initAccParts.includes(selectedInitialAccountFilter.toLowerCase());

            const finalAccVal = ((a.pis?.final_account || (a as any).final_account)?.toString() || '').trim().toLowerCase();
            const finalAccParts = finalAccVal.split(/[,|]/).map((p: string) => p.trim()).filter(Boolean);
            const matchesFinalAcc = selectedFinalAccountFilter === 'ALL' || finalAccParts.includes(selectedFinalAccountFilter.toLowerCase());

            const rawOverallStatus = String(
                a.pis?.overall_status ||
                a.overall_status ||
                a.metadata?.overall_status ||
                ''
            ).toUpperCase();

            const specStatus = String(
                a.pis?.final_specific_status ||
                a.metadata?.final_specific_status ||
                a.master_remarks ||
                ''
            ).toLowerCase();

            const currentStatusUpper = (a.current_status || '').toUpperCase();

            const isClosed = rawOverallStatus === 'CLOSED' || rawOverallStatus === 'CLOSE' ||
                specStatus.includes('failed') || specStatus.includes('withdraw') || specStatus.includes('declined') || specStatus.includes('no show') || specStatus.includes('noshow') ||
                ['FAILED', 'REJECTED', 'WITHDRAWN', 'CLOSED', 'DECLINED'].includes(currentStatusUpper);

            const isHiredStatus = rawOverallStatus === 'HIRED' ||
                ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(currentStatusUpper);

            let matchesOverallStatus = true;
            if (selectedOverallStatusFilter !== 'ALL') {
                if (selectedOverallStatusFilter === 'HIRED') {
                    matchesOverallStatus = isHiredStatus;
                } else if (selectedOverallStatusFilter === 'OPEN') {
                    matchesOverallStatus = !isClosed && !isHiredStatus;
                } else if (selectedOverallStatusFilter === 'CLOSE' || selectedOverallStatusFilter === 'CLOSED') {
                    matchesOverallStatus = isClosed;
                }
            }

            let matchesHireType = true;
            if (selectedHireType !== 'ALL') {
                const type = (a.metadata?.candidate_type || a.pis?.candidate_type || 'EXTERNAL').toUpperCase();
                matchesHireType = type === selectedHireType.toUpperCase();
            }

            let matchesYear = true;
            if (selectedYear !== 'ALL') {
                const dateStr = a.applied_at;
                if (dateStr) {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) {
                        matchesYear = String(d.getFullYear()) === selectedYear;
                    } else {
                        matchesYear = false;
                    }
                } else {
                    matchesYear = false;
                }
            }

            let matchesPassedMonth = true;
            if (activePassedMonth !== 'ALL') {
                const dateStr = a.applied_at;
                if (dateStr) {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) {
                        const monthName = d.toLocaleString('default', { month: 'long' });
                        matchesPassedMonth = monthName === activePassedMonth;
                    } else {
                        matchesPassedMonth = false;
                    }
                } else {
                    matchesPassedMonth = false;
                }
            }

            return matchesSearch && matchesAccount && matchesIncomplete && matchesDate && matchesStatus && matchesEducation && matchesGender && matchesInitialAcc && matchesFinalAcc && matchesOverallStatus && matchesHireType && matchesYear && matchesPassedMonth;
        });

        const uniqueMap = new Map();
        list.forEach(app => {
            const key = (app.applicant_email || app.applicant_name || app.id).trim().toLowerCase();
            const existing = uniqueMap.get(key);
            if (!existing || new Date(app.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
                uniqueMap.set(key, app);
            }
        });
        return Array.from(uniqueMap.values());
    }, [applications, search, selectedAccount, showOnlyIncomplete, activeQuestions, activeTab, shFilters, dateRange, dateAddedFilter, interviewConcludedFilter, selectedStatus, selectedEducation, selectedGender, localChanges, isAccountFilterEnabled, isRecruiterS, selectedInitialAccountFilter, selectedFinalAccountFilter, selectedOverallStatusFilter, selectedHireType, selectedYear, activePassedMonth, isExclusiveMode]);

    const accountMetrics = useMemo(() => {
        const metrics: Record<string, { count: number; hired: number; endorsed: number }> = {};

        const dateFilteredApps = applications.filter(a => {
            if (a.metadata?.deleted_from_sheet) return false;

            const isHiddenRecord = a.is_hidden === true || (a.is_hidden as any) === 1 || String(a.is_hidden).toLowerCase() === 'true' || String(a.is_hidden) === '1';
            if (isExclusiveMode && !isHiddenRecord) return false;
            if (!isExclusiveMode && isHiddenRecord) return false;

            const p = (a.pis || {}) as any;
            const initialResult = String(
                p.initial_interview_results ||
                p.initial_interview_result ||
                p['Initial Interview Result'] ||
                p['INITITAL INTERVIEW RESULTS'] ||
                p.ii_result ||
                ''
            ).toUpperCase();
            const isFinalStage = ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'ASSESSMENT', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'PASSED', 'WAITLISTED', 'CONDITIONAL'].includes((a.current_status || 'PENDING').toUpperCase());
            const isExplicitResult = initialResult.includes('PASSED') || initialResult.includes('FAILED') || initialResult.includes('REJECTED');
            const hasPassedInitial = isExplicitResult || isFinalStage;
            if (!hasPassedInitial) return false;

            if (activeTab.toUpperCase() === 'SHEET' || activeTab.toUpperCase() === 'SHEET1') return true;

            if (dateRange.start || dateRange.end) {
                const appDate = new Date(a.updated_at || a.applied_at);
                if (isNaN(appDate.getTime())) return false;
                let inRange = true;
                const start = dateRange.start ? new Date(dateRange.start) : null;
                const end = dateRange.end ? new Date(dateRange.end) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);
                if (start && appDate < start) inRange = false;
                if (end && appDate > end) inRange = false;
                if (!inRange) return false;
            }

            if (dateAddedFilter.start || dateAddedFilter.end) {
                const appDate = new Date(a.applied_at || '');
                if (isNaN(appDate.getTime())) return false;
                let inRange = true;
                const start = dateAddedFilter.start ? new Date(dateAddedFilter.start) : null;
                const end = dateAddedFilter.end ? new Date(dateAddedFilter.end) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);
                if (start && appDate < start) inRange = false;
                if (end && appDate > end) inRange = false;
                if (!inRange) return false;
            }

            if (interviewConcludedFilter.start || interviewConcludedFilter.end) {
                const appDate = new Date(a.interview_completed_at || a.updated_at || '');
                if (isNaN(appDate.getTime())) return false;
                let inRange = true;
                const start = interviewConcludedFilter.start ? new Date(interviewConcludedFilter.start) : null;
                const end = interviewConcludedFilter.end ? new Date(interviewConcludedFilter.end) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);
                if (start && appDate < start) inRange = false;
                if (end && appDate > end) inRange = false;
                if (!inRange) return false;
            }

            return true;
        });

        dateFilteredApps.forEach(app => {
            const status = (app.current_status || 'PENDING').toUpperCase();
            const isHired = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(status);
            const isEndorsed = ['PASSED', 'HIRED', 'HIRED_PROCESSED', 'WAITLISTED', 'CONDITIONAL', 'OPEN', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC'].includes(status);
            const normalizedActiveTab = activeTab.toUpperCase();
            let matchesTab = false;

            if (normalizedActiveTab === 'PIVOT') {
                matchesTab = true;
            } else if (normalizedActiveTab === 'OFFICEFORMS_TABLE') {
                matchesTab = true;
            } else if (normalizedActiveTab === 'SHEET') {
                matchesTab = true;
            } else if (normalizedActiveTab === 'SHEET1') {
                matchesTab = true;
            } else if (normalizedActiveTab === 'BILINGUALS' || normalizedActiveTab === 'TEAM_LEADER') {
                matchesTab = true;
            } else {
                matchesTab = true;
            }

            if (!matchesTab) return;

            if (normalizedActiveTab === 'BILINGUALS') {
                const isBilingual = app.position_title?.toLowerCase().includes('bilingual') || false;
                if (!isBilingual) return;
            }
            if (normalizedActiveTab === 'TEAM_LEADER') {
                const isTL = app.position_title?.toLowerCase().includes('team leader') || false;
                if (!isTL) return;
            }

            const dept = app.department || 'General';
            if (!metrics[dept]) {
                metrics[dept] = { count: 0, hired: 0, endorsed: 0 };
            }
            metrics[dept].count++;
            if (isHired) {
                metrics[dept].hired++;
            }
            if (isEndorsed) {
                metrics[dept].endorsed++;
            }
        });

        const goldStandard = allDepartments.map(d => d.name.toUpperCase());

        const result = Object.entries(metrics)
            .map(([name, data]) => ({
                id: name,
                name: name,
                count: data.count,
                total: {
                    Applicants: data.count,
                    Endorsed: (data as any).endorsed || 0,
                    Hired: (data as any).hired || 0,
                    yieldRate: data.count > 0 ? (((data as any).hired || 0) / data.count) * 100 : 0
                }
            }))
            .filter(item => {
                const upper = item.name.trim().toUpperCase();
                
                if (goldStandard.includes(upper)) return true;

                const blacklist = [
                    'N/A', 'NONE', 'EMPTY', 'NULL', '---', 'SHEET CANDIDATE',
                    'RECRUITER', 'B1', 'TC', 'TBA',
                    'PASSED', 'FAILED', 'REJECTED', 'ENDORSED', 'WITHDRAWN'
                ];
                if (blacklist.includes(upper)) return false;
                
                const isOfficialLooking = /^[A-Z0-9&\s\/\-\.]{2,25}$/.test(upper);
                if (isOfficialLooking) return true;

                return false;
            });

        if (search && activeTab === 'OfficeForms_Table' && !selectedAccount) {
            return result.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
        }

        return result.sort((a, b) => b.count - a.count);
    }, [applications, activeTab, search, selectedAccount, dateRange, dateAddedFilter, interviewConcludedFilter, allDepartments, isExclusiveMode]);

    return {
        search,
        setSearch,
        selectedAccount,
        setSelectedAccount,
        activeTab,
        setActiveTab,
        showOnlyIncomplete,
        setShowOnlyIncomplete,
        shFilters,
        setShFilters,
        dateRange,
        setDateRange,
        dateAddedFilter,
        setDateAddedFilter,
        interviewConcludedFilter,
        setInterviewConcludedFilter,
        isExclusiveMode,
        setIsExclusiveMode,
        selectedStatus,
        setSelectedStatus,
        selectedEducation,
        setSelectedEducation,
        educationOptions: ['ALL', 'College Graduate', 'College Undergrad', 'High School Graduate', 'Senior High School Graduate'],
        selectedGender,
        setSelectedGender,
        genderOptions,
        selectedInitialAccountFilter,
        setSelectedInitialAccountFilter,
        initialAccountOptions,
        selectedOverallStatusFilter,
        setSelectedOverallStatusFilter,
        selectedFinalAccountFilter,
        setSelectedFinalAccountFilter,
        finalAccountOptions,
        selectedHireType,
        setSelectedHireType,

        isOfficialEndorsement,
        setIsOfficialEndorsement,
        activePassedMonth,
        setActivePassedMonth,
        availablePassedMonths,
        selectedYear,
        setSelectedYear,
        availableYears,
        activeQuestions,
        filteredList,
        accountMetrics
    };
}
