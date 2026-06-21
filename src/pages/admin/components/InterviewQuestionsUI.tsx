import React from 'react';
import { BookOpen, Plus, ToggleLeft, ToggleRight, Trash2, Pencil, GripVertical, Inbox, ClipboardCheck } from 'lucide-react';
import { Reorder, useDragControls, motion } from 'framer-motion';
import { cn } from '@/utils/formatters';
import type { InterviewQuestion } from '@/types';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

interface QuestionHeaderProps {
    onAdd: () => void;
    totalCount: number;
    activeCount: number;
}

export function QuestionHeader({ onAdd, totalCount, activeCount }: QuestionHeaderProps) {
    return (
        <div className="bg-white border-b border-surface-200">
            {/* ROW 1: TITLE */}
            <div className="relative px-6 pt-5 pb-2 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2.5">
                    <BookOpen size={17} className="text-[#605e5c] self-center" />
                    <h1
                        className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                    >
                        Question Bank
                    </h1>
                </div>
                <span className="text-[12px] font-medium text-surface-400 tracking-[-0.005em] mt-1.5 tabular-nums">
                    {totalCount} {totalCount === 1 ? 'question' : 'questions'} · {activeCount} active
                </span>
            </div>

            {/* ROW 2: ACTION */}
            <div className="flex items-center justify-center gap-2.5 px-6 pb-3">
                <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING}
                    onClick={onAdd}
                    className="flex items-center gap-1.5 px-3.5 h-7 bg-black text-white text-[11.5px] font-medium tracking-[-0.005em] hover:bg-black/85 transition-all rounded-sm"
                >
                    <Plus size={13} strokeWidth={2.25} />
                    New question
                </motion.button>
            </div>
        </div>
    );
}

type QuestionTab = 'initial' | 'final';

type QuestionTabAccent = {
    iconColor: string;
    iconColorBright: string;
    accent: string;
};

const TAB_ACCENTS: Record<QuestionTab, QuestionTabAccent> = {
    initial: {
        iconColor: 'text-blue-500',
        iconColorBright: 'text-blue-600',
        accent: 'bg-blue-500',
    },
    final: {
        iconColor: 'text-purple-500',
        iconColorBright: 'text-purple-600',
        accent: 'bg-purple-500',
    },
};

interface QuestionTabNavigationProps {
    tab: QuestionTab;
    onTabChange: (tab: QuestionTab) => void;
    initialCount: number;
    finalCount: number;
}

export function QuestionTabNavigation({ tab, onTabChange, initialCount, finalCount }: QuestionTabNavigationProps) {
    const tabs: Array<{
        id: QuestionTab;
        label: string;
        icon: React.ComponentType<{ size?: number; className?: string }>;
        count: number;
        accent: QuestionTabAccent;
    }> = [
        { id: 'initial', label: 'Initial interview', icon: Inbox, count: initialCount, accent: TAB_ACCENTS.initial },
        { id: 'final', label: 'Ops Val interview', icon: ClipboardCheck, count: finalCount, accent: TAB_ACCENTS.final },
    ];

    return (
        <div className="bg-white border-b border-surface-200">
            <div className="flex items-center justify-center gap-9 px-6 overflow-x-auto no-scrollbar">
                {tabs.map(t => {
                    const isActive = tab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => onTabChange(t.id)}
                            className={cn(
                                "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                                isActive ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                            )}
                        >
                            <t.icon
                                size={15}
                                className={cn(
                                    "shrink-0 transition-colors",
                                    isActive ? t.accent.iconColorBright : "text-surface-400 group-hover:text-surface-600"
                                )}
                            />
                            <span>{t.label}</span>
                            <span className={cn(
                                "min-w-[22px] h-[22px] px-2 text-[11px] font-semibold rounded-full flex items-center justify-center tabular-nums",
                                isActive
                                    ? cn(t.accent.iconColor.replace('text-', 'bg-').replace('-500', '-100'), t.accent.iconColor)
                                    : "bg-surface-100 text-surface-500"
                            )}>
                                {t.count}
                            </span>
                            {isActive && (
                                <motion.span
                                    layoutId="question-tab-underline"
                                    className={cn("absolute bottom-0 left-0 right-0 h-[1.5px]", t.accent.accent)}
                                    transition={SPRING}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface QuestionItemProps {
    q: InterviewQuestion;
    i: number;
    toggleActive: (id: string, current: boolean) => void;
    handleEditClick: (q: InterviewQuestion) => void;
    setDelConfirm: (id: string) => void;
}

export function QuestionItem({ q, i, toggleActive, handleEditClick, setDelConfirm }: QuestionItemProps) {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={q}
            dragListener={false}
            dragControls={dragControls}
            className={cn(
                "bg-white border border-surface-200 p-4 transition-all hover:border-[#0078d4] hover:shadow-sm group relative",
                !q.is_active && 'opacity-60 bg-surface-50'
            )}
        >
            <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-4">
                <div
                    className="text-surface-300 group-hover:text-surface-400 cursor-grab active:cursor-grabbing p-1 -m-1 touch-none"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <GripVertical size={20} />
                </div>
                <span className="w-8 h-8 bg-blue-50 text-[#0078d4] text-xs flex items-center justify-center shrink-0 font-semibold border border-blue-100 tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-surface-900 truncate tracking-[-0.005em]">{q.question_text}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                        <span className="text-[11px] text-surface-500 font-medium tracking-[-0.005em] flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0078d4]" />
                            {q.answer_type.replace('_', ' ')}
                        </span>
                        {q.is_required && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-surface-300" />
                                <span className="text-[11px] font-semibold text-red-600 tracking-[-0.005em]">
                                    Required
                                </span>
                            </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-surface-300" />
                        <span className={cn(
                            "text-[11px] font-semibold tracking-[-0.005em]",
                            q.is_active ? "text-emerald-600" : "text-surface-500"
                        )}>
                            {q.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div className="flex gap-1 shrink-0">
                    <button onClick={() => toggleActive(q.id, q.is_active)}
                        className="p-2 text-surface-400 hover:text-[#0078d4] transition-colors hover:bg-surface-100"
                        title={q.is_active ? 'Turn off' : 'Turn on'}>
                        {q.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => handleEditClick(q)}
                        className="p-2 text-surface-400 hover:text-[#0078d4] transition-colors hover:bg-surface-100"
                        title="Edit">
                        <Pencil size={18} />
                    </button>
                    <button onClick={() => setDelConfirm(q.id)}
                        className="p-2 text-surface-400 hover:text-red-600 transition-colors hover:bg-red-50"
                        title="Delete">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </Reorder.Item>
    );
}
