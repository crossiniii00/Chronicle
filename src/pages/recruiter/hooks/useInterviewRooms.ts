import { useState, useEffect, useCallback, useRef } from 'react';
import { ApplicationService } from '@/services/ApplicationService';
import { DepartmentService } from '@/services/DepartmentService';
import { QueueService } from '@/services/QueueService';
import { UserService } from '@/services/UserService';
import { useRoomStore } from '@/store/roomStore';
import { useToast } from '@/components/common/useToast';
import { useLoading } from '@/components/common/useLoading';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/services/socketService';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import { useGlobalDataStore } from '@/store/globalDataStore';
import type { Application, QueueEntry, ApplicationStatus } from '@/types';

const parseTimeStrToMinutes = (timeStr: string) => {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
};

const formatMinutesToTimeStr = (totalMins: number) => {
    const normalized = ((totalMins % 1440) + 1440) % 1440;
    let h = Math.floor(normalized / 60);
    const m = normalized % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m.toString().padStart(2, '0');
    return `${displayH}:${displayM} ${period}`;
};

export function useInterviewRooms() {
    const { success, error } = useToast();
    const { withLoading } = useLoading();
    const [addModal, setAddModal] = useState(false);
    const [newRoom, setNewRoom] = useState<{ room_number: string; room_name: string; image_url: string; room_type?: string; assigned_interviewer_name?: string }>({ room_number: '', room_name: '', image_url: '', assigned_interviewer_name: '' });
    const [editRoomId, setEditRoomId] = useState<string | null>(null);
    const [editRoomData, setEditRoomData] = useState<{ room_number: string; room_name: string; image_url: string; room_type?: string; assigned_interviewer_name?: string }>({ room_number: '', room_name: '', image_url: '', assigned_interviewer_name: '' });
    const [availableInterviewers, setAvailableInterviewers] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeSessionRoomId, setActiveSessionRoomId] = useState<string | null>(null);
    const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<string | null>(null);
    const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
    const [receiptData, setReceiptData] = useState<any | null>(null);
    const { rooms, loading: loadingRooms, loadRooms, updateRoom, addRoom, deleteRoom } = useRoomStore();
    const { applications, isInitialized } = useGlobalDataStore();
    const freeingIdsRef = useRef<Set<string>>(new Set());

    const { user } = useAuthStore();

    useEffect(() => {
        if (loadingRooms || !isInitialized || !rooms || rooms.length === 0 || applications.length === 0) return;

        rooms.forEach(room => {
            if (!room.reservations || room.reservations.length === 0) return;
            const activeRes = room.reservations.filter(res => {
                const app = applications.find(a => a.id === res.applicant_id);
                if (!app) return false; // remove ghost reservations for deleted/purged applicants
                const statusUpper = (app.current_status || '').toUpperCase();

                // Remove if concluded or terminal stage reached
                const terminalStatuses = [
                    'FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED', 'NOT_ELIGIBLE_FOR_REHIRE',
                    'BLACKLISTED', 'PASSED', 'HIRED', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 
                    'HIRED_PROCESSED', 'SENT_JO_AND_BGC', 'FOR_PAN'
                ];
                if (terminalStatuses.includes(statusUpper)) return false;

                const sessionType = (res as any).session_type || 'INITIAL';

                // Remove if it's an INITIAL reservation and applicant is past INITIAL_INTERVIEW
                if (sessionType === 'INITIAL' && !['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED'].includes(statusUpper)) {
                    return false;
                }

                // Remove if it's a FINAL reservation and applicant is past FINAL_INTERVIEW
                if (sessionType === 'FINAL' && !['ASSESSMENT', 'FINAL_INTERVIEW', 'QUEUE_ASSIGNED'].includes(statusUpper)) {
                    return false;
                }

                return true;
            });
            if (activeRes.length !== room.reservations.length) {
                console.log(`[Clean Reservations] Removing old/concluded candidate reservations from room ${room.room_name || room.room_number}`);
                updateRoom(room.id, { reservations: activeRes }).catch(console.error);
            }
        });
    }, [rooms, applications, loadingRooms, isInitialized, updateRoom]);

    const pollData = useCallback(() => {
        if (!user) return;
        void loadRooms(true);
    }, [loadRooms, user]);

    useVisibilityPolling(pollData, 300000, [pollData]);

    useEffect(() => {
        if (!user) return;
        const socket = socketService.getSocket();
        const handleRoomsUpdate = () => { void loadRooms(true); };
        socket.on('rooms:updated', handleRoomsUpdate);
        return () => {
            socket.off('rooms:updated', handleRoomsUpdate);
        };
    }, [loadRooms, refreshKey, user]);

    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        UserService.getAll().then((uList: any[]) => {
            if (Array.isArray(uList)) {
                setUsers(uList);
                const names = uList.map(u => u.full_name).filter(Boolean);
                setAvailableInterviewers(Array.from(new Set(names)).sort());
            }
        }).catch(console.error);

        DepartmentService.getAll().then((dList: any[]) => {
            if (Array.isArray(dList)) {
                setDepartments(dList);
            }
        }).catch(console.error);
    }, []);

    const handleAdd = async (type: 'onsite' | 'online' = 'onsite') => {
        if (!newRoom.room_number) return;
        setIsSubmitting(true);
        try {
            await withLoading(async () => {
                await addRoom({
                    room_number: newRoom.room_number,
                    room_name: newRoom.room_name || `Room ${newRoom.room_number}`,
                    image_url: newRoom.image_url || null,
                    assigned_interviewer_name: newRoom.assigned_interviewer_name || null,
                    status: 'AVAILABLE',
                    is_active: true,
                    room_type: type,
                } as any);
            }, 'Provisioning facility...');
            setAddModal(false);
            success('Room Added', `Room ${newRoom.room_number} has been added.`);
            setNewRoom({ room_number: '', room_name: '', image_url: '', assigned_interviewer_name: '' });
        } catch (err) {
            error('Provisioning Failed', err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (room: any) => {
        setEditRoomId(room.id);
        const app = applications.find(a => a.id === room.current_application_id);
        const meta = typeof app?.metadata === 'string' ? (() => { try { return JSON.parse(app.metadata); } catch { return {}; } })() : (app?.metadata || {});
        const assignedName = room.assigned_interviewer_name || room.assigned_ops_validator_name || app?.assigned_ops_validator_name || meta.assigned_ops_validator_name || app?.assigned_recruiter_name || '';
        setEditRoomData({
            room_number: room.room_number,
            room_name: room.room_name || '',
            image_url: room.image_url || '',
            assigned_interviewer_name: assignedName === 'Not assigned' ? '' : assignedName
        });
    };

    const handleSaveEdit = async () => {
        if (!editRoomId || !editRoomData.room_number) return;
        setIsSubmitting(true);
        try {
            await withLoading(async () => {
                await updateRoom(editRoomId, {
                    room_number: editRoomData.room_number,
                    room_name: editRoomData.room_name || `Room ${editRoomData.room_number}`,
                    image_url: editRoomData.image_url || null,
                    assigned_interviewer_name: editRoomData.assigned_interviewer_name || null
                } as any);

                const room = rooms.find(r => r.id === editRoomId);
                if (room && room.current_application_id && editRoomData.assigned_interviewer_name) {
                    try {
                        await ApplicationService.update(room.current_application_id, {
                            assigned_ops_validator_name: editRoomData.assigned_interviewer_name,
                            assigned_recruiter_name: editRoomData.assigned_interviewer_name,
                            metadata: {
                                assigned_ops_validator_name: editRoomData.assigned_interviewer_name,
                                active_ops_validator_name: editRoomData.assigned_interviewer_name
                            }
                        } as any);
                    } catch (e) {
                        console.error('Failed to update candidate assigned interviewer:', e);
                    }
                }
            }, 'Updating facility...');
            setEditRoomId(null);
            success('Room Updated', `Room ${editRoomData.room_number} has been updated.`);
        } catch (err) {
            error('Update Failed', err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleActive = async (roomId: string) => {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;
        const newActive = !room.is_active;
        await withLoading(async () => {
            if (!newActive && room.current_application_id) {
                // Cleanup queue entry and revert applicant status if deactivating an occupied room
                const qEntries = await QueueService.getTodaysQueue();
                const entry = qEntries.find((e: QueueEntry) => e.application_id === room.current_application_id);
                if (entry) await QueueService.delete(entry.id);

                const app = applications.find(a => a.id === room.current_application_id);
                if (app && app.current_status === 'INTERVIEW_IN_PROGRESS') {
                    const isFinal = app.metadata?.active_interview_type === 'FINAL' || app.queue_type === 'FINAL' || (entry && entry.queue_type === 'FINAL');
                    const targetStatus = isFinal ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                    await ApplicationService.updateStatus({
                        id: app.id,
                        fromStatus: 'INTERVIEW_IN_PROGRESS',
                        toStatus: targetStatus,
                        changedByName: user?.full_name || 'System',
                        reason: 'Room deactivated',
                        patch: {
                            metadata: {
                                ...(app.metadata || {}),
                                active_interview_type: null
                            }
                        }
                    });
                }
                await updateRoom(roomId, {
                    is_active: false,
                    status: 'AVAILABLE',
                    current_application_id: null,
                    current_applicant_name: null,
                    occupied_since: null,
                    occupied_until: null
                });
            } else {
                await updateRoom(roomId, { is_active: newActive });
            }
        }, newActive ? 'Deploying facility...' : 'Retiring facility...');
    };

    const handleDeleteRoom = async (roomId: string) => {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;
        if (room.status === 'OCCUPIED') {
            error('Cannot Delete', 'Cannot delete a room that is currently occupied.');
            setDeleteConfirmRoom(null);
            return;
        }
        setDeletingRoomId(roomId);
        try {
            await deleteRoom(roomId);
            success('Room Deleted', `Room ${room.room_number} has been permanently removed.`);
        } catch {
            error('Delete Failed', 'Failed to delete room.');
        } finally {
            setDeletingRoomId(null);
            setDeleteConfirmRoom(null);
        }
    };

    const freeRoom = async (roomId: string) => {
        if (freeingIdsRef.current.has(roomId)) return;
        freeingIdsRef.current.add(roomId);

        const room = rooms.find(r => r.id === roomId);
        const remainingReservations = (room?.reservations || []).filter(
            (res: any) => res.applicant_id !== room?.current_application_id
        );
        const patch = { 
            status: 'AVAILABLE' as const, 
            current_application_id: null, 
            current_applicant_name: null, 
            occupied_since: null, 
            occupied_until: null,
            reservations: remainingReservations
        };
        try {
            await withLoading(async () => {
                if (room?.current_application_id) {
                    const qEntries = await QueueService.getTodaysQueue();
                    const entry = qEntries.find((e: any) => e.application_id === room.current_application_id);
                    if (entry) {
                        await QueueService.update(entry.id, { status: 'DRAFT', completed_at: new Date().toISOString() });
                    }

                    // Revert candidate status if currently stuck in INTERVIEW_IN_PROGRESS
                    const app = applications.find(a => a.id === room.current_application_id);
                    if (app && app.current_status === 'INTERVIEW_IN_PROGRESS') {
                        const isFinal = app.metadata?.active_interview_type === 'FINAL' || app.queue_type === 'FINAL' || (entry && entry.queue_type === 'FINAL');
                        const targetStatus = isFinal ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';

                        // Attempt to load any cached progress
                        let cachedProgress: any = {};
                        try {
                            const cacheKey = `interview_session_${app.id}`;
                            const cached = localStorage.getItem(cacheKey);
                            if (cached) {
                                cachedProgress = JSON.parse(cached);
                            }
                        } catch (e) { }

                        await ApplicationService.updateStatus({
                            id: app.id,
                            fromStatus: 'INTERVIEW_IN_PROGRESS',
                            toStatus: targetStatus,
                            changedByName: user?.full_name || 'System',
                            reason: 'Room was manually freed / turned off',
                            patch: {
                                final_specific_status: 'Initial Undefined',
                                interview_grading: cachedProgress.scores || app.interview_grading || {},
                                pis: {
                                    ...(app.pis || {}),
                                    final_specific_status: 'Initial Undefined'
                                },
                                metadata: {
                                    ...(app.metadata || {}),
                                    active_interview_type: null,
                                    background: cachedProgress.background || app.metadata?.background || null,
                                    checklist: cachedProgress.checklist || app.metadata?.checklist || null,
                                    ratings: cachedProgress.ratings || app.metadata?.ratings || null,
                                    question_notes: cachedProgress.questionNotes || app.metadata?.question_notes || null,
                                    draft_seconds: cachedProgress.seconds || null
                                }
                            } as any
                        });
                    }
                }
                await updateRoom(roomId, patch);
            }, 'Releasing facility...');
            success('Room Freed', 'Room released and queue updated.');
        } catch {
            await updateRoom(roomId, patch);
            success('Room Force-Freed', 'Room released forcefully.');
        } finally {
            freeingIdsRef.current.delete(roomId);
        }
    };

    const concludeRoomWithVerdict = async (roomId: string, verdict: 'PASSED' | 'FAILED' | 'NO_SHOW' | 'DRAFT' | 'RESET') => {
        if (verdict === 'DRAFT' || verdict === 'RESET') {
            await freeRoom(roomId);
            return;
        }

        const room = rooms.find(r => r.id === roomId);
        if (!room || !room.current_application_id) {
            await freeRoom(roomId);
            return;
        }

        const appId = room.current_application_id;
        const app = applications.find(a => a.id === appId);

        if (freeingIdsRef.current.has(roomId)) return;
        freeingIdsRef.current.add(roomId);

        try {
            await withLoading(async () => {
                const qEntries = await QueueService.getTodaysQueue();
                const entry = qEntries.find((e: any) => e.application_id === appId);
                
                const isFinal = app?.metadata?.active_interview_type === 'FINAL' || app?.queue_type === 'FINAL' || (entry && entry.queue_type === 'FINAL');
                
                let targetStatus = 'INITIAL_INTERVIEW';
                let finalSpec = 'Passed';
                if (verdict === 'PASSED') {
                    targetStatus = isFinal ? 'FOR_JOB_OFFER' : 'PASSED';
                    finalSpec = isFinal ? 'Passed' : 'Initial Passed';
                } else if (verdict === 'FAILED') {
                    targetStatus = 'FAILED';
                    finalSpec = isFinal ? 'Failed Ops Val' : 'Failed Initial';
                } else if (verdict === 'NO_SHOW') {
                    targetStatus = 'RESCHEDULED';
                    finalSpec = 'OV - No Show';
                }

                if (entry) {
                    await QueueService.update(entry.id, { 
                        status: 'COMPLETED', 
                        completed_at: new Date().toISOString() 
                    });
                }

                if (app) {
                    await ApplicationService.updateStatus({
                        id: app.id,
                        fromStatus: app.current_status || 'INTERVIEW_IN_PROGRESS',
                        toStatus: targetStatus as ApplicationStatus,
                        changedByName: user?.full_name || 'System',
                        reason: `Verdict set to ${verdict} during room release`,
                        patch: {
                            overall_status: verdict === 'NO_SHOW' ? 'NO_SHOW' : (verdict === 'FAILED' ? 'FAILED' : 'OPEN'),
                            final_specific_status: finalSpec,
                            pis: {
                                ...(app.pis || {}),
                                final_specific_status: finalSpec,
                                ops_validator_status: verdict === 'NO_SHOW' ? 'No Show' : (verdict === 'FAILED' ? 'Failed' : 'Passed')
                            },
                            metadata: {
                                ...(app.metadata || {}),
                                active_interview_type: null,
                                ops_validator_status: verdict === 'NO_SHOW' ? 'No Show' : (verdict === 'FAILED' ? 'Failed' : 'Passed'),
                                final_specific_status: finalSpec
                            }
                        } as any
                    });
                }

                const remainingReservations = (room.reservations || []).filter(
                    (res: any) => res.applicant_id !== appId
                );
                await updateRoom(roomId, {
                    status: 'AVAILABLE',
                    current_application_id: null,
                    current_applicant_name: null,
                    occupied_since: null,
                    occupied_until: null,
                    reservations: remainingReservations
                });
            }, `Concluding candidate as ${verdict.replace('_', ' ')}...`);

            success('Room Released & Concluded', `Candidate marked as ${verdict.replace('_', ' ')}.`);
        } catch (err) {
            console.error('Failed to conclude room:', err);
            await freeRoom(roomId);
        } finally {
            freeingIdsRef.current.delete(roomId);
        }
    };
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // Auto-activate rooms whose reservations have arrived and Auto-draft overtime rooms
    useEffect(() => {
        if (!rooms || rooms.length === 0) return;

        rooms.forEach(async (room) => {
            if (room.room_type === 'online') return;


            // Dynamically adjust schedules if room is occupied and eating into next slot
            if (room.status === 'OCCUPIED' && room.occupied_since && room.reservations && room.reservations.length > 0) {
                const firstRes = room.reservations[0];
                const startTimeStr = firstRes.time_slot?.split(' - ')[0];
                const startMins = parseTimeStrToMinutes(startTimeStr || '');

                if (startMins !== null) {
                    const occupiedSince = new Date(room.occupied_since).getTime();
                    const expectedEnd = room.occupied_until
                        ? new Date(room.occupied_until).getTime()
                        : occupiedSince + 30 * 60 * 1000;

                    const expectedEndDate = new Date(expectedEnd);
                    const expectedEndMins = expectedEndDate.getHours() * 60 + expectedEndDate.getMinutes();

                    let slipDelay = expectedEndMins - startMins;
                    if (slipDelay < -1000) {
                        slipDelay += 1440; // Crossed midnight
                    }

                    if (slipDelay > 0 && slipDelay < 120) {
                        const newReservations = room.reservations.map(res => {
                            const parts = res.time_slot.split(' - ');
                            if (parts.length !== 2) return res;
                            const sMins = parseTimeStrToMinutes(parts[0]);
                            const eMins = parseTimeStrToMinutes(parts[1]);
                            if (sMins !== null && eMins !== null) {
                                const newStart = sMins + slipDelay;
                                const newEnd = eMins + slipDelay;
                                return {
                                    ...res,
                                    time_slot: `${formatMinutesToTimeStr(newStart)} - ${formatMinutesToTimeStr(newEnd)}`
                                };
                            }
                            return res;
                        });

                        console.log(`[Schedule Adjust] Room ${room.room_name || room.room_number} is occupied until ${expectedEndDate.toLocaleTimeString()}. Shifting reservations forward by ${slipDelay} mins.`);
                        updateRoom(room.id, { reservations: newReservations }).catch(console.error);
                    }
                }
            }

            if (room.status === 'AVAILABLE' && room.reservations && room.reservations.length > 0) {
                const readyReservation = room.reservations.find(res => {
                    const timeStr = res.time_slot;
                    if (!timeStr) return false;
                    const startTimeStr = timeStr.split(' - ')[0];
                    const match = startTimeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                    if (match) {
                        let h = parseInt(match[1], 10);
                        const m = parseInt(match[2], 10);
                        const period = match[3].toUpperCase();
                        if (period === 'PM' && h !== 12) h += 12;
                        if (period === 'AM' && h === 12) h = 0;
                        const currentHours = now.getHours();
                        const currentMinutes = now.getMinutes();
                        if (currentHours > h || (currentHours === h && currentMinutes >= m)) {
                            return true;
                        }
                    } else if (startTimeStr.includes(':')) {
                        const [h, m] = startTimeStr.split(':').map(Number);
                        const currentHours = now.getHours();
                        const currentMinutes = now.getMinutes();
                        if (currentHours > h || (currentHours === h && currentMinutes >= m)) {
                            return true;
                        }
                    }
                    return false;
                });

                if (readyReservation) {
                    const newReservations = room.reservations.filter(r => r !== readyReservation);
                    updateRoom(room.id, {
                        status: 'OCCUPIED',
                        current_application_id: readyReservation.applicant_id,
                        current_applicant_name: readyReservation.applicant_name,
                        occupied_since: new Date().toISOString(),
                        occupied_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                        reservations: newReservations
                    }).catch(console.error);
                }
            }
        });
    }, [now, rooms, applications, updateRoom]);

    return {
        rooms, loadingRooms, loadRooms,
        addModal, setAddModal, newRoom, setNewRoom, isSubmitting,
        editRoomId, setEditRoomId, editRoomData, setEditRoomData, openEditModal, handleSaveEdit,
        availableInterviewers, users, departments,
        activeSessionRoomId, setActiveSessionRoomId,
        deleteConfirmRoom, setDeleteConfirmRoom, deletingRoomId,
        receiptData, setReceiptData, applications,
        handleAdd, toggleActive, handleDeleteRoom, freeRoom, concludeRoomWithVerdict, setRefreshKey, updateRoom
    };
}
