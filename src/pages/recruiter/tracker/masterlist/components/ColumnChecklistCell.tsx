import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { evaluateChecklistItem } from '../../components/tableUtils';
import { formatConditionDesc } from './tableHelpers';

export const ColumnChecklistCell = ({ app, col, rowLocalChanges }: any) => {
    const checklistItems = col.checklistItems || [];
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [popoverPos, setPopoverPos] = useState<{ left: number; top: number; placement: 'down' | 'up' } | null>(null);

    // Compute checked items
    const evaluatedItems = useMemo(() => {
        return checklistItems.map((item: any) => {
            const met = evaluateChecklistItem(app, rowLocalChanges, item);
            return {
                ...item,
                met
            };
        });
    }, [checklistItems, app, rowLocalChanges]);

    const metCount = evaluatedItems.filter((i: any) => i.met).length;
    const totalCount = evaluatedItems.length;
    const isAllMet = metCount === totalCount && totalCount > 0;

    const openPopover = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOpen) {
            setIsOpen(false);
            return;
        }
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
            const popoverWidth = 260;
            const margin = 8;
            const viewportW = window.innerWidth;
            let left = rect.left + rect.width / 2 - popoverWidth / 2;
            left = Math.max(margin, Math.min(left, viewportW - popoverWidth - margin));
            const estimatedHeight = 180;
            const viewportH = window.innerHeight;
            const placeDown = rect.bottom + estimatedHeight + margin < viewportH;
            const top = placeDown ? rect.bottom + 6 : Math.max(margin, rect.top - estimatedHeight - 6);
            setPopoverPos({ left, top, placement: placeDown ? 'down' : 'up' });
        }
        setIsOpen(true);
    };

    return (
        <div className="flex items-center justify-center w-full h-full min-h-[36px]">
            <button
                ref={triggerRef}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
                onClick={openPopover}
                className={cn(
                    "px-2 py-1 rounded-none text-[10px] font-black uppercase border tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer",
                    isAllMet
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                )}
            >
                {isAllMet ? (
                    <CheckCircle2 size={11} className="text-emerald-600" strokeWidth={3} />
                ) : (
                    <AlertTriangle size={11} className="text-amber-600 animate-pulse" strokeWidth={3} />
                )}
                <span>{metCount}/{totalCount}</span>
            </button>

            {isOpen && popoverPos && createPortal(
                <>
                    <div className="fixed inset-0 z-[2147483000]" onClick={() => setIsOpen(false)} />
                    <div
                        style={{
                            position: 'fixed',
                            left: popoverPos.left,
                            top: popoverPos.top,
                            zIndex: 2147483001,
                            width: 260
                        }}
                        className="bg-white dark:bg-slate-900 border-2 border-surface-900 shadow-[0_10px_30px_rgba(0,0,0,0.15)] p-3 rounded-none text-left flex flex-col font-sans"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#edebe9] dark:border-slate-800">
                            <span className="text-[10px] font-bold text-surface-800 uppercase tracking-wider">
                                {col.label}
                            </span>
                            <span className="text-[9px] font-bold text-surface-400">
                                {metCount}/{totalCount}
                            </span>
                        </div>
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                            {evaluatedItems.map((item: any, i: number) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-2 text-[11px] py-0.5 group/item"
                                >
                                    {item.met ? (
                                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0 mt-0.5" strokeWidth={3} />
                                    ) : (
                                        <div className="w-3 h-3 border border-surface-300 rounded-none shrink-0 mt-0.5 bg-surface-50" />
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className={cn(
                                            "leading-tight font-semibold",
                                            item.met ? "text-surface-700" : "text-surface-500"
                                        )}>
                                            {item.label}
                                        </span>
                                        <span className="text-[8px] text-surface-400 uppercase tracking-tight">
                                            {item.source} · {formatConditionDesc(item)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
