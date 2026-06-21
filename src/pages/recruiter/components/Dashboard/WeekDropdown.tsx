import React from 'react';
import { CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface WeekDropdownProps {
    weeks: { label: string; weekIndex: number; startStr: string; endStr: string }[];
    selected?: number;
    onSelect: (weekIndex: number) => void;
    onMouseEnter: () => void;
}

export const WeekDropdown: React.FC<WeekDropdownProps> = ({ weeks, selected, onSelect, onMouseEnter }) => {
    const monthLabel = (() => {
        const first = weeks[0];
        if (!first) return '';
        const [y, m] = first.startStr.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
    })();
    const isThisWeek = selected == null || selected < 0;
    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 600, damping: 16, mass: 0.6 }}
            onMouseEnter={onMouseEnter}
            className="absolute top-full right-0 mt-2 w-64 bg-white rounded-sm shadow-2xl border border-surface-200 overflow-hidden z-50 origin-top-right"
        >
            <div className="px-3 py-2 bg-gradient-to-br from-surface-50 to-white border-b border-surface-100 flex items-center gap-2">
                <CalendarDays size={12} className="text-surface-500" />
                <span className="text-[10px] font-bold text-surface-700 uppercase tracking-widest">{monthLabel}</span>
            </div>
            <div className="p-1.5">
                <button
                    onClick={() => onSelect(-1)}
                    className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold rounded-sm transition-colors group",
                        isThisWeek ? "bg-black/5 text-surface-900" : "text-surface-700 hover:bg-surface-50"
                    )}
                >
                    <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center text-[9px] font-black">NOW</span>
                    <span className="flex-1 text-left">This week (last 7 days)</span>
                    {isThisWeek && <span className="w-1.5 h-1.5 rounded-full bg-vibrant-emerald" />}
                </button>
                <div className="my-1 border-t border-surface-100" />
                {weeks.map((w) => {
                    const isSelected = selected === w.weekIndex;
                    return (
                        <button
                            key={w.weekIndex}
                            onClick={() => onSelect(w.weekIndex)}
                            className={cn(
                                "w-full flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold rounded-sm transition-colors",
                                isSelected ? "bg-black text-white" : "text-surface-700 hover:bg-surface-50"
                            )}
                        >
                            <span className={cn(
                                "w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-black",
                                isSelected ? "bg-white text-black" : "bg-surface-100 text-surface-700"
                            )}>
                                W{w.weekIndex + 1}
                            </span>
                            <span className="flex-1 text-left">{w.label.replace(/^Week \d+ · /, '')}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
};
