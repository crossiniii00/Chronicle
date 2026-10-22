import React, { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
    className?: string;
    dark?: boolean;
    headerClassName?: string;
    closeButtonClassName?: string;
    overlayHeader?: boolean;
    closeOnOverlayClick?: boolean;
    overflowVisible?: boolean;
}

export function Modal({ 
    open, 
    onClose, 
    title, 
    children, 
    size = 'md', 
    className, 
    dark = false,
    headerClassName,
    closeButtonClassName,
    overlayHeader = false,
    closeOnOverlayClick = false,
    overflowVisible = false
}: ModalProps) {
    if (!open) return null;

    const sizeClass = { 
        sm: 'max-w-sm', 
        md: 'max-w-md', 
        lg: 'max-w-2xl', 
        xl: 'max-w-4xl',
        '2xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        full: 'max-w-[95vw] h-[95vh]'
    }[size];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8" onClick={closeOnOverlayClick ? onClose : undefined}>
            <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-surface-900/20 to-black/25 backdrop-blur-[3px] transition-opacity" />
            <div
                className={cn(
                    'relative rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col animate-fade-in transition-all ring-1 ring-black/5',
                    overflowVisible ? 'overflow-visible' : 'overflow-hidden',
                    dark ? 'bg-surface-900 border border-white/10 text-white' : 'bg-white dark:bg-slate-900 border border-surface-200',
                    sizeClass,
                    className
                )}
                onClick={e => e.stopPropagation()}
            >
                {title && (
                    <div className={cn(
                        'flex items-center justify-between px-8 py-6 shrink-0',
                        overlayHeader ? 'absolute top-0 left-0 right-0 z-30' : '',
                        headerClassName ? headerClassName : (dark ? 'bg-white/5 dark:bg-slate-900/5 border-b border-white/10' : 'bg-white dark:bg-slate-900 border-b border-surface-50')
                    )}>
                        <h2 className={cn(
                            'text-[15px] font-semibold tracking-tight',
                            dark ? 'text-white' : 'text-surface-900'
                        )}>{title}</h2>
                        <button
                            onClick={onClose}
                            className={cn(
                                'p-2 rounded-none transition-colors border border-transparent',
                                closeButtonClassName || (dark ? 'hover:bg-white/10 dark:hover:bg-slate-900/10 text-white/40 hover:text-white' : 'hover:bg-surface-100 text-surface-400 hover:text-surface-900')
                            )}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
                <div className={cn(
                    overflowVisible ? 'flex-1' : 'overflow-y-auto custom-scrollbar flex-1',
                    title ? 'p-10' : ''
                )}>{children}</div>
            </div>
        </div>,
        document.body
    );
}

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: ReactNode;
    message?: string;
    confirmText?: string;
    confirmClass?: string;
    loading?: boolean;
    dark?: boolean;
    children?: ReactNode;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmClass = 'bg-primary-600 hover:bg-primary-700', loading, dark = false, children }: ConfirmDialogProps) {
    return (
        <Modal open={open} onClose={onClose} title={title} size="sm" dark={dark}>
            {message && <p className={cn(
                "mb-8 leading-relaxed text-[14px] font-medium",
                dark ? "text-white/60" : "text-surface-600"
            )}>{message}</p>}
            {children && <div className="mb-8">{children}</div>}
            
            {/* Progress Bar */}
            {loading && (
                <div className="mb-8">
                    <div className="w-full bg-surface-100 rounded-none h-1.5 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                            className="h-full bg-primary-600"
                        />
                    </div>
                    <p className="text-[11px] text-surface-400 mt-2 text-center font-medium">Processing request...</p>
                </div>
            )}
            
            <div className="flex gap-3 justify-end pt-4">
                <button 
                    onClick={onClose} 
                    disabled={loading}
                    className={cn(
                        "px-6 py-2.5 rounded-none transition-all text-[11px] font-black uppercase tracking-widest disabled:opacity-50",
                        dark ? "bg-transparent border border-white/20 text-white/40 hover:text-white hover:border-white" : "bg-white dark:bg-slate-900 border border-surface-200 text-surface-600 hover:text-surface-900 hover:bg-surface-50"
                    )}
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={cn(
                        "px-8 py-2.5 rounded-none text-white text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 border",
                        confirmClass
                    )}
                >
                    {loading ? 'Processing...' : confirmText}
                </button>
            </div>
        </Modal>
    );
}
