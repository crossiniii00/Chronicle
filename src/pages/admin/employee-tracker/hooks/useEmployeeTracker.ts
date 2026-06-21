import { useState, useEffect, useMemo } from 'react';
import { UserService } from '@/services/UserService';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import type { User } from '@/types/user';
import type { Application, StatusHistoryEntry } from '@/types/application';
import type { Position } from '@/types/position';
import { socketService } from '@/services/socketService';
import { useAccountTypeSettings } from '../../hooks/useAccountTypeSettings';

export interface DetailedApplicant {
    id: string;
    name: string;
    department: string;
    jobTitle: string;
    activityCount: number;
    status: 'SCREENED' | 'ENDORSED' | 'DROPPED' | 'OTHER' | 'PENDING' | 'PASSED' | 'FAILED';
    lastActionAt: string;
}

export interface EmployeeStats {
    user: User;
    interviewed: number;
    endorsed: number;
    failed: number;
    totalHandled: number;
    uniqueApplicants: number;
    detailedApplicants: DetailedApplicant[];
    recentActivity: StatusHistoryEntry[];
}

export function useEmployeeTracker() {
    const { getRoleType, activeRoles, getLabel } = useAccountTypeSettings();
    const [users, setUsers] = useState<User[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<EmployeeStats | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [jobFilter, setJobFilter] = useState('ALL');
    const [dateRange, setDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('MONTH');
    const [modalDateFilter, setModalDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
    const [modalCustomDate, setModalCustomDate] = useState<string>('');
    const [modalTab, setModalTab] = useState<'applicants' | 'endorsed' | 'failed' | 'logs'>('applicants');
    const [modalStatFilter, setModalStatFilter] = useState<'ALL' | 'SCREENED' | 'ENDORSED' | 'DROPPED' | 'PENDING' | 'PASSED' | 'FAILED'>('ALL');
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
            const [u, a, h, p, d] = await Promise.all([
                UserService.getAll(),
                ApplicationService.getAll(),
                ApplicationService.getAllStatusHistory(),
                PositionService.getAll(),
                DepartmentService.getAll()
            ]);

            setUsers(u.filter(user => user.role !== 'admin'));
            setApplications(a);
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
        loadData();
        const socket = socketService.getSocket();

        socket.on('applications:updated', () => {
            loadData();
        });

        const interval = setInterval(loadData, 300000); // Fallback polling every 5 min

        return () => {
            socket.off('applications:updated');
            clearInterval(interval);
        };
    }, []);

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
        return activeRoles.filter(r => getRoleType(r) === 'recruiter');
    }, [activeRoles, getRoleType]);

    const groupedStats = useMemo(() => {
        // Step 1: Filter users first to avoid expensive calculations for invisible entries
        const filteredUsers = users.filter(user => {
            const matchesSearch = user.full_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            if (!matchesSearch) return false;

            const isOpsUser = getRoleType(user.role) === 'ops_validator';
            const isRecruiterUser = getRoleType(user.role) === 'recruiter';

            if (activeTab === 'ops') {
                if (!isOpsUser) return false;
                if (deptFilter !== 'ALL') {
                    const userDepts = user.department ? user.department.split(',').map(d => d.trim().toUpperCase()) : [];
                    const matchesAccount = userDepts.includes(deptFilter.toUpperCase()) || 
                                           (user.sector && user.sector.toUpperCase() === deptFilter.toUpperCase());
                    if (!matchesAccount) return false;
                }
            } else {
                if (!isRecruiterUser) return false;
                if (deptFilter !== 'ALL' && user.role !== deptFilter) {
                    return false;
                }
            }

            return true;
        });

        const stats = filteredUsers.map(user => {
            const userHistory = historyByPerson.get(user.full_name) || [];

            const filteredHistory = userHistory.filter(h => {
                const date = new Date(h.changed_at);
                const now = new Date();

                let matchesDate = true;
                if (dateRange === 'TODAY') matchesDate = date.toDateString() === now.toDateString();
                else if (dateRange === 'WEEK') matchesDate = (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
                else if (dateRange === 'MONTH') matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                else if (dateRange === 'YEAR') matchesDate = date.getFullYear() === now.getFullYear();

                if (!matchesDate) return false;

                if (activeTab !== 'ops' && jobFilter !== 'ALL') {
                    const app = applicationsMap.get(h.application_id);
                    if (app?.position_id !== jobFilter) return false;
                }

                return true;
            });

            // Find applications directly assigned to this recruiter or ops validator
            const isRecruiter = getRoleType(user.role) === 'recruiter';
            const isOps = getRoleType(user.role) === 'ops_validator';
            const assignedApps = isRecruiter 
                ? applications.filter(a => a.assigned_recruiter_name === user.full_name)
                : isOps
                    ? applications.filter(a => a.assigned_ops_validator_name === user.full_name)
                    : [];

            const filteredAssignedApps = assignedApps.filter(app => {
                const date = new Date(app.updated_at || app.applied_at);
                const now = new Date();

                let matchesDate = true;
                if (dateRange === 'TODAY') matchesDate = date.toDateString() === now.toDateString();
                else if (dateRange === 'WEEK') matchesDate = (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
                else if (dateRange === 'MONTH') matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                else if (dateRange === 'YEAR') matchesDate = date.getFullYear() === now.getFullYear();

                if (!matchesDate) return false;

                if (activeTab !== 'ops' && jobFilter !== 'ALL' && app.position_id !== jobFilter) return false;

                return true;
            });

            const assignedAppIds = filteredAssignedApps.map(a => a.id);
            const appIds = Array.from(new Set([...filteredHistory.map(h => h.application_id), ...assignedAppIds]));

            const detailedApplicants: DetailedApplicant[] = appIds.map(id => {
                const app = applicationsMap.get(id);
                const pos = positionsMap.get(app?.position_id || '');
                const appHistory = filteredHistory.filter(h => h.application_id === id);
                const activities = appHistory.length;

                let status: DetailedApplicant['status'] = 'OTHER';
                const isOps = getRoleType(user.role) === 'ops_validator';

                if (appHistory.some(h => ['PASSED', 'HIRED', 'PROMOTION', 'ENDORSED', 'FOR_JO', 'FOR_JOB_OFFER'].includes(h.to_status)) ||
                    (app && ['ENDORSED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'PASSED', 'HIRED', 'FOR_JOB_OFFER'].includes(app.current_status))) {
                    status = isOps ? 'PASSED' : 'ENDORSED';
                } else if (appHistory.some(h => ['FAILED', 'REJECTED'].includes(h.to_status)) ||
                    (app && ['FAILED', 'REJECTED'].includes(app.current_status))) {
                    status = isOps ? 'FAILED' : 'DROPPED';
                } else if (appHistory.some(h => ['INITIAL_INTERVIEW', 'FINAL_INTERVIEW'].includes(h.to_status)) ||
                    (app && ['INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS'].includes(app.current_status))) {
                    status = isOps ? 'PENDING' : 'SCREENED';
                }

                return {
                    id,
                    name: app?.applicant_name || 'Unknown',
                    department: app?.department || pos?.department || 'Unassigned',
                    jobTitle: app?.position_title || pos?.title || 'Unknown Role',
                    activityCount: activities,
                    status,
                    lastActionAt: appHistory[0]?.changed_at || app?.updated_at || new Date().toISOString()
                };
            }).sort((a, b) => b.activityCount - a.activityCount);

            const interviewedCount = appIds.filter(id => {
                const app = applicationsMap.get(id);
                const appHistory = filteredHistory.filter(h => h.application_id === id);
                return appHistory.some(h => h.to_status === 'INITIAL_INTERVIEW' || h.to_status === 'FINAL_INTERVIEW') ||
                    (app && ['INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(app.current_status));
            }).length;

            const endorsedCount = appIds.filter(id => {
                const app = applicationsMap.get(id);
                const appHistory = filteredHistory.filter(h => h.application_id === id);
                return appHistory.some(h => ['PASSED', 'HIRED', 'PROMOTION', 'ENDORSED', 'FOR_JO', 'FOR_JOB_OFFER'].includes(h.to_status)) ||
                    (app && ['ENDORSED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'PASSED', 'HIRED', 'FOR_JOB_OFFER'].includes(app.current_status));
            }).length;

            const failedCount = appIds.filter(id => {
                const app = applicationsMap.get(id);
                const appHistory = filteredHistory.filter(h => h.application_id === id);
                return appHistory.some(h => ['FAILED', 'REJECTED'].includes(h.to_status)) ||
                    (app && ['FAILED', 'REJECTED'].includes(app.current_status));
            }).length;

            return {
                user,
                interviewed: interviewedCount,
                endorsed: endorsedCount,
                failed: failedCount,
                totalHandled: filteredHistory.length, // Total actions/operations performed
                uniqueApplicants: appIds.length,     // Total distinct people touched
                detailedApplicants,
                recentActivity: filteredHistory.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()).slice(0, 20)
            };
        });

        return {
            ops: stats.filter(s => getRoleType(s.user.role) === 'ops_validator'),
            recruiters: stats.filter(s => getRoleType(s.user.role) === 'recruiter')
        };
    }, [users, historyByPerson, applicationsMap, dateRange, debouncedSearchQuery, deptFilter, jobFilter, positionsMap, activeTab, getRoleType]);

    return {
        users, loading, selectedUser, setSelectedUser,
        searchQuery, setSearchQuery, deptFilter, setDeptFilter,
        jobFilter, setJobFilter, dateRange, setDateRange,
        modalDateFilter, setModalDateFilter, modalCustomDate, setModalCustomDate,
        modalTab, setModalTab, modalStatFilter, setModalStatFilter,
        viewMode, setViewMode, activeTab, setActiveTab,
        groupedStats, positions, updateApplicantStatus,
        accountsList, recruiterRolesList, getLabel
    };
}
