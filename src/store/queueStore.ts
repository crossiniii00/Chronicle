import { create } from 'zustand';
import { QueueEntry, QueueCallout } from '@/types';
import { QueueService } from '@/services/QueueService';
import { ApplicationService } from '@/services/ApplicationService';
import { socketService } from '@/services/socketService';

// Initialize real-time synchronization
const setupSocketListeners = (store: QueueStore) => {
    const socket = socketService.getSocket();
    
    socket.on('queue:updated', () => {
        console.log('[Socket] Queue updated, refreshing store...');
        store.loadQueue();
    });
};

const sortByQueueNumber = (a: QueueEntry, b: QueueEntry) => a.queue_number - b.queue_number;

const getQueueErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return 'Failed to assign queue number.';
};

interface QueueStore {
    queue: QueueEntry[];
    activeSessions: QueueCallout[]; // Changed from currentCall: QueueCallout | null
    callHistory: QueueCallout[];

    loadQueue: () => void;
    assignQueueNumber: (
        applicationId: string,
        applicantName: string,
        roomId: string,
        roomName: string,
        recruiterId: string,
        applicantUserId: string,
        queueType?: 'INITIAL' | 'FINAL',
        queuePrefix?: string
    ) => Promise<{ queueNumber?: number; error?: string }>;
    callNext: (callerId: string, queueType?: 'INITIAL' | 'FINAL', roomName?: string, interviewerName?: string, interviewerId?: string) => Promise<QueueEntry | null>;
    callSpecific: (queueId: string, recruiterId: string, roomName?: string, interviewerName?: string, interviewerId?: string) => Promise<QueueEntry | null>;
    skipApplicant: (queueId: string, reason: string) => Promise<void>;
    deleteApplicant: (queueId: string) => Promise<void>;
    terminateSession: (queueId: string) => Promise<void>; // Replaces clearCurrentCall
    resetQueue: () => Promise<void>;
}

export const useQueueStore = create<QueueStore>((set, get) => ({
    queue: [],
    activeSessions: [],
    callHistory: [],

    loadQueue: () => {
        QueueService.getTodayActive().then((entries: QueueEntry[]) => {
            const filtered = entries
                .filter(e => e.status === 'WAITING' || e.status === 'CALLED' || e.status === 'DRAFT' || e.status === 'RESCHEDULED')
                .sort(sortByQueueNumber);

            const calledEntries = entries.filter(e => e.status === 'CALLED');

            // Map all CALLED entries to activeSessions
            const mappedActive = calledEntries.map(e => ({
                id: e.id,
                application_id: e.application_id,
                queue_number: e.queue_number,
                queue_prefix: e.queue_prefix,
                applicant_name: e.applicant_name,
                room: e.assigned_room_name || 'TBD',
                timestamp: e.called_at || new Date().toISOString(),
                queue_type: e.queue_type,
                assigned_interviewer_id: e.assigned_interviewer_id,
                assigned_interviewer_name: e.assigned_interviewer_name,
            }));

            set({ queue: filtered as QueueEntry[], activeSessions: mappedActive });
        }).catch(console.error);
    },

    assignQueueNumber: async (applicationId, applicantName, roomId, roomName, recruiterId, _applicantUserId, queueType = 'INITIAL', queuePrefix?: string) => {
        const { queue } = get();
        const existingQueue = queue.find(q => q.application_id === applicationId && q.status === 'WAITING');
        if (existingQueue) {
            return { error: `Applicant is already in the ${existingQueue.queue_type || 'INITIAL'} queue.` };
        }

        try {
            const result = await QueueService.assignQueue({
                applicationId,
                applicantName,
                interviewerId: recruiterId,
                interviewerName: 'Admin',
                queueType,
                queuePrefix
            });

            get().loadQueue();
            return { queueNumber: result.queueNumber };
        } catch (err: unknown) {
            console.error('[queueStore] assignQueueNumber failed:', err);
            return { error: getQueueErrorMessage(err) };
        }
    },

    callNext: async (callerId, queueType, roomName, interviewerName, interviewerId) => {
        const { queue } = get();
        const next = queue.find(e => {
            const matchesStatus = e.status === 'WAITING';
            const matchesType = queueType ? e.queue_type === queueType : true;
            return matchesStatus && matchesType;
        });
        if (!next) return null;
        return await get().callSpecific(next.id, callerId, roomName, interviewerName, interviewerId);
    },

    callSpecific: async (queueId, recruiterId, roomName, interviewerName, interviewerId) => {
        const { queue } = get();
        const entry = queue.find(e => e.id === queueId);
        if (!entry) return null;

        const actualRoom = roomName || entry.assigned_room_name || 'TBD';
        const calledAt = new Date().toISOString();

        await QueueService.update(queueId, { 
            status: 'CALLED', 
            called_at: calledAt, 
            assigned_room_name: actualRoom,
            assigned_interviewer_id: interviewerId || recruiterId,
            assigned_interviewer_name: interviewerName || 'System'
        });

        // Update application status
        await ApplicationService.updateStatus({
            id: entry.application_id,
            toStatus: entry.queue_type === 'FINAL' ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW',
            changedByName: interviewerName || 'System (Queue Call)',
            fromStatus: entry.status,
            reason: `Called to ${actualRoom}`,
            patch: {
                assigned_interview_room_name: actualRoom,
                assigned_recruiter_name: interviewerName || 'System',
                updated_at: new Date().toISOString(),
                metadata: {
                    active_interview_type: entry.queue_type === 'FINAL' ? 'FINAL' : 'INITIAL'
                }
            }
        });

        const callout: QueueCallout = {
            id: entry.id,
            application_id: entry.application_id,
            queue_number: entry.queue_number,
            queue_prefix: entry.queue_prefix,
            applicant_name: entry.applicant_name,
            room: actualRoom,
            timestamp: calledAt,
            queue_type: entry.queue_type,
            assigned_interviewer_id: interviewerId || recruiterId,
            assigned_interviewer_name: interviewerName || 'System',
        };

        set(state => ({
            activeSessions: [...state.activeSessions, callout],
            callHistory: [callout, ...state.callHistory.slice(0, 19)],
        }));

        // Note: Removed incorrect addNotification call using application_id as user_id.
        // Applicants do not have system user accounts, so this was causing a foreign key violation.

        get().loadQueue();
        return { ...entry, status: 'CALLED', called_at: calledAt, assigned_room_name: actualRoom } as QueueEntry;
    },

    terminateSession: async (queueId: string) => {
        // Find the entry in activeSessions
        const session = get().activeSessions.find(s => s.id === queueId);
        if (!session) return;

        try {
            // Update queue entry status to SERVED in DB
            await QueueService.update(queueId, { status: 'SERVED', completed_at: new Date().toISOString() });

            // Remove from local activeSessions
            set(state => ({
                activeSessions: state.activeSessions.filter(s => s.id !== queueId)
            }));

            // Refresh queue to update stats
            get().loadQueue();
        } catch (error) {
            console.error('[queueStore] terminateSession failed:', error);
        }
    },

    skipApplicant: async (queueId: string) => {
        try {
            await QueueService.update(queueId, { status: 'SKIPPED' });
            get().loadQueue();
        } catch (err: unknown) {
            console.error('[queueStore] skipApplicant failed:', err);
        }
    },

    deleteApplicant: async (queueId) => {
        try {
            await QueueService.delete(queueId);
            set(state => ({
                activeSessions: state.activeSessions.filter(s => s.id !== queueId)
            }));
            get().loadQueue();
        } catch (err: unknown) {
            console.error('[queueStore] deleteApplicant failed:', err);
            // If it's a 404, it means it's already deleted in the backend, so we should still remove it locally
            set(state => ({
                activeSessions: state.activeSessions.filter(s => s.id !== queueId)
            }));
            get().loadQueue();
        }
    },

    resetQueue: async () => {
        try {
            await QueueService.resetQueue();
            get().loadQueue();
        } catch (err: unknown) {
            console.error('[queueStore] resetQueue failed:', err);
        }
    }
}));

// Initialize real-time synchronization immediately
setupSocketListeners(useQueueStore.getState());
