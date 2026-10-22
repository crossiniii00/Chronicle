import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, CircleDot, Plus, RefreshCw, Wifi, MapPin, Calendar, Trash2, XCircle, UserX, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '@/components/common/Modal';
import { InterviewSession } from '@/components/features/InterviewRooms/InterviewSession';
import { useInterviewRooms } from './hooks/useInterviewRooms';
import { RoomCard, AddRoomModal, EditRoomModal, ReceiptModal } from './components/InterviewRoomsUI';
import { DailyCalendarModal } from './components/DailyCalendarModal';
import { useToast } from '@/components/common/useToast';
import { useAuthStore } from '@/store/authStore';
import { ApplicationService } from '@/services/ApplicationService';
import { SecretGamesDashboardModal } from '@/components/features/InterviewRooms/components/SecretGamesDashboardModal';

type RoomTab = 'onsite' | 'online';
const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function InterviewRooms() {
    const { success, error } = useToast();
    const { user } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<RoomTab>('onsite');
    const [calendarModal, setCalendarModal] = useState(false);
    const [resToDeleteData, setResToDeleteData] = useState<{ roomId: string; res: any } | null>(null);
    const [deletionProgress, setDeletionProgress] = useState<number | null>(null);
    const [freeingRoomModal, setFreeingRoomModal] = useState<any>(null);
    const [secretGamesOpen, setSecretGamesOpen] = useState(false);

    const {
        rooms, loadingRooms, loadingApps, loadRooms, loadData,
        addModal, setAddModal, newRoom, setNewRoom, isSubmitting,
        editRoomId, setEditRoomId, editRoomData, setEditRoomData, openEditModal, handleSaveEdit,
        availableInterviewers, users, departments,
        activeSessionRoomId, setActiveSessionRoomId,
        deleteConfirmRoom, setDeleteConfirmRoom, deletingRoomId,
        receiptData, setReceiptData, applications,
        handleAdd, toggleActive, handleDeleteRoom, freeRoom, concludeRoomWithVerdict, setRefreshKey, updateRoom
    } = useInterviewRooms();

    const triggerDeleteReservation = (roomId: string, res: any) => {
        setResToDeleteData({ roomId, res });
    };

    const executeDeleteReservation = () => {
        if (!resToDeleteData) return;
        const { roomId, res } = resToDeleteData;
        
        setDeletionProgress(0);
        const startTime = Date.now();
        const duration = 1200; 
        
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min(Math.round((elapsed / duration) * 100), 100);
            setDeletionProgress(percentage);
            
            if (percentage >= 100) {
                clearInterval(timer);
                
                handleDeleteReservation(roomId, res);
                
                setTimeout(() => {
                    setDeletionProgress(null);
                    setResToDeleteData(null);
                }, 300);
            }
        }, 30);
    };

    const handleDeleteReservation = useCallback((roomId: string, resToDelete: any) => {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;
        const newReservations = (room.reservations || []).filter(
            r => r !== resToDelete && (r.applicant_id !== resToDelete.applicant_id || r.time_slot !== resToDelete.time_slot)
        );
        updateRoom(roomId, { reservations: newReservations })
            .then(async () => {
                try {
                    const qEntries = await ((window as any).QueueService || {}).getTodaysQueue();
                    const entry = qEntries.find((e: any) => e.application_id === resToDelete.applicant_id);
                    if (entry) {
                        await (window as any).QueueService.update(entry.id, { 
                            status: 'WAITING', 
                            assigned_room_id: null, 
                            assigned_room_name: null 
                        });
                        
                        const targetStatus = entry.queue_type === 'FINAL' ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                        await ((window as any).ApplicationService || {}).updateStatus({
                            id: entry.application_id,
                            fromStatus: 'QUEUE_ASSIGNED',
                            toStatus: targetStatus,
                            changedByName: 'System (Reservation Cancel)',
                            reason: 'Reservation removed by recruiter',
                            patch: {
                                final_specific_status: 'Initial Undefined',
                                pis: {
                                    final_specific_status: 'Initial Undefined'
                                }
                            } as any
                        });
                    }
                } catch (e) {
                    console.error('Failed to clean up room queue on reservation deletion:', e);
                }
                success('Success', 'Reservation deleted successfully.');
            })
            .catch(err => {
                console.error(err);
                error('Error', 'Failed to delete reservation.');
            });
    }, [rooms, updateRoom, success, error]);

    const onlineRooms = rooms.filter(r => r.room_type === 'online');
    const onsiteRooms = rooms.filter(r => r.room_type !== 'online');

    const displayRooms = activeTab === 'onsite' ? onsiteRooms : onlineRooms;

    // Stats per tab
    const onsiteAvailable = onsiteRooms.filter(r => r.status === 'AVAILABLE' && r.is_active).length;
    const onsiteOccupied = onsiteRooms.filter(r => r.status === 'OCCUPIED').length;
    const onlineActive = onlineRooms.length;

    // Auto-open interview session when navigated from "Conduct Interview Online"
    useEffect(() => {
        const state = location.state as { autoOpenRoomId?: string } | null;
        if (state?.autoOpenRoomId && !loadingRooms && !loadingApps && rooms.length > 0) {
            const targetRoom = rooms.find(r => r.id === state.autoOpenRoomId);
            if (targetRoom && targetRoom.current_application_id) {
                // Switch to online tab if the room is an online session
                const app = applications.find(a => a.id === targetRoom.current_application_id);
                if (app?.metadata?.interview_mode === 'ONLINE') {
                    setActiveTab('online');
                }
                setActiveSessionRoomId(state.autoOpenRoomId);
                // Clear the state using react-router navigate so it doesn't re-trigger
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, loadingRooms, loadingApps, rooms, applications, setActiveSessionRoomId, navigate, location.pathname]);

    const handleComplete = useCallback((summary: any) => {
        setActiveSessionRoomId(null);
        setReceiptData(summary);
        loadRooms(true);
        loadData(true);
    }, [loadRooms, loadData]);

    if (loadingRooms || loadingApps) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-left">
                <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin text-left" />
                <span className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] animate-pulse text-left">Synchronizing Facility Telemetry...</span>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-in flex flex-col h-[calc(100vh-140px)] text-left">
            <div className="bg-white dark:bg-slate-900 border-b border-surface-200 shrink-0">
                <div className="relative px-6 pt-5 pb-3 flex flex-col items-center justify-center border-b border-surface-100">
                    <div className="flex items-center gap-2.5">
                        <Building2 size={17} className="text-[#605e5c] dark:text-slate-400 self-center" />
                        <h1
                            className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            Interview Rooms
                        </h1>
                    </div>
                    <div className="flex items-center gap-2.5 mt-3">
                        {activeTab === 'onsite' ? (
                            <>
                                <div className="flex items-center gap-1.5 px-2.5 h-7 bg-emerald-50 border border-emerald-200/60 rounded-sm">
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    <span className="text-[13px] font-semibold text-emerald-800 tabular-nums leading-none">{onsiteAvailable}</span>
                                    <span className="text-[9px] font-semibold text-emerald-700 uppercase tracking-[0.1em]">Available</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 h-7 bg-primary-50 border border-primary-200/60 rounded-sm">
                                    <CircleDot size={12} className="text-primary-600" />
                                    <span className="text-[13px] font-semibold text-primary-800 tabular-nums leading-none">{onsiteOccupied}</span>
                                    <span className="text-[9px] font-semibold text-primary-700 uppercase tracking-[0.1em]">In Use</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2.5 h-7 bg-purple-50 border border-purple-200/60 rounded-sm">
                                <Wifi size={12} className="text-purple-600" />
                                <span className="text-[13px] font-semibold text-purple-800 tabular-nums leading-none">{onlineActive}</span>
                                <span className="text-[9px] font-semibold text-purple-700 uppercase tracking-[0.1em]">Active</span>
                            </div>
                        )}
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => setCalendarModal(true)}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-surface-100 border border-surface-200 text-surface-700 text-[11.5px] font-medium tracking-[-0.005em] hover:bg-surface-200 transition-all rounded-sm"
                        >
                            <Calendar size={13} strokeWidth={2.25} />
                            Daily Calendar
                        </motion.button>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => setAddModal(true)}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-black text-white text-[11.5px] font-medium tracking-[-0.005em] hover:bg-black/85 transition-all rounded-sm"
                        >
                            <Plus size={13} strokeWidth={2.25} />
                            Add new room
                        </motion.button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center justify-center gap-9 px-6">
                    <button
                        onClick={() => setActiveTab('onsite')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                            activeTab === 'onsite' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <MapPin size={15} className="shrink-0 transition-colors text-surface-400 group-hover:text-surface-600" />
                        <span>On-site rooms</span>
                        <span className="min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center bg-surface-100 text-surface-500 tabular-nums">
                            {onsiteRooms.length}
                        </span>
                        {activeTab === 'onsite' && (
                            <motion.span
                                layoutId="interview-room-tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-emerald-500"
                                transition={SPRING}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('online')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                            activeTab === 'online' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <Wifi size={15} className="shrink-0 transition-colors text-surface-400 group-hover:text-surface-600" />
                        <span>Online rooms</span>
                        {onlineActive > 0 && (
                            <span className="min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center bg-purple-100 text-purple-600 tabular-nums">
                                {onlineActive}
                            </span>
                        )}
                        {activeTab === 'online' && (
                            <motion.span
                                layoutId="interview-room-tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-purple-500"
                                transition={SPRING}
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* Room Grid */}
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar text-left flex flex-col gap-6 pb-6">
                {displayRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        {activeTab === 'online' ? (
                            <>
                                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center">
                                    <Wifi size={28} className="text-purple-400" />
                                </div>
                                <div className="text-center flex flex-col items-center gap-3">
                                    <h3 className="text-sm font-bold text-surface-700 mb-1">No Active Online Sessions</h3>
                                    <p className="text-xs text-surface-400 max-w-xs leading-relaxed">Start an online interview from the Applicant Management page using the "Conduct Interview Online" button.</p>
                                    <Link
                                        to="/recruiter/tracker/management"
                                        className="mt-2 inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-purple-700 transition-all rounded-md shadow-sm"
                                    >
                                        Go to Applicant Management
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center">
                                    <Building2 size={28} className="text-surface-400" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-sm font-bold text-surface-700 mb-1">No Rooms Available</h3>
                                    <p className="text-xs text-surface-400">Create a new interview room to get started.</p>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,300px))] justify-center gap-4 pb-8 text-left">
                        {displayRooms.map(room => (
                            <RoomCard 
                                key={room.id} room={room} 
                                application={applications.find(a => a.id === room.current_application_id)}
                                onLogoClick={() => setSecretGamesOpen(true)}
                                onStart={() => {
                                    const app = applications.find(a => a.id === room.current_application_id);
                                     if (app) {
                                         const meta = typeof app.metadata === 'string' ? (() => { try { return JSON.parse(app.metadata); } catch { return {}; } })() : (app.metadata || {});
                                         const isFinal = (() => {
                                             if (meta.active_interview_type) return meta.active_interview_type === 'FINAL';
                                             if (app.current_status === 'FINAL_INTERVIEW' || app.current_status === 'REPROFILE_FINAL_INTERVIEW') return true;
                                             if (app.current_status === 'INITIAL_INTERVIEW') return false;
                                             return app.queue_type === 'FINAL';
                                         })();
                                         const assignedId = isFinal 
                                             ? (app.assigned_ops_validator_id || meta?.assigned_ops_validator_id || meta?.active_ops_validator_id || meta?.ops_validator_id)
                                             : (app.assigned_recruiter_id || meta?.assigned_recruiter_id);
                                         const assignedName = isFinal
                                             ? (app.assigned_ops_validator_name || meta?.assigned_ops_validator_name || meta?.active_ops_validator_name || meta?.ops_validator_name || (app.pis as any)?.ops_validator_name)
                                             : (app.assigned_recruiter_name || meta?.assigned_recruiter_name);
                                         
                                         const activeAccount = meta?.reprofile_active_account || meta?.assigned_account || app.department || '';
                                         const rawDeptString = `${app.department || ''}, ${activeAccount}`;
                                         const userDepts = (user?.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                                         const appDepts = rawDeptString.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);

                                         const sharesDept = userDepts.length === 0 || userDepts.some(ud => 
                                             appDepts.some(ad => ud === ad || ud.includes(ad) || ad.includes(ud))
                                         );

                                         const isOnline = room.room_type === 'online' || meta?.interview_mode === 'ONLINE';
                                         const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
                                         const isOpsValidatorUser = user?.role === 'guest' || user?.role === 'ops_validator';

                                         const isUnassigned = !assignedId || !assignedName || assignedName === 'Not assigned' || assignedName === 'Unassigned';

                                         const isMatch = isAdmin || 
                                             isOnline ||
                                             isUnassigned ||
                                             (assignedId && String(assignedId) === String(user?.id)) ||
                                             (assignedName && user?.full_name && assignedName.toLowerCase().trim() === user.full_name.toLowerCase().trim()) ||
                                             (isOpsValidatorUser && sharesDept) ||
                                             sharesDept;
                                         
                                         if (!isMatch) {
                                             error('Access Denied', `Only the assigned interviewer (${assignedName || 'assigned interviewer'}) can enter this room.`);
                                             return;
                                         }

                                         // If recruiter/validator is unassigned, auto-claim this candidate for the active user
                                          if (isUnassigned && user?.full_name) {
                                              const isOpsVal = user.role === 'ops_validator' || isFinal;
                                              void ApplicationService.patch(app.id, {
                                                 ...(isOpsVal ? {
                                                     assigned_ops_validator_id: String(user.id),
                                                     assigned_ops_validator_name: user.full_name,
                                                     metadata: {
                                                         ...(meta || {}),
                                                         assigned_ops_validator_id: String(user.id),
                                                         assigned_ops_validator_name: user.full_name,
                                                         active_ops_validator_name: user.full_name
                                                     }
                                                 } : {
                                                     assigned_recruiter_id: String(user.id),
                                                     assigned_recruiter_name: user.full_name,
                                                     metadata: {
                                                         ...(meta || {}),
                                                         assigned_recruiter_id: String(user.id),
                                                         assigned_recruiter_name: user.full_name
                                                     }
                                                 })
                                             }).catch((err: any) => {
                                                 console.warn('[InterviewRooms] Auto-claim recruiter failed:', err);
                                             });
                                         }
                                     }
                                     setActiveSessionRoomId(room.id);
                                }}
                                onFree={() => {
                                    if (room.status === 'OCCUPIED' && room.current_applicant_name) {
                                        setFreeingRoomModal(room);
                                    } else {
                                        freeRoom(room.id);
                                    }
                                }}
                                onToggleActive={() => toggleActive(room.id)}
                                onEdit={() => openEditModal(room)}
                                onDelete={() => setDeleteConfirmRoom(room.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <AddRoomModal open={addModal} onClose={() => !isSubmitting && setAddModal(false)} onAdd={() => handleAdd(activeTab)} newRoom={newRoom} setNewRoom={setNewRoom} availableInterviewers={availableInterviewers} users={users} departments={departments} applications={applications} isSubmitting={isSubmitting} />
            <DailyCalendarModal open={calendarModal} onClose={() => setCalendarModal(false)} rooms={rooms} />

            <EditRoomModal
                open={!!editRoomId}
                onClose={() => !isSubmitting && setEditRoomId(null)}
                onSave={handleSaveEdit}
                editRoom={editRoomData}
                setEditRoom={setEditRoomData}
                availableInterviewers={availableInterviewers}
                users={users}
                departments={departments}
                applications={applications}
                isSubmitting={isSubmitting}
            />

            <ConfirmDialog
                open={!!deleteConfirmRoom}
                title="Delete Interview Room"
                message="Are you sure you want to remove this room? This action cannot be undone."
                confirmText="Delete Room"
                confirmClass="bg-rose-600 text-white font-bold text-sm rounded-lg shadow-sm text-left"
                loading={!!deletingRoomId}
                onConfirm={() => deleteConfirmRoom && handleDeleteRoom(deleteConfirmRoom)}
                onClose={() => setDeleteConfirmRoom(null)}
            />

            {/* Quick Conclude / Free Room Modal */}
            <AnimatePresence>
                {freeingRoomModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-xl max-w-md w-full p-6 text-left"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Conclude or Release Room</h3>
                                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                        Room: <span className="text-slate-700 dark:text-slate-300">{freeingRoomModal.room_name}</span> · Candidate: <span className="text-primary-700 font-extrabold">{freeingRoomModal.current_applicant_name}</span>
                                    </p>
                                </div>
                                <button onClick={() => setFreeingRoomModal(null)} className="text-slate-400 hover:text-slate-600">
                                    <CheckCircle2 size={18} className="rotate-45" />
                                </button>
                            </div>

                            <p className="text-xs text-slate-600 my-4 leading-relaxed">
                                Please select the final interview outcome decision for <strong className="text-slate-800 dark:text-slate-200">{freeingRoomModal.current_applicant_name}</strong> before releasing this room:
                            </p>

                            <div className="space-y-2.5">
                                <button
                                    onClick={async () => {
                                        const rId = freeingRoomModal.id;
                                        setFreeingRoomModal(null);
                                        await concludeRoomWithVerdict(rId, 'PASSED');
                                    }}
                                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-sm transition-all shadow-sm flex items-center justify-between cursor-pointer"
                                >
                                    <span>Mark as PASSED (Job Offer)</span>
                                    <CheckCircle2 size={16} />
                                </button>

                                <button
                                    onClick={async () => {
                                        const rId = freeingRoomModal.id;
                                        setFreeingRoomModal(null);
                                        await concludeRoomWithVerdict(rId, 'FAILED');
                                    }}
                                    className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-sm transition-all shadow-sm flex items-center justify-between cursor-pointer"
                                >
                                    <span>Mark as FAILED</span>
                                    <XCircle size={16} />
                                </button>

                                <button
                                    onClick={async () => {
                                        const rId = freeingRoomModal.id;
                                        setFreeingRoomModal(null);
                                        await concludeRoomWithVerdict(rId, 'NO_SHOW');
                                    }}
                                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-sm transition-all shadow-sm flex items-center justify-between cursor-pointer"
                                >
                                    <span>Mark as NO SHOW</span>
                                    <UserX size={16} />
                                </button>

                                <button
                                    onClick={async () => {
                                        const rId = freeingRoomModal.id;
                                        setFreeingRoomModal(null);
                                        await concludeRoomWithVerdict(rId, 'DRAFT');
                                    }}
                                    className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-sm transition-all shadow-sm flex items-center justify-between cursor-pointer"
                                >
                                    <span>Save to Drafts (Verdict Pending)</span>
                                    <CircleDot size={16} />
                                </button>

                                <button
                                    onClick={async () => {
                                        const rId = freeingRoomModal.id;
                                        setFreeingRoomModal(null);
                                        await concludeRoomWithVerdict(rId, 'RESET');
                                    }}
                                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-xs flex items-center justify-between cursor-pointer"
                                >
                                    <span>Reset / Free Room</span>
                                    <RotateCcw size={15} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeSessionRoomId && (
                    <InterviewSession
                        roomId={activeSessionRoomId}
                        rooms={rooms}
                        applications={applications}
                        onClose={() => setActiveSessionRoomId(null)}
                        onComplete={handleComplete}
                    />
                )}
            </AnimatePresence>

            <ReceiptModal receiptData={receiptData} onClose={() => { setReceiptData(null); setRefreshKey(k => k + 1); }} />

            <AnimatePresence>
                {resToDeleteData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={SPRING}
                            className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm w-full max-w-sm shadow-xl p-6 text-left flex flex-col gap-4 relative overflow-hidden"
                        >
                            {deletionProgress !== null ? (
                                <div className="py-6 flex flex-col items-center justify-center gap-4">
                                    <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest animate-pulse">
                                        Canceling Reservation...
                                    </span>
                                    <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden relative">
                                        <motion.div 
                                            className="h-full bg-rose-600"
                                            style={{ width: `${deletionProgress}%` }}
                                            transition={{ ease: 'easeOut' }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-surface-500 tabular-nums">
                                        {deletionProgress}%
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <h3 className="text-sm font-black text-surface-900 uppercase tracking-tight">
                                            Cancel Reservation
                                        </h3>
                                        <p className="text-xs text-surface-500 font-medium leading-relaxed">
                                            Are you sure you want to cancel the reservation for <strong className="text-surface-950 font-bold">{resToDeleteData.res.applicant_name}</strong> at <strong className="text-indigo-600 font-black">{resToDeleteData.res.time_slot}</strong>?
                                        </p>
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                        <button
                                            onClick={executeDeleteReservation}
                                            className="flex-1 py-3 bg-rose-600 text-white font-bold text-[10.5px] uppercase tracking-wider rounded-sm hover:bg-rose-700 transition-all shadow-sm"
                                        >
                                            Confirm Cancel
                                        </button>
                                        <button
                                            onClick={() => setResToDeleteData(null)}
                                            className="px-5 py-3 bg-white dark:bg-slate-900 border border-surface-200 text-surface-600 font-bold text-[10.5px] uppercase tracking-wider rounded-sm hover:bg-surface-50"
                                        >
                                            Abort
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Secret Games Dashboard */}
            <SecretGamesDashboardModal 
                open={secretGamesOpen} 
                onClose={() => setSecretGamesOpen(false)} 
            />
        </div>
    );
}
