import React, { useState, useRef, useEffect } from 'react';
import { Layers, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface StatusSelectProps {
    value?: string[];
    onChange: (val: string[]) => void;
}

function getOptionColor(opt: string): string {
    const s = opt.toUpperCase().trim();
    if (s.includes('SENT JO') || s.includes('BGC')) return 'bg-emerald-600';
    if (s.includes('JOB OFFER') || s.includes('FOR JOB OFFER')) return 'bg-emerald-500';
    if (s.includes('ACCEPTED OFFER')) return 'bg-green-600';
    if (s.includes('PAN COMPLETED')) return 'bg-teal-600';
    if (s.includes('FOR PAN AND BI')) return 'bg-purple-600';
    if (s.includes('APPROVAL') || s.includes('OUT')) return 'bg-sky-600';
    if (s.includes('SIGNATURE') || s.includes('ISSUED')) return 'bg-cyan-600';
    if (s.includes('FOR PAN') || s.includes('PAN')) return 'bg-purple-500';
    if (s.includes('LATERAL')) return 'bg-blue-600';
    if (s.includes('EXTERNAL')) return 'bg-slate-600';
    return 'bg-indigo-500';
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const STATUS_OPTIONS = [
        'SENT JO AND BGC',
        'FOR JOB OFFER',
        'ACCEPTED OFFER',
        'FOR PAN',
        'PAN COMPLETED',
        'PAN Issued; For Signature',
        'PAN Out for Approval',
        'FOR PAN AND BI',
        'LATERAL TRANSFER',
        'EXTERNAL'
    ];

    const isAll = !value || value.length === 0 || value.includes('ALL');
    const displayLabel = isAll ? 'All Statuses' : value.length === 1 ? value[0] : `${value.length} Selected`;

    return (
        <div className="relative w-[170px] shrink-0" ref={dropdownRef}>
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
                        <Layers size={14} strokeWidth={2.5} />
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
                        className="absolute top-full left-0 mt-1.5 w-full min-w-[200px] bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-lg z-[1000] overflow-hidden flex flex-col py-1"
                    >
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
                                <Layers size={12} />
                            </div>
                            <span className="flex-1">All Statuses</span>
                            {isAll && <Check size={14} className="text-blue-600" />}
                        </button>
                        
                        <div className="h-px w-full bg-neutral-100 my-1"></div>
                        
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {STATUS_OPTIONS.map(opt => {
                                const isSelected = !isAll && (value || []).includes(opt);
                                return (
                                    <button
                                        key={opt}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            let newVal = [...(value || [])].filter(v => v !== 'ALL');
                                            if (isSelected) {
                                                newVal = newVal.filter(v => v !== opt);
                                                if (newVal.length === 0) newVal = ['ALL'];
                                            } else {
                                                newVal.push(opt);
                                            }
                                            onChange(newVal);
                                        }}
                                        className={cn(
                                            "w-full px-4 py-2 text-[12px] font-medium text-left hover:bg-neutral-50 transition-colors flex items-center gap-3",
                                            isSelected ? "text-black bg-blue-50/50 font-semibold" : "text-neutral-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-none shrink-0 ml-1 shadow-xs transition-transform",
                                            getOptionColor(opt),
                                            isSelected && "ring-2 ring-blue-500/50 scale-110"
                                        )} />
                                        <span className="truncate flex-1">{opt}</span>
                                        {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
