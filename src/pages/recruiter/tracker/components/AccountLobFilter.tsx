import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Building2, Layers, Check } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface AccountLobFilterProps {
    value: string;
    onChange: (val: string) => void;
    allDepartments: any[];
    initialAccountOptions: string[];
    placeholder?: string;
    colorScheme?: 'blue' | 'emerald' | 'purple';
    variant?: 'default' | 'ghost';
}

function getGradient(name: string) {
    const gradients = [
        'bg-gradient-to-br from-blue-500 to-blue-600',
        'bg-gradient-to-br from-indigo-500 to-indigo-600',
        'bg-gradient-to-br from-purple-500 to-purple-600',
        'bg-gradient-to-br from-pink-500 to-pink-600',
        'bg-gradient-to-br from-rose-500 to-rose-600',
        'bg-gradient-to-br from-emerald-500 to-emerald-600',
        'bg-gradient-to-br from-teal-500 to-teal-600',
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

export function AccountLobFilter({ 
    value, 
    onChange, 
    allDepartments, 
    initialAccountOptions, 
    placeholder = "Initial Account",
    colorScheme = 'blue',
    variant = 'default'
}: AccountLobFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'ACCOUNT' | 'LOB'>('ACCOUNT');
    const [viewingAccount, setViewingAccount] = useState<any | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler removed to allow multiple filters open simultaneously

    useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => {
                setStep('ACCOUNT');
                setViewingAccount(null);
            }, 200);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    // Build the list of accounts
    const accountList = useMemo(() => {
        const mapped = allDepartments.map(d => ({
            name: d.name,
            subAccounts: d.subAccounts || [],
            hasLobs: d.subAccounts && d.subAccounts.length > 0
        }));

        // Find strings in initialAccountOptions that are NOT in allDepartments 
        // (to handle legacy data or flat structures gracefully)
        const knownAccountNames = new Set(allDepartments.map(d => d.name.toUpperCase()));
        const knownLobNames = new Set(allDepartments.flatMap(d => (d.subAccounts || []).map((s: any) => s.name.toUpperCase())));
        
        initialAccountOptions.forEach(opt => {
            const upper = opt.toUpperCase();
            if (!knownAccountNames.has(upper) && !knownLobNames.has(upper)) {
                mapped.push({
                    name: opt,
                    subAccounts: [],
                    hasLobs: false
                });
                knownAccountNames.add(upper); // avoid duplicates
            }
        });

        return mapped.sort((a, b) => a.name.localeCompare(b.name));
    }, [allDepartments, initialAccountOptions]);

    const displayValue = value === 'ALL' ? placeholder : value;

    const schemeClasses = {
        blue: {
            activeBg: 'bg-blue-500/20',
            activeText: 'text-blue-300',
            activeBorder: 'border-blue-500/30',
            hoverBg: 'hover:bg-blue-500/30',
            iconColor: 'text-blue-400'
        },
        emerald: {
            activeBg: 'bg-emerald-500/20',
            activeText: 'text-emerald-300',
            activeBorder: 'border-emerald-500/30',
            hoverBg: 'hover:bg-emerald-500/30',
            iconColor: 'text-emerald-400'
        },
        purple: {
            activeBg: 'bg-purple-500/20',
            activeText: 'text-purple-300',
            activeBorder: 'border-purple-500/30',
            hoverBg: 'hover:bg-purple-500/30',
            iconColor: 'text-purple-400'
        }
    }[colorScheme];

    return (
        <div className={cn("relative group select-none h-full", variant === 'ghost' ? "w-full" : "w-44 flex-none")} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center text-left transition-all outline-none select-none w-full",
                    variant === 'ghost' 
                        ? "h-7 pl-7 pr-7 text-[11.5px] font-medium tracking-[-0.005em] rounded-none shrink-0 whitespace-nowrap border border-transparent hover:bg-slate-100 hover:text-slate-800 " + (isOpen || value !== 'ALL' ? "bg-slate-100 text-slate-900 shadow-xs" : "bg-transparent text-slate-500")
                        : cn(
                            "h-8 px-3 w-full flex items-center justify-between gap-2 text-[12.5px] font-medium transition-all rounded-[6px] border shadow-sm hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-md active:scale-[0.98] duration-200 ease-out",
                            isOpen || value !== 'ALL'
                                ? "bg-[#0078D4] border-[#0078D4] text-white shadow-[0_4px_12px_rgba(0,120,212,0.3)] ring-1 ring-white/10"
                                : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                        )
                )}
            >
                {variant === 'ghost' ? (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Building2 size={12} strokeWidth={2.5} />
                    </span>
                ) : (
                    <span className={cn(isOpen || value !== 'ALL' ? "text-white" : "text-slate-400")}>
                        <Building2 size={14} strokeWidth={2.5} />
                    </span>
                )}
                <span className={cn("truncate flex-1 text-left", variant === 'ghost' ? "" : "")}>{displayValue}</span>
                <ChevronDown size={variant === 'ghost' ? 11 : 14} strokeWidth={2.5} className={cn("shrink-0 transition-transform", variant === 'ghost' ? "absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" : (isOpen || value !== 'ALL' ? "text-white" : "text-slate-400"), isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-[280px] min-w-[280px] max-w-[280px] bg-white dark:bg-slate-900 border border-[#D6DCE5] rounded-lg shadow-xl z-[500] overflow-hidden flex flex-col text-[#1F2937]">
                    {step === 'ACCOUNT' ? (
                        <>
                            <div className="p-2.5 border-b border-[#D6DCE5] bg-slate-50 dark:bg-slate-800/80 flex items-center gap-2">
                                <Building2 size={14} className="text-[#0078D4] ml-1" />
                                <span className="text-[11px] font-semibold text-[#5F6B7A] uppercase tracking-wider">Select Account</span>
                            </div>
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-1">
                                <button
                                    onClick={() => { onChange('ALL'); setIsOpen(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors group/item",
                                        value === 'ALL' ? "text-blue-700 bg-blue-50/50" : "text-slate-700 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center border border-[#D6DCE5]">
                                        <Layers size={13} className="text-[#5F6B7A]" />
                                    </div>
                                    <span className={cn("text-[12px] font-medium truncate flex-1", value === 'ALL' ? "text-[#0078D4]" : "text-[#1F2937]")}>All Accounts</span>
                                    {value === 'ALL' && <Check size={14} className="text-[#0078D4]" strokeWidth={2.5} />}
                                </button>
                                
                                {accountList.map(acc => {
                                    const isSelected = value === acc.name;
                                    return (
                                        <button
                                            key={acc.name}
                                            onClick={() => {
                                                if (acc.hasLobs) {
                                                    setViewingAccount(acc);
                                                    setStep('LOB');
                                                } else {
                                                    onChange(acc.name);
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors group/item mt-0.5",
                                                isSelected ? "bg-blue-50 text-[#0078D4] font-semibold" : "hover:bg-slate-100 dark:bg-slate-800/50 text-[#1F2937]"
                                            )}
                                        >
                                            <div className={cn("w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white/20 shrink-0", getGradient(acc.name))}>
                                                {getInitials(acc.name)}
                                            </div>
                                            <span className={cn("text-[12px] font-medium truncate flex-1", isSelected ? "text-[#0078D4]" : "text-[#1F2937]")}>
                                                {acc.name}
                                            </span>
                                            {acc.hasLobs ? (
                                                <ChevronRight size={14} className="text-[#5F6B7A] shrink-0" />
                                            ) : (
                                                isSelected && <Check size={14} className="text-[#0078D4]" strokeWidth={2.5} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : viewingAccount ? (
                        <>
                            <div className="p-2 border-b border-slate-700/50 bg-slate-800/80 backdrop-blur flex items-center gap-2">
                                <button 
                                    onClick={() => { setStep('ACCOUNT'); setViewingAccount(null); }}
                                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                                >
                                    <ChevronLeft size={14} strokeWidth={3} />
                                </button>
                                <div className={cn("w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold text-white shadow-sm border border-white/10 shrink-0", getGradient(viewingAccount.name))}>
                                    {getInitials(viewingAccount.name)}
                                </div>
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate">
                                    {viewingAccount.name}
                                </span>
                            </div>
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-1">
                                <button
                                    onClick={() => { onChange(viewingAccount.name); setIsOpen(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 transition-colors group/item",
                                        value === viewingAccount.name ? "bg-blue-50 text-[#0078D4] font-semibold" : "hover:bg-slate-100 dark:bg-slate-800/50 text-[#1F2937]"
                                    )}
                                >
                                    <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 shrink-0 border border-[#D6DCE5]">
                                        <Layers size={10} className="text-[#5F6B7A]" />
                                    </div>
                                    <span className={cn("text-[11px] font-bold truncate flex-1", value === viewingAccount.name ? "text-[#0078D4]" : "text-[#1F2937]")}>ALL Job Positions</span>
                                    {value === viewingAccount.name && <Check size={14} className="text-[#0078D4]" strokeWidth={3} />}
                                </button>
                                
                                {viewingAccount.subAccounts.map((lob: any) => {
                                    const isSelected = value === lob.name;
                                    return (
                                        <button
                                            key={lob.name}
                                            onClick={() => { onChange(lob.name); setIsOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors group/item mt-0.5",
                                                isSelected ? "bg-blue-50 text-[#0078D4] font-semibold" : "hover:bg-slate-100 dark:bg-slate-800/50 text-[#1F2937]"
                                            )}
                                        >
                                            <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-[#D6DCE5] shrink-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/item:bg-slate-50 dark:bg-slate-8000" />
                                            </div>
                                            <span className={cn("text-[11px] font-medium truncate flex-1", isSelected ? "text-[#0078D4] font-semibold" : "text-[#1F2937]")}>
                                                {lob.name}
                                            </span>
                                            {isSelected && <Check size={14} className="text-[#0078D4]" strokeWidth={3} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
}
