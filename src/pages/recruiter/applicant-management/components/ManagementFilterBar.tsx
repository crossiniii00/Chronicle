import React from 'react';
import { Search, Building, ChevronDown, Trash, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface ManagementFilterBarProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    accountFilter: string;
    setAccountFilter: (val: string) => void;
    statusFilter: string;
    setStatusFilter: (val: string) => void;
    departments: string[];
    isSelectMode: boolean;
    setIsSelectMode: (val: boolean) => void;
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
    setDeleteConfirmApplicant: (val: { id: string; name: string } | null) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (val: 'grid' | 'list') => void;
}

export function ManagementFilterBar({
    searchQuery, setSearchQuery, accountFilter, setAccountFilter, statusFilter, setStatusFilter,
    departments, isSelectMode, setIsSelectMode, selectedIds, setSelectedIds,
    setDeleteConfirmApplicant, viewMode, setViewMode
}: ManagementFilterBarProps) {
    return (
        <div className="flex flex-col gap-3 bg-white border border-slate-200 p-3 rounded-sm shadow-sm xl:flex-row xl:items-center xl:justify-between">
            {/* Search Section */}
            <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={14} />
                <input
                    type="text"
                    placeholder="Search candidates, roles, or email addresses…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-sm font-semibold text-[11px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 transition-all outline-none uppercase tracking-wider"
                />
            </div>

            {/* Functional Group: Filters & Views */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Account Filter */}
                <div className="relative group">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 transition-colors" size={12} />
                    <select
                        value={accountFilter}
                        onChange={(e) => setAccountFilter(e.target.value)}
                        className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-sm text-[11px] font-bold text-slate-700 focus:outline-none focus:border-slate-900 appearance-none cursor-pointer hover:bg-slate-50 transition-all min-w-[200px] uppercase tracking-wider"
                    >
                        <option value="ALL">All accounts</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block w-[1px] h-8 bg-slate-200 mx-0.5" />

                {/* View Mode & Selection Group */}
                <div className="bg-slate-50 p-0.5 border border-slate-200 rounded-sm flex items-center gap-0.5">
                    <button
                        onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            setSelectedIds(new Set());
                        }}
                        className={cn(
                            "p-2.5 rounded-sm transition-all",
                            isSelectMode 
                                ? "bg-red-500 text-white shadow-sm" 
                                : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                        )}
                        title="Toggle Selection Mode"
                    >
                        <Trash size={13} />
                    </button>
                    
                    {isSelectMode && selectedIds.size > 0 && (
                        <button
                            onClick={() => setDeleteConfirmApplicant({ id: 'BULK', name: `${selectedIds.size} selected records` })}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-sm transition-all flex items-center gap-1.5 shadow-sm"
                        >
                            <Trash size={11} /> Purge ({selectedIds.size})
                        </button>
                    )}

                    <div className="w-[1px] h-6 bg-slate-200 self-center mx-1" />

                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2 rounded-sm transition-all",
                            viewMode === 'grid' 
                                ? "bg-white text-slate-800 shadow-sm border border-slate-200" 
                                : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                        )}
                        title="Grid View"
                    >
                        <LayoutGrid size={13} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-2 rounded-sm transition-all",
                            viewMode === 'list' 
                                ? "bg-white text-slate-800 shadow-sm border border-slate-200" 
                                : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                        )}
                        title="List View"
                    >
                        <List size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
