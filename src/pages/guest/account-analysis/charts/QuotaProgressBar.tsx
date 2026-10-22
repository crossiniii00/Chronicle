import React from 'react';
import { motion } from 'motion/react';

interface QuotaProgressBarProps {
    current: number;
    target: number;
}

export const QuotaProgressBar = React.memo(function QuotaProgressBar({ current, target }: QuotaProgressBarProps) {
    const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    return (
        <div className="w-full">
            <div className="flex items-center justify-between text-xs text-[#605e5c] dark:text-slate-400 mb-1 font-semibold">
                <span>Attainment: {current} / {target} hires</span>
                <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-2 bg-[#f3f2f1] border border-[#edebe9] dark:border-slate-800 rounded-sm overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-[#107c10]"
                />
            </div>
        </div>
    );
});
