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
        <div className="bg-white border border-surface-200 rounded-sm overflow-hidden h-fit">
            <div className="px-5 py-3.5 border-b border-surface-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Building2 size={14} className="text-[#605e5c]" />
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
                            <div key={room.id} className="flex items-center gap-3 p-2.5 bg-white border border-surface-200 hover:border-black/30 transition-all rounded-sm">
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
                        );
                    })
                )}
            </div>
        </div>
    );
}

interface ActivityStreamProps {
    callHistory: any[];
    activeSessions: QueueCallout[];
    handleTerminate: (s: QueueCallout) => void;
}

export function ActivityStream({ callHistory, activeSessions, handleTerminate }: ActivityStreamProps) {
    return (
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-surface-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Activity size={14} className="text-[#605e5c]" />
                    <h3 className="text-[13.5px] font-semibold text-surface-900 tracking-[-0.005em]">Recent activity</h3>
                </div>
                {activeSessions.length > 0 && (
                    <button
                        onClick={() => activeSessions.forEach(handleTerminate)}
                        className="flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-sm transition-colors tracking-[-0.005em]"
                    >
                        <RotateCcw size={11} strokeWidth={2} />
                        Reset all sessions
                    </button>
                )}
            </div>
            <div className="flex-1 p-4">
                {callHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-2.5">
                        <Clock size={20} className="text-surface-200" />
                        <p className="text-[11.5px] font-medium text-surface-400 tracking-[-0.005em]">No recent activity</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-2">
                        {callHistory.slice(0, 6).map((entry, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white border border-surface-200 hover:border-black/30 transition-all rounded-sm">
                                <div className="w-8 h-8 rounded-sm bg-surface-100 flex items-center justify-center shrink-0 text-[10.5px] font-semibold text-surface-700 tabular-nums tracking-[-0.005em]">
                                    #{entry.queue_number}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12.5px] font-semibold text-surface-900 truncate tracking-[-0.005em]">
                                        {entry.applicant_name}
                                    </p>
                                    <p className="text-[10.5px] text-surface-500 font-normal tracking-[-0.005em]">
                                        {entry.room} · {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
