import React from 'react';
import { ConfirmDialog } from '@/components/common/Modal';
import { useDirectory } from './hooks/useDirectory';
import { DirectoryHeader, DirectoryTable, DirectoryFormModal } from './components/DirectoryUI';

export function DirectoryTab() {
    const {
        searchTerm, setSearchTerm,
        entries, isLoading,
        isFormOpen, setIsFormOpen,
        editingItem,
        deletingId, setDeletingId,
        formData, setFormData,
        copiedId,
        scrollRef, isDragging,
        handleAdd, handleEdit, handleSave, handleDelete,
        handleMouseDown, handleMouseUp, handleMouseMove,
        handleCopy, filteredData
    } = useDirectory();

    return (
        <div className="space-y-4 animate-fade-in font-sans -mt-2 text-left">
            <DirectoryHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAdd={handleAdd}
                count={filteredData.length}
            />

            <DirectoryTable
                entries={filteredData}
                isLoading={isLoading}
                isDragging={isDragging}
                scrollRef={scrollRef}
                copiedId={copiedId}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onCopy={handleCopy}
                onEdit={handleEdit}
                onDelete={setDeletingId}
            />

            <div className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-sm">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest text-left">Total Accounts</span>
                        <span className="text-lg font-black text-[#002060] leading-none mb-1 text-left">
                            {new Set(entries.map(d => d.account)).size}
                        </span>
                    </div>
                    <div className="w-[1px] h-8 bg-surface-200" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest text-left">Active Distros</span>
                        <span className="text-lg font-black text-[#002060] leading-none mb-1 text-left">
                            {entries.length}
                        </span>
                    </div>
                </div>
            </div>

            <DirectoryFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                editingItem={editingItem}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
            />

            <ConfirmDialog
                open={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDelete}
                title="Delete Directory Entry"
                message="Are you sure you want to remove this directory entry? This will permanently delete the distribution list reference."
                confirmText="Delete Entry"
            />
        </div>
    );
}
