import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

export type FilterType = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | 'ALL';

export interface DateFilterState {
    type: FilterType;
    start: string | null; // YYYY-MM-DD local time
    end: string | null; // YYYY-MM-DD local time
}

interface AdvancedDateFilterProps {
    value: DateFilterState;
    onChange: (state: DateFilterState) => void;
    className?: string;
    isDark?: boolean;
    placeholder?: string;
    hideTrigger?: boolean;
    onSelectComplete?: () => void;
    variant?: 'default' | 'horizontal';
}

function getLocalISODate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function AdvancedDateFilter({ value, onChange, className, isDark = false, placeholder, hideTrigger = false, onSelectComplete, variant = 'default' }: AdvancedDateFilterProps) {
    const [openDropdown, setOpenDropdown] = useState<'WEEK' | 'MONTH' | 'CUSTOM' | 'TYPE_MENU' | null>(hideTrigger ? 'TYPE_MENU' : null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // For Month dropdown
    const [monthViewYear, setMonthViewYear] = useState(new Date().getFullYear());
    const [monthViewMonth, setMonthViewMonth] = useState(new Date().getMonth());
    
    // For Week dropdown
    const [weekViewDate, setWeekViewDate] = useState(new Date());

    // For Custom dropdown
    const [customStart, setCustomStart] = useState<string | null>(value.type === 'CUSTOM' ? value.start : null);
    const [customEnd, setCustomEnd] = useState<string | null>(value.type === 'CUSTOM' ? value.end : null);

    // Click outside handler removed to allow multiple filters open simultaneously

    const handleSelectType = (type: FilterType) => {
        if (type === 'TODAY') {
            const today = getLocalISODate(new Date());
            onChange({ type: 'TODAY', start: today, end: today });
            if (!hideTrigger) setOpenDropdown(null);
            onSelectComplete?.();
        } else if (type === 'ALL') {
            onChange({ type: 'ALL', start: null, end: null });
            if (!hideTrigger) setOpenDropdown(null);
            onSelectComplete?.();
        } else if (type === 'WEEK') {
            if (openDropdown === 'WEEK') {
                if (!hideTrigger) setOpenDropdown(null);
            } else {
                setOpenDropdown('WEEK');
                if (value.type !== 'WEEK') {
                    setWeekViewDate(new Date());
                }
            }
        } else if (type === 'MONTH') {
            if (openDropdown === 'MONTH') {
                if (!hideTrigger) setOpenDropdown(null);
            } else {
                setOpenDropdown('MONTH');
                if (value.type === 'MONTH' && value.start) {
                    const [y, m] = value.start.split('-');
                    setMonthViewYear(parseInt(y, 10));
                    setMonthViewMonth(parseInt(m, 10) - 1);
                } else {
                    setMonthViewYear(new Date().getFullYear());
                    setMonthViewMonth(new Date().getMonth());
                }
            }
        } else if (type === 'CUSTOM') {
            if (openDropdown === 'CUSTOM') {
                if (!hideTrigger) setOpenDropdown(null);
            } else {
                setOpenDropdown('CUSTOM');
                if (value.type === 'CUSTOM' && value.start) {
                    const [y, m] = value.start.split('-');
                    setMonthViewYear(parseInt(y, 10));
                    setMonthViewMonth(parseInt(m, 10) - 1);
                } else {
                    setMonthViewYear(new Date().getFullYear());
                    setMonthViewMonth(new Date().getMonth());
                }
                if (value.type === 'CUSTOM') {
                    setCustomStart(value.start);
                    setCustomEnd(value.end);
                } else {
                    setCustomStart(null);
                    setCustomEnd(null);
                }
            }
        }
    };

    const monthsShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handleSelectMonth = (idx: number) => {
        setMonthViewMonth(idx);
        // Do not close or select yet, let them pick a day or just leave it
        if (openDropdown !== 'CUSTOM') {
            const firstDay = new Date(monthViewYear, idx, 1);
            const lastDay = new Date(monthViewYear, idx + 1, 0);
            onChange({ type: 'MONTH', start: getLocalISODate(firstDay), end: getLocalISODate(lastDay) });
        }
    };

    const handleSelectDay = (d: number) => {
        const date = new Date(monthViewYear, monthViewMonth, d);
        const iso = getLocalISODate(date);
        
        if (openDropdown === 'CUSTOM') {
            if (!customStart || (customStart && customEnd)) {
                // First click
                setCustomStart(iso);
                setCustomEnd(null);
            } else {
                // Second click
                let finalStart = customStart;
                let finalEnd = iso;
                if (new Date(iso) < new Date(customStart)) {
                    finalStart = iso;
                    finalEnd = customStart;
                }
                setCustomEnd(finalEnd);
                onChange({ type: 'CUSTOM', start: finalStart, end: finalEnd });
                if (!hideTrigger) setOpenDropdown(null);
                onSelectComplete?.();
            }
        } else {
            onChange({ type: 'MONTH', start: iso, end: iso });
            if (!hideTrigger) setOpenDropdown(null);
            onSelectComplete?.();
        }
    };

    const renderMonthGrid = () => {
        const daysInMonth = new Date(monthViewYear, monthViewMonth + 1, 0).getDate();
        const firstDay = new Date(monthViewYear, monthViewMonth, 1).getDay();
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-6 w-6" />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(monthViewYear, monthViewMonth, d);
            const iso = getLocalISODate(date);
            let isSelected = false;
            let isRange = false;
            
            if (openDropdown === 'CUSTOM') {
                if (customStart && customEnd) {
                    isSelected = iso === customStart || iso === customEnd;
                    isRange = iso > customStart && iso < customEnd;
                } else if (customStart) {
                    isSelected = iso === customStart;
                }
            } else {
                isSelected = value.type === 'MONTH' && value.start === iso && value.end === iso;
            }

            days.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDay(d)}
                    className={cn(
                        "h-6 w-6 text-[10px] font-semibold rounded-md transition-all flex items-center justify-center cursor-pointer border",
                        isSelected 
                            ? "bg-blue-600 text-white shadow-sm border-blue-700" 
                            : isRange 
                                ? "bg-blue-50 text-blue-800 border-blue-100" 
                                : "text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-900 dark:text-white border-transparent hover:border-slate-200 dark:border-slate-800"
                    )}
                >
                    {d}
                </button>
            );
        }
        return days;
    };

    const getWeeksInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const weeks = [];
        let currentStart = new Date(firstDay);
        
        // Adjust currentStart to previous Monday (or keep if Monday)
        let dayOfWeek = currentStart.getDay();
        let diff = currentStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        currentStart = new Date(currentStart.setDate(diff));

        let weekNum = 1;
        while (currentStart <= lastDay) {
            let currentEnd = new Date(currentStart);
            currentEnd.setDate(currentStart.getDate() + 6);
            
            weeks.push({
                num: weekNum++,
                start: new Date(currentStart),
                end: new Date(currentEnd),
                label: `W${weekNum - 1} ${monthsShort[currentStart.getMonth()]} ${currentStart.getDate()}-${currentEnd.getDate()}`
            });
            
            currentStart.setDate(currentStart.getDate() + 7);
        }
        return weeks;
    };

    const handleSelectWeek = (start: Date, end: Date) => {
        onChange({ type: 'WEEK', start: getLocalISODate(start), end: getLocalISODate(end) });
        setOpenDropdown(null);
    };

    const handleSelectLast7Days = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        onChange({ type: 'WEEK', start: getLocalISODate(start), end: getLocalISODate(end) });
        setOpenDropdown(null);
    };

    const isLast7DaysSelected = useMemo(() => {
        if (value.type !== 'WEEK' || !value.start || !value.end) return false;
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return value.start === getLocalISODate(start) && value.end === getLocalISODate(end);
    }, [value]);

    return (
        <div className={cn("relative z-30", className)} ref={containerRef}>
            {/* Toggle Button or Horizontal Group */}
            {variant === 'horizontal' ? (
                <div className="flex items-center bg-[#0c2461] p-0.5 shadow-sm rounded-none">
                    <button
                        onClick={() => handleSelectType('TODAY')}
                        className={cn(
                            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-none",
                            value.type === 'TODAY' ? "bg-white/20 text-white shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"
                        )}
                    >
                        TODAY
                    </button>
                    <button
                        onClick={() => handleSelectType('WEEK')}
                        className={cn(
                            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-none flex items-center gap-1",
                            value.type === 'WEEK' ? "bg-white/20 text-white shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"
                        )}
                    >
                        WEEK <ChevronDown size={10} strokeWidth={3} className={openDropdown === 'WEEK' ? "rotate-180 transition-transform" : "transition-transform"} />
                    </button>
                    <button
                        onClick={() => handleSelectType('MONTH')}
                        className={cn(
                            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-none flex items-center gap-1",
                            value.type === 'MONTH' ? "bg-white/20 text-white shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"
                        )}
                    >
                        MONTH <ChevronDown size={10} strokeWidth={3} className={openDropdown === 'MONTH' ? "rotate-180 transition-transform" : "transition-transform"} />
                    </button>
                    <button
                        onClick={() => handleSelectType('CUSTOM')}
                        className={cn(
                            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-none flex items-center gap-1",
                            value.type === 'CUSTOM' ? "bg-white/20 text-white shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"
                        )}
                    >
                        RANGE <ChevronDown size={10} strokeWidth={3} className={openDropdown === 'CUSTOM' ? "rotate-180 transition-transform" : "transition-transform"} />
                    </button>
                    <button
                        onClick={() => handleSelectType('ALL')}
                        className={cn(
                            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-none",
                            value.type === 'ALL' ? "bg-white/20 text-white shadow-md" : "text-white/70 hover:text-white hover:bg-white/10"
                        )}
                    >
                        ALL
                    </button>
                </div>
            ) : (
                !hideTrigger && (
                    <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'TYPE_MENU' ? null : 'TYPE_MENU')}
                        className={cn(
                            "flex items-center justify-between px-3 py-1 text-[10px] tracking-widest uppercase cursor-pointer border shadow-sm min-w-[100px] h-7 rounded-none transition-all",
                            isDark 
                                ? "bg-black/25 text-white border-white/10 hover:bg-black/40 font-black" 
                                : "bg-white dark:bg-slate-900 text-blue-700 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 font-extrabold"
                        )}
                    >
                        <span>{value.type === 'ALL' && placeholder ? placeholder : value.type}</span>
                        <ChevronDown size={12} strokeWidth={3} className={cn("transition-transform shrink-0 ml-2", openDropdown === 'TYPE_MENU' ? "rotate-180" : "", isDark ? "text-white/70" : "text-blue-500")} />
                    </button>
                )
            )}

            <AnimatePresence mode="wait">
                {((openDropdown === 'TYPE_MENU' || hideTrigger) && variant !== 'horizontal' && openDropdown !== 'MONTH' && openDropdown !== 'CUSTOM' && openDropdown !== 'WEEK') && (
                    <motion.div
                        key="type-menu"
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={{ duration: 0.08 }}
                        className={cn(
                            "bg-white dark:bg-slate-900 py-1 overflow-hidden",
                            hideTrigger ? "w-full min-w-[140px]" : "absolute top-full left-0 mt-2 w-full min-w-[120px] border border-slate-200 dark:border-slate-800 shadow-xl z-50"
                        )}
                    >
                        {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM', 'ALL'] as FilterType[]).map((type) => {
                            const isActive = value.type === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleSelectType(type)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 text-[9px] tracking-widest uppercase cursor-pointer transition-colors text-left",
                                        isActive ? "bg-blue-50 text-blue-700 font-extrabold" : "text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-900 dark:text-white font-bold"
                                    )}
                                >
                                    <span>{type}</span>
                                    {(type === 'WEEK' || type === 'MONTH' || type === 'CUSTOM') && (
                                        <ChevronRight size={10} strokeWidth={3} className={isActive ? "text-indigo-400" : "text-slate-400"} />
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}

                {(openDropdown === 'MONTH' || openDropdown === 'CUSTOM') && (
                    <motion.div
                        key="month-custom-calendar"
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={{ duration: 0.08 }}
                        className={cn(
                            "bg-white dark:bg-slate-900 p-3 overflow-hidden",
                            hideTrigger ? "w-[240px]" : "absolute top-full left-0 mt-2 w-[240px] border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg z-50"
                        )}
                    >
                        {hideTrigger && (
                            <button
                                type="button"
                                onClick={() => setOpenDropdown('TYPE_MENU')}
                                className="text-[10px] font-bold text-[#0078D4] hover:underline flex items-center gap-1 mb-2.5 cursor-pointer"
                            >
                                <ChevronLeft size={12} /> Back to options
                            </button>
                        )}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-[10px] tracking-widest">
                                <CalendarIcon size={12} />
                                {openDropdown === 'CUSTOM' ? 'SELECT RANGE' : 'PICK A DATE'}
                            </div>
                            <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-bold text-[10px] tracking-widest">
                                <button type="button" onClick={() => setMonthViewYear(y => y - 1)} className="hover:text-primary-600 cursor-pointer"><ChevronLeft size={12} /></button>
                                {monthViewYear}
                                <button type="button" onClick={() => setMonthViewYear(y => y + 1)} className="hover:text-primary-600 cursor-pointer"><ChevronRight size={12} /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-y-2 gap-x-1.5 mb-4">
                            {monthsShort.map((m, idx) => {
                                const isSelected = monthViewMonth === idx;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => handleSelectMonth(idx)}
                                        className={cn(
                                            "py-1.5 text-[10px] font-semibold rounded cursor-pointer transition-all border",
                                            isSelected 
                                                ? "bg-[#0078D4] text-white shadow-xs border-[#0078D4]" 
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800/60"
                                        )}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                        </div>

                        <div>
                            <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                {openDropdown === 'CUSTOM' ? 
                                    (customStart && !customEnd ? 'SELECT END DATE' : 'SELECT START DATE') :
                                    `PICK A DAY IN ${monthsFull[monthViewMonth].toUpperCase()}`
                                }
                            </div>
                            <div className="grid grid-cols-7 gap-y-1 mb-1">
                                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                                    <div key={i} className="h-6 w-6 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                        {d}
                                    </div>
                                ))}
                                {renderMonthGrid()}
                            </div>
                        </div>
                    </motion.div>
                )}

                {openDropdown === 'WEEK' && (
                    <motion.div
                        key="week-calendar"
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={{ duration: 0.08 }}
                        className={cn(
                            "bg-white dark:bg-slate-900 p-3 overflow-hidden",
                            hideTrigger ? "w-[220px]" : "absolute top-full left-0 mt-2 w-[220px] border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg z-50"
                        )}
                    >
                        {hideTrigger && (
                            <button
                                type="button"
                                onClick={() => setOpenDropdown('TYPE_MENU')}
                                className="text-[10px] font-bold text-[#0078D4] hover:underline flex items-center gap-1 mb-2.5 cursor-pointer"
                            >
                                <ChevronLeft size={12} /> Back to options
                            </button>
                        )}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-[10px] tracking-widest uppercase">
                                <CalendarIcon size={12} className="text-slate-500 dark:text-slate-400" />
                                {monthsFull[weekViewDate.getMonth()]} {weekViewDate.getFullYear()}
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                                <button type="button" onClick={() => setWeekViewDate(new Date(weekViewDate.getFullYear(), weekViewDate.getMonth() - 1, 1))} className="hover:text-primary-600 p-1 cursor-pointer"><ChevronLeft size={12} /></button>
                                <button type="button" onClick={() => setWeekViewDate(new Date(weekViewDate.getFullYear(), weekViewDate.getMonth() + 1, 1))} className="hover:text-primary-600 p-1 cursor-pointer"><ChevronRight size={12} /></button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <button
                                type="button"
                                onClick={handleSelectLast7Days}
                                className="w-full flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/60 rounded transition-all cursor-pointer mb-2 group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-slate-800 rounded flex items-center justify-center text-white text-[8px] font-bold shadow-xs">
                                        NOW
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Last 7 days</span>
                                </div>
                                {isLast7DaysSelected && <div className="w-2 h-2 rounded-full bg-[#0078D4]" />}
                            </button>

                            {getWeeksInMonth(weekViewDate).map((week, idx) => {
                                const isSelected = value.type === 'WEEK' && value.start === getLocalISODate(week.start) && value.end === getLocalISODate(week.end);
                                const labelParts = week.label.split(' ');
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectWeek(week.start, week.end)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2 rounded transition-all cursor-pointer border",
                                            isSelected 
                                                ? "bg-[#EFF6FF] border-[#0078D4] text-[#0078D4] font-semibold" 
                                                : "hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 border-transparent hover:border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <span className="text-[11px] font-bold w-5">{labelParts[0]}</span>
                                        <span className="text-[11px] font-medium">{labelParts.slice(1).join(' ')}</span>
                                        {isSelected && <div className="ml-auto w-2 h-2 rounded-full bg-[#0078D4]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
