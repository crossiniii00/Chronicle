import React, { useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import { Calendar } from 'lucide-react';
import type { InterviewRoom } from '@/types/misc';
import { cn } from '@/utils/formatters';

interface DailyCalendarModalProps {
    open: boolean;
    onClose: () => void;
    rooms: InterviewRoom[];
}

export function DailyCalendarModal({ open, onClose, rooms }: DailyCalendarModalProps) {
    const activeRooms = useMemo(() => {
        return rooms.filter(r => r.is_active && r.room_type !== 'online');
    }, [rooms]);

    const uniqueTimeSlots = useMemo(() => {
        const slotsSet = new Set<string>();
        
        rooms.forEach(room => {
            if (room.status === 'OCCUPIED' && (room as any).active_session_start_time && room.current_applicant_name) {
                slotsSet.add('Ongoing / Active');
            }
            if (room.reservations) {
                room.reservations.forEach(res => {
                    if (res.time_slot) slotsSet.add(res.time_slot);
                });
            }
        });

        const parseTimeToMins = (str: string) => {
            if (str === 'Ongoing / Active') return -1;
            const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return 9999;
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const period = match[3].toUpperCase();
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            return h * 60 + m;
        };

        return Array.from(slotsSet).sort((a, b) => parseTimeToMins(a) - parseTimeToMins(b));
    }, [rooms]);

    return (
        <Modal open={open} onClose={onClose} title="Daily Facility Calendar" size="xl">
            <div className="p-0 bg-surface-50 min-h-[450px] max-h-[80vh] overflow-y-auto custom-scrollbar">
                {uniqueTimeSlots.length === 0 || activeRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-left">
                        <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center border border-surface-200">
                            <Calendar size={28} className="text-surface-400" />
                        </div>
                        <h3 className="text-sm font-bold text-surface-700">No Scheduled facility usage</h3>
                        <p className="text-xs text-surface-500">No active rooms or reservations are set for today.</p>
                    </div>
                ) : (
                    <div className="p-6 overflow-x-auto text-left">
                        <div className="min-w-[850px] border border-surface-200 rounded-sm bg-white dark:bg-slate-900 shadow-xs">
                            {/* Grid Header */}
                            <div className="grid grid-cols-[120px_repeat(auto-fit,minmax(150px,1fr))] border-b border-surface-200 bg-surface-50">
                                <div className="p-3 text-[10px] font-black text-surface-400 uppercase tracking-widest text-center border-r border-surface-200 flex items-center justify-center">
                                    Time
                                </div>
                                {activeRooms.map(room => (
                                    <div key={room.id} className="p-3 text-[11px] font-black text-surface-700 uppercase tracking-wider text-center border-r border-surface-200 last:border-r-0 flex items-center justify-center truncate">
                                        {room.room_name || room.room_number}
                                    </div>
                                ))}
                            </div>

                            {/* Grid Body Rows */}
                            {uniqueTimeSlots.map((slot, rowIndex) => {
                                return (
                                    <div key={rowIndex} className="grid grid-cols-[120px_repeat(auto-fit,minmax(150px,1fr))] border-b border-surface-150 last:border-b-0 min-h-[90px]">
                                        {/* Time Column Cell */}
                                        <div className="p-3 border-r border-surface-200 bg-surface-50/50 flex flex-col items-center justify-center text-center">
                                            {slot === 'Ongoing / Active' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                                                    <span className="text-[9.5px] font-black text-rose-700 uppercase tracking-wider">Ongoing</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10.5px] font-black text-indigo-700 tracking-tight">{slot}</span>
                                            )}
                                        </div>

                                        {/* Room Columns Cells */}
                                        {activeRooms.map(room => {
                                            // Find if there is an event for this room in this slot
                                            let ev: any = null;
                                            if (slot === 'Ongoing / Active') {
                                                if (room.status === 'OCCUPIED' && room.current_applicant_name) {
                                                    ev = {
                                                        type: 'occupied',
                                                        applicantName: room.current_applicant_name,
                                                        interviewerName: 'Active Session'
                                                    };
                                                }
                                            } else {
                                                const res = (room.reservations || []).find(r => r.time_slot === slot);
                                                if (res) {
                                                    ev = {
                                                        type: 'reservation',
                                                        applicantName: res.applicant_name,
                                                        interviewerName: res.interviewer_name,
                                                        queueType: res.queue_type
                                                    };
                                                }
                                            }

                                            return (
                                                <div key={room.id} className="p-2.5 border-r border-surface-200 last:border-r-0 bg-white dark:bg-slate-900 flex flex-col justify-center relative min-h-[90px]">
                                                    {ev ? (
                                                        <div className={cn(
                                                            "w-full h-full p-2.5 border rounded-sm flex flex-col justify-between shadow-3xs transition-all hover:shadow-2xs",
                                                            ev.type === 'occupied'
                                                                ? "bg-rose-50/70 border-rose-200 text-rose-900 ring-1 ring-rose-100"
                                                                : ev.queueType === 'FINAL'
                                                                    ? "bg-purple-50/70 border-purple-200 text-purple-900"
                                                                    : "bg-blue-50/70 border-blue-200 text-blue-900"
                                                        )}>
                                                            <div className="space-y-0.5">
                                                                <p className="text-[11px] font-extrabold leading-tight">
                                                                    {ev.applicantName}
                                                                </p>
                                                                <p className="text-[9.5px] font-medium opacity-80 truncate">
                                                                    {ev.interviewerName}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5">
                                                                <span className="text-[8.5px] font-bold opacity-60 uppercase tracking-widest">
                                                                    {ev.type === 'occupied' ? 'Live' : 'Booked'}
                                                                </span>
                                                                {ev.type !== 'occupied' && (
                                                                    <span className={cn(
                                                                        "px-1 py-0.2 text-[7.5px] font-black uppercase tracking-wider border rounded-xs",
                                                                        ev.queueType === 'FINAL' ? "bg-purple-100/50 border-purple-300 text-purple-800" : "bg-blue-100/50 border-blue-300 text-blue-800"
                                                                    )}>
                                                                        {ev.queueType === 'FINAL' ? 'Final' : 'Initial'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center opacity-10 hover:opacity-20 transition-opacity">
                                                            <span className="text-[8.5px] font-black text-surface-400 uppercase tracking-widest">Free Slot</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
