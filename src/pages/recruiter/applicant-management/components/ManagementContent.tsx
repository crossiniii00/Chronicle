import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { ApplicantCard } from '@/components/features/ApplicantManagement/ApplicantCard';
import { ApplicantRow } from '@/components/features/ApplicantManagement/ApplicantRow';
import { ApplicantJourneyView } from '@/components/features/ApplicantManagement/ApplicantJourneyView';
import type { Application } from '@/types/application';
import type { Tab, ApplicantAction } from '../hooks/useApplicantManagement';

interface ManagementContentProps {
    activeTab: Tab;
    filteredList: Application[];
    viewMode: 'grid' | 'list';
    isSelectMode: boolean;
    selectedIds: Set<string>;
    toggleSelect: (id: string) => void;
    toggleSelectAll: () => void;
    handleAction: (id: string, name: string, action: ApplicantAction) => void;
    handlePromote: (app: Application, result?: 'pass' | 'conditional' | 'fail', reason?: string) => void;
    handleRegress: (app: Application) => void;
    handleSetActiveReprofileAccount: (app: Application, account: string) => void;
}

export function ManagementContent({
    activeTab, filteredList, viewMode, isSelectMode, selectedIds, toggleSelect, toggleSelectAll,
    handleAction, handlePromote, handleRegress, handleSetActiveReprofileAccount
}: ManagementContentProps) {
    if (filteredList.length === 0) {
        return (
            <div className="h-full min-h-[440px] flex flex-col items-center justify-center bg-white p-8">
                <div className="max-w-md text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 border border-slate-100 shadow-sm text-slate-400 group-hover:scale-105 transition-transform duration-300">
                        <Users size={26} className="text-slate-400" />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">No matching candidates</h3>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">We couldn't find any candidate records matching your active filters. Try adjusting your search query, selecting a different account, or modifying the status tabs.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'ongoing' || activeTab === 'reprofile' || activeTab === 'concluded') {
        if (viewMode === 'grid') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-4">
                    {filteredList.map((applicant: Application) => (
                        <ApplicantCard
                            key={applicant.id}
                            applicant={applicant}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(applicant.id)}
                            onSelect={toggleSelect}
                            onAction={(id, name, action) => handleAction(id, name, action as ApplicantAction)}
                            isReprofileView={activeTab === 'reprofile'}
                            onSetActiveReprofileAccount={handleSetActiveReprofileAccount}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div className="overflow-x-auto p-4 scrollbar-thin scrollbar-thumb-surface-200 hover:scrollbar-thumb-surface-300">
                <div className="min-w-[1060px] bg-white border border-surface-300 rounded-sm overflow-hidden">
                    <div className="sticky top-0 z-10 grid grid-cols-[1.2fr_180px_1fr_110px_90px_160px_100px_90px_110px] items-center bg-white border-b border-surface-300 h-9">
                        <div className="pl-5 pr-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center gap-3">
                            {isSelectMode && (
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size > 0 && selectedIds.size === filteredList.length}
                                    onChange={toggleSelectAll}
                                    className="w-3.5 h-3.5 rounded-sm border-surface-300 text-surface-900 focus:ring-surface-400 cursor-pointer"
                                />
                            )}
                            Candidate
                        </div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center">Assigned</div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center">Position</div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center">Typing</div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center">Score</div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center">Status</div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center">Mode</div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center">Applied</div>
                        <div className="px-4 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.08em] h-full flex items-center justify-center">Actions</div>
                    </div>

                    <div className="divide-y divide-surface-200">
                        {filteredList.map((applicant: Application) => (
                            <ApplicantRow
                                key={applicant.id}
                                applicant={applicant}
                                isSelectMode={isSelectMode}
                                isSelected={selectedIds.has(applicant.id)}
                                onSelect={toggleSelect}
                                onClick={() => handleAction(applicant.id, applicant.applicant_name, 'view')}
                                onAction={(id, name, action) => handleAction(id, name, action as ApplicantAction)}
                                onPromote={handlePromote}
                                isReprofileView={activeTab === 'reprofile'}
                                onSetActiveReprofileAccount={handleSetActiveReprofileAccount}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ApplicantJourneyView
            applications={filteredList}
            onViewSubmission={(app) => {
                if (app.action === 'approve' || app.action === 'reject') {
                    handleAction(app.id, app.applicant_name, app.action as ApplicantAction);
                } else if (app.action === 'delete') {
                    handleAction(app.id, app.applicant_name, 'delete');
                } else {
                    handleAction(app.id, app.applicant_name, 'view');
                }
            }}
            isRequestsView={activeTab === 'requests'}
        />
    );
}
