import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueueStore } from '@/store/queueStore';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/common/useToast';
import { QueueService } from '@/services/QueueService';
import { UserService } from '@/services/UserService';
import { ApplicationService } from '@/services/ApplicationService';
import { socketService } from '@/services/socketService';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import type { QueueCallout, QueueEntry, Application } from '@/types';
import type { User } from '@/types/user';

export type CallPromptState = {
    open: boolean;
    entry?: QueueEntry;
    type?: 'INITIAL' | 'FINAL';
};

export function useQueueControl() {
    const { user } = useAuthStore();
    const {
        queue,
        activeSessions,
        callHistory,
        loadQueue,
        callNext,
        skipApplicant,
        deleteApplicant,
        terminateSession
    } = useQueueStore();
    const { rooms, loading: loadingRooms, loadRooms, updateRoom } = useRoomStore();
    const { success, warning } = useToast();

    const [refreshKey, setRefreshKey] = useState(0);
    const [recruiterOptions, setRecruiterOptions] = useState<User[]>([]);
    const [validatorOptions, setValidatorOptions] = useState<User[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [callPrompt, setCallPrompt] = useState<CallPromptState>({ open: false });
    const [promptData, setPromptData] = useState({ room: '', interviewer: '' });

    const loadUserOptions = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const users = await UserService.getAll();
            const recruiters = users.filter(u =>
                ['recruiter_interviewer', 'recruiter_s', 'recruiter_a', 'recruiter_jc', 'recruiter_sy', 'admin'].includes(u.role)
            );
            const validators = users.filter(u => u.role === 'ops_validator');

            setRecruiterOptions(recruiters);
            setValidatorOptions(validators);
        } catch (error) {
            console.error('Failed to load user options:', error);
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    const loadApplications = useCallback(async () => {
        try {
            const apps = await ApplicationService.getAll();
            setApplications(apps);
        } catch (error) {
            console.error('Failed to load applications in queue control:', error);
        }
    }, []);

    useEffect(() => {
        void loadUserOptions();
    }, [loadUserOptions]);

    const pollData = useCallback(() => {
        void loadQueue();
        void loadRooms();
        void loadApplications();
    }, [loadQueue, loadRooms, loadApplications]);

    useVisibilityPolling(pollData, 60000, [pollData]);

    useEffect(() => {
        const socket = socketService.getSocket();
        const handleQueueUpdate = () => { void loadQueue(); };
        const handleAppUpdate = () => { void loadApplications(); };
        const handleRoomsUpdate = () => { void loadRooms(); };
        socket.on('queue:updated', handleQueueUpdate);
        socket.on('applications:updated', handleAppUpdate);
        socket.on('rooms:updated', handleRoomsUpdate);

        return () => {
            socket.off('queue:updated', handleQueueUpdate);
            socket.off('applications:updated', handleAppUpdate);
            socket.off('rooms:updated', handleRoomsUpdate);
        };
    }, [loadQueue, loadApplications, loadRooms]);

    const initialWaiting = useMemo(() => {
        if (user?.role === 'ops_validator') return [];
        return queue.filter(e => e.status === 'WAITING' && e.queue_type === 'INITIAL');
    }, [queue, user?.role]);

    const finalWaiting = useMemo(() => {
        if (user?.role === 'ops_validator') {
            return queue.filter(e =>
                e.status === 'WAITING' &&
                e.queue_type === 'FINAL' &&
                e.assigned_interviewer_id === user.id
            );
        }
        return queue.filter(e => e.status === 'WAITING' && e.queue_type === 'FINAL');
    }, [queue, user?.role, user?.id]);

    const handleCallNext = (type: 'INITIAL' | 'FINAL') => {
        const list = type === 'INITIAL' ? initialWaiting : finalWaiting;
        const nextInLine = list[0];
        if (nextInLine) {
            setCallPrompt({ open: true, entry: nextInLine, type });
            const defaultInterviewer = type === 'FINAL' && nextInLine.assigned_interviewer_name
                ? nextInLine.assigned_interviewer_name
                : (user?.full_name || '');
            setPromptData({ room: '', interviewer: defaultInterviewer });
        } else {
            warning('Queue Empty', `No applicants are currently waiting in the ${type} queue.`);
        }
    };

    const confirmCall = async () => {
        if (!promptData.room || !promptData.interviewer) {
            warning('Required Fields', 'Please specify both Room and Interviewer.');
            return;
        }

        const room = rooms.find(r => r.room_name === promptData.room);
        if (!room?.id) {
            warning('System Error', 'Could not locate room ID for assignment.');
            return;
        }

        try {
            // Find selected interviewer's ID from options list
            const allOptions = [...recruiterOptions, ...validatorOptions];
            const selectedInterviewer = allOptions.find(o => o.full_name === promptData.interviewer);
            const interviewerId = selectedInterviewer?.id || '';

            // 1. Call next in queue (updates queue status to CALLED)
            const entry = await callNext(user?.id || '', callPrompt.type, promptData.room, promptData.interviewer, interviewerId);
            
            if (entry) {
                // 2. Update room status immediately to OCCUPIED
                await updateRoom(room.id, {
                    status: 'OCCUPIED' as const,
                    current_application_id: entry.application_id || null,
                    current_applicant_name: entry.applicant_name || null,
                    occupied_since: new Date().toISOString()
                });

                success('Called!', `${entry.applicant_name} — ${promptData.room}`);
                setCallPrompt({ open: false });
                
                // 3. Force refresh of both stores
                void loadQueue();
                void loadRooms(true);
                void loadApplications();
            }
        } catch (err) {
            console.error('[QueueControl] confirmCall failed:', err);
            warning('Call Failed', 'There was an issue assigning the room. Please try again.');
        }
    };

    const handleSkip = async (queueId: string, name: string) => {
        try {
            await QueueService.update(queueId, { status: 'SKIPPED' });
            skipApplicant(queueId, 'Skipped by recruiter');
            success('Skipped', `${name} has been skipped in the queue.`);
            setRefreshKey(k => k + 1);
        } catch (err) {
            console.error('[QueueControl] Skip failed:', err);
        }
    };

    const handleDelete = async (queueId: string, name: string) => {
        try {
            await QueueService.delete(queueId);
            deleteApplicant(queueId);
            success('Removed', `${name} has been removed from the queue.`);
            setRefreshKey(k => k + 1);
        } catch (err) {
            console.error('[QueueControl] Delete failed:', err);
        }
    };

    const handleTerminate = async (session: QueueCallout) => {
        const room = rooms.find(r => r.room_name === session.room || (session.application_id && r.current_application_id === session.application_id));
        const roomPatch = {
            status: 'AVAILABLE' as const,
            current_application_id: null,
            current_applicant_name: null,
            occupied_since: null
        };
        
        // Revert applicant status if currently stuck in INTERVIEW_IN_PROGRESS
        if (session.application_id) {
            const app = applications.find(a => a.id === session.application_id);
            if (app && app.current_status === 'INTERVIEW_IN_PROGRESS') {
                const isFinal = app.metadata?.active_interview_type === 'FINAL' || app.queue_type === 'FINAL' || session.queue_type === 'FINAL';
                const targetStatus = isFinal ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                await ApplicationService.updateStatus({
                    id: app.id,
                    fromStatus: 'INTERVIEW_IN_PROGRESS',
                    toStatus: targetStatus,
                    changedByName: user?.full_name || 'System',
                    reason: 'Queue session terminated',
                    patch: {
                        metadata: {
                            ...(app.metadata || {}),
                            active_interview_type: null
                        }
                    }
                });
            }
        }

        if (room) await updateRoom(room.id, roomPatch);
        await terminateSession(session.id);
        success('Session Completed', `${session.applicant_name} served and room released.`);
    };

    const handleRemoveActive = async (session: QueueCallout) => {
        try {
            const room = rooms.find(r => r.room_name === session.room || (session.application_id && r.current_application_id === session.application_id));
            const roomPatch = {
                status: 'AVAILABLE' as const,
                current_application_id: null,
                current_applicant_name: null,
                occupied_since: null
            };
            
            // Revert applicant status if currently stuck in INTERVIEW_IN_PROGRESS
            if (session.application_id) {
                const app = applications.find(a => a.id === session.application_id);
                if (app && app.current_status === 'INTERVIEW_IN_PROGRESS') {
                    const isFinal = app.metadata?.active_interview_type === 'FINAL' || app.queue_type === 'FINAL' || session.queue_type === 'FINAL';
                    const targetStatus = isFinal ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                    await ApplicationService.updateStatus({
                        id: app.id,
                        fromStatus: 'INTERVIEW_IN_PROGRESS',
                        toStatus: targetStatus,
                        changedByName: user?.full_name || 'System',
                        reason: 'Queue session removed',
                        patch: {
                            metadata: {
                                ...(app.metadata || {}),
                                active_interview_type: null
                            }
                        }
                    });
                }
            }

            if (room) await updateRoom(room.id, roomPatch);
            await QueueService.delete(session.id);
            deleteApplicant(session.id);
            success('Removed', `${session.applicant_name} removed and room released.`);
            setRefreshKey(k => k + 1);
        } catch (err) {
            console.error('[QueueControl] Remove active failed:', err);
        }
    };

    const busyInterviewerNames = useMemo(() => {
        const names = new Set<string>();
        
        // 1. From active sessions in queue
        activeSessions.forEach(s => {
            if (s.assigned_interviewer_name) {
                names.add(s.assigned_interviewer_name.toLowerCase().trim());
            }
        });
        
        // 2. From occupied rooms
        rooms.forEach(r => {
            if (r.status === 'OCCUPIED' && r.current_application_id) {
                const app = applications.find(a => a.id === r.current_application_id);
                if (app) {
                    if (app.assigned_recruiter_name) {
                        names.add(app.assigned_recruiter_name.toLowerCase().trim());
                    }
                    if (app.assigned_ops_validator_name) {
                        names.add(app.assigned_ops_validator_name.toLowerCase().trim());
                    }
                }
            }
        });
        
        return Array.from(names);
    }, [activeSessions, rooms, applications]);

    const busyInterviewerIds = useMemo(() => {
        const ids = new Set<string>();
        
        // 1. From active sessions in queue
        activeSessions.forEach(s => {
            if (s.assigned_interviewer_id) {
                ids.add(s.assigned_interviewer_id);
            }
        });
        
        // 2. From occupied rooms
        rooms.forEach(r => {
            if (r.status === 'OCCUPIED' && r.current_application_id) {
                const app = applications.find(a => a.id === r.current_application_id);
                if (app) {
                    if (app.assigned_recruiter_id) {
                        ids.add(app.assigned_recruiter_id);
                    }
                    if (app.assigned_ops_validator_id) {
                        ids.add(app.assigned_ops_validator_id);
                    }
                }
            }
        });
        
        return Array.from(ids);
    }, [activeSessions, rooms, applications]);

    const availableRecruiters = useMemo(() => {
        return recruiterOptions.map(r => {
            const isBusy = busyInterviewerIds.includes(r.id) || 
                           busyInterviewerNames.includes(r.full_name?.toLowerCase().trim());
            return { ...r, isBusy };
        });
    }, [recruiterOptions, busyInterviewerIds, busyInterviewerNames]);

    const availableValidators = useMemo(() => {
        return validatorOptions.map(v => {
            const isBusy = busyInterviewerIds.includes(v.id) || 
                           busyInterviewerNames.includes(v.full_name?.toLowerCase().trim());
            return { ...v, isBusy };
        });
    }, [validatorOptions, busyInterviewerIds, busyInterviewerNames]);

    return {
        user, queue, activeSessions, callHistory, rooms, loadingRooms,
        refreshKey, recruiterOptions: availableRecruiters, validatorOptions: availableValidators, loadingUsers,
        callPrompt, setCallPrompt, promptData, setPromptData,
        initialWaiting, finalWaiting, loadQueue, loadRooms,
        handleCallNext, confirmCall, handleSkip, handleDelete,
        handleTerminate, handleRemoveActive
    };
}
