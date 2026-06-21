import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApplicationService } from '@/services/ApplicationService';
import { UserService } from '@/services/UserService';
import { useToast } from '@/components/common/useToast';
import { useNotificationStore } from '@/store/notificationStore';
import { useQueueStore } from '@/store/queueStore';
import { useAuthStore } from '@/store/authStore';
import { useLoading } from '@/components/common/useLoading';
import { formatQueueNumber } from '@/utils/formatters';
import { QueueService } from '@/services/QueueService';
import { useRoomStore } from '@/store/roomStore';
import type { Application, ApplicationStatus, ApplicationUpdatePatch } from '@/types/application';
import type { User as UserType } from '@/types/user';
import { buildReprofileQueue, completeActiveReprofileAccount, failActiveReprofileAccount, getActiveReprofileAccount, getReprofileQueue } from '@/utils/reprofileQueue';
import { KNOWN_ACCOUNTS } from '@/services/DepartmentService';
import { SPECIFIC_STATUS_TO_OVERALL } from '@/pages/recruiter/tracker/utils/statusMappings';
import { socketService } from '@/services/socketService';

export type Tab = 'ongoing' | 'scheduling' | 'requests' | 'reprofile' | 'rejected' | 'concluded';
export type ModalTab = 'application' | 'typing' | 'initial' | 'assessment' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';
export type RequestModalTab = 'application' | 'typing';
export type ApplicantAction = 'approve' | 'reject' | 'view' | 'delete';

export function useApplicantManagement({
    initialTab = 'ongoing',
    initialStatusFilter = 'ALL'
}: {
    initialTab?: Tab;
    initialStatusFilter?: string;
}) {
    const { '*': splat } = useParams();
    const navigate = useNavigate();
    const urlApplicantId = splat?.replace(/^\//, '');
    const toast = useToast();
    const { withLoading } = useLoading();
    const { user } = useAuthStore();
    const { addNotification } = useNotificationStore();
    const { assignQueueNumber } = useQueueStore();

    const [activeTab, setActiveTab] = useState<Tab>(initialTab === 'requests' ? 'requests' : (initialTab as Tab) || 'ongoing');

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
    const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
    const [accountFilter, setAccountFilter] = useState('ALL');
    const [assessmentScore, setAssessmentScore] = useState<string>('');
    const [modalTab, setModalTab] = useState<ModalTab>('application');
    const [requestModalTab, setRequestModalTab] = useState<RequestModalTab>('application');
    const [finalInterviewNotes, setFinalInterviewNotes] = useState('');
    const [clientAssessmentScore, setClientAssessmentScore] = useState<string>('');
    const [clientInterviewRemarks, setClientInterviewRemarks] = useState<string>('');

    const isKnownAccount = (val: string) =>
        KNOWN_ACCOUNTS.some(acc => acc.toLowerCase() === val.toLowerCase());
    const [validators, setValidators] = useState<UserType[]>([]);
    const [remoteApplications, setRemoteApplications] = useState<Application[]>([]);

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
            if (spec.includes('ov - passed') || spec.includes('ops val') || spec.includes('final') || spec.includes('ov -')) return 3;
            if (spec.includes('wonderlic') || spec.includes('speechx') || spec.includes('personality') || spec.includes('assessment')) return 2;
            if (spec.includes('recruitment interview') || spec.includes('initial')) return 1;
            if (spec.includes('typing')) return 0;
        }

        let processOrder: string[] = applicant?.pis?.process_order || applicant?.metadata?.process_order || [
            'TYPING_TEST',
            'INITIAL_INTERVIEW',
            'OPS_VALIDATION',
            'ASSESSMENT',
            'CLIENT_ASSESSMENT',
            'CLIENT_INTERVIEW'
        ];

        if (processOrder.indexOf('ASSESSMENT') !== -1 && processOrder.indexOf('OPS_VALIDATION') !== -1) {
            const idxAssess = processOrder.indexOf('ASSESSMENT');
            const idxOps = processOrder.indexOf('OPS_VALIDATION');
            if (idxAssess < idxOps) {
                const newOrder = [...processOrder];
                newOrder[idxAssess] = 'OPS_VALIDATION';
                newOrder[idxOps] = 'ASSESSMENT';
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
            'FINAL_INTERVIEW': 'OPS_VALIDATION',
            'FINAL_INTERVIEW_SCHEDULED': 'OPS_VALIDATION',
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
        try {
            const [apps, allUsers] = await Promise.all([
                ApplicationService.getAll(),
                UserService.getAll()
            ]);
            setRemoteApplications(apps as Application[]);
            setValidators(allUsers.filter(u => u.role === 'ops_validator'));
        } catch (err) {
            console.error('Failed to load applicant management data:', err);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData, refreshKey]);

    useEffect(() => {
        const socket = socketService.getSocket();
        const handleUpdate = () => {
            console.log('[Socket] Applications updated, refreshing applicant management...');
            loadData();
        };
        socket.on('applications:updated', handleUpdate);
        return () => {
            socket.off('applications:updated', handleUpdate);
        };
    }, [loadData]);

    useEffect(() => {
        if (urlApplicantId && remoteApplications.length > 0) {
            const applicant = remoteApplications.find((a) => a.id === urlApplicantId);
            if (applicant) {
                setSelectedApplicant(applicant);
            }
        }
    }, [urlApplicantId, remoteApplications]);

    const applications = useMemo(() => {
        let apps = [...remoteApplications];
        if (user?.role === 'recruiter_s') {
            apps = apps.filter(app => {
                const metadata = app.metadata || {};
                const isExplicitlyEndorsed = !!app.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE'].includes((app.department || '').toUpperCase());
                const hasSpecializedStatus = [
                    'FINAL_INTERVIEW',
                    'FINAL_INTERVIEW_SCHEDULED',
                    'CLIENT_ASSESSMENT',
                    'CLIENT_INTERVIEW',
                    'FINAL_VERDICT',
                    'PASSED',
                    'For Job Offer',
                    'FOR_JOB_OFFER',
                    'HIRED',
                    'HIRED_PROCESSED',
                    'REJECTED',
                    'FAILED',
                    'WITHDRAWN',
                    'NOT_ELIGIBLE_FOR_REHIRE',
                    'CONDITIONAL',
                    'WAITLISTED'
                ].includes(app.current_status);
                return isExplicitlyEndorsed || (isSpecializedAccount && hasSpecializedStatus);
            });
        }
        return apps;
    }, [remoteApplications, user?.role]);

    const departments = useMemo(() => {
        const set = new Set(applications.map(a => a.department).filter(Boolean));
        return Array.from(set).sort() as string[];
    }, [applications]);

    const requests = useMemo(() => {
        if (user?.role === 'recruiter_s') {
            // Endorsed Tab (Inbox): Show NEWLY routed candidates OR specialized accounts at final stage
            return applications.filter(a => {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE'].includes((a.department || '').toUpperCase());

                const schedulingStatus = a.recruiter_s_scheduling_status || metadata.recruiter_s_scheduling_status;
                const isPending = !schedulingStatus || schedulingStatus === 'PENDING';

                // Appear in inbox if explicitly endorsed OR if they just reached the final stage for a specialized account
                const isAtInboxStage = a.current_status === 'FINAL_INTERVIEW' || a.current_status === 'APPLIED';

                return (isExplicitlyEndorsed || (isSpecializedAccount && a.current_status === 'FINAL_INTERVIEW')) && isPending && isAtInboxStage;
            });
        }
        return applications.filter((a) => a.source === 'WEBAPP' && a.current_status === 'APPLIED');
    }, [applications, user?.role]);

    const rejected = useMemo(() => {
        const hasFailedAllAccounts = (app: Application) => {
            const depts = (app.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            if (depts.length === 0) return false;
            const failedAccounts = app.metadata?.failed_accounts || [];
            const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
            return depts.every(d => failedSet.has(d));
        };

        if (user?.role === 'recruiter_s') {
            return applications.filter(a => {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE'].includes((a.department || '').toUpperCase());
                const isRejectedStatus = ['REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status);
                return (isExplicitlyEndorsed || isSpecializedAccount) && (isRejectedStatus || hasFailedAllAccounts(a));
            });
        }
        return applications.filter((a) => a.source === 'WEBAPP' && (['REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status) || hasFailedAllAccounts(a)));
    }, [applications, user?.role]);

const CONCLUDED_STATUSES = [
    'For Job Offer', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 
    'HIRED', 'HIRED_PROCESSED', 'PASSED', 'FINAL_VERDICT', 
    'FOR PAN', 'For PAN', 'FOR_PAN', 
    'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'Accepted Offer', 
    'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'Sent JO and BGC'
];

    const concluded = useMemo(() => {
        return applications.filter(a => {
            const isConcludedStatus = CONCLUDED_STATUSES.includes(a.current_status);
            if (user?.role === 'recruiter_s') {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE'].includes((a.department || '').toUpperCase());
                return (isExplicitlyEndorsed || isSpecializedAccount) && isConcludedStatus;
            }
            return a.source === 'WEBAPP' && isConcludedStatus;
        });
    }, [applications, user?.role]);

    const scheduling = useMemo(() => {
        if (user?.role === 'recruiter_s') {
            // Scheduling Tab: Show candidates who have been accepted but are not yet fully ongoing
            return applications.filter(a => {
                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE'].includes((a.department || '').toUpperCase());

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
    }, [applications, user?.role]);

    const reprofile = useMemo(() => {
        return applications.filter((a) => {
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
    }, [applications]);

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
            return applications.filter(a => {
                if (hasFailedAllAccounts(a)) return false;

                const metadata = a.metadata || {};
                const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                const isSpecializedAccount = ['KELLER POSTMAN', 'AUTO APPROVE'].includes((a.department || '').toUpperCase());

                const schedulingStatus = a.recruiter_s_scheduling_status || metadata.recruiter_s_scheduling_status;
                const isAccepted = schedulingStatus === 'RECEIVED' || schedulingStatus === 'SCHEDULED';

                // Show in Ongoing if they are in Client stages OR if they are in Ops Validation (Final Interview) but already accepted
                const isOngoingStatus = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(a.current_status) ||
                    (a.current_status === 'FINAL_INTERVIEW' && isAccepted);

                const history = a.pis?.reprofile_history || a.metadata?.reprofile_history || [];
                const hasHistory = Array.isArray(history) && history.length > 0;
                const hasReprofileFlag = a.metadata?.is_reprofiled === true || a.metadata?.is_reprofiled === 'true';
                const initialAccount = String(a.pis?.initial_account_assignment || a.metadata?.initial_account_assignment || (a.pis as any)?.['INITITAL ACCOUNT ASSIGNMENT'] || a.metadata?.['INITITAL ACCOUNT ASSIGNMENT'] || '').trim();
                const currentAccount = String(a.department || '').trim();
                // Guard: only treat as reprofile if initialAccount is a known account name (not a job title)
                const currentAccountList = currentAccount.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                const movedFromInitial = !!initialAccount && !!currentAccount && isKnownAccount(initialAccount) && initialAccount !== 'PENDING' && initialAccount !== 'N/A' && !currentAccountList.includes(initialAccount.toLowerCase());

                const isNotReprofiled = !hasReprofileFlag && !movedFromInitial && !hasHistory;
                const isNotFinished = !['REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status) && !CONCLUDED_STATUSES.includes(a.current_status);

                return (isExplicitlyEndorsed || isSpecializedAccount) && isOngoingStatus && isNotFinished && isNotReprofiled;
            });
        }
        return applications.filter((a) => {
            if (hasFailedAllAccounts(a)) return false;

            const history = a.pis?.reprofile_history || a.metadata?.reprofile_history || [];
            const hasHistory = Array.isArray(history) && history.length > 0;
            const hasReprofileFlag = a.metadata?.is_reprofiled === true || a.metadata?.is_reprofiled === 'true';
            const initialAccount = String(a.pis?.initial_account_assignment || a.metadata?.initial_account_assignment || (a.pis as any)?.['INITITAL ACCOUNT ASSIGNMENT'] || a.metadata?.['INITITAL ACCOUNT ASSIGNMENT'] || '').trim();
            const currentAccount = String(a.department || '').trim();
            // Guard: only treat as reprofile if initialAccount is a known account name (not a job title)
            const currentAccountList = currentAccount.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const movedFromInitial = !!initialAccount && !!currentAccount && isKnownAccount(initialAccount) && initialAccount !== 'PENDING' && initialAccount !== 'N/A' && !currentAccountList.includes(initialAccount.toLowerCase());

            const isNotReprofiled = !hasReprofileFlag && !movedFromInitial && !hasHistory;

            return a.source === 'WEBAPP' && isNotReprofiled &&
                !['APPLIED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status) &&
                !CONCLUDED_STATUSES.includes(a.current_status);
        });
    }, [applications, user?.role, reprofile]);

    const filteredList = useMemo(() => {
        let list = ongoing;
        if (activeTab === 'requests') list = requests;
        if (activeTab === 'reprofile') list = reprofile;
        if (activeTab === 'rejected') list = rejected;
        if (activeTab === 'concluded') list = concluded;

        if (statusFilter !== 'ALL') {
            list = list.filter((a) => {
                if (statusFilter === 'INITIAL_INTERVIEW') return ['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED'].includes(a.current_status);
                if (statusFilter === 'INACTIVE') return ['FAILED', 'REJECTED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status);
                return a.current_status === statusFilter;
            });
        }

        if (accountFilter !== 'ALL') {
            list = list.filter((a) => a.department === accountFilter);
        }

        const q = searchQuery.toLowerCase();
        return list.filter((a) =>
            a.applicant_name.toLowerCase().includes(q) ||
            a.applicant_email.toLowerCase().includes(q) ||
            (a.position_title || '').toLowerCase().includes(q) ||
            (a.department || '').toLowerCase().includes(q)
        );
    }, [activeTab, ongoing, requests, reprofile, rejected, concluded, searchQuery, statusFilter, accountFilter]);

    const handleAcceptRequest = async (app: Application) => {
        const isRecruiterS = user?.role === 'recruiter_s';
        // For Recruiter S!, accepting means marking as "Received" to move from Inbox to Ongoing 
        // while STAYING in the same status to avoid skipping steps
        const nextStatus = isRecruiterS ? app.current_status : 'INITIAL_INTERVIEW';

        try {
            await ApplicationService.updateStatus({
                id: app.id,
                fromStatus: app.current_status,
                toStatus: nextStatus as ApplicationStatus,
                changedByName: user?.full_name || 'System',
                reason: isRecruiterS ? 'Accepted into specialized queue' : 'Accepted for initial interview',
                patch: isRecruiterS ? {
                    metadata: {
                        ...(app.metadata || {}),
                        recruiter_s_scheduling_status: 'RECEIVED'
                    }
                } as any : undefined
            });
            toast.success('Accepted', isRecruiterS ? 'Candidate added to your ongoing list.' : 'Application accepted.');
            setRefreshKey(k => k + 1);
            setSelectedApplicant(null);
        } catch {
            toast.error('Error', 'Failed to accept application.');
        }
    };

    const handleDeclineRequest = async (app: Application) => {
        try {
            await ApplicationService.updateStatus({
                id: app.id,
                fromStatus: app.current_status,
                toStatus: 'REJECTED',
                changedByName: user?.full_name || 'System',
                reason: 'Declined during specialized review'
            });
            toast.error('Declined', 'Application has been declined.');
            setRefreshKey(k => k + 1);
            setSelectedApplicant(null);
        } catch {
            toast.error('Error', 'Failed to decline application.');
        }
    };

    const handleUpdateApplication = async (id: string, patch: ApplicationUpdatePatch) => {
        try {
            // Automate hire date on hired status or hired specific status
            const app = remoteApplications.find(a => a.id === id);

            if (patch.pis && 'final_specific_status' in patch.pis) {
                const specStatus = (patch.pis as any).final_specific_status;
                const mappedOverall = SPECIFIC_STATUS_TO_OVERALL[specStatus];
                if (mappedOverall) {
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
                        if (specStatus.toLowerCase().includes('withdraw') || specStatus.toLowerCase().includes('declined')) {
                            nextCurrentStatus = 'WITHDRAWN';
                        } else if (specStatus.toLowerCase().includes('failed')) {
                            nextCurrentStatus = 'FAILED';
                        } else {
                            nextCurrentStatus = 'REJECTED';
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
                    specUpper === 'OPS VAL INTERVIEW - PASSED'
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

            await ApplicationService.patch(id, patch);
            setRefreshKey(k => k + 1);
            if (selectedApplicant && selectedApplicant.id === id) {
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
        } catch {
            toast.error('Error', 'Failed to update application data.');
        }
    };

    const confirmDelete = async (applicantId: string, name: string) => {
        setDeletingApplicantId(applicantId);
        try {
            // Cleanup: release rooms and remove from queue
            await useRoomStore.getState().freeRoomByApplicationId(applicantId);
            const qEntries = await QueueService.getTodaysQueue();
            const entry = qEntries.find((e: any) => e.application_id === applicantId);
            if (entry) await QueueService.delete(entry.id);

            await ApplicationService.delete(applicantId);
            toast.success('Deleted', `Record for ${name} has been removed and resources released.`);
            setRefreshKey(k => k + 1);
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
            setRefreshKey(k => k + 1);
        } catch {
            toast.error('Error', 'Failed to perform bulk deletion.');
        } finally {
            setIsBulkDeleting(false);
            setDeleteConfirmApplicant(null);
        }
    };

    const handleAction = async (applicantId: string, name: string, action: ApplicantAction) => {
        if (action === 'delete') {
            setDeleteConfirmApplicant({ id: applicantId, name });
            return;
        }

        if (action === 'view') {
            await withLoading(async () => {
                try {
                    const applicant = await ApplicationService.getById(applicantId);
                    setSelectedApplicant(applicant);

                    const statusToTab: Record<string, ModalTab> = {
                        'APPLIED': 'application',
                        'TYPING_TEST': 'typing',
                        'INITIAL_INTERVIEW': 'initial',
                        'INTERVIEW_IN_PROGRESS': 'initial',
                        'QUEUE_ASSIGNED': 'initial',
                        'ASSESSMENT': 'assessment',
                        'FINAL_INTERVIEW': 'endorsement',
                        'FINAL_INTERVIEW_SCHEDULED': 'scheduling',
                        'FINAL_VERDICT': 'verdict',
                        'PASSED': 'verdict',
                        'FAILED': 'verdict',
                        'CONDITIONAL': 'verdict',
                        'WAITLISTED': 'verdict',
                        'WITHDRAWN': 'verdict',
                        'HIRED': 'verdict',
                        'REJECTED': 'verdict'
                    };

                    let defaultTab = statusToTab[applicant.current_status] || 'application';
                    if (applicant.current_status === 'QUEUE_ASSIGNED' && applicant.queue_type === 'FINAL') {
                        defaultTab = 'endorsement';
                    } else if (applicant.current_status === 'INTERVIEW_IN_PROGRESS' && applicant.queue_type === 'FINAL') {
                        defaultTab = 'endorsement';
                    }

                    setModalTab(defaultTab);
                    setAssessmentScore(applicant.assessment_score?.toString() || '');
                    setClientAssessmentScore(applicant.client_assessment_score?.toString() || '');
                    setClientInterviewRemarks(applicant.client_interview_remarks || '');
                    setFinalInterviewNotes(applicant.final_interview_notes || '');
                } catch {
                    toast.error('Error', 'Failed to load full applicant details.');
                }
            }, 'Loading applicant profile...');
            return;
        }

        const targetApp = remoteApplications.find(a => a.id === applicantId) || selectedApplicant;
        if (!targetApp) {
            toast.error('Error', 'Applicant not found.');
            return;
        }

        const isRecruiterS = user?.role === 'recruiter_s';
        const metadata = targetApp.metadata || {};
        const isEndorsedOrSpecialized = !!targetApp.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true' || ['KELLER POSTMAN', 'AUTO APPROVE'].includes((targetApp.department || '').toUpperCase());
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

    const [endorsementQueue, setEndorsementQueue] = useState<Application | null>(null);

    const handlePromote = async (app: Application, result: 'pass' | 'conditional' | 'fail' = 'pass', reason?: string) => {

        await withLoading(async () => {
            if (result === 'fail') {
                try {
                    const depts = (app.department || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                    const failedAccounts = app.metadata?.failed_accounts || [];
                    const activeAccount = depts.find((d: string) => !failedAccounts.some((f: string) => f.trim().toLowerCase() === d.toLowerCase()));
                    const newFailedAccounts = [...failedAccounts];
                    
                    const isFinalStage = ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(app.current_status || '');
                    
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
                            const patch = {
                                endorsement_meeting_date: null,
                                endorsement_meeting_end_date: null,
                                assigned_ops_validator_id: null,
                                assigned_ops_validator_name: "",
                                recruiter_s_scheduling_status: "PENDING",
                                metadata: {
                                    ...(app.metadata || {}),
                                    failed_accounts: newFailedAccounts,
                                    recruiter_s_scheduling_status: 'PENDING',
                                    account_evaluators: accountEvaluators
                                },
                                pis: {
                                    ...(app.pis || {}),
                                    final_interview_result: 'FAILED',
                                    overall_status: 'FINAL_INTERVIEW',
                                    final_specific_status: 'OV - Failed (Reschedule)',
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

                    const patch = {
                        metadata: {
                            ...(app.metadata || {}),
                            failed_accounts: newFailedAccounts
                        }
                    };
                    await ApplicationService.updateStatus({
                        id: app.id,
                        fromStatus: app.current_status,
                        toStatus: 'REJECTED',
                        changedByName: user?.full_name || 'System',
                        reason: reason,
                        patch
                    });
                    setSelectedApplicant({ ...app, current_status: 'REJECTED', rejection_reason: reason, metadata: { ...(app.metadata || {}), failed_accounts: newFailedAccounts } });
                    toast.error('Rejected', 'Candidate has been marked as REJECTED.');
                    setRefreshKey(k => k + 1);
                } catch { /* error handled by interceptor */ }
                return;
            }

            const dept = (app.department || '').toUpperCase();
            const metadata = app.metadata || {};
            const isExplicitlyEndorsed = !!app.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';

            const getNextStatus = (): string | undefined => {
                const requiredProcesses: string[] | undefined = app.pis?.required_processes || app.metadata?.required_processes;
                let processOrder: string[] = app.pis?.process_order || app.metadata?.process_order || [
                    'TYPING_TEST',
                    'INITIAL_INTERVIEW',
                    'OPS_VALIDATION',
                    'ASSESSMENT',
                    'CLIENT_ASSESSMENT',
                    'CLIENT_INTERVIEW'
                ];

                if (processOrder.indexOf('ASSESSMENT') !== -1 && processOrder.indexOf('OPS_VALIDATION') !== -1) {
                    const idxAssess = processOrder.indexOf('ASSESSMENT');
                    const idxOps = processOrder.indexOf('OPS_VALIDATION');
                    if (idxAssess < idxOps) {
                        const newOrder = [...processOrder];
                        newOrder[idxAssess] = 'OPS_VALIDATION';
                        newOrder[idxOps] = 'ASSESSMENT';
                        processOrder = newOrder;
                    }
                }

                const statusToStageMap: Record<string, string> = {
                    'TYPING_TEST': 'TYPING_TEST',
                    'INITIAL_INTERVIEW': 'INITIAL_INTERVIEW',
                    'INTERVIEW_IN_PROGRESS': 'INITIAL_INTERVIEW',
                    'QUEUE_ASSIGNED': 'INITIAL_INTERVIEW',
                    'FINAL_INTERVIEW': 'OPS_VALIDATION',
                    'ASSESSMENT': 'ASSESSMENT',
                    'FINAL_INTERVIEW_SCHEDULED': 'ASSESSMENT',
                    'CLIENT_ASSESSMENT': 'CLIENT_ASSESSMENT',
                    'CLIENT_INTERVIEW': 'CLIENT_INTERVIEW'
                };

                const currentStage = statusToStageMap[app.current_status];

                const activeOrder = processOrder.filter(stageId => {
                    if (requiredProcesses && !requiredProcesses.includes(stageId)) return false;
                    if (stageId === 'CLIENT_ASSESSMENT') {
                        return (isExplicitlyEndorsed || ['KELLER POSTMAN', 'AUTO APPROVE'].includes(dept));
                    }
                    if (stageId === 'CLIENT_INTERVIEW') {
                        return (isExplicitlyEndorsed || ['KELLER POSTMAN', 'AUTO APPROVE', 'TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].includes(dept));
                    }
                    return true;
                });

                const currentStageIdx = currentStage ? activeOrder.indexOf(currentStage) : -1;
                const nextStage = activeOrder[currentStageIdx + 1];

                if (!nextStage) {
                    return 'For Job Offer';
                }

                const stageToStatusMap: Record<string, string> = {
                    'TYPING_TEST': 'TYPING_TEST',
                    'INITIAL_INTERVIEW': 'INITIAL_INTERVIEW',
                    'OPS_VALIDATION': 'FINAL_INTERVIEW',
                    'ASSESSMENT': 'ASSESSMENT',
                    'CLIENT_ASSESSMENT': 'CLIENT_ASSESSMENT',
                    'CLIENT_INTERVIEW': 'CLIENT_INTERVIEW'
                };

                return stageToStatusMap[nextStage] || 'For Job Offer';
            };

            const nextStatus = getNextStatus();
            if (!nextStatus) return;

            const nextTabMap: Record<string, ModalTab> = {
                'TYPING_TEST': 'typing',
                'INITIAL_INTERVIEW': 'initial',
                'ASSESSMENT': 'assessment',
                'FINAL_INTERVIEW': 'endorsement',
                'FINAL_INTERVIEW_SCHEDULED': 'scheduling',
                'CLIENT_ASSESSMENT': 'client_assessment',
                'CLIENT_INTERVIEW': 'client_interview',
                'FINAL_VERDICT': 'verdict',
                'PASSED': 'verdict',
                'HIRED': 'verdict'
            };

            try {
                const patch: ApplicationUpdatePatch = {};
                if (app.current_status === 'FINAL_INTERVIEW') patch.final_interview_notes = finalInterviewNotes;

                // Dynamic Specific Status Mapping
                // The key is app.current_status (the stage being LEFT).
                // 'JO - Hired' is only set when actually transitioning to HIRED.
                const specificStatusMap: Record<string, string> = {
                    'TYPING_TEST': 'Typing Test - Passed',
                    'INITIAL_INTERVIEW': 'Recruitment Interview - Passed',
                    'ASSESSMENT': 'Personality Test - Passed',
                    'FINAL_INTERVIEW': 'OV - Passed',
                    'FINAL_INTERVIEW_SCHEDULED': 'OV - Passed',
                    'CLIENT_ASSESSMENT': 'Client Interview - Passed',
                    'CLIENT_INTERVIEW': 'Client Interview - Passed',
                    'PASSED': 'JO - Pending'
                };

                let newSpecificStatus = specificStatusMap[app.current_status];

                // Override: Only mark 'JO - Hired' when actually transitioning to HIRED
                if (nextStatus === 'HIRED') {
                    newSpecificStatus = 'JO - Hired';
                }

                if (newSpecificStatus) {
                    patch.pis = {
                        ...(app.pis || {}),
                        final_specific_status: newSpecificStatus
                    } as any;
                }

                // Trigger Masterlist routing and reprofile queue completion only at hiring milestones:
                //   Standard account: OV pass → PASSED → Masterlist
                //   Special account (KP etc.): Client Interview pass → PASSED → Masterlist
                const isHiringTransition = nextStatus === 'PASSED' || nextStatus === 'HIRED' || nextStatus === 'HIRED_PROCESSED' || nextStatus === 'For Job Offer';

                if (isHiringTransition) {
                    // Process reprofile queue if applicable
                    const currentQueue = getReprofileQueue(app);
                    if (currentQueue.length > 0) {
                        const nextQueue = completeActiveReprofileAccount(currentQueue);
                        patch.metadata = {
                            ...(app.metadata || {}),
                            reprofile_accounts: nextQueue
                        };
                    }

                    // AUTO-MOVE TO MASTERLIST
                    // Only 'PASSED' is the correct trigger:
                    //   - Standard: FINAL_INTERVIEW pass → PASSED → Masterlist
                    //   - Special (KP): CLIENT_INTERVIEW pass → PASSED → Masterlist
                    const isQualified = nextStatus === 'PASSED' || nextStatus === 'HIRED' || nextStatus === 'For Job Offer';

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

                await ApplicationService.updateStatus({
                    id: app.id,
                    fromStatus: app.current_status,
                    toStatus: nextStatus as ApplicationStatus,
                    changedByName: user?.full_name || 'System',
                    patch
                });

                setSelectedApplicant({ ...app, ...patch, current_status: nextStatus as ApplicationStatus });
                toast.success('Promoted', `Applicant moved to ${nextStatus}`);
                setRefreshKey(k => k + 1);
                setFinalInterviewNotes('');
                setModalTab(nextTabMap[nextStatus]);
            } catch { /* error handled by interceptor */ }
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
                    reason: `Routed to Recruiter S! (${recruiterSName}) for specialized Ops Validation`
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

    const handleRegress = async (app: Application) => {
        await withLoading(async () => {
            const dept = (app.department || '').toUpperCase();
            const metadata = app.metadata || {};
            const isExplicitlyEndorsed = !!app.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
            const isSpecialized = isExplicitlyEndorsed || ['KELLER POSTMAN', 'AUTO APPROVE'].includes(dept);

            // Determine previous status dynamically
            let prevStatus: string | null = null;

            if (app.current_status === 'TYPING_TEST') {
                prevStatus = 'APPLIED';
            } else if (app.current_status === 'INITIAL_INTERVIEW') {
                prevStatus = 'TYPING_TEST';
            } else if (app.current_status === 'QUEUE_ASSIGNED' || app.current_status === 'INTERVIEW_IN_PROGRESS') {
                prevStatus = 'INITIAL_INTERVIEW';
            } else if (app.current_status === 'ASSESSMENT') {
                prevStatus = 'INITIAL_INTERVIEW';
            } else if (app.current_status === 'FINAL_INTERVIEW') {
                prevStatus = 'ASSESSMENT';
            } else if (app.current_status === 'CLIENT_ASSESSMENT') {
                prevStatus = 'FINAL_INTERVIEW';
            } else if (app.current_status === 'CLIENT_INTERVIEW') {
                prevStatus = isSpecialized ? 'CLIENT_ASSESSMENT' : 'FINAL_INTERVIEW';
            } else if (['FINAL_VERDICT', 'PASSED', 'FAILED', 'CONDITIONAL', 'WAITLISTED', 'HIRED', 'REJECTED', 'For Job Offer', 'FOR_JOB_OFFER', 'HIRED_PROCESSED', 'FOR PAN', 'OPEN', 'PENDING'].includes(app.current_status)) {
                if (isSpecialized) {
                    prevStatus = 'CLIENT_INTERVIEW';
                } else if (['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].includes(dept)) {
                    prevStatus = 'CLIENT_INTERVIEW';
                } else {
                    prevStatus = 'FINAL_INTERVIEW';
                }
            } else if (app.current_status === 'WITHDRAWN') {
                prevStatus = 'INITIAL_INTERVIEW';
            }

            if (!prevStatus) {
                toast.error('Cannot Regress', 'No previous stage found for this status.');
                return;
            }

            const backTabMap: Record<string, ModalTab> = {
                'APPLIED': 'application',
                'TYPING_TEST': 'typing',
                'INITIAL_INTERVIEW': 'initial',
                'ASSESSMENT': 'assessment',
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
                
                // Clean up specific fields depending on which stage we are regressing to:
                if (prevStatus === 'APPLIED') {
                    // Reverted back to initial application stage
                    patch.typing_test_wpm = null;
                    patch.typing_test_accuracy = null;
                    patch.typing_test_duration_seconds = null;
                    patch.typing_test_completed_at = null;
                    patch.interview_responses = {};
                    patch.interview_grading = {};
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
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'TYPING_TEST') {
                    // Reverted back to typing test (before initial interview form is answered)
                    patch.interview_responses = {};
                    patch.interview_grading = {};
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
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'INITIAL_INTERVIEW') {
                    // Reverted back to initial screening interview (before assessment score is recorded)
                    patch.interview_responses = {};
                    patch.interview_grading = {};
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
                        final_specific_status: 'Recruitment Interview - Pending',
                        ops_validator_status: null,
                        ops_validator_notes: null,
                        ops_validator_email: null,
                        client_interview_status: null,
                        client_interview_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                    patch.metadata = {
                        ...(app.metadata || {}),
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'ASSESSMENT') {
                    // Reverted to technical assessment (before final interview/ops validation scheduling)
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
                        endorsed_to_recruiter_s: false,
                        recruiter_s_scheduling_status: null,
                        endorsement_confirmed: false
                    };
                } else if (prevStatus === 'FINAL_INTERVIEW') {
                    // Reverted to final interview / ops validation
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
                        final_specific_status: 'OV - Pending',
                        client_interview_status: null,
                        client_interview_notes: null,
                        ops_validator_status: null,
                        ops_validator_notes: null,
                        last_updated_by: user?.full_name || 'System (Regression)'
                    };
                    patch.metadata = {
                        ...(app.metadata || {}),
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

                await ApplicationService.updateStatus({
                    id: app.id,
                    fromStatus: app.current_status,
                    toStatus: prevStatus as ApplicationStatus,
                    changedByName: user?.full_name || 'System',
                    reason: 'Status regressed by recruiter',
                    patch
                });

                // Fetch the canonical updated row from the server so the modal
                // and the masterlist both reflect the freshly persisted state.
                const fresh = await ApplicationService.getById(app.id);
                setSelectedApplicant(fresh);
                setRemoteApplications(prev => prev.map(a => a.id === app.id ? fresh : a));

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

    const handleGiveGrade = async (app: Application) => {
        if (!assessmentScore) {
            toast.error('Validation Error', 'Please input a score before posting the decision.');
            return;
        }

        await withLoading(async () => {
            const parsedScore = isNaN(Number(assessmentScore)) ? assessmentScore : Number(assessmentScore);
            try {
                await ApplicationService.updateStatus({
                    id: app.id,
                    fromStatus: app.current_status,
                    toStatus: 'FINAL_INTERVIEW_SCHEDULED',
                    changedByName: user?.full_name || 'System',
                    reason: `Scored ${assessmentScore}`,
                    patch: { assessment_score: parsedScore as any }
                });

                setSelectedApplicant({ ...app, assessment_score: parsedScore as any, current_status: 'FINAL_INTERVIEW_SCHEDULED' });
                toast.success('Results Posted', `Score of ${assessmentScore} recorded.`);
                setRefreshKey(k => k + 1);
                setModalTab('scheduling');
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
        
        const failedAccounts = app.metadata?.failed_accounts || [];
        const combinedDepts = [...failedAccounts];
        for (const q of queueAccounts) {
            if (!combinedDepts.some(c => c.toLowerCase() === q.toLowerCase())) {
                combinedDepts.push(q);
            }
        }
        if (!combinedDepts.some(c => c.toLowerCase() === account.toLowerCase())) {
            combinedDepts.push(account);
        }
        const newDeptVal = combinedDepts.join(', ');

        const patch: ApplicationUpdatePatch = {
            department: newDeptVal,
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
        const nextActiveAccount = nextQueue.find(item => item.status === 'ACTIVE')?.account || getActiveReprofileAccount(app);
        
        const failedAccounts = app.metadata?.failed_accounts || [];
        const originalDepts = (app.department || '').split(',').map(s => s.trim()).filter(Boolean);
        const combinedDepts = originalDepts.filter(d => 
            failedAccounts.some((f: any) => String(f).trim().toLowerCase() === d.toLowerCase())
        );
        if (nextActiveAccount && !combinedDepts.some(c => c.toLowerCase() === nextActiveAccount.toLowerCase())) {
            combinedDepts.push(nextActiveAccount);
        }
        const newDeptVal = combinedDepts.join(', ');

        const activeAccount = getActiveReprofileAccount(app);
        const currentValidator = app.assigned_ops_validator_name || app.pis?.ops_validator_email || '';
        const accountEvaluators = {
            ...(app.metadata?.account_evaluators || {}),
        };
        if (activeAccount && currentValidator) {
            accountEvaluators[activeAccount.toUpperCase()] = currentValidator;
        }

        const patch: ApplicationUpdatePatch = {
            department: newDeptVal,
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
                reprofile_active_account: nextActiveAccount,
                reprofile_accounts: nextQueue,
                reprofile_last_failed_account: getActiveReprofileAccount(app),
                reprofile_ops_endorsed_at: null as any,
                reprofile_stage: null as any,
                endorsement_confirmed: false,
                account_evaluators: accountEvaluators
            },
            pis: {
                ...(app.pis || {}),
                final_specific_status: 'OV - Failed; for reprofiling'
            }
        };

        await withLoading(async () => {
            try {
                await ApplicationService.patch(app.id, patch);
                toast.warning('Reprofile Updated', `${app.applicant_name} moved to ${nextActiveAccount}.`);
                setRefreshKey(k => k + 1);
                if (selectedApplicant?.id === app.id) {
                    setSelectedApplicant({ ...selectedApplicant, ...patch });
                }
            } catch {
                toast.error('Error', 'Failed to advance the reprofile queue.');
            }
        }, 'Advancing reprofile queue...');
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredList.map(a => a.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    return {
        activeTab, setActiveTab,
        viewMode, setViewMode,
        searchQuery, setSearchQuery,
        selectedApplicant, setSelectedApplicant,
        statusFilter, setStatusFilter,
        accountFilter, setAccountFilter,
        assessmentScore, setAssessmentScore,
        clientAssessmentScore, setClientAssessmentScore,
        clientInterviewRemarks, setClientInterviewRemarks,
        modalTab, setModalTab,
        requestModalTab, setRequestModalTab,
        finalInterviewNotes, setFinalInterviewNotes,
        validators,
        ongoing, scheduling, requests, reprofile, rejected, concluded, filteredList, departments,
        concludedCount: concluded.length,
        schedulingCount: scheduling.length,
        reprofileCount: reprofile.length,
        totalCount: remoteApplications.length,
        isSelectMode, setIsSelectMode,
        selectedIds, setSelectedIds,
        isBulkDeleting,
        showQueuePrompt, setShowQueuePrompt,
        showQueueSuccess, setShowQueueSuccess,
        endorsementQueue, setEndorsementQueue,
        deleteConfirmApplicant, setDeleteConfirmApplicant,
        deletingApplicantId,
        stageRanks, getApplicantStatusRank,
        handleAcceptRequest, handleDeclineRequest,
        handleUpdateApplication, confirmDelete, handleBulkDelete,
        handleAction, handlePromote, handleRegress, handleWithdraw,
        handleGiveGrade,
        handleGiveClientAssessmentGrade,
        handleGiveClientInterviewVerdict,
        handleQueue, confirmQueue, handleSendToEndorsed,
        handleSetActiveReprofileAccount,
        handleFailActiveReprofileAccount,
        toggleSelectAll, toggleSelect, navigate, urlApplicantId,
        refresh: () => setRefreshKey(k => k + 1)
    };
}
