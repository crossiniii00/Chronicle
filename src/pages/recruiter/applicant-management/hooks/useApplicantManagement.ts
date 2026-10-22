import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGlobalDataStore } from '@/store/globalDataStore';
import { ApplicationService } from '@/services/ApplicationService';
import { UserService } from '@/services/UserService';
import { useToast } from '@/components/common/useToast';
import { useNotificationStore } from '@/store/notificationStore';
import { useQueueStore } from '@/store/queueStore';
import { useAuthStore } from '@/store/authStore';
import { useLoading } from '@/components/common/useLoading';
import { formatQueueNumber, toManilaDateParts } from '@/utils/formatters';
import { QueueService } from '@/services/QueueService';
import { useRoomStore } from '@/store/roomStore';
import type { Application, ApplicationStatus, ApplicationUpdatePatch } from '@/types/application';
import type { User as UserType } from '@/types/user';
import { buildReprofileQueue, completeActiveReprofileAccount, failActiveReprofileAccount, getActiveReprofileAccount, getReprofileQueue } from '@/utils/reprofileQueue';
import { KNOWN_ACCOUNTS, DepartmentService, Department } from '@/services/DepartmentService';
import { SPECIFIC_STATUS_TO_OVERALL } from '@/pages/recruiter/tracker/utils/statusMappings';
import { socketService } from '@/services/socketService';
import type { DateFilterState } from '@/components/common/AdvancedDateFilter';

export type Tab = 'all_tab' | 'ongoing' | 'scheduling' | 'requests' | 'reschedule' | 'reprofile' | 'rejected' | 'concluded' | 'noshow' | 'withdrawn' | 'waitlisted' | 'not_eligible' | 'promoted' | 'lateral' | 'blacklisted' | 'marked_as_pending' | 'pt_all' | 'pt_initial' | 'pt_typing' | 'pt_proficiency' | 'pt_opsval' | 'pt_client_assess' | 'pt_client_interview' | 'pt_job_offer' | 'pt_for_pan' | 'pt_waitlisted';
export type ModalTab = 'application' | 'typing' | 'initial' | 'assessment' | 'assessment_ii' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';
export type RequestModalTab = 'application' | 'typing';
export type ApplicantAction = 'approve' | 'reject' | 'view' | 'delete' | 'view_pis' | 'hide' | 'unhide';

export function getTrueAccounts(app: any): string[] {
    const meta = app.metadata || {};
    const pis = app.pis || meta.pis || {};

    const reprofileAccounts = (meta.reprofile_history || pis.reprofile_history || []).map((r: any) => r.previous_account || r.account);

    const sources = [
        app.department,
        app.initial_account_assignment || meta.initial_account_assignment || pis.initial_account_assignment,
        meta.final_account || pis.final_account,
        meta.target_account || pis.target_account,
        app.endorsement_account,
        ...reprofileAccounts
    ].filter(Boolean);

    const combinedStr = sources.join(', ');
    let accounts = combinedStr.split(',').map((s: string) => s.trim()).filter(Boolean);
    accounts = accounts.filter(a => a.toLowerCase() !== 'on-site' && a.toLowerCase() !== 'on-call' && a.toLowerCase() !== 'onsite' && a.toLowerCase() !== 'oncall');

    if (accounts.length === 0) accounts = ['Unassigned'];
    return Array.from(new Set(accounts));
}

export function useApplicantManagement({
    initialTab = 'all_tab',
    initialSearchQuery = '',
    initialStatusFilter = []
}: {
    initialTab?: Tab;
    initialSearchQuery?: string;
    initialStatusFilter?: string[];
} = {}) {
    const {
        applications: remoteApplications,
        setApplications: setRemoteApplications,
        users: allStaff,
        departments: deptRecords,
        isLoading: isInitialLoading,
        isInitialized,
        refreshData
    } = useGlobalDataStore();
    const { '*': splat } = useParams();
    const navigate = useNavigate();
    const urlApplicantId = splat?.replace(/^\//, '');
    const toast = useToast();
    const { withLoading } = useLoading();
    const { user } = useAuthStore();

    const [activeTab, setActiveTab] = useState<Tab>(initialTab === 'requests' ? 'requests' : (initialTab as Tab) || 'all_tab');
    const [activeMajorTab, setActiveMajorTab] = useState<'onsite' | 'oncall' | 'all'>('all');
    const [isPendingTrackerMode, setIsPendingTrackerMode] = useState<boolean>(false);
    const [isIdleFilterActive, setIsIdleFilterActive] = useState<boolean>(false);

    // Sync active tab if initialTab prop changes (e.g. from sidebar navigation)
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [promotionPromptApp, setPromotionPromptApp] = useState<Application | null>(null);
    const [pisApplicant, setPisApplicant] = useState<Application | null>(null);
    const [statusFilter, setStatusFilter] = useState<string[]>(
        Array.isArray(initialStatusFilter) ? initialStatusFilter :
            (typeof initialStatusFilter === 'string' && initialStatusFilter !== 'ALL' ? [initialStatusFilter] : [])
    );
    const [stepFilter, setStepFilter] = useState<string[]>([]);
    const [accountFilter, setAccountFilter] = useState<string[]>([]);
    const [specialStatusFilter, setSpecialStatusFilter] = useState<string[]>([]);
    const [taggingFilter, setTaggingFilter] = useState<string[]>([]);
    const [lobFilter, setLobFilter] = useState<string[]>([]);
    const [hireTypeFilter, setHireTypeFilter] = useState<string[]>([]);
    const [appliedDateFilter, setAppliedDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [interviewDateFilter, setInterviewDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [trainingDateFilter, setTrainingDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [dateFilter, setDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [dateTargetFilter, setDateTargetFilter] = useState<'APPLIED' | 'INITIAL_INTERVIEW' | 'TRAINING_START_DATE' | 'OPS_VAL_INTERVIEW'>('APPLIED');
    const [recruiterFilter, setRecruiterFilter] = useState<string[]>([]);
    const [assessmentScore, setAssessmentScore] = useState<string>('');
    const [modalTab, setModalTab] = useState<ModalTab>('application');
    const [requestModalTab, setRequestModalTab] = useState<RequestModalTab>('application');
    const [finalInterviewNotes, setFinalInterviewNotes] = useState('');
    const [clientAssessmentScore, setClientAssessmentScore] = useState<string>('');
    const [clientInterviewRemarks, setClientInterviewRemarks] = useState<string>('');
    const [isExclusiveMode, setIsExclusiveMode] = useState<boolean>(false);

    const isKnownAccount = useCallback((val: string) =>
        KNOWN_ACCOUNTS.some(acc => acc.toLowerCase() === val.toLowerCase()), []);
    const isCandidateOnCall = useCallback((app: Application) => {
        if (app.is_on_call === true) return true;

        const posTitle = String(app.position_title || (app as any).position?.title || app.metadata?.position_title || app.metadata?.position || '').toLowerCase();
        if (posTitle.includes('[on-call]') || posTitle.includes('[on call]') || posTitle.includes('on-call')) {
            return true;
        }

        const mode = String(app.metadata?.interview_mode || app.metadata?.active_interview_type || app.pis?.preferred_setup || '').toLowerCase();
        if (mode === 'on-call' || mode.includes('on-call')) return true;

        if (app.metadata && typeof app.metadata === 'object') {
            for (const key in app.metadata) {
                const val = app.metadata[key];
                if (typeof val === 'string') {
                    const lowerVal = val.toLowerCase();
                    if (lowerVal.includes('[on-call]') || lowerVal.includes('[on call]') || lowerVal === 'on-call') {
                        return true;
                    }
                }
            }
        }

        return false;
    }, []);
    const [validators, setValidators] = useState<UserType[]>([]);

    // Derived validators from global allStaff
    useEffect(() => {
        setValidators(allStaff.filter(u => u.role === 'ops_validator'));
    }, [allStaff]);

    const normalizedRecruitersMap = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        normalizedRecruitersMap.current.clear();
    }, [allStaff]);

    const normalizeRecruiterName = useCallback((name: string | null | undefined): string => {
        if (!name) return '';
        const trimmed = name.trim();
        let lower = trimmed.toLowerCase();
        if (lower === 'unassigned') return '';

        // Aliases for known recruiter name anomalies
        if (lower === 'sean v.') {
            lower = 'sean jessfredd claros';
        }

        if (normalizedRecruitersMap.current.has(lower)) {
            return normalizedRecruitersMap.current.get(lower)!;
        }

        // Find if there's an exact or close match in allStaff
        const found = allStaff.find(u => {
            const staffNameLower = u.full_name.toLowerCase();
            if (staffNameLower === lower) return true;

            const inputWords = lower.split(/\s+/).filter(Boolean);
            if (inputWords.length > 1 && inputWords.every(w => staffNameLower.includes(w))) {
                return true;
            }
            return false;
        });

        const result = found ? found.full_name : trimmed;
        normalizedRecruitersMap.current.set(lower, result);
        return result;
    }, [allStaff]);

    const getApplicantTabs = useCallback((app: Application): ModalTab[] => {
        const dept = (app.department || '').toUpperCase();
        const metadata = app.metadata || {};
        const failedAccounts = metadata.failed_accounts || [];
        const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toUpperCase()));

        const selectedDepts = (app.department || '')
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);
        const activeDepts = selectedDepts.filter(d => !failedSet.has(d));
        const targetDept = activeDepts[0] || selectedDepts[0] || '';

        const isKellerPostman = targetDept.includes('KELLER POSTMAN');
        const requiredProcesses: string[] | undefined = app.pis?.required_processes || app.metadata?.required_processes;

        let processOrder: string[] = [...(app.pis?.process_order || app.metadata?.process_order || [
            'TYPING_TEST',
            'INITIAL_INTERVIEW',
            'ACCOUNT_ASSIGNMENT',
            'ASSESSMENT',
            'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW'
        ])];

        const isEnercare = targetDept.includes('ENERCARE') || (app.department || '').toUpperCase().includes('ENERCARE');
        const isRegency = targetDept.includes('REGENCY') || (app.department || '').toUpperCase().includes('REGENCY');
        const hasSecondTest = (isEnercare || isRegency) && (
            app.metadata?.force_second_test ||
            app.metadata?.assessment_ii_score !== undefined ||
            processOrder.includes('ASSESSMENT_II') ||
            (requiredProcesses && requiredProcesses.includes('ASSESSMENT_II'))
        );

        if (hasSecondTest && !processOrder.includes('ASSESSMENT_II')) {
            const assessIdx = processOrder.indexOf('ASSESSMENT');
            if (assessIdx !== -1) {
                processOrder.splice(assessIdx + 1, 0, 'ASSESSMENT_II');
            } else {
                processOrder.push('ASSESSMENT_II');
            }
        }

        const isSpecializedClient = ['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE', 'AUTO APPROVE', 'PAESLER'].some(d => targetDept.includes(d));
        const isSpecialized = isKellerPostman || isSpecializedClient;


        // Normalize: ensure ACCOUNT_ASSIGNMENT comes right after INITIAL_INTERVIEW
        if (!isSpecialized && processOrder.includes('ACCOUNT_ASSIGNMENT') && processOrder.includes('INITIAL_INTERVIEW')) {
            const idxInit = processOrder.indexOf('INITIAL_INTERVIEW');
            const idxOps = processOrder.indexOf('ACCOUNT_ASSIGNMENT');
            if (idxOps !== idxInit + 1) {
                const newOrder = processOrder.filter(s => s !== 'ACCOUNT_ASSIGNMENT');
                const newIdxInit = newOrder.indexOf('INITIAL_INTERVIEW');
                newOrder.splice(newIdxInit + 1, 0, 'ACCOUNT_ASSIGNMENT');
                processOrder = newOrder;
            }
        }

        const activeStages = processOrder.filter(stageId => {
            if (stageId === 'ASSESSMENT_II') {
                return !!hasSecondTest;
            }
            if (requiredProcesses && !requiredProcesses.includes(stageId)) return false;
            if (stageId === 'CLIENT_ASSESSMENT') {
                return isKellerPostman;
            }
            if (stageId === 'CLIENT_INTERVIEW') {
                return (isKellerPostman || ['AUTO APPROVE', 'TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE', 'REGENCY', 'PAESLER'].some(d => targetDept.includes(d)));
            }
            return true;
        });

        const list: ModalTab[] = ['application'];
        activeStages.forEach(stageId => {
            if (stageId === 'TYPING_TEST') list.push('typing');
            else if (stageId === 'INITIAL_INTERVIEW') list.push('initial');
            else if (stageId === 'ACCOUNT_ASSIGNMENT') list.push('endorsement');
            else if (stageId === 'ASSESSMENT') {
                list.push('assessment');
                if (!activeStages.includes('ASSESSMENT_II')) {
                    list.push('scheduling');
                }
            } else if (stageId === 'ASSESSMENT_II') {
                list.push('assessment_ii');
                list.push('scheduling');
            } else if (stageId === 'CLIENT_ASSESSMENT') list.push('client_assessment');
            else if (stageId === 'CLIENT_INTERVIEW') list.push('client_interview');
        });
        list.push('verdict');
        return list;
    }, []);

    const getTabFromStatus = useCallback((status: string): ModalTab => {
        const lookup = (status || '').toUpperCase().trim().replace(/\s+/g, '_');
        const map: Record<string, ModalTab> = {
            'APPLIED': 'typing',
            'TYPING_TEST': 'typing',
            'INITIAL_INTERVIEW': 'initial',
            'INTERVIEW_IN_PROGRESS': 'initial',
            'QUEUE_ASSIGNED': 'initial',
            'ACCOUNT_ASSIGNMENT': 'endorsement',
            'ASSESSMENT': 'assessment',
            'FOR_SCHEDULING': 'scheduling',
            'FINAL_INTERVIEW': 'scheduling',
            'FINAL_INTERVIEW_SCHEDULED': 'scheduling',
            'CLIENT_ASSESSMENT': 'client_assessment',
            'CLIENT_INTERVIEW': 'client_interview',
            'FINAL_VERDICT': 'verdict',
            'PASSED': 'verdict',
            'HIRED': 'verdict',
            'REJECTED': 'verdict',
            'FOR_JOB_OFFER': 'verdict',
            'FOR JOB OFFER': 'verdict',
            'For Job Offer': 'verdict'
        };
        return map[lookup] || 'application';
    }, []);

    const getInitialTabForApplicant = useCallback((app: Application): ModalTab => {
        const lookup = (app.current_status || '').toUpperCase().trim().replace(/\s+/g, '_');
        const map: Record<string, ModalTab> = {
            'APPLIED': 'typing',
            'TYPING_TEST': 'typing',
            'INITIAL_INTERVIEW': 'initial',
            'INTERVIEW_IN_PROGRESS': 'initial',
            'QUEUE_ASSIGNED': 'initial',
            'ACCOUNT_ASSIGNMENT': 'endorsement',
            'ASSESSMENT': 'assessment',
            'FOR_SCHEDULING': 'scheduling',
            'FINAL_INTERVIEW': 'scheduling',
            'FINAL_INTERVIEW_SCHEDULED': 'scheduling',
            'CLIENT_ASSESSMENT': 'client_assessment',
            'CLIENT_INTERVIEW': 'client_interview',
            'FINAL_VERDICT': 'verdict',
            'PASSED': 'verdict',
            'HIRED': 'verdict',
            'REJECTED': 'verdict',
            'FOR_JOB_OFFER': 'verdict',
            'FOR JOB OFFER': 'verdict',
            'For Job Offer': 'verdict'
        };
        
        // Normalize sub-statuses (e.g. "NO_SHOW_-_QUEUE_ASSIGNED" -> "QUEUE_ASSIGNED")
        let normalizedLookup = lookup;
        if (lookup.includes('NO_SHOW')) {
            normalizedLookup = lookup.replace(/^NO_SHOW_?(?:-_)?_?/, '');
        } else if (lookup.includes('RESCHEDULED')) {
            normalizedLookup = lookup.replace(/^RESCHEDULED_?(?:-_)?_?/, '');
        }
        
        let tab = map[normalizedLookup] || 'application';

        if (lookup === 'FAILED' || lookup === 'REJECTED') {
            const fs = app.failure_details?.from_status;
            const initialResult = String(app.metadata?.initial_interview_result || app.pis?.initial_interview_result || '').toUpperCase();
            const spec = String(app.pis?.final_specific_status || app.metadata?.final_specific_status || '').toLowerCase();

            if (fs) {
                const fsLookup = String(fs).toUpperCase().trim().replace(/\s+/g, '_');
                if (fsLookup.includes('INITIAL') || fsLookup === 'QUEUE_ASSIGNED') {
                    tab = 'initial';
                } else if (fsLookup.includes('TYPING')) {
                    tab = 'typing';
                } else if (fsLookup.includes('ASSESSMENT') && !fsLookup.includes('CLIENT')) {
                    tab = 'assessment';
                } else if (fsLookup.includes('FINAL') || fsLookup.includes('SCHEDULING') || fsLookup.includes('OPS')) {
                    tab = 'scheduling';
                } else if (fsLookup.includes('CLIENT_ASSESSMENT')) {
                    tab = 'client_assessment';
                } else if (fsLookup.includes('CLIENT_INTERVIEW')) {
                    tab = 'client_interview';
                } else {
                    tab = map[fsLookup] || 'verdict';
                }
            } else if (initialResult === 'FAILED' || spec.includes('initial interview') || spec.includes('initial')) {
                tab = 'initial';
            } else if (spec.includes('typing')) {
                tab = 'typing';
            } else if (spec.includes('client assessment')) {
                tab = 'client_assessment';
            } else if (spec.includes('client interview')) {
                tab = 'client_interview';
            } else if (spec.includes('ov') || spec.includes('final interview')) {
                tab = 'scheduling';
            } else if (spec.includes('account assignment') || spec.includes('endorsement')) {
                tab = 'endorsement';
            } else if (spec.includes('assessment')) {
                tab = 'assessment';
            } else {
                tab = 'verdict';
            }
        }

        if (lookup.includes('PENDING') || lookup.includes('RESCHEDULED') || lookup.includes('NO_SHOW')) {
            const fromStatus = String(app.metadata?.pending_from_status || app.metadata?.rescheduled_from_status || app.metadata?.noshow_from_status || '').toUpperCase().trim();
            if (fromStatus) {
                const fsLookup = fromStatus.replace(/\s+/g, '_');
                tab = map[fsLookup] || tab;
            } else {
                const spec = String(app.pis?.final_specific_status || app.metadata?.final_specific_status || app.current_status || '').toLowerCase();
                if (spec.includes('typing')) tab = 'typing';
                else if (spec.includes('Initial Interview') || spec.includes('initial')) tab = 'initial';
                else if (spec.includes('client assessment')) tab = 'client_assessment';
                else if (spec.includes('client interview')) tab = 'client_interview';
                else if (spec.includes('ov') || spec.includes('final interviewer')) tab = 'scheduling';
                else if (spec.includes('account assignment') || spec.includes('endorsement')) tab = 'endorsement';
                else if (spec.includes('assessment')) tab = 'assessment';
            }
        }

        if (app.current_status === 'QUEUE_ASSIGNED' && app.queue_type === 'FINAL') {
            tab = 'endorsement';
        } else if (app.current_status === 'INTERVIEW_IN_PROGRESS' && app.queue_type === 'FINAL') {
            tab = 'endorsement';
        }

        if (tab === 'assessment') {
            const dept = (app.department || '').toUpperCase();
            const selectedDepts = dept.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            const metadata = app.metadata || {};
            const failedAccounts = metadata.failed_accounts || [];
            const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toUpperCase()));
            const activeDepts = selectedDepts.filter(d => !failedSet.has(d));
            const targetDept = activeDepts[0] || selectedDepts[0] || '';
            const isEnercare = targetDept.includes('ENERCARE') || dept.includes('ENERCARE');
            const isRegency = targetDept.includes('REGENCY') || dept.includes('REGENCY');

            const hasSecondTest = (isEnercare || isRegency) && (
                app.metadata?.force_second_test ||
                app.metadata?.assessment_ii_score !== undefined ||
                (app.pis?.process_order || app.metadata?.process_order || []).includes('ASSESSMENT_II') ||
                (app.pis?.required_processes || app.metadata?.required_processes || []).includes('ASSESSMENT_II')
            );
            if (hasSecondTest && app.assessment_score != null && app.metadata?.assessment_ii_score === undefined) {
                tab = 'assessment_ii';
            }
        }
        return tab;
    }, []);

    // Bulk/Management state
    const [showQueuePrompt, setShowQueuePrompt] = useState<{
        id: string;
        name: string;
        applicantUserId: string;
        queueType: 'INITIAL' | 'FINAL';
        department?: string;
        opsValidatorId?: string;
    } | null>(null);
    const [showQueueSuccess, setShowQueueSuccess] = useState<{
        name: string;
        queueType: 'INITIAL' | 'FINAL';
    } | null>(null);
    const [deleteConfirmApplicant, setDeleteConfirmApplicant] = useState<{ id: string; name: string } | null>(null);
    const [hideConfirmApplicant, setHideConfirmApplicant] = useState<{ id: string; name: string; action: 'hide' | 'unhide' } | null>(null);
    const [deletingApplicantId, setDeletingApplicantId] = useState<string | null>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const stageRanks: Record<string, number> = {
        'application': 0,
        'initial': 1,
        'assessment': 2,
        'final': 3,
        'client_assessment': 4,
        'client_interview': 5,
        'verdict': 6
    };

    const getApplicantStatusRank = (status: string, applicant?: Application) => {
        if ((status === 'OPEN' || !status) && applicant) {
            const spec = String(applicant.pis?.final_specific_status || (applicant as any).final_specific_status || '').toLowerCase();
            if (spec.includes('hired')) return 6;
            if (spec.includes('jo -') || spec.includes('job offer')) return 6;
            if (spec.includes('client interview')) return 5;
            if (spec.includes('client assessment')) return 4;
            if (spec.includes('ov - passed') || spec.includes('Final Interview') || spec.includes('final') || spec.includes('ov -')) return 3;
            if (spec.includes('wonderlic') || spec.includes('speechx') || spec.includes('personality') || spec.includes('assessment')) return 2;
            if (spec.includes('Initial Interview') || spec.includes('initial')) return 1;
            if (spec.includes('typing')) return 0;
        }

        let processOrder: string[] = applicant?.pis?.process_order || applicant?.metadata?.process_order || [
            'TYPING_TEST',
            'INITIAL_INTERVIEW',
            'ACCOUNT_ASSIGNMENT',
            'ASSESSMENT',
            'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW'
        ];

        const isSpecializedAcc = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (applicant?.department || '').toUpperCase().includes(d));

        // Normalize: ensure ACCOUNT_ASSIGNMENT comes right after INITIAL_INTERVIEW
        if (!isSpecializedAcc && processOrder.includes('ACCOUNT_ASSIGNMENT') && processOrder.includes('INITIAL_INTERVIEW')) {
            const idxInit = processOrder.indexOf('INITIAL_INTERVIEW');
            const idxOps = processOrder.indexOf('ACCOUNT_ASSIGNMENT');
            if (idxOps !== idxInit + 1) {
                const newOrder = processOrder.filter(s => s !== 'ACCOUNT_ASSIGNMENT');
                const newIdxInit = newOrder.indexOf('INITIAL_INTERVIEW');
                newOrder.splice(newIdxInit + 1, 0, 'ACCOUNT_ASSIGNMENT');
                processOrder = newOrder;
            }
        }

        const statusToStageMap: Record<string, string> = {
            'APPLIED': 'TYPING_TEST',
            'TYPING_TEST': 'TYPING_TEST',
            'INITIAL_INTERVIEW': 'INITIAL_INTERVIEW',
            'INTERVIEW_IN_PROGRESS': 'INITIAL_INTERVIEW',
            'QUEUE_ASSIGNED': 'INITIAL_INTERVIEW',
            'ASSESSMENT': 'ASSESSMENT',
            'FOR_SCHEDULING': 'ASSESSMENT',
            'FINAL_INTERVIEW': 'ACCOUNT_ASSIGNMENT',
            'FINAL_INTERVIEW_SCHEDULED': 'ACCOUNT_ASSIGNMENT',
            'CLIENT_ASSESSMENT': 'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW': 'CLIENT_INTERVIEW',
            'FOR_JOB_OFFER': 'VERDICT',
            'For Job Offer': 'VERDICT',
            'FINAL_VERDICT': 'VERDICT',
            'PASSED': 'VERDICT',
            'FAILED': 'VERDICT',
            'CONDITIONAL': 'VERDICT',
            'WAITLISTED': 'VERDICT',
            'WITHDRAWN': 'VERDICT',
            'HIRED': 'VERDICT',
            'REJECTED': 'VERDICT'
        };

        const stage = statusToStageMap[status];
        if (stage === 'VERDICT') return 6;

        const idx = processOrder.indexOf(stage);
        return idx !== -1 ? idx : 0;
    };

    const loadData = useCallback(async () => {
        // Data is now loaded globally in Dashboard wrapper (useGlobalDataStore)
        // Kept this function reference to avoid breaking dependencies, but it's a no-op locally.
    }, []);

    useEffect(() => {
        if (refreshKey > 0) {
            refreshData();
        }
    }, [refreshKey, refreshData]);



    useEffect(() => {
        if (urlApplicantId && remoteApplications.length > 0) {
            const applicant = remoteApplications.find((a) => a.id === urlApplicantId);
            if (applicant) {
                setSelectedApplicant(applicant);
            }
        }
    }, [urlApplicantId, remoteApplications]);

    // Keep selected applicant state synchronized with real-time remote updates, 
    // but prevent "flicker" by ensuring we only sync if the remote version is strictly newer.
    useEffect(() => {
        if (selectedApplicant && remoteApplications.length > 0) {
            const updated = remoteApplications.find(a => a.id === selectedApplicant.id);
            if (updated && new Date(updated.updated_at).getTime() > new Date(selectedApplicant.updated_at).getTime()) {
                setSelectedApplicant(updated);
            }
        }
    }, [remoteApplications, selectedApplicant]);

    // Handle highlight routing
    useEffect(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search);
            const highlightId = searchParams.get('highlight');
            if (highlightId && remoteApplications.length > 0) {
                const applicant = remoteApplications.find((a) => a.id === highlightId);
                if (applicant) {
                    // 1. Determine activeMajorTab (onsite vs online/oncall)
                    const onCall = isCandidateOnCall(applicant);
                    setActiveMajorTab(onCall ? 'oncall' : 'onsite');

                    // 2. Clear filters so the applicant isn't hidden
                    setSearchQuery('');
                    setStatusFilter([]);
                    setAccountFilter([]);
                    setHireTypeFilter([]);
                    setDateFilter({ type: 'ALL', start: null, end: null });
                    setRecruiterFilter([]);

                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete('highlight');
                    window.history.replaceState({}, '', newUrl);

                    // 3. Determine and set the correct active tab
                    const metadata = applicant.metadata || {};
                    const isExplicitlyEndorsed = !!applicant.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                    const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (applicant.department || '').toUpperCase().includes(d));
                    const schedulingStatus = applicant.recruiter_s_scheduling_status || metadata.recruiter_s_scheduling_status;
                    const isPending = !schedulingStatus || schedulingStatus === 'PENDING';
                    const isAtInboxStage = applicant.current_status === 'FINAL_INTERVIEW' || applicant.current_status === 'APPLIED';

                    const isRequest = user?.role === 'recruiter_s'
                        ? ((isExplicitlyEndorsed || (isSpecializedAccount && applicant.current_status === 'FINAL_INTERVIEW')) && isPending && isAtInboxStage)
                        : (applicant.source === 'WEBAPP' && applicant.current_status === 'APPLIED');

                    if (isRequest) {
                        setActiveTab('requests');
                        return;
                    }

                    const isConcludedStatus = CONCLUDED_STATUSES.includes(applicant.current_status);
                    const isConcluded = user?.role === 'recruiter_s'
                        ? ((isExplicitlyEndorsed || isSpecializedAccount) && isConcludedStatus)
                        : (applicant.source === 'WEBAPP' && isConcludedStatus);

                    if (isConcluded) {
                        setActiveTab('concluded');
                        return;
                    }

                    const hasFailedAllAccounts = (app: Application) => {
                        const depts = (app.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                        if (depts.length === 0) return false;
                        const failedAccounts = app.metadata?.failed_accounts || [];
                        const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
                        return depts.every(d => failedSet.has(d));
                    };

                    const isRejected = user?.role === 'recruiter_s'
                        ? ((isExplicitlyEndorsed || isSpecializedAccount) && (['REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(applicant.current_status) || hasFailedAllAccounts(applicant)))
                        : (applicant.source === 'WEBAPP' && (['REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(applicant.current_status) || hasFailedAllAccounts(applicant)));

                    if (isRejected) {
                        setActiveTab('rejected');
                        return;
                    }

                    const history = applicant.pis?.reprofile_history || applicant.metadata?.reprofile_history || [];
                    const hasHistory = Array.isArray(history) && history.length > 0;
                    const hasReprofileFlag = applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true';
                    const initialAccount = String(applicant.pis?.initial_account_assignment || applicant.metadata?.initial_account_assignment || '').trim();
                    const currentAccount = String(applicant.department || '').trim();
                    const currentAccountList = currentAccount.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                    const movedFromInitial = !!initialAccount && !!currentAccount && isKnownAccount(initialAccount) && initialAccount !== 'PENDING' && initialAccount !== 'N/A' && !currentAccountList.includes(initialAccount.toLowerCase());
                    const queue = getReprofileQueue(applicant);
                    const hasActiveOrWaiting = queue.some(item => item.status === 'ACTIVE' || item.status === 'WAITING');
                    const isPassedOrConcluded = CONCLUDED_STATUSES.includes(applicant.current_status);
                    const isFailedAndNoWaiting = ['REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(applicant.current_status) && !hasActiveOrWaiting;
                    const isActuallyFinished = isPassedOrConcluded || isFailedAndNoWaiting;

                    const pendingSpecStatus = String(applicant.pis?.final_specific_status || applicant.pis?.specific_status || applicant.metadata?.final_specific_status || applicant.metadata?.specific_status || (applicant as any).final_specific_status || (applicant as any).specific_status || '').toLowerCase();
                    const isMarkedAsPending = String(applicant.current_status || '').toLowerCase().includes('marked pending') || String(applicant.current_status || '').toLowerCase().includes('marked as pending') || String(applicant.current_status || '').toLowerCase() === 'marked_pending' || pendingSpecStatus.includes('marked pending') || pendingSpecStatus.includes('marked as pending');

                    if (isMarkedAsPending) {
                        setActiveTab('marked_as_pending');
                        return;
                    }

                    // Reprofile tab removed, no longer auto-routing here


                    if (user?.role === 'recruiter_s') {
                        const depts = (applicant.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                        const failedAccounts = applicant.metadata?.failed_accounts || [];
                        const remainingAccounts = depts.filter(d => !failedAccounts.some((f: any) => f.trim().toLowerCase() === d));
                        const isReceived = schedulingStatus === 'RECEIVED' || schedulingStatus === 'SCHEDULED';
                        const isAtSchedulingStage = applicant.current_status === 'FINAL_INTERVIEW';
                        const isScheduling = (isExplicitlyEndorsed || isSpecializedAccount) && isReceived && isAtSchedulingStage && remainingAccounts.length > 0;
                        if (isScheduling) {
                            setActiveTab('scheduling');
                            return;
                        }
                    }

                    setActiveTab('ongoing');
                }
            }
        } catch (e) {
            console.error('Error auto-routing highlight parameter:', e);
        }
    }, [remoteApplications, user?.role, isCandidateOnCall, isKnownAccount]);

    const applications = useMemo(() => {
        let apps = [...remoteApplications];
        // Disabled filtering per user request so all candidates are visible
        return apps;
    }, [remoteApplications, user?.role]);


    const majorFilteredApplications = useMemo(() => {
        return applications.filter(app => {
            const onCall = isCandidateOnCall(app);
            if (activeMajorTab === 'oncall') return onCall;
            if (activeMajorTab === 'onsite') return !onCall;
            return true;
        });
    }, [applications, activeMajorTab, isCandidateOnCall]);

    const { accounts: departments, accountToLobsMap } = useMemo(() => {
        // Use actual Department records as the source of truth
        const accList: string[] = [];
        const map: Record<string, string[]> = {};

        // Collect sub-account names so we can exclude them from top-level
        const subAccountNames = new Set<string>();
        deptRecords.forEach(d => {
            const subs = d.subAccounts || (d as any).sub_accounts || [];
            subs.forEach((sub: any) => {
                const name = typeof sub === 'string' ? sub : sub.name;
                if (name) subAccountNames.add(name.toUpperCase());
            });
        });

        deptRecords.forEach(d => {
            const name = d.name.toUpperCase();
            // Skip departments whose name matches a sub-account of another department
            if (subAccountNames.has(name)) return;
            if (!accList.includes(name)) accList.push(name);

            const subs = d.subAccounts || (d as any).sub_accounts || [];
            const lobNames = subs.map((sub: any) => {
                const n = typeof sub === 'string' ? sub : sub.name;
                return n ? n.toUpperCase() : '';
            }).filter(Boolean);
            map[name] = lobNames.sort();
        });

        return {
            accounts: accList.sort() as string[],
            accountToLobsMap: map
        };
    }, [deptRecords]);

    const recruiters = useMemo(() => {
        const set = new Set<string>();

        allStaff.forEach(u => {
            if (u.role?.includes('recruiter') && u.is_active) {
                set.add(u.full_name);
            }
        });

        majorFilteredApplications.forEach(a => {
            const unified = normalizeRecruiterName(a.interviewer_name || a.assigned_recruiter_name);
            if (unified) set.add(unified);
        });
        return Array.from(set).sort() as string[];
    }, [majorFilteredApplications, normalizeRecruiterName, allStaff]);

    const evaluateStatusFilter = useCallback((a: Application, activeTab: string, filterList: string[]) => {
        if (filterList.length === 0 || filterList.includes('ALL')) return true;

        if (filterList.includes('REPROFILE')) {
            const depts = (a.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            const failedAccounts = a.metadata?.failed_accounts || [];
            const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
            const hasFailedAll = depts.length > 0 && depts.every(d => failedSet.has(d));
            if (failedSet.size > 0 && !hasFailedAll) return true;
        }

        if (activeTab === 'rejected') {
            const getNormalizedFrom = (app: any) => {
                const fs = String(app.failure_details?.from_status || '').toUpperCase().trim();
                if (fs === 'INTERVIEW_IN_PROGRESS') {
                    const specStatus = String(app.metadata?.final_specific_status || app.pis?.final_specific_status || '').toUpperCase();
                    const hasOpsValidator = !!app.metadata?.ops_validator_status;
                    if (hasOpsValidator || specStatus.includes('OV') || specStatus.includes('FINAL') || specStatus.includes('OPS')) {
                        return 'FINAL_INTERVIEW';
                    }
                    return 'INITIAL_INTERVIEW';
                }
                return fs;
            };
            const fromStatus = getNormalizedFrom(a);

            if (filterList.includes('TYPING_TEST')) {
                const wpm = Number(a.typing_test_wpm ?? 0);
                const acc = Number(a.typing_test_accuracy ?? 0);
                const hasScore = a.typing_test_wpm !== null && a.typing_test_wpm !== undefined;
                if (hasScore && (wpm < 40 || acc < 90)) return true;
            }
            if (filterList.includes('INITIAL_INTERVIEW')) {
                if (fromStatus === 'INITIAL_INTERVIEW' || fromStatus === 'INITIAL INTERVIEW') return true;
            }
            if (filterList.includes('FINAL_INTERVIEW_SCHEDULED')) {
                if (fromStatus === 'FINAL_INTERVIEW_SCHEDULED' || fromStatus === 'FINAL INTERVIEW SCHEDULED') return true;
            }
            if (filterList.includes('ASSESSMENT')) {
                const score = a.assessment_score;
                if (score !== undefined && score !== null && String(score).trim() !== '') {
                    const upperScore = String(score).toUpperCase().trim();
                    const isCEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(upperScore);
                    if (isCEFR) {
                        if (['A1', 'A2', 'B1'].includes(upperScore)) return true;
                    } else {
                        const parsed = parseFloat(upperScore);
                        if (!isNaN(parsed)) {
                            if (parsed < 60) return true;
                        }
                    }
                }
            }
            if (filterList.includes('FAILED_REPROFILE')) {
                if (fromStatus === 'REPROFILE') return true;
            }
            return filterList.includes(fromStatus);
        } else if (activeTab === 'withdrawn') {
            const fromStatus = String(a.failure_details?.from_status || '').toUpperCase().trim();
            const specStatus = String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().trim();

            if (filterList.includes('WITHDRAWN_OPS_VALIDATOR')) {
                return fromStatus === 'FINAL_INTERVIEW' || fromStatus === 'FINAL_INTERVIEW_SCHEDULED' || fromStatus === 'FINAL INTERVIEW' || fromStatus === 'FINAL INTERVIEW SCHEDULED' || specStatus.includes('OV') || specStatus.includes('Final Interview') || specStatus.includes('final interviewer');
            }
            if (filterList.includes('WITHDRAWN_ASSESSMENT')) {
                return fromStatus === 'ASSESSMENT' || fromStatus === 'ASSESSMENT_II' || fromStatus === 'TYPING_TEST' || specStatus.includes('WONDERLIC') || specStatus.includes('SPEECHX') || specStatus.includes('PERSONALITY') || specStatus.includes('TYPING') || specStatus.includes('ASSESSMENT');
            }
            if (filterList.includes('WITHDRAWN_CLIENT_ASSESSMENT')) {
                return fromStatus === 'CLIENT_ASSESSMENT' || specStatus.includes('CLIENT ASSESSMENT');
            }
            if (filterList.includes('WITHDRAWN_CLIENT_INTERVIEW')) {
                return fromStatus === 'CLIENT_INTERVIEW' || specStatus.includes('CLIENT INTERVIEW');
            }
            return true;
        }

        const currStatus = String(a.current_status || '').toUpperCase().trim();
        const specStatus = String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().trim();

        return filterList.some((filterVal) => {
            const valUpper = filterVal.toUpperCase().trim();

            if (valUpper === 'QUEUE_ASSIGNED') return currStatus === 'QUEUE_ASSIGNED';
            if (valUpper === 'INTERVIEW_IN_PROGRESS') return currStatus === 'INTERVIEW_IN_PROGRESS';
            if (valUpper === 'TYPING_TEST') return currStatus === 'TYPING_TEST' || specStatus.includes('TYPING');
            if (valUpper === 'INITIAL_INTERVIEW') return ['INITIAL_INTERVIEW', 'INITIAL INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS'].includes(currStatus);
            if (valUpper === 'ASSESSMENT') return ['ASSESSMENT', 'ASSESSMENT_II', 'PROFICIENCY ASSESSMENT'].includes(currStatus) || specStatus.includes('ASSESSMENT');
            if (valUpper === 'FINAL_INTERVIEW_SCHEDULED' || valUpper === 'OPS_VAL_SCHEDULED') {
                return ['FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW SCHEDULED', 'FOR_OPS_VAL_SCHEDULING', 'FOR OPS VAL SCHEDULING', 'OPS_VAL_SCHEDULED', 'OPS VAL SCHEDULED'].includes(currStatus) || specStatus.includes('OV - SCHEDULED');
            }
            if (valUpper === 'FINAL_INTERVIEW') return ['FINAL_INTERVIEW', 'FINAL INTERVIEW'].includes(currStatus);
            if (valUpper === 'CLIENT_ASSESSMENT') return ['CLIENT_ASSESSMENT', 'CLIENT ASSESSMENT'].includes(currStatus);
            if (valUpper === 'CLIENT_INTERVIEW') return ['CLIENT_INTERVIEW', 'CLIENT INTERVIEW'].includes(currStatus);
            if (valUpper === 'FOR_JOB_OFFER') return ['FOR_JOB_OFFER', 'FOR JOB OFFER'].includes(currStatus);
            if (valUpper === 'ACCEPTED_OFFER') return ['ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(currStatus);
            if (valUpper === 'SENT_JO_AND_BGC') return ['SENT_JO_AND_BGC', 'SENT JO AND BGC'].includes(currStatus);
            if (valUpper === 'PAN_ISSUED') return ['PAN_COMPLETED', 'PAN COMPLETED', 'PAN ISSUED; FOR SIGNATURE', 'PAN ISSUED: FOR SIGNATURE', 'PAN ISSUED FOR SIGNATURE', 'PAN_ISSUED;_FOR_SIGNATURE', 'PAN ISSUED', 'FOR SIGNATURE', 'PAN_ISSUED'].includes(currStatus);
            if (valUpper === 'CONFIRMED_TRAINING') return ['CONFIRMED_TRAINING', 'CONFIRMED TRAINING'].includes(currStatus);
            if (valUpper === 'RESCHEDULED') return currStatus === 'RESCHEDULED' || specStatus.includes('RESCHEDULE');
            if (valUpper === 'RESCHEDULED_INITIAL' && currStatus === 'RESCHEDULED') {
                const from = String(a.metadata?.rescheduled_from_status || '').toUpperCase();
                if (['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'INITIAL INTERVIEW'].includes(from)) return true;
            }
            if (valUpper === 'RESCHEDULED_ASSESSMENT' && currStatus === 'RESCHEDULED') {
                const from = String(a.metadata?.rescheduled_from_status || '').toUpperCase();
                if (['ASSESSMENT', 'ASSESSMENT_II'].includes(from)) return true;
            }
            if (valUpper === currStatus) return true;

            return valUpper === currStatus;
        });
    }, []);

    const reschedule = useMemo(() => {
        return majorFilteredApplications.filter(a => {
            const specStatus = String(a.pis?.final_specific_status || (a as any).final_specific_status || '').toLowerCase();
            const isNoShow = specStatus.includes('no show') || specStatus.includes('noshow') || specStatus.includes('no_show');
            const isStatusResched = a.current_status === 'RESCHEDULED' && !isNoShow;
            return isStatusResched && !(a.metadata?.is_reprofiled === true || a.metadata?.is_reprofiled === 'true');
        }).filter(a => evaluateStatusFilter(a, 'reschedule', statusFilter) && evaluateStatusFilter(a, 'reschedule', stepFilter));
    }, [majorFilteredApplications, statusFilter, stepFilter, evaluateStatusFilter]);

    const requests = useMemo(() => {
        if (user?.role === 'recruiter_s') {
            return majorFilteredApplications.filter(a => {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));

                const schedulingStatus = a.recruiter_s_scheduling_status || metadata.recruiter_s_scheduling_status;
                const isPending = !schedulingStatus || schedulingStatus === 'PENDING';

                const isAtInboxStage = a.current_status === 'FINAL_INTERVIEW' || a.current_status === 'APPLIED';

                return (isExplicitlyEndorsed || (isSpecializedAccount && a.current_status === 'FINAL_INTERVIEW')) && isPending && isAtInboxStage;
            }).filter(a => evaluateStatusFilter(a, 'requests', statusFilter) && evaluateStatusFilter(a, 'requests', stepFilter));
        }
        return majorFilteredApplications.filter((a) => (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && a.current_status === 'APPLIED').filter(a => evaluateStatusFilter(a, 'requests', statusFilter) && evaluateStatusFilter(a, 'requests', stepFilter));
    }, [majorFilteredApplications, user?.role, isCandidateOnCall, statusFilter, stepFilter, evaluateStatusFilter]);

    // Duplicate Detection Logic:
    // Finds requests that have the same first name, last name, and email as another candidate NOT in requests.
    const duplicateRequestsMap = useMemo(() => {
        const duplicateMap: Record<string, string[]> = {};

        requests.forEach(req => {
            const reqParts = req.applicant_name.split(' ');
            const reqFirst = (req.metadata?.first_name || reqParts[0] || '').trim().toLowerCase();
            const reqLast = (req.metadata?.last_name || reqParts.slice(1).join(' ') || '').trim().toLowerCase();
            const reqEmail = (req.applicant_email || req.metadata?.email || '').trim().toLowerCase();

            if (!reqFirst || !reqLast || !reqEmail) return;

            const duplicates = majorFilteredApplications.filter(app => {
                if (app.id === req.id) return false;

                // Exclude other requests from being considered the "target" of a duplicate
                // We want to merge the request INTO an ongoing/active application.
                const isAppAlsoRequest = requests.some(r => r.id === app.id);
                if (isAppAlsoRequest) return false;

                const appParts = app.applicant_name.split(' ');
                const appFirst = (app.metadata?.first_name || appParts[0] || '').trim().toLowerCase();
                const appLast = (app.metadata?.last_name || appParts.slice(1).join(' ') || '').trim().toLowerCase();
                const appEmail = (app.applicant_email || app.metadata?.email || '').trim().toLowerCase();

                return reqFirst === appFirst && reqLast === appLast && reqEmail === appEmail;
            });

            if (duplicates.length > 0) {
                duplicateMap[req.id] = duplicates.map(d => d.id);
            }
        });

        return duplicateMap;
    }, [requests, majorFilteredApplications]);

    const blacklisted = useMemo(() => {
        return majorFilteredApplications.filter((a) => {
            const isBlacklisted = String(a.current_status || '').toUpperCase().includes('BLACKLIST') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('BLACKLIST');
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isBlacklisted;
            }
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isBlacklisted;
        }).filter(a => evaluateStatusFilter(a, 'blacklisted', statusFilter) && evaluateStatusFilter(a, 'blacklisted', stepFilter));
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const rejected = useMemo(() => {
        const hasFailedAllAccounts = (app: any) => {
            const depts = (app.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            if (depts.length === 0) return false;
            const failedAccounts = app.metadata?.failed_accounts || [];
            const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
            return depts.every((d: string) => failedSet.has(d));
        };

        if (user?.role === 'recruiter_s') {
            return majorFilteredApplications.filter(a => {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                const isRejectedStatus = ['REJECTED', 'FAILED', 'CLOSED'].includes(a.current_status) || String(a.current_status || '').toLowerCase().includes('failed') || String(a.current_status || '').toLowerCase() === 'closed';
                const isBlacklisted = String(a.current_status || '').toUpperCase().includes('BLACKLIST') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('BLACKLIST');
                return (isExplicitlyEndorsed || isSpecializedAccount) && (isRejectedStatus || hasFailedAllAccounts(a)) && !isBlacklisted;
            }).filter(a => evaluateStatusFilter(a, 'rejected', statusFilter) && evaluateStatusFilter(a, 'rejected', stepFilter));
        }
        return majorFilteredApplications.filter((a) => {
            const isBlacklisted = String(a.current_status || '').toUpperCase().includes('BLACKLIST') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('BLACKLIST');
            const isRejectedStatus = ['REJECTED', 'FAILED', 'CLOSED'].includes(a.current_status) || String(a.current_status || '').toLowerCase().includes('failed') || String(a.current_status || '').toLowerCase() === 'closed';
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && (isRejectedStatus || hasFailedAllAccounts(a)) && !isBlacklisted;
        }).filter(a => evaluateStatusFilter(a, 'rejected', statusFilter) && evaluateStatusFilter(a, 'rejected', stepFilter));
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const withdrawn = useMemo(() => {
        return majorFilteredApplications.filter((a) => {
            const isTargetStatus = ['WITHDRAWN', 'Withdrawn'].includes(a.current_status) || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('WITHDREW') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('WITHDRAWN');
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isTargetStatus;
            }
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isTargetStatus;
        }).filter(a => evaluateStatusFilter(a, 'withdrawn', statusFilter) && evaluateStatusFilter(a, 'withdrawn', stepFilter));
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const waitlisted = useMemo(() => {
        return majorFilteredApplications.filter((a) => {
            const isTargetStatus = ['WAITLISTED', 'Waitlisted'].includes(a.current_status) || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('WAITLIST');
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isTargetStatus;
            }
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isTargetStatus;
        }).filter(a => evaluateStatusFilter(a, 'waitlisted', statusFilter) && evaluateStatusFilter(a, 'waitlisted', stepFilter));
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const not_eligible = useMemo(() => {
        return majorFilteredApplications.filter((a) => {
            const isTargetStatus = ['NOT_ELIGIBLE_FOR_REHIRE', 'Not Eligible for Rehire'].includes(a.current_status) || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('NOT ELIGIBLE') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('NOT_ELIGIBLE');
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isTargetStatus;
            }
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isTargetStatus;
        }).filter(a => evaluateStatusFilter(a, 'not_eligible', statusFilter) && evaluateStatusFilter(a, 'not_eligible', stepFilter));
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const promoted = useMemo(() => {
        return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'promoted', statusFilter) && evaluateStatusFilter(a, 'promoted', stepFilter)).filter((a) => {
            const isTargetStatus = String(a.current_status || '').toUpperCase().includes('PROMOTED') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('PROMOTED');
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isTargetStatus;
            }
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isTargetStatus;
        });
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const lateral = useMemo(() => {
        return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'lateral', statusFilter) && evaluateStatusFilter(a, 'lateral', stepFilter)).filter((a) => {
            const isTargetStatus = String(a.current_status || '').toUpperCase().includes('LATERAL') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('LATERAL');
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isTargetStatus;
            }
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isTargetStatus;
        });
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);


    const CONCLUDED_STATUSES = [
        'HIRED', 'HIRED_PROCESSED', 'PASSED', 'FINAL_VERDICT',
        'FOR PAN', 'For PAN', 'FOR_PAN', 'PAN_COMPLETED', 'PAN COMPLETED',
        'PAN ISSUED', 'PAN_ISSUED', 'PAN ISSUED; FOR SIGNATURE', 'PAN ISSUED FOR SIGNATURE', 'PAN_ISSUED;_FOR_SIGNATURE',
        'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'Accepted Offer',
        'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'Sent JO and BGC',
        'Lateral Transfer', 'LATERAL_TRANSFER', 'LATERAL TRANSFER',
        'PROMOTED', 'DECLINED OFFER', 'DECLINED_OFFER'
    ];

    const concluded = useMemo(() => {
        return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'concluded', statusFilter) && evaluateStatusFilter(a, 'concluded', stepFilter)).filter(a => {
            const isConcludedStatus = CONCLUDED_STATUSES.includes(a.current_status);
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isConcludedStatus;
            }
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isConcludedStatus;
        });
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const noshow = useMemo(() => {
        return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'noshow', statusFilter) && evaluateStatusFilter(a, 'noshow', stepFilter)).filter(a => {
            const specStatus = String(a.pis?.final_specific_status || (a as any).final_specific_status || '').toLowerCase();
            const currentStatus = String(a.current_status || '').toLowerCase();
            const isNoShow = specStatus.includes('no show') || specStatus.includes('noshow') || specStatus.includes('no_show') || currentStatus.includes('no show') || currentStatus.includes('noshow') || currentStatus.includes('no_show');
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isNoShow;
            }
            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isNoShow;
        });
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const marked_as_pending = useMemo(() => {
        return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'marked_as_pending', statusFilter) && evaluateStatusFilter(a, 'marked_as_pending', stepFilter)).filter(a => {
            const currentStatus = String(a.current_status || '').toLowerCase();
            const specStatus = String(a.pis?.final_specific_status || a.pis?.specific_status || a.metadata?.final_specific_status || a.metadata?.specific_status || (a as any).final_specific_status || (a as any).specific_status || '').toLowerCase();
            const isMarkedAsPending = currentStatus.includes('marked as pending') || currentStatus.includes('marked pending') || currentStatus === 'marked_pending' || specStatus.includes('marked as pending') || specStatus.includes('marked pending');
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));
                return (isExplicitlyEndorsed || isSpecializedAccount) && isMarkedAsPending;
            }
            return isMarkedAsPending;
        });
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const scheduling = useMemo(() => {
        if (user?.role === 'recruiter_s') {
            // Scheduling Tab: Show candidates who have been accepted but are not yet fully ongoing
            return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'scheduling', statusFilter) && evaluateStatusFilter(a, 'scheduling', stepFilter)).filter(a => {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));

                const depts = (a.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                const failedAccounts = a.metadata?.failed_accounts || [];
                const remainingAccounts = depts.filter(d => !failedAccounts.some((f: any) => f.trim().toLowerCase() === d));
                if (remainingAccounts.length === 0) return false;

                const schedulingStatus = a.recruiter_s_scheduling_status || metadata.recruiter_s_scheduling_status;
                const isReceived = schedulingStatus === 'RECEIVED' || schedulingStatus === 'SCHEDULED';
                const isAtSchedulingStage = a.current_status === 'FINAL_INTERVIEW';

                return (isExplicitlyEndorsed || isSpecializedAccount) && isReceived && isAtSchedulingStage;
            });
        }
        return [];
    }, [majorFilteredApplications, user?.role, statusFilter, stepFilter, evaluateStatusFilter]);

    const reprofile = useMemo(() => {
        return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'reprofile', statusFilter) && evaluateStatusFilter(a, 'reprofile', stepFilter)).filter((a) => {
            const history = a.pis?.reprofile_history || a.metadata?.reprofile_history || [];
            const hasHistory = Array.isArray(history) && history.length > 0;
            const hasReprofileFlag = a.metadata?.is_reprofiled === true || a.metadata?.is_reprofiled === 'true';
            const initialAccount = String(a.pis?.initial_account_assignment || a.metadata?.initial_account_assignment || (a.pis as any)?.['INITITAL ACCOUNT ASSIGNMENT'] || a.metadata?.['INITITAL ACCOUNT ASSIGNMENT'] || '').trim();
            const currentAccount = String(a.department || '').trim();

            // GUARD: Only treat as a reprofile signal if initial_account_assignment is a
            // recognized account name. This prevents position titles like "Japanese" from
            // falsely triggering the reprofile tab.
            const currentAccountList = currentAccount.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const movedFromInitial = !!initialAccount
                && !!currentAccount
                && isKnownAccount(initialAccount)
                && initialAccount !== 'PENDING'
                && initialAccount !== 'N/A'
                && !currentAccountList.includes(initialAccount.toLowerCase());

            const queue = getReprofileQueue(a);
            const hasActiveOrWaiting = queue.some(item => item.status === 'ACTIVE' || item.status === 'WAITING');

            // We remove them from the reprofile tab once they are passed/concluded (moving them to concluded).
            const isPassedOrConcluded = CONCLUDED_STATUSES.includes(a.current_status);
            const isFailedAndNoWaiting = ['REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status) && !hasActiveOrWaiting;
            const isActuallyFinished = isPassedOrConcluded || isFailedAndNoWaiting;
            return (hasHistory || hasReprofileFlag || movedFromInitial) && !isActuallyFinished;
        });
    }, [majorFilteredApplications, isKnownAccount, statusFilter, stepFilter, evaluateStatusFilter]);

    const all_tab = useMemo(() => {
        return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'all_tab', statusFilter) && evaluateStatusFilter(a, 'all_tab', stepFilter)).filter(a => evaluateStatusFilter(a, 'all_tab', statusFilter) && evaluateStatusFilter(a, 'all_tab', stepFilter));
    }, [majorFilteredApplications, statusFilter, stepFilter, evaluateStatusFilter]);

    const ongoing = useMemo(() => {
        const hasFailedAllAccounts = (app: Application) => {
            const depts = (app.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            if (depts.length === 0) return false;
            const failedAccounts = app.metadata?.failed_accounts || [];
            const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
            return depts.every(d => failedSet.has(d));
        };

        if (user?.role === 'recruiter_s') {
            // Ongoing Tab (Work in Progress): Show candidates who have been accepted or moved to client stages
            return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'ongoing', statusFilter) && evaluateStatusFilter(a, 'ongoing', stepFilter)).filter(a => {
                if (hasFailedAllAccounts(a)) return false;

                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (a.department || '').toUpperCase().includes(d));

                const schedulingStatus = a.recruiter_s_scheduling_status || metadata.recruiter_s_scheduling_status;
                const isAccepted = schedulingStatus === 'RECEIVED' || schedulingStatus === 'SCHEDULED';

                // Show in Ongoing if they are in Client stages OR if they are in Account Assignment (Final Interview) but already accepted
                const isOngoingStatus = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(a.current_status) ||
                    (a.current_status === 'FINAL_INTERVIEW' && isAccepted);

                const specStatusStr = String(a.pis?.final_specific_status || a.pis?.specific_status || a.metadata?.final_specific_status || a.metadata?.specific_status || (a as any).final_specific_status || (a as any).specific_status || '').toLowerCase();
                const hasNoShowSpec = specStatusStr.includes('no show') || specStatusStr.includes('noshow') || specStatusStr.includes('no_show');
                const hasMarkedPendingSpec = specStatusStr.includes('marked pending') || specStatusStr.includes('marked as pending');

                const isNotReprofiled = true;
                const isNotFinished = !['RESCHEDULED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'Withdrawn', 'NOT_ELIGIBLE_FOR_REHIRE', 'Not Eligible for Rehire', 'LATERAL_TRANSFER', 'Lateral Transfer', 'CLOSED'].includes(a.current_status) && !String(a.current_status || '').toLowerCase().includes('no show') && !String(a.current_status || '').toLowerCase().includes('noshow') && !String(a.current_status || '').toLowerCase().includes('no_show') && !String(a.current_status || '').toLowerCase().includes('marked pending') && !String(a.current_status || '').toLowerCase().includes('marked as pending') && String(a.current_status || '').toLowerCase() !== 'marked_pending' && !hasNoShowSpec && !hasMarkedPendingSpec && !CONCLUDED_STATUSES.includes(a.current_status);

                const isScheduled = a.current_status === 'FINAL_INTERVIEW_SCHEDULED';

                return ((isExplicitlyEndorsed || isSpecializedAccount) && isOngoingStatus && isNotFinished && isNotReprofiled) || (isScheduled && isNotFinished);
            });
        }
        return majorFilteredApplications.filter(a => evaluateStatusFilter(a, 'ongoing', statusFilter) && evaluateStatusFilter(a, 'ongoing', stepFilter)).filter((a) => {
            if (hasFailedAllAccounts(a)) return false;

            const isNotReprofiled = true;

            const currentStatusLower = String(a.current_status || '').toLowerCase();
            const specStatusStr = String(a.pis?.final_specific_status || a.pis?.specific_status || a.metadata?.final_specific_status || a.metadata?.specific_status || (a as any).final_specific_status || (a as any).specific_status || '').toLowerCase();
            const hasNoShowSpec = specStatusStr.includes('no show') || specStatusStr.includes('noshow') || specStatusStr.includes('no_show');
            const hasMarkedPendingSpec = specStatusStr.includes('marked pending') || specStatusStr.includes('marked as pending');

            const isLateralTransfer = currentStatusLower.includes('lateral') || specStatusStr.includes('lateral');
            if (isLateralTransfer) return false;

            return (a.source === 'WEBAPP' || a.source === 'SHEET' || a.source === 'MANUAL_ENTRY') && isNotReprofiled &&
                !['RESCHEDULED', 'APPLIED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'Withdrawn', 'NOT_ELIGIBLE_FOR_REHIRE', 'Not Eligible for Rehire', 'LATERAL_TRANSFER', 'Lateral Transfer', 'CLOSED'].includes(a.current_status) &&
                !currentStatusLower.includes('no show') && !currentStatusLower.includes('noshow') && !currentStatusLower.includes('no_show') && !currentStatusLower.includes('marked pending') && !currentStatusLower.includes('marked as pending') && currentStatusLower !== 'marked_pending' &&
                !hasNoShowSpec && !hasMarkedPendingSpec &&
                !CONCLUDED_STATUSES.includes(a.current_status);
        });
    }, [majorFilteredApplications, user?.role, reprofile, isKnownAccount, statusFilter, stepFilter, evaluateStatusFilter]);

    const pendingTrackerLists = useMemo(() => {
        const isNotMarkedPending = (a: Application) => {
            const currentStatus = String(a.current_status || '').toLowerCase();
            const specStatus = String(a.pis?.final_specific_status || a.pis?.specific_status || a.metadata?.final_specific_status || a.metadata?.specific_status || (a as any).final_specific_status || (a as any).specific_status || '').toLowerCase();
            const isMarkedPending = currentStatus.includes('marked as pending') || currentStatus.includes('marked pending') || currentStatus === 'marked_pending' || specStatus.includes('marked as pending') || specStatus.includes('marked pending');
            if (isMarkedPending) return false;

            const isNoShow = currentStatus.includes('no show') || currentStatus.includes('noshow') || currentStatus.includes('no_show') || specStatus.includes('no show') || specStatus.includes('noshow') || specStatus.includes('no_show');
            if (isNoShow) return false;

            const currentStatusUpper = String(a.current_status || '').toUpperCase();
            const isConcluded = CONCLUDED_STATUSES.includes(a.current_status || '') || CONCLUDED_STATUSES.includes(currentStatusUpper) || ['REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'LATERAL_TRANSFER', 'CLOSED', 'DECLINED_OFFER', 'DECLINED OFFER', 'PROMOTED', 'INACTIVE', 'OFFBOARDING', 'OFFBOARDED'].includes(currentStatusUpper);
            if (isConcluded) return false;

            if (a.master_column === 'INACTIVE_APPLICATION' || a.master_column === 'OFFBOARDING_TRACKER') return false;

            if (specStatus.includes('declined') || specStatus.includes('failed') || specStatus.includes('rejected') || specStatus.includes('promoted')) return false;

            const depts = (a.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            if (depts.length > 0) {
                const failedAccounts = a.metadata?.failed_accounts || [];
                const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
                if (depts.every(d => failedSet.has(d))) {
                    return false;
                }
            }

            return true;
        };

        const getEffectiveStage = (a: Application): 'initial' | 'typing' | 'proficiency' | 'opsval' | 'client_assess' | 'client_interview' | 'job_offer' | 'for_pan' | 'waitlisted' | 'other' => {
            const statusUpper = String(a.current_status || '').toUpperCase().trim();
            const specLower = String(a.pis?.final_specific_status || a.pis?.specific_status || a.metadata?.final_specific_status || a.metadata?.specific_status || (a as any).final_specific_status || (a as any).specific_status || '').toLowerCase();

            const jobOfferStatuses = [
                'FOR_JOB_OFFER', 'FOR JOB OFFER', 'HIRED',
                'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'PAN_COMPLETED', 'PAN COMPLETED',
                'PAN_ISSUED;_FOR_SIGNATURE', 'PAN_OUT_FOR_APPROVAL', 'SENT JO AND BGC', 'SENT_JO_AND_BGC',
                'CONFIRMED TRAINING', 'CONFIRMED_TRAINING', 'CONTRACT SENT', 'CONTRACT_SENT'
            ];

            if (jobOfferStatuses.includes(statusUpper) || specLower.includes('job offer') || specLower.includes('jo -')) {
                return 'job_offer';
            }
            if (['CLIENT_INTERVIEW', 'CLIENT INTERVIEW', 'CLIENT_INTERVIEW_SCHEDULED'].includes(statusUpper) || specLower.includes('client interview')) {
                return 'client_interview';
            }
            if (['CLIENT_ASSESSMENT'].includes(statusUpper) || specLower.includes('client assessment')) {
                return 'client_assess';
            }
            if (
                ['ACCOUNT_ASSIGNMENT', 'ACCOUNT_ASSIGNMENT_INTERVIEW', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW', 'FINAL INTERVIEW SCHEDULED'].includes(statusUpper) ||
                specLower.includes('final interviewer') || specLower.includes('final interview') || specLower.includes('ov -') || specLower.includes('ops val') || specLower.includes('endorsed to ops') ||
                (!!a.assigned_ops_validator_name && a.assigned_ops_validator_name.trim() !== '') ||
                (!!a.metadata?.assigned_ops_validator_name && String(a.metadata.assigned_ops_validator_name).trim() !== '')
            ) {
                return 'opsval';
            }
            if (['ASSESSMENT', 'ASSESSMENT_II', 'ASSESSMENT II'].includes(statusUpper)) {
                return 'proficiency';
            }
            if (['TYPING_TEST'].includes(statusUpper)) {
                return 'typing';
            }
            if (['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED'].includes(statusUpper)) {
                return 'initial';
            }

            if (['WAITLISTED'].includes(statusUpper) || specLower.includes('waitlist')) {
                return 'waitlisted';
            }
            if (['FOR PAN', 'FOR_PAN'].includes(statusUpper) || specLower.includes('for pan')) {
                return 'for_pan';
            }

            return 'other';
        };

        const pt_initial = majorFilteredApplications.filter(a => isNotMarkedPending(a) && getEffectiveStage(a) === 'initial');
        const pt_typing = majorFilteredApplications.filter(a => isNotMarkedPending(a) && getEffectiveStage(a) === 'typing');
        const pt_proficiency = majorFilteredApplications.filter(a => {
            if (!isNotMarkedPending(a)) return false;
            const statusUpper = String(a.current_status || '').toUpperCase().trim();
            const specLower = String(a.pis?.final_specific_status || a.pis?.specific_status || a.metadata?.final_specific_status || a.metadata?.specific_status || (a as any).final_specific_status || (a as any).specific_status || '').toLowerCase();

            // If explicitly in another downstream stage or marked for final interview / ops val, exclude from proficiency assessment tab
            if (['ACCOUNT_ASSIGNMENT', 'ACCOUNT_ASSIGNMENT_INTERVIEW', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW', 'FINAL INTERVIEW SCHEDULED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER'].includes(statusUpper)) {
                return false;
            }
            if (specLower.includes('final') || specLower.includes('ov -') || specLower.includes('ops val') || specLower.includes('endorsed to ops') || specLower.includes('final interviewer')) {
                return false;
            }

            // If current_status is ASSESSMENT, check if they have completed/passed assessment data (or skipped).
            // In ApplicantRow line 288, if current_status === 'ASSESSMENT' and assessment data is complete, the UI status badge shows "FINAL INTERVIEWER".
            // Those candidates should NOT stay in "Pending Proficiency Assessment" because they have completed assessment!
            if (statusUpper === 'ASSESSMENT' || statusUpper === 'ASSESSMENT_II' || statusUpper === 'ASSESSMENT II') {
                const hasScore = (a.assessment_score !== undefined && a.assessment_score !== null && String(a.assessment_score).trim() !== '') ||
                    (a.pis?.leadership_score !== undefined && a.pis?.leadership_score !== null && String(a.pis?.leadership_score).trim() !== '');
                const isSkipped = (() => {
                    const s = a.metadata?.skipped_stages;
                    if (Array.isArray(s)) return s.includes('assessment');
                    if (typeof s === 'string') {
                        try { const p = JSON.parse(s); return Array.isArray(p) && p.includes('assessment'); } catch { return false; }
                    }
                    return false;
                })();

                // If assessment data is completed or skipped, candidate is DONE with assessment (ready/in Ops Val stage) -> exclude from pending proficiency tab!
                if (hasScore || isSkipped) {
                    return false;
                }

                return true;
            }

            return false;
        });
        const pt_opsval = majorFilteredApplications.filter(a => {
            if (!isNotMarkedPending(a)) return false;
            const statusUpper = String(a.current_status || '').toUpperCase().trim();
            const specLower = String(a.pis?.final_specific_status || a.pis?.specific_status || a.metadata?.final_specific_status || a.metadata?.specific_status || (a as any).final_specific_status || (a as any).specific_status || '').toLowerCase();

            const isExplicitOpsVal = ['ACCOUNT_ASSIGNMENT', 'ACCOUNT_ASSIGNMENT_INTERVIEW', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW', 'FINAL INTERVIEW SCHEDULED'].includes(statusUpper) ||
                specLower.includes('final interviewer') || specLower.includes('final interview') || specLower.includes('ov -') || specLower.includes('ops val') || specLower.includes('endorsed to ops') ||
                (!!a.assigned_ops_validator_name && a.assigned_ops_validator_name.trim() !== '') ||
                (!!a.metadata?.assigned_ops_validator_name && String(a.metadata.assigned_ops_validator_name).trim() !== '');

            const isFailedSpec = specLower.includes('failed') || specLower.includes('rejected') || specLower.includes('disqualified') || String(a.final_verdict || '').toLowerCase().includes('failed');
            if (isFailedSpec) return false;

            const downstream = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING', 'FOR PAN', 'FOR_PAN', 'PAN COMPLETED', 'PAN_COMPLETED', 'CONTRACT SENT', 'CONTRACT_SENT', 'HIRED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'];
            if (downstream.includes(statusUpper)) {
                return false;
            }

            if (isExplicitOpsVal) return true;

            // Include candidates whose current_status is ASSESSMENT but have already completed/passed assessment data (so their badge displays "FINAL INTERVIEWER")
            if (statusUpper === 'ASSESSMENT' || statusUpper === 'ASSESSMENT_II' || statusUpper === 'ASSESSMENT II') {
                const hasScore = (a.assessment_score !== undefined && a.assessment_score !== null && String(a.assessment_score).trim() !== '') ||
                    (a.pis?.leadership_score !== undefined && a.pis?.leadership_score !== null && String(a.pis?.leadership_score).trim() !== '');
                const isSkipped = (() => {
                    const s = a.metadata?.skipped_stages;
                    if (Array.isArray(s)) return s.includes('assessment');
                    if (typeof s === 'string') {
                        try { const p = JSON.parse(s); return Array.isArray(p) && p.includes('assessment'); } catch { return false; }
                    }
                    return false;
                })();
                if (hasScore || isSkipped) return true;
            }

            return false;
        });
        const pt_client_assess = majorFilteredApplications.filter(a => isNotMarkedPending(a) && getEffectiveStage(a) === 'client_assess');
        const pt_client_interview = majorFilteredApplications.filter(a => isNotMarkedPending(a) && getEffectiveStage(a) === 'client_interview');
        const pt_job_offer = majorFilteredApplications.filter(a => isNotMarkedPending(a) && getEffectiveStage(a) === 'job_offer');

        const pt_for_pan = majorFilteredApplications.filter(a => isNotMarkedPending(a) && getEffectiveStage(a) === 'for_pan');
        const pt_waitlisted = majorFilteredApplications.filter(a => isNotMarkedPending(a) && getEffectiveStage(a) === 'waitlisted');

        const pt_all_set = new Set([...pt_initial, ...pt_typing, ...pt_proficiency, ...pt_opsval, ...pt_client_assess, ...pt_client_interview, ...pt_job_offer, ...pt_for_pan, ...pt_waitlisted]);
        const pt_all = Array.from(pt_all_set);
        return { pt_all, pt_initial, pt_typing, pt_proficiency, pt_opsval, pt_client_assess, pt_client_interview, pt_job_offer, pt_for_pan, pt_waitlisted };
    }, [majorFilteredApplications]);

    const baseList = useMemo(() => {
        let list = ongoing;
        if (activeTab === 'all_tab' || (activeTab as any) === 'all') list = all_tab;
        if (activeTab === 'requests') list = requests;
        if (activeTab === 'reschedule') list = reschedule;
        if (activeTab === 'reprofile') list = reprofile;
        if (activeTab === 'rejected') {
            if (statusFilter.includes('TYPING_TEST')) {
                list = majorFilteredApplications;
            } else {
                list = rejected;
            }
        }
        if (activeTab === 'concluded') list = concluded;
        if (activeTab === 'noshow') list = noshow;
        if (activeTab === 'marked_as_pending') list = marked_as_pending;
        if (activeTab === 'withdrawn') list = withdrawn;
        if (activeTab === 'waitlisted') list = waitlisted;
        if (activeTab === 'not_eligible') list = not_eligible;
        if (activeTab === 'promoted') list = promoted;
        if (activeTab === 'lateral') list = lateral;
        if (activeTab === 'blacklisted') list = blacklisted;

        if (activeTab === 'pt_all') list = pendingTrackerLists.pt_all;
        if (activeTab === 'pt_initial') list = pendingTrackerLists.pt_initial;
        if (activeTab === 'pt_typing') list = pendingTrackerLists.pt_typing;
        if (activeTab === 'pt_proficiency') list = pendingTrackerLists.pt_proficiency;
        if (activeTab === 'pt_opsval') list = pendingTrackerLists.pt_opsval;
        if (activeTab === 'pt_client_assess') list = pendingTrackerLists.pt_client_assess;
        if (activeTab === 'pt_client_interview') list = pendingTrackerLists.pt_client_interview;
        if (activeTab === 'pt_job_offer') list = pendingTrackerLists.pt_job_offer;
        if (activeTab === 'pt_for_pan') list = pendingTrackerLists.pt_for_pan;
        if (activeTab === 'pt_waitlisted') list = pendingTrackerLists.pt_waitlisted;

        return list;
    }, [activeTab, ongoing, all_tab, requests, reschedule, reprofile, rejected, concluded, noshow, marked_as_pending, withdrawn, waitlisted, not_eligible, promoted, lateral, blacklisted, pendingTrackerLists, statusFilter, majorFilteredApplications]);

    const filteredList = useMemo(() => {
        let list = baseList;

        list = list.filter(a => {
            const isHiddenRecord = a.is_hidden === true || (a.is_hidden as any) === 1 || 
String(a.is_hidden).toLowerCase() === 'true' || String(a.is_hidden) === '1';
            
            // If user is a recruiter, NEVER show hidden (exclusive) candidates
            if (user?.role === 'recruiter' && isHiddenRecord) {
                return false;
            }

            // For admins/superadmins:
            // If the Exclusive toggle is ON, show ONLY hidden records
            if (isExclusiveMode && !isHiddenRecord) return false;
            
            return true;
        });

        if (taggingFilter.length > 0) {
            // When tagging filter is active, search across ALL candidates (not just the current tab)
            // because tagged candidates (Withdrawn, Waitlisted, etc.) live in their own separate tabs
            const sourceList = majorFilteredApplications;
            list = sourceList.filter((a) => {
                const normTag = taggingFilter.map(t => t.toUpperCase());
                const status = String(a.current_status || '').toUpperCase();
                const specStatus = String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase();

                if (normTag.includes('NO_SHOW') && (status.includes('NO_SHOW') || status.includes('NO SHOW') || specStatus.includes('NO SHOW') || specStatus.includes('NOSHOW'))) return true;
                if (normTag.includes('NO_SHOW_TYPING_TEST') && (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('TYPING') || specStatus.includes('TYPING'))) return true;
                if (normTag.includes('NO_SHOW_INITIAL_INTERVIEW') && (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('INITIAL') || specStatus.includes('INITIAL'))) return true;
                if (normTag.includes('NO_SHOW_ACCOUNT_ASSIGNMENT') && (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('ACCOUNT') || specStatus.includes('ACCOUNT'))) return true;
                if (normTag.includes('NO_SHOW_ASSESSMENT') && (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && ((status.includes('ASSESSMENT') && !status.includes('CLIENT')) || (specStatus.includes('ASSESSMENT') && !specStatus.includes('CLIENT')))) return true;
                if (normTag.includes('NO_SHOW_FINAL_INTERVIEW') && (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('FINAL') || specStatus.includes('FINAL'))) return true;
                if (normTag.includes('NO_SHOW_CLIENT_INTERVIEW') && (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('CLIENT') || specStatus.includes('CLIENT'))) return true;
                
                if (normTag.includes('WITHDRAWN') && (status.includes('WITHDRAWN') || specStatus.includes('WITHDRAWN') || specStatus.includes('WITHDREW'))) return true;
                if (normTag.includes('WAITLISTED') && (status.includes('WAITLISTED') || specStatus.includes('WAITLISTED'))) return true;
                if (normTag.includes('H2R_INACTIVE') && (status.includes('H2R_INACTIVE') || status.includes('H2R INACTIVE') || specStatus.includes('H2R INACTIVE'))) return true;
                if (normTag.includes('INVITED_FOR_REAPPLICATION') && (status.includes('INVITED_FOR_REAPPLICATION') || status.includes('INVITED FOR REAPPLICATION') || specStatus.includes('INVITED FOR REAPPLICATION'))) return true;

                return false;
            });
        }

        if (specialStatusFilter.length > 0) {
            list = list.filter((a) => {
                const isPromoted = String(a.current_status || '').toUpperCase().includes('PROMOTED') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('PROMOTED');
                const isLateral = String(a.current_status || '').toUpperCase().includes('LATERAL') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('LATERAL');

                if (specialStatusFilter.includes('PROMOTED') && isPromoted) return true;
                if (specialStatusFilter.includes('LATERAL_TRANSFER') && isLateral) return true;
                return false;
            });
        }

        if (accountFilter.length > 0) {
            const normAccounts = accountFilter.map(f => f.trim().toLowerCase());
            list = list.filter((a) => {
                const depts = getTrueAccounts(a).map(d => d.trim().toLowerCase());
                return depts.some(d => {
                    return normAccounts.some(targetAcc => d.includes(targetAcc));
                });
            });
        }

        if (lobFilter.length > 0) {
            const normLobs = lobFilter.map(f => f.trim().toLowerCase());
            list = list.filter((a) => {
                const depts = (a.department || '').split(',').map(d => d.trim().toLowerCase());
                return depts.some(d => {
                    const lobPart = d.includes(' - ') ? d.split(' - ').slice(1).join(' - ') : (d.includes('-') ? d.split('-').slice(1).join('-') : '');
                    return normLobs.includes(lobPart.trim());
                });
            });
        }

        if (recruiterFilter.length > 0) {
            const hasUnassigned = recruiterFilter.includes('UNASSIGNED');
            const normRecruiters = recruiterFilter.filter(r => r !== 'UNASSIGNED').map(r => r.trim().toLowerCase());
            list = list.filter(a => {
                const unified = normalizeRecruiterName(a.interviewer_name || a.assigned_recruiter_name).toLowerCase();
                if (hasUnassigned && !unified) return true;
                return normRecruiters.includes(unified);
            });
        }

        if (hireTypeFilter.length > 0) {
            const normHireTypes = hireTypeFilter.map(f => f.trim().toUpperCase());
            list = list.filter((a) => {
                const type = a.metadata?.candidate_type || a.pis?.candidate_type || '';
                return normHireTypes.includes(type.toUpperCase());
            });
        }

        if (appliedDateFilter.type !== 'ALL') {
            list = list.filter((a) => {
                const targetDateStr = a.applied_at;
                if (!targetDateStr) return false;
                const appDate = new Date(targetDateStr);
                if (isNaN(appDate.getTime())) return false;
                const appManila = toManilaDateParts(appDate);
                const appYMD = `${appManila.year}-${String(appManila.month + 1).padStart(2, '0')}-${String(appManila.day).padStart(2, '0')}`;
                if (appliedDateFilter.start && appliedDateFilter.end) {
                    return appYMD >= appliedDateFilter.start && appYMD <= appliedDateFilter.end;
                }
                return true;
            });
        }

        if (interviewDateFilter.type !== 'ALL') {
            list = list.filter((a) => {
                const targetDateStr = (a as any).initial_interview_date || a.metadata?.initial_interview_date;
                if (!targetDateStr) return false;
                const appDate = new Date(targetDateStr);
                if (isNaN(appDate.getTime())) return false;
                const appManila = toManilaDateParts(appDate);
                const appYMD = `${appManila.year}-${String(appManila.month + 1).padStart(2, '0')}-${String(appManila.day).padStart(2, '0')}`;
                if (interviewDateFilter.start && interviewDateFilter.end) {
                    return appYMD >= interviewDateFilter.start && interviewDateFilter.end;
                }
                return true;
            });
        }

        if (trainingDateFilter.type !== 'ALL') {
            list = list.filter((a) => {
                const targetDateStr = a.master_training_start_date || (a as any).pis?.master_training_start_date || (a as any).pis?.training_start_date || a.metadata?.master_training_start_date;
                if (!targetDateStr) return false;
                const appDate = new Date(targetDateStr);
                if (isNaN(appDate.getTime())) return false;
                const appManila = toManilaDateParts(appDate);
                const appYMD = `${appManila.year}-${String(appManila.month + 1).padStart(2, '0')}-${String(appManila.day).padStart(2, '0')}`;
                if (trainingDateFilter.start && trainingDateFilter.end) {
                    return appYMD >= trainingDateFilter.start && appYMD <= trainingDateFilter.end;
                }
                return true;
            });
        }

        if (dateFilter.type !== 'ALL') {
            list = list.filter((a) => {
                const targetDateStr = dateTargetFilter === 'INITIAL_INTERVIEW' ? ((a as any).initial_interview_date || a.metadata?.initial_interview_date) : dateTargetFilter === 'TRAINING_START_DATE' ? (a.master_training_start_date || (a as any).pis?.master_training_start_date || (a as any).pis?.training_start_date || a.metadata?.master_training_start_date) : dateTargetFilter === 'OPS_VAL_INTERVIEW' ? a.endorsement_meeting_date : a.applied_at;
                if (!targetDateStr) return false;
                const appDate = new Date(targetDateStr);
                if (isNaN(appDate.getTime())) return false;
                const appManila = toManilaDateParts(appDate);
                const appYMD = `${appManila.year}-${String(appManila.month + 1).padStart(2, '0')}-${String(appManila.day).padStart(2, '0')}`;
                if (dateFilter.start && dateFilter.end) {
                    return appYMD >= dateFilter.start && appYMD <= dateFilter.end;
                }
                return true;
            });
        }

        const q = searchQuery.toLowerCase().trim();
        const queryWords = q.split(/\s+/).filter(Boolean);
        const filtered = list.filter((a) => {
            if (queryWords.length === 0) return true;
            const nameLower = a.applicant_name.toLowerCase();
            return queryWords.every(word => nameLower.includes(word));
        });

        const finalFiltered = isIdleFilterActive && isPendingTrackerMode ? filtered.filter(a => {
            const timestamp = a.updated_at || a.created_at || a.applied_at;
            if (!timestamp) return false;
            const start = new Date(timestamp).getTime();
            if (isNaN(start)) return false;
            const diffMinutes = Math.floor((Date.now() - start) / 60000);
            return diffMinutes >= (3 * 1440); // 3+ days
        }) : filtered;

        const STATUS_ORDER_RANK: Record<string, number> = {
            'APPLIED': 1,
            'TYPING_TEST': 2,
            'ASSESSMENT': 3,
            'CLIENT_ASSESSMENT': 4,
            'CLIENT_INTERVIEW': 5,
            'FINAL_INTERVIEW': 6,
            'FINAL_INTERVIEW_SCHEDULED': 7,
            'QUEUE_ASSIGNED': 8,
            'INTERVIEW_IN_PROGRESS': 9,
            'ENDORSED': 10,

            'For Job Offer': 20,
            'FOR_JOB_OFFER': 20,
            'PASSED': 21,
            'SENT JO AND BGC': 22,
            'SENT_JO_AND_BGC': 22,
            'ACCEPTED OFFER': 23,
            'ACCEPTED_OFFER': 23,
            'FOR PAN': 24,
            'FOR_PAN': 24,
            'HIRED': 25,
            'HIRED_PROCESSED': 26,

            'WITHDRAWN': 30,
            'FAILED': 31,
            'REJECTED': 32,
            'NOT_ELIGIBLE_FOR_REHIRE': 33,
            'WAITLISTED': 34,
            'Promoted': 35,
            'Lateral Transfer': 36
        };

        return finalFiltered.sort((a, b) => {
            const accA = (a.department || '').toLowerCase();
            const accB = (b.department || '').toLowerCase();
            if (accA < accB) return -1;
            if (accA > accB) return 1;

            const rankA = STATUS_ORDER_RANK[a.current_status] ?? 99;
            const rankB = STATUS_ORDER_RANK[b.current_status] ?? 99;
            if (rankA !== rankB) {
                return rankA - rankB;
            }
            const dateA = String(a.updated_at || a.applied_at || '');
            const dateB = String(b.updated_at || b.applied_at || '');
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            return 0;
        });
    }, [activeTab, ongoing, all_tab, requests, scheduling, reschedule, reprofile, rejected, concluded, noshow, marked_as_pending, withdrawn, waitlisted, not_eligible, promoted, lateral, blacklisted, pendingTrackerLists, baseList, majorFilteredApplications, statusFilter, stepFilter, specialStatusFilter, taggingFilter, accountFilter, lobFilter, recruiterFilter, normalizeRecruiterName, hireTypeFilter, appliedDateFilter, interviewDateFilter, trainingDateFilter, dateFilter, dateTargetFilter, searchQuery, isIdleFilterActive, isPendingTrackerMode, isExclusiveMode]);

    const handleAcceptRequest = async (app: Application, candidateType?: 'INTERNAL' | 'EXTERNAL' | 'NA') => {
        const isRecruiterS = user?.role === 'recruiter_s';
        // For Recruiter S!, accepting means marking as "Received" to move from Inbox to Ongoing 
        // while STAYING in the same status to avoid skipping steps
        const nextStatus = isRecruiterS ? app.current_status : 'INITIAL_INTERVIEW';

        const patchData: any = isRecruiterS ? {
            metadata: {
                ...(app.metadata || {}),
                recruiter_s_scheduling_status: 'RECEIVED'
            }
        } : {};

        if (candidateType) {
            patchData.metadata = {
                ...(app.metadata || {}),
                ...(patchData.metadata || {}),
                candidate_type: candidateType
            };
        }

        try {
            await ApplicationService.updateStatus({
                id: app.id,
                fromStatus: app.current_status,
                toStatus: nextStatus as ApplicationStatus,
                changedByName: user?.full_name || 'System',
                reason: isRecruiterS ? 'Accepted into specialized queue' : 'Accepted for initial interview',
                patch: Object.keys(patchData).length > 0 ? patchData : undefined
            });
            toast.success('Accepted', isRecruiterS ? 'Candidate added to your ongoing list.' : 'Application accepted.');
            setRefreshKey(k => k + 1);
            setSelectedApplicant(null);
        } catch {
            toast.error('Error', 'Failed to accept application.');
        }
    };

    const handleDeclineRequest = async (app: Application, candidateType?: 'INTERNAL' | 'EXTERNAL' | 'NA') => {
        const patchData: any = {};
        if (candidateType) {
            patchData.metadata = {
                ...(app.metadata || {}),
                candidate_type: candidateType
            };
        }

        try {
            await ApplicationService.updateStatus({
                id: app.id,
                fromStatus: app.current_status,
                toStatus: 'FAILED',
                changedByName: user?.full_name || 'System',
                reason: 'Declined during specialized review',
                patch: Object.keys(patchData).length > 0 ? patchData : undefined
            });
            toast.error('Declined', 'Application has been declined.');
            setRefreshKey(k => k + 1);
            setSelectedApplicant(null);
        } catch {
            toast.error('Error', 'Failed to decline application.');
        }
    };

    const handleUpdateApplication = async (id: string, patch: ApplicationUpdatePatch) => {
        let previousSelected: Application | null = null;
        let previousRemote: Application | null = null;
        try {
            const app = remoteApplications.find(a => a.id === id);

            if (patch.current_status === 'CLOSED') {
                if (app) {
                    patch.metadata = {
                        ...(patch.metadata || app.metadata || {}),
                        status_before_close: app.current_status
                    };
                }
            }

            if (patch.final_interview_notes !== undefined) {
                setFinalInterviewNotes(patch.final_interview_notes || '');
            } else if ((patch.pis as any)?.ops_validator_notes !== undefined) {
                patch.final_interview_notes = (patch.pis as any).ops_validator_notes;
                setFinalInterviewNotes((patch.pis as any).ops_validator_notes || '');
            }

            // Automate hire date on hired status or hired specific status

            if (patch.pis && 'final_specific_status' in patch.pis) {
                const specStatus = String((patch.pis as any).final_specific_status || '').toUpperCase();
                const mappedOverall = SPECIFIC_STATUS_TO_OVERALL[(patch.pis as any).final_specific_status];
                if (specStatus.includes('JO - HIRED') || specStatus.includes('JO-HIRED') || specStatus === 'HIRED') {
                    patch.overall_status = 'HIRED';
                    patch.current_status = 'HIRED' as any;
                    patch.master_status = 'HIRED';
                    patch.master_column = 'MASTERLIST';
                } else if (mappedOverall) {
                    let targetOverall = 'OPEN';
                    if (mappedOverall === 'CLOSED' || mappedOverall === 'HIRED' || mappedOverall === 'OPEN') {
                        targetOverall = mappedOverall;
                    } else if (mappedOverall === 'For Job Offer') {
                        targetOverall = 'OPEN';
                    }

                    let nextCurrentStatus = undefined;
                    if (mappedOverall === 'HIRED') {
                        nextCurrentStatus = 'HIRED';
                    } else if (mappedOverall === 'For Job Offer') {
                        nextCurrentStatus = 'For Job Offer';
                    } else if (mappedOverall === 'CLOSED') {
                        if (specStatus.toLowerCase().includes('withdraw') || specStatus.toLowerCase().includes('withdrew') || specStatus.toLowerCase().includes('declined')) {
                            nextCurrentStatus = 'WITHDRAWN';
                        } else if (specStatus.toLowerCase().includes('failed')) {
                            nextCurrentStatus = 'FAILED';
                        } else {
                            nextCurrentStatus = 'FAILED';
                        }
                    }

                    const isAlreadyConcluded = app?.master_column === 'MASTERLIST' ||
                        CONCLUDED_STATUSES.includes(app?.current_status || '');

                    if (nextCurrentStatus) {
                        if (!isAlreadyConcluded || CONCLUDED_STATUSES.includes(nextCurrentStatus)) {
                            patch.current_status = nextCurrentStatus as any;
                            patch.master_status = nextCurrentStatus;
                        }
                    } else if (!isAlreadyConcluded) {
                        patch.master_status = mappedOverall;
                    }

                    patch.overall_status = targetOverall;

                    if (mappedOverall === 'HIRED' || mappedOverall === 'PASSED' || mappedOverall === 'For Job Offer') {
                        patch.master_column = 'MASTERLIST';
                    } else if (isAlreadyConcluded) {
                        patch.master_column = 'MASTERLIST';
                    }
                }

                const specUpper = String(specStatus || '').toUpperCase();
                const isInterviewPassed = (
                    specUpper === 'OV - PASSED' ||
                    specUpper === 'CLIENT INTERVIEW - PASSED' ||
                    specUpper === 'Final Interview INTERVIEW - PASSED'
                );
                if (isInterviewPassed) {
                    patch.master_column = 'MASTERLIST';
                    patch.master_status = 'For Job Offer';
                    patch.master_remarks = specStatus;
                }
            }

            const isHiredStatus = patch.current_status?.toUpperCase() === 'HIRED' ||
                (patch.pis && 'final_specific_status' in patch.pis && String((patch.pis as any).final_specific_status).toLowerCase().includes('hired'));
            if (isHiredStatus && !patch.hired_at && !app?.hired_at) {
                patch.hired_at = new Date().toISOString();
            }

            // Automate interview date on interview activity or status
            const hasInterviewActivity =
                (patch.current_status && [
                    'PASSED', 'FAILED', 'REJECTED', 'HIRED', 'HIRED_PROCESSED',
                    'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER'
                ].includes(patch.current_status.toUpperCase())) ||
                (patch.pis && (
                    'initial_interview_results' in patch.pis ||
                    'final_specific_status' in patch.pis ||
                    'ops_validator_status' in patch.pis ||
                    'client_interview_status' in patch.pis
                ));
            if (hasInterviewActivity && !patch.interview_completed_at && !app?.interview_completed_at) {
                patch.interview_completed_at = new Date().toISOString();
            }

            // Keep names synchronized
            if (patch.pis && ('first_name' in patch.pis || 'last_name' in patch.pis || 'middle_name' in patch.pis)) {
                const pis = patch.pis as any;
                const newFirst = pis.first_name !== undefined ? pis.first_name : app?.pis?.first_name ?? '';
                const newLast = pis.last_name !== undefined ? pis.last_name : app?.pis?.last_name ?? '';
                const newMiddle = pis.middle_name !== undefined ? pis.middle_name : app?.pis?.middle_name ?? '';

                patch.master_first_name = newFirst;
                patch.master_last_name = newLast;
                patch.master_middle_name = newMiddle;

                if (newLast || newFirst) {
                    patch.applicant_name = `${newLast ? newLast + ',' : ''} ${newFirst} ${newMiddle}`.trim();
                }
            }

            // Keep account fields synchronized
            const accountVal = patch.department || patch.endorsement_account || patch.pis?.final_account || patch.pis?.initial_account_assignment;
            if (accountVal && typeof accountVal === 'string') {
                patch.department = accountVal;
                patch.endorsement_account = accountVal;
                patch.pis = {
                    ...(patch.pis || app?.pis || {}),
                    final_account: accountVal,
                    initial_account_assignment: accountVal
                } as any;
            }

            // If department is changing, check if we need to synchronize the reprofile queue
            if (patch.department) {
                const newDept = patch.department;
                const app = remoteApplications.find(a => a.id === id);
                if (app && (app.metadata?.is_reprofiled || (app.metadata?.reprofile_accounts && app.metadata.reprofile_accounts.length > 0))) {
                    let currentQueue = getReprofileQueue(app).map(item => item.account);
                    if (!currentQueue.some(acc => acc.toLowerCase() === newDept.toLowerCase())) {
                        currentQueue = [...currentQueue, newDept];
                    }
                    patch.metadata = {
                        ...(patch.metadata || app.metadata || {}),
                        initial_account_assignment: newDept,
                        reprofile_active_account: newDept,
                        reprofile_accounts: buildReprofileQueue(currentQueue, newDept)
                    };
                    patch.pis = {
                        ...(patch.pis || app.pis || {}),
                        initial_account_assignment: newDept
                    } as any;
                    delete (patch.pis as any).reprofile_accounts;
                    delete (patch.pis as any).reprofile_active_account;
                    delete (patch.pis as any).reprofile_history;
                    delete (patch.pis as any).is_reprofiled;
                }
            }

            // --- OPTIMISTIC UI: Apply locally first ---
            previousSelected = null;
            previousRemote = null;

            if (selectedApplicant && selectedApplicant.id === id) {
                previousSelected = { ...selectedApplicant };
                const updatedPis = patch.pis ? { ...selectedApplicant.pis, ...patch.pis } : selectedApplicant.pis;
                if (updatedPis) {
                    delete (updatedPis as any).reprofile_accounts;
                    delete (updatedPis as any).reprofile_active_account;
                    delete (updatedPis as any).reprofile_history;
                    delete (updatedPis as any).is_reprofiled;
                }
                setSelectedApplicant({
                    ...selectedApplicant,
                    ...patch,
                    pis: updatedPis,
                    metadata: patch.metadata || selectedApplicant.metadata
                } as Application);
            }

            const currentRemote = remoteApplications.find(a => a.id === id);
            if (currentRemote) {
                previousRemote = { ...currentRemote };
                setRemoteApplications(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
            }
            // ------------------------------------------

            await ApplicationService.patch(id, patch);
        } catch (e) {
            console.error('Optimistic UI update failed:', e);
            toast.error('Error', 'Failed to update application data.');
            // Revert changes
            if (previousSelected) setSelectedApplicant(previousSelected);
            if (previousRemote) {
                setRemoteApplications(prev => prev.map(a => a.id === id ? previousRemote as Application : a));
            }
        }
    };

    const confirmDelete = async (applicantId: string, name: string) => {
        setDeletingApplicantId(applicantId);

        // Optimistic UI update for instant feedback
        setRemoteApplications(prev => prev.filter(a => a.id !== applicantId));

        try {
            // Cleanup: release rooms and remove from queue
            await useRoomStore.getState().freeRoomByApplicationId(applicantId);
            const qEntries = await QueueService.getTodaysQueue();
            const entry = qEntries.find((e: any) => e.application_id === applicantId);
            if (entry) await QueueService.delete(entry.id);

            await ApplicationService.delete(applicantId);
            toast.success('Deleted', `Record for ${name} has been removed and resources released.`);
            if (selectedApplicant?.id === applicantId) setSelectedApplicant(null);
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Delete Error', 'Failed to fully remove applicant record.');
        } finally {
            setDeletingApplicantId(null);
            setDeleteConfirmApplicant(null);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsBulkDeleting(true);

        // Optimistic UI update for instant feedback
        setRemoteApplications(prev => prev.filter(a => !selectedIds.has(a.id)));

        try {
            const ids = Array.from(selectedIds);
            const qEntries = await QueueService.getTodaysQueue();

            // Cleanup each one
            for (const id of ids) {
                await useRoomStore.getState().freeRoomByApplicationId(id);
                const entry = qEntries.find((e: any) => e.application_id === id);
                if (entry) await QueueService.delete(entry.id);
            }

            const deletePromises = ids.map(id => ApplicationService.delete(id));
            await Promise.all(deletePromises);
            toast.success('Batch Purge Complete', `${selectedIds.size} records and associated sessions removed.`);
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch {
            toast.error('Error', 'Failed to perform bulk deletion.');
        } finally {
            setIsBulkDeleting(false);
            setDeleteConfirmApplicant(null);
        }
    };

    const handleBulkUpdate = async (patch: ApplicationUpdatePatch) => {
        if (selectedIds.size === 0) return;
        setIsBulkDeleting(true); // Reuse this loading state for simplicity
        try {
            const ids = Array.from(selectedIds);
            const updatePromises = ids.map(id => {
                if (patch.current_status === 'CLOSED') {
                    const app = remoteApplications.find(a => a.id === id);
                    if (app) {
                        return ApplicationService.updateStatus({
                            id,
                            toStatus: 'CLOSED' as ApplicationStatus,
                            changedByName: 'Bulk Update',
                            reason: 'Bulk action (Closed)',
                            patch: {
                                ...patch,
                                current_status: undefined,
                                metadata: {
                                    ...(patch.metadata || {}),
                                    ...(app.metadata || {}),
                                    status_before_close: app.current_status
                                }
                            }
                        });
                    }
                } else if (patch.current_status === 'REOPEN') {
                    const app = remoteApplications.find(a => a.id === id);
                    if (app) {
                        const targetStatus = app.metadata?.status_before_close || 'INITIAL_INTERVIEW';
                        return ApplicationService.updateStatus({
                            id,
                            toStatus: targetStatus as ApplicationStatus,
                            changedByName: 'Bulk Update',
                            reason: 'Bulk action (Reopen)',
                            patch: {
                                ...patch,
                                current_status: undefined,
                                metadata: {
                                    ...(patch.metadata || {}),
                                    ...(app.metadata || {}),
                                    status_before_close: null
                                }
                            }
                        });
                    }
                } else if (patch.current_status === 'NO_SHOW') {
                    const app = remoteApplications.find(a => a.id === id);
                    if (app) {
                        let currentStep = String(app.current_status || '');
                        currentStep = currentStep.replace(/no_show_-_/gi, '').replace(/no show - /gi, '').replace(/no show/gi, '').replace(/no_show/gi, '').replace(/noshow/gi, '');
                        currentStep = currentStep.replace(/^- /, '').trim();
                        if (currentStep.includes('_')) {
                            currentStep = currentStep.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        } else {
                            currentStep = currentStep.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        }
                        const isFailed = patch.metadata?.is_no_show_failed ? ' - failed' : '';
                        const nextStatus = `No show - ${currentStep}${isFailed}`;

                        const metadataCopy = { ...(patch.metadata || {}) };
                        delete metadataCopy.is_no_show_failed;

                        return ApplicationService.updateStatus({
                            id,
                            toStatus: nextStatus as ApplicationStatus,
                            changedByName: 'Bulk Update',
                            reason: 'Bulk action',
                            patch: { ...patch, current_status: undefined, metadata: metadataCopy }
                        });
                    }
                } else if (patch.current_status) {
                    return ApplicationService.updateStatus({
                        id,
                        toStatus: patch.current_status as ApplicationStatus,
                        changedByName: 'Bulk Update',
                        reason: 'Bulk action',
                        patch: { ...patch, current_status: undefined }
                    });
                }
                return ApplicationService.patch(id, patch);
            });
            await Promise.all(updatePromises);
            toast.success('Batch Update Complete', `${selectedIds.size} records updated.`);
            setSelectedIds(new Set());
            setIsSelectMode(false);
            setRefreshKey(k => k + 1);
        } catch {
            toast.error('Error', 'Failed to perform bulk update.');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleAction = async (applicantId: string, name: string, action: ApplicantAction) => {
        if (action === 'delete') {
            setDeleteConfirmApplicant({ id: applicantId, name });
            return;
        }

        if (action === 'view_pis') {
            await withLoading(async () => {
                let applicant: Application | null = null;
                try {
                    applicant = await ApplicationService.getById(applicantId);
                } catch (err) {
                    console.warn('[useApplicantManagement] getById failed, using fallback:', err);
                    applicant = remoteApplications.find(a => a.id === applicantId) || null;
                }
                if (!applicant) {
                    applicant = remoteApplications.find(a => a.id === applicantId) || null;
                }
                if (applicant) {
                    setPisApplicant(applicant);
                } else {
                    toast.error('Error', 'Failed to load PIS profile.');
                }
            }, 'Loading PIS profile...');
            return;
        }

        if (action === 'view') {
            await withLoading(async () => {
                let applicant: Application | null = null;
                try {
                    applicant = await ApplicationService.getById(applicantId);
                } catch (err) {
                    console.warn('[useApplicantManagement] getById failed, using fallback:', err);
                    applicant = remoteApplications.find(a => a.id === applicantId) || null;
                }
                if (!applicant) {
                    applicant = remoteApplications.find(a => a.id === applicantId) || null;
                }
                if (applicant) {
                    setSelectedApplicant(applicant);
                    const defaultTab = getInitialTabForApplicant(applicant);
                    setModalTab(defaultTab);
                    setAssessmentScore(applicant.assessment_score?.toString() || '');
                    setClientAssessmentScore(applicant.client_assessment_score?.toString() || '');
                    setClientInterviewRemarks(applicant.client_interview_remarks || '');
                    setFinalInterviewNotes(applicant.final_interview_notes || '');
                } else {
                    toast.error('Error', 'Failed to load full applicant details.');
                }
            }, 'Loading applicant profile...');
            return;
        }

        if (action === 'hide' || action === 'unhide') {
            setHideConfirmApplicant({ id: applicantId, name, action });
            return;
        }

        const targetApp = remoteApplications.find(a => a.id === applicantId) || selectedApplicant;
        if (!targetApp) {
            toast.error('Error', 'Applicant not found.');
            return;
        }

        const isRecruiterS = user?.role === 'recruiter_s';
        const metadata = targetApp.metadata || {};
        const isEndorsedOrSpecialized = !!targetApp.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true' || ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => (targetApp.department || '').toUpperCase().includes(d));
        const isPendingAccept = !targetApp.recruiter_s_scheduling_status || targetApp.recruiter_s_scheduling_status === 'PENDING' || metadata.recruiter_s_scheduling_status === 'PENDING';

        if (action === 'approve') {
            if (isRecruiterS && isEndorsedOrSpecialized && isPendingAccept) {
                await handleAcceptRequest(targetApp);
            } else {
                await handlePromote(targetApp, 'pass');
            }
            return;
        }

        if (action === 'reject') {
            if (isRecruiterS && isEndorsedOrSpecialized && isPendingAccept) {
                await handleDeclineRequest(targetApp);
            } else {
                await handlePromote(targetApp, 'fail', 'Rejected from table action');
            }
            return;
        }
    };


    const confirmHide = async (applicantId: string, action: 'hide' | 'unhide') => {
        const isHidden = action === 'hide';
        try {
            await ApplicationService.patch(applicantId, { is_hidden: isHidden });
            toast.success('Success', `Candidate has been ${isHidden ? 'hidden' : 'unhidden'}.`);
            setRefreshKey(k => k + 1);
        } catch (error) {
            toast.error('Error', `Failed to ${action} candidate.`);
            console.error(`Failed to ${action} candidate:`, error);
        } finally {
            setHideConfirmApplicant(null);
        }
    };

    const [endorsementQueue, setEndorsementQueue] = useState<Application | null>(null);
    const getSpecificStatusString = (stage: string, isFail: boolean, metadata?: any): string => {
        if (stage === 'TYPING_TEST') return isFail ? 'Typing Test - Failed' : 'Typing Test - Passed';
        if (stage === 'INITIAL_INTERVIEW') return isFail ? 'Initial Interview - Failed' : 'Initial Interview - Passed';
        if (stage === 'ASSESSMENT') {
            const aType = metadata?.last_assessment_type;
            let prefix = 'Personality Test'; // fallback
            if (aType === 'speechx') prefix = 'SpeechX';
            if (aType === 'leadership') prefix = 'Leadership Assessment';
            if (aType === 'critical_thinking') prefix = 'Critical Thinking Assessment';
            if (aType === 'critical_thinking_personality') prefix = 'Critical Thinking and Personality Map';
            return `${prefix} - ${isFail ? 'Failed' : 'Passed'}`;
        }
        if (stage === 'FINAL_INTERVIEW' || stage === 'FINAL_INTERVIEW_SCHEDULED') return isFail ? 'OV - Failed' : 'OV - Passed';
        if (stage === 'CLIENT_ASSESSMENT') return isFail ? 'Client Assessment - Failed' : 'Client Assessment - Passed';
        if (stage === 'CLIENT_INTERVIEW') return isFail ? 'Client Interview - Failed' : 'Client Interview - Passed';
        return isFail ? 'Failed' : 'Passed';
    };

    const handlePromote = async (app: Application, result: 'pass' | 'conditional' | 'fail' = 'pass', reason?: string) => {

        await withLoading(async () => {
            if (result === 'fail') {
                try {
                    const depts = (app.department || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                    const failedAccounts = app.metadata?.failed_accounts || [];
                    const activeAccount = depts.find((d: string) => !failedAccounts.some((f: string) => f.trim().toLowerCase() === d.toLowerCase()));
                    const newFailedAccounts = [...failedAccounts];

                    const isFinalStage = ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(app.current_status || '');

                    if (isFinalStage && activeAccount) {
                        if (!newFailedAccounts.some((f: string) => f.trim().toLowerCase() === activeAccount.toLowerCase())) {
                            newFailedAccounts.push(activeAccount);
                        }
                        const remainingAccounts = depts.filter((d: string) => !newFailedAccounts.some((f: string) => f.trim().toLowerCase() === d.toLowerCase()));

                        const currentValidator = app.assigned_ops_validator_name || app.pis?.ops_validator_email || '';
                        const accountEvaluators = {
                            ...(app.metadata?.account_evaluators || {}),
                        };
                        if (activeAccount && currentValidator) {
                            accountEvaluators[activeAccount.toUpperCase()] = currentValidator;
                        }

                        if (remainingAccounts.length > 0) {
                            // Build reprofile history entry
                            const reprofileHistory = app.metadata?.reprofile_history || [];
                            const newHistoryEntry = {
                                status: 'MOVED_TO_REPROFILE',
                                accounts: depts,
                                changed_at: new Date().toISOString(),
                                changed_by: user?.full_name || 'System',
                                new_account: remainingAccounts[0],
                                active_account: remainingAccounts[0],
                                previous_account: activeAccount,
                                waiting_accounts: remainingAccounts.slice(1),
                                previous_ops_validator_name: app.assigned_ops_validator_name || '',
                                previous_ops_validator_email: app.pis?.ops_validator_email || '',
                                previous_ops_validator_notes: '',
                                previous_ops_validator_status: 'Pending'
                            };

                            // Build reprofile queue
                            const reprofileAccounts = remainingAccounts.map((acc: string, i: number) => ({
                                account: acc,
                                status: i === 0 ? 'ACTIVE' : 'WAITING'
                            }));

                            const patch = {
                                final_verdict: null,
                                endorsement_meeting_date: null,
                                endorsement_meeting_end_date: null,
                                assigned_ops_validator_id: null,
                                assigned_ops_validator_name: "",
                                recruiter_s_scheduling_status: "PENDING",
                                metadata: {
                                    ...(app.metadata || {}),
                                    failed_accounts: newFailedAccounts,
                                    is_reprofiled: true,
                                    reprofile_history: [...reprofileHistory, newHistoryEntry],
                                    reprofile_active_account: remainingAccounts[0],
                                    reprofile_accounts: reprofileAccounts,
                                    recruiter_s_scheduling_status: 'PENDING',
                                    account_evaluators: accountEvaluators,
                                    final_interview_result: null,
                                    final_specific_status: 'OV - Pending',
                                    ops_validator_status: 'Pending',
                                    'Specific Status': 'OV - Pending',
                                    'Final Specific Status': 'OV - Pending'
                                },
                                pis: {
                                    ...(app.pis || {}),
                                    final_interview_result: null,
                                    overall_status: 'FINAL_INTERVIEW',
                                    final_specific_status: 'OV - Pending',
                                    ops_validator_status: 'Pending',
                                    last_updated_by: user?.full_name || 'System (Recruiter)',
                                }
                            };
                            await ApplicationService.updateStatus({
                                id: app.id,
                                fromStatus: app.current_status,
                                toStatus: 'FINAL_INTERVIEW',
                                changedByName: user?.full_name || 'System',
                                reason: reason || `Failed active account: ${activeAccount}`,
                                patch: patch as any
                            });
                            setSelectedApplicant({
                                ...app,
                                ...patch,
                                current_status: 'FINAL_INTERVIEW',
                                recruiter_s_scheduling_status: 'PENDING'
                            } as any);
                            toast.warning('Account Evaluation Failed', `Candidate failed on ${activeAccount}. Rescheduling required for remaining accounts.`);
                            setRefreshKey(k => k + 1);
                            return;
                        }
                    }

                    const patch: any = {
                        metadata: {
                            ...(app.metadata || {}),
                            failed_accounts: newFailedAccounts
                        }
                    };
                    const finalSpecStatus = getSpecificStatusString(app.current_status, true, app.metadata);
                    patch.pis = {
                        ...(app.pis || {}),
                        final_specific_status: finalSpecStatus
                    };
                    await ApplicationService.updateStatus({
                        id: app.id,
                        fromStatus: app.current_status,
                        toStatus: 'FAILED',
                        changedByName: user?.full_name || 'System',
                        reason: reason,
                        patch
                    });
                    setSelectedApplicant({ ...app, current_status: 'FAILED', rejection_reason: reason, metadata: { ...(app.metadata || {}), failed_accounts: newFailedAccounts }, pis: { ...(app.pis || {}), final_specific_status: finalSpecStatus } as any });
                    toast.error('Failed', 'Candidate has been marked as FAILED.');
                    setRefreshKey(k => k + 1);
                } catch { /* error handled by interceptor */ }
                return;
            }

            const dept = (app.department || '').toUpperCase();
            const metadata = app.metadata || {};
            const isExplicitlyEndorsed = !!app.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';

            const getNextStatus = (): string | undefined => {
                const activeTabs = getApplicantTabs(app);
                let currentTab = getInitialTabForApplicant(app);

                if (currentTab === 'assessment') {
                    if (activeTabs.includes('assessment_ii')) {
                        if (app.metadata?.assessment_ii_score !== undefined && app.metadata?.assessment_ii_score !== null) {
                            currentTab = 'assessment_ii';
                        }
                    }
                }

                const currentIdx = activeTabs.indexOf(currentTab);

                const tabToStatusMap: Record<ModalTab, string> = {
                    'application': 'APPLIED',
                    'typing': 'TYPING_TEST',
                    'initial': 'INITIAL_INTERVIEW',
                    'endorsement': 'ACCOUNT_ASSIGNMENT',
                    'assessment': 'ASSESSMENT',
                    'assessment_ii': 'ASSESSMENT',
                    'scheduling': 'FINAL_INTERVIEW',
                    'client_assessment': 'CLIENT_ASSESSMENT',
                    'client_interview': 'CLIENT_INTERVIEW',
                    'verdict': 'FOR_JOB_OFFER'
                };

                if (currentIdx !== -1 && currentIdx < activeTabs.length - 1) {
                    const nextTab = activeTabs[currentIdx + 1];
                    // If they just passed Proficiency Assessment, move to scheduling (final interviewer)
                    if (currentTab === 'assessment' && nextTab === 'assessment_ii') {
                        // If they have ASSESSMENT_II but just passed first assessment, move to assessment_ii tab. 
                        // But wait! If we are calling handlePromote, we MUST check if assessment_ii is ALREADY completed!
                        // Actually, if currentTab was evaluated as 'assessment' above, it means assessment_ii_score IS NULL.
                        // So they haven't finished assessment_ii yet. Thus, status remains ASSESSMENT.
                        return 'ASSESSMENT';
                    }
                    return tabToStatusMap[nextTab];
                }
                return 'For Job Offer';
            };

            const nextStatus = getNextStatus();
            if (!nextStatus) return;

            const nextTabMap: Record<string, ModalTab> = {
                'TYPING_TEST': 'typing',
                'INITIAL_INTERVIEW': 'initial',
                'ACCOUNT_ASSIGNMENT': 'endorsement',
                'ASSESSMENT': 'assessment',
                'FINAL_INTERVIEW': 'endorsement',
                'FINAL_INTERVIEW_SCHEDULED': 'scheduling',
                'FOR_SCHEDULING': 'scheduling',
                'CLIENT_ASSESSMENT': 'client_assessment',
                'CLIENT_INTERVIEW': 'client_interview',
                'FINAL_VERDICT': 'verdict',
                'PASSED': 'verdict',
                'HIRED': 'verdict'
            };

            let previousSelected: Application | null = null;
            let previousRemote: Application | null = null;
            try {
                const patch: ApplicationUpdatePatch = {};
                if (app.current_status === 'FINAL_INTERVIEW' && patch.final_interview_notes === undefined) {
                    patch.final_interview_notes = finalInterviewNotes;
                }

                // Dynamic Specific Status Mapping
                let newSpecificStatus = getSpecificStatusString(app.current_status, false, app.metadata);

                // Override: Only mark 'JO - Hired' when actually transitioning to HIRED
                if (nextStatus === 'HIRED') {
                    newSpecificStatus = 'JO - Hired';
                } else if (app.current_status === 'PASSED') {
                    newSpecificStatus = 'JO - Pending';
                }

                if (newSpecificStatus) {
                    patch.pis = {
                        ...(app.pis || {}),
                        final_specific_status: newSpecificStatus
                    } as any;
                }

                // Trigger Masterlist routing and reprofile queue completion only at hiring milestones:
                //   Standard account: OV pass â†’ PASSED â†’ Masterlist
                //   Special account (KP etc.): Client Interview pass â†’ PASSED â†’ Masterlist
                const isHiringTransition = nextStatus === 'PASSED' || nextStatus === 'HIRED' || nextStatus === 'HIRED_PROCESSED' || nextStatus === 'For Job Offer' || nextStatus === 'FOR_JOB_OFFER';

                if (isHiringTransition) {
                    // Process reprofile queue if applicable
                    const currentQueue = getReprofileQueue(app);
                    if (currentQueue.length > 0) {
                        const revertedStages = app.metadata?.reverted_stages || [];
                        const nextQueue = completeActiveReprofileAccount(currentQueue);
                        patch.metadata = {
                            ...(app.metadata || {}),
                            reverted_stages: revertedStages,
                            reprofile_accounts: nextQueue
                        };
                    }

                    // AUTO-MOVE TO MASTERLIST
                    // Only 'PASSED' is the correct trigger:
                    //   - Standard: FINAL_INTERVIEW pass â†’ PASSED â†’ Masterlist
                    //   - Special (KP): CLIENT_INTERVIEW pass â†’ PASSED â†’ Masterlist
                    const isQualified = nextStatus === 'PASSED' || nextStatus === 'HIRED' || nextStatus === 'For Job Offer' || nextStatus === 'FOR_JOB_OFFER';

                    if (isQualified) {
                        patch.master_column = 'MASTERLIST';
                        patch.master_remarks = newSpecificStatus || nextStatus;

                        // Sync master names if not already set
                        if (!app.master_first_name) {
                            const pis = app.pis;
                            patch.master_first_name = pis?.first_name || app.applicant_name.split(',')[1]?.trim() || app.applicant_name.split(' ')[0];
                            patch.master_last_name = pis?.last_name || app.applicant_name.split(',')[0]?.trim() || app.applicant_name.split(' ').pop();
                            patch.master_middle_name = pis?.middle_name || '';
                        }
                    }
                }

                const isHired = nextStatus === 'HIRED' || (newSpecificStatus && newSpecificStatus.toLowerCase().includes('hired'));
                if (isHired && !patch.hired_at && !app.hired_at) {
                    patch.hired_at = new Date().toISOString();
                }

                const isInterviewCompleted = [
                    'INITIAL_INTERVIEW', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_INTERVIEW'
                ].includes(app.current_status) || [
                    'PASSED', 'HIRED', 'HIRED_PROCESSED', 'For Job Offer'
                ].includes(nextStatus);

                if (isInterviewCompleted && !patch.interview_completed_at && !app.interview_completed_at) {
                    patch.interview_completed_at = new Date().toISOString();
                }

                // --- OPTIMISTIC UI: Apply locally first ---
                previousSelected = null;
                previousRemote = null;

                if (selectedApplicant && selectedApplicant.id === app.id) {
                    previousSelected = { ...selectedApplicant };
                }
                const currentRemote = remoteApplications.find(a => a.id === app.id);
                if (currentRemote) {
                    previousRemote = { ...currentRemote };
                    setRemoteApplications(prev => prev.map(a => a.id === app.id ? { ...a, ...patch, current_status: nextStatus as ApplicationStatus } : a));
                }
                setSelectedApplicant({ ...app, ...patch, current_status: nextStatus as ApplicationStatus });
                // ------------------------------------------

                await ApplicationService.updateStatus({
                    id: app.id,
                    fromStatus: app.current_status,
                    toStatus: nextStatus as ApplicationStatus,
                    changedByName: user?.full_name || 'System',
                    patch
                });

                setModalTab(nextTabMap[nextStatus as string] || nextTabMap[app.current_status] || 'application');
                toast.success('Promoted', `Applicant moved to ${nextStatus}`);
                setRefreshKey(k => k + 1);
                setFinalInterviewNotes('');
            } catch {
                console.error('Optimistic UI update failed for promote');
                toast.error('Error', 'Failed to update status.');
                // Revert
                if (previousSelected) setSelectedApplicant(previousSelected);
                if (previousRemote) {
                    setRemoteApplications(prev => prev.map(a => a.id === app.id ? previousRemote as Application : a));
                }
            }
        }, result === 'pass' ? 'Promoting Candidate...' : 'Updating Status...');
    };

    const handleSendToEndorsed = async (app: Application, recruiterSName: string) => {
        return await withLoading(async () => {
            try {
                // 1. Explicitly patch the metadata flags first
                // Move flags inside the supported metadata object to avoid 400 errors
                await ApplicationService.patch(app.id, {
                    recruiter_s_scheduling_status: undefined,
                    metadata: {
                        ...(app.metadata || {}),
                        endorsed_to_recruiter_s: true,
                        recruiter_s_scheduling_status: null
                    }
                });

                // 2. Then update the status to trigger the workflow move
                await ApplicationService.updateStatus({
                    id: app.id,
                    toStatus: 'FINAL_INTERVIEW' as ApplicationStatus,
                    changedByName: user?.full_name || 'System',
                    reason: `Routed to Recruiter S! (${recruiterSName}) for specialized Account Assignment`
                });

                toast.success('Sent to Recruiter S!', `Candidate ${app.applicant_name} has been successfully routed.`);

                // 3. Force a clean refresh to update the dashboard background
                setEndorsementQueue(null);
                setRefreshKey(k => k + 1);
                return true; // Indicate success to the caller
            } catch (err) {
                console.error('Handover sequence failed:', err);
                toast.error('Routing Error', 'Failed to complete the specialized handover.');
            }
        }, 'Executing Specialized Handover...');
    };

    const handleRegress = async (app: Application, targetModalTab?: ModalTab) => {
        await withLoading(async () => {
            const dept = (app.department || '').toUpperCase();
            const metadata = app.metadata || {};
            const isExplicitlyEndorsed = !!app.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
            const isSpecialized = isExplicitlyEndorsed || ['KELLER POSTMAN', 'AUTO APPROVE', 'PAESLER'].some(d => dept.includes(d));

            // Determine previous status dynamically based on visual stepper active tabs sequence
            const activeTabs = getApplicantTabs(app);
            const currentTab = targetModalTab || getInitialTabForApplicant(app);
            const currentIdx = activeTabs.indexOf(currentTab);

            const tabToStatusMap: Record<ModalTab, string> = {
                'application': 'APPLIED',
                'typing': 'TYPING_TEST',
                'initial': 'INITIAL_INTERVIEW',
                'endorsement': 'ACCOUNT_ASSIGNMENT',
                'assessment': 'ASSESSMENT',
                'assessment_ii': 'ASSESSMENT',
                'scheduling': 'FINAL_INTERVIEW',
                'client_assessment': 'CLIENT_ASSESSMENT',
                'client_interview': 'CLIENT_INTERVIEW',
                'verdict': 'FOR_JOB_OFFER'
            };

            let prevStatus: string | null = null;
            if (currentIdx > 0) {
                const prevTab = activeTabs[currentIdx - 1];
                prevStatus = tabToStatusMap[prevTab];
            }

            if (!prevStatus) {
                toast.error('Cannot Regress', 'No previous stage found for this status.');
                return;
            }

            const backTabMap: Record<string, ModalTab> = {
                'APPLIED': 'application',
                'TYPING_TEST': 'typing',
                'INITIAL_INTERVIEW': 'initial',
                'ACCOUNT_ASSIGNMENT': 'endorsement',
                'ASSESSMENT': 'assessment',
                'FINAL_INTERVIEW_SCHEDULED': 'scheduling',
                'FINAL_INTERVIEW': 'endorsement',
                'CLIENT_ASSESSMENT': 'client_assessment',
                'CLIENT_INTERVIEW': 'client_interview',
                'FINAL_VERDICT': 'verdict',
                'HIRED': 'verdict',
                'PASSED': 'verdict'
            };
            try {
                const patch: any = {};

                // Common cleanup for all regressions:
                patch.master_column = null;
                patch.master_status = null;
                patch.hired_at = null;
                patch.final_verdict = null;

                // Free room and remove from queue if regressing to a stage before initial interview
                if (prevStatus === 'APPLIED' || prevStatus === 'TYPING_TEST') {
                    try {
                        await useRoomStore.getState().freeRoomByApplicationId(app.id);
                        const qEntries = await QueueService.getTodaysQueue();
                        const entry = qEntries.find((e: any) => e.application_id === app.id);
                        if (entry) await QueueService.delete(entry.id);
                    } catch (err) {
                        console.error('Failed to cleanup queue/room during regression:', err);
                    }
                }

                const revertedStages = { ...(app.metadata?.reverted_stages || {}) };

                const snapTypingTest = () => {
                    if (app.typing_test_wpm !== null && app.typing_test_wpm !== undefined) {
                        revertedStages['TYPING_TEST'] = {
                            typing_test_wpm: app.typing_test_wpm,
                            typing_test_accuracy: app.typing_test_accuracy,
                            typing_test_duration_seconds: app.typing_test_duration_seconds,
                            typing_test_completed_at: app.typing_test_completed_at,
                            typing_speed_num: app.pis?.typing_speed_num,
                            typing_accuracy_pct: app.pis?.typing_accuracy_pct
                        };
                    }
                };

                const snapInitialInterview = () => {
                    revertedStages['INITIAL_INTERVIEW'] = {
                        initial_interview_results: app.pis?.initial_interview_results,
                        final_interview_notes: app.final_interview_notes,
                        was_reverted: true
                    };
                };

                const snapAccountAssignment = () => {
                    revertedStages['ACCOUNT_ASSIGNMENT'] = {
                        department: app.department,
                        final_account: app.pis?.final_account,
                        was_reverted: true
                    };
                };

                const snapAssessment = () => {
                    if (app.assessment_score !== null && app.assessment_score !== undefined) {
                        revertedStages['ASSESSMENT'] = {
                            assessment_score: app.assessment_score
                        };
                    }
                };

                const snapFinalInterview = () => {
                    if (app.assigned_ops_validator_id || app.pis?.final_interview_result) {
                        revertedStages['FINAL_INTERVIEW'] = {
                            assigned_ops_validator_id: app.assigned_ops_validator_id,
                            assigned_ops_validator_name: app.assigned_ops_validator_name,
                            ops_validator_notes: app.pis?.ops_validator_notes,
                            ops_validator_status: app.pis?.ops_validator_status,
                            final_interview_result: app.pis?.final_interview_result,
                            endorsement_meeting_date: app.endorsement_meeting_date,
                            endorsement_meeting_end_date: app.endorsement_meeting_end_date
                        };
                    }
                };

                if (prevStatus === 'APPLIED') {
                    snapTypingTest();
                    snapInitialInterview();
                    snapAccountAssignment();
                    snapAssessment();
                    snapFinalInterview();
                } else if (prevStatus === 'TYPING_TEST') {
                    snapInitialInterview();
                    snapAccountAssignment();
                    snapAssessment();
                    snapFinalInterview();
                } else if (prevStatus === 'INITIAL_INTERVIEW') {
                    snapAccountAssignment();
                    snapAssessment();
                    snapFinalInterview();
                } else if (prevStatus === 'ACCOUNT_ASSIGNMENT') {
                    snapAccountAssignment();
                    snapAssessment();
                    snapFinalInterview();
                } else if (prevStatus === 'ASSESSMENT') {
                    snapAssessment();
                    snapFinalInterview();
                } else if (prevStatus === 'FINAL_INTERVIEW') {
                    snapFinalInterview();
                }


                if (prevStatus === 'APPLIED') {
                    // Reverted back to initial application stage
                    patch.typing_test_wpm = null;
                    patch.typing_test_accuracy = null;
                    patch.typing_test_duration_seconds = null;
                    patch.typing_test_completed_at = null;
                    patch.assessment_score = null;
                    patch.final_interview_notes = null;
                    patch.assigned_ops_validator_id = null;
                    patch.assigned_ops_validator_name = null;
                    patch.endorsement_meeting_date = null;
                    patch.endorsement_meeting_end_date = null;
                    patch.endorsement_meeting_body = null;
                    patch.client_assessment_score = null;
                    patch.client_interview_remarks = null;
                    patch.endorsed_to_recruiter_s = false;
                    patch.recruiter_s_scheduling_status = null;

                    patch.pis = {
                        ...(app.pis || {}),
                        final_interview_result: null,
                        overall_status: 'OPEN',
                        final_specific_status: 'Typing Test - Pending',
                        typing_speed_num: null,
                        typing_accuracy_pct: null,
                        initial_interview_results: null,
                        ops_validator_status: null,
                        ops_validator_notes: null,
                        ops_validator_email: null,
                        client_interview_status: null,
                        client_interview_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                    patch.metadata = {
                        ...(app.metadata || {}),
                        reverted_stages: revertedStages,
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'TYPING_TEST') {
                    // Reverted back to typing test (before initial interview form is answered)
                    patch.assessment_score = null;
                    patch.final_interview_notes = null;
                    patch.assigned_ops_validator_id = null;
                    patch.assigned_ops_validator_name = null;
                    patch.endorsement_meeting_date = null;
                    patch.endorsement_meeting_end_date = null;
                    patch.endorsement_meeting_body = null;
                    patch.client_assessment_score = null;
                    patch.client_interview_remarks = null;
                    patch.endorsed_to_recruiter_s = false;
                    patch.recruiter_s_scheduling_status = null;

                    patch.pis = {
                        ...(app.pis || {}),
                        final_interview_result: null,
                        overall_status: 'OPEN',
                        final_specific_status: 'Typing Test - Passed',
                        initial_interview_results: null,
                        ops_validator_status: null,
                        ops_validator_notes: null,
                        ops_validator_email: null,
                        client_interview_status: null,
                        client_interview_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                    patch.metadata = {
                        ...(app.metadata || {}),
                        reverted_stages: revertedStages,
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'INITIAL_INTERVIEW') {
                    // Reverted back to initial screening interview (before assessment score is recorded)
                    patch.assessment_score = null;
                    patch.final_interview_notes = null;
                    patch.assigned_ops_validator_id = null;
                    patch.assigned_ops_validator_name = null;
                    patch.endorsement_meeting_date = null;
                    patch.endorsement_meeting_end_date = null;
                    patch.endorsement_meeting_body = null;
                    patch.client_assessment_score = null;
                    patch.client_interview_remarks = null;
                    patch.endorsed_to_recruiter_s = false;
                    patch.recruiter_s_scheduling_status = null;

                    patch.pis = {
                        ...(app.pis || {}),
                        final_interview_result: null,
                        overall_status: 'OPEN',
                        final_specific_status: 'Initial Interview - Pending',
                        ops_validator_status: null,
                        ops_validator_notes: null,
                        ops_validator_email: null,
                        client_interview_status: null,
                        client_interview_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                    patch.metadata = {
                        ...(app.metadata || {}),
                        reverted_stages: revertedStages,
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'ACCOUNT_ASSIGNMENT') {
                    // Reverted back to account assignment
                    patch.department = null;
                    patch.assessment_score = null;
                    patch.final_interview_notes = null;
                    patch.assigned_ops_validator_id = null;
                    patch.assigned_ops_validator_name = null;
                    patch.endorsement_meeting_date = null;
                    patch.endorsement_meeting_end_date = null;
                    patch.endorsement_meeting_body = null;
                    patch.client_assessment_score = null;
                    patch.client_interview_remarks = null;
                    patch.endorsed_to_recruiter_s = false;
                    patch.recruiter_s_scheduling_status = null;

                    patch.pis = {
                        ...(app.pis || {}),
                        final_interview_result: null,
                        overall_status: 'OPEN',
                        final_specific_status: 'Account Assignment - Pending',
                        ops_validator_status: null,
                        ops_validator_notes: null,
                        ops_validator_email: null,
                        client_interview_status: null,
                        client_interview_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                    patch.metadata = {
                        ...(app.metadata || {}),
                        reverted_stages: revertedStages,
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'ASSESSMENT') {
                    // Reverted to technical assessment (before final interview/Account Assignment scheduling)
                    patch.assessment_score = null;
                    patch.final_interview_notes = null;
                    patch.assigned_ops_validator_id = null;
                    patch.assigned_ops_validator_name = null;
                    patch.endorsement_meeting_date = null;
                    patch.endorsement_meeting_end_date = null;
                    patch.endorsement_meeting_body = null;
                    patch.client_assessment_score = null;
                    patch.client_interview_remarks = null;
                    patch.endorsed_to_recruiter_s = false;
                    patch.recruiter_s_scheduling_status = null;

                    patch.pis = {
                        ...(app.pis || {}),
                        final_interview_result: null,
                        overall_status: 'OPEN',
                        final_specific_status: 'Personality Test - Pending',
                        ops_validator_status: null,
                        ops_validator_notes: null,
                        ops_validator_email: null,
                        client_interview_status: null,
                        client_interview_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                    patch.metadata = {
                        ...(app.metadata || {}),
                        reverted_stages: revertedStages,
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'FINAL_INTERVIEW') {
                    // Reverted to final interview / Account Assignment
                    patch.final_interview_notes = null;
                    patch.assigned_ops_validator_id = null;
                    patch.assigned_ops_validator_name = null;
                    patch.client_assessment_score = null;
                    patch.client_interview_remarks = null;
                    patch.endorsement_meeting_date = null;
                    patch.endorsement_meeting_end_date = null;
                    patch.endorsement_meeting_body = null;
                    patch.recruiter_s_scheduling_status = 'PENDING';

                    patch.pis = {
                        ...(app.pis || {}),
                        final_interview_result: null,
                        overall_status: 'OPEN',
                        final_specific_status: 'OV - Scheduled',
                        client_interview_status: null,
                        client_interview_notes: null,
                        ops_validator_status: null,
                        ops_validator_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                    patch.metadata = {
                        ...(app.metadata || {}),
                        reverted_stages: revertedStages,
                        recruiter_s_scheduling_status: 'PENDING',
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'CLIENT_ASSESSMENT') {
                    patch.client_assessment_score = null;
                    patch.client_interview_remarks = null;

                    patch.pis = {
                        ...(app.pis || {}),
                        final_interview_result: null,
                        overall_status: 'OPEN',
                        final_specific_status: 'Client Assessment - Pending',
                        client_interview_status: null,
                        client_interview_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                } else if (prevStatus === 'CLIENT_INTERVIEW') {
                    patch.client_interview_remarks = null;

                    patch.pis = {
                        ...(app.pis || {}),
                        final_interview_result: null,
                        overall_status: 'OPEN',
                        final_specific_status: 'Client Interview - Pending',
                        client_interview_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                }

                // Sync explicit nulls from patch.pis to patch.metadata
                // This prevents the backend from preserving old data due to the object merge order
                if (patch.pis) {
                    if (!patch.metadata) {
                        patch.metadata = { ...(app.metadata || {}) };
                    }
                    Object.keys(patch.pis).forEach(key => {
                        if (patch.pis[key] === null) {
                            patch.metadata[key] = null;
                        }
                    });
                }

                await ApplicationService.updateStatus({
                    id: app.id,
                    fromStatus: app.current_status,
                    toStatus: (prevStatus === 'FOR_SCHEDULING' ? 'FINAL_INTERVIEW_SCHEDULED' : prevStatus) as ApplicationStatus,
                    changedByName: user?.full_name || 'System',
                    reason: 'Status regressed by recruiter',
                    patch
                });

                // Fetch the canonical updated row from the server so the modal
                // and the masterlist both reflect the freshly persisted state.
                const fresh = await ApplicationService.getById(app.id);
                setSelectedApplicant(fresh);
                setRemoteApplications(prev => prev.map(a => a.id === app.id ? (fresh || a) : a));

                toast.warning('Regressed', `Applicant moved back to ${prevStatus}`);
                setModalTab(backTabMap[prevStatus] || 'application');
            } catch { /* error handled by interceptor */ }
        }, 'Regressing Stage...');
    };

    const handleGiveClientAssessmentGrade = async (app: Application) => {
        if (!clientAssessmentScore) return;
        await withLoading(async () => {
            try {
                await ApplicationService.patch(app.id, {
                    client_assessment_score: parseFloat(clientAssessmentScore)
                });
                toast.success('Score Recorded', 'Client assessment score has been logged.');
                handlePromote({ ...app, client_assessment_score: parseFloat(clientAssessmentScore) }, 'pass');
            } catch {
                toast.error('Error', 'Failed to record client assessment score.');
            }
        }, 'Recording Score...');
    };

    const handleGiveClientInterviewVerdict = async (app: Application, result: 'pass' | 'fail', reason?: string) => {
        await withLoading(async () => {
            try {
                const patch: ApplicationUpdatePatch = {
                    client_interview_remarks: clientInterviewRemarks
                };
                await ApplicationService.patch(app.id, patch);

                // Promoting will handle the status update
                handlePromote({ ...app, ...patch }, result, reason);
            } catch {
                toast.error('Error', 'Failed to record interview results.');
            }
        }, result === 'pass' ? 'Promoting Candidate...' : 'Recording Rejection...');
    };

    const handleWithdraw = async (app: Application) => {
        await withLoading(async () => {
            try {
                await ApplicationService.updateStatus({
                    id: app.id,
                    fromStatus: app.current_status,
                    toStatus: 'WITHDRAWN',
                    changedByName: user?.full_name || 'System',
                    reason: 'Applicant manually withdrew from the process',
                    patch: {
                        pis: {
                            ...(app.pis || {}),
                            final_specific_status: 'Application Withdraw'
                        }
                    }
                });

                setSelectedApplicant({ ...app, current_status: 'WITHDRAWN' });
                toast.success('Withdrawn', `${app.applicant_name} marked as WITHDRAWED.`);
                setRefreshKey(k => k + 1);
                setModalTab('verdict');
            } catch { /* error handled by interceptor */ }
        }, 'Marking as Withdrawn...');
    };

    const handleGiveGrade = async (app: Application, assessmentType?: any, isFail?: boolean, isTestII?: boolean, forceSecondTest?: boolean) => {
        if (!assessmentScore) {
            toast.error('Validation Error', 'Please input a score before posting the decision.');
            return;
        }

        await withLoading(async () => {
            const parsedScore = isNaN(Number(assessmentScore)) ? assessmentScore : Number(assessmentScore);
            try {
                const patchData: any = {};
                if (isTestII) {
                    patchData.metadata = {
                        ...(app.metadata || {}),
                        assessment_ii_score: parsedScore,
                        assessment_ii_scored_at: new Date().toISOString()
                    };
                } else {
                    if (assessmentType === 'leadership') {
                        patchData.pis = { ...(app.pis || {}), leadership_score: String(parsedScore) };
                        // Ensure we don't save a non-numeric string to assessment_score
                        patchData.assessment_score = null;
                    } else if (assessmentType === 'personality') {
                        patchData.personality_test = String(parsedScore);
                        patchData.assessment_score = null;
                    } else if (assessmentType === 'critical_thinking') {
                        patchData.critical_thinking_score = String(parsedScore);
                        patchData.assessment_score = null;
                    } else if (assessmentType === 'not_applicable') {
                        patchData.assessment_score = null;
                    } else {
                        patchData.assessment_score = parsedScore;
                    }

                    patchData.metadata = {
                        ...(app.metadata || {}),
                        last_assessment_type: assessmentType,
                        assessment_scored_at: new Date().toISOString()
                    };
                }

                if (forceSecondTest && !isTestII) {
                    const defaultOrder = [
                        'TYPING_TEST',
                        'INITIAL_INTERVIEW',
                        'ACCOUNT_ASSIGNMENT',
                        'ASSESSMENT',
                        'CLIENT_ASSESSMENT',
                        'CLIENT_INTERVIEW'
                    ];
                    const currentOrder = [...(app.pis?.process_order || app.metadata?.process_order || defaultOrder)];

                    if (!currentOrder.includes('ASSESSMENT_II')) {
                        const insertIdx = currentOrder.indexOf('ASSESSMENT');
                        if (insertIdx !== -1) {
                            currentOrder.splice(insertIdx + 1, 0, 'ASSESSMENT_II');
                        } else {
                            currentOrder.push('ASSESSMENT_II');
                        }
                        patchData.metadata.process_order = currentOrder;
                        patchData.pis = { ...(app.pis || {}), process_order: currentOrder };
                    }
                    patchData.metadata.force_second_test = true;
                }

                if (isFail) {
                    const failStatusStr = `${assessmentType === 'not_applicable' ? 'Not Applicable' : assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} - Failed`;
                    patchData.pis = {
                        ...(app.pis || {}),
                        ...(patchData.pis || {}),
                        final_specific_status: failStatusStr
                    };
                    patchData.failure_details = {
                        from_status: isTestII ? 'ASSESSMENT_II' : 'ASSESSMENT',
                        reason: `Failed assessment ${isTestII ? 'II' : 'I'}`,
                        failed_at: new Date().toISOString()
                    };
                    patchData.metadata = {
                        ...(app.metadata || {}),
                        ...(patchData.metadata || {}),
                        final_specific_status: failStatusStr
                    };

                    await ApplicationService.updateStatus({
                        id: app.id,
                        fromStatus: app.current_status,
                        toStatus: 'FAILED',
                        changedByName: user?.full_name || 'System',
                        reason: `Failed assessment ${isTestII ? 'II' : 'I'}`,
                        patch: patchData
                    });
                    setSelectedApplicant({
                        ...app,
                        ...patchData,
                        metadata: {
                            ...(app.metadata || {}),
                            ...(patchData.metadata || {})
                        },
                        current_status: 'FAILED'
                    });
                    toast.success('Results Posted', `Candidate failed assessment.`);
                    setRefreshKey(k => k + 1);
                } else {
                    const otherScore = isTestII
                        ? (app.assessment_score != null && String(app.assessment_score).trim() !== '' ? app.assessment_score : app.pis?.leadership_score)
                        : app.metadata?.assessment_ii_score;

                    const effectiveProcessOrder = patchData.pis?.process_order || app.pis?.process_order || app.metadata?.process_order || [];
                    const requiresTestII = effectiveProcessOrder.includes('ASSESSMENT_II');
                    const skippedStages = app.metadata?.skipped_stages || [];
                    const otherSkipped = skippedStages.includes(isTestII ? 'assessment' : 'assessment_ii');

                    const isOnCall = isCandidateOnCall(app);

                    // If they are on-call and this is test II, they don't need test I, so both are complete
                    const bothComplete = (!requiresTestII && !isTestII) || otherSkipped || otherScore != null || (isOnCall && isTestII);

                    const finalSpecificStatus = bothComplete
                        ? `${assessmentType === 'not_applicable' ? 'Not Applicable' : assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} - Passed`
                        : undefined;

                    if (finalSpecificStatus) {
                        patchData.pis = {
                            ...(app.pis || {}),
                            ...(patchData.pis || {}),
                            final_specific_status: finalSpecificStatus
                        };
                    }

                    if (bothComplete) {
                        await ApplicationService.patch(app.id, patchData);
                        const updatedApp = {
                            ...app,
                            ...patchData,
                            metadata: {
                                ...(app.metadata || {}),
                                ...(patchData.metadata || {})
                            }
                        };

                        // Only promote if the applicant is actually at the ASSESSMENT stage in their pipeline
                        if (app.current_status === 'ASSESSMENT') {
                            await handlePromote(updatedApp as Application, 'pass', 'Completed both proficiency assessments');
                        } else {
                            setSelectedApplicant(updatedApp as Application);
                            toast.success('Assessment Completed', `Score saved and status updated to ${finalSpecificStatus}.`);
                        }
                    } else {
                        await ApplicationService.patch(app.id, patchData);
                        setSelectedApplicant({
                            ...app,
                            ...patchData,
                            metadata: {
                                ...(app.metadata || {}),
                                ...(patchData.metadata || {})
                            }
                        });
                        toast.success('Score Saved', `Score of ${assessmentScore} saved for Proficiency Assessment ${isTestII ? 'II' : 'I'}.`);
                    }
                    setRefreshKey(k => k + 1);
                }
            } catch { /* error handled by interceptor */ }
        }, 'Posting Assessment Results...');
    };

    const handleQueue = (app: Application, queueType: 'INITIAL' | 'FINAL' = 'INITIAL') => {
        setShowQueuePrompt({
            id: app.id,
            name: app.applicant_name,
            applicantUserId: app.applicant_id,
            queueType,
            department: app.department,
            opsValidatorId: app.assigned_ops_validator_id
        });
    };

    const confirmQueue = async (assignedInterviewer?: { id: string; name: string }) => {
        if (!showQueuePrompt) return;
        await withLoading(async () => {
            try {
                const { queueNumber } = await ApplicationService.assignQueueNumber(
                    showQueuePrompt.id,
                    showQueuePrompt.name,
                    showQueuePrompt.applicantUserId,
                    showQueuePrompt.queueType,
                    assignedInterviewer?.id,
                    assignedInterviewer?.name
                );
                await ApplicationService.patch(showQueuePrompt.id, {
                    metadata: {
                        ...(selectedApplicant?.metadata || {}),
                        interview_mode: 'ON-SITE'
                    }
                });
                toast.success('Queued', `${showQueuePrompt.name} assigned ${formatQueueNumber(queueNumber || 0)}.`);
                const queuedName = showQueuePrompt.name;
                const queuedType = showQueuePrompt.queueType;
                setShowQueuePrompt(null);
                setShowQueueSuccess({ name: queuedName, queueType: queuedType });
                setRefreshKey(k => k + 1);
                if (selectedApplicant && selectedApplicant.id === showQueuePrompt.id) {
                    setSelectedApplicant({
                        ...selectedApplicant,
                        current_status: 'QUEUE_ASSIGNED',
                        queue_number: queueNumber,
                        queue_type: showQueuePrompt.queueType,
                        assigned_interview_room_name: 'Waiting List',
                        updated_at: new Date().toISOString(),
                        metadata: {
                            ...(selectedApplicant.metadata || {}),
                            interview_mode: 'ON-SITE'
                        }
                    });
                }
            } catch { /* error handled by interceptor */ }
        }, 'Queueing candidate...');
    };

    const handleSetActiveReprofileAccount = async (app: Application, account: string) => {
        const queueAccounts = getReprofileQueue(app).map(item => item.account);
        const nextQueue = buildReprofileQueue(queueAccounts, account);

        const patch: ApplicationUpdatePatch = {
            department: account,
            current_status: 'FINAL_INTERVIEW',
            final_verdict: null as any,
            rejection_reason: null as any,
            endorsement_meeting_date: null as any,
            endorsement_meeting_end_date: null as any,
            endorsement_meeting_body: '',
            assigned_ops_validator_id: null as any,
            assigned_ops_validator_name: '',
            recruiter_s_scheduling_status: 'PENDING',
            metadata: {
                ...(app.metadata || {}),
                is_reprofiled: true,
                reprofile_active_account: account,
                reprofile_accounts: nextQueue,
                reprofile_ops_endorsed_at: null as any,
                reprofile_stage: null as any,
                endorsement_confirmed: false
            }
        };

        await withLoading(async () => {
            try {
                await ApplicationService.patch(app.id, patch);
                toast.success('Active Reprofile Set', `${app.applicant_name} is now active for ${account}.`);
                setRefreshKey(k => k + 1);
                if (selectedApplicant?.id === app.id) {
                    setSelectedApplicant({ ...selectedApplicant, ...patch });
                }
            } catch {
                toast.error('Error', 'Failed to update active reprofile account.');
            }
        }, 'Updating reprofile account...');
    };

    const handleFailActiveReprofileAccount = async (app: Application) => {
        const currentQueue = getReprofileQueue(app);
        const nextQueue = failActiveReprofileAccount(currentQueue);
        const activeAccount = getActiveReprofileAccount(app);

        const hasActiveOrWaiting = nextQueue.some(item => item.status === 'ACTIVE' || item.status === 'WAITING');
        const isRejectedAll = !hasActiveOrWaiting;

        const nextActiveAccount = isRejectedAll ? null : (nextQueue.find(item => item.status === 'ACTIVE')?.account || activeAccount);

        const failedAccounts = [...(app.metadata?.failed_accounts || [])];
        if (activeAccount && !failedAccounts.some(f => String(f).trim().toLowerCase() === activeAccount.toLowerCase())) {
            failedAccounts.push(activeAccount);
        }

        const currentValidator = app.assigned_ops_validator_name || app.pis?.ops_validator_email || '';
        const accountEvaluators = {
            ...(app.metadata?.account_evaluators || {}),
        };
        if (activeAccount && currentValidator) {
            accountEvaluators[activeAccount.toUpperCase()] = currentValidator;
        }

        const patch: ApplicationUpdatePatch = {
            department: nextActiveAccount || activeAccount || '',
            current_status: isRejectedAll ? 'FAILED' : 'FINAL_INTERVIEW',
            final_verdict: isRejectedAll ? 'FAILED' : (null as any),
            rejection_reason: isRejectedAll ? 'Failed all reprofile options' : (null as any),
            endorsement_meeting_date: null as any,
            endorsement_meeting_end_date: null as any,
            endorsement_meeting_body: '',
            assigned_ops_validator_id: null as any,
            assigned_ops_validator_name: '',
            recruiter_s_scheduling_status: 'PENDING',
            metadata: {
                ...(app.metadata || {}),
                is_reprofiled: true,
                reprofile_active_account: nextActiveAccount as any,
                reprofile_accounts: nextQueue,
                reprofile_last_failed_account: activeAccount,
                reprofile_ops_endorsed_at: null as any,
                reprofile_stage: null as any,
                endorsement_confirmed: false,
                account_evaluators: accountEvaluators,
                failed_accounts: failedAccounts
            },
            pis: {
                ...(app.pis || {}),
                final_specific_status: isRejectedAll ? 'OV - Failed' : 'OV - Failed; for reprofiling'
            }
        };

        await withLoading(async () => {
            try {
                await ApplicationService.patch(app.id, patch);
                if (isRejectedAll) {
                    toast.error('Rejected', `${app.applicant_name} has failed all reprofile options.`);
                } else {
                    toast.warning('Reprofile Updated', `${app.applicant_name} moved to ${nextActiveAccount}.`);
                }
                setRefreshKey(k => k + 1);
                if (selectedApplicant?.id === app.id) {
                    setSelectedApplicant({ ...selectedApplicant, ...patch });
                }
            } catch {
                toast.error('Error', 'Failed to advance the reprofile queue.');
            }
        }, 'Advancing reprofile queue...');
    };

    const confirmPromotion = async (app: Application) => {
        const patch: ApplicationUpdatePatch = {
            current_status: 'TYPING_TEST',
            final_verdict: null as any,
            rejection_reason: null as any,
            endorsement_meeting_date: null as any,
            endorsement_meeting_end_date: null as any,
            endorsement_meeting_body: '',
            assigned_ops_validator_id: null as any,
            assigned_ops_validator_name: '',
            recruiter_s_scheduling_status: 'PENDING',
            metadata: {
                ...(app.metadata || {}),
                is_promotion: true,
                promotion_started_at: new Date().toISOString()
            },
            pis: {
                ...(app.pis || {}),
                typing_test_result: null as any,
                typing_test_attempts: 0,
                final_specific_status: 'For Promotion - Typing Test'
            } as any
        };

        await withLoading(async () => {
            try {
                await ApplicationService.patch(app.id, patch);
                toast.success('Promotion Started', `${app.applicant_name} is now in the promotion process.`);
                setRefreshKey(k => k + 1);
                setPromotionPromptApp(null);
                if (selectedApplicant?.id === app.id) {
                    setSelectedApplicant({ ...selectedApplicant, ...patch });
                }
            } catch {
                toast.error('Error', 'Failed to start promotion process.');
            }
        }, 'Starting promotion process...');
    };


    const handleMergeRequest = async (sourceApp: Application, targetId: string) => {
        await withLoading(async () => {
            try {
                const targetApp = remoteApplications.find((a: Application) => a.id === targetId);
                if (!targetApp) throw new Error("Target application not found");

                const patch: any = { metadata: { ...(targetApp.metadata || {}) }, pis: { ...(targetApp.pis || {}) } };
                let modified = false;

                // Merge Typing Test
                if (sourceApp.typing_test_wpm !== undefined && sourceApp.typing_test_wpm !== null) {
                    patch.typing_test_wpm = sourceApp.typing_test_wpm;
                    patch.typing_test_accuracy = sourceApp.typing_test_accuracy;
                    patch.typing_test_completed_at = sourceApp.typing_test_completed_at;
                    if ((sourceApp.pis as any)?.typing_test_result) patch.pis.typing_test_result = (sourceApp.pis as any).typing_test_result;
                    modified = true;
                }

                // Merge Assessment
                if (sourceApp.assessment_score !== undefined && sourceApp.assessment_score !== null) {
                    patch.assessment_score = sourceApp.assessment_score;
                    patch.assessment_completed_at = (sourceApp as any).assessment_completed_at;
                    patch.wonderlic_score = (sourceApp as any).wonderlic_score;
                    modified = true;
                }

                // Merge Interview Notes
                if (sourceApp.interview_notes) {
                    patch.interview_notes = (targetApp.interview_notes ? targetApp.interview_notes + '\n\n' : '') + `[Merged from Duplicate]: ${sourceApp.interview_notes}`;
                    modified = true;
                }
                if (sourceApp.final_interview_notes) {
                    patch.final_interview_notes = (targetApp.final_interview_notes ? targetApp.final_interview_notes + '\n\n' : '') + `[Merged from Duplicate]: ${sourceApp.final_interview_notes}`;
                    modified = true;
                }

                // Merge general remarks
                if (sourceApp.metadata?.remarks) {
                    patch.metadata.remarks = (targetApp.metadata?.remarks ? targetApp.metadata.remarks + '\n\n' : '') + `[Merged Duplicate]: ${sourceApp.metadata.remarks}`;
                    modified = true;
                }

                if (modified) {
                    await ApplicationService.patch(targetId, patch);
                }

                // Delete the duplicate request
                await ApplicationService.delete(sourceApp.id);

                toast.success('Merge Successful', 'Duplicate data has been merged and the request has been deleted.');

                // Update local state
                setRemoteApplications((prev: Application[]) => prev.filter(a => a.id !== sourceApp.id).map(a => a.id === targetId ? { ...a, ...patch, metadata: { ...a.metadata, ...patch.metadata }, pis: { ...a.pis, ...patch.pis } } : a));
                setSelectedApplicant(null);
                setRefreshKey(k => k + 1);

            } catch (err: any) {
                toast.error('Merge Failed', err.message || 'Failed to merge duplicate request.');
            }
        }, 'Merging Duplicate Data...');
    };

    const toggleSelectAll = useCallback(() => {
        setSelectedIds(prev => {
            if (prev.size === filteredList.length) {
                return new Set();
            } else {
                return new Set(filteredList.map(a => a.id));
            }
        });
    }, [filteredList]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    return {
        isInitialLoading,
        activeTab, setActiveTab,
        activeMajorTab, setActiveMajorTab,
        isPendingTrackerMode, setIsPendingTrackerMode,
        isIdleFilterActive, setIsIdleFilterActive,
        pendingTrackerCounts: {
            pt_all: pendingTrackerLists.pt_all.length,
            pt_initial: pendingTrackerLists.pt_initial.length,
            pt_typing: pendingTrackerLists.pt_typing.length,
            pt_proficiency: pendingTrackerLists.pt_proficiency.length,
            pt_opsval: pendingTrackerLists.pt_opsval.length,
            pt_client_assess: pendingTrackerLists.pt_client_assess.length,
            pt_client_interview: pendingTrackerLists.pt_client_interview.length,
            pt_job_offer: pendingTrackerLists.pt_job_offer.length,
        },
        viewMode, setViewMode,
        searchQuery, setSearchQuery,
        selectedApplicant, setSelectedApplicant,
        statusFilter, setStatusFilter,
        stepFilter, setStepFilter,
        specialStatusFilter, setSpecialStatusFilter,
        taggingFilter, setTaggingFilter,
        appliedDateFilter, setAppliedDateFilter,
        interviewDateFilter, setInterviewDateFilter,
        trainingDateFilter, setTrainingDateFilter,
        dateFilter, setDateFilter, dateTargetFilter, setDateTargetFilter,
        recruiterFilter, setRecruiterFilter,
        accountFilter, setAccountFilter,
        lobFilter, setLobFilter,
        hireTypeFilter, setHireTypeFilter,
        assessmentScore, setAssessmentScore,
        clientAssessmentScore, setClientAssessmentScore,
        clientInterviewRemarks, setClientInterviewRemarks,
        modalTab, setModalTab,
        requestModalTab, setRequestModalTab,
        finalInterviewNotes, setFinalInterviewNotes,
        validators,
        ongoing, all_tab, scheduling, requests, duplicateRequestsMap, reschedule, reprofile, rejected, concluded, noshow, marked_as_pending, withdrawn, waitlisted, not_eligible, promoted, lateral, blacklisted, filteredList, baseList, departments, recruiters, accountToLobsMap,
        allTabCount: all_tab.length,
        ongoingCount: ongoing.length,
        requestsCount: requests.length,
        concludedCount: concluded.length,
        schedulingCount: scheduling.length,
        reprofileCount: reprofile.length,
        noshowCount: noshow.length,
        rejectedCount: rejected.length,
        markedAsPendingCount: marked_as_pending.length,
        withdrawnCount: withdrawn.length,
        waitlistedCount: waitlisted.length,
        notEligibleCount: not_eligible.length,
        promotedCount: promoted.length,
        lateralCount: lateral.length,
        blacklistedCount: blacklisted.length,
        promotionPromptApp, setPromotionPromptApp, confirmPromotion,
        pisApplicant, setPisApplicant,
        totalCount: remoteApplications.length,
        majorFilteredCount: majorFilteredApplications.length,
        isSelectMode, setIsSelectMode,
        selectedIds, setSelectedIds,
        isBulkDeleting,
        showQueuePrompt, setShowQueuePrompt,
        showQueueSuccess, setShowQueueSuccess,
        endorsementQueue, setEndorsementQueue,
        isExclusiveMode, setIsExclusiveMode,

        deleteConfirmApplicant, setDeleteConfirmApplicant,
        hideConfirmApplicant, setHideConfirmApplicant,
        deletingApplicantId,
        deptRecords, allStaff,
        stageRanks, getApplicantStatusRank,
        handleAcceptRequest, handleDeclineRequest,
        handleUpdateApplication, confirmDelete, confirmHide, handleBulkDelete, handleBulkUpdate,
        handleMergeRequest,
        handleAction, handlePromote, handleRegress, handleWithdraw,
        handleGiveGrade,
        handleGiveClientAssessmentGrade,
        handleGiveClientInterviewVerdict,
        handleQueue, confirmQueue, handleSendToEndorsed,
        handleSetActiveReprofileAccount,
        handleFailActiveReprofileAccount,
        toggleSelectAll, toggleSelect, navigate, urlApplicantId,
        evaluateStatusFilter,
        refresh: () => setRefreshKey(k => k + 1),
        getInitialTabForApplicant
    };
}
