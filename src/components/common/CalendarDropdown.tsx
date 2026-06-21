import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarDropdownProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    className?: string;
    min?: string; // YYYY-MM-DD
}

export function CalendarDropdown({ value, onChange, label, className, min }: CalendarDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'days' | 'month-year'>('days');
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Sync viewDate when value changes
    useEffect(() => {
        if (value) {
            setViewDate(getInitialDate());
        }
    }, [value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setViewMode('days');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const isDateDisabled = (year: number, month: number, day: number) => {
        if (!min) return false;
        const current = new Date(year, month, day);
        const minParts = min.split('-');
        if (minParts.length === 3) {
            const minY = parseInt(minParts[0], 10);
            const minM = parseInt(minParts[1], 10) - 1;
            const minD = parseInt(minParts[2], 10);
            const minimum = new Date(minY, minM, minD);
            return current < minimum;
        }
        return false;
    };

    const handleSelectDay = (day: number) => {
        if (isDateDisabled(viewDate.getFullYear(), viewDate.getMonth(), day)) return;
        const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const y = selected.getFullYear();
        const m = String(selected.getMonth() + 1).padStart(2, '0');
        const d = String(selected.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
        setIsOpen(false);
    };

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
                return `${months[monthIndex]} ${day}, ${year}`;
            }
        }
        return dateStr;
    };

    const renderDays = () => {
        const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
        const firstDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
        const days = [];

        // Padding for first week
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        const today = new Date().toDateString();
        const currentSelected = value ? getInitialDate().toDateString() : null;

        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), d).toDateString();
            const isToday = date === today;
            const isSelected = date === currentSelected;
            const disabled = isDateDisabled(viewDate.getFullYear(), viewDate.getMonth(), d);

            days.push(
                <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectDay(d)}
                    className={cn(
                        "h-8 w-8 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer",
                        isSelected ? "bg-indigo-600 text-white shadow-sm" : 
                        isToday ? "text-indigo-600 border border-indigo-200 bg-indigo-50/50" : 
                        disabled ? "text-slate-200 cursor-not-allowed" :
                        "text-slate-700 hover:bg-slate-50"
                    )}
                >
                    {d}
                </button>
            );
        }

        return days;
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-[12px] flex items-center justify-between cursor-pointer transition-all select-none hover:border-slate-300",
                    isOpen && "border-indigo-500 ring-2 ring-indigo-100"
                )}
            >
                <span className={cn(value ? "text-slate-800 font-medium" : "text-slate-400")}>
                    {value ? formatDisplayDate(value) : (label || "mm/dd/yyyy")}
                </span>
                <CalendarIcon size={14} className="text-slate-400 shrink-0 ml-2" />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 shadow-xl rounded-2xl z-[9999] p-4 overflow-hidden"
                    >
                        {viewMode === 'days' ? (
                            <>
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('month-year')}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                    >
                                        {monthsFull[viewDate.getMonth()]} {viewDate.getFullYear()}
                                        <ChevronDown size={12} className="text-slate-400" />
                                    </button>
                                    <div className="flex gap-0.5">
                                        <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 cursor-pointer">
                                            <ChevronLeft size={14} />
                                        </button>
                                        <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 cursor-pointer">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-y-0.5 mb-1">
                                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                                        <div key={`weekday-${d}`} className="h-8 w-8 flex items-center justify-center text-[10px] font-bold text-slate-400">
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
                                        className="text-[10px] font-bold text-indigo-655 hover:text-indigo-700 hover:bg-indigo-50/50 px-2 py-0.5 rounded-md"
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
                                                            isSelected ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
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
                                                            isSelected ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
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
                )}
            </AnimatePresence>
        </div>
    );
}
