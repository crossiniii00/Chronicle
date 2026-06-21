import React from 'react';
import {
    Database, Search, X, Loader2, Edit2, FileUp, FileDown, Calendar, ChevronRight, Mail,
    Users, Layers, Trophy, CheckCircle2, Download, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';

interface MasterlistHeaderProps {
    selectedAccount: string | null;
    setSelectedAccount: (val: string | null) => void;
    activeTab: string;
    search: string;
    setSearch: (val: string) => void;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    isSelectMode: boolean;
    setIsSelectMode: (val: boolean) => void;
    isSyncing: boolean;
    handleSyncAll?: () => void;
    handleCancelEdit?: () => void;
    setLocalChanges?: (val: any) => void;
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
    selectedIds?: Set<string>;
    onBulkDelete?: () => void;
    onClearSelection?: () => void;
    hideImport?: boolean;
    hideSearch?: boolean;
    hideEdit?: boolean;
    emailFilter?: 'ALL' | 'PENDING' | 'DONE';
    setEmailFilter?: (val: 'ALL' | 'PENDING' | 'DONE') => void;
    onBulkEmail?: (type: 'NEO' | 'PEME' | 'RCBC') => void;
    onExportExcel?: () => void;
    totalCount?: number;
}

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function MasterlistHeader({
    selectedAccount, setSelectedAccount, activeTab, search, setSearch,
    isEditing, setIsEditing, isSelectMode, setIsSelectMode, isSyncing, handleSyncAll, handleCancelEdit, setLocalChanges, onImportCSV,
    selectedStatus, setSelectedStatus, selectedWave, setSelectedWave, waveOptions,
    selectedMonth, setSelectedMonth, selectedDay, setSelectedDay,
    selectedDateFilter, setSelectedDateFilter,
    monthOptions,
    accountOptions, selectedIds, onBulkDelete, onClearSelection,
    hideImport, hideSearch, hideEdit,
    emailFilter, setEmailFilter,
    onBulkEmail,
    onExportExcel,
    totalCount = 0
}: MasterlistHeaderProps) {
    const { user } = useAuthStore();
    const isRecruiterS = user?.role === 'recruiter_s';

    const [isOpen, setIsOpen] = React.useState(false);
    const [isSearchFocused, setIsSearchFocused] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportCSV?.(file);
            e.target.value = '';
        }
    };

    const statusActive = !!selectedStatus && selectedStatus !== 'ALL';
    const accountActive = !!selectedAccount;
    const waveActive = !!selectedWave && selectedWave !== 'ALL';
    const dateActive = !!selectedMonth && selectedMonth !== 'ALL';
    const emailActive = !!emailFilter && emailFilter !== 'ALL';

    const baseSelectClass = (active: boolean, width: string) => cn(
        width,
        "h-7 pl-7 pr-7 text-[11.5px] font-medium tracking-[-0.005em] outline-none appearance-none cursor-pointer transition-all rounded-sm border shrink-0 whitespace-nowrap",
        active
            ? "bg-black/[0.04] border-black/30 text-black"
            : "bg-white border-surface-200 text-black/70 hover:border-black/40 hover:text-black"
    );

    const FilterSelect = ({
        icon, value, onChange, options, isActive, width
    }: {
        icon: React.ReactNode;
        value: string;
        onChange: (v: string) => void;
        options: { value: string; label: string }[];
        isActive: boolean;
        width: string;
    }) => {
        const [open, setOpen] = React.useState(false);
        const ref = React.useRef<HTMLDivElement>(null);
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
                        "h-7 pl-7 pr-7 w-full flex items-center text-[11.5px] font-medium tracking-[-0.005em] transition-all rounded-sm border whitespace-nowrap",
                        isActive
                            ? "bg-black/[0.04] border-black/30 text-black"
                            : "bg-white border-surface-200 text-black/70 hover:border-black/40 hover:text-black"
                    )}
                >
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none">{icon}</span>
                    <span className="flex-1 text-left truncate">{current?.label}</span>
                    <ChevronRight size={11} strokeWidth={2} className={cn("absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-black/35 transition-transform", open && "rotate-[270deg]")} />
                </button>
                {open && (
                    <div className="absolute top-full left-0 mt-1 z-[600] bg-white border border-surface-200 shadow-2xl rounded-sm py-1 max-h-60 overflow-y-auto custom-scrollbar w-full animate-in fade-in slide-in-from-top-1 duration-150">
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={cn(
                                    "w-full text-left px-2.5 py-1.5 text-[11.5px] font-medium tracking-[-0.005em] hover:bg-surface-50 transition-colors",
                                    value === opt.value ? "text-black bg-black/[0.03]" : "text-black/70"
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

    const titleText = selectedAccount || (activeTab === 'MASTERLIST' ? 'Master Registry' : `${activeTab.replace(/_/g, ' ')} Registry`);

    return (
        <div className="flex flex-col border-b border-surface-200 shrink-0 bg-white">

            {/* ROW 1: TITLE */}
            <div className="relative px-6 py-4 flex items-center justify-center">
                <div className="flex items-center gap-2.5">
                    <Database size={15} className="text-surface-400 self-center" />
                    <h1
                        className="text-[24px] leading-none text-surface-900 tracking-[-0.015em] capitalize"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                    >
                        {titleText}
                    </h1>
                </div>
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 h-7 bg-surface-50/70 border border-surface-200 rounded-sm">
                    <span className="text-[9px] font-semibold text-black/45 uppercase tracking-[0.1em]">Registry</span>
                    <span className="text-[13px] font-semibold text-black tabular-nums leading-none">
                        {totalCount.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-medium text-black/45 leading-none">records</span>
                </div>
            </div>
        </div>
    );
}
