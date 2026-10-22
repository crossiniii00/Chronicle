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
        
        const joinPresence = () => {
            socket.emit('presence:join', {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                page: currentPage
            });
        };

        // Join initially
        joinPresence();

        const handlePresenceList = (list: ActiveUser[]) => {
            // Deduplicate by user id (handles multiple tabs open)
            const uniqueMap = new Map<string, ActiveUser>();
            list.forEach(u => {
                if (u.id) {
                    // Store latest or first, just need one per user
                    uniqueMap.set(u.id, u);
                }
            });
            const uniqueUsers = Array.from(uniqueMap.values());

            // Filter out self
            const others = uniqueUsers.filter(u => u.id !== user.id);
            setActiveUsers(others);
        };

        socket.on('connect', joinPresence);
        socket.on('presence:list', handlePresenceList);

        return () => {
            socket.off('connect', joinPresence);
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
