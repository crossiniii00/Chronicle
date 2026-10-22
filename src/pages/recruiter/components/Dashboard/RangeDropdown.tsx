import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface RangeDropdownProps {
    startDate?: string;
    endDate?: string;
    onApply: (start: string, end: string) => void;
    onClose: () => void;
    onMouseEnter: () => void;
}

export const RangeDropdown: React.FC<RangeDropdownProps> = ({
    startDate = '',
    endDate = '',
    onApply,
    onClose,
    onMouseEnter
}) => {
    const [start, setStart] = useState(startDate);
    const [end, setEnd] = useState(endDate);

    useEffect(() => {
        setStart(startDate);
        setEnd(endDate);
    }, [startDate, endDate]);

    const handleApply = () => {
        if (start && end) {
            onApply(start, end);
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 600, damping: 16, mass: 0.6 }}
            onMouseEnter={onMouseEnter}
            className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-none shadow-2xl border border-surface-200 overflow-hidden z-50 origin-top-right"
        >
            <div className="px-3 py-2.5 bg-gradient-to-br from-surface-50 to-white border-b border-surface-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-surface-500" />
                    <span className="text-[10px] font-bold text-surface-700 uppercase tracking-widest">Select Date Range</span>
                </div>
            </div>

            <div className="p-4 space-y-3">
                <div>
                    <label className="block text-[10px] font-bold text-surface-700 uppercase tracking-widest mb-1.5">Start Date</label>
                    <input
                        type="date"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="w-full h-8 px-2 text-[12px] border border-surface-200 rounded-none bg-surface-50 dark:bg-slate-800 text-surface-900 dark:text-white outline-none focus:border-black transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-surface-700 uppercase tracking-widest mb-1.5">End Date</label>
                    <input
                        type="date"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="w-full h-8 px-2 text-[12px] border border-surface-200 rounded-none bg-surface-50 dark:bg-slate-800 text-surface-900 dark:text-white outline-none focus:border-black transition-colors"
                    />
                </div>
                <button
                    onClick={handleApply}
                    disabled={!start || !end}
                    className="w-full mt-2 h-8 flex items-center justify-center bg-black disabled:bg-surface-200 text-white disabled:text-surface-400 text-[11px] font-bold uppercase tracking-widest rounded-none transition-colors"
                >
                    Apply Range
                </button>
            </div>
        </motion.div>
    );
};
