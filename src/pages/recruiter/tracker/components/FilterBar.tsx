import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Search, Download, Edit2, CheckCircle2, RefreshCw, 
    Calendar, ChevronRight, X, Plus, ListFilter, 
    GraduationCap, Users, Briefcase, Activity, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MONTHS } from '../masterlist/constants';
import { cn } from '@/utils/formatters';

interface FilterBarProps {
    activeTab: string;
    showOnlyIncomplete: boolean;
    setShowOnlyIncomplete: (val: boolean) => void;
    handleExportExcel: () => void;
    handleImportCSV: (file: File) => void;
    
    // Filters
    selectedAccount: string | null;
    setSelectedAccount: (val: string | null) => void;
    accounts: string[];
    
    hasLocalChanges: boolean;
    isSaving: boolean;
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
                        className="absolute bottom-full left-0 mb-1.5 w-full bg-white dark:bg-slate-900 border border-neutral-200/80 shadow-2xl rounded-xl z-[1000] max-h-60 overflow-y-auto flex flex-col py-1"
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

export function FilterBar({
    activeTab,
    showOnlyIncomplete, setShowOnlyIncomplete,
    handleExportExcel,
    handleImportCSV,
    
    selectedAccount, setSelectedAccount, accounts,
    
    hasLocalChanges,
    isSaving,
    onAddData
}: FilterBarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
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
                target.closest('[data-ai-spotlight="interview-form-table"]') || 
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


    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImportCSV(file);
            e.target.value = '';
        }
    };

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (selectedAccount) n++;
        if (showOnlyIncomplete) n++;
        return n;
    }, [selectedAccount, showOnlyIncomplete]);

    const clearAllFilters = () => {
        setSelectedAccount(null);
        setShowOnlyIncomplete(false);
    };



    return (
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
                        className="absolute right-0 bottom-full mb-2 w-80 bg-white dark:bg-slate-900 border border-[#e1dfdd] shadow-[0_8px_16px_rgba(0,0,0,0.14)] rounded-[4px] p-4 text-[#323130] dark:text-slate-300 z-[999] flex flex-col gap-3 font-sans"
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
                        >
                            <motion.span 
                                variants={{
                                    hidden: { opacity: 0, y: 5 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 18 } }
                                }}
                                className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider mb-2 block"
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
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    className="flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none"
                                >
                                    <Download size={12} strokeWidth={2.5} /> Export
                                </button>

                                {/* Import */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={onFileChange}
                                    accept=".csv, .xlsx, .xls"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSaving}
                                    className="flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none disabled:opacity-50"
                                >
                                    {isSaving
                                        ? <RefreshCw size={12} strokeWidth={2.5} className="animate-spin" />
                                        : <Download size={12} strokeWidth={2.5} className="rotate-180" />
                                    }
                                    Import
                                </button>


                                {/* Incomplete Toggle (if applicable) */}
                                {activeTab === 'OfficeForms_Table' && (
                                    <button
                                        onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
                                        className={cn(
                                            "col-span-2 flex items-center justify-center gap-1.5 py-1.5 text-[11.5px] font-semibold transition-all rounded-[4px] border focus:outline-none",
                                            showOnlyIncomplete
                                                ? "bg-[#0078d4] text-white border-[#0078d4]"
                                                : "bg-white dark:bg-slate-900 border-surface-200 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300"
                                        )}
                                    >
                                        <ListFilter size={12} strokeWidth={2.5} /> {showOnlyIncomplete ? 'Incomplete only' : 'All rows'}
                                    </button>
                                )}

                                {/* Add Data */}
                                {(activeTab === 'Sheet' || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(activeTab.toUpperCase().trim()) || activeTab === 'BILINGUALS' || activeTab === 'TEAM_LEADER') && onAddData && (
                                    <button
                                        type="button"
                                        onClick={onAddData}
                                        className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none"
                                    >
                                        <Plus size={12} strokeWidth={2.5} /> Add Data
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
