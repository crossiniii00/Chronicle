import { useState, useMemo } from 'react';
import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import { type SHFilters } from '../constants';
import { MONTHS } from '../masterlist/constants';

interface FiltersProps {
    applications: Application[];
    questions: InterviewQuestion[];
    allDepartments: any[];
    localChanges?: Record<string, Record<string, any>>;
}

export function useInterviewFilters({ applications, questions, allDepartments, localChanges }: FiltersProps) {
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

    const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
    const [selectedDay, setSelectedDay] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [selectedEducation, setSelectedEducation] = useState<string>('ALL');
    const [selectedGender, setSelectedGender] = useState<string>('ALL');

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
            const v = (a.pis?.gender || (a as any).gender)?.toString().trim();
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
            .sort((a, b) => {
                const priorityA = typePriority[a.question_type] || 99;
                const priorityB = typePriority[b.question_type] || 99;

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                return (a.question_order ?? 0) - (b.question_order ?? 0);
            });
    }, [questions]);

    const filteredList = useMemo(() => {
        return applications.filter(a => {
            if (a.metadata?.deleted_from_sheet) return false;

            const hasPendingChanges = localChanges && localChanges[a.id] && Object.keys(localChanges[a.id]).length > 0;
            if (hasPendingChanges) {
                return true;
            }

            const col = a.master_column || 'SHEET';
            const status = (a.current_status || 'PENDING').toUpperCase();
            const p = (a.pis || {}) as any;
            const specificStatus = String(p.final_specific_status || '').toUpperCase();
            
            const isBlacklist = status.includes('BLACKLIST') || specificStatus.includes('BLACKLIST');
            const isNotEligible = status.includes('NOT_ELIGIBLE') || status.includes('NOT ELIGIBLE') || specificStatus.includes('NOT ELIGIBLE') || specificStatus.includes('NOT_ELIGIBLE');

            const normalizedActiveTab = activeTab.toUpperCase();

            if (normalizedActiveTab === 'BLACKLIST') {
                if (!isBlacklist) return false;
            } else if (normalizedActiveTab === 'NOT_ELIGIBLE') {
                if (!isNotEligible) return false;
            } else {
                if (isBlacklist || isNotEligible) return false;
            }

            const isHired = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(status);
            const isEndorsed = isHired || ['PASSED', 'WAITLISTED', 'CONDITIONAL', 'OPEN', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC'].includes(status);

            const isInitialPipeline = ['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS'].includes(status);

            let matchesTab = false;
            if (normalizedActiveTab === 'PIVOT') {
                matchesTab = !isInitialPipeline && (col.toUpperCase() === 'SHEET' || isEndorsed);
            } else if (normalizedActiveTab === 'OFFICEFORMS_TABLE') {
                matchesTab = col === 'OfficeForms_Table' || isEndorsed;
            } else if (normalizedActiveTab === 'SHEET') {
                matchesTab = !isInitialPipeline && (col.toUpperCase() === 'SHEET' || isHired || isEndorsed || ['CLOSED', 'FAILED', 'REJECTED', 'WITHDRAWN'].includes(status));
            } else if (normalizedActiveTab === 'SHEET1') {
                matchesTab = col.toUpperCase() === 'SHEET1';
            } else if (normalizedActiveTab === 'BILINGUALS' || normalizedActiveTab === 'TEAM_LEADER') {
                matchesTab = true; 
            } else {
                matchesTab = true;
            }

            if (!matchesTab) return false;

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
                
                return terms.some(t => searchFields(a, t));
            })();

            const matchesAccount = !selectedAccount || (a.department || '').trim().toLowerCase() === selectedAccount.trim().toLowerCase();

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

            let matchesDate = selectedMonth === 'ALL';
            if (selectedMonth !== 'ALL') {
                const appDate = new Date(a.updated_at || a.applied_at);
                if (!isNaN(appDate.getTime())) {
                    const monthMatch = MONTHS[appDate.getMonth()] === selectedMonth;
                    const dayMatch = selectedDay === 'ALL' || appDate.getDate().toString() === selectedDay;
                    matchesDate = monthMatch && dayMatch;
                }
            }

            const getFuzzyStatus = () => {
                const p = (a.pis || {}) as any;
                return p.final_specific_status || p['Final Specific Status'] || p['Specific Status'] || '';
            };
            const appSpecificStatus = String(getFuzzyStatus()).trim().toUpperCase();
            const filterTarget = selectedStatus.trim().toUpperCase();
            const matchesStatus = selectedStatus === 'ALL' || appSpecificStatus === filterTarget;

            const appEducation = ((a.pis?.highest_education || (a as any).highest_education)?.toString() || '').trim().toLowerCase();
            const matchesEducation = selectedEducation === 'ALL' || appEducation === selectedEducation.toLowerCase();

            const appGender = ((a.pis?.gender || (a as any).gender)?.toString() || '').trim().toLowerCase();
            const matchesGender = selectedGender === 'ALL' || appGender === selectedGender.toLowerCase();

            return matchesSearch && matchesAccount && matchesIncomplete && matchesDate && matchesStatus && matchesEducation && matchesGender;
        });
    }, [applications, search, selectedAccount, showOnlyIncomplete, activeQuestions, activeTab, shFilters, selectedMonth, selectedDay, selectedStatus, selectedEducation, selectedGender, localChanges]);

    const accountMetrics = useMemo(() => {
        const metrics: Record<string, { count: number; hired: number; endorsed: number }> = {};

        const dateFilteredApps = applications.filter(a => {
            if (a.metadata?.deleted_from_sheet) return false;
            if (activeTab.toUpperCase() === 'SHEET' || activeTab.toUpperCase() === 'SHEET1') return true;

            if (selectedMonth === 'ALL') return true;
            const appDate = new Date(a.updated_at || a.applied_at);
            if (isNaN(appDate.getTime())) return false;

            const monthMatch = MONTHS[appDate.getMonth()] === selectedMonth;
            const dayMatch = selectedDay === 'ALL' || appDate.getDate().toString() === selectedDay;
            return monthMatch && dayMatch;
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
    }, [applications, activeTab, search, selectedAccount, selectedMonth, selectedDay, allDepartments]);

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
        selectedMonth,
        setSelectedMonth,
        selectedDay,
        setSelectedDay,
        selectedStatus,
        setSelectedStatus,
        selectedEducation,
        setSelectedEducation,
        selectedGender,
        setSelectedGender,
        educationOptions,
        genderOptions,
        activeQuestions,
        filteredList,
        accountMetrics
    };
}
