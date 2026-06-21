import { useState, useEffect, useCallback } from 'react';
import { ApplicationService } from '@/services/ApplicationService';
import { QueueService } from '@/services/QueueService';
import { useRoomStore } from '@/store/roomStore';
import { useToast } from '@/components/common/useToast';
import { useLoading } from '@/components/common/useLoading';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/services/socketService';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import type { Application, QueueEntry } from '@/types';

export function useInterviewRooms() {
    const { success, error } = useToast();
    const { withLoading } = useLoading();
    const [addModal, setAddModal] = useState(false);
    const [newRoom, setNewRoom] = useState({ room_number: '', room_name: '', image_url: '' });
    const [editRoomId, setEditRoomId] = useState<string | null>(null);
    const [editRoomData, setEditRoomData] = useState({ room_number: '', room_name: '', image_url: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeSessionRoomId, setActiveSessionRoomId] = useState<string | null>(null);
    const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<string | null>(null);
    const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
    const [receiptData, setReceiptData] = useState<any | null>(null);
    const { rooms, loading: loadingRooms, loadRooms, updateRoom, addRoom, deleteRoom } = useRoomStore();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loadingApps, setLoadingApps] = useState(true);

    const { user } = useAuthStore();

    const loadData = useCallback(async (silent?: boolean) => {
        if (!silent) setLoadingApps(true);
        try {
            const fbApps = await ApplicationService.getAll();
            setApplications(fbApps || []);
        } catch {
            setApplications([]);
        } finally {
            setLoadingApps(false);
        }
    }, []);

    const pollData = useCallback(() => {
        if (!user) return;
        void loadData(true);
        void loadRooms(true);
    }, [loadData, loadRooms, user]);

    useVisibilityPolling(pollData, 60000, [pollData]);

    useEffect(() => {
        if (!user) return;
        const socket = socketService.getSocket();
        const handleAppUpdate = () => { void loadData(true); };
        const handleRoomsUpdate = () => { void loadRooms(true); };
        socket.on('applications:updated', handleAppUpdate);
        socket.on('rooms:updated', handleRoomsUpdate);
        return () => {
            socket.off('applications:updated', handleAppUpdate);
            socket.off('rooms:updated', handleRoomsUpdate);
        };
    }, [loadRooms, loadData, refreshKey, user]);

    const handleAdd = async (type: 'onsite' | 'online' = 'onsite') => {
        if (!newRoom.room_number) return;
        setIsSubmitting(true);
        try {
            await withLoading(async () => {
                await addRoom({
                    room_number: newRoom.room_number,
                    room_name: newRoom.room_name || `Room ${newRoom.room_number}`,
                    image_url: newRoom.image_url || null,
                    status: 'AVAILABLE',
                    is_active: true,
                    room_type: type,
                });
            }, 'Provisioning facility...');
            setAddModal(false);
            success('Room Added', `Room ${newRoom.room_number} has been added.`);
            setNewRoom({ room_number: '', room_name: '', image_url: '' });
        } catch (err) {
            error('Provisioning Failed', err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (room: any) => {
        setEditRoomId(room.id);
        setEditRoomData({
            room_number: room.room_number,
            room_name: room.room_name || '',
            image_url: room.image_url || ''
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
                    image_url: editRoomData.image_url || null
                });
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
                    occupied_since: null
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
        const room = rooms.find(r => r.id === roomId);
        const patch = { status: 'AVAILABLE' as const, current_application_id: null, current_applicant_name: null, occupied_since: null };
        try {
            await withLoading(async () => {
                if (room?.current_application_id) {
                    const qEntries = await QueueService.getTodaysQueue();
                    const entry = qEntries.find((e: QueueEntry) => e.application_id === room.current_application_id);
                    if (entry) await QueueService.delete(entry.id);

                    // Revert candidate status if currently stuck in INTERVIEW_IN_PROGRESS
                    const app = applications.find(a => a.id === room.current_application_id);
                    if (app && app.current_status === 'INTERVIEW_IN_PROGRESS') {
                        const isFinal = app.metadata?.active_interview_type === 'FINAL' || app.queue_type === 'FINAL' || (entry && entry.queue_type === 'FINAL');
                        const targetStatus = isFinal ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                        await ApplicationService.updateStatus({
                            id: app.id,
                            fromStatus: 'INTERVIEW_IN_PROGRESS',
                            toStatus: targetStatus,
                            changedByName: user?.full_name || 'System',
                            reason: 'Room was manually freed / turned off',
                            patch: {
                                metadata: {
                                    ...(app.metadata || {}),
                                    active_interview_type: null
                                }
                            }
                        });
                    }
                }
                await updateRoom(roomId, patch);
            }, 'Releasing facility...');
            success('Room Freed', 'Room released and queue updated.');
        } catch {
            await updateRoom(roomId, patch);
            success('Room Force-Freed', 'Room released forcefully.');
        }
    };

    return {
        rooms, loadingRooms, loadingApps, loadRooms, loadData,
        addModal, setAddModal, newRoom, setNewRoom, isSubmitting,
        editRoomId, setEditRoomId, editRoomData, setEditRoomData, openEditModal, handleSaveEdit,
        activeSessionRoomId, setActiveSessionRoomId,
        deleteConfirmRoom, setDeleteConfirmRoom, deletingRoomId,
        receiptData, setReceiptData, applications,
        handleAdd, toggleActive, handleDeleteRoom, freeRoom, setRefreshKey
    };
}
