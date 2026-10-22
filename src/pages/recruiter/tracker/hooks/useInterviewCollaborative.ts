import { useState, useEffect } from 'react';
import { socketService } from '@/services/socketService';

interface CollaborativeProps {
    user: any;
    activeTab: string;
}

export function useInterviewCollaborative({ user, activeTab }: CollaborativeProps) {
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [userFocus, setUserFocus] = useState<Record<string, { userId: string; fullName: string; color: string; field: string; appId: string }>>({});
    const [remoteChanges, setRemoteChanges] = useState<Record<string, Record<string, any>>>({});

    useEffect(() => {
        const socket = socketService.getSocket();

        // Collaborative Events
        socket.on('presence:list', (users: any[]) => {
            setActiveUsers(users.filter(u => u.id !== user?.id));
        });

        socket.on('presence:user-joined', (u: any) => {
            if (u.id !== user?.id) {
                setActiveUsers(prev => [...prev.filter(curr => curr.id !== u.id), u]);
            }
        });

        socket.on('presence:user-left', (userId: string) => {
            setActiveUsers(prev => prev.filter(u => u.id !== userId));
            setUserFocus(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => {
                    if (next[k].userId === userId) delete next[k];
                });
                return next;
            });
        });

        socket.on('presence:user-focused', (focus: any) => {
            if (focus.userId !== user?.id) {
                setUserFocus(prev => ({
                    ...prev,
                    [focus.userId]: focus
                }));
            }
        });

        socket.on('applications:typing', (data: { appId: string; field: string; value: string; userId: string }) => {
            if (data.userId !== user?.id) {
                setRemoteChanges(prev => ({
                    ...prev,
                    [data.appId]: {
                        ...(prev[data.appId] || {}),
                        [data.field]: data.value
                    }
                }));
            }
        });

        // Emit Join
        if (user) {
            socket.emit('presence:join', {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                page: activeTab || 'Interview',
                joinedAt: new Date().toISOString()
            });
        }

        return () => {
            socket.off('presence:list');
            socket.off('presence:user-joined');
            socket.off('presence:user-left');
            socket.off('presence:user-focused');
            socket.off('applications:typing');
            socket.emit('presence:leave', user?.id);
        };
    }, [user, activeTab]);

    return {
        activeUsers,
        setActiveUsers,
        userFocus,
        setUserFocus,
        remoteChanges,
        setRemoteChanges
    };
}
