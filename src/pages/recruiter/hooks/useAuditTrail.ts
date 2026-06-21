import { useState, useEffect, useMemo } from 'react';
import { AuditService } from '@/services/AuditService';
import { useAuthStore } from '@/store/authStore';
import type { AuditLog } from '@/types';

export function useAuditTrail() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [filterUser, setFilterUser] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [previewModal, setPreviewModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const { user } = useAuthStore();

    const loadLogs = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await AuditService.getAll();
            const logsArray = Array.isArray(data) ? data : [];
            setLogs(logsArray.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error("Failed to load audit logs:", error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = searchTerm === '' ||
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAction = filterAction === 'all' || log.action === filterAction;
            const matchesUser = filterUser === 'all' || log.user_name === filterUser;
            const matchesDate = filterDate === '' || new Date(log.created_at).toISOString().split('T')[0] === filterDate;

            return matchesSearch && matchesAction && matchesUser && matchesDate;
        });
    }, [logs, searchTerm, filterAction, filterUser, filterDate]);

    const uniqueActions = useMemo(() => [...new Set(logs.map(log => log.action).filter(Boolean))], [logs]);
    const uniqueUsers = useMemo(() => [...new Set(logs.map(log => log.user_name).filter(Boolean))], [logs]);

    const stats = useMemo(() => ({
        total: logs.length,
        today: logs.filter(log => {
            const logDate = new Date(log.created_at);
            const today = new Date();
            return logDate.toDateString() === today.toDateString();
        }).length
    }), [logs]);

    useEffect(() => {
        loadLogs();
    }, [user]);

    const handlePreview = (log: AuditLog) => {
        setSelectedLog(log);
        setPreviewModal(true);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLogs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLogs.map(l => l.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0 || isDeleting) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} logs?`)) return;

        setIsDeleting(true);
        try {
            await AuditService.bulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
            await loadLogs();
        } catch (error) {
            console.error("Bulk delete failed:", error);
            alert("Failed to delete logs. Admin privileges required.");
        } finally {
            setIsDeleting(false);
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilterAction('all');
        setFilterUser('all');
        setFilterDate('');
    };

    return {
        logs: logs || [], 
        loading, 
        isDeleting,
        searchTerm, 
        setSearchTerm, 
        filterAction, 
        setFilterAction,
        filterUser, 
        setFilterUser, 
        filterDate,
        setFilterDate,
        selectedLog, 
        setSelectedLog, 
        previewModal,
        setPreviewModal, 
        handlePreview, 
        filteredLogs: filteredLogs || [], 
        uniqueActions: uniqueActions || [], 
        uniqueUsers: uniqueUsers || [],
        stats: stats || { total: 0, today: 0 }, 
        clearFilters, 
        selectedIds: selectedIds || new Set(), 
        toggleSelection, 
        toggleSelectAll, 
        handleBulkDelete
    };
}
