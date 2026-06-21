import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Users2, HardHat, Plus, Search, Filter, Lock, Unlock, Edit, Trash2, Building, BarChart3, Sliders, Shield, Crown, Check, X
} from 'lucide-react';
import { cn, formatDate } from '@/utils/formatters';
import type { UserRole } from '@/types';
import type { ManagedUser } from '../hooks/useUserManagement';
import { useAccountTypeSettings } from '../hooks/useAccountTypeSettings';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 25, mass: 0.5 };

interface UserManagementHeaderProps {
    onAdd: () => void;
    onSettings: () => void;
    totalCount: number;
}

export function UserManagementHeader({ onAdd, onSettings, totalCount }: UserManagementHeaderProps) {
    return (
        <div className="bg-white border-b border-surface-200">
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Title & Subtitle */}
                <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-neutral-100 rounded-md flex items-center justify-center border border-neutral-200">
                            <Users size={16} className="text-surface-700" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-surface-900 tracking-tight">
                            User Directory
                        </h1>
                    </div>
                    <p className="text-xs text-surface-500 font-medium">
                        Manage system operators, configure security privileges, and inspect department performance dashboards.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:self-center">
                    <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING}
                        onClick={onSettings}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-surface-200 text-surface-700 text-xs font-bold uppercase tracking-wider hover:border-surface-300 hover:bg-surface-50 transition-all rounded-sm shadow-sm"
                        title="Configure access settings"
                    >
                        <Sliders size={13} strokeWidth={2.25} />
                        Configure settings
                    </motion.button>
                    <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING}
                        onClick={onAdd}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-primary-700 transition-all rounded-sm shadow-sm"
                    >
                        <Plus size={14} strokeWidth={2.25} />
                        Add New User
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

interface UserTabNavigationProps {
    activeTab: 'RECRUITERS' | 'VALIDATORS' | 'ADMINS' | 'SUPER_ADMINS';
    onTabChange: (tab: 'RECRUITERS' | 'VALIDATORS' | 'ADMINS' | 'SUPER_ADMINS') => void;
    recruiterCount: number;
    validatorCount: number;
    adminCount: number;
    superAdminCount: number;
}

type UserTabAccent = {
    iconColor: string;
    iconColorBright: string;
    accent: string;
    border: string;
    bg: string;
};

const TAB_ACCENTS: Record<'RECRUITERS' | 'VALIDATORS' | 'ADMINS' | 'SUPER_ADMINS', UserTabAccent> = {
    RECRUITERS: {
        iconColor: 'text-blue-500',
        iconColorBright: 'text-blue-600',
        accent: 'bg-blue-600',
        border: 'border-blue-150',
        bg: 'bg-blue-50/40',
    },
    VALIDATORS: {
        iconColor: 'text-purple-500',
        iconColorBright: 'text-purple-600',
        accent: 'bg-purple-600',
        border: 'border-purple-150',
        bg: 'bg-purple-50/40',
    },
    ADMINS: {
        iconColor: 'text-rose-500',
        iconColorBright: 'text-rose-600',
        accent: 'bg-rose-600',
        border: 'border-rose-150',
        bg: 'bg-rose-50/40',
    },
    SUPER_ADMINS: {
        iconColor: 'text-amber-500',
        iconColorBright: 'text-amber-600',
        accent: 'bg-amber-600',
        border: 'border-amber-150',
        bg: 'bg-amber-50/40',
    },
};

export function UserTabNavigation({ activeTab, onTabChange, recruiterCount, validatorCount, adminCount, superAdminCount }: UserTabNavigationProps) {
    const tabs: Array<{
        id: 'RECRUITERS' | 'VALIDATORS' | 'ADMINS' | 'SUPER_ADMINS';
        label: string;
        description: string;
        icon: React.ComponentType<{ size?: number; className?: string }>;
        count: number;
        accent: UserTabAccent;
    }> = [
        { id: 'RECRUITERS', label: 'Recruiters', description: 'Talent Acquisition Team', icon: Users2, count: recruiterCount, accent: TAB_ACCENTS.RECRUITERS },
        { id: 'VALIDATORS', label: 'OPS Validators', description: 'Operations Verification', icon: HardHat, count: validatorCount, accent: TAB_ACCENTS.VALIDATORS },
        { id: 'ADMINS', label: 'Administrators', description: 'System Settings Management', icon: Shield, count: adminCount, accent: TAB_ACCENTS.ADMINS },
        { id: 'SUPER_ADMINS', label: 'Super Admins', description: 'Root Account Directors', icon: Crown, count: superAdminCount, accent: TAB_ACCENTS.SUPER_ADMINS },
    ];

    return (
        <div className="bg-white border-b border-surface-200">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-4">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "p-3.5 rounded-sm border text-left transition-all relative flex flex-col justify-between shadow-sm min-h-[72px]",
                                    isActive
                                        ? cn("border-surface-900 bg-surface-900 text-white shadow-md ring-1 ring-surface-950")
                                        : "border-surface-200 hover:border-surface-300 bg-white text-surface-800"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <tab.icon
                                            size={14}
                                            className={cn(
                                                "shrink-0",
                                                isActive ? "text-white" : tab.accent.iconColorBright
                                            )}
                                        />
                                        <span className="text-[12px] font-bold tracking-tight">{tab.label}</span>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 text-[10px] font-black rounded-full font-mono min-w-[20px] text-center",
                                        isActive ? "bg-white/20 text-white" : "bg-surface-100 text-surface-600"
                                    )}>
                                        {tab.count}
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-[9px] mt-1.5 font-medium truncate",
                                    isActive ? "text-white/70" : "text-surface-400"
                                )}>
                                    {tab.description}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

interface UserFilterBarProps {
    search: string;
    onSearchChange: (s: string) => void;
    roleFilter: UserRole | 'ALL';
    onRoleFilterChange: (r: UserRole | 'ALL') => void;
    showRoleFilter: boolean;
    accountFilter: string;
    onAccountFilterChange: (a: string) => void;
    departments: any[];
    activeTab: 'RECRUITERS' | 'VALIDATORS' | 'ADMINS' | 'SUPER_ADMINS';
}

export function UserFilterBar({ 
    search, 
    onSearchChange, 
    roleFilter, 
    onRoleFilterChange, 
    showRoleFilter, 
    accountFilter, 
    onAccountFilterChange, 
    departments, 
    activeTab 
}: UserFilterBarProps) {
    const { getLabel, activeRoles, getRoleType } = useAccountTypeSettings();
    const filterOptions = React.useMemo(() => {
        const targetType = 
            activeTab === 'RECRUITERS' ? 'recruiter' : 
            activeTab === 'VALIDATORS' ? 'ops_validator' :
            activeTab === 'ADMINS' ? 'admin' :
            'super_admin';
        return activeRoles.filter(role => getRoleType(role) === targetType);
    }, [activeRoles, activeTab, getRoleType]);

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1 group">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-600 transition-colors" />
                <input
                    type="text"
                    placeholder="Search users by name, email address, or department..."
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 h-9 bg-white border border-surface-200 rounded-sm text-[12.5px] font-normal text-surface-900 placeholder-surface-400 focus:outline-none focus:border-surface-400 focus:ring-1 focus:ring-surface-400/10 transition-all shadow-sm"
                />
            </div>
            
            {/* Account Filter */}
            <div className="relative min-w-[200px]">
                <Building size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                <select
                    value={accountFilter}
                    onChange={e => onAccountFilterChange(e.target.value)}
                    className="w-full pl-9 pr-8 h-9 bg-white border border-surface-200 rounded-sm text-[12px] font-bold text-surface-700 focus:border-surface-400 focus:outline-none appearance-none cursor-pointer shadow-sm"
                >
                    <option value="ALL">All Accounts</option>
                    <option value="UNASSIGNED">Unassigned General Pool</option>
                    {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                </select>
            </div>

            {/* Filter classification */}
            {showRoleFilter && (
                <div className="relative min-w-[200px]">
                    <Filter size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                    <select
                        value={roleFilter}
                        onChange={e => onRoleFilterChange(e.target.value as UserRole | 'ALL')}
                        className="w-full pl-9 pr-8 h-9 bg-white border border-surface-200 rounded-sm text-[12px] font-bold text-surface-700 focus:border-surface-400 focus:outline-none appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="ALL">All classification tiers</option>
                        {filterOptions.map(role => (
                            <option key={role} value={role}>{getLabel(role)}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}

interface UserTableProps {
    users: ManagedUser[];
    onToggleActive: (id: string, current: boolean) => void;
    onEdit: (user: ManagedUser) => void;
    onDelete: (user: ManagedUser) => void;
    onViewDashboard?: (user: ManagedUser) => void;
    groupBy?: 'department';
    departments?: any[];
}

export function UserTable({ users, onToggleActive, onEdit, onDelete, onViewDashboard, groupBy, departments = [] }: UserTableProps) {
    const { getLabel, getAccent, getRoleType } = useAccountTypeSettings();
    
    const groupedUsers = React.useMemo(() => {
        if (!groupBy) return { 'All Accounts': users };
        const groups: Record<string, ManagedUser[]> = {};
        const displayNames: Record<string, string> = {};
        
        users.forEach(u => {
            const rawDept = u.department || 'Unassigned General Pool';
            const depts = rawDept.includes(',')
                ? rawDept.split(',').map(d => d.trim()).filter(Boolean)
                : [rawDept];
            depts.forEach(dept => {
                const key = dept.toUpperCase();
                if (!displayNames[key]) displayNames[key] = dept;
                if (!groups[key]) groups[key] = [];
                if (!groups[key].some(existing => existing.id === u.id)) {
                    groups[key].push(u);
                }
            });
        });
        const result: Record<string, ManagedUser[]> = {};
        Object.keys(groups).forEach(key => {
            result[displayNames[key]] = groups[key];
        });
        return result;
    }, [users, groupBy]);

    return (
        <div className="space-y-6">
            {users.length === 0 ? (
                <div className="bg-white border border-surface-200 rounded-sm p-16 text-center shadow-sm">
                    <Users2 size={40} className="text-surface-200 mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-xs text-surface-400 font-semibold italic">No users matching search filters found.</p>
                </div>
            ) : (
                Object.entries(groupedUsers).map(([groupName, groupItems]) => (
                    <div key={groupName} className="bg-white border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                        {/* Group Header */}
                        <div className="px-5 py-3 bg-surface-50/50 border-b border-surface-150 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const matchingDep = departments.find(d => d.name.trim().toLowerCase() === groupName.trim().toLowerCase());
                                    return (
                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-surface-200 bg-white flex items-center justify-center shrink-0">
                                            {matchingDep && (matchingDep.accountImageUrl || matchingDep.accountImageData) ? (
                                                <img 
                                                    src={matchingDep.accountImageUrl || matchingDep.accountImageData || ''} 
                                                    alt={groupName} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <img src="/contactpoint-logo.png?v=2" alt="Logo" className="w-full h-full object-contain p-0.5" />
                                            )}
                                        </div>
                                    );
                                })()}
                                <span className="text-xs font-bold text-surface-800 tracking-tight">{groupName}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-200/60 text-surface-600 font-mono">
                                {groupItems.length} {groupItems.length === 1 ? 'operator' : 'operators'}
                            </span>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="text-left text-[10px] font-bold text-surface-400 uppercase tracking-wider border-b border-surface-200 bg-surface-50/10">
                                        <th className="px-5 py-3 w-1/3">Identity Profile</th>
                                        <th className="px-5 py-3">Auth Tier Classification</th>
                                        <th className="px-5 py-3">Provision Date</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3 text-right">Directives</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                    {groupItems.map(user => {
                                        const roleType = getRoleType(user.role as UserRole);
                                        const isLinkable = roleType === 'admin' || roleType === 'super_admin' || roleType === 'recruiter';
                                        return (
                                            <tr
                                                key={user.id}
                                                onClick={() => {
                                                    if (isLinkable) {
                                                        onViewDashboard?.(user);
                                                    }
                                                }}
                                                className={cn(
                                                    "group transition-colors",
                                                    isLinkable ? "hover:bg-surface-50/40 cursor-pointer" : "hover:bg-surface-50/20"
                                                )}
                                            >
                                                {/* Identity Info */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-surface-100 border border-surface-200 rounded-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 shadow-inner">
                                                            {user.avatar_data ? (
                                                                <img src={user.avatar_data} alt={user.full_name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-surface-600 font-mono">
                                                                    {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-surface-800 truncate leading-snug mb-0.5">{user.full_name}</p>
                                                            <p className="text-[10px] text-surface-400 font-medium truncate font-mono">{user.email}</p>
                                                            {user.department && !groupBy && (
                                                                <div className="text-[9.5px] text-primary-600 font-semibold flex items-center gap-1 mt-1">
                                                                    <Building size={9} />
                                                                    <span>{user.department}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role classification */}
                                                <td className="px-5 py-3.5">
                                                    <span className={cn(
                                                        "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 inline-block",
                                                        getAccent(user.role as UserRole).table
                                                    )}>
                                                        {getLabel(user.role as UserRole) || user.role}
                                                    </span>
                                                </td>

                                                {/* Provision Date */}
                                                <td className="px-5 py-3.5">
                                                    <p className="text-xs font-semibold text-surface-700 font-mono">{formatDate(user.created_at)}</p>
                                                    <p className="text-[9.5px] font-medium text-surface-400 mt-0.5">Initial Provision</p>
                                                </td>

                                                {/* Status Pill */}
                                                <td className="px-5 py-3.5">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                                        user.is_active 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                            : 'bg-red-50 text-red-700 border-red-100'
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
                                                        {user.is_active ? 'Active' : 'Restricted'}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-3.5">
                                                    <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        {isLinkable && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onViewDashboard?.(user); }}
                                                                className="h-7 w-7 inline-flex items-center justify-center text-surface-400 border border-surface-200 rounded-sm hover:text-black hover:border-black hover:bg-surface-50 transition-all shadow-sm"
                                                                title="Inspect performance dashboard"
                                                            >
                                                                <BarChart3 size={13} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onToggleActive(user.id, user.is_active); }}
                                                            className={cn(
                                                                "h-7 w-7 inline-flex items-center justify-center border transition-all rounded-sm shadow-sm",
                                                                user.is_active 
                                                                    ? "text-surface-400 border-surface-200 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/40" 
                                                                    : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                            )}
                                                            title={user.is_active ? "Restrict access" : "Restore access"}
                                                        >
                                                            {user.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onEdit(user); }}
                                                            className="h-7 w-7 inline-flex items-center justify-center text-surface-400 border border-surface-200 rounded-sm hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50/30 transition-all shadow-sm"
                                                            title="Edit user parameters"
                                                        >
                                                            <Edit size={13} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDelete(user); }}
                                                            className="h-7 w-7 inline-flex items-center justify-center text-surface-400 border border-surface-200 rounded-sm hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/40 transition-all shadow-sm"
                                                            title="Delete user profile"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
