import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarDropdownProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    className?: string;
    triggerClassName?: string;
    min?: string; // YYYY-MM-DD
    highlightedDates?: string[]; // Array of YYYY-MM-DD strings
    noMargin?: boolean;
}

export function CalendarDropdown({ value, onChange, label, className, triggerClassName, min, highlightedDates = [], noMargin = false }: CalendarDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'days' | 'month-year'>('days');
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [popupPos, setPopupPos] = useState<{ top: number; left: number; maxHeight: number }>({ top: 0, left: 0, maxHeight: 500 });

    const getInitialDate = () => {
        if (!value) return new Date();
        const parts = value.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                return new Date(y, m, d);
            }
        }
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const [viewDate, setViewDate] = useState(getInitialDate());

    useEffect(() => {
        if (value) {
            setViewDate(getInitialDate());
        }
    }, [value]);

    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const top = rect.bottom + 4;
            
            // Keep horizontally in viewport
            let left = rect.left;
            if (left + 310 > window.innerWidth - 8) {
                left = window.innerWidth - 310 - 8;
            }
            if (left < 8) left = 8;
            
            // Cap max-height to available space below
            const maxH = window.innerHeight - top - 12;
            
            setPopupPos({ top, left, maxHeight: Math.max(200, maxH) });
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const popupEl = document.getElementById('calendar-dropdown-popup');
            if (
                containerRef.current && !containerRef.current.contains(event.target as Node) &&
                (!popupEl || !popupEl.contains(event.target as Node))
            ) {
                setIsOpen(false);
                setViewMode('days');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            const handleScrollOrResize = () => updatePosition();
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
            return () => {
                window.removeEventListener('scroll', handleScrollOrResize, true);
                window.removeEventListener('resize', handleScrollOrResize);
            };
        }
    }, [isOpen, updatePosition]);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const monthsFull = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleSelectDay = (day: number) => {
        const y = viewDate.getFullYear();
        const m = (viewDate.getMonth() + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
        setIsOpen(false);
    };

    const formatDisplayDate = (val: string) => {
        const parts = val.split('-');
        if (parts.length === 3) {
            const y = parts[0];
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return `${months[m]} ${d}, ${y}`;
        }
        return val;
    };

    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        const days = [];

        // Previous month filler days
        const prevMonthDays = daysInMonth(year, month - 1);
        for (let i = startDay - 1; i >= 0; i--) {
            days.push(
                <div key={`prev-${i}`} className="h-10 w-10 flex items-center justify-center text-[12px] text-slate-300 select-none">
                    {prevMonthDays - i}
                </div>
            );
        }

        // Current month days
        const parsedValue = value ? getInitialDate() : null;
        const parsedMin = min ? new Date(min) : null;

        for (let d = 1; d <= totalDays; d++) {
            const currentDate = new Date(year, month, d);
            const isSelected = parsedValue && 
                parsedValue.getFullYear() === year && 
                parsedValue.getMonth() === month && 
                parsedValue.getDate() === d;
            
            const today = new Date();
            const isToday = today.getFullYear() === year && 
                today.getMonth() === month && 
                today.getDate() === d;

            let disabled = false;
            if (parsedMin) {
                // Compare dates without time
                const minCompare = new Date(parsedMin.getFullYear(), parsedMin.getMonth(), parsedMin.getDate());
                disabled = currentDate < minCompare;
            }

            const yStr = year.toString();
            const mStr = (month + 1).toString().padStart(2, '0');
            const dStr = d.toString().padStart(2, '0');
            const dateStr = `${yStr}-${mStr}-${dStr}`;
            const isHighlighted = highlightedDates.includes(dateStr);

            days.push(
                <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectDay(d)}
                    className={cn(
                        "relative h-10 w-10 text-[12px] font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer",
                        isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : 
                        isToday ? "text-indigo-600 border border-indigo-200 bg-indigo-50/50" : 
                        disabled ? "text-slate-200 cursor-not-allowed" :
                        "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50"
                    )}
                >
                    {d}
                    {isHighlighted && (
                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.8)]"></div>
                    )}
                </button>
            );
        }

        return days;
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

    const popupContent = isOpen ? (
        <motion.div
            id="calendar-dropdown-popup"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, type: "spring", bounce: 0.25 }}
            style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 99999, maxHeight: popupPos.maxHeight }}
            className="w-[310px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] rounded-2xl p-5 overflow-y-auto custom-scrollbar"
        >
            {viewMode === 'days' ? (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={() => setViewMode('month-year')}
                            className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        >
                            {monthsFull[viewDate.getMonth()]} {viewDate.getFullYear()}
                            <ChevronDown size={12} className="text-slate-400" />
                        </button>
                        <div className="flex gap-0.5">
                            <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer">
                                <ChevronLeft size={14} />
                            </button>
                            <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 mb-1 gap-x-1">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                            <div key={`weekday-${d}`} className="h-10 w-10 flex items-center justify-center text-[11px] font-bold text-slate-400">
                                {d}
                            </div>
                        ))}
                        {renderDays()}
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Month & Year</span>
                        <button
                            type="button"
                            onClick={() => setViewMode('days')}
                            className="text-[10px] font-bold text-indigo-650 hover:text-indigo-700 hover:bg-indigo-50/50 px-2 py-0.5 rounded-md"
                        >
                            Back
                        </button>
                    </div>
                    <div className="space-y-3">
                        {/* Years scroll grid */}
                        <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Year</span>
                            <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar scrollbar-thin">
                                {years.map(y => {
                                    const isSelected = viewDate.getFullYear() === y;
                                    return (
                                        <button
                                            key={y}
                                            type="button"
                                            onClick={() => setViewDate(new Date(y, viewDate.getMonth(), 1))}
                                            className={cn(
                                                "px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 cursor-pointer transition-all",
                                                isSelected ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50"
                                            )}
                                        >
                                            {y}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Months grid */}
                        <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">Month</span>
                            <div className="grid grid-cols-4 gap-1.5">
                                {months.map((m, idx) => {
                                    const isSelected = viewDate.getMonth() === idx;
                                    return (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => {
                                                setViewDate(new Date(viewDate.getFullYear(), idx, 1));
                                                setViewMode('days');
                                            }}
                                            className={cn(
                                                "py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all",
                                                isSelected ? "bg-indigo-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50"
                                            )}
                                        >
                                            {m}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    ) : null;

    return (
        <div className={cn("relative w-full transition-all duration-300", className)} ref={containerRef}>
            <div 
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={triggerClassName || cn(
                    "w-full h-10 px-3 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-sm text-[13px] flex items-center justify-between cursor-pointer transition-all select-none hover:border-slate-400",
                    isOpen && "border-[#0078d4] ring-1 ring-[#0078d4]"
                )}
            >
                <span className={cn(value ? "text-surface-900 font-semibold" : "text-slate-400 font-medium")}>
                    {value ? formatDisplayDate(value) : (label || "mm/dd/yyyy")}
                </span>
                <div className="flex items-center gap-2">
                    {value && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="p-1 hover:bg-slate-100 dark:bg-slate-800/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                            title="Clear date"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    )}
                    <CalendarIcon size={14} className="text-slate-400 shrink-0" />
                </div>
            </div>

            {createPortal(
                <AnimatePresence>
                    {popupContent}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
