import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useQueueStore } from '@/store/queueStore';
import { useRoomStore } from '@/store/roomStore';
import { formatQueueNumber } from '@/utils/formatters';
import { Bell, Monitor, Users, ChevronRight, Activity, Clock, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { QueueEntry } from '@/types';
import { socketService } from '@/services/socketService';
import { ReportConfigService } from '@/services/ReportConfigService';

import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

const sortByCalledAtDesc = (a: QueueEntry, b: QueueEntry) =>
    new Date(b.called_at || 0).getTime() - new Date(a.called_at || 0).getTime();

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
            // E5 Tone
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            osc1.start(now);
            osc1.stop(now + 0.5);
            
            // C5 Tone (after 0.25s)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(523.25, now + 0.25);
            gain2.gain.setValueAtTime(0, now + 0.25);
            gain2.gain.linearRampToValueAtTime(0.15, now + 0.25 + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25 + 0.6);
            osc2.start(now + 0.25);
            osc2.stop(now + 0.25 + 0.6);
        } else if (chimeType === 'ding') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now); // A5
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (chimeType === 'bell') {
            // Play triad bell chord
            [783.99, 987.77, 1174.66].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.8);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.8);
            });
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
};

export function QueueDisplay() {
    const { queue, loadQueue } = useQueueStore();
    const [time, setTime] = useState(new Date());
    const [blinkingInitial, setBlinkingInitial] = useState(false);
    const [blinkingFinal, setBlinkingFinal] = useState(false);
    const [audioAllowed, setAudioAllowed] = useState(false);
    const lastCalledInitialRef = useRef<string | null>(null);
    const lastCalledFinalRef = useRef<string | null>(null);
    const ttsQueueRef = useRef<Set<string>>(new Set());
    const isSpeakingRef = useRef(false);

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
    // Use a ref so that socket callbacks always see the latest preset
    const activePresetRef = useRef(activePreset);
    useEffect(() => {
        activePresetRef.current = activePreset;
    }, [activePreset]);

    useEffect(() => {
        // Fetch active settings on mount
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
            console.log('[QueueDisplay] Received queue-settings:updated event:', data);
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
                console.warn('[QueueDisplay] Speech synthesis not supported');
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
            
            // Try to find configured voice
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
                console.log('[QueueDisplay] Using voice:', preferredVoice.name);
            }
            
            utterance.onend = () => {
                console.log('[QueueDisplay] Speech ended');
                isSpeakingRef.current = false;
                resolve();
            };
            
            utterance.onerror = (e) => {
                console.error('[QueueDisplay] Speech error:', e);
                isSpeakingRef.current = false;
                resolve();
            };
            
            console.log('[QueueDisplay] Speaking:', text);
            isSpeakingRef.current = true;
            window.speechSynthesis.speak(utterance);
        });
    }, []);

    const announceCall = useCallback(async (queueNumber: number, applicantName: string, roomName?: string, applicationId?: string) => {
        // Always read from ref to get the latest preset
        const preset = activePresetRef.current;
        const room = roomName || 'the interview room';
        
        // Use reference ID if reference mode is selected
        const displayNo = preset.systemMode === 'reference'
            ? getShortReferenceId(applicationId || '', queueNumber)
            : formatQueueNumber(queueNumber);

        const nameToAnnounce = preset.systemMode === 'standard_number' ? '' : applicantName;

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
        
        console.log('[QueueDisplay] Announcing:', announcementText, '| Preset:', preset.name || 'default', '| Mode:', preset.systemMode);
        
        try {
            // Play lobby chime
            playChime(preset.chime);
            // Wait slightly for chime to finish before speaking
            await new Promise(resolve => setTimeout(resolve, 800));

            // Wait if something is already speaking
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

    const { rooms, loadRooms } = useRoomStore();

    useVisibilityPolling(loadRooms, 60000, [loadRooms]);

    useEffect(() => {
        const socket = socketService.getSocket();
        const handleRoomsUpdated = () => void loadRooms();
        socket.on('rooms:updated', handleRoomsUpdated);
        return () => { socket.off('rooms:updated', handleRoomsUpdated); };
    }, [loadRooms]);

    useVisibilityPolling(loadQueue, 60000, [loadQueue]);

    useEffect(() => {
        const clockInterval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(clockInterval);
    }, []);

    useEffect(() => {
        const socket = socketService.getSocket();
        const handleQueueUpdated = () => void loadQueue();
        socket.on('queue:updated', handleQueueUpdated);
        return () => { socket.off('queue:updated', handleQueueUpdated); };
    }, [loadQueue]);

    // Listen for queue:called events and announce via Web Speech API
    useEffect(() => {
        const socket = socketService.getSocket();
        
        console.log('[QueueDisplay] Socket connected:', socket.connected);
        console.log('[QueueDisplay] Socket ID:', socket.id);
        
        // Load voices (they load asynchronously in some browsers)
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
        
        const handleQueueCalled = async (data: {
            queue_number: number;
            applicant_name: string;
            assigned_room_name?: string;
            queue_type: string;
            id: string;
            application_id?: string;
        }) => {
            console.log('[QueueDisplay] Received queue:called event:', data);
            
            // Prevent duplicate announcements for the same call
            if (ttsQueueRef.current.has(data.id)) {
                console.log('[QueueDisplay] Duplicate call ignored:', data.id);
                return;
            }
            ttsQueueRef.current.add(data.id);
            
            // Clean up old entries after 30 seconds
            setTimeout(() => ttsQueueRef.current.delete(data.id), 30000);
            
            await announceCall(data.queue_number, data.applicant_name, data.assigned_room_name, data.application_id);
        };
        
        socket.on('queue:called', handleQueueCalled);
        console.log('[QueueDisplay] Listening for queue:called events');
        
        return () => {
            socket.off('queue:called', handleQueueCalled);
        };
    }, [announceCall]);

    // Derived states
    const initialCalled = queue
        .filter(e => e.status === 'CALLED' && e.queue_type === 'INITIAL')
        .sort(sortByCalledAtDesc);

    const finalCalled = queue
        .filter(e => e.status === 'CALLED' && e.queue_type === 'FINAL')
        .sort(sortByCalledAtDesc);

    const initialWaiting = queue.filter(e => e.status === 'WAITING' && e.queue_type === 'INITIAL').slice(0, 8);
    const finalWaiting = queue.filter(e => e.status === 'WAITING' && e.queue_type === 'FINAL').slice(0, 8);

    // Watch for new calls to trigger blinking
    useEffect(() => {
        const latest = initialCalled[0];
        if (latest?.id && latest.id !== lastCalledInitialRef.current) {
            lastCalledInitialRef.current = latest.id;
            setBlinkingInitial(true);
            const stop = setTimeout(() => setBlinkingInitial(false), 10000);
            return () => clearTimeout(stop);
        }
    }, [initialCalled[0]?.id]);

    useEffect(() => {
        const latest = finalCalled[0];
        if (latest?.id && latest.id !== lastCalledFinalRef.current) {
            lastCalledFinalRef.current = latest.id;
            setBlinkingFinal(true);
            const stop = setTimeout(() => setBlinkingFinal(false), 10000);
            return () => clearTimeout(stop);
        }
    }, [finalCalled[0]?.id]);

    return (
        <div className="min-h-screen flex flex-col bg-[#faf9f8] text-slate-800 font-sans overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-[#edebe9] px-10 py-5 flex items-center justify-between shadow-sm relative z-50">
                <div className="flex items-center gap-6">
                    <div className="h-16 w-56 overflow-hidden flex items-center justify-center relative bg-white">
                        <img 
                            src="/contactpoint-full-logo.png" 
                            alt="ContactPoint 360 Logo" 
                            className="h-20 w-60 object-contain scale-[1.10] pointer-events-none" 
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                    <div>
                        <p className="text-4xl font-bold text-slate-900 tabular-nums leading-none tracking-tight">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 tracking-wide mt-2 flex items-center justify-end gap-2">
                            <Clock size={12} className="text-[#0078d4]" /> {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>

                    {!audioAllowed && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-[#0078d4]/10 border-[#0078d4]/20 text-[#0078d4] animate-pulse cursor-pointer text-[10px] font-black uppercase tracking-wider select-none">
                            <VolumeX size={12} className="animate-bounce" />
                            <span>Click screen to enable sound</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex flex-1 p-8 gap-8 overflow-hidden">
                <SectorDisplay
                    title="Initial Interview"
                    subtitle=""
                    currentCalls={initialCalled}
                    waitingList={initialWaiting}
                    isBlinking={blinkingInitial}
                    type="INITIAL"
                    onRecall={(qNum, name, rName) => {
                        const callObj = initialCalled.find(c => c.queue_number === qNum);
                        void announceCall(qNum, name, rName, callObj?.application_id);
                    }}
                    rooms={rooms}
                    systemMode={activePreset.systemMode}
                />

                <SectorDisplay
                    title="Final Interview"
                    subtitle=""
                    currentCalls={finalCalled}
                    waitingList={finalWaiting}
                    isBlinking={blinkingFinal}
                    type="FINAL"
                    onRecall={(qNum, name, rName) => {
                        const callObj = finalCalled.find(c => c.queue_number === qNum);
                        void announceCall(qNum, name, rName, callObj?.application_id);
                    }}
                    rooms={rooms}
                    systemMode={activePreset.systemMode}
                />
            </main>
        </div>
    );
}

const getRoomPicture = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('earth')) return 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=500&q=80';
    if (lower.includes('busay')) return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=500&q=80';
    if (lower.includes('tops')) return 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=500&q=80';
    if (lower.includes('osmena') || lower.includes('peak')) return 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=500&q=80';
    return 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=500&q=80';
};

function SectorDisplay({ title, subtitle, currentCalls, waitingList, isBlinking, type, onRecall, rooms, systemMode }: SectorDisplayProps & { onRecall: (queueNumber: number, applicantName: string, roomName?: string) => void }) {
    const isInitial = type === 'INITIAL';
    const accentColor = 'text-[#0078d4]';

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Sector Header */}
            <div className="mb-6 flex items-center justify-between bg-white p-4 border border-[#edebe9] rounded-sm border-t-4 shadow-sm" style={{ borderTopColor: '#0078d4' }}>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className={cn("px-3 py-1 bg-[#f3f2f1] text-[9px] font-bold uppercase tracking-widest border border-[#edebe9] rounded-sm", accentColor)}>
                    Section {isInitial ? '1' : '2'}
                </div>
            </div>

            {/* Calling Area - Multi-Slot */}
            <div className="flex-1 flex flex-col gap-6 mb-8 overflow-y-auto custom-scrollbar pr-2">
                {currentCalls.length > 0 ? (
                    currentCalls.map((call, index) => {
                        const matchingRoom = rooms.find(r => r.room_name === call.assigned_room_name);
                        return (
                            <div
                                key={call.id}
                                className={cn(
                                    "transition-all duration-700 relative p-5 shadow-sm rounded-sm border",
                                    call.application_status === 'INTERVIEW_IN_PROGRESS'
                                        ? "bg-emerald-50/30 border-emerald-200"
                                        : "bg-white border-[#edebe9]",
                                    index === 0 && isBlinking && "ring-4 ring-[#0078d4]/20"
                                )}
                            >
                                {index === 0 && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0078d4] px-4 py-1 border border-[#0078d4]/20 rounded-sm flex items-center gap-2 shadow-sm">
                                        <Bell size={12} className="text-white animate-bounce" />
                                        <span className="text-[9px] font-bold text-white uppercase tracking-[0.2em]">NEW CALL</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <p className={cn(
                                                "font-black tracking-tighter leading-none shrink-0", 
                                                systemMode === 'reference' ? "text-2xl" : "text-5xl", 
                                                call.application_status === 'INTERVIEW_IN_PROGRESS' ? "text-emerald-600" : accentColor
                                            )}>
                                                {systemMode === 'reference' 
                                                    ? getShortReferenceId(call.application_id, call.queue_number)
                                                    : formatQueueNumber(call.queue_number)}
                                            </p>
                                            <div className={cn("h-px flex-1", call.application_status === 'INTERVIEW_IN_PROGRESS' ? "bg-emerald-200/60" : "bg-[#edebe9]")} />
                                        </div>
                                        {systemMode !== 'standard_number' && (
                                            <h4 className={cn("font-semibold uppercase tracking-tight truncate text-lg", call.application_status === 'INTERVIEW_IN_PROGRESS' ? "text-emerald-900" : "text-slate-800")}>
                                                {call.applicant_name}
                                            </h4>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className={cn(
                                            "px-5 py-3 rounded-sm border text-center shrink-0 flex flex-col items-center gap-2",
                                            call.application_status === 'INTERVIEW_IN_PROGRESS'
                                                ? "bg-emerald-100/40 border-emerald-200"
                                                : "bg-[#faf9f8] border-[#edebe9]"
                                        )}>
                                            <div>
                                                <p className={cn(
                                                    "text-[9px] font-bold uppercase mb-1",
                                                    call.application_status === 'INTERVIEW_IN_PROGRESS' ? "text-emerald-700 font-extrabold animate-pulse" : "text-slate-400"
                                                )}>
                                                    {call.application_status === 'INTERVIEW_IN_PROGRESS' ? 'INTERVIEW ON GOING' : 'PROCEED TO'}
                                                </p>
                                                <p className={cn(
                                                    "font-bold leading-none text-lg", 
                                                    call.application_status === 'INTERVIEW_IN_PROGRESS' ? "text-emerald-600" : accentColor
                                                )}>
                                                    ROOM {call.assigned_room_name || 'TBD'}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => onRecall(call.queue_number, call.applicant_name, call.assigned_room_name)}
                                                className={cn(
                                                    "mt-1 flex items-center gap-1.5 px-2.5 py-1 border rounded-sm text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer select-none shadow-sm",
                                                    call.application_status === 'INTERVIEW_IN_PROGRESS'
                                                        ? "bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-800"
                                                        : "bg-white hover:bg-[#faf9f8] border-[#edebe9] text-slate-700"
                                                )}
                                            >
                                                <Volume2 size={10} className={call.application_status === 'INTERVIEW_IN_PROGRESS' ? "text-emerald-600" : "text-[#0078d4]"} />
                                                <span>Call Again</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-70">
                        <div className="w-16 h-16 border border-[#edebe9] bg-white rounded-sm flex items-center justify-center mb-4 shadow-sm">
                            <Users size={32} className="text-slate-400" />
                        </div>
                        <p className="text-xl font-bold text-slate-700 tracking-wide">Standby</p>
                        <p className="text-[10px] font-semibold text-slate-400 tracking-normal">Ready for applicants</p>
                    </div>
                )}
            </div>

            {/* Waiting List */}
            {isInitial && (
                <div className="bg-white border border-[#edebe9] rounded-sm shadow-sm flex flex-col min-h-0">
                    <div className="bg-[#faf9f8] px-6 py-3 border-b border-[#edebe9] flex items-center justify-between shrink-0">
                        <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em] flex items-center gap-3">
                            <Users size={12} className={accentColor} />
                            Waiting List
                        </h3>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                            {waitingList.length} Applicants
                        </span>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar divide-y divide-[#edebe9]">
                        {waitingList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                No one in queue
                            </div>
                        ) : (
                            waitingList.map((entry, i) => (
                                <div key={entry.id} className="group flex items-center justify-between px-6 py-3 hover:bg-[#faf9f8] transition-colors">
                                    <div className="flex items-center gap-6">
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {(i + 1).toString().padStart(2, '0')}
                                        </span>
                                        <p className="text-xl font-bold text-slate-800 tracking-tighter leading-none group-hover:text-[#0078d4] transition-colors">
                                            {systemMode === 'reference'
                                                ? getShortReferenceId(entry.application_id, entry.queue_number)
                                                : formatQueueNumber(entry.queue_number)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase">
                                            {entry.assigned_room_name || 'Station'}
                                        </p>
                                        <ChevronRight size={14} className="text-slate-350 group-hover:text-[#0078d4] transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
