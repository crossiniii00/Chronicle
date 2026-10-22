import React from 'react';
import { Building2, Activity, Loader2, Clock, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { InterviewRoom as Room, QueueCallout } from '@/types';

interface StationMatrixProps {
    rooms: Room[];
    loadingRooms: boolean;
}

export function StationMatrix({ rooms, loadingRooms }: StationMatrixProps) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm overflow-hidden h-fit">
            <div className="px-5 py-3.5 border-b border-surface-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Building2 size={14} className="text-[#605e5c] dark:text-slate-400" />
                    <h3 className="text-[13.5px] font-semibold text-surface-900 tracking-[-0.005em]">Stations</h3>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", loadingRooms ? "bg-surface-300" : "bg-emerald-500 animate-pulse")} />
                    <span className="text-[10.5px] font-medium text-surface-500 tracking-[-0.005em]">Live</span>
                </div>
            </div>
            <div className="p-3 space-y-1.5">
                {loadingRooms ? (
                    <div className="text-center py-8">
                        <Loader2 size={18} className="text-black/40 animate-spin mx-auto" />
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-[11.5px] font-medium text-surface-400 tracking-[-0.005em]">No stations configured</p>
                    </div>
                ) : (
                    rooms.map(room => {
                        const isOccupied = room.status === 'OCCUPIED';
                        return (

                            <div key={room.id} className="flex flex-col p-2.5 bg-white dark:bg-slate-900 border border-surface-200 hover:border-black/30 transition-all rounded-sm">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-sm flex items-center justify-center shrink-0 text-[11px] font-semibold tracking-[-0.005em]",
                                        isOccupied
                                            ? "bg-black text-white"
                                            : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                                    )}>
                                        {room.room_name?.slice(0, 2).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[12.5px] font-semibold text-surface-900 truncate tracking-[-0.005em]">
                                                {room.room_name}
                                            </p>
                                            <span className={cn(
                                                "text-[10px] font-semibold tracking-[-0.005em] tabular-nums uppercase",
                                                isOccupied ? "text-black" : "text-emerald-600"
                                            )}>
                                                {isOccupied ? "Active" : "Ready"}
                                            </span>
                                        </div>
                                        <p className="text-[10.5px] text-surface-500 font-normal truncate mt-0.5 tracking-[-0.005em]">
                                            {isOccupied ? room.current_applicant_name || 'In session' : 'Available'}
                                        </p>
                                    </div>
                                </div>
                                  {room.status === 'AVAILABLE' && (() => {
                                    return (
                                        <>
                                            <p className="text-[9.5px] font-medium text-surface-400 mt-1 uppercase tracking-wider">
                                                No active interview session
                                            </p>
                                             {(() => {
                                                 const upcoming = (room.reservations || []).filter((res: any) => res.time_slot?.trim()?.toLowerCase() !== 'immediate');
                                                 if (upcoming.length === 0) return null;
                                                 return (
                                                     <div className="mt-2 pt-2 border-t border-dashed border-surface-150 space-y-1">
                                                         <p className="text-[8px] font-bold text-surface-400 uppercase tracking-wider">Upcoming Reservations</p>
                                                         <div className="flex flex-wrap gap-1">
                                                             {upcoming.map((res: any, idx: number) => (
                                                                 <span 
                                                                     key={idx} 
                                                                     className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 text-[9.5px] font-bold rounded-sm"
                                                                     title={`Interviewer: ${res.interviewer_name} | Candidate: ${res.applicant_name}`}
                                                                 >
                                                                     {res.time_slot}
                                                                 </span>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 );
                                             })()}
                                        </>
                                    );
                                })()}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

interface ScheduledQueueProps {
    scheduledSessions: QueueCallout[];
    handleTerminate: (s: QueueCallout) => void;
}

export function ScheduledQueue({ scheduledSessions, handleTerminate }: ScheduledQueueProps) {
    return (
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-surface-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Clock size={14} className="text-[#605e5c] dark:text-slate-400" />
                    <h3 className="text-[13.5px] font-semibold text-surface-900 tracking-[-0.005em]">Scheduled queue</h3>
                </div>
                {scheduledSessions.length > 0 && (
                    <span className="text-[10.5px] font-medium text-surface-500 tracking-[-0.005em]">
                        {scheduledSessions.length} waiting
                    </span>
                )}
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {scheduledSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-2.5">
                        <Clock size={20} className="text-surface-200" />
                        <p className="text-[11.5px] font-medium text-surface-400 tracking-[-0.005em]">No scheduled candidates</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-2">
                        {scheduledSessions.map((entry, i) => {
                            const [roomName, timeStr] = entry.room.split(' @ ');
                            return (
                                <div key={`${entry.id}-${i}`} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-surface-200 hover:border-black/30 transition-all rounded-sm group">
                                    <div className="w-8 h-8 rounded-sm bg-blue-50 flex items-center justify-center shrink-0 text-[10.5px] font-semibold text-blue-700 tabular-nums tracking-[-0.005em]">
                                        #{entry.queue_number}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12.5px] font-semibold text-surface-900 truncate tracking-[-0.005em]">
                                            {entry.applicant_name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10.5px] font-medium text-surface-500 tracking-[-0.005em]">
                                                {roomName}
                                            </span>
                                            <span className="text-[10.5px] font-bold text-[#0078d4] tracking-[-0.005em] px-1.5 py-[1px] bg-blue-50 rounded-sm">
                                                {timeStr}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleTerminate(entry)}
                                        className="opacity-0 group-hover:opacity-100 h-7 px-2 flex items-center gap-1 text-[10.5px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-sm transition-all shrink-0"
                                    >
                                        Remove
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
