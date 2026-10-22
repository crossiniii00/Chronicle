import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Building, Building2, User, UserCheck, Users, Activity, Layers, Tag, Sparkles, Briefcase, ChevronDown, ChevronRight, Check, X, Filter, ListFilter, Calendar, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';
import { AdvancedDateFilter, type DateFilterState } from '@/components/common/AdvancedDateFilter';

type FilterTheme = 'blue' | 'cyan' | 'emerald' | 'purple' | 'orange' | 'rose' | 'indigo' | 'amber';

const getThemeClasses = (theme?: FilterTheme, isActive?: boolean, highlightGlow?: boolean) => {
    if (highlightGlow) {
        return "border-[#0078D4] bg-[#0078D4] text-white font-semibold shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10";
    }
    if (isActive) {
        return "bg-[#0078D4] border-[#0078D4] text-white font-semibold shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10";
    } else {
        switch (theme) {
            case 'purple': return "bg-purple-50/40 border-[#D1D5DB] hover:border-purple-400 hover:bg-purple-50 text-purple-900";
            case 'emerald': return "bg-emerald-50/40 border-[#D1D5DB] hover:border-emerald-400 hover:bg-emerald-50 text-emerald-900";
            case 'orange': return "bg-orange-50/40 border-[#D1D5DB] hover:border-orange-400 hover:bg-orange-50 text-orange-900";
            case 'indigo': return "bg-indigo-50/40 border-[#D1D5DB] hover:border-indigo-400 hover:bg-indigo-50 text-indigo-900";
            case 'rose': return "bg-rose-50/40 border-[#D1D5DB] hover:border-rose-400 hover:bg-rose-50 text-rose-900";
            case 'amber': return "bg-amber-50/40 border-[#D1D5DB] hover:border-amber-400 hover:bg-amber-50 text-amber-900";
            case 'cyan': return "bg-cyan-50/40 border-[#D1D5DB] hover:border-cyan-400 hover:bg-cyan-50 text-cyan-900";
            case 'blue': return "bg-blue-50/40 border-[#D1D5DB] hover:border-blue-400 hover:bg-blue-50 text-blue-900";
            default: return "bg-white dark:bg-slate-900 border-[#D1D5DB] hover:border-[#A19F9D] hover:bg-[#F3F2F1] text-[#242424]";
        }
    }
}

interface ManagementFilterBarProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    accountFilter: string[];
    setAccountFilter: (val: string[]) => void;
    lobFilter: string[];
    setLobFilter: (val: string[]) => void;
    accountToLobsMap: Record<string, string[]>;
    hireTypeFilter?: string[];
    setHireTypeFilter?: (val: string[]) => void;
    statusFilter: string[];
    setStatusFilter: (val: string[]) => void;
    stepFilter?: string[];
    setStepFilter?: (val: string[]) => void;
    specialStatusFilter?: string[];
    taggingFilter?: string[];
    setTaggingFilter?: (val: string[]) => void;
    setSpecialStatusFilter?: (val: string[]) => void;
    appliedDateFilter?: DateFilterState;
    setAppliedDateFilter?: (val: DateFilterState) => void;
    interviewDateFilter?: DateFilterState;
    setInterviewDateFilter?: (val: DateFilterState) => void;
    trainingDateFilter?: DateFilterState;
    setTrainingDateFilter?: (val: DateFilterState) => void;
    dateFilter?: DateFilterState;
    setDateFilter?: (val: DateFilterState) => void;
    dateTargetFilter?: 'APPLIED' | 'INITIAL_INTERVIEW' | 'TRAINING_START_DATE' | 'OPS_VAL_INTERVIEW';
    setDateTargetFilter?: (val: 'APPLIED' | 'INITIAL_INTERVIEW' | 'TRAINING_START_DATE' | 'OPS_VAL_INTERVIEW') => void;
    recruiterFilter: string[];
    setRecruiterFilter: (val: string[]) => void;
    recruiters: string[];
    departments: string[];
    onRefresh?: () => void;
    activeTab?: string;
    deptRecords?: any[];
    allStaff?: any[];
    isSelectMode?: boolean;
    setIsSelectMode?: (val: boolean) => void;
    apps?: any[];
    evaluateStatusFilter?: (a: any, tab: string, filters: string[]) => boolean;
}

interface CustomSelectProps {
    icon: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    isActive: boolean;
    theme?: FilterTheme;
}

function CustomSelect({ icon, value, onChange, options, placeholder, isActive, theme }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (!(event.target as Element).closest('.filter-dropdown-container')) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className="relative w-full filter-dropdown-container" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-8 pl-2.5 pr-2.5 text-[12px] outline-none cursor-pointer transition-all rounded-none border text-left flex items-center justify-between duration-150 select-none",
                    getThemeClasses(theme, isActive)
                )}
            >
                <div className="flex items-center min-w-0 flex-1 overflow-hidden gap-1.5">
                    {icon && <span className="shrink-0 opacity-80">{icon}</span>}
                    <span className="truncate">{displayLabel}</span>
                </div>
                <ChevronDown
                    size={13}
                    className={cn(
                        "transition-transform duration-200 shrink-0 ml-1.5 text-[#605E5C]",
                        isOpen && "rotate-180 text-[#0078D4]",
                        isActive && "text-[#0078D4]"
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.12 } }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
                        className="absolute top-full left-0 mt-0.5 w-full bg-white dark:bg-slate-900 border border-[#D1D5DB] shadow-lg rounded-none z-[1000] max-h-60 overflow-y-auto flex flex-col p-1 gap-0.5"
                    >
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full px-2.5 py-1.5 text-[12px] text-left hover:bg-[#F3F2F1] transition-colors flex items-center gap-2 rounded-none select-none",
                                    value === opt.value ? "text-[#0078D4] bg-[#EFF6FF] font-medium" : "text-[#242424]"
                                )}
                            >
                                <div className={cn(
                                    "w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors",
                                    value === opt.value ? "bg-[#0078D4] border-[#0078D4]" : "border-[#8A8886] bg-white dark:bg-slate-900"
                                )}>
                                    {value === opt.value && <Check size={9} className="text-white stroke-[2.5]" />}
                                </div>
                                <span className="truncate flex-1">{opt.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


interface CustomMultiSelectProps {
    icon: React.ReactNode;
    value: string[];
    onChange: (val: string[]) => void;
    options: { value: string; label: string; image?: string; color?: string; group?: string; count?: number; textColor?: string }[];
    placeholder: string;
    highlightGlow?: boolean;
    twoStepGroups?: boolean | string[];
    theme?: FilterTheme;
    showFunnelToggle?: boolean;
    isFunnelActive?: boolean;
    onFunnelToggle?: () => void;
}

function CustomMultiSelect({ icon, value, onChange, options, placeholder, highlightGlow, twoStepGroups, theme, showFunnelToggle, isFunnelActive, onFunnelToggle }: CustomMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (!(event.target as Element).closest('.filter-dropdown-container')) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            const t = setTimeout(() => setActiveGroup(null), 150);
            return () => clearTimeout(t);
        } else {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const displayLabel = value.length === 0 ? placeholder : (value.length === 1 ? options.find(o => o.value === value[0])?.label || placeholder : `${value.length} selected`);
    const isActive = value.length > 0;

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase().trim();
        return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
    }, [options, searchQuery]);

    const defaultLogo = '/contactpoint-logo.png?v=2';

    return (
        <div className="relative w-full filter-dropdown-container" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-8 pl-2.5 pr-2.5 text-[12px] outline-none cursor-pointer transition-all rounded-none border text-left flex items-center justify-between duration-150 select-none",
                    getThemeClasses(theme, isActive, highlightGlow)
                )}
            >
                <div className="flex items-center min-w-0 flex-1 overflow-hidden gap-1.5">
                    {icon && <span className="shrink-0 opacity-80">{icon}</span>}
                    <span className="truncate">{displayLabel}</span>
                </div>
                {value.length > 1 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#0078D4] text-white shrink-0">
                        {value.length}
                    </span>
                )}
                <ChevronDown
                    size={13}
                    className={cn(
                        "transition-transform duration-200 shrink-0 ml-1",
                        isOpen && "rotate-180",
                        isActive || theme ? "text-current opacity-70" : "text-[#605E5C]"
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.12 } }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
                        className="absolute top-full left-0 mt-0.5 min-w-[250px] w-full bg-white dark:bg-slate-900 border border-[#D1D5DB] shadow-lg rounded-none z-[1000] max-h-[380px] flex flex-col overflow-hidden"
                    >
                        {/* Search Bar */}
                        <div className="p-1.5 border-b border-[#E1DFDD] sticky top-0 bg-[#FAFAFA] z-30 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <div className="relative flex items-center flex-1">
                                    <Search size={13} className="absolute left-2 text-[#605E5C] pointer-events-none" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full pl-7 pr-7 py-1 text-[12px] font-normal bg-white dark:bg-slate-900 border border-[#D1D5DB] rounded-none focus:outline-none focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] placeholder:text-[#707070] text-[#242424] transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSearchQuery('');
                                                searchInputRef.current?.focus();
                                            }}
                                            className="absolute right-1.5 text-[#605E5C] hover:text-[#242424] p-0.5 rounded hover:bg-[#E1DFDD] transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                {showFunnelToggle && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onFunnelToggle?.();
                                        }}
                                        className={cn(
                                            "w-[26px] h-[26px] flex items-center justify-center rounded transition-all duration-300 shrink-0",
                                            isFunnelActive
                                                ? "bg-[#0078D4] border-transparent text-white shadow-[0_0_10px_rgba(0,120,212,0.6)] ring-1 ring-[#0078D4]/50"
                                                : "bg-white dark:bg-slate-900 border border-[#D1D5DB] text-[#605E5C] hover:bg-neutral-50 hover:border-[#0078D4]/50 hover:text-[#0078D4]"
                                        )}
                                        title="Toggle Funnel Filter"
                                    >
                                        <ListFilter size={13} className={cn(isFunnelActive && "drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]")} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="overflow-y-auto flex-1 custom-scrollbar p-1">
                            {(() => {
                                const renderOption = (opt: any) => {
                                    const isSelected = value.includes(opt.value);
                                    const isRecruiterOption = placeholder.toLowerCase().includes('recruiter');
                                    const isDepartmentOption = placeholder.toLowerCase().includes('department');
                                    const hasImageOrIsDept = (opt.image || isDepartmentOption || isRecruiterOption) && opt.value !== 'ALL';
                                    const logoSrc = (opt.image && opt.image !== 'null' && opt.image !== 'undefined') ? opt.image : defaultLogo;

                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (opt.value === 'ALL') {
                                                    onChange([]);
                                                    setIsOpen(false);
                                                } else {
                                                    if (isSelected) {
                                                        onChange(value.filter(v => v !== opt.value));
                                                    } else {
                                                        onChange([...value, opt.value]);
                                                    }
                                                }
                                            }}
                                            className={cn(
                                                "w-full px-2 py-1.5 text-[12px] text-left hover:bg-[#F3F2F1] transition-colors flex items-center gap-2 rounded-none my-0.5 select-none",
                                                isSelected ? "text-[#0078D4] bg-[#EFF6FF] font-medium" : "text-[#242424]"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors",
                                                isSelected ? "bg-[#0078D4] border-[#0078D4]" : "border-[#8A8886] bg-white dark:bg-slate-900"
                                            )}>
                                                {isSelected && <Check size={9} className="text-white stroke-[2.5]" />}
                                            </div>
                                            {hasImageOrIsDept ? (
                                                <img
                                                    src={logoSrc}
                                                    alt=""
                                                    className="w-4 h-4 rounded-full object-cover shrink-0 bg-white dark:bg-slate-900 border border-[#D1D5DB]"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.onerror = null;
                                                        target.src = defaultLogo;
                                                    }}
                                                />
                                            ) : opt.color ? (
                                                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", opt.color)} />
                                            ) : null}
                                            <span className={cn("truncate flex-1", opt.textColor)}>{opt.label}</span>
                                            {opt.count !== undefined && (
                                                <span className={cn("text-[10px] font-medium ml-2 shrink-0", isSelected ? "text-[#0078D4]" : "text-[#8A8886]")}>
                                                    {opt.count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                };

                                if (filteredOptions.length === 0) {
                                    return (
                                        <div className="px-3 py-4 text-center text-[#707070] text-[11px] font-normal">
                                            No matching results for "{searchQuery}"
                                        </div>
                                    );
                                }

                                if (searchQuery.trim()) {
                                    return filteredOptions.map(opt => renderOption(opt));
                                }

                                const hasGroups = filteredOptions.some(o => o.group);
                                if (!hasGroups) {
                                    return filteredOptions.map(opt => renderOption(opt));
                                }

                                const noGroupOptions = filteredOptions.filter(o => !o.group);
                                const groupedOptions = filteredOptions.filter(o => o.group).reduce((acc, opt) => {
                                    const g = opt.group!;
                                    if (!acc[g]) acc[g] = [];
                                    acc[g].push(opt);
                                    return acc;
                                }, {} as Record<string, typeof filteredOptions>);

                                if (twoStepGroups) {
                                    if (activeGroup === null) {
                                        return (
                                            <>
                                                {noGroupOptions.map(opt => renderOption(opt))}
                                                {(Array.isArray(twoStepGroups) ? twoStepGroups : Object.keys(groupedOptions)).map(groupName => (
                                                    <button
                                                        key={groupName}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setActiveGroup(groupName);
                                                        }}
                                                        className="w-full px-2.5 py-2 text-[12px] font-semibold text-left text-[#242424] hover:bg-[#F3F2F1] transition-colors flex items-center justify-between border-b border-[#E1DFDD] last:border-0 rounded-none select-none"
                                                    >
                                                        <span>{groupName}</span>
                                                        <ChevronRight size={13} className="text-[#605E5C]" />
                                                    </button>
                                                ))}
                                            </>
                                        );
                                    } else {
                                        const currentGroupOptions = groupedOptions[activeGroup] || [];
                                        return (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setActiveGroup(null);
                                                    }}
                                                    className="w-full px-2 py-1.5 text-[10px] font-bold text-left text-[#0078D4] uppercase tracking-wider hover:bg-[#F3F2F1] transition-colors flex items-center gap-1 border-b border-[#D1D5DB] sticky top-0 bg-[#FAFAFA] z-10 rounded-none"
                                                >
                                                    <ChevronRight size={13} className="rotate-180" />
                                                    Back to Categories
                                                </button>
                                                <div className="py-1">
                                                    {currentGroupOptions.map(opt => renderOption(opt))}
                                                </div>
                                            </>
                                        );
                                    }
                                }

                                return (
                                    <>
                                        {noGroupOptions.map(opt => renderOption(opt))}
                                        {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                                            <div key={groupName} className="mt-1 first:mt-0">
                                                <div className="px-2.5 py-1 text-[10px] font-bold text-[#605E5C] uppercase tracking-wider bg-[#FAFAFA] sticky top-0 z-10 border-y border-[#E1DFDD]">
                                                    {groupName}
                                                </div>
                                                {groupOptions.map(opt => renderOption(opt))}
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface SingleDateFilterPopoverProps {
    labelPrefix: string;
    value: DateFilterState;
    onChange: (val: DateFilterState) => void;
    width?: string;
    theme?: FilterTheme;
    icon?: React.ReactNode;
}

function SingleDateFilterPopover({ labelPrefix, value, onChange, width = "w-[155px]", theme, icon }: SingleDateFilterPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (dropdownRef.current && !dropdownRef.current.contains(target as Node)) {
                if (target.closest && target.closest('.filter-dropdown-container')) {
                    return;
                }
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getLabel = () => {
        let dateStr = 'All Time';
        switch (value.type) {
            case 'TODAY': dateStr = 'Today'; break;
            case 'WEEK': dateStr = 'This Week'; break;
            case 'MONTH': dateStr = 'This Month'; break;
            case 'CUSTOM': {
                if (value.start && value.end && value.start === value.end) {
                    dateStr = value.start;
                } else if (value.start && value.end) {
                    dateStr = `${value.start} to ...`;
                } else {
                    dateStr = 'Custom';
                }
                break;
            }
            case 'ALL': dateStr = 'All Time'; break;
            default: dateStr = 'All Time'; break;
        }
        return `${labelPrefix}: ${dateStr}`;
    };

    const isActive = value.type !== 'ALL';

    return (
        <div className={cn("relative filter-dropdown-container", width)} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-8 pl-2.5 pr-2 text-[11.5px] outline-none cursor-pointer transition-all rounded-none border text-left flex items-center justify-between duration-150 select-none",
                    getThemeClasses(theme, isActive)
                )}
            >
                <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                    {icon}
                    <span className="truncate">{getLabel()}</span>
                </div>
                <ChevronDown
                    size={13}
                    className={cn(
                        "transition-transform duration-200 shrink-0 ml-1",
                        isOpen && "rotate-180",
                        isActive || theme ? "text-current opacity-70" : "text-[#605E5C]"
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.12 } }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
                        className="absolute top-full left-0 mt-0.5 bg-white dark:bg-slate-900 border border-[#D1D5DB] shadow-lg rounded-none z-[1000] p-1 w-max min-w-[160px] overflow-visible"
                    >
                        <AdvancedDateFilter
                            value={value}
                            onChange={onChange}
                            hideTrigger={true}
                            onSelectComplete={() => setIsOpen(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DateFilterPopover({ dateFilter, setDateFilter, dateTargetFilter, setDateTargetFilter, activeTab }: any) {
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

    const getLabel = () => {
        switch (dateFilter.type) {
            case 'TODAY': return 'Today';
            case 'WEEK': return 'This Week';
            case 'MONTH': return 'This Month';
            case 'CUSTOM': {
                if (dateFilter.start && dateFilter.end && dateFilter.start === dateFilter.end) {
                    return dateFilter.start;
                }
                if (dateFilter.start && dateFilter.end) {
                    return `${dateFilter.start} to ${dateFilter.end}`;
                }
                return 'Custom Range';
            }
            case 'ALL': return 'All Time';
            default: return 'Filter Date';
        }
    };

    const isActive = dateFilter.type !== 'ALL';

    return (
        <div className="relative w-[140px]" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-8 pl-2.5 pr-2.5 text-[12px] font-medium outline-none cursor-pointer transition-all rounded-none border text-left flex items-center justify-between duration-150 select-none",
                    isActive
                        ? "bg-[#EFF6FF] border-[#0078D4] text-[#0078D4] font-semibold hover:bg-[#E0EEFE]"
                        : "bg-white dark:bg-slate-900 border-[#D1D5DB] hover:border-[#A19F9D] hover:bg-[#F3F2F1] text-[#242424]"
                )}
            >
                <span className="truncate flex-1">{getLabel()}</span>
                <ChevronDown
                    size={13}
                    className={cn(
                        "transition-transform duration-200 shrink-0 ml-1 text-[#605E5C]",
                        isOpen && "rotate-180 text-[#0078D4]",
                        isActive && "text-[#0078D4]"
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.12 } }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
                        className="absolute top-full left-0 mt-0.5 bg-white dark:bg-slate-900 border border-[#D1D5DB] shadow-lg rounded-none z-[1000] flex flex-col p-2 gap-1.5 w-max"
                    >
                        <div className="flex items-center bg-[#F3F2F1] p-0.5 rounded border border-[#E1DFDD] w-full mb-1">
                            <button
                                type="button"
                                onClick={() => setDateTargetFilter?.('APPLIED')}
                                className={cn(
                                    "flex-1 px-2.5 py-1 text-[10px] font-semibold transition-all rounded cursor-pointer text-center border select-none",
                                    dateTargetFilter === 'APPLIED' ? "bg-white dark:bg-slate-900 text-[#0078D4] shadow-2xs border-[#D1D5DB]" : "text-[#605E5C] hover:text-[#242424] hover:bg-white/50 dark:hover:bg-slate-900/50 border-transparent"
                                )}
                            >
                                APPLIED
                            </button>
                            <button
                                type="button"
                                onClick={() => setDateTargetFilter?.('INITIAL_INTERVIEW')}
                                className={cn(
                                    "flex-1 px-2.5 py-1 text-[10px] font-semibold transition-all rounded cursor-pointer text-center border select-none",
                                    dateTargetFilter === 'INITIAL_INTERVIEW' ? "bg-white dark:bg-slate-900 text-[#0078D4] shadow-2xs border-[#D1D5DB]" : "text-[#605E5C] hover:text-[#242424] hover:bg-white/50 dark:hover:bg-slate-900/50 border-transparent"
                                )}
                            >
                                INTERVIEW
                            </button>
                            <button
                                type="button"
                                onClick={() => setDateTargetFilter?.('TRAINING_START_DATE')}
                                className={cn(
                                    "flex-1 px-2.5 py-1 text-[10px] font-semibold transition-all rounded cursor-pointer text-center border select-none",
                                    dateTargetFilter === 'TRAINING_START_DATE' ? "bg-white dark:bg-slate-900 text-[#0078D4] shadow-2xs border-[#D1D5DB]" : "text-[#605E5C] hover:text-[#242424] hover:bg-white/50 dark:hover:bg-slate-900/50 border-transparent"
                                )}
                            >
                                TRAINING
                            </button>
                            <button
                                type="button"
                                onClick={() => setDateTargetFilter?.('OPS_VAL_INTERVIEW')}
                                className={cn(
                                    "flex-1 px-2.5 py-1 text-[10px] font-semibold transition-all rounded cursor-pointer text-center border select-none",
                                    dateTargetFilter === 'OPS_VAL_INTERVIEW' ? "bg-white dark:bg-slate-900 text-[#0078D4] shadow-2xs border-[#D1D5DB]" : "text-[#605E5C] hover:text-[#242424] hover:bg-white/50 dark:hover:bg-slate-900/50 border-transparent"
                                )}
                            >
                                OPS VAL
                            </button>
                        </div>
                        <AdvancedDateFilter value={dateFilter} onChange={setDateFilter} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function ManagementFilterBar({
    searchQuery, setSearchQuery, accountFilter, setAccountFilter, lobFilter, setLobFilter, accountToLobsMap, hireTypeFilter, setHireTypeFilter, statusFilter, setStatusFilter, stepFilter, setStepFilter, specialStatusFilter, setSpecialStatusFilter, taggingFilter, setTaggingFilter,
    appliedDateFilter, setAppliedDateFilter, interviewDateFilter, setInterviewDateFilter, trainingDateFilter, setTrainingDateFilter,
    dateFilter, setDateFilter, dateTargetFilter, setDateTargetFilter, recruiterFilter, setRecruiterFilter, recruiters, departments,
    activeTab, deptRecords = [], allStaff = [], isSelectMode, setIsSelectMode, apps = [], evaluateStatusFilter
}: ManagementFilterBarProps) {
    const [isFunnelActive, setIsFunnelActive] = useState(false);

    const availableLobs = useMemo(() => {
        const lobs = new Set<string>();
        if (accountFilter && accountFilter.length > 0) {
            accountFilter.forEach(acc => {
                if (accountToLobsMap[acc]) {
                    accountToLobsMap[acc].forEach(lob => lobs.add(lob));
                }
            });
        } else {
            Object.values(accountToLobsMap).forEach(lobList => {
                lobList.forEach(lob => lobs.add(lob));
            });
        }
        return Array.from(lobs).sort();
    }, [accountFilter, accountToLobsMap]);

    function getStatusColor(statusVal: string, baseColor?: string): string {
        if (baseColor && baseColor !== 'bg-slate-600') return baseColor;

        const s = (statusVal || '').toUpperCase().trim();

        if (s.includes('NO_SHOW') || s.includes('NO SHOW')) return 'bg-amber-500';
        if (s.includes('REJECTED') || s.includes('FAILED') || s.includes('CLOSED') || s.includes('WITHDRAWN')) return 'bg-rose-600';
        if (s.includes('SCHEDULED') || s.includes('FOR SCHEDULING') || s.includes('SCHEDULING')) return 'bg-indigo-500';
        if (s.includes('OPEN') || s.includes('QUEUE') || s.includes('APPLIED')) return 'bg-emerald-500';
        if (s.includes('WAITING') || s.includes('POOL')) return 'bg-cyan-600';
        if (s.includes('ASSIGNMENT') || s.includes('ASSIGNED')) return 'bg-purple-600';
        if (s.includes('INTERVIEW')) return 'bg-blue-600';
        if (s.includes('ASSESSMENT') || s.includes('TYPING')) return 'bg-purple-500';
        if (s.includes('OFFER') || s.includes('ACCEPTED') || s.includes('HIRED') || s.includes('PAN')) return 'bg-green-600';
        if (s.includes('RESCHEDULED') || s.includes('REPROFILE')) return 'bg-amber-600';
        if (s.includes('PROMOTED')) return 'bg-indigo-600';
        if (s.includes('LATERAL')) return 'bg-sky-600';

        const fallbackColors = [
            'bg-blue-500',
            'bg-teal-500',
            'bg-indigo-500',
            'bg-purple-500',
            'bg-cyan-500',
            'bg-emerald-500',
            'bg-amber-500',
            'bg-rose-500'
        ];
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            hash = s.charCodeAt(i) + ((hash << 5) - hash);
        }
        return fallbackColors[Math.abs(hash) % fallbackColors.length];
    }


    const stepOptions = useMemo(() => {
        return [
            { value: 'ALL', label: 'All Steps' },
            { value: 'TYPING_TEST', label: activeTab === 'rejected' ? "Failed Typing Test" : "Typing Test", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-orange-500' },
            { value: 'INITIAL_INTERVIEW', label: activeTab === 'rejected' ? "Failed Initial Interview" : "Initial Interview", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-blue-600' },
            { value: 'ACCOUNT_ASSIGNMENT', label: activeTab === 'rejected' ? "Failed Account Assignment" : "Account Assignment", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-emerald-500' },
            { value: 'ASSESSMENT', label: activeTab === 'rejected' ? "Failed Assessment" : "Proficiency Assessment", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-purple-500' },
            { value: 'FINAL_INTERVIEW_SCHEDULED', label: activeTab === 'rejected' ? "Failed Ops Val Scheduling" : "For Ops Val Scheduling", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-indigo-500' },
            { value: 'FINAL_INTERVIEW', label: activeTab === 'rejected' ? "Failed Final Interview" : "Final Interview", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-pink-500' },
            { value: 'CLIENT_ASSESSMENT', label: activeTab === 'rejected' ? "Failed Client Assessment" : "Client Assessment", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-teal-500' },
            { value: 'CLIENT_INTERVIEW', label: activeTab === 'rejected' ? "Failed Client Interview" : "Client Interview", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-cyan-500' }
        ];
    }, [activeTab]);

    const statusOptions = useMemo(() => {
        if (isFunnelActive) {
            return [
                { value: 'ALL', label: 'All Funnel Stages' },
                { value: 'FUNNEL_APPLIED', label: 'Applied', color: 'bg-indigo-500' },
                { value: 'FUNNEL_INTERVIEWED', label: 'Interviewed', color: 'bg-blue-600' },
                { value: 'FUNNEL_ASSESSMENT', label: 'Completed Recruiter Assessment', color: 'bg-purple-500' },
                { value: 'FUNNEL_OPS_VALIDATION', label: 'Completed Ops Validation', color: 'bg-pink-500' },
                { value: 'FUNNEL_CLIENT_INTERVIEW', label: 'Completed Client Interview', color: 'bg-cyan-500' },
                { value: 'SENT_JO_AND_BGC', label: 'Sent Job Offer', color: 'bg-emerald-700' },
                { value: 'ACCEPTED_OFFER', label: 'Total Signed (Accepted Offer)', color: 'bg-green-600' }
            ];
        }

        if (activeTab === 'rejected') {
            return [
                { value: 'ALL', label: 'All Statuses' },
                { value: 'FAILED_REPROFILE', label: 'Failed Reprofile', color: 'bg-amber-600' },
                { value: 'TYPING_TEST', label: 'Failed Typing Test', color: 'bg-rose-600' },
                { value: 'INITIAL_INTERVIEW', label: 'Failed Initial Interview', color: 'bg-rose-600' },
                { value: 'ASSESSMENT', label: 'Failed Assessment', color: 'bg-rose-600' },
                { value: 'FINAL_INTERVIEW_SCHEDULED', label: 'Failed Ops Val', color: 'bg-rose-600' },
                { value: 'CLIENT_INTERVIEW', label: 'Failed Client Interview', color: 'bg-rose-600' },
                { value: 'CLIENT_ASSESSMENT', label: 'Failed Client Assessment', color: 'bg-rose-600' },
                { value: 'FOR_JOB_OFFER', label: 'Failed Job Offer', color: 'bg-rose-600' }
            ];
        }

        const baseOptions = [
            { value: 'ALL', label: 'All Statuses' },

            // Specialized sub-tab filters
            ...(activeTab === 'withdrawn' ? [
                { value: 'WITHDRAWN_OPS_VALIDATOR', label: 'Withdrawn Operations Validator', color: 'bg-rose-500' },
                { value: 'WITHDRAWN_ASSESSMENT', label: 'Withdrawn Assessment', color: 'bg-rose-500' },
                { value: 'WITHDRAWN_CLIENT_ASSESSMENT', label: 'Withdrawn Client Assessment', color: 'bg-rose-500' },
                { value: 'WITHDRAWN_CLIENT_INTERVIEW', label: 'Withdrawn Client Interview', color: 'bg-rose-500' }
            ] : []),
            ...(activeTab === 'reschedule' ? [
                { value: 'RESCHEDULED_INITIAL', label: 'Resched Initial', color: 'bg-amber-500' },
                { value: 'RESCHEDULED_ASSESSMENT', label: 'Resched Assessment', color: 'bg-amber-500' }
            ] : []),

            // Full Candidate Pipeline & Status Options
            { value: 'INTERVIEW_IN_PROGRESS', label: 'Interview In Progress', color: 'bg-blue-500' },
            { value: 'APPLIED', label: 'Applied / New Candidate', color: 'bg-indigo-500' },
            { value: 'RESCHEDULED', label: 'Rescheduled', color: 'bg-amber-500' },
            { value: 'REPROFILE', label: 'Reprofile', color: 'bg-amber-600' },
            { value: 'WAITING', label: 'Waiting / Pooled', color: 'bg-cyan-600' },

            { value: 'FOR_JOB_OFFER', label: activeTab === 'rejected' ? "Failed Job Offer" : "For Job Offer", color: activeTab === 'rejected' ? 'bg-rose-600' : 'bg-emerald-600' },
            { value: 'ACCEPTED_OFFER', label: 'Accepted Offer', color: 'bg-green-600' },
            { value: 'SENT_JO_AND_BGC', label: 'Sent JO & BGC', color: 'bg-emerald-700' },
            { value: 'PAN_ISSUED', label: 'PAN Issued / Completed', color: 'bg-teal-600' },
            { value: 'CONFIRMED_TRAINING', label: 'Confirmed Training', color: 'bg-emerald-800' },

            { value: 'FAILED', label: 'Failed', color: 'bg-rose-600' },
            { value: 'PROMOTED', label: 'Promoted', color: 'bg-indigo-600' },
            { value: 'LATERAL_TRANSFER', label: 'Lateral Transfer', color: 'bg-blue-600' }
        ];

        const existingValues = new Set(baseOptions.map(o => o.value.toUpperCase()));

        // Add step options to existingValues so they aren't added dynamically as status options
        const ignoredStepStatuses = ['TYPING_TEST', 'INITIAL_INTERVIEW', 'ACCOUNT_ASSIGNMENT', 'ASSESSMENT', 'FINAL_INTERVIEW_SCHEDULED', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'QUEUE_ASSIGNED'];
        ignoredStepStatuses.forEach(s => existingValues.add(s));

        existingValues.add('POOL');
        existingValues.add('POOLED');
        existingValues.add('WAITING (POOLED)');
        existingValues.add('WAITING/POOLED');
        existingValues.add('WAITING');

        // Dynamically include any custom/unique status values from apps with color coding
        if (apps && Array.isArray(apps)) {
            apps.forEach(app => {
                const rawStatus = app.current_status || app.pis?.final_specific_status || app.metadata?.final_specific_status;
                if (rawStatus && typeof rawStatus === 'string') {
                    const normVal = rawStatus.toUpperCase().trim();
                    if (
                        normVal === 'POOL' || normVal === 'POOLED' || normVal.includes('WAITING') || normVal.includes('POOLED') || normVal === 'CLOSED' ||
                        normVal.includes('NO SHOW') || normVal.includes('NO_SHOW') ||
                        normVal.includes('WITHDRAWN') ||
                        normVal.includes('WAITLISTED') ||
                        normVal.includes('H2R INACTIVE') || normVal.includes('H2R_INACTIVE') ||
                        normVal.includes('INVITED FOR REAPPLICATION') || normVal.includes('INVITED_FOR_REAPPLICATION') ||
                        normVal.includes('INTERVIEW') ||
                        normVal.includes('ASSESSMENT') ||
                        normVal.includes('TYPING') ||
                        normVal.includes('JOB OFFE') ||
                        normVal === 'HIRED' ||
                        normVal === 'INACTIVE' ||
                        normVal.includes('FOR PAN')
                    ) {
                        return;
                    }
                    const underscoredVal = normVal.replace(/ /g, '_');
                    const spacedVal = normVal.replace(/_/g, ' ');

                    if (!existingValues.has(normVal) && !existingValues.has(underscoredVal) && !existingValues.has(spacedVal)) {
                        existingValues.add(normVal);
                        existingValues.add(underscoredVal);
                        existingValues.add(spacedVal);
                        baseOptions.push({
                            value: normVal,
                            label: rawStatus.replace(/_/g, ' '),
                            color: getStatusColor(normVal)
                        });
                    }
                }
            });
        }
        const allOption = baseOptions[0];
        const rest = baseOptions.slice(1).sort((a, b) => a.label.localeCompare(b.label));

        return [allOption, ...rest];
    }, [activeTab, apps, isFunnelActive]);

    const hasIndividualDateFilters = !!(appliedDateFilter && setAppliedDateFilter && interviewDateFilter && setInterviewDateFilter && trainingDateFilter && setTrainingDateFilter);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (searchQuery) count++;
        if (recruiterFilter.length > 0) count++;
        if (stepFilter && stepFilter.length > 0) count++;
        if (statusFilter.length > 0) count++;
        if (taggingFilter && taggingFilter.length > 0) count++;
        if (specialStatusFilter && specialStatusFilter.length > 0) count++;
        if (accountFilter.length > 0) count++;
        if (lobFilter.length > 0) count++;
        if (hireTypeFilter && hireTypeFilter.length > 0) count++;
        if (appliedDateFilter?.type && appliedDateFilter.type !== 'ALL') count++;
        if (interviewDateFilter?.type && interviewDateFilter.type !== 'ALL') count++;
        if (trainingDateFilter?.type && trainingDateFilter.type !== 'ALL') count++;
        if (dateFilter?.type && dateFilter.type !== 'ALL') count++;
        return count;
    }, [searchQuery, recruiterFilter, stepFilter, statusFilter, taggingFilter, specialStatusFilter, accountFilter, lobFilter, hireTypeFilter, appliedDateFilter, interviewDateFilter, trainingDateFilter, dateFilter]);

    const handleClearAllFilters = () => {
        setSearchQuery('');
        setRecruiterFilter([]);
        if (setStepFilter) setStepFilter([]);
        setStatusFilter([]);
        if (setTaggingFilter) setTaggingFilter([]);
        if (setSpecialStatusFilter) setSpecialStatusFilter([]);
        setAccountFilter([]);
        setLobFilter([]);
        if (setHireTypeFilter) setHireTypeFilter([]);
        if (setAppliedDateFilter) setAppliedDateFilter({ type: 'ALL', start: null, end: null });
        if (setInterviewDateFilter) setInterviewDateFilter({ type: 'ALL', start: null, end: null });
        if (setTrainingDateFilter) setTrainingDateFilter({ type: 'ALL', start: null, end: null });
        if (setDateFilter) setDateFilter({ type: 'ALL', start: null, end: null });
    };

    return (
        <div className="flex flex-wrap items-center justify-center bg-white dark:bg-slate-900 border-b border-[#EDEBE9] px-4 py-3 w-full gap-2 relative z-[100]">

            {/* Search Section */}
            <div className="relative w-[210px] shrink-0 group">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605E5C] pointer-events-none group-focus-within:text-[#0078D4] transition-colors" />
                <input
                    type="text"
                    placeholder="Search candidate names…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 bg-white dark:bg-slate-900 border border-[#D1D5DB] hover:border-[#A19F9D] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] rounded-none font-normal text-[12px] text-[#242424] placeholder:text-[#707070] transition-all outline-none"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#605E5C] hover:text-[#242424] p-0.5 rounded hover:bg-[#E1DFDD] transition-colors"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Date Filters */}
            {hasIndividualDateFilters ? (
                <>
                    <SingleDateFilterPopover
                        labelPrefix="Applied Date"
                        value={appliedDateFilter!}
                        onChange={setAppliedDateFilter!}
                        width="w-[170px] shrink-0"
                        theme="blue"
                        icon={<Calendar size={13} className="mr-1.5 shrink-0 opacity-75" />}
                    />
                    <SingleDateFilterPopover
                        labelPrefix="Interview Date"
                        value={interviewDateFilter!}
                        onChange={setInterviewDateFilter!}
                        width="w-[175px] shrink-0"
                        theme="cyan"
                        icon={<Calendar size={13} className="mr-1.5 shrink-0 opacity-75" />}
                    />
                    <SingleDateFilterPopover
                        labelPrefix="Training Date"
                        value={trainingDateFilter!}
                        onChange={setTrainingDateFilter!}
                        width="w-[170px] shrink-0"
                        theme="emerald"
                        icon={<Calendar size={13} className="mr-1.5 shrink-0 opacity-75" />}
                    />
                </>
            ) : dateFilter && setDateFilter ? (
                <DateFilterPopover
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    dateTargetFilter={dateTargetFilter}
                    setDateTargetFilter={setDateTargetFilter}
                    activeTab={activeTab}
                />
            ) : null}

            {/* Recruiter Filter */}
            <div className="w-[145px] shrink-0">
                <CustomMultiSelect
                    icon={<UserCheck size={14} className="text-[#605E5C]" />}
                    value={recruiterFilter}
                    onChange={setRecruiterFilter}
                    options={[
                        { value: 'ALL', label: 'All Recruiters' },
                        { value: 'UNASSIGNED', label: 'Unassigned', count: (apps || []).filter((a: any) => !a.assigned_recruiter_name).length },
                        ...(recruiters || []).map(r => {
                            const staff = allStaff?.find((s: any) => (s.full_name || `${s.first_name} ${s.last_name}`).toLowerCase() === r.toLowerCase());
                            const isRestricted = staff && staff.is_active === false;
                            return {
                                value: r,
                                label: r,
                                image: staff?.profile_picture || undefined,
                                textColor: isRestricted ? 'text-red-500 font-semibold' : undefined,
                                count: (apps || []).filter((a: any) => {
                                    const assign = (a.assigned_recruiter_name || '').toLowerCase();
                                    const interv = (a.interviewer_name || '').toLowerCase();
                                    const target = r.toLowerCase();
                                    return assign === target || interv === target || assign.includes(target) || interv.includes(target);
                                }).length
                            };
                        })
                    ]}
                    placeholder="All Recruiters"
                    theme="purple"
                />
            </div>

            {/* Step Filter */}
            {stepFilter !== undefined && setStepFilter !== undefined && (
                <div className="w-[160px] shrink-0">
                    <CustomMultiSelect
                        icon={<Layers size={14} className="text-[#605E5C]" />}
                        value={stepFilter}
                        onChange={setStepFilter}
                        options={stepOptions.map(opt => ({
                            ...opt,
                            count: opt.value === 'ALL' ? undefined : (apps || []).filter((a: any) => {
                                if (evaluateStatusFilter) return evaluateStatusFilter(a, activeTab || 'ongoing', [opt.value]);
                                return a.current_step === opt.value;
                            }).length
                        }))}
                        placeholder="All Steps"
                        theme="purple"
                    />
                </div>
            )}

            {/* Status Filter */}
            <div className="w-[165px] shrink-0">
                <CustomMultiSelect
                    icon={<Activity size={14} className="text-[#605E5C]" />}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions.map(opt => ({
                        ...opt,
                        count: opt.value === 'ALL' ? undefined : (apps || []).filter((a: any) => {
                            if (evaluateStatusFilter) return evaluateStatusFilter(a, activeTab || 'ongoing', [opt.value]);
                            const rawStatus = String(a.current_status || a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().trim();
                            const optVal = opt.value.toUpperCase();
                            return rawStatus === optVal || rawStatus.replace(/ /g, '_') === optVal || rawStatus.replace(/_/g, ' ') === optVal || (isFunnelActive && a.current_status === optVal);
                        }).length
                    }))}
                    placeholder="All Statuses"
                    theme="orange"
                    showFunnelToggle={true}
                    isFunnelActive={isFunnelActive}
                    onFunnelToggle={() => setIsFunnelActive(!isFunnelActive)}
                />
            </div>

            {/* Tagging Filter */}
            {taggingFilter !== undefined && setTaggingFilter && (
                <div className="w-[135px] shrink-0">
                    <CustomMultiSelect
                        icon={<Tag size={14} className="text-[#605E5C]" />}
                        value={taggingFilter}
                        onChange={setTaggingFilter}
                        twoStepGroups={true}
                        options={[
                            { value: 'ALL', label: 'All Tagging' },
                            { value: 'NO_SHOW', label: 'All No Show', color: 'bg-orange-500', group: 'No Show' },
                            { value: 'NO_SHOW_TYPING_TEST', label: 'Typing Test', color: 'bg-orange-400', group: 'No Show' },
                            { value: 'NO_SHOW_INITIAL_INTERVIEW', label: 'Initial Interview', color: 'bg-orange-400', group: 'No Show' },
                            { value: 'NO_SHOW_ACCOUNT_ASSIGNMENT', label: 'Account Assignment', color: 'bg-orange-400', group: 'No Show' },
                            { value: 'NO_SHOW_ASSESSMENT', label: 'Assessment', color: 'bg-orange-400', group: 'No Show' },
                            { value: 'NO_SHOW_FINAL_INTERVIEW', label: 'Final Interview', color: 'bg-orange-400', group: 'No Show' },
                            { value: 'NO_SHOW_CLIENT_INTERVIEW', label: 'Client Interview', color: 'bg-orange-400', group: 'No Show' },
                            { value: 'WITHDRAWN', label: 'Withdrawn', color: 'bg-rose-500' },
                            { value: 'WAITLISTED', label: 'Waitlisted', color: 'bg-amber-500' },
                            { value: 'H2R_INACTIVE', label: 'H2R Inactive', color: 'bg-slate-50 dark:bg-slate-8000' },
                            { value: 'INVITED_FOR_REAPPLICATION', label: 'Invited for Reapplication', color: 'bg-indigo-500' }
                        ].map(opt => ({
                            ...opt,
                            count: opt.value === 'ALL' ? undefined : (apps || []).filter((a: any) => {
                                const status = String(a.current_status || '').toUpperCase();
                                const specStatus = String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase();

                                if (opt.value === 'NO_SHOW') return status.includes('NO_SHOW') || status.includes('NO SHOW') || specStatus.includes('NO SHOW') || specStatus.includes('NOSHOW');
                                if (opt.value === 'NO_SHOW_TYPING_TEST') return (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('TYPING') || specStatus.includes('TYPING'));
                                if (opt.value === 'NO_SHOW_INITIAL_INTERVIEW') return (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('INITIAL') || specStatus.includes('INITIAL'));
                                if (opt.value === 'NO_SHOW_ACCOUNT_ASSIGNMENT') return (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('ACCOUNT') || specStatus.includes('ACCOUNT'));
                                if (opt.value === 'NO_SHOW_ASSESSMENT') return (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && ((status.includes('ASSESSMENT') && !status.includes('CLIENT')) || (specStatus.includes('ASSESSMENT') && !specStatus.includes('CLIENT')));
                                if (opt.value === 'NO_SHOW_FINAL_INTERVIEW') return (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('FINAL') || specStatus.includes('FINAL'));
                                if (opt.value === 'NO_SHOW_CLIENT_INTERVIEW') return (status.includes('NO_SHOW') || specStatus.includes('NO SHOW')) && (status.includes('CLIENT') || specStatus.includes('CLIENT'));

                                if (opt.value === 'WITHDRAWN') return status.includes('WITHDRAWN') || specStatus.includes('WITHDRAWN') || specStatus.includes('WITHDREW');
                                if (opt.value === 'WAITLISTED') return status.includes('WAITLISTED') || specStatus.includes('WAITLISTED');
                                if (opt.value === 'H2R_INACTIVE') return status.includes('H2R_INACTIVE') || status.includes('H2R INACTIVE') || specStatus.includes('H2R INACTIVE');
                                if (opt.value === 'INVITED_FOR_REAPPLICATION') return status.includes('INVITED_FOR_REAPPLICATION') || status.includes('INVITED FOR REAPPLICATION') || specStatus.includes('INVITED FOR REAPPLICATION');
                                return false;
                            }).length
                        }))}
                        placeholder="Tagging"
                        theme="cyan"
                    />
                </div>
            )}

            {/* Special Status Filter */}
            {specialStatusFilter !== undefined && setSpecialStatusFilter && (
                <div className="w-[140px] shrink-0">
                    <CustomMultiSelect
                        icon={<Sparkles size={14} className="text-[#605E5C]" />}
                        value={specialStatusFilter}
                        onChange={setSpecialStatusFilter}
                        options={[
                            { value: 'ALL', label: 'All Special Statuses' },
                            { value: 'PROMOTED', label: 'Promoted', color: 'bg-indigo-500' },
                            { value: 'LATERAL_TRANSFER', label: 'Lateral Transfer', color: 'bg-blue-500' }
                        ].map(opt => ({
                            ...opt,
                            count: opt.value === 'ALL' ? undefined : (apps || []).filter((a: any) => {
                                const isPromoted = String(a.current_status || '').toUpperCase().includes('PROMOTED') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('PROMOTED');
                                const isLateral = String(a.current_status || '').toUpperCase().includes('LATERAL') || String(a.pis?.final_specific_status || a.metadata?.final_specific_status || '').toUpperCase().includes('LATERAL');
                                if (opt.value === 'PROMOTED') return isPromoted;
                                if (opt.value === 'LATERAL_TRANSFER') return isLateral;
                                return false;
                            }).length
                        }))}
                        placeholder="Special Status"
                        theme="rose"
                    />
                </div>
            )}

            {/* Department Filter */}
            <div className="w-[155px] shrink-0">
                <CustomMultiSelect
                    icon={<Building2 size={14} className="text-[#605E5C]" />}
                    value={accountFilter}
                    onChange={setAccountFilter}
                    twoStepGroups={['Accounts', 'Support & Leadership']}
                    options={[
                        { value: 'ALL', label: 'All Departments' },
                        ...(departments || []).map(d => {
                            const dept = deptRecords?.find((dept: any) => dept.name.toUpperCase() === d.toUpperCase());

                            const isSupportDept = () => {
                                if (dept?.type === 'SUPPORT_ROLES') return true;
                                const lower = d.toLowerCase().trim();
                                return ['admin', 'hr', 'support', 'recruitment', 'it', 'support and leadership', 'workforce', 'revenue & invoicing', 'quality assurance', 'training & development', 'engagement & social media', 'human resources', 'it department', 'facilities', 'security', 'safety', 'client engagement & asset control', 'process optimization'].includes(lower) || lower.includes('support');
                            };

                            const groupName = isSupportDept() ? 'Support & Leadership' : 'Accounts';

                            let imageUrl = undefined;
                            if (dept?.accountImageUrl) {
                                imageUrl = dept.accountImageUrl.startsWith('/') ? `/api${dept.accountImageUrl}` : dept.accountImageUrl;
                            } else if (dept?.accountImageData) {
                                imageUrl = dept.accountImageData;
                            }

                            const isRestricted = dept?.is_restricted || dept?.restricted || dept?.status === 'RESTRICTED';

                            return {
                                value: d,
                                label: d,
                                image: imageUrl,
                                group: groupName,
                                count: (apps || []).filter((a: any) => (a.pis?.department || a.department) === d).length,
                                textColor: isRestricted ? 'text-red-500 font-semibold' : undefined
                            };
                        })
                    ]}
                    placeholder="All Departments"
                    theme="indigo"
                />
            </div>

            {/* LOB / Job Position Filter */}
            <div className="w-[150px] shrink-0">
                <CustomMultiSelect
                    icon={<Briefcase size={14} className="text-[#605E5C]" />}
                    value={lobFilter}
                    onChange={setLobFilter}
                    options={[
                        { value: 'ALL', label: 'All Job Positions' },
                        ...(availableLobs || []).map(l => ({
                            value: l,
                            label: l,
                            count: (apps || []).filter((a: any) => {
                                const depts = (a.department || '').split(',').map((d: string) => d.trim().toLowerCase());
                                return depts.some((d: string) => {
                                    const lobPart = d.includes(' - ') ? d.split(' - ').slice(1).join(' - ') : (d.includes('-') ? d.split('-').slice(1).join('-') : '');
                                    return lobPart.trim() === l.trim().toLowerCase();
                                });
                            }).length
                        }))
                    ]}
                    placeholder="All Job Positions"
                    highlightGlow={accountFilter.length > 0 && lobFilter.length === 0}
                    theme="indigo"
                />
            </div>

            {/* Hire Type Filter */}
            {setHireTypeFilter && (
                <div className="w-[135px] shrink-0">
                    <CustomMultiSelect
                        icon={<Users size={14} className="text-[#605E5C]" />}
                        value={hireTypeFilter || []}
                        onChange={setHireTypeFilter}
                        options={[
                            { value: 'ALL', label: 'All Hire Types' },
                            { value: 'EXTERNAL', label: 'External' },
                            { value: 'INTERNAL', label: 'Internal' }
                        ].map(opt => ({
                            ...opt,
                            count: opt.value === 'ALL' ? undefined : (apps || []).filter((a: any) => {
                                const type = a.metadata?.candidate_type || a.pis?.candidate_type || '';
                                return type.toUpperCase() === opt.value;
                            }).length
                        }))}
                        placeholder="All Hire Types"
                        theme="amber"
                    />
                </div>
            )}

            {/* Reset Filters Action */}
            {activeFilterCount > 0 && (
                <button
                    onClick={handleClearAllFilters}
                    className="flex items-center gap-1 px-2 py-1 rounded-none text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shrink-0 cursor-pointer"
                >
                    <RotateCcw size={12} />
                    <span>Clear</span>
                    <span className="px-1 py-0.2 bg-rose-200/70 text-rose-800 text-[10px] rounded font-bold">
                        {activeFilterCount}
                    </span>
                </button>
            )}

        </div>
    );
}
