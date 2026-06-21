import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '@/components/common/Modal';
import { DetailModalPortal } from '@/components/common/DetailModalPortal';
import { cn } from '@/utils/formatters';
import { FullscreenInterviewForm } from '@/components/features/ApplicantManagement/FullscreenInterviewForm';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';
import { InterviewTable } from './components/InterviewTable';
import { useInterviewReports } from './hooks/useInterviewReports';
import { AccountGrid } from './components/AccountGrid';
import { FilterBar } from './components/FilterBar';
import { SubTabNavigation } from './components/SubTabNavigation';
import { ImportPreviewModal } from './components/ImportPreviewModal';
import { InterviewPivotAnalysis } from './components/InterviewPivotAnalysis';
import { NotesDrawer } from './components/NotesDrawer';
import { ReprofileHistoryModal } from './components/ReprofileHistoryModal';
import { ReprofilePromptModal } from './components/ReprofilePromptModal';
import { BulkActionBar } from './masterlist/components/BulkActionBar';
import { cleanValue } from './constants';
import { AddApplicantRegistryModal } from '@/components/features/Registry/AddApplicantRegistryModal';
import { BulkDeleteProgress } from '@/components/features/ApplicantManagement/BulkDeleteProgress';

import type { Application } from '@/types/application';

export function InterviewReportsView() {
    const {
        search, setSearch,
        selectedAccount, setSelectedAccount,
        activeTab, setActiveTab,
        loading, isEditing, setIsEditing, isSaving,
        showOnlyIncomplete, setShowOnlyIncomplete,
        isSelectMode, setIsSelectMode,
        isBulkDeleting, bulkDeleteProgress,
        selectedIds, setSelectedIds,
        focusedApplicant, setFocusedApplicant,
        showFullscreen, setShowFullscreen,
        deletingId, setDeletingId,
        shFilters, setShFilters,
        activeQuestions, filteredList, accountMetrics,
        handleInputChange, handleSyncAll, handleCancelEdit, handleDelete, handleBulkDelete, handleClearOverallStatus,
        toggleSelectAll, toggleSelect, handleExportExcel, handleImportCSV, questions,
        applications, localChanges,
        previewData, showPreview, setShowPreview, confirmImport,
        notesApp, setNotesApp, handleSaveNote, anchorRect, setAnchorRect,
        focusPath, setFocusPath,
        selectedMonth, setSelectedMonth, selectedDay, setSelectedDay,
        selectedStatus, setSelectedStatus,
        selectedEducation, setSelectedEducation, educationOptions,
        selectedGender, setSelectedGender, genderOptions,
        allDepartments,
        pendingReprofile, confirmReprofile, cancelReprofile,
        activeUsers, userFocus,
        totalApplicationsCount,
        loadData,
        handleBulkHighlight,
        validators,
        handleUpdateApplication,
        handleRegress,
        handleBulkTransfer
    } = useInterviewReports();

    const [showAddModal, setShowAddModal] = useState(false);
    const [historyApp, setHistoryApp] = useState<any>(null);
    const [profileApp, setProfileApp] = useState<any>(null);
    const [procedureApp, setProcedureApp] = useState<any>(null);
    const [modalTab, setModalTab] = useState<any>('verdict');
    const [promotingId, setPromotingId] = useState<string | null>(null);

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
            await handleUpdateApplication(app.id, {
                current_status: 'HIRED',
                hired_at: nowIso,
                pis: updatedPis
            } as any);
        } catch (err) {
            console.error('Failed to promote to hired:', err);
        } finally {
            setPromotingId(null);
        }
    }, [promotingId, handleUpdateApplication]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { applicantId?: string; applicantName?: string } | undefined;
            if (!detail) return;
            const targetId = detail.applicantId;
            const targetName = detail.applicantName;
            const list = applications as Array<{ id?: string; applicant_name?: string }>;
            const match = list.find((a) =>
                (targetId && a.id === targetId) ||
                (targetName && a.applicant_name && a.applicant_name.toLowerCase().includes(targetName.toLowerCase()))
            );
            if (match) {
                setProfileApp(match);
            }
        };
        window.addEventListener('ai-open-applicant', handler);
        return () => window.removeEventListener('ai-open-applicant', handler);
    }, [applications]);

    const noop = () => {};

    const getApplicantStatusRank = (status: string, applicant?: any) => {
        if ((status === 'OPEN' || !status) && applicant) {
            const spec = String(applicant.pis?.final_specific_status || (applicant as any).final_specific_status || '').toLowerCase();
            if (spec.includes('hired')) return 6;
            if (spec.includes('jo -') || spec.includes('job offer')) return 6;
            if (spec.includes('client interview')) return 5;
            if (spec.includes('client assessment')) return 4;
            if (spec.includes('ov - passed') || spec.includes('ops val') || spec.includes('final') || spec.includes('ov -')) return 3;
            if (spec.includes('wonderlic') || spec.includes('speechx') || spec.includes('personality') || spec.includes('assessment')) return 2;
            if (spec.includes('recruitment interview') || spec.includes('initial')) return 1;
            if (spec.includes('typing')) return 0;
        }

        const ranks: Record<string, number> = {
            'APPLIED': 0,
            'TYPING_TEST': 0,
            'INITIAL_INTERVIEW': 1,
            'INTERVIEW_IN_PROGRESS': 1,
            'QUEUE_ASSIGNED': 1,
            'ASSESSMENT': 2,
            'FINAL_INTERVIEW': 3,
            'FINAL_INTERVIEW_SCHEDULED': 3,
            'CLIENT_ASSESSMENT': 4,
            'CLIENT_INTERVIEW': 5,
            'FOR_JOB_OFFER': 6,
            'For Job Offer': 6,
            'FINAL_VERDICT': 6,
            'PASSED': 6,
            'FAILED': 6,
            'CONDITIONAL': 6,
            'WAITLISTED': 6,
            'WITHDRAWN': 6,
            'HIRED': 6,
            'REJECTED': 6
        };
        return ranks[status] ?? 0;
    };

    return (
        <div className="animate-fade-in flex flex-col flex-1 bg-[#faf9f8] w-full max-w-full overflow-hidden relative">
            <div className="flex flex-col border-b border-surface-200 shrink-0 bg-white">
                <div className="relative px-6 py-4 flex items-center justify-center border-b border-surface-100">
                    <div className="flex items-baseline gap-2.5">
                        <Building2 size={15} className="text-surface-400 self-center" />
                        <h1
                            className="text-[24px] leading-none text-surface-900 tracking-[-0.015em] capitalize"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            {selectedAccount || (activeTab === 'OfficeForms_Table' ? 'Sheet Registry' : `${activeTab.replace(/_/g, ' ')} Registry`)}
                        </h1>
                    </div>
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 h-7 bg-surface-50/70 border border-surface-200 rounded-sm">
                            <span className="text-[9px] font-semibold text-black/45 uppercase tracking-[0.1em]">Registry</span>
                            <span className="text-[13px] font-semibold text-black tabular-nums leading-none">
                                {totalApplicationsCount.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-medium text-black/45 leading-none">records</span>
                        </div>
                        {activeUsers.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-1.5">
                                    {activeUsers.slice(0, 3).map((u) => (
                                        <div
                                            key={u.id}
                                            className="w-5 h-5 border border-white bg-surface-900 flex items-center justify-center text-[7px] font-semibold text-white"
                                            title={u.fullName || u.full_name || ''}
                                        >
                                            {(u.fullName || u.full_name || '?').charAt(0)}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-semibold text-surface-700 tracking-[0.04em]">
                                        Live ops · {activeUsers.length + 1}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <SubTabNavigation
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setSelectedAccount={setSelectedAccount}
                isEditing={isEditing}
            />

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {activeTab === 'PIVOT' ? (
                    <div className="flex-1 overflow-y-auto p-8 bg-[#faf9f8]">
                        <InterviewPivotAnalysis
                            data={filteredList}
                        />
                    </div>
                ) : activeTab === 'OfficeForms_Table' && !selectedAccount && !search ? (
                    <div className="flex-1 overflow-y-auto">
                        <AccountGrid
                            accountMetrics={accountMetrics}
                            setSelectedAccount={setSelectedAccount}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0" data-ai-spotlight="interview-form-table">
                        <InterviewTable
                            activeTab={activeTab}
                            filteredList={filteredList}
                            isEditing={isEditing}
                            setIsEditing={setIsEditing}
                            localChanges={localChanges}
                            handleInputChange={handleInputChange}
                            isSelectMode={isSelectMode}
                            selectedIds={selectedIds}
                            toggleSelect={toggleSelect}
                            toggleSelectAll={toggleSelectAll}
                            setDeletingId={setDeletingId}
                            setFocusedApplicant={setFocusedApplicant}
                            setShowFullscreen={setShowFullscreen}
                            activeQuestions={activeQuestions}
                            questions={questions}
                            onShowNotes={(app, rect) => {
                                setNotesApp(app);
                                setAnchorRect(rect);
                            }}
                            focusPath={focusPath}
                            setFocusPath={setFocusPath}
                            search={search}
                            accounts={allDepartments.map((d: any) => d.name)}
                            onShowHistory={setHistoryApp}
                            activeUsers={activeUsers}
                            userFocus={userFocus}
                            onViewProfile={setProfileApp}
                            onShowProcedure={setProcedureApp}
                            onPromoteToHired={handlePromoteToHired}
                            promotingId={promotingId}
                        />
                    </div>
                )}
            </div>

            <NotesDrawer
                app={notesApp}
                onClose={() => {
                    setNotesApp(null);
                    setAnchorRect(null);
                }}
                onSaveNote={handleSaveNote}
                anchorRect={anchorRect}
            />

            {focusedApplicant && (
                <FullscreenInterviewForm
                    open={showFullscreen}
                    onClose={() => {
                        setShowFullscreen(false);
                        setFocusedApplicant(null);
                    }}
                    applicant={focusedApplicant}
                    questions={activeQuestions}
                    currentResponses={(() => {
                        const local = localChanges[focusedApplicant.id] || {};
                        const responses = focusedApplicant.interview_responses || {};
                        const prepared: Record<string, string> = {};
                        
                        activeQuestions.forEach(q => {
                            // Priority: 
                            // 1. Local changes (unsynced edits)
                            // 2. Response by ID (UUID)
                            // 3. Response by Question Text (Legacy/Imported)
                            const val = local[q.id] ?? responses[q.id] ?? responses[q.question_text] ?? '';
                            prepared[q.id] = cleanValue(String(val));
                        });

                        // Make sure both final_interview_notes (Remarks) and pis_ops_validator_notes are fetched and passed
                        const remarksVal = local['final_interview_notes'] ?? 
                                           local['pis_ops_validator_notes'] ?? 
                                           focusedApplicant.final_interview_notes ?? 
                                           focusedApplicant.pis?.ops_validator_notes ?? 
                                           focusedApplicant.metadata?.ops_validator_notes ?? 
                                           '';
                        prepared['final_interview_notes'] = cleanValue(String(remarksVal));
                        prepared['pis_ops_validator_notes'] = cleanValue(String(remarksVal));

                        return prepared;
                    })()}
                    onUpdateResponse={(qId, value) => handleInputChange(focusedApplicant.id, qId, value)}
                    onApply={() => {
                        setShowFullscreen(false);
                        setFocusedApplicant(null);
                    }}
                />
            )}

            <ConfirmDialog
                open={!!deletingId}
                title={deletingId === 'BULK' ? "Protocol: Mass Data Purge" : "Protocol: Data Purge"}
                message={deletingId === 'BULK'
                    ? `Are you certain you want to permanently eliminate ${selectedIds.size} candidate records? This action is irreversible.`
                    : "Are you certain you want to permanently eliminate this candidate record? This action is irreversible."}
                confirmText={deletingId === 'BULK' ? `Purge ${selectedIds.size} Records` : "Purge Record"}
                confirmClass="bg-red-600 text-white font-bold uppercase text-[10px] tracking-widest"
                onConfirm={() => {
                    setDeletingId(null);
                    if (deletingId === 'BULK') handleBulkDelete();
                    else if (deletingId) handleDelete(deletingId);
                }}
                onClose={() => setDeletingId(null)}
            />
            <ImportPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                onConfirm={(moveToMasterlist) => confirmImport(moveToMasterlist)}
                data={previewData}
                isSaving={isSaving}
                activeTab={activeTab}
            />

            <ReprofileHistoryModal
                app={historyApp}
                localChanges={localChanges}
                onClose={() => setHistoryApp(null)}
            />

            <ReprofilePromptModal
                app={pendingReprofile?.app || null}
                previousAccount={pendingReprofile?.previousAccount || ''}
                newAccount={pendingReprofile?.newAccount || ''}
                onClose={cancelReprofile}
                onConfirm={confirmReprofile}
            />

            <BulkActionBar
                selectedCount={selectedIds.size}
                onClear={() => {
                    setSelectedIds(new Set());
                    setIsSelectMode(false);
                }}
                onDelete={() => setDeletingId('BULK')}
                activeTab={activeTab}
                onHighlight={handleBulkHighlight}
                onTransfer={handleBulkTransfer}
            />

            {profileApp && (
                <FullscreenProfileView
                    open={!!profileApp}
                    onClose={() => setProfileApp(null)}
                    applicant={profileApp}
                    localChanges={localChanges}
                    onEdit={(appId, field, value) => handleInputChange(appId, String(field), String(value))}
                    isSyncing={isSaving}
                    onSync={handleSyncAll}
                    pisOnly={true}
                />
            )}

            <AnimatePresence>
                {procedureApp && (
                    <DetailModalPortal 
                        applicant={procedureApp}
                        onClose={() => setProcedureApp(null)}
                        modalTab={modalTab}
                        setModalTab={setModalTab}
                        getApplicantStatusRank={getApplicantStatusRank}
                        handlePromote={noop}
                        handleGiveGrade={noop}
                        handleGiveClientAssessmentGrade={noop}
                        handleGiveClientInterviewVerdict={noop}
                        assessmentScore=""
                        setAssessmentScore={noop}
                        clientAssessmentScore=""
                        setClientAssessmentScore={noop}
                        clientInterviewRemarks=""
                        setClientInterviewRemarks={noop}
                        finalInterviewNotes=""
                        setFinalInterviewNotes={noop}
                        onQueue={noop}
                        onRegress={handleRegress}
                        onWithdraw={noop}
                        validators={validators}
                        handleUpdateApplication={handleUpdateApplication}
                        onRouteToSpecialized={async () => {}}
                        onDelete={noop}
                    />
                )}
            </AnimatePresence>

            <BulkDeleteProgress 
                isVisible={isBulkDeleting}
                progress={bulkDeleteProgress}
                totalCount={selectedIds.size}
            />

            <AddApplicantRegistryModal 
                open={showAddModal} 
                onClose={() => setShowAddModal(false)} 
                onSuccess={loadData} 
                defaultColumn={activeTab === 'SHEET1' ? 'SHEET' : activeTab}
            />

            {/* Floating Apple-style Filter/Action Dropup Trigger */}
            <div className="fixed bottom-6 right-6 z-[999]">
                <FilterBar
                    search={search}
                    setSearch={setSearch}
                    activeTab={activeTab}
                    showOnlyIncomplete={showOnlyIncomplete}
                    setShowOnlyIncomplete={setShowOnlyIncomplete}
                    handleExportExcel={handleExportExcel}
                    handleImportCSV={handleImportCSV}
                    shFilters={shFilters}
                    setShFilters={setShFilters}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    handleSyncAll={handleSyncAll}
                    isSaving={isSaving}
                    isSelectMode={isSelectMode}
                    setIsSelectMode={setIsSelectMode}
                    selectedIds={selectedIds}
                    setDeletingId={setDeletingId}
                    selectedAccount={selectedAccount}
                    setSelectedAccount={setSelectedAccount}
                    accounts={accountMetrics.map(m => m.name)}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    selectedDay={selectedDay}
                    setSelectedDay={setSelectedDay}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    selectedEducation={selectedEducation}
                    setSelectedEducation={setSelectedEducation}
                    educationOptions={educationOptions}
                    selectedGender={selectedGender}
                    setSelectedGender={setSelectedGender}
                    genderOptions={genderOptions}
                    handleClearOverallStatus={handleClearOverallStatus}
                    handleCancelEdit={handleCancelEdit}
                    totalApplicationsCount={totalApplicationsCount}
                    onAddData={() => setShowAddModal(true)}
                />
            </div>
        </div>
    );
}
