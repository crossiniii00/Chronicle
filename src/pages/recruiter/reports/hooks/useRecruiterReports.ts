import { useState, useMemo, useEffect, useCallback } from 'react';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { DepartmentService } from '@/services/DepartmentService';
import { UserService } from '@/services/UserService';
import { MhrtService, MHRTAccount } from '@/services/MhrtService';
import { socketService } from '@/services/socketService';
import type { Application } from '@/types/application';
import type { Position } from '@/types/position';
import type { User } from '@/types/user';

export type DeptMetrics = {
    name: string;
    jobs: JobMetrics[];
    total: {
        Applicants: number;
        Active: number;
        Endorsed: number;
        Hired: number;
        Failed: number;
        Withdrawn: number;
        quota: number;
        attainment: number;
        conversionRate: number; // Endorsed -> Hired
        yieldRate: number;      // Applicants -> Hired
        endorsementRate: number; // Applicants -> Endorsed
    };
    efficiency: {
        Active: number;
        Endorsed: number;
        Hired: number;
        Failed: number;
        Withdrawn: number;
    };
};

export type JobMetrics = {
    id: string;
    title: string;
    department: string;
    counts: {
        Applicants: number;
        Endorsed: number;
        Hired: number;
        Failed: number;
        Withdrawn: number;
        Active: number;
    };
    percentages: {
        Applicants: number;
        Endorsed: number;
        Hired: number;
        Failed: number;
        Withdrawn: number;
        Active: number;
    };
};

export const STATUS_COLORS = {
    Applicants: '#0078d4',
    Active: '#0078d4',
    Endorsed: '#f59e0b',
    Hired: '#107c10',
    Failed: '#d13438',
    Withdrawn: '#605e5c'
};

export function useRecruiterReports(user: any) {
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [apps, setApps] = useState<Application[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [mhrtAccounts, setMhrtAccounts] = useState<MHRTAccount[]>([]);
    const [departmentsList, setDepartmentsList] = useState<{ id: string, name: string }[]>([]);
    const [systemUsers, setSystemUsers] = useState<User[]>([]);

    const [selectedDeptName, setSelectedDeptName] = useState<string | null>(null);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [dateMode, setDateMode] = useState<'all' | 'today' | '7' | '30' | '90' | 'current_month' | 'specific' | 'range'>('all');
    const [specificDate, setSpecificDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedRecruiterName, setSelectedRecruiterName] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'count' | 'percent'>('count');
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
 
    // 1. Status Intelligence Engine (Maps multiple disparate status fields to a unified outcome)
    const getApplicantOutcome = useCallback((app: Application) => {
        const p = (app.pis || app.metadata || {}) as any;
        const status = (app.current_status || '').toUpperCase();
        
        // Fuzzy metadata retrieval
        const finalSpec = String(p.final_specific_status || p['Final Specific Status'] || p['Specific Status'] || '').toUpperCase();
        const overall = String(p.overall_status || p['Overall Status'] || '').toUpperCase();
        const initial = String(p.initial_interview_results || p.initial_interview_result || p['Initial Interview Result'] || '').toUpperCase();
        const second = String(p.second_level_interview_result || p['Second Level Interview Result'] || '').toUpperCase();
        const finalInt = String(p.final_interview_result || p['Final Interview Result'] || '').toUpperCase();

        // Strict EID check: Ignore small numbers which are often just row IDs from spreadsheets
        const hasValidEid = app.master_eid && String(app.master_eid).length >= 4;

        const isHired = status === 'HIRED' || status === 'HIRED_PROCESSED' || status === 'ACCEPTED_OFFER' || status === 'ACCEPTED OFFER' || overall === 'HIRED' || hasValidEid;
        
        const isFailed = status === 'FAILED' || status === 'REJECTED' || overall === 'FAILED' || overall === 'REJECTED' ||
                         finalSpec.includes('FAILED') || finalSpec.includes('REJECTED') ||
                         initial.includes('FAILED') || second.includes('FAILED') || finalInt.includes('FAILED');

        const isWithdrawn = status === 'WITHDRAWN' || status === 'FALLOUT' || overall === 'WITHDRAWN' ||
                            initial.includes('WITHDRAWN') || finalSpec.includes('WITHDRAWN');

        // ENDORSED means the candidate has been fully endorsed to the account/client.
        // We do NOT count initial/second interview passes as "endorsed" — those are just pipeline progression.
        // Only explicit top-level statuses or overall/final verdicts count.
        const isEndorsed = isHired || ['PASSED', 'FOR_JO', 'FOR_JOB_OFFER', 'ENDORSED', 'SENT_JO_AND_BGC', 'ACCEPTED_OFFER', 'FOR_PAN'].includes(status) || 
                           finalSpec.includes('PASSED') || overall === 'PASSED' ||
                           finalInt.includes('PASSED') ||
                           finalSpec.includes('CONDITIONAL');

        return { isHired, isFailed, isEndorsed, isWithdrawn };
    }, []);

    const { accountLookup, getNormalizedName } = useMemo(() => {
        const lookup = new Map<string, string>();
        const safeMhrt = mhrtAccounts || [];
        safeMhrt.forEach(a => {
            const accName = (a.account || '').trim().toUpperCase();
            const lobCode = (a.lob || '').trim().toUpperCase();
            if (accName && lobCode) lookup.set(lobCode, accName);
            if (accName) lookup.set(accName, accName);
        });

        const recoveryMap: Record<string, string> = {
            'DD': 'DOORDASH',
            'DOORDASH': 'DOORDASH',
            'ENER': 'ENERCARE',
            'ENERCARE': 'ENERCARE',
            'OONI': 'OONI',
            'EXACT': 'EXACT SCIENCES',
            'EXACT SCIENCES': 'EXACT SCIENCES',
            'GRID': 'GRIDMATIC',
            'IWIRE': 'IWIRELESS',
            'NJS': 'NJS',
            'PENDING': 'PENDING'
        };
 
        return {
            accountLookup: lookup,
            getNormalizedName: (raw: string | null | undefined, appMetadata?: any) => {
                let upper = (raw || '').trim().toUpperCase();
                
                // Fallback to metadata if raw is blank (Look specifically for Initial Account Assignment)
                if (!upper && appMetadata) {
                    const p = (appMetadata.pis || {}) as any;
                    // Support both the common spreadsheet typo "INITITAL" and the correct "INITIAL"
                    upper = String(
                        p.initial_account_assignment || 
                        p['INITIAL ACCOUNT ASSIGNMENT'] ||
                        p.final_account || 
                        p['Final Account'] || 
                        ''
                    ).trim().toUpperCase();
                }

                if (recoveryMap[upper]) return recoveryMap[upper];
                return lookup.get(upper) || upper;
            }
        };
    }, [mhrtAccounts]);

    const availableAccounts = useMemo(() => {
        const accountNames = (mhrtAccounts || []).map(a => (a.account || '').toUpperCase()).filter(Boolean);
        const systemDeptNames = (departmentsList || []).map(d => d.name.toUpperCase());
        return Array.from(new Set([...accountNames, ...systemDeptNames])).sort((a, b) => a.localeCompare(b));
    }, [mhrtAccounts, departmentsList]);

    const loadData = useCallback(async (showFullLoader = false) => {
        if (!user) return;
        if (showFullLoader) setLoading(true);
        else setIsSyncing(true);

        try {
            const [fetchedApps, fetchedPositions, fetchedDepts, fetchedUsers, fetchedMhrt] = await Promise.all([
                ApplicationService.getAll(),
                PositionService.getAll(),
                DepartmentService.getAll(),
                UserService.getAll(),
                MhrtService.getAccounts()
            ]);
            const uniqueApps = Array.from(new Map((fetchedApps || []).map(a => [a.id, a])).values());
            setApps(uniqueApps);
            setPositions(fetchedPositions);
            setDepartmentsList(fetchedDepts || []);
            setSystemUsers(fetchedUsers || []);
            setMhrtAccounts(fetchedMhrt || []);
        } catch (error) {
            console.error("Failed to load reports data:", error);
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    }, [user]);

    useEffect(() => {
        loadData(true);
        const socket = socketService.getSocket();
        
        socket.on('applications:updated', () => {
            console.log('[Socket] Applications updated, refreshing dashboard...');
            loadData(false);
        });

        const interval = setInterval(() => loadData(false), 60000); // Fallback polling
        
        return () => {
            socket.off('applications:updated');
            clearInterval(interval);
        };
    }, [loadData]);
 
    // HELPER: Resolve a consistent identity key (FIRST LAST) across different data formats
    const resolveIdentityKey = (app: Application): string | null => {
        let rawName = (app.applicant_name || '').trim();
        const first = (app.master_first_name || '').trim();
        const last = (app.master_last_name || '').trim();

        let resolved = '';

        if (first || last) {
            // Masterlist format: reconstruct as FIRST LAST
            resolved = `${first} ${last}`.trim();
        } else if (rawName) {
            // Interview Sheet format: handle "Last, First" or "First Last"
            if (rawName.includes(',')) {
                const parts = rawName.split(',').map(p => p.trim());
                resolved = `${parts[1]} ${parts[0]}`.trim(); // Flip to First Last
            } else {
                resolved = rawName;
            }
        }

        // Final normalization: Remove extra spaces, special chars, and uppercase
        return resolved.replace(/\s+/g, ' ').toUpperCase() || null;
    };

    // 2. Unified Candidate Engine (Merges SHEET and MASTERLIST records by name)
    const unifiedApps = useMemo(() => {
        const nameGroups = new Map<string, Application[]>();
        
        apps.forEach(app => {
            const name = resolveIdentityKey(app);
            if (!name) return;
            if (!nameGroups.has(name)) nameGroups.set(name, []);
            nameGroups.get(name)!.push(app);
        });
 
        return Array.from(nameGroups.values()).map(group => {
            // STABILITY FIX: Sort group by outcome priority so the Master Record is deterministic
            group.sort((a, b) => {
                const outcomeA = getApplicantOutcome(a);
                const outcomeB = getApplicantOutcome(b);
                
                // Priority: Hired (3) > Failed (2) > Endorsed (1) > Active (0)
                const getScore = (o: any) => {
                    if (o.isHired) return 3;
                    if (o.isFailed) return 2;
                    if (o.isEndorsed) return 1;
                    return 0;
                };
                
                return getScore(outcomeB) - getScore(outcomeA);
            });

            // STABILITY FIX: Prioritize SHEET pipeline records for reporting integrity
            const masterRec = group.find(a => (a.master_column || '').toUpperCase() === 'SHEET') || 
                             group.find(a => !!a.master_eid && String(a.master_eid).length >= 4) || 
                             group[0];
            
            // Merge variables: If one has HIRED status, they all are HIRED in the eyes of reporting
            const hasHired = group.some(a => (a.current_status || '').toUpperCase() === 'HIRED' || (!!a.master_eid && String(a.master_eid).length >= 4));
            
            return {
                ...masterRec,
                current_status: hasHired ? 'HIRED' : masterRec.current_status,
                // Combine other key flags if needed
                is_merged: group.length > 1
            };
        });
    }, [apps, getApplicantOutcome]);
 
    const baseFilteredApps = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
 
        return unifiedApps.filter(app => {
            if (dateMode !== 'all') {
                const appDateObj = new Date(app.applied_at);
                const appDateStr = appDateObj.toISOString().split('T')[0];

                if (dateMode === 'today' && appDateStr !== todayStr) return false;
                if (dateMode === 'current_month') {
                    if (appDateObj.getMonth() !== now.getMonth() || appDateObj.getFullYear() !== now.getFullYear()) return false;
                }
                if (dateMode === 'specific' && appDateStr !== specificDate) return false;
                if (dateMode === 'range' && startDate && endDate) {
                    if (appDateStr < startDate || appDateStr > endDate) return false;
                }
                if (['7', '30', '90'].includes(dateMode)) {
                    const days = parseInt(dateMode);
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - days);
                    if (appDateObj < cutoff) return false;
                }
            }
            if (selectedRecruiterName) {
                const recName = app.assigned_recruiter_name || 'Unassigned';
                if (recName !== selectedRecruiterName) return false;
            }
            // STRICT PIPELINE ISOLATION: Only include candidates in the active SHEET recruitment pipeline or the new WEBAPP pipeline
            const col = (app.master_column || '').toUpperCase();
            if (col !== 'SHEET' && app.source !== 'WEBAPP') return false;

            const normDept = getNormalizedName(app.department, app);

            if (selectedDeptName) {
                if (normDept !== selectedDeptName) return false;
            }
            
            if (selectedJobId && app.position_id !== selectedJobId) return false;
            return true;
        });
    }, [unifiedApps, dateMode, specificDate, startDate, endDate, selectedRecruiterName, selectedDeptName, selectedJobId, getNormalizedName, availableAccounts]);

    const filteredApps = useMemo(() => {
        // This is the SHEET/WEBAPP specific list for detail tables
        // We explicitly look for ANY candidate who has a record in the pipeline
        return unifiedApps.filter(app => {
            const col = (app.master_column || '').toUpperCase();
            return col === 'SHEET' || app.source === 'WEBAPP';
        });
    }, [unifiedApps]);

    const processedData = useMemo(() => {
        const deptMap = new Map<string, DeptMetrics>();
        
        // 1. Initialize all departments found in the registry OR positions
        // ONLY include those that are tagged with an official MHRT Account name
        const safeApps = unifiedApps || [];
        const safePositions = positions || [];
        const safeMhrtAccounts = mhrtAccounts || [];
 
        const accountNames = safeMhrtAccounts.map(a => (a.account || '').trim().toUpperCase()).filter(Boolean);
        const systemDeptNames = (departmentsList || []).map(d => d.name.toUpperCase());
        const goldStandard = Array.from(new Set([...accountNames, ...systemDeptNames]));
        
        // 2. GENERATE FILTER LIST (Strictly from Registry)
        // We only show accounts that exist in our official MHRT or System Registry
        const allDeptNames = Array.from(new Set(goldStandard))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        allDeptNames.forEach(name => {
            deptMap.set(name, {
                name,
                jobs: [],
                total: { 
                    Applicants: 0, Active: 0, Endorsed: 0, Hired: 0, Failed: 0, Withdrawn: 0, 
                    quota: 25, attainment: 0, conversionRate: 0, yieldRate: 0, endorsementRate: 0 
                },
                efficiency: { Endorsed: 0, Hired: 0, Failed: 0, Withdrawn: 0, Active: 0 }
            });
        });

        // 2. Populate Totals using a SINGLE pass over applications
        const safeFilteredApps = baseFilteredApps || [];
        
        // Optimization: Use a map to store job-level metrics temporarily
        const jobMetricsMap = new Map<string, { Applicants: number, Hired: number, Endorsed: number, Failed: number, Withdrawn: number, Active: number }>();

        safeFilteredApps.forEach(app => {
            const deptName = getNormalizedName(app.department, app) || 'UNMAPPED';
            
            if (!deptMap.has(deptName)) {
                deptMap.set(deptName, {
                    name: deptName,
                    jobs: [],
                    total: { 
                        Applicants: 0, Active: 0, Endorsed: 0, Hired: 0, Failed: 0, Withdrawn: 0, 
                        quota: 25, attainment: 0, conversionRate: 0, yieldRate: 0, endorsementRate: 0 
                    },
                    efficiency: { Endorsed: 0, Hired: 0, Failed: 0, Withdrawn: 0, Active: 0 }
                });
            }

            const dept = deptMap.get(deptName)!;
            dept.total.Applicants++;
            const outcome = getApplicantOutcome(app);

            if (outcome.isHired) {
                dept.total.Hired++;
                dept.total.Endorsed++; 
            } else if (outcome.isEndorsed) {
                dept.total.Endorsed++;
            } else if (outcome.isFailed) {
                dept.total.Failed++;
            } else if (outcome.isWithdrawn) {
                dept.total.Withdrawn++;
            } else {
                dept.total.Active++;
            }

            // Track job-level metrics for later
            const jobKey = app.position_id || `${app.position_title}|${deptName}`;
            if (!jobMetricsMap.has(jobKey)) {
                jobMetricsMap.set(jobKey, { Applicants: 0, Hired: 0, Endorsed: 0, Failed: 0, Withdrawn: 0, Active: 0 });
            }
            const jm = jobMetricsMap.get(jobKey)!;
            jm.Applicants++;
            if (outcome.isHired) { jm.Hired++; jm.Endorsed++; }
            else if (outcome.isEndorsed) jm.Endorsed++;
            else if (outcome.isFailed) jm.Failed++;
            else if (outcome.isWithdrawn) jm.Withdrawn++;
            else jm.Active++;
        });

        // 3. Populate Job-level metrics using the pre-calculated map
        safePositions.forEach(pos => {
            const deptName = getNormalizedName(pos.department);
            const dept = deptMap.get(deptName);
            if (dept) {
                const jobKey = pos.id || `${pos.title}|${deptName}`;
                const jm = jobMetricsMap.get(jobKey) || { Applicants: 0, Hired: 0, Endorsed: 0, Failed: 0, Withdrawn: 0, Active: 0 };
                
                const divisor = Math.max(jm.Applicants, 1);
                dept.jobs.push({
                    id: pos.id,
                    title: pos.title,
                    department: pos.department,
                    counts: { ...jm },
                    percentages: {
                        Applicants: 100,
                        Hired: (jm.Hired / divisor) * 100,
                        Endorsed: (jm.Endorsed / divisor) * 100,
                        Failed: (jm.Failed / divisor) * 100,
                        Withdrawn: (jm.Withdrawn / divisor) * 100,
                        Active: (jm.Active / divisor) * 100
                    }
                });
            }
        });

        // 4. Calculate Efficiency Percentages for Departments
        deptMap.forEach(dept => {
            const total = Math.max(dept.total.Applicants, 1);
            const endorsed = Math.max(dept.total.Endorsed, 0);
            const hired = dept.total.Hired;

            dept.total.attainment = (hired / Math.max(dept.total.quota, 1)) * 100;
            dept.total.yieldRate = (hired / total) * 100;
            dept.total.endorsementRate = (endorsed / total) * 100;
            dept.total.conversionRate = endorsed > 0 ? (hired / endorsed) * 100 : 0;

            dept.efficiency = {
                Hired: (hired / total) * 100,
                Endorsed: (endorsed / total) * 100,
                Failed: (dept.total.Failed / total) * 100,
                Withdrawn: (dept.total.Withdrawn / total) * 100,
                Active: (dept.total.Active / total) * 100
            };
        });

        return Array.from(deptMap.values()).filter(d => d.total.Applicants > 0);
    }, [baseFilteredApps, positions, unifiedApps, mhrtAccounts]);

    const globalMetrics = useMemo(() => {
        let total = 0, hired = 0, endorsedOnly = 0, rejected = 0, withdrawn = 0, pending = 0;
        
        baseFilteredApps.forEach(a => {
            total++;
            const outcome = getApplicantOutcome(a);
            if (outcome.isHired) hired++;
            else if (outcome.isEndorsed) endorsedOnly++;
            else if (outcome.isFailed) rejected++;
            else if (outcome.isWithdrawn) withdrawn++;
            else pending++;
        });
        
        const totalEndorsed = endorsedOnly + hired; 
        const totalQuota = (availableAccounts.length || 1) * 25; 
        const unifiedNames = new Set(unifiedApps.map(a => resolveIdentityKey(a)).filter(Boolean));
  
        return {
            totalApps: total,
            totalHired: hired,
            totalEndorsed: totalEndorsed,
            totalFailed: rejected,
            totalPending: pending,
            hiringRate: total > 0 ? (hired / total) * 100 : 0,
            conversionRate: totalEndorsed > 0 ? (hired / totalEndorsed) * 100 : 0,
            failedRate: total > 0 ? (rejected / total) * 100 : 0,
            withdrawalRate: total > 0 ? (withdrawn / total) * 100 : 0,
            masterlistCount: unifiedNames.size,
            quotaAttainment: (hired / totalQuota) * 100
        };
    }, [unifiedApps, baseFilteredApps, availableAccounts, getApplicantOutcome]);

    const funnelData = useMemo(() => {
        const total = baseFilteredApps.length;
        if (total === 0) return [];

        const hired = baseFilteredApps.filter(a => getApplicantOutcome(a).isHired).length;
        const endorsedOnly = baseFilteredApps.filter(a => {
            const outcome = getApplicantOutcome(a);
            return outcome.isEndorsed && !outcome.isHired;
        }).length;
        const failed = baseFilteredApps.filter(a => getApplicantOutcome(a).isFailed).length;
        const pending = baseFilteredApps.filter(a => {
            const outcome = getApplicantOutcome(a);
            return !outcome.isHired && !outcome.isFailed && !outcome.isEndorsed;
        }).length;

        return [
            { stage: 'Total Applicants', count: total, color: 'from-[#3b82f6] to-[#60a5fa]' },
            { stage: 'Endorsed to Account', count: endorsedOnly + hired, color: 'from-[#f59e0b] to-[#fbbf24]' },
            { stage: 'Confirmed Hires', count: hired, color: 'from-[#10b981] to-[#34d399]' },
            { stage: 'Pending Candidates', count: pending, color: 'from-[#8b5cf6] to-[#a78bfa]' },
            { stage: 'Failed Candidates', count: failed, color: 'from-[#ef4444] to-[#f87171]' }
        ];
    }, [baseFilteredApps, getApplicantOutcome]);

    const monthlyTrendData = useMemo(() => {
        // Determine the reference date for the trend graph
        let refDate = new Date();
        if (dateMode === 'specific' && specificDate) refDate = new Date(specificDate);
        if (dateMode === 'range' && startDate) refDate = new Date(startDate);

        const year = refDate.getFullYear();
        const month = refDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const trend = Array.from({ length: daysInMonth }, (_, i) => ({
            day: i + 1,
            total: 0,
            hired: 0,
            failed: 0,
            breakdown: {} as Record<string, number>
        }));

        filteredApps.forEach(app => {
            const date = new Date(app.applied_at);
            if (date.getFullYear() === year && date.getMonth() === month) {
                const day = date.getDate();
                if (day > 0 && day <= daysInMonth) {
                    const status = (app.current_status || '').toUpperCase();
                    const finalSpec = (app.pis?.final_specific_status || '').toUpperCase();
                    const overall = (app.pis?.overall_status || '').toUpperCase();
                    const dayData = trend[day - 1];
                    dayData.total++;
                    
                    // Track breakdown by account for the day
                    const account = getNormalizedName(app.department, app) || 'General';
                    dayData.breakdown[account] = (dayData.breakdown[account] || 0) + 1;
                    
                    const { isHired, isFailed } = getApplicantOutcome(app);

                    if (isHired) {
                        dayData.hired++;
                    } else if (isFailed) {
                        dayData.failed++;
                    }
                }
            }
        });
        return trend;
    }, [filteredApps, dateMode, specificDate, startDate, getNormalizedName, getApplicantOutcome]);
    

    return {
        loading, isSyncing, apps, positions, departmentsList, systemUsers,
        selectedDeptName, setSelectedDeptName,
        selectedJobId, setSelectedJobId,
        dateMode, setDateMode,
        specificDate, setSpecificDate,
        startDate, setStartDate,
        endDate, setEndDate,
        selectedRecruiterName, setSelectedRecruiterName,
        viewMode, setViewMode,
        isAdvancedFiltersOpen, setIsAdvancedFiltersOpen,
        filteredApps, processedData, globalMetrics, monthlyTrendData, funnelData, availableAccounts,
        loadData
    };
}
