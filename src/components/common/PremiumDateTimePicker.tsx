import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X, Check } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumDateTimePickerProps {
    value: string; // ISO string or datetime-local string
    onChange: (value: string) => void;
    label: string;
    className?: string;
    disabled?: boolean;
    minDate?: string | Date;
}

export function PremiumDateTimePicker({ value, onChange, label, className, disabled, minDate }: PremiumDateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'date' | 'time'>('date');
    const containerRef = useRef<HTMLDivElement>(null);

    const initialDate = value ? new Date(value) : new Date();
    const [tempDate, setTempDate] = useState(isNaN(initialDate.getTime()) ? new Date() : initialDate);
    const [viewDate, setViewDate] = useState(new Date(tempDate.getFullYear(), tempDate.getMonth(), 1));
    const getMinimumDate = () => {
        if (minDate) {
            const parsed = new Date(minDate);
            return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    };
    const isBeforeMinimum = (date: Date) => date.getTime() < getMinimumDate().getTime();
    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isBeforeMinimumDay = (date: Date) => startOfDay(date).getTime() < startOfDay(getMinimumDate()).getTime();
    const getNextQuarterHour = (date: Date) => {
        const next = new Date(date);
        const remainder = next.getMinutes() % 15;
        if (remainder > 0) next.setMinutes(next.getMinutes() + (15 - remainder));
        next.setSeconds(0);
        next.setMilliseconds(0);
        return next;
    };
    const ensureAllowedDate = (date: Date) => {
        const minimum = getMinimumDate();
        return date.getTime() < minimum.getTime() ? getNextQuarterHour(minimum) : date;
    };

    // Update tempDate if external value changes
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setTempDate(d);
            }
        }
    }, [value]);

    useEffect(() => {
        if (isOpen && isBeforeMinimum(tempDate)) {
            const allowedDate = ensureAllowedDate(tempDate);
            setTempDate(allowedDate);
            setViewDate(new Date(allowedDate.getFullYear(), allowedDate.getMonth(), 1));
        }
    }, [isOpen, minDate]);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        const previousMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
        if (startOfDay(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)).getTime() < startOfDay(getMinimumDate()).getTime()) return;
        setViewDate(previousMonth);
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleSelectDay = (day: number) => {
        const newDate = new Date(tempDate);
        newDate.setFullYear(viewDate.getFullYear());
        newDate.setMonth(viewDate.getMonth());
        newDate.setDate(day);
        if (isBeforeMinimumDay(newDate)) return;
        setTempDate(ensureAllowedDate(newDate));
        setView('time');
    };

    const handleSelectTime = (hours: number, minutes: number) => {
        const newDate = new Date(tempDate);
        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);
        if (isBeforeMinimum(newDate)) return;
        setTempDate(newDate);
    };

    const handleConfirm = () => {
        if (isBeforeMinimum(tempDate)) return;
        // Format to local datetime string that browser inputs like
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formatted = `${tempDate.getFullYear()}-${pad(tempDate.getMonth() + 1)}-${pad(tempDate.getDate())}T${pad(tempDate.getHours())}:${pad(tempDate.getMinutes())}`;
        onChange(formatted);
        setIsOpen(false);
    };

    const renderDays = () => {
        const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
        const firstDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
        }

        const today = new Date();
        const isCurrentMonth = today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();

        for (let d = 1; d <= totalDays; d++) {
            const dayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
            const isSelected = tempDate.getDate() === d && tempDate.getMonth() === viewDate.getMonth() && tempDate.getFullYear() === viewDate.getFullYear();
            const isToday = isCurrentMonth && today.getDate() === d;
            const isPastDay = isBeforeMinimumDay(dayDate);

            days.push(
                <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDay(d)}
                    disabled={isPastDay}
                    className={cn(
                        "h-9 w-9 text-[11px] font-bold rounded-md transition-all flex items-center justify-center relative group",
                        isPastDay && "text-surface-200 cursor-not-allowed hover:bg-transparent",
                        !isPastDay && (
                        isSelected ? "bg-primary-600 text-white shadow-lg shadow-primary-200" :
                        isToday ? "text-primary-600 border border-primary-200 bg-primary-50/50" :
                        "text-surface-700 hover:bg-surface-100"
                        )
                    )}
                >
                    {d}
                    {isToday && !isSelected && !isPastDay && <div className="absolute bottom-1 w-1 h-1 bg-primary-600 rounded-full" />}
                </button>
            );
        }
        return days;
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 15, 30, 45];

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2 block">{label}</label>
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "w-full px-4 py-3 bg-white border flex items-center justify-between cursor-pointer transition-all rounded-lg group shadow-sm hover:shadow-md",
                    isOpen ? "border-primary-500 ring-2 ring-primary-500/10 shadow-md" : "border-surface-200 hover:border-primary-300",
                    disabled && "bg-surface-50 border-surface-100 text-surface-300 cursor-not-allowed opacity-60"
                )}
            >
                <div className="flex items-center gap-3">
                    <CalendarIcon size={16} className={cn("transition-colors", isOpen ? "text-primary-600" : "text-surface-400 group-hover:text-primary-500")} />
                    <span className={cn(
                        "text-[14px] font-semibold tracking-tight",
                        value ? "text-surface-900" : "text-surface-400"
                    )}>
                        {value ? new Date(value).toLocaleString('en-US', { 
                            month: 'short', day: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true 
                        }) : "Set Schedule..."}
                    </span>
                </div>
                <ChevronRight size={16} className={cn("text-surface-300 transition-transform", isOpen && "rotate-90 text-primary-500")} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[190]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute top-full left-0 mt-3 w-[320px] bg-white border border-surface-200 shadow-2xl rounded-xl z-[200] overflow-hidden"
                        >
                            {/* Header / Tabs */}
                            <div className="flex border-b border-surface-100">
                                <button 
                                    onClick={() => setView('date')}
                                    className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-all",
                                        view === 'date' ? "text-primary-600 bg-primary-50/30 border-b-2 border-primary-600" : "text-surface-400 hover:text-surface-600"
                                    )}
                                >
                                    Select Date
                                </button>
                                <button 
                                    onClick={() => setView('time')}
                                    className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-all",
                                        view === 'time' ? "text-primary-600 bg-primary-50/30 border-b-2 border-primary-600" : "text-surface-400 hover:text-surface-600"
                                    )}
                                >
                                    Select Time
                                </button>
                            </div>

                            <div className="p-4">
                                {view === 'date' ? (
                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="flex items-center justify-between mb-4 px-1">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-surface-900 leading-none">
                                                    {months[viewDate.getMonth()]}
                                                </span>
                                                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest mt-1">
                                                    {viewDate.getFullYear()}
                                                </span>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={handlePrevMonth}
                                                    disabled={startOfDay(new Date(viewDate.getFullYear(), viewDate.getMonth(), 0)).getTime() < startOfDay(getMinimumDate()).getTime()}
                                                    className="p-2 hover:bg-surface-100 rounded-md text-surface-500 transition-colors disabled:text-surface-200 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button onClick={handleNextMonth} className="p-2 hover:bg-surface-100 rounded-md text-surface-500 transition-colors">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-7 mb-2">
                                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                                                <div key={d} className="h-9 w-9 flex items-center justify-center text-[9px] font-black text-surface-300 uppercase">
                                                    {d}
                                                </div>
                                            ))}
                                            {renderDays()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className="flex items-center gap-2 mb-4 px-1">
                                            <Clock size={14} className="text-primary-600" />
                                            <span className="text-[13px] font-bold text-surface-900">Set Arrival Time</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-surface-300 uppercase tracking-widest pl-1">Hour</label>
                                                <div className="h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-surface-200">
                                                    {hours.map(h => {
                                                        const isSelected = tempDate.getHours() === h;
                                                        const candidate = new Date(tempDate);
                                                        candidate.setHours(h, tempDate.getMinutes(), 0, 0);
                                                        const isPastTime = isBeforeMinimum(candidate);
                                                        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                                        const ampm = h >= 12 ? 'PM' : 'AM';
                                                        return (
                                                            <button
                                                                key={h}
                                                                onClick={() => handleSelectTime(h, tempDate.getMinutes())}
                                                                disabled={isPastTime}
                                                                className={cn(
                                                                    "w-full py-2.5 px-3 text-[12px] font-bold text-left rounded-md mb-1 transition-all",
                                                                    isPastTime && "text-surface-200 cursor-not-allowed hover:bg-transparent",
                                                                    !isPastTime && (
                                                                    isSelected ? "bg-primary-600 text-white shadow-md" : "text-surface-600 hover:bg-surface-100"
                                                                    )
                                                                )}
                                                            >
                                                                {displayH}:00 {ampm}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-surface-300 uppercase tracking-widest pl-1">Minute</label>
                                                <div className="space-y-1">
                                                    {minutes.map(m => {
                                                        const isSelected = tempDate.getMinutes() === m;
                                                        const candidate = new Date(tempDate);
                                                        candidate.setMinutes(m, 0, 0);
                                                        const isPastTime = isBeforeMinimum(candidate);
                                                        return (
                                                            <button
                                                                key={m}
                                                                onClick={() => handleSelectTime(tempDate.getHours(), m)}
                                                                disabled={isPastTime}
                                                                className={cn(
                                                                    "w-full py-2.5 px-3 text-[12px] font-bold text-left rounded-md transition-all",
                                                                    isPastTime && "text-surface-200 cursor-not-allowed hover:bg-transparent",
                                                                    !isPastTime && (
                                                                    isSelected ? "bg-primary-600 text-white shadow-md" : "text-surface-600 hover:bg-surface-100"
                                                                    )
                                                                )}
                                                            >
                                                                :{m.toString().padStart(2, '0')}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 bg-surface-50 border-t border-surface-100 flex items-center justify-between gap-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider leading-none">Selected</span>
                                    <span className="text-[12px] font-bold text-surface-900 mt-1">
                                        {tempDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="p-2.5 text-surface-400 hover:text-surface-600 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button 
                                        onClick={handleConfirm}
                                        disabled={isBeforeMinimum(tempDate)}
                                        className="bg-primary-600 text-white px-5 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
                                    >
                                        <Check size={14} />
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
