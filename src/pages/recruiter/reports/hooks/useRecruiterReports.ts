import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGlobalDataStore } from '@/store/globalDataStore';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { DepartmentService } from '@/services/DepartmentService';
import { UserService } from '@/services/UserService';
import { MhrtService } from '@/services/MhrtService';
import { socketService } from '@/services/socketService';
import type { Application } from '@/types/application';
import type { Position } from '@/types/position';
import type { User } from '@/types/user';

import { useAuthStore } from '@/store/authStore';
import type { DateFilterState } from '@/components/common/AdvancedDateFilter';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

export function getTrueAccount(app: any): string {
    const meta = app.metadata || {};
    const pis = app.pis || meta.pis || {};

    let raw = (
        app.department ||
        app.endorsement_account ||
        meta.final_account || pis.final_account ||
        meta.target_account || pis.target_account ||
        app.initial_account_assignment || meta.initial_account_assignment || pis.initial_account_assignment ||
        ''
    ).trim();

    if (!raw) return 'Unassigned';

    // If comma-separated, take the first primary account listed
    if (raw.includes(',')) {
        const parts = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (parts.length > 0) {
            raw = parts[0];
        }
    }

    const rawDept = raw.toUpperCase();

    const KNOWN_ACCOUNTS = [
        'ENERCARE', 'ONCOURSE', 'DOORDASH', 'ABBOTT', 'AUTO APPROVE', 
        'KELLER POSTMAN', 'TELLIHEALTH', 'PAESSLER', 'PUROLATOR', 
        'TFG', 'FINANCE', 'RIIPEN', 'REGENCY', 'NJS', 'THE SAVINGS GROUP',
        'TEAM LEADER POSITION', 'HUMAN RESOURCES', 'GLOBAL MEET', 'GRIDMATIC',
        'HARDROCK', 'IWIRELESS', 'MANAGERIAL POSITION', 'ADMIN OPS SHARED COST',
        'AMBIENCE AIR', 'FACILITIES', 'IT', 'ADMIN', 'EXACT SCIENCES', 'TENNIS CHANNEL',
        'QUALITY ASSURANCE', 'WORKFORCE', 'SAFETY OFFICER', 'TPV'
    ];

    const matched = KNOWN_ACCOUNTS.find(acc => rawDept.startsWith(acc));
    if (matched) return matched;

    if (rawDept.includes(' - ')) {
        return rawDept.split(' - ')[0].trim();
    }

    return rawDept;
}

export function getTrueAccounts(app: any): string[] {
    const meta = app.metadata || {};
    const pis = app.pis || meta.pis || {};

    let raw = (
        app.department ||
        app.endorsement_account ||
        meta.final_account || pis.final_account ||
        meta.target_account || pis.target_account ||
        app.initial_account_assignment || meta.initial_account_assignment || pis.initial_account_assignment ||
        ''
    ).trim();

    if (!raw) return ['Unassigned'];

    const parts = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (parts.length === 0) return ['Unassigned'];

    const KNOWN_ACCOUNTS = [
        'ENERCARE', 'ONCOURSE', 'DOORDASH', 'ABBOTT', 'AUTO APPROVE', 
        'KELLER POSTMAN', 'TELLIHEALTH', 'PAESSLER', 'PUROLATOR', 
        'TFG', 'FINANCE', 'RIIPEN', 'REGENCY', 'NJS', 'THE SAVINGS GROUP',
        'TEAM LEADER POSITION', 'HUMAN RESOURCES', 'GLOBAL MEET', 'GRIDMATIC',
        'HARDROCK', 'IWIRELESS', 'MANAGERIAL POSITION', 'ADMIN OPS SHARED COST',
        'AMBIENCE AIR', 'FACILITIES', 'IT', 'ADMIN', 'EXACT SCIENCES', 'TENNIS CHANNEL',
        'QUALITY ASSURANCE', 'WORKFORCE', 'SAFETY OFFICER', 'TPV'
    ];

    const results = parts.map((part: string) => {
        const rawDept = part.toUpperCase();
        const matched = KNOWN_ACCOUNTS.find(acc => rawDept.startsWith(acc));
        if (matched) return matched;
        
        if (rawDept.includes(' - ')) {
            return rawDept.split(' - ')[0].trim();
        }
        return rawDept;
    });

    return Array.from(new Set(results));
}

export function getAppStrictLob(app: any, mhrtAccounts: any[] = [], departmentsList: any[] = []): string {
    const dept = getTrueAccount(app).toUpperCase();
    const isOncourse = dept === 'ONCOURSE';

    // 1. Get official registered LOBs directly from Account System (mhrtAccounts) for THIS account
    const officialAccountLobs = (mhrtAccounts || [])
        .filter((a: any) => (a.account || '').trim().toUpperCase() === dept)
        .map((a: any) => String(a.lob || '').trim().toUpperCase())
        .filter((l: string) => l && l !== 'UNSPECIFIED JOB POSITION' && (isOncourse || l !== 'AGENT'));

    // Also load official LOBs from departmentsList
    const deptObj = (departmentsList || []).find((d: any) => (d.name || '').trim().toUpperCase() === dept);
    if (deptObj && (deptObj.subAccounts || deptObj.sub_accounts)) {
        const subs = deptObj.subAccounts || deptObj.sub_accounts || [];
        subs.forEach((s: any) => {
            const name = String(s.name || s).trim().toUpperCase();
            if (name && name !== 'UNSPECIFIED JOB POSITION' && !officialAccountLobs.includes(name)) {
                officialAccountLobs.push(name);
            }
        });
    }

    // 2. Explicit custom_lob assigned manually by user to candidate
    const customLob = String((app as any).pis?.custom_lob || (app as any).metadata?.custom_lob || '').trim().toUpperCase();
    if (customLob && customLob !== 'UNSPECIFIED JOB POSITION') {
        if (!isOncourse && customLob === 'AGENT') {
            // Ignore generic AGENT on non-ONCOURSE accounts
        } else {
            if (officialAccountLobs.length === 0 || officialAccountLobs.includes(customLob)) {
                return customLob;
            }
            const matchedCustom = officialAccountLobs.find(official => 
                customLob === official || (official.length > 5 && customLob.includes(official))
            );
            if (matchedCustom) return matchedCustom;
            
            // If there are official LOBs and this custom lob doesn't match any, it should fallback to 'UNSPECIFIED JOB POSITION'
            if (officialAccountLobs.length === 0 && customLob !== 'AGENT') {
                return customLob;
            }
        }
    }

    // 3. Candidate raw LOB text from department split or position_title
    const posTitle = String(app.position_title || '').trim().toUpperCase();
    let extractedLob = '';
    const rawDept = String(app.department || '').trim().toUpperCase();
    if (rawDept.includes(' - ')) {
        extractedLob = rawDept.split(' - ').slice(1).join(' - ').trim().toUpperCase();
    }

    const candidateLobRaw = extractedLob || (posTitle && posTitle !== dept ? posTitle : '');

    // 4. Match candidate raw text against official Account System LOBs for THIS account
    if (candidateLobRaw && candidateLobRaw !== 'UNSPECIFIED JOB POSITION' && candidateLobRaw !== 'AGENT') {
        // Direct match with official Account System LOB
        if (officialAccountLobs.includes(candidateLobRaw)) {
            return candidateLobRaw;
        }
        // Substring / fuzzy match with official Account System LOB
        const matched = officialAccountLobs.find(official => {
            if (candidateLobRaw === official) return true;
            const parts = official.split(/[,/-]/).map(p => p.trim()).filter(p => p.length > 3 && p !== 'AGENT');
            return parts.some(p => candidateLobRaw.includes(p) || p.includes(candidateLobRaw));
        });
        if (matched) {
            return matched;
        }
    }

    // 5. Default fallback key for account
    return isOncourse ? 'AGENT' : 'UNSPECIFIED JOB POSITION';
}

export function useRecruiterReports(user: any) {
    const { 
        applications: apps, 
        positions, 
        mhrtAccounts, 
        departments: departmentsList, 
        users: systemUsers, 
        isLoading: loading,
        isInitialized,
        updateApplicationLocally
    } = useGlobalDataStore();
    const [isSyncing, setIsSyncing] = useState(false);

    // Global Filters
    const [selectedDeptNames, setSelectedDeptNames] = useState<string[]>([]);
    const [isExclusiveMode, setIsExclusiveMode] = useState(false);
    const [lobFilters, setLobFilters] = useState<string[]>([]);
    const [hiringTypeFilters, setHiringTypeFilters] = useState<string[]>([]);
    const [dateAppliedFilter, setDateAppliedFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [initialInterviewFilter, setInitialInterviewFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [trainingStartFilter, setTrainingStartFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [opsValFilter, setOpsValFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [selectedRecruiterName, setSelectedRecruiterName] = useState<string | null>(null);
    const [expFilter, setExpFilter] = useState<string>('');
    const [freshGradFilter, setFreshGradFilter] = useState<string>(''); // yes, no
    const [eduFilter, setEduFilter] = useState<string>('');
    const [genderFilter, setGenderFilter] = useState<string>('');

    const { isAccountFilterEnabled } = useAuthStore();



    useVisibilityPolling(() => {}, 300000);

    // Helpers
    const getNormalizedName = useCallback((raw: string | null | undefined, appMetadata?: any) => {
        let upper = (raw || '').trim().toUpperCase();
        if (!upper && appMetadata) {
            const p = (appMetadata.pis || {}) as any;
            upper = String(p.initial_account_assignment || p['INITIAL ACCOUNT ASSIGNMENT'] || p.final_account || p['Final Account'] || '').trim().toUpperCase();
        }
        return upper;
    }, []);

    const categorizeEducation = (raw: string): string => {
        const r = (raw || '').toUpperCase();
        if (r.includes('DOCTOR') || r.includes('PHD')) return 'DOCTORATE';
        if (r.includes('MASTER') || r.includes('MA ') || r.includes('MS ')) return "MASTER'S";
        if (r.includes('BACHELOR') || r.includes('COLLEGE GRADUATE') || r.includes('COLLEGE DEGREE') || r.includes('BS ') || r.includes('BA ')) return 'BACHELOR\'S DEGREE';
        if (r.includes('COLLEGE UNDER') || r.includes('COLLEGE LEVEL') || r.includes('UNDERGRADUATE') || r.includes('SEMESTER')) return 'COLLEGE LEVEL';
        if (r.includes('ASSOCIATE') || r.includes('VOCATIONAL') || r.includes('DIPLOMA')) return 'VOCATIONAL';
        if (r.includes('HIGH SCHOOL') || r.includes('HS ') || r.includes('SECONDARY') || r.includes('SENIOR HIGH')) return 'SENIOR HIGH';
        return 'OTHER';
    };

    const getWorkExperienceMonths = (expList: any[]): number => {
        if (!expList || expList.length === 0) return 0;
        let totalMonths = 0;
        expList.forEach(exp => {
            const from = new Date(exp.duration_from);
            const to = exp.duration_to ? new Date(exp.duration_to) : new Date();
            if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                const diffMonths = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
                totalMonths += Math.max(0, diffMonths);
            }
        });
        return totalMonths;
    };

    const categorizeExperience = (expList: any[]): string => {
        const months = getWorkExperienceMonths(expList);
        if (months === 0) return 'No Experience';
        if (months < 6) return 'Less than 6 Months';
        if (months <= 12) return '6 Months–1 Year';
        if (months <= 24) return '1–2 Years';
        if (months <= 60) return '3–5 Years';
        return '5+ Years';
    };

    const getOutcome = useCallback((app: Application) => {
        const p = (app.pis || app.metadata || {}) as any;
        const status = (app.current_status || '').toUpperCase();
        const overall = String(p.overall_status || p['Overall Status'] || '').toUpperCase();
        const finalSpec = String(p.final_specific_status || p['Final Specific Status'] || p['Specific Status'] || '').toUpperCase();

        const isHired = status === 'HIRED' || status === 'HIRED_PROCESSED' || status === 'ACCEPTED_OFFER' || status === 'ACCEPTED OFFER' || status === 'CONFIRMED_TRAINING' || status === 'CONFIRMED TRAINING' || status === 'PAN_COMPLETED' || status === 'PAN COMPLETED' || overall === 'HIRED' || overall === 'CONFIRMED TRAINING';
        const isFailed = status === 'FAILED' || status === 'REJECTED' || status === 'NOT_ELIGIBLE_FOR_REHIRE' || status === 'NOT ELIGIBLE FOR REHIRE' || overall === 'FAILED' || overall === 'REJECTED' || finalSpec === 'FAILED' || finalSpec === 'REJECTED';
        const isWithdrawn = status === 'WITHDRAWN' || status === 'FALLOUT' || overall === 'WITHDRAWN' || finalSpec === 'WITHDRAWN' || status.includes('NO_SHOW') || status.includes('NO SHOW');
        const isEndorsed = isHired || ['PASSED', 'FOR_JO', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'ENDORSED', 'SENT_JO_AND_BGC', 'ACCEPTED_OFFER', 'FOR_PAN', 'PAN_COMPLETED', 'PAN COMPLETED'].includes(status) || finalSpec === 'PASSED' || overall === 'PASSED';

        return { isHired, isFailed, isEndorsed, isWithdrawn };
    }, []);

    // Filter Logic
    const filteredApps = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin' || user?.role === 'ops_val_admin';

        return apps.filter(app => {
            const isHiddenRecord = app.is_hidden === true || (app.is_hidden as any) === 1 || String(app.is_hidden).toLowerCase() === 'true' || String(app.is_hidden) === '1';
            if (isExclusiveMode && !isHiddenRecord) return false;
            if (!isExclusiveMode && isHiddenRecord) return false;

            // General Date Filters (Multi-Type)
            const isWithinRange = (dateInput: string | undefined | null, filter: DateFilterState) => {
                if (!dateInput || dateInput === 'TBD') return false;
                try {
                    const dStr = dateInput.includes('T') ? dateInput.split('T')[0] : new Date(dateInput).toISOString().split('T')[0];
                    return dStr >= filter.start! && dStr <= filter.end!;
                } catch {
                    return false;
                }
            };

            if (dateAppliedFilter.type !== 'ALL' && dateAppliedFilter.start && dateAppliedFilter.end) {
                const appliedDate = app.applied_at || app.created_at || new Date().toISOString();
                if (!isWithinRange(appliedDate, dateAppliedFilter)) return false;
            }
            
            if (initialInterviewFilter.type !== 'ALL' && initialInterviewFilter.start && initialInterviewFilter.end) {
                const initialDate = (app as any).initial_interview_date || app.metadata?.initial_interview_date || (app as any).pis?.initial_interview_date;
                if (!isWithinRange(initialDate, initialInterviewFilter)) return false;
            }
            
            if (trainingStartFilter.type !== 'ALL' && trainingStartFilter.start && trainingStartFilter.end) {
                const trainingDate = app.master_training_start_date || (app as any).pis?.master_training_start_date || (app as any).pis?.training_start_date || app.metadata?.master_training_start_date;
                if (!isWithinRange(trainingDate, trainingStartFilter)) return false;
            }
            
            if (opsValFilter.type !== 'ALL' && opsValFilter.start && opsValFilter.end) {
                const opsValDate = (app as any).ops_val_interview_date || app.metadata?.ops_val_interview_date || (app as any).pis?.ops_val_interview_date || (app as any).ops_validator_interview_date || app.metadata?.ops_validator_interview_date;
                if (!isWithinRange(opsValDate, opsValFilter)) return false;
            }

            // Demographics & Details
            if (genderFilter) {
                const sex = String(app.pis?.sex || 'UNSPECIFIED').toUpperCase();
                if (genderFilter === 'UNSPECIFIED') {
                    if (sex !== 'UNSPECIFIED' && sex !== 'UNKNOWN' && sex !== '') return false;
                } else if (sex !== genderFilter.toUpperCase()) {
                    return false;
                }
            }

            if (eduFilter) {
                const edu = categorizeEducation(app.pis?.highest_education || '');
                if (edu !== eduFilter) return false;
            }

            if (expFilter) {
                const exp = categorizeExperience(app.pis?.work_experience || []);
                if (exp !== expFilter) return false;
            }

            if (freshGradFilter) {
                const expList = app.pis?.work_experience || [];
                const isFresh = expList.length === 0;
                if (freshGradFilter === 'yes' && !isFresh) return false;
                if (freshGradFilter === 'no' && isFresh) return false;
            }

            // Recruiter
            if (selectedRecruiterName) {
                const rec = app.assigned_recruiter_name || app.interviewer_name || '';
                if (!rec.toUpperCase().includes(selectedRecruiterName.toUpperCase())) return false;
            }

            // LOB Filter (multi-select)
            if (lobFilters.length > 0) {
                const appLob = getAppStrictLob(app, mhrtAccounts, departmentsList).toUpperCase();
                if (!lobFilters.some(f => f.toUpperCase() === appLob)) return false;
            }

            // Hiring Type Filter (multi-select)
            if (hiringTypeFilters.length > 0) {
                const type = ((app as any).hiring_type || (app as any).metadata?.hiring_type || '').toUpperCase();
                const isInternal = type.includes('INTERNAL') || type === 'BILLED';
                const matchesAny = hiringTypeFilters.some(f => {
                    if (f === 'INTERNAL') return isInternal;
                    if (f === 'EXTERNAL') return !isInternal;
                    return false;
                });
                if (!matchesAny) return false;
            }

            // Central Account Filter (multi-select)
            if (selectedDeptNames.length > 0) {
                const accounts = getTrueAccounts(app).map(a => a.toUpperCase());
                if (!selectedDeptNames.some(d => accounts.includes(d.toUpperCase()))) return false;
            }

            return true;
        });
    }, [apps, selectedDeptNames, lobFilters, hiringTypeFilters, dateAppliedFilter, initialInterviewFilter, trainingStartFilter, opsValFilter, selectedRecruiterName, expFilter, freshGradFilter, eduFilter, genderFilter, isAccountFilterEnabled, user, mhrtAccounts, departmentsList]);

    // Unique lists
    const availableLobs = useMemo(() => {
        const lobsSet = new Set<string>();

        // 1. From mhrtAccounts (strictly filtered by selectedDeptName)
        (mhrtAccounts || []).forEach(a => {
            const accName = (a.account || '').trim().toUpperCase();
            if (selectedDeptNames.length === 0 || selectedDeptNames.some(d => d.toUpperCase() === accName)) {
                const lob = String(a.lob || '').trim().toUpperCase();
                if (lob && lob !== 'UNSPECIFIED JOB POSITION') {
                    if (accName === 'ONCOURSE' || lob !== 'AGENT') {
                        lobsSet.add(lob);
                    }
                }
            }
        });

        // 2. From apps using getAppStrictLob
        (apps || []).forEach(app => {
            const acc = getTrueAccount(app).toUpperCase();
            if (selectedDeptNames.length === 0 || selectedDeptNames.some(d => d.toUpperCase() === acc)) {
                const lob = getAppStrictLob(app, mhrtAccounts, departmentsList);
                if (lob && lob !== 'UNSPECIFIED JOB POSITION') {
                    lobsSet.add(lob);
                }
            }
        });

        return Array.from(lobsSet).sort();
    }, [mhrtAccounts, apps, selectedDeptNames, departmentsList]);

    const availableAccounts = useMemo(() => {
        const appAccounts = (apps || []).map(a => getTrueAccount(a).toUpperCase()).filter(Boolean);
        const accountNames = (mhrtAccounts || []).map(a => (a.account || '').toUpperCase()).filter(Boolean);
        const systemDeptNames = (departmentsList || []).map(d => d.name.toUpperCase());
        return Array.from(new Set([...appAccounts, ...accountNames, ...systemDeptNames]))
            .filter(name => name !== 'UNASSIGNED')
            .sort((a, b) => a.localeCompare(b));
    }, [apps, mhrtAccounts, departmentsList]);

    const availableRecruiters = useMemo(() => {
        const names = apps.map(a => a.assigned_recruiter_name || a.interviewer_name).filter((n): n is string => typeof n === 'string' && n.toUpperCase() !== 'UNASSIGNED');
        return Array.from(new Set(names)).sort();
    }, [apps]);

    const availableStartDates = useMemo(() => {
        const dates = new Set<string>();
        apps.forEach(app => {
            const d = app.master_training_start_date;
            if (d && d.trim() && d !== 'TBD') {
                dates.add(d.trim());
            }
        });
        return Array.from(dates).sort((a, b) => b.localeCompare(a));
    }, [apps]);

    return {
        loading,
        isInitialized,
        isSyncing,
        apps,
        positions,
        departmentsList,
        systemUsers,
        mhrtAccounts,
        filteredApps,
        availableAccounts,
        availableLobs,
        availableRecruiters,
        availableStartDates,
        getOutcome,
        categorizeEducation,
        categorizeExperience,
        // Filter bindings
        selectedDeptNames, setSelectedDeptNames,
        lobFilters, setLobFilters,
        hiringTypeFilters, setHiringTypeFilters,
        dateAppliedFilter, setDateAppliedFilter,
        initialInterviewFilter, setInitialInterviewFilter,
        trainingStartFilter, setTrainingStartFilter,
        opsValFilter, setOpsValFilter,
        selectedRecruiterName, setSelectedRecruiterName,
        expFilter, setExpFilter,
        freshGradFilter, setFreshGradFilter,
        eduFilter, setEduFilter,
        genderFilter, setGenderFilter,
        isExclusiveMode, setIsExclusiveMode
    };
}
