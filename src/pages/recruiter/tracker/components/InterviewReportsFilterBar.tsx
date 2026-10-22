import React, { useRef, useState } from 'react';
import { 
    Search, X, Download, Eye, EyeOff, Table2, Filter, Users, Layers, ChevronDown, CheckCircle2
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import { AccountLobFilter } from './AccountLobFilter';
import { AdvancedDateFilter } from '@/components/common/AdvancedDateFilter';
import { useAuthStore } from '@/store/authStore';
import { ToggleLeft, ToggleRight } from 'lucide-react';

interface InterviewReportsFilterBarProps {
    search: string;
    setSearch: (val: string) => void;
    
    selectedHireType: string;
    setSelectedHireType: (val: string) => void;
    
    selectedInitialAccountFilter: string;
    setSelectedInitialAccountFilter: (val: string) => void;
    initialAccountOptions: string[];
    
    selectedOverallStatusFilter: string;
    setSelectedOverallStatusFilter: (val: string) => void;
    
    selectedFinalAccountFilter: string;
    setSelectedFinalAccountFilter: (val: string) => void;
    finalAccountOptions: string[];
    
    dateAddedFilter: any;
    setDateAddedFilter: (val: any) => void;
    
    interviewConcludedFilter: any;
    setInterviewConcludedFilter: (val: any) => void;
    
    allDepartments: any[];
    
    mainView: 'EXCEL' | 'CHRONICLE';
    setMainView: (view: 'EXCEL' | 'CHRONICLE') => void;
    onExportExcel: () => void;

    showEssentialOnly: boolean;
    setShowEssentialOnly: (val: boolean) => void;

    isExclusiveMode?: boolean;
    setIsExclusiveMode?: (val: boolean) => void;

    isOfficialEndorsement?: boolean;
    setIsOfficialEndorsement?: (val: boolean) => void;
    officialEndorsementCount?: number;
}

const GhostSelect = ({
    icon, value, onChange, options, isActive, width
}: {
    icon: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    isActive: boolean;
    width: string;
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const current = options.find(o => o.value === value) || options[0];

    return (
        <div ref={ref} className={cn("relative shrink-0", width)}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "h-8 px-3 w-full flex items-center justify-between gap-2 text-[12.5px] font-medium transition-all rounded-[6px] border shadow-sm hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out",
                    isActive || open
                        ? "bg-[#0078D4] border-[#0078D4] text-white shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10"
                        : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                )}
            >
                <div className="flex items-center gap-2 truncate">
                    <span className={cn(isActive || open ? "text-white" : "text-slate-400")}>{icon}</span>
                    <span className="truncate">{current?.label}</span>
                </div>
                <ChevronDown size={14} strokeWidth={2.5} className={cn("transition-transform", (isActive || open) ? "text-white rotate-180" : "text-slate-400")} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1.5 z-[600] bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-lg py-1.5 max-h-60 overflow-y-auto custom-scrollbar w-full animate-in fade-in slide-in-from-top-1 duration-150">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={cn(
                                "w-full text-left px-3 py-1.5 text-[12px] font-medium hover:bg-slate-50 transition-colors",
                                value === opt.value ? "text-blue-700 bg-blue-50/50" : "text-slate-700"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function InterviewReportsFilterBar({
    search, setSearch,
    selectedHireType, setSelectedHireType,
    selectedInitialAccountFilter, setSelectedInitialAccountFilter, initialAccountOptions,
    selectedOverallStatusFilter, setSelectedOverallStatusFilter,
    selectedFinalAccountFilter, setSelectedFinalAccountFilter, finalAccountOptions,
    dateAddedFilter, setDateAddedFilter,
    interviewConcludedFilter, setInterviewConcludedFilter,
    allDepartments,
    mainView, setMainView,
    onExportExcel,
    showEssentialOnly, setShowEssentialOnly,
    isExclusiveMode,
    setIsExclusiveMode,
    isOfficialEndorsement,
    setIsOfficialEndorsement,
    officialEndorsementCount
}: InterviewReportsFilterBarProps) {
    const { user } = useAuthStore();
    const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin' || user?.role === 'ops_val_admin';

    const [localExclusiveMode, setLocalExclusiveMode] = useState(!!isExclusiveMode);
    React.useEffect(() => {
        setLocalExclusiveMode(!!isExclusiveMode);
    }, [isExclusiveMode]);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    return (
        <div className="w-full flex flex-col items-center bg-[#0B1A42] border-b border-slate-800/60 relative z-[200]">
            
            {/* TOP TIER: Prominent Search */}
            <div className="px-8 pt-6 pb-4 flex justify-center w-full">
                <div className="relative w-full max-w-3xl group">
                    <Search size={16} strokeWidth={2} className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10", (isSearchFocused || search) ? "text-indigo-600" : "text-slate-400")} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search candidates..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className="w-full bg-white transition-all border border-transparent rounded-[8px] h-[42px] pl-11 pr-16 text-[14px] font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm hover:border-slate-200"
                    />
                    {!search && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                            <kbd className="hidden sm:inline-flex items-center justify-center border border-slate-200 bg-slate-50 rounded-[4px] h-5 px-1.5 text-[10px] font-semibold text-slate-400 font-sans shadow-sm">⌘</kbd>
                            <kbd className="hidden sm:inline-flex items-center justify-center border border-slate-200 bg-slate-50 rounded-[4px] h-5 px-1.5 text-[10px] font-semibold text-slate-400 font-sans shadow-sm">K</kbd>
                        </div>
                    )}
                    {search && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSearch(''); searchInputRef.current?.focus(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </div>

            {/* BOTTOM TIER: Refined Filters & Secondary Actions */}
            <div className="px-8 pb-4 flex flex-col md:flex-row items-center justify-between w-full relative z-10 gap-4">
                
                {/* Primary Filters Grouping */}
                <div className="flex items-center gap-2 p-1 bg-black/20 border border-black/10 rounded-[8px] flex-wrap justify-center md:justify-start">
                    
                    {/* Initial Account Filter */}
                    <AccountLobFilter
                        value={selectedInitialAccountFilter}
                        onChange={setSelectedInitialAccountFilter}
                        allDepartments={allDepartments}
                        initialAccountOptions={initialAccountOptions}
                        placeholder="All Departments"
                    />

                    {/* Overall Status Filter */}
                    <GhostSelect
                        icon={<Layers size={14} />}
                        value={selectedOverallStatusFilter || 'ALL'}
                        onChange={setSelectedOverallStatusFilter}
                        options={[
                            { value: 'ALL', label: 'All Statuses' },
                            { value: 'OPEN', label: 'OPEN' },
                            { value: 'CLOSE', label: 'CLOSE' },
                            { value: 'HIRED', label: 'HIRED' }
                        ]}
                        isActive={selectedOverallStatusFilter !== 'ALL' && selectedOverallStatusFilter !== ''}
                        width="w-[150px]"
                    />

                    {/* Hiring Type Filter */}
                    <GhostSelect
                        icon={<Users size={14} />}
                        value={selectedHireType || 'ALL'}
                        onChange={setSelectedHireType}
                        options={[
                            { value: 'ALL', label: 'All Hiring Types' },
                            { value: 'INTERNAL', label: 'Internal' },
                            { value: 'EXTERNAL', label: 'External' }
                        ]}
                        isActive={selectedHireType !== 'ALL' && selectedHireType !== ''}
                        width="w-[165px]"
                    />

                    {/* Training (Concluded) Date Filter */}
                    <div className="flex items-center gap-1.5 px-3 h-8 rounded-[6px] border shadow-sm bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] transition-all duration-200 ease-out cursor-pointer shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Training Date</span>
                        <div className="relative flex items-center h-8">
                            <AdvancedDateFilter
                                value={interviewConcludedFilter}
                                onChange={setInterviewConcludedFilter}
                                isDark={false}
                            />
                        </div>
                    </div>

                    {/* Added Date Filter */}
                    <div className="flex items-center gap-1.5 px-3 h-8 rounded-[6px] border shadow-sm bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] transition-all duration-200 ease-out cursor-pointer shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">Applied Date</span>
                        <div className="relative flex items-center h-8">
                            <AdvancedDateFilter
                                value={dateAddedFilter}
                                onChange={setDateAddedFilter}
                                isDark={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-black/20 rounded-md p-0.5 border border-black/10 shadow-sm">
                        <button
                            onClick={() => setMainView('EXCEL')}
                            className={cn(
                                "flex items-center justify-center gap-1.5 h-6 px-2.5 rounded text-[11px] font-semibold transition-all hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out",
                                mainView === 'EXCEL' 
                                    ? "bg-white text-slate-800 shadow-sm" 
                                    : "text-white/70 hover:text-white"
                            )}
                        >
                            <Table2 size={13} strokeWidth={2.5} />
                            Excel
                        </button>
                        <button
                            onClick={() => setMainView('CHRONICLE')}
                            className={cn(
                                "flex items-center justify-center gap-1.5 h-6 px-2.5 rounded text-[11px] font-semibold transition-all hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out",
                                mainView === 'CHRONICLE' 
                                    ? "bg-white text-slate-800 shadow-sm" 
                                    : "text-white/70 hover:text-white"
                            )}
                        >
                            <Eye size={13} strokeWidth={2.5} />
                            Chronicle
                        </button>
                    </div>
                    
                    {mainView === 'EXCEL' && (
                        <button
                            onClick={() => setShowEssentialOnly(!showEssentialOnly)}
                            className={cn(
                                "flex items-center justify-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold rounded-md focus:outline-none border hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] transition-all duration-200 ease-out",
                                showEssentialOnly 
                                    ? "bg-slate-100 border-slate-300 text-slate-800 shadow-sm" 
                                    : "bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                            )}
                            title="Toggle Essential Columns"
                        >
                            <Filter size={13} strokeWidth={2.5} className={showEssentialOnly ? "text-slate-700" : "text-slate-400"} />
                            Essential Only
                        </button>
                    )}

                    {setIsOfficialEndorsement && (
                        <button
                            type="button"
                            onClick={() => setIsOfficialEndorsement(!isOfficialEndorsement)}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 h-7 rounded-md border text-[11px] font-semibold ml-1 hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] transition-all duration-200 ease-out",
                                isOfficialEndorsement
                                    ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                                    : "bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                            )}
                        >
                            <CheckCircle2 size={13} strokeWidth={2.5} className={isOfficialEndorsement ? "text-blue-600" : "text-slate-400"} />
                            Official Endorsement
                            {officialEndorsementCount !== undefined && (
                                <span className={cn(
                                    "ml-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold",
                                    isOfficialEndorsement ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                )}>
                                    {officialEndorsementCount}
                                </span>
                            )}
                        </button>
                    )}

                    {isAdminOrSuperAdmin && setIsExclusiveMode && (
                        <button
                            type="button"
                            onClick={() => {
                                const newVal = !localExclusiveMode;
                                setLocalExclusiveMode(newVal);
                                React.startTransition(() => {
                                    setIsExclusiveMode(newVal);
                                });
                            }}
                            className={cn(
                                "flex items-center justify-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold rounded-md focus:outline-none border ml-2 hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] transition-all duration-200 ease-out",
                                localExclusiveMode 
                                    ? "bg-slate-100 border-slate-300 text-slate-800 shadow-sm"
                                    : "bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                            )}
                            title="Toggle Hidden Candidates"
                        >
                            {localExclusiveMode ? <EyeOff size={13} strokeWidth={2.5} className="text-slate-700" /> : <Eye size={13} strokeWidth={2.5} className="text-slate-400" />}
                            Hidden
                        </button>
                    )}
                    
                </div>
            </div>
        </div>
    );
}
