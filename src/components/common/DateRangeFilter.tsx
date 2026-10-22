import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface DateRangeFilterProps {
    startDate: string | null;
    endDate: string | null;
    onChange: (start: string | null, end: string | null) => void;
    isActive: boolean;
}

export function DateRangeFilter({ startDate, endDate, onChange, isActive }: DateRangeFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    let displayLabel = 'All Time';
    if (startDate && endDate) {
        displayLabel = `${startDate} to ${endDate}`;
    } else if (startDate) {
        displayLabel = `From ${startDate}`;
    } else if (endDate) {
        displayLabel = `Until ${endDate}`;
    }

    return (
        <div className="relative w-full h-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-full pl-9 pr-8 py-1.5 text-[11px] font-medium outline-none cursor-pointer transition-all rounded-sm border border-surface-200 bg-surface-50/70 hover:bg-white dark:bg-slate-900 text-surface-900 text-left flex items-center justify-between focus:outline-none",
                    isActive && "bg-white dark:bg-slate-900 border-black/30 shadow-sm"
                )}
            >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-450 pointer-events-none">
                    <CalendarIcon size={14} />
                </div>
                <span className="truncate flex-1">{displayLabel}</span>
                <ChevronDown 
                    size={11} 
                    className={cn(
                        "text-neutral-450 transition-transform duration-200", 
                        isOpen ? "rotate-180 text-neutral-600" : ""
                    )} 
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: 10 }}
                        animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            y: 0,
                            transition: {
                                type: "spring",
                                stiffness: 420,
                                damping: 17
                            }
                        }}
                        exit={{ opacity: 0, scale: 0.93, y: 10, transition: { duration: 0.12 } }}
                        style={{ originX: 0.5, originY: 1 }}
                        className="absolute top-full left-0 mt-1.5 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-neutral-200/80 shadow-2xl rounded-xl z-[1000] p-3 flex flex-col gap-3"
                    >
                        <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-100">
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    const yyyy = today.getFullYear();
                                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                                    const dd = String(today.getDate()).padStart(2, '0');
                                    const todayStr = `${yyyy}-${mm}-${dd}`;
                                    onChange(todayStr, todayStr);
                                }}
                                className="flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 rounded-sm transition-colors"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    const day = today.getDay() || 7;
                                    const startOfWeek = new Date(today);
                                    startOfWeek.setDate(today.getDate() - day + 1);
                                    const endOfWeek = new Date(startOfWeek);
                                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                                    
                                    const sStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
                                    const eStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;
                                    onChange(sStr, eStr);
                                }}
                                className="flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 rounded-sm transition-colors"
                            >
                                Week
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                    
                                    const sStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
                                    const eStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
                                    onChange(sStr, eStr);
                                }}
                                className="flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 rounded-sm transition-colors"
                            >
                                Month
                            </button>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Start Date</label>
                            <input 
                                type="date"
                                value={startDate || ''}
                                onChange={(e) => onChange(e.target.value || null, endDate)}
                                className="w-full px-2 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-400"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">End Date</label>
                            <input 
                                type="date"
                                value={endDate || ''}
                                min={startDate || undefined}
                                onChange={(e) => onChange(startDate, e.target.value || null)}
                                className="w-full px-2 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-400"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                            <button
                                type="button"
                                onClick={() => onChange(null, null)}
                                className="flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-neutral-900 hover:bg-black rounded-md transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
