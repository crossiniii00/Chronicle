import { useState, useEffect, useMemo } from 'react';
import { UserService } from '@/services/UserService';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import type { User } from '@/types/user';
import type { Application, StatusHistoryEntry } from '@/types/application';
import type { Position } from '@/types/position';
import { socketService } from '@/services/socketService';
import { DateFilterState } from '@/components/common/AdvancedDateFilter';
import { useAccountTypeSettings } from '../../hooks/useAccountTypeSettings';
import { useGlobalDataStore } from '@/store/globalDataStore';

export interface DetailedApplicant {
    id: string;
    name: string;
    department: string;
    jobTitle: string;
    activityCount: number;
    status: 'SCREENED' | 'ENDORSED' | 'ENDORSED_OVER' | 'ENDORSED_OPS' | 'DROPPED' | 'NO_SHOW' | 'OTHER' | 'PENDING' | 'PASSED' | 'FAILED' | 'H2R INACTIVE' | 'H2R_INACTIVE';
    lastActionAt: string;
}

export interface EmployeeStats {
    user: User;
    interviewed: number;
    endorsed: number;
    endorsedOver: number;
    endorsedOps: number;
    failed: number;
    noShow: number;
    totalHandled: number;
    uniqueApplicants: number;
    detailedApplicants: DetailedApplicant[];
    recentActivity: StatusHistoryEntry[];
}

const getLocalISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export function useEmployeeTracker() {
    const { getRoleType, activeRoles, getLabel } = useAccountTypeSettings();
    const { applications, isInitialized } = useGlobalDataStore();
    const [users, setUsers] = useState<User[]>([]);
    const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<EmployeeStats | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [jobFilter, setJobFilter] = useState('ALL');
    
    const [dateFilter, setDateFilter] = useState<DateFilterState>(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            type: 'MONTH',
            start: getLocalISODate(firstDay),
            end: getLocalISODate(lastDay)
        };
    });
    
    
    const [modalTab, setModalTab] = useState<'applicants' | 'endorsed' | 'failed' | 'logs'>('applicants');
    const [modalStatFilter, setModalStatFilter] = useState<'ALL' | 'TOTAL' | 'SCREENED' | 'ENDORSED' | 'DROPPED' | 'NO_SHOW' | 'PENDING' | 'PASSED' | 'FAILED'>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeTab, setActiveTab] = useState<'ops' | 'recruiter'>('ops');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setDeptFilter('ALL');
        setJobFilter('ALL');
    }, [activeTab]);

    const loadData = async () => {
        try {
            const [u, h, p, d] = await Promise.all([
                UserService.getAll(),
                ApplicationService.getAllStatusHistory(),
                PositionService.getAll(),
                DepartmentService.getAll()
            ]);

            setUsers(u.filter(user => user.role !== 'admin'));
            setHistory(h);
            setPositions(p);
            setDepartments(d);
        } catch (err) {
            console.error("Failed to load employee data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isInitialized) {
            loadData();
        } else {
            // Still need to load users, history, positions, departments if global store initialized apps
            loadData();
        }
    }, [isInitialized]);

    const normalizeRecruiterName = (name: string | null | undefined): string => {
        if (!name) return '';
        const trimmed = name.trim();
        const lower = trimmed.toLowerCase();
        
        const found = users.find(u => {
            const staffNameLower = u.full_name.toLowerCase();
            if (staffNameLower === lower) return true;
            
            const inputWords = lower.split(/\s+/).filter(Boolean);
            if (inputWords.length > 1 && inputWords.every(w => staffNameLower.includes(w))) {
                return true;
            }
            
            const staffWords = staffNameLower.split(/\s+/).filter(Boolean);
            if (staffWords.length > 1 && staffWords.every(w => lower.includes(w))) {
                return true;
            }
            return false;
        });
        
        return found ? found.full_name : trimmed;
    };

    const updateApplicantStatus = async (appId: string, toStatus: string) => {
        try {
            // Find current user from some context or just use a default for admin dashboard
            // Assuming this is run by an admin viewing the tracker
            await ApplicationService.updateStatus({
                id: appId,
                toStatus: toStatus as any,
                changedByName: 'Admin System' // In a real app, this would be the logged-in admin
            });
            await loadData(); // Refresh everything
        } catch (err) {
            console.error("Failed to update applicant status:", err);
        }
    };

    // Index lookups for O(1) performance in nested loops
    const historyByPerson = useMemo(() => {
        const map = new Map<string, StatusHistoryEntry[]>();
        history.forEach(h => {
            const list = map.get(h.changed_by_name) || [];
            list.push(h);
            map.set(h.changed_by_name, list);
        });
        return map;
    }, [history]);

    const applicationsMap = useMemo(() => new Map(applications.map(a => [a.id, a])), [applications]);
    const positionsMap = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);

    const accountsList = useMemo(() => {
        const set = new Set<string>();
        departments.forEach(d => {
            if (d.name) set.add(d.name.trim());
        });
        users.forEach(u => {
            if (u.sector) set.add(u.sector.trim());
            if (u.department) {
                u.department.split(',').forEach(d => {
                    const trimmed = d.trim();
                    if (trimmed) set.add(trimmed);
                });
            }
        });
        return Array.from(set).sort();
    }, [departments, users]);

    const recruiterRolesList = useMemo(() => {
        return activeRoles.filter((r: string) => getRoleType(r) === 'recruiter');
    }, [activeRoles, getRoleType]);

    const groupedStats = useMemo(() => {
        // Step 0: Pre-parse date ranges for fast timestamp comparisons
        let filterStartDate = -Infinity;
        let filterEndDate = Infinity;
        
        if (dateFilter.type !== 'ALL' && dateFilter.start) {
            const [startY, startM, startD] = dateFilter.start.split('-').map(Number);
            filterStartDate = new Date(startY, startM - 1, startD, 0, 0, 0, 0).getTime();
            
            if (dateFilter.end) {
                const [endY, endM, endD] = dateFilter.end.split('-').map(Number);
                filterEndDate = new Date(endY, endM - 1, endD, 23, 59, 59, 999).getTime();
            } else {
                filterEndDate = new Date(startY, startM - 1, startD, 23, 59, 59, 999).getTime();
            }
        }

        const isWithinDateRange = (dateStr: string | null | undefined) => {
            if (dateFilter.type === 'ALL') return true;
            if (!dateStr) return false;
            const t = new Date(dateStr).getTime();
            return !isNaN(t) && t >= filterStartDate && t <= filterEndDate;
        };

        // Pre-compute normalized application assignments for O(1) lookups
        const appsByRecruiter = new Map<string, typeof applications>();
        const appsByOps = new Map<string, typeof applications>();
        const appsByScheduledBy = new Map<string, typeof applications>();

        applications.forEach(a => {
            // Recruiter Assignment
            const rawRecruiter = a.assigned_recruiter_name || a.interviewer_name;
            if (rawRecruiter) {
                const norm = normalizeRecruiterName(rawRecruiter).toLowerCase();
                const list = appsByRecruiter.get(norm) || [];
                list.push(a);
                appsByRecruiter.set(norm, list);
            }

            // Ops Validator Assignment
            if (a.assigned_ops_validator_name) {
                const norm = a.assigned_ops_validator_name.toLowerCase();
                const list = appsByOps.get(norm) || [];
                list.push(a);
                appsByOps.set(norm, list);
            }

            // Scheduled By
            if (a.scheduled_by) {
                const norm = normalizeRecruiterName(a.scheduled_by).toLowerCase();
                const list = appsByScheduledBy.get(norm) || [];
                list.push(a);
                appsByScheduledBy.set(norm, list);
            }
        });

        // Step 1: Filter users first to avoid expensive calculations for invisible entries
        const filteredUsers = users.filter(user => {
            const matchesSearch = user.full_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            if (!matchesSearch) return false;

            const isOpsUser = getRoleType(user.role) === 'ops_validator';
            const isRecruiterUser = getRoleType(user.role) === 'recruiter';

            if (isOpsUser) {
                if (activeTab === 'ops' && deptFilter !== 'ALL') {
                    const userDepts = user.department ? user.department.split(',').map(d => d.trim().toUpperCase()) : [];
                    const matchesAccount = userDepts.includes(deptFilter.toUpperCase()) || 
                                           (user.sector && user.sector.toUpperCase() === deptFilter.toUpperCase());
                    if (!matchesAccount) return false;
                }
            } else if (isRecruiterUser) {
                if (activeTab !== 'ops' && deptFilter !== 'ALL' && user.role !== deptFilter) {
                    return false;
                }
            } else {
                return false;
            }

            return true;
        });

        const stats = filteredUsers.map(user => {
            const userHistory = historyByPerson.get(user.full_name) || [];

             const filteredHistory = userHistory.filter(h => {
                if (!isWithinDateRange(h.changed_at)) return false;
                if (activeTab !== 'ops' && jobFilter !== 'ALL') {
                    const app = applicationsMap.get(h.application_id);
                    if (app?.position_id !== jobFilter) return false;
                }
                return true;
            });

            // Find applications directly assigned to this recruiter or ops validator using precomputed maps
            const isRecruiter = getRoleType(user.role) === 'recruiter';
            const isOps = getRoleType(user.role) === 'ops_validator';
            const userNameLower = user.full_name.toLowerCase();
            
            const assignedApps = isRecruiter 
                ? (appsByRecruiter.get(userNameLower) || [])
                : isOps
                    ? (appsByOps.get(userNameLower) || [])
                    : [];

            const filteredAssignedApps = assignedApps.filter(app => {
                const hasRecentHistory = userHistory.some(h => h.application_id === app.id && isWithinDateRange(h.changed_at));
                const isRecentApp = isWithinDateRange(app.interview_completed_at || app.created_at);
                if (!hasRecentHistory && !isRecentApp && dateFilter.type !== 'ALL') return false;

                if (activeTab !== 'ops' && jobFilter !== 'ALL' && app.position_id !== jobFilter) return false;
                return true;
            });

            const assignedAppIds = filteredAssignedApps.map(a => a.id);
            const scheduledAppIds = isRecruiter ? (appsByScheduledBy.get(userNameLower) || []).filter(a => {
                const hasRecentHistory = userHistory.some(h => h.application_id === a.id && isWithinDateRange(h.changed_at));
                
                // If they have no history but a meeting date, use that.
                // Or if they were created this month.
                const isRecentApp = isWithinDateRange(a.endorsement_meeting_date || a.created_at);
                if (!hasRecentHistory && !isRecentApp && dateFilter.type !== 'ALL') return false;
                return true;
            }).map(a => a.id) : [];
            const baseAppIds = Array.from(new Set([...filteredHistory.map(h => h.application_id), ...assignedAppIds, ...scheduledAppIds]));

            const appIds = baseAppIds.filter(id => {
                const app = applicationsMap.get(id);
                if (!app) return true;
                const p = (app.pis || {}) as any;
                const initialResult = String(
                    p.initial_interview_results || p.initial_interview_result ||
                    p['Initial Interview Result'] || p['INITITAL INTERVIEW RESULTS'] || p.ii_result || ''
                ).toUpperCase();
                const hasPassedInitial = initialResult === 'PASSED' || initialResult === 'RECRUITMENT INTERVIEW - PASSED';

                const fromStatus = String(app.failure_details?.from_status || '').toUpperCase();
                const isTypingTestOrApplied = fromStatus === 'TYPING_TEST' || fromStatus === 'APPLIED' || app.current_status === 'TYPING_TEST';
                const hasInterviewData = !!app.interview_completed_at || (app.interview_responses && Object.keys(app.interview_responses).length > 0) || hasPassedInitial;
                if (isTypingTestOrApplied && !hasInterviewData) {
                    return false;
                }
                return true;
            });

            const detailedApplicants: DetailedApplicant[] = appIds.flatMap(id => {
                const app = applicationsMap.get(id);
                const pos = positionsMap.get(app?.position_id || '');
                const appHistory = filteredHistory.filter(h => h.application_id === id);
                const activities = appHistory.length;

                let status: DetailedApplicant['status'] = 'OTHER';
                const isOps = getRoleType(user.role) === 'ops_validator';
                
                const latestHistory = appHistory.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0];
                const isAssigned = assignedAppIds.includes(id);

                const wasActuallyInterviewed = app && (!!app.interview_completed_at || !!app.interview_responses);

                if (isOps) {
                    const isAssignedOps = (app?.assigned_ops_validator_name || '').toLowerCase() === userNameLower;
                    if (isAssignedOps) {
                        const isPassed = app && (app.department || app.endorsement_account) && app.current_status === 'FINAL_INTERVIEW_SCHEDULED';
                        if (isPassed) {
                            status = 'PASSED';
                        } else if (wasActuallyInterviewed && ((latestHistory && ['FAILED', 'REJECTED'].includes(latestHistory.to_status)) ||
                            (app && isAssigned && ['FAILED', 'REJECTED'].includes(app.current_status?.toUpperCase() || '')))) {
                            status = 'FAILED';
                        } else if (wasActuallyInterviewed) {
                            status = 'PENDING';
                        } else {
                            status = 'PENDING'; // Still in queue
                        }
                    }
                    return [{
                        id,
                        name: app?.applicant_name || 'Unknown',
                        department: app?.department || pos?.department || 'Unassigned',
                        jobTitle: app?.position_title || pos?.title || 'Unknown Role',
                        activityCount: activities,
                        status,
                        lastActionAt: app?.interview_completed_at || app?.created_at || appHistory[0]?.changed_at || app?.updated_at || new Date().toISOString()
                    }];
                } else {
                    const isAssignedRecruiter = normalizeRecruiterName(app?.assigned_recruiter_name || app?.interviewer_name).toLowerCase() === userNameLower;
                    const hasMeetingDate = !!app?.endorsement_meeting_date;
                    const effectiveStatus = (app?.master_status && String(app?.master_status).toUpperCase() !== 'OPEN' ? app?.master_status : app?.current_status) || '';
                    const isPassedStatus = ['PASSED', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'HIRED', 'FINAL_VERDICT', 'FOR_PAN', 'FOR PAN', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'HIRED_PROCESSED'].includes(String(effectiveStatus).toUpperCase());
                    
                    const depts = (app?.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                    const failedAccounts = app?.metadata?.failed_accounts || [];
                    const remainingAccounts = depts.filter((d: string) => !failedAccounts.some((f: string) => f.trim().toLowerCase() === d));
                    
                    const isHistoricalFinalFail = ['REJECTED', 'FAILED'].includes(String(app?.current_status || '').toUpperCase()) && (app?.pis?.final_interview_result === 'FAILED' || app?.pis?.ops_validator_status === 'FAILED' || app?.metadata?.final_interview_result === 'FAILED' || app?.metadata?.ops_validator_status === 'FAILED' || (app?.pis as any)?.client_interview_result === 'FAILED' || app?.metadata?.client_interview_result === 'FAILED');
                    const isFailedStatus = (['REJECTED', 'FAILED'].includes(String(app?.current_status || '').toUpperCase()) && remainingAccounts.length === 0 && failedAccounts.length > 0) || isHistoricalFinalFail;
                    
                    const specStatus = String((app?.pis as any)?.final_specific_status || (app?.pis as any)?.specific_status || '').toLowerCase();
                    const isNoShowStatus = specStatus.includes('no show') || specStatus.includes('noshow');
                    const hasFinalResult = isPassedStatus || isFailedStatus || isNoShowStatus;
                    const isFullyScheduled = hasMeetingDate || hasFinalResult || app?.current_status === 'REPROFILE_FINAL_INTERVIEW';
                    const accountSchedules = app?.metadata?.account_schedules || {};
                    let scheduledCount = 0;
                    for (const scheduler of Object.values(accountSchedules)) {
                        if (normalizeRecruiterName(scheduler as string).toLowerCase() === userNameLower) {
                            scheduledCount++;
                        }
                    }
                    if (scheduledCount === 0 && normalizeRecruiterName(app?.scheduled_by).toLowerCase() === userNameLower) {
                        scheduledCount = 1;
                    }

                    const results: DetailedApplicant[] = [];
                    let added = false;

                    const createResult = (s: DetailedApplicant['status']) => ({
                        id: results.length > 0 ? `${id}-${s}-${results.length}` : id,
                        name: app?.applicant_name || 'Unknown',
                        department: app?.department || pos?.department || 'Unassigned',
                        jobTitle: app?.position_title || pos?.title || 'Unknown Role',
                        activityCount: activities,
                        status: s,
                        lastActionAt: app?.interview_completed_at || app?.created_at || appHistory[0]?.changed_at || app?.updated_at || new Date().toISOString()
                    });

                    if (isAssignedRecruiter) {
                        const normalizedStatus = String(app?.current_status || '').toUpperCase().replace(/[\s\-_]+/g, '_');
                        const meta = app?.metadata || {};
                        const pis = (app?.pis || {}) as any;
                        const initialVerdict = String(
                            meta.initial_interview_results || meta.initial_verdict || meta.initial_interview_result ||
                            pis.initial_interview_results || pis.initial_interview_result || pis.initial_verdict || ''
                        ).toUpperCase();

                        const isPassedStatus = [
                            'ASSESSMENT', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 
                            'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'JOB_OFFER',
                            'PASSED', 'HIRED', 'SENT_JO_AND_BGC', 'ACCEPTED_OFFER', 'CONTRACT_SENT',
                            'ACCEPTED', 'REPROFILE_FINAL_INTERVIEW'
                        ].some(s => normalizedStatus.includes(s));

                        const isNoShow = normalizedStatus.includes('NO_SHOW') || specStatus.includes('no show') || specStatus.includes('noshow');
                        const isFailedStatus = [
                            'FAILED', 'REJECTED', 'DROPPED', 'WITHDRAWN', 'WITHDREW', 'NO_SHOW', 'NOT_ELIGIBLE_FOR_REHIRE'
                        ].some(s => normalizedStatus.includes(s));
                        
                        const didDropInHistory = filteredHistory.some(h => h.application_id === id && ['FAILED', 'REJECTED', 'DROPPED'].includes(h.to_status?.toUpperCase()));
                        const didPassInHistory = filteredHistory.some(h => h.application_id === id && ['ASSESSMENT', 'FINAL_INTERVIEW', 'PASSED'].includes(h.to_status?.toUpperCase()));

                        const hasPassedInitial = initialVerdict.includes('PASS') || didPassInHistory || isPassedStatus;

                        if (hasPassedInitial) {
                            results.push(createResult('ENDORSED_OVER'));
                        } else if (isNoShow) {
                            results.push(createResult('NO_SHOW'));
                        } else if (isFailedStatus || didDropInHistory) {
                            results.push(createResult('DROPPED'));
                        } else {
                            results.push(createResult('SCREENED'));
                        }
                        added = true;
                    } 
                    if (scheduledCount > 0 && isFullyScheduled) {
                        for (let i = 0; i < scheduledCount; i++) {
                            results.push(createResult('ENDORSED_OPS'));
                            added = true;
                        }
                    }
                    if (!added) {
                        results.push(createResult('OTHER'));
                    }

                    return results;
                }
            }).filter((a: DetailedApplicant) => a.status !== 'OTHER').sort((a: DetailedApplicant, b: DetailedApplicant) => b.activityCount - a.activityCount);



            const endorsedCount = detailedApplicants.filter(a => a.status === 'PASSED').length;
            const endorsedOverCount = detailedApplicants.filter(a => a.status === 'ENDORSED_OVER').length;
            const endorsedOpsCount = detailedApplicants.filter(a => a.status === 'ENDORSED_OPS').length;
            const failedCount = detailedApplicants.filter(a => a.status === 'FAILED' || a.status === 'DROPPED').length;
            const ongoingCount = detailedApplicants.filter(a => a.status === 'PENDING' || a.status === 'SCREENED').length;

            const noShowCount = appIds.filter(id => {
                const app = applicationsMap.get(id);
                if (!app) return false;
                const isAssignedForUser = (app: any) => {
                    if (!app) return false;
                    if (isOps) return (app.assigned_ops_validator_name || '').toLowerCase() === userNameLower;
                    return normalizeRecruiterName(app.assigned_recruiter_name || app.interviewer_name).toLowerCase() === userNameLower;
                };
                const isAssigned = isAssignedForUser(app);
                const specStatus = String((app.pis as any)?.final_specific_status || (app.pis as any)?.specific_status || app.current_status || '').toLowerCase();
                return isAssigned && (specStatus.includes('no show') || specStatus.includes('noshow'));
            }).length;

            const interviewedCount = detailedApplicants.filter(a => a.status !== 'ENDORSED_OPS').length;

            return {
                user,
                interviewed: interviewedCount,
                endorsed: endorsedCount,
                endorsedOver: endorsedOverCount,
                endorsedOps: endorsedOpsCount,
                failed: failedCount,
                noShow: noShowCount,
                totalHandled: filteredHistory.length, // Total actions/operations performed
                uniqueApplicants: appIds.filter(id => {
                    const a = applicationsMap.get(id);
                    return a && (!!a.interview_completed_at || !!a.interview_responses);
                }).length,     // Only count candidates actually interviewed in a room
                detailedApplicants,
                recentActivity: filteredHistory.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()).slice(0, 20)
            };
        });

        return {
            ops: stats.filter(s => getRoleType(s.user.role) === 'ops_validator'),
            recruiters: stats.filter(s => getRoleType(s.user.role) === 'recruiter')
        };
    }, [users, historyByPerson, applicationsMap, dateFilter, debouncedSearchQuery, deptFilter, jobFilter, positionsMap, activeTab, getRoleType]);

    useEffect(() => {
        if (selectedUser) {
            const roleKey = getRoleType(selectedUser.user.role) === 'recruiter' ? 'recruiters' : 'ops';
            const updated = groupedStats[roleKey].find(s => s.user.id === selectedUser.user.id);
            if (updated) {
                setSelectedUser(updated);
            }
        }
    }, [groupedStats]);

    return {
        users, loading, selectedUser, setSelectedUser,
        searchQuery, setSearchQuery, deptFilter, setDeptFilter,
        jobFilter, setJobFilter, dateFilter, setDateFilter,
        
        modalTab, setModalTab, modalStatFilter, setModalStatFilter,
        viewMode, setViewMode, activeTab, setActiveTab,
        groupedStats, positions, updateApplicantStatus,
        accountsList, recruiterRolesList, getLabel, departments
    };
}
