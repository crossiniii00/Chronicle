import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Inbox, Calendar, RefreshCw, OctagonX, Trophy, Plus, UserX, UserMinus, Clock, Ban, TrendingUp, ArrowRightLeft, ChevronRight, ChevronDown, Mic, Brain, CheckSquare, Building, Briefcase, Handshake, ToggleRight, ToggleLeft, Users, Upload, FileCheck, Timer } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Tab } from '../hooks/useApplicantManagement';
import { useAuthStore } from '@/store/authStore';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';
import { TableExportMenu } from './TableExportMenu';
import { Application } from '@/types/application';

interface ManagementHeaderProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    activeMajorTab: 'onsite' | 'oncall' | 'all';
    setActiveMajorTab: (tab: 'onsite' | 'oncall' | 'all') => void;
    allTabCount: number;
    ongoingCount: number;
    requestsCount: number;
    rescheduleCount: number;
    markedAsPendingCount: number;
    rejectedCount: number;
    concludedCount: number;
    schedulingCount?: number;
    reprofileCount?: number;
    noshowCount?: number;
    withdrawnCount?: number;
    waitlistedCount?: number;
    notEligibleCount?: number;
    promotedCount?: number;
    lateralCount?: number;
    blacklistedCount?: number;
    totalCount?: number;
    isPendingTrackerMode?: boolean;
    setIsPendingTrackerMode?: (val: boolean) => void;
    isIdleFilterActive?: boolean;
    setIsIdleFilterActive?: (val: boolean) => void;
    isExclusiveMode?: boolean;
    setIsExclusiveMode?: (val: boolean) => void;
    pendingTrackerCounts?: Record<string, number>;
    mode: 'full' | 'tracking';
    filteredList?: Application[];
    onRefresh?: () => void;
    onAddCandidate?: (type: 'selector' | 'onsite' | 'oncall') => void;
    onImportCandidate?: (data: any) => void;
}

type TabAccent = {
    iconColor: string;
    iconColorBright: string;
    accent: string;
    badgeActive: string;
    badgeInactive: string;
    iconHover: any;
    iconActiveAnim: any;
};

const TAB_ACCENTS: Record<Tab, TabAccent> = {
    all_tab: {
        iconColor: 'text-neutral-500',
        iconColorBright: 'text-neutral-600',
        accent: 'bg-neutral-500',
        badgeActive: 'bg-neutral-100 text-neutral-500',
        badgeInactive: 'bg-neutral-50 text-neutral-500',
        iconHover: { rotate: 0, scale: 1.2 },
        iconActiveAnim: { scale: [1, 1.05, 1], transition: { duration: 2, repeat: Infinity } }
    },
    ongoing: {
        iconColor: 'text-blue-500',
        iconColorBright: 'text-blue-600',
        accent: 'bg-blue-500',
        badgeActive: 'bg-blue-100 text-blue-500',
        badgeInactive: 'bg-blue-50 text-blue-500',
        iconHover: { rotate: -10, scale: 1.25 },
        iconActiveAnim: {
            scale: [1, 1.15, 1],
            transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' },
        },
    },
    reschedule: {
        iconColor: 'text-amber-500',
        iconColorBright: 'text-amber-600',
        accent: 'bg-amber-500',
        badgeActive: 'bg-amber-100 text-amber-500',
        badgeInactive: 'bg-amber-50 text-amber-500',
        iconHover: { rotate: 10, scale: 1.2 },
        iconActiveAnim: { scale: [1, 1.1, 1], transition: { duration: 1.5, repeat: Infinity } }
    },
    requests: {
        iconColor: 'text-amber-500',
        iconColorBright: 'text-amber-600',
        accent: 'bg-amber-500',
        badgeActive: 'bg-amber-100 text-amber-500',
        badgeInactive: 'bg-amber-50 text-amber-500',
        iconHover: { rotate: 0, scale: 1.25 },
        iconActiveAnim: {
            y: [0, -2, 0],
            transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
        },
    },
    reprofile: {
        iconColor: 'text-purple-500',
        iconColorBright: 'text-purple-600',
        accent: 'bg-purple-500',
        badgeActive: 'bg-purple-100 text-purple-500',
        badgeInactive: 'bg-purple-50 text-purple-500',
        iconHover: { rotate: 180, scale: 1.2 },
        iconActiveAnim: {
            rotate: 360,
            transition: { repeat: Infinity, duration: 3, ease: 'linear' },
        },
    },
    rejected: {
        iconColor: 'text-red-500',
        iconColorBright: 'text-red-600',
        accent: 'bg-red-500',
        badgeActive: 'bg-red-100 text-red-500',
        badgeInactive: 'bg-red-50 text-red-500',
        iconHover: { rotate: [0, -8, 8, -6, 6, 0], scale: 1.25 },
        iconActiveAnim: {
            rotate: [0, -3, 3, -3, 3, 0],
            transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
        },
    },
    noshow: {
        iconColor: 'text-orange-500',
        iconColorBright: 'text-orange-600',
        accent: 'bg-orange-500',
        badgeActive: 'bg-orange-100 text-orange-500',
        badgeInactive: 'bg-orange-50 text-orange-500',
        iconHover: { rotate: [0, -5, 5, -5, 5, 0], scale: 1.2 },
        iconActiveAnim: {
            y: [0, -2, 0],
            transition: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
        },
    },
    concluded: {
        iconColor: 'text-emerald-500',
        iconColorBright: 'text-emerald-600',
        accent: 'bg-emerald-500',
        badgeActive: 'bg-emerald-100 text-emerald-500',
        badgeInactive: 'bg-emerald-50 text-emerald-500',
        iconHover: { rotate: -10, scale: 1.3, y: -2 },
        iconActiveAnim: {
            y: [0, -3, 0],
            rotate: [0, -5, 5, 0],
            transition: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' },
        },
    },
    scheduling: {
        iconColor: 'text-surface-500 dark:text-slate-400',
        iconColorBright: 'text-surface-600',
        accent: 'bg-surface-50 dark:bg-slate-8000',
        badgeActive: 'bg-surface-100 dark:bg-slate-800/50 text-surface-500 dark:text-slate-400',
        badgeInactive: 'bg-surface-50 dark:bg-slate-800 text-surface-500 dark:text-slate-400',
        iconHover: { scale: 1.15 },
        iconActiveAnim: { scale: 1.1 },
    },
    withdrawn: {
        iconColor: 'text-gray-500',
        iconColorBright: 'text-gray-600',
        accent: 'bg-gray-500',
        badgeActive: 'bg-gray-200 text-gray-700',
        badgeInactive: 'bg-gray-100 text-gray-550',
        iconHover: { scale: 1.15, x: -2 },
        iconActiveAnim: { x: [0, -2, 0], transition: { repeat: Infinity, duration: 1.5 } },
    },
    waitlisted: {
        iconColor: 'text-orange-500',
        iconColorBright: 'text-orange-650',
        accent: 'bg-orange-500',
        badgeActive: 'bg-orange-100 text-orange-600',
        badgeInactive: 'bg-orange-50 text-orange-500',
        iconHover: { rotate: [0, -10, 10, -10, 10, 0] },
        iconActiveAnim: { rotate: [0, -5, 5, 0], transition: { repeat: Infinity, duration: 2 } },
    },
    marked_as_pending: {
        iconColor: 'text-orange-500',
        iconColorBright: 'text-orange-650',
        accent: 'bg-orange-500',
        badgeActive: 'bg-orange-100 text-orange-600',
        badgeInactive: 'bg-orange-50 text-orange-500',
        iconHover: { rotate: [0, -10, 10, -10, 10, 0] },
        iconActiveAnim: { rotate: [0, -5, 5, 0], transition: { repeat: Infinity, duration: 2 } },
    },
    not_eligible: {
        iconColor: 'text-rose-600',
        iconColorBright: 'text-rose-700',
        accent: 'bg-rose-600',
        badgeActive: 'bg-rose-100 text-rose-600',
        badgeInactive: 'bg-rose-50 text-rose-500',
        iconHover: { scale: 1.2 },
        iconActiveAnim: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1.2 } },
    },
    promoted: {
        iconColor: 'text-indigo-500',
        iconColorBright: 'text-indigo-600',
        accent: 'bg-indigo-500',
        badgeActive: 'bg-indigo-100 text-indigo-500',
        badgeInactive: 'bg-indigo-50 text-indigo-500',
        iconHover: { y: -2, scale: 1.2 },
        iconActiveAnim: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 1.5 } },
    },
    lateral: {
        iconColor: 'text-teal-500',
        iconColorBright: 'text-teal-600',
        accent: 'bg-teal-500',
        badgeActive: 'bg-teal-100 text-teal-500',
        badgeInactive: 'bg-teal-50 text-teal-500',
        iconHover: { x: [0, -2, 2, -2, 2, 0] },
        iconActiveAnim: { x: [0, -3, 3, 0], transition: { repeat: Infinity, duration: 2 } },
    },
    blacklisted: {
        iconColor: 'text-rose-950',
        iconColorBright: 'text-rose-950',
        accent: 'bg-rose-950',
        badgeActive: 'bg-rose-200 text-rose-950',
        badgeInactive: 'bg-rose-100 text-rose-950',
        iconHover: { scale: 1.2 },
        iconActiveAnim: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1.2 } },
    },
    pt_all: { iconColor: 'text-slate-600', iconColorBright: 'text-slate-700 dark:text-slate-300', accent: 'bg-slate-600', badgeActive: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600', badgeInactive: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400', iconHover: { scale: 1.15 }, iconActiveAnim: { y: [0, -2, 0], transition: { repeat: Infinity, duration: 1.5 } } },
    pt_initial: { iconColor: 'text-indigo-600', iconColorBright: 'text-indigo-700', accent: 'bg-indigo-600', badgeActive: 'bg-indigo-100 text-indigo-600', badgeInactive: 'bg-indigo-50 text-indigo-500', iconHover: { scale: 1.15 }, iconActiveAnim: { y: [0, -2, 0], transition: { repeat: Infinity, duration: 1.5 } } },
    pt_typing: { iconColor: 'text-pink-600', iconColorBright: 'text-pink-700', accent: 'bg-pink-600', badgeActive: 'bg-pink-100 text-pink-600', badgeInactive: 'bg-pink-50 text-pink-500', iconHover: { rotate: [-10, 10, -10, 10, 0] }, iconActiveAnim: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 2 } } },
    pt_proficiency: { iconColor: 'text-fuchsia-600', iconColorBright: 'text-fuchsia-700', accent: 'bg-fuchsia-600', badgeActive: 'bg-fuchsia-100 text-fuchsia-600', badgeInactive: 'bg-fuchsia-50 text-fuchsia-500', iconHover: { scale: 1.15 }, iconActiveAnim: { y: [0, -2, 0], transition: { repeat: Infinity, duration: 1.5 } } },
    pt_opsval: { iconColor: 'text-emerald-600', iconColorBright: 'text-emerald-700', accent: 'bg-emerald-600', badgeActive: 'bg-emerald-100 text-emerald-600', badgeInactive: 'bg-emerald-50 text-emerald-500', iconHover: { scale: 1.15 }, iconActiveAnim: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 2 } } },
    pt_client_assess: { iconColor: 'text-sky-600', iconColorBright: 'text-sky-700', accent: 'bg-sky-600', badgeActive: 'bg-sky-100 text-sky-600', badgeInactive: 'bg-sky-50 text-sky-500', iconHover: { scale: 1.15 }, iconActiveAnim: { y: [0, -2, 0], transition: { repeat: Infinity, duration: 1.5 } } },
    pt_client_interview: { iconColor: 'text-amber-600', iconColorBright: 'text-amber-700', accent: 'bg-amber-600', badgeActive: 'bg-amber-100 text-amber-600', badgeInactive: 'bg-amber-50 text-amber-500', iconHover: { scale: 1.15 }, iconActiveAnim: { y: [0, -2, 0], transition: { repeat: Infinity, duration: 1.5 } } },
    pt_job_offer: { iconColor: 'text-rose-600', iconColorBright: 'text-rose-700', accent: 'bg-rose-600', badgeActive: 'bg-rose-100 text-rose-600', badgeInactive: 'bg-rose-50 text-rose-500', iconHover: { scale: 1.15 }, iconActiveAnim: { y: [0, -2, 0], transition: { repeat: Infinity, duration: 1.5 } } },
    pt_for_pan: { iconColor: 'text-cyan-600', iconColorBright: 'text-cyan-700', accent: 'bg-cyan-600', badgeActive: 'bg-cyan-100 text-cyan-600', badgeInactive: 'bg-cyan-50 text-cyan-500', iconHover: { scale: 1.15 }, iconActiveAnim: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 2 } } },
    pt_waitlisted: { iconColor: 'text-orange-600', iconColorBright: 'text-orange-700', accent: 'bg-orange-600', badgeActive: 'bg-orange-100 text-orange-600', badgeInactive: 'bg-orange-50 text-orange-500', iconHover: { scale: 1.15 }, iconActiveAnim: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 2 } } },
};

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function ManagementHeader({
    activeTab, setActiveTab, activeMajorTab, setActiveMajorTab, allTabCount, ongoingCount, requestsCount, rescheduleCount, markedAsPendingCount = 0, rejectedCount, concludedCount, schedulingCount = 0, reprofileCount = 0, noshowCount = 0, withdrawnCount = 0, waitlistedCount = 0, notEligibleCount = 0, promotedCount = 0, lateralCount = 0, blacklistedCount = 0, totalCount, isPendingTrackerMode, setIsPendingTrackerMode, isExclusiveMode, setIsExclusiveMode, isIdleFilterActive, setIsIdleFilterActive, pendingTrackerCounts, mode, filteredList, onRefresh, onAddCandidate, onImportCandidate
}: ManagementHeaderProps) {
    const { user } = useAuthStore();
    const isRecruiterS = user?.role === 'recruiter_s';
    const visibleTotal = totalCount !== undefined ? totalCount : (ongoingCount + requestsCount + rescheduleCount + markedAsPendingCount + reprofileCount + rejectedCount + concludedCount + noshowCount + withdrawnCount + waitlistedCount + notEligibleCount + promotedCount + lateralCount + blacklistedCount);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleImportCard = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImportCandidate) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const importedData = JSON.parse(content);
                onImportCandidate(importedData);
            } catch (err) {
                console.error('Failed to parse candidate card:', err);
                alert('Invalid Candidate Card file.');
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const tabButtonClass = (tab: Tab) => {
        const isActive = activeTab === tab;
        return cn(
            "group flex items-center gap-2.5 px-4 py-2 my-1 text-[13px] font-medium transition-all duration-300 whitespace-nowrap relative rounded-md border",
            isActive 
                ? "bg-[#1d82f5] border-[#1d82f5] text-white shadow-sm" 
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        );
    };

    const renderCountBadge = (tab: Tab, count: number) => {
        const isActive = activeTab === tab;
        const accent = TAB_ACCENTS[tab];

        return (
            <motion.span
                whileHover={{ scale: 1.15, y: -1 }}
                transition={SPRING}
                className={cn(
                    "min-w-[22px] h-[22px] px-2 text-[11px] font-bold rounded-full flex items-center justify-center transition-colors shrink-0 tabular-nums",
                    isActive
                        ? "bg-white/20 text-white shadow-sm"
                        : count > 0
                            ? accent.badgeInactive
                            : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                )}
            >
                {count}
            </motion.span>
        );
    };

    const getTransition = (tab: Tab, isActive: boolean) => {
        const accent = TAB_ACCENTS[tab];
        const hasKeyframes = (anim: any) => {
            if (!anim) return false;
            return Object.values(anim).some(val => Array.isArray(val));
        };
        const isHoverKeyframes = hasKeyframes(accent.iconHover);
        const isActiveKeyframes = isActive && hasKeyframes(accent.iconActiveAnim);

        if (isHoverKeyframes || isActiveKeyframes) {
            return { ease: 'easeInOut', duration: 0.5 };
        }
        return SPRING;
    };

    const renderTabIcon = (tab: Tab, Icon: React.ComponentType<{ size?: number; className?: string }>) => {
        const accent = TAB_ACCENTS[tab];
        const isActive = activeTab === tab;
        return (
            <motion.span
                className="inline-flex shrink-0"
                whileHover={accent.iconHover as any}
                animate={isActive ? accent.iconActiveAnim : { rotate: 0, scale: 1, y: 0 }}
                transition={getTransition(tab, isActive) as any}
            >
                <Icon
                    size={15}
                    className={cn(
                        "transition-colors duration-200",
                        isActive ? "text-white" : "text-surface-400 group-hover:" + accent.iconColor.replace('text-', 'text-')
                    )}
                />
            </motion.span>
        );
    };

    const renderTab = (
        tab: Tab,
        Icon: React.ComponentType<{ size?: number; className?: string }>,
        label: string,
        num: number
    ) => {
        const isActive = activeTab === tab;
        return (
            <button
                onClick={() => setActiveTab(tab)}
                className={tabButtonClass(tab)}
            >
                <span className={cn(
                    "text-[12px] font-bold select-none mr-1.5 transition-colors duration-200",
                    isActive ? "text-white" : "text-slate-900 group-hover:text-slate-800"
                )}>
                    {num}.
                </span>
                <span className={cn("transition-colors font-semibold tracking-wide", isActive ? "text-white" : "text-slate-600 group-hover:text-slate-900")}>{label}</span>
                {renderCountBadge(tab, getCount(tab))}
            </button>
        );
    };

    const getCount = (tab: Tab): number => {
        if (tab.startsWith('pt_') && pendingTrackerCounts) {
            return pendingTrackerCounts[tab] || 0;
        }
        switch (tab) {
            case 'all_tab': return allTabCount;
            case 'ongoing': return ongoingCount;
            case 'requests': return requestsCount;
            case 'reschedule': return rescheduleCount;
            case 'marked_as_pending': return markedAsPendingCount;
            case 'reprofile': return reprofileCount;
            case 'rejected': return rejectedCount;
            case 'noshow': return noshowCount;
            case 'concluded': return concludedCount;
            case 'scheduling': return schedulingCount;
            case 'withdrawn': return withdrawnCount;
            case 'waitlisted': return waitlistedCount;
            case 'not_eligible': return notEligibleCount;
            case 'promoted': return promotedCount;
            case 'lateral': return lateralCount;
            case 'blacklisted': return blacklistedCount;
            default: return 0;
        }
    };

    const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin' || user?.role === 'ops_val_admin';

    return (
        <div className="bg-white border-b border-slate-200 shadow-sm relative z-20">
            {setIsPendingTrackerMode && (
                <div className="absolute top-4 left-6 z-10 flex items-center gap-3">
                    <button
                        onClick={() => setIsPendingTrackerMode(!isPendingTrackerMode)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-sm border text-[11px] font-bold uppercase tracking-wide transition-all duration-300 cursor-pointer select-none",
                            isPendingTrackerMode 
                                ? "bg-slate-800 border-slate-700 text-white shadow-md ring-2 ring-blue-500/30"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                        )}
                    >
                        {isPendingTrackerMode ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                        Pending Tracker
                    </button>

                    {isAdminOrSuperAdmin && setIsExclusiveMode && (
                        <button
                            onClick={() => setIsExclusiveMode(!isExclusiveMode)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-sm border text-[11px] font-bold uppercase tracking-wide transition-all duration-300 cursor-pointer select-none",
                                isExclusiveMode 
                                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400 shadow-sm ring-2 ring-amber-500/20"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-amber-600 shadow-sm"
                            )}
                        >
                            {isExclusiveMode ? <ToggleRight className="w-4 h-4 text-rose-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                            Hidden (Exclusive)
                        </button>
                    )}

                    {isPendingTrackerMode && setIsIdleFilterActive && (
                        <button
                            onClick={() => setIsIdleFilterActive(!isIdleFilterActive)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-sm border text-[11px] font-bold uppercase tracking-wide transition-all duration-300 cursor-pointer select-none",
                                isIdleFilterActive 
                                    ? "bg-rose-500/20 border-rose-500/30 text-rose-400 shadow-sm ring-2 ring-rose-500/20"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-rose-600 shadow-sm"
                            )}
                        >
                            {isIdleFilterActive ? <ToggleRight className="w-4 h-4 text-rose-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                            IDLE
                        </button>
                    )}
                </div>
            )}
            <div className="relative px-8 py-5 bg-transparent z-10 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.25em] mb-2.5">Recruitment Workspace</span>
                    
                    <div className="inline-flex p-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setActiveMajorTab('all')}
                            className={cn(
                                "px-6 py-1.5 text-[10px] font-black transition-all duration-200 rounded-md uppercase tracking-widest",
                                activeMajorTab === 'all'
                                    ? "bg-[#0f172a] text-white shadow-sm"
                                    : "bg-transparent text-[#0f172a] hover:bg-slate-50"
                            )}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMajorTab('onsite')}
                            className={cn(
                                "px-6 py-1.5 text-[10px] font-black transition-all duration-200 rounded-md uppercase tracking-widest",
                                activeMajorTab === 'onsite'
                                    ? "bg-[#0f172a] text-white shadow-sm"
                                    : "bg-transparent text-[#0f172a] hover:bg-slate-50"
                            )}
                        >
                            On-Site
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMajorTab('oncall')}
                            className={cn(
                                "px-6 py-1.5 text-[10px] font-black transition-all duration-200 rounded-md uppercase tracking-widest",
                                activeMajorTab === 'oncall'
                                    ? "bg-[#0f172a] text-white shadow-sm"
                                    : "bg-transparent text-[#0f172a] hover:bg-slate-50"
                            )}
                        >
                            On-Call
                        </button>
                    </div>
                </div>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {filteredList && filteredList.length > 0 && (
                        <div className="mr-2 border border-slate-200 rounded-sm bg-white shadow-sm flex items-center h-[32px]">
                            <TableExportMenu filteredList={filteredList} activeTab={activeTab} />
                        </div>
                    )}
                    {onImportCandidate && (
                        <>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportCard} />
                            <motion.button
                                whileHover={{ scale: 1.03, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                transition={SPRING}
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 text-[13px] font-medium border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap rounded-md shadow-sm h-[32px]"
                            >
                                <Upload size={13} />
                                Import Card
                            </motion.button>
                        </>
                    )}
                    {onAddCandidate && (
                        <motion.button
                            whileHover={{ scale: 1.03, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => onAddCandidate('selector')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-[13px] font-medium hover:bg-[#1e293b] transition-colors whitespace-nowrap rounded-md shadow-md h-[32px]"
                        >
                            <Plus size={13} className="transition-transform group-hover:rotate-90 duration-300" />
                            Add Candidate
                        </motion.button>
                    )}
                </div>
            </div>

            <div className="flex justify-center gap-2.5 overflow-x-auto no-scrollbar px-8 py-2 border-t border-slate-200 bg-slate-50/50 relative z-10">
                {mode === 'full' && (
                    <>
                        {isPendingTrackerMode ? (
                            <>
                                {renderTab('pt_all', Zap, 'All Pending', 0)}
                                {renderTab('pt_initial', Users, 'Initial Interview', 1)}
                                {renderTab('pt_typing', Clock, 'Typing Tests', 2)}
                                {renderTab('pt_proficiency', Brain, 'Proficiency assessment 1 & 2', 3)}
                                {renderTab('pt_opsval', CheckSquare, 'Ops Val', 4)}
                                {renderTab('pt_client_assess', Building, 'Client Assess', 5)}
                                {renderTab('pt_client_interview', Briefcase, 'Client Interview', 6)}
                                {renderTab('pt_job_offer', Handshake, 'For Job Offer', 7)}
                                {renderTab('pt_for_pan', FileCheck, 'For Pan', 8)}
                                {renderTab('pt_waitlisted', Timer, 'Waitlisted', 9)}
                            </>
                        ) : (
                            <>
                                {renderTab('all_tab', Users, 'All', 0)}
                                {renderTab('ongoing', Zap, 'Ongoing', 1)}
                                {renderTab('requests', Inbox, isRecruiterS ? 'Rerouted' : 'Requests', 2)}
                                {renderTab('reschedule', Calendar, 'Rescheduled', 2.5)}
                                {renderTab('marked_as_pending', Clock, 'Marked', 2.6)}
                                {renderTab('noshow', UserX, 'No Show', 3)}
                                {renderTab('withdrawn', UserMinus, 'Withdrawn', 4)}
                                {renderTab('rejected', OctagonX, 'Failed', 5)}
                                {renderTab('concluded', Trophy, 'Concluded', 6)}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
