import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useMasterlist } from './masterlist/hooks/useMasterlist';
import { MasterlistHeader } from './masterlist/components/MasterlistHeader';
import { MONTHS } from './masterlist/constants';
import { MasterlistTabs } from './masterlist/components/MasterlistTabs';
import { BulkActionBar } from './masterlist/components/BulkActionBar';
import { MasterlistPivotFilters } from './masterlist/components/MasterlistPivotFilters';
import { MasterlistTable, spotlightCell } from './masterlist/components/MasterlistTable';
import { AccountCards } from './masterlist/components/AccountCards';
import { MasterlistPivotAnalysis } from './masterlist/components/MasterlistPivotAnalysis';
import { ImportPreviewModal } from './masterlist/components/ImportPreviewModal';
import { NotesDrawer } from './components/NotesDrawer';
import { ReprofileHistoryModal } from './components/ReprofileHistoryModal';
import { MasterlistFilterBar } from './masterlist/components/MasterlistFilterBar';
import type { Application } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';

import { HiringReportsView } from './HiringReportsView';
import { InactiveView } from './InactiveView';
import SalaryReferenceView from './SalaryReferenceView';
import { DailyHCReportView } from './DailyHCReportView';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';
import { AddApplicantRegistryModal } from '@/components/features/Registry/AddApplicantRegistryModal';
import { ConfirmDialog } from '@/components/common/Modal';
import { BulkDeleteProgress } from '@/components/features/ApplicantManagement/BulkDeleteProgress';

interface WithdrawalModalProps {
    pendingWithdrawal: any;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

function WithdrawalModal({ pendingWithdrawal, onConfirm, onCancel }: WithdrawalModalProps) {
    const [withdrawalReason, setWithdrawalReason] = React.useState('');

    React.useEffect(() => {
        if (!pendingWithdrawal) {
            setWithdrawalReason('');
        }
    }, [pendingWithdrawal]);

    if (!pendingWithdrawal) return null;

    return (
        <ConfirmDialog
            open={!!pendingWithdrawal}
            title="Withdrawal Confirmation"
            message="This applicant will be moved to the Offboarding Tracker."
            confirmText="Confirm & Move"
            confirmClass="bg-red-600 hover:bg-red-700 text-white"
            onConfirm={() => onConfirm(withdrawalReason)}
            onClose={onCancel}
        >
            <div className="space-y-2 mt-2">
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Reason for Withdrawal</label>
                <textarea
                    value={withdrawalReason}
                    onChange={(e) => setWithdrawalReason(e.target.value)}
                    placeholder="Enter the reason why this candidate withdrew..."
                    className="w-full p-3 text-xs bg-surface-50 border border-surface-200 rounded-none focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none min-h-[100px] transition-colors resize-none text-surface-900"
                />
            </div>
        </ConfirmDialog>
    );
}

export function MasterlistView() {
    const location = useLocation();
    const {
        search, setSearch, loading, allApplications, selectedAccount, setSelectedAccount,
        showAddModal, setShowAddModal, activeTab, setActiveTab,
        activeSubTab, setActiveSubTab, isEditing, setIsEditing, localChanges, setLocalChanges,
        isSyncing, selectedIds, setSelectedIds, isSelectMode, setIsSelectMode, isBulkDeleting, bulkDeleteProgress, deletingId, setDeletingId,
        pivotTraining, setPivotTraining, pivotPosition, setPivotPosition,
        pivotStatus, setPivotStatus, pivotAccount, setPivotAccount,
        loadData, handleEdit, handleSyncAll, handleCancelEdit, handleBulkDelete, handleDelete,
        filteredList, accountMetrics, pivotOptions, importPreview, setImportPreview,
        handleImportCSV, handleConfirmImport, selectedStatus, setSelectedStatus,
        selectedWave, setSelectedWave, waveOptions,
        selectedMonth, setSelectedMonth, selectedDay, setSelectedDay,
        selectedDateFilter, setSelectedDateFilter,
        pendingWithdrawal, setPendingWithdrawal,
        toggleSelectAll, toggleSelect,
        emailFilter, setEmailFilter,
        notesApp, setNotesApp, handleSaveNote, anchorRect, setAnchorRect,
        focusPath, setFocusPath,
        success, error,
        handleExportExcel, handleBulkHighlight, handleBulkMasterlistTransfer
    } = useMasterlist();

    useEffect(() => {
        if (location.state && typeof location.state === 'object') {
            const { autoSpotlightAppId, autoSpotlightField, autoStatus } = location.state as any;
            if (autoSpotlightAppId && autoSpotlightField) {
                // Switch tab to MASTERLIST
                setActiveTab('MASTERLIST');
                
                // Reset other filters that might filter out the applicant
                setSelectedAccount('ALL');
                setSearch('');
                setSelectedMonth('ALL');
                setSelectedDay('ALL');
                if (setSelectedDateFilter) {
                    setSelectedDateFilter('ALL');
                }
                
                // Switch selectedStatus to match the applicant's status
                if (setSelectedStatus && autoStatus) {
                    const normalizedStatus = String(autoStatus).toUpperCase().replace(/[\s_]+/g, '_');
                    const validStatuses = ['APPLIED', 'ACCEPTED_OFFER', 'SENT_JO_AND_BGC', 'FOR_JOB_OFFER', 'FOR_PAN', 'PASSED', 'HIRED', 'REJECTED', 'WITHDRAWN'];
                    if (validStatuses.includes(normalizedStatus)) {
                        setSelectedStatus(normalizedStatus);
                    } else {
                        setSelectedStatus('ALL');
                    }
                } else if (setSelectedStatus) {
                    setSelectedStatus('ALL');
                }

                // Clear history state to prevent re-triggering
                window.history.replaceState({}, document.title);

                // Small delay to allow tab switching and filtering to complete
                setTimeout(() => {
                    const success = spotlightCell(autoSpotlightAppId, autoSpotlightField);
                    if (!success) {
                        setTimeout(() => {
                            spotlightCell(autoSpotlightAppId, autoSpotlightField);
                        }, 250);
                    }
                }, 500);
            }
        }
    }, [location.state, setActiveTab, setSelectedStatus, setSelectedAccount, setSearch, setSelectedMonth, setSelectedDay, setSelectedDateFilter]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [profileApp, setProfileApp] = React.useState<Application | null>(null);
    const [historyApp, setHistoryApp] = React.useState<Application | null>(null);
    const [bulkPromptType, setBulkPromptType] = React.useState<'NEO' | 'PEME' | 'RCBC' | null>(null);
    const [promotingId, setPromotingId] = React.useState<string | null>(null);

    const handlePromoteToHired = React.useCallback(async (app: Application) => {
        if (promotingId) return;
        
        // Resolve non-failed accounts
        const rawVal = app.pis?.final_account || app.department || '';
        const failedAccounts = app.metadata?.failed_accounts || [];
        const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
        const remaining = rawVal
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s && !failedSet.has(s.toLowerCase()));

        let finalAccount = remaining[0] || '';

        if (remaining.length > 1) {
            const choice = prompt(
                `Candidate is endorsed to multiple accounts: ${remaining.join(', ')}.\n` +
                `Please type the final account they are hired into:`,
                remaining[0]
            );
            if (choice !== null) {
                finalAccount = choice.trim();
            } else {
                // User cancelled the action
                return;
            }
        }

        setPromotingId(app.id);
        try {
            const nowIso = new Date().toISOString();
            const updatedPis = {
                ...(app.pis || {}),
                final_specific_status: 'JO - Hired',
                final_account: finalAccount
            } as Application['pis'];
            await ApplicationService.patch(app.id, {
                current_status: 'HIRED',
                hired_at: nowIso,
                pis: updatedPis
            } as any);
            success('Candidate Hired', `${app.applicant_name || 'Candidate'} has been promoted to HIRED.`);
            setLocalChanges((prev: any) => {
                const next = { ...prev };
                delete next[app.id];
                return next;
            });
            await loadData(true);
        } catch (err: any) {
            console.error('Failed to promote to hired:', err);
            error('Promotion Failed', err?.message || 'Could not update candidate status.');
        } finally {
            setPromotingId(null);
        }
    }, [promotingId, success, error, loadData, setLocalChanges]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { applicantId?: string | null; applicantName?: string | null } | undefined;
            if (!detail) return;
            const candidates = allApplications || [];
            let match: Application | undefined;
            if (detail.applicantId) {
                match = candidates.find((a: Application) => a.id === detail.applicantId);
            }
            if (!match && detail.applicantName) {
                const needle = detail.applicantName.toLowerCase();
                match = candidates.find((a: Application) => (a.applicant_name || '').toLowerCase().includes(needle));
            }
            if (match) {
                setProfileApp(match);
            } else {
                console.warn('[Masterlist] AI asked to open applicant but no match found:', detail);
            }
        };
        window.addEventListener('ai-open-applicant', handler);
        return () => window.removeEventListener('ai-open-applicant', handler);
    }, [allApplications]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { applicantId?: string | null; applicantName?: string | null; color?: string | null } | undefined;
            if (!detail?.applicantId) return;
            const targetId = detail.applicantId;

            const trigger = (attempt: number) => {
                const row = document.querySelector<HTMLTableRowElement>(`tr[data-ai-spotlight="candidate-${targetId}"]`);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    row.classList.remove('ai-pulse');
                    void row.offsetWidth;
                    row.classList.add('ai-pulse');
                    window.setTimeout(() => {
                        row.classList.remove('ai-pulse');
                    }, 4800);
                } else if (attempt < 12) {
                    window.setTimeout(() => trigger(attempt + 1), 250);
                } else {
                    console.warn('[Masterlist] AI asked to highlight applicant but row not found in DOM:', targetId);
                }
            };
            trigger(0);
            loadData();
        };
        window.addEventListener('ai-highlight-applicant', handler);
        return () => window.removeEventListener('ai-highlight-applicant', handler);
    }, [loadData]);

    useEffect(() => {
        const handler = () => {
            loadData();
        };
        window.addEventListener('ai-data-changed', handler);
        return () => window.removeEventListener('ai-data-changed', handler);
    }, [loadData]);

    const confirmWithdrawal = (reason: string) => {
        if (!pendingWithdrawal) return;

        // Apply the withdrawal changes directly to localChanges
        setLocalChanges((prev: any) => ({
            ...prev,
            [pendingWithdrawal.appId]: {
                ...(prev[pendingWithdrawal.appId] || {}),
                current_status: 'Withdrawn',
                master_column: 'OFFBOARDING_TRACKER',
                rejection_reason: reason,
                metadata: {
                    ...(typeof (prev[pendingWithdrawal.appId]?.metadata) === 'object' ? prev[pendingWithdrawal.appId].metadata : {}),
                    previous_status: pendingWithdrawal.previousStatus,
                    previous_column: pendingWithdrawal.previousColumn
                }
            }
        }));

        setPendingWithdrawal(null);
    };

    const cancelWithdrawal = () => {
        setPendingWithdrawal(null);
    };

    const handleShowNotes = React.useCallback((app: Application, rect: DOMRect) => {
        setNotesApp(app);
        setAnchorRect(rect);
    }, [setNotesApp, setAnchorRect]);

    const handleClearBulkPrompt = React.useCallback(() => {
        setBulkPromptType(null);
    }, [setBulkPromptType]);

    const showTable = activeTab !== 'SALARY' && activeTab !== 'REPORTS' && activeTab !== 'DAILY_HC_REPORT' && activeTab !== 'INACTIVE_APPLICANTS' && activeTab !== 'PIVOT';

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-[11px] font-bold text-surface-400 uppercase tracking-tight animate-pulse">
                    Loading Records...
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-fade-in relative">
            <MasterlistHeader
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                activeTab={activeTab}
                search={search}
                setSearch={setSearch}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                isSelectMode={isSelectMode}
                setIsSelectMode={setIsSelectMode}
                isSyncing={isSyncing}
                handleSyncAll={handleSyncAll}
                handleCancelEdit={handleCancelEdit}
                setLocalChanges={setLocalChanges}
                onImportCSV={handleImportCSV}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                selectedWave={selectedWave}
                setSelectedWave={setSelectedWave}
                waveOptions={waveOptions}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                selectedDateFilter={selectedDateFilter}
                setSelectedDateFilter={setSelectedDateFilter}
                monthOptions={MONTHS}
                accountOptions={accountMetrics.map(a => a.name)}
                selectedIds={selectedIds}
                onBulkDelete={() => setDeletingId('BULK')}
                onClearSelection={() => setSelectedIds(new Set())}
                hideImport={false}
                hideSearch={activeTab !== 'MASTERLIST' && activeTab !== 'PIVOT' && activeTab !== 'QUERY2' && activeTab !== 'EMAIL'}
                hideEdit={false}
                emailFilter={emailFilter}
                setEmailFilter={setEmailFilter}
                onBulkEmail={(type) => setBulkPromptType(type)}
                onExportExcel={handleExportExcel}
                totalCount={filteredList.length}
            />

            <MasterlistTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                isEditing={isEditing}
            />
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeTab === 'PIVOT' ? (
                        <motion.div key="pivot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto p-6 bg-surface-50/30 custom-scrollbar">
                            <MasterlistPivotAnalysis data={filteredList} />
                        </motion.div>
                    ) : activeTab === 'SALARY' ? (
                        <motion.div key="salary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto">
                            <SalaryReferenceView />
                        </motion.div>
                    ) : activeTab === 'INACTIVE_APPLICANTS' ? (
                        <motion.div key="inactive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto">
                            <InactiveView hideHeader={true} />
                        </motion.div>
                    ) : activeTab === 'REPORTS' ? (
                        <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto">
                            <HiringReportsView hideHeader={true} applications={filteredList} />
                        </motion.div>
                    ) : activeTab === 'DAILY_HC_REPORT' ? (
                        <motion.div key="daily-hc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto">
                            <DailyHCReportView applications={filteredList} />
                        </motion.div>
                    ) : showTable ? (
                        <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0" data-ai-spotlight="masterlist-table">
                            <MasterlistTable
                                activeTab={activeTab}
                                activeSubTab={activeSubTab}
                                filteredList={filteredList}
                                isEditing={isEditing}
                                setIsEditing={setIsEditing}
                                localChanges={localChanges}
                                onEdit={handleEdit}
                                selectedIds={selectedIds}
                                setSelectedIds={setSelectedIds}
                                isSelectMode={isSelectMode}
                                onToggleSelect={toggleSelect}
                                onToggleSelectAll={toggleSelectAll}
                                scrollContainerRef={scrollContainerRef}
                                onShowNotes={handleShowNotes}
                                onShowHistory={setHistoryApp}
                                focusPath={focusPath}
                                setFocusPath={setFocusPath}
                                search={search}
                                onViewProfile={setProfileApp}
                                bulkPromptType={bulkPromptType}
                                onClearBulkPrompt={handleClearBulkPrompt}
                                onPromoteToHired={handlePromoteToHired}
                                promotingId={promotingId}
                                setActiveTab={setActiveTab}
                            />
                        </motion.div>
                    ) : (
                        <AccountCards accountMetrics={accountMetrics} setSelectedAccount={setSelectedAccount} />
                    )}
                </AnimatePresence>
            </div>

            <BulkActionBar
                selectedCount={selectedIds.size}
                onClear={() => {
                    setSelectedIds(new Set());
                    setIsSelectMode(false);
                }}
                onDelete={() => setDeletingId('BULK')}
                onEmail={(type) => setBulkPromptType(type)}
                activeTab={activeTab}
                onHighlight={handleBulkHighlight}
                onMasterlistTransfer={handleBulkMasterlistTransfer}
            />

            <NotesDrawer
                app={notesApp}
                onClose={() => {
                    setNotesApp(null);
                    setAnchorRect(null);
                }}
                onSaveNote={handleSaveNote}
                anchorRect={anchorRect}
            />

            <AddApplicantRegistryModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={loadData} />

            <WithdrawalModal
                pendingWithdrawal={pendingWithdrawal}
                onConfirm={confirmWithdrawal}
                onCancel={cancelWithdrawal}
            />

            <ConfirmDialog
                open={!!deletingId}
                title="Delete Records"
                message="Are you sure you want to permanently delete these record(s)? This action cannot be undone."
                confirmText="Delete"
                confirmClass="bg-red-600 text-white font-bold"
                loading={isBulkDeleting}
                onConfirm={() => deletingId === 'BULK' ? handleBulkDelete() : handleDelete(deletingId as string)}
                onClose={() => setDeletingId(null)}
            />

            <ImportPreviewModal
                open={!!importPreview}
                onClose={() => setImportPreview(null)}
                onConfirm={handleConfirmImport}
                data={importPreview || []}
                loading={isSyncing}
            />

            <FullscreenProfileView
                open={!!profileApp}
                onClose={() => setProfileApp(null)}
                applicant={profileApp!}
                localChanges={localChanges}
                onEdit={handleEdit}
                isSyncing={isSyncing}
                onSync={handleSyncAll}
                pisOnly={true}
            />

            <ReprofileHistoryModal
                app={historyApp}
                localChanges={localChanges}
                onClose={() => setHistoryApp(null)}
            />

            <AnimatePresence>
            </AnimatePresence>

            <BulkDeleteProgress 
                isVisible={isBulkDeleting}
                progress={bulkDeleteProgress}
                totalCount={selectedIds.size}
            />

            {/* Floating Apple-style Filter/Action Dropup Trigger */}
            <div className="fixed bottom-6 right-6 z-[999]">
                <MasterlistFilterBar
                    search={search}
                    setSearch={setSearch}
                    activeTab={activeTab}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isSelectMode={isSelectMode}
                    setIsSelectMode={setIsSelectMode}
                    isSyncing={isSyncing}
                    handleSyncAll={handleSyncAll}
                    handleCancelEdit={handleCancelEdit}
                    onImportCSV={handleImportCSV}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    selectedWave={selectedWave}
                    setSelectedWave={setSelectedWave}
                    waveOptions={waveOptions}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    selectedDay={selectedDay}
                    setSelectedDay={setSelectedDay}
                    selectedDateFilter={selectedDateFilter}
                    setSelectedDateFilter={setSelectedDateFilter}
                    monthOptions={MONTHS}
                    accountOptions={accountMetrics.map(a => a.name)}
                    onExportExcel={handleExportExcel}
                    onAddData={() => setShowAddModal(true)}
                />
            </div>
        </div>
    );
}
