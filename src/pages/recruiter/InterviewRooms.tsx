import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, CircleDot, Plus, RefreshCw, Wifi, MapPin } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '@/components/common/Modal';
import { InterviewSession } from '@/components/features/InterviewRooms/InterviewSession';
import { useInterviewRooms } from './hooks/useInterviewRooms';
import { RoomCard, AddRoomModal, EditRoomModal, ReceiptModal } from './components/InterviewRoomsUI';
import { useToast } from '@/components/common/useToast';
import { useAuthStore } from '@/store/authStore';

type RoomTab = 'onsite' | 'online';
const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function InterviewRooms() {
    const { success, error } = useToast();
    const { user } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<RoomTab>('onsite');
    const {
        rooms, loadingRooms, loadingApps, loadRooms, loadData,
        addModal, setAddModal, newRoom, setNewRoom, isSubmitting,
        editRoomId, setEditRoomId, editRoomData, setEditRoomData, openEditModal, handleSaveEdit,
        activeSessionRoomId, setActiveSessionRoomId,
        deleteConfirmRoom, setDeleteConfirmRoom, deletingRoomId,
        receiptData, setReceiptData, applications,
        handleAdd, toggleActive, handleDeleteRoom, freeRoom, setRefreshKey
    } = useInterviewRooms();

    // Derive online sessions from applications with interview_mode: 'ONLINE' currently in rooms
    const onlineRooms = rooms.filter(r => {
        if (r.room_type === 'online') return true;
        if (!r.current_application_id) return false;
        const app = applications.find(a => a.id === r.current_application_id);
        return app?.metadata?.interview_mode === 'ONLINE';
    });

    const onsiteRooms = rooms.filter(r => {
        if (r.room_type === 'online') return false;
        if (!r.current_application_id) return true; // unoccupied rooms show in on-site
        const app = applications.find(a => a.id === r.current_application_id);
        return app?.metadata?.interview_mode !== 'ONLINE';
    });

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
            <div className="bg-white border-b border-surface-200 shrink-0">
                <div className="relative px-6 pt-5 pb-3 flex flex-col items-center justify-center border-b border-surface-100">
                    <div className="flex items-center gap-2.5">
                        <Building2 size={17} className="text-[#605e5c] self-center" />
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
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar text-left">
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
                                onStart={() => {
                                    const app = applications.find(a => a.id === room.current_application_id);
                                    if (app) {
                                        const isFinal = app.queue_type === 'FINAL';
                                        const assignedId = isFinal 
                                            ? (app.assigned_ops_validator_id || app.metadata?.assigned_ops_validator_id)
                                            : (app.assigned_recruiter_id || app.metadata?.assigned_recruiter_id);
                                        const assignedName = isFinal
                                            ? (app.assigned_ops_validator_name || app.metadata?.assigned_ops_validator_name)
                                            : (app.assigned_recruiter_name || app.metadata?.assigned_recruiter_name);
                                        
                                        const isMatch = (assignedId && String(assignedId) === String(user?.id)) ||
                                            (assignedName && user?.full_name && assignedName.toLowerCase().trim() === user.full_name.toLowerCase().trim());
                                        
                                        if (!isMatch) {
                                            error('Access Denied', `Only the assigned interviewer (${assignedName || 'assigned interviewer'}) can enter this room.`);
                                            return;
                                        }
                                    }
                                    setActiveSessionRoomId(room.id);
                                }}
                                onFree={() => freeRoom(room.id)}
                                onToggleActive={() => toggleActive(room.id)}
                                onEdit={() => openEditModal(room)}
                                onDelete={() => setDeleteConfirmRoom(room.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <AddRoomModal open={addModal} onClose={() => !isSubmitting && setAddModal(false)} onAdd={() => handleAdd(activeTab)} newRoom={newRoom} setNewRoom={setNewRoom} isSubmitting={isSubmitting} />

            <EditRoomModal
                open={!!editRoomId}
                onClose={() => !isSubmitting && setEditRoomId(null)}
                onSave={handleSaveEdit}
                editRoom={editRoomData}
                setEditRoom={setEditRoomData}
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
        </div>
    );
}
