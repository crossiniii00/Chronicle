import React from 'react';
import { MapPin, Activity } from 'lucide-react';
import type { ActiveUser } from '@/hooks/usePresence';
import { formatUserRole } from './dashboardHelpers';

interface OnlineUserRowProps {
    user: ActiveUser;
    isSelf?: boolean;
    showActivity?: boolean;
}

export const OnlineUserRow: React.FC<OnlineUserRowProps> = ({ user, isSelf, showActivity }) => {
    const initials = (user.full_name || '?')
        .split(' ')
        .map(p => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const activityLabel = user.activity
        ? user.activity.type === 'edit' ? 'Editing'
            : user.activity.type === 'focus' ? 'Focused on'
            : 'Viewing'
        : null;

    return (
        <div className="flex items-center gap-3 p-3.5 hover:bg-surface-50 transition-colors group">
            <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-surface-100 to-surface-200 text-surface-700 flex items-center justify-center font-bold text-[11px]">
                    {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-vibrant-emerald border-2 border-white">
                    <span className="absolute inset-0 rounded-full bg-vibrant-emerald animate-ping opacity-60" />
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-[12px] font-semibold text-surface-900 truncate">
                        {user.full_name || 'Unknown user'}
                    </p>
                    {isSelf && (
                        <span className="text-[8px] font-bold text-black bg-black/5 border border-black/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            You
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-medium text-surface-500">
                    <span className="truncate">{formatUserRole(user.role)}</span>
                    {user.page && (
                        <>
                            <span className="text-surface-300">·</span>
                            <span className="truncate flex items-center gap-1">
                                <MapPin size={9} className="text-surface-400 shrink-0" />
                                {user.page}
                            </span>
                        </>
                    )}
                </div>
                {showActivity && activityLabel && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 text-[9px] font-bold text-vibrant-emerald bg-vibrant-emerald/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        <Activity size={9} />
                        {activityLabel}
                    </div>
                )}
            </div>
        </div>
    );
};
