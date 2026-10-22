import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface MonthDropdownProps {
    year: number;
    month: number;
    day?: number;
    onPickMonth: (year: number, month: number) => void;
    onPickDay: (day: number) => void;
    onClose: () => void;
    onMouseEnter: () => void;
}

export const MonthDropdown: React.FC<MonthDropdownProps> = ({
    year,
    month,
    day,
    onPickMonth,
    onPickDay,
    onClose,
    onMouseEnter
}) => {
    const [viewYear, setViewYear] = useState(year);
    useEffect(() => { setViewYear(year); }, [year]);
    const monthShort = (m: number) => new Date(viewYear, m, 1).toLocaleDateString([], { month: 'short' });
    const monthFull = (m: number) => new Date(viewYear, m, 1).toLocaleDateString([], { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const isCurrentMonth = year === currentYear && month === currentMonth;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 600, damping: 16, mass: 0.6 }}
            onMouseEnter={onMouseEnter}
            className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-none shadow-2xl border border-surface-200 overflow-hidden z-50 origin-top-right"
        >
            <div className="px-3 py-2.5 bg-gradient-to-br from-surface-50 to-white border-b border-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-surface-500" />
                    <span className="text-[10px] font-bold text-surface-700 uppercase tracking-widest">Pick a date</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setViewYear(y => y - 1)}
                        className="w-5 h-5 rounded-none hover:bg-surface-100 flex items-center justify-center text-surface-500 hover:text-black transition-colors"
                    >
                        <ChevronLeft size={12} />
                    </button>
                    <span className="text-[10px] font-bold text-surface-900 min-w-[36px] text-center tabular-nums">{viewYear}</span>
                    <button
                        onClick={() => setViewYear(y => y + 1)}
                        className="w-5 h-5 rounded-none hover:bg-surface-100 flex items-center justify-center text-surface-500 hover:text-black transition-colors"
                    >
                        <ChevronRight size={12} />
                    </button>
                </div>
            </div>

            <div className="p-2">
                <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 12 }, (_, m) => {
                        const isSelected = year === viewYear && month === m;
                        const isCurrent = viewYear === currentYear && m === currentMonth;
                        return (
                            <button
                                key={m}
                                onClick={() => onPickMonth(viewYear, m)}
                                className={cn(
                                    "px-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-none transition-all relative",
                                    isSelected
                                        ? "bg-black text-white shadow-sm"
                                        : "text-surface-700 hover:bg-surface-50"
                                )}
                            >
                                {monthShort(m)}
                                {isCurrent && !isSelected && (
                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-vibrant-emerald" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-2 pt-2 border-t border-surface-100">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold text-surface-500 uppercase tracking-widest">
                            Pick a day in {monthFull(month)}
                        </span>
                        {day != null && (
                            <button
                                onClick={() => { onPickMonth(year, month); onClose(); }}
                                className="text-[9px] font-bold text-vibrant-pink hover:underline uppercase tracking-widest"
                            >
                                Clear day
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-[8px] font-bold text-surface-400 text-center py-0.5 uppercase">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: firstDayOfMonth }, (_, i) => (
                            <div key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const d = i + 1;
                            const isSelected = day === d;
                            const isToday = isCurrentMonth && d === currentDay;
                            return (
                                <button
                                    key={d}
                                    onClick={() => onPickDay(d)}
                                    className={cn(
                                        "h-7 text-[10px] font-semibold rounded-none transition-colors relative",
                                        isSelected
                                            ? "bg-black text-white"
                                            : isToday
                                            ? "bg-vibrant-emerald/10 text-vibrant-emerald hover:bg-vibrant-emerald/20"
                                            : "text-surface-700 hover:bg-surface-100"
                                    )}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
