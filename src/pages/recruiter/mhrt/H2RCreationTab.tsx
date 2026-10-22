import React from 'react';
import { ConfirmDialog } from '@/components/common/Modal';
import { useH2R } from './hooks/useH2R';
import { H2RTableHeader, H2RTable, H2RFormModal } from './components/H2RUI';

export function H2RCreationTab() {
    const {
        searchTerm, setSearchTerm,
        isLoading,
        isFormOpen, setIsFormOpen,
        editingRecord,
        deletingId, setDeletingId,
        formData, setFormData,
        scrollRef, isDragging,
        handleAdd, handleEdit, handleSave, handleDelete, handleExport,
        handleMouseDown, handleMouseUp, handleMouseMove,
        filteredRecords
    } = useH2R();

    return (
        <div className="space-y-4 animate-fade-in font-sans -mt-2 text-left">
            <H2RTableHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAdd={handleAdd}
                onExport={handleExport}
            />

            <H2RTable
                records={filteredRecords}
                isLoading={isLoading}
                isDragging={isDragging}
                scrollRef={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onEdit={handleEdit}
                onDelete={setDeletingId}
            />

            <H2RFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                editingRecord={editingRecord}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
            />

            <ConfirmDialog
                open={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDelete}
                title="Delete H2R Record"
                message="Are you sure you want to remove this H2R request record? This action will remove the record from the tracker permanently."
                confirmText="Delete H2R Record"
            />
        </div>
    );
}
