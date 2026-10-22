import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Search, Plus, ChevronRight, X, CheckCircle2, RefreshCw, Download, EyeOff, Layers, Trophy, Calendar, Edit2, Eye, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, STATUS_CSS } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';

interface MasterlistFilterBarProps {
    search: string;
    setSearch: (val: string) => void;
    activeTab: string;
    isOfficialEndorsement?: boolean;
    setIsOfficialEndorsement?: (val: boolean) => void;
    officialEndorsementCount?: number;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    isSelectMode: boolean;
    setIsSelectMode: (val: boolean) => void;
    hasLocalChanges?: boolean;
    isSyncing: boolean;
    handleSyncAll?: () => void;
    handleCancelEdit?: () => void;
    onImportCSV?: (file: File) => void;
    selectedStatus?: string[];
    setSelectedStatus?: (status: string[]) => void;
    selectedWave?: string;
    setSelectedWave?: (wave: string) => void;
    waveOptions?: string[];
    selectedMonth?: string;
    setSelectedMonth?: (month: string) => void;
    selectedDay?: string;
    setSelectedDay?: (day: string) => void;
    selectedDateFilter?: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
    setSelectedDateFilter?: (filter: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => void;
    selectedHireType?: string;
    setSelectedHireType?: (type: string) => void;
    monthOptions?: string[];
    accountOptions?: string[];
    onExportExcel?: () => void;
    onAddData?: () => void;
    isExclusiveMode?: boolean;
    setIsExclusiveMode?: (val: boolean) => void;
}

interface FilterSelectProps {
    icon: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    isActive: boolean;
}

function FilterSelect({ icon, value, onChange, options, placeholder, isActive }: FilterSelectProps) {
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

    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full pl-9 pr-8 py-1.5 text-[12px] font-medium outline-none cursor-pointer transition-all rounded-[4px] border border-[#edebe9] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 text-left flex items-center justify-between focus:outline-none focus:border-[#0078d4]",
                    isActive && "bg-[#f3f2f1] border-[#c8c6c4] dark:border-slate-700"
                )}
            >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-450 pointer-events-none">
                    {icon}
                </div>
                <span className="truncate flex-1">{displayLabel}</span>
                <ChevronRight
                    size={11}
                    className={cn(
                        "text-neutral-450 transition-transform duration-200",
                        isOpen ? "-rotate-90 text-neutral-600" : "rotate-90"
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
                        className="absolute bottom-full left-0 mb-1.5 w-full bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 shadow-[0_4px_8px_rgba(0,0,0,0.1)] rounded-[4px] z-[1000] max-h-60 overflow-y-auto flex flex-col py-1"
                    >
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full px-3 py-1.5 text-[12px] text-left transition-all",
                                    value === opt.value ? "font-bold shadow-inner ring-1 ring-inset ring-black/10" : "hover:opacity-90",
                                    (STATUS_CSS as any)[opt.value] || "text-[#323130] dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-[#f3f2f1]"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function MasterlistFilterBar({
    search, setSearch, activeTab, isOfficialEndorsement, setIsOfficialEndorsement, officialEndorsementCount, isEditing, setIsEditing, isSelectMode, setIsSelectMode, isSyncing,
    handleSyncAll, handleCancelEdit, onImportCSV, hasLocalChanges,
    selectedStatus, setSelectedStatus, selectedWave, setSelectedWave, waveOptions = [],
    selectedMonth, setSelectedMonth, selectedDay, setSelectedDay,
    selectedDateFilter, setSelectedDateFilter, selectedHireType, setSelectedHireType,
    monthOptions = [], accountOptions = [],
    onExportExcel, onAddData, isExclusiveMode, setIsExclusiveMode
}: MasterlistFilterBarProps) {
    const { user } = useAuthStore();
    const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin' || user?.role === 'ops_val_admin';

    const [localExclusiveMode, setLocalExclusiveMode] = React.useState(!!isExclusiveMode);

    React.useEffect(() => {
        setLocalExclusiveMode(!!isExclusiveMode);
    }, [isExclusiveMode]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMonthOpen, setIsMonthOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const monthDropdownRef = useRef<HTMLDivElement>(null);

    const [hiddenCount, setHiddenCount] = React.useState(0);

    React.useEffect(() => {
        const handler = (e: Event) => {
            if (e instanceof CustomEvent) {
                setHiddenCount(e.detail);
            }
        };
        window.addEventListener('hidden-columns-change', handler);
        return () => window.removeEventListener('hidden-columns-change', handler);
    }, []);

    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (menuRef.current && menuRef.current.contains(target)) {
                return;
            }
            // Do not close when clicking on table cells, registry grid, modals, or dialogs
            if (
                target.closest('td') ||
                target.closest('[data-ai-spotlight="masterlist-table"]') ||
                target.closest('.ConfirmDialog') ||
                target.closest('.Modal') ||
                target.closest('[role="dialog"]')
            ) {
                return;
            }
            setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutsideMonth = (event: MouseEvent) => {
            if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
                setIsMonthOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideMonth);
        return () => document.removeEventListener('mousedown', handleClickOutsideMonth);
    }, []);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportCSV?.(file);
            e.target.value = '';
        }
    };

    const statusActive = !!selectedStatus && selectedStatus.length > 0 && selectedStatus[0] !== 'ALL';
    const waveActive = !!selectedWave && selectedWave !== 'ALL';
    const dateActive = !!selectedMonth && selectedMonth !== 'ALL';

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (search) n++;
        if (statusActive) n++;
        if (waveActive) n++;
        if (dateActive) n++;
        if (selectedDateFilter && selectedDateFilter !== 'ALL') n++;
        return n;
    }, [search, statusActive, waveActive, dateActive, selectedDateFilter]);

    const clearAllFilters = () => {
        setSearch('');
        setSelectedStatus?.(['ALL']);
        setSelectedWave?.('ALL');
        setSelectedMonth?.('ALL');
        setSelectedDay?.('ALL');
        setSelectedDateFilter?.('ALL');
    };

    const dateLabel = selectedMonth === 'ALL'
        ? 'All time'
        : `${selectedMonth}${selectedDay !== 'ALL' ? ` ${selectedDay}` : ''}`;

    return (
        <div className="flex items-center gap-3">
            <motion.div
                className="relative"
                ref={menuRef}
            >
            {/* Premium Glowing Glassmorphism Trigger Button */}
            <motion.button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 border shadow-[0_8px_32px_rgba(31,38,135,0.25)] relative focus:outline-none cursor-pointer overflow-hidden group",
                    isMenuOpen 
                        ? "bg-slate-900 border-slate-700 text-white" 
                        : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/50 dark:border-white/10 text-slate-800 dark:text-white"
                )}
                title="Click to open filters"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <motion.div
                    animate={{ rotate: isMenuOpen ? 90 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="relative z-10"
                >
                    {isMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Filter size={20} strokeWidth={2.5} className="text-[#0078D4] dark:text-blue-400 group-hover:text-purple-600 transition-colors" />}
                </motion.div>
                {activeFilterCount > 0 && !isMenuOpen && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0b1329]">
                        {activeFilterCount}
                    </span>
                )}
            </motion.button>

            {/* Apple-style Dropup Container */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, scale: 0.6, y: 35 },
                            visible: {
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                transition: {
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 18,
                                    mass: 0.7,
                                    staggerChildren: 0.03,
                                    delayChildren: 0.05
                                }
                            },
                            exit: {
                                opacity: 0,
                                scale: 0.7,
                                y: 25,
                                transition: { duration: 0.15 }
                            }
                        }}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{ originX: 1, originY: 1 }}
                        className="absolute right-0 bottom-full mb-2 w-80 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 shadow-[0_8px_16px_rgba(0,0,0,0.14)] rounded-md p-4 text-[#323130] dark:text-slate-300 z-[999] flex flex-col gap-3 font-sans"
                    >

                        {/* Actions / Operations Section */}
                        <motion.div
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.03
                                    }
                                }
                            }}
                            className="pt-1"
                        >
                            <motion.span
                                variants={{
                                    hidden: { opacity: 0, y: 5 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 18 } }
                                }}
                                className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 block"
                            >
                                Actions
                            </motion.span>

                            <motion.div
                                variants={{
                                    hidden: { opacity: 0, y: 8, scale: 0.96 },
                                    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 18 } }
                                }}
                                className="grid grid-cols-2 gap-2"
                            >
                                {/* Export */}
                                {onExportExcel && (
                                    <button
                                        type="button"
                                        onClick={onExportExcel}
                                        className="flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none"
                                    >
                                        <Download size={12} strokeWidth={2.5} /> Export
                                    </button>
                                )}

                                {/* Import */}
                                {onImportCSV && (
                                    <>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={onFileChange}
                                            accept=".csv, .ods, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isSyncing}
                                            className="flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none relative overflow-hidden"
                                        >
                                            {isSyncing
                                                ? <RefreshCw size={12} strokeWidth={2.5} className="animate-spin" />
                                                : <Download size={12} strokeWidth={2.5} className="rotate-180" />
                                            }
                                            Import
                                        </button>
                                    </>
                                )}


                                {/* View Actions */}
                                <button
                                    type="button"
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-hidden-cols-modal'))}
                                    className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none"
                                >
                                    <EyeOff size={12} strokeWidth={2.5} /> View Hidden ({hiddenCount})
                                </button>

                                {/* Add Data / Add Candidate */}
                                {onAddData && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onAddData();
                                            setIsMenuOpen(false);
                                        }}
                                        className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#ef3e36] border border-[#ef3e36] hover:bg-[#d32f2f] text-white text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none mt-1 shadow-sm"
                                    >
                                        <Plus size={12} strokeWidth={2.5} /> Add Candidate
                                    </button>
                                )}


                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
        </div>
    );
}
