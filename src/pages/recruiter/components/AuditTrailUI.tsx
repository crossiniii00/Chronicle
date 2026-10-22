import React from 'react';
import { Shield, History, Calendar, Search, User, Eye, Info, AlertTriangle, Zap, ShieldAlert, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, formatDateTime, getActionFriendlyLabel } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import type { AuditLog } from '@/types';

const ACTION_THEMES: Record<string, { label: string, color: string, icon: LucideIcon }> = {
    'APPLICATION.STATUS.UPDATE': { label: 'Status Update', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: History },
    'AUTH.LOGIN': { label: 'Sign In', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Shield },
    'AUTH.LOGOUT': { label: 'Sign Out', color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800', icon: Shield },
    'INTERVIEW_ROOM.JOIN': { label: 'Room Access', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Zap },
    'INTERVIEW_ROOM.LEAVE': { label: 'Room Exit', color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800', icon: Zap },
    'APPLICATION.DOCUMENT.UPLOAD': { label: 'Document Upload', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: History },
    'SYSTEM.CONFIG.CHANGE': { label: 'System Update', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle }
};

const getActionTheme = (action: string) => {
    const act = action.toUpperCase().trim();
    const theme = ACTION_THEMES[act] || {
        color: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800',
        icon: Info
    };
    return {
        ...theme,
        label: getActionFriendlyLabel(action)
    };
};

interface AuditHeaderProps { searchTerm: string; onSearchChange: (val: string) => void; }
export function AuditHeader({ searchTerm, onSearchChange }: AuditHeaderProps) {
    return (
        <div className="bg-white dark:bg-slate-900 border-b border-neutral-200 px-6 py-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 justify-center">
                    <ShieldAlert size={20} className="text-neutral-500" />
                    <h1 
                        className="text-2xl font-bold tracking-tight text-neutral-900"
                        style={{ fontFamily: 'var(--font-family-sans)', fontWeight: 800 }}
                    >
                        Audit Trail
                    </h1>
                </div>
                <p 
                    className="text-xs font-medium text-neutral-500 mt-1"
                    style={{ fontFamily: 'var(--font-family-sans)' }}
                >
                    Monitoring system activity and security events in real-time.
                </p>
            </div>
            <div className="relative group w-full max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-600 transition-colors pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 bg-white dark:bg-slate-900 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 transition-all text-center"
                    style={{ fontFamily: 'var(--font-family-sans)' }}
                />
            </div>
        </div>
    );
}

interface AuditStatsProps {
    stats: { total: number; today: number };
    onTodayClick?: () => void;
}

export function AuditStats({ stats, onTodayClick }: AuditStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-neutral-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm transition-all duration-200 hover:shadow-md">
                <div>
                    <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Total activities</p>
                    <p className="text-[26px] font-bold text-neutral-900 tracking-tight tabular-nums leading-none">{stats.total.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                    <History size={18} strokeWidth={2.25} />
                </div>
            </div>

            <button
                onClick={onTodayClick}
                className="bg-white dark:bg-slate-900 border border-neutral-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200 text-left hover:border-neutral-300"
            >
                <div>
                    <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Today's activity</p>
                    <div className="flex items-center gap-2">
                        <p className="text-[26px] font-bold text-blue-600 tracking-tight tabular-nums leading-none">{stats.today}</p>
                        <span className="inline-flex items-center gap-1 px-2 h-5 bg-blue-50 text-blue-700 border border-blue-150 text-[10px] font-semibold uppercase tracking-wider rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                </div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Calendar size={18} strokeWidth={2.25} />
                </div>
            </button>
        </div>
    );
}

const getLogExplanation = (log: AuditLog) => {
    const act = log.action.toLowerCase();
    const details = (log.details || (log as any).metadata || {}) as Record<string, any>;
    
    if (act.includes('status.update') && (details.fromStatus || details.toStatus)) {
        const from = details.fromStatus ? String(details.fromStatus).replace(/_/g, ' ') : 'APPLIED';
        const to = details.toStatus ? String(details.toStatus).replace(/_/g, ' ') : '';
        return (
            <p className="text-[10px] font-semibold text-neutral-500 mt-1 capitalize leading-normal">
                Changed status from <span className="font-bold text-neutral-700">{from}</span> to <span className="font-bold text-emerald-600">{to}</span>
            </p>
        );
    }
    
    if (act.includes('bulk_delete')) {
        return (
            <p className="text-[10px] font-semibold text-neutral-500 mt-1 leading-normal">
                Bulk deleted <span className="font-bold text-rose-600">{String(details.count || 0)}</span> applications
            </p>
        );
    }

    if (act.includes('bulk_patch')) {
        const fields = details.fields ? Object.keys(details.fields as object).join(', ') : 'fields';
        return (
            <p className="text-[10px] font-semibold text-neutral-500 mt-1 leading-normal capitalize">
                Bulk updated <span className="font-bold text-neutral-700">{fields.replace(/_/g, ' ')}</span> for {String(details.count || 0)} apps
            </p>
        );
    }

    if (act.includes('login') || act.includes('auth.login')) {
        return (
            <p className="text-[10px] font-semibold text-neutral-500 mt-1 leading-normal">
                Successful authentication session
            </p>
        );
    }

    if (log.resource_type) {
        return (
            <p className="text-[10px] font-semibold text-neutral-500 mt-1 leading-normal capitalize">
                Modified <span className="font-bold text-neutral-700">{log.resource_type}</span> record
            </p>
        );
    }

    return null;
};

const AuditLogRow = React.memo(({
    log,
    isSelected,
    onToggle,
    onPreview,
    isSelectionMode = false
}: {
    log: AuditLog;
    isSelected: boolean;
    onToggle: (id: string) => void;
    onPreview: (log: AuditLog) => void;
    isSelectionMode?: boolean;
}) => {
    const formattedDate = React.useMemo(() => formatDateTime(log.created_at), [log.created_at]);
    const theme = getActionTheme(log.action);
    const ActionIcon = theme.icon;

    return (
        <tr
            className={cn(
                'hover:bg-neutral-50/60 transition-colors group cursor-pointer border-b border-neutral-100 last:border-0',
                isSelected && 'bg-blue-50/30'
            )}
            onClick={() => onPreview(log)}
        >
            {isSelectionMode && (
                <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(log.id)}
                        className="w-4 h-4 rounded border-neutral-300 text-[#0078d4] focus:ring-0 cursor-pointer"
                    />
                </td>
            )}
            <td className="px-5 py-3.5 text-[12px] font-semibold text-neutral-800 tracking-tight tabular-nums">
                {formattedDate}
            </td>
            <td className="px-5 py-3.5">
                <div className="flex flex-col items-start">
                    <div className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-tight rounded-md border',
                        theme.color
                    )}>
                        <ActionIcon size={12} strokeWidth={2.25} />
                        {theme.label}
                    </div>
                    {getLogExplanation(log)}
                </div>
            </td>
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-neutral-100 border border-neutral-250 text-neutral-600 rounded-full flex items-center justify-center font-bold text-xs shadow-inner overflow-hidden">
                        {log.user_avatar ? (
                            <img src={log.user_avatar} alt={log.user_name || 'User'} className="w-full h-full object-cover" />
                        ) : (
                            log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'
                        )}
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[12px] font-bold text-neutral-800 tracking-tight leading-none">
                            {log.user_name || 'System'}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1 font-semibold tracking-wider uppercase">
                            {log.user_role || 'System'}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 py-3.5">
                <div className="flex flex-col">
                    <span className="text-[11.5px] font-bold text-neutral-700 tracking-tight">{log.resource_type || 'System'}</span>
                    <span className="text-[10.5px] font-mono text-neutral-400 mt-0.5">
                        {log.ip_address || '::1'}
                    </span>
                </div>
            </td>
            <td className="px-5 py-3.5 text-right">
                <button className="text-neutral-400 hover:text-[#0078d4] hover:bg-neutral-100/80 rounded-md p-1.5 transition-all">
                    <Eye size={15} />
                </button>
            </td>
        </tr>
    );
});

interface AuditTableProps {
    logs: AuditLog[];
    onPreview: (log: AuditLog) => void;
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onToggleSelectAll: () => void;
    isSelectionMode?: boolean;
}

export function AuditTable({ logs, onPreview, selectedIds, onToggleSelection, onToggleSelectAll, isSelectionMode = false }: AuditTableProps) {
    const isAllSelected = logs.length > 0 && selectedIds.size === logs.length;

    return (
        <div className="bg-white dark:bg-slate-900 border border-neutral-200/80 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50/70 border-b border-neutral-200/80">
                            {isSelectionMode && (
                                <th className="px-5 py-3 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={onToggleSelectAll}
                                        className="w-4 h-4 rounded border-neutral-300 text-[#0078d4] focus:ring-0 cursor-pointer"
                                    />
                                </th>
                            )}
                            <th className="px-5 py-3 text-left">Timestamp</th>
                            <th className="px-5 py-3 text-left">Action</th>
                            <th className="px-5 py-3 text-left">User</th>
                            <th className="px-5 py-3 text-left">Resource / IP</th>
                            <th className="px-5 py-3 text-right">View</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {logs.map((log: AuditLog) => (
                            <AuditLogRow
                                key={log.id}
                                log={log}
                                isSelected={selectedIds.has(log.id)}
                                onToggle={onToggleSelection}
                                onPreview={onPreview}
                                isSelectionMode={isSelectionMode}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            {logs.length === 0 && (
                <div className="text-center py-16 flex flex-col items-center justify-center">
                    <History className="text-neutral-300 mb-3" size={32} />
                    <p className="text-[13px] font-semibold text-neutral-800 tracking-tight">No activities found</p>
                    <p className="text-[11.5px] text-neutral-450 mt-1">Try adjusting your search or filters.</p>
                </div>
            )}
        </div>
    );
}

const formatPayloadKey = (key: string) => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
};

interface LogDetailsModalProps {
    log: AuditLog | null;
    open: boolean;
    onClose: () => void;
}

export function LogDetailsModal({ log, open, onClose }: LogDetailsModalProps) {
    if (!log) return null;
    const theme = getActionTheme(log.action);
    const ActionIcon = theme.icon;
    const details = (log.details || (log as any).metadata || {}) as Record<string, any>;
    const isStatusUpdate = log.action.toLowerCase().includes('status.update') && (!!details.fromStatus || !!details.toStatus);

    // Filter out standard status update fields and system details from the additional details list to avoid duplication
    const displayDetails = Object.entries(details).filter(([key]) => {
        if (isStatusUpdate && (key === 'toStatus' || key === 'fromStatus')) {
            return false;
        }
        if (key === 'computerName' || key === 'deviceName') {
            return false;
        }
        return true;
    });

    return (
        <Modal open={open} onClose={onClose} title="Activity details" size="lg">
            <div className="space-y-6 text-left" style={{ fontFamily: 'var(--font-family-sans)' }}>
                {/* Header overview card */}
                <div className="p-4 bg-neutral-50/50 border border-neutral-200/80 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm',
                            theme.color
                        )}>
                            <ActionIcon size={16} strokeWidth={2.25} />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-neutral-800 tracking-tight">{theme.label}</p>
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-0.5">System Audit Event</p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-[12px] font-bold text-neutral-800 tracking-tight tabular-nums">{formatDateTime(log.created_at)}</p>
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-0.5">Recorded Timestamp</p>
                    </div>
                </div>

                {/* Status Timeline Transition */}
                {isStatusUpdate && (
                    <div className="p-4 bg-emerald-50/10 border border-emerald-200/50 rounded-lg flex flex-col md:flex-row items-center justify-center gap-4 text-center select-none shadow-sm">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status Transition</span>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-md border border-neutral-200 capitalize">
                                {String(details.fromStatus || 'APPLIED').replace(/_/g, ' ').toLowerCase()}
                            </span>
                            <ArrowRight size={14} className="text-neutral-400 animate-pulse" />
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-255 capitalize">
                                {String(details.toStatus || '').replace(/_/g, ' ').toLowerCase()}
                            </span>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Event metadata */}
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-100 pb-1.5">Event Information</h4>
                        <div className="space-y-2">
                            {[
                                { label: 'Category', val: log.resource_type || 'System', badge: true },
                                { label: 'IP Address', val: log.ip_address || '::1', mono: true },
                                { label: 'Computer Hostname', val: details.computerName || 'Unknown Host' },
                                { label: 'Device Platform', val: details.deviceName || 'Unknown Device' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-start py-1.5 border-b border-neutral-100/50 last:border-0">
                                    <span className="text-[11px] font-semibold text-neutral-400">{item.label}</span>
                                    <span className={cn(
                                        "text-[11.5px] font-bold text-neutral-800 text-right max-w-[220px] break-all",
                                        item.mono && "font-mono text-[10.5px]",
                                        item.badge && "px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10.5px] capitalize"
                                    )}>
                                        {item.val}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* User Context */}
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-100 pb-1.5">User Context</h4>
                        <div className="space-y-4">
                            <div className="p-4 bg-neutral-50/50 border border-neutral-200/80 rounded-lg flex items-center gap-3.5 shadow-sm">
                                <div className="w-9 h-9 bg-neutral-100 border border-neutral-250 text-neutral-600 rounded-full flex items-center justify-center font-bold text-xs shadow-inner overflow-hidden">
                                    {log.user_avatar ? (
                                        <img src={log.user_avatar} alt={log.user_name || 'User'} className="w-full h-full object-cover" />
                                    ) : (
                                        log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'
                                    )}
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-neutral-800 tracking-tight">{log.user_name || 'System Process'}</p>
                                    <p className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider mt-0.5">{log.user_role || 'System'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data payload details */}
                {displayDetails.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-100 pb-1.5">Additional Details</h4>
                        <div className="border border-neutral-200/80 rounded-lg bg-neutral-50/50 p-4 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                {displayDetails.map(([key, val]) => {
                                    const friendlyKey = formatPayloadKey(key);
                                    let displayVal = '';
                                    if (val === null || val === undefined) {
                                        displayVal = 'None';
                                    } else if (typeof val === 'object') {
                                        displayVal = JSON.stringify(val);
                                    } else {
                                        displayVal = String(val).replace(/_/g, ' ');
                                    }

                                    return (
                                        <div key={key} className="flex justify-between items-center py-1.5 border-b border-neutral-100/50 last:border-0">
                                            <span className="text-[11px] font-semibold text-neutral-400">{friendlyKey}</span>
                                            <span className="text-[11.5px] font-bold text-neutral-800 capitalize text-right max-w-[200px] break-all">
                                                {displayVal}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-neutral-200">
                    <button
                        onClick={onClose}
                        className="h-8 px-4 bg-black text-white text-xs font-bold rounded-md hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </Modal>
    );
}
