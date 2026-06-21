import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService, type HiringQuotaHistory } from '@/services/PositionService';
import { AIService, type SuggestQuotaResult } from '@/services/AIService';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { CalendarDropdown } from '@/components/common/CalendarDropdown';
import { useToast } from '@/components/common/useToast';
import { Plus, Search, Target, LayoutGrid, List, Building2, Briefcase, Clock, Sparkles, Loader2, Users } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion } from 'framer-motion';
import type { Application, Position } from '@/types';
import { AccountCard, type AccountCardDept } from './components/AccountCard';
import { AccountDashboardModal } from './components/AccountDashboardModal';
import { QuotaHistoryModal } from './components/QuotaHistoryModal';
import { AccountFormModal } from './components/AccountFormModal';

const STORAGE_PREFIX = 'hiring_quota_';
const CANCELLED_CLASSES_KEY = 'cancelled_classes_history';
const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export interface CancelledClass {
    id: string;
    department: string;
    quota: number;
    hiredCount: number;
    totalApplicants: number;
    inPipeline: number;
    failedCount: number;
    startDate?: string | null;
    endDate?: string | null;
    cancelledAt: string;
}

const toDateInputValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : '';
const todayInputValue = () => new Date().toISOString().slice(0, 10);

const getDurationLabel = (start?: string | null, end?: string | null) => {
    if (!start || !end) return 'Set both dates';
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Invalid date range';
    const days = Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
    return `${days} day${days === 1 ? '' : 's'}`;
};

const isDateInsideSeason = (value: string | undefined | null, start?: string | null, end?: string | null) => {
    if (!start || !end) return true;
    if (!value) return false;

    const date = new Date(value);
    const startDate = new Date(`${toDateInputValue(start)}T00:00:00`);
    const endDate = new Date(`${toDateInputValue(end)}T23:59:59.999`);

    if (Number.isNaN(date.getTime()) || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return false;
    return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
};

const getSeasonActivityDate = (app: Application) => {
    const status = (app.current_status || '').toUpperCase();
    if (status === 'HIRED' || app.final_verdict === 'HIRED') {
        return app.hired_at || app.updated_at || app.interview_completed_at || app.applied_at;
    }
    if (['FAILED', 'REJECTED', 'WITHDRAWN'].includes(status)) {
        return app.updated_at || app.interview_completed_at || app.applied_at;
    }
    return app.applied_at || app.updated_at;
};

const getSeasonHiredDate = (app: Application, start?: string | null, end?: string | null) => {
    if (!start || !end) return getSeasonActivityDate(app);
    return app.hired_at || null;
};

const isAfterQuotaCutoff = (value: string | undefined | null, cutoff?: string | null) => {
    if (!cutoff) return true;
    if (!value) return false;

    const date = new Date(value);
    const cutoffDate = new Date(cutoff);

    if (Number.isNaN(date.getTime()) || Number.isNaN(cutoffDate.getTime())) return true;
    return date.getTime() > cutoffDate.getTime();
};

type QuotaHistoryMetric = 'quota' | 'hired' | 'processed' | 'fallout';

export function AccountManagement({ hideHeader = false }: { hideHeader?: boolean }) {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [allPositions, setAllPositions] = useState<Position[]>([]);
    const [allApplications, setAllApplications] = useState<Application[]>([]);
    const [quotaHistory, setQuotaHistory] = useState<HiringQuotaHistory[]>([]);
    const [search, setSearch] = useState('');
    const [localQuotas, setLocalQuotas] = useState<Record<string, number>>({});
    const [cancelledClasses, setCancelledClasses] = useState<CancelledClass[]>([]);

    useEffect(() => {
        const stored: Record<string, number> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) {
                const deptName = key.replace(STORAGE_PREFIX, '');
                stored[deptName] = parseInt(localStorage.getItem(key) || '0');
            }
        }
        setLocalQuotas(stored);

        try {
            const storedCancelled = localStorage.getItem(CANCELLED_CLASSES_KEY);
            if (storedCancelled) {
                setCancelledClasses(JSON.parse(storedCancelled));
            }
        } catch (e) {
            console.error('Failed to load cancelled classes history:', e);
        }
    }, []);

    const [modal, setModal] = useState<boolean>(false);
    const [dashboardModal, setDashboardModal] = useState<boolean>(false);
    const [quotaModal, setQuotaModal] = useState<boolean>(false);
    const [delConfirm, setDelConfirm] = useState<Department | null>(null);
    const [closeConfirm, setCloseConfirm] = useState<boolean>(false);
    const [cancelConfirm, setCancelConfirm] = useState<boolean>(false);

    const [form, setForm] = useState({ name: '', head: '', budget_code: '', type: 'ACCOUNTS' });
    const [quotaForm, setQuotaForm] = useState<number>(0);
    const [quotaManualHired, setQuotaManualHired] = useState<number>(0);
    const [quotaStartDate, setQuotaStartDate] = useState<string>(() => todayInputValue());
    const [quotaEndDate, setQuotaEndDate] = useState<string>('');
    const [quotaHiringType, setQuotaHiringType] = useState<'Billed' | 'Non-Billed'>('Billed');
    const [quotaTrainingStartDate, setQuotaTrainingStartDate] = useState<string>('');
    const [quotaHiringQuotaId, setQuotaHiringQuotaId] = useState<string>('');
    const [aiSuggesting, setAiSuggesting] = useState<boolean>(false);
    const [aiSuggestion, setAiSuggestion] = useState<SuggestQuotaResult | null>(null);
    const [hiringTypeFilter, setHiringTypeFilter] = useState<'ALL' | 'BILLED' | 'NON_BILLED' | 'NO_QUOTA'>('ALL');
    const [selectedAccount, setSelectedAccount] = useState<Department | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('acc-view-type') as 'grid' | 'list') || 'grid';
    });
    const [activePipelineFilter, setActivePipelineFilter] = useState<string | null>(null);
    const [dashboardTab, setDashboardTab] = useState<'overview' | 'history' | 'cancelled' | 'hiring_requirements'>('overview');
    const [quotaHistoryDrilldown, setQuotaHistoryDrilldown] = useState<{ item: HiringQuotaHistory; metric: QuotaHistoryMetric } | null>(null);
    const [activeAccountTab, setActiveAccountTab] = useState<'ALL' | 'BILLED' | 'NON_BILLED'>('ALL');
    const [activeMainTab, setActiveMainTab] = useState<'ACCOUNTS' | 'SUPPORT_ROLES'>('ACCOUNTS');

    useEffect(() => {
        localStorage.setItem('acc-view-type', viewMode);
    }, [viewMode]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [depts, pos, apps, history] = await Promise.all([
                DepartmentService.getAll(),
                PositionService.getAll(),
                ApplicationService.getAll(),
                PositionService.getQuotaHistory()
            ]);
            setDepartments(depts);
            setAllPositions(pos);
            setAllApplications(apps);
            setQuotaHistory(history);
        } catch {
            toastError('Load Failed', 'Could not retrieve system data.');
        } finally {
            setLoading(false);
        }
    }, [toastError]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const accountDashboardData = useMemo(() => {
        if (!selectedAccount) return null;
        const targetDeptName = selectedAccount.name.trim().toLowerCase();
        const accountApps = allApplications.filter(a => {
            const appDept = (a.department || '').trim().toLowerCase();
            const finalAcc = (a.pis?.final_account || '').trim().toLowerCase();
            const initAcc = (a.pis?.initial_account_assignment || '').trim().toLowerCase();
            const endorseAcc = (a.endorsement_account || '').trim().toLowerCase();
            const depts = appDept.split(',').map(s => s.trim()).filter(Boolean);
            return depts.includes(targetDeptName) || finalAcc === targetDeptName || initAcc === targetDeptName || endorseAcc === targetDeptName;
        });
        const internalPos = allPositions.find(p =>
            p.department?.trim().toLowerCase() === targetDeptName &&
            (p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA') || p.title.includes('[INTERNAL]'))
        );
        const databaseQuota = internalPos ? Number(internalPos.hiring_quota) : 0;
        const databaseHiringType = (internalPos?.qualifications === 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' ? 'Non-Billed' : 'Billed') as 'Billed' | 'Non-Billed';
        const fallbackQuota = localQuotas[targetDeptName] || 0;
        const totalQuota = databaseQuota || fallbackQuota || 0;
        const quotaStart = internalPos?.quota_start_date || null;
        const quotaEnd = internalPos?.quota_end_date || null;
        const accountHistory = quotaHistory.filter(item => item.department.trim().toLowerCase() === targetDeptName);
        const latestClosedAt = accountHistory[0]?.closedAt || null;
        const falloutStatuses = ['FAILED', 'REJECTED', 'WITHDRAWN'];
        const seasonApps = accountApps.filter(a => isDateInsideSeason(getSeasonActivityDate(a), quotaStart, quotaEnd));
        const manualHired = internalPos ? Number(internalPos.manual_hired || 0) : 0;
        const totalHired = accountApps.filter(a =>
            a.current_status === 'HIRED' &&
            isDateInsideSeason(getSeasonHiredDate(a, quotaStart, quotaEnd), quotaStart, quotaEnd) &&
            isAfterQuotaCutoff(getSeasonHiredDate(a, quotaStart, quotaEnd), latestClosedAt)
        ).length + manualHired;
        const inPipeline = seasonApps.filter(a => a.current_status !== 'HIRED' && !falloutStatuses.includes((a.current_status || '').toUpperCase())).length;
        const failedCount = seasonApps.filter(a => falloutStatuses.includes((a.current_status || '').toUpperCase())).length;

        const filteredApplicants = activePipelineFilter ? seasonApps.filter(a => {
            const status = a.current_status || 'PENDING';
            if (activePipelineFilter === 'Applied') return true;
            if (activePipelineFilter === 'Hired') {
                return status === 'HIRED' &&
                    isDateInsideSeason(getSeasonHiredDate(a, quotaStart, quotaEnd), quotaStart, quotaEnd) &&
                    isAfterQuotaCutoff(getSeasonHiredDate(a, quotaStart, quotaEnd), latestClosedAt);
            }
            if (activePipelineFilter === 'Fallout') return ['FAILED', 'REJECTED', 'WITHDRAWN'].includes(status.toUpperCase());
            if (activePipelineFilter === 'In Pipeline') return status !== 'HIRED' && !['FAILED', 'REJECTED', 'WITHDRAWN'].includes(status.toUpperCase());
            return true;
        }) : seasonApps;

        return {
            totalQuota,
            totalHired,
            manualHired,
            inPipeline,
            failedCount,
            totalApplicants: seasonApps.length,
            remaining: Math.max(0, totalQuota - totalHired),
            progress: totalQuota > 0 ? (totalHired / totalQuota) * 100 : 0,
            internalPosId: internalPos?.id,
            hiringType: databaseHiringType,
            qualifications: internalPos?.qualifications || null,
            quotaStart,
            quotaEnd,
            trainingStartDate: internalPos?.training_start_date || internalPos?.trainingStartDate || null,
            hiringQuotaId: internalPos?.hiring_quota_id || internalPos?.hiringQuotaId || '',
            durationLabel: getDurationLabel(toDateInputValue(quotaStart), toDateInputValue(quotaEnd)),
            history: accountHistory,
            isActive: databaseQuota > 0,
            filteredApplicants
        };
    }, [selectedAccount, allPositions, allApplications, localQuotas, activePipelineFilter, quotaHistory]);

    const resetQuotaForm = useCallback(() => {
        setQuotaForm(0);
        setQuotaManualHired(0);
        setQuotaStartDate(todayInputValue());
        setQuotaEndDate('');
        setQuotaHiringType('Billed');
        setQuotaTrainingStartDate('');
        setQuotaHiringQuotaId('');
        setAiSuggestion(null);
    }, []);

    const handleSuggestQuota = async () => {
        if (!selectedAccount) return;
        setAiSuggesting(true);
        setAiSuggestion(null);
        try {
            const targetDeptName = selectedAccount.name.trim().toLowerCase();
            const historyPayload = quotaHistory
                .filter(item => item.department.trim().toLowerCase() === targetDeptName)
                .slice(0, 5)
                .map(item => {
                    const start = item.startDate ? new Date(item.startDate) : null;
                    const end = item.endDate ? new Date(item.endDate) : null;
                    const durationDays = start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) : undefined;
                    return {
                        quota: item.quota,
                        hiredCount: item.hiredCount,
                        totalApplicants: item.totalApplicants,
                        inPipeline: item.inPipeline,
                        failedCount: item.failedCount,
                        startDate: item.startDate,
                        endDate: item.endDate,
                        durationDays,
                    };
                });
            const result = await AIService.suggestQuota({
                department: selectedAccount.name,
                history: historyPayload,
                currentQuota: accountDashboardData?.totalQuota ?? 0,
            });
            setAiSuggestion(result);
            setQuotaForm(result.suggestedQuota);
            setQuotaHiringType(result.hiringType);
            if (result.durationDays && result.durationDays > 0) {
                const start = new Date(quotaStartDate || todayInputValue());
                const end = new Date(start);
                end.setDate(end.getDate() + result.durationDays);
                setQuotaEndDate(end.toISOString().slice(0, 10));
            }
            success('AI Suggestion Ready', `Suggested ${result.suggestedQuota} units (${result.hiringType}).`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error.';
            const apiMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toastError('AI Suggestion Failed', apiMessage ?? message);
        } finally {
            setAiSuggesting(false);
        }
    };

    const handleUpdateQuota = async (newVal?: number, isCancel: boolean = false) => {
        if (!selectedAccount || !accountDashboardData) return;
        setSubmitting(true);
        const targetDeptName = selectedAccount.name.trim().toLowerCase();
        const finalValue = newVal !== undefined ? newVal : quotaForm;
        const isClosingQuota = finalValue === 0 && accountDashboardData.totalQuota > 0 && !isCancel;

        try {
            if (isClosingQuota) {
                await PositionService.archiveQuotaHistory({
                    department: selectedAccount.name,
                    positionId: accountDashboardData.internalPosId || null,
                    quota: accountDashboardData.totalQuota,
                    hiredCount: accountDashboardData.totalHired,
                    totalApplicants: accountDashboardData.totalApplicants,
                    inPipeline: accountDashboardData.inPipeline,
                    failedCount: accountDashboardData.failedCount,
                    startDate: toDateInputValue(accountDashboardData.quotaStart) || null,
                    endDate: toDateInputValue(accountDashboardData.quotaEnd) || null,
                    hiringType: accountDashboardData.hiringType || 'Billed',
                    manualHires: accountDashboardData.manualHired,
                    trainingStartDate: toDateInputValue(accountDashboardData.trainingStartDate) || null,
                    hiringQuotaId: accountDashboardData.hiringQuotaId || ''
                });
            }

            if (isCancel && accountDashboardData.totalQuota > 0) {
                const newCancelledClass: CancelledClass = {
                    id: Math.random().toString(36).substring(2, 9),
                    department: selectedAccount.name,
                    quota: accountDashboardData.totalQuota,
                    hiredCount: accountDashboardData.totalHired,
                    totalApplicants: accountDashboardData.totalApplicants,
                    inPipeline: accountDashboardData.inPipeline,
                    failedCount: accountDashboardData.failedCount,
                    startDate: toDateInputValue(accountDashboardData.quotaStart) || null,
                    endDate: toDateInputValue(accountDashboardData.quotaEnd) || null,
                    cancelledAt: new Date().toISOString()
                };

                const updatedCancelled = [newCancelledClass, ...cancelledClasses];
                setCancelledClasses(updatedCancelled);
                localStorage.setItem(CANCELLED_CLASSES_KEY, JSON.stringify(updatedCancelled));
            }

            if (accountDashboardData.internalPosId) {
                await PositionService.update(accountDashboardData.internalPosId, {
                    hiring_quota: finalValue,
                    current_hired: 0,
                    manual_hired: quotaManualHired,
                    quota_start_date: finalValue > 0 ? quotaStartDate : null,
                    quota_end_date: finalValue > 0 ? quotaEndDate : null,
                    training_start_date: finalValue > 0 ? quotaTrainingStartDate : null,
                    hiring_quota_id: finalValue > 0 ? quotaHiringQuotaId : '',
                    qualifications: finalValue > 0
                        ? (quotaHiringType === 'Billed' ? 'ACCOUNT_INTERNAL_QUOTA_BILLED' : 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED')
                        : ''
                });
            } else {
                await PositionService.add({
                    title: `[INTERNAL] ${selectedAccount.name} Quota`,
                    department: selectedAccount.name,
                    hiring_quota: finalValue,
                    manual_hired: quotaManualHired,
                    quota_start_date: finalValue > 0 ? quotaStartDate : null,
                    quota_end_date: finalValue > 0 ? quotaEndDate : null,
                    training_start_date: finalValue > 0 ? quotaTrainingStartDate : null,
                    hiring_quota_id: finalValue > 0 ? quotaHiringQuotaId : '',
                    qualifications: quotaHiringType === 'Billed' ? 'ACCOUNT_INTERNAL_QUOTA_BILLED' : 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED',
                    status: 'OPEN',
                    description: `Internal tracking for ${selectedAccount.name}`,
                    location: 'System', work_arrangement: 'Onsite', employment_type: 'Full-time'
                });
            }
            localStorage.setItem(`${STORAGE_PREFIX}${targetDeptName}`, finalValue.toString());
            setLocalQuotas(prev => ({ ...prev, [targetDeptName]: finalValue }));

            if (finalValue === 0) {
                if (isCancel) {
                    success('Recruitment Aborted', `Hiring campaign for ${selectedAccount.name} was successfully cancelled.`);
                } else {
                    success('Hiring Closed', `Headcount target for ${selectedAccount.name} has been reset.`);
                }
            } else {
                success('Hiring Status Updated', `Quota for ${selectedAccount.name} set to ${finalValue}.`);
            }

            setQuotaModal(false);
            setCloseConfirm(false);
            setCancelConfirm(false);
            resetQuotaForm();
            await loadData();
        } catch {
            localStorage.setItem(`${STORAGE_PREFIX}${targetDeptName}`, finalValue.toString());
            setLocalQuotas(prev => ({ ...prev, [targetDeptName]: finalValue }));
            toastError('Database Sync Warning', 'Quota saved locally but server sync failed.');
            setQuotaModal(false);
            setCloseConfirm(false);
            setCancelConfirm(false);
            resetQuotaForm();
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddAccount = async () => {
        if (!form.name.trim()) return;
        setSubmitting(true);
        try {
            const payload = { name: form.name, head: form.head, budgetCode: form.budget_code, type: form.type };
            if (editingId) {
                await DepartmentService.update(editingId, payload);
                success('Account Updated', `Changes for ${form.name} saved.`);
            } else {
                await DepartmentService.add(payload);
                success('Account Created', `${form.name} department added.`);
            }
            setModal(false);
            setEditingId(null);
            setForm({ name: '', head: '', budget_code: '', type: 'ACCOUNTS' });
            await loadData();
        } catch {
            toastError(editingId ? 'Update Failed' : 'Create Failed', 'System error during save.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (dept: Department) => {
        setEditingId(dept.id);
        setForm({ name: dept.name, head: dept.head || '', budget_code: dept.budgetCode || '', type: dept.type || 'ACCOUNTS' });
        setModal(true);
    };

    const handleAccountImageUpload = async (dept: Department, file?: File | null) => {
        if (!file) return;
        setSubmitting(true);
        try {
            const updated = await DepartmentService.uploadImage(dept.id, file);
            setDepartments(prev => prev.map(item => item.id === updated.id ? updated : item));
            setSelectedAccount(prev => prev?.id === updated.id ? updated : prev);
            success('Account Picture Updated', `${updated.name} now has a dashboard image.`);
        } catch {
            toastError('Upload Failed', 'Please use a JPG, PNG, WEBP, or GIF image under 5MB.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!delConfirm) return;
        try {
            await DepartmentService.delete(delConfirm.id);
            localStorage.removeItem(`${STORAGE_PREFIX}${delConfirm.name.trim().toLowerCase()}`);
            success('Account Removed', `${delConfirm.name} deleted.`);
            await loadData();
        } catch {
            toastError('Delete Failed', 'Action prohibited.');
        } finally {
            setDelConfirm(null);
        }
    };

    const handleDeleteCancelledClass = useCallback((id: string) => {
        const updated = cancelledClasses.filter(c => c.id !== id);
        setCancelledClasses(updated);
        localStorage.setItem(CANCELLED_CLASSES_KEY, JSON.stringify(updated));
    }, [cancelledClasses]);

    const isSupportDept = useCallback((dept: Department) => {
        if (dept.type) return dept.type === 'SUPPORT_ROLES';
        const lower = dept.name.toLowerCase().trim();
        return ['admin', 'hr', 'support', 'recruitment', 'it'].includes(lower) || lower.includes('support');
    }, []);

    const sortedAndFiltered = useMemo(() => {
        let list = (departments || []);
        if (activeMainTab === 'ACCOUNTS') {
            list = list.filter(d => !isSupportDept(d) && d.name.toUpperCase() !== 'PENDING');
        } else {
            list = list.filter(d => isSupportDept(d));
        }

        list = list.filter(d =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            (d.head?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (d.budgetCode?.toLowerCase() || '').includes(search.toLowerCase())
        );

        const mapped = list.map(dept => {
            const targetName = dept.name.trim().toLowerCase();
            const deptQuotaPos = allPositions.find(p =>
                p.department?.trim().toLowerCase() === targetName &&
                (p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA') || p.title.includes('[INTERNAL]'))
            );
            const quota = deptQuotaPos ? Number(deptQuotaPos.hiring_quota) : 0;
            const hiringType = quota > 0 ? (deptQuotaPos?.qualifications === 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' ? 'Non-Billed' : 'Billed') : undefined;
            const quotaStart = deptQuotaPos?.quota_start_date || null;
            const quotaEnd = deptQuotaPos?.quota_end_date || null;
            const latestClosedAt = quotaHistory.find(item => item.department.trim().toLowerCase() === targetName)?.closedAt || null;
            const deptManualHired = deptQuotaPos ? Number(deptQuotaPos.manual_hired || 0) : 0;
            const hiredCount = allApplications.filter(a => {
                const appDept = (a.department || '').trim().toLowerCase();
                const finalAcc = (a.pis?.final_account || '').trim().toLowerCase();
                const initAcc = (a.pis?.initial_account_assignment || '').trim().toLowerCase();
                const endorseAcc = (a.endorsement_account || '').trim().toLowerCase();
                const depts = appDept.split(',').map(s => s.trim()).filter(Boolean);
                const matchesDept = depts.includes(targetName) || finalAcc === targetName || initAcc === targetName || endorseAcc === targetName;
                return matchesDept &&
                    a.current_status === 'HIRED' &&
                    isDateInsideSeason(getSeasonHiredDate(a, quotaStart, quotaEnd), quotaStart, quotaEnd) &&
                    isAfterQuotaCutoff(getSeasonHiredDate(a, quotaStart, quotaEnd), latestClosedAt);
            }).length + deptManualHired;
            const progress = quota > 0 ? (hiredCount / quota) * 100 : 0;
            return { ...dept, hiredCount, quota, progress, hiringType, quotaStart, quotaEnd, manual_hired: deptManualHired };
        });

        const filtered = mapped.filter(item => {
            if (hiringTypeFilter === 'ALL') return true;
            if (hiringTypeFilter === 'BILLED') return item.quota > 0 && item.hiringType === 'Billed';
            if (hiringTypeFilter === 'NON_BILLED') return item.quota > 0 && item.hiringType === 'Non-Billed';
            if (hiringTypeFilter === 'NO_QUOTA') return item.quota === 0;
            return true;
        });

        return filtered.sort((a, b) => b.progress - a.progress);
    }, [departments, search, allApplications, allPositions, hiringTypeFilter, quotaHistory, activeMainTab, isSupportDept]);

    const accountStats = useMemo(() => {
        let list = (departments || []);
        if (activeMainTab === 'ACCOUNTS') {
            list = list.filter(d => !isSupportDept(d) && d.name.toUpperCase() !== 'PENDING');
        } else {
            list = list.filter(d => isSupportDept(d));
        }

        const mapped = list.map(dept => {
            const targetName = dept.name.trim().toLowerCase();
            const deptQuotaPos = allPositions.find(p =>
                p.department?.trim().toLowerCase() === targetName &&
                (p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA') || p.title.includes('[INTERNAL]'))
            );
            const quota = deptQuotaPos ? Number(deptQuotaPos.hiring_quota) : 0;
            const hiringType = quota > 0 ? (deptQuotaPos?.qualifications === 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' ? 'Non-Billed' : 'Billed') : undefined;
            return { hiringType, quota };
        });
        return {
            total: mapped.length,
            billed: mapped.filter(i => i.hiringType === 'Billed').length,
            nonBilled: mapped.filter(i => i.hiringType === 'Non-Billed').length
        };
    }, [departments, allPositions, activeMainTab, isSupportDept]);

    const quotaHistoryDrilldownApps = useMemo(() => {
        if (!quotaHistoryDrilldown || !selectedAccount) return [];
        const targetDeptName = selectedAccount.name.trim().toLowerCase();
        const falloutStatuses = ['FAILED', 'REJECTED', 'WITHDRAWN'];
        const seasonApps = allApplications.filter(app =>
            (app.department || '').trim().toLowerCase() === targetDeptName &&
            isDateInsideSeason(getSeasonActivityDate(app), quotaHistoryDrilldown.item.startDate, quotaHistoryDrilldown.item.endDate)
        );

        if (quotaHistoryDrilldown.metric === 'hired') return seasonApps.filter(app => app.current_status === 'HIRED');
        if (quotaHistoryDrilldown.metric === 'fallout') return seasonApps.filter(app => falloutStatuses.includes((app.current_status || '').toUpperCase()));
        if (quotaHistoryDrilldown.metric === 'processed') return seasonApps;
        return [];
    }, [allApplications, quotaHistoryDrilldown, selectedAccount]);

    const quotaHistoryMetricLabels: Record<QuotaHistoryMetric, string> = {
        quota: 'Quota',
        hired: 'Hired',
        processed: 'Processed',
        fallout: 'Fallout'
    };

    return (
        <div className="space-y-8 text-left w-full bg-[#fcfbf8] p-8 min-h-screen border-l border-[#eadeca]">
            {/* Account Management Header */}
            {!hideHeader ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-surface-200 text-left">
                    <div className="flex items-center gap-6 text-left">
                        <div className="w-16 h-16 bg-white shadow-premium flex items-center justify-center rounded-2xl border border-surface-200">
                            <img src="/contactpoint-logo.png?v=2" alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <div className="flex flex-col text-left">
                            <h1 className="text-3xl font-black text-surface-900 tracking-tight text-left">Account Registry</h1>
                            <p className="text-sm text-surface-500 font-medium">Manage recruitment quotas and analyze account performance.</p>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setEditingId(null); setForm({ name: '', head: '', budget_code: '', type: activeMainTab }); setModal(true); }}
                        className="flex items-center gap-2.5 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-premium transition-all text-sm"
                    >
                        <Plus size={20} /> Register New Account
                    </motion.button>
                </div>
            ) : (
                <div className="bg-white border-b border-surface-200">
                    <div className="relative px-6 pt-5 pb-3 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2.5">
                            <Building2 size={17} className="text-[#605e5c] self-center" />
                            <h1
                                className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                                style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                            >
                                Accounts
                            </h1>
                        </div>
                    </div>

                    {/* Stats + Action */}
                    <div className="flex items-center justify-center gap-2.5 px-6 pb-3">
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => { setEditingId(null); setForm({ name: '', head: '', budget_code: '', type: activeMainTab }); setModal(true); }}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-black text-white text-[11.5px] font-medium tracking-[-0.005em] hover:bg-black/85 transition-all rounded-sm"
                        >
                            <Plus size={13} strokeWidth={2.25} />
                            Register new account
                        </motion.button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex items-center justify-center gap-9 px-6">
                        <button
                            onClick={() => { setActiveAccountTab('ALL'); setHiringTypeFilter('ALL'); }}
                            className={cn(
                                "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                                activeAccountTab === 'ALL' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                            )}
                        >
                            <LayoutGrid size={15} className="shrink-0 transition-colors text-surface-400 group-hover:text-surface-600" />
                            <span>All</span>
                            <span className={cn(
                                "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center tabular-nums",
                                activeAccountTab === 'ALL' ? "bg-blue-50 text-blue-700" : "bg-surface-100 text-surface-500"
                            )}>
                                {accountStats.total}
                            </span>
                            {activeAccountTab === 'ALL' && (
                                <motion.span
                                    layoutId="account-tab-underline"
                                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500"
                                    transition={SPRING}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveAccountTab('BILLED'); setHiringTypeFilter('BILLED'); }}
                            className={cn(
                                "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                                activeAccountTab === 'BILLED' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                            )}
                        >
                            <Briefcase size={15} className="shrink-0 transition-colors text-surface-400 group-hover:text-surface-600" />
                            <span>Billed</span>
                            <span className={cn(
                                "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center tabular-nums",
                                activeAccountTab === 'BILLED' ? "bg-emerald-50 text-emerald-700" : "bg-surface-100 text-surface-500"
                            )}>
                                {accountStats.billed}
                            </span>
                            {activeAccountTab === 'BILLED' && (
                                <motion.span
                                    layoutId="account-tab-underline"
                                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-emerald-500"
                                    transition={SPRING}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveAccountTab('NON_BILLED'); setHiringTypeFilter('NON_BILLED'); }}
                            className={cn(
                                "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                                activeAccountTab === 'NON_BILLED' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                            )}
                        >
                            <Clock size={15} className="shrink-0 transition-colors text-surface-400 group-hover:text-surface-600" />
                            <span>Non-billed</span>
                            <span className={cn(
                                "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center tabular-nums",
                                activeAccountTab === 'NON_BILLED' ? "bg-amber-50 text-amber-700" : "bg-surface-100 text-surface-500"
                            )}>
                                {accountStats.nonBilled}
                            </span>
                            {activeAccountTab === 'NON_BILLED' && (
                                <motion.span
                                    layoutId="account-tab-underline"
                                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-amber-500"
                                    transition={SPRING}
                                />
                            )}
                        </button>
                    </div>

                    {/* Filter & View Controls */}
                    <div className="flex items-center gap-3 px-6 py-2.5 bg-white shrink-0 justify-center">
                        <div className="relative shrink-0">
                            <Search size={13} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40 group-focus-within:text-black transition-colors" />
                            <input
                                type="text"
                                placeholder="Search accounts…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-72 pl-8 pr-3 h-7 bg-surface-50/50 border border-surface-200 rounded-sm text-[12px] font-medium tracking-[-0.005em] text-surface-900 placeholder:text-black/40 placeholder:font-normal focus:border-black focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-0 bg-white border border-surface-200 rounded-sm overflow-hidden h-7 shrink-0 ml-3">
                            <button onClick={() => setViewMode('grid')}
                                className={cn(
                                    "h-full px-3 text-[11.5px] font-medium tracking-[-0.005em] transition-all flex items-center gap-1.5 border-r border-surface-100",
                                    viewMode === 'grid'
                                        ? "bg-black text-white"
                                        : "text-black/55 hover:text-black hover:bg-surface-50"
                                )}
                            >
                                <LayoutGrid size={12} strokeWidth={2} /> Grid
                            </button>
                            <button onClick={() => setViewMode('list')}
                                className={cn(
                                    "h-full px-3 text-[11.5px] font-medium tracking-[-0.005em] transition-all flex items-center gap-1.5",
                                    viewMode === 'list'
                                        ? "bg-black text-white"
                                        : "text-black/55 hover:text-black hover:bg-surface-50"
                                )}
                            >
                                <List size={12} strokeWidth={2} /> List
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Level Main Tabs Switcher */}
            <div className="flex justify-center border-b border-surface-200 bg-white shadow-sm rounded-sm mb-6">
                <button
                    onClick={() => { setActiveMainTab('ACCOUNTS'); setActiveAccountTab('ALL'); setHiringTypeFilter('ALL'); }}
                    className={cn(
                        "flex items-center gap-2 px-8 py-4 text-[13px] font-bold transition-all relative uppercase tracking-wider",
                        activeMainTab === 'ACCOUNTS' ? "text-[#0078d4]" : "text-surface-500 hover:text-[#0078d4]"
                    )}
                >
                    <Building2 size={16} />
                    <span>Accounts</span>
                    {activeMainTab === 'ACCOUNTS' && (
                        <motion.span
                            layoutId="main-tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0078d4]"
                            transition={SPRING}
                        />
                    )}
                </button>
                <button
                    onClick={() => { setActiveMainTab('SUPPORT_ROLES'); setActiveAccountTab('ALL'); setHiringTypeFilter('ALL'); }}
                    className={cn(
                        "flex items-center gap-2 px-8 py-4 text-[13px] font-bold transition-all relative uppercase tracking-wider",
                        activeMainTab === 'SUPPORT_ROLES' ? "text-[#0078d4]" : "text-surface-500 hover:text-[#0078d4]"
                    )}
                >
                    <Users size={16} />
                    <span>Admin Support Roles</span>
                    {activeMainTab === 'SUPPORT_ROLES' && (
                        <motion.span
                            layoutId="main-tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0078d4]"
                            transition={SPRING}
                        />
                    )}
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white border border-[#edebe9] rounded-sm text-left">
                    <div className="w-8 h-8 border-2 border-[#0078d4] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs font-medium text-[#605e5c]">Loading Pipeline...</p>
                </div>
            ) : (
                <div className={cn(
                    viewMode === 'grid'
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4"
                        : "flex flex-col border border-[#edebe9] bg-white divide-y divide-[#edebe9]"
                )}>
                    {sortedAndFiltered.map((dept) => (
                        <AccountCard
                            key={dept.id}
                            dept={dept as AccountCardDept}
                            viewMode={viewMode}
                            onSelect={(d) => { setSelectedAccount(d); setDashboardModal(true); }}
                            onEdit={handleEditClick}
                            onDelete={(d) => setDelConfirm(d)}
                        />
                    ))}
                </div>
            )}

            <AccountDashboardModal
                dashboardModal={dashboardModal}
                setDashboardModal={setDashboardModal}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                accountDashboardData={accountDashboardData}
                dashboardTab={dashboardTab}
                setDashboardTab={setDashboardTab}
                activePipelineFilter={activePipelineFilter}
                setActivePipelineFilter={setActivePipelineFilter}
                setQuotaHistoryDrilldown={setQuotaHistoryDrilldown}
                handleAccountImageUpload={handleAccountImageUpload}
                submitting={submitting}
                setQuotaForm={setQuotaForm}
                setQuotaManualHired={setQuotaManualHired}
                setQuotaStartDate={setQuotaStartDate}
                setQuotaEndDate={setQuotaEndDate}
                setQuotaHiringType={setQuotaHiringType}
                setQuotaTrainingStartDate={setQuotaTrainingStartDate}
                setQuotaHiringQuotaId={setQuotaHiringQuotaId}
                setQuotaModal={setQuotaModal}
                setCloseConfirm={setCloseConfirm}
                setCancelConfirm={setCancelConfirm}
                cancelledClasses={cancelledClasses}
                onDeleteCancelled={handleDeleteCancelledClass}
                todayInputValue={todayInputValue}
                toDateInputValue={toDateInputValue}
                getDurationLabel={getDurationLabel}
                loadData={loadData}
            />

            {/* Professional Quota Update Modal */}
            <Modal open={quotaModal} onClose={() => { setQuotaModal(false); setQuotaForm(0); setQuotaStartDate(todayInputValue()); setQuotaEndDate(''); setQuotaHiringType('Billed'); setQuotaTrainingStartDate(''); setQuotaHiringQuotaId(''); }} title="Set Hiring Target" size="lg">
                <div className="space-y-7 text-left bg-white">
                    <div className="flex items-start gap-4 text-left">
                        <div className="w-10 h-10 bg-[#eff6fc] border border-[#c7e0f4] flex items-center justify-center text-[#0078d4] rounded-sm shrink-0">
                            <Target size={21} strokeWidth={1.75} />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                            <h4 className="text-[18px] font-semibold text-[#201f1e] leading-tight">Operational Target</h4>
                            <p className="text-[13px] text-[#605e5c] mt-1 max-w-xl">
                                Configure the seasonal hiring quota, campaign dates, and duration for {selectedAccount?.name || 'this account'}.
                            </p>
                        </div>
                        <button
                            onClick={handleSuggestQuota}
                            disabled={aiSuggesting || !selectedAccount}
                            className="shrink-0 h-9 px-3.5 flex items-center gap-1.5 bg-white border border-[#c7e0f4] text-[#005a9e] hover:bg-[#eff6fc] disabled:opacity-50 disabled:cursor-not-allowed rounded-sm text-[12px] font-semibold transition-all"
                            title="Suggest a quota based on this account's hiring history"
                        >
                            {aiSuggesting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} strokeWidth={2} />}
                            {aiSuggesting ? 'Suggesting…' : 'Suggest quota'}
                        </button>
                    </div>

                    {aiSuggestion && (
                        <div className="bg-[#f3f2f1] border border-[#edebe9] rounded-sm px-4 py-3 text-left">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles size={11} className="text-[#005a9e]" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#005a9e]">AI Suggestion {aiSuggestion.source ? `· ${aiSuggestion.source}` : ''}</span>
                            </div>
                            <p className="text-[12px] text-[#323130] leading-relaxed">{aiSuggestion.reasoning}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-6 items-stretch">
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#605e5c] uppercase tracking-wide mb-1.5">Target Units</label>
                                    <div className="relative">
                                        <input
                                            type="number" min="0" value={quotaForm}
                                            onChange={e => setQuotaForm(parseInt(e.target.value) || 0)}
                                            className="w-full h-10 px-3 bg-white border border-[#8a8886] rounded-sm text-[15px] font-semibold text-[#201f1e] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#605e5c] uppercase tracking-wide mb-1.5">Hiring Type</label>
                                    <select
                                        value={quotaHiringType}
                                        onChange={e => setQuotaHiringType(e.target.value as 'Billed' | 'Non-Billed')}
                                        className="w-full h-10 px-3 bg-white border border-[#8a8886] rounded-sm text-[13px] font-semibold text-[#201f1e] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none cursor-pointer"
                                    >
                                        <option value="Billed">Billed</option>
                                        <option value="Non-Billed">Non-Billed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#605e5c] uppercase tracking-wide mb-1.5">Manual Hires</label>
                                    <input
                                        type="number" min="0" value={quotaManualHired}
                                        onChange={e => setQuotaManualHired(parseInt(e.target.value) || 0)}
                                        className="w-full h-10 px-3 bg-white border border-[#8a8886] rounded-sm text-[13px] font-semibold text-[#201f1e] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#605e5c] uppercase tracking-wide mb-1.5">Season Start</label>
                                    <CalendarDropdown
                                        value={quotaStartDate}
                                        onChange={val => {
                                            const nextStart = val < todayInputValue() ? todayInputValue() : val;
                                            setQuotaStartDate(nextStart);
                                            if (quotaEndDate && quotaEndDate < nextStart) setQuotaEndDate(nextStart);
                                        }}
                                        min={todayInputValue()}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#605e5c] uppercase tracking-wide mb-1.5">Season End</label>
                                    <CalendarDropdown
                                        value={quotaEndDate}
                                        onChange={val => {
                                            const minEnd = quotaStartDate || todayInputValue();
                                            setQuotaEndDate(val < minEnd ? minEnd : val);
                                        }}
                                        min={quotaStartDate || todayInputValue()}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#605e5c] uppercase tracking-wide mb-1.5">Training Start Date</label>
                                    <CalendarDropdown
                                        value={quotaTrainingStartDate}
                                        onChange={setQuotaTrainingStartDate}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#605e5c] uppercase tracking-wide mb-1.5">Hiring Quota ID</label>
                                    <input
                                        type="text"
                                        value={quotaHiringQuotaId}
                                        onChange={e => setQuotaHiringQuotaId(e.target.value)}
                                        className="w-full h-10 px-3 bg-white border border-[#8a8886] rounded-sm text-[13px] font-semibold text-[#201f1e] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        placeholder="e.g. Q-101"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#faf9f8] border border-[#edebe9] rounded-sm p-4 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div>
                                    <span className="block text-[10px] font-semibold text-[#605e5c] uppercase tracking-wide">Duration</span>
                                    <span className="block text-[22px] font-semibold text-[#005a9e] mt-1 leading-tight">
                                        {getDurationLabel(quotaStartDate, quotaEndDate)}
                                    </span>
                                </div>
                                <div className="h-px bg-[#edebe9]" />
                                <div className="space-y-3 text-[12px]">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[#605e5c]">Account</span>
                                        <span className="font-semibold text-[#201f1e] text-right truncate">{selectedAccount?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[#605e5c]">Current quota</span>
                                        <span className="font-semibold text-[#201f1e]">{accountDashboardData?.totalQuota || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[#605e5c]">New quota</span>
                                        <span className="font-semibold text-[#201f1e]">{quotaForm || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[#605e5c]">Manual Hires</span>
                                        <span className="font-semibold text-[#201f1e]">{quotaManualHired || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#edebe9] text-left">
                        <button
                            onClick={() => { setQuotaModal(false); resetQuotaForm(); }}
                            className="h-10 px-6 bg-white border border-[#c8c6c4] text-[13px] font-semibold text-[#323130] hover:bg-[#f3f2f1] active:bg-[#edebe9] rounded-sm transition-all text-center"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={() => handleUpdateQuota()}
                            disabled={submitting || quotaForm <= 0 || !quotaStartDate || !quotaEndDate || new Date(quotaEndDate) < new Date(quotaStartDate)}
                            className="h-10 min-w-44 px-6 bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white text-[13px] font-semibold rounded-sm shadow-none transition-all text-center disabled:bg-[#c8c6c4] disabled:text-white disabled:cursor-not-allowed"
                        >
                            {accountDashboardData?.isActive ? 'Commit Changes' : 'Initialize Recruitment'}
                        </button>
                    </div>
                </div>
            </Modal>

            <QuotaHistoryModal
                quotaHistoryDrilldown={quotaHistoryDrilldown}
                setQuotaHistoryDrilldown={setQuotaHistoryDrilldown}
                quotaHistoryMetricLabels={quotaHistoryMetricLabels}
                getDurationLabel={getDurationLabel}
                toDateInputValue={toDateInputValue}
                quotaHistoryDrilldownApps={quotaHistoryDrilldownApps}
                getSeasonActivityDate={getSeasonActivityDate}
            />

            <AccountFormModal
                modal={modal}
                setModal={setModal}
                editingId={editingId}
                setEditingId={setEditingId}
                form={form}
                setForm={setForm}
                handleAddAccount={handleAddAccount}
                submitting={submitting}
            />

            <ConfirmDialog
                open={!!delConfirm}
                onClose={() => setDelConfirm(null)}
                onConfirm={handleDelete}
                title="Decommission Account"
                message={`Are you sure you want to permanently decommission "${delConfirm?.name}"? All associated internal analysis data will be lost.`}
            />

            <ConfirmDialog
                open={closeConfirm}
                onClose={() => setCloseConfirm(false)}
                onConfirm={() => handleUpdateQuota(0)}
                title="Cease Recruitment"
                message={`This action will save the current quota season for ${selectedAccount?.name} into Hiring Quota History and reset the active target to zero. Proceed?`}
            />

            <ConfirmDialog
                open={cancelConfirm}
                onClose={() => setCancelConfirm(false)}
                onConfirm={() => handleUpdateQuota(0, true)}
                title="Abort Recruitment Campaign"
                message={`Are you sure you want to cancel recruitment for ${selectedAccount?.name}? This will reset the active quota and start/end dates to zero/null WITHOUT archiving the season to history. This is ideal if the campaign was opened in error or aborted.`}
            />
        </div>
    );
}
