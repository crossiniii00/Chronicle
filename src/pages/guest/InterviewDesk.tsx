import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApplicationService } from '@/services/ApplicationService';
import { UserService } from '@/services/UserService';
import { QueueService } from '@/services/QueueService';
import { useToast } from '@/components/common/useToast';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Calendar, Filter, ChevronDown, UserCircle2, UserX,
    LayoutDashboard, X, AlertCircle, History as HistoryIcon,
    Play, Send, Sparkles, HelpCircle, MousePointerClick, Info
} from 'lucide-react';
import type { ApplicationStatus, Application } from '@/types/application';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';
import { InterviewSession } from '@/components/features/InterviewRooms/InterviewSession';
import { GuestApplicantTable } from '@/components/features/ApplicantManagement/GuestApplicantTable';
import { ReceiptModal } from '@/pages/recruiter/components/InterviewRoomsUI';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';
import { checkValidatorAssignment, isMatchingAccount } from './dashboardUtils';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import { socketService } from '@/services/socketService';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

export function InterviewDesk() {
    const navigate = useNavigate();
    const location = useLocation();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { error, success } = useToast();
    const [activeTab, setActiveTab] = React.useState<'desk' | 'records' | 'noshow' | 'client'>('desk');
    const [activeSessionRoomId, setActiveSessionRoomId] = useState<string | null>(null);
    const [activeSessionAppId, setActiveSessionAppId] = useState<string | null>(null);

    const [deskSearchTerm, setDeskSearchTerm] = useState('');
    const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const searchTerm = activeTab === 'desk' ? deskSearchTerm : (activeTab === 'client' ? clientSearchTerm : recordsSearchTerm);
    const setSearchTerm = (val: string) => {
        if (activeTab === 'desk') {
            setDeskSearchTerm(val);
        } else if (activeTab === 'client') {
            setClientSearchTerm(val);
        } else {
            setRecordsSearchTerm(val);
        }
    };

    const [receiptData, setReceiptData] = useState<any | null>(null);
    const [selectedApplicantProfile, setSelectedApplicantProfile] = useState<Application | null>(null);
    const [roomSelectionApp, setRoomSelectionApp] = useState<Application | null>(null);
    const [roomTypeTab, setRoomTypeTab] = useState<'onsite' | 'online'>('online');

    const [deskStatusFilter, setDeskStatusFilter] = useState<'ALL' | 'HIRED' | 'PASSED' | 'FAILED' | 'PENDING'>('ALL');
    const [recordsStatusFilter, setRecordsStatusFilter] = useState<'ALL' | 'HIRED' | 'PASSED' | 'FAILED' | 'PENDING'>('ALL');
    const [clientStatusFilter, setClientStatusFilter] = useState<'ALL' | 'HIRED' | 'PASSED' | 'FAILED' | 'PENDING'>('ALL');
    const statusFilter = activeTab === 'desk' ? deskStatusFilter : (activeTab === 'client' ? clientStatusFilter : recordsStatusFilter);
    const setStatusFilter = (val: 'ALL' | 'HIRED' | 'PASSED' | 'FAILED' | 'PENDING') => {
        if (activeTab === 'desk') {
            setDeskStatusFilter(val);
        } else if (activeTab === 'client') {
            setClientStatusFilter(val);
        } else {
            setRecordsStatusFilter(val);
        }
    };

    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [rescheduleApp, setRescheduleApp] = useState<Application | null>(null);
    const [rescheduleReason, setRescheduleReason] = useState<string>('');
    const [scheduleWarningApp, setScheduleWarningApp] = useState<Application | null>(null);

    const [showOnlyMyEndorsements, setShowOnlyMyEndorsements] = useState(false);
    const [showRoomTutorial, setShowRoomTutorial] = useState(true);

    // Sync state from location redirect
    React.useEffect(() => {
        if (location.state) {
            const { activeTab: stateTab, statusFilter: stateFilter, autoOpenRoomId } = location.state as any;
            if (stateTab) {
                setActiveTab(stateTab);
                if (stateFilter) {
                    if (stateTab === 'desk') {
                        setDeskStatusFilter(stateFilter);
                    } else if (stateTab === 'client') {
                        setClientStatusFilter(stateFilter);
                    } else {
                        setRecordsStatusFilter(stateFilter);
                    }
                }
            }
            if (autoOpenRoomId) {
                setActiveSessionRoomId(autoOpenRoomId);
                // Clear the state so it doesn't keep reopening on refresh
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, navigate]);

    const { user: authUser } = useAuthStore();
    const { rooms, loadRooms } = useRoomStore();

    const { activeAccount } = useActiveAccountStore();
    const accounts = parseAccounts(authUser?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const resolvedActiveAccount = (activeAccount && accounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase()))
        ? activeAccount
        : (accounts[0] || 'DOORDASH');
    const [allUsers, setAllUsers] = useState<any[]>([]);

    const loadData = React.useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [fetchedApps, userList] = await Promise.all([
                ApplicationService.getAll(),
                UserService.getAll().catch(() => []),
                loadRooms(true)
            ]);

            setAllUsers(Array.isArray(userList) ? userList : []);

            const uniqueMap = new Map();
            (fetchedApps || []).forEach((app: any) => {
                if (!app) return;
                const key = String(app.applicant_email || app.applicant_name || app.id || Math.random()).trim().toLowerCase();
                const existing = uniqueMap.get(key);
                const appTime = app.updated_at ? new Date(app.updated_at).getTime() : 0;
                const existingTime = (existing && existing.updated_at) ? new Date(existing.updated_at).getTime() : 0;
                if (!existing || appTime > existingTime) {
                    uniqueMap.set(key, app);
                }
            });
            setApplications(Array.from(uniqueMap.values()));
        } catch {
            error('Protocol Error', 'Failed to synchronize with central registry.');
        } finally {
            setIsLoading(false);
        }
    }, [error, loadRooms]);

    useVisibilityPolling(() => void loadData(true), 300000, [loadData]);

    React.useEffect(() => {
        const socket = socketService.getSocket();
        const handleUpdate = () => void loadData(true);
        socket.on('applications:updated', handleUpdate);
        socket.on('rooms:updated', handleUpdate);
        return () => { socket.off('applications:updated', handleUpdate); socket.off('rooms:updated', handleUpdate); };
    }, [loadData]);

    React.useEffect(() => {
        setShowStatusDropdown(false);
    }, [activeTab]);


    const isCandidateEndorsedToOpsValidator = (app: Application): boolean => {
        const metadata = app.metadata || {};
        const meetingDate = (app.endorsement_meeting_date || metadata.endorsement_meeting_date || (app.pis as any)?.endorsement_meeting_date || '').trim();
        const isScheduled = Boolean(meetingDate && meetingDate !== '—' && meetingDate !== 'Pending' && meetingDate !== '');

        const isEndorsedStatus = [
            'FINAL_INTERVIEW_SCHEDULED', 
            'FOR_OPS_VAL_SCHEDULING', 
            'ENDORSED'
        ].includes(app.current_status || '');

        if (!isScheduled && !isEndorsedStatus) return false;

        return isMatchingAccount(app, resolvedActiveAccount);
    };

    const isAssignedToCurrentValidator = (app: Application) => {
        if (!isMatchingAccount(app, resolvedActiveAccount)) {
            return false;
        }

        if (showOnlyMyEndorsements) {
            return isActuallyAssignedValidator(app);
        }

        return true;
    };

    const isActuallyAssignedValidator = (app: Application) => {
        if (authUser?.role === 'admin') return true;
        const metadata = app.metadata || {};
        const assignedId = app.assigned_ops_validator_id || metadata.assigned_ops_validator_id;
        const assignedName = (app.assigned_ops_validator_name || metadata.assigned_ops_validator_name || '').trim().toLowerCase();
        const assignedEmail = (app.pis?.ops_validator_email || metadata.ops_validator_email || '').trim().toLowerCase();

        const currentUserId = authUser?.id;
        const currentUserName = (authUser?.full_name || '').trim().toLowerCase();
        const currentUserEmail = (authUser?.email || '').trim().toLowerCase();

        return Boolean(
            (assignedId && assignedId === currentUserId) ||
            (assignedName && currentUserName && (assignedName.includes(currentUserName) || currentUserName.includes(assignedName))) ||
            (assignedEmail && currentUserEmail && assignedEmail === currentUserEmail)
        );
    };

    const isCandidateNoShow = (a: Application): boolean => {
        const rawStatus = String(a.final_verdict || a.current_status || '').toUpperCase().trim().replace(/_/g, ' ');
        const specStatus = String((a as any).final_specific_status || a.pis?.final_specific_status || a.metadata?.final_specific_status || a.metadata?.['Specific Status'] || '').toUpperCase().trim();
        const ovStatus = String(a.metadata?.ops_validator_status || a.pis?.ops_validator_status || (a as any).ops_validator_status || '').toUpperCase().trim();
        const overallStatus = String(a.overall_status || '').toUpperCase().trim();

        return (
            rawStatus.includes('NO SHOW') ||
            specStatus.includes('NO SHOW') ||
            ovStatus.includes('NO SHOW') ||
            overallStatus.includes('NO SHOW')
        );
    };

    const getOpsValSessionStatus = (a: Application) => {
        if (isCandidateNoShow(a)) return 'NO_SHOW';

        const metadata = a.metadata || {};
        const ovStatus = String(metadata.ops_validator_status || a.pis?.ops_validator_status || (a as any).ops_validator_status || '').toUpperCase().trim();
        const specStatus = String((a as any).final_specific_status || a.pis?.final_specific_status || metadata.final_specific_status || '').toUpperCase().trim();

        const currentStatus = String(a.current_status || '').toUpperCase().trim();
        
        // 1. If candidate is explicitly hired/passed/failed/withdrawn overall, they are no longer pending an interview
        if (['PASSED', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'CONTRACT SENT', 'FOR PAN', 'FOR_PAN'].includes(currentStatus)) {
            return 'PASSED';
        }
        if (['FAILED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN'].includes(currentStatus)) {
            return 'FAILED';
        }

        // 2. Explicit Ops Validator Verdict Check
        // Note: we strictly DO NOT check `fiResult` or `final_verdict` here, as those fields are often populated by the earlier Recruitment interview stage, which would cause incoming scheduled candidates to be prematurely evaluated as 'PASSED'.
        const isExplicitPassed = (
            ovStatus === 'PASSED' ||
            specStatus.includes('OV - PASSED') ||
            specStatus.includes('OPS VALIDATOR PASSED')
        );
        if (isExplicitPassed) return 'PASSED';

        const isExplicitFailed = (
            ovStatus === 'FAILED' ||
            specStatus.includes('OV - FAILED') ||
            specStatus.includes('OPS VALIDATOR FAILED')
        );
        if (isExplicitFailed) return 'FAILED';

        // 3. If candidate is scheduled/assigned for an interview with no explicit verdict yet -> PENDING
        const isScheduledSession = Boolean(
            a.current_status === 'FINAL_INTERVIEW_SCHEDULED' ||
            a.recruiter_s_scheduling_status === 'SCHEDULED' ||
            (a.endorsement_meeting_date && a.endorsement_meeting_date !== '—') ||
            a.assigned_ops_validator_name ||
            a.assigned_ops_validator_id
        );
        if (isScheduledSession) {
            return 'PENDING';
        }

        return 'PENDING';
    };

    const activeCandidates = React.useMemo(() => applications.filter(a => {
        if (!isCandidateEndorsedToOpsValidator(a)) return false;
        if (!isAssignedToCurrentValidator(a)) return false;
        if (isCandidateNoShow(a)) return false;

        const statusUpper = String(a.current_status || '').toUpperCase().trim();
        if (['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(statusUpper)) return false;

        const sessionStatus = getOpsValSessionStatus(a);
        return sessionStatus === 'PENDING';
    }).sort((a, b) => {
        const getDateVal = (app: any) => {
            const dateStr = app.metadata?.reschedule_date || app.endorsement_meeting_date || app.metadata?.endorsement_meeting_date || app.updated_at;
            const parsed = new Date(dateStr).getTime();
            return isNaN(parsed) ? new Date(app.updated_at).getTime() : parsed;
        };
        const now = Date.now();
        return Math.abs(getDateVal(a) - now) - Math.abs(getDateVal(b) - now);
    }), [applications, resolvedActiveAccount, showOnlyMyEndorsements, authUser]);

    const noShowCandidates = React.useMemo(() => applications.filter(a => {
        if (!isAssignedToCurrentValidator(a)) return false;
        return isCandidateNoShow(a);
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [applications, resolvedActiveAccount, showOnlyMyEndorsements, authUser]);

    const pastCandidates = React.useMemo(() => applications.filter(a => {
        if (!isAssignedToCurrentValidator(a)) return false;
        if (isCandidateNoShow(a)) return false;

        const statusUpper = String(a.current_status || '').toUpperCase().trim();
        if (['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(statusUpper)) return false;

        const metadata = a.metadata || {};
        const hasAssignedOpsValidator = Boolean(a.assigned_ops_validator_name || metadata.assigned_ops_validator_name || a.assigned_ops_validator_id);
        const notes = String(a.pis?.ops_validator_notes || metadata.ops_validator_notes || '').toUpperCase();
        const updater = String(a.pis?.last_updated_by || metadata.last_updated_by || '').toUpperCase();
        const isForced = notes.includes('FORCE PASS') || notes.includes('FORCE FAIL') || updater.includes('FORCE PASS') || updater.includes('FORCE FAIL');

        // The user explicitly stated: if they don't have the symbol (forced pass/fail) AND have no assigned ops validator, they should NOT be in the records.
        if (!hasAssignedOpsValidator && !isForced) {
            return false;
        }

        const sessionStatus = getOpsValSessionStatus(a);
        if (sessionStatus !== 'PASSED' && sessionStatus !== 'FAILED') return false;

        return true;
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [applications, resolvedActiveAccount, showOnlyMyEndorsements, authUser]);

    const clientCandidates = React.useMemo(() => applications.filter(a => {
        const statusUpper = String(a.current_status || '').toUpperCase();
        const isClientPhase = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(statusUpper);
        const isAssigned = isAssignedToCurrentValidator(a);
        return isClientPhase && isAssigned;
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [applications, resolvedActiveAccount, showOnlyMyEndorsements, authUser]);

    const filteredList = React.useMemo(() => {
        return (activeTab === 'desk' ? activeCandidates : (activeTab === 'records' ? pastCandidates : (activeTab === 'client' ? clientCandidates : noShowCandidates))).filter(c => {
        const searchTokens = searchTerm.toLowerCase().split(' ').filter(Boolean);
        const nameLower = (c.applicant_name || '').toLowerCase();
        const idLower = (c.applicant_id || c.id || '').toLowerCase();
        const matchesSearch = searchTokens.length === 0 || searchTokens.every(token => nameLower.includes(token) || idLower.includes(token));

        if (!matchesSearch) return false;
        if (showOnlyMyEndorsements && !isActuallyAssignedValidator(c)) return false;
        if (statusFilter === 'ALL') return true;

        const status = c.final_verdict || c.current_status;
        const statusUpper = String(status || '').toUpperCase().trim();
        const specUpper = String((c as any).final_specific_status || c.pis?.final_specific_status || c.metadata?.final_specific_status || c.metadata?.['Specific Status'] || '').toUpperCase().trim();
        const finalResultUpper = String(c.metadata?.final_interview_result || c.pis?.final_interview_result || '').toUpperCase().trim();

        const isHired = ['HIRED', 'HIRED_PROCESSED', 'HIRED PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(statusUpper);
        const isPassed = ([
            'PASSED', 'CLIENT_ASSESSMENT', 'CLIENT ASSESSMENT',
            'CLIENT_INTERVIEW', 'CLIENT INTERVIEW', 'FINAL_VERDICT', 'FOR_JOB_OFFER', 'FOR JOB OFFER',
            'CONTRACT_SENT', 'CONTRACT SENT', 'FOR_PAN', 'FOR PAN', 'CONFIRMED_TRAINING', 'CONFIRMED TRAINING'
        ].includes(statusUpper) || finalResultUpper === 'PASSED' || specUpper.includes('OV - PASSED') || specUpper.includes('OPS VALIDATOR PASSED') || specUpper.includes('FINAL INTERVIEW PASSED') || specUpper.includes('RECRUITMENT INTERVIEW - PASSED') || specUpper.includes('PASSED')) && !isHired;

        const targetAcc = (c.endorsement_account || c.department || '').trim().toLowerCase();
        const isFailed = ['FAILED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN', 'WITHDRAWN BY APPLICANT', 'NOT ELIGIBLE FOR REHIRE', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(statusUpper) || finalResultUpper === 'FAILED' || specUpper.includes('OV - FAILED') || specUpper.includes('FAILED') || c.metadata?.failed_accounts?.some(
            (f: string) => f.trim().toLowerCase() === targetAcc
        );

        if (statusFilter === 'HIRED') return isHired;
        if (statusFilter === 'PASSED') return isPassed;
        if (statusFilter === 'FAILED') return isFailed;
        if (statusFilter === 'PENDING') return !isPassed && !isFailed && !isHired;

        return true;
    });
    }, [activeTab, activeCandidates, pastCandidates, clientCandidates, noShowCandidates, searchTerm, showOnlyMyEndorsements, statusFilter, authUser, resolvedActiveAccount]);

    const handleInitiate = async (app: Application) => {
        const appDept = (app.endorsement_account || app.department || '').toUpperCase();
        const userDept = (authUser?.department || '').toUpperCase();
        const mode = (app.metadata?.interview_mode || (app as any).interview_mode || '').toUpperCase();
        const isAbbott = appDept.includes('ABBOTT') || userDept.includes('ABBOTT');
        if (isAbbott || mode === 'ON-SITE' || mode === 'ONSITE') {
            setRoomTypeTab('onsite');
        } else {
            setRoomTypeTab('online');
        }
        setRoomSelectionApp(app);
    };

    const isScheduleToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
    };

    const handleRequestReschedule = async (app: Application, reason: string) => {
        try {
            setIsLoading(true);
            const isNoShowReason = reason.toLowerCase().includes('no-show') || reason.toLowerCase().includes('no show');
            const targetStatus = isNoShowReason ? 'RESCHEDULED' : 'FINAL_INTERVIEW_SCHEDULED';
            const specStatus = isNoShowReason ? 'OV - No Show' : 'OV - Reschedule';
            const opsValStatus = isNoShowReason ? 'No Show' : (app.metadata?.ops_validator_status || app.pis?.ops_validator_status || '');

            const patch: any = {
                overall_status: isNoShowReason ? 'NO_SHOW' : 'OPEN',
                final_specific_status: specStatus,
                metadata: {
                    ...(app.metadata || {}),
                    ops_validator_status: opsValStatus,
                    rescheduled_from_status: app.current_status
                },
                pis: {
                    ...(app.pis || {}),
                    final_specific_status: specStatus,
                    ops_validator_status: opsValStatus,
                    ops_validator_notes: reason || 'Reschedule requested by validator.'
                }
            };

            await ApplicationService.updateStatus({
                id: app.id,
                fromStatus: app.current_status,
                toStatus: targetStatus as ApplicationStatus,
                changedByName: authUser?.full_name || 'OPS Validator',
                reason: reason || 'Validator requested interview reschedule.',
                patch
            });

            success('Reschedule Requested', `${app.applicant_name} status updated to ${specStatus}.`);
            setRescheduleApp(null);
            setRescheduleReason('');
            void loadData(true);
        } catch {
            error('Reschedule Failed', 'Failed to update candidate status.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCallWithRoom = (app: Application, room: any) => {
        // Optimistically open the session UI instantly
        setActiveSessionRoomId(room.id);
        setActiveSessionAppId(app.id);
        setRoomSelectionApp(null);

        // Run the backend updates asynchronously in the background
        const runUpdates = async () => {
            try {
                setIsLoading(true);
                // 1. Update the room to occupied
                await useRoomStore.getState().updateRoom(room.id, {
                    status: 'OCCUPIED',
                    current_application_id: app.id,
                    current_applicant_name: app.applicant_name,
                    occupied_since: new Date().toISOString()
                });

                // 2. Create queue entry for FINAL stage
                const queueEntry = await QueueService.assignQueue({
                    applicationId: app.id,
                    applicantName: app.applicant_name,
                    queueType: 'FINAL',
                    interviewerId: authUser?.id,
                    interviewerName: authUser?.full_name
                });

                // 3. Immediately set the queue entry to CALLED with the room name
                await QueueService.update(queueEntry.id, {
                    status: 'CALLED',
                    called_at: new Date().toISOString(),
                    assigned_room_name: room.room_name
                });

                // 4. Update the application status to INTERVIEW_IN_PROGRESS
                await ApplicationService.updateStatus({
                    id: app.id,
                    fromStatus: app.current_status,
                    toStatus: 'INTERVIEW_IN_PROGRESS',
                    changedByName: authUser?.full_name || 'OPS Validator',
                    reason: `Interview initiated by validator in Room ${room.room_name}`,
                    patch: {
                        overall_status: 'OPEN',
                        final_specific_status: 'OV - Interview In Progress',
                        metadata: {
                            ...(app.metadata || {}),
                            active_interview_type: 'FINAL',
                            active_ops_validator_name: authUser?.full_name || 'OPS Validator',
                            ops_validator_status: 'IN_PROGRESS',
                            'Specific Status': 'OV - Interview In Progress',
                            final_specific_status: 'OV - Interview In Progress'
                        },
                        pis: {
                            ...(app.pis || {}),
                            ops_validator_status: 'IN_PROGRESS',
                            final_specific_status: 'OV - Interview In Progress'
                        }
                    } as any
                });

                success('Call Initiated', `${app.applicant_name} has been queued and called to Room ${room.room_name}.`);

                // Refresh data
                void loadData(true);
            } catch {
                error('Call Failed', 'Failed to properly initialize room or queue.');
            } finally {
                setIsLoading(false);
            }
        };

        void runUpdates();
    };

    const getAssignedRoom = (appId: string) => {
        return rooms.find(r => r.current_application_id === appId);
    };

    const handleUpdateCandidateStatus = async (app: Application, newStatus: string) => {
        try {
            setIsLoading(true);
            const isClientPhase = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(String(app.current_status || '').toUpperCase());

            let currentStatus = newStatus;
            let specStatus = isClientPhase ? 'Client Interview Pending' : 'OV - Pending';
            let ovStatus = isClientPhase ? String(app.metadata?.ops_validator_status || app.pis?.ops_validator_status || 'PASSED') : newStatus;
            let overallStatus = 'OPEN';
            let finalVerdict = newStatus;

            if (newStatus === 'PASSED') {
                currentStatus = 'PASSED';
                specStatus = isClientPhase ? 'Client Interview Passed' : 'OV - Passed';
                if (!isClientPhase) ovStatus = 'PASSED';
                overallStatus = 'PASSED';
                finalVerdict = 'PASSED';
            } else if (newStatus === 'FAILED') {
                currentStatus = 'FAILED';
                specStatus = isClientPhase ? 'Client Interview Failed' : 'OV - Failed';
                if (!isClientPhase) ovStatus = 'FAILED';
                overallStatus = 'FAILED';
                finalVerdict = 'FAILED';
            } else if (newStatus === 'NO_SHOW') {
                currentStatus = 'RESCHEDULED';
                specStatus = isClientPhase ? 'Client Interview No Show' : 'OV - No Show';
                if (!isClientPhase) ovStatus = 'No Show';
                overallStatus = 'NO_SHOW';
                finalVerdict = 'NO_SHOW';
            }

            const patchObj: any = {
                overall_status: overallStatus,
                final_verdict: finalVerdict,
                final_specific_status: specStatus,
                metadata: {
                    ...(app.metadata || {}),
                    'Specific Status': specStatus,
                    final_specific_status: specStatus
                },
                pis: {
                    ...(app.pis || {}),
                    final_specific_status: specStatus
                }
            };

            if (!isClientPhase) {
                patchObj.metadata.ops_validator_status = ovStatus;
                patchObj.pis.ops_validator_status = ovStatus;
            }

            await ApplicationService.updateStatus({
                id: app.id,
                fromStatus: app.current_status,
                toStatus: currentStatus as ApplicationStatus,
                changedByName: authUser?.full_name || 'OPS Validator',
                reason: `Status manually updated to ${newStatus} in Ops Validator ${isClientPhase ? 'Client Candidates' : 'Records'}`,
                patch: patchObj
            });

            success('Status Updated', `${app.applicant_name}'s status updated to ${newStatus === 'NO_SHOW' ? 'No show' : (newStatus === 'PASSED' ? 'Passed' : 'Failed')}.`);
            void loadData(true);
        } catch {
            error('Update Failed', 'Failed to update candidate status.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && applications.length === 0) {
        return (
            <div className="min-h-screen bg-[#f3f2f1] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-[#0078d4] border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Synchronizing Registry...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col h-full bg-[#f5f6f8] overflow-hidden p-4 gap-4">
            {/* --- HEADER (Application Management Style) --- */}
            <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-sm relative">
                <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
                    <button
                        onClick={() => navigate('/queue-display')}
                        className="flex items-center gap-2.5 px-4 py-2 bg-[#0078d4] hover:bg-[#005a9e] text-white text-[11px] font-semibold uppercase tracking-wider rounded-sm shadow-sm transition-all"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        <LayoutDashboard size={13} />
                        Live Display
                    </button>
                </div>
                <div className="relative px-8 py-8 flex flex-col items-center gap-2">
                    <h1
                        className="text-[32px] leading-none text-surface-900 tracking-[-0.02em]"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                    >
                        Interview Desk
                    </h1>
                    <div className="text-[12px] font-medium text-surface-400 tracking-[0.04em] tabular-nums uppercase">
                        {filteredList.length} {filteredList.length === 1 ? 'candidate' : 'candidates'}
                    </div>
                </div>

                {/* --- TABS --- */}
                <div className="flex justify-center gap-9 overflow-x-auto no-scrollbar px-8 border-t border-surface-200">
                    <button
                        onClick={() => setActiveTab('desk')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                            activeTab === 'desk' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <motion.span
                            className="inline-flex shrink-0"
                            animate={activeTab === 'desk' ? { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' } } : { scale: 1 }}
                        >
                            <Calendar
                                size={15}
                                className={cn(
                                    "transition-colors duration-200",
                                    activeTab === 'desk' ? "text-blue-600" : "text-surface-400 group-hover:text-blue-500"
                                )}
                            />
                        </motion.span>
                        <span className={cn("transition-colors", activeTab === 'desk' && "text-surface-900")}>Interview schedules</span>
                        <span
                            className={cn(
                                "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center transition-colors shrink-0 tabular-nums",
                                activeTab === 'desk'
                                    ? "bg-blue-100 text-blue-600"
                                    : activeCandidates.length > 0
                                        ? "bg-blue-50 text-blue-500"
                                        : "bg-surface-100 text-surface-500"
                            )}
                        >
                            {activeCandidates.length}
                        </span>
                        {activeTab === 'desk' && (
                            <motion.span
                                layoutId="tab-underline-guest"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500"
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                            />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('records')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                            activeTab === 'records' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <motion.span
                            className="inline-flex shrink-0"
                            animate={activeTab === 'records' ? { y: [0, -3, 0], rotate: [0, -5, 5, 0], transition: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } } : { y: 0, rotate: 0 }}
                        >
                            <HistoryIcon
                                size={15}
                                className={cn(
                                    "transition-colors duration-200",
                                    activeTab === 'records' ? "text-emerald-600" : "text-surface-400 group-hover:text-emerald-500"
                                )}
                            />
                        </motion.span>
                        <span className={cn("transition-colors", activeTab === 'records' && "text-surface-900")}>Interview Records</span>
                        <span
                            className={cn(
                                "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center transition-colors shrink-0 tabular-nums",
                                activeTab === 'records'
                                    ? "bg-emerald-100 text-emerald-600"
                                    : pastCandidates.length > 0
                                        ? "bg-emerald-50 text-emerald-500"
                                        : "bg-surface-100 text-surface-500"
                            )}
                        >
                            {pastCandidates.length}
                        </span>
                        {activeTab === 'records' && (
                            <motion.span
                                layoutId="tab-underline-guest"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-emerald-500"
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                            />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('noshow')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                            activeTab === 'noshow' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <motion.span
                            className="inline-flex shrink-0"
                            animate={activeTab === 'noshow' ? { x: [-2, 2, -2, 2, 0], transition: { duration: 0.4 } } : { x: 0 }}
                        >
                            <UserX
                                size={15}
                                className={cn(
                                    "transition-colors duration-200",
                                    activeTab === 'noshow' ? "text-rose-600" : "text-surface-400 group-hover:text-rose-500"
                                )}
                            />
                        </motion.span>
                        <span className={cn("transition-colors", activeTab === 'noshow' && "text-surface-900")}>Interview No Show</span>
                        <span
                            className={cn(
                                "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center transition-colors shrink-0 tabular-nums",
                                activeTab === 'noshow'
                                    ? "bg-rose-100 text-rose-600"
                                    : noShowCandidates.length > 0
                                        ? "bg-rose-50 text-rose-500"
                                        : "bg-surface-100 text-surface-500"
                            )}
                        >
                            {noShowCandidates.length}
                        </span>
                        {activeTab === 'noshow' && (
                            <motion.span
                                layoutId="tab-underline-guest"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-rose-500"
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                            />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('client')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                            activeTab === 'client' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <motion.span
                            className="inline-flex shrink-0"
                            animate={activeTab === 'client' ? { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' } } : { scale: 1 }}
                        >
                            <UserCircle2
                                size={15}
                                className={cn(
                                    "transition-colors duration-200",
                                    activeTab === 'client' ? "text-purple-600" : "text-surface-400 group-hover:text-purple-500"
                                )}
                            />
                        </motion.span>
                        <span className={cn("transition-colors", activeTab === 'client' && "text-surface-900")}>For Client Candidates</span>
                        <span
                            className={cn(
                                "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center transition-colors shrink-0 tabular-nums",
                                activeTab === 'client'
                                    ? "bg-purple-100 text-purple-600"
                                    : clientCandidates.length > 0
                                        ? "bg-purple-50 text-purple-500"
                                        : "bg-surface-100 text-surface-500"
                            )}
                        >
                            {clientCandidates.length}
                        </span>
                        {activeTab === 'client' && (
                            <motion.span
                                layoutId="tab-underline-guest"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-purple-500"
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* --- FILTERS & CONTROLS --- */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-white dark:bg-slate-900 p-3 border border-surface-200 rounded-sm shadow-sm shrink-0">
                <div className="flex-1 w-full relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-[#0078d4] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search candidates, roles, or email addresses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-transparent border border-surface-200 text-xs font-medium focus:border-[#0078d4] focus:ring-0 transition-all rounded-sm placeholder:text-surface-400"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end relative">
                    <button
                        onClick={() => setShowOnlyMyEndorsements(!showOnlyMyEndorsements)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 border text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all select-none",
                            showOnlyMyEndorsements
                                ? "bg-blue-50 border-blue-500 text-blue-700 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                                : "bg-white dark:bg-slate-900 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                        )}
                    >
                        <UserCircle2 size={14} className={showOnlyMyEndorsements ? "text-blue-600 animate-pulse" : "text-blue-500"} />
                        My Endorsements
                    </button>

                    <button
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 text-[10px] font-bold uppercase tracking-wider text-surface-900 rounded-sm hover:bg-surface-50 transition-all select-none"
                    >
                        <Filter size={14} className="text-surface-400" />
                        {statusFilter === 'ALL' ? 'All Statuses' :
                            statusFilter === 'HIRED' ? 'Accepted Offer' :
                                statusFilter === 'PASSED' ? 'For Job Offer' :
                                    statusFilter === 'FAILED' ? 'Failed' : 'Pending'}
                        <ChevronDown size={12} className="text-surface-300" />
                    </button>

                    {showStatusDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-lg z-20 py-1 min-w-[140px] text-left">
                                {[
                                    { value: 'ALL', label: 'All Statuses' },
                                    { value: 'HIRED', label: 'Accepted Offer' },
                                    { value: 'PASSED', label: 'For Job Offer' },
                                    { value: 'FAILED', label: 'Failed' },
                                    { value: 'PENDING', label: 'Pending' }
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            setStatusFilter(item.value as any);
                                            setShowStatusDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-2 text-[11px] font-semibold hover:bg-surface-50 transition-colors uppercase tracking-wider block",
                                            statusFilter === item.value ? "text-[#0078d4] bg-blue-50/50" : "text-surface-700"
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* --- TABLE CONTENT --- */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-sm">
                <GuestApplicantTable
                    applicants={filteredList}
                    viewMode={['desk', 'client'].includes(activeTab) ? 'active' : 'history'}
                    onRowClick={(app) => setSelectedApplicantProfile(app)}
                    emptyMessage={
                        activeTab === 'desk' ? "Registry Standby: Awaiting candidate endorsement tokens..." :
                            activeTab === 'records' ? "No historical records found in your evaluation logs." :
                                activeTab === 'client' ? "No client candidates found for this account." :
                                    "No 'No Show' candidates found."
                    }
                    activeAccount={resolvedActiveAccount}
                    onStatusChange={['records', 'client'].includes(activeTab) ? handleUpdateCandidateStatus : undefined}
                    renderActions={(app) => {
                        if (activeTab === 'desk') {
                            const isToday = isScheduleToday(app.endorsement_meeting_date);
                            const isAssigned = isAssignedToCurrentValidator(app);
                            const roomOccupied = rooms.find(r => r.status === 'OCCUPIED' && r.current_application_id === app.id);
                            const isOngoing = Boolean(
                                roomOccupied ||
                                app.current_status === 'INTERVIEW_IN_PROGRESS' ||
                                String(app.metadata?.ops_validator_status || '').toUpperCase() === 'IN_PROGRESS' ||
                                String(app.metadata?.final_specific_status || '').toUpperCase().includes('PROGRESS')
                            );

                            return (
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (roomOccupied) {
                                                setActiveSessionRoomId(roomOccupied.id);
                                            } else {
                                                void handleInitiate(app);
                                            }
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-sm whitespace-nowrap text-white transition-colors",
                                            !isAssigned
                                                ? "bg-amber-600 hover:bg-amber-700"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                        )}
                                        title={!isAssigned ? "Validator Not Met" : "Start Interview"}
                                    >
                                        <Play size={12} fill="currentColor" />
                                        <span>{!isAssigned ? "Validator not met" : "Start Interview"}</span>
                                    </motion.button>

                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setRescheduleApp(app);
                                        }}
                                        className="px-3 py-1.5 text-[10px] font-bold bg-[#efebeb] text-surface-700 hover:bg-[#e1dfdd] uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                                        title="Request Reschedule"
                                    >
                                        <Calendar size={12} />
                                        <span>Request Reschedule</span>
                                    </motion.button>
                                </div>
                            );
                        }
                        if (activeTab === 'noshow') {
                            const isAssigned = isAssignedToCurrentValidator(app);
                            return (
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleInitiate(app);
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-sm whitespace-nowrap text-white transition-colors",
                                            !isAssigned
                                                ? "bg-amber-600 hover:bg-amber-700"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                        )}
                                        title={!isAssigned ? "Validator Not Met" : "Start Interview"}
                                    >
                                        <Play size={12} fill="currentColor" />
                                        <span>{!isAssigned ? "Validator not met" : "Start Interview"}</span>
                                    </motion.button>

                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setRescheduleApp(app);
                                        }}
                                        className="px-3 py-1.5 text-[10px] font-bold bg-[#efebeb] text-surface-700 hover:bg-[#e1dfdd] uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                                        title="Request Reschedule"
                                    >
                                        <Calendar size={12} />
                                        <span>Request Reschedule</span>
                                    </motion.button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedApplicantProfile(app);
                                        }}
                                        className="p-2 text-surface-400 hover:text-[#0078d4] hover:bg-surface-50 rounded-sm transition-all"
                                        title="View Profile"
                                    >
                                        <UserCircle2 size={18} />
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedApplicantProfile(app);
                                }}
                                className="p-2 text-surface-400 hover:text-[#0078d4] hover:bg-surface-50 rounded-sm transition-all"
                                title="View Records"
                            >
                                <UserCircle2 size={18} />
                            </button>
                        );
                    }}
                />
            </div>

            {/* Virtual Interview Overlay */}
            <AnimatePresence>
                {activeSessionRoomId && (
                    <InterviewSession
                        roomId={activeSessionRoomId}
                        rooms={rooms}
                        applications={applications}
                        stage="FINAL"
                        onClose={() => {
                            setActiveSessionRoomId(null);
                            setActiveSessionAppId(null);
                        }}
                        onComplete={(summary) => {
                            setActiveSessionRoomId(null);
                            setActiveSessionAppId(null);
                            setReceiptData(summary);
                            void loadData(true);
                        }}
                        isAssigningRoom={isLoading}
                        draftApplicantId={activeSessionAppId || undefined}
                    />
                )}
            </AnimatePresence>

            <ReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />

            {selectedApplicantProfile && (
                <FullscreenProfileView
                    open={true}
                    onClose={() => setSelectedApplicantProfile(null)}
                    applicant={selectedApplicantProfile}
                    pisOnly={false}
                    guestDeskMode={true}
                />
            )}

            {/* Room Selection Modal */}
            <AnimatePresence>
                {roomSelectionApp && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="bg-white dark:bg-slate-900 rounded-sm shadow-xl border border-surface-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] relative"
                        >
                            {/* Header */}
                            <div className="px-8 py-8 flex flex-col items-center border-b border-surface-200 bg-surface-50/20 text-center relative">
                                <button
                                    onClick={() => setRoomSelectionApp(null)}
                                    className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-700 transition-colors rounded-sm hover:bg-surface-100"
                                >
                                    <X size={15} />
                                </button>
                                <h3
                                    className="text-2xl text-surface-900 tracking-tight"
                                    style={{ fontFamily: 'var(--font-family-display)', fontWeight: 400, fontStyle: 'italic' }}
                                >
                                    Assign Interview Room
                                </h3>
                                <p className="text-[10px] text-surface-400 font-medium tracking-[0.05em] uppercase mt-2">
                                    Select an active room to initiate evaluation for <span className="font-bold text-surface-700">{roomSelectionApp.applicant_name}</span>
                                </p>
                            </div>

                            {/* Microsoft Fluent-Style InfoBar (Clean static text) */}
                            <div className="mx-6 mt-4 p-3 bg-[#f0f6ff] border-l-4 border-[#0078d4] border border-[#d8e6f8] rounded-xs flex items-center gap-3 text-left shrink-0">
                                <Info size={16} className="text-[#0078d4] shrink-0" />
                                <div className="flex-1 text-xs text-surface-800 leading-relaxed">
                                    <span className="font-semibold text-surface-900">Room Selection:</span> If the interview will be conducted online, use <strong className="text-[#0078d4]">Online Rooms</strong>. If onsite, use <strong className="text-[#0078d4]">Onsite Rooms</strong>.
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex justify-center border-b border-surface-200 bg-surface-50/10 py-3 shrink-0">
                                <div className="bg-surface-100 p-0.5 rounded-sm flex gap-0.5 border border-surface-250">
                                    <button
                                        onClick={() => setRoomTypeTab('online')}
                                        className={cn(
                                            "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer",
                                            roomTypeTab === 'online'
                                                ? "text-surface-900 bg-white dark:bg-slate-900 border border-surface-250 shadow-xs"
                                                : "text-surface-500 hover:text-surface-800"
                                        )}
                                    >
                                        Online Rooms
                                    </button>
                                    <button
                                        onClick={() => setRoomTypeTab('onsite')}
                                        className={cn(
                                            "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer",
                                            roomTypeTab === 'onsite'
                                                ? "text-surface-900 bg-white dark:bg-slate-900 border border-surface-250 shadow-xs"
                                                : "text-surface-500 hover:text-surface-800"
                                        )}
                                    >
                                        Onsite Rooms
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 overflow-y-auto space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {rooms.filter(r => r.is_active && (r.room_type || 'onsite').toLowerCase() === roomTypeTab).map(room => {
                                        const isAvailable = room.status === 'AVAILABLE';

                                        // Pick room picture based on name if not explicitly set in room
                                        const getRoomPicture = (name: string) => {
                                            const lower = name.toLowerCase();
                                            if (lower.includes('earth')) return 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=500&q=80';
                                            if (lower.includes('busay')) return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=500&q=80';
                                            if (lower.includes('tops')) return 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=500&q=80';
                                            if (lower.includes('osmena') || lower.includes('peak')) return 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=500&q=80';
                                            return 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=500&q=80';
                                        };

                                        const roomImg = room.image_url || getRoomPicture(room.room_name || '');

                                        const canReenter = !isAvailable && roomSelectionApp && room.current_application_id === roomSelectionApp.id;

                                        return (
                                            <div
                                                key={room.id}
                                                className={cn(
                                                    "border rounded-sm overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col transition-all duration-150 relative",
                                                    isAvailable
                                                        ? "border-surface-200 hover:border-surface-400 hover:shadow-md"
                                                        : canReenter
                                                            ? "border-blue-400 bg-blue-50/20 hover:border-blue-500 hover:shadow-md"
                                                            : "border-surface-150 opacity-60 bg-surface-50/30"
                                                )}
                                            >
                                                {/* Image Container */}
                                                <div className="h-28 w-full overflow-hidden relative bg-surface-100">
                                                    <img
                                                        src={roomImg}
                                                        alt={room.room_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                                                    {/* Status Badge */}
                                                    <div className="absolute top-2 right-2">
                                                        <span className={cn(
                                                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm backdrop-blur-md flex items-center gap-1 shadow-sm border",
                                                            isAvailable
                                                                ? "bg-emerald-500/95 border-emerald-400 text-white"
                                                                : "bg-amber-500/95 border-amber-400 text-white"
                                                        )}>
                                                            <span className={cn("w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900", isAvailable && "animate-ping")} />
                                                            {room.status}
                                                        </span>
                                                    </div>

                                                    {/* Info text overlaid on image */}
                                                    <div className="absolute bottom-2 left-3 right-3 text-white">
                                                        <span className="text-[8px] font-extrabold uppercase tracking-widest text-blue-200">
                                                            Room {room.room_number}
                                                        </span>
                                                        <h4 className="text-xs font-bold uppercase tracking-tight truncate mt-0.5">
                                                            {room.room_name}
                                                        </h4>
                                                    </div>
                                                </div>

                                                {/* Bottom Action Area */}
                                                <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                                                    <p className="text-[9px] text-surface-400 font-semibold uppercase tracking-wider">
                                                        {isAvailable
                                                            ? "Ready for candidate"
                                                            : `In session: ${room.current_applicant_name || 'Anonymous'}`
                                                        }
                                                    </p>

                                                    <button
                                                        disabled={!isAvailable && !canReenter}
                                                        onClick={() => {
                                                            if (canReenter) {
                                                                setActiveSessionRoomId(room.id);
                                                            } else {
                                                                void handleCallWithRoom(roomSelectionApp!, room);
                                                            }
                                                            setRoomSelectionApp(null);
                                                        }}
                                                        className={cn(
                                                            "w-full py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm flex items-center justify-center gap-1 transition-all shadow-sm border border-transparent",
                                                            isAvailable
                                                                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                                                : canReenter
                                                                    ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                                                    : "bg-surface-100 text-surface-400 border-surface-200 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <Play size={9} fill={isAvailable || canReenter ? "currentColor" : "none"} />
                                                        {canReenter ? "Re-enter Session" : "Select & Call"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {rooms.filter(r => r.is_active && (r.room_type || 'onsite').toLowerCase() === roomTypeTab).length === 0 && (
                                        <div className="col-span-full text-center py-12 text-surface-400 text-xs uppercase tracking-wider font-bold">
                                            No active rooms configured for this type
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reschedule Request Modal */}
            <AnimatePresence>
                {rescheduleApp && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="bg-white dark:bg-slate-900 rounded-sm shadow-xl border border-surface-300 w-full max-w-md overflow-hidden flex flex-col relative"
                        >
                            {/* Header */}
                            <div className="px-6 py-6 flex flex-col items-center border-b border-surface-200 bg-surface-50/20 text-center relative">
                                <button
                                    onClick={() => {
                                        setRescheduleApp(null);
                                        setRescheduleReason('');
                                    }}
                                    className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-700 transition-colors rounded-sm hover:bg-surface-100"
                                >
                                    <X size={15} />
                                </button>
                                <div className="p-2 bg-rose-50 rounded-full text-rose-600 mb-2">
                                    <Calendar size={20} />
                                </div>
                                <h3
                                    className="text-xl text-surface-900 tracking-tight"
                                    style={{ fontFamily: 'var(--font-family-display)', fontWeight: 400, fontStyle: 'italic' }}
                                >
                                    Request Reschedule
                                </h3>
                                <p className="text-[10px] text-surface-400 font-medium tracking-[0.05em] uppercase mt-2">
                                    Queue reschedule workflow for <span className="font-bold text-surface-700">{rescheduleApp.applicant_name}</span>
                                </p>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                        Reason for Rescheduling
                                    </label>
                                    <textarea
                                        value={rescheduleReason}
                                        onChange={(e) => setRescheduleReason(e.target.value)}
                                        placeholder="Provide specific details (e.g., candidate asked to move to tomorrow morning, no show after 15 mins, internet issues)..."
                                        className="w-full min-h-[100px] p-3 text-[11px] border border-surface-300 rounded-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all placeholder:text-surface-400 bg-surface-50/50"
                                    />
                                </div>

                                {/* Preset Suggestions */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-surface-400">
                                        Quick Templates
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            'Candidate requested later schedule',
                                            'Candidate No-Show (Failed to connect)',
                                            'Technical / Internet connectivity issues',
                                            'Interviewer schedule conflict',
                                            'Line connection dropped during call'
                                        ].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setRescheduleReason(preset)}
                                                className="px-2 py-1 text-[10px] bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-sm text-surface-600 transition-colors text-left"
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRescheduleApp(null);
                                        setRescheduleReason('');
                                    }}
                                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border border-surface-300 bg-white dark:bg-slate-900 hover:bg-surface-50 rounded-sm text-surface-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleRequestReschedule(rescheduleApp, rescheduleReason)}
                                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-sm shadow-sm transition-colors flex items-center gap-1.5"
                                >
                                    <Send size={11} />
                                    Submit Request
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Schedule Not Met Warning Modal */}
            <AnimatePresence>
                {scheduleWarningApp && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="bg-white dark:bg-slate-900 rounded-sm shadow-xl border border-surface-300 w-full max-w-md overflow-hidden flex flex-col relative"
                        >
                            {/* Header */}
                            <div className="px-6 py-6 flex flex-col items-center border-b border-surface-200 bg-surface-50/20 text-center relative">
                                <button
                                    onClick={() => setScheduleWarningApp(null)}
                                    className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-700 transition-colors rounded-sm hover:bg-surface-100"
                                >
                                    <X size={15} />
                                </button>
                                <div className="p-2 bg-amber-50 rounded-full text-amber-600 mb-2">
                                    <AlertCircle size={20} />
                                </div>
                                <h3
                                    className="text-xl text-surface-900 tracking-tight"
                                    style={{ fontFamily: 'var(--font-family-display)', fontWeight: 400, fontStyle: 'italic' }}
                                >
                                    Schedule Not Met
                                </h3>
                                <p className="text-[10px] text-surface-400 font-medium tracking-[0.05em] uppercase mt-2">
                                    Attention required for <span className="font-bold text-surface-700">{scheduleWarningApp.applicant_name}</span>
                                </p>
                            </div>

                            {/* Body */}
                            <div className="p-6 text-center space-y-2">
                                <p className="text-xs text-surface-600">
                                    The scheduled interview time for this candidate is not today.
                                </p>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                                    Scheduled: {scheduleWarningApp.endorsement_meeting_date ? new Date(scheduleWarningApp.endorsement_meeting_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No schedule set'}
                                </p>
                                <p className="text-xs text-surface-700 font-semibold mt-4">
                                    Are you sure you want to proceed and call this candidate anyway?
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setScheduleWarningApp(null)}
                                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border border-surface-300 bg-white dark:bg-slate-900 hover:bg-surface-50 rounded-sm text-surface-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const app = scheduleWarningApp;
                                        setScheduleWarningApp(null);
                                        void handleInitiate(app);
                                    }}
                                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-sm transition-colors"
                                >
                                    Proceed Anyway
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
