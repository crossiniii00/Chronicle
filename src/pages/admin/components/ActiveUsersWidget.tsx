import React from 'react';
import { usePresence } from '@/hooks/usePresence';
import { useAuthStore } from '@/store/authStore';
import { Users, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const SERIF_ITALIC = { fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 } as const;
function getInitials(name: string) {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ActiveUsersWidget() {
    const { user: currentUser } = useAuthStore();
    const { activeUsers } = usePresence('Admin Dashboard');

    const allUsers = [...activeUsers];
    if (currentUser) {
        allUsers.unshift({
            id: currentUser.id,
            full_name: currentUser.full_name,
            role: currentUser.role,
            page: 'Admin Dashboard',
            activity: null,
            lastSeen: Date.now()
        });
    }

    // Filter to show only relevant staff (Recruiters, Ops Validators, Admins)
    const onlineStaff = allUsers.filter(user => 
        ['admin', 'recruiter', 'ops_validator', 'recruiter_s'].includes(user.role.toLowerCase())
    );

    const getRoleColor = (role: string) => {
        const r = role.toLowerCase();
        if (r === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
        if (r.includes('ops_validator')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (r.includes('recruiter_s')) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // Default recruiter
    };

    const formatRoleName = (role: string) => {
        const r = role.toLowerCase();
        if (r === 'recruiter') return 'Recruiter';
        if (r === 'recruiter_s') return 'Recruiter (Senior)';
        if (r === 'ops_validator') return 'Ops Validator';
        if (r === 'admin') return 'Administrator';
        return role;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-left">
            <div className="px-5 py-4 flex items-center justify-between border-b border-[#f3f3f3] shrink-0">
                <h3 className="text-[11px] font-bold text-[#6b7280] uppercase tracking-[0.12em] flex items-center gap-1.5">
                    <Activity size={12} className="text-[#3b82f6]" />
                    Active Staff
                </h3>
                <span className="text-[10px] font-bold text-[#1d4ed8] bg-[#eff6ff] px-2 py-0.5 rounded-full">
                    {onlineStaff.length}
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {onlineStaff.length === 0 ? (
                    <div className="w-full text-center space-y-2 mt-8">
                        <Users size={24} className="mx-auto text-slate-300" />
                        <p className="text-[11px] text-[#6b7280] font-medium tracking-wide">No staff members currently online.</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <AnimatePresence>
                            {onlineStaff.map((user) => (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 cursor-pointer transition-colors group border-b border-transparent hover:border-slate-100"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-[#1f1f1f] text-sm font-bold" style={SERIF_ITALIC}>
                                            {getInitials(user.full_name)}
                                        </div>
                                        <div className="absolute inset-0 rounded-full border border-emerald-400 opacity-60 animate-ping z-0 scale-110" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full z-20 shadow-sm" />
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <p className="text-[12.5px] font-bold text-[#1f1f1f] truncate group-hover:text-[#3b82f6] transition-colors leading-tight">
                                            {user.full_name}
                                        </p>
                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5 uppercase tracking-wide">
                                            {formatRoleName(user.role)}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
