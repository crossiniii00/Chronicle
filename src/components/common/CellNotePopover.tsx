import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface CellNotePopoverProps {
    isOpen: boolean;
    onClose: () => void;
    position: { left: number; top: number; placement: 'up' | 'down' } | null;
    initialNote: string;
    onSave: (note: string) => void;
}

export function CellNotePopover({ isOpen, onClose, position, initialNote, onSave }: CellNotePopoverProps) {
    const [note, setNote] = useState(initialNote);
    const popoverRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setNote(initialNote);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 50);
        }
    }, [isOpen, initialNote]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !position) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={popoverRef}
                    initial={{ opacity: 0, scale: 0.95, y: position.placement === 'down' ? -4 : 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: position.placement === 'down' ? -4 : 4 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        left: position.left,
                        top: position.top,
                        zIndex: 99999
                    }}
                    className="w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-visible flex flex-col"
                >
                    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between items-center rounded-t-lg">
                        Cell Note
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-2">
                        <textarea
                            ref={textareaRef}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                            rows={4}
                            placeholder="Add a note for this cell..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    onSave(note);
                                    onClose();
                                } else if (e.key === 'Escape') {
                                    onClose();
                                }
                            }}
                        />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-100 px-3 py-2 flex justify-end gap-2 rounded-b-lg">
                        <button 
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                onSave(note);
                                onClose();
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-sm"
                        >
                            Save Note
                        </button>
                    </div>
                    
                    {/* Speech bubble tail (pointer) */}
                    <div 
                        className={cn(
                            "absolute w-3 h-3 bg-white dark:bg-slate-900 rotate-45 z-[-1]",
                            position.placement === 'up' ? "bottom-[-6px] left-4 border-b border-r border-slate-200 dark:border-slate-800" : "top-[-6px] left-4 border-t border-l border-slate-200 dark:border-slate-800"
                        )}
                    />
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
