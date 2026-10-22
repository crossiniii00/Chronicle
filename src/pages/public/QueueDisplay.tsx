import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQueueStore } from '@/store/queueStore';
import { useRoomStore } from '@/store/roomStore';
import { formatQueueNumber } from '@/utils/formatters';
import { Bell, Monitor, Users, ChevronRight, ChevronLeft, Eye, EyeOff, Activity, Clock, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { QueueEntry } from '@/types';
import { socketService } from '@/services/socketService';
import { ApplicationService } from '@/services/ApplicationService';
import { ReportConfigService } from '@/services/ReportConfigService';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

const sortByCalledAtDesc = (a: any, b: any) =>
    new Date(a.called_at || 0).getTime() < new Date(b.called_at || 0).getTime() ? 1 : -1;

const getFirstName = (fullName: string): string => {
    if (!fullName) return '';
    return fullName.trim().split(/\s+/)[0];
};

const getShortReferenceId = (applicationId: string, queueNumber: number): string => {
    if (!applicationId) return `APP-2026-${queueNumber}`;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId);
    if (isUuid) {
        const parts = applicationId.split('-');
        return `APP-2026-${parts[0].substring(0, 4).toUpperCase()}`;
    }
    return applicationId.toUpperCase();
};

const playChime = (chimeType: 'melodic' | 'ding' | 'bell' | 'none') => {
    if (chimeType === 'none') return;
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        if (chimeType === 'melodic') {
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now); // C5
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.8);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
            gain2.gain.setValueAtTime(0.15, now + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.95);

            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(783.99, now + 0.3); // G5
            gain3.gain.setValueAtTime(0.2, now + 0.3);
            gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc3.connect(gain3);
            gain3.connect(ctx.destination);
            osc3.start(now + 0.3);
            osc3.stop(now + 1.2);
        } else if (chimeType === 'ding') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        } else if (chimeType === 'bell') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.5);
        }
    } catch (e) {
        console.error('[QueueDisplay] Play chime failed:', e);
    }
};

type SectorDisplayProps = {
    title: string;
    subtitle: string;
    currentCalls: QueueEntry[];
    waitingList: QueueEntry[];
    isBlinking: boolean;
    type: 'INITIAL' | 'FINAL';
    rooms: any[];
    systemMode?: string;
    time?: Date;
    audioAllowed?: boolean;
    setAudioAllowed?: (allowed: boolean) => void;
    onHideSection?: () => void;
};

export function QueueDisplay() {
    const { queue, loadQueue } = useQueueStore();
    const { rooms, loadRooms } = useRoomStore();
    const [applications, setApplications] = useState<any[]>([]);
    const [time, setTime] = useState(new Date());
    const [blinkingInitial, setBlinkingInitial] = useState(false);
    const [blinkingFinal, setBlinkingFinal] = useState(false);
    const [hiddenSection, setHiddenSection] = useState<'INITIAL' | 'FINAL' | null>(null);
    const [audioAllowed, setAudioAllowed] = useState(false);
    const lastCalledInitialRef = useRef<string | null>(null);
    const lastCalledFinalRef = useRef<string | null>(null);
    const ttsQueueRef = useRef<Set<string>>(new Set());
    const isSpeakingRef = useRef(false);
    const announcedIdsRef = useRef<Set<string>>(new Set());
    const isInitialLoadRef = useRef(true);

    const defaultPreset = {
        chime: 'melodic' as const,
        voiceName: '',
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        template: 'Queue number {number}, {name}, please proceed to room {room}',
        systemMode: 'standard' as string | undefined
    };
    const [activePreset, setActivePreset] = useState<any>(defaultPreset);
    const activePresetRef = useRef(activePreset);
    useEffect(() => {
        activePresetRef.current = activePreset;
    }, [activePreset]);

    useEffect(() => {
        ReportConfigService.getById('queue-settings')
            .then((res) => {
                let parsed = res;
                if (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch (e) {
                        console.error('[QueueDisplay] Failed to parse stringified config_data:', e);
                    }
                }
                if (parsed && parsed.presets && parsed.activePresetId) {
                    const active = parsed.presets.find((p: any) => p.id === parsed.activePresetId);
                    if (active) setActivePreset(active);
                }
            })
            .catch(err => console.error('[QueueDisplay] Load settings failed:', err));
    }, []);

    // Listen for settings socket updates
    useEffect(() => {
        const socket = socketService.getSocket();
        const handleSettingsUpdated = (data: any) => {
            let parsed = data;
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                } catch (e) {
                    console.error('[QueueDisplay] Failed to parse stringified socket data:', e);
                }
            }
            if (parsed && parsed.presets && parsed.activePresetId) {
                const active = parsed.presets.find((p: any) => p.id === parsed.activePresetId);
                if (active) setActivePreset(active);
            }
        };
        socket.on('queue-settings:updated', handleSettingsUpdated);
        return () => {
            socket.off('queue-settings:updated', handleSettingsUpdated);
        };
    }, []);

    const speak = useCallback((text: string, preset: any): Promise<void> => {
        return new Promise((resolve) => {
            if (!window.speechSynthesis) {
                resolve();
                return;
            }
            if (preset.voiceName === 'none') {
                resolve();
                return;
            }
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = preset.rate;
            utterance.pitch = preset.pitch;
            utterance.volume = preset.volume;

            const voices = window.speechSynthesis.getVoices();
            let preferredVoice = null;
            if (preset.voiceName) {
                preferredVoice = voices.find(v => v.name === preset.voiceName);
            }
            if (!preferredVoice) {
                preferredVoice = voices.find(v =>
                    v.lang.startsWith('en') && v.name.includes('Google')
                ) || voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en')) || voices[0];
            }
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            utterance.onend = () => {
                isSpeakingRef.current = false;
                resolve();
            };
            utterance.onerror = () => {
                isSpeakingRef.current = false;
                resolve();
            };
            isSpeakingRef.current = true;
            window.speechSynthesis.speak(utterance);
        });
    }, []);

    const isOnlineSession = useCallback((assignedRoomName?: string, appId?: string) => {
        if (assignedRoomName) {
            const lowerRoom = assignedRoomName.toLowerCase();
            if (lowerRoom.includes('online') || lowerRoom.includes('virtual') || lowerRoom.includes('zoom') || lowerRoom.includes('teams')) {
                return true;
            }
        }
        if (appId) {
            const app = applications.find(a => a.id === appId);
            if (app) {
                const mode = String(app.metadata?.interview_mode || app.pis?.preferred_setup || app.interview_mode || '').toLowerCase();
                if (mode === 'online' || mode.includes('online')) return true;
            }
        }
        if (assignedRoomName && rooms && rooms.length > 0) {
            const normAssigned = assignedRoomName.toLowerCase().replace(/^room\s+/i, '').trim();
            const targetRoom = rooms.find(r => {
                const normRoom = (r.room_name || '').toLowerCase().replace(/^room\s+/i, '').trim();
                return normRoom === normAssigned;
            });
            if (targetRoom && (targetRoom.room_type === 'online' || targetRoom.room_name?.toLowerCase().includes('online'))) {
                return true;
            }
        }
        return false;
    }, [applications, rooms]);

    const announceCall = useCallback(async (queueNumber: number, applicantName: string, roomName?: string, applicationId?: string, call: any = {}) => {
        if (isOnlineSession(roomName, applicationId)) {
            return; // Online rooms/sessions are never announced over lobby speakers
        }
        const preset = activePresetRef.current;
        let room = roomName || 'the interview room';
        if (room.includes(' @ ')) {
            room = room.split(' @ ')[0];
        }
        const isManual = call.is_manual;
        const displayNo = preset.systemMode === 'reference'
            ? getShortReferenceId(applicationId || '', queueNumber)
            : (isManual ? (typeof queueNumber === 'number' ? formatQueueNumber(queueNumber, 'Q') : queueNumber) : formatQueueNumber(queueNumber, call.queue_prefix));

        const nameToAnnounce = preset.systemMode === 'standard_number' ? '' : getFirstName(applicantName);
        let announcementText = (preset.template || 'Queue number {number}, {name}, please proceed to room {room}')
            .replace('{number}', displayNo)
            .replace('{name}', nameToAnnounce)
            .replace('{room}', room);

        if (preset.systemMode === 'standard_number') {
            announcementText = announcementText
                .replace(/,\s*,/g, ',')
                .replace(/,\s*please/gi, ', please')
                .replace(/\s+/g, ' ')
                .trim();
        }

        try {
            playChime(preset.chime);
            await new Promise(resolve => setTimeout(resolve, 800));
            while (isSpeakingRef.current) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            await speak(announcementText, preset);
        } catch (err) {
            console.error('[QueueDisplay] Announcement failed:', err);
            isSpeakingRef.current = false;
        }
    }, [speak]);

    useEffect(() => {
        const checkAudio = async () => {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                if (ctx.state === 'running') {
                    setAudioAllowed(true);
                }
                await ctx.close();
            }
        };
        void checkAudio();

        const handleInteraction = () => {
            setAudioAllowed(true);
            window.removeEventListener('click', handleInteraction);
        };
        window.addEventListener('click', handleInteraction);
        return () => window.removeEventListener('click', handleInteraction);
    }, []);

    useVisibilityPolling(loadRooms, 300000, [loadRooms]);

    const loadApplications = useCallback(async () => {
        try {
            const { ApplicationService } = await import('@/services/ApplicationService');
            const apps = await ApplicationService.getAll();
            setApplications(apps);
        } catch (err) {
            console.error('Failed to load applications in QueueDisplay:', err);
        }
    }, []);

    useEffect(() => {
        void loadApplications();
    }, [loadApplications]);

    useVisibilityPolling(() => {
        void loadQueue();
        void loadApplications();
    }, 300000, [loadQueue, loadApplications]);

    useEffect(() => {
        const socket = socketService.getSocket();
        const handleRoomsUpdated = () => void loadRooms();
        socket.on('rooms:updated', handleRoomsUpdated);
        return () => { socket.off('rooms:updated', handleRoomsUpdated); };
    }, [loadRooms]);


    useEffect(() => {
        const clockInterval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(clockInterval);
    }, []);

    useEffect(() => {
        const socket = socketService.getSocket();
        const handleQueueUpdated = () => {
            void loadQueue();
            void loadApplications();
        };
        const handleAppsUpdated = (payload?: any) => {
            if (payload?.data && payload.applicationId) {
                ApplicationService.injectDelta(payload.applicationId, payload.data);
                setApplications(prev => {
                    const exists = prev.some(a => a.id === payload.applicationId);
                    if (exists) {
                        return prev.map(a => a.id === payload.applicationId ? { ...a, ...payload.data } : a);
                    } else {
                        return [payload.data, ...prev];
                    }
                });
            } else {
                void loadApplications();
            }
        };
        socket.on('queue:updated', handleQueueUpdated);
        socket.on('applications:updated', handleAppsUpdated);
        return () => {
            socket.off('queue:updated', handleQueueUpdated);
            socket.off('applications:updated', handleAppsUpdated);
        };
    }, [loadQueue, loadApplications]);

    // Listen for queue:called events
    useEffect(() => {
        const socket = socketService.getSocket();

        const handleQueueCalled = async (data: {
            queue_number: number;
            applicant_name: string;
            assigned_room_name?: string;
            queue_type: string;
            id: string;
            application_id?: string;
        }) => {
            // Check if time is met manually to avoid stale closure on `time`
            let timeMet = true;
            const rawRoom = data.assigned_room_name || '';
            if (rawRoom.includes(' @ ')) {
                const timeStr = rawRoom.split(' @ ')[1];
                if (timeStr) {
                    const startTimeStr = timeStr.split(' - ')[0];
                    const match = startTimeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                    const now = new Date();
                    if (match) {
                        let h = parseInt(match[1], 10);
                        const m = parseInt(match[2], 10);
                        const period = match[3].toUpperCase();
                        if (period === 'PM' && h !== 12) h += 12;
                        if (period === 'AM' && h === 12) h = 0;
                        const currentHours = now.getHours();
                        const currentMinutes = now.getMinutes();
                        if (currentHours < h || (currentHours === h && currentMinutes < m)) {
                            timeMet = false;
                        }
                    } else if (startTimeStr.includes(':')) {
                        const [h, m] = startTimeStr.split(':').map(Number);
                        const currentHours = now.getHours();
                        const currentMinutes = now.getMinutes();
                        if (currentHours < h || (currentHours === h && currentMinutes < m)) {
                            timeMet = false;
                        }
                    }
                }
            }

            if (!timeMet) {
                return; // Do not announce yet, will be picked up by effect when time is up
            }

            if (ttsQueueRef.current.has(data.id)) return;
            ttsQueueRef.current.add(data.id);
            announcedIdsRef.current.add(data.id);
            setTimeout(() => ttsQueueRef.current.delete(data.id), 30000);
            await announceCall(data.queue_number, data.applicant_name, data.assigned_room_name, data.application_id, data);
        };

        socket.on('queue:called', handleQueueCalled);
        return () => {
            socket.off('queue:called', handleQueueCalled);
        };
    }, [announceCall]);

    // Helper to check if a scheduled time is met
    const isTimeMet = (entry: any) => {
        const rawRoom = entry.assigned_room_name || '';
        if (rawRoom.includes(' @ ')) {
            const timeStr = rawRoom.split(' @ ')[1]; // "3:40 PM - 4:00 PM"
            if (timeStr) {
                const startTimeStr = timeStr.split(' - ')[0]; // "3:40 PM"
                const match = startTimeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                if (match) {
                    let h = parseInt(match[1], 10);
                    const m = parseInt(match[2], 10);
                    const period = match[3].toUpperCase();
                    if (period === 'PM' && h !== 12) h += 12;
                    if (period === 'AM' && h === 12) h = 0;

                    const currentHours = time.getHours();
                    const currentMinutes = time.getMinutes();
                    if (currentHours < h || (currentHours === h && currentMinutes < m)) {
                        return false; // Time not met yet
                    }
                } else if (startTimeStr.includes(':')) {
                    // 24-hour fallback
                    const [h, m] = startTimeStr.split(':').map(Number);
                    const currentHours = time.getHours();
                    const currentMinutes = time.getMinutes();
                    if (currentHours < h || (currentHours === h && currentMinutes < m)) {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const isRoomActiveForCall = useCallback((assignedRoomName?: string, appId?: string) => {
        if (!assignedRoomName || !rooms || rooms.length === 0) return true;
        const normAssigned = assignedRoomName.toLowerCase().replace(/^room\s+/i, '').trim();
        const targetRoom = rooms.find(r => {
            const normRoom = (r.room_name || '').toLowerCase().replace(/^room\s+/i, '').trim();
            return normRoom === normAssigned;
        });
        if (targetRoom) {
            if (targetRoom.status === 'AVAILABLE') return false;
            if (targetRoom.status === 'OCCUPIED' && targetRoom.current_application_id && appId && targetRoom.current_application_id !== appId) {
                return false;
            }
        }
        return true;
    }, [rooms]);

    // Derived states
    const initialCalled = useMemo(() => {
        const called = queue
            .filter(e => e.status === 'CALLED' && e.queue_type === 'INITIAL' && isTimeMet(e) && isRoomActiveForCall(e.assigned_room_name, e.application_id) && !isOnlineSession(e.assigned_room_name, e.application_id))
            .map(e => ({
                id: e.id,
                application_id: e.application_id,
                queue_number: e.queue_number,
                queue_prefix: e.queue_prefix,
                applicant_name: e.applicant_name,
                assigned_room_name: e.assigned_room_name,
                called_at: e.called_at,
                queue_type: e.queue_type,
                application_status: 'INTERVIEW_IN_PROGRESS'
            }));

        rooms.forEach(r => {
            if (r.room_type === 'online' || r.room_name?.toLowerCase().includes('online')) return;
            if (r.status === 'OCCUPIED' && r.current_application_id) {
                if (isOnlineSession(r.room_name, r.current_application_id)) return;

                const entry = queue.find(q => q.application_id === r.current_application_id);
                // Determine if it's final based on queue_type if available, otherwise fallback to room name
                const isFinal = entry?.queue_type === 'FINAL' || (!entry && r.room_name?.toLowerCase().includes('final'));

                if (!isFinal) {
                    const hasCall = called.some(c => c.application_id === r.current_application_id);
                    if (!hasCall) {
                        const app = applications.find(a => a.id === r.current_application_id);
                        called.push({
                            id: r.id,
                            application_id: r.current_application_id,
                            queue_number: entry?.queue_number || app?.queue_number || 0,
                            queue_prefix: entry?.queue_prefix || app?.queue_prefix || 'Q',
                            applicant_name: r.current_applicant_name || app?.applicant_name || 'Candidate',
                            assigned_room_name: r.room_name,
                            called_at: r.occupied_since || new Date().toISOString(),
                            queue_type: 'INITIAL',
                            application_status: 'INTERVIEW_IN_PROGRESS'
                        });
                    }
                }
            }
        });

        return called.sort(sortByCalledAtDesc) as any as QueueEntry[];
    }, [queue, rooms, applications, time, isRoomActiveForCall, isOnlineSession]);

    const finalCalled = useMemo(() => {
        const called = queue
            .filter(e => e.status === 'CALLED' && e.queue_type === 'FINAL' && isTimeMet(e) && isRoomActiveForCall(e.assigned_room_name, e.application_id) && !isOnlineSession(e.assigned_room_name, e.application_id))
            .map(e => ({
                id: e.id,
                application_id: e.application_id,
                queue_number: e.queue_number,
                queue_prefix: e.queue_prefix,
                applicant_name: e.applicant_name,
                assigned_room_name: e.assigned_room_name,
                called_at: e.called_at,
                queue_type: e.queue_type,
                application_status: 'INTERVIEW_IN_PROGRESS'
            }));

        rooms.forEach(r => {
            if (r.room_type === 'online' || r.room_name?.toLowerCase().includes('online')) return;
            if (r.status === 'OCCUPIED' && r.current_application_id) {
                if (isOnlineSession(r.room_name, r.current_application_id)) return;

                const entry = queue.find(q => q.application_id === r.current_application_id);
                // Determine if it's final based on queue_type if available, otherwise fallback to room name
                const isFinal = entry?.queue_type === 'FINAL' || (!entry && r.room_name?.toLowerCase().includes('final'));

                if (isFinal) {
                    const hasCall = called.some(c => c.application_id === r.current_application_id);
                    if (!hasCall) {
                        const app = applications.find(a => a.id === r.current_application_id);
                        called.push({
                            id: r.id,
                            application_id: r.current_application_id,
                            queue_number: entry?.queue_number || app?.queue_number || 0,
                            queue_prefix: entry?.queue_prefix || app?.queue_prefix || 'F',
                            applicant_name: r.current_applicant_name || app?.applicant_name || 'Candidate',
                            assigned_room_name: r.room_name,
                            called_at: r.occupied_since || new Date().toISOString(),
                            queue_type: 'FINAL',
                            application_status: 'INTERVIEW_IN_PROGRESS'
                        });
                    }
                }
            }
        });

        return called.sort(sortByCalledAtDesc) as any as QueueEntry[];
    }, [queue, rooms, applications, time, isRoomActiveForCall, isOnlineSession]);

    const initialWaiting = queue.filter(e => e.status === 'WAITING' && e.queue_type === 'INITIAL' && isTimeMet(e) && !isOnlineSession(e.assigned_room_name, e.application_id)).slice(0, 12);
    const finalWaiting = queue.filter(e => e.status === 'WAITING' && e.queue_type === 'FINAL' && isTimeMet(e) && !isOnlineSession(e.assigned_room_name, e.application_id)).slice(0, 12);

    // Initial load population
    useEffect(() => {
        if (queue.length > 0 && isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            queue.forEach(e => {
                if (e.status === 'CALLED' && isTimeMet(e)) {
                    announcedIdsRef.current.add(e.id);
                }
            });
        }
    }, [queue, time]);

    // Check for newly active scheduled sessions
    useEffect(() => {
        if (isInitialLoadRef.current) return;
        const allActive = [...initialCalled, ...finalCalled];
        allActive.forEach(async (entry) => {
            if (!announcedIdsRef.current.has(entry.id)) {
                announcedIdsRef.current.add(entry.id);
                if (!ttsQueueRef.current.has(entry.id)) {
                    ttsQueueRef.current.add(entry.id);
                    setTimeout(() => ttsQueueRef.current.delete(entry.id), 30000);
                    await announceCall(entry.queue_number, entry.applicant_name, entry.assigned_room_name, entry.application_id, entry);
                }
            }
        });
    }, [initialCalled, finalCalled, announceCall]);

    // Watch for new calls to trigger blinking
    useEffect(() => {
        const latest = initialCalled[0];
        if (latest?.id && latest.id !== lastCalledInitialRef.current) {
            lastCalledInitialRef.current = latest.id;
            setBlinkingInitial(true);
            const stop = setTimeout(() => setBlinkingInitial(false), 10000);
            return () => clearTimeout(stop);
        }
    }, [initialCalled]);

    useEffect(() => {
        const latest = finalCalled[0];
        if (latest?.id && latest.id !== lastCalledFinalRef.current) {
            lastCalledFinalRef.current = latest.id;
            setBlinkingFinal(true);
            const stop = setTimeout(() => setBlinkingFinal(false), 10000);
            return () => clearTimeout(stop);
        }
    }, [finalCalled]);

    return (
        <div className="min-h-screen flex flex-col bg-[#F3F4F6] text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
            <style>{`
                @keyframes initial-aura {
                    0% {
                        text-shadow: 0 0 4px rgba(27, 54, 93, 0.2);
                        filter: drop-shadow(0 0 1px rgba(27, 54, 93, 0.1));
                    }
                    50% {
                        text-shadow: 0 0 12px rgba(27, 54, 93, 0.7), 0 0 20px rgba(27, 54, 93, 0.4);
                        filter: drop-shadow(0 0 4px rgba(27, 54, 93, 0.3));
                    }
                    100% {
                        text-shadow: 0 0 4px rgba(27, 54, 93, 0.2);
                        filter: drop-shadow(0 0 1px rgba(27, 54, 93, 0.1));
                    }
                }
                @keyframes final-aura {
                    0% {
                        text-shadow: 0 0 4px rgba(220, 38, 38, 0.2);
                        filter: drop-shadow(0 0 1px rgba(220, 38, 38, 0.1));
                    }
                    50% {
                        text-shadow: 0 0 12px rgba(220, 38, 38, 0.7), 0 0 20px rgba(220, 38, 38, 0.4);
                        filter: drop-shadow(0 0 4px rgba(220, 38, 38, 0.3));
                    }
                    100% {
                        text-shadow: 0 0 4px rgba(220, 38, 38, 0.2);
                        filter: drop-shadow(0 0 1px rgba(220, 38, 38, 0.1));
                    }
                }
                .initial-aura-effect {
                    animation: initial-aura 2.5s infinite ease-in-out;
                }
                .final-aura-effect {
                    animation: final-aura 2.5s infinite ease-in-out;
                }
            `}</style>
            <main className="flex-1 p-5 flex flex-col min-h-0 overflow-hidden">
                {hiddenSection && (
                    <div className="bg-slate-900 text-white px-5 py-2.5 mb-3.5 rounded-sm flex items-center justify-between shadow-md border-l-4 border-amber-400 shrink-0">
                        <div className="flex items-center gap-3">
                            <EyeOff size={16} className="text-amber-400 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                Section Hidden: <strong className="text-white font-extrabold">{hiddenSection === 'INITIAL' ? 'Initial Interview (Section 1)' : 'Final Interview (Section 2)'}</strong>
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setHiddenSection(null)}
                            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-sm transition-all shadow-sm cursor-pointer"
                        >
                            <Eye size={14} />
                            <span>Show All Sections</span>
                        </button>
                    </div>
                )}

                <div className="flex-1 flex gap-0 overflow-hidden min-h-0">
                    {hiddenSection !== 'INITIAL' && (
                        <SectorDisplay
                            title="Initial Interview"
                            subtitle="Section 1"
                            currentCalls={initialCalled}
                            waitingList={initialWaiting}
                            isBlinking={blinkingInitial}
                            type="INITIAL"
                            onRecall={(qNum, name, rName) => {
                                const callObj = initialCalled.find(c => c.queue_number === qNum);
                                void announceCall(qNum, name, rName, callObj?.application_id, callObj);
                            }}
                            rooms={rooms}
                            systemMode={activePreset.systemMode}
                            onHideSection={() => setHiddenSection('INITIAL')}
                        />
                    )}

                    {/* Modern Solid Divider with Interactive Flow Diamond Icon */}
                    {hiddenSection === null && (
                        <div className="w-0.5 relative self-stretch flex items-center justify-center bg-slate-300/85 shrink-0 mx-6">
                            <button
                                type="button"
                                onClick={() => setHiddenSection('INITIAL')}
                                className="absolute h-9 w-9 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 hover:border-slate-400 shadow-md rounded-sm flex items-center justify-center z-10 rotate-45 cursor-pointer hover:scale-110 transition-all group"
                                title="Click to collapse Initial Interview"
                            >
                                <div className="-rotate-45 flex items-center justify-center">
                                    <ChevronRight size={16} className="text-[#1B365D] group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </button>
                        </div>
                    )}

                    {hiddenSection !== 'FINAL' && (
                        <SectorDisplay
                            title="Final Interview"
                            subtitle="Section 2"
                            currentCalls={finalCalled}
                            waitingList={finalWaiting}
                            isBlinking={blinkingFinal}
                            type="FINAL"
                            onRecall={(qNum, name, rName) => {
                                const callObj = finalCalled.find(c => c.queue_number === qNum);
                                void announceCall(qNum, name, rName, callObj?.application_id, callObj);
                            }}
                            rooms={rooms}
                            systemMode={activePreset.systemMode}
                            time={time}
                            audioAllowed={audioAllowed}
                            setAudioAllowed={setAudioAllowed}
                            onHideSection={() => setHiddenSection('FINAL')}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

function SectorDisplay({ title, subtitle, currentCalls, waitingList, isBlinking, type, onRecall, rooms, systemMode, time, audioAllowed, setAudioAllowed, onHideSection }: SectorDisplayProps & { onRecall: (queueNumber: number, applicantName: string, roomName?: string) => void }) {
    const isInitial = type === 'INITIAL';
    const accentColor = isInitial ? 'text-[#1B365D]' : 'text-[#DC2626]';
    const bgAccentColor = isInitial ? 'bg-[#1B365D]' : 'bg-[#DC2626]';
    const borderAccentColor = isInitial ? 'border-[#1B365D]/25' : 'border-[#DC2626]/25';
    const softBgAccentColor = isInitial ? 'bg-[#E8EEF5]' : 'bg-[#FEF2F2]';

    return (
        <div
            className="flex flex-col min-h-0 w-full"
            style={{ flex: '1' }}
        >
            {/* Sector Header */}
            <div className="mb-3.5 flex items-center justify-between bg-white dark:bg-slate-900 py-3 px-5 border border-[#edebe9] dark:border-slate-800 rounded-sm border-t-4 shadow-sm" style={{ borderTopColor: isInitial ? '#1B365D' : '#DC2626' }}>
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                        {title}
                    </h2>
                    <p className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider mt-1.5">
                        {subtitle}
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className={cn("px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest border border-[#edebe9] dark:border-slate-800 rounded-sm", softBgAccentColor, accentColor)}>
                        {isInitial ? 'Section 1' : 'Section 2'}
                    </div>
                    {onHideSection && (
                        <button
                            type="button"
                            onClick={onHideSection}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 rounded-sm transition-all shadow-xs cursor-pointer group"
                            title={`Hide ${title} section`}
                        >
                            <EyeOff size={14} className="shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:text-white" />
                            <span>Hide Section</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-layout: Stacks vertically to maximize Active Call width, with Waiting List horizontal at the bottom */}
            <div className="flex-1 flex flex-col min-h-0 gap-6">
                {/* Active Calls Area (now spans full 100% width of the sector!) */}
                <div
                    className="flex flex-col min-h-0 flex-1"
                >
                    <div className="mb-1.5 flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-wider">
                            Active Call List
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {currentCalls.length} Active
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pt-3.5 flex flex-col gap-4 items-start w-full">
                        {currentCalls.length > 0 ? (
                            currentCalls.map((call, index) => {
                                const isNewBlinking = index === 0 && isBlinking;
                                return (
                                    <div
                                        key={call.id}
                                        className={cn(
                                            "transition-all duration-700 relative p-6 px-8 rounded-sm border flex flex-row items-center w-full shadow-sm",
                                            call.application_status === 'INTERVIEW_IN_PROGRESS'
                                                ? "bg-emerald-50/20 border-emerald-200"
                                                : "bg-white dark:bg-slate-900 border-[#edebe9] dark:border-slate-800",
                                            isNewBlinking && cn("ring-4", isInitial ? "ring-[#1B365D]/30" : "ring-[#DC2626]/30")
                                        )}
                                    >
                                        {index === 0 && (
                                            <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-0.5 border rounded-sm flex items-center gap-1.5 shadow-sm text-white z-10", bgAccentColor, borderAccentColor)}>
                                                <Bell size={10} className="text-white animate-bounce" />
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em]">NEW CALL</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-[1.6fr_0.8fr_1.8fr_auto] items-center w-full gap-6">
                                            {/* Queue Number & Candidate Name stacked */}
                                            <div className="flex flex-col justify-center min-w-0">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Now Calling</span>
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <span className={cn(
                                                        "font-black tracking-tighter leading-none text-7xl lg:text-8xl shrink-0",
                                                        accentColor,
                                                        isInitial ? "initial-aura-effect" : "final-aura-effect"
                                                    )}>
                                                        {systemMode === 'reference'
                                                            ? getShortReferenceId(call.application_id, call.queue_number)
                                                            : formatQueueNumber(call.queue_number, call.queue_prefix)}
                                                    </span>
                                                    {systemMode !== 'standard_number' && (
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="h-5 w-px bg-slate-200 shrink-0" />
                                                            <span className="font-black uppercase tracking-tight truncate text-3xl lg:text-4xl text-slate-800 dark:text-slate-200">
                                                                {getFirstName(call.applicant_name)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Animated Transit Pathway */}
                                            <div className="flex flex-col justify-center items-center w-full">
                                                <span className="text-[9px] font-bold text-transparent uppercase tracking-wider mb-2 select-none">Transit</span>
                                                <div className="flex items-center justify-center gap-2 w-full px-2">
                                                    <span className="h-0.5 flex-1 bg-slate-200 rounded-full" />
                                                    <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
                                                        <span className="animate-pulse text-[10px] font-black" style={{ animationDelay: '0ms' }}>&gt;&gt;</span>
                                                        <span className="animate-pulse text-[10px] font-black" style={{ animationDelay: '150ms' }}>&gt;&gt;</span>
                                                        <span className="animate-pulse text-[10px] font-black" style={{ animationDelay: '300ms' }}>&gt;&gt;</span>
                                                    </div>
                                                    <span className="h-0.5 flex-1 bg-slate-200 rounded-full" />
                                                </div>
                                            </div>

                                            {/* Destination Room with Icon */}
                                            <div className="flex flex-col justify-center min-w-0">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                                    {call.application_status === 'INTERVIEW_IN_PROGRESS' ? 'Interview Ongoing' : 'Proceed To'}
                                                </span>
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-sm shrink-0 border border-slate-200 dark:border-slate-800/80">
                                                        <Monitor size={15} className={cn(accentColor, call.application_status === 'INTERVIEW_IN_PROGRESS' && "animate-pulse")} />
                                                    </div>
                                                    <p className={cn(
                                                        "font-black leading-none text-2xl lg:text-3xl uppercase truncate",
                                                        accentColor
                                                    )}>
                                                        ROOM {call.assigned_room_name?.split(' @ ')[0] || 'TBD'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Call Button */}
                                            <div className="shrink-0 flex flex-col justify-end">
                                                <span className="text-[9px] font-bold text-transparent uppercase tracking-wider mb-2 select-none">Action</span>
                                                <button
                                                    onClick={() => onRecall(call.queue_number, call.applicant_name, call.assigned_room_name)}
                                                    className={cn(
                                                        "flex items-center justify-center w-10 h-10 border rounded-sm transition-colors cursor-pointer select-none shadow-sm",
                                                        call.application_status === 'INTERVIEW_IN_PROGRESS'
                                                            ? "bg-white dark:bg-slate-900 hover:bg-emerald-50 border-emerald-200 text-emerald-800"
                                                            : "bg-white dark:bg-slate-900 hover:bg-[#faf9f8] border-[#edebe9] dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                                    )}
                                                >
                                                    <Volume2 size={16} className={accentColor} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-70 min-h-[250px] w-full">
                                <div className="w-20 h-20 border border-[#edebe9] dark:border-slate-800 bg-white dark:bg-slate-900 rounded-sm flex items-center justify-center mb-4 shadow-sm">
                                    <Users size={40} className="text-slate-400" />
                                </div>
                                <p className="text-2xl font-black text-slate-700 dark:text-slate-300 tracking-wide">Standby</p>
                                <p className="text-xs font-semibold text-slate-400 tracking-normal">Ready for applicants</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Row Footer: Initial Interview Waiting Queue VS Final Interview Sector Header */}
                {isInitial ? (
                    <div className="h-[72px] shrink-0 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-sm flex flex-row items-center overflow-hidden w-full">
                        <div className="bg-[#faf9f8] border-r border-[#edebe9] dark:border-slate-800 px-4 h-full flex flex-col justify-center shrink-0 min-w-[120px]">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Waiting Queue</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                                {waitingList.length} In Queue
                            </span>
                        </div>

                        <div className="flex-1 flex flex-row items-center gap-3 overflow-x-auto px-4 py-2 custom-scrollbar">
                            {waitingList.length === 0 ? (
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wider italic">No one in queue</span>
                            ) : (
                                waitingList.map((entry) => (
                                    <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 bg-[#f3f4f6] border border-[#edebe9] dark:border-slate-800 rounded-sm shrink-0">
                                        <span className="text-xs font-black text-[#1B365D]">
                                            {systemMode === 'reference'
                                                ? getShortReferenceId(entry.application_id, entry.queue_number)
                                                : formatQueueNumber(entry.queue_number)}
                                        </span>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{getFirstName(entry.applicant_name)}</span>
                                        <span className="text-[9px] font-bold text-slate-400">({entry.assigned_room_name?.split(' @ ')[0] || 'Station'})</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* Relocated Page Header (Branding & Date/Time Footer) side-by-side with Section 1 Waiting Queue */
                    <div className="h-[72px] shrink-0 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-sm flex items-center justify-between px-6 w-full">
                        {/* Logo Left */}
                        <div className="flex items-center">
                            <div className="h-14 w-56 overflow-hidden flex items-center justify-center relative bg-white dark:bg-slate-900">
                                <img
                                    src="/contactpoint-full-logo.png"
                                    alt="ContactPoint 360"
                                    className="h-16 w-60 object-contain scale-[1.20]"
                                />
                            </div>
                        </div>

                        {/* Clock & Date & Audio Alert Right */}
                        <div className="flex items-center gap-6 text-right">
                            {time && (
                                <div>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none tracking-tight">
                                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </p>
                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide mt-1.5 flex items-center justify-end gap-1.5 animate-pulse">
                                        <Clock size={10} className="text-[#1B365D]" /> {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            )}

                            {!audioAllowed && setAudioAllowed && (
                                <div
                                    onClick={() => setAudioAllowed(true)}
                                    className="flex items-center gap-2 px-3 py-1 rounded-sm border bg-[#1B365D]/10 border-[#1B365D]/20 text-[#1B365D] animate-pulse cursor-pointer text-[9px] font-black uppercase tracking-wider select-none"
                                >
                                    <VolumeX size={10} className="animate-bounce" />
                                    <span>Sound Off</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
