import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Monitor, Activity, Settings, Calendar, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueueControl } from './queue/hooks/useQueueControl';
import { MonitorPanel, QueueItemCard, EmptyState } from './queue/components/MonitorPanel';
import { StationMatrix, ScheduledQueue } from './queue/components/StationMatrix';
import { CallPromptModal } from './queue/components/QueueControlUI';
import { QueueSettingsModal } from './queue/components/QueueSettingsModal';
import { cn, formatQueueNumber } from '@/utils/formatters';
import { InterviewSession } from '@/components/features/InterviewRooms/InterviewSession';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { DailyCalendarModal } from './components/DailyCalendarModal';
import type { QueueCallout } from '@/types';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function QueueControl() {
    const navigate = useNavigate();
    const location = useLocation();
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [consoleTab, setConsoleTab] = useState<'queue' | 'draft' | 'resched'>('queue');
    const [activeDraftAppId, setActiveDraftAppId] = useState<string | null>(null);
    const [terminateConfirmSession, setTerminateConfirmSession] = useState<any | null>(null);
    const [terminateProgress, setTerminateProgress] = useState<number | null>(null);

    const {
        activeSessions, callHistory, rooms, loadingRooms, applications,
        refreshKey, recruiterOptions, validatorOptions,
        callPrompt, setCallPrompt, promptData, setPromptData,
        initialWaiting, finalWaiting, draftQueue, reschedWaiting, loadQueue, loadRooms,
        handleCallNext, handleCallSpecificEntry, confirmCall, handleSkip, handleDelete,
        reschedulePrompt, setReschedulePrompt, confirmRescheduleDate,
        handleTerminate, handleRemoveActive, resetQueue
    } = useQueueControl();

    const triggerTerminateSession = (session: any) => {
        if (session.room?.includes(' @ ')) {
            setTerminateConfirmSession(session);
        } else {
            handleTerminate(session);
        }
    };

    const executeTerminateSession = () => {
        if (!terminateConfirmSession) return;
        
        setTerminateProgress(0);
        const startTime = Date.now();
        const duration = 1200; 
        
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min(Math.round((elapsed / duration) * 100), 100);
            setTerminateProgress(percentage);
            
            if (percentage >= 100) {
                clearInterval(timer);
                
                handleTerminate(terminateConfirmSession);
                
                setTimeout(() => {
                    setTerminateProgress(null);
                    setTerminateConfirmSession(null);
                }, 300);
            }
        }, 30);
    };

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const { currentActiveSessions, scheduledSessions } = useMemo(() => {
        const current: QueueCallout[] = [];
        const scheduled: QueueCallout[] = [];

        // Parse "3:40 PM" or "03:40 PM" into { hours24, minutes }
        const parseAmPmTime = (str: string): { hours24: number; minutes: number } | null => {
            const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
            if (!match) return null;
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const period = match[3].toUpperCase();
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            return { hours24: h, minutes: m };
        };

        activeSessions.forEach(s => {
            if (s.room.includes(' @ ')) {
                const timeStr = s.room.split(' @ ')[1]; // e.g. "3:40 PM - 4:00 PM" or "14:30"
                if (timeStr) {
                    // Try AM/PM range format first (e.g. "3:40 PM - 4:00 PM")
                    const startTimeStr = timeStr.split(' - ')[0]; // "3:40 PM"
                    const parsed = parseAmPmTime(startTimeStr);

                    if (parsed) {
                        const currentMins = now.getHours() * 60 + now.getMinutes();
                        const startMins = parsed.hours24 * 60 + parsed.minutes;
                        const diff = (startMins - currentMins + 1440) % 1440;
                        if (diff > 0 && diff <= 720) {
                            scheduled.push(s);
                        } else {
                            current.push(s);
                        }
                    } else if (timeStr.includes(':')) {
                        // Legacy 24-hour format fallback (e.g. "14:30")
                        const [hours, minutes] = timeStr.split(':').map(Number);
                        const currentMins = now.getHours() * 60 + now.getMinutes();
                        const startMins = hours * 60 + minutes;
                        const diff = (startMins - currentMins + 1440) % 1440;
                        if (diff > 0 && diff <= 720) {
                            scheduled.push(s);
                        } else {
                            current.push(s);
                        }
                    } else {
                        current.push(s);
                    }
                } else {
                    current.push(s);
                }
            } else {
                current.push(s);
            }
        });

        return { currentActiveSessions: current, scheduledSessions: scheduled };
    }, [activeSessions, now]);

    const pastSessions = useMemo(() => {
        return activeSessions.filter(s => {
            if (s.room.includes(' @ ')) {
                const parts = s.room.split(' @ ');
                const dateStr = parts.length >= 3 ? parts[1] : new Date(now).toISOString().split('T')[0];
                const timeStr = parts.length >= 3 ? parts[2] : parts[1];
                
                if (timeStr) {
                    const rangeParts = timeStr.split(' - ');
                    const endTimeStr = rangeParts[1];
                    if (endTimeStr) {
                        let endDateTime = new Date(`${dateStr} ${endTimeStr}`).getTime();
                        if (endDateTime < now.getTime() - 12 * 60 * 60 * 1000) {
                            endDateTime += 24 * 60 * 60 * 1000;
                        }
                        if (!isNaN(endDateTime)) {
                            // If the end time has passed + 5 mins grace time, auto-terminate it
                            return now.getTime() > (endDateTime + 5 * 60 * 1000);
                        }
                    }
                }
            }
            return false;
        });
    }, [activeSessions, now]);

    const terminatingIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (pastSessions.length > 0) {
            pastSessions.forEach(s => {
                if (!terminatingIds.current.has(s.id)) {
                    terminatingIds.current.add(s.id);
                    handleTerminate(s);
                }
            });
        }
    }, [pastSessions, handleTerminate]);

    const { updateRoom } = useRoomStore();

    // Auto-update room status to OCCUPIED when a scheduled session hits its time slot
    useEffect(() => {
        if (currentActiveSessions.length > 0) {
            currentActiveSessions.forEach(session => {
                if (session.room.includes(' @ ')) {
                    const rawRoomName = session.room.split(' @ ')[0];
                    const timeSlot = session.room.split(' @ ')[1];
                    const targetRoom = rooms.find(r => r.room_name === rawRoomName);
                    
                    if (targetRoom && targetRoom.status === 'AVAILABLE') {
                        
                        const newReservations = (targetRoom.reservations || []).filter(r => 
                            !(r.time_slot === timeSlot && r.applicant_id === session.application_id)
                        );

                        updateRoom(targetRoom.id, {
                            status: 'OCCUPIED',
                            current_application_id: session.application_id,
                            current_applicant_name: session.applicant_name,
                            occupied_since: new Date().toISOString(),
                            reservations: newReservations
                        }).catch(console.error);
                    }
                }
            });
        }
    }, [currentActiveSessions, rooms, updateRoom]);

    const onsiteRooms = useMemo(() => {
        return rooms.filter(r => {
            return r.room_type !== 'online' && !r.room_name?.toLowerCase().includes('online');
        });
    }, [rooms]);

    const handleResume = (entry: any) => {
        let rawRoomName = entry.assigned_room_name || 'TBD';
        if (rawRoomName.includes(' @ ')) {
            rawRoomName = rawRoomName.split(' @ ')[0];
        }
        const room = rooms.find(r => r.room_name === rawRoomName);
        if (!room?.id) {
            setCallPrompt({ open: true, entry: entry, type: entry.queue_type });
            setPromptData({ room: '', interviewer: useAuthStore.getState().user?.full_name || '', callType: 'now', timeSlot: 'Immediate' });
            return;
        }

        setCallPrompt({ open: false, entry: entry, type: entry.queue_type });
        setPromptData({
            room: rawRoomName,
            interviewer: entry.assigned_interviewer_name || useAuthStore.getState().user?.full_name || 'System',
            callType: 'now',
            timeSlot: 'Immediate'
        });

        setTimeout(async () => {
            const roomId = await confirmCall();
            if (roomId) {
                const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                navigate(`${basePath}/interview/rooms`, { state: { autoOpenRoomId: roomId } });
            }
        }, 100);
    };

    const handleRescheduleActive = (session: any) => {
        setReschedulePrompt({ 
            open: true, 
            entry: {
                id: session.id,
                application_id: session.application_id,
                applicant_name: session.applicant_name,
                queue_number: session.queue_number,
                queue_prefix: session.queue_prefix,
                queue_type: session.queue_type,
                application_status: 'CALLED'
            } as any, 
            type: session.queue_type 
        });
    };

    return (
        <div key={refreshKey} className="space-y-5 pb-12 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border-b border-surface-200">
                <div className="relative px-6 pt-5 pb-4 flex flex-col items-center justify-center border-b border-surface-100">
                    <div className="flex items-center gap-2.5">
                        <Activity size={17} className="text-[#605e5c] dark:text-slate-400 self-center" />
                        <h1
                            className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            Queue Control
                        </h1>
                    </div>
                    <div className="flex items-center gap-2.5 mt-3">
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => { loadQueue(); loadRooms(); }}
                            className="flex items-center gap-1.5 px-3 h-7 bg-white dark:bg-slate-900 border border-surface-200 text-black/70 text-[11.5px] font-medium tracking-[-0.005em] hover:border-black/40 hover:text-black transition-all rounded-sm cursor-pointer"
                        >
                            <RefreshCw size={12} strokeWidth={2} className={cn(loadingRooms && "animate-spin")} /> Sync
                        </motion.button>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => setSettingsOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-white dark:bg-slate-900 border border-surface-200 text-black/70 text-[11.5px] font-medium tracking-[-0.005em] hover:border-black/40 hover:text-black transition-all rounded-sm cursor-pointer"
                        >
                            <Settings size={12} strokeWidth={2} /> Settings
                        </motion.button>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => setCalendarOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-surface-100 border border-surface-200 text-surface-700 text-[11.5px] font-medium tracking-[-0.005em] hover:bg-surface-200 transition-all rounded-sm cursor-pointer"
                        >
                            <Calendar size={12} strokeWidth={2.25} /> Daily Calendar
                        </motion.button>
                        <motion.a
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            href="/queue-display"
                            target="_blank"
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-black text-white text-[11.5px] font-medium tracking-[-0.005em] hover:bg-black/85 transition-all rounded-sm cursor-pointer"
                        >
                            <Monitor size={12} strokeWidth={2.25} /> Live display
                        </motion.a>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => {
                                if (window.confirm("Are you sure you want to reset the queue? This will clear all current queue distributions and reset the queue numbers back to 001.")) {
                                    resetQueue();
                                }
                            }}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-red-50 text-red-600 border border-red-200 text-[11.5px] font-medium tracking-[-0.005em] hover:bg-red-100 hover:border-red-300 transition-all rounded-sm cursor-pointer ml-2"
                        >
                            <RefreshCw size={12} strokeWidth={2} className="rotate-180" /> Reset Queue
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* TABS CONTAINER */}
            <div className="flex border-b border-surface-200 px-6 gap-6 mb-5">
                {(['queue', 'resched', 'draft'] as const).map(tab => {
                    const isDraftHasContent = tab === 'draft' && (draftQueue || []).length > 0;
                    return (
                        <button
                            key={tab}
                            onClick={() => setConsoleTab(tab)}
                            className={cn(
                                "py-3 text-[13px] font-bold border-b-2 px-3 transition-all uppercase tracking-wider relative flex items-center justify-center",
                                consoleTab === tab
                                    ? "border-[#0078d4] text-[#0078d4]"
                                    : (isDraftHasContent
                                        ? "border-amber-400 text-amber-600 bg-amber-50/60 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse rounded-t"
                                        : "border-transparent text-slate-400 hover:text-slate-600")
                            )}
                        >
                            <span>{tab === 'queue' ? 'Queue' : tab === 'resched' ? 'Resched' : 'Drafts'}</span>
                            <span className={cn(
                                "ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold",
                                isDraftHasContent && consoleTab !== 'draft'
                                    ? "bg-amber-600 text-white shadow-sm"
                                    : "bg-slate-100 dark:bg-slate-800/50 text-slate-600"
                            )}>
                                {tab === 'queue'
                                    ? (initialWaiting.length + finalWaiting.length)
                                    : tab === 'resched'
                                        ? reschedWaiting.length
                                        : (draftQueue || []).length}
                            </span>
                            {isDraftHasContent && consoleTab !== 'draft' && (
                                <motion.span 
                                    animate={{ x: [0, -5, 0] }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                                    className="ml-2 text-amber-600 font-extrabold text-[13px] inline-block select-none"
                                >
                                    ◀
                                </motion.span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="px-6">
                {consoleTab === 'queue' && (
                    <div className="grid lg:grid-cols-2 gap-5 mb-5">
                        <MonitorPanel
                            title="Initial queue"
                            count={initialWaiting.length}
                            onCallNext={() => handleCallNext('INITIAL')}
                            activeSessions={currentActiveSessions.filter(s => s.queue_type === 'INITIAL')}
                            onTerminate={handleTerminate}
                            onDeleteActive={handleRemoveActive}
                            onReschedActive={handleRescheduleActive}
                            rooms={rooms}
                            accent="blue"
                        >
                            {initialWaiting.length === 0 ? (
                                <EmptyState message="No applicants waiting in the initial queue" />
                            ) : (
                                initialWaiting.map((entry, index) => (
                                    <QueueItemCard
                                        key={entry.id}
                                        entry={entry}
                                        index={index}
                                        onCall={() => handleCallSpecificEntry(entry, 'INITIAL')}
                                        onResched={() => {
                                            setReschedulePrompt({ open: true, entry, type: 'INITIAL' });
                                        }}
                                        onSkip={() => handleSkip(entry.id, entry.applicant_name)}
                                        onDelete={() => handleDelete(entry.id, entry.applicant_name)}
                                    />
                                ))
                            )}
                        </MonitorPanel>

                        <MonitorPanel
                            title="Ops val queue"
                            count={finalWaiting.length}
                            onCallNext={() => handleCallNext('FINAL')}
                            activeSessions={currentActiveSessions.filter(s => s.queue_type === 'FINAL')}
                            onTerminate={handleTerminate}
                            onDeleteActive={handleRemoveActive}
                            onReschedActive={handleRescheduleActive}
                            rooms={rooms}
                            accent="rose"
                        >
                            {finalWaiting.length === 0 ? (
                                <EmptyState message="No applicants waiting for operations validation" />
                            ) : (
                                finalWaiting.map((entry, index) => (
                                    <QueueItemCard
                                        key={entry.id}
                                        entry={entry}
                                        index={index}
                                        onCall={() => handleCallSpecificEntry(entry, 'FINAL')}
                                        onResched={() => {
                                            setReschedulePrompt({ open: true, entry, type: 'FINAL' });
                                        }}
                                        onSkip={() => handleSkip(entry.id, entry.applicant_name)}
                                        onDelete={() => handleDelete(entry.id, entry.applicant_name)}
                                    />
                                ))
                            )}
                        </MonitorPanel>
                    </div>
                )}
                {consoleTab === 'draft' && (
                    <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm p-6 text-left shadow-sm min-h-[300px]">
                        <h2 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                            Draft Sessions (served without conclusion)
                        </h2>
                        {(!draftQueue || draftQueue.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                                <Activity size={24} className="text-slate-200" />
                                <p className="text-xs font-semibold uppercase tracking-wider">No draft sessions logged</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {draftQueue.map((entry: any) => {
                                    const app = applications.find(a => a.id === entry.application_id);
                                    const interviewerName = entry.assigned_interviewer_name || entry.interviewer_name || app?.assigned_recruiter_name || app?.assigned_ops_validator_name || app?.interviewer_name || 'Unassigned';
                                    return (
                                        <div key={entry.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    {formatQueueNumber(entry.queue_number, entry.queue_prefix)} — {entry.applicant_name}
                                                </h4>
                                                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                                                    Stage: {entry.queue_type} · Room: {entry.assigned_room_name || 'N/A'} · Interviewer: <span className="text-slate-600 font-bold">{interviewerName}</span> · Status: <span className="text-amber-600 font-bold">Initial Undefined</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setActiveDraftAppId(entry.application_id)}
                                                    className="h-8 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold uppercase rounded-sm transition-all shadow-sm cursor-pointer"
                                                >
                                                    Resume Session
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Are you sure you want to delete the draft session for ${entry.applicant_name}?`)) {
                                                            handleDelete(entry.id, entry.applicant_name);
                                                        }
                                                    }}
                                                    className="h-8 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold uppercase rounded-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                                    title="Delete Draft Session"
                                                >
                                                    <Trash2 size={13} />
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                {consoleTab === 'resched' && (
                    <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm p-6 text-left shadow-[0_2px_4px_rgba(0,0,0,0.02)] min-h-[300px]">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#edebe9] dark:border-slate-800">
                            <div className="w-8 h-8 bg-blue-50 flex items-center justify-center rounded-sm text-[#0078d4]">
                                <Calendar size={16} />
                            </div>
                            <h2 className="text-[16px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em]">
                                Rescheduled Sessions
                            </h2>
                        </div>
                        
                        {(!reschedWaiting || reschedWaiting.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-16 text-[#a19f9d] gap-3 bg-surface-50/50 rounded-sm border border-dashed border-[#edebe9] dark:border-slate-800">
                                <Calendar size={32} className="text-[#c8c6c4]" strokeWidth={1.5} />
                                <p className="text-[13px] font-medium tracking-[-0.005em]">No rescheduled sessions currently in queue</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {reschedWaiting.map((entry: any) => {
                                    const app = applications.find(a => a.id === entry.application_id);
                                    const interviewerName = entry.assigned_interviewer_name || entry.interviewer_name || app?.assigned_recruiter_name || app?.assigned_ops_validator_name || app?.interviewer_name || 'Unassigned';
                                    const rawRoom = entry.assigned_room_name || 'N/A';
                                    const roomStr = rawRoom.includes(' @ ') ? rawRoom.split(' @ ')[0] : rawRoom;
                                    const timeStr = rawRoom.includes(' @ ') ? rawRoom.split(' @ ')[1] : 'Unspecified Time';
                                    
                                    let formattedDate = timeStr;
                                    try {
                                        if (timeStr !== 'Unspecified Time') {
                                            const d = new Date(timeStr);
                                            if (!isNaN(d.getTime())) {
                                                formattedDate = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                                            }
                                        }
                                    } catch (e) {}
                                    
                                    const initials = entry.applicant_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
                                    
                                    return (
                                        <div key={entry.id} className="group relative bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 hover:border-[#0078d4] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 rounded-sm overflow-hidden flex flex-col">
                                            <div className="p-4 flex-1">
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-[#f3f2f1] text-[#0078d4] font-semibold text-[13px] tracking-[-0.005em] flex items-center justify-center rounded-sm shrink-0">
                                                            {initials}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-[14px] font-semibold text-[#323130] dark:text-slate-300 truncate tracking-[-0.005em] leading-tight">
                                                                {entry.applicant_name}
                                                            </h4>
                                                            <p className="text-[11.5px] font-medium text-[#605e5c] dark:text-slate-400 mt-0.5 tracking-[-0.005em]">
                                                                {formatQueueNumber(entry.queue_number, entry.queue_prefix)} · {entry.queue_type === 'INITIAL' ? 'Initial' : 'Final'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2 mt-4">
                                                    <div className="flex items-center gap-2 text-[12px] text-[#605e5c] dark:text-slate-400">
                                                        <Calendar size={13} className="text-[#0078d4]" />
                                                        <span className="font-semibold text-[#323130] dark:text-slate-300">{formattedDate}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[12px] text-[#605e5c] dark:text-slate-400">
                                                        <Monitor size={13} className="text-[#0078d4]" />
                                                        <span className="truncate">{roomStr}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[12px] text-[#605e5c] dark:text-slate-400">
                                                        <Activity size={13} className="text-[#0078d4]" />
                                                        <span className="truncate">{interviewerName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="px-4 py-3 bg-[#faf9f8] border-t border-[#edebe9] dark:border-slate-800 flex justify-end">
                                                <button
                                                    onClick={() => handleCallSpecificEntry(entry, entry.queue_type as 'INITIAL' | 'FINAL')}
                                                    className="w-full h-8 bg-[#0078d4] hover:bg-[#106ebe] text-white text-[12.5px] font-medium rounded-sm transition-colors tracking-[-0.005em]"
                                                >
                                                    Call Applicant
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {consoleTab === 'queue' && (
                <div className="grid lg:grid-cols-3 gap-5 px-6">
                    <StationMatrix rooms={onsiteRooms} loadingRooms={loadingRooms} />
                    <ScheduledQueue
                        scheduledSessions={scheduledSessions}
                        handleTerminate={triggerTerminateSession}
                    />
                </div>
            )}

            <CallPromptModal
                callPrompt={callPrompt as any}
                setCallPrompt={setCallPrompt as any}
                confirmCall={async () => { await confirmCall(); }}
                promptData={promptData as any}
                setPromptData={setPromptData as any}
                rooms={rooms.map(r => ({ ...r, room_name: r.room_name || 'Unnamed Room' })) as any}
                recruiterOptions={recruiterOptions}
                validatorOptions={validatorOptions}
                applications={applications}
            />

            <DailyCalendarModal 
                open={calendarOpen} 
                onClose={() => setCalendarOpen(false)} 
                rooms={rooms} 
            />

            <AnimatePresence>
                {settingsOpen && (
                    <QueueSettingsModal
                        open={settingsOpen}
                        onClose={() => setSettingsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {activeDraftAppId && (
                <InterviewSession
                    roomId={null}
                    rooms={rooms}
                    applications={applications}
                    onClose={() => setActiveDraftAppId(null)}
                    onComplete={() => {
                        setActiveDraftAppId(null);
                        loadQueue();
                    }}
                    draftApplicantId={activeDraftAppId}
                />
            )}

            <AnimatePresence>
                {terminateConfirmSession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={SPRING}
                            className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm w-full max-w-sm shadow-xl p-6 text-left flex flex-col gap-4 relative overflow-hidden"
                        >
                            {terminateProgress !== null ? (
                                <div className="py-6 flex flex-col items-center justify-center gap-4">
                                    <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest animate-pulse">
                                        Removing Candidate from Schedule...
                                    </span>
                                    <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden relative">
                                        <motion.div 
                                            className="h-full bg-rose-600"
                                            style={{ width: `${terminateProgress}%` }}
                                            transition={{ ease: 'easeOut' }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-surface-500 tabular-nums">
                                        {terminateProgress}%
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <h3 className="text-sm font-black text-surface-900 uppercase tracking-tight">
                                            Remove Scheduled Candidate
                                        </h3>
                                        <p className="text-xs text-surface-500 font-medium leading-relaxed">
                                            Are you sure you want to remove <strong className="text-surface-950 font-bold">{terminateConfirmSession.applicant_name}</strong> from the scheduled queue? This will also delete their room reservation counterpart.
                                        </p>
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                        <button
                                            onClick={executeTerminateSession}
                                            className="flex-1 py-3 bg-rose-600 text-white font-bold text-[10.5px] uppercase tracking-wider rounded-sm hover:bg-rose-700 transition-all shadow-sm"
                                        >
                                            Confirm Remove
                                        </button>
                                        <button
                                            onClick={() => setTerminateConfirmSession(null)}
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

            <AnimatePresence>
                {reschedulePrompt.open && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setReschedulePrompt({ open: false })}
                            className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)] rounded-sm overflow-visible"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#edebe9] dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-blue-50 rounded-sm flex items-center justify-center border border-blue-100">
                                        <Calendar size={15} className="text-[#0078d4]" />
                                    </div>
                                    <h2 className="text-[16px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em]">
                                        Reschedule applicant
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setReschedulePrompt({ open: false })}
                                    className="p-1.5 text-surface-500 hover:bg-surface-100 rounded-sm transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 text-left">
                                <div className="px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-sm flex items-center gap-2.5">
                                    <div className="w-7 h-7 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm flex items-center justify-center text-[#0078d4] font-semibold text-[12px] tracking-[-0.005em]">
                                        {reschedulePrompt.entry?.applicant_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em] truncate">
                                            {reschedulePrompt.entry?.applicant_name}
                                        </p>
                                        <p className="text-[11px] font-medium text-surface-500 tracking-[-0.005em] mt-0.5">
                                            Queue #{reschedulePrompt.entry?.queue_number} · {reschedulePrompt.entry?.queue_type === 'INITIAL' ? 'Initial' : 'Final'} interview
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-[11.5px] font-medium text-surface-500">
                                        <Calendar size={13} className="text-[#0078d4]" />
                                        Reschedule Date
                                    </label>
                                    <input
                                        type="date"
                                        id="resched-date-picker"
                                        className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] dark:text-slate-300 focus:outline-none focus:border-[#0078d4] transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-[#edebe9] dark:border-slate-800 bg-surface-50 flex items-center justify-end gap-2 rounded-b-sm">
                                <button
                                    onClick={() => setReschedulePrompt({ open: false })}
                                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 text-[#323130] dark:text-slate-300 text-[12.5px] font-medium rounded-sm hover:bg-surface-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const el = document.getElementById('resched-date-picker') as HTMLInputElement;
                                        if (el && el.value) {
                                            confirmRescheduleDate(el.value);
                                        }
                                    }}
                                    className="px-4 py-2 bg-[#0078d4] text-white text-[12.5px] font-medium rounded-sm hover:bg-[#106ebe] transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <Calendar size={14} /> Reschedule applicant
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
