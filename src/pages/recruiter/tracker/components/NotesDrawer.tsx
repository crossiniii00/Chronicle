import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Send, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application } from '@/types/application';

interface Note {
    id: string;
    text: string;
    author: string;
    createdAt: string;
}

interface NotesDrawerProps {
    app: Application | null;
    onClose: () => void;
    onSaveNote: (appId: string, text: string, author: string) => void;
    currentUser?: string;
    anchorRect?: DOMRect | null;
}

const colorThemes = {
    yellow: {
        bg: 'bg-[#fef9c3]',
        header: 'bg-[#fef08a]',
        text: 'text-amber-950',
        border: 'border-amber-200/70',
        circle: 'bg-[#fde047]',
        inputBg: 'bg-[#fffbeb]',
        placeholder: 'placeholder:text-amber-600/40'
    },
    green: {
        bg: 'bg-[#dcfce7]',
        header: 'bg-[#bbf7d0]',
        text: 'text-emerald-950',
        border: 'border-emerald-200/70',
        circle: 'bg-[#86efac]',
        inputBg: 'bg-[#f0fdf4]',
        placeholder: 'placeholder:text-emerald-600/40'
    },
    blue: {
        bg: 'bg-[#dbeafe]',
        header: 'bg-[#bfdbfe]',
        text: 'text-blue-950',
        border: 'border-blue-200/70',
        circle: 'bg-[#93c5fd]',
        inputBg: 'bg-[#f0f9ff]',
        placeholder: 'placeholder:text-blue-600/40'
    },
    pink: {
        bg: 'bg-[#fce7f3]',
        header: 'bg-[#fbcfe8]',
        text: 'text-pink-950',
        border: 'border-pink-200/70',
        circle: 'bg-[#f472b6]',
        inputBg: 'bg-[#fdf2f8]',
        placeholder: 'placeholder:text-pink-600/40'
    },
    purple: {
        bg: 'bg-[#f3e8ff]',
        header: 'bg-[#e9d5ff]',
        text: 'text-purple-950',
        border: 'border-purple-200/70',
        circle: 'bg-[#c084fc]',
        inputBg: 'bg-[#faf5ff]',
        placeholder: 'placeholder:text-purple-600/40'
    }
};

export function NotesDrawer({ app, onClose, onSaveNote, currentUser = 'Recruiter', anchorRect }: NotesDrawerProps) {
    const [newNote, setNewNote] = useState('');
    const [selectedTheme, setSelectedTheme] = useState<'yellow' | 'green' | 'blue' | 'pink' | 'purple'>('yellow');
    const [size, setSize] = useState({ width: 380, height: 480 });
    const [position, setPosition] = useState<{
        top: number;
        left: number;
        isFlipped: boolean;
    }>({ top: 0, left: 0, isFlipped: false });
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    
    const popoverRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dragControls = useDragControls();
    const isResizingRef = useRef(false);
    
    const notes: Note[] = React.useMemo(() => {
        if (!app?.notes) return [];
        try {
            return JSON.parse(app.notes);
        } catch (e) {
            return [{ id: 'legacy', text: app.notes, author: 'System', createdAt: app.updated_at }];
        }
    }, [app]);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newNote.trim() || !app) return;
        onSaveNote(app.id, newNote.trim(), currentUser);
        setNewNote('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleDeleteNoteTrigger = (noteId: string) => {
        setDeleteConfirmId(noteId);
    };

    const handleConfirmDelete = () => {
        if (!deleteConfirmId || !app) return;
        onSaveNote(app.id, deleteConfirmId, 'DELETE_TRIGGER_SYNC');
        setDeleteConfirmId(null);
    };

    // Dragging and resizing logic
    const handleDragMouseDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Only drag if not clicking a button, input, or resizing
        if (isResizingRef.current) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('textarea') || target.closest('input')) {
            return;
        }

        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = position.left;
        const startTop = position.top;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            setPosition(prev => ({
                ...prev,
                left: startLeft + deltaX,
                top: startTop + deltaY
            }));
        };

        const handlePointerUp = () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    const handleResizeMouseDown = (e: React.PointerEvent<HTMLDivElement>, direction: string) => {
        e.preventDefault();
        e.stopPropagation();
        isResizingRef.current = true;

        const startWidth = size.width;
        const startHeight = size.height;
        const startLeft = position.left;
        const startTop = position.top;
        const startX = e.clientX;
        const startY = e.clientY;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!isResizingRef.current) return;
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            const minWidth = 300;
            const minHeight = 320;

            // Horizontal resize
            if (direction.includes('e')) {
                newWidth = Math.max(minWidth, startWidth + deltaX);
            } else if (direction.includes('w')) {
                const computedWidth = startWidth - deltaX;
                if (computedWidth >= minWidth) {
                    newWidth = computedWidth;
                    newLeft = startLeft + deltaX;
                }
            }

            // Vertical resize
            if (direction.includes('s')) {
                newHeight = Math.max(minHeight, startHeight + deltaY);
            } else if (direction.includes('n')) {
                const computedHeight = startHeight - deltaY;
                if (computedHeight >= minHeight) {
                    newHeight = computedHeight;
                    newTop = startTop + deltaY;
                }
            }

            setSize({ width: newWidth, height: newHeight });
            setPosition(prev => ({ ...prev, left: newLeft, top: newTop }));
        };

        const handlePointerUp = () => {
            isResizingRef.current = false;
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    // Pin the sticky note to the right edge of the main content area (after sidebar)
    useEffect(() => {
        if (app && anchorRect) {
            const sidebarWidth = 256; // w-64
            const width = size.width;
            const height = size.height;
            
            // Right-edge aligned within the content area, vertically centered
            const top = Math.max(60, (window.innerHeight - height) / 2);
            const left = window.innerWidth - width - 16;

            setPosition({ 
                top, 
                left: Math.max(sidebarWidth + 16, left),
                isFlipped: false
            });
        }
    }, [app, anchorRect, size.height, size.width]);

    const activeTheme = colorThemes[selectedTheme];

    const portalContent = (
        <AnimatePresence>
            {app && anchorRect && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9998] bg-transparent pointer-events-auto"
                    />
                    
                    <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, scale: 0.95, y: position.isFlipped ? -10 : 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: position.isFlipped ? -10 : 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 450 }}
                        style={{ 
                            top: position.top, 
                            left: position.left,
                            width: size.width,
                            height: size.height,
                            transformOrigin: position.isFlipped ? 'top' : 'bottom'
                        }}
                        className={cn(
                            "fixed z-[9999] shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-lg flex flex-col overflow-hidden transition-colors duration-300 select-none border border-black/5",
                            activeTheme.bg
                        )}
                    >
                        {/* Windows Sticky Note Top Bar Header (Drag Handle) */}
                        <div 
                            onPointerDown={handleDragMouseDown}
                            className={cn(
                                "px-4 py-2 flex items-center justify-between transition-colors duration-300 cursor-move select-none shrink-0 border-b border-black/[0.04] backdrop-blur-[2px]",
                                activeTheme.header
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {/* Windows Sticky Note + Button */}
                                <button
                                    onClick={() => textareaRef.current?.focus()}
                                    className="p-1 hover:bg-black/5 rounded text-slate-800/60 hover:text-slate-900 transition-all active:scale-90"
                                    title="New Note"
                                >
                                    <Plus size={16} />
                                </button>
                                
                                {/* Dynamic Color Palette Selector */}
                                <div className="flex items-center gap-1 ml-1">
                                    {(Object.keys(colorThemes) as Array<keyof typeof colorThemes>).map((themeName) => (
                                        <button
                                            key={themeName}
                                            onClick={() => setSelectedTheme(themeName)}
                                            className={cn(
                                                "w-3 h-3 rounded-full border border-black/10 transition-transform hover:scale-125 active:scale-95",
                                                colorThemes[themeName].circle,
                                                selectedTheme === themeName ? "ring-1.5 ring-slate-800 scale-110" : ""
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <h2 className="text-[10px] font-bold text-slate-800 leading-tight uppercase tracking-wider">
                                        {app.applicant_name}
                                    </h2>
                                    <p className="text-[7.5px] font-semibold text-slate-500 uppercase tracking-wider opacity-70">
                                        {app.position_title}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-black/5 rounded text-slate-800/60 hover:text-slate-900 transition-all active:scale-90"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Sticky Notes Canvas (Resizable Scroll List Area) */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pointer-events-auto">
                            {notes.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                                    <MessageSquare size={24} className="text-slate-700 mb-2" />
                                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">No Notes Posted</p>
                                </div>
                            ) : (
                                notes.map((note, idx) => {
                                    const colorsList: Array<keyof typeof colorThemes> = ['yellow', 'blue', 'green', 'pink', 'purple'];
                                    // Soft rotation for natural paper feel
                                    const rotation = idx % 2 === 0 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]';
                                    const noteTheme = colorThemes[colorsList[idx % colorsList.length]];

                                    return (
                                        <motion.div 
                                            key={note.id} 
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02, type: 'spring', damping: 18 }}
                                            className={cn(
                                                "p-3.5 rounded shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col relative transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
                                                noteTheme.bg, noteTheme.text, rotation
                                            )}
                                        >
                                            {/* Note top header line */}
                                            <div className="flex items-center justify-between border-b border-black/[0.04] pb-1.5 mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-4 h-4 rounded-full bg-black/5 flex items-center justify-center text-[9px] font-bold uppercase">
                                                        {note.author.charAt(0)}
                                                    </div>
                                                    <span className="text-[9px] font-bold tracking-wider uppercase opacity-75">{note.author}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-semibold uppercase tracking-wider opacity-55">
                                                        {new Date(note.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteNoteTrigger(note.id)}
                                                        className="p-0.5 hover:bg-black/5 rounded text-red-700/60 hover:text-red-800 transition-all active:scale-90"
                                                        title="Delete note"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Note content */}
                                            <p className="text-[12px] font-medium leading-relaxed whitespace-pre-wrap tracking-wide font-sans select-text">
                                                {note.text}
                                            </p>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>

                        {/* Interactive Notepad Writing Area - Seamlessly blended into note background */}
                        <div className="p-4 border-t border-black/[0.03] bg-black/[0.01] shrink-0 pointer-events-auto">
                            <form onSubmit={handleSubmit} className="relative flex gap-2">
                                <textarea
                                    ref={textareaRef}
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Write a new sticky note..."
                                    className={cn(
                                        "flex-1 border border-black/5 rounded-lg p-3 text-[12.5px] text-slate-800 outline-none min-h-[60px] max-h-[120px] resize-none transition-all placeholder:uppercase placeholder:text-[8px] placeholder:font-bold placeholder:tracking-widest shadow-sm select-text",
                                        activeTheme.inputBg, activeTheme.placeholder
                                    )}
                                />
                                <button
                                    type="submit"
                                    disabled={!newNote.trim()}
                                    className="self-end p-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                >
                                    <Send size={14} />
                                </button>
                            </form>
                            <div className="mt-2 text-center">
                                <span className="text-[7.5px] font-semibold text-slate-500 uppercase tracking-widest opacity-60">
                                    Enter to submit · Shift + Enter for new line
                                </span>
                            </div>
                        </div>

                        {/* Resize Handles (8 directions) */}
                        <div className="absolute top-0 left-0 w-full h-1 cursor-ns-resize z-[202]" onPointerDown={(e) => handleResizeMouseDown(e, 'n')} />
                        <div className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize z-[202]" onPointerDown={(e) => handleResizeMouseDown(e, 's')} />
                        <div className="absolute top-0 left-0 w-1 h-full cursor-ew-resize z-[202]" onPointerDown={(e) => handleResizeMouseDown(e, 'w')} />
                        <div className="absolute top-0 right-0 w-1 h-full cursor-ew-resize z-[202]" onPointerDown={(e) => handleResizeMouseDown(e, 'e')} />
                        <div className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-[203]" onPointerDown={(e) => handleResizeMouseDown(e, 'nw')} />
                        <div className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-[203]" onPointerDown={(e) => handleResizeMouseDown(e, 'ne')} />
                        <div className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-[203]" onPointerDown={(e) => handleResizeMouseDown(e, 'sw')} />
                        <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-[203]" onPointerDown={(e) => handleResizeMouseDown(e, 'se')} />

                        {/* Custom Animated Delete Confirmation Dialog Overlay */}
                        <AnimatePresence>
                            {deleteConfirmId && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-[205] flex items-center justify-center p-4 rounded-lg"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        className={cn(
                                            "border border-black/5 rounded-lg shadow-xl p-4 w-full max-w-[240px] flex flex-col items-center text-center gap-3 transition-colors duration-300",
                                            activeTheme.bg, activeTheme.text
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 shadow-sm">
                                            <Trash2 size={16} />
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider leading-tight">
                                                Delete Sticky?
                                            </h3>
                                            <p className="text-[9px] font-medium leading-relaxed uppercase tracking-wide mt-1 opacity-75">
                                                Are you sure you want to permanently delete this note?
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 w-full mt-1">
                                            <button
                                                onClick={() => setDeleteConfirmId(null)}
                                                className="flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider border border-black/10 bg-black/5 hover:bg-black/10 rounded transition-all active:scale-95 text-slate-800"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmDelete}
                                                className="flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded transition-all active:scale-95"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return ReactDOM.createPortal(portalContent, document.body);
}

