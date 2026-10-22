import React from 'react';
import { ConfirmDialog } from '@/components/common/Modal';
import { useAccounts } from './hooks/useAccounts';
import { AccountTableHeader, AccountFormModal } from './components/AccountOverlays';
import { AccountTable } from './components/AccountTable';

export function AccountsTab() {
    const {
        searchTerm, setSearchTerm,
        isLoading, accounts,
        isFormOpen, setIsFormOpen,
        editingAccount,
        deletingId, setDeletingId,
        formData, setFormData,
        scrollRef, isDragging,
        handleAdd, handleEdit, handleSave, handleDelete, handleInlineSave,
        handleMouseDown, handleMouseUp, handleMouseMove,
        filteredAccounts
    } = useAccounts();

    return (
        <div className="space-y-4 animate-fade-in font-sans -mt-2">
            <AccountTableHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAdd={handleAdd}
                totalCount={accounts.length}
                filteredCount={filteredAccounts.length}
            />

            <AccountTable
                accounts={filteredAccounts}
                isLoading={isLoading}
                isDragging={isDragging}
                scrollRef={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseUp}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onEdit={handleEdit}
                onDelete={setDeletingId}
                onInlineSave={handleInlineSave}
            />

            <AccountFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                editingAccount={editingAccount}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
            />

            <ConfirmDialog
                open={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDelete}
                title="Delete Account Configuration"
                message="Are you sure you want to remove this account's MHRT configuration? This action cannot be undone and will affect all related hiring pipelines."
                confirmText="Delete permanently"
            />
        </div>
    );
}
