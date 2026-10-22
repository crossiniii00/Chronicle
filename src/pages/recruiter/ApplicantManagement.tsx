import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/Modal';
import { DetailModalPortal } from '@/components/common/DetailModalPortal';
import { RequestDetailModalPortal } from '@/components/common/RequestDetailModalPortal';
import { QueuePromptModal } from '@/components/features/ApplicantManagement/QueuePromptModal';
import { QueueSuccessModal } from '@/components/features/ApplicantManagement/QueueSuccessModal';
import { EndorsementSModal } from '@/components/features/ApplicantManagement/EndorsementSModal';

import { useApplicantManagement, Tab } from './applicant-management/hooks/useApplicantManagement';
import { ManagementHeader } from './applicant-management/components/ManagementHeader';
import { ManagementFilterBar } from './applicant-management/components/ManagementFilterBar';
import { ManagementContent } from './applicant-management/components/ManagementContent';
import { ReprofileDetailModal } from './applicant-management/components/ReprofileDetailModal';
import { AddCandidateModal } from '@/components/features/ApplicantManagement/AddCandidateModal';
import { AddOnCallCandidateModal } from '@/components/features/ApplicantManagement/AddOnCallCandidateModal';
import { PISDashboardModal } from '@/components/features/ApplicantManagement/PISDashboardModal';
import { AddCandidateSelectorModal } from './applicant-management/components/AddCandidateSelectorModal';

export function ApplicantManagement({
    initialTab = 'ongoing',
    mode = 'full',
    initialStatusFilter = []
}: {
    initialTab?: Tab;
    mode?: 'full' | 'tracking';
    initialStatusFilter?: string[];
}) {
    const [showCandidateSelector, setShowCandidateSelector] = useState(false);
    const [showOnsiteCandidate, setShowOnsiteCandidate] = useState(false);
    const [showOncallCandidate, setShowOncallCandidate] = useState(false);
    const [activeBulkMenu, setActiveBulkMenu] = useState<'tag' | 'hire' | null>(null);
    const location = useLocation();

    const {
        activeTab, setActiveTab,
        activeMajorTab, setActiveMajorTab,
        isPendingTrackerMode, setIsPendingTrackerMode,
        isExclusiveMode, setIsExclusiveMode,
        isIdleFilterActive, setIsIdleFilterActive,
        pendingTrackerCounts,
        viewMode, setViewMode,
        searchQuery, setSearchQuery,
        selectedApplicant, setSelectedApplicant,
        statusFilter, setStatusFilter,
        accountFilter, setAccountFilter,
        lobFilter, setLobFilter,
        accountToLobsMap,
        hireTypeFilter, setHireTypeFilter,
        stepFilter, setStepFilter,
        specialStatusFilter, setSpecialStatusFilter,
        taggingFilter, setTaggingFilter,
        appliedDateFilter, setAppliedDateFilter,
        interviewDateFilter, setInterviewDateFilter,
        trainingDateFilter, setTrainingDateFilter,
        dateFilter, setDateFilter,
        dateTargetFilter, setDateTargetFilter,
        recruiterFilter, setRecruiterFilter,
        recruiters,
        deptRecords, allStaff,
        assessmentScore, setAssessmentScore,
        clientAssessmentScore, setClientAssessmentScore,
        clientInterviewRemarks, setClientInterviewRemarks,
        modalTab, setModalTab,
        requestModalTab, setRequestModalTab,
        finalInterviewNotes, setFinalInterviewNotes,
        validators,
        ongoing = [], scheduling = [], requests = [], reprofile = [], rejected = [], concluded = [], filteredList = [], baseList = [], departments = [], reschedule = [],
        totalCount = 0, concludedCount = 0, schedulingCount = 0, reprofileCount = 0,
        allTabCount = 0, noshowCount = 0, markedAsPendingCount = 0, withdrawnCount = 0, waitlistedCount = 0, notEligibleCount = 0, promotedCount = 0, lateralCount = 0, blacklistedCount = 0,
        isSelectMode, setIsSelectMode,
        selectedIds, setSelectedIds,
        showQueuePrompt, setShowQueuePrompt,
        showQueueSuccess, setShowQueueSuccess,
        deleteConfirmApplicant, setDeleteConfirmApplicant,
        hideConfirmApplicant, setHideConfirmApplicant, confirmHide,
        deletingApplicantId,
        stageRanks, getApplicantStatusRank,
        handleAcceptRequest, handleDeclineRequest,
        handleUpdateApplication, handleBulkDelete, confirmDelete, handleBulkUpdate,
        handleAction, handlePromote, handleRegress, handleWithdraw,
        handleGiveGrade, handleGiveClientAssessmentGrade, handleGiveClientInterviewVerdict,
        handleQueue, confirmQueue, handleSendToEndorsed, handleSetActiveReprofileAccount, handleFailActiveReprofileAccount,
        toggleSelectAll, toggleSelect, navigate, urlApplicantId, refresh,
        pisApplicant, setPisApplicant, evaluateStatusFilter
    } = useApplicantManagement({ initialTab, initialStatusFilter });

    const handleCloseModal = () => {
        setSelectedApplicant(null);
        if (urlApplicantId) {
            const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
            if (location.pathname.includes('/tracker/management')) {
                navigate(`${basePath}/tracker/management`);
            } else {
                navigate(`${basePath}/applicants`);
            }
        }
    };

    return (
        <>
            <div className="w-full flex flex-col h-full bg-[#f5f6f8] overflow-hidden p-4 gap-4">
                <ManagementHeader
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    activeMajorTab={activeMajorTab}
                    setActiveMajorTab={setActiveMajorTab}
                    allTabCount={allTabCount}
                    ongoingCount={ongoing.length}
                    requestsCount={requests.length}
                    rescheduleCount={reschedule.length}
                    rejectedCount={rejected.length}
                    concludedCount={concludedCount}
                    schedulingCount={schedulingCount}
                    reprofileCount={reprofileCount}
                    noshowCount={noshowCount}
                    markedAsPendingCount={markedAsPendingCount}
                    withdrawnCount={withdrawnCount}
                    waitlistedCount={waitlistedCount}
                    notEligibleCount={notEligibleCount}
                    promotedCount={promotedCount}
                    lateralCount={lateralCount}
                    blacklistedCount={blacklistedCount}
                    isPendingTrackerMode={isPendingTrackerMode}
                    setIsPendingTrackerMode={setIsPendingTrackerMode}
                    isExclusiveMode={isExclusiveMode}
                    setIsExclusiveMode={setIsExclusiveMode}
                    isIdleFilterActive={isIdleFilterActive}
                    setIsIdleFilterActive={setIsIdleFilterActive}
                    pendingTrackerCounts={pendingTrackerCounts}
                    mode={mode}
                    filteredList={filteredList}
                    onRefresh={refresh}
                    onAddCandidate={() => setShowCandidateSelector(true)}
                />

                <div className="flex-1 flex flex-col min-h-0 gap-4">
                    <ManagementFilterBar
                        activeTab={activeTab}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        accountFilter={accountFilter}
                        setAccountFilter={setAccountFilter}
                        lobFilter={lobFilter}
                        setLobFilter={setLobFilter}
                        accountToLobsMap={accountToLobsMap || {}}
                        hireTypeFilter={hireTypeFilter}
                        setHireTypeFilter={setHireTypeFilter}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        stepFilter={stepFilter}
                        setStepFilter={setStepFilter}
                        specialStatusFilter={specialStatusFilter}
                        setSpecialStatusFilter={setSpecialStatusFilter}
                        taggingFilter={taggingFilter}
                        setTaggingFilter={setTaggingFilter}
                        appliedDateFilter={appliedDateFilter}
                        setAppliedDateFilter={setAppliedDateFilter}
                        interviewDateFilter={interviewDateFilter}
                        setInterviewDateFilter={setInterviewDateFilter}
                        trainingDateFilter={trainingDateFilter}
                        setTrainingDateFilter={setTrainingDateFilter}
                        dateFilter={dateFilter}
                        setDateFilter={setDateFilter}
                        dateTargetFilter={dateTargetFilter}
                        setDateTargetFilter={setDateTargetFilter}
                        recruiterFilter={recruiterFilter}
                        setRecruiterFilter={setRecruiterFilter}
                        recruiters={recruiters}
                        deptRecords={deptRecords}
                        allStaff={allStaff}
                        departments={departments}
                        evaluateStatusFilter={evaluateStatusFilter}
                        apps={baseList}
                        isSelectMode={isSelectMode}
                        setIsSelectMode={setIsSelectMode}
                    />

                    <div className="flex-1 min-h-0 overflow-hidden bg-white border border-surface-300">
                        <ManagementContent
                            activeTab={activeTab}
                            filteredList={filteredList}
                            viewMode={viewMode}
                            isSelectMode={isSelectMode}
                            setIsSelectMode={setIsSelectMode}
                            selectedIds={selectedIds}
                            toggleSelect={toggleSelect}
                            toggleSelectAll={toggleSelectAll}
                            handleAction={handleAction}
                            handlePromote={handlePromote}
                            handleRegress={handleRegress}
                            handleSetActiveReprofileAccount={handleSetActiveReprofileAccount}
                        />
                    </div>
                </div>
            </div>

            {selectedApplicant && (
                activeTab === 'requests' ? (
                    <RequestDetailModalPortal
                        applicant={selectedApplicant}
                        onClose={handleCloseModal}
                        modalTab={requestModalTab}
                        setModalTab={setRequestModalTab}
                        onAccept={() => handleAcceptRequest(selectedApplicant)}
                        onDecline={() => handleDeclineRequest(selectedApplicant)}
                    />
                ) : activeTab === 'reprofile' ? (
                    <ReprofileDetailModal
                        applicant={selectedApplicant}
                        onClose={handleCloseModal}
                        onSetActiveAccount={handleSetActiveReprofileAccount}
                        onFailActiveAccount={handleFailActiveReprofileAccount}
                        validators={validators}
                        finalInterviewNotes={finalInterviewNotes}
                        setFinalInterviewNotes={setFinalInterviewNotes}
                        clientAssessmentScore={clientAssessmentScore}
                        setClientAssessmentScore={setClientAssessmentScore}
                        clientInterviewRemarks={clientInterviewRemarks}
                        setClientInterviewRemarks={setClientInterviewRemarks}
                        handleUpdateApplication={handleUpdateApplication}
                        onQueue={handleQueue}
                        handleGiveClientAssessmentGrade={handleGiveClientAssessmentGrade}
                        handleGiveClientInterviewVerdict={handleGiveClientInterviewVerdict}
                        handlePromote={handlePromote}
                        onRegress={handleRegress}
                    />
                ) : (
                    <DetailModalPortal
                        applicant={selectedApplicant}
                        onClose={handleCloseModal}
                        modalTab={modalTab}
                        setModalTab={setModalTab}
                        getApplicantStatusRank={getApplicantStatusRank}
                        handlePromote={handlePromote}
                        handleGiveGrade={handleGiveGrade}
                        handleGiveClientAssessmentGrade={handleGiveClientAssessmentGrade}
                        handleGiveClientInterviewVerdict={handleGiveClientInterviewVerdict}
                        assessmentScore={assessmentScore}
                        setAssessmentScore={setAssessmentScore}
                        clientAssessmentScore={clientAssessmentScore}
                        setClientAssessmentScore={setClientAssessmentScore}
                        clientInterviewRemarks={clientInterviewRemarks}
                        setClientInterviewRemarks={setClientInterviewRemarks}
                        finalInterviewNotes={finalInterviewNotes}
                        setFinalInterviewNotes={setFinalInterviewNotes}
                        onQueue={handleQueue}
                        onRegress={handleRegress}
                        onWithdraw={handleWithdraw}
                        validators={validators}
                        handleUpdateApplication={handleUpdateApplication}
                        onRouteToSpecialized={handleSendToEndorsed}
                        onDelete={(app) => handleAction(app.id, app.applicant_name, 'delete')}
                    />
                )
            )}

            {showQueuePrompt && (
                <QueuePromptModal
                    showQueuePrompt={showQueuePrompt}
                    setShowQueuePrompt={setShowQueuePrompt}
                    confirmQueue={confirmQueue}
                />
            )}

            {showQueueSuccess && (
                <QueueSuccessModal
                    showQueueSuccess={showQueueSuccess}
                    onStay={() => setShowQueueSuccess(null)}
                    onGoToConsole={() => {
                        setShowQueueSuccess(null);
                        const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                        navigate(`${basePath}/interview/queue`);
                    }}
                />
            )}

            <ConfirmDialog
                open={!!deleteConfirmApplicant}
                title="Delete Applicant Record"
                message={`Are you sure you want to permanently delete the record for "${deleteConfirmApplicant?.name}"? This action cannot be undone.`}
                confirmText="Delete Record"
                confirmClass="bg-red-600 hover:bg-red-700"
                loading={!!deletingApplicantId}
                onConfirm={() => {
                    if (deleteConfirmApplicant?.id === 'BULK') {
                        handleBulkDelete();
                    } else if (deleteConfirmApplicant) {
                        confirmDelete(deleteConfirmApplicant.id, deleteConfirmApplicant.name);
                    }
                }}
                onClose={() => setDeleteConfirmApplicant(null)}
            />

            <ConfirmDialog
                open={!!hideConfirmApplicant}
                title={hideConfirmApplicant?.action === 'hide' ? 'Hide Candidate' : 'Unhide Candidate'}
                message={hideConfirmApplicant?.action === 'hide' 
                    ? `Are you sure you want to hide "${hideConfirmApplicant?.name}"? They will no longer be visible to recruiters across the platform.`
                    : `Are you sure you want to unhide "${hideConfirmApplicant?.name}"? They will become visible to recruiters again.`}
                confirmText={hideConfirmApplicant?.action === 'hide' ? "Hide Candidate" : "Unhide Candidate"}
                confirmClass="bg-amber-600 hover:bg-amber-700"
                onConfirm={() => {
                    if (hideConfirmApplicant) {
                        confirmHide(hideConfirmApplicant.id, hideConfirmApplicant.action);
                    }
                }}
                onClose={() => setHideConfirmApplicant(null)}
            />

            <AddCandidateModal
                open={showOnsiteCandidate}
                onClose={() => setShowOnsiteCandidate(false)}
                onSuccess={() => {
                    setShowOnsiteCandidate(false);
                    refresh();
                }}
            />

            <AddOnCallCandidateModal
                open={showOncallCandidate}
                onClose={() => setShowOncallCandidate(false)}
                onSuccess={() => {
                    setShowOncallCandidate(false);
                    refresh();
                }}
            />

            <AddCandidateSelectorModal
                open={showCandidateSelector}
                onClose={() => setShowCandidateSelector(false)}
                onSelect={(type) => {
                    setShowCandidateSelector(false);
                    if (type === 'onsite') {
                        setShowOnsiteCandidate(true);
                    } else if (type === 'oncall') {
                        setShowOncallCandidate(true);
                    }
                }}
            />

            <PISDashboardModal
                open={!!pisApplicant}
                onClose={() => setPisApplicant(null)}
                applicant={pisApplicant!}
            />

            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <div className="fixed bottom-8 left-0 right-0 flex justify-center z-[100] pointer-events-none px-4">
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 100, opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 450, damping: 25 }}
                            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 shadow-2xl shadow-slate-900/10 h-12 flex items-center gap-1 pl-2 pr-2 pointer-events-auto rounded-md ring-1 ring-slate-950/5"
                        >
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50/80 border border-blue-200/70 rounded-sm mr-1">
                                <span className="text-blue-600 font-extrabold text-xs tabular-nums">{selectedIds.size}</span>
                                <span className="text-[9.5px] font-bold text-blue-900 uppercase tracking-widest">Selected</span>
                            </div>

                            <div className="flex items-center gap-0.5 h-full">
                                <button
                                    onClick={() => setDeleteConfirmApplicant({ id: 'BULK', name: `${selectedIds.size} selected candidates` })}
                                    className="h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all uppercase tracking-wider rounded-sm cursor-pointer"
                                >
                                    <Trash2 size={12} className="text-rose-500" />
                                    Delete
                                </button>
                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveBulkMenu(activeBulkMenu === 'tag' ? null : 'tag')}
                                        className={`h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold transition-all uppercase tracking-wider rounded-sm cursor-pointer ${activeBulkMenu === 'tag' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                    >
                                        Tagging
                                    </button>
                                    {activeBulkMenu === 'tag' && (
                                        <div className="absolute bottom-full left-0 mb-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md py-1 min-w-[240px]">
                                            <div className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-1">
                                                Select General...
                                            </div>
                                            {[
                                                { label: 'MARK PENDING', val: 'MARKED_PENDING', dot: 'bg-amber-500' },
                                                { label: 'WAITLISTED', val: 'WAITLISTED', dot: 'bg-blue-500' },
                                                { label: 'WITHDRAWN', val: 'WITHDRAWN', dot: 'bg-slate-100 border border-slate-200' },
                                                { label: 'NO SHOW', val: 'NO_SHOW', dot: 'bg-orange-500' },
                                                { label: 'NOT ELIGIBLE FOR REHIRE', val: 'NOT_ELIGIBLE', dot: 'bg-rose-600' },
                                                { label: 'BLACKLIST', val: 'BLACKLISTED', dot: 'bg-red-600' },
                                                { label: 'UNDO PROMOTION / REVERT STATUS', val: 'REVERT_STATUS', dot: 'bg-blue-400' },
                                                { label: 'H2R INACTIVE', val: 'H2R_INACTIVE', dot: 'bg-slate-500' },
                                                { label: 'INVITED FOR REAPPLICATION', val: 'INVITED_FOR_REAPPLICATION', dot: 'bg-fuchsia-500' },
                                                { label: 'CLOSE APPLICATION', val: 'CLOSED', dot: 'bg-slate-700' },
                                                { label: 'REOPEN APPLICATION', val: 'REOPEN', dot: 'bg-sky-500' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    onClick={() => {
                                                        setActiveBulkMenu(null);
                                                        handleBulkUpdate({ current_status: opt.val });
                                                    }}
                                                    className="flex items-center gap-3 text-left px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                                                    <span className="uppercase tracking-widest">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveBulkMenu(activeBulkMenu === 'hire' ? null : 'hire')}
                                        className={`h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold transition-all uppercase tracking-wider rounded-sm cursor-pointer ${activeBulkMenu === 'hire' ? 'bg-amber-50 text-amber-600' : 'text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600'}`}
                                    >
                                        Hire Type
                                    </button>
                                    {activeBulkMenu === 'hire' && (
                                        <div className="absolute bottom-full left-0 mb-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md py-1 min-w-[120px]">
                                            {[
                                                { label: 'External', val: 'EXTERNAL' },
                                                { label: 'Internal', val: 'INTERNAL' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    onClick={() => {
                                                        setActiveBulkMenu(null);
                                                        handleBulkUpdate({ metadata: { candidate_type: opt.val } });
                                                    }}
                                                    className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-600"
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                                <button
                                    onClick={() => {
                                        setSelectedIds(new Set());
                                        setIsSelectMode(false);
                                    }}
                                    className="h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider rounded-sm cursor-pointer"
                                >
                                    <X size={12} />
                                    Clear
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
