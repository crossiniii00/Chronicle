import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveAccountStore } from '@/store/activeAccountStore';
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
    ClipboardList, ChevronRight, Sparkles, X, BarChart3, List, LayoutGrid, ChevronUp, ChevronDown, Network
} from 'lucide-react';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import { ApplicationService } from '@/services/ApplicationService';
import { DetailModalPortal } from '@/components/common/DetailModalPortal';
import { useToast } from '@/components/common/useToast';
import type { Application } from '@/types';
import { PositionService, type HiringQuotaHistory } from '@/services/PositionService';
import type { QuotaHistoryMetric } from './QuotaHistoryModal';
import { QuotaHistoryDashboardModal } from './QuotaHistoryDashboardModal';
import { type CancelledClass } from '../AccountManagement';
import { MASTERLIST_COLUMNS, NOT_ELIGIBLE_COLUMNS } from '../../recruiter/tracker/masterlist/constants';
import { SPECIFIC_STATUS_OPTIONS } from '../../recruiter/tracker/utils/statusMappings';
import { OverviewTab } from './AccountDashboardTabs/OverviewTab';
import { HistoryTab } from './AccountDashboardTabs/HistoryTab';
import { CancelledTab } from './AccountDashboardTabs/CancelledTab';
import { HiringRequirementsTab } from './AccountDashboardTabs/HiringRequirementsTab';
import { SubAccountsTab } from './AccountDashboardTabs/SubAccountsTab';
import { UnassignedTab } from './AccountDashboardTabs/UnassignedTab';


export interface Opening {
    id: string;
    name: string;
    quota: number;
    hired: number;
    manualHired: number;
    inPipeline: number;
    failedCount: number;
    totalApplicants: number;
    remaining: number;
    progress: number;
    hiringType: 'Billed' | 'Non-Billed';
    quotaStart?: string | null;
    quotaEnd?: string | null;
    trainingStartDate?: string | null;
    hiringQuotaId?: string;
    durationLabel: string;
    country?: string | null;
    city?: string | null;
    notes?: string | null;
    requesterName?: string | null;
    recruitmentProgress?: string | null;
    concatenate?: string | null;
}

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
    openings: Opening[];
}

interface AccountDashboardModalProps {
    dashboardModal: boolean;
    setDashboardModal: (open: boolean) => void;
    selectedAccount: Department | null;
    setSelectedAccount: (dept: Department | null) => void;
    accountDashboardData: AccountDashboardData | null;
    dashboardTab: 'overview' | 'history' | 'cancelled' | 'hiring_requirements' | 'sub_accounts' | 'unassigned';
    setDashboardTab: (tab: 'overview' | 'history' | 'cancelled' | 'hiring_requirements' | 'sub_accounts' | 'unassigned') => void;
    activePipelineFilter: string | null;
    setActivePipelineFilter: (filter: string | null) => void;
    setQuotaHistoryDrilldown: (drilldown: { item: HiringQuotaHistory; metric: QuotaHistoryMetric } | null) => void;
    handleAccountImageUpload: (dept: Department, file?: File | null) => Promise<void>;
    submitting: boolean;
    setQuotaForm: (val: number) => void;
    setQuotaManualHired: (val: number) => void;
    setQuotaStartDate: (date: string) => void;
    setQuotaEndDate: (date: string) => void;
    setQuotaHiringType: (val: string) => void;
    setQuotaTrainingStartDate: (date: string) => void;
    setQuotaHiringQuotaId: (val: string) => void;
    setQuotaCountry: (val: string) => void;
    setQuotaCity: (val: string) => void;
    setQuotaRequesterName: (val: string) => void;
    setQuotaRecruitmentProgress: (val: string) => void;
    setQuotaConcatenate: (val: string) => void;
    setQuotaModal: (open: boolean) => void;
    setCloseConfirm: (open: boolean) => void;
    setCancelConfirm: (open: boolean) => void;
    setQuotaOpeningName: (val: string) => void;
    setEditingPositionId: (id: string | null) => void;
    handleUpdateQuota: (newVal?: number, isCancel?: boolean) => Promise<void>;
    cancelledClasses: CancelledClass[];
    onDeleteCancelled?: (id: string) => void;
    todayInputValue: () => string;
    toDateInputValue: (value?: string | null) => string;
    getDurationLabel: (start?: string | null, end?: string | null) => string;
    loadData?: () => Promise<void>;
    allApplications?: Application[];
}

export function AccountDashboardModal({
    dashboardModal, setDashboardModal, selectedAccount, setSelectedAccount, accountDashboardData,
    dashboardTab, setDashboardTab, activePipelineFilter, setActivePipelineFilter, setQuotaHistoryDrilldown,
    handleAccountImageUpload, submitting, setQuotaForm, setQuotaManualHired, setQuotaStartDate, setQuotaEndDate,
    setQuotaHiringType, setQuotaTrainingStartDate, setQuotaHiringQuotaId, setQuotaCountry, setQuotaCity, setQuotaRequesterName, setQuotaRecruitmentProgress, setQuotaConcatenate, setQuotaModal, setCloseConfirm,
    setCancelConfirm, setQuotaOpeningName, setEditingPositionId, handleUpdateQuota, cancelledClasses, onDeleteCancelled, todayInputValue, toDateInputValue, getDurationLabel, loadData, allApplications = []
}: AccountDashboardModalProps) {

    const navigate = useNavigate();
    const { setActiveAccount } = useActiveAccountStore();

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
    const [deleteLobConfirmOpen, setDeleteLobConfirmOpen] = React.useState(false);
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
    const [historyOpeningName, setHistoryOpeningName] = React.useState<string>('');
    const [historyAssignedCandidates, setHistoryAssignedCandidates] = React.useState<string[]>([]);
    const [historySalaryMatrixCategory, setHistorySalaryMatrixCategory] = React.useState<string>('');
    const [historyClassType, setHistoryClassType] = React.useState<string>('');
    const [historyRosterDate, setHistoryRosterDate] = React.useState<string>('');
    const [historyHiringReqHc, setHistoryHiringReqHc] = React.useState<number>(0);
    const [historyTotalOffersExtended, setHistoryTotalOffersExtended] = React.useState<number>(0);
    const [historyManualJobOffers, setHistoryManualJobOffers] = React.useState<number>(0);
    const [historyManualFallout, setHistoryManualFallout] = React.useState<number>(0);
    const [historyNetHiresInternal, setHistoryNetHiresInternal] = React.useState<number>(0);
    const [historyNetHiresExternal, setHistoryNetHiresExternal] = React.useState<number>(0);
    const [historyManualBalance, setHistoryManualBalance] = React.useState<number>(0);
    const [historyJoBalance, setHistoryJoBalance] = React.useState<number>(0);
    const [historyManualDay1ShowUp, setHistoryManualDay1ShowUp] = React.useState<number>(0);
    const [historyNotes, setHistoryNotes] = React.useState<string>('');
    const [savingHistory, setSavingHistory] = React.useState(false);
    const [filterStartDate, setFilterStartDate] = React.useState<string>('');
    const [filterEndDate, setFilterEndDate] = React.useState<string>('');
    const [selectedApplicantForAssignment, setSelectedApplicantForAssignment] = React.useState<Application | null>(null);
    const [assignmentLobId, setAssignmentLobId] = React.useState<string>('');
    const [assigningLob, setAssigningLob] = React.useState(false);

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

    const [localSettings, setLocalSettings] = React.useState<{
        required: string[];
        optional: string[];
        customRules?: any[];
        standardSettings?: Record<string, string>;
        activeStandards?: string[];
        processOrder?: string[];
        requiredProcesses?: string[];
    }>({
        required: selectedAccount?.eligibilitySettings?.required || ['Status', '1st Day Show up', 'Final Specific Status'],
        optional: selectedAccount?.eligibilitySettings?.optional || ['2nd Day Show up'],
        customRules: selectedAccount?.eligibilitySettings?.customRules || [],
        standardSettings: selectedAccount?.eligibilitySettings?.standardSettings || {},
        activeStandards: selectedAccount?.eligibilitySettings?.activeStandards || ['Status', '1st Day Show up', 'Final Specific Status', '2nd Day Show up', 'PEME Status', 'BGS Status', 'RCBC Status', 'NBI Status'],
        processOrder: selectedAccount?.eligibilitySettings?.processOrder || [
            'TYPING_TEST',
            'INITIAL_INTERVIEW',
            'ACCOUNT_ASSIGNMENT',
            'ASSESSMENT',
            'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW'
        ],
        requiredProcesses: selectedAccount?.eligibilitySettings?.requiredProcesses || [
            'TYPING_TEST',
            'INITIAL_INTERVIEW',
            'ACCOUNT_ASSIGNMENT',
            'ASSESSMENT',
            'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW'
        ]
    });
    const [savingSettings, setSavingSettings] = React.useState(false);
    const [applicantsTab, setApplicantsTab] = React.useState<'ongoing' | 'hired'>('ongoing');
    const [subAccounts, setSubAccounts] = React.useState<Array<{ id: string, name: string, description?: string }>>([]);
    const [isAddingSubAccount, setIsAddingSubAccount] = React.useState(false);
    const [newSubAccountName, setNewSubAccountName] = React.useState('');
    const [newSubAccountDesc, setNewSubAccountDesc] = React.useState('');

    const STAGE_LABELS: Record<string, { label: string; desc: string }> = {
        'TYPING_TEST': { label: 'Typing Test', desc: 'Typing speed and accuracy test' },
        'INITIAL_INTERVIEW': { label: 'Initial Screening', desc: 'Initial candidate profile validation and screening' },
        'ACCOUNT_ASSIGNMENT': { label: 'Account Assignment', desc: 'Operations review and endorsement' },
        'ASSESSMENT': { label: 'Proficiency Assessment & Scheduling', desc: 'SpeechX/Wonderlic test evaluation and final interview scheduling' },
        'CLIENT_ASSESSMENT': { label: 'Client Assessment', desc: 'Assessment and testing required by the client' },
        'CLIENT_INTERVIEW': { label: 'Client Interview', desc: 'Final client-led interview evaluation' }
    };

    const moveStage = (index: number, direction: 'up' | 'down') => {
        const order = [...(localSettings.processOrder || [
            'TYPING_TEST',
            'INITIAL_INTERVIEW',
            'ACCOUNT_ASSIGNMENT',
            'ASSESSMENT',
            'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW'
        ])];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= order.length) return;

        const temp = order[index];
        order[index] = order[targetIndex];
        order[targetIndex] = temp;

        setLocalSettings(prev => ({
            ...prev,
            processOrder: order
        }));
    };

    const toggleStageActive = (stageId: string) => {
        const activeStages = [...(localSettings.requiredProcesses || [
            'TYPING_TEST',
            'INITIAL_INTERVIEW',
            'ACCOUNT_ASSIGNMENT',
            'ASSESSMENT',
            'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW'
        ])];

        let nextActiveStages: string[];
        if (activeStages.includes(stageId)) {
            nextActiveStages = activeStages.filter(id => id !== stageId);
        } else {
            nextActiveStages = [...activeStages, stageId];
        }

        setLocalSettings(prev => ({
            ...prev,
            requiredProcesses: nextActiveStages
        }));
    };

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
        } catch { }

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
            'pis.leadership_score': ['Passed', 'Failed', 'Pending', '---'],
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
                activeStandards: selectedAccount.eligibilitySettings?.activeStandards || ['Status', '1st Day Show up', 'Final Specific Status', '2nd Day Show up', 'PEME Status', 'BGS Status', 'RCBC Status', 'NBI Status'],
                processOrder: selectedAccount.eligibilitySettings?.processOrder || [
                    'TYPING_TEST',
                    'INITIAL_INTERVIEW',
                    'ACCOUNT_ASSIGNMENT',
                    'ASSESSMENT',
                    'CLIENT_ASSESSMENT',
                    'CLIENT_INTERVIEW'
                ],
                requiredProcesses: selectedAccount.eligibilitySettings?.requiredProcesses || [
                    'TYPING_TEST',
                    'INITIAL_INTERVIEW',
                    'ACCOUNT_ASSIGNMENT',
                    'ASSESSMENT',
                    'CLIENT_ASSESSMENT',
                    'CLIENT_INTERVIEW'
                ]
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

    React.useEffect(() => {
        if (selectedAccount) {
            setSubAccounts(selectedAccount.subAccounts || []);
        } else {
            setSubAccounts([]);
        }
    }, [selectedAccount]);

    const CRITERIA_ITEMS = [
        { name: 'Status', desc: 'Candidate status (overall status = Accepted Offer, Hired, etc.)' },
        { name: '1st Day Show up', desc: 'Candidate present on the first training/neo day (showed/present)' },
        { name: 'Final Specific Status', desc: 'Passed final validations (client interview or Account Assignment passed)' },
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
            success('Settings Saved', 'Account and process settings updated successfully.');
        } catch (err) {
            toastError('Save Failed', 'Could not update settings.');
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
                hiringQuotaId: historyHiringQuotaId || undefined,
                openingName: historyOpeningName || undefined,
                salaryMatrixCategory: historySalaryMatrixCategory || undefined,
                classType: historyClassType || undefined,
                rosterDate: historyRosterDate || undefined,
                hiringReqHc: historyHiringReqHc || undefined,
                totalOffersExtended: historyTotalOffersExtended || undefined,
                manualJobOffers: historyManualJobOffers || undefined,
                manualFallout: historyManualFallout || undefined,
                netHiresInternal: historyNetHiresInternal || undefined,
                netHiresExternal: historyNetHiresExternal || undefined,
                manualBalance: historyManualBalance || undefined,
                joBalance: historyJoBalance || undefined,
                manualDay1ShowUp: historyManualDay1ShowUp || undefined,
                notes: historyNotes || undefined,
                assignedCandidates: historyAssignedCandidates
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
            setHistoryOpeningName('');
            setHistoryAssignedCandidates([]);
            setHistorySalaryMatrixCategory('');
            setHistoryClassType('');
            setHistoryRosterDate('');
            setHistoryHiringReqHc(0);
            setHistoryTotalOffersExtended(0);
            setHistoryManualJobOffers(0);
            setHistoryManualFallout(0);
            setHistoryNetHiresInternal(0);
            setHistoryNetHiresExternal(0);
            setHistoryManualBalance(0);
            setHistoryJoBalance(0);
            setHistoryManualDay1ShowUp(0);
            setHistoryNotes('');
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
        setHistoryOpeningName(item.openingName || '');
        setHistoryAssignedCandidates(item.assignedCandidates || []);
        setHistorySalaryMatrixCategory(item.salaryMatrixCategory || '');
        setHistoryClassType(item.classType || '');
        setHistoryRosterDate(item.rosterDate ? toDateInputValue(item.rosterDate) : '');
        setHistoryHiringReqHc(item.hiringReqHc || 0);
        setHistoryTotalOffersExtended(item.totalOffersExtended || 0);
        setHistoryManualJobOffers(item.manualJobOffers || 0);
        setHistoryManualFallout(item.manualFallout || 0);
        setHistoryNetHiresInternal(item.netHiresInternal || 0);
        setHistoryNetHiresExternal(item.netHiresExternal || 0);
        setHistoryManualBalance(item.manualBalance || 0);
        setHistoryJoBalance(item.joBalance || 0);
        setHistoryManualDay1ShowUp(item.manualDay1ShowUp || 0);
        setHistoryNotes(item.notes || '');
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
        { key: 'hiring_requirements' as const, label: 'Hiring & Eligibility', icon: Settings, desc: 'Milestones & candidate listing' },
        { key: 'sub_accounts' as const, label: 'Job Positions', icon: Network, desc: 'Manage Job Positions' },
        { key: 'unassigned' as const, label: 'Unassigned Candidates', icon: Users, desc: 'Candidates awaiting Job Position assignment' }
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
            className="max-w-[1300px] w-full"
        >
            <div className="flex flex-col bg-slate-50 dark:bg-slate-800/30 text-left overflow-hidden rounded-none-b-none font-sans p-6 md:p-8 space-y-6 select-none relative">
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
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-450 hover:text-slate-700 dark:text-slate-300 transition-all cursor-pointer z-50"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-sm space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-start sm:items-center gap-5 min-w-0 text-left">
                            <div className="relative shrink-0">
                                <div className="p-1 rounded-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-300">
                                    <AccountAvatar department={selectedAccount} size="xl" quota={accountDashboardData.totalQuota} />
                                </div>
                                <label className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer z-10">
                                    <Camera size={12} />
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
                                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none uppercase">
                                        {selectedAccount.name}
                                    </h2>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={cn(
                                            "px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-none border flex items-center gap-1 shadow-xs",
                                            accountDashboardData.isActive
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", accountDashboardData.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                                            {accountDashboardData.isActive ? 'Active' : 'Paused'}
                                        </span>
                                        {accountDashboardData.hiringType && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-none border bg-blue-50 text-blue-700 border-blue-200 shadow-xs">
                                                {accountDashboardData.hiringType}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 text-[11px]">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-650 rounded-none shadow-2xs">
                                        <UserCheck size={13} className="text-blue-500" />
                                        <span className="text-slate-450 font-medium">Owner:</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{selectedAccount.head || 'Maria Cruz'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-150">
                            <button
                                onClick={() => {
                                    setQuotaForm(0);
                                    setQuotaManualHired(0);
                                    setQuotaStartDate(todayInputValue());
                                    setQuotaEndDate('');
                                    setQuotaHiringType('Internal/External');
                                    setQuotaTrainingStartDate('');
                                    setQuotaHiringQuotaId('');
                                    setQuotaOpeningName('');
                                    setEditingPositionId(null);
                                    setQuotaModal(true);
                                }}
                                className="flex items-center gap-1 px-3.5 h-8 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-none transition-colors border border-blue-750 shadow-sm cursor-pointer"
                            >
                                <Plus size={13} strokeWidth={2.5} />
                                Add Job Position Hiring Quota
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Sidebar Tabs */}
                    <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1">Navigation</span>
                        {tabItems.map((item) => {
                            const isActive = dashboardTab === item.key;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => setDashboardTab(item.key)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-none text-left transition-all duration-200 outline-none w-full",
                                        isActive
                                            ? "bg-blue-50 text-blue-700 shadow-[inset_3px_0_0_0_#2563eb]"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-white"
                                    )}
                                >
                                    <Icon size={16} className={isActive ? "text-blue-600" : "text-slate-400"} />
                                    <div className="min-w-0">
                                        <h4 className="text-[12px] font-bold tracking-tight whitespace-nowrap truncate">
                                            {item.label}
                                        </h4>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Content Panel */}
                    <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-6 shadow-sm overflow-hidden">
                    {dashboardTab === 'overview' && accountDashboardData && selectedAccount && (
                        <OverviewTab
                            accountDashboardData={accountDashboardData}
                            selectedAccount={selectedAccount}
                            setSelectedHistoryDashboard={setSelectedHistoryDashboard}
                            setEditingPositionId={(id) => {
                                setEditingPositionId(id);
                                setPendingDeleteId(id);
                            }}
                            setQuotaForm={setQuotaForm}
                            setQuotaManualHired={setQuotaManualHired}
                            setQuotaStartDate={setQuotaStartDate}
                            setQuotaEndDate={setQuotaEndDate}
                            setQuotaHiringType={setQuotaHiringType}
                            setQuotaTrainingStartDate={setQuotaTrainingStartDate}
                            setQuotaHiringQuotaId={setQuotaHiringQuotaId}
                            setQuotaOpeningName={setQuotaOpeningName}
                            setQuotaCountry={setQuotaCountry}
                            setQuotaCity={setQuotaCity}
                            setQuotaRequesterName={setQuotaRequesterName}
                            setQuotaRecruitmentProgress={setQuotaRecruitmentProgress}
                            setQuotaConcatenate={setQuotaConcatenate}
                            setQuotaModal={setQuotaModal}
                            setCloseConfirm={setCloseConfirm}
                            setDeleteLobConfirm={setDeleteLobConfirmOpen}
                            toDateInputValue={toDateInputValue}
                            todayInputValue={todayInputValue}
                        />
                    )}                    {dashboardTab === 'history' && accountDashboardData && (
                        <HistoryTab
                            accountDashboardData={accountDashboardData}
                            quotaHistoryViewMode={quotaHistoryViewMode}
                            setQuotaHistoryViewMode={setQuotaHistoryViewMode}
                            isAddingHistory={isAddingHistory}
                            setIsAddingHistory={setIsAddingHistory}
                            editingHistoryId={editingHistoryId}
                            setEditingHistoryId={setEditingHistoryId}
                            historyQuota={historyQuota}
                            setHistoryQuota={setHistoryQuota}
                            historyHiringType={historyHiringType}
                            setHistoryHiringType={setHistoryHiringType}
                            historyManualHires={historyManualHires}
                            setHistoryManualHires={setHistoryManualHires}
                            historyStart={historyStart}
                            setHistoryStart={setHistoryStart}
                            historyEnd={historyEnd}
                            setHistoryEnd={setHistoryEnd}
                            historyTrainingStart={historyTrainingStart}
                            setHistoryTrainingStart={setHistoryTrainingStart}
                            historyHiringQuotaId={historyHiringQuotaId}
                            setHistoryHiringQuotaId={setHistoryHiringQuotaId}
                            historyOpeningName={historyOpeningName}
                            setHistoryOpeningName={setHistoryOpeningName}
                            historyAssignedCandidates={historyAssignedCandidates}
                            setHistoryAssignedCandidates={setHistoryAssignedCandidates}
                            historySalaryMatrixCategory={historySalaryMatrixCategory}
                            setHistorySalaryMatrixCategory={setHistorySalaryMatrixCategory}
                            historyClassType={historyClassType}
                            setHistoryClassType={setHistoryClassType}
                            historyRosterDate={historyRosterDate}
                            setHistoryRosterDate={setHistoryRosterDate}
                            historyHiringReqHc={historyHiringReqHc}
                            setHistoryHiringReqHc={setHistoryHiringReqHc}
                            historyTotalOffersExtended={historyTotalOffersExtended}
                            setHistoryTotalOffersExtended={setHistoryTotalOffersExtended}
                            historyManualJobOffers={historyManualJobOffers}
                            setHistoryManualJobOffers={setHistoryManualJobOffers}
                            historyManualFallout={historyManualFallout}
                            setHistoryManualFallout={setHistoryManualFallout}
                            historyNetHiresInternal={historyNetHiresInternal}
                            setHistoryNetHiresInternal={setHistoryNetHiresInternal}
                            historyNetHiresExternal={historyNetHiresExternal}
                            setHistoryNetHiresExternal={setHistoryNetHiresExternal}
                            historyManualBalance={historyManualBalance}
                            setHistoryManualBalance={setHistoryManualBalance}
                            historyJoBalance={historyJoBalance}
                            setHistoryJoBalance={setHistoryJoBalance}
                            historyManualDay1ShowUp={historyManualDay1ShowUp}
                            setHistoryManualDay1ShowUp={setHistoryManualDay1ShowUp}
                            historyNotes={historyNotes}
                            setHistoryNotes={setHistoryNotes}
                            savingHistory={savingHistory}
                            handleSaveHistoryRecord={handleSaveHistoryRecord}
                            filterStartDate={filterStartDate}
                            setFilterStartDate={setFilterStartDate}
                            filterEndDate={filterEndDate}
                            setFilterEndDate={setFilterEndDate}
                            filteredHistory={filteredHistory}
                            setSelectedHistoryDashboard={setSelectedHistoryDashboard}
                            setQuotaHistoryDrilldown={setQuotaHistoryDrilldown}
                            handleEditHistoryClick={handleEditHistoryClick}
                            handleReactivateHistory={() => {}}
                            setPendingDeleteId={setPendingDeleteId}
                            setDeleteConfirmOpen={setDeleteConfirmOpen}
                            getDurationLabel={getDurationLabel}
                            toDateInputValue={toDateInputValue}
                            allApplications={allApplications}
                            subAccounts={subAccounts}
                            departmentName={selectedAccount?.name || ''}
                        />
                    )}


                    {dashboardTab === 'cancelled' && selectedAccount && (
                        <CancelledTab
                            selectedAccount={selectedAccount}
                            cancelledClasses={cancelledClasses}
                            getDurationLabel={getDurationLabel}
                            toDateInputValue={toDateInputValue}
                            setPendingDeleteId={setPendingDeleteId}
                            setDeleteConfirmOpen={setDeleteConfirmOpen}
                        />
                    )}
                    {dashboardTab === 'hiring_requirements' && accountDashboardData && (
                        <HiringRequirementsTab
                            accountDashboardData={accountDashboardData}
                            localSettings={localSettings}
                            setLocalSettings={setLocalSettings}
                            STAGE_LABELS={STAGE_LABELS}
                            COLUMN_DROPDOWNS={COLUMN_DROPDOWNS}
                            STANDARD_FIELD_COLUMN_MAP={STANDARD_FIELD_COLUMN_MAP}
                            CRITERIA_ITEMS={CRITERIA_ITEMS}
                            moveStage={moveStage}
                            toggleStageActive={toggleStageActive}
                            handleSaveSettings={handleSaveSettings}
                            savingSettings={savingSettings}
                            isAddingRule={isAddingRule}
                            setIsAddingRule={setIsAddingRule}
                            ruleSource={ruleSource}
                            setRuleSource={setRuleSource}
                            ruleColumn={ruleColumn}
                            setRuleColumn={setRuleColumn}
                            ruleMatchingType={ruleMatchingType}
                            setRuleMatchingType={setRuleMatchingType}
                            ruleMatchingValue={ruleMatchingValue}
                            setRuleMatchingValue={setRuleMatchingValue}
                            ruleType={ruleType}
                            setRuleType={setRuleType}
                            editingRuleId={editingRuleId}
                            setEditingRuleId={setEditingRuleId}
                            editingStandardField={editingStandardField}
                            setEditingStandardField={setEditingStandardField}
                            handleCriteriaChange={handleCriteriaChange}
                            applicantsTab={applicantsTab}
                            setApplicantsTab={setApplicantsTab}
                        />
                    )}

                    {dashboardTab === 'sub_accounts' && selectedAccount && (
                        <SubAccountsTab
                            selectedAccount={selectedAccount}
                            setSelectedAccount={setSelectedAccount}
                            subAccounts={subAccounts}
                            setSubAccounts={setSubAccounts}
                            isAddingSubAccount={isAddingSubAccount}
                            setIsAddingSubAccount={setIsAddingSubAccount}
                            newSubAccountName={newSubAccountName}
                            setNewSubAccountName={setNewSubAccountName}
                            newSubAccountDesc={newSubAccountDesc}
                            setNewSubAccountDesc={setNewSubAccountDesc}
                            loadData={loadData}
                            accountDashboardData={accountDashboardData}
                            allApplications={allApplications}
                        />
                    )}

                    {dashboardTab === 'unassigned' && selectedAccount && accountDashboardData && (
                        <UnassignedTab
                            selectedAccount={selectedAccount}
                            allApplications={allApplications}
                            accountDashboardData={accountDashboardData}
                            loadData={loadData}
                        />
                    )}
                    </div>
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
                            className="bg-white dark:bg-slate-900 border border-slate-100 p-8 rounded-none w-full max-w-md shadow-2xl text-center space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-100 flex items-center justify-center rounded-none text-rose-500 shadow-md">
                                    <Trash2 className="w-8 h-8 animate-bounce" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">Purging Quota History</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{deleteStage}</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-bold text-slate-400 tabular-nums">
                                    <span>Progress</span>
                                    <span>{deleteProgress}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
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

            <ConfirmDialog
                open={deleteLobConfirmOpen}
                onClose={() => { setDeleteLobConfirmOpen(false); setPendingDeleteId(null); }}
                onConfirm={async () => {
                    if (pendingDeleteId) {
                        try {
                            await PositionService.delete(pendingDeleteId);
                            success('LOB Deleted', 'The Line of Business has been deleted.');
                            if (loadData) await loadData();
                        } catch {
                            toastError('Delete Failed', 'Failed to delete the Line of Business.');
                        }
                    }
                    setDeleteLobConfirmOpen(false);
                }}
                title="Delete Line of Business"
                message="Are you sure you want to permanently delete this Line of Business? This action cannot be undone."
                confirmText="Delete"
                confirmClass="bg-red-600 hover:bg-red-700"
            />

            <QuotaHistoryDashboardModal
                item={selectedHistoryDashboard}
                onClose={() => setSelectedHistoryDashboard(null)}
                onEdit={handleEditHistoryClick}
                allApplications={allApplications}
            />
        </Modal>
    );
}
