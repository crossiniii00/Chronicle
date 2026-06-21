import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Inbox, RefreshCw, OctagonX, Trophy, Plus } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Tab } from '../hooks/useApplicantManagement';
import { useAuthStore } from '@/store/authStore';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';

interface ManagementHeaderProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    ongoingCount: number;
    requestsCount: number;
    rejectedCount: number;
    concludedCount: number;
    schedulingCount?: number;
    reprofileCount?: number;
    mode: 'full' | 'tracking';
    onRefresh?: () => void;
    onAddCandidate?: () => void;
}

type TabAccent = {
    iconColor: string;
    iconColorBright: string;
    accent: string;
    iconHover: any;
    iconActiveAnim: any;
};

const TAB_ACCENTS: Record<Tab, TabAccent> = {
    ongoing: {
        iconColor: 'text-blue-500',
        iconColorBright: 'text-blue-600',
        accent: 'bg-blue-500',
        iconHover: { rotate: -10, scale: 1.25 },
        iconActiveAnim: {
            scale: [1, 1.15, 1],
            transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' },
        },
    },
    requests: {
        iconColor: 'text-amber-500',
        iconColorBright: 'text-amber-600',
        accent: 'bg-amber-500',
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
        iconHover: { rotate: [0, -8, 8, -6, 6, 0], scale: 1.25 },
        iconActiveAnim: {
            rotate: [0, -3, 3, -3, 3, 0],
            transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
        },
    },
    concluded: {
        iconColor: 'text-emerald-500',
        iconColorBright: 'text-emerald-600',
        accent: 'bg-emerald-500',
        iconHover: { rotate: -10, scale: 1.3, y: -2 },
        iconActiveAnim: {
            y: [0, -3, 0],
            rotate: [0, -5, 5, 0],
            transition: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' },
        },
    },
    scheduling: {
        iconColor: 'text-surface-500',
        iconColorBright: 'text-surface-600',
        accent: 'bg-surface-500',
        iconHover: { scale: 1.15 },
        iconActiveAnim: { scale: 1.1 },
    },
};

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function ManagementHeader({
    activeTab, setActiveTab, ongoingCount, requestsCount, rejectedCount, concludedCount, schedulingCount = 0, reprofileCount = 0, mode, onRefresh, onAddCandidate
}: ManagementHeaderProps) {
    const { user } = useAuthStore();
    const isRecruiterS = user?.role === 'recruiter_s';
    const visibleTotal = ongoingCount + requestsCount + reprofileCount + rejectedCount + concludedCount;

    const tabButtonClass = (tab: Tab) => cn(
        "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
        activeTab === tab ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
    );

    const renderCountBadge = (tab: Tab, count: number) => {
        const isActive = activeTab === tab;
        const accent = TAB_ACCENTS[tab];

        return (
            <motion.span
                whileHover={{ scale: 1.15, y: -1 }}
                transition={SPRING}
                className={cn(
                    "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center transition-colors shrink-0 tabular-nums",
                    isActive
                        ? cn(accent.iconColor.replace('text-', 'bg-').replace('-500', '-100'), accent.iconColor)
                        : count > 0
                            ? cn(accent.iconColor.replace('text-', 'bg-').replace('-500', '-50'), accent.iconColor)
                            : "bg-surface-100 text-surface-500"
                )}
            >
                {count}
            </motion.span>
        );
    };

    const renderTabIcon = (tab: Tab, Icon: React.ComponentType<{ size?: number; className?: string }>) => {
        const accent = TAB_ACCENTS[tab];
        const isActive = activeTab === tab;
        return (
            <motion.span
                className="inline-flex shrink-0"
                whileHover={accent.iconHover as any}
                animate={isActive ? accent.iconActiveAnim : { rotate: 0, scale: 1, y: 0 }}
                transition={isActive && Array.isArray(accent.iconActiveAnim?.scale) ? undefined : SPRING}
            >
                <Icon
                    size={15}
                    className={cn(
                        "transition-colors duration-200",
                        isActive ? accent.iconColorBright : "text-surface-400 group-hover:" + accent.iconColor.replace('text-', 'text-')
                    )}
                />
            </motion.span>
        );
    };

    const renderTab = (
        tab: Tab,
        Icon: React.ComponentType<{ size?: number; className?: string }>,
        label: string
    ) => {
        const isActive = activeTab === tab;
        const accent = TAB_ACCENTS[tab];
        return (
            <button
                onClick={() => setActiveTab(tab)}
                className={tabButtonClass(tab)}
            >
                {renderTabIcon(tab, Icon)}
                <span className={cn("transition-colors", isActive && "text-surface-900")}>{label}</span>
                {renderCountBadge(tab, getCount(tab))}
                {isActive && (
                    <motion.span
                        layoutId="tab-underline"
                        className={cn("absolute bottom-0 left-0 right-0 h-[1.5px]", accent.accent)}
                        transition={SPRING}
                    />
                )}
            </button>
        );
    };

    const getCount = (tab: Tab): number => {
        switch (tab) {
            case 'ongoing': return ongoingCount;
            case 'requests': return requestsCount;
            case 'reprofile': return reprofileCount;
            case 'rejected': return rejectedCount;
            case 'concluded': return concludedCount;
            case 'scheduling': return schedulingCount;
            default: return 0;
        }
    };

    return (
        <div className="bg-white border-b border-surface-200">
            <div className="relative px-8 py-8">
                <div className="flex flex-col items-center gap-2">
                    <h1
                        className="text-[32px] leading-none text-surface-900 tracking-[-0.02em]"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                    >
                        Application Management
                    </h1>
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={visibleTotal}
                            initial={{ opacity: 0, y: -3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ duration: 0.18 }}
                            className="text-[12px] font-medium text-surface-400 tracking-[0.04em] tabular-nums uppercase"
                        >
                            {visibleTotal} {visibleTotal === 1 ? 'candidate' : 'candidates'}
                        </motion.span>
                    </AnimatePresence>
                </div>
                {onAddCandidate && (
                    <motion.button
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={SPRING}
                        onClick={onAddCandidate}
                        className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-2 bg-surface-900 text-white text-[13px] font-medium border border-surface-900 hover:bg-black transition-colors whitespace-nowrap rounded-sm"
                    >
                        <Plus size={13} className="transition-transform group-hover:rotate-90 duration-300" />
                        Add candidate
                    </motion.button>
                )}
            </div>

            <div className="flex justify-center gap-9 overflow-x-auto no-scrollbar px-8 border-t border-surface-200">
                {mode === 'full' && (
                    <>
                        {renderTab('ongoing', Zap, 'Ongoing')}
                        {renderTab('requests', Inbox, isRecruiterS ? 'Rerouted' : 'Requests')}
                        {renderTab('reprofile', RefreshCw, 'Reprofile')}
                        {renderTab('rejected', OctagonX, 'Failed')}
                        {renderTab('concluded', Trophy, 'Concluded')}
                    </>
                )}
            </div>
        </div>
    );
}
