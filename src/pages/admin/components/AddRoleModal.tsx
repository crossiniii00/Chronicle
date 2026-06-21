import React from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertTriangle, Palette, Check } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { UserRole } from '@/types';
import { ROLE_ACCENTS } from '../hooks/useAccountTypeSettings';

type ColorKey = UserRole;

const ALLMIND_COLORS: Array<{ key: ColorKey; label: string; bg: string; border: string; glow: string }> = [
    { key: 'admin', label: 'Emerald Core', bg: 'bg-emerald-900', border: 'border-emerald-500', glow: '#10b981' },
    { key: 'super_admin', label: 'Cyan Matrix', bg: 'bg-cyan-900', border: 'border-cyan-500', glow: '#06b6d4' },
    { key: 'recruiter_s', label: 'Violet Neural', bg: 'bg-violet-900', border: 'border-violet-500', glow: '#8b5cf6' },
    { key: 'recruiter_a', label: 'Amber Synapse', bg: 'bg-amber-900', border: 'border-amber-500', glow: '#f59e0b' },
    { key: 'recruiter_jc', label: 'Rose Cortex', bg: 'bg-rose-900', border: 'border-rose-500', glow: '#f43f5e' },
    { key: 'recruiter_interviewer', label: 'Teal Circuit', bg: 'bg-teal-900', border: 'border-teal-500', glow: '#14b8a6' },
];

interface AddRoleModalProps {
    activeRoles: UserRole[];
    getLabel: (role: UserRole) => string;
    roleIcon: Record<UserRole, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>;
    colorOptions: Array<{ key: ColorKey; label: string; swatch: string }>;
    onClose: () => void;
    onAdd: (
        label: string,
        description: string,
        baseCopy: UserRole,
        color: ColorKey,
        roleType: string
    ) => void;
    allMindMode?: boolean;
}

export function AddRoleModal({
    activeRoles,
    getLabel,
    roleIcon,
    colorOptions,
    onClose,
    onAdd,
    allMindMode = false,
}: AddRoleModalProps) {
    const [newRoleLabel, setNewRoleLabel] = React.useState('');
    const [newRoleDescription, setNewRoleDescription] = React.useState('');
    const [newRoleBaseCopy, setNewRoleBaseCopy] = React.useState<UserRole>('recruiter_s');
    const [newRoleColor, setNewRoleColor] = React.useState<ColorKey>('admin');
    const [newRoleType, setNewRoleType] = React.useState<string>('recruiter');
    const [addRoleError, setAddRoleError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setNewRoleLabel('');
        setNewRoleDescription('');
        const defaultBase = activeRoles.find(r => r.startsWith('recruiter_')) || activeRoles[0] || 'recruiter_s';
        setNewRoleBaseCopy(defaultBase);
        setNewRoleColor('admin');
        setNewRoleType(allMindMode ? 'admin' : 'recruiter');
        setAddRoleError(null);
    }, [activeRoles, allMindMode]);

    const handleCreate = () => {
        const trimmedLabel = newRoleLabel.trim();
        if (!trimmedLabel) {
            setAddRoleError('Role name is required');
            return;
        }

        const isDuplicate = activeRoles.some(r => getLabel(r).toLowerCase() === trimmedLabel.toLowerCase());
        if (isDuplicate) {
            setAddRoleError(`An account type with name "${trimmedLabel}" already exists`);
            return;
        }

        onAdd(
            trimmedLabel,
            newRoleDescription.trim(),
            newRoleBaseCopy,
            newRoleColor,
            newRoleType
        );
    };

    return (
        <motion.div
            key="add-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
                "absolute inset-0 z-40 backdrop-blur-[1px] flex items-center justify-center p-6",
                allMindMode ? "bg-black/50" : "bg-surface-900/35"
            )}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn(
                    "w-full max-w-[480px] border shadow-xl rounded-sm",
                    allMindMode
                        ? "bg-[#0b0f19] border-emerald-500/30 text-emerald-400"
                        : "bg-white border-surface-200"
                )}
                onClick={e => e.stopPropagation()}
            >
                <div className={cn(
                    "px-5 py-4 border-b flex items-center gap-2.5",
                    allMindMode ? "border-emerald-500/20" : "border-surface-200"
                )}>
                    <div className={cn(
                        "w-7 h-7 rounded-sm flex items-center justify-center shrink-0",
                        allMindMode ? "bg-emerald-600 shadow-[0_0_8px_#10b981]" : "bg-surface-900"
                    )}>
                        <Plus size={13} className="text-white" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0">
                        <h3 className={cn(
                            "text-[13px] font-semibold tracking-[-0.005em] leading-none",
                            allMindMode ? "text-emerald-400 font-mono tracking-widest uppercase" : "text-surface-900"
                        )}>
                            {allMindMode ? "New Directive Node" : "Add custom account type"}
                        </h3>
                        <p className={cn(
                            "text-[10.5px] font-medium tracking-[-0.005em] mt-1.5",
                            allMindMode ? "text-emerald-600 font-mono" : "text-surface-500"
                        )}>
                            {allMindMode
                                ? "Initialize a new processing node with inherited directives"
                                : "Create a dynamic, custom role with tailored permissions"}
                        </p>
                    </div>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <div>
                        <label className={cn(
                            "block text-[10.5px] font-semibold tracking-[-0.005em] mb-1.5",
                            allMindMode ? "text-emerald-500 font-mono" : "text-surface-700"
                        )}>
                            {allMindMode ? "Node designation" : "Role name"}
                        </label>
                        <input
                            type="text"
                            value={newRoleLabel}
                            onChange={e => { setNewRoleLabel(e.target.value); setAddRoleError(null); }}
                            maxLength={48}
                            placeholder={allMindMode ? "e.g. Cortex Validator" : "e.g. Senior Validator"}
                            className={cn(
                                "w-full px-3 h-8 border rounded-sm text-[12px] font-medium focus:outline-none focus:ring-1 transition-all",
                                addRoleError
                                    ? allMindMode
                                        ? "border-rose-500/50 bg-rose-950/20 text-rose-400 placeholder-rose-800 focus:border-rose-500 focus:ring-rose-500/20"
                                        : "border-rose-300 bg-white text-surface-900 placeholder-surface-400 focus:border-rose-500 focus:ring-rose-200"
                                    : allMindMode
                                        ? "bg-black border-emerald-500/20 text-emerald-400 placeholder-emerald-800 font-mono focus:border-emerald-500 focus:ring-emerald-500/20"
                                        : "bg-white border-surface-200 text-surface-900 placeholder-surface-400 focus:border-[#0078d4] focus:ring-[#0078d4]/20"
                            )}
                        />
                        {addRoleError && (
                            <p className={cn(
                                "text-[10px] font-medium tracking-[-0.005em] mt-1.5 flex items-center gap-1",
                                allMindMode ? "text-rose-400" : "text-rose-600"
                            )}>
                                <AlertTriangle size={10} strokeWidth={2.25} />
                                {addRoleError}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className={cn(
                            "block text-[10.5px] font-semibold tracking-[-0.005em] mb-1.5",
                            allMindMode ? "text-emerald-500 font-mono" : "text-surface-700"
                        )}>
                            {allMindMode ? "Directive summary" : "Description"}
                        </label>
                        <textarea
                            value={newRoleDescription}
                            onChange={e => setNewRoleDescription(e.target.value)}
                            maxLength={140}
                            rows={2}
                            placeholder={allMindMode ? "Primary function of this processing node" : "Description of the role's primary function"}
                            className={cn(
                                "w-full px-3 py-2 border rounded-sm text-[12px] font-medium focus:outline-none focus:ring-1 transition-all resize-none",
                                allMindMode
                                    ? "bg-black border-emerald-500/20 text-emerald-400 placeholder-emerald-800 font-mono focus:border-emerald-500 focus:ring-emerald-500/20"
                                    : "bg-white border-surface-200 text-surface-900 placeholder-surface-400 focus:border-[#0078d4] focus:ring-[#0078d4]/20"
                            )}
                        />
                        <p className={cn(
                            "text-[9.5px] font-medium tracking-[-0.005em] mt-1 tabular-nums text-right",
                            allMindMode ? "text-emerald-700 font-mono" : "text-surface-400"
                        )}>
                            {newRoleDescription.length}/140
                        </p>
                    </div>
                    <div>
                        <label className={cn(
                            "block text-[10.5px] font-semibold tracking-[-0.005em] mb-1.5",
                            allMindMode ? "text-emerald-500 font-mono" : "text-surface-700"
                        )}>
                            {allMindMode ? "Node classification" : "Account label"}
                        </label>
                        <select
                            value={newRoleType}
                            onChange={e => setNewRoleType(e.target.value)}
                            className={cn(
                                "w-full px-2.5 h-8 border rounded-sm text-[11px] font-semibold focus:outline-none transition-all",
                                allMindMode
                                    ? "bg-black border-emerald-500/20 text-emerald-400 font-mono focus:border-emerald-500"
                                    : "bg-white border-surface-200 text-surface-800 focus:border-[#0078d4]"
                            )}
                        >
                            {allMindMode ? (
                                <>
                                    <option value="admin">Core</option>
                                </>
                            ) : (
                                <>
                                    <option value="recruiter">Recruiter</option>
                                    <option value="ops_validator">Ops Val</option>
                                    <option value="admin">Admin</option>
                                </>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className={cn(
                            "block text-[10.5px] font-semibold tracking-[-0.005em] mb-1.5",
                            allMindMode ? "text-emerald-500 font-mono" : "text-surface-700"
                        )}>
                            {allMindMode ? "Inherit directives from" : "Copy permissions from"}
                        </label>
                        <select
                            value={newRoleBaseCopy}
                            onChange={e => setNewRoleBaseCopy(e.target.value as UserRole)}
                            className={cn(
                                "w-full px-2.5 h-8 border rounded-sm text-[11px] font-semibold focus:outline-none transition-all",
                                allMindMode
                                    ? "bg-black border-emerald-500/20 text-emerald-400 font-mono focus:border-emerald-500"
                                    : "bg-white border-surface-200 text-surface-800 focus:border-[#0078d4]"
                            )}
                        >
                            {activeRoles.map(role => (
                                <option key={role} value={role}>{getLabel(role)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={cn(
                            "text-[10.5px] font-semibold tracking-[-0.005em] mb-1.5 flex items-center gap-1.5",
                            allMindMode ? "text-emerald-500 font-mono" : "text-surface-700"
                        )}>
                            <Palette size={11} strokeWidth={2.25} />
                            {allMindMode ? "Signal color" : "Accent color swatch"}
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {allMindMode ? (
                                ALLMIND_COLORS.map(opt => {
                                    const isActive = newRoleColor === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            onClick={() => setNewRoleColor(opt.key)}
                                            title={opt.label}
                                            className={cn(
                                                "w-7 h-7 rounded-sm flex items-center justify-center transition-all border",
                                                opt.bg,
                                                isActive
                                                    ? `${opt.border} ring-2 ring-offset-1 ring-offset-[#0b0f19] ring-emerald-500 shadow-[0_0_6px_${opt.glow}]`
                                                    : "border-emerald-950 hover:border-emerald-600"
                                            )}
                                        >
                                            {isActive && <Check size={12} className="text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]" strokeWidth={3} />}
                                        </button>
                                    );
                                })
                            ) : (
                                colorOptions.map(opt => {
                                    const swatch = ROLE_ACCENTS[opt.key];
                                    const isActive = newRoleColor === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            onClick={() => setNewRoleColor(opt.key)}
                                            title={opt.label}
                                            className={cn(
                                                "w-7 h-7 rounded-sm flex items-center justify-center transition-all border",
                                                isActive
                                                    ? `${swatch.bg} ${swatch.border} ring-2 ring-offset-1 ring-[#0078d4]`
                                                    : `${swatch.bg} border-surface-200 hover:border-surface-300`
                                            )}
                                        >
                                            {isActive && <Check size={12} className={swatch.text} strokeWidth={3} />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
                <div className={cn(
                    "px-5 py-3 border-t flex items-center justify-end gap-2",
                    allMindMode ? "border-emerald-500/20 bg-black/30" : "border-surface-200 bg-surface-50/30"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-3 h-7 text-[11px] font-semibold transition-all rounded-sm",
                            allMindMode
                                ? "text-emerald-500 bg-black border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-950/20"
                                : "text-surface-600 bg-white border border-surface-200 hover:border-surface-300 hover:bg-surface-50"
                        )}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-7 text-[11px] font-semibold tracking-[-0.005em] transition-all rounded-sm",
                            allMindMode
                                ? "bg-emerald-600 text-neutral-950 hover:bg-emerald-500 shadow-[0_0_10px_#10b981]"
                                : "bg-black text-white hover:bg-black/85"
                        )}
                    >
                        <Plus size={11} strokeWidth={3} />
                        {allMindMode ? "Initialize node" : "Create role"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
