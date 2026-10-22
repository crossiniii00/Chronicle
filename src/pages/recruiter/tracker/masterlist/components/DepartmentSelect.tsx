import React, { useState, useRef, useEffect } from 'react';
import { Building, ChevronRight, Check, ChevronDown, Users, LifeBuoy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface DepartmentSelectProps {
    value: string[];
    onChange: (val: string[]) => void;
    options: string[];
    placeholder?: string;
}

function getGradient(name: string) {
    const gradients = [
        'bg-gradient-to-br from-blue-500 to-blue-600',
        'bg-gradient-to-br from-indigo-500 to-indigo-600',
        'bg-gradient-to-br from-purple-500 to-purple-600',
        'bg-gradient-to-br from-pink-500 to-pink-600',
        'bg-gradient-to-br from-rose-500 to-rose-600',
        'bg-gradient-to-br from-orange-500 to-orange-600',
        'bg-gradient-to-br from-emerald-500 to-emerald-600',
        'bg-gradient-to-br from-teal-500 to-teal-600',
        'bg-gradient-to-br from-cyan-500 to-cyan-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'A';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function DepartmentSelect({ value, onChange, options, placeholder = "All Departments" }: DepartmentSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler removed to allow multiple filters open simultaneously

    useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => setActiveGroup(null), 200);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    const isAll = !value || value.length === 0 || value.includes('ALL');
    const displayLabel = isAll 
        ? placeholder 
        : value.length === 1 
            ? value[0] 
            : `${value.length} Selected`;

    const enrichedOptions = [
        ...options.map(d => {
            const lower = d.toLowerCase().trim();
            const isSupport = ['admin', 'hr', 'support', 'recruitment', 'it', 'support and leadership', 'workforce', 'revenue & invoicing', 'quality assurance', 'training & development', 'engagement & social media', 'human resources', 'it department', 'facilities', 'security', 'safety', 'client engagement & asset control', 'process optimization'].includes(lower) || lower.includes('support');
            return { value: d, label: d, group: isSupport ? 'Support & Leadership' : 'Accounts' };
        })
    ];

    const groupedOptions = enrichedOptions.filter(o => o.group).reduce((acc, opt) => {
        const g = opt.group!;
        if (!acc[g]) acc[g] = [];
        acc[g].push(opt);
        return acc;
    }, {} as Record<string, typeof enrichedOptions>);

    return (
        <div className="relative w-44 flex-none" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-8 px-3 w-full flex items-center justify-between gap-2 text-[12.5px] font-medium transition-all rounded-[6px] border shadow-sm hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out",
                    isOpen || (value && value.length > 0 && !value.includes('ALL'))
                        ? "bg-[#0078D4] border-[#0078D4] text-white shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10"
                        : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                )}
            >
                <div className="flex items-center gap-2 truncate">
                    <span className={cn(isOpen || (value && value.length > 0 && !value.includes('ALL')) ? "text-white" : "text-slate-400")}>
                        <Building size={14} strokeWidth={2.5} />
                    </span>
                    <span className="truncate">{displayLabel}</span>
                </div>
                <ChevronDown size={14} strokeWidth={2.5} className={cn("transition-transform", isOpen ? "rotate-180 text-white" : "text-slate-400")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 25, mass: 0.8 } }}
                        exit={{ opacity: 0, scale: 0.93, y: 10, transition: { duration: 0.12 } }}
                        style={{ originX: 0.5, originY: 0 }}
                        className="absolute top-full left-0 mt-1.5 w-[220px] bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-lg z-[1000] overflow-hidden flex flex-col"
                    >
                        {activeGroup === null ? (
                            <div className="flex flex-col py-1">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onChange(['ALL']);
                                    }}
                                    className={cn(
                                        "w-full px-4 py-2.5 text-[13px] font-medium text-left hover:bg-neutral-50 transition-colors flex items-center gap-3",
                                        isAll ? "text-blue-700 bg-blue-50/50 font-semibold" : "text-neutral-600"
                                    )}
                                >
                                    <div className="w-6 h-6 rounded-none bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm">
                                        <Building size={12} />
                                    </div>
                                    <span className="flex-1">All Departments</span>
                                    {isAll && <Check size={14} className="text-blue-600" />}
                                </button>
                                {['Accounts', 'Support & Leadership'].map((groupName) => (
                                    <button
                                        key={groupName}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveGroup(groupName);
                                        }}
                                        className="w-full px-4 py-2.5 text-[13px] font-medium text-left text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-none bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                                                {groupName === 'Accounts' ? <Users size={12} /> : <LifeBuoy size={12} />}
                                            </div>
                                            <span>{groupName}</span>
                                        </div>
                                        <ChevronRight size={14} className="text-neutral-400" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col py-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveGroup(null);
                                    }}
                                    className="w-full px-4 py-2 text-[12px] font-bold text-left text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center gap-1.5 border-b border-neutral-100 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10"
                                >
                                    <ChevronRight size={12} className="rotate-180" />
                                    {activeGroup}
                                </button>
                                {(groupedOptions[activeGroup] || []).length === 0 ? (
                                    <div className="px-4 py-3 text-[11px] text-neutral-400 text-center">No options available</div>
                                ) : (
                                    (groupedOptions[activeGroup] || []).map(opt => {
                                        const isSelected = !isAll && (value || []).includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const newValue = value.includes(opt.value)
                                                        ? value.filter(v => v !== opt.value)
                                                        : [...value.filter(v => v !== 'ALL'), opt.value];
                                                    onChange(newValue.length === 0 ? ['ALL'] : newValue);
                                                }}
                                                className={cn(
                                                    "w-full px-4 py-2 text-[12.5px] font-medium text-left hover:bg-neutral-50 transition-colors flex items-center gap-3",
                                                    isSelected ? "bg-blue-50/30 text-blue-700 font-semibold" : "text-neutral-700"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0",
                                                    isSelected ? "ring-2 ring-blue-500 ring-offset-1" : "",
                                                    getGradient(opt.value)
                                                )}>
                                                    {getInitials(opt.label)}
                                                </div>
                                                <span className="truncate flex-1">{opt.label}</span>
                                                {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
