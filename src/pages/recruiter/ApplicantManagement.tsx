import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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

export function ApplicantManagement({
    initialTab = 'ongoing',
    mode = 'full',
    initialStatusFilter = 'ALL'
}: {
    initialTab?: Tab;
    mode?: 'full' | 'tracking';
    initialStatusFilter?: string;
}) {
    const [showAddCandidate, setShowAddCandidate] = useState(false);
    const location = useLocation();

    const {
        activeTab, setActiveTab,
        viewMode, setViewMode,
        searchQuery, setSearchQuery,
        selectedApplicant, setSelectedApplicant,
        statusFilter, setStatusFilter,
        accountFilter, setAccountFilter,
        assessmentScore, setAssessmentScore,
        clientAssessmentScore, setClientAssessmentScore,
        clientInterviewRemarks, setClientInterviewRemarks,
        modalTab, setModalTab,
        requestModalTab, setRequestModalTab,
        finalInterviewNotes, setFinalInterviewNotes,
        validators,
        ongoing = [], scheduling = [], requests = [], reprofile = [], rejected = [], concluded = [], filteredList = [], departments = [],
        totalCount = 0, concludedCount = 0, schedulingCount = 0, reprofileCount = 0,
        isSelectMode, setIsSelectMode,
        selectedIds, setSelectedIds,
        showQueuePrompt, setShowQueuePrompt,
        showQueueSuccess, setShowQueueSuccess,
        deleteConfirmApplicant, setDeleteConfirmApplicant,
        deletingApplicantId,
        stageRanks, getApplicantStatusRank,
        handleAcceptRequest, handleDeclineRequest,
        handleUpdateApplication, handleBulkDelete, confirmDelete,
        handleAction, handlePromote, handleRegress, handleWithdraw,
        handleGiveGrade, handleGiveClientAssessmentGrade, handleGiveClientInterviewVerdict,
        handleQueue, confirmQueue, handleSendToEndorsed, handleSetActiveReprofileAccount, handleFailActiveReprofileAccount,
        toggleSelectAll, toggleSelect, navigate, urlApplicantId, refresh
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
                    ongoingCount={ongoing.length}
                    requestsCount={requests.length}
                    rejectedCount={rejected.length}
                    concludedCount={concluded.length}
                    schedulingCount={schedulingCount}
                    reprofileCount={reprofileCount}
                    mode={mode}
                    onRefresh={refresh}
                    onAddCandidate={() => setShowAddCandidate(true)}
                />

                <div className="flex-1 flex flex-col min-h-0 gap-4">
                    <ManagementFilterBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        accountFilter={accountFilter}
                        setAccountFilter={setAccountFilter}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        departments={departments}
                        isSelectMode={isSelectMode}
                        setIsSelectMode={setIsSelectMode}
                        selectedIds={selectedIds}
                        setSelectedIds={setSelectedIds}
                        setDeleteConfirmApplicant={setDeleteConfirmApplicant}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                    />

                    <div className="flex-1 min-h-0 overflow-hidden bg-white border border-surface-300">
                        <ManagementContent
                            activeTab={activeTab}
                            filteredList={filteredList}
                            viewMode={viewMode}
                            isSelectMode={isSelectMode}
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
                        onRouteToSpecialized={handleSendToEndorsed}
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

            <AddCandidateModal
                open={showAddCandidate}
                onClose={() => setShowAddCandidate(false)}
                onSuccess={() => {
                    setShowAddCandidate(false);
                    refresh();
                }}
            />
        </>
    );
}
