import React from 'react';
import { ConfirmDialog } from '@/components/common/Modal';
import { useTimeOff } from './hooks/useTimeOff';
import { TimeOffHeader, TimeOffTable, TimeOffFormModal } from './components/TimeOffUI';

export function AssignedTimeOffTab() {
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
    } = useTimeOff();

    return (
        <div className="space-y-4 animate-fade-in font-sans -mt-2 text-left">
            <TimeOffHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAdd={handleAdd}
            />

            <TimeOffTable
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

            <TimeOffFormModal
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
                title="Delete Time Off Assignment"
                message="Are you sure you want to remove this time off location assignment? This will decouple the location group from the assigned roles in the tracker."
                confirmText="Remove Assignment"
            />
        </div>
    );
}
