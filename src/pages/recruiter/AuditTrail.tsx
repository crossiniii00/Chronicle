import { useState } from 'react';
import { Filter, Loader2, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { useAuditTrail } from './hooks/useAuditTrail';
import { AuditHeader, AuditStats, AuditTable, LogDetailsModal } from './components/AuditTrailUI';

export function RecruiterAudit() {
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const {
        loading, isDeleting, searchTerm, setSearchTerm, filterAction, setFilterAction,
        filterUser, setFilterUser, filterDate, setFilterDate, selectedLog, previewModal,
        setPreviewModal, handlePreview, filteredLogs, uniqueActions, uniqueUsers,
        stats, clearFilters, selectedIds, toggleSelection, toggleSelectAll, handleBulkDelete
    } = useAuditTrail();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-left">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin text-left" />
                <p className="text-[11.5px] font-medium text-surface-400 tracking-[-0.005em] animate-pulse">Loading audit logs...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-in text-left">
            <AuditHeader searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <AuditStats stats={stats} onTodayClick={() => setFilterDate(new Date().toISOString().split('T')[0])} />

            <div className="flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-neutral-200/80 shadow-sm">
                <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                    <div className="flex items-center gap-1.5 text-left pr-1">
                        <Filter size={13} className="text-neutral-400" />
                        <span className="text-[11.5px] font-bold text-neutral-600 tracking-tight">Filters</span>
                    </div>
                    <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="h-8 px-3 text-xs font-semibold tracking-tight border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 bg-white dark:bg-slate-900 text-neutral-700 cursor-pointer">
                        <option value="all">All actions</option>
                        {uniqueActions.map(action => <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>)}
                    </select>
                    <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="h-8 px-3 text-xs font-semibold tracking-tight border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 bg-white dark:bg-slate-900 text-neutral-700 cursor-pointer">
                        <option value="all">All users</option>
                        {uniqueUsers.sort().map(user => <option key={user} value={user}>{user}</option>)}
                    </select>
                    <div className="flex items-center gap-2 px-3 h-8 border border-neutral-200 rounded-md bg-white dark:bg-slate-900 focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-200 transition-colors">
                        <Calendar size={13} className="text-neutral-400" />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent border-none text-xs font-semibold tracking-tight outline-none text-neutral-700"
                        />
                    </div>
                    <button onClick={clearFilters} className="h-8 px-3 text-xs font-semibold tracking-tight border border-neutral-200 rounded-md hover:bg-neutral-50 transition-all text-neutral-600 hover:text-neutral-900 bg-white dark:bg-slate-900">Clear filters</button>
                    
                    <button
                        type="button"
                        onClick={() => {
                            if (isSelectionMode) {
                                // Clear selections by ensuring we deselect everything
                                if (selectedIds.size > 0) {
                                    if (selectedIds.size !== filteredLogs.length) {
                                        toggleSelectAll(); // first select all
                                    }
                                    toggleSelectAll(); // then deselect all to reset
                                }
                            }
                            setIsSelectionMode(!isSelectionMode);
                        }}
                        className={cn(
                            "h-8 px-3 flex items-center gap-1.5 text-xs font-semibold tracking-tight border rounded-md transition-all",
                            isSelectionMode
                                ? "bg-neutral-800 text-white border-neutral-800 hover:bg-neutral-700"
                                : "bg-white dark:bg-slate-900 text-rose-600 border-neutral-200 hover:bg-rose-50 hover:border-rose-200"
                        )}
                    >
                        <Trash2 size={12} />
                        {isSelectionMode ? "Cancel Selection" : "Delete Logs"}
                    </button>
                </div>

                {isSelectionMode && (
                    <div className="flex items-center gap-2.5 animate-slide-in-right">
                        <span className="text-[11px] font-bold text-neutral-700 tracking-tight">{selectedIds.size} selected</span>
                        <button
                            type="button"
                            disabled={selectedIds.size === 0 || isDeleting}
                            onClick={async () => {
                                await handleBulkDelete();
                                setIsSelectionMode(false);
                            }}
                            className={cn(
                                'h-8 px-3.5 flex items-center gap-1.5 rounded-md text-xs font-bold transition-all border shadow-sm',
                                selectedIds.size === 0 || isDeleting
                                    ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed shadow-none'
                                    : 'bg-rose-600 text-white hover:bg-rose-700 border-rose-650'
                            )}
                        >
                            {isDeleting ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Trash2 size={12} />
                            )}
                            {isDeleting ? 'Deleting...' : 'Delete Selected'}
                        </button>
                    </div>
                )}
            </div>

            <AuditTable
                logs={filteredLogs}
                onPreview={handlePreview}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleSelectAll={toggleSelectAll}
                isSelectionMode={isSelectionMode}
            />

            <div className="px-5 py-3 bg-neutral-50/50 border border-neutral-200/80 rounded-lg flex items-center justify-between text-left shadow-sm">
                <p className="text-xs font-semibold text-neutral-500">{filteredLogs.length} of {stats.total} logs shown</p>
            </div>

            <LogDetailsModal log={selectedLog} open={previewModal} onClose={() => setPreviewModal(false)} />
        </div>
    );
}
