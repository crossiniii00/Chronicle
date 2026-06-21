import { useState, useEffect, useCallback } from 'react';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/store/authStore';

export interface ActiveUser {
    id: string;
    full_name: string;
    role: string;
    page: string;
    activity: {
        type: 'hover' | 'edit' | 'focus';
        targetId: string;
        fieldName?: string;
    } | null;
    lastSeen: number;
}

export function usePresence(currentPage: string) {
    const { user } = useAuthStore();
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

    useEffect(() => {
        if (!user) return;

        const socket = socketService.getSocket();
        
        // Join presence with user info
        socket.emit('presence:join', {
            id: user.id,
            full_name: user.full_name,
            role: user.role,
            page: currentPage
        });

        const handlePresenceList = (list: ActiveUser[]) => {
            // Filter out self and stale users
            const others = list.filter(u => u.id !== user.id);
            setActiveUsers(others);
        };

        socket.on('presence:list', handlePresenceList);

        return () => {
            socket.off('presence:list', handlePresenceList);
        };
    }, [user, currentPage]);

    const updateActivity = useCallback((activity: ActiveUser['activity']) => {
        const socket = socketService.getSocket();
        socket.emit('presence:update', { activity });
    }, []);

    const updatePage = useCallback((page: string) => {
        const socket = socketService.getSocket();
        socket.emit('presence:update', { page, activity: null });
    }, []);

    return {
        activeUsers,
        updateActivity,
        updatePage
    };
}
