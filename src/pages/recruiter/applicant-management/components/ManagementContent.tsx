import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    Users, Loader2, Smile, Sparkles, User, UserCheck, UserPlus, Briefcase,
    Tag, Keyboard, Award, Activity, Monitor, Calendar, Clock, CalendarCheck,
    GraduationCap, Sliders, XCircle, LogOut
} from 'lucide-react';
import { ApplicantCard } from '@/components/features/ApplicantManagement/ApplicantCard';
import { ApplicantRow } from '@/components/features/ApplicantManagement/ApplicantRow';
import type { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import type { Tab, ApplicantAction } from '../hooks/useApplicantManagement';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling'; // Not used here but good to have
import { TableExportMenu } from './TableExportMenu';

interface ManagementContentProps {
    activeTab: Tab;
    filteredList: Application[];
    viewMode: 'grid' | 'list';
    isSelectMode: boolean;
    setIsSelectMode: (val: boolean) => void;
    selectedIds: Set<string>;
    toggleSelect: (id: string, forceMode?: 'select' | 'deselect') => void;
    toggleSelectAll: () => void;
    handleAction: (id: string, name: string, action: ApplicantAction) => void;
    handlePromote: (app: Application, result?: 'pass' | 'conditional' | 'fail', reason?: string) => void;
    handleRegress: (app: Application) => void;
    handleSetActiveReprofileAccount: (app: Application, account: string) => void;
    isLoading?: boolean;
    duplicateRequestsMap?: Record<string, string[]>;
}

export function ManagementContent({
    activeTab, filteredList, viewMode, isSelectMode, setIsSelectMode, selectedIds, toggleSelect, toggleSelectAll,
    handleAction, handlePromote, handleRegress, handleSetActiveReprofileAccount, isLoading, duplicateRequestsMap
}: ManagementContentProps) {
    const [displayLimit, setDisplayLimit] = useState(50);
    const observerTarget = useRef<HTMLDivElement>(null);

    const isDraggingRef = useRef(false);
    const dragModeRef = useRef<'select' | 'deselect' | null>(null);

    const handleMouseDown = (appId: string) => {
        if (!isSelectMode) return;
        isDraggingRef.current = true;
        dragModeRef.current = selectedIds.has(appId) ? 'deselect' : 'select';
        toggleSelect(appId, dragModeRef.current);
    };

    const handleMouseEnter = (appId: string) => {
        // Disabled slide-selection, only manual multi-select allowed
        // if (!isSelectMode || !isDraggingRef.current || !dragModeRef.current) return;
        // toggleSelect(appId, dragModeRef.current);
    };

    useEffect(() => {
        const handleMouseUp = () => {
            isDraggingRef.current = false;
            dragModeRef.current = null;
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    // Reset limit when tab or filter changes heavily
    useEffect(() => {
        setDisplayLimit(50);
    }, [activeTab, filteredList.length > 500 ? 'large' : 'small']);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setDisplayLimit(prev => Math.min(prev + 50, filteredList.length));
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [filteredList.length]);

    const displayedList = filteredList.slice(0, displayLimit);

    if (isLoading) {
        return (
            <div className="h-full min-h-[480px] flex flex-col items-center justify-center p-8 relative overflow-hidden bg-white dark:bg-slate-900">
                {/* Subtle top progress bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-surface-100 overflow-hidden z-20">
                    <div
                        className="h-full rounded-full"
                        style={{
                            background: 'linear-gradient(90deg, transparent, #ef3e36, transparent)',
                            animation: 'shimmerBar 1.8s ease-in-out infinite',
                            width: '40%'
                        }}
                    />
                </div>

                {/* Ambient background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#ef3e36]/[0.02] rounded-full blur-[100px]" />
                </div>

                <div className="flex flex-col items-center justify-center max-w-sm text-center space-y-8 z-10">
                    {/* Logo with pulse ring */}
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-[-12px] rounded-full border border-[#ef3e36]/10 animate-ping opacity-30" style={{ animationDuration: '2.5s' }} />
                        <div className="absolute inset-[-6px] rounded-full border border-[#ef3e36]/5" />
                        <div className="relative w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-surface-200/50 border border-surface-150 flex items-center justify-center transition-transform hover:scale-105">
                            <img
                                src="/contactpoint-logo.png?v=2"
                                alt="ContactPoint 360"
                                className="w-10 h-10 object-contain"
                                style={{ animation: 'gentlePulse 3s ease-in-out infinite' }}
                            />
                        </div>
                    </div>

                    {/* Loading text */}
                    <div className="space-y-2">
                        <h3 className="text-[13px] font-black text-surface-900 uppercase tracking-[0.2em]">
                            Loading Workspace
                        </h3>
                        <p className="text-[11px] text-surface-400 font-medium leading-relaxed italic">
                            {(() => {
                                const quotes = [
                                    '"The secret of getting ahead is getting started." — Mark Twain',
                                    '"Talent wins games, but teamwork wins championships." — Michael Jordan',
                                    '"Hire character. Train skill." — Peter Schutz',
                                    '"Great vision without great people is irrelevant." — Jim Collins',
                                    '"The best way to predict the future is to create it." — Peter Drucker',
                                    '"People are not your most important asset. The right people are." — Jim Collins',
                                    '"Culture eats strategy for breakfast." — Peter Drucker',
                                ];
                                return quotes[Math.floor(Math.random() * quotes.length)];
                            })()}
                        </p>
                    </div>

                    {/* Elegant thin progress bar */}
                    <div className="w-44 space-y-3">
                        <div className="w-full h-[3px] bg-surface-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[#ef3e36]"
                                style={{
                                    animation: 'loadProgress 2s ease-in-out infinite',
                                }}
                            />
                        </div>
                        <p className="text-[9px] text-surface-300 font-bold uppercase tracking-[0.25em]">
                            Gathering records
                        </p>
                    </div>
                </div>

                <style>{`
                    @keyframes shimmerBar {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(350%); }
                    }
                    @keyframes gentlePulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.85; }
                    }
                    @keyframes loadProgress {
                        0% { width: 0%; opacity: 0.6; }
                        50% { width: 70%; opacity: 1; }
                        100% { width: 100%; opacity: 0.6; }
                    }
                `}</style>
            </div>
        );
    }

    if (filteredList.length === 0) {
        return (
            <div className="h-full min-h-[440px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-8">
                <div className="max-w-md text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 shadow-sm text-slate-400 group-hover:scale-105 transition-transform duration-300">
                        <Users size={26} className="text-slate-400" />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">No matching candidates</h3>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">We couldn't find any candidate records matching your active filters. Try adjusting your search query, selecting a different account, or modifying the status tabs.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'all_tab' || activeTab.startsWith('pt_') || activeTab === 'ongoing' || activeTab === 'reprofile' || activeTab === 'concluded' || activeTab === 'requests' || activeTab === 'reschedule' || activeTab === 'rejected' || activeTab === 'noshow' || activeTab === 'withdrawn' || activeTab === 'waitlisted' || activeTab === 'not_eligible' || activeTab === 'promoted' || activeTab === 'lateral' || activeTab === 'blacklisted' || activeTab === 'marked_as_pending' || activeTab === 'scheduling') {
        if (viewMode === 'grid') {
            return (
                <div className="h-full overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-4">
                    {displayedList.map((applicant: Application, index: number) => (
                        <ApplicantCard
                            key={applicant.id}
                            applicant={applicant}
                            rowNumber={index + 1}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(applicant.id)}
                            onSelect={toggleSelect}
                            onAction={(id, name, action) => handleAction(id, name, action as ApplicantAction)}
                            isReprofileView={activeTab === 'reprofile'}
                            onSetActiveReprofileAccount={handleSetActiveReprofileAccount}
                        />
                    ))}
                    {displayLimit < filteredList.length && (
                        <div ref={observerTarget} className="col-span-full h-20 flex items-center justify-center">
                            <Loader2 className="animate-spin text-surface-400" size={24} />
                        </div>
                    )}
                </div>
            );
        }

        const shouldHidePosition = ['not_eligible', 'blacklisted', 'withdrawn', 'promoted', 'lateral'].includes(activeTab || '');
        const isRejected = activeTab === 'rejected';
        const isPendingTracker = activeTab?.startsWith('pt_');

        const gridColsClass = isRejected
            ? "grid-cols-[1.2fr_100px_140px_140px_1fr_90px_110px_90px_160px_110px_90px_120px_110px_90px]"
            : isPendingTracker
                ? "grid-cols-[1.2fr_100px_140px_140px_1fr_90px_110px_90px_160px_100px_90px_90px_120px_110px_90px]"
                : shouldHidePosition
                    ? "grid-cols-[1.2fr_100px_140px_140px_90px_110px_90px_160px_100px_90px_120px_110px_90px]"
                    : "grid-cols-[1.2fr_100px_140px_140px_1fr_90px_110px_90px_160px_100px_90px_120px_110px_90px]";

        return (
            <div className={cn("h-full overflow-auto p-4 scrollbar-thin scrollbar-thumb-surface-200 hover:scrollbar-thumb-surface-300", isSelectMode && "select-none")}>
                <div className="min-w-[1250px] bg-white dark:bg-slate-900 border border-surface-300 rounded-sm">
                    <div className={`sticky top-0 z-10 grid ${gridColsClass} items-center bg-white dark:bg-slate-900 border-b border-surface-300 h-9 divide-x divide-surface-200 dark:divide-surface-700`}>
                        <div className="pl-5 pr-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center gap-2">
                            {isSelectMode && (
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size > 0 && selectedIds.size === filteredList.length}
                                    onChange={toggleSelectAll}
                                    className="w-3.5 h-3.5 rounded-sm border-surface-300 text-surface-900 focus:ring-surface-400 cursor-pointer"
                                />
                            )}
                            <User size={12} className="shrink-0 text-surface-400" />
                            Candidate
                        </div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5 text-center leading-tight">
                            <Sparkles size={12} className="shrink-0 text-surface-400" />
                            Special Status
                        </div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center gap-1.5">
                            <UserCheck size={12} className="shrink-0 text-surface-400" />
                            Assigned
                        </div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center gap-1.5">
                            <UserPlus size={12} className="shrink-0 text-surface-400" />
                            Recruiter
                        </div>
                        {!shouldHidePosition && (
                            <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center gap-1.5">
                                <Briefcase size={12} className="shrink-0 text-surface-400" />
                                Position
                            </div>
                        )}
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5">
                            <Tag size={12} className="shrink-0 text-surface-400" />
                            Type
                        </div>
                        {isRejected ? (
                            <>
                                <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5">
                                    <Keyboard size={12} className="shrink-0 text-surface-400" />
                                    Typing
                                </div>
                                <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5 text-center leading-tight">
                                    <XCircle size={12} className="shrink-0 text-surface-400" />
                                    Failed At
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5">
                                    <Keyboard size={12} className="shrink-0 text-surface-400" />
                                    Typing
                                </div>
                                <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5">
                                    <Award size={12} className="shrink-0 text-surface-400" />
                                    Score
                                </div>
                            </>
                        )}
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5">
                            <Activity size={12} className="shrink-0 text-surface-400" />
                            Status
                        </div>
                        {isRejected ? (
                            <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5 text-center leading-tight">
                                <XCircle size={12} className="shrink-0 text-surface-400" />
                                Failed From
                            </div>
                        ) : activeTab === 'withdrawn' ? (
                            <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5 text-center leading-tight">
                                <LogOut size={12} className="shrink-0 text-surface-400" />
                                Withdrew From
                            </div>
                        ) : (
                            <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5">
                                <Monitor size={12} className="shrink-0 text-surface-400" />
                                Mode
                            </div>
                        )}
                        {isPendingTracker ? (
                            <>
                                <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5 text-center">
                                    <Calendar size={12} className="shrink-0 text-surface-400" />
                                    Started
                                </div>
                                <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5 text-center">
                                    <Clock size={12} className="shrink-0 text-surface-400" />
                                    Wait Time
                                </div>
                            </>
                        ) : (
                            <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5">
                                <Calendar size={12} className="shrink-0 text-surface-400" />
                                Applied
                            </div>
                        )}
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5 text-center leading-tight">
                            <CalendarCheck size={12} className="shrink-0 text-surface-400" />
                            Ops Val
                        </div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5 text-center leading-tight">
                            <GraduationCap size={12} className="shrink-0 text-surface-400" />
                            Training
                        </div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center gap-1.5">
                            <Sliders size={12} className="shrink-0 text-surface-400" />
                            Actions
                        </div>
                    </div>

                    <div className="divide-y divide-surface-200 applicant-row-container" onMouseLeave={() => isDraggingRef.current = false}>
                        {displayedList.map((applicant: Application, index: number) => (
                            <ApplicantRow
                                key={applicant.id}
                                applicant={applicant}
                                rowNumber={index + 1}
                                isSelectMode={isSelectMode}
                                isSelected={selectedIds.has(applicant.id)}
                                onLongPress={(id: string) => {
                                    setIsSelectMode(true);
                                    if (!selectedIds.has(id)) toggleSelect(id);
                                }}
                                onSelect={toggleSelect}
                                onClick={() => handleAction(applicant.id, applicant.applicant_name, 'view')}
                                onAction={(id, name, action) => handleAction(id, name, action as ApplicantAction)}
                                onPromote={handlePromote}
                                isReprofileView={activeTab === 'reprofile'}
                                isRejectedView={isRejected}
                                onSetActiveReprofileAccount={handleSetActiveReprofileAccount}
                                isDuplicate={Boolean(duplicateRequestsMap?.[applicant.id])}
                                shouldHidePosition={shouldHidePosition}
                                isPendingTracker={isPendingTracker}
                                activeTab={activeTab}
                            />
                        ))}
                    </div>
                    {displayLimit < filteredList.length && (
                        <div ref={observerTarget} className="h-16 flex items-center justify-center border-t border-surface-200 bg-surface-50">
                            <Loader2 className="animate-spin text-surface-400" size={20} />
                            <span className="ml-2 text-xs font-medium text-surface-500 uppercase tracking-wider">Loading more...</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
