import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, AlertTriangle, Palette, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { UserRole } from '@/types';
import {
    ROLE_ACCENTS,
    DEFAULT_LABELS,
    ROLE_DESCRIPTIONS,
    DEFAULT_COLORS
} from '../hooks/useAccountTypeSettings';

type ColorKey = UserRole;

interface EditRoleModalProps {
    editingRole: UserRole;
    initialLabel: string;
    initialDescription: string;
    initialColor: ColorKey;
    activeRoles: UserRole[];
    customRoles: string[];
    getLabel: (role: UserRole) => string;
    getEffectiveAccent: (role: UserRole, override?: ColorKey) => typeof ROLE_ACCENTS[UserRole];
    roleIcon: Record<UserRole, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>;
    colorOptions: Array<{ key: ColorKey; label: string; swatch: string }>;
    onClose: () => void;
    onApply: (label: string, description: string, color: ColorKey) => void;
}

export function EditRoleModal({
    editingRole,
    initialLabel,
    initialDescription,
    initialColor,
    activeRoles,
    customRoles,
    getLabel,
    getEffectiveAccent,
    roleIcon,
    colorOptions,
    onClose,
    onApply,
}: EditRoleModalProps) {
    const [editLabel, setEditLabel] = React.useState(initialLabel);
    const [editDescription, setEditDescription] = React.useState(initialDescription);
    const [editColor, setEditColor] = React.useState<ColorKey>(initialColor);
    const [editLabelError, setEditLabelError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setEditLabel(initialLabel);
        setEditDescription(initialDescription);
        setEditColor(initialColor);
        setEditLabelError(null);
    }, [editingRole, initialLabel, initialDescription, initialColor]);

    const handleApply = () => {
        const trimmed = editLabel.trim();
        if (!trimmed) {
            setEditLabelError('Label is required');
            return;
        }
        const duplicate = activeRoles.find(
            r => r !== editingRole && getLabel(r).toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
            setEditLabelError(`Another active type already uses "${trimmed}"`);
            return;
        }
        onApply(trimmed, editDescription.trim(), editColor);
    };

    const resetToDefault = () => {
        const isCustom = customRoles.includes(editingRole);
        setEditLabel(isCustom ? '' : DEFAULT_LABELS[editingRole as UserRole] || '');
        setEditDescription(isCustom ? '' : ROLE_DESCRIPTIONS[editingRole as UserRole] || '');
        setEditColor(isCustom ? 'admin' : DEFAULT_COLORS[editingRole as UserRole] || 'admin');
        setEditLabelError(null);
    };

    const Icon = roleIcon[editingRole] || roleIcon.admin;

    return (
        <motion.div
            key="edit-overlay"
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
                className="w-full max-w-[480px] bg-white dark:bg-slate-900 border border-surface-200 shadow-xl rounded-none"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-surface-200 flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-surface-900 rounded-none flex items-center justify-center shrink-0">
                        <Pencil size={13} className="text-white" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold text-surface-900 tracking-[-0.005em] leading-none">Edit account type</h3>
                        <p className="text-[10.5px] font-medium text-surface-500 tracking-[-0.005em] mt-1.5">
                            Customise label, description, and accent color for this role
                        </p>
                    </div>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <div>
                        <label className="block text-[10.5px] font-semibold text-surface-700 tracking-[-0.005em] mb-1.5">
                            Display label
                        </label>
                        <input
                            type="text"
                            value={editLabel}
                            onChange={e => { setEditLabel(e.target.value); setEditLabelError(null); }}
                            maxLength={48}
                            placeholder="e.g. Senior Recruiter"
                            className={cn(
                                "w-full px-3 h-8 bg-white dark:bg-slate-900 border rounded-none text-[12px] font-medium text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-1 transition-all",
                                editLabelError
                                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
                                    : "border-surface-200 focus:border-[#0078d4] focus:ring-[#0078d4]/20"
                            )}
                        />
                        {editLabelError && (
                            <p className="text-[10px] font-medium text-rose-600 tracking-[-0.005em] mt-1.5 flex items-center gap-1">
                                <AlertTriangle size={10} strokeWidth={2.25} />
                                {editLabelError}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10.5px] font-semibold text-surface-700 tracking-[-0.005em] mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            maxLength={140}
                            rows={2}
                            placeholder="Short role description shown beneath the title"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-surface-200 rounded-none text-[12px] font-medium text-surface-900 placeholder-surface-400 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]/20 transition-all resize-none"
                        />
                        <p className="text-[9.5px] font-medium text-surface-400 tracking-[-0.005em] mt-1 tabular-nums text-right">
                            {editDescription.length}/140
                        </p>
                    </div>
                    <div>
                        <label className="text-[10.5px] font-semibold text-surface-700 tracking-[-0.005em] mb-1.5 flex items-center gap-1.5">
                            <Palette size={11} strokeWidth={2.25} />
                            Accent color
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {colorOptions.map(opt => {
                                const swatch = ROLE_ACCENTS[opt.key];
                                const isActive = editColor === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        onClick={() => setEditColor(opt.key)}
                                        title={opt.label}
                                        className={cn(
                                            "w-7 h-7 rounded-none flex items-center justify-center transition-all border",
                                            swatch.bg,
                                            isActive
                                                ? `${swatch.border} ring-2 ring-offset-1 ring-[#0078d4]`
                                                : "border-surface-200 hover:border-surface-300"
                                        )}
                                    >
                                        {isActive && <Check size={12} className={swatch.text} strokeWidth={3} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface-50/50 border border-surface-200 rounded-none">
                        <div className={cn("w-8 h-8 rounded-none flex items-center justify-center", getEffectiveAccent(editingRole, editColor).chip)}>
                            <Icon size={14} className={getEffectiveAccent(editingRole, editColor).text} strokeWidth={2.25} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11.5px] font-semibold text-surface-900 tracking-[-0.005em] truncate">
                                {editLabel || 'Label preview'}
                            </p>
                            <p className="text-[10px] font-medium text-surface-500 tracking-[-0.005em] truncate mt-0.5">
                                {editDescription || 'Description preview'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="px-5 py-3 border-t border-surface-200 bg-surface-50/30 flex items-center justify-between gap-2">
                    <button
                        onClick={resetToDefault}
                        className="flex items-center gap-1 text-[10.5px] font-semibold text-surface-500 hover:text-surface-700 transition-colors"
                    >
                        <RotateCcw size={11} strokeWidth={2.25} />
                        Reset to default
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 h-7 text-[11px] font-semibold text-surface-600 bg-white dark:bg-slate-900 border border-surface-200 hover:border-surface-300 hover:bg-surface-50 transition-all rounded-none"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex items-center gap-1.5 px-3 h-7 bg-black text-white text-[11px] font-semibold tracking-[-0.005em] hover:bg-black/85 transition-all rounded-none"
                        >
                            <Check size={11} strokeWidth={3} />
                            Apply changes
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
