import React from 'react';
import { ConfirmDialog } from '@/components/common/Modal';
import { useDivision } from './hooks/useDivision';
import { DivisionHeader, DivisionTable, DivisionFormModal } from './components/DivisionUI';

export function H2RDivisionTab() {
    const {
        searchTerm, setSearchTerm,
        isLoading,
        isFormOpen, setIsFormOpen,
        editingMapping,
        deletingId, setDeletingId,
        formData, setFormData,
        scrollRef, isDragging,
        handleAdd, handleEdit, handleSave, handleDelete,
        handleMouseDown, handleMouseUp, handleMouseMove,
        filteredData
    } = useDivision();

    return (
        <div className="space-y-4 animate-fade-in font-sans -mt-2 text-left">
            <DivisionHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAdd={handleAdd}
            />

            <DivisionTable
                mappings={filteredData}
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

            <DivisionFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                editingMapping={editingMapping}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
            />

            <ConfirmDialog
                open={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDelete}
                title="Delete Division Mapping"
                message="Are you sure you want to remove this division mapping? Related H2R requests may lose their role context."
                confirmText="Remove Mapping"
            />
        </div>
    );
}
