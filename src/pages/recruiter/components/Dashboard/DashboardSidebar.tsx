import React from 'react';
import { Link } from 'react-router-dom';
import { CircleDot } from 'lucide-react';
import type { AuditLog } from '@/types';
import type { ActiveUser } from '@/hooks/usePresence';
import { OnlineUserRow } from './OnlineUserRow';
import { formatActionName, formatUserRole } from './dashboardHelpers';
import { timeAgo } from '@/utils/formatters';

interface DashboardSidebarProps {
    recentAudits: AuditLog[];
    applicationsLength: number;
    hiredLength: number;
    allOnlineUsers: ActiveUser[];
    currentUserId?: string;
    onViewAllOnline: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    recentAudits,
    applicationsLength,
    hiredLength,
    allOnlineUsers,
    currentUserId,
    onViewAllOnline
}) => {
    const onlineUserCount = allOnlineUsers.length;

    return (
        <div className="lg:col-span-4 space-y-6">
            {/* Recent Activity */}
            <div className="bg-white border border-surface-200 rounded-sm overflow-hidden shadow-sm">
                <div className="p-4 bg-surface-50 border-b border-surface-200 flex items-center justify-between">
                    <h2 className="text-[11px] font-black text-surface-900 uppercase tracking-widest">Recent Activity</h2>
                    <Link to="/recruiter/audit" className="text-[10px] font-bold text-black hover:underline uppercase">History</Link>
                </div>
                <div className="divide-y divide-surface-100">
                    {recentAudits.length === 0 ? (
                        <div className="p-10 text-center text-surface-400 text-xs italic">
                            No recent activity
                        </div>
                    ) : (
                        recentAudits.map(log => (
                            <div key={log.id} className="p-4 hover:bg-surface-50 transition-colors group">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-black text-surface-800 truncate">
                                        {formatActionName(log.action)}
                                    </p>
                                    <span className="text-[9px] font-medium text-surface-500 shrink-0">
                                        {timeAgo(log.created_at)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-surface-500">
                                    {log.user_name} • <span className="font-bold text-surface-700">{formatUserRole(log.user_role)}</span>
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="bg-gradient-to-br from-black to-surface-900 p-6 rounded-sm text-white shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-4">Weekly Performance</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Conversion Rate</span>
                        <span className="text-2xl font-black">
                            {applicationsLength > 0 ? ((hiredLength / applicationsLength) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
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

            {/* Who's Online Dashboard */}
            <div className="bg-white border border-surface-200 rounded-sm overflow-hidden shadow-sm">
                <div className="p-4 bg-surface-50 border-b border-surface-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CircleDot size={12} className="text-vibrant-emerald animate-pulse" />
                        <h2 className="text-[11px] font-black text-surface-900 uppercase tracking-widest">Who's online</h2>
                    </div>
                    <span className="text-[10px] font-bold text-surface-500 bg-white border border-surface-200 px-2 py-0.5 rounded-full">
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
        </div>
    );
};
