import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/utils/apiClient';
import { DepartmentService, Department } from '@/services/DepartmentService';
/* eslint-disable react-refresh/only-export-components */
import {
    Sliders, RotateCcw, Check, Search, ShieldCheck,
    Layers, Lock, Unlock, Users, Users2, HardHat, Crown, Briefcase,
    Building2, FileText, GraduationCap, Calendar, DoorOpen,
    Monitor, CreditCard, UserPlus, BookOpen, Mail,
    Activity, Database, BarChart3, ShieldAlert,
    Network, User as UserIcon, X, CheckSquare, Square,
    Pencil, Trash2, Archive, ArchiveRestore, Smile,
    ChevronDown, MessageSquare
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { UserRole } from '@/types';
import { EditRoleModal } from './EditRoleModal';
import { AddRoleModal } from './AddRoleModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import {
    ACCOUNT_TYPE_ORDER,
    DEFAULT_COLORS,
    DEFAULT_LABELS,
    ROLE_ACCENTS,
    ROLE_DESCRIPTIONS,
    notifyAccountTypeSettingsChanged,
    loadSettings,
    DEFAULT_PERMISSIONS,
    STORAGE_KEY,
    type PermissionsMap
} from '../hooks/useAccountTypeSettings';
import {
    PERMISSIONABLE_MODULES,
    CATEGORIES,
    COLOR_OPTIONS,
    getEffectiveAccent,
    ROLE_ICON,
    SPRING,
    getModuleColorClass,
    type ColorKey,
    type ModulePermission
} from './userSettingsConfig';

import { AllMindOversight } from './AllMindOversight';

const ALL_MIND_CATEGORIES = [
    { id: 'command_center', label: 'Command Center', icon: Activity },
    { id: 'traffic', label: 'Traffic Monitor', icon: Network },
    { id: 'login_audit', label: 'Login Audit', icon: ShieldAlert },
    { id: 'session_control', label: 'Session Control', icon: Monitor },
];

interface UserSettingsModalProps {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export function UserSettingsModal({ open, onClose, onSaved }: UserSettingsModalProps) {
    const [permissions, setPermissions] = React.useState<PermissionsMap>(DEFAULT_PERMISSIONS);
    const [customLabels, setCustomLabels] = React.useState<Record<UserRole, string>>({ ...DEFAULT_LABELS });
    const [customDescriptions, setCustomDescriptions] = React.useState<Record<UserRole, string>>({ ...ROLE_DESCRIPTIONS });
    const [customColors, setCustomColors] = React.useState<Record<UserRole, ColorKey>>({ ...DEFAULT_COLORS });
    const [archivedRoles, setArchivedRoles] = React.useState<Set<UserRole>>(new Set());
    const [customRoles, setCustomRoles] = React.useState<string[]>([]);
    const [selectedRole, setSelectedRole] = React.useState<UserRole>('admin');
    const [bulkMode, setBulkMode] = React.useState<boolean>(false);
    const [bulkSelected, setBulkSelected] = React.useState<Set<UserRole>>(new Set());
    const [search, setSearch] = React.useState<string>('');
    const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
    const [savedAt, setSavedAt] = React.useState<string | null>(null);
    const [editingRole, setEditingRole] = React.useState<UserRole | null>(null);
    const [deletingRole, setDeletingRole] = React.useState<UserRole | null>(null);
    const [restoringRole, setRestoringRole] = React.useState<UserRole | null>(null);
    const [showArchived, setShowArchived] = React.useState<boolean>(false);
    const [customRoleTypes, setCustomRoleTypes] = React.useState<Record<string, string>>({});

    // State for opening new custom role dialog
    const [isAddRoleOpen, setIsAddRoleOpen] = React.useState(false);
    const [subTab, setSubTab] = React.useState<'regular' | 'special'>('regular');

    const [showSuccess, setShowSuccess] = React.useState<boolean>(false);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = React.useState<boolean>(false);
    const [allMindMode, setAllMindMode] = React.useState<boolean>(false);
    const [showAllMindAuth, setShowAllMindAuth] = React.useState<boolean>(false);
    const [allMindPassword, setAllMindPassword] = React.useState<string>('');
    const [allMindAuthError, setAllMindAuthError] = React.useState<boolean>(false);
    const allMindPasswordRef = React.useRef<HTMLInputElement>(null);
    const [departments, setDepartments] = React.useState<Department[]>([]);

    React.useEffect(() => {
        if (open) {
            DepartmentService.getAll()
                .then(setDepartments)
                .catch(err => console.error("Error loading departments:", err));
        }
    }, [open]);

    React.useEffect(() => {
        if (open) {
            const s = loadSettings();
            setPermissions(s.permissions);
            setCustomLabels(s.labels as Record<UserRole, string>);
            setCustomDescriptions(s.descriptions as Record<UserRole, string>);
            setCustomColors(s.colors as Record<UserRole, ColorKey>);
            setCustomRoles(s.customRoles || []);
            setCustomRoleTypes(s.roleTypes || {});
            const archived = new Set(s.archived as UserRole[]);
            setArchivedRoles(archived);
            const active = [...ACCOUNT_TYPE_ORDER, ...(s.customRoles || [])].filter(r => !archived.has(r));
            setSelectedRole(active[0] ?? 'admin');
            setSubTab('regular');
            setBulkMode(false);
            setBulkSelected(new Set());
            setSearch('');
            setSelectedCategory('All');
            setEditingRole(null);
            setDeletingRole(null);
            setRestoringRole(null);
            setShowArchived(archived.size > 0);
            setShowSuccess(false);
            setIsRoleDropdownOpen(false);
            setAllMindMode(false);
        }
    }, [open]);

    React.useEffect(() => {
        if (allMindMode) {
            setSelectedCategory('command_center');
        } else {
            setSelectedCategory('All');
        }
    }, [allMindMode]);

    const activeRoles = React.useMemo<UserRole[]>(() => {
        if (allMindMode) {
            return ['admin', 'super_admin'];
        }
        return [...ACCOUNT_TYPE_ORDER, ...customRoles].filter(r => !archivedRoles.has(r));
    }, [archivedRoles, customRoles, allMindMode]);

    const archivedList = React.useMemo<UserRole[]>(() => {
        if (allMindMode) return [];
        return [...ACCOUNT_TYPE_ORDER, ...customRoles].filter(r => archivedRoles.has(r));
    }, [archivedRoles, customRoles, allMindMode]);

    const getLabel = React.useCallback((role: UserRole): string => {
        if (allMindMode) {
            if (role === 'admin') return 'ALLMIND Core';
            if (role === 'super_admin') return 'ALLMIND Integrator';
        }
        return customLabels[role] || DEFAULT_LABELS[role as UserRole] || String(role);
    }, [customLabels, allMindMode]);

    const getDescription = React.useCallback((role: UserRole): string => {
        if (allMindMode) {
            if (role === 'admin') return 'Central processing unit for ALLMIND operations';
            if (role === 'super_admin') return 'Direct command module for system integrations';
        }
        return customDescriptions[role] || ROLE_DESCRIPTIONS[role as UserRole] || '';
    }, [customDescriptions, allMindMode]);

    const getAccent = React.useCallback((role: UserRole): typeof ROLE_ACCENTS[UserRole] => {
        if (allMindMode) {
            return {
                bg: 'bg-emerald-950/40',
                text: 'text-emerald-400',
                dot: 'bg-emerald-500',
                border: 'border-emerald-500/40',
                chip: 'bg-emerald-900 text-emerald-300',
                table: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20',
                ring: 'ring-emerald-500/20'
            };
        }
        return getEffectiveAccent(role, customColors[role]);
    }, [customColors, allMindMode]);

    const allMindModules = React.useMemo<ModulePermission[]>(() => [
        { id: 'allmind_core', label: 'ALLMIND Core System', description: 'Primary thinking engine and thought nodes routing', group: 'System', icon: Activity },
        { id: 'allmind_sensory', label: 'Sensory Feeds', description: 'Process input logs and environmental telemetry', group: 'Overview', icon: Layers },
        { id: 'allmind_integration', label: 'Integrator Directives', description: 'System-wide overrides and command inputs', group: 'System', icon: ShieldAlert }
    ], []);

    const visibleModules = React.useMemo(() => {
        let list = allMindMode ? allMindModules : PERMISSIONABLE_MODULES;
        if (selectedCategory !== 'All') {
            list = list.filter(m => m.group === selectedCategory);
        }
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter(m =>
            m.label.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.group.toLowerCase().includes(q)
        );
    }, [search, selectedCategory, allMindMode, allMindModules]);

    const groupedModules = React.useMemo(() => {
        const groups: Record<string, ModulePermission[]> = {};
        visibleModules.forEach(m => {
            if (!groups[m.group]) groups[m.group] = [];
            groups[m.group].push(m);
        });
        return groups;
    }, [visibleModules]);

    const targetRoles = React.useMemo<UserRole[]>(() => {
        if (!bulkMode) return [selectedRole];
        if (bulkSelected.size === 0) return [selectedRole];
        return [...ACCOUNT_TYPE_ORDER, ...customRoles].filter(r => bulkSelected.has(r) && !archivedRoles.has(r));
    }, [bulkMode, bulkSelected, selectedRole, archivedRoles, customRoles]);

    const enabledCountForRole = React.useCallback((role: UserRole): number => {
        const p = permissions[role];
        if (!p) return 0;
        return Object.values(p).filter(Boolean).length;
    }, [permissions]);

    const totalModules = PERMISSIONABLE_MODULES.length;

    const togglePermission = (moduleId: string) => {
        if (bulkMode && bulkSelected.size === 0) return;
        setPermissions(prev => {
            const next: PermissionsMap = { ...prev };
            const currentValue = prev[selectedRole]?.[moduleId] ?? false;
            const newValue = !currentValue;
            targetRoles.forEach(role => {
                next[role] = { ...prev[role], [moduleId]: newValue };
            });
            return next;
        });
        setSavedAt(null);
    };

    const toggleBulkRole = (role: UserRole) => {
        setBulkSelected(prev => {
            const next = new Set(prev);
            if (next.has(role)) next.delete(role);
            else next.add(role);
            return next;
        });
    };

    const resetRole = (role: UserRole) => {
        setPermissions(prev => ({
            ...prev,
            [role]: { ...DEFAULT_PERMISSIONS[role] }
        }));
        setSavedAt(null);
    };

    const resetAll = () => {
        setPermissions({ ...DEFAULT_PERMISSIONS });
        setSavedAt(null);
    };

    const enableAllForTarget = () => {
        setPermissions(prev => {
            const next: PermissionsMap = { ...prev };
            targetRoles.forEach(role => {
                next[role] = PERMISSIONABLE_MODULES.reduce<Record<string, boolean>>((acc, m) => {
                    acc[m.id] = true;
                    return acc;
                }, {});
            });
            return next;
        });
        setSavedAt(null);
    };

    const disableAllForTarget = () => {
        setPermissions(prev => {
            const next: PermissionsMap = { ...prev };
            targetRoles.forEach(role => {
                next[role] = PERMISSIONABLE_MODULES.reduce<Record<string, boolean>>((acc, m) => {
                    acc[m.id] = false;
                    return acc;
                }, {});
            });
            return next;
        });
        setSavedAt(null);
    };

    const handleSave = async () => {
        const payload = {
            permissions,
            labels: customLabels,
            descriptions: customDescriptions,
            colors: customColors,
            archived: Array.from(archivedRoles),
            customRoles: customRoles,
            roleTypes: customRoleTypes,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        try {
            await apiClient.post('/report-configs/account_type_settings', payload);
        } catch (err) {
            console.error('[AccountTypeSettings] Error saving settings to database:', err);
        }
        notifyAccountTypeSettingsChanged();
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setSavedAt(`${hh}:${mm}`);
        setShowSuccess(true);
        onSaved?.();
    };

    const applyEdit = (label: string, description: string, color: ColorKey) => {
        if (!editingRole) return;
        setCustomLabels(prev => ({ ...prev, [editingRole]: label }));
        setCustomDescriptions(prev => ({ ...prev, [editingRole]: description }));
        setCustomColors(prev => ({ ...prev, [editingRole]: color }));
        setSavedAt(null);
        setEditingRole(null);
    };

    const handleAddRole = (
        label: string,
        description: string,
        baseCopy: UserRole,
        color: ColorKey,
        roleType: string
    ) => {
        const timestamp = Date.now();
        const roleKey = `custom_${timestamp}`;

        const basePermissions = permissions[baseCopy] || {};

        setCustomRoles(prev => [...prev, roleKey]);
        setCustomRoleTypes(prev => ({
            ...prev,
            [roleKey]: roleType
        }));
        setPermissions(prev => ({
            ...prev,
            [roleKey]: { ...basePermissions }
        }));
        setCustomLabels(prev => ({
            ...prev,
            [roleKey]: label
        }));
        setCustomDescriptions(prev => ({
            ...prev,
            [roleKey]: description
        }));
        setCustomColors(prev => ({
            ...prev,
            [roleKey]: color
        }));

        setSelectedRole(roleKey);
        setSavedAt(null);
        setIsAddRoleOpen(false);
    };

    const archiveRole = (role: UserRole) => {
        if (role === 'admin') return;
        const isCustom = customRoles.includes(role);

        if (isCustom) {
            setCustomRoles(prev => prev.filter(r => r !== role));
            setCustomRoleTypes(prev => {
                const next = { ...prev };
                delete next[role];
                return next;
            });
            setPermissions(prev => {
                const next = { ...prev };
                delete next[role];
                return next;
            });
            setCustomLabels(prev => {
                const next = { ...prev };
                delete next[role];
                return next;
            });
            setCustomDescriptions(prev => {
                const next = { ...prev };
                delete next[role];
                return next;
            });
            setCustomColors(prev => {
                const next = { ...prev };
                delete next[role];
                return next;
            });
            setArchivedRoles(prev => {
                const next = new Set(prev);
                next.delete(role);
                return next;
            });
        } else {
            setArchivedRoles(prev => {
                const next = new Set(prev);
                next.add(role);
                return next;
            });
        }

        setBulkSelected(prev => {
            if (!prev.has(role)) return prev;
            const next = new Set(prev);
            next.delete(role);
            return next;
        });
        setDeletingRole(null);
        if (selectedRole === role) {
            const remaining = [...ACCOUNT_TYPE_ORDER, ...customRoles].filter(r => r !== role && !archivedRoles.has(r) && (isCustom ? r !== role : true));
            setSelectedRole(remaining[0] ?? 'admin');
        }
        setSavedAt(null);
    };

    const restoreRole = (role: UserRole) => {
        setArchivedRoles(prev => {
            const next = new Set(prev);
            next.delete(role);
            return next;
        });
        setRestoringRole(null);
        setSavedAt(null);
    };

    const currentRole = permissions[selectedRole];
    const currentRoleEnabled = currentRole ? Object.values(currentRole).filter(Boolean).length : 0;
    const bulkTargetsLabel = bulkMode && bulkSelected.size > 0
        ? `${bulkSelected.size} account types`
        : getLabel(selectedRole);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8" onClick={onClose}>
            <div className="absolute inset-0 bg-surface-900/30 backdrop-blur-[2px] transition-opacity" />
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn(
                    "relative border w-full max-w-[1100px] max-h-[92vh] flex flex-col overflow-hidden rounded-lg shadow-2xl transition-colors duration-300",
                    allMindMode
                        ? "bg-black border-emerald-500/30 text-emerald-400"
                        : "bg-white border-neutral-200 text-neutral-800"
                )}
                onClick={e => e.stopPropagation()}
            >
                <div className={cn(
                    "border-b px-7 py-4 shrink-0 transition-colors duration-300",
                    allMindMode ? "bg-[#050c08] border-emerald-500/20" : "bg-[#f3f3f3] border-neutral-200"
                )}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => {
                                    if (allMindMode) {
                                        setAllMindMode(false);
                                    } else {
                                        setShowAllMindAuth(true);
                                        setAllMindPassword('');
                                        setAllMindAuthError(false);
                                        setTimeout(() => allMindPasswordRef.current?.focus(), 100);
                                    }
                                }}
                                className={cn(
                                    "w-9 h-9 rounded-sm flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-105 active:scale-95",
                                    allMindMode ? "bg-emerald-600 shadow-[0_0_10px_#10b981]" : "bg-surface-900"
                                )}
                                title="Toggle ALL MIND secret mode"
                            >
                                <Sliders size={17} className="text-white" strokeWidth={2.25} />
                            </button>
                            <div className="min-w-0">
                                <h2 className={cn(
                                    "text-[15px] font-semibold tracking-[-0.005em] leading-none transition-colors",
                                    allMindMode ? "text-emerald-400 font-mono tracking-widest uppercase" : "text-surface-900"
                                )}>
                                    {allMindMode ? "ALL MIND Systems Console" : "Account type settings"}
                                </h2>
                                <p className={cn(
                                    "text-[11.5px] font-medium tracking-[-0.005em] mt-1.5 transition-colors",
                                    allMindMode ? "text-emerald-600 font-mono" : "text-surface-500"
                                )}>
                                    {allMindMode
                                        ? "Sensory input streams active · Thought matrix operations routing"
                                        : `Configure module access for the ${activeRoles.length} active of ${ACCOUNT_TYPE_ORDER.length + customRoles.length} account types · ${targetRoles.length > 1 ? ("applying to " + targetRoles.length + " types") : ("editing " + getLabel(selectedRole))}`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={cn(
                                "p-2 transition-colors",
                                allMindMode ? "text-emerald-600 hover:text-emerald-400 hover:bg-emerald-950/20" : "text-surface-400 hover:text-surface-900 hover:bg-surface-100"
                            )}
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
 
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    <div className={cn(
                        "w-[270px] shrink-0 border-r flex flex-col transition-colors duration-300",
                        allMindMode ? "bg-black border-emerald-500/20" : "bg-[#f8f9fa] border-neutral-200"
                    )}>
                        <div className="px-4 pt-4 pb-2 shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                    "text-[10px] font-semibold uppercase tracking-[-0.005em] transition-colors",
                                    allMindMode ? "text-emerald-600 font-mono" : "text-surface-500"
                                )}>
                                    {allMindMode ? "Operations Matrix" : "Categories"}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 custom-scrollbar">
                            {(allMindMode ? ALL_MIND_CATEGORIES : CATEGORIES).map(category => {
                                const isSelected = selectedCategory === category.id;
                                const Icon = category.icon;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={cn(
                                            "relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all text-left group",
                                            allMindMode
                                                ? isSelected
                                                    ? "bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-mono"
                                                    : "border border-transparent text-emerald-700 hover:bg-emerald-950/20 hover:text-emerald-500 font-mono"
                                                : isSelected
                                                    ? "bg-white border border-neutral-200/80 shadow-sm text-surface-900 font-semibold"
                                                    : "border border-transparent text-surface-600 hover:bg-neutral-100/60"
                                        )}
                                    >
                                        {isSelected && (
                                            <div className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-r", allMindMode ? "bg-emerald-500" : "bg-[#0078d4]")} />
                                        )}
                                        <Icon size={14} className={cn(isSelected ? (allMindMode ? "text-emerald-400" : "text-[#0078d4]") : (allMindMode ? "text-emerald-800 group-hover:text-emerald-600" : "text-surface-400 group-hover:text-surface-600"))} strokeWidth={2} />
                                        <span className="text-[11.5px] tracking-[-0.005em]">{category.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className={cn("px-3 py-3 border-t shrink-0", allMindMode ? "border-emerald-500/20" : "border-surface-200")}>
                            <button
                                onClick={resetAll}
                                className={cn(
                                    "w-full flex items-center justify-center gap-1.5 px-3 h-7 text-[10.5px] font-semibold transition-all rounded-sm",
                                    allMindMode
                                        ? "bg-black border border-emerald-900 text-emerald-600 hover:border-emerald-500 hover:text-emerald-400 font-mono"
                                        : "bg-white border border-surface-200 hover:border-surface-300 hover:bg-surface-50 text-surface-600"
                                )}
                            >
                                <RotateCcw size={11} strokeWidth={2.25} />
                                {allMindMode ? "Restore Core System" : "Reset all to defaults"}
                            </button>
                        </div>
                    </div>

                    <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden transition-colors duration-300", allMindMode ? "bg-[#0b0f19]" : "bg-white")}>
                        {allMindMode ? (
                            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
                                <AllMindOversight tab={selectedCategory} />
                            </div>
                        ) : (
                            <>
                                <div className={cn("px-6 pt-5 pb-4 border-b shrink-0 transition-colors duration-300", allMindMode ? "border-emerald-500/20 text-emerald-400" : "border-surface-200")}>
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center border", getAccent(selectedRole).bg, getAccent(selectedRole).border)}>
                                                {React.createElement(ROLE_ICON[selectedRole] || Users, { size: 18, className: getAccent(selectedRole).text, strokeWidth: 2.25 })}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[11.5px] font-semibold", allMindMode ? "text-emerald-600 font-mono" : "text-neutral-500")}>Account Type:</span>
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 h-8 border rounded-md text-[12px] font-semibold focus:outline-none transition-all cursor-pointer select-none",
                                                                allMindMode
                                                                    ? "bg-neutral-900 border-emerald-500/30 text-emerald-400 hover:border-emerald-500"
                                                                    : "bg-white border border-neutral-200 text-surface-800 hover:border-[#0078d4]"
                                                            )}
                                                        >
                                                            {React.createElement(ROLE_ICON[selectedRole] || Users, { size: 14, className: allMindMode ? "text-emerald-500" : "text-neutral-500" })}
                                                            <span>{getLabel(selectedRole)}</span>
                                                            <ChevronDown size={12} className={allMindMode ? "text-emerald-600" : "text-neutral-400"} />
                                                        </button>
                                                        <AnimatePresence>
                                                            {isRoleDropdownOpen && (
                                                                <>
                                                                    <div className="fixed inset-0 z-10" onClick={() => setIsRoleDropdownOpen(false)} />
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 4 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 4 }}
                                                                        className={cn(
                                                                            "absolute left-0 mt-1 w-56 border rounded-md shadow-lg z-20 py-1 max-h-60 overflow-y-auto custom-scrollbar",
                                                                            allMindMode ? "bg-[#0b0f19] border-emerald-500/30 text-emerald-400" : "bg-white border-neutral-200"
                                                                        )}
                                                                    >
                                                                        {activeRoles.map(role => {
                                                                            const Icon = ROLE_ICON[role] || Users;
                                                                            const isSelected = selectedRole === role;
                                                                            return (
                                                                                <button
                                                                                    key={role}
                                                                                    onClick={() => {
                                                                                        setSelectedRole(role as UserRole);
                                                                                        setIsRoleDropdownOpen(false);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors",
                                                                                        isSelected
                                                                                            ? allMindMode
                                                                                                ? "bg-emerald-950/60 font-semibold text-emerald-400"
                                                                                                : "bg-neutral-100 font-semibold text-[#0078d4]"
                                                                                            : allMindMode
                                                                                                ? "text-emerald-500 hover:bg-neutral-900/60"
                                                                                                : "text-surface-700 hover:bg-neutral-50"
                                                                                    )}
                                                                                >
                                                                                    <Icon size={14} className={isSelected ? (allMindMode ? "text-emerald-400" : "text-[#0078d4]") : (allMindMode ? "text-emerald-700" : "text-neutral-400")} />
                                                                                    <span className="truncate">{getLabel(role)}</span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </motion.div>
                                                                </>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                    {bulkMode && bulkSelected.has(selectedRole) && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#0078d4] text-white rounded-sm">In bulk</span>
                                                    )}
                                                    {(customRoles.includes(selectedRole) || (customLabels[selectedRole] && customLabels[selectedRole] !== DEFAULT_LABELS[selectedRole as UserRole])) && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.005em] bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">Custom</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-medium text-surface-500 tracking-[-0.005em] mt-1.5 max-w-[400px] truncate">
                                                    {getDescription(selectedRole)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <label className={cn(
                                                "flex items-center gap-1.5 px-2.5 h-8 rounded-md cursor-pointer transition-all border",
                                                bulkMode
                                                    ? allMindMode
                                                        ? "bg-emerald-600 border-emerald-500 text-neutral-950 font-bold"
                                                        : "bg-[#0078d4] border-[#0078d4] text-white"
                                                    : allMindMode
                                                        ? "bg-neutral-900 border-emerald-500/30 text-emerald-500 hover:border-emerald-500"
                                                        : "bg-white border-neutral-200 text-surface-600 hover:border-neutral-300"
                                            )}>
                                                <input
                                                    type="checkbox"
                                                    checked={bulkMode}
                                                    onChange={e => {
                                                        setBulkMode(e.target.checked);
                                                        if (!e.target.checked) setBulkSelected(new Set());
                                                    }}
                                                    className="sr-only"
                                                />
                                                {bulkMode ? <CheckSquare size={13} className={allMindMode ? "text-neutral-950" : "text-white"} /> : <Square size={13} className={allMindMode ? "text-emerald-800" : "text-surface-400"} />}
                                                <span className="text-[11px] font-semibold tracking-[-0.005em]">Bulk Apply</span>
                                            </label>

                                            <button
                                                onClick={() => setIsAddRoleOpen(true)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-[11px] font-semibold transition-all",
                                                    allMindMode
                                                        ? "border-emerald-500/30 text-emerald-500 hover:border-emerald-500 hover:text-emerald-400 bg-neutral-900"
                                                        : "border-neutral-200 text-surface-600 hover:border-[#0078d4] hover:text-[#0078d4] bg-white"
                                                )}
                                            >
                                                <UserPlus size={13} strokeWidth={2.25} />
                                                Add Type
                                            </button>

                                            {!bulkMode && (
                                                <>
                                                    <button
                                                        onClick={() => setEditingRole(selectedRole)}
                                                        className={cn(
                                                            "flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-[11px] font-semibold transition-all",
                                                            allMindMode
                                                                ? "border-emerald-500/30 text-emerald-500 hover:border-emerald-500 hover:text-emerald-400 bg-neutral-900"
                                                                : "border-neutral-200 text-surface-600 hover:border-[#0078d4] hover:text-[#0078d4] bg-white"
                                                        )}
                                                    >
                                                        <Pencil size={13} strokeWidth={2.25} />
                                                        Edit
                                                    </button>
                                                    {selectedRole !== 'admin' && (
                                                        <button
                                                            onClick={() => setDeletingRole(selectedRole)}
                                                            className={cn(
                                                                "flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-[11px] font-semibold transition-all",
                                                                allMindMode
                                                                    ? "border-emerald-500/30 text-emerald-500 hover:border-rose-500 hover:text-rose-400 bg-neutral-900"
                                                                    : "border-neutral-200 text-surface-600 hover:border-rose-600 hover:text-rose-600 hover:bg-rose-50 bg-white"
                                                            )}
                                                            title={customRoles.includes(selectedRole) ? "Delete account type" : "Archive account type"}
                                                        >
                                                            <Trash2 size={13} strokeWidth={2.25} />
                                                            {customRoles.includes(selectedRole) ? "Delete" : "Archive"}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sub-tabs for Regular and Special settings */}
                                    <div className="flex gap-2 border-b border-neutral-100 mb-4 pb-2 animate-in fade-in duration-200">
                                        <button
                                            type="button"
                                            onClick={() => setSubTab('regular')}
                                            className={cn(
                                                "px-4 py-1.5 text-[12px] font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer select-none",
                                                subTab === 'regular'
                                                    ? "bg-[#0078d4] text-white shadow-sm"
                                                    : "text-neutral-650 hover:bg-neutral-50 hover:text-neutral-900"
                                            )}
                                        >
                                            <Sliders size={13} />
                                            Regular Settings
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSubTab('special')}
                                            className={cn(
                                                "px-4 py-1.5 text-[12px] font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer select-none",
                                                subTab === 'special'
                                                    ? "bg-[#0078d4] text-white shadow-sm"
                                                    : "text-neutral-650 hover:bg-neutral-50 hover:text-neutral-900"
                                            )}
                                        >
                                            <ShieldCheck size={13} />
                                            Special Settings
                                        </button>
                                    </div>

                                    {bulkMode && (
                                        <div className={cn("flex flex-wrap gap-1.5 mb-4 p-2 rounded-md transition-all border", allMindMode ? "bg-black border-emerald-500/20" : "bg-neutral-50 border-neutral-200")}>
                                            <span className={cn("text-[10px] font-semibold uppercase tracking-[-0.005em] w-full mb-1", allMindMode ? "text-emerald-600 font-mono" : "text-neutral-500")}>Apply changes to:</span>
                                            {activeRoles.map(role => {
                                                const isChecked = bulkSelected.has(role);
                                                return (
                                                    <button
                                                        key={role}
                                                        onClick={() => toggleBulkRole(role)}
                                                        className={cn(
                                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all",
                                                            isChecked
                                                                ? allMindMode
                                                                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400 font-mono"
                                                                    : "bg-[#deecf9] border-[#0078d4]/30 text-[#0078d4]"
                                                                : allMindMode
                                                                    ? "bg-neutral-900 border-emerald-950/20 text-emerald-700 hover:text-emerald-500 hover:bg-neutral-900"
                                                                    : "bg-white border-neutral-200 text-surface-600 hover:bg-neutral-50"
                                                        )}
                                                    >
                                                        {isChecked ? <CheckSquare size={11} /> : <Square size={11} />}
                                                        {getLabel(role)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {subTab === 'regular' && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className={cn("flex items-center gap-1.5 px-2.5 h-7 rounded-sm border", allMindMode ? "bg-neutral-900 border-emerald-955 text-emerald-500" : "bg-surface-50 border-surface-200 text-surface-700")}>
                                                <ShieldCheck size={11} className={allMindMode ? "text-emerald-500" : "text-surface-500"} strokeWidth={2.25} />
                                                <span className="text-[10.5px] font-semibold tracking-[-0.005em] tabular-nums">
                                                    {currentRoleEnabled}/{totalModules} enabled
                                                </span>
                                            </div>
                                            {bulkMode && (
                                                <div className={cn("flex items-center gap-1.5 px-2.5 h-7 rounded-sm border", allMindMode ? "bg-emerald-955/40 border-emerald-805 text-emerald-400" : "bg-[#deecf9] border-[#0078d4]/30 rounded-sm")}>
                                                    <Layers size={11} className={allMindMode ? "text-emerald-400" : "text-[#0078d4]"} strokeWidth={2.25} />
                                                    <span className="text-[10.5px] font-semibold tracking-[-0.005em]">
                                                        Editing {bulkTargetsLabel}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1" />
                                            <div className="relative min-w-[200px]">
                                                <Search size={12} className={cn("absolute left-2.5 top-1/2 -translate-y-1/2", allMindMode ? "text-emerald-600" : "text-surface-400")} />
                                                <input
                                                    type="text"
                                                    placeholder="Search modules…"
                                                    value={search}
                                                    onChange={e => setSearch(e.target.value)}
                                                    className={cn(
                                                        "w-full pl-7 pr-3 h-7 border rounded-sm text-[11px] font-medium placeholder-surface-400 focus:outline-none transition-all",
                                                        allMindMode
                                                            ? "bg-neutral-900 border-emerald-955 text-emerald-400 focus:border-emerald-500 placeholder-emerald-800 font-mono"
                                                            : "bg-white border-surface-200 text-surface-700 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]/10"
                                                    )}
                                                />
                                            </div>
                                            <button
                                                onClick={enableAllForTarget}
                                                disabled={bulkMode && bulkSelected.size === 0}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 h-7 text-[10.5px] font-semibold transition-all rounded-sm disabled:opacity-40 disabled:cursor-not-allowed",
                                                    allMindMode
                                                        ? "text-emerald-400 bg-[#07140b] border border-emerald-500/20 hover:bg-neutral-950/40 hover:border-emerald-500/40"
                                                        : "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                                                )}
                                            >
                                                <Unlock size={11} strokeWidth={2.25} />
                                                Enable all
                                            </button>
                                            <button
                                                onClick={disableAllForTarget}
                                                disabled={bulkMode && bulkSelected.size === 0}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 h-7 text-[10.5px] font-semibold transition-all rounded-sm disabled:opacity-40 disabled:cursor-not-allowed",
                                                    allMindMode
                                                        ? "text-rose-400 bg-[#07140b] border border-emerald-500/20 hover:bg-neutral-950"
                                                        : "text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                                                )}
                                            >
                                                <Lock size={11} strokeWidth={2.25} />
                                                Disable all
                                            </button>
                                            <button
                                                onClick={() => resetRole(selectedRole)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 h-7 text-[10.5px] font-semibold transition-all rounded-sm",
                                                    allMindMode
                                                        ? "text-emerald-500 bg-[#07140b] border border-emerald-500/20 hover:bg-neutral-950 font-mono"
                                                        : "text-surface-700 bg-white border border-surface-200 hover:border-surface-300 hover:bg-surface-50"
                                                )}
                                            >
                                                <RotateCcw size={11} strokeWidth={2.25} />
                                                Reset
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
                                    {subTab === 'special' ? (
                                        <div className="space-y-6 max-w-xl animate-in fade-in duration-200">
                                            <div className="p-4 bg-primary-50/50 border border-primary-100 rounded-lg space-y-2">
                                                <h4 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                                                    ⭐ Specialized Account Settings
                                                </h4>
                                                <p className="text-xs text-surface-500 leading-relaxed">
                                                    Configure settings specific to specialized and senior recruitment queues.
                                                </p>
                                            </div>

                                            <div className="border border-neutral-200 rounded-lg bg-white p-5 space-y-4 hover:shadow-md transition-all duration-200">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-surface-900">Rerouting Option</p>
                                                        <p className="text-xs text-surface-500 leading-relaxed max-w-md">
                                                            Allows this role to reroute and hand over candidates to specialized recruitment desks (like Recruiter S!) during the final evaluation stage.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPermissions(prev => {
                                                                const next = { ...prev };
                                                                const currentValue = !!prev[selectedRole]?.['allow_rerouting'];
                                                                next[selectedRole] = {
                                                                    ...prev[selectedRole],
                                                                    'allow_rerouting': !currentValue
                                                                };
                                                                return next;
                                                            });
                                                            setSavedAt(null);
                                                        }}
                                                        className={cn(
                                                            "w-11 h-6 rounded-full border transition-all flex items-center px-[3px] shrink-0 cursor-pointer",
                                                            permissions[selectedRole]?.['allow_rerouting']
                                                                ? "bg-[#0078d4] border-transparent"
                                                                : "bg-neutral-100 border-neutral-300"
                                                        )}
                                                    >
                                                        <div
                                                            className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                                                            style={{
                                                                transform: permissions[selectedRole]?.['allow_rerouting'] ? 'translateX(20px)' : 'translateX(0px)'
                                                            }}
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            {permissions[selectedRole]?.['allow_rerouting'] && (
                                                <div className="border border-neutral-200 rounded-lg bg-white p-5 space-y-4 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-surface-900">Rerouted Accounts</p>
                                                        <p className="text-xs text-surface-500 leading-relaxed">
                                                            Select which candidate accounts/departments should trigger automated rerouting to this desk.
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {((permissions[selectedRole]?.['rerouted_accounts'] as string[]) || ['keller postman', 'auto approve']).map(account => (
                                                            <span
                                                                key={account}
                                                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-[#deecf9] text-[#0078d4] border border-[#0078d4]/10 rounded-md"
                                                            >
                                                                {account}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const currentAccounts = (permissions[selectedRole]?.['rerouted_accounts'] as string[]) || ['keller postman', 'auto approve'];
                                                                        const nextAccounts = currentAccounts.filter(a => a.toLowerCase() !== account.toLowerCase());
                                                                        setPermissions(prev => {
                                                                            const next = { ...prev };
                                                                            next[selectedRole] = {
                                                                                ...prev[selectedRole],
                                                                                'rerouted_accounts': nextAccounts
                                                                            };
                                                                            return next;
                                                                        });
                                                                        setSavedAt(null);
                                                                    }}
                                                                    className="text-[#0078d4]/50 hover:text-[#0078d4] font-bold ml-1 outline-none transition-colors cursor-pointer"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </span>
                                                        ))}
                                                        {((permissions[selectedRole]?.['rerouted_accounts'] as string[]) || ['keller postman', 'auto approve']).length === 0 && (
                                                            <p className="text-xs text-neutral-450 italic">No accounts set. All candidate accounts will bypass rerouting.</p>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                                                        <select
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (!value) return;
                                                                const currentAccounts = (permissions[selectedRole]?.['rerouted_accounts'] as string[]) || ['keller postman', 'auto approve'];
                                                                if (!currentAccounts.some(a => a.toLowerCase() === value.toLowerCase())) {
                                                                    const nextAccounts = [...currentAccounts, value.toLowerCase()];
                                                                    setPermissions(prev => {
                                                                        const next = { ...prev };
                                                                        next[selectedRole] = {
                                                                            ...prev[selectedRole],
                                                                            'rerouted_accounts': nextAccounts
                                                                        };
                                                                        return next;
                                                                    });
                                                                    setSavedAt(null);
                                                                }
                                                                e.target.value = ''; // Reset
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-white border border-neutral-300 text-xs font-medium text-surface-900 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]/10 outline-none transition-all rounded-md cursor-pointer"
                                                        >
                                                            <option value="">+ Add active account...</option>
                                                            {departments
                                                                .filter(d => {
                                                                    const currentAccounts = (permissions[selectedRole]?.['rerouted_accounts'] as string[]) || ['keller postman', 'auto approve'];
                                                                    return !currentAccounts.some(a => a.toLowerCase() === d.name.toLowerCase());
                                                                })
                                                                .map(d => (
                                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                                ))
                                                            }
                                                        </select>

                                                        <input
                                                            type="text"
                                                            placeholder="Or type custom account name & hit Enter..."
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    const input = e.currentTarget;
                                                                    const val = input.value.trim();
                                                                    if (val) {
                                                                        const currentAccounts = (permissions[selectedRole]?.['rerouted_accounts'] as string[]) || ['keller postman', 'auto approve'];
                                                                        if (!currentAccounts.some(a => a.toLowerCase() === val.toLowerCase())) {
                                                                            const nextAccounts = [...currentAccounts, val.toLowerCase()];
                                                                            setPermissions(prev => {
                                                                                const next = { ...prev };
                                                                                next[selectedRole] = {
                                                                                    ...prev[selectedRole],
                                                                                    'rerouted_accounts': nextAccounts
                                                                                };
                                                                                return next;
                                                                            });
                                                                            setSavedAt(null);
                                                                        }
                                                                        input.value = '';
                                                                    }
                                                                }
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-white border border-neutral-300 text-xs font-medium text-surface-950 placeholder-neutral-400 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]/10 outline-none transition-all rounded-md"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        bulkMode && bulkSelected.size === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-sm border flex items-center justify-center mb-4",
                                                    allMindMode
                                                        ? "bg-emerald-950/40 border-emerald-500/30"
                                                        : "bg-[#deecf9] border-[#0078d4]/30"
                                                )}>
                                                    <CheckSquare size={22} className={allMindMode ? "text-emerald-400" : "text-[#0078d4]"} />
                                                </div>
                                                <p className={cn("text-[13px] font-semibold tracking-[-0.005em]", allMindMode ? "text-emerald-400 font-mono" : "text-surface-700")}>Select at least one account type</p>
                                                <p className={cn("text-[11px] font-medium tracking-[-0.005em] mt-1.5 max-w-[280px]", allMindMode ? "text-emerald-700 font-mono" : "text-surface-500")}>
                                                    Tick the account types on the left to bulk-apply the same module permissions.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                {Object.entries(groupedModules).map(([groupName, modules]) => (
                                                    <div key={groupName} className={cn(
                                                        "rounded-lg border overflow-hidden shadow-sm transition-all duration-200 mb-6",
                                                        allMindMode
                                                            ? "bg-black border-emerald-500/20"
                                                            : "bg-white border-neutral-200/80 hover:border-neutral-300"
                                                    )}>
                                                        <div className={cn(
                                                            "flex items-center justify-between px-4 py-3 border-b transition-colors select-none",
                                                            allMindMode ? "bg-[#050c08] border-emerald-500/20 text-emerald-400" : "bg-neutral-50/70 border-neutral-200/60 text-neutral-800"
                                                        )}>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className={cn(
                                                                    "text-[11px] font-bold uppercase tracking-wider",
                                                                    allMindMode ? "text-emerald-400 font-mono" : "text-neutral-700"
                                                                )}>
                                                                    {groupName}
                                                                </h4>
                                                                <span className={cn(
                                                                    "px-1.5 py-0.5 text-[9.5px] font-bold rounded-full tabular-nums",
                                                                    allMindMode ? "bg-emerald-950/60 text-emerald-500 border border-emerald-500/20" : "bg-neutral-200/60 text-neutral-600"
                                                                )}>
                                                                    {modules.filter(m => currentRole?.[m.id]).length}/{modules.length}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "text-[10px] font-semibold select-none",
                                                                    allMindMode ? "text-emerald-700" : "text-neutral-400"
                                                                )}>
                                                                    Toggle all
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const groupModuleIds = modules.map(m => m.id);
                                                                        const anyEnabled = modules.some(m => currentRole?.[m.id]);
                                                                        setPermissions(prev => {
                                                                            const next: PermissionsMap = { ...prev };
                                                                            targetRoles.forEach(role => {
                                                                                const rolePerms = { ...(prev[role] || {}) };
                                                                                groupModuleIds.forEach(id => {
                                                                                    rolePerms[id] = !anyEnabled;
                                                                                });
                                                                                next[role] = rolePerms;
                                                                            });
                                                                            return next;
                                                                        });
                                                                        setSavedAt(null);
                                                                    }}
                                                                    className={cn(
                                                                        "w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 cursor-pointer",
                                                                        modules.some(m => currentRole?.[m.id])
                                                                            ? getAccent(selectedRole).dot
                                                                            : allMindMode ? "bg-neutral-900" : "bg-neutral-200"
                                                                    )}
                                                                    title={`Toggle all ${groupName} modules`}
                                                                >
                                                                    <div
                                                                        className="w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-200"
                                                                        style={{
                                                                            transform: modules.some(m => currentRole?.[m.id]) ? 'translateX(14px)' : 'translateX(0px)'
                                                                        }}
                                                                    />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "divide-y",
                                                            allMindMode
                                                                ? "divide-emerald-500/10 bg-black"
                                                                : "divide-neutral-100 bg-white"
                                                        )}>
                                                            {modules.map(mod => {
                                                                const checked = !!currentRole?.[mod.id];
                                                                const Icon = mod.icon;
                                                                return (
                                                                    <button
                                                                        key={mod.id}
                                                                        type="button"
                                                                        onClick={() => togglePermission(mod.id)}
                                                                        className={cn(
                                                                            "w-full group flex items-center justify-between px-4 py-3.5 transition-all text-left",
                                                                            allMindMode
                                                                                ? checked
                                                                                    ? "bg-emerald-950/10 hover:bg-[#0b2413]/30 text-emerald-400"
                                                                                    : "hover:bg-neutral-900/30 text-emerald-700 hover:text-emerald-500"
                                                                                : checked
                                                                                    ? "hover:bg-neutral-50/30 bg-neutral-50/5"
                                                                                    : "hover:bg-neutral-50/50"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                                            <div className={cn(
                                                                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                                                                                checked
                                                                                    ? cn(getAccent(selectedRole).bg, getAccent(selectedRole).text, "scale-105 shadow-sm")
                                                                                    : allMindMode
                                                                                        ? "bg-neutral-900 border border-emerald-950 text-emerald-700"
                                                                                        : "bg-neutral-100 text-neutral-400 group-hover:text-neutral-500 group-hover:bg-neutral-200/50"
                                                                            )}>
                                                                                <Icon size={14} strokeWidth={2.25} />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className={cn(
                                                                                    "text-[12.5px] font-semibold tracking-tight transition-colors",
                                                                                    allMindMode
                                                                                        ? checked ? "text-emerald-400 font-mono" : "text-emerald-600 font-mono"
                                                                                        : checked ? "text-neutral-800" : "text-neutral-600"
                                                                                )}>
                                                                                    {mod.label}
                                                                                </p>
                                                                                <p className={cn(
                                                                                    "text-[11px] font-medium tracking-tight mt-0.5 transition-colors",
                                                                                    allMindMode
                                                                                        ? "text-emerald-800"
                                                                                        : checked ? "text-neutral-450" : "text-neutral-400"
                                                                                )}>
                                                                                    {mod.description}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className={cn(
                                                                            "w-9 h-5 rounded-full transition-all flex items-center px-[2px] shrink-0",
                                                                            checked
                                                                                ? cn(getAccent(selectedRole).dot)
                                                                                : allMindMode
                                                                                    ? "bg-[#050c08] border border-emerald-950/40 hover:border-emerald-800"
                                                                                    : "bg-neutral-200 hover:bg-neutral-300"
                                                                        )}>
                                                                            <motion.div
                                                                                className="w-4 h-4 rounded-full bg-white shadow-sm"
                                                                                animate={{ x: checked ? 16 : 0 }}
                                                                                transition={SPRING}
                                                                            />
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                                {visibleModules.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                        <Search size={32} className={allMindMode ? "text-emerald-955 mb-3" : "text-surface-200 mb-3"} />
                                                        <p className={cn("text-[12px] font-medium tracking-[-0.005em]", allMindMode ? "text-emerald-700 font-mono" : "text-surface-400")}>
                                                            No modules match "{search}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className={cn(
                    "border-t px-7 py-4 shrink-0 transition-colors duration-300",
                    allMindMode ? "border-emerald-500/20 bg-[#050c08]" : "border-surface-200 bg-surface-50/30"
                )}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                            <AnimatePresence mode="wait">
                                {savedAt ? (
                                    <motion.div
                                        key="saved"
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -4 }}
                                        transition={{ duration: 0.18 }}
                                        className={cn(
                                            "flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[-0.005em]",
                                            allMindMode ? "text-emerald-400 font-mono" : "text-emerald-700"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-sm flex items-center justify-center",
                                            allMindMode ? "bg-emerald-950/40 border border-emerald-500/30" : "bg-emerald-100"
                                        )}>
                                            <Check size={11} strokeWidth={3} className={allMindMode ? "text-emerald-400" : "text-emerald-700"} />
                                        </div>
                                        {allMindMode ? `ALLMIND Configured @ ${savedAt}` : `Settings saved at ${savedAt}`}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="unsaved"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={cn(
                                            "flex items-center gap-1.5 text-[10.5px] font-medium tracking-[-0.005em]",
                                            allMindMode ? "text-emerald-600 font-mono" : "text-surface-500"
                                        )}
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full", allMindMode ? "bg-emerald-500" : "bg-amber-500")} />
                                        Unsaved matrix changes · {targetRoles.length} {targetRoles.length === 1 ? 'type' : 'types'} affected
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={onClose}
                                className={cn(
                                    "px-4 h-7 text-[11px] font-semibold transition-all rounded-sm",
                                    allMindMode
                                        ? "text-emerald-500 bg-[#07140b] border border-emerald-500/20 hover:bg-neutral-950"
                                        : "text-surface-600 bg-white border border-surface-200 hover:border-surface-300 hover:bg-surface-50"
                                )}
                            >
                                Cancel
                            </button>
                            <motion.button
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                transition={SPRING}
                                onClick={handleSave}
                                disabled={bulkMode && bulkSelected.size === 0}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 h-7 text-[11px] font-semibold tracking-[-0.005em] transition-all rounded-sm disabled:opacity-40 disabled:cursor-not-allowed",
                                    allMindMode
                                        ? "bg-emerald-600 text-neutral-950 hover:bg-emerald-500 shadow-[0_0_10px_#10b981]"
                                        : "bg-black text-white hover:bg-black/85"
                                )}
                            >
                                <Check size={12} strokeWidth={3} />
                                {allMindMode ? "Apply Directives" : "Save changes"}
                            </motion.button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {editingRole && (
                        <EditRoleModal
                            editingRole={editingRole}
                            initialLabel={customLabels[editingRole] || DEFAULT_LABELS[editingRole as UserRole] || String(editingRole)}
                            initialDescription={customDescriptions[editingRole] || ROLE_DESCRIPTIONS[editingRole as UserRole] || ''}
                            initialColor={customColors[editingRole] || DEFAULT_COLORS[editingRole as UserRole] || 'admin'}
                            activeRoles={activeRoles}
                            customRoles={customRoles}
                            getLabel={getLabel}
                            getEffectiveAccent={getEffectiveAccent}
                            roleIcon={ROLE_ICON}
                            colorOptions={COLOR_OPTIONS}
                            onClose={() => setEditingRole(null)}
                            onApply={applyEdit}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isAddRoleOpen && (
                        <AddRoleModal
                            activeRoles={activeRoles}
                            getLabel={getLabel}
                            roleIcon={ROLE_ICON}
                            colorOptions={COLOR_OPTIONS}
                            onClose={() => setIsAddRoleOpen(false)}
                            onAdd={handleAddRole}
                            allMindMode={allMindMode}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {deletingRole && (
                        <ConfirmActionModal
                            type={customRoles.includes(deletingRole) ? 'delete' : 'archive'}
                            roleLabel={getLabel(deletingRole)}
                            onClose={() => setDeletingRole(null)}
                            onConfirm={() => archiveRole(deletingRole)}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {restoringRole && (
                        <ConfirmActionModal
                            type="restore"
                            roleLabel={getLabel(restoringRole)}
                            onClose={() => setRestoringRole(null)}
                            onConfirm={() => restoreRole(restoringRole)}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            key="success-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 z-[50] bg-surface-900/40 backdrop-blur-[2px] flex items-center justify-center p-6"
                            onClick={() => setShowSuccess(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                className="w-full max-w-[340px] bg-white border border-surface-200 shadow-2xl rounded-sm p-6 flex flex-col items-center text-center relative overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
                                <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mb-4 mt-2 shadow-inner">
                                    <Smile size={32} className="text-emerald-600" strokeWidth={2} />
                                </div>
                                <h3 className="text-[15px] font-bold text-surface-900 tracking-[-0.01em]">Changes Saved Successfully</h3>
                                <p className="text-[11.5px] font-medium text-surface-500 tracking-[-0.005em] mt-2 leading-relaxed max-w-[280px]">
                                    All account type settings, module permissions, and labels have been successfully updated in the database.
                                </p>
                                <button
                                    onClick={() => setShowSuccess(false)}
                                    className="w-full mt-6 h-8 text-[11px] font-bold text-white bg-black hover:bg-black/90 transition-all rounded-sm shadow-md active:scale-[0.98]"
                                >
                                    Awesome
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showAllMindAuth && (
                        <motion.div
                            key="allmind-auth-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-6"
                            onClick={() => setShowAllMindAuth(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                className="w-full max-w-[360px] bg-[#0a0f0d] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] rounded-sm overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="px-5 py-4 border-b border-emerald-500/20">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-sm bg-emerald-600 shadow-[0_0_10px_#10b981] flex items-center justify-center">
                                            <Lock size={14} className="text-white" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-[13px] font-mono font-semibold text-emerald-400 tracking-widest uppercase leading-none">
                                                Authorization Required
                                            </h3>
                                            <p className="text-[10px] font-mono text-emerald-700 mt-1.5">
                                                Enter access key to initialize ALLMIND Core
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-5 py-5">
                                    <label className="block text-[10px] font-mono font-semibold text-emerald-600 tracking-wider uppercase mb-2">
                                        Access Key
                                    </label>
                                    <motion.div
                                        animate={allMindAuthError ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                                        transition={{ duration: 0.4 }}
                                    >
                                        <input
                                            ref={allMindPasswordRef}
                                            type="password"
                                            value={allMindPassword}
                                            onChange={e => {
                                                setAllMindPassword(e.target.value);
                                                setAllMindAuthError(false);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    if (allMindPassword === 'AllCoreIsOne') {
                                                        setAllMindMode(true);
                                                        setShowAllMindAuth(false);
                                                        setAllMindPassword('');
                                                        setAllMindAuthError(false);
                                                    } else {
                                                        setAllMindAuthError(true);
                                                    }
                                                }
                                                if (e.key === 'Escape') {
                                                    setShowAllMindAuth(false);
                                                }
                                            }}
                                            placeholder="••••••••••••"
                                            className={cn(
                                                "w-full px-3 h-9 bg-black border rounded-sm text-[12px] font-mono text-emerald-400 placeholder-emerald-900 focus:outline-none focus:ring-1 transition-all",
                                                allMindAuthError
                                                    ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
                                                    : "border-emerald-500/20 focus:border-emerald-500 focus:ring-emerald-500/20"
                                            )}
                                        />
                                    </motion.div>
                                    {allMindAuthError && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-[10px] font-mono text-rose-400 mt-2 flex items-center gap-1"
                                        >
                                            <ShieldAlert size={10} strokeWidth={2.5} />
                                            Access denied — invalid key
                                        </motion.p>
                                    )}
                                </div>
                                <div className="px-5 py-3 border-t border-emerald-500/20 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => setShowAllMindAuth(false)}
                                        className="px-3 h-7 text-[10px] font-mono font-semibold text-emerald-600 bg-black border border-emerald-500/20 hover:border-emerald-500/40 transition-all rounded-sm"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (allMindPassword === 'AllCoreIsOne') {
                                                setAllMindMode(true);
                                                setShowAllMindAuth(false);
                                                setAllMindPassword('');
                                                setAllMindAuthError(false);
                                            } else {
                                                setAllMindAuthError(true);
                                            }
                                        }}
                                        className="flex items-center gap-1.5 px-3 h-7 text-[10px] font-mono font-semibold bg-emerald-600 text-neutral-950 hover:bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all rounded-sm"
                                    >
                                        <Unlock size={11} strokeWidth={2.5} />
                                        Authenticate
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
