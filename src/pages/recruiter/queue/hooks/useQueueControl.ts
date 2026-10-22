import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueueStore } from '@/store/queueStore';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/common/useToast';
import { QueueService } from '@/services/QueueService';
import { UserService } from '@/services/UserService';
import { ApplicationService } from '@/services/ApplicationService';
import { socketService } from '@/services/socketService';
import { useGlobalDataStore } from '@/store/globalDataStore';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';
import type { QueueCallout, QueueEntry, Application } from '@/types';
import type { User } from '@/types/user';

export type CallPromptState = {
    open: boolean;
    entry?: QueueEntry;
    type?: 'INITIAL' | 'FINAL';
};

const getIsFinal = (app: any, fallbackQueueType?: string) => {
    if (!app) return fallbackQueueType === 'FINAL';
    const meta = typeof app.metadata === 'string' ? (() => { try { return JSON.parse(app.metadata); } catch { return {}; } })() : (app.metadata || {});
    if (meta.active_interview_type) {
        return meta.active_interview_type === 'FINAL';
    }
    return app.queue_type === 'FINAL' || fallbackQueueType === 'FINAL';
};

export function useQueueControl() {
    const { user } = useAuthStore();
    const {
        queue,
        activeSessions,
        callHistory,
        loadQueue,
        callNext,
        callSpecific,
        skipApplicant,
        deleteApplicant,
        terminateSession,
        resetQueue
    } = useQueueStore();
    const { rooms, loading: loadingRooms, loadRooms, updateRoom } = useRoomStore();
    const { success, warning } = useToast();

    const [refreshKey, setRefreshKey] = useState(0);
    const [recruiterOptions, setRecruiterOptions] = useState<User[]>([]);
    const [validatorOptions, setValidatorOptions] = useState<User[]>([]);
    const { applications } = useGlobalDataStore();
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [callPrompt, setCallPrompt] = useState<CallPromptState>({ open: false });
    const [reschedulePrompt, setReschedulePrompt] = useState<CallPromptState>({ open: false });
    const [promptData, setPromptData] = useState<{ room: string; interviewer: string; timeSlot: string; callType: 'now' | 'scheduled' }>({ room: '', interviewer: '', timeSlot: '', callType: 'now' });

    const loadUserOptions = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const users = await UserService.getAll();
            const recruiters = users.filter(u =>
                ['recruiter_interviewer', 'recruiter_a', 'recruiter_jc', 'recruiter_sy', 'admin'].includes(u.role) && u.is_active !== false
            );
            const validators = users.filter(u => u.role === 'ops_validator' && u.is_active !== false);

            setRecruiterOptions(recruiters);
            setValidatorOptions(validators);
        } catch (error) {
            console.error('Failed to load user options:', error);
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    useEffect(() => {
        void loadUserOptions();
    }, [loadUserOptions]);

    const pollData = useCallback(() => {
        void loadQueue();
        void loadRooms(true);
    }, [loadQueue, loadRooms]);

    useVisibilityPolling(pollData, 300000, [pollData]);

    useEffect(() => {
        const socket = socketService.getSocket();
        const handleQueueUpdate = () => { void loadQueue(); };
        const handleRoomsUpdate = () => { void loadRooms(true); };
        socket.on('queue:updated', handleQueueUpdate);
        socket.on('rooms:updated', handleRoomsUpdate);

        return () => {
            socket.off('queue:updated', handleQueueUpdate);
            socket.off('rooms:updated', handleRoomsUpdate);
        };
    }, [loadQueue, loadRooms]);


    // Live Queue Auto-Cleanup
    useEffect(() => {
        if (!queue || queue.length === 0 || !applications || applications.length === 0) return;

        queue.forEach(q => {
            if (q.status !== 'WAITING') return;

            const app = applications.find(a => a.id === q.application_id);
            if (!app) return;

            const statusUpper = (app.current_status || '').toUpperCase();
            
            let shouldRemove = false;
            if (statusUpper === 'FAILED' || statusUpper === 'REJECTED') {
                shouldRemove = true;
            } else if (q.queue_type === 'INITIAL' && !['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'RESCHEDULED'].includes(statusUpper)) {
                shouldRemove = true;
            } else if (q.queue_type === 'FINAL' && !['ASSESSMENT', 'FINAL_INTERVIEW', 'QUEUE_ASSIGNED', 'RESCHEDULED'].includes(statusUpper)) {
                shouldRemove = true;
            }

            if (shouldRemove) {
                console.log(`[Queue Auto-Clean] Removing queue entry for ${q.applicant_name} because status is ${statusUpper}`);
                QueueService.delete(q.id).catch(console.error);
            }
        });
    }, [queue, applications]);

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

    const draftQueue = useMemo(() => {
        return queue.filter(e => e.status === 'DRAFT');
    }, [queue]);

    const reschedWaiting = useMemo(() => {
        return queue.filter(e => e.status === 'RESCHEDULED');
    }, [queue]);

    const handleCallNext = (type: 'INITIAL' | 'FINAL') => {
        const list = type === 'INITIAL' ? initialWaiting : finalWaiting;
        const nextInLine = list[0];
        if (nextInLine) {
            setCallPrompt({ open: true, entry: nextInLine, type });
            const defaultInterviewer = type === 'FINAL' && nextInLine.assigned_interviewer_name
                ? nextInLine.assigned_interviewer_name
                : (user?.full_name || '');
            setPromptData({ room: '', interviewer: defaultInterviewer, callType: 'now', timeSlot: 'Immediate' });
        } else {
            warning('Queue Empty', `No applicants are currently waiting in the ${type} queue.`);
        }
    };

    const handleCallSpecificEntry = (entry: QueueEntry, type: 'INITIAL' | 'FINAL') => {
        setCallPrompt({ open: true, entry, type });
        const defaultInterviewer = type === 'FINAL' && entry.assigned_interviewer_name
            ? entry.assigned_interviewer_name
            : (user?.full_name || '');
        setPromptData({ room: '', interviewer: defaultInterviewer, callType: 'now', timeSlot: 'Immediate' });
    };

    const confirmCall = async () => {
        if (!promptData.room || !promptData.interviewer) {
            warning('Required Fields', 'Please specify both Room and Interviewer.');
            return;
        }
        if (promptData.callType === 'scheduled' && !promptData.timeSlot) {
            warning('Required Fields', 'Please specify a time slot.');
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

            const actualRoomName = `${promptData.room} @ ${promptData.timeSlot}`;

            // Check if slot is already reserved for slot type
            const existingReservations = room.reservations || [];
            if (existingReservations.some(r => r.time_slot === promptData.timeSlot)) {
                warning('Room Reserved', `This room is already reserved for ${promptData.timeSlot}.`);
                return;
            }

            let entry;
            if (promptData.callType === 'scheduled' && callPrompt.entry) {
                await QueueService.update(callPrompt.entry.id, { 
                    status: 'RESCHEDULED',
                    assigned_room_name: actualRoomName,
                    assigned_interviewer_id: interviewerId,
                    assigned_interviewer_name: promptData.interviewer
                });
                await ApplicationService.updateStatus({
                    id: callPrompt.entry.application_id,
                    toStatus: 'RESCHEDULED',
                    changedByName: user?.full_name || 'System',
                    fromStatus: callPrompt.entry.application_status || 'UNKNOWN',
                    reason: `Rescheduled to ${promptData.timeSlot} in ${promptData.room}`,
                    patch: {
                        metadata: {
                            active_interview_type: callPrompt.entry.queue_type === 'FINAL' ? 'FINAL' : 'INITIAL',
                            rescheduled_from_status: callPrompt.entry.application_status || 'UNKNOWN'
                        }
                    }
                });
                entry = { ...callPrompt.entry, status: 'RESCHEDULED' as any };
            } else if (callPrompt.entry) {
                entry = await callSpecific(callPrompt.entry.id, user?.id || '', actualRoomName, promptData.interviewer, interviewerId);
            } else {
                entry = await callNext(user?.id || '', callPrompt.type, actualRoomName, promptData.interviewer, interviewerId);
            }

            if (entry) {
                // 2. Update room status immediately to save reservations
                const newReservation = {
                    time_slot: promptData.timeSlot,
                    interviewer_name: promptData.interviewer,
                    interviewer_id: interviewerId,
                    applicant_name: entry.applicant_name || '',
                    applicant_id: entry.application_id || '',
                    session_type: entry.queue_type || 'INITIAL'
                };
                await updateRoom(room.id, {
                    reservations: [...existingReservations, newReservation]
                });
                success('Scheduled!', `${entry.applicant_name} reserved in ${promptData.room} for ${promptData.timeSlot}`);
                
                setCallPrompt({ open: false });

                // 3. Force refresh of both stores
                void loadQueue();
                void loadRooms(true);
                return room.id;
            }
        } catch (err) {
            console.error('[QueueControl] confirmCall failed:', err);
            warning('Call Failed', 'There was an issue assigning the room. Please try again.');
        }
    };

    const confirmRescheduleDate = async (rescheduleDate: string) => {
        if (!reschedulePrompt.entry) return;
        const entry = reschedulePrompt.entry;
        
        await QueueService.update(entry.id, { 
            status: 'RESCHEDULED',
            assigned_room_name: `Remote @ ${rescheduleDate}`,
        });
        
        await ApplicationService.updateStatus({
            id: entry.application_id,
            toStatus: 'RESCHEDULED',
            changedByName: user?.full_name || 'System',
            reason: 'Rescheduled from Queue',
            patch: {
                metadata: {
                    active_interview_type: entry.queue_type === 'FINAL' ? 'FINAL' : 'INITIAL',
                    rescheduled_from_status: entry.application_status || 'UNKNOWN',
                    reschedule_date: rescheduleDate
                }
            }
        });
        
        setReschedulePrompt({ open: false });
        void loadQueue();
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

    const handleTerminate = useCallback(async (session: QueueCallout) => {
        const roomNameStr = session.room || '';
        const [actualRoomName, timeSlot] = roomNameStr.split(' @ ');
        const room = rooms.find(r => r.room_name === actualRoomName || r.room_name === roomNameStr || (session.application_id && r.current_application_id === session.application_id));

        if (room && timeSlot) {
            const newReservations = (room.reservations || []).filter(
                r => r.applicant_id !== session.application_id || r.time_slot !== timeSlot
            );
            try {
                await updateRoom(room.id, { reservations: newReservations });
            } catch (err) {
                console.error('[handleTerminate] Failed to remove scheduled reservation counterpart:', err);
            }
        }

        const roomPatch = {
            status: 'AVAILABLE' as const,
            current_application_id: null,
            current_applicant_name: null,
            occupied_since: null,
            occupied_until: null
        };

        // Revert applicant status if currently stuck in INTERVIEW_IN_PROGRESS
        if (session.application_id) {
            const app = applications.find(a => a.id === session.application_id);
            if (app) {
                // Fetch latest app state to avoid race conditions with InterviewSession finalize
                let latestApp = app;
                try {
                    const { ApplicationService } = await import('@/services/ApplicationService');
                    latestApp = (await ApplicationService.getById(session.application_id)) || latestApp;
                } catch (e) {
                    console.warn('[handleTerminate] Failed to fetch latest app data, using cached state', e);
                }

                // Check if they have a verdict/result based on the queue stage
                const p = (latestApp.pis || {}) as any;
                const initialResult = p.initial_interview_results || p.initial_interview_result || p.ii_result || '';
                const finalVerdict = latestApp.final_verdict || '';

                const isFinal = getIsFinal(app, session.queue_type);

                const hasVerdict = isFinal
                    ? (finalVerdict.toUpperCase().includes('PASS') || finalVerdict.toUpperCase().includes('FAIL'))
                    : (initialResult.toUpperCase().includes('PASS') || initialResult.toUpperCase().includes('FAIL'));

                if (!hasVerdict) {
                    // Recruiter failed to give a result! Save to draft!
                    const targetStatus = isFinal ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';

                    // Persist any cached interview progress into the application record
                    let cachedProgress: any = {};
                    try {
                        const cacheKey = `interview_session_${app.id}`;
                        const cached = localStorage.getItem(cacheKey);
                        if (cached) {
                            cachedProgress = JSON.parse(cached);
                        }
                    } catch (cacheErr) {
                        console.warn('[handleTerminate] Failed to read interview cache:', cacheErr);
                    }

                    try {
                        // Set application status of candidate to "Initial Undefined"
                        await ApplicationService.updateStatus({
                            id: latestApp.id,
                            fromStatus: latestApp.current_status,
                            toStatus: targetStatus,
                            changedByName: user?.full_name || 'System',
                            reason: 'Queue session terminated without verdict - saved to draft',
                            patch: {
                                final_specific_status: 'Initial Undefined',
                                interview_grading: cachedProgress.scores || latestApp.interview_grading || {},
                                pis: {
                                    ...(latestApp.pis || {}),
                                    final_specific_status: 'Initial Undefined'
                                },
                                metadata: {
                                    ...(latestApp.metadata || {}),
                                    active_interview_type: null,
                                    background: cachedProgress.background || latestApp.metadata?.background || null,
                                    checklist: cachedProgress.checklist || latestApp.metadata?.checklist || null,
                                    ratings: cachedProgress.ratings || latestApp.metadata?.ratings || null,
                                    question_notes: cachedProgress.questionNotes || latestApp.metadata?.question_notes || null,
                                    draft_seconds: cachedProgress.seconds || 0
                                }
                            } as any
                        });
                    } catch (appErr) {
                        console.warn('[QueueControl] Failed to save app status to draft', appErr);
                    }

                    // Update queue entry status to DRAFT instead of SERVED in DB
                    if (room) {
                        try {
                            await updateRoom(room.id, roomPatch);
                        } catch {
                            // Ignore room patch errors during termination
                        }
                    }
                    try {
                        await QueueService.update(session.id, { status: 'DRAFT', completed_at: new Date().toISOString() });
                    } catch (qErr) {
                        console.warn('[QueueControl] Failed to update queue status to DRAFT, but proceeding', qErr);
                    }
                    success('Session Terminated', `${session.applicant_name} served without verdict. Saved to drafts.`);
                    loadQueue();
                    return; // Bypass normal serve/terminate
                }
            }

            // Normal terminate fallback
            if (app) {
                const targetApp = app;
                if (targetApp.current_status === 'INTERVIEW_IN_PROGRESS') {
                    const isFinal = getIsFinal(targetApp, session.queue_type);
                    const targetStatus = isFinal ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                    try {
                        await ApplicationService.updateStatus({
                            id: targetApp.id,
                            fromStatus: 'INTERVIEW_IN_PROGRESS',
                            toStatus: targetStatus,
                            changedByName: user?.full_name || 'System',
                            reason: 'Queue session terminated',
                            patch: {
                                metadata: {
                                    ...(targetApp.metadata || {}),
                                    active_interview_type: null
                                }
                            }
                        });
                    } catch (appErr) {
                        console.warn('[QueueControl] Failed to update application status during terminate, but will proceed with session termination', appErr);
                    }
                }
            }
        }

        if (room) {
            try {
                await updateRoom(room.id, roomPatch);
            } catch (roomErr) {
                console.warn('[QueueControl] Failed to update room status, but will proceed', roomErr);
            }
        }
        await terminateSession(session.id);
        success('Session Completed', `${session.applicant_name} served and room released.`);
    }, [rooms, applications, user, updateRoom, terminateSession, loadQueue, success]);

    const handleRemoveActive = async (session: QueueCallout) => {
        try {
            const room = rooms.find(r => r.room_name === session.room || (session.application_id && r.current_application_id === session.application_id));
            const remainingReservations = room
                ? (room.reservations || []).filter((r: any) => r.applicant_id !== session.application_id)
                : [];
            const roomPatch = {
                status: 'AVAILABLE' as const,
                current_application_id: null,
                current_applicant_name: null,
                occupied_since: null,
                occupied_until: null,
                reservations: remainingReservations
            };

            // Revert applicant status if currently stuck in INTERVIEW_IN_PROGRESS
            if (session.application_id) {
                const app = applications.find(a => a.id === session.application_id);
                if (app && app.current_status === 'INTERVIEW_IN_PROGRESS') {
                    const isFinal = getIsFinal(app, session.queue_type);
                    const targetStatus = isFinal ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                    try {
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
                    } catch (appErr) {
                        console.warn('[QueueControl] Failed to revert application status, but proceeding to remove queue session', appErr);
                    }
                }
            }

            if (room) {
                try {
                    await updateRoom(room.id, roomPatch);
                } catch (roomErr) {
                    console.warn('[QueueControl] Failed to update room on remove', roomErr);
                }
            }
            deleteApplicant(session.id);
            success('Removed', `${session.applicant_name} removed and room released.`);
            setRefreshKey(k => k + 1);
        } catch (err) {
            console.error('[QueueControl] Remove active failed:', err);
        }
    };

    const combinedActiveSessions = useMemo(() => {
        const list = [...activeSessions];

        rooms.forEach(r => {
            if (r.room_type === 'online') return;
            if (r.room_name?.toLowerCase().includes('online')) return;

            if (r.status === 'OCCUPIED' && r.current_application_id) {
                const app = applications.find(a => a.id === r.current_application_id);
                if (app?.metadata?.interview_mode === 'ONLINE') return;

                const hasSession = list.some(s => 
                    s.application_id === r.current_application_id || 
                    s.room === r.room_name
                );

                if (!hasSession) {
                    const qEntry = queue.find(q => q.application_id === r.current_application_id);
                    list.push({
                        id: r.id,
                        application_id: r.current_application_id,
                        queue_number: qEntry?.queue_number || (app as any)?.queue_number || 0,
                        queue_prefix: (app?.metadata?.interview_mode === 'ONLINE' || (r.room_type as string) === 'online') ? 'ONL' : (qEntry?.queue_prefix || (app as any)?.queue_prefix || (r.room_name?.toLowerCase().includes('final') ? 'F' : 'Q')),
                        applicant_name: r.current_applicant_name || app?.applicant_name || 'Candidate',
                        room: r.room_name,
                        timestamp: r.occupied_since || new Date().toISOString(),
                        queue_type: (r.room_name?.toLowerCase().includes('final') || getIsFinal(app, qEntry?.queue_type)) ? 'FINAL' : 'INITIAL',
                        assigned_interviewer_id: app?.assigned_recruiter_id || undefined,
                        assigned_interviewer_name: app?.assigned_recruiter_name || undefined,
                    } as QueueCallout);
                }
            }
        });

        return list;
    }, [activeSessions, rooms, applications]);

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
        user, queue, activeSessions: combinedActiveSessions, callHistory, rooms, loadingRooms, applications,
        refreshKey, recruiterOptions: availableRecruiters, validatorOptions: availableValidators, loadingUsers,
        callPrompt, setCallPrompt, promptData, setPromptData,
        initialWaiting, finalWaiting, draftQueue, reschedWaiting, loadQueue, loadRooms,
        handleCallNext, handleCallSpecificEntry, confirmCall, handleSkip, handleDelete,
        reschedulePrompt,
        setReschedulePrompt,
        confirmRescheduleDate,
        handleTerminate, handleRemoveActive, resetQueue
    };
}
