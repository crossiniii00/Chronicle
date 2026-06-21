import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Archive, ArchiveRestore } from 'lucide-react';

interface ConfirmActionModalProps {
    type: 'delete' | 'archive' | 'restore';
    roleLabel: string;
    onClose: () => void;
    onConfirm: () => void;
}

export function ConfirmActionModal({
    type,
    roleLabel,
    onClose,
    onConfirm,
}: ConfirmActionModalProps) {
    let Icon = Trash2;
    let bgIconClass = 'bg-rose-50 border border-rose-200';
    let iconClass = 'text-rose-600';
    let title = '';
    let description = '';
    let confirmBtnText = '';
    let confirmBtnBg = 'bg-rose-600 hover:bg-rose-700';

    if (type === 'delete') {
        Icon = Trash2;
        bgIconClass = 'bg-rose-50 border border-rose-200';
        iconClass = 'text-rose-600';
        title = `Delete "${roleLabel}"?`;
        description = `This will permanently delete the custom account type "${roleLabel}". This action cannot be undone. Users currently assigned to this role should be reassigned.`;
        confirmBtnText = 'Delete type';
    } else if (type === 'archive') {
        Icon = Archive;
        bgIconClass = 'bg-rose-50 border border-rose-200';
        iconClass = 'text-rose-600';
        title = `Archive "${roleLabel}"?`;
        description = `Archived account types are hidden from the role selector and won't appear in this settings list. Existing users keep their access — you can restore this type at any time.`;
        confirmBtnText = 'Archive type';
    } else if (type === 'restore') {
        Icon = ArchiveRestore;
        bgIconClass = 'bg-emerald-50 border border-emerald-200';
        iconClass = 'text-emerald-600';
        title = `Restore "${roleLabel}"?`;
        description = `This will move the account type back to the active list and make it available in the role selector again. Its previous module permissions are preserved.`;
        confirmBtnText = 'Restore type';
        confirmBtnBg = 'bg-emerald-600 hover:bg-emerald-700';
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-40 bg-surface-900/35 backdrop-blur-[1px] flex items-center justify-center p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full max-w-[420px] bg-white border border-surface-200 shadow-xl rounded-sm"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 pt-5 pb-3 flex flex-col items-center text-center">
                    <div className={`w-11 h-11 rounded-sm flex items-center justify-center mb-3 ${bgIconClass}`}>
                        <Icon size={20} className={iconClass} strokeWidth={2} />
                    </div>
                    <h3 className="text-[14px] font-semibold text-surface-900 tracking-[-0.005em]">{title}</h3>
                    <p className="text-[11.5px] font-medium text-surface-600 tracking-[-0.005em] mt-2 max-w-[320px] leading-relaxed">
                        {description}
                    </p>
                </div>
                <div className="px-5 py-3 border-t border-surface-200 bg-surface-50/30 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 h-7 text-[11px] font-semibold text-surface-600 bg-white border border-surface-200 hover:border-surface-300 hover:bg-surface-50 transition-all rounded-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex items-center gap-1.5 px-3 h-7 text-white text-[11px] font-semibold tracking-[-0.005em] transition-all rounded-sm ${confirmBtnBg}`}
                    >
                        <Icon size={12} strokeWidth={2.25} />
                        {confirmBtnText}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
