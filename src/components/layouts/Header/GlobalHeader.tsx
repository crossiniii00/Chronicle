import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Settings, X, Clock, Trash2, Users, LogOut, User, ChevronDown, Mail, Shield, Menu, Activity, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { timeAgo, formatDateTime, cn } from '@/utils/formatters';
import { Notification } from '@/types';
import { UserService } from '@/services/UserService';
import { ApplicationService } from '@/services/ApplicationService';
import type { User as SystemUser, Application } from '@/types';
import { playNotificationSound } from '@/utils/notificationSound';
import { useNavigate } from 'react-router-dom';

const STATUS_MAPPINGS: { [key: string]: { label: string; colorClassDark: string; colorClassLight: string } } = {
    'INITIAL_INTERVIEW': { label: 'Initial Interview', colorClassDark: 'text-amber-400 font-extrabold', colorClassLight: 'text-amber-600 font-extrabold' },
    'INITIAL INTERVIEW': { label: 'Initial Interview', colorClassDark: 'text-amber-400 font-extrabold', colorClassLight: 'text-amber-600 font-extrabold' },
    'FINAL_INTERVIEW': { label: 'Final Interview', colorClassDark: 'text-violet-400 font-extrabold', colorClassLight: 'text-violet-600 font-extrabold' },
    'FINAL INTERVIEW': { label: 'Final Interview', colorClassDark: 'text-violet-400 font-extrabold', colorClassLight: 'text-violet-600 font-extrabold' },
    'CLIENT_ASSESSMENT': { label: 'Client Assessment', colorClassDark: 'text-indigo-400 font-extrabold', colorClassLight: 'text-indigo-600 font-extrabold' },
    'CLIENT ASSESSMENT': { label: 'Client Assessment', colorClassDark: 'text-indigo-400 font-extrabold', colorClassLight: 'text-indigo-600 font-extrabold' },
    'ASSESSMENT': { label: 'Assessment', colorClassDark: 'text-indigo-400 font-extrabold', colorClassLight: 'text-indigo-600 font-extrabold' },
    'CLIENT_INTERVIEW': { label: 'Client Interview', colorClassDark: 'text-sky-300 font-extrabold', colorClassLight: 'text-sky-600 font-extrabold' },
    'CLIENT INTERVIEW': { label: 'Client Interview', colorClassDark: 'text-sky-300 font-extrabold', colorClassLight: 'text-sky-600 font-extrabold' },
    'ENDORSED': { label: 'Endorsed', colorClassDark: 'text-cyan-400 font-extrabold', colorClassLight: 'text-cyan-600 font-extrabold' },
    'PASSED': { label: 'Passed', colorClassDark: 'text-emerald-400 font-extrabold', colorClassLight: 'text-emerald-600 font-extrabold' },
    'FAILED': { label: 'Failed', colorClassDark: 'text-rose-400 font-extrabold', colorClassLight: 'text-rose-600 font-extrabold' },
    'REJECTED': { label: 'Rejected', colorClassDark: 'text-rose-400 font-extrabold', colorClassLight: 'text-rose-600 font-extrabold' },
    'HIRED': { label: 'Hired', colorClassDark: 'text-emerald-400 font-extrabold', colorClassLight: 'text-emerald-600 font-extrabold' },
    'ACCEPTED_OFFER': { label: 'Accepted Offer', colorClassDark: 'text-emerald-400 font-extrabold', colorClassLight: 'text-emerald-600 font-extrabold' },
    'ACCEPTED OFFER': { label: 'Accepted Offer', colorClassDark: 'text-emerald-400 font-extrabold', colorClassLight: 'text-emerald-600 font-extrabold' },
    'FOR_JOB_OFFER': { label: 'For Job Offer', colorClassDark: 'text-teal-400 font-extrabold', colorClassLight: 'text-teal-600 font-extrabold' },
    'FOR JOB OFFER': { label: 'For Job Offer', colorClassDark: 'text-teal-400 font-extrabold', colorClassLight: 'text-teal-600 font-extrabold' },
    'TYPING_TEST': { label: 'Typing Test', colorClassDark: 'text-slate-400 font-extrabold', colorClassLight: 'text-slate-600 font-extrabold' },
    'TYPING TEST': { label: 'Typing Test', colorClassDark: 'text-slate-400 font-extrabold', colorClassLight: 'text-slate-600 font-extrabold' },
    'APPLICANT_FORM': { label: 'Applicant Form', colorClassDark: 'text-slate-400 font-extrabold', colorClassLight: 'text-slate-600 font-extrabold' },
    'APPLICANT FORM': { label: 'Applicant Form', colorClassDark: 'text-slate-400 font-extrabold', colorClassLight: 'text-slate-600 font-extrabold' },
};

const formatStatusTitleCase = (status: string) => {
    const clean = status.trim().toUpperCase().replace(/_/g, ' ');
    if (STATUS_MAPPINGS[clean]) {
        return STATUS_MAPPINGS[clean].label;
    }
    return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const renderFormattedMessage = (message: string, isToast: boolean = false) => {
    const regex = /(.*?)\s+moved\s+from\s+(.*?)\s+to\s+(.*?)\s+by\s+(.*)/i;
    const match = message.match(regex);
    
    const getStatusColorClass = (status: string) => {
        const s = status.toUpperCase().trim().replace(/_/g, ' ');
        const mapping = STATUS_MAPPINGS[s];
        if (mapping) {
            return isToast ? mapping.colorClassDark : mapping.colorClassLight;
        }
        if (s.includes('HIRE') || s.includes('PASS') || s.includes('ACCEPT')) return isToast ? 'text-emerald-400 font-extrabold' : 'text-emerald-600 font-extrabold';
        if (s.includes('FAIL') || s.includes('REJECT') || s.includes('NOT ELIGIBLE')) return isToast ? 'text-rose-400 font-extrabold' : 'text-rose-600 font-extrabold';
        if (s.includes('INITIAL')) return isToast ? 'text-amber-400 font-extrabold' : 'text-amber-600 font-extrabold';
        if (s.includes('FINAL')) return isToast ? 'text-violet-400 font-extrabold' : 'text-violet-600 font-extrabold';
        if (s.includes('ASSESS')) return isToast ? 'text-indigo-400 font-extrabold' : 'text-indigo-600 font-extrabold';
        if (s.includes('ENDORSE')) return isToast ? 'text-cyan-400 font-extrabold' : 'text-cyan-600 font-extrabold';
        return isToast ? 'text-sky-300 font-extrabold' : 'text-sky-600 font-extrabold';
    };

    const nameColor = isToast ? 'text-white font-extrabold' : 'text-slate-900 font-extrabold';
    const authorColor = isToast ? 'text-sky-300 font-extrabold' : 'text-[#04154D] font-extrabold';
    const textColor = isToast ? 'text-white/95' : 'text-slate-600';

    if (match) {
        const [_, candidateName, fromStatus, toStatus, authorName] = match;
        const cleanFrom = formatStatusTitleCase(fromStatus);
        const cleanTo = formatStatusTitleCase(toStatus);
        
        return (
            <span className={textColor}>
                <span className={nameColor}>{candidateName}</span> moved from{' '}
                <span className={getStatusColorClass(cleanFrom)}>{cleanFrom}</span> to{' '}
                <span className={getStatusColorClass(cleanTo)}>{cleanTo}</span> by{' '}
                <span className={authorColor}>{authorName}</span>
            </span>
        );
    }

    const keysSorted = Object.keys(STATUS_MAPPINGS).sort((a, b) => b.length - a.length);
    const escapedKeys = keysSorted.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const combinedRegex = new RegExp(`\\b(${escapedKeys.join('|')})\\b`, 'gi');

    const parts = message.split(combinedRegex);
    return (
        <span className={textColor}>
            {parts.map((part, i) => {
                const upperPart = part.toUpperCase().replace(/_/g, ' ');
                const mapping = STATUS_MAPPINGS[upperPart];
                if (mapping) {
                    const cleanLabel = mapping.label;
                    const colorClass = isToast ? mapping.colorClassDark : mapping.colorClassLight;
                    return <span key={i} className={colorClass}>{cleanLabel}</span>;
                }
                return part;
            })}
        </span>
    );
};

const getTriggerUser = (message: string, usersList: SystemUser[], currentUser?: SystemUser | null) => {
    const match = message.match(/by\s+([A-Za-z0-9\s•·_-]+)$/i);
    if (!match) return null;
    const userName = match[1].replace(/·.*$/, '').replace(/•.*$/, '').trim();
    
    // Check current logged in user first (always has latest avatar_data)
    if (currentUser && currentUser.full_name.toLowerCase().trim() === userName.toLowerCase()) {
        return currentUser;
    }

    let found = usersList.find(u => u.full_name.toLowerCase().trim() === userName.toLowerCase());
    if (found) return found;

    found = usersList.find(u => u.full_name.toLowerCase().includes(userName.toLowerCase()) || userName.toLowerCase().includes(u.full_name.toLowerCase()));
    if (found) return found;

    if (userName.toLowerCase().includes('admin')) {
        if (currentUser && currentUser.role === 'admin') {
            return currentUser;
        }
        found = usersList.find(u => u.role === 'admin');
        if (found) return found;
    }

    return null;
};

const getCandidateNameFromMessage = (message: string) => {
    const regexMoved = /(.*?)\s+moved\s+from\s+/i;
    const matchMoved = message.match(regexMoved);
    if (matchMoved) return matchMoved[1].trim();

    const regexQueue = /(.*?)\s+has\s+been\s+assigned\s+to/i;
    const matchQueue = message.match(regexQueue);
    if (matchQueue) return matchQueue[1].trim();

    const regexAccepted = /(.*?)\s*'\s*s\s+application\s+has\s+been/i;
    const matchAccepted = message.match(regexAccepted);
    if (matchAccepted) return matchAccepted[1].trim();

    const regexSpecialized = /(.*?)\s*'\s*s\s+specialized\s+queue/i;
    const matchSpecialized = message.match(regexSpecialized);
    if (matchSpecialized) return matchSpecialized[1].trim();

    const regexEndorsed = /Endorsed\s+candidate\s+(.*?)\s+has\s+been\s+marked/i;
    const matchEndorsed = message.match(regexEndorsed);
    if (matchEndorsed) return matchEndorsed[1].trim();

    return null;
};

function NotificationModal({ notification, onClose, users }: { notification: Notification; onClose: () => void; users: SystemUser[] }) {
    const { markRead } = useNotificationStore();
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const [matchedApplicant, setMatchedApplicant] = useState<Application | null>(null);

    useEffect(() => {
        if (!notification.is_read) markRead(notification.id);
    }, [markRead, notification.id, notification.is_read]);

    useEffect(() => {
        const candidateName = getCandidateNameFromMessage(notification.message);
        if (candidateName) {
            ApplicationService.getAll()
                .then(apps => {
                    const found = apps.find(a => a.applicant_name.toLowerCase().trim() === candidateName.toLowerCase().trim());
                    if (found) {
                        setMatchedApplicant(found);
                    }
                })
                .catch(console.error);
        }
    }, [notification.message]);

    const itemUser = getTriggerUser(notification.message, users, currentUser);

    const handleGoToData = () => {
        if (!matchedApplicant) return;
        const basePath = (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') ? '/admin' : '/recruiter';
        navigate(`${basePath}/tracker/management/${matchedApplicant.id}`);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={onClose} 
                className="absolute inset-0 bg-[#04154D]/40 backdrop-blur-md" 
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 15 }} 
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="relative w-full max-w-md bg-white rounded-xl shadow-[0_24px_48px_rgba(4,21,77,0.18)] border border-slate-200/80 overflow-hidden flex flex-col text-left"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#04154D]/10 flex items-center justify-center text-[#04154D] overflow-hidden">
                            {itemUser?.avatar_data ? (
                                <img src={itemUser.avatar_data} alt={itemUser.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <Bell size={14} />
                            )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Notification Details</h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
                            {notification.notification_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock size={10} /> {formatDateTime(notification.created_at)}
                        </span>
                    </div>

                    <h2 className="text-lg font-extrabold text-slate-900 leading-snug mb-3">
                        {notification.title}
                    </h2>

                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-lg mb-4">
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {renderFormattedMessage(notification.message, false)}
                        </p>
                    </div>

                    {matchedApplicant && (
                        <div className="text-[11px] text-slate-400 bg-emerald-50/40 border border-emerald-100/60 rounded-lg p-3 flex items-center justify-between">
                            <span className="font-semibold text-emerald-800">Associated Candidate Found</span>
                            <span className="text-slate-600 font-bold">{matchedApplicant.applicant_name}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all"
                    >
                        Close Details
                    </button>
                    {matchedApplicant && (
                        <button 
                            onClick={handleGoToData}
                            className="bg-[#04154D] hover:bg-[#030e33] active:bg-[#020a24] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                            Go to data
                            <ArrowUpRight size={14} />
                        </button>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

export function GlobalHeader({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user, logout } = useAuthStore();
    const { notifications, markAllRead, deleteNotification } = useNotificationStore();
    const navigate = useNavigate();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
    const [isPulsing, setIsPulsing] = useState(false);
    const [newNotifToast, setNewNotifToast] = useState<Notification | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const pulseTimeoutRef = useRef<number | null>(null);
    const [users, setUsers] = useState<SystemUser[]>([]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        UserService.getAll().then(setUsers).catch(console.error);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsNotifOpen(false);
                setIsProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleSignOut = () => {
        setIsProfileOpen(false);
        setIsNotifOpen(false);
        logout();
        navigate('/login', { replace: true });
    };

    const userInitials = (user?.full_name || '?')
        .split(' ')
        .map(p => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Detect brand-new notifications: sound + pulse the bell.
    useEffect(() => {
        const currentIds = new Set(notifications.map(n => n.id));
        if (seenIdsRef.current.size === 0) {
            seenIdsRef.current = currentIds;
            return;
        }
        const newIds = [...currentIds].filter(id => !seenIdsRef.current.has(id));
        seenIdsRef.current = currentIds;
        if (newIds.length === 0) return;

        // Find the newest notification to show preview toast
        const newest = notifications.find(n => newIds.includes(n.id));
        if (newest) {
            // Check if the action was performed by the current user to avoid self-toasts/sounds
            const authorName = user?.full_name?.toLowerCase();
            const msgLower = newest.message.toLowerCase();
            const isActionBySelf = authorName && (
                msgLower.includes(`by ${authorName}`) || 
                msgLower.includes(`by recruiter ${authorName}`) || 
                msgLower.includes(`by admin ${authorName}`) ||
                msgLower.includes(`by super admin ${authorName}`)
            );

            if (!isActionBySelf) {
                playNotificationSound();
                setIsPulsing(true);
                if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
                pulseTimeoutRef.current = window.setTimeout(() => setIsPulsing(false), 6000);
                setNewNotifToast(newest);
            }
        }
    }, [notifications, user]);

    useEffect(() => {
        return () => {
            if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
        };
    }, []);

    const toastUser = newNotifToast ? getTriggerUser(newNotifToast.message, users, user) : null;

    return (
        <>
            {onMenuClick && (
                <div className="absolute top-4 left-4 z-[60] lg:hidden text-left">
                    <button 
                        onClick={onMenuClick}
                        className="p-2 bg-white hover:bg-slate-100 rounded-full shadow-sm border border-slate-200/50 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center"
                    >
                        <Menu size={18} className="text-[#04154D]" />
                    </button>
                </div>
            )}
            <div className="absolute top-4 right-6 z-[60] text-left">
                <div className="relative text-left" ref={dropdownRef}>
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className={cn(
                            "p-2 rounded-full transition-all relative group text-left shadow-sm border backdrop-blur-md flex items-center justify-center cursor-pointer",
                            unreadCount > 0 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500 hover:from-blue-700 hover:to-indigo-700 text-white" 
                                : "bg-white border-slate-200/50 hover:bg-slate-100/80 active:bg-slate-200/80",
                            isNotifOpen && (unreadCount > 0 ? "scale-105" : "bg-slate-100")
                        )}
                    >
                        {isPulsing && (
                            <span
                                aria-hidden
                                className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-blue-500/40 ring-2 ring-blue-400/60 pointer-events-none animate-notif-ring"
                            />
                        )}
                        <Bell
                            size={18}
                            className={cn(
                                "transition-transform relative text-left",
                                unreadCount > 0 ? "text-white animate-pulse" : "text-[#04154D]",
                                isNotifOpen ? "scale-110" : "group-hover:rotate-12",
                                isPulsing && "animate-notif-bell"
                            )}
                        />
                        {unreadCount > 0 && (
                            <span
                                className={cn(
                                    "absolute top-1 right-1 w-3.5 h-3.5 bg-sky-500 border-2 border-white rounded-full flex items-center justify-center text-left shadow-[0_0_10px_rgba(14,165,233,0.5)]",
                                    isPulsing && "animate-notif-badge"
                                )}
                            >
                                <span className="text-[7px] font-extrabold text-white text-left">{unreadCount > 9 ? '9+' : unreadCount}</span>
                            </span>
                        )}
                    </button>
                    <AnimatePresence>
                        {isNotifOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 12, scale: 0.96 }} 
                                animate={{ opacity: 1, y: 0, scale: 1 }} 
                                exit={{ opacity: 0, y: 12, scale: 0.96 }} 
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                className="absolute right-0 mt-2.5 w-[310px] bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.02)] border border-slate-100/80 overflow-hidden text-left"
                            >
                                <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40 text-left">
                                    <div className="flex items-center gap-1.5 text-left">
                                        <h3 className="font-extrabold text-slate-800 text-[9px] uppercase tracking-[0.15em] text-left">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-extrabold rounded-full">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => markAllRead()} 
                                        className="text-[8.5px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-all hover:underline text-left"
                                    >
                                        Mark all read
                                    </button>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar text-left divide-y divide-slate-100/60">
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400">
                                            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <Bell size={14} className="text-slate-400" />
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No notifications yet</p>
                                        </div>
                                    ) : (
                                        notifications
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .map((n, index) => {
                                                const itemUser = getTriggerUser(n.message, users, user);
                                                let notifIcon = <Bell size={12} />;
                                                let iconBg = "bg-slate-50 text-slate-500 border-slate-200/50";
                                                
                                                if (n.notification_type === 'status_change') {
                                                    notifIcon = <Activity size={12} />;
                                                    iconBg = "bg-blue-600/10 text-blue-600 border-blue-600/20";
                                                } else if (n.notification_type === 'request_accepted') {
                                                    notifIcon = <CheckCircle2 size={12} />;
                                                    iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100";
                                                } else if (n.notification_type === 'queue_assigned') {
                                                    notifIcon = <Users size={12} />;
                                                    iconBg = "bg-sky-50 text-sky-600 border-sky-100";
                                                }
 
                                                return (
                                                    <motion.div 
                                                        key={n.id} 
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.02 }}
                                                        onClick={() => { setSelectedNotif(n); setIsNotifOpen(false); }} 
                                                        className={cn(
                                                            "px-3.5 py-2.5 hover:bg-slate-50/50 cursor-pointer transition-all flex gap-2.5 relative group text-left", 
                                                            !n.is_read ? "bg-blue-50/15" : "bg-transparent"
                                                        )}
                                                    >
                                                        {!n.is_read && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600 text-left" />
                                                        )}
                                                        <div className={cn("w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 border text-left overflow-hidden shadow-sm transition-all group-hover:scale-105", iconBg)}>
                                                            {itemUser?.avatar_data ? (
                                                                <img src={itemUser.avatar_data} alt={itemUser.full_name} className="w-full h-full object-cover" />
                                                            ) : itemUser ? (
                                                                <span className="text-[8.5px] font-black text-blue-700">
                                                                    {itemUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                </span>
                                                            ) : (
                                                                notifIcon
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <div className="flex items-center justify-between mb-0.5 text-left">
                                                                <p className={cn(
                                                                    "text-[9px] leading-none uppercase tracking-wider text-left truncate pr-2 transition-colors", 
                                                                    n.is_read ? "text-slate-500 font-semibold" : "text-slate-800 font-bold"
                                                                )}>
                                                                    {n.title}
                                                                </p>
                                                                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0 text-left">{timeAgo(n.created_at)}</span>
                                                            </div>
                                                            <p className={cn(
                                                                "text-[10px] line-clamp-2 leading-normal text-left transition-colors",
                                                                n.is_read ? "text-slate-400" : "text-slate-600 font-medium"
                                                            )}>
                                                                {renderFormattedMessage(n.message, false)}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-left">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} 
                                                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all text-left"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                    )}
                                </div>
                                <div className="p-1.5 border-t border-slate-100 bg-slate-50/40 text-center text-left">
                                    <button className="w-full text-center text-[8.5px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 py-1.5 rounded-lg uppercase tracking-wider transition-all text-left">
                                        View Archive Center
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <AnimatePresence>{selectedNotif && <NotificationModal notification={selectedNotif} onClose={() => setSelectedNotif(null)} users={users} />}</AnimatePresence>

            {/* Premium floating notification toast preview */}
            <AnimatePresence>
                {newNotifToast && (() => {
                    const parsedAuthorName = newNotifToast.message.match(/by\s+([A-Za-z0-9\s•·_-]+)$/i)?.[1]?.replace(/·.*$/, '')?.replace(/•.*$/, '')?.trim() || '';
                    const toastInitials = parsedAuthorName
                        ? parsedAuthorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        : '';
                    return (
                        <motion.div
                            initial={{ opacity: 0, x: 100, y: 0, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 50, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="fixed top-6 right-6 z-[9999] w-96 bg-[#04154D] text-white rounded-xl shadow-[0_20px_50px_rgba(4,21,77,0.3)] border border-[#04154D]/30 p-4 overflow-hidden flex flex-col gap-2"
                        >
                            <motion.div 
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 5, ease: "linear" }}
                                onAnimationComplete={() => setNewNotifToast(null)}
                                className="absolute bottom-0 left-0 h-1 bg-sky-400"
                            />
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-sky-300 border border-white/10 shrink-0 overflow-hidden">
                                        {toastUser?.avatar_data ? (
                                            <img src={toastUser.avatar_data} alt={toastUser.full_name} className="w-full h-full object-cover" />
                                        ) : toastUser ? (
                                            <span className="text-xs font-bold text-white">
                                                {toastUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </span>
                                        ) : toastInitials ? (
                                            <span className="text-xs font-bold text-white">
                                                {toastInitials}
                                            </span>
                                        ) : (
                                            <User size={18} className="text-sky-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-sky-300 uppercase tracking-wider">New Notification</p>
                                        <h4 className="text-sm font-bold truncate pr-4">{newNotifToast.title}</h4>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setNewNotifToast(null)}
                                    className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        <p className="text-xs text-white/80 leading-relaxed pl-13 pr-4">
                            {renderFormattedMessage(newNotifToast.message, true)}
                        </p>
                    </motion.div>
                    );
                })()}
            </AnimatePresence>
        </>
    );
}
