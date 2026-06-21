import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Users, Shield, UserCheck } from 'lucide-react';
import { UserService } from '@/services/UserService';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';
import { cn } from '@/utils/formatters';

interface MembersPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SocketPresenceUser {
    id: string;
    full_name: string;
    role: string;
    page: string;
}

export function MembersPanel({ isOpen, onClose }: MembersPanelProps) {
    const { user: currentUser } = useAuthStore();
    const [members, setMembers] = useState<User[]>([]);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRoleFilter, setActiveRoleFilter] = useState<'ALL' | 'ADMIN' | 'RECRUITER' | 'INTERVIEWER' | 'OPS_VALIDATOR'>('ALL');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchMembers = async () => {
            try {
                setLoading(true);
                const data = await UserService.getAll();
                if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
                    const userDepts = (currentUser.department || '').split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
                    const filtered = data.filter(m => {
                        if (['ops_validator', 'guest_interviewer'].includes(currentUser.role)) {
                            if (m.role.startsWith('recruiter_')) return false;
                        }
                        if (currentUser.role.startsWith('recruiter_') && currentUser.role !== 'admin') {
                            if (['ops_validator', 'guest_interviewer'].includes(m.role)) return false;
                        }
                        const mDepts = (m.department || '').split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
                        return userDepts.length === 0 || mDepts.some(d => userDepts.includes(d));
                    });
                    setMembers(filtered);
                } else {
                    setMembers(data);
                }
            } catch (e) {
                console.error('Failed to fetch members:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();

        const socket = socketService.getSocket();

        // Emit join presence if not already joined
        if (currentUser) {
            socket.emit('presence:join', {
                id: currentUser.id,
                full_name: currentUser.full_name,
                role: currentUser.role,
                page: 'Forums'
            });
        }

        const handlePresenceList = (list: SocketPresenceUser[]) => {
            const onlineIds = new Set(list.map(u => u.id));
            if (currentUser) {
                onlineIds.add(currentUser.id);
            }
            setOnlineUserIds(onlineIds);
        };

        socket.on('presence:list', handlePresenceList);

        return () => {
            socket.off('presence:list', handlePresenceList);
        };
    }, [isOpen, currentUser]);

    const onlineMembers = members.filter(m => onlineUserIds.has(m.id));
    const offlineMembers = members.filter(m => !onlineUserIds.has(m.id));

    const filterByRole = (list: User[]) => {
        if (activeRoleFilter === 'ALL') return list;
        return list.filter(m => {
            const role = m.role.toLowerCase();
            if (activeRoleFilter === 'ADMIN') return role.includes('admin');
            if (activeRoleFilter === 'RECRUITER') return role.startsWith('recruiter_') && role !== 'recruiter_interviewer';
            if (activeRoleFilter === 'INTERVIEWER') return role === 'recruiter_interviewer';
            if (activeRoleFilter === 'OPS_VALIDATOR') return role === 'ops_validator';
            return true;
        });
    };

    const filterBySearch = (list: User[]) => {
        if (!searchQuery.trim()) return list;
        return list.filter(m => 
            m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.department || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const filteredOnline = filterBySearch(filterByRole(onlineMembers));
    const filteredOffline = filterBySearch(filterByRole(offlineMembers));

    const getRoleBadge = (role: string) => {
        const cleanRole = role.replace('recruiter_', '').toUpperCase();
        if (role.includes('admin')) {
            return (
                <span className="ml-1.5 px-1.5 py-0.5 bg-[#fde7e9] text-[#a80000] text-[9px] font-bold rounded-[3px] uppercase tracking-wide flex items-center gap-0.5 select-none">
                    <Shield size={9} />
                    <span>Admin</span>
                </span>
            );
        }
        return (
            <span className="ml-1.5 px-1.5 py-0.5 bg-[#edf6fd] text-[#0f6cbd] text-[9px] font-bold rounded-[3px] uppercase tracking-wide flex items-center gap-0.5 select-none">
                <UserCheck size={9} />
                <span>{cleanRole}</span>
            </span>
        );
    };

    const FILTER_ROLES = [
        { label: 'All', value: 'ALL' },
        { label: 'Admin', value: 'ADMIN' },
        { label: 'Recruiter', value: 'RECRUITER' },
        { label: 'Interviewer', value: 'INTERVIEWER' },
        { label: 'Ops Validator', value: 'OPS_VALIDATOR' }
    ] as const;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-transparent z-[50] cursor-pointer"
                    />
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: -20, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        className="absolute right-0 top-full mt-2 w-[360px] bg-white border border-[#edebe9] text-[#323130] shadow-2xl z-[60] flex flex-col rounded-lg max-h-[500px] overflow-hidden"
                        style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}
                    >
                        {/* Header */}
                        <div className="flex-none px-5 py-4 border-b border-[#edebe9] flex items-center justify-between bg-white shadow-sm z-10">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-1 h-5 bg-[#0f6cbd] rounded-full shrink-0" />
                                <h2 className="text-[15px] font-semibold text-[#323130] tracking-tight flex items-center gap-1.5">
                                    <Users size={16} className="text-[#0f6cbd]" />
                                    <span>Members</span>
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded hover:bg-[#f3f2f1] text-[#605e5c] hover:text-[#323130] transition-colors"
                            >
                                <X size={15} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Search and Account Type Filters (Discord-style header block) */}
                        <div className="px-4 py-3 bg-[#f3f2f1] border-b border-[#edebe9] space-y-2.5 flex-none">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search members..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white text-xs text-[#323130] placeholder-[#605e5c] pl-8 pr-4 py-1.5 rounded-[4px] outline-none border border-[#edebe9] focus:border-[#0f6cbd] transition-all"
                                />
                                <Search size={13} className="text-[#605e5c] absolute left-2.5 top-1/2 -translate-y-1/2" />
                            </div>

                            {/* Account Type Filters */}
                            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none select-none">
                                {FILTER_ROLES.map(filter => (
                                    <button
                                        key={filter.value}
                                        onClick={() => setActiveRoleFilter(filter.value)}
                                        className={cn(
                                            "px-2.5 py-1 text-[10px] font-semibold rounded-[3px] border whitespace-nowrap transition-all",
                                            activeRoleFilter === filter.value
                                                ? "bg-[#0f6cbd] text-white border-transparent shadow-sm"
                                                : "bg-white text-[#605e5c] border-[#edebe9] hover:bg-[#faf9f8]"
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 bg-[#faf9f8] space-y-5">
                            {loading ? (
                                <div className="px-4 py-12 text-center space-y-3">
                                    <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#0f6cbd] rounded-full animate-spin mx-auto" />
                                    <p className="text-[11px] text-[#605e5c] font-semibold uppercase tracking-wider">Loading members...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Online Category */}
                                    {filteredOnline.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="px-2 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider select-none">
                                                Online — {filteredOnline.length}
                                            </div>
                                            <div className="space-y-0.5">
                                                {filteredOnline.map(member => (
                                                    <div
                                                        key={member.id}
                                                        className="flex items-center gap-3 px-2 py-1.5 rounded-[4px] hover:bg-[#f3f2f1] cursor-pointer transition-all duration-150 group"
                                                    >
                                                        {/* Avatar container with status dot indicator */}
                                                        <div className="relative shrink-0">
                                                            {member.avatar_data ? (
                                                                <img src={member.avatar_data} alt={member.full_name} className="w-8 h-8 rounded-full object-cover border border-[#edebe9]" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-[#0f6cbd] flex items-center justify-center text-white text-[11px] font-semibold">
                                                                    {member.full_name.charAt(0)}
                                                                </div>
                                                            )}
                                                            {/* Green online dot indicator bottom right */}
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#107c41] rounded-full border-2 border-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center">
                                                                <span className="font-semibold text-xs text-[#323130] truncate group-hover:text-[#0f6cbd] transition-colors">
                                                                    {member.full_name}
                                                                </span>
                                                                {getRoleBadge(member.role)}
                                                            </div>
                                                            <p className="text-[10px] text-[#605e5c] truncate mt-0.5">
                                                                {member.department || 'Active Now'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Offline Category */}
                                    {filteredOffline.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="px-2 text-[10px] font-bold text-[#605e5c] uppercase tracking-wider select-none">
                                                Offline — {filteredOffline.length}
                                            </div>
                                            <div className="space-y-0.5">
                                                {filteredOffline.map(member => (
                                                    <div
                                                        key={member.id}
                                                        className="flex items-center gap-3 px-2 py-1.5 rounded-[4px] hover:bg-[#f3f2f1] cursor-pointer opacity-70 hover:opacity-100 transition-all duration-150 group"
                                                    >
                                                        {/* Avatar container with status dot indicator */}
                                                        <div className="relative shrink-0">
                                                            {member.avatar_data ? (
                                                                <img src={member.avatar_data} alt={member.full_name} className="w-8 h-8 rounded-full object-cover grayscale border border-[#edebe9]" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-[#a19f9d] flex items-center justify-center text-white text-[11px] font-semibold">
                                                                    {member.full_name.charAt(0)}
                                                                </div>
                                                            )}
                                                            {/* Gray offline dot indicator bottom right */}
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#a19f9d] rounded-full border-2 border-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center">
                                                                <span className="font-semibold text-xs text-[#323130] truncate group-hover:text-[#0f6cbd] transition-colors">
                                                                    {member.full_name}
                                                                </span>
                                                                {getRoleBadge(member.role)}
                                                            </div>
                                                            <p className="text-[10px] text-[#605e5c] truncate mt-0.5">
                                                                Offline
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {filteredOnline.length === 0 && filteredOffline.length === 0 && (
                                        <div className="text-center py-10">
                                            <p className="text-xs text-[#605e5c]">No members found</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
