import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, Sparkles, Clock, Users, Shield, LogOut, User, Mail, Sun, Moon, Sunset, Sunrise } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { User as UserData } from '@/types';
import { WeekDropdown } from './WeekDropdown';
import { MonthDropdown } from './MonthDropdown';
import { formatUserRole } from './dashboardHelpers';

interface DashboardHeroProps {
    user: UserData | null;
    logout: () => void;
    dateFilter: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';
    setDateFilter: (filter: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL') => void;
    dateSub: {
        weekIndex?: number;
        year?: number;
        month?: number;
        day?: number;
    };
    setDateSub: React.Dispatch<React.SetStateAction<{
        weekIndex?: number;
        year?: number;
        month?: number;
        day?: number;
    }>>;
    onlineUserCount: number;
    isRecruiterS: boolean;
    weeksInMonth: { label: string; weekIndex: number; startStr: string; endStr: string }[];
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
    user,
    logout,
    dateFilter,
    setDateFilter,
    dateSub,
    setDateSub,
    onlineUserCount,
    isRecruiterS,
    weeksInMonth
}) => {
    const navigate = useNavigate();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<'WEEK' | 'MONTH' | null>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const filterBarRef = useRef<HTMLDivElement>(null);
    const filterCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isProfileMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsProfileMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isProfileMenuOpen]);

    useEffect(() => {
        if (!openDropdown) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenDropdown(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [openDropdown]);

    const handleFilterChange = (filter: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL') => {
        setDateFilter(filter);
        setDateSub({});
        setOpenDropdown(null);
    };

    const cancelFilterClose = () => {
        if (filterCloseTimer.current) {
            clearTimeout(filterCloseTimer.current);
            filterCloseTimer.current = null;
        }
    };

    const scheduleFilterClose = () => {
        cancelFilterClose();
        filterCloseTimer.current = setTimeout(() => setOpenDropdown(null), 150);
    };

    useEffect(() => () => cancelFilterClose(), []);

    const handleLogout = () => {
        setIsProfileMenuOpen(false);
        logout();
        navigate('/login', { replace: true });
    };

    const now = new Date();
    const hour = now.getHours();
    const firstName = user?.full_name?.split(' ')[0] ?? 'there';
    const greeting = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Welcome back';
    const GreetingIcon = hour < 5 ? Moon : hour < 12 ? Sunrise : hour < 17 ? Sun : hour < 21 ? Sunset : Moon;
    const warmSubtext = hour < 5
        ? `Working late, ${firstName}? Don't forget to take a break.`
        : hour < 12
        ? `Hope your morning is off to a great start.`
        : hour < 17
        ? `Hope your day is going well so far.`
        : hour < 21
        ? `Winding down? Here's a snapshot of your day.`
        : `Glad to see you, ${firstName}. Here's where things stand.`;

    const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const userInitials = (user?.full_name || '?')
        .split(' ')
        .map(p => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const warmGradient = 'brand-gradient text-white border-white/10 shadow-2xl';

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
                "relative z-20 rounded-sm border bg-gradient-to-br",
                warmGradient
            )}
        >
            <div className="absolute inset-0 overflow-hidden rounded-sm pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#ef3e36]/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#622B89]/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative p-7 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start md:items-center gap-5">
                    <div className="relative shrink-0" ref={profileMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsProfileMenuOpen(v => !v)}
                            aria-haspopup="menu"
                            aria-expanded={isProfileMenuOpen}
                            aria-label="Open account menu"
                            className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full ring-2 ring-white/20 shadow-lg overflow-hidden bg-white/10 backdrop-blur-md flex items-center justify-center">
                                {user?.avatar_data ? (
                                    <img src={user.avatar_data} alt={firstName} className="w-full h-full object-cover" />
                               ) : (
                                    <span className="text-lg md:text-xl font-bold text-white tracking-tight">
                                        {userInitials}
                                    </span>
                                )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white/15 backdrop-blur-md border border-white/10 shadow-md flex items-center justify-center">
                                <GreetingIcon size={12} className="text-amber-400" strokeWidth={2.5} />
                            </div>
                            <div className={cn(
                                "absolute inset-0 rounded-full ring-2 ring-white/0 transition-all pointer-events-none",
                                isProfileMenuOpen && "ring-white/40"
                            )} />
                        </button>

                        <AnimatePresence>
                            {isProfileMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    role="menu"
                                    className="absolute left-0 mt-3 w-72 bg-white rounded-sm shadow-2xl border border-surface-200 overflow-hidden z-50 origin-top-left"
                                >
                                    <div className="p-4 bg-gradient-to-br from-surface-50 to-white border-b border-surface-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full ring-2 ring-white shadow-sm overflow-hidden bg-gradient-to-br from-surface-100 to-surface-200 flex items-center justify-center shrink-0">
                                                {user?.avatar_data ? (
                                                    <img src={user.avatar_data} alt={firstName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[13px] font-bold text-surface-700">
                                                        {userInitials}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-semibold text-surface-900 truncate">
                                                    {user?.full_name || 'Guest'}
                                                </p>
                                                <p className="text-[10px] font-semibold text-surface-500 truncate flex items-center gap-1 mt-0.5">
                                                    <Mail size={9} className="shrink-0" />
                                                    <span className="truncate">{user?.email || 'No email'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-surface-200 text-[9px] font-bold uppercase tracking-[0.15em] text-surface-600">
                                            <Shield size={9} className="text-vibrant-emerald" />
                                            {formatUserRole(user?.role)}
                                        </div>
                                    </div>

                                    <div className="p-1.5">
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => { setIsProfileMenuOpen(false); navigate('/recruiter/profile'); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] font-semibold text-surface-800 hover:bg-surface-50 rounded-sm transition-colors group/item"
                                        >
                                            <span className="w-7 h-7 rounded-sm bg-surface-100 group-hover/item:bg-black group-hover/item:text-white flex items-center justify-center transition-colors">
                                                <User size={13} />
                                            </span>
                                            <span className="flex-1 text-left">View profile</span>
                                            <ChevronDown size={12} className="text-surface-300 -rotate-90" />
                                        </button>
                                    </div>

                                    <div className="border-t border-surface-100 p-1.5 bg-surface-50/50">
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-[12px] font-semibold text-vibrant-pink hover:bg-vibrant-pink/10 rounded-sm transition-colors group/item"
                                        >
                                            <span className="w-7 h-7 rounded-sm bg-vibrant-pink/10 group-hover/item:bg-vibrant-pink group-hover/item:text-white flex items-center justify-center transition-colors text-vibrant-pink">
                                                <LogOut size={13} />
                                            </span>
                                            <span className="flex-1 text-left">Log out</span>
                                            <ChevronDown size={12} className="text-vibrant-pink/50 -rotate-90" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                                <Sparkles size={9} className="text-amber-400" />
                                {isRecruiterS ? 'Lead Recruiter' : 'Recruiter Workspace'}
                            </span>
                        </div>
                        <h1 
                            className="text-2xl md:text-[32px] text-white tracking-tight leading-tight"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            {greeting}, {firstName}
                            <span className="inline-block ml-1.5 text-2xl md:text-3xl align-middle leading-none not-italic">
                                {hour < 5 ? '🌙' : hour < 12 ? '☀️' : hour < 17 ? '👋' : hour < 21 ? '🌅' : '🌙'}
                            </span>
                        </h1>
                        <p className="text-[13px] text-white/80 mt-1 font-medium leading-relaxed">
                            {warmSubtext}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-[10px] font-semibold text-white/60">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                                </span>
                                {isRecruiterS ? 'Keller Postman' : 'Systems Operational'}
                            </span>
                            <span className="text-white/30">·</span>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock size={10} />
                                {timeString}
                            </span>
                            <span className="text-white/30">·</span>
                            <span>{dateString}</span>
                            {onlineUserCount > 1 && (
                                <>
                                    <span className="text-white/30">·</span>
                                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                                        <Users size={10} />
                                        {onlineUserCount} online
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div
                        ref={filterBarRef}
                        className="flex bg-white/10 backdrop-blur-md p-1 rounded-sm border border-white/15 relative z-30 shadow-sm"
                        onMouseLeave={scheduleFilterClose}
                    >
                        {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((filter) => {
                            const hasDropdown = filter === 'WEEK' || filter === 'MONTH';
                            const isOpen = openDropdown === filter;
                            const isActive = dateFilter === filter;
                            const subLabel =
                                filter === 'WEEK' && dateSub.weekIndex != null && dateSub.weekIndex >= 0
                                    ? `W${dateSub.weekIndex + 1}`
                                    : filter === 'MONTH' && dateSub.month != null
                                    ? `${now.toLocaleDateString([], { month: 'short' }).toUpperCase()}${dateSub.day != null ? ` ${dateSub.day}` : ''}`
                                    : null;

                            return (
                                <div
                                    key={filter}
                                    className="relative"
                                >
                                    <motion.button
                                        whileTap={{ scale: 0.92 }}
                                        transition={{ type: 'spring', stiffness: 700, damping: 18 }}
                                        onClick={() => {
                                            if (hasDropdown) {
                                                if (!isActive) setDateFilter(filter);
                                                setOpenDropdown(isOpen ? null : filter);
                                            } else {
                                                handleFilterChange(filter);
                                            }
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest relative z-10 transition-colors duration-150 rounded-sm flex items-center gap-1 active:scale-95",
                                            isActive
                                                ? "text-black"
                                                : "text-white/60 hover:text-white"
                                        )}
                                    >
                                        {filter}
                                        {subLabel && (
                                            <span className={cn(
                                                "ml-0.5 px-1.5 py-0.5 rounded-sm text-[8px] font-bold",
                                                isActive ? "bg-black/10 text-black" : "bg-white/10 text-white"
                                            )}>
                                                {subLabel}
                                            </span>
                                        )}
                                        {hasDropdown && (
                                            <ChevronDown size={9} className={cn("transition-transform", isOpen && "rotate-180")} />
                                        )}
                                        {isActive && (
                                            <motion.div
                                                layoutId="dashboardActiveFilterBg"
                                                className="absolute inset-0 bg-white shadow-sm rounded-sm z-[-1]"
                                                transition={{ type: 'spring', stiffness: 500, damping: 22, mass: 0.7 }}
                                            />
                                        )}
                                    </motion.button>

                                    <AnimatePresence>
                                        {filter === 'WEEK' && isOpen && (
                                            <WeekDropdown
                                                key="week-dropdown"
                                                weeks={weeksInMonth}
                                                selected={dateSub.weekIndex}
                                                onSelect={(idx) => {
                                                    setDateSub({ weekIndex: idx });
                                                    setDateFilter('WEEK');
                                                    setOpenDropdown(null);
                                                }}
                                                onMouseEnter={cancelFilterClose}
                                            />
                                        )}

                                        {filter === 'MONTH' && isOpen && (
                                            <MonthDropdown
                                                key="month-dropdown"
                                                year={dateSub.year ?? now.getFullYear()}
                                                month={dateSub.month ?? now.getMonth()}
                                                day={dateSub.day}
                                                onPickMonth={(yr, mo) => setDateSub(s => ({ ...s, year: yr, month: mo, day: undefined }))}
                                                onPickDay={(d) => {
                                                    setDateSub(s => ({ ...s, year: s.year ?? now.getFullYear(), month: s.month ?? now.getMonth(), day: d }));
                                                    setDateFilter('MONTH');
                                                    setOpenDropdown(null);
                                                }}
                                                onClose={() => setOpenDropdown(null)}
                                                onMouseEnter={cancelFilterClose}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                    <motion.div
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        <Link
                            to="/recruiter/tracker/interview-registry"
                            className="px-4 py-2.5 bg-[#ef3e36] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#d32f2f] transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <Plus size={14} /> New Interview
                        </Link>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};
