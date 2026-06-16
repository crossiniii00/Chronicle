import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApplicationService } from '@/services/ApplicationService';
import { QueueService } from '@/services/QueueService';
import { useToast } from '@/components/common/useToast';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    History as HistoryIcon,
    Search,
    Filter,
    ChevronDown,
    Play,
    UserCircle2,
    X,
    Send,
    AlertCircle,
    LayoutDashboard
} from 'lucide-react';
import type { ApplicationStatus, Application } from '@/types/application';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';
import { InterviewSession } from '@/components/features/InterviewRooms/InterviewSession';
import { GuestApplicantTable } from '@/components/features/ApplicantManagement/GuestApplicantTable';
import { ReceiptModal } from '@/pages/recruiter/components/InterviewRoomsUI';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';
import { checkValidatorAssignment } from './dashboardUtils';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';

export function InterviewDesk() {
    const navigate = useNavigate();
    const location = useLocation();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { error, success } = useToast();
    const [activeTab, setActiveTab] = useState<'desk' | 'records'>('desk');
    const [activeSessionRoomId, setActiveSessionRoomId] = useState<string | null>(null);

    const [deskSearchTerm, setDeskSearchTerm] = useState('');
    const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
    const searchTerm = activeTab === 'desk' ? deskSearchTerm : recordsSearchTerm;
    const setSearchTerm = (val: string) => {
        if (activeTab === 'desk') {
            setDeskSearchTerm(val);
        } else {
            setRecordsSearchTerm(val);
        }
    };

    const [receiptData, setReceiptData] = useState<any | null>(null);
    const [selectedApplicantProfile, setSelectedApplicantProfile] = useState<Application | null>(null);
    const [roomSelectionApp, setRoomSelectionApp] = useState<Application | null>(null);
    const [roomTypeTab, setRoomTypeTab] = useState<'onsite' | 'online'>('onsite');

    const [deskStatusFilter, setDeskStatusFilter] = useState<'ALL' | 'HIRED' | 'PASSED' | 'FAILED' | 'PENDING'>('ALL');
    const [recordsStatusFilter, setRecordsStatusFilter] = useState<'ALL' | 'HIRED' | 'PASSED' | 'FAILED' | 'PENDING'>('ALL');
    const statusFilter = activeTab === 'desk' ? deskStatusFilter : recordsStatusFilter;
    const setStatusFilter = (val: 'ALL' | 'HIRED' | 'PASSED' | 'FAILED' | 'PENDING') => {
        if (activeTab === 'desk') {
            setDeskStatusFilter(val);
        } else {
            setRecordsStatusFilter(val);
        }
    };

    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [rescheduleApp, setRescheduleApp] = useState<Application | null>(null);
    const [rescheduleReason, setRescheduleReason] = useState<string>('');
    const [scheduleWarningApp, setScheduleWarningApp] = useState<Application | null>(null);

    // Sync state from location redirect
    React.useEffect(() => {
        if (location.state) {
            const { activeTab: stateTab, statusFilter: stateFilter } = location.state as any;
            if (stateTab) {
                setActiveTab(stateTab);
                if (stateFilter) {
                    if (stateTab === 'desk') {
                        setDeskStatusFilter(stateFilter);
                    } else {
                        setRecordsStatusFilter(stateFilter);
                    }
                }
            }
        }
    }, [location.state]);

    const { user: authUser } = useAuthStore();
    const { rooms, loadRooms } = useRoomStore();

    const { activeAccount } = useActiveAccountStore();
    const accounts = parseAccounts(authUser?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const resolvedActiveAccount = (hasMultipleAccounts && activeAccount && accounts.some(a => a.toUpperCase() === activeAccount.toUpperCase()))
        ? activeAccount
        : accounts[0] || 'DOORDASH';

    const loadData = React.useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [fetchedApps] = await Promise.all([
                ApplicationService.getAll(),
                loadRooms(true)
            ]);
            setApplications(fetchedApps);
        } catch {
            error('Protocol Error', 'Failed to synchronize with central registry.');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [error, loadRooms]);

    React.useEffect(() => {
        void loadData();
        const interval = setInterval(() => void loadData(true), 15000);
        return () => clearInterval(interval);
    }, [loadData]);

    React.useEffect(() => {
        setShowStatusDropdown(false);
    }, [activeTab]);

    const isMatchingAccount = (app: Application) => {
        if (!app.department) return false;
        const depts = app.department.split(',').map(s => s.trim().toUpperCase());
        return depts.includes(resolvedActiveAccount.toUpperCase());
    };

    const isAssignedToCurrentValidator = (app: Application) => 
        checkValidatorAssignment(app, authUser) && isMatchingAccount(app);

    const activeCandidates = applications.filter(a => {
        const isFailedForActiveAccount = a.metadata?.failed_accounts?.some(
            (f: string) => f.trim().toUpperCase() === resolvedActiveAccount.toUpperCase()
        );
        if (isFailedForActiveAccount) return false;

        return (a.current_status === 'FINAL_INTERVIEW' || a.current_status === 'FINAL_INTERVIEW_SCHEDULED' || (a.current_status === 'QUEUE_ASSIGNED' && a.queue_type === 'FINAL') || a.current_status === 'INTERVIEW_IN_PROGRESS' || a.current_status === 'ENDORSED') &&
            isAssignedToCurrentValidator(a);
    });

    const pastCandidates = applications.filter(a => {
        const statusUpper = String(a.current_status || '').toUpperCase();
        const isFailedForActiveAccount = a.metadata?.failed_accounts?.some(
            (f: string) => f.trim().toUpperCase() === resolvedActiveAccount.toUpperCase()
        );
        const isPast = [
            'PASSED', 'FAILED', 'HIRED', 'HIRED_PROCESSED', 'REJECTED', 
            'FINAL_VERDICT', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 
            'FOR_JOB_OFFER', 'FOR JOB OFFER', 'FOR_PAN', 'FOR PAN', 
            'CONTRACT_SENT', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'WITHDRAWN', 
            'DISQUALIFIED', 'NOT_ELIGIBLE_FOR_REHIRE'
        ].includes(statusUpper);
        
        // Match validator assignment: either via active assignment, OR if they failed the active account
        const isAssigned = checkValidatorAssignment(a, authUser) || isFailedForActiveAccount;
        return (isPast || isFailedForActiveAccount) && isAssigned && isMatchingAccount(a);
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const filteredList = (activeTab === 'desk' ? activeCandidates : pastCandidates).filter(c => {
        const matchesSearch = c.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.applicant_id || c.id).toLowerCase().includes(searchTerm.toLowerCase());
            
        if (!matchesSearch) return false;
        if (statusFilter === 'ALL') return true;
        
        const status = c.final_verdict || c.current_status;
        const statusUpper = String(status || '').toUpperCase();
        
        const isHired = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(statusUpper);
        const isPassed = [
            'PASSED', 'CLIENT_ASSESSMENT', 
            'CLIENT_INTERVIEW', 'FINAL_VERDICT', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 
            'CONTRACT_SENT', 'FOR_PAN'
        ].includes(statusUpper) && !isHired;
        
        const isFailed = [
            'FAILED', 'REJECTED', 'DISQUALIFIED', 'WITHDRAWN', 
            'WITHDRAWN BY APPLICANT', 'NOT_ELIGIBLE_FOR_REHIRE'
        ].includes(statusUpper) || c.metadata?.failed_accounts?.some(
            (f: string) => f.trim().toUpperCase() === resolvedActiveAccount.toUpperCase()
        );
        
        if (statusFilter === 'HIRED') return isHired;
        if (statusFilter === 'PASSED') return isPassed;
        if (statusFilter === 'FAILED') return isFailed;
        if (statusFilter === 'PENDING') return !isPassed && !isFailed && !isHired;
        
        return true;
    });

    const handleInitiate = async (app: Application) => {
        setRoomTypeTab('onsite');
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
            const patch: any = {
                overall_status: 'OPEN',
                final_specific_status: 'OV - Reschedule',
                pis: {
                    ...(app.pis || {}),
                    final_specific_status: 'OV - Reschedule',
                    ops_validator_notes: reason || 'Reschedule requested by validator.'
                }
            };

            await ApplicationService.updateStatus({
                id: app.id,
                fromStatus: app.current_status,
                toStatus: 'FINAL_INTERVIEW_SCHEDULED' as ApplicationStatus,
                changedByName: authUser?.full_name || 'OPS Validator',
                reason: reason || 'Validator requested interview reschedule.',
                patch
            });

            success('Reschedule Requested', `${app.applicant_name} status updated to OV - Reschedule.`);
            setRescheduleApp(null);
            setRescheduleReason('');
            void loadData(true);
        } catch {
            error('Reschedule Failed', 'Failed to update candidate status.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCallWithRoom = async (app: Application, room: any) => {
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
                reason: `Interview initiated by validator in Room ${room.room_name}`
            });

            success('Call Initiated', `${app.applicant_name} has been queued and called to Room ${room.room_name}.`);
            
            // 5. Open the interview session workbench
            setActiveSessionRoomId(room.id);
            
            // Refresh data
            void loadData(true);
        } catch {
            error('Call Failed', 'Failed to properly initialize room or queue.');
        } finally {
            setIsLoading(false);
        }
    };

    const getAssignedRoom = (appId: string) => {
        return rooms.find(r => r.current_application_id === appId);
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
            <div className="bg-white border border-[#edebe9] rounded-sm shadow-sm relative">
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
                </div>
            </div>

            {/* --- FILTERS & CONTROLS --- */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 border border-surface-200 rounded-sm shadow-sm shrink-0">
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
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white border border-surface-200 text-[10px] font-bold uppercase tracking-wider text-surface-900 rounded-sm hover:bg-surface-50 transition-all select-none"
                    >
                        <Filter size={14} className="text-surface-400" />
                        {statusFilter === 'ALL' ? 'All Statuses' : 
                         statusFilter === 'HIRED' ? 'Hired' :
                         statusFilter === 'PASSED' ? 'Passed' : 
                         statusFilter === 'FAILED' ? 'Failed' : 'Pending'}
                        <ChevronDown size={12} className="text-surface-300" />
                    </button>
                    
                    {showStatusDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                            <div className="absolute right-0 top-full mt-1 bg-white border border-surface-200 rounded-sm shadow-lg z-20 py-1 min-w-[140px] text-left">
                                {[
                                    { value: 'ALL', label: 'All Statuses' },
                                    { value: 'HIRED', label: 'Hired' },
                                    { value: 'PASSED', label: 'Passed' },
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
            <div className="flex-1 min-h-0 overflow-y-auto bg-white border border-[#edebe9] rounded-sm shadow-sm">
                <GuestApplicantTable
                    applicants={filteredList}
                    viewMode={activeTab === 'desk' ? 'active' : 'history'}
                    onRowClick={(app) => setSelectedApplicantProfile(app)}
                    emptyMessage={activeTab === 'desk' ? "Registry Standby: Awaiting candidate endorsement tokens..." : "No historical records found in your evaluation logs."}
                    renderActions={(app) => {
                        if (activeTab === 'desk') {
                            const isToday = isScheduleToday(app.endorsement_meeting_date);
                            return (
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isToday) {
                                                void handleInitiate(app);
                                            } else {
                                                setScheduleWarningApp(app);
                                            }
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-sm whitespace-nowrap text-white transition-colors",
                                            isToday 
                                                ? "bg-emerald-600 hover:bg-emerald-700" 
                                                : "bg-rose-600 hover:bg-rose-700"
                                        )}
                                        title={isToday ? "Call Candidate" : "Schedule Not Met"}
                                    >
                                        <Play size={12} fill="currentColor" className={cn(isToday && "animate-pulse")} />
                                        <span>{isToday ? "Call candidate" : "Schedule not met"}</span>
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
                        onClose={() => setActiveSessionRoomId(null)}
                        onComplete={(summary) => {
                            setActiveSessionRoomId(null);
                            setReceiptData(summary);
                            void loadData(true);
                        }}
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
                            className="bg-white rounded-sm shadow-xl border border-surface-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] relative"
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

                            {/* Tabs */}
                            <div className="flex justify-center border-b border-surface-200 bg-surface-50/10 py-3 shrink-0">
                                <div className="bg-surface-100 p-0.5 rounded-sm flex gap-0.5 border border-surface-250">
                                    <button
                                        onClick={() => setRoomTypeTab('onsite')}
                                        className={cn(
                                            "px-4 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer",
                                            roomTypeTab === 'onsite' 
                                                ? "text-surface-900 bg-white border border-surface-250 shadow-xs" 
                                                : "text-surface-500 hover:text-surface-800"
                                        )}
                                    >
                                        Onsite Rooms
                                    </button>
                                    <button
                                        onClick={() => setRoomTypeTab('online')}
                                        className={cn(
                                            "px-4 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer",
                                            roomTypeTab === 'online' 
                                                ? "text-surface-900 bg-white border border-surface-250 shadow-xs" 
                                                : "text-surface-500 hover:text-surface-800"
                                        )}
                                    >
                                        Online Rooms
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
                                                    "border rounded-sm overflow-hidden bg-white shadow-sm flex flex-col transition-all duration-150 relative",
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
                                                            <span className={cn("w-1.5 h-1.5 rounded-full bg-white", isAvailable && "animate-ping")} />
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
                            className="bg-white rounded-sm shadow-xl border border-surface-300 w-full max-w-md overflow-hidden flex flex-col relative"
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
                                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border border-surface-300 bg-white hover:bg-surface-50 rounded-sm text-surface-700 transition-colors"
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
                            className="bg-white rounded-sm shadow-xl border border-surface-300 w-full max-w-md overflow-hidden flex flex-col relative"
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
                                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border border-surface-300 bg-white hover:bg-surface-50 rounded-sm text-surface-700 transition-colors"
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
