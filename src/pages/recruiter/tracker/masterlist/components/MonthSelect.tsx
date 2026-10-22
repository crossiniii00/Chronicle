import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface MonthSelectProps {
    value?: string;
    onChange: (val: string) => void;
    options: string[];
}

export function MonthSelect({ value, onChange, options }: MonthSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (!(event.target as Element).closest('.month-dropdown-container')) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isAll = !value || value === 'ALL';
    const displayLabel = isAll ? 'All Start Dates' : value;

    return (
        <div className="relative w-full h-full month-dropdown-container" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-full pl-9 pr-8 py-1.5 text-[11px] font-medium outline-none cursor-pointer transition-all rounded-sm border bg-surface-50/70 hover:bg-white dark:bg-slate-900 text-left flex items-center justify-between focus:outline-none",
                    isOpen ? "border-black/30 bg-white dark:bg-slate-900 shadow-sm" : "border-surface-200 text-surface-900"
                )}
            >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-450 pointer-events-none">
                    <Calendar size={12} strokeWidth={2.5} />
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
                        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 25, mass: 0.8 } }}
                        exit={{ opacity: 0, scale: 0.93, y: 10, transition: { duration: 0.12 } }}
                        style={{ originX: 0.5, originY: 0 }}
                        className="absolute top-full left-0 mt-1.5 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-neutral-200/80 shadow-2xl rounded-md z-[1000] overflow-hidden flex flex-col py-1"
                    >
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onChange('ALL');
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full px-4 py-2 text-[12px] font-medium text-left hover:bg-neutral-50 transition-colors flex items-center gap-2",
                                isAll ? "text-black bg-neutral-100/50 font-semibold" : "text-neutral-600"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                isAll ? "bg-neutral-800 border-neutral-800" : "border-neutral-300"
                            )}>
                                {isAll && <Check size={10} className="text-white" />}
                            </div>
                            <span>---</span>
                        </button>
                        
                        <div className="h-px w-full bg-neutral-100 my-1"></div>
                        
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {options.map(opt => {
                                const isSelected = !isAll && value === opt;
                                return (
                                    <button
                                        key={opt}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onChange(opt);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full px-4 py-2 text-[12px] font-medium text-left hover:bg-neutral-50 transition-colors flex items-center gap-2",
                                            isSelected ? "text-black bg-neutral-100/50 font-semibold" : "text-neutral-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                            isSelected ? "bg-neutral-800 border-neutral-800" : "border-neutral-300"
                                        )}>
                                            {isSelected && <Check size={10} className="text-white" />}
                                        </div>
                                        <span>{opt}</span>
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
