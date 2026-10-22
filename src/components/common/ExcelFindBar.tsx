import React, { useEffect, useRef, useState } from 'react';
import { Search, ChevronUp, ChevronDown, X, CornerDownLeft } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface ExcelFindBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    matchCount?: number;
    currentMatchIndex?: number;
    onNextMatch?: () => void;
    onPrevMatch?: () => void;
    placeholder?: string;
    isOpen: boolean;
    onClose: () => void;
    matches?: { id: string; text: string; context?: string }[];
    onMatchSelect?: (match: { id: string; text: string; context?: string }) => void;
}

export function ExcelFindBar({
    searchQuery,
    onSearchChange,
    matchCount = 0,
    currentMatchIndex = 0,
    onNextMatch,
    onPrevMatch,
    placeholder = "Find in sheet...",
    isOpen,
    onClose,
    matches = [],
    onMatchSelect
}: ExcelFindBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [isOpen]);

    // Keyboard navigation in the dropdown
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (matches.length === 0) return;

            let nextIndex = currentMatchIndex;
            if (e.key === 'ArrowDown') {
                nextIndex = (currentMatchIndex + 1) % matches.length;
                onNextMatch?.();
            } else {
                nextIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
                onPrevMatch?.();
            }

            // Scroll the list to ensure the selected item is visible
            if (listRef.current) {
                const item = listRef.current.children[nextIndex] as HTMLElement;
                if (item) {
                    item.scrollIntoView({ block: 'nearest' });
                }
            }
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (matches.length > 0 && currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
                onMatchSelect?.(matches[currentMatchIndex]);
            }
            if (e.shiftKey) {
                onPrevMatch?.();
            } else {
                onNextMatch?.();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed top-20 right-8 z-[500] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white dark:bg-slate-900 border border-[#D6DCE5] shadow-[0_8px_30px_rgba(0,0,0,0.14)] rounded-lg p-2 flex items-center gap-2 text-[#1F2937] select-none min-w-[340px]">
                
                {/* Search Input Container */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-[#D6DCE5] rounded-md px-2.5 py-1.5 flex-1 focus-within:border-[#0078D4] focus-within:ring-2 focus-within:ring-[#0078D4]/20 transition-all">
                    <Search size={14} className="text-[#0078D4] shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="bg-transparent border-none outline-none text-xs font-medium text-[#1F2937] placeholder:text-[#5F6B7A] w-full"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            className="text-[#5F6B7A] hover:text-[#1F2937] p-0.5 rounded transition-colors"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Match Counter Badge */}
                {searchQuery.trim() !== '' && (
                    <div className="text-[11px] font-semibold text-[#5F6B7A] bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded border border-[#D6DCE5] shrink-0">
                        {matchCount > 0 ? (
                            <span>{currentMatchIndex + 1} of {matchCount}</span>
                        ) : (
                            <span className="text-rose-500 font-normal">No matches</span>
                        )}
                    </div>
                )}

                {/* Match Navigation Buttons */}
                <div className="flex items-center gap-0.5 shrink-0 border-l border-[#D6DCE5] pl-1.5">
                    <button
                        type="button"
                        onClick={onPrevMatch}
                        disabled={matchCount === 0}
                        className="p-1 rounded hover:bg-slate-100 dark:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent text-[#1F2937] transition-colors cursor-pointer"
                        title="Previous match (Shift+Enter)"
                    >
                        <ChevronUp size={15} strokeWidth={2.2} />
                    </button>
                    <button
                        type="button"
                        onClick={onNextMatch}
                        disabled={matchCount === 0}
                        className="p-1 rounded hover:bg-slate-100 dark:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent text-[#1F2937] transition-colors cursor-pointer"
                        title="Next match (Enter)"
                    >
                        <ChevronDown size={15} strokeWidth={2.2} />
                    </button>
                </div>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded hover:bg-slate-100 dark:bg-slate-800/50 text-[#5F6B7A] hover:text-[#1F2937] transition-colors cursor-pointer shrink-0 ml-0.5"
                    title="Close (Esc)"
                >
                    <X size={15} strokeWidth={2} />
                </button>
            </div>

            {/* Dropdown for matches */}
            {searchQuery.trim() !== '' && matches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-[#D6DCE5] shadow-[0_8px_30px_rgba(0,0,0,0.14)] rounded-lg max-h-[250px] overflow-y-auto z-[501]" ref={listRef}>
                    <div className="p-1">
                        {matches.map((match, idx) => (
                            <button
                                key={match.id || idx}
                                type="button"
                                onClick={() => onMatchSelect?.(match)}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded text-xs flex flex-col gap-0.5 transition-colors",
                                    idx === currentMatchIndex
                                        ? "bg-slate-100 dark:bg-slate-800/50/80 outline-none"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                                )}
                            >
                                <span className={cn("font-medium", idx === currentMatchIndex ? "text-[#0078D4]" : "text-surface-900")}>
                                    {match.text}
                                </span>
                                {match.context && (
                                    <span className="text-[10px] text-surface-500 font-medium tracking-wide truncate">
                                        {match.context}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
