import React from 'react';
import { CheckCircle2, X, Clock3, FastForward, UserMinus, UserX } from 'lucide-react';
import { cn } from '@/utils/formatters';

type ModalTab = 'application' | 'typing' | 'initial' | 'assessment' | 'assessment_ii' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';

type TabStatus = 'passed' | 'active' | 'failed' | 'withdrawn' | 'noshow' | 'bypassed' | 'locked';

interface TabDef {
    id: ModalTab;
    label: string;
}

interface ModalTimelineStepperProps {
    tabs: TabDef[];
    modalTab: ModalTab;
    setModalTab: (tab: ModalTab) => void;
    getTabStatus: (tabId: ModalTab) => TabStatus;
    getStepCompletedTime: (tabId: ModalTab) => string | null;
    getStepCompletedBy: (tabId: ModalTab) => string | null;
}

export const ModalTimelineStepper: React.FC<ModalTimelineStepperProps> = ({
    tabs,
    modalTab,
    setModalTab,
    getTabStatus,
    getStepCompletedTime,
    getStepCompletedBy,
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 px-8 pt-10 pb-5 border-b border-slate-100 shrink-0 relative overflow-x-auto scrollbar-none">
            <div className="relative flex items-center justify-between w-full min-w-[900px] px-4">
                {/* Horizontal Connecting Line */}
                <div className="absolute left-[5%] right-[5%] top-[18px] h-[2px] bg-slate-100 dark:bg-slate-800/50 z-0" />

                {tabs.map((tab, index) => {
                    const status = getTabStatus(tab.id);
                    const isActive = modalTab === tab.id;
                    const isLocked = status === 'locked';

                    // Determine step number/indicator
                    let stepNumber: React.ReactNode = index + 1;
                    if (tab.id === 'application') {
                        stepNumber = 'P'; // Profile
                        index = -1; // Keep numbers starting from process
                    } else if (tab.id === 'verdict') {
                        stepNumber = 'V'; // Verdict
                    }

                    // Style mappings based on status
                    let circleClass = '';
                    let labelClass = 'text-slate-700 dark:text-slate-300';
                    let badgeElement = null;

                    if (status === 'passed') {
                        circleClass = 'bg-emerald-500 text-white border-2 border-emerald-500 shadow-sm';
                        labelClass = 'text-slate-800 dark:text-slate-200 font-bold';
                        const completedTime = getStepCompletedTime(tab.id);
                        const completedBy = getStepCompletedBy(tab.id);
                        badgeElement = (
                            <div className="flex flex-col items-center gap-0.5 mt-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                                    <CheckCircle2 size={10} strokeWidth={3} />
                                    <span>Completed</span>
                                </div>
                                {(completedTime || completedBy) && (
                                    <div className="flex flex-col items-center gap-0 mt-0.5">
                                        {completedTime && <span className="text-[9px] text-primary-500/80 font-medium whitespace-nowrap">{completedTime}</span>}
                                        {completedBy && <span className="text-[8px] text-primary-400/80 font-medium whitespace-nowrap">by {completedBy}</span>}
                                    </div>
                                )}
                            </div>
                        );
                        stepNumber = (
                            <CheckCircle2 size={16} strokeWidth={3} className="text-white" />
                        );
                    } else if (status === 'active') {
                        circleClass = 'bg-blue-600 text-white border-2 border-blue-600 shadow-md ring-4 ring-blue-100';
                        labelClass = 'text-blue-900 font-black';
                        badgeElement = (
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-blue-600 mt-1 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 animate-pulse">
                                <span>Current Step</span>
                            </div>
                        );
                    } else if (status === 'failed') {
                        circleClass = 'bg-rose-500 text-white border-2 border-rose-500 shadow-sm';
                        labelClass = 'text-rose-900 font-bold';
                        const failedTime = getStepCompletedTime(tab.id);
                        const failedBy = getStepCompletedBy(tab.id);
                        badgeElement = (
                            <div className="flex flex-col items-center gap-0.5 mt-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                    <X size={10} strokeWidth={3} />
                                    <span>Failed</span>
                                </div>
                                {(failedTime || failedBy) && (
                                    <div className="flex flex-col items-center gap-0 mt-0.5">
                                        {failedTime && <span className="text-[9px] text-rose-500/70 font-medium whitespace-nowrap">{failedTime}</span>}
                                        {failedBy && <span className="text-[8px] text-rose-400/70 font-medium whitespace-nowrap">by {failedBy}</span>}
                                    </div>
                                )}
                            </div>
                        );
                        stepNumber = (
                            <X size={16} strokeWidth={3} className="text-white" />
                        );
                    } else if (status === 'withdrawn') {
                        circleClass = 'bg-amber-500 text-white border-2 border-amber-500 shadow-sm';
                        labelClass = 'text-amber-900 font-bold';
                        const withdrawnTime = getStepCompletedTime(tab.id);
                        const withdrawnBy = getStepCompletedBy(tab.id);
                        badgeElement = (
                            <div className="flex flex-col items-center gap-0.5 mt-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                    <UserMinus size={10} strokeWidth={3} />
                                    <span>Withdrawn</span>
                                </div>
                                {(withdrawnTime || withdrawnBy) && (
                                    <div className="flex flex-col items-center gap-0 mt-0.5">
                                        {withdrawnTime && <span className="text-[9px] text-amber-500/70 font-medium whitespace-nowrap">{withdrawnTime}</span>}
                                        {withdrawnBy && <span className="text-[8px] text-amber-400/70 font-medium whitespace-nowrap">by {withdrawnBy}</span>}
                                    </div>
                                )}
                            </div>
                        );
                        stepNumber = (
                            <UserMinus size={16} strokeWidth={3} className="text-white" />
                        );
                    } else if (status === 'noshow') {
                        circleClass = 'bg-slate-50 dark:bg-slate-8000 text-white border-2 border-slate-500 shadow-sm';
                        labelClass = 'text-slate-900 dark:text-white font-bold';
                        const noshowTime = getStepCompletedTime(tab.id);
                        const noshowBy = getStepCompletedBy(tab.id);
                        badgeElement = (
                            <div className="flex flex-col items-center gap-0.5 mt-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-100">
                                    <UserX size={10} strokeWidth={3} />
                                    <span>No Show</span>
                                </div>
                                {(noshowTime || noshowBy) && (
                                    <div className="flex flex-col items-center gap-0 mt-0.5">
                                        {noshowTime && <span className="text-[9px] text-slate-500 dark:text-slate-400/70 font-medium whitespace-nowrap">{noshowTime}</span>}
                                        {noshowBy && <span className="text-[8px] text-slate-400/70 font-medium whitespace-nowrap">by {noshowBy}</span>}
                                    </div>
                                )}
                            </div>
                        );
                        stepNumber = (
                            <UserX size={16} strokeWidth={3} className="text-white" />
                        );
                    } else if (status === 'bypassed') {
                        circleClass = 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-700';
                        labelClass = 'text-slate-500 dark:text-slate-400 font-medium';
                        badgeElement = (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                                <FastForward size={10} />
                                <span>Bypassed</span>
                            </div>
                        );
                        stepNumber = (
                            <FastForward size={14} strokeWidth={3} className="text-slate-400" />
                        );
                    } else { // locked
                        circleClass = 'bg-white dark:bg-slate-900 text-slate-400 border-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700';
                        labelClass = 'text-slate-400 font-medium';
                        badgeElement = (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mt-1.5">
                                <Clock3 size={10} />
                                <span>Pending</span>
                            </div>
                        );
                    }

                    if (isActive) {
                        circleClass += ' ring-4 ring-primary-100';
                    }

                    // Remove sequence numbers from raw tab labels to prevent duplicate numbering
                    const cleanLabel = tab.label.replace(/^\d+\.\s+/, '');

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !isLocked && setModalTab(tab.id)}
                            className={cn(
                                "flex flex-col items-center flex-1 relative z-10 outline-none group cursor-pointer transition-all duration-300 ease-out",
                                isLocked ? "cursor-not-allowed opacity-60" : "hover:-translate-y-1 hover:drop-shadow-md"
                            )}
                        >
                            {/* Step Circle */}
                            <div className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center font-black text-[13px] transition-all duration-300",
                                circleClass
                            )}>
                                {stepNumber}
                            </div>

                            {/* Step Label */}
                            <span className={cn(
                                "text-[11px] mt-2.5 tracking-tight text-center max-w-[125px] transition-colors duration-200 group-hover:text-primary-700",
                                labelClass
                            )}>
                                {cleanLabel}
                            </span>

                            {/* Step Status Badge */}
                            {badgeElement}

                            {/* Active selection pointing caret pointer - placed ABOVE the circle */}
                            {isActive && (
                                <div className="absolute -top-8.5 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-down z-20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)] animate-ping absolute -top-1" />
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 drop-shadow-[0_2px_6px_rgba(37,99,235,0.4)]">
                                        <path d="M12 5v14M12 19l7-7M12 19l-7-7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

