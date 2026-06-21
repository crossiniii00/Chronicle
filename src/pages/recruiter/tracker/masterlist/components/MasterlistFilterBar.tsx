import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Search, Download, Edit2, CheckCircle2, RefreshCw, 
    Calendar, ChevronRight, X, Plus, 
    Layers, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface MasterlistFilterBarProps {
    search: string;
    setSearch: (val: string) => void;
    activeTab: string;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    isSelectMode: boolean;
    setIsSelectMode: (val: boolean) => void;
    isSyncing: boolean;
    handleSyncAll?: () => void;
    handleCancelEdit?: () => void;
    onImportCSV?: (file: File) => void;
    selectedStatus?: string;
    setSelectedStatus?: (status: string) => void;
    selectedWave?: string;
    setSelectedWave?: (wave: string) => void;
    waveOptions?: string[];
    selectedMonth?: string;
    setSelectedMonth?: (month: string) => void;
    selectedDay?: string;
    setSelectedDay?: (day: string) => void;
    selectedDateFilter?: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
    setSelectedDateFilter?: (filter: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => void;
    monthOptions?: string[];
    accountOptions?: string[];
    onExportExcel?: () => void;
    onAddData?: () => void;
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
                    "w-full pl-9 pr-8 py-2 text-[12px] font-medium outline-none cursor-pointer transition-all rounded-lg border border-neutral-250 bg-neutral-100/50 hover:bg-neutral-100 text-neutral-800 text-left flex items-center justify-between focus:outline-none",
                    isActive && "bg-neutral-200/50 border-neutral-300"
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
                        className="absolute bottom-full left-0 mb-1.5 w-full bg-white border border-neutral-200/80 shadow-2xl rounded-xl z-[1000] max-h-60 overflow-y-auto flex flex-col py-1"
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
                                    "w-full px-3.5 py-1.5 text-[12px] font-medium text-left hover:bg-neutral-50 transition-colors",
                                    value === opt.value ? "text-black bg-neutral-100/50 font-semibold" : "text-neutral-600"
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
    search, setSearch, activeTab, isEditing, setIsEditing, isSelectMode, setIsSelectMode, isSyncing,
    handleSyncAll, handleCancelEdit, onImportCSV,
    selectedStatus, setSelectedStatus, selectedWave, setSelectedWave, waveOptions = [],
    selectedMonth, setSelectedMonth, selectedDay, setSelectedDay,
    selectedDateFilter, setSelectedDateFilter,
    monthOptions = [], accountOptions = [],
    onExportExcel, onAddData
}: MasterlistFilterBarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const monthDropdownRef = useRef<HTMLDivElement>(null);

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

    const statusActive = !!selectedStatus && selectedStatus !== 'ALL';
    const accountActive = !!selectedMonth && selectedMonth !== 'ALL'; // Note: In hook, setSelectedAccount handles it
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
        setSelectedStatus?.('ALL');
        setSelectedWave?.('ALL');
        setSelectedMonth?.('ALL');
        setSelectedDay?.('ALL');
        setSelectedDateFilter?.('ALL');
    };

    const dateLabel = selectedMonth === 'ALL'
        ? 'All time'
        : `${selectedMonth}${selectedDay !== 'ALL' ? ` ${selectedDay}` : ''}`;

    return (
        <motion.div 
            className="relative" 
            ref={menuRef}
            drag
            dragMomentum={false}
            dragElastic={0.05}
            dragConstraints={{
                left: -window.innerWidth + 360,
                right: 0,
                top: -window.innerHeight + 550,
                bottom: 0
            }}
        >
            {/* Elegant Circular Apple-style Trigger Button */}
            <motion.button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 450, damping: 15 }}
                className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full transition-colors border shadow-lg relative focus:outline-none cursor-grab active:cursor-grabbing",
                    "bg-[#0b1329]/80 backdrop-blur-md border-white/10 text-white"
                )}
                title="Drag to reposition / Click to open"
            >
                {/* AssistiveTouch outer ring */}
                <div className="absolute inset-0 m-auto w-9 h-9 rounded-full bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-300 pointer-events-none">
                    {/* AssistiveTouch inner circle */}
                    <div className={cn(
                        "w-5 h-5 rounded-full bg-white/90 shadow-md transition-transform duration-300",
                        isMenuOpen ? "scale-90 bg-white" : ""
                    )} />
                </div>
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
                        className="absolute right-0 bottom-full mb-2 w-80 bg-white/95 backdrop-blur-md border border-neutral-200/60 shadow-2xl rounded-2xl p-4 text-neutral-800 z-[999] flex flex-col gap-3 font-sans"
                    >
                        
                        {/* Search Field */}
                        <motion.div 
                            variants={{
                                hidden: { opacity: 0, y: 10, scale: 0.95 },
                                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 18 } }
                            }}
                            className="relative"
                        >
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-450" />
                            <input
                                type="text"
                                placeholder="Search records…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-[12px] font-medium bg-neutral-100/60 border border-neutral-200/50 focus:border-neutral-300 focus:bg-white transition-all rounded-lg outline-none text-neutral-800 placeholder:text-neutral-400"
                            />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                                >
                                    <X size={12} strokeWidth={2.25} />
                                </button>
                            )}
                        </motion.div>

                        {/* Filters Section */}
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
                            className="space-y-2.5"
                        >
                            <motion.div 
                                variants={{
                                    hidden: { opacity: 0, y: 5 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 18 } }
                                }}
                                className="flex items-center justify-between"
                            >
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Filters</span>
                                {activeFilterCount > 0 && (
                                    <button 
                                        onClick={clearAllFilters}
                                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 focus:outline-none transition-colors"
                                    >
                                        Reset ({activeFilterCount})
                                    </button>
                                )}
                            </motion.div>

                            {/* Status */}
                            {setSelectedStatus && (
                                <motion.div 
                                    variants={{
                                        hidden: { opacity: 0, y: 8, scale: 0.96 },
                                        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 18 } }
                                    }}
                                >
                                    <FilterSelect
                                        icon={<Layers size={12} strokeWidth={2.25} />}
                                        value={selectedStatus || 'ALL'}
                                        onChange={setSelectedStatus}
                                        options={[
                                            { value: 'ALL', label: 'All statuses' },
                                            { value: 'APPLIED', label: 'Applied' },
                                            { value: 'ACCEPTED_OFFER', label: 'Accepted offer' },
                                            { value: 'SENT_JO_AND_BGC', label: 'Sent JO & BGC' },
                                            { value: 'FOR_JOB_OFFER', label: 'For job offer' },
                                            { value: 'FOR_PAN', label: 'For PAN' },
                                            { value: 'PASSED', label: 'Passed' },
                                            { value: 'HIRED', label: 'Hired' },
                                            { value: 'REJECTED', label: 'Failed' },
                                            { value: 'WITHDRAWN', label: 'Withdrawn' },
                                        ]}
                                        placeholder="Status"
                                        isActive={statusActive}
                                    />
                                </motion.div>
                            )}

                            {/* Wave */}
                            {setSelectedWave && (
                                <motion.div 
                                    variants={{
                                        hidden: { opacity: 0, y: 8, scale: 0.96 },
                                        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 18 } }
                                    }}
                                >
                                    <FilterSelect
                                        icon={<Trophy size={12} strokeWidth={2.25} />}
                                        value={selectedWave || 'ALL'}
                                        onChange={setSelectedWave}
                                        options={[
                                            { value: 'ALL', label: 'All waves' },
                                            ...(waveOptions.map(wave => ({ value: wave, label: wave }))),
                                        ]}
                                        placeholder="Wave"
                                        isActive={waveActive}
                                    />
                                </motion.div>
                            )}

                            {/* Date Filter Dropdown */}
                            {setSelectedMonth && setSelectedDay && (
                                <motion.div 
                                    variants={{
                                        hidden: { opacity: 0, y: 8, scale: 0.96 },
                                        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 18 } }
                                    }}
                                    className="relative w-full" 
                                    ref={monthDropdownRef}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setIsMonthOpen(!isMonthOpen)}
                                        className={cn(
                                            "w-full py-2 px-3 flex items-center gap-2 text-[12px] font-medium transition-all rounded-lg border border-neutral-250 bg-neutral-100/50 hover:bg-neutral-100 text-neutral-850 focus:outline-none",
                                            selectedMonth !== 'ALL' && "bg-neutral-200/50 border-neutral-300"
                                        )}
                                    >
                                        <Calendar size={12} strokeWidth={2} className="text-neutral-450" />
                                        <span className="flex-1 text-left truncate">{dateLabel}</span>
                                        <ChevronRight size={11} strokeWidth={2} className={cn("transition-transform duration-250 text-neutral-400", isMonthOpen && "rotate-90 text-neutral-600")} />
                                    </button>

                                    <AnimatePresence>
                                        {isMonthOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                                animate={{ 
                                                    opacity: 1, 
                                                    scale: 1, 
                                                    y: 0,
                                                    transition: {
                                                        type: "spring",
                                                        damping: 18,
                                                        stiffness: 260
                                                    }
                                                }}
                                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                                style={{ originX: 0.5, originY: 1 }}
                                                className="absolute bottom-full left-0 mb-1.5 z-[999] bg-white border border-neutral-200 shadow-2xl min-w-[190px] flex flex-col py-1 rounded-xl overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => {
                                                        setSelectedMonth('ALL');
                                                        setSelectedDay('ALL');
                                                        setIsMonthOpen(false);
                                                    }}
                                                    className={cn(
                                                        "px-3.5 py-1.5 text-[12px] font-medium text-left hover:bg-neutral-50 transition-colors",
                                                        selectedMonth === 'ALL' ? "text-black bg-neutral-100/50" : "text-neutral-600"
                                                    )}
                                                >
                                                    All time
                                                </button>
                                                <div className="h-px bg-neutral-100 mx-2 my-1" />
                                                {monthOptions.map(m => (
                                                    <div key={m} className="relative group/month">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedMonth(m);
                                                                setSelectedDay('ALL');
                                                                setIsMonthOpen(false);
                                                            }}
                                                            className={cn(
                                                                "w-full px-3.5 py-1.5 text-[12px] font-medium text-left hover:bg-neutral-50 transition-colors flex items-center justify-between",
                                                                selectedMonth === m ? "text-black bg-neutral-100/50 font-semibold" : "text-neutral-600"
                                                            )}
                                                        >
                                                            {m}
                                                            <ChevronRight size={11} strokeWidth={2} className="text-neutral-400" />
                                                        </button>

                                                        <div className="absolute left-full top-0 pl-1.5 hidden group-hover/month:block z-[999]">
                                                            <div className="bg-white border border-neutral-200 shadow-2xl p-3 min-w-[230px] rounded-xl">
                                                                <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-2 border-b border-neutral-100 pb-1.5">
                                                                    Day in {m}
                                                                </div>
                                                                <div className="grid grid-cols-7 gap-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedMonth(m);
                                                                            setSelectedDay('ALL');
                                                                            setIsMonthOpen(false);
                                                                        }}
                                                                        className={cn(
                                                                            "col-span-7 py-1 text-[11px] font-semibold hover:bg-neutral-50 transition-colors mb-1.5 rounded-lg border border-neutral-200/50",
                                                                            selectedDay === 'ALL' && selectedMonth === m
                                                                                ? "bg-black text-white border-black"
                                                                                : "text-neutral-700 bg-neutral-50"
                                                                        )}
                                                                    >
                                                                        Whole month
                                                                    </button>
                                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                                        <button
                                                                            key={day}
                                                                            onClick={() => {
                                                                                setSelectedMonth(m);
                                                                                setSelectedDay(day.toString());
                                                                                setIsMonthOpen(false);
                                                                            }}
                                                                            className={cn(
                                                                                "w-7 h-7 flex items-center justify-center text-[11px] font-semibold hover:bg-neutral-50 transition-all rounded-lg",
                                                                                selectedDay === day.toString() && selectedMonth === m
                                                                                    ? "bg-black text-white font-bold"
                                                                                    : "text-neutral-650"
                                                                            )}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {/* Date Quick Filters (All, Today, Week, Month) */}
                            {selectedDateFilter && setSelectedDateFilter && (
                                <motion.div 
                                    variants={{
                                        hidden: { opacity: 0, y: 8, scale: 0.96 },
                                        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 18 } }
                                    }}
                                    className="flex items-center gap-0.5 bg-neutral-100/60 border border-neutral-200/50 rounded-lg overflow-hidden p-0.5"
                                >
                                    {[
                                        { val: 'ALL', label: 'All' },
                                        { val: 'TODAY', label: 'Today' },
                                        { val: 'WEEK', label: 'Week' },
                                        { val: 'MONTH', label: 'Month' }
                                    ].map(({ val, label }) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setSelectedDateFilter(val as any)}
                                            className={cn(
                                                "flex-1 py-1 text-[11px] font-semibold transition-all rounded-md",
                                                selectedDateFilter === val
                                                    ? "bg-black text-white shadow-sm"
                                                    : "text-neutral-600 hover:text-black hover:bg-white/50"
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>

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
                            className="border-t border-neutral-150 pt-3"
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
                                        className="flex items-center justify-center gap-1.5 py-1.5 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-[11.5px] font-semibold transition-all rounded-lg focus:outline-none"
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
                                            className="flex items-center justify-center gap-1.5 py-1.5 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-[11.5px] font-semibold transition-all rounded-lg focus:outline-none disabled:opacity-50"
                                        >
                                            {isSyncing
                                                ? <RefreshCw size={12} strokeWidth={2.5} className="animate-spin" />
                                                : <Download size={12} strokeWidth={2.5} className="rotate-180" />
                                            }
                                            Import
                                        </button>
                                    </>
                                )}

                                {/* Select Mode */}
                                <button
                                    type="button"
                                    onClick={() => setIsSelectMode(!isSelectMode)}
                                    className={cn(
                                        "flex items-center justify-center gap-1.5 py-1.5 text-[11.5px] font-semibold transition-all rounded-lg border focus:outline-none",
                                        isSelectMode
                                            ? "bg-black text-white border-black"
                                            : "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border-transparent"
                                    )}
                                >
                                    <CheckCircle2 size={12} strokeWidth={2.5} /> {isSelectMode ? 'Unselect' : 'Select'}
                                </button>

                                {/* Edit / Save */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isEditing) handleSyncAll?.();
                                        else {
                                            setIsEditing(true);
                                            setIsSelectMode(false);
                                        }
                                    }}
                                    disabled={isSyncing}
                                    className="flex items-center justify-center gap-1.5 py-1.5 text-[11.5px] font-semibold transition-all rounded-lg bg-black text-white hover:bg-black/85 focus:outline-none disabled:opacity-50"
                                >
                                    {isSyncing
                                        ? <RefreshCw size={12} strokeWidth={2.5} className="animate-spin" />
                                        : isEditing
                                            ? <CheckCircle2 size={12} strokeWidth={2.5} />
                                            : <Edit2 size={12} strokeWidth={2.5} />
                                    }
                                    {isEditing ? 'Save' : 'Edit'}
                                </button>

                                {/* Add Data */}
                                {onAddData && (
                                    <button
                                        type="button"
                                        onClick={onAddData}
                                        className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 bg-black text-white text-[11.5px] font-semibold hover:bg-black/85 transition-all rounded-lg focus:outline-none"
                                    >
                                        <Plus size={12} strokeWidth={2.5} /> Add Data
                                    </button>
                                )}

                                {/* Cancel Edit (if active) */}
                                {isEditing && !isSyncing && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11.5px] font-semibold transition-all rounded-lg focus:outline-none"
                                    >
                                        <X size={12} strokeWidth={2.5} /> Cancel Edit
                                    </button>
                                )}
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
