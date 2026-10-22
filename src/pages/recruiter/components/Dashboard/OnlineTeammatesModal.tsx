import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { OnlineUserRow } from './OnlineUserRow';
import type { ActiveUser } from '@/hooks/usePresence';

interface OnlineTeammatesModalProps {
    open: boolean;
    onClose: () => void;
    allOnlineUsers: ActiveUser[];
    currentUserId?: string;
}

export const OnlineTeammatesModal: React.FC<OnlineTeammatesModalProps> = ({
    open,
    onClose,
    allOnlineUsers,
    currentUserId
}) => {
    const [search, setSearch] = useState('');

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return allOnlineUsers;
        return allOnlineUsers.filter(u =>
            (u.full_name || '').toLowerCase().includes(term) ||
            (u.role || '').toLowerCase().includes(term) ||
            (u.page || '').toLowerCase().includes(term)
        );
    }, [allOnlineUsers, search]);

    return (
        <Modal
            open={open}
            onClose={() => {
                onClose();
                setSearch('');
            }}
            title="Online teammates"
            size="lg"
        >
            <div className="p-5 space-y-4">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, role, or page..."
                        className="w-full pl-9 pr-9 py-2.5 text-[12px] font-medium text-surface-900 placeholder:text-surface-400 placeholder:font-normal bg-surface-50 border border-surface-200 rounded-none focus:bg-white dark:bg-slate-900 focus:border-black focus:outline-none transition-colors"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-700 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">
                        {filteredUsers.length} {filteredUsers.length === 1 ? 'teammate' : 'teammates'} live
                    </p>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-vibrant-emerald animate-pulse" />
                        <span className="text-[9px] font-bold text-surface-500 uppercase tracking-widest">Real-time</span>
                    </div>
                </div>

                <div className="max-h-[480px] overflow-y-auto -mx-1 px-1">
                    {filteredUsers.length === 0 ? (
                        <div className="py-16 text-center text-surface-400 text-xs italic">
                            No teammates match "{search}"
                        </div>
                    ) : (
                        <div className="divide-y divide-surface-100">
                            {filteredUsers.map((u) => (
                                <OnlineUserRow
                                    key={u.id}
                                    user={u}
                                    isSelf={u.id === currentUserId}
                                    showActivity
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
