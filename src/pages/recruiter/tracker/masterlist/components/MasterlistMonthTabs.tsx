import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CalendarDays, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { cn } from '@/utils/formatters';

interface MasterlistMonthTabsProps {
    activePassedMonth: string;
    setActivePassedMonth: (month: string) => void;
    availablePassedMonths: string[];
    selectedYear: string;
    setSelectedYear: (year: string) => void;
    availableYears: string[];
}

export function MasterlistMonthTabs({
    activePassedMonth,
    setActivePassedMonth,
    availablePassedMonths,
    selectedYear,
    setSelectedYear,
    availableYears
}: MasterlistMonthTabsProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [extraMonths, setExtraMonths] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newMonth, setNewMonth] = useState('');
    
    if (availablePassedMonths.length === 0 && extraMonths.length === 0) return null;

    const allTabs = Array.from(new Set([...availablePassedMonths, ...extraMonths]));

    const handleAddTab = () => {
        if (newMonth && newMonth.trim()) {
            setExtraMonths(prev => [...prev, newMonth.trim()]);
            setActivePassedMonth(newMonth.trim());
        }
        setShowModal(false);
        setNewMonth('');
    };

    const activeLabel = `${selectedYear === 'ALL' ? 'All Years' : selectedYear} • ${activePassedMonth === 'ALL' ? 'All Months' : activePassedMonth}`;

    return (
        <>
            {/* Floating Toolbar placed below the iphone toggle */}
            <div className="fixed bottom-6 right-[28px] z-[60] pointer-events-none flex justify-end items-center">
                <motion.div
                    layout
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-auto inline-flex items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(31,38,135,0.15)] rounded-full p-1.5 max-w-full overflow-hidden"
                >
                    {/* Toggle Button */}
                    <motion.button
                        type="button"
                        onClick={() => setIsCollapsed(prev => !prev)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                            "relative flex items-center justify-center w-10 h-10 rounded-full font-bold text-xs transition-all duration-300 cursor-pointer select-none shrink-0 overflow-hidden group",
                            isCollapsed 
                                ? "bg-gradient-to-tr from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20" 
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
                        )}
                        title={isCollapsed ? "Expand Filters" : "Minimize"}
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <motion.div
                            animate={{ rotate: isCollapsed ? 0 : 180 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                            className="shrink-0 flex items-center justify-center relative z-10"
                        >
                            <SlidersHorizontal size={16} strokeWidth={2.5} />
                        </motion.div>
                    </motion.button>

                    {/* Expanded Controls Panel */}
                    <AnimatePresence initial={false}>
                        {!isCollapsed && (
                            <motion.div
                                key="expanded-panel"
                                initial={{ opacity: 0, width: 0, filter: 'blur(4px)', scale: 0.95 }}
                                animate={{ opacity: 1, width: 'auto', filter: 'blur(0px)', scale: 1 }}
                                exit={{ opacity: 0, width: 0, filter: 'blur(4px)', scale: 0.95 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className="flex items-center gap-1 overflow-x-auto min-w-0 pl-2 pr-1 origin-left scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            >
                                {/* Year Dropdown */}
                                <div className="relative flex items-center shrink-0 group">
                                    <CalendarDays size={12} className="absolute left-2.5 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:text-slate-300 transition-colors pointer-events-none z-10" />
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => {
                                            setSelectedYear(e.target.value);
                                        }}
                                        className="appearance-none bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-[11px] font-bold pl-7 pr-6 py-1.5 rounded-sm border border-slate-200 dark:border-slate-800 cursor-pointer transition-all focus:outline-none focus:border-slate-400"
                                        style={{ minWidth: 85 }}
                                    >
                                        <option value="ALL">All Years</option>
                                        {availableYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <ChevronRight size={12} className="absolute right-2 text-slate-400 pointer-events-none rotate-90" />
                                </div>

                                {/* Divider */}
                                <div className="w-px h-4 bg-slate-300 mx-1 shrink-0" />

                                <button
                                    onClick={() => {
                                        setActivePassedMonth('ALL');
                                    }}
                                    className={`relative px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all shrink-0 uppercase tracking-wider ${
                                        activePassedMonth === 'ALL'
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-900 dark:text-white border border-transparent hover:border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    All Months
                                </button>

                                {allTabs.map((month) => (
                                    <button
                                        key={month}
                                        onClick={() => {
                                            setActivePassedMonth(month);
                                        }}
                                        className={`relative px-3 py-1.5 text-[11px] font-bold rounded-sm transition-all shrink-0 uppercase tracking-wider ${
                                            activePassedMonth === month
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-900 dark:text-white border border-transparent hover:border-slate-200 dark:border-slate-800'
                                        }`}
                                    >
                                        {month}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setShowModal(true)}
                                    className="relative flex items-center justify-center w-7 h-7 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-sm transition-colors cursor-pointer shrink-0 ml-1"
                                    title="Add Month Tab"
                                >
                                    <Plus size={15} strokeWidth={2.5} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Month Tab" size="sm">
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-surface-700">Enter new month tab name</label>
                        <input
                            type="text"
                            placeholder="e.g. September"
                            value={newMonth}
                            onChange={(e) => setNewMonth(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTab();
                            }}
                            className="w-full rounded-md border-[#D6DCE5] bg-surface-50 text-sm focus:ring-[#0078D4] focus:border-[#0078D4] p-2 border"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddTab}
                            disabled={!newMonth.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            Add Tab
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
