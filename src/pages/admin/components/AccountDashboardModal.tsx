import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { CalendarDropdown } from '@/components/common/CalendarDropdown';
import { cn } from '@/utils/formatters';
import { AccountAvatar } from './AccountAvatar';
import {
    Target, CheckCircle2, Activity, TrendingUp,
    Users, History, Camera, Calendar,
    Lock, Plus, Ban, UserCheck, Clock,
    TrendingDown, Settings, Save, AlertCircle, Briefcase, Trash2, Edit2,
    ClipboardList, ChevronRight, Sparkles, X, BarChart3, List, LayoutGrid
} from 'lucide-react';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import { useToast } from '@/components/common/useToast';
import type { Application } from '@/types';
import { PositionService, type HiringQuotaHistory } from '@/services/PositionService';
import type { QuotaHistoryMetric } from './QuotaHistoryModal';
import { QuotaHistoryDashboardModal } from './QuotaHistoryDashboardModal';
import { type CancelledClass } from '../AccountManagement';
import { MASTERLIST_COLUMNS, NOT_ELIGIBLE_COLUMNS } from '../../recruiter/tracker/masterlist/constants';
import { SPECIFIC_STATUS_OPTIONS } from '../../recruiter/tracker/utils/statusMappings';

export interface AccountDashboardData {
    totalQuota: number;
    totalHired: number;
    inPipeline: number;
    failedCount: number;
    totalApplicants: number;
    remaining: number;
    progress: number;
    internalPosId?: string;
    hiringType?: 'Billed' | 'Non-Billed';
    manualHired: number;
    quotaStart?: string | null;
    quotaEnd?: string | null;
    durationLabel: string;
    history: HiringQuotaHistory[];
    isActive: boolean;
    filteredApplicants: Application[];
    trainingStartDate?: string | null;
    hiringQuotaId?: string;
}

interface AccountDashboardModalProps {
    dashboardModal: boolean;
    setDashboardModal: (open: boolean) => void;
    selectedAccount: Department | null;
    setSelectedAccount: (dept: Department | null) => void;
    accountDashboardData: AccountDashboardData | null;
    dashboardTab: 'overview' | 'history' | 'cancelled' | 'hiring_requirements';
    setDashboardTab: (tab: 'overview' | 'history' | 'cancelled' | 'hiring_requirements') => void;
    activePipelineFilter: string | null;
    setActivePipelineFilter: (filter: string | null) => void;
    setQuotaHistoryDrilldown: (drilldown: { item: HiringQuotaHistory; metric: QuotaHistoryMetric } | null) => void;
    handleAccountImageUpload: (dept: Department, file?: File | null) => Promise<void>;
    submitting: boolean;
    setQuotaForm: (val: number) => void;
    setQuotaManualHired: (val: number) => void;
    setQuotaStartDate: (date: string) => void;
    setQuotaEndDate: (date: string) => void;
    setQuotaHiringType: (val: 'Billed' | 'Non-Billed') => void;
    setQuotaTrainingStartDate: (date: string) => void;
    setQuotaHiringQuotaId: (val: string) => void;
    setQuotaModal: (open: boolean) => void;
    setCloseConfirm: (open: boolean) => void;
    setCancelConfirm: (open: boolean) => void;
    cancelledClasses: CancelledClass[];
    onDeleteCancelled?: (id: string) => void;
    todayInputValue: () => string;
    toDateInputValue: (value?: string | null) => string;
    getDurationLabel: (start?: string | null, end?: string | null) => string;
    loadData?: () => Promise<void>;
}

export function AccountDashboardModal({
    dashboardModal, setDashboardModal, selectedAccount, setSelectedAccount, accountDashboardData,
    dashboardTab, setDashboardTab, activePipelineFilter, setActivePipelineFilter, setQuotaHistoryDrilldown,
    handleAccountImageUpload, submitting, setQuotaForm, setQuotaManualHired, setQuotaStartDate, setQuotaEndDate,
    setQuotaHiringType, setQuotaTrainingStartDate, setQuotaHiringQuotaId, setQuotaModal, setCloseConfirm,
    setCancelConfirm, cancelledClasses, onDeleteCancelled, todayInputValue, toDateInputValue, getDurationLabel, loadData
}: AccountDashboardModalProps) {

    const [expandedCardId, setExpandedCardId] = React.useState<string | null>(null);
    const [quotaHistoryViewMode, setQuotaHistoryViewMode] = React.useState<'list' | 'cards'>('list');
    const [selectedHistoryDashboard, setSelectedHistoryDashboard] = React.useState<HiringQuotaHistory | null>(null);
    const { success, error: toastError } = useToast();
    const formatDisplayDate = (dateStr?: string | null) => {
        if (!dateStr) return 'Not set';
        const parts = dateStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
                return `${months[monthIndex]} ${day}, ${year}`;
            }
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const [deletingId, setDeletingId] = React.useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
    const [deleteProgress, setDeleteProgress] = React.useState(0);
    const [deleteStage, setDeleteStage] = React.useState('');
    const [isAddingHistory, setIsAddingHistory] = React.useState(false);
    const [editingHistoryId, setEditingHistoryId] = React.useState<string | null>(null);
    const [historyQuota, setHistoryQuota] = React.useState<number>(0);
    const [historyHiringType, setHistoryHiringType] = React.useState<'Billed' | 'Non-Billed'>('Billed');
    const [historyManualHires, setHistoryManualHires] = React.useState<number>(0);
    const [historyStart, setHistoryStart] = React.useState<string>('');
    const [historyEnd, setHistoryEnd] = React.useState<string>('');
    const [historyTrainingStart, setHistoryTrainingStart] = React.useState<string>('');
    const [historyHiringQuotaId, setHistoryHiringQuotaId] = React.useState<string>('');
    const [savingHistory, setSavingHistory] = React.useState(false);
    const [filterStartDate, setFilterStartDate] = React.useState<string>('');
    const [filterEndDate, setFilterEndDate] = React.useState<string>('');

    const filteredHistory = React.useMemo(() => {
        let list = [...(accountDashboardData?.history || [])];
        if (filterStartDate) {
            list = list.filter(item => item.startDate && item.startDate >= filterStartDate);
        }
        if (filterEndDate) {
            list = list.filter(item => item.endDate && item.endDate <= filterEndDate);
        }
        return list.sort((a, b) => {
            const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
            if (dateA === 0 && dateB > 0) return 1;
            if (dateB === 0 && dateA > 0) return -1;
            return dateB - dateA;
        });
    }, [accountDashboardData?.history, filterStartDate, filterEndDate]);

    const [localSettings, setLocalSettings] = React.useState<{ required: string[]; optional: string[]; customRules?: any[]; standardSettings?: Record<string, string>; activeStandards?: string[] }>({
        required: selectedAccount?.eligibilitySettings?.required || ['Status', '1st Day Show up', 'Final Specific Status'],
        optional: selectedAccount?.eligibilitySettings?.optional || ['2nd Day Show up'],
        customRules: selectedAccount?.eligibilitySettings?.customRules || [],
        standardSettings: selectedAccount?.eligibilitySettings?.standardSettings || {},
        activeStandards: selectedAccount?.eligibilitySettings?.activeStandards || ['Status', '1st Day Show up', 'Final Specific Status', '2nd Day Show up', 'PEME Status', 'BGS Status', 'RCBC Status', 'NBI Status']
    });
    const [savingSettings, setSavingSettings] = React.useState(false);
    const [applicantsTab, setApplicantsTab] = React.useState<'ongoing' | 'hired'>('ongoing');

    const [isAddingRule, setIsAddingRule] = React.useState(false);
    const [ruleSource, setRuleSource] = React.useState<'masterlist' | 'interview'>('masterlist');
    const [ruleColumn, setRuleColumn] = React.useState('');
    const [ruleMatchingType, setRuleMatchingType] = React.useState<'dropdown' | 'content' | 'na'>('content');
    const [ruleMatchingValue, setRuleMatchingValue] = React.useState('');
    const [ruleType, setRuleType] = React.useState<'required' | 'optional'>('required');
    const [editingRuleId, setEditingRuleId] = React.useState<string | null>(null);
    const [editingStandardField, setEditingStandardField] = React.useState<string | null>(null);

    const COLUMN_DROPDOWNS: Record<string, string[]> = React.useMemo(() => {
        let customMeta: Record<string, Record<string, { options?: string[] }>> = {};
        try {
            const saved = localStorage.getItem('masterlist_custom_column_meta');
            if (saved) customMeta = JSON.parse(saved);
        } catch {}

        const baseDropdowns: Record<string, string[]> = {
            'current_status': [
                'ACCEPTED OFFER', 'FOR JOB OFFER', 'WITHDRAWN', 'FOR PAN', 'APPLICANT FORM',
                'LATERAL TRANSFER', 'SENT JO AND BGC', 'ASSESSMENT', 'OPEN', 'CLOSED', 'HIRED',
                'PASSED', 'SCHEDULED', 'FINAL INTERVIEW', 'IN PROGRESS', 'QUEUED', 'ENDORSED',
                'TYPING TEST', 'INITIAL INTERVIEW', 'REJECTED'
            ],
            'master_first_day_show_up': ['Showed', 'No-Show', 'Fallout', '---'],
            'master_second_day_show_up': ['Showed', 'No-Show', 'Fallout', '---'],
            'master_peme_status': ['Endorsed', '---'],
            'master_peme_result': ['Class A', 'Class B', 'Class C', 'Pending', '---'],
            'master_bgs_status': ['Done', 'Pending', '---'],
            'master_rcbc_status': ['Done', 'Pending', '---'],
            'master_nbi_result': ['Done', 'Pending', '---'],
            'master_h2r_status': ['Passed', 'Failed', 'Pending', '---'],
            'pis.ops_validator_status': ['Passed', 'Failed', 'Pending', '---'],
            'pis.client_interview_status': ['Passed', 'Failed', 'Pending', '---'],
            'pis.leadership_assessment_status': ['Passed', 'Failed', 'Pending', '---'],
            'pis.wonderlic_status': ['Passed', 'Failed', 'Pending', '---'],
            'pis.overall_status': ['Passed', 'Failed', 'Pending', '---'],
            'pis.initial_interview_results': ['Passed', 'Failed', 'Pending', '---'],
            'pis.final_specific_status': SPECIFIC_STATUS_OPTIONS,
            'pis.tin_no': ['Yes', 'No']
        };

        Object.keys(customMeta).forEach(tabKey => {
            const tabMeta = customMeta[tabKey] || {};
            Object.keys(tabMeta).forEach(colKey => {
                const options = tabMeta[colKey]?.options;
                if (options && options.length > 0) {
                    baseDropdowns[colKey] = options;
                }
            });
        });

        return baseDropdowns;
    }, [dashboardTab, selectedAccount]);

    const STANDARD_FIELD_COLUMN_MAP: Record<string, string> = {
        'Status': 'current_status',
        '1st Day Show up': 'master_first_day_show_up',
        '2nd Day Show up': 'master_second_day_show_up',
        'Final Specific Status': 'pis.final_specific_status',
        'PEME Status': 'master_peme_result',
        'BGS Status': 'master_bgs_status',
        'RCBC Status': 'master_rcbc_status',
        'NBI Status': 'master_nbi_result'
    };

    React.useEffect(() => {
        if (selectedAccount && dashboardTab === 'hiring_requirements') {
            setLocalSettings({
                required: selectedAccount.eligibilitySettings?.required || ['Status', '1st Day Show up', 'Final Specific Status'],
                optional: selectedAccount.eligibilitySettings?.optional || ['2nd Day Show up'],
                customRules: selectedAccount.eligibilitySettings?.customRules || [],
                standardSettings: selectedAccount.eligibilitySettings?.standardSettings || {},
                activeStandards: selectedAccount.eligibilitySettings?.activeStandards || ['Status', '1st Day Show up', 'Final Specific Status', '2nd Day Show up', 'PEME Status', 'BGS Status', 'RCBC Status', 'NBI Status']
            });
        }
    }, [selectedAccount, dashboardTab]);

    React.useEffect(() => {
        if (dashboardTab !== 'history') {
            setExpandedCardId(null);
        }
        setFilterStartDate('');
        setFilterEndDate('');
    }, [dashboardTab, selectedAccount]);

    const CRITERIA_ITEMS = [
        { name: 'Status', desc: 'Candidate status (overall status = Accepted Offer, Hired, etc.)' },
        { name: '1st Day Show up', desc: 'Candidate present on the first training/neo day (showed/present)' },
        { name: 'Final Specific Status', desc: 'Passed final validations (client interview or ops validation passed)' },
        { name: '2nd Day Show up', desc: 'Candidate present on the second day (showed/present)' },
        { name: 'PEME Status', desc: 'Pre-employment Medical Examination fit/passed' },
        { name: 'BGS Status', desc: 'Background check completed or cleared' },
        { name: 'RCBC Status', desc: 'Payroll account creation status completed' },
        { name: 'NBI Status', desc: 'NBI Clearance clearance submitted or cleared' }
    ];

    const handleCriteriaChange = (name: string, type: 'required' | 'optional' | 'disabled') => {
        setLocalSettings(prev => {
            const nextReq = prev.required.filter(x => x !== name);
            const nextOpt = prev.optional.filter(x => x !== name);
            if (type === 'required') nextReq.push(name);
            if (type === 'optional') nextOpt.push(name);
            return { ...prev, required: nextReq, optional: nextOpt };
        });
    };

    const handleSaveSettings = async () => {
        if (!selectedAccount) return;
        setSavingSettings(true);
        try {
            const updated = await DepartmentService.update(selectedAccount.id, {
                eligibilitySettings: localSettings
            });
            setSelectedAccount(updated);
            if (loadData) await loadData();
            success('Settings Saved', 'Hire eligibility criteria updated successfully.');
        } catch (err) {
            toastError('Save Failed', 'Could not update eligibility settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSaveHistoryRecord = async () => {
        if (!selectedAccount || !accountDashboardData) return;
        setSavingHistory(true);
        try {
            const payload = {
                department: selectedAccount.name,
                positionId: accountDashboardData.internalPosId || undefined,
                quota: historyQuota,
                hiredCount: historyManualHires,
                totalApplicants: 0,
                inPipeline: 0,
                failedCount: 0,
                startDate: historyStart || undefined,
                endDate: historyEnd || undefined,
                hiringType: historyHiringType,
                manualHires: historyManualHires,
                trainingStartDate: historyTrainingStart || undefined,
                hiringQuotaId: historyHiringQuotaId || undefined
            };

            if (editingHistoryId) {
                await PositionService.updateQuotaHistory(editingHistoryId, payload);
                success('History Updated', 'Historical quota record updated successfully.');
            } else {
                await PositionService.archiveQuotaHistory(payload);
                success('History Added', 'Previous quota record added successfully.');
            }
            setIsAddingHistory(false);
            setEditingHistoryId(null);
            setHistoryQuota(0);
            setHistoryHiringType('Billed');
            setHistoryManualHires(0);
            setHistoryStart('');
            setHistoryEnd('');
            setHistoryTrainingStart('');
            setHistoryHiringQuotaId('');
            if (loadData) await loadData();
        } catch (err) {
            toastError('Save Failed', 'Could not save historical quota record.');
        } finally {
            setSavingHistory(false);
        }
    };

    const handleEditHistoryClick = (item: HiringQuotaHistory) => {
        setEditingHistoryId(item.id);
        setHistoryQuota(item.quota || 0);
        setHistoryHiringType((item.hiringType === 'Non-Billed' ? 'Non-Billed' : 'Billed') as 'Billed' | 'Non-Billed');
        setHistoryManualHires(item.manualHires || 0);
        setHistoryStart(toDateInputValue(item.startDate));
        setHistoryEnd(toDateInputValue(item.endDate));
        setHistoryTrainingStart(item.trainingStartDate ? toDateInputValue(item.trainingStartDate) : '');
        setHistoryHiringQuotaId(item.hiringQuotaId || '');
        setIsAddingHistory(true);
    };

    const handleDeleteHistory = async (id: string) => {
        const isCancelled = cancelledClasses.some(c => c.id === id);
        setDeletingId(id);
        setDeleteProgress(0);
        setDeleteStage(isCancelled ? "Purging cancelled campaign record..." : "Purging historical record...");
        const interval = setInterval(() => {
            setDeleteProgress(p => {
                if (p >= 90) { clearInterval(interval); return p; }
                const next = p + Math.floor(Math.random() * 15) + 8;
                if (next > 40 && next < 70) setDeleteStage("Re-indexing database partitions...");
                else if (next >= 70) setDeleteStage("Updating dashboard metrics...");
                return Math.min(90, next);
            });
        }, 120);
        try {
            if (isCancelled) {
                if (onDeleteCancelled) onDeleteCancelled(id);
            } else {
                await PositionService.deleteQuotaHistory(id);
            }
            clearInterval(interval);
            setDeleteProgress(100);
            setDeleteStage("Record successfully deleted!");
            await new Promise(r => setTimeout(r, 600));
            success(
                isCancelled ? 'Campaign Deleted' : 'History Deleted',
                isCancelled ? 'Cancelled campaign record has been removed.' : 'Historical quota record has been removed.'
            );
            if (!isCancelled && loadData) await loadData();
        } catch {
            clearInterval(interval);
            toastError('Delete Failed', isCancelled ? 'Failed to delete cancelled campaign.' : 'Failed to delete historical quota record.');
        } finally {
            setDeletingId(null);
            setDeleteProgress(0);
            setDeleteStage('');
        }
    };

    if (!selectedAccount || !accountDashboardData) return null;

    const hiringSuccess = accountDashboardData.totalApplicants > 0
        ? Math.round((accountDashboardData.totalHired / accountDashboardData.totalApplicants) * 100)
        : 0;
    const falloutRate = accountDashboardData.totalApplicants > 0
        ? Math.round((accountDashboardData.failedCount / accountDashboardData.totalApplicants) * 100)
        : 0;
    const pipelineConv = accountDashboardData.totalApplicants > 0
        ? Math.round((accountDashboardData.inPipeline / accountDashboardData.totalApplicants) * 100)
        : 0;
    const totalOffered = Math.max(0, accountDashboardData.totalHired + Math.round(accountDashboardData.inPipeline * 0.15));
    const offerAcceptance = totalOffered > 0
        ? Math.round((accountDashboardData.totalHired / totalOffered) * 100)
        : 0;

    const funnelStages = [
        { key: 'Applied', label: 'Applied', count: accountDashboardData.totalApplicants, color: '#2563EB', bg: 'bg-indigo-50/70', text: 'text-indigo-600' },
        { key: 'In pipeline', label: 'In progress', count: accountDashboardData.inPipeline, color: '#F59E0B', bg: 'bg-amber-50/70', text: 'text-amber-600' },
        { key: 'Offered', label: 'Offered', count: totalOffered, color: '#8B5CF6', bg: 'bg-violet-50/70', text: 'text-violet-600' },
        { key: 'Hired', label: 'Hired', count: accountDashboardData.totalHired, color: '#10B981', bg: 'bg-emerald-50/70', text: 'text-emerald-600' },
        { key: 'Fallout', label: 'Rejected', count: accountDashboardData.failedCount, color: '#EF4444', bg: 'bg-rose-50/70', text: 'text-rose-600' }
    ];
    const maxFunnelCount = Math.max(1, ...funnelStages.map(s => s.count));

    const tabItems = [
        { key: 'overview' as const, label: 'Recruitment Funnel', icon: ClipboardList, desc: 'Conversion funnel & performance metrics' },
        { key: 'history' as const, label: 'Quota History', icon: History, desc: 'Past campaign results & archives' },
        { key: 'cancelled' as const, label: 'Cancelled Campaigns', icon: Ban, desc: 'Aborted quota seasons' },
        { key: 'hiring_requirements' as const, label: 'Hiring & Eligibility', icon: Settings, desc: 'Milestones & candidate listing' }
    ];

    return (
        <Modal
            open={dashboardModal}
            onClose={() => {
                setDashboardModal(false);
                setSelectedAccount(null);
                setActivePipelineFilter(null);
                setDashboardTab('overview');
                setQuotaHistoryDrilldown(null);
                setExpandedCardId(null);
                setSelectedHistoryDashboard(null);
            }}
            title=""
            size="2xl"
            className="max-w-[1200px] w-full"
        >
            <div className="flex flex-col bg-slate-50/30 text-left overflow-hidden rounded-b-none font-sans p-8 space-y-6 select-none relative">
                <button
                    onClick={() => {
                        setDashboardModal(false);
                        setSelectedAccount(null);
                        setActivePipelineFilter(null);
                        setDashboardTab('overview');
                        setQuotaHistoryDrilldown(null);
                        setExpandedCardId(null);
                        setSelectedHistoryDashboard(null);
                    }}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition-all cursor-pointer z-50"
                >
                    <X size={18} />
                </button>
                
                <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-start sm:items-center gap-5 min-w-0 text-left">
                            <div className="relative group/avatar shrink-0">
                                <div className="p-1 rounded-sm bg-slate-50 border border-slate-200 shadow-xs overflow-hidden transition-all duration-300">
                                    <AccountAvatar department={selectedAccount} size="xl" quota={accountDashboardData.totalQuota} />
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 cursor-pointer rounded-sm">
                                    <Camera size={16} />
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        className="hidden"
                                        disabled={submitting}
                                        onChange={(event) => {
                                            void handleAccountImageUpload(selectedAccount, event.target.files?.[0]);
                                            event.target.value = '';
                                        }}
                                    />
                                </label>
                            </div>

                            <div className="min-w-0 text-left space-y-2.5">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none uppercase">
                                        {selectedAccount.name}
                                    </h2>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={cn(
                                            "px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-sm border flex items-center gap-1 shadow-xs",
                                            accountDashboardData.isActive
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-slate-100 text-slate-500 border-slate-200"
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", accountDashboardData.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                                            {accountDashboardData.isActive ? 'Active' : 'Paused'}
                                        </span>
                                        {accountDashboardData.hiringType && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-sm border bg-blue-50 text-blue-700 border-blue-200 shadow-xs">
                                                {accountDashboardData.hiringType}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 font-mono tracking-tight bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200">ID: {selectedAccount.id.slice(0, 8)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 text-[11px]">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-650 rounded-sm shadow-2xs">
                                        <UserCheck size={13} className="text-blue-500" />
                                        <span className="text-slate-450 font-medium">Owner:</span>
                                        <span className="font-bold text-slate-700">{selectedAccount.head || 'Maria Cruz'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-650 rounded-sm shadow-2xs">
                                        <Briefcase size={13} className="text-slate-400" />
                                        <span className="text-slate-450 font-medium">Budget:</span>
                                        <span className="font-bold text-slate-700">{selectedAccount.budgetCode || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-650 rounded-sm shadow-2xs">
                                        <Calendar size={13} className="text-slate-400" />
                                        <span className="text-slate-450 font-medium">Period:</span>
                                        <span className="font-bold text-slate-700">{formatDisplayDate(accountDashboardData.quotaStart)} – {formatDisplayDate(accountDashboardData.quotaEnd)}</span>
                                        <span className="ml-1 px-1.5 py-0.2 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold rounded-sm flex items-center gap-1 shadow-2xs">
                                            <Clock size={10} className="text-blue-500" />
                                            {accountDashboardData.durationLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-150">
                            {accountDashboardData.isActive ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setQuotaForm(accountDashboardData.totalQuota);
                                            setQuotaManualHired(accountDashboardData.manualHired || 0);
                                            const existingStart = toDateInputValue(accountDashboardData.quotaStart);
                                            setQuotaStartDate(existingStart && existingStart >= todayInputValue() ? existingStart : todayInputValue());
                                            setQuotaEndDate(toDateInputValue(accountDashboardData.quotaEnd));
                                            setQuotaHiringType(accountDashboardData.hiringType || 'Billed');
                                            setQuotaTrainingStartDate(accountDashboardData.trainingStartDate ? toDateInputValue(accountDashboardData.trainingStartDate) : '');
                                            setQuotaHiringQuotaId(accountDashboardData.hiringQuotaId || '');
                                            setQuotaModal(true);
                                        }}
                                        className="px-3.5 h-8 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-sm transition-colors border border-blue-750 shadow-sm cursor-pointer"
                                    >
                                        Update Quota
                                    </button>
                                    <button
                                        onClick={() => setCloseConfirm(true)}
                                        className="flex items-center gap-1 px-3 h-8 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-sm transition-colors shadow-xs cursor-pointer"
                                    >
                                        <Lock size={12} />
                                        Close
                                    </button>
                                    <button
                                        onClick={() => setCancelConfirm(true)}
                                        className="flex items-center gap-1 px-3 h-8 bg-white border border-rose-205 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-slate-650 text-[11px] font-bold rounded-sm transition-colors shadow-xs cursor-pointer"
                                    >
                                        <Ban size={12} />
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setQuotaForm(0);
                                        setQuotaManualHired(0);
                                        setQuotaStartDate(todayInputValue());
                                        setQuotaEndDate('');
                                        setQuotaHiringType('Billed');
                                        setQuotaTrainingStartDate('');
                                        setQuotaHiringQuotaId('');
                                        setQuotaModal(true);
                                    }}
                                    className="flex items-center gap-1 px-3.5 h-8 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-sm transition-colors border border-blue-750 shadow-sm cursor-pointer"
                                >
                                    <Plus size={13} strokeWidth={2.5} />
                                    Open Recruitment
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {tabItems.map((item) => {
                        const isActive = dashboardTab === item.key;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.key}
                                onClick={() => setDashboardTab(item.key)}
                                className={cn(
                                    "flex items-start gap-3 p-3.5 rounded-sm border text-left transition-all duration-200 relative group overflow-hidden shadow-xs cursor-pointer outline-none",
                                    isActive
                                        ? "bg-white border-blue-600 ring-1 ring-blue-100 shadow-sm"
                                        : "bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50/50"
                                )}
                            >
                                <div className={cn(
                                    "p-2 rounded-sm border transition-colors shrink-0",
                                    isActive
                                        ? "bg-blue-50 text-blue-600 border-blue-200"
                                        : "bg-slate-50 text-slate-400 border-slate-200 group-hover:bg-blue-50/50 group-hover:text-blue-500 group-hover:border-blue-150"
                                )}>
                                    <Icon size={18} />
                                </div>
                                <div className="min-w-0 pr-2">
                                    <h4 className={cn(
                                        "text-[12.5px] font-bold transition-colors uppercase tracking-tight",
                                        isActive ? "text-blue-600" : "text-slate-700"
                                    )}>
                                        {item.label}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1 leading-tight">{item.desc}</p>
                                </div>
                                
                                {isActive && (
                                    <div className="absolute right-3 bottom-3 text-blue-500">
                                        <ChevronRight size={14} strokeWidth={2.5} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="w-full">
                    {dashboardTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden text-left">
                                    <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Recruitment Funnel</h3>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Stage-by-stage conversions</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0 min-w-[240px]">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center text-[10px] mb-1">
                                                    <span className="font-bold text-slate-500 uppercase tracking-wider">Quota Progress</span>
                                                    <span className="font-extrabold text-blue-600">{accountDashboardData.totalHired} / {accountDashboardData.totalQuota} Hired ({hiringSuccess}%)</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 border border-slate-200/50 rounded-none overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, hiringSuccess)}%` }}
                                                        className="h-full bg-blue-600 rounded-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-3">
                                        {funnelStages.map((stage, i) => {
                                            const prev = i > 0 ? funnelStages[i - 1].count : stage.count;
                                            const conv = i === 0 ? 100 : (prev > 0 ? Math.round((stage.count / prev) * 100) : 0);
                                            const barWidth = Math.max(2, (stage.count / maxFunnelCount) * 100);
                                            const isActive = activePipelineFilter === stage.label;

                                            return (
                                                <button
                                                    key={stage.key}
                                                    onClick={() => setActivePipelineFilter(isActive ? null : stage.label)}
                                                    className={cn(
                                                        "w-full transition-all p-3.5 rounded-sm border text-left flex flex-col gap-2.5 shadow-xs cursor-pointer outline-none",
                                                        isActive ? "bg-blue-50/40 border-blue-300 shadow-sm" : "bg-white hover:bg-slate-50/40 border-slate-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "w-6 h-6 text-[10px] font-bold rounded-sm flex items-center justify-center border shadow-inner shrink-0",
                                                            stage.bg, stage.text, isActive ? "border-blue-300" : "border-slate-200"
                                                        )}>
                                                            {String(i + 1).padStart(2, '0')}
                                                        </span>
                                                        <span className={cn("text-[12px] font-bold flex-1 uppercase tracking-tight", isActive ? "text-blue-600" : "text-slate-600")}>
                                                            {stage.label}
                                                        </span>
                                                        <span className="text-[13px] font-bold text-slate-800">{stage.count}</span>
                                                        {i > 0 && (
                                                            <span className="text-[9px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-sm font-bold border border-slate-200">
                                                                {conv}% conv
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-none overflow-hidden border border-slate-200/50">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${barWidth}%` }}
                                                            className="h-full rounded-none transition-all duration-500"
                                                            style={{ backgroundColor: stage.color }}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden flex flex-col divide-y divide-slate-200 text-left">
                                    <div className="px-5 py-4 bg-slate-50/30">
                                        <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Account Diagnostics</h3>
                                    </div>

                                    <div className="p-5 space-y-3.5">
                                        {[
                                            { label: 'Hire Rate', value: hiringSuccess, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                                            { label: 'Rejection Rate', value: falloutRate, icon: TrendingDown, color: 'text-rose-600 bg-rose-50 border-rose-100' },
                                            { label: 'Pipeline Progress', value: pipelineConv, icon: Activity, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                                            { label: 'Offer Acceptance Rate', value: offerAcceptance, icon: UserCheck, color: 'text-blue-600 bg-blue-50 border-blue-100' }
                                        ].map((m) => (
                                            <div key={m.label} className="flex items-center justify-between bg-slate-50/40 p-3 rounded-sm border border-slate-200">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn("w-6 h-6 rounded-sm flex items-center justify-center border", m.color)}>
                                                        <m.icon size={12} strokeWidth={2.5} />
                                                    </div>
                                                    <span className="text-[12px] font-bold text-slate-600">{m.label}</span>
                                                </div>
                                                <span className={cn("text-[13px] font-bold", m.color.split(' ')[0])}>
                                                    {m.value}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-5 bg-slate-50/20 space-y-3">
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Account Overview</span>
                                        {[
                                            { label: 'Manager', value: selectedAccount.head || 'Unassigned' },
                                            { label: 'Budget code', value: selectedAccount.budgetCode || 'N/A' },
                                            { label: 'Created', value: new Date(selectedAccount.created_at).toLocaleDateString() },
                                            { label: 'Total candidates', value: accountDashboardData.totalApplicants.toString() }
                                        ].map((row) => (
                                            <div key={row.label} className="flex justify-between items-center text-[12px]">
                                                <span className="text-slate-500 font-semibold">{row.label}</span>
                                                <span className="font-bold text-slate-700">{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {dashboardTab === 'history' && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-left">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                <div>
                                    <h3 className="text-[13px] font-bold text-slate-705 uppercase tracking-wider">Hiring Quota History</h3>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Closed seasonal quota archives</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-lg shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setQuotaHistoryViewMode('list')}
                                            className={cn(
                                                "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all flex items-center gap-1.5 cursor-pointer border-0 outline-none",
                                                quotaHistoryViewMode === 'list'
                                                    ? "bg-white text-slate-800 shadow-xs"
                                                    : "bg-transparent text-slate-500 hover:text-slate-800"
                                            )}
                                        >
                                            <List size={11} />
                                            <span>List</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuotaHistoryViewMode('cards')}
                                            className={cn(
                                                "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all flex items-center gap-1.5 cursor-pointer border-0 outline-none",
                                                quotaHistoryViewMode === 'cards'
                                                    ? "bg-white text-slate-800 shadow-xs"
                                                    : "bg-transparent text-slate-500 hover:text-slate-800"
                                            )}
                                        >
                                            <LayoutGrid size={11} />
                                            <span>Cards</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingHistoryId(null);
                                            setHistoryQuota(0);
                                            setHistoryHiringType('Billed');
                                            setHistoryManualHires(0);
                                            setHistoryStart('');
                                            setHistoryEnd('');
                                            setHistoryTrainingStart('');
                                            setHistoryHiringQuotaId('');
                                            setIsAddingHistory(true);
                                        }}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-all border border-indigo-700 shadow-xs cursor-pointer"
                                    >
                                        Add Previous Quota
                                    </button>
                                </div>
                            </div>
                            
                            <Modal
                                open={isAddingHistory}
                                onClose={() => { setIsAddingHistory(false); setEditingHistoryId(null); }}
                                title={editingHistoryId ? "EDIT PREVIOUS QUOTA RECORD" : "ADD PREVIOUS QUOTA RECORD"}
                                size="lg"
                            >
                                <div className="space-y-6 text-left">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Target Units</label>
                                            <input
                                                type="number" min="0" value={historyQuota}
                                                onChange={e => setHistoryQuota(parseInt(e.target.value) || 0)}
                                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[12px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hiring Type</label>
                                            <select
                                                value={historyHiringType}
                                                onChange={e => setHistoryHiringType(e.target.value as 'Billed' | 'Non-Billed')}
                                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[12px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer"
                                            >
                                                <option value="Billed">Billed</option>
                                                <option value="Non-Billed">Non-Billed</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Manual Hires</label>
                                            <input
                                                type="number" min="0" value={historyManualHires}
                                                onChange={e => setHistoryManualHires(parseInt(e.target.value) || 0)}
                                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[12px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Season Start</label>
                                            <CalendarDropdown
                                                value={historyStart}
                                                onChange={setHistoryStart}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Season End</label>
                                            <CalendarDropdown
                                                value={historyEnd}
                                                onChange={setHistoryEnd}
                                                min={historyStart}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Training Start Date</label>
                                            <CalendarDropdown
                                                value={historyTrainingStart}
                                                onChange={setHistoryTrainingStart}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hiring Quota ID</label>
                                            <input
                                                type="text" value={historyHiringQuotaId}
                                                onChange={e => setHistoryHiringQuotaId(e.target.value)}
                                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[12px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                                                placeholder="e.g. Q-101"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => { setIsAddingHistory(false); setEditingHistoryId(null); }}
                                            className="px-4 py-2 bg-white border border-slate-200 text-[11px] font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveHistoryRecord}
                                            disabled={savingHistory}
                                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                                        >
                                            {savingHistory ? 'Saving…' : (editingHistoryId ? 'Save Changes' : 'Save Record')}
                                        </button>
                                    </div>
                                </div>
                            </Modal>

                            {accountDashboardData.history.length > 0 && (
                                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/20 flex flex-wrap items-center gap-4 text-left">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Filter campaigns:</span>
                                    <div className="flex items-center gap-2 max-w-[200px] w-full">
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">From</span>
                                        <CalendarDropdown
                                            value={filterStartDate}
                                            onChange={setFilterStartDate}
                                            label="Start Date"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 max-w-[200px] w-full">
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">To</span>
                                        <CalendarDropdown
                                            value={filterEndDate}
                                            onChange={setFilterEndDate}
                                            label="End Date"
                                            min={filterStartDate}
                                        />
                                    </div>
                                    {(filterStartDate || filterEndDate) && (
                                        <button
                                            type="button"
                                            onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/60 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}

                            {filteredHistory.length > 0 ? (
                                quotaHistoryViewMode === 'cards' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-5">
                                        {filteredHistory.map((item) => {
                                            const originalIndex = accountDashboardData.history.findIndex(h => h.id === item.id);
                                            const attainment = item.quota > 0 ? Math.round((item.hiredCount / item.quota) * 100) : 0;
                                            const duration = getDurationLabel(toDateInputValue(item.startDate), toDateInputValue(item.endDate));
                                            const seasonLabel = item.startDate || item.endDate
                                                ? `${item.startDate ? formatDisplayDate(item.startDate) : 'No start'} – ${item.endDate ? formatDisplayDate(item.endDate) : 'No end'}`
                                                : 'No season dates recorded';
                                            const isExpanded = expandedCardId === item.id;

                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                                                    className={cn(
                                                        "border rounded-xl bg-white hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between",
                                                        isExpanded ? "border-blue-500 shadow-md ring-1 ring-blue-100" : "border-slate-200"
                                                    )}
                                                >
                                                    <div className="p-4 space-y-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-extrabold rounded-md shadow-xs">
                                                                Season #{accountDashboardData.history.length - originalIndex}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                                                                attainment >= 100
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : attainment >= 50
                                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                                            )}>
                                                                {attainment}% Attained
                                                            </span>
                                                        </div>
                                                        
                                                        <div>
                                                            <h4 className="text-[13px] font-extrabold text-slate-800 line-clamp-2 uppercase tracking-tight leading-tight">{seasonLabel}</h4>
                                                            <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                                                                <Clock size={11} />
                                                                {duration}
                                                            </p>
                                                        </div>

                                                        {isExpanded ? (
                                                            <div className="space-y-3 pt-2">
                                                                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                                                                    {[
                                                                        { metric: 'quota' as const, label: 'Target', value: item.quota, color: 'text-slate-800 bg-slate-50 border-slate-200' },
                                                                        { metric: 'hired' as const, label: 'Hired', value: item.hiredCount, color: 'text-emerald-700 bg-emerald-50/40 border-emerald-200' },
                                                                        { metric: 'processed' as const, label: 'Applicants', value: item.totalApplicants, color: 'text-blue-700 bg-blue-50/40 border-blue-200' },
                                                                        { metric: 'fallout' as const, label: 'Rejected', value: item.failedCount, color: 'text-rose-700 bg-rose-50/40 border-rose-200' }
                                                                    ].map(stat => (
                                                                        <button
                                                                            key={stat.label}
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setQuotaHistoryDrilldown({ item, metric: stat.metric });
                                                                            }}
                                                                            className={cn("border p-2.5 text-left rounded-lg shadow-xs transition-all hover:bg-slate-50/80 active:scale-[0.98] outline-none cursor-pointer flex flex-col justify-between", stat.color)}
                                                                            title={`View ${stat.label.toLowerCase()} details`}
                                                                        >
                                                                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{stat.label}</span>
                                                                            <span className="block text-[13px] font-extrabold leading-none mt-1">{stat.value}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {item.closedAt && (
                                                                    <div className="flex justify-between items-center text-[10.5px] border-t border-slate-100 pt-2 text-slate-500">
                                                                        <span className="font-semibold uppercase tracking-wider">Closed At</span>
                                                                        <span className="font-bold">{formatDisplayDate(item.closedAt)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-[11px]">
                                                                <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Hired Units</span>
                                                                    <span className="text-[12.5px] font-black text-slate-700 mt-0.5">{item.hiredCount} / {item.quota}</span>
                                                                </div>
                                                                <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Hiring Type</span>
                                                                    <span className="text-[12.5px] font-black text-slate-705 mt-0.5">{item.hiringType || 'Billed'}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedHistoryDashboard(item); }}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-lg cursor-pointer transition-all bg-white"
                                                        >
                                                            <BarChart3 size={12} />
                                                            Dashboard
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <div className="divide-y divide-slate-100">
                                        {filteredHistory.map((item) => {
                                            const originalIndex = accountDashboardData.history.findIndex(h => h.id === item.id);
                                            const attainment = item.quota > 0 ? Math.round((item.hiredCount / item.quota) * 100) : 0;
                                            const duration = getDurationLabel(toDateInputValue(item.startDate), toDateInputValue(item.endDate));
                                            const seasonLabel = item.startDate || item.endDate
                                                ? `${item.startDate ? formatDisplayDate(item.startDate) : 'No start'} – ${item.endDate ? formatDisplayDate(item.endDate) : 'No end'}`
                                                : 'No season dates recorded';

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors group/row"
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                        <span className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-extrabold text-slate-600 shrink-0 shadow-xs">
                                                            {accountDashboardData.history.length - originalIndex}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <h4 className="text-[12px] font-bold text-slate-800 truncate">{seasonLabel}</h4>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{duration}</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-center shrink-0">
                                                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Hired</span>
                                                        <span className="text-[13px] font-black text-slate-700">{item.hiredCount} / {item.quota}</span>
                                                    </div>

                                                    <span className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0",
                                                        attainment >= 100
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : attainment >= 50
                                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                : "bg-rose-50 text-rose-700 border-rose-200"
                                                    )}>
                                                        {attainment}%
                                                    </span>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            onClick={() => setSelectedHistoryDashboard(item)}
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md cursor-pointer transition-all bg-white"
                                                            title="View dashboard"
                                                        >
                                                            <BarChart3 size={11} />
                                                            Dashboard
                                                        </button>
                                                        <button
                                                            onClick={() => setExpandedCardId(expandedCardId === item.id ? null : item.id)}
                                                            className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer transition-all bg-white"
                                                            title="Expand details"
                                                        >
                                                            Expand
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditHistoryClick(item)}
                                                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer transition-all border border-transparent hover:border-blue-200"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setPendingDeleteId(item.id); setDeleteConfirmOpen(true); }}
                                                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-all border border-transparent hover:border-rose-200"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-16 text-center">
                                    <History size={32} className="mx-auto text-slate-300 mb-2.5" />
                                    <p className="text-[11px] font-bold text-slate-450">
                                        {accountDashboardData.history.length > 0 
                                            ? "No quota seasons match the filters" 
                                            : "No closed quota seasons yet"}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {dashboardTab === 'cancelled' && (() => {
                        const accountCancelled = cancelledClasses.filter(c => c.department.trim().toLowerCase() === selectedAccount.name.trim().toLowerCase());
                        return (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-left">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                    <div>
                                        <h3 className="text-[13px] font-bold text-slate-705 uppercase tracking-wider">Cancelled Campaigns</h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Aborted recruitment seasons</p>
                                    </div>
                                    <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-center shadow-inner">
                                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Cancelled</span>
                                        <span className="block text-[15px] font-bold text-rose-600 leading-tight tabular-nums">
                                            {accountCancelled.length}
                                        </span>
                                    </div>
                                </div>
                                {accountCancelled.length > 0 ? (
                                    <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {accountCancelled.map((item, index, arr) => {
                                            const duration = getDurationLabel(toDateInputValue(item.startDate), toDateInputValue(item.endDate));
                                            const seasonLabel = item.startDate || item.endDate
                                                ? `${item.startDate ? new Date(item.startDate).toLocaleDateString() : 'No start'} – ${item.endDate ? new Date(item.endDate).toLocaleDateString() : 'No end'}`
                                                : 'No season dates recorded';
                                            const isExpanded = expandedCardId === item.id;

                                            if (!isExpanded) {
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => setExpandedCardId(item.id)}
                                                        className="border border-slate-200 bg-white hover:border-rose-400 rounded-xl cursor-pointer hover:shadow-xs transition-colors px-4 py-3 flex items-center justify-between gap-4"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="w-6 h-6 bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center text-[10px] font-bold rounded-lg shrink-0 shadow-inner">
                                                                {arr.length - index}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <h4 className="text-[12.5px] font-bold text-slate-700 truncate">{seasonLabel}</h4>
                                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{duration}</p>
                                                            </div>
                                                        </div>
                                                        <div className="hidden sm:flex flex-col items-end shrink-0">
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Planned Quota</span>
                                                            <span className="text-[12px] font-bold text-slate-700 mt-0.5">{item.quota} slots</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="text-[9.5px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">Cancelled</span>
                                                            <span className="text-[11px] text-rose-600 font-bold hover:text-rose-700">Expand</span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={item.id} className="border border-rose-300 bg-rose-50/10 rounded-xl p-4.5 flex flex-col space-y-4">
                                                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="w-6 h-6 bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center text-[10px] font-bold rounded-lg shrink-0 shadow-inner">
                                                                {arr.length - index}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <h4 className="text-[12.5px] font-bold text-slate-800 truncate">{seasonLabel}</h4>
                                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{duration}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 items-start shrink-0">
                                                            <div className="text-right">
                                                                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Aborted</span>
                                                                <span className="block text-[11px] font-bold text-slate-600 mt-1">{new Date(item.cancelledAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setExpandedCardId(null)}
                                                                className="text-[10px] text-slate-600 hover:bg-slate-100 border border-slate-200 font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                Collapse
                                                            </button>
                                                            <button
                                                                onClick={() => { setPendingDeleteId(item.id); setDeleteConfirmOpen(true); }}
                                                                className="text-[10px] text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        {[
                                                            { label: 'Planned quota', value: item.quota, color: 'text-slate-800 bg-slate-50 border-slate-100' },
                                                            { label: 'Hired at abort', value: item.hiredCount, color: 'text-emerald-700 bg-emerald-50/30 border-emerald-100' },
                                                            { label: 'Total processed', value: item.totalApplicants, color: 'text-indigo-600 bg-indigo-50/30 border-indigo-100' },
                                                            { label: 'Fallout at abort', value: item.failedCount, color: 'text-rose-700 bg-rose-50/30 border-rose-100' }
                                                        ].map(stat => (
                                                            <div key={stat.label} className={cn("border p-3 rounded-xl shadow-xs", stat.color)}>
                                                                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1.5">{stat.label}</span>
                                                                <span className="block text-[14px] font-bold mt-1 leading-none">{stat.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-16 text-center">
                                        <Ban size={32} className="mx-auto text-slate-300 mb-2.5" />
                                        <p className="text-[11px] font-bold text-slate-400">No cancelled classes yet</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {dashboardTab === 'hiring_requirements' && (() => {
                        return (
                            <div className="space-y-6 text-left">
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                                        <div>
                                            <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                <Settings size={14} className="text-indigo-500" />
                                                Hire Eligibility Settings
                                            </h3>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Define milestones required for promotions</p>
                                        </div>
                                        {!isAddingRule && (() => {
                                             const ALL_STANDARD_NAMES = ['Status', '1st Day Show up', 'Final Specific Status', '2nd Day Show up', 'PEME Status', 'BGS Status', 'RCBC Status', 'NBI Status'];
                                             const deletedStandards = ALL_STANDARD_NAMES.filter(name => !(localSettings.activeStandards || ALL_STANDARD_NAMES).includes(name));
                                             return (
                                                 <div className="flex flex-wrap items-center gap-2">
                                                     {deletedStandards.length > 0 && (
                                                         <select
                                                             value=""
                                                             onChange={(e) => {
                                                                 const name = e.target.value;
                                                                 if (!name) return;
                                                                 setLocalSettings(prev => ({
                                                                     ...prev,
                                                                     activeStandards: [...(prev.activeStandards || ALL_STANDARD_NAMES), name],
                                                                     required: [...prev.required, name]
                                                                 }));
                                                             }}
                                                             className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg px-3 py-1.5 outline-none cursor-pointer shadow-xs font-sans"
                                                         >
                                                             <option value="">+ Add Standard Milestone</option>
                                                             {deletedStandards.map(name => (
                                                                 <option key={name} value={name}>{name}</option>
                                                             ))}
                                                         </select>
                                                     )}
                                                     <button
                                                         type="button"
                                                         onClick={() => {
                                                             setIsAddingRule(true);
                                                             setRuleSource('masterlist');
                                                             setRuleColumn('');
                                                             setRuleMatchingType('content');
                                                             setRuleMatchingValue('');
                                                             setRuleType('required');
                                                         }}
                                                         className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg border border-indigo-700 shadow-xs cursor-pointer shrink-0"
                                                     >
                                                         <Plus size={13} strokeWidth={2.5} />
                                                         Add Custom Requirement
                                                     </button>
                                                 </div>
                                             );
                                         })()}
                                    </div>

                                    <div className="p-5">
                                        {isAddingRule && (
                                            <div className="bg-slate-50/50 border border-slate-200 p-4 mb-4 rounded-xl space-y-4">
                                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    {editingRuleId ? 'Edit Custom Requirement' : 'New Custom Requirement'}
                                                </h5>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Source Sheet</label>
                                                        <select
                                                            value={ruleSource}
                                                            onChange={(e) => {
                                                                setRuleSource(e.target.value as any);
                                                                setRuleColumn('');
                                                                setRuleMatchingValue('');
                                                            }}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                                        >
                                                            <option value="masterlist">Masterlist</option>
                                                            <option value="interview">Interview Form</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Column / Field</label>
                                                        <select
                                                            value={ruleColumn}
                                                            onChange={(e) => {
                                                                const colKey = e.target.value;
                                                                setRuleColumn(colKey);
                                                                setRuleMatchingValue('');
                                                                if (COLUMN_DROPDOWNS[colKey]) setRuleMatchingType('dropdown');
                                                                else setRuleMatchingType('content');
                                                            }}
                                                        >
                                                            <option value="">-- Select Column --</option>
                                                            {(() => {
                                                                const standardCols = ruleSource === 'masterlist' ? MASTERLIST_COLUMNS : NOT_ELIGIBLE_COLUMNS;
                                                                
                                                                let customColsList: any[] = [];
                                                                try {
                                                                    const saved = localStorage.getItem('masterlist_custom_columns_by_tab');
                                                                    if (saved) {
                                                                        const parsed = JSON.parse(saved);
                                                                        const merged: Record<string, any> = {};
                                                                        Object.values(parsed).forEach((list: any) => {
                                                                            if (Array.isArray(list)) {
                                                                                list.forEach(col => {
                                                                                    const key = col.subField ? `${col.field}.${col.subField}` : col.field;
                                                                                    merged[key] = col;
                                                                                });
                                                                            }
                                                                        });
                                                                        customColsList = Object.values(merged);
                                                                    }
                                                                } catch {}

                                                                const allCols = [...standardCols, ...customColsList];

                                                                return allCols
                                                                    .filter(col => col.field && col.field !== 'actions' && col.field !== 'email_actions')
                                                                    .map((col, idx) => {
                                                                        const key = col.subField ? `${col.field}.${col.subField}` : col.field;
                                                                        return <option key={key + '-' + idx} value={key}>{col.label}</option>;
                                                                    });
                                                            })()}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Condition</label>
                                                        <select
                                                            value={ruleMatchingType}
                                                            onChange={(e) => {
                                                                setRuleMatchingType(e.target.value as any);
                                                                setRuleMatchingValue('');
                                                            }}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                                        >
                                                            {ruleColumn && COLUMN_DROPDOWNS[ruleColumn] ? (
                                                                <>
                                                                    <option value="dropdown">Specific Value</option>
                                                                    <option value="content">Not Empty</option>
                                                                    <option value="na">Is N/A / Empty</option>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <option value="content">Not Empty</option>
                                                                    <option value="na">Is N/A / Empty</option>
                                                                </>
                                                            )}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                    {ruleMatchingType === 'dropdown' && ruleColumn ? (
                                                        <div className="md:col-span-2">
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Matching Value</label>
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={ruleMatchingValue}
                                                                    onChange={(e) => setRuleMatchingValue(e.target.value)}
                                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                                                >
                                                                    <option value="">-- Select Option --</option>
                                                                    {COLUMN_DROPDOWNS[ruleColumn]?.map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                                <input
                                                                    type="text" placeholder="Custom value..."
                                                                    value={ruleMatchingValue}
                                                                    onChange={(e) => setRuleMatchingValue(e.target.value)}
                                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    <div className={ruleMatchingType === 'dropdown' && ruleColumn ? "md:col-span-1" : "md:col-span-3"}>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Eligibility Type</label>
                                                        <div className="flex gap-6 h-9 items-center">
                                                            <label className="flex items-center gap-2 text-[11.5px] font-bold text-slate-700 cursor-pointer">
                                                                <input
                                                                    type="radio" name="ruleType" checked={ruleType === 'required'}
                                                                    onChange={() => setRuleType('required')}
                                                                    className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                Required
                                                            </label>
                                                            <label className="flex items-center gap-2 text-[11.5px] font-bold text-slate-700 cursor-pointer">
                                                                <input
                                                                    type="radio" name="ruleType" checked={ruleType === 'optional'}
                                                                    onChange={() => setRuleType('optional')}
                                                                    className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                                />
                                                                Optional
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                                    <button
                                                        type="button" onClick={() => { setIsAddingRule(false); setEditingRuleId(null); }}
                                                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!ruleColumn) { alert('Please select a column.'); return; }
                                                            if (ruleMatchingType === 'dropdown' && !ruleMatchingValue) { alert('Please select a matching value.'); return; }
                                                            const matchedCol = (ruleSource === 'masterlist' ? MASTERLIST_COLUMNS : NOT_ELIGIBLE_COLUMNS).find(c => (c.subField ? `${c.field}.${c.subField}` : c.field) === ruleColumn);
                                                            const label = matchedCol ? matchedCol.label : ruleColumn;
                                                            const parts = ruleColumn.split('.');
                                                            const ruleData = {
                                                                source: ruleSource, columnLabel: label, columnField: parts[0],
                                                                columnSubField: parts[1], matchingType: ruleMatchingType,
                                                                matchingValue: ruleMatchingValue, type: ruleType
                                                            };
                                                            if (editingRuleId) {
                                                                setLocalSettings((prev: any) => ({
                                                                    ...prev, customRules: (prev.customRules || []).map((r: any) => r.id === editingRuleId ? { ...r, ...ruleData } : r)
                                                                }));
                                                                setEditingRuleId(null);
                                                            } else {
                                                                const newRule = { id: Math.random().toString(36).substring(2, 9), ...ruleData };
                                                                setLocalSettings((prev: any) => ({ ...prev, customRules: [...(prev.customRules || []), newRule] }));
                                                            }
                                                            setIsAddingRule(false);
                                                        }}
                                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors border border-indigo-700 shadow-xs cursor-pointer"
                                                    >
                                                        {editingRuleId ? 'Save' : 'Add'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-[12px]">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        <th className="px-4 py-3">Criteria Milestone</th>
                                                        <th className="px-4 py-3 text-center w-24">Required</th>
                                                        <th className="px-4 py-3 text-center w-24">Optional</th>
                                                        <th className="px-4 py-3 text-center w-24">Disabled</th>
                                                        <th className="px-4 py-3 text-center w-16">Remove</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {(() => {
                                                        const ALL_STANDARD_NAMES = ['Status', '1st Day Show up', 'Final Specific Status', '2nd Day Show up', 'PEME Status', 'BGS Status', 'RCBC Status', 'NBI Status'];
                                                        const visibleStandards = CRITERIA_ITEMS.filter(item => (localSettings.activeStandards || ALL_STANDARD_NAMES).includes(item.name));
                                                        return visibleStandards.map((item) => {
                                                            const isRequired = localSettings.required.includes(item.name);
                                                            const isOptional = localSettings.optional.includes(item.name);
                                                            const isDisabled = !isRequired && !isOptional;
                                                            return (
                                                                <tr key={item.name} className="hover:bg-slate-50/30">
                                                                    <td className="px-4 py-3.5">
                                                                        <div className="font-bold text-slate-700">{item.name}</div>
                                                                        {editingStandardField === item.name ? (
                                                                            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 border border-slate-200 rounded-lg w-fit">
                                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Target:</span>
                                                                                <select
                                                                                    value={localSettings.standardSettings?.[item.name] || ''}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        setLocalSettings(prev => ({
                                                                                            ...prev, standardSettings: { ...(prev.standardSettings || {}), [item.name]: val }
                                                                                        }));
                                                                                    }}
                                                                                    className="bg-white border border-slate-350 rounded-md px-2 py-0.5 text-[11px] outline-none focus:border-indigo-400 font-sans"
                                                                                >
                                                                                    <option value="">-- Default Logic --</option>
                                                                                    {COLUMN_DROPDOWNS[STANDARD_FIELD_COLUMN_MAP[item.name]]?.map(opt => (
                                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                                    ))}
                                                                                </select>
                                                                                <button
                                                                                    type="button" onClick={() => setEditingStandardField(null)}
                                                                                    className="text-indigo-650 hover:underline text-[10px] font-bold cursor-pointer"
                                                                                >
                                                                                    Done
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                                                                <span>{item.desc}</span>
                                                                                {COLUMN_DROPDOWNS[STANDARD_FIELD_COLUMN_MAP[item.name]] && (
                                                                                    <>
                                                                                        <span className="text-slate-200">|</span>
                                                                                        <button
                                                                                            type="button" onClick={() => setEditingStandardField(item.name)}
                                                                                            className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                                                                                        >
                                                                                            <Edit2 size={10} />
                                                                                            {localSettings.standardSettings?.[item.name] 
                                                                                                ? `Target: ${localSettings.standardSettings[item.name]}` 
                                                                                                : 'Set Target Value'}
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3.5 text-center">
                                                                        <input
                                                                            type="radio" name={`criteria-${item.name}`} checked={isRequired}
                                                                            onChange={() => handleCriteriaChange(item.name, 'required')}
                                                                            className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3.5 text-center">
                                                                        <input
                                                                            type="radio" name={`criteria-${item.name}`} checked={isOptional}
                                                                            onChange={() => handleCriteriaChange(item.name, 'optional')}
                                                                            className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3.5 text-center">
                                                                        <input
                                                                            type="radio" name={`criteria-${item.name}`} checked={isDisabled}
                                                                            onChange={() => handleCriteriaChange(item.name, 'disabled')}
                                                                            className="w-3.5 h-3.5 text-slate-400 focus:ring-slate-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3.5 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setLocalSettings(prev => ({
                                                                                    ...prev,
                                                                                    required: prev.required.filter(x => x !== item.name),
                                                                                    optional: prev.optional.filter(x => x !== item.name),
                                                                                    activeStandards: (prev.activeStandards || ALL_STANDARD_NAMES).filter(x => x !== item.name)
                                                                                }));
                                                                            }}
                                                                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}
                                                    {localSettings.customRules?.map((rule) => {
                                                        const isRequired = rule.type === 'required';
                                                        const isOptional = rule.type === 'optional';
                                                        const isDisabled = !isRequired && !isOptional;
                                                        return (
                                                            <tr key={rule.id} className="hover:bg-slate-50/30">
                                                                <td className="px-4 py-3.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-bold text-slate-700">{rule.columnLabel}</div>
                                                                        <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 rounded-md">Custom</span>
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                                                        <span>
                                                                            Source: <span className="capitalize">{rule.source}</span>
                                                                            {' | '} Condition: {rule.matchingType === 'content' ? 'Has Content' : rule.matchingType === 'na' ? 'Is Empty' : `Equals "${rule.matchingValue}"`}
                                                                        </span>
                                                                        <span className="text-slate-200">|</span>
                                                                        <button type="button" onClick={() => {
                                                                            setEditingRuleId(rule.id);
                                                                            setRuleSource(rule.source);
                                                                            const colKey = rule.columnSubField ? `${rule.columnField}.${rule.columnSubField}` : rule.columnField;
                                                                            setRuleColumn(colKey);
                                                                            setRuleMatchingType(rule.matchingType);
                                                                            setRuleMatchingValue(rule.matchingValue);
                                                                            setRuleType(rule.type);
                                                                            setIsAddingRule(true);
                                                                        }} className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5 cursor-pointer">
                                                                            <Edit2 size={10} /> Edit
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <input type="radio" name={`criteria-custom-${rule.id}`} checked={isRequired} onChange={() => {
                                                                        setLocalSettings((prev: any) => ({
                                                                            ...prev, customRules: (prev.customRules || []).map((r: any) => r.id === rule.id ? { ...r, type: 'required' } : r)
                                                                        }));
                                                                    }} className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                                </td>
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <input type="radio" name={`criteria-custom-${rule.id}`} checked={isOptional} onChange={() => {
                                                                        setLocalSettings((prev: any) => ({
                                                                            ...prev, customRules: (prev.customRules || []).map((r: any) => r.id === rule.id ? { ...r, type: 'optional' } : r)
                                                                        }));
                                                                    }} className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 cursor-pointer" />
                                                                </td>
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <input type="radio" name={`criteria-custom-${rule.id}`} checked={isDisabled} onChange={() => {
                                                                        setLocalSettings((prev: any) => ({
                                                                            ...prev, customRules: (prev.customRules || []).filter((r: any) => r.id !== rule.id)
                                                                        }));
                                                                    }} className="w-3.5 h-3.5 text-slate-400 focus:ring-slate-500 cursor-pointer" />
                                                                </td>
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <button
                                                                        type="button" onClick={() => {
                                                                            setLocalSettings((prev: any) => ({
                                                                                ...prev, customRules: (prev.customRules || []).filter((r: any) => r.id !== rule.id)
                                                                            }));
                                                                        }}
                                                                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-100">
                                            <div className="text-[11px] text-[#605e5c] font-semibold flex items-center gap-1.5">
                                                <AlertCircle size={13} className="text-indigo-500 shrink-0" />
                                                <span>Changes immediately update eligibility calculations.</span>
                                            </div>
                                            <button
                                                onClick={handleSaveSettings} disabled={savingSettings}
                                                className="px-4 h-8 bg-indigo-600 hover:bg-indigo-705 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
                                            >
                                                <Save size={13} />
                                                {savingSettings ? 'Saving...' : 'Save Settings'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Applicants Table (Ongoing vs Hired) */}
                                {(() => {
                                    const ongoingApplicants = accountDashboardData.filteredApplicants.filter(
                                        app => app.current_status?.toUpperCase() !== 'HIRED' &&
                                        !['FAILED', 'REJECTED', 'WITHDRAWN', 'FALLOUT', 'INACTIVE'].includes(app.current_status?.toUpperCase() || '')
                                    );
                                    const hiredApplicants = accountDashboardData.filteredApplicants.filter(
                                        app => app.current_status?.toUpperCase() === 'HIRED'
                                    );
                                    const displayApplicants = applicantsTab === 'ongoing' ? ongoingApplicants : hiredApplicants;

                                    return (
                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-left">
                                            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                                                <div>
                                                    <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Users size={14} className="text-indigo-505" />
                                                        Candidates Listing
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Track and view candidates under this account</p>
                                                </div>
                                                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
                                                    <button
                                                        onClick={() => setApplicantsTab('ongoing')}
                                                        className={cn(
                                                            "px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all",
                                                            applicantsTab === 'ongoing' ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                                        )}
                                                    >
                                                        Ongoing ({ongoingApplicants.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setApplicantsTab('hired')}
                                                        className={cn(
                                                            "px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all",
                                                            applicantsTab === 'hired' ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                                        )}
                                                    >
                                                        Hired ({hiredApplicants.length})
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {displayApplicants.length > 0 ? (
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                                                            <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                                <th className="px-5 py-3">Candidate</th>
                                                                <th className="px-5 py-3">Position</th>
                                                                <th className="px-5 py-3">Status</th>
                                                                <th className="px-5 py-3">Applied Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 bg-white">
                                                            {displayApplicants.map((app) => (
                                                                <tr key={app.id} className="hover:bg-slate-50/30 transition-colors text-[12px]">
                                                                    <td className="px-5 py-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-700">{app.applicant_name}</span>
                                                                            <span className="text-[9px] text-slate-400 font-mono tracking-tight mt-0.5">ID: {app.id.slice(0, 8)}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3">
                                                                        <span className="text-slate-650 font-semibold">{app.position_title}</span>
                                                                    </td>
                                                                    <td className="px-5 py-3">
                                                                        <span className={cn(
                                                                            "px-2 py-0.5 text-[9px] font-bold rounded-full border inline-block uppercase tracking-wider",
                                                                            app.current_status === 'HIRED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                            ['FAILED', 'REJECTED', 'WITHDRAWN'].includes(app.current_status?.toUpperCase() || '') ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                                            "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                        )}>
                                                                            {app.current_status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-3">
                                                                        <span className="text-slate-500 font-medium tabular-nums">{new Date(app.applied_at).toLocaleDateString()}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="p-16 text-center">
                                                        <Users size={32} className="mx-auto text-slate-300 mb-2.5" />
                                                        <p className="text-[11px] font-bold text-slate-400">No {applicantsTab} candidates recorded.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })()}
                </div>
            </div>
            
            <AnimatePresence>
                {deletingId !== null && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                            className="bg-white border border-slate-100 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-100 flex items-center justify-center rounded-2xl text-rose-500 shadow-md">
                                    <Trash2 className="w-8 h-8 animate-bounce" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Purging Quota History</h3>
                                <p className="text-xs text-slate-500 font-semibold">{deleteStage}</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-bold text-slate-400 tabular-nums">
                                    <span>Progress</span>
                                    <span>{deleteProgress}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 rounded-full shadow-lg"
                                        animate={{ width: `${deleteProgress}%` }}
                                        transition={{ duration: 0.1 }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                open={deleteConfirmOpen}
                onClose={() => { setDeleteConfirmOpen(false); setPendingDeleteId(null); }}
                onConfirm={() => {
                    if (pendingDeleteId) {
                        void handleDeleteHistory(pendingDeleteId);
                    }
                    setDeleteConfirmOpen(false);
                }}
                title="Delete Record"
                message={pendingDeleteId && cancelledClasses.some(c => c.id === pendingDeleteId)
                    ? "Are you sure you want to delete this cancelled campaign record? This action cannot be undone."
                    : "Are you sure you want to delete this historical quota record? This action cannot be undone."}
                confirmText="Delete"
                confirmClass="bg-rose-600 hover:bg-rose-700"
            />

            <QuotaHistoryDashboardModal
                item={selectedHistoryDashboard}
                onClose={() => setSelectedHistoryDashboard(null)}
                onEdit={handleEditHistoryClick}
            />
        </Modal>
    );
}
