import React from 'react';
import { Link } from 'react-router-dom';
import { CircleDot } from 'lucide-react';
import type { ActiveUser } from '@/hooks/usePresence';
import { OnlineUserRow } from './OnlineUserRow';

interface DashboardSidebarProps {
    applicationsLength: number;
    hiredLength: number;
    allOnlineUsers: ActiveUser[];
    currentUserId?: string;
    onViewAllOnline: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    applicationsLength,
    hiredLength,
    allOnlineUsers,
    currentUserId,
    onViewAllOnline
}) => {
    const onlineUserCount = allOnlineUsers.length;

    return (
        <div className="lg:col-span-4 space-y-6">
            {/* Who's Online Dashboard */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none overflow-hidden shadow-sm">
                <div className="p-4 bg-surface-50 border-b border-surface-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CircleDot size={12} className="text-vibrant-emerald animate-pulse" />
                        <h2 className="text-[11px] font-black text-surface-900 uppercase tracking-widest">Who's online</h2>
                    </div>
                    <span className="text-[10px] font-bold text-surface-500 bg-white dark:bg-slate-900 border border-surface-200 px-2 py-0.5 rounded-full">
                        {onlineUserCount} {onlineUserCount === 1 ? 'user' : 'users'}
                    </span>
                </div>
                <div className="divide-y divide-surface-100">
                    {allOnlineUsers.length === 0 ? (
                        <div className="p-8 text-center text-surface-400 text-xs italic">
                            No teammates online right now
                        </div>
                    ) : (
                        allOnlineUsers.slice(0, 5).map((u) => (
                            <OnlineUserRow
                                key={u.id}
                                user={u}
                                isSelf={u.id === currentUserId}
                            />
                        ))
                    )}
                </div>
                {allOnlineUsers.length > 5 && (
                    <button
                        onClick={onViewAllOnline}
                        className="w-full p-3 text-[10px] font-bold text-black hover:bg-surface-50 transition-colors uppercase tracking-widest border-t border-surface-200"
                    >
                        View all ({allOnlineUsers.length}) teammates
                    </button>
                )}
            </div>



            {/* Quick Stats Summary */}
            <div className="bg-gradient-to-br from-black to-surface-900 p-6 rounded-none text-white shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-4">Weekly Performance</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Conversion Rate</span>
                        <span className="text-2xl font-black">
                            {applicationsLength > 0 ? ((hiredLength / applicationsLength) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                    <div className="h-1 bg-white/10 dark:bg-slate-900/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-vibrant-emerald" 
                            style={{ width: `${(hiredLength / (applicationsLength || 1)) * 100}%` }}
                        />
                    </div>
                    <p className="text-[9px] text-white/50 leading-relaxed font-medium">
                        * Calculated based on total historical applications vs. successful hires.
                    </p>
                </div>
            </div>
        </div>
    );
};
