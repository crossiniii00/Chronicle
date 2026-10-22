import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, Check, Building2, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useQueueStore } from '@/store/queueStore';
import { useRoomStore } from '@/store/roomStore';
import { ApplicationService } from '@/services/ApplicationService';
import { PartyLogo } from './PartyLogo';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';
import { socketService } from '@/services/socketService';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

export interface NavItem {
    path: string;
    label: string;
    title?: string;
    icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    subItems?: NavItem[];
}

export interface NavGroup {
    header?: string;
    items: NavItem[];
}

function PixelCursor({ colorClass }: { colorClass: string }) {
    return (
        <svg
            viewBox="0 0 6 9"
            className={cn("w-3 h-4", colorClass)}
            shapeRendering="crispEdges"
        >
            <rect x="3" y="0" width="1" height="1" fill="currentColor" />
            <rect x="2" y="1" width="2" height="1" fill="currentColor" />
            <rect x="1" y="2" width="3" height="1" fill="currentColor" />
            <rect x="0" y="3" width="4" height="1" fill="currentColor" />
            <rect x="0" y="4" width="4" height="1" fill="currentColor" />
            <rect x="1" y="5" width="3" height="1" fill="currentColor" />
            <rect x="2" y="6" width="2" height="1" fill="currentColor" />
            <rect x="3" y="7" width="1" height="1" fill="currentColor" />
            <rect x="3" y="8" width="1" height="1" fill="currentColor" />
        </svg>
    );
}

function getCategoryColor(label: string) {
    const l = label.toLowerCase();
    if (l.includes('dashboard') || l.includes('overview')) {
        return {
            text: 'text-sky-400',
            hoverText: 'group-hover:text-sky-400',
            activeBg: 'bg-sky-500/10 text-sky-100 border-l-[3px] border-sky-400',
            glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(14,165,233,0.15)]',
            bullet: 'bg-sky-400',
            activeBorder: 'border-sky-400'
        };
    }
    if (l.includes('tracker') || l.includes('management') || l.includes('users') || l.includes('employee')) {
        return {
            text: 'text-emerald-400',
            hoverText: 'group-hover:text-emerald-400',
            activeBg: 'bg-emerald-500/10 text-emerald-100 border-l-[3px] border-emerald-400',
            glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(16,185,129,0.15)]',
            bullet: 'bg-emerald-400',
            activeBorder: 'border-emerald-400'
        };
    }
    if (l.includes('hiring') || l.includes('chr') || l.includes('posting') || l.includes('account')) {
        return {
            text: 'text-amber-400',
            hoverText: 'group-hover:text-amber-400',
            activeBg: 'bg-amber-500/10 text-amber-100 border-l-[3px] border-amber-400',
            glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(245,158,11,0.15)]',
            bullet: 'bg-amber-400',
            activeBorder: 'border-amber-400'
        };
    }
    if (l.includes('mhrt') || l.includes('salary') || l.includes('directory') || l.includes('reference')) {
        return {
            text: 'text-rose-400',
            hoverText: 'group-hover:text-rose-400',
            activeBg: 'bg-rose-500/10 text-rose-100 border-l-[3px] border-rose-400',
            glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(244,63,94,0.15)]',
            bullet: 'bg-rose-400',
            activeBorder: 'border-rose-400'
        };
    }
    if (l.includes('settings') || l.includes('question') || l.includes('typing') || l.includes('email')) {
        return {
            text: 'text-pink-400',
            hoverText: 'group-hover:text-pink-400',
            activeBg: 'bg-pink-500/10 text-pink-100 border-l-[3px] border-pink-400',
            glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(236,72,153,0.15)]',
            bullet: 'bg-pink-400',
            activeBorder: 'border-pink-400'
        };
    }
    if (l.includes('interview') || l.includes('queue') || l.includes('scheduling') || l.includes('room') || l.includes('console')) {
        return {
            text: 'text-purple-400',
            hoverText: 'group-hover:text-purple-400',
            activeBg: 'bg-purple-500/10 text-purple-100 border-l-[3px] border-purple-400',
            glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(168,85,247,0.15)]',
            bullet: 'bg-purple-400',
            activeBorder: 'border-purple-400'
        };
    }
    if (l.includes('active tasks') || l.includes('backups') || l.includes('database')) {
        return {
            text: 'text-violet-400',
            hoverText: 'group-hover:text-violet-400',
            activeBg: 'bg-violet-500/10 text-violet-100 border-l-[3px] border-violet-400',
            glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(139,92,246,0.15)]',
            bullet: 'bg-violet-400',
            activeBorder: 'border-violet-400'
        };
    }
    if (l.includes('reports') || l.includes('analytics') || l.includes('log') || l.includes('audit')) {
        return {
            text: 'text-orange-400',
            hoverText: 'group-hover:text-orange-400',
            activeBg: 'bg-orange-500/10 text-orange-100 border-l-[3px] border-orange-400',
            glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(249,115,22,0.15)]',
            bullet: 'bg-orange-400',
            activeBorder: 'border-orange-400'
        };
    }
    
    return {
        text: 'text-neutral-200',
        hoverText: 'group-hover:text-white',
        activeBg: 'bg-white/10 text-white border-l-[3px] border-white',
        glow: 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(255,255,255,0.1)]',
        bullet: 'bg-white',
        activeBorder: 'border-white'
    };
}

interface SidebarProps {
    groups: NavGroup[];
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

function SidebarItem({ item, depth = 0, groupKey }: { item: NavItem; depth?: number; groupKey?: string }) {
    const location = useLocation();
    const { expandedMenus, toggleMenu, setMenuExpanded } = useUIStore();
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const pathMatches = React.useCallback((path: string) => {
        return location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
    }, [location.pathname]);

    const isActive = hasSubItems
        ? location.pathname === item.path || !!item.subItems?.some(sub => pathMatches(sub.path))
        : pathMatches(item.path);
    const isExpanded = !!expandedMenus[item.label];

    const lastActive = React.useRef(isActive);

    // Automatically expand when navigating into this section,
    // but don't force it open if the user manually collapses it.
    React.useEffect(() => {
        if (isActive && !lastActive.current) {
            setMenuExpanded(item.label, true);
        }
        lastActive.current = isActive;
    }, [isActive, item.label, setMenuExpanded]);

    const Icon = item.icon;
    const colorInfo = getCategoryColor(item.label);

    const renderIcon = (size: number) => Icon ? (
        <span
            className={cn(
                "shrink-0 inline-flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-115 group-hover:rotate-[6deg]",
                colorInfo.text,
                !isActive && "opacity-75 group-hover:opacity-100"
            )}
        >
            <Icon
                size={depth > 0 ? 14 : 16}
                strokeWidth={isActive ? 2.25 : 1.75}
                className="shrink-0"
            />
        </span>
    ) : null;

    return (
        <div className="space-y-0.5">
            {hasSubItems ? (
                <button
                    onClick={() => toggleMenu(item.label)}
                    title={item.title}
                    className={cn(
                        'w-full flex items-center pl-3 pr-2.5 py-2 text-[13px] transition-colors duration-200 group relative rounded-md outline-none',
                        depth > 0 ? 'ml-3 py-1.5 text-[12.5px]' : '',
                        isActive
                            ? cn('font-semibold bg-white/[0.04]', colorInfo.text)
                            : 'text-slate-300 font-medium hover:text-white hover:bg-white/[0.035]'
                    )}
                >
                    {isActive && (
                        <motion.span
                            layoutId="sidebar-pixel-cursor"
                            className="absolute -left-2 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
                        >
                            <motion.span
                                animate={{ opacity: [0.7, 1, 0.7] }}
                                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                                className="block"
                            >
                                <PixelCursor colorClass={colorInfo.text} />
                            </motion.span>
                        </motion.span>
                    )}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {renderIcon(depth > 0 ? 14 : 18)}
                        <span className="truncate text-left tracking-[-0.005em]">{item.label}</span>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 0 : -90, opacity: isExpanded ? 0.8 : 0.4 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="ml-auto shrink-0 text-slate-400 group-hover:text-white"
                    >
                        <ChevronDown size={12} strokeWidth={2} />
                    </motion.div>
                </button>
            ) : (
                <Link
                    to={item.path}
                    title={item.title}
                    className={cn(
                        'flex items-center pl-3 pr-2.5 py-2 text-[13px] transition-colors duration-200 group relative rounded-md outline-none',
                        depth > 0 ? 'ml-3 py-1.5 text-[12.5px]' : '',
                        isActive
                            ? cn('font-semibold bg-white/[0.04]', colorInfo.text)
                            : 'text-slate-300 font-medium hover:text-white hover:bg-white/[0.035]'
                    )}
                >
                    {isActive && (
                        <motion.span
                            layoutId="sidebar-pixel-cursor"
                            className="absolute -left-2 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
                        >
                            <motion.span
                                animate={{ opacity: [0.7, 1, 0.7] }}
                                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                                className="block"
                            >
                                <PixelCursor colorClass={colorInfo.text} />
                            </motion.span>
                        </motion.span>
                    )}
                    {depth > 0 && !isActive && (
                        <motion.span
                            animate={{ scale: [1, 1.25, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className={cn(
                                "absolute -left-[5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all duration-200",
                                colorInfo.bullet,
                                "opacity-50 group-hover:opacity-90"
                            )}
                        />
                    )}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {renderIcon(depth > 0 ? 14 : 18)}
                        <span className={cn("truncate whitespace-nowrap shrink-0 tracking-[-0.005em]")}>{item.label}</span>
                        {item.label === 'Queue Console' && (
                            <QueueConsoleBadge />
                        )}
                        {item.label === 'Application Management' && (
                            <ApplicationManagementBadge />
                        )}
                        {item.label === 'Interview Rooms' && (
                            <InterviewRoomsBadge />
                        )}
                        {item.label === 'Interview Desk' && (
                            <InterviewDeskBadge />
                        )}
                    </div>
                    {item.label === 'Notifications' && (
                        <NotificationBadge />
                    )}
                </Link>
            )}

            {hasSubItems && isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="relative ml-[19px] pl-3 space-y-0.5 mt-0.5"
                >
                    <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-800" />
                    {item.subItems?.map(sub => (
                        <SidebarItem key={sub.path} item={sub} depth={depth + 1} groupKey={groupKey} />
                    ))}
                </motion.div>
            )}
        </div>
    );
}

function NotificationBadge() {
    const { unreadCount } = useNotificationStore();
    if (unreadCount === 0) return null;
    return (
        <span className="ml-auto bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
        </span>
    );
}

function QueueConsoleBadge() {
    const { queue, loadQueue } = useQueueStore();
    
    useVisibilityPolling(loadQueue, 60000, [loadQueue]);

    React.useEffect(() => {
        const socket = socketService.getSocket();
        const handleQueueUpdated = () => void loadQueue();
        socket.on('queue:updated', handleQueueUpdated);
        return () => { socket.off('queue:updated', handleQueueUpdated); };
    }, [loadQueue]);

    const waitingCount = queue.filter((e: any) => e.status === 'WAITING').length;
    if (waitingCount === 0) return null;

    return (
        <span className="ml-1.5 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-4 text-center flex items-center gap-1 shadow-[0_0_6px_rgba(239,68,68,0.3)] animate-pulse shrink-0">
            <span className="relative flex h-1 w-1 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1 w-1 bg-white"></span>
            </span>
            {waitingCount}
        </span>
    );
}

function ApplicationManagementBadge() {
    const [count, setCount] = React.useState(0);
    const { user } = useAuthStore();
    const { permissions } = useAccountTypeSettings();

    const loadCount = React.useCallback(async () => {
        try {
            const allApps = await ApplicationService.getAll();
            let pendingCount = 0;
            
            const role = user?.role;
            const rerouteEnabled = role ? !!permissions[role]?.['allow_rerouting'] : false;
            const reroutedAccounts: string[] = role && permissions[role]?.['rerouted_accounts']
                ? permissions[role]['rerouted_accounts']
                : ['keller postman', 'auto approve'];

            if (rerouteEnabled) {
                pendingCount = allApps.filter((a: any) => {
                    const metadata = a.metadata || {};
                    const isExplicitlyEndorsed = !!a.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                    const isSpecializedAccount = reroutedAccounts.some(dept => dept.toUpperCase() === (a.department || '').toUpperCase());
                    const schedulingStatus = a.recruiter_s_scheduling_status || metadata.recruiter_s_scheduling_status;
                    const isPending = !schedulingStatus || schedulingStatus === 'PENDING';
                    const isAtInboxStage = a.current_status === 'FINAL_INTERVIEW' || a.current_status === 'APPLIED';
                    return (isExplicitlyEndorsed || (isSpecializedAccount && a.current_status === 'FINAL_INTERVIEW')) && isPending && isAtInboxStage;
                }).length;
            } else {
                pendingCount = allApps.filter((a: any) => a.source === 'WEBAPP' && a.current_status === 'APPLIED').length;
            }
            setCount(pendingCount);
        } catch (error) {
            console.error('[Sidebar] Failed to load application management count:', error);
        }
    }, [user?.role, permissions]);

    useVisibilityPolling(loadCount, 60000, [loadCount]);

    React.useEffect(() => {
        const socket = socketService.getSocket();
        const handleUpdate = () => loadCount();
        socket.on('applications:updated', handleUpdate);
        return () => { socket.off('applications:updated', handleUpdate); };
    }, [loadCount]);

    if (count === 0) return null;

    return (
        <span className="ml-1.5 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-4 text-center flex items-center gap-1 shadow-[0_0_6px_rgba(239,68,68,0.3)] animate-pulse shrink-0">
            <span className="relative flex h-1 w-1 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1 w-1 bg-white"></span>
            </span>
            {count}
        </span>
    );
}

function InterviewRoomsBadge() {
    const { rooms, loadRooms } = useRoomStore();

    const fetchRooms = React.useCallback(() => {
        loadRooms(true);
    }, [loadRooms]);

    useVisibilityPolling(fetchRooms, 60000, [fetchRooms]);

    React.useEffect(() => {
        const socket = socketService.getSocket();
        const handleUpdate = () => loadRooms(true);
        socket.on('rooms:updated', handleUpdate);
        return () => { socket.off('rooms:updated', handleUpdate); };
    }, [loadRooms]);

    const activeCount = rooms.filter((r: any) => r.status === 'OCCUPIED' || !!r.current_application_id).length;
    if (activeCount === 0) return null;

    return (
        <div className="relative ml-2 -mt-1 flex items-center shrink-0" title="Interviews Ongoing">
            {/* Speech bubble tail trail (little white circles) */}
            <div className="absolute -left-1.5 bottom-0 w-1.5 h-1.5 bg-white rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.15)] z-0" />
            <div className="absolute -left-2.5 -bottom-1 w-1 h-1 bg-white rounded-full z-0" />

            {/* Cloud shape/Bubble (White background, purple text & indicator) */}
            <div className="relative bg-white text-purple-700 text-[9px] font-bold px-2 py-0.5 rounded-[12px_12px_12px_3px] flex items-center gap-1 shadow-[0_2px_5px_rgba(0,0,0,0.25)] animate-pulse border border-white/80 z-10">
                <span className="relative flex h-1 w-1 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1 w-1 bg-purple-600"></span>
                </span>
                <span>{activeCount} live</span>
            </div>
        </div>
    );
}

function InterviewDeskBadge() {
    const [count, setCount] = React.useState(0);
    const { user } = useAuthStore();
    const { activeAccount } = useActiveAccountStore();
    const accounts = parseAccounts(user?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const resolvedActiveAccount = (activeAccount && accounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase()))
        ? activeAccount
        : (accounts[0] || 'DOORDASH');

    const loadCount = React.useCallback(async () => {
        try {
            const allApps = await ApplicationService.getAll();
            const activeStatuses = ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'ENDORSED'];
            const userName = (user?.full_name || '').trim().toLowerCase();
            const userEmail = (user?.email || '').trim().toLowerCase();
            const userId = user?.id;

            const pending = allApps.filter((a: any) => {
                const status = a.current_status;
                if (!activeStatuses.includes(status) && !(status === 'QUEUE_ASSIGNED' && a.queue_type === 'FINAL')) return false;

                const appDepts = (a.department || '')
                    .split(',')
                    .map((s: string) => s.trim().toUpperCase())
                    .filter(Boolean);
                if (!appDepts.includes(resolvedActiveAccount.toUpperCase())) return false;

                const metadata = a.metadata || {};
                const assignedId = a.assigned_ops_validator_id || metadata.assigned_ops_validator_id;
                const assignedName = (a.assigned_ops_validator_name || metadata.assigned_ops_validator_name || '').trim().toLowerCase();
                const assignedEmail = (a.pis?.ops_validator_email || metadata.ops_validator_email || '').trim().toLowerCase();

                if (user?.role === 'admin') return true;
                return (
                    assignedId === userId ||
                    (assignedName && assignedName === userName) ||
                    (assignedEmail && assignedEmail === userEmail)
                );
            }).length;

            setCount(pending);
        } catch (err) {
            console.error('[Sidebar] Failed to load interview desk count:', err);
        }
    }, [user?.id, user?.full_name, user?.email, user?.role, resolvedActiveAccount]);

    useVisibilityPolling(loadCount, 60000, [loadCount]);

    React.useEffect(() => {
        const socket = socketService.getSocket();
        const handleUpdate = () => loadCount();
        socket.on('applications:updated', handleUpdate);
        return () => { socket.off('applications:updated', handleUpdate); };
    }, [loadCount]);

    if (count === 0) return null;

    return (
        <span className="ml-1.5 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-4 text-center flex items-center gap-1 shadow-[0_0_6px_rgba(239,68,68,0.3)] animate-pulse shrink-0">
            <span className="relative flex h-1 w-1 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1 w-1 bg-white"></span>
            </span>
            {count}
        </span>
    );
}

function SidebarProfile() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const { activeAccount, setActiveAccount } = useActiveAccountStore();

    const accounts = parseAccounts(user?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const currentAccount = (activeAccount && accounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase()))
        ? activeAccount
        : (accounts[0] || 'DOORDASH');

    const userInitials = (user?.full_name || '?')
        .split(' ')
        .map(p => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    React.useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = () => {
        setIsOpen(false);
        logout();
        navigate('/login', { replace: true });
    };

    const handleProfile = () => {
        setIsOpen(false);
        const role = user?.role;
        if (role === 'admin' || role === 'super_admin') navigate('/admin/profile');
        else if (role?.startsWith('guest') || role === 'ops_validator' || role === 'guest_interviewer') navigate('/final-interview/profile');
        else navigate('/recruiter/profile');
    };

    return (
        <div className="relative border-t border-slate-800/80 bg-black/20" ref={ref}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-2 right-2 mb-1 bg-[#162252] border border-slate-700/80 rounded-lg shadow-2xl overflow-hidden z-[80]"
                    >
                        {hasMultipleAccounts && (
                            <>
                                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-black/15 flex items-center gap-1.5 border-b border-slate-700/45">
                                    <Building2 size={11} className="text-slate-400" />
                                    Switch Account
                                </div>
                                <div className="max-h-36 overflow-y-auto py-1">
                                    {accounts.map((acc) => {
                                        const isActive = acc.toUpperCase() === currentAccount.toUpperCase();
                                        return (
                                            <button
                                                key={acc}
                                                onClick={() => {
                                                    setActiveAccount(acc);
                                                    setIsOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium transition-colors text-left",
                                                    isActive 
                                                        ? "text-blue-400 bg-white/5 font-semibold" 
                                                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                <span className="truncate">{acc.toUpperCase()}</span>
                                                {isActive && <Check size={12} className="text-blue-400 shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="h-px bg-slate-700/60" />
                            </>
                        )}
                        <button
                            onClick={handleProfile}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-slate-200 hover:bg-white/10 transition-colors text-left"
                        >
                            <User size={14} className="text-slate-400" />
                            My Profile
                        </button>
                        <div className="h-px bg-slate-700/60" />
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <div
                className="px-3 py-3 flex items-center gap-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsOpen(v => !v)}
            >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-white/10 overflow-hidden">
                    {user?.avatar_data ? (
                        <img src={user.avatar_data} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                        userInitials
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-white truncate leading-tight">
                        {user?.full_name || 'Guest'}
                    </p>
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider truncate mt-0.5">
                        {user?.role?.replace(/_/g, ' ') || 'User'}
                    </p>
                </div>
                <ChevronDown size={14} className={cn("text-slate-500 transition-transform", isOpen && "rotate-180")} />
            </div>
        </div>
    );
}

export function Sidebar({ groups, mobileOpen, onMobileClose }: SidebarProps) {
    const navRef = React.useRef<HTMLElement>(null);
    const { sidebarScrollTop, setSidebarScrollTop } = useUIStore();
    const { user } = useAuthStore();
    const { hasPermissionForPath } = useAccountTypeSettings();

    // Dynamically filter navigation items based on role permissions
    const filteredGroups = React.useMemo(() => {
        if (!user) return groups;
        return groups.map(group => {
            const filteredItems = group.items.map(item => {
                if (item.subItems && item.subItems.length > 0) {
                    const subFiltered = item.subItems.filter(sub => hasPermissionForPath(user.role, sub.path));
                    return { ...item, subItems: subFiltered };
                }
                return item;
            }).filter(item => {
                if (item.subItems && item.subItems.length > 0) {
                    return true;
                }
                if (item.subItems && item.subItems.length === 0) {
                    return false;
                }
                return hasPermissionForPath(user.role, item.path);
            });
            return { ...group, items: filteredItems };
        }).filter(group => group.items.length > 0);
    }, [groups, user, hasPermissionForPath]);

    // Restore scroll position on mount with requestAnimationFrame for smoothness
    React.useLayoutEffect(() => {
        if (navRef.current) {
            const el = navRef.current;
            requestAnimationFrame(() => {
                el.scrollTop = sidebarScrollTop;
            });
        }
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        // Prevent scroll updates during initial render/restoration
        setSidebarScrollTop(e.currentTarget.scrollTop);
    };

    return (
        <>
            {/* Mobile Sidebar Overlay Backdrop */}
            {mobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden"
                    onClick={onMobileClose}
                />
            )}
            
            <aside
                className={cn(
                    "flex flex-col h-full bg-black border-r border-neutral-800 shrink-0 z-50 w-64 select-none",
                    "fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:flex",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white text-black font-black flex items-center justify-center text-sm shadow-md">
                            C
                        </div>
                        <span className="text-base font-extrabold text-white tracking-tight font-sans">
                            Chronicle<span className="text-neutral-400">CRM</span>
                        </span>
                    </div>
                    {onMobileClose && (
                        <button 
                            onClick={onMobileClose}
                            className="lg:hidden p-1 text-neutral-400 hover:text-white rounded-sm hover:bg-white/5 transition-all"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav
                    ref={navRef}
                    onScroll={handleScroll}
                    style={{ scrollBehavior: 'auto', scrollbarWidth: 'none' }}
                    className="flex-1 overflow-y-auto py-2 px-3 space-y-6 custom-scrollbar scroll-smooth-none [&::-webkit-scrollbar]:!w-0 [&::-webkit-scrollbar]:!h-0 [&::-webkit-scrollbar-track]:!bg-transparent [&::-webkit-scrollbar-thumb]:!bg-transparent"
                >
                    {filteredGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                            {group.header && (
                                <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em]">
                                    {group.header}
                                </h3>
                            )}
                            <div className="space-y-0.5">
                                {group.items.map((item) => (
                                    <SidebarItem key={item.path} item={item} groupKey={group.header} />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer: User Profile */}
                <SidebarProfile />
            </aside>
        </>
    );
}
