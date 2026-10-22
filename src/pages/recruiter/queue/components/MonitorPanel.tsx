import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Zap, Trash, CheckCircle, Layout, Activity, PhoneCall, MoreVertical, SkipForward, ExternalLink, Calendar } from 'lucide-react';
import { cn, formatQueueNumber } from '@/utils/formatters';
import type { QueueCallout, QueueEntry } from '@/types';
import type { InterviewRoom } from '@/types';

type Accent = 'blue' | 'rose';

const ACCENT_STYLES: Record<Accent, { dot: string; ring: string; text: string; bg: string; border: string; btn: string; btnHover: string }> = {
    blue: {
        dot: 'bg-blue-500',
        ring: 'ring-blue-100',
        text: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200/60',
        btn: 'bg-blue-600',
        btnHover: 'hover:bg-blue-700',
    },
    rose: {
        dot: 'bg-rose-500',
        ring: 'ring-rose-100',
        text: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200/60',
        btn: 'bg-rose-600',
        btnHover: 'hover:bg-rose-700',
    },
};

export function MonitorPanel({
    title, count, onCallNext, children, activeSessions, onTerminate, onDeleteActive, onReschedActive, rooms, accent = 'blue'
}: {
    title: string; count: number; onCallNext: () => void; children: React.ReactNode;
    activeSessions: QueueCallout[]; onTerminate: (s: QueueCallout) => void; onDeleteActive: (s: QueueCallout) => void; onReschedActive?: (s: QueueCallout) => void;
    rooms?: InterviewRoom[];
    accent?: Accent;
}) {
    const a = ACCENT_STYLES[accent];
    const navigate = useNavigate();
    const location = useLocation();

    const goToRoom = (roomName: string) => {
        const room = rooms?.find(r => r.room_name === roomName);
        const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
        if (room?.id) {
            navigate(`${basePath}/interview/rooms`, { state: { autoOpenRoomId: room.id } });
        } else {
            navigate(`${basePath}/interview/rooms`);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm flex flex-col h-full min-h-[520px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Monitor size={14} className="text-[#605e5c] dark:text-slate-400" />
                    <h2 className="text-[13.5px] font-semibold text-surface-900 tracking-[-0.005em]">{title}</h2>
                    <span className="min-w-[20px] h-5 px-1.5 text-[10.5px] font-semibold rounded-full flex items-center justify-center bg-surface-100 text-surface-600 tabular-nums">
                        {count}
                    </span>
                    <span className="text-[10.5px] font-medium text-surface-400 tracking-[-0.005em]">waiting</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", a.dot, activeSessions.length > 0 && "animate-pulse")} />
                    <span className="text-[10.5px] font-medium text-surface-500 tracking-[-0.005em] tabular-nums">
                        {activeSessions.length} active
                    </span>
                </div>
            </div>

            <div className="p-4 bg-surface-50/30 border-b border-surface-200 min-h-[160px]">
                <AnimatePresence mode="popLayout">
                    {activeSessions.length > 0 ? (
                        <div className="space-y-2">
                            {activeSessions.map((session, index) => (
                                <motion.div
                                    key={`${session.id}-${index}`}
                                    initial={{ opacity: 0, scale: 0.98, y: 4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    className="bg-white dark:bg-slate-900 border border-surface-200 p-3 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn("w-7 h-7 flex items-center justify-center rounded-sm shrink-0", a.bg)}>
                                            <Zap size={12} className={a.text} fill="currentColor" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12.5px] font-semibold text-surface-900 truncate tracking-[-0.005em]">
                                                {formatQueueNumber(session.queue_number, session.queue_prefix)} — {session.applicant_name}
                                            </p>
                                            <p className="text-[10.5px] font-medium text-surface-500 tracking-[-0.005em]">
                                                {session.room} · started {new Date(session.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => goToRoom(session.room)}
                                            title={`Open ${session.room}`}
                                            className={cn(
                                                "h-7 px-2 flex items-center gap-1 text-[10.5px] font-medium rounded-sm transition-colors",
                                                a.text, a.bg, "hover:opacity-80"
                                            )}
                                        >
                                            <ExternalLink size={11} strokeWidth={2} /> Go to room
                                        </button>
                                        {onReschedActive && (
                                            <button onClick={() => onReschedActive(session)} className="h-7 px-2 flex items-center gap-1 text-[10.5px] font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-sm transition-colors">
                                                <Calendar size={11} strokeWidth={2} /> Reschedule
                                            </button>
                                        )}
                                        <button onClick={() => onDeleteActive(session)} className="h-7 px-2 flex items-center gap-1 text-[10.5px] font-medium text-black/55 hover:text-black hover:bg-black/5 rounded-sm transition-colors">
                                            <Trash size={11} strokeWidth={2} /> Remove
                                        </button>
                                        <button onClick={() => onTerminate(session)} className="h-7 px-2 flex items-center gap-1 text-[10.5px] font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-sm transition-colors">
                                            <CheckCircle size={11} strokeWidth={2} /> Finish
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[136px] border border-dashed border-surface-200 flex flex-col items-center justify-center text-center gap-2">
                            <Activity size={18} className="text-surface-200" />
                            <p className="text-[11.5px] font-medium text-surface-400 tracking-[-0.005em]">No active calls</p>
                            <button onClick={onCallNext} className={cn("text-[11.5px] font-medium tracking-[-0.005em] hover:opacity-70 transition-opacity border-b border-current pb-0.5", a.text)}>
                                Call next
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                {children}
            </div>
        </div>
    );
}

export function QueueItemCard({ entry, index, onCall, onResched, onSkip, onDelete }: { entry: QueueEntry, index: number, onCall: () => void, onResched: () => void, onSkip: () => void, onDelete: () => void }) {
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!menuOpen) return;
        const close = () => setMenuOpen(false);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [menuOpen]);

    const isFirst = index === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
                "p-3 flex items-center gap-3 transition-all relative border rounded-sm group",
                isFirst
                    ? "bg-white dark:bg-slate-900 border-black/30 shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                    : "bg-white dark:bg-slate-900 border-surface-200 hover:border-black/30"
            )}
        >
            <div className={cn(
                "w-7 h-7 flex items-center justify-center shrink-0 rounded-sm text-[12px] font-semibold tabular-nums",
                isFirst ? "bg-black text-white" : "bg-surface-100 text-surface-500"
            )}>
                {String(index + 1).padStart(2, '0')}
            </div>

            <div className="flex-1 min-w-0">
                <p className={cn("text-[12.5px] font-medium truncate leading-tight tracking-[-0.005em]", isFirst ? "text-surface-900" : "text-surface-700")}>
                    {entry.applicant_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10.5px] font-semibold tracking-[-0.005em] text-black/60 tabular-nums">
                        {formatQueueNumber(entry.queue_number, entry.queue_prefix)}
                    </span>
                    <span className="text-[10px] text-surface-400 font-normal tracking-[-0.005em]">· pending</span>
                </div>
            </div>

            <div className="flex gap-1">
                <button onClick={onCall} className={cn(
                    "h-7 px-2.5 flex items-center gap-1.5 rounded-sm transition-all text-[11px] font-medium tracking-[-0.005em]",
                    isFirst ? "bg-black text-white hover:bg-black/85" : "bg-white dark:bg-slate-900 border border-surface-200 text-black/70 hover:border-black/40 hover:text-black"
                )}>
                    <PhoneCall size={11} strokeWidth={2} /> Call
                </button>
                <button onClick={onResched} className={cn(
                    "h-7 px-2.5 flex items-center gap-1.5 rounded-sm transition-all text-[11px] font-medium tracking-[-0.005em]",
                    isFirst ? "bg-black text-white hover:bg-black/85" : "bg-white dark:bg-slate-900 border border-surface-200 text-black/70 hover:border-black/40 hover:text-black"
                )}>
                    <Calendar size={11} strokeWidth={2} /> Resched
                </button>
                <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center rounded-sm text-black/45 hover:text-rose-600 hover:bg-rose-50 transition-all">
                    <Trash size={12} strokeWidth={2} />
                </button>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMenuOpen(!menuOpen)} className="h-7 w-7 flex items-center justify-center rounded-sm text-black/45 hover:text-black hover:bg-black/5 transition-all">
                        <MoreVertical size={12} strokeWidth={2} />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 border border-surface-200 shadow-xl z-50 py-1 rounded-sm overflow-hidden">
                            <button onClick={() => { onSkip(); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[11.5px] font-medium text-surface-700 hover:bg-surface-50 transition-colors flex items-center gap-2 tracking-[-0.005em]">
                                <SkipForward size={11} className="text-black/40" /> Skip applicant
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-10 flex flex-col items-center justify-center text-center gap-2.5 border border-dashed border-surface-200 rounded-sm bg-white/50 dark:bg-slate-900/50">
            <Layout size={18} className="text-surface-200" />
            <p className="text-[11.5px] font-medium text-surface-400 max-w-[200px] leading-relaxed tracking-[-0.005em]">
                {message}
            </p>
        </div>
    );
}
