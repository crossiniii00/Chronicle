import React, { useRef, useEffect, useState } from 'react';
import { Target, CheckCircle2, Building2, AlertTriangle } from 'lucide-react';
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
import { MasterlistMonthTabs } from './masterlist/components/MasterlistMonthTabs';
import type { Application } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { DepartmentService } from '@/services/DepartmentService';


import { InactiveView } from './InactiveView';
import SalaryReferenceView from './SalaryReferenceView';
import { DailyHCReportView } from './DailyHCReportView';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';
import { ResumeManagerModal } from '@/components/features/ApplicantManagement/ResumeManagerModal';
import { PISDashboardModal } from '@/components/features/ApplicantManagement/PISDashboardModal';
import { AddApplicantRegistryModal } from '@/components/features/Registry/AddApplicantRegistryModal';
import { ConfirmDialog, Modal } from '@/components/common/Modal';
import { BulkDeleteProgress } from '@/components/features/ApplicantManagement/BulkDeleteProgress';
import { MasterlistChronicleView } from './masterlist/components/MasterlistChronicleView';
import { ExcelFindBar } from '@/components/common/ExcelFindBar';
import { useTextHighlight } from '@/hooks/useTextHighlight';

import { AccountTransferModal } from './masterlist/components/AccountTransferModal';

interface WithdrawalModalProps {
    pendingWithdrawal: any;
    app?: Application;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

function WithdrawalModal({ pendingWithdrawal, app, onConfirm, onCancel }: WithdrawalModalProps) {
    const [withdrawalReason, setWithdrawalReason] = React.useState('');

    React.useEffect(() => {
        if (!pendingWithdrawal) {
            setWithdrawalReason('');
        }
    }, [pendingWithdrawal]);

    if (!pendingWithdrawal) return null;

    const hasEid = Boolean(String(app?.master_eid || (app as any)?.eid || app?.metadata?.eid || (app?.pis as any)?.eid || '').trim());
    const destName = hasEid ? 'Offboarding Tracker (EID Available)' : 'Inactive Application (No EID)';

    return (
        <ConfirmDialog
            open={!!pendingWithdrawal}
            title="Withdrawal Confirmation"
            message={`This applicant has been marked as Withdrawn. Destination: ${destName}.`}
            confirmText={`Confirm & Move to ${hasEid ? 'Offboarding' : 'Inactive'}`}
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

interface ConfirmedTrainingModalProps {
    pendingConfirmedTraining: any;
    app?: Application;
    onConfirm: (lobName: string | null) => void;
    onCancel: () => void;
}

function ConfirmedTrainingModal({ pendingConfirmedTraining, app, onConfirm, onCancel }: ConfirmedTrainingModalProps) {
    const [lobs, setLobs] = React.useState<any[]>([]);
    const [positions, setPositions] = React.useState<any[]>([]);
    const [selectedLob, setSelectedLob] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (pendingConfirmedTraining && app) {
            setLoading(true);
            Promise.all([
                DepartmentService.getAll(),
                PositionService.getAllOpen()
            ]).then(([deptData, posData]) => {
                const dept = deptData.find(d => (d.name || '').trim().toLowerCase() === (app.department || '').trim().toLowerCase());
                if (dept && dept.subAccounts) {
                    setLobs(dept.subAccounts);
                    if (dept.subAccounts.length > 0) setSelectedLob(dept.subAccounts[0].name);
                } else {
                    setLobs([]);
                }
                setPositions(posData);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [pendingConfirmedTraining, app]);

    if (!pendingConfirmedTraining) return null;

    const lobStats = lobs.map(lob => {
        // Find matching position based on department and opening name or title
        const pos = positions.find(p => 
            (p.department || '').trim().toLowerCase() === (app?.department || '').trim().toLowerCase() &&
            ((p.opening_name || '').trim().toLowerCase() === (lob.name || '').trim().toLowerCase() ||
             (p.title || '').trim().toLowerCase() === (lob.name || '').trim().toLowerCase())
        );
        
        const quota = pos?.hiring_quota || 0;
        const hired = (pos?.current_hired || 0) + (pos?.manual_hired || 0);
        const isFull = quota > 0 && hired >= quota;
        
        return {
            ...lob,
            quota,
            hired,
            isFull,
            hasPosition: !!pos
        };
    });

    const activeLobStats = lobStats.filter(lob => lob.quota > 0);
    const selectedLobStat = lobStats.find(l => l.name === selectedLob);
    const isSelectedFull = selectedLobStat?.isFull;

    return (
        <Modal
            open={!!pendingConfirmedTraining}
            onClose={onCancel}
            title="Confirmed Training"
            size="md"
        >
            <div className="p-6 space-y-6 bg-white dark:bg-slate-900">
                <p className="text-sm text-surface-600 leading-relaxed">
                    Candidate confirmed training. Please select an active LOB opening to assign this candidate. Only LOBs with a hiring quota are shown.
                </p>
                
                {activeLobStats.length > 0 ? (
                    <div className="space-y-3 mt-4">
                        <label className="text-[11px] font-extrabold text-surface-400 uppercase tracking-widest flex items-center gap-2">
                            <Target size={12} /> Select LOB Opening
                        </label>
                        <div className="grid grid-cols-1 gap-2.5 max-h-[320px] overflow-y-auto pr-2">
                            {activeLobStats.map(lob => (
                                <button
                                    key={lob.id || lob.name}
                                    type="button"
                                    onClick={() => setSelectedLob(lob.name)}
                                    className={`w-full text-left p-3.5 border rounded-xl transition-all flex items-center justify-between ${selectedLob === lob.name ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 shadow-sm' : 'border-surface-200 hover:border-emerald-300 hover:bg-surface-50'} ${lob.isFull ? 'opacity-60' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${selectedLob === lob.name ? 'bg-emerald-100 text-emerald-600' : 'bg-surface-100 text-surface-500'}`}>
                                            {selectedLob === lob.name ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Building2 size={14} />}
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${selectedLob === lob.name ? 'text-emerald-900' : 'text-surface-800'}`}>
                                                {lob.name}
                                            </div>
                                            {lob.description && (
                                                <div className="text-[11px] font-medium text-surface-500 mt-0.5">{lob.description}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`text-xs font-black ${lob.isFull ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {lob.hired} / {lob.quota}
                                        </div>
                                        <span className="text-[9px] font-bold text-surface-400 tracking-wider uppercase mt-0.5">Filled</span>
                                        {lob.isFull && (
                                            <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded-sm mt-1">FULL</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-amber-50/80 border border-amber-200 text-amber-700 text-xs rounded-xl flex items-center gap-3">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                        <span className="font-medium leading-relaxed">No active LOB openings with a quota found for this account. You can assign them later.</span>
                    </div>
                )}
                
                {isSelectedFull && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-md">
                        <p className="text-sm text-rose-700 font-medium">This LOB is currently full.</p>
                        <p className="text-xs text-rose-600 mt-1">You can send this candidate to the Pool, or assign them anyway.</p>
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-between gap-2 p-4 border-t border-surface-100 bg-surface-50/50">
                <div>
                    {isSelectedFull && (
                        <button
                            type="button"
                            onClick={() => onConfirm('POOL')}
                            className="px-4 py-2 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded transition-colors"
                        >
                            Send to POOL
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-200 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(null)}
                        className="px-4 py-2 text-xs font-bold bg-surface-200 hover:bg-surface-300 text-surface-700 rounded transition-colors"
                    >
                        Assign Later
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(selectedLob)}
                        disabled={lobs.length === 0}
                        className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Hire & Assign
                    </button>
                </div>
            </div>
        </Modal>
    );
}

interface CloseModalProps {
    pendingClose: any;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

function CloseModal({ pendingClose, onConfirm, onCancel }: CloseModalProps) {
    const [closeReason, setCloseReason] = React.useState('');

    React.useEffect(() => {
        if (!pendingClose) {
            setCloseReason('');
        }
    }, [pendingClose]);

    if (!pendingClose) return null;

    return (
        <ConfirmDialog
            open={!!pendingClose}
            title="Application Close Confirmation"
            message="This applicant will be moved to Inactive Applications."
            confirmText="Confirm & Move"
            confirmClass="bg-red-600 hover:bg-red-700 text-white"
            onConfirm={() => onConfirm(closeReason)}
            onClose={onCancel}
        >
            <div className="space-y-2 mt-2">
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Reason for Closing</label>
                <textarea
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                    placeholder="Enter the reason why this application is being closed..."
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
        showAddModal, setShowAddModal, activeTab, setActiveTab, activeSubTab, setActiveSubTab, isEditing, setIsEditing, isConfigEditing, setIsConfigEditing, localChanges, setLocalChanges,
        isExclusiveMode, setIsExclusiveMode,
        isSyncing, selectedIds, setSelectedIds, isSelectMode, setIsSelectMode, isBulkDeleting, bulkDeleteProgress, deletingId, setDeletingId,
        pivotTraining, setPivotTraining, pivotPosition, setPivotPosition,
        pivotStatus, setPivotStatus, pivotAccount, setPivotAccount,
        loadData, handleEdit: baseHandleEdit, handleMoveRow, handleSyncAll, handleCancelEdit, handleBulkDelete, handleDelete,
        filteredList, accountMetrics, pivotOptions, importPreview, setImportPreview,
        handleImportCSV, handleConfirmImport, selectedStatus, setSelectedStatus,
        selectedWave, setSelectedWave, waveOptions,
        startDateFilter, setStartDateFilter,
        dateAddedFilter, setDateAddedFilter,
        selectedDateFilter, setSelectedDateFilter,
        activePassedMonth, setActivePassedMonth, availablePassedMonths,
        selectedYear, setSelectedYear, availableYears,
        pendingWithdrawal, setPendingWithdrawal,
        pendingAccountTransfer, setPendingAccountTransfer, confirmAccountTransfer, cancelAccountTransfer,
        toggleSelectAll, toggleSelect,
        emailFilter, setEmailFilter,
        notesApp, setNotesApp, handleSaveNote, anchorRect, setAnchorRect,
        focusPath, setFocusPath,
        success, error,
        selectedHireType, setSelectedHireType,
        handleExportExcel, handleBulkHighlight, handleBulkMasterlistTransfer, handleBulkTransferDate,
        isOfficialEndorsement, setIsOfficialEndorsement, officialEndorsementCount, duplicateGovIdsMap
    } = useMasterlist();

    const [pendingConfirmedTraining, setPendingConfirmedTraining] = useState<any>(null);
    const [pendingClose, setPendingClose] = useState<any>(null);
    const [resumeManagerApp, setResumeManagerApp] = useState<Application | null>(null);

    const handleEdit = React.useCallback((appId: string, field: string, value: any) => {
        const valStr = String(value).toUpperCase().trim();

        // Disabled Confirmed Training modal popup intercept as requested by user
        // if (valStr === 'CONFIRMED TRAINING' || valStr === 'CONFIRMED-TRAINING') {
        //     setPendingConfirmedTraining({ appId, field });
        //     return;
        // }
        
        if (valStr === 'WITHDRAWN') {
            const app = allApplications.find(a => a.id === appId);
            if (app) {
                setPendingWithdrawal({
                    appId,
                    previousStatus: app.current_status || 'APPLIED',
                    previousColumn: app.master_column || 'MASTERLIST',
                    field
                });
            }
            return;
        }

        if (field === 'current_status' && value === 'CLOSED') {
            const app = allApplications.find(a => a.id === appId);
            if (app) {
                setPendingClose({
                    appId,
                    previousStatus: app.current_status || 'APPLIED',
                    previousColumn: app.master_column || 'MASTERLIST'
                });
            }
            return;
        }
        baseHandleEdit(appId, field as any, value);
    }, [baseHandleEdit, allApplications, setPendingWithdrawal]);

    useEffect(() => {
        if (location.state && typeof location.state === 'object') {
            const { autoSpotlightAppId, autoSpotlightField, autoStatus } = location.state as any;
            if (autoSpotlightAppId && autoSpotlightField) {
                // Switch tab to MASTERLIST
                setActiveTab('MASTERLIST');
                
                // Reset other filters that might filter out the applicant
                setSelectedAccount(['ALL']);
                setSearch('');
                if (setSelectedDateFilter) {
                    setSelectedDateFilter('ALL');
                }
                
                // Switch selectedStatus to match the applicant's status
                if (setSelectedStatus && autoStatus) {
                    const normalizedStatus = String(autoStatus).toUpperCase().replace(/[\s_]+/g, '_');
                    const validStatuses = ['APPLIED', 'ACCEPTED_OFFER', 'SENT_JO_AND_BGC', 'FOR_JOB_OFFER', 'FOR_PAN', 'PASSED', 'HIRED', 'REJECTED', 'WITHDRAWN'];
                    if (validStatuses.includes(normalizedStatus)) {
                        setSelectedStatus([normalizedStatus]);
                    } else {
                        setSelectedStatus(['ALL']);
                    }
                } else if (setSelectedStatus) {
                    setSelectedStatus(['ALL']);
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
    }, [location.state, setActiveTab, setSelectedStatus, setSelectedAccount, setSearch, setSelectedDateFilter]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [profileApp, setProfileApp] = React.useState<Application | null>(null);
    const [pisDashboardApp, setPisDashboardApp] = React.useState<Application | null>(null);
    const [historyApp, setHistoryApp] = React.useState<Application | null>(null);

    const [showFindBar, setShowFindBar] = useState(false);
    const [findMatchIndex, setFindMatchIndex] = useState(0);
    const [findQuery, setFindQuery] = useState('');
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

    const [bulkPromptType, setBulkPromptType] = React.useState<'NEO' | 'PEME' | 'RCBC' | null>(null);
    const [promotingId, setPromotingId] = React.useState<string | null>(null);
    const [mainView, setMainView] = useState<'EXCEL' | 'CHRONICLE'>('EXCEL');

    const handlePromoteToHired = React.useCallback(async (
        app: Application,
        complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT',
        positionId?: string,
        keepCurrentStatus = false,
        additionalFields: Record<string, any> = {}
    ) => {
        if (promotingId) return;
        
        // Resolve non-failed accounts
        const rawVal = app.department || app.endorsement_account || app.pis?.final_account || '';
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
            let hiringRequestId = '';
            if (positionId) {
                const positions = await PositionService.getAll();
                const pos = positions.find(p => p.id === positionId);
                if (pos) {
                    hiringRequestId = pos.hiring_request_id || '';
                    await PositionService.update(positionId, {
                        current_hired: (pos.current_hired || 0) + 1
                    });
                }
            }
            const nowIso = new Date().toISOString();
            const updatedPis = {
                ...(app.pis || {}),
                final_specific_status: 'JO - Hired',
                final_account: finalAccount,
                ...(additionalFields.pis || {})
            } as Application['pis'];
            await ApplicationService.patch(app.id, {
                current_status: keepCurrentStatus ? app.current_status : 'ACCEPTED_OFFER',
                hired_at: nowIso,
                master_hiring_request_id: hiringRequestId || app.master_hiring_request_id,
                pis: updatedPis,
                metadata: {
                    ...(app.metadata || {}),
                    compliance_status: complianceStatus || 'COMPLIANT',
                    ...(additionalFields.metadata || {})
                },
                ...additionalFields
            } as any);
            success('Offer Accepted', `${app.applicant_name || 'Candidate'} has been promoted to ACCEPTED OFFER.`);
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
        const targetId = sessionStorage.getItem('spotlight_candidate_id');
        if (!targetId) return;

        let attempts = 0;
        const trigger = () => {
            const row = document.querySelector<HTMLTableRowElement>(`tr[data-ai-spotlight="candidate-${targetId}"]`);
            if (row) {
                sessionStorage.removeItem('spotlight_candidate_id');
                row.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

                document.body.classList.add('spotlight-active');
                row.classList.add('spotlight-row-active');

                if (!document.getElementById('spotlight-styles')) {
                    const style = document.createElement('style');
                    style.id = 'spotlight-styles';
                    style.textContent = `
                        @keyframes spotlight-bounce-down {
                            0%, 100% { transform: translate(-50%, 0); }
                            50% { transform: translate(-50%, -8px); }
                        }
                        .spotlight-arrow-anim {
                            animation: spotlight-bounce-down 1.2s infinite ease-in-out;
                        }
                        .spotlight-row-active {
                            position: relative !important;
                            z-index: 100 !important;
                            box-shadow: 0 10px 40px rgba(37, 99, 235, 0.4) !important;
                            outline: 3px solid #3b82f6 !important;
                            background-color: #eff6ff !important;
                            transition: all 0.3s ease !important;
                        }
                        .spotlight-row-active td {
                            background-color: #eff6ff !important;
                        }
                        body.spotlight-active tr:not(.spotlight-row-active) {
                            filter: blur(4px) !important;
                            opacity: 0.35 !important;
                            pointer-events: none !important;
                            transition: filter 0.3s ease, opacity 0.3s ease !important;
                        }
                        body.spotlight-active header,
                        body.spotlight-active aside,
                        body.spotlight-active .navigation-sidebar,
                        body.spotlight-active .filter-bar-container,
                        body.spotlight-active .table-actions {
                            filter: blur(3px) !important;
                            opacity: 0.5 !important;
                            pointer-events: none !important;
                            transition: filter 0.3s ease, opacity 0.3s ease !important;
                        }
                    `;
                    document.head.appendChild(style);
                }

                const arrow = document.createElement('div');
                arrow.className = 'spotlight-arrow-anim';
                arrow.style.cssText = `
                    position: absolute;
                    z-index: 100000;
                    pointer-events: none;
                    left: 20%;
                    transform: translateX(-50%);
                    transition: opacity 0.5s ease;
                    opacity: 0;
                    top: -45px;
                `;
                arrow.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #3b82f6; box-shadow: 0 0 12px #3b82f6; animation: ping 1s infinite; margin-bottom: 2px;"></div>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 8px rgba(37,99,235,0.5));">
                            <path d="M12 5v14M12 19l7-7M12 19l-7-7" />
                        </svg>
                    </div>
                `;
                row.appendChild(arrow);
                requestAnimationFrame(() => arrow.style.opacity = '1');

                const cleanup = () => {
                    document.body.classList.remove('spotlight-active');
                    arrow.style.opacity = '0';
                    row.classList.remove('spotlight-row-active');
                    window.setTimeout(() => {
                        arrow.remove();
                    }, 500);
                    document.removeEventListener('click', cleanup);
                    document.removeEventListener('keydown', cleanup);
                };

                window.setTimeout(cleanup, 4500);
                document.addEventListener('click', cleanup);
                document.addEventListener('keydown', cleanup);

            } else if (attempts < 20) {
                attempts++;
                window.setTimeout(trigger, 150);
            }
        };
        trigger();
    }, [allApplications]);

    useEffect(() => {
        const handler = () => {
            loadData();
        };
        window.addEventListener('ai-data-changed', handler);
        return () => window.removeEventListener('ai-data-changed', handler);
    }, [loadData]);

    const confirmWithdrawal = async (reason: string) => {
        if (!pendingWithdrawal) return;

        const app = allApplications.find(a => a.id === pendingWithdrawal.appId);
        if (!app) {
            setPendingWithdrawal(null);
            return;
        }

        const hasEid = Boolean(String(app.master_eid || (app as any).eid || app.metadata?.eid || (app.pis as any)?.eid || '').trim());
        const targetColumn = hasEid ? 'OFFBOARDING_TRACKER' : 'INACTIVE_APPLICATION';

        const updates: any = {
            current_status: 'Withdrawn',
            master_column: targetColumn,
            rejection_reason: reason,
            metadata: {
                ...(typeof app.metadata === 'object' && app.metadata !== null ? app.metadata : {}),
                previous_status: pendingWithdrawal.previousStatus,
                previous_column: pendingWithdrawal.previousColumn
            }
        };

        if (pendingWithdrawal.field && pendingWithdrawal.field !== 'current_status') {
            updates[pendingWithdrawal.field] = 'Withdrawn';
        }

        try {
            await ApplicationService.patch(pendingWithdrawal.appId, updates);
            // Wait for fresh data before clearing local changes to prevent UI flickering
            await loadData();
            
            // clear from localChanges
            setLocalChanges((prev: any) => {
                const next = { ...prev };
                delete next[pendingWithdrawal.appId];
                return next;
            });
            success('Candidate Withdrawn', `Applicant moved to ${hasEid ? 'Offboarding Tracker' : 'Inactive Applications'}.`);
        } catch (err) {
            console.error('Failed to withdraw application:', err);
        } finally {
            setPendingWithdrawal(null);
        }
    };

    const confirmConfirmedTraining = async (lobName: string | null) => {
        if (!pendingConfirmedTraining) return;
        const app = allApplications.find(a => a.id === pendingConfirmedTraining.appId);
        if (app) {
            setLocalChanges((prev: any) => ({
                ...prev,
                [pendingConfirmedTraining.appId]: {
                    ...(prev[pendingConfirmedTraining.appId] || {}),
                    [pendingConfirmedTraining.field]: 'Confirmed Training',
                    ...(lobName ? {
                        pis: {
                            ...(prev[pendingConfirmedTraining.appId]?.pis || app.pis || {}),
                            custom_lob: lobName
                        }
                    } : {})
                }
            }));
            await handlePromoteToHired(
                app,
                'COMPLIANT',
                undefined,
                true, // keepCurrentStatus = true
                {
                    [pendingConfirmedTraining.field]: 'Confirmed Training',
                    ...(lobName ? {
                        pis: {
                            custom_lob: lobName
                        }
                    } : {})
                }
            );
        }
        setPendingConfirmedTraining(null);
    };

    const cancelWithdrawal = () => {
        setPendingWithdrawal(null);
    };

    const cancelConfirmedTraining = () => {
        setPendingConfirmedTraining(null);
    };

    const confirmClose = async (reason: string) => {
        if (!pendingClose) return;

        const app = allApplications.find(a => a.id === pendingClose.appId);
        if (!app) {
            setPendingClose(null);
            return;
        }

        const updates: any = {
            current_status: 'Closed',
            master_column: 'INACTIVE_APPLICATION',
            rejection_reason: reason,
            metadata: {
                ...(typeof app.metadata === 'object' && app.metadata !== null ? app.metadata : {}),
                previous_status: pendingClose.previousStatus,
                previous_column: pendingClose.previousColumn
            }
        };

        try {
            await ApplicationService.patch(pendingClose.appId, updates);
            await loadData();
            
            setLocalChanges((prev: any) => {
                const next = { ...prev };
                delete next[pendingClose.appId];
                return next;
            });
        } catch (err) {
            console.error('Failed to close application:', err);
        } finally {
            setPendingClose(null);
        }
    };

    const cancelClose = () => {
        setPendingClose(null);
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
                isExclusiveMode={isExclusiveMode}
                setIsExclusiveMode={setIsExclusiveMode}
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
                startDateFilter={startDateFilter}
                setStartDateFilter={setStartDateFilter}
                dateAddedFilter={dateAddedFilter}
                setDateAddedFilter={setDateAddedFilter}
                selectedDateFilter={selectedDateFilter}
                setSelectedDateFilter={setSelectedDateFilter}
                monthOptions={MONTHS}
                accountOptions={accountMetrics.map(a => a.name)}
                selectedIds={selectedIds}
                onBulkDelete={() => setDeletingId('BULK')}
                onClearSelection={() => setSelectedIds(new Set())}
                hideImport={false}
                hideSearch={false}
                hideEdit={false}
                emailFilter={emailFilter}
                setEmailFilter={setEmailFilter}
                onBulkEmail={(type) => setBulkPromptType(type)}
                onExportExcel={handleExportExcel}
                totalCount={filteredList.length}
                onAddCandidate={() => setShowAddModal(true)}
                mainView={mainView}
                setMainView={setMainView}
                selectedHiringType={selectedHireType}
                setSelectedHiringType={setSelectedHireType}

                isOfficialEndorsement={isOfficialEndorsement}
                setIsOfficialEndorsement={setIsOfficialEndorsement}
                officialEndorsementCount={officialEndorsementCount}
            />

            <MasterlistTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                isConfigEditing={isConfigEditing}
                setIsConfigEditing={setIsConfigEditing}
            />

            {mainView === 'EXCEL' ? (
            <>
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
                                isConfigEditing={isConfigEditing}
                                localChanges={localChanges}
                                onEdit={handleEdit as any}
                                onMoveRow={handleMoveRow}
                                selectedIds={selectedIds}
                                setSelectedIds={setSelectedIds}
                                isSelectMode={isSelectMode}
                                setIsSelectMode={setIsSelectMode}
                                onToggleSelect={toggleSelect}
                                onToggleSelectAll={toggleSelectAll}
                                scrollContainerRef={scrollContainerRef}
                                onShowNotes={handleShowNotes}
                                onViewProfile={setPisDashboardApp}
                                onViewPISDashboard={setPisDashboardApp}
                                onShowHistory={setHistoryApp}
                                focusPath={focusPath}
                                setFocusPath={setFocusPath}
                                search={search}
                                bulkPromptType={bulkPromptType}
                                onClearBulkPrompt={handleClearBulkPrompt}
                                onPromoteToHired={handlePromoteToHired}
                                promotingId={promotingId}
                                setActiveTab={setActiveTab}
                                onManageResume={setResumeManagerApp}
                            />
                        </motion.div>
                    ) : (
                        <AccountCards accountMetrics={accountMetrics} setSelectedAccount={setSelectedAccount} />
                    )}
                </AnimatePresence>
                
                <MasterlistMonthTabs 
                    activePassedMonth={activePassedMonth} 
                    setActivePassedMonth={setActivePassedMonth} 
                    availablePassedMonths={availablePassedMonths}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    availableYears={availableYears}
                />
            </div>
            </>
            ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-[#faf9f8]">
                    <MasterlistChronicleView
                        applications={filteredList}
                        localChanges={localChanges}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        handleEdit={handleEdit as any}
                        onSync={handleSyncAll}
                        isSyncing={isSyncing}
                        onManageResume={setResumeManagerApp}
                    />
                </div>
            )}

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
                onMasterlistTransferDate={handleBulkTransferDate}
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

            <AddApplicantRegistryModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={loadData} activeTab={activeTab} />

            <WithdrawalModal
                pendingWithdrawal={pendingWithdrawal}
                app={pendingWithdrawal ? allApplications.find(a => a.id === pendingWithdrawal.appId) : undefined}
                onConfirm={confirmWithdrawal}
                onCancel={cancelWithdrawal}
            />

            <AccountTransferModal
                open={!!pendingAccountTransfer}
                app={pendingAccountTransfer?.app || null}
                targetAccount={pendingAccountTransfer?.targetAccount || ''}
                onClose={cancelAccountTransfer}
                onConfirm={confirmAccountTransfer}
            />

            <ConfirmedTrainingModal
                pendingConfirmedTraining={pendingConfirmedTraining}
                app={pendingConfirmedTraining ? allApplications.find(a => a.id === pendingConfirmedTraining.appId) : undefined}
                onConfirm={confirmConfirmedTraining}
                onCancel={cancelConfirmedTraining}
            />

            <CloseModal
                pendingClose={pendingClose}
                onConfirm={confirmClose}
                onCancel={cancelClose}
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
                pisOnly={false}
            />

            <PISDashboardModal
                open={!!pisDashboardApp}
                onClose={() => setPisDashboardApp(null)}
                applicant={pisDashboardApp!}
                pisOnly={false}
            />

            {resumeManagerApp && (
                <ResumeManagerModal
                    applicant={resumeManagerApp}
                    onClose={() => setResumeManagerApp(null)}
                    handleUpdateApplication={async (id: string, patch: any) => {
                        try {
                            const { ApplicationService } = await import('@/services/ApplicationService');
                            await ApplicationService.patch(id, patch);
                            setResumeManagerApp(prev => prev ? { ...prev, ...patch } : null);
                            loadData();
                        } catch (e) {
                            console.error('Failed to update resume:', e);
                        }
                    }}
                />
            )}

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
            <div className="fixed bottom-20 right-6 z-[999]">
                <MasterlistFilterBar
                    search={search}
                    setSearch={setSearch}
                    activeTab={activeTab}
                    isOfficialEndorsement={isOfficialEndorsement}
                    setIsOfficialEndorsement={setIsOfficialEndorsement}
                    officialEndorsementCount={officialEndorsementCount}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    isSelectMode={isSelectMode}
                    setIsSelectMode={setIsSelectMode}
                    isExclusiveMode={isExclusiveMode}
                    setIsExclusiveMode={setIsExclusiveMode}
                    isSyncing={isSyncing}
                    hasLocalChanges={Object.keys(localChanges).length > 0}
                    handleSyncAll={handleSyncAll}
                    handleCancelEdit={handleCancelEdit}
                    onImportCSV={handleImportCSV}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    selectedWave={selectedWave}
                    setSelectedWave={setSelectedWave}
                    waveOptions={waveOptions}
                    selectedDateFilter={selectedDateFilter}
                    setSelectedDateFilter={setSelectedDateFilter}
                    selectedHireType={selectedHireType}
                    setSelectedHireType={setSelectedHireType}
                    monthOptions={MONTHS}
                    accountOptions={accountMetrics.map(a => a.name)}
                    onExportExcel={handleExportExcel}
                    onAddData={() => setShowAddModal(true)}
                />
            </div>

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
