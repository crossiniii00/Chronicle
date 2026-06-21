import React, { useState, useRef, useEffect } from 'react';
import { 
    Briefcase, Plus, Search, LayoutGrid, List, FolderPlus, ChevronDown, 
    Globe, Headphones, Shield, Laptop, GraduationCap, Users, 
    CreditCard, TrendingUp, Building2, FolderOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';
import type { Position } from '@/types';

interface PositionHeaderProps {
    hideHeader: boolean;
    onAdd: () => void;
    onAddCategory: () => void;
}

export function PositionHeader({ hideHeader, onAdd, onAddCategory }: PositionHeaderProps) {
    return (
        <div className={cn("relative px-6 py-4 flex items-center justify-center border-b border-[#edebe9] bg-white", !hideHeader && "mb-2")}>
            <div className="flex items-center gap-2.5">
                <Briefcase size={17} className="text-[#605e5c] self-center" />
                <h1
                    className="text-[30px] leading-none text-[#323130] tracking-[-0.02em]"
                    style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                >
                    Job Management
                </h1>
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2.5">
                {!hideHeader && (
                    <>
                        <button onClick={onAddCategory}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-white border border-[#edebe9] hover:bg-[#faf9f8] text-[#323130] text-[11.5px] font-medium tracking-[-0.005em] transition-all rounded-sm"
                            title="Create a new category"
                        >
                            <FolderPlus size={13} strokeWidth={2.25} />
                            New Category
                        </button>
                        <button onClick={onAdd}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-[#0c2461] hover:bg-[#081b4d] text-white text-[11.5px] font-medium tracking-[-0.005em] transition-all rounded-sm"
                        >
                            <Plus size={13} strokeWidth={2.25} />
                            Post new role
                        </button>
                    </>
                )}
            </div>
            {hideHeader && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button onClick={onAddCategory}
                        className="flex items-center justify-center w-7 h-7 bg-white border border-[#edebe9] hover:bg-[#faf9f8] text-[#323130] rounded-full transition-all shadow-sm shrink-0"
                        title="New Category"
                    >
                        <FolderPlus size={14} />
                    </button>
                    <button onClick={onAdd}
                        className="flex items-center justify-center w-7 h-7 bg-[#0c2461] hover:bg-[#081b4d] text-white rounded-full transition-all shadow-sm shrink-0"
                        title="Post New Role"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

interface PositionFilterBarProps {
    activeTab: 'active' | 'logs';
    onTabChange: (tab: 'active' | 'logs') => void;
    search: string;
    onSearchChange: (s: string) => void;
    viewType: 'grid' | 'list';
    onViewTypeChange: (v: 'grid' | 'list') => void;
    categories: { id: string; name: string }[];
    categoryFilter: string;
    onCategoryFilterChange: (val: string) => void;
}

const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('customer') || n.includes('operation')) return Headphones;
    if (n.includes('safety') || n.includes('security')) return Shield;
    if (n.includes('technical') || n.includes('it') || n.includes('tech')) return Laptop;
    if (n.includes('training') || n.includes('quality')) return GraduationCap;
    if (n.includes('human') || n.includes('recruitment') || n.includes('hr')) return Users;
    if (n.includes('finance') || n.includes('accounting')) return CreditCard;
    if (n.includes('sales') || n.includes('marketing')) return TrendingUp;
    if (n.includes('facilities') || n.includes('admin')) return Building2;
    if (n.includes('uncategorized')) return FolderOpen;
    return Briefcase;
};

function CategoryDropdown({
    categories,
    value,
    onChange
}: {
    categories: { id: string; name: string }[];
    value: string;
    onChange: (val: string) => void;
}) {
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

    const selectedCategory = categories.find(c => c.id === value);
    const selectedLabel = value === '' ? 'All Categories' : (value === '__uncategorized__' ? 'Uncategorized' : (selectedCategory?.name || 'All Categories'));
    const SelectedIcon = value === '' ? Globe : (value === '__uncategorized__' ? FolderOpen : getCategoryIcon(selectedLabel));

    return (
        <div className="relative z-[90]" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="h-7 px-3 bg-white border border-[#edebe9] hover:border-slate-350 active:scale-[0.97] transition-all rounded-sm text-[12px] font-semibold text-slate-700 outline-none flex items-center gap-2 cursor-pointer select-none"
            >
                <SelectedIcon size={14} className="text-slate-500 shrink-0" />
                <span className="truncate max-w-[150px]">{selectedLabel}</span>
                <ChevronDown size={13} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -6 }}
                        transition={{ type: "spring", damping: 15, stiffness: 220 }}
                        className="absolute left-0 mt-1.5 w-60 bg-white border border-[#edebe9] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-sm overflow-hidden flex flex-col p-1 text-left origin-top-left"
                    >
                        <button
                            type="button"
                            onClick={() => { onChange(''); setIsOpen(false); }}
                            className={cn(
                                "w-full px-3 py-1.5 rounded-sm text-[12px] font-semibold text-left transition-colors flex items-center gap-2.5",
                                value === '' ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Globe size={14} className="text-slate-500 shrink-0" />
                            <span>All Categories</span>
                        </button>

                        {categories.map(cat => {
                            const isSelected = value === cat.id;
                            const CatIcon = getCategoryIcon(cat.name);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => { onChange(cat.id); setIsOpen(false); }}
                                    className={cn(
                                        "w-full px-3 py-1.5 rounded-sm text-[12px] font-semibold text-left transition-colors flex items-center gap-2.5",
                                        isSelected ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <CatIcon size={14} className="text-slate-500 shrink-0" />
                                    <span>{cat.name}</span>
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => { onChange('__uncategorized__'); setIsOpen(false); }}
                            className={cn(
                                "w-full px-3 py-1.5 rounded-sm text-[12px] font-semibold text-left transition-colors flex items-center gap-2.5 border-t border-slate-50 mt-1 pt-1.5",
                                value === '__uncategorized__' ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <FolderOpen size={14} className="text-slate-500 shrink-0" />
                            <span>Uncategorized</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function PositionFilterBar({ 
    activeTab, 
    onTabChange, 
    search, 
    onSearchChange, 
    viewType, 
    onViewTypeChange,
    categories,
    categoryFilter,
    onCategoryFilterChange
}: PositionFilterBarProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-center gap-4 py-3 px-6 border-b border-[#edebe9] mb-6 bg-white">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center border border-[#edebe9] rounded-sm p-0.5">
                    <button
                        onClick={() => onTabChange('active')}
                        className={cn(
                            "px-4 h-7 rounded-sm text-[11.5px] font-medium tracking-[-0.005em] transition-all",
                            activeTab === 'active' ? "bg-[#0c2461]/[0.04] text-[#0c2461]" : "text-[#605e5c] hover:bg-[#faf9f8]"
                        )}
                    >
                        Active Jobs
                    </button>
                    <button
                        onClick={() => onTabChange('logs')}
                        className={cn(
                            "px-4 h-7 rounded-sm text-[11.5px] font-medium tracking-[-0.005em] transition-all",
                            activeTab === 'logs' ? "bg-[#0c2461]/[0.04] text-[#0c2461]" : "text-[#605e5c] hover:bg-[#faf9f8]"
                        )}
                    >
                        Archives
                    </button>
                </div>

                <div className="relative w-full md:w-80 group text-left">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" />
                    <input
                        type="text"
                        placeholder="Search positions..."
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 h-7 bg-white border border-[#edebe9] rounded-sm text-[12px] font-medium text-[#323130] placeholder-[#a19f9d] focus:outline-none focus:border-[#0c2461] transition-all"
                    />
                </div>

                {/* Category Filter */}
                <CategoryDropdown
                    categories={categories}
                    value={categoryFilter}
                    onChange={onCategoryFilterChange}
                />
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center border border-[#edebe9] rounded-sm p-0.5">
                    <button
                        onClick={() => onViewTypeChange('grid')}
                        className={cn(
                            "p-1.5 rounded-sm transition-all",
                            viewType === 'grid' ? "bg-[#0c2461]/[0.04] text-[#0c2461]" : "text-[#605e5c] hover:bg-[#faf9f8]"
                        )}
                    >
                        <LayoutGrid size={14} />
                    </button>
                    <button
                        onClick={() => onViewTypeChange('list')}
                        className={cn(
                            "p-1.5 rounded-sm transition-all",
                            viewType === 'list' ? "bg-[#0c2461]/[0.04] text-[#0c2461]" : "text-[#605e5c] hover:bg-[#faf9f8]"
                        )}
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export const getBadgeClass = (pos: Position) => {
    return { priority: 'Active', class: 'bg-[#f3f2f1] border-[#edebe9] text-[#323130]' };
};

export const getTimeStatus = (pos: Position) => {
    const days = Math.floor((new Date().getTime() - new Date(pos.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'New';
    return `${days}d`;
};
