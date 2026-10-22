import React, { useState, useEffect, useRef } from 'react';
import { Building2, Search, X, ChevronDown, Table, LayoutList, Filter } from 'lucide-react';
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
import { AccountLobFilter } from './components/AccountLobFilter';
import { ImportPreviewModal } from './components/ImportPreviewModal';
import { ChronicleView } from './components/ChronicleView';
import { InterviewPivotAnalysis } from './components/InterviewPivotAnalysis';
import { NotesDrawer } from './components/NotesDrawer';
import { ReprofileHistoryModal } from './components/ReprofileHistoryModal';
import { ReprofilePromptModal } from './components/ReprofilePromptModal';
import { BulkActionBar } from './masterlist/components/BulkActionBar';
import { MasterlistMonthTabs } from './masterlist/components/MasterlistMonthTabs';
import { cleanValue } from './constants';
import { AddApplicantRegistryModal } from '@/components/features/Registry/AddApplicantRegistryModal';
import { BulkDeleteProgress } from '@/components/features/ApplicantManagement/BulkDeleteProgress';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ExcelFindBar } from '@/components/common/ExcelFindBar';
import { AdvancedDateFilter } from '@/components/common/AdvancedDateFilter';
import InterviewReportsFilterBar from './components/InterviewReportsFilterBar';
import { useTextHighlight } from '@/hooks/useTextHighlight';

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
        dateRange, setDateRange,
        dateAddedFilter, setDateAddedFilter,
        interviewConcludedFilter, setInterviewConcludedFilter,
        selectedStatus, setSelectedStatus,
        selectedEducation, setSelectedEducation, educationOptions,
        selectedGender, setSelectedGender, genderOptions,
        selectedInitialAccountFilter, setSelectedInitialAccountFilter, initialAccountOptions,
        selectedOverallStatusFilter, setSelectedOverallStatusFilter,
        selectedFinalAccountFilter, setSelectedFinalAccountFilter, finalAccountOptions,
        selectedHireType, setSelectedHireType,
        isExclusiveMode, setIsExclusiveMode,
        isOfficialEndorsement, setIsOfficialEndorsement,
        activePassedMonth, setActivePassedMonth, availablePassedMonths,
        selectedYear, setSelectedYear, availableYears,
        allDepartments,
        pendingReprofile, confirmReprofile, cancelReprofile,
        activeUsers, userFocus,
        totalApplicationsCount,
        loadData,
        handleBulkHighlight,
        validators,
        handleUpdateApplication,
        handleRegress,
        handleBulkTransfer,
        handleBulkMasterlistTransfer,
        handleBulkTransferDate
    } = useInterviewReports();

    const [mainView, setMainView] = useState<'EXCEL' | 'CHRONICLE'>('EXCEL');
    const [showEssentialOnly, setShowEssentialOnly] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [historyApp, setHistoryApp] = useState<any>(null);
    const [profileApp, setProfileApp] = useState<any>(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [procedureApp, setProcedureApp] = useState<any>(null);
    const [modalTab, setModalTab] = useState<any>('verdict');
    const [promotingId, setPromotingId] = useState<string | null>(null);

    const [showFindBar, setShowFindBar] = useState(false);
    const [findMatchIndex, setFindMatchIndex] = useState(0);
    const [findQuery, setFindQuery] = useState('');

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [generatedMatches, setGeneratedMatches] = useState<{ id: string, text: string, element: HTMLElement, context?: string }[]>([]);

    useTextHighlight(scrollContainerRef, findQuery, showFindBar, setGeneratedMatches);

    const activeClass = 'ring-2 ring-[#0078D4] ring-offset-1 bg-yellow-400 dark:bg-yellow-500 text-yellow-950 shadow-md scale-[1.05] z-10 relative px-1 font-extrabold';

    useEffect(() => {
        if (!showFindBar || generatedMatches.length === 0) return;
        
        generatedMatches.forEach(match => {
            if (match.element) {
                activeClass.split(' ').forEach(cls => match.element.classList.remove(cls));
            }
        });
        
        const activeMatch = generatedMatches[findMatchIndex];
        if (activeMatch && activeMatch.element) {
            activeClass.split(' ').forEach(cls => activeMatch.element.classList.add(cls));
            activeMatch.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
        
        return () => {
             generatedMatches.forEach(match => {
                if (match.element) {
                    activeClass.split(' ').forEach(cls => match.element.classList.remove(cls));
                }
            });
        };
    }, [findMatchIndex, generatedMatches, showFindBar]);

    const handleMatchSelect = React.useCallback((match: any) => {
        const index = generatedMatches.findIndex(m => m.id === match.id);
        if (index !== -1) {
            setFindMatchIndex(index);
        }
    }, [generatedMatches]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setShowFindBar(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

    const noop = () => { };

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
        <div ref={scrollContainerRef} className="animate-fade-in flex flex-col flex-1 bg-[#faf9f8] w-full max-w-full overflow-hidden relative">
            <InterviewReportsFilterBar
                search={search}
                setSearch={setSearch}
                selectedHireType={selectedHireType}
                setSelectedHireType={setSelectedHireType}
                selectedInitialAccountFilter={selectedInitialAccountFilter}
                setSelectedInitialAccountFilter={setSelectedInitialAccountFilter}
                initialAccountOptions={initialAccountOptions}
                selectedOverallStatusFilter={selectedOverallStatusFilter}
                setSelectedOverallStatusFilter={setSelectedOverallStatusFilter}
                selectedFinalAccountFilter={selectedFinalAccountFilter}
                setSelectedFinalAccountFilter={setSelectedFinalAccountFilter}
                finalAccountOptions={finalAccountOptions}
                dateAddedFilter={dateAddedFilter}
                setDateAddedFilter={setDateAddedFilter}
                interviewConcludedFilter={interviewConcludedFilter}
                setInterviewConcludedFilter={setInterviewConcludedFilter}
                allDepartments={allDepartments}
                mainView={mainView}
                setMainView={setMainView}
                onExportExcel={handleExportExcel}
                showEssentialOnly={showEssentialOnly}
                setShowEssentialOnly={setShowEssentialOnly}
                isExclusiveMode={isExclusiveMode}
                setIsExclusiveMode={setIsExclusiveMode}
                isOfficialEndorsement={isOfficialEndorsement}
                setIsOfficialEndorsement={setIsOfficialEndorsement}
            />

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
                        {mainView === 'EXCEL' ? (
                            <InterviewTable
                                activeTab={activeTab}
                                showEssentialOnly={showEssentialOnly}
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
                        ) : (
                            <ChronicleView
                                applications={filteredList}
                                questions={questions}
                                localChanges={localChanges}
                                isEditing={isEditing}
                                setIsEditing={setIsEditing}
                                handleInputChange={handleInputChange}
                                accounts={allDepartments.map((d: any) => d.name)}
                                activeTab={activeTab}
                                onRefresh={loadData}
                                onSync={handleSyncAll}
                                isSyncing={isSaving}
                            />
                        )}
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
                onMasterlistTransfer={handleBulkMasterlistTransfer}
                onMasterlistTransferDate={handleBulkTransferDate}
            />

            {profileApp && (
                <FullscreenProfileView
                    open={!!profileApp}
                    onClose={() => setProfileApp(null)}
                    applicant={profileApp}
                    localChanges={localChanges}
                    onEdit={(appId, field, value) => {
                        if (typeof value === 'object' && value !== null) {
                            // For complex objects like interview_responses, store as JSON string
                            // The sync logic will handle this properly
                            handleInputChange(appId, String(field), JSON.stringify(value));
                        } else {
                            handleInputChange(appId, String(field), String(value));
                        }
                    }}
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
                        onRouteToSpecialized={async () => { }}
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
            <div className="fixed bottom-20 right-6 z-[999]">
                <FilterBar
                    activeTab={activeTab}
                    showOnlyIncomplete={showOnlyIncomplete}
                    setShowOnlyIncomplete={setShowOnlyIncomplete}
                    handleExportExcel={handleExportExcel}
                    handleImportCSV={handleImportCSV}
                    selectedAccount={selectedAccount}
                    setSelectedAccount={setSelectedAccount}
                    accounts={accountMetrics.map(m => m.name)}
                    hasLocalChanges={Object.keys(localChanges).length > 0}
                    isSaving={isSaving}
                    onAddData={() => setShowAddModal(true)}
                />
            </div>
            <MasterlistMonthTabs 
                activePassedMonth={activePassedMonth} 
                setActivePassedMonth={setActivePassedMonth} 
                availablePassedMonths={availablePassedMonths}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                availableYears={availableYears}
            />

            <ExcelFindBar
                isOpen={showFindBar}
                onClose={() => setShowFindBar(false)}
                searchQuery={findQuery}
                onSearchChange={setFindQuery}
                matchCount={generatedMatches.length}
                currentMatchIndex={findMatchIndex}
                matches={generatedMatches}
                onMatchSelect={handleMatchSelect}
                onNextMatch={() => setFindMatchIndex(prev => (prev + 1) % (generatedMatches.length || 1))}
                onPrevMatch={() => setFindMatchIndex(prev => (prev - 1 + (generatedMatches.length || 1)) % (generatedMatches.length || 1))}
                placeholder="Find in sheet (Ctrl+F)..."
            />
        </div>
    );
}
