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
        <div className="bg-white dark:bg-slate-950 border-b-2 border-slate-200 dark:border-slate-800">
            <div className="max-w-[1600px] mx-auto px-8 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                {/* Title & Subtitle */}
                <div className="space-y-1.5 text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
                            <Users size={18} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                            User Directory
                        </h1>
                    </div>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">
                        Manage system operators & privileges
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 sm:self-center">
                    <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING}
                        onClick={onSettings}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase tracking-widest hover:border-slate-900 dark:hover:border-white hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                        title="Configure access settings"
                    >
                        <Sliders size={14} strokeWidth={2.5} />
                        Configure
                    </motion.button>
                    <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING}
                        onClick={onAdd}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 border-2 border-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 hover:border-blue-700 transition-all shadow-[4px_4px_0px_0px_rgba(37,99,235,0.3)] hover:shadow-[2px_2px_0px_0px_rgba(37,99,235,0.3)]"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Provision User
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
        border: 'border-blue-500',
        bg: 'bg-blue-50/40',
    },
    VALIDATORS: {
        iconColor: 'text-purple-500',
        iconColorBright: 'text-purple-600',
        accent: 'bg-purple-600',
        border: 'border-purple-500',
        bg: 'bg-purple-50/40',
    },
    ADMINS: {
        iconColor: 'text-rose-500',
        iconColorBright: 'text-rose-600',
        accent: 'bg-rose-600',
        border: 'border-rose-500',
        bg: 'bg-rose-50/40',
    },
    SUPER_ADMINS: {
        iconColor: 'text-amber-500',
        iconColorBright: 'text-amber-600',
        accent: 'bg-amber-600',
        border: 'border-amber-500',
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
        { id: 'RECRUITERS', label: 'Recruiters', description: 'Talent Acquisition', icon: Users2, count: recruiterCount, accent: TAB_ACCENTS.RECRUITERS },
        { id: 'VALIDATORS', label: 'OPS Validators', description: 'Operations Verification', icon: HardHat, count: validatorCount, accent: TAB_ACCENTS.VALIDATORS },
        { id: 'ADMINS', label: 'Administrators', description: 'System Management', icon: Shield, count: adminCount, accent: TAB_ACCENTS.ADMINS },
        { id: 'SUPER_ADMINS', label: 'Super Admins', description: 'Root Accounts', icon: Crown, count: superAdminCount, accent: TAB_ACCENTS.SUPER_ADMINS },
    ];

    return (
        <div className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800">
            <div className="max-w-[1600px] mx-auto px-8">
                <div className="flex flex-row overflow-x-auto gap-1">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "px-6 py-5 text-left transition-all relative flex flex-col min-w-[200px] group border-b-4",
                                    isActive
                                        ? "bg-white dark:bg-slate-950 border-blue-600"
                                        : "bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <tab.icon
                                            size={18}
                                            className={cn(
                                                "shrink-0 transition-colors",
                                                isActive ? tab.accent.iconColorBright : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                            )}
                                        />
                                        <span className={cn(
                                            "text-[13px] font-black tracking-widest uppercase transition-colors",
                                            isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                                        )}>{tab.label}</span>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 text-[10px] font-black rounded-none min-w-[24px] text-center transition-colors border",
                                        isActive ? `${tab.accent.bg} ${tab.accent.iconColorBright} ${tab.accent.border}` : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                    )}>
                                        {tab.count}
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold tracking-wider uppercase truncate transition-colors",
                                    isActive ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400"
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
    statusFilter: 'ALL' | 'ACTIVE' | 'RESTRICTED';
    onStatusFilterChange: (s: 'ALL' | 'ACTIVE' | 'RESTRICTED') => void;
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
    statusFilter,
    onStatusFilterChange,
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
        <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-950 p-6 border-b-2 border-slate-200 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors" strokeWidth={2.5} />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    className="w-full pl-12 pr-4 h-11 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-none text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white focus:bg-white dark:focus:bg-slate-950 transition-all shadow-sm"
                />
            </div>
            
            {/* Account Filter */}
            {activeTab === 'VALIDATORS' && (
                <div className="relative min-w-[240px]">
                    <Building size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={2.5} />
                    {(() => {
                        const isSupportDept = (name: string) => {
                            const dept = departments.find(d => d.name === name);
                            if (dept?.type) return dept.type === 'SUPPORT_ROLES';
                            const lower = name.toLowerCase().trim();
                            return ['admin', 'hr', 'support', 'recruitment', 'it', 'facilities', 'finance', 'human resources', 'engagement', 'operations', 'safety', 'security', 'ta', 'training', 'workforce', 'managerial position', 'safety officer', 'team leader intern', 'team leader position', 'support and leadership', 'revenue & invoicing', 'quality assurance', 'training & development', 'engagement & social media', 'it department', 'client engagement & asset control', 'process optimization'].includes(lower) || lower.includes('support');
                        };
                        const supportDepts = departments.filter(d => isSupportDept(d.name));
                        const accountDepts = departments.filter(d => !isSupportDept(d.name));
                        return (
                            <select
                                value={accountFilter}
                                onChange={e => onAccountFilterChange(e.target.value)}
                                className="w-full pl-11 pr-10 h-11 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-none text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 focus:border-slate-900 dark:focus:border-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none appearance-none cursor-pointer transition-all shadow-sm"
                            >
                                <option value="ALL">All Accounts</option>
                                <option value="UNASSIGNED">Recruiters Lounge</option>
                                {accountDepts.length > 0 && (
                                    <optgroup label="Accounts" className="font-bold">
                                        {accountDepts.map(dept => (
                                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                                {supportDepts.length > 0 && (
                                    <optgroup label="Support Roles" className="font-bold">
                                        {supportDepts.map(dept => (
                                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        );
                    })()}
                </div>
            )}

            {/* Status Filter */}
            <div className="relative min-w-[180px]">
                <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={2.5} />
                <select
                    value={statusFilter}
                    onChange={e => onStatusFilterChange(e.target.value as 'ALL' | 'ACTIVE' | 'RESTRICTED')}
                    className="w-full pl-11 pr-10 h-11 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-none text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 focus:border-slate-900 dark:focus:border-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none appearance-none cursor-pointer transition-all shadow-sm"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="RESTRICTED">Restricted Only</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                    </svg>
                </div>
            </div>

            {/* Filter classification */}
            {showRoleFilter && (
                <div className="relative min-w-[200px]">
                    <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={2.5} />
                    <select
                        value={roleFilter}
                        onChange={e => onRoleFilterChange(e.target.value as UserRole | 'ALL')}
                        className="w-full pl-11 pr-10 h-11 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-none text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 focus:border-slate-900 dark:focus:border-white focus:bg-white dark:focus:bg-slate-950 focus:outline-none appearance-none cursor-pointer transition-all shadow-sm"
                    >
                        <option value="ALL">All Tiers</option>
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
            const rawDept = u.department || 'Recruiters Lounge';
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
        <div className="space-y-10 py-8 max-w-[1600px] mx-auto px-8">
            {users.length === 0 ? (
                <div className="bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 p-20 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                    <Users2 size={48} className="text-slate-300 dark:text-slate-700 mx-auto mb-6" strokeWidth={1} />
                    <p className="text-[13px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">No users match criteria</p>
                </div>
            ) : (
                Object.entries(groupedUsers).map(([groupName, groupItems]) => (
                    <div key={groupName} className="bg-white dark:bg-slate-950 border-2 border-slate-900 dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] mb-8 transition-all">
                        {/* Group Header */}
                        <div className="px-6 py-4 bg-slate-900 dark:bg-white border-b-2 border-slate-900 dark:border-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {(() => {
                                    const matchingDep = departments.find(d => d.name.trim().toLowerCase() === groupName.trim().toLowerCase());
                                    return (
                                        <div className="w-8 h-8 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 border-2 border-slate-900 dark:border-white">
                                            {matchingDep && (matchingDep.accountImageUrl || matchingDep.accountImageData) ? (
                                                <img 
                                                    src={matchingDep.accountImageUrl || matchingDep.accountImageData || ''} 
                                                    alt={groupName} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <Building size={16} className="text-slate-900 dark:text-white" strokeWidth={2.5} />
                                            )}
                                        </div>
                                    );
                                })()}
                                <span className="text-[15px] font-black uppercase tracking-widest text-white dark:text-slate-900">{groupName}</span>
                            </div>
                            <span className="text-[11px] font-black tracking-widest uppercase px-3 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-white dark:border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]">
                                {groupItems.length} {groupItems.length === 1 ? 'USR' : 'USRS'}
                            </span>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 border-r-2 border-slate-200 dark:border-slate-800 w-1/3">Identity Profile</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 border-r-2 border-slate-200 dark:border-slate-800">Auth Tier</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 border-r-2 border-slate-200 dark:border-slate-800">Provisioned</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 border-r-2 border-slate-200 dark:border-slate-800">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 text-right">Directives</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800/50">
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
                                                    "group transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50",
                                                    isLinkable ? "cursor-pointer" : ""
                                                )}
                                            >
                                                {/* Identity Info */}
                                                <td className="px-6 py-4 border-r-2 border-slate-100 dark:border-slate-800/50 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center border-2 border-transparent group-hover:border-slate-900 dark:group-hover:border-white transition-all shadow-sm">
                                                            {user.avatar_data ? (
                                                                <img src={user.avatar_data} alt={user.full_name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[12px] font-black font-mono tracking-widest">
                                                                    {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-wider truncate">{user.full_name}</p>
                                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                                                            {user.department && !groupBy && (
                                                                <div className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mt-2">
                                                                    <Building size={10} strokeWidth={3} />
                                                                    <span>{user.department}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role classification */}
                                                <td className="px-6 py-4 border-r-2 border-slate-100 dark:border-slate-800/50 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                                                    <span className={cn(
                                                        "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2",
                                                        getAccent(user.role as UserRole).table.replace('rounded-md', 'rounded-none')
                                                    )}>
                                                        {getLabel(user.role as UserRole) || user.role}
                                                    </span>
                                                </td>

                                                {/* Provision Date */}
                                                <td className="px-6 py-4 border-r-2 border-slate-100 dark:border-slate-800/50 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                                                    <p className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{formatDate(user.created_at)}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Provisioned</p>
                                                </td>

                                                {/* Status Pill */}
                                                <td className="px-6 py-4 border-r-2 border-slate-100 dark:border-slate-800/50 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                                                    <span className={cn(
                                                        "inline-flex items-center justify-center px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 min-w-[100px]",
                                                        user.is_active 
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-500' 
                                                            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-500'
                                                    )}>
                                                        {user.is_active ? 'Active' : 'Restricted'}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                        {onViewDashboard && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onViewDashboard?.(user); }}
                                                                className="h-8 w-8 inline-flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all active:scale-95 shadow-sm"
                                                                title="Inspect performance dashboard"
                                                            >
                                                                <BarChart3 size={14} strokeWidth={2.5} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onToggleActive(user.id, user.is_active); }}
                                                            className={cn(
                                                                "h-8 w-8 inline-flex items-center justify-center border-2 transition-all active:scale-95 shadow-sm bg-white dark:bg-slate-900",
                                                                user.is_active 
                                                                    ? "border-slate-200 dark:border-slate-700 text-emerald-500 hover:text-emerald-600 hover:border-emerald-500" 
                                                                    : "border-slate-200 dark:border-slate-700 text-red-500 hover:text-red-600 hover:border-red-500"
                                                            )}
                                                            title={user.is_active ? "Active - Click to Restrict" : "Restricted - Click to Activate"}
                                                        >
                                                            {user.is_active ? <Unlock size={14} strokeWidth={2.5} /> : <Lock size={14} strokeWidth={2.5} />}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onEdit(user); }}
                                                            className="h-8 w-8 inline-flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-600 hover:border-amber-600 transition-all active:scale-95 shadow-sm"
                                                            title="Edit user parameters"
                                                        >
                                                            <Edit size={14} strokeWidth={2.5} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDelete(user); }}
                                                            className="h-8 w-8 inline-flex items-center justify-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-600 transition-all active:scale-95 shadow-sm"
                                                            title="Delete user profile"
                                                        >
                                                            <Trash2 size={14} strokeWidth={2.5} />
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
