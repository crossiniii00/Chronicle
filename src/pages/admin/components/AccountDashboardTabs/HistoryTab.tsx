import React, { useState } from 'react';
import { List, LayoutGrid, History, Edit2, Trash2, BarChart3, Clock, Plus } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import { CalendarDropdown } from '@/components/common/CalendarDropdown';
import type { HiringQuotaHistory } from '@/services/PositionService';
import type { AccountDashboardData } from '../AccountDashboardModal';
import type { QuotaHistoryMetric } from '../QuotaHistoryModal';

interface HistoryTabProps {
    accountDashboardData: AccountDashboardData;
    quotaHistoryViewMode: 'list' | 'cards';
    setQuotaHistoryViewMode: (mode: 'list' | 'cards') => void;
    isAddingHistory: boolean;
    setIsAddingHistory: (open: boolean) => void;
    editingHistoryId: string | null;
    setEditingHistoryId: (id: string | null) => void;
    historyQuota: number;
    setHistoryQuota: (val: number) => void;
    historyHiringType: 'Billed' | 'Non-Billed';
    setHistoryHiringType: (val: 'Billed' | 'Non-Billed') => void;
    historyManualHires: number;
    setHistoryManualHires: (val: number) => void;
    historyStart: string;
    setHistoryStart: (date: string) => void;
    historyEnd: string;
    setHistoryEnd: (date: string) => void;
    historyTrainingStart: string;
    setHistoryTrainingStart: (date: string) => void;
    historyHiringQuotaId: string;
    setHistoryHiringQuotaId: (val: string) => void;
    historyOpeningName: string;
    setHistoryOpeningName: (val: string) => void;
    historyAssignedCandidates: string[];
    setHistoryAssignedCandidates: (val: string[]) => void;
    historySalaryMatrixCategory: string;
    setHistorySalaryMatrixCategory: (val: string) => void;
    historyClassType: string;
    setHistoryClassType: (val: string) => void;
    historyRosterDate: string;
    setHistoryRosterDate: (val: string) => void;
    historyHiringReqHc: number;
    setHistoryHiringReqHc: (val: number) => void;
    historyTotalOffersExtended: number;
    setHistoryTotalOffersExtended: (val: number) => void;
    historyManualJobOffers: number;
    setHistoryManualJobOffers: (val: number) => void;
    historyManualFallout: number;
    setHistoryManualFallout: (val: number) => void;
    historyNetHiresInternal: number;
    setHistoryNetHiresInternal: (val: number) => void;
    historyNetHiresExternal: number;
    setHistoryNetHiresExternal: (val: number) => void;
    historyManualBalance: number;
    setHistoryManualBalance: (val: number) => void;
    historyJoBalance: number;
    setHistoryJoBalance: (val: number) => void;
    historyManualDay1ShowUp: number;
    setHistoryManualDay1ShowUp: (val: number) => void;
    historyNotes: string;
    setHistoryNotes: (val: string) => void;
    savingHistory: boolean;
    handleSaveHistoryRecord: () => Promise<void>;
    filterStartDate: string;
    setFilterStartDate: (date: string) => void;
    filterEndDate: string;
    setFilterEndDate: (date: string) => void;
    filteredHistory: HiringQuotaHistory[];
    setSelectedHistoryDashboard: (item: any) => void;
    setQuotaHistoryDrilldown: (drilldown: { item: HiringQuotaHistory; metric: QuotaHistoryMetric } | null) => void;
    handleEditHistoryClick: (item: HiringQuotaHistory) => void;
    handleReactivateHistory?: (item: HiringQuotaHistory) => void;
    setPendingDeleteId: (id: string | null) => void;
    setDeleteConfirmOpen: (open: boolean) => void;
    getDurationLabel: (start?: string | null, end?: string | null) => string;
    toDateInputValue: (value?: string | null) => string;
    allApplications?: import('@/types/application').Application[];
    subAccounts?: { id: string, name: string, description?: string }[];
    departmentName: string;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
    accountDashboardData,
    quotaHistoryViewMode,
    setQuotaHistoryViewMode,
    isAddingHistory,
    setIsAddingHistory,
    editingHistoryId,
    setEditingHistoryId,
    historyQuota,
    setHistoryQuota,
    historyHiringType,
    setHistoryHiringType,
    historyManualHires,
    setHistoryManualHires,
    historyStart,
    setHistoryStart,
    historyEnd,
    setHistoryEnd,
    historyTrainingStart,
    setHistoryTrainingStart,
    historyHiringQuotaId,
    setHistoryHiringQuotaId,
    historyOpeningName,
    setHistoryOpeningName,
    historyAssignedCandidates,
    setHistoryAssignedCandidates,
    historySalaryMatrixCategory,
    setHistorySalaryMatrixCategory,
    historyClassType,
    setHistoryClassType,
    historyRosterDate,
    setHistoryRosterDate,
    historyHiringReqHc,
    setHistoryHiringReqHc,
    historyTotalOffersExtended,
    setHistoryTotalOffersExtended,
    historyManualJobOffers,
    setHistoryManualJobOffers,
    historyManualFallout,
    setHistoryManualFallout,
    historyNetHiresInternal,
    setHistoryNetHiresInternal,
    historyNetHiresExternal,
    setHistoryNetHiresExternal,
    historyManualBalance,
    setHistoryManualBalance,
    historyJoBalance,
    setHistoryJoBalance,
    historyManualDay1ShowUp,
    setHistoryManualDay1ShowUp,
    historyNotes,
    setHistoryNotes,
    savingHistory,
    handleSaveHistoryRecord,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    filteredHistory,
    setSelectedHistoryDashboard,
    setQuotaHistoryDrilldown,
    handleEditHistoryClick,
    handleReactivateHistory,
    setPendingDeleteId,
    setDeleteConfirmOpen,
    getDurationLabel,
    toDateInputValue,
    allApplications = [],
    subAccounts = [],
    departmentName
}) => {
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [modalTab, setModalTab] = useState<'details' | 'candidates'>('details');

    const isCandidateEligible = (app: import('@/types/application').Application) => {
        // 1. Must belong to this department
        if (app.department !== departmentName) return false;

        // 2. If they are already assigned to THIS history record we're editing, always show them
        if (historyAssignedCandidates.includes(app.id)) return true;

        // 3. Status condition: Must be Accepted Offer or Confirmed Training
        const status = String(app.current_status || '').toUpperCase().replace(/_/g, ' ');
        const isAcceptedOrConfirmed = ['ACCEPTED OFFER', 'CONFIRMED TRAINING'].includes(status);
        if (!isAcceptedOrConfirmed) return false;

        const customLob = (app.pis?.custom_lob || '').trim().toLowerCase();
        const hasLob = !!customLob && customLob !== 'agent';
        
        // 4. Must match the LOB currently being created/edited, OR have no LOB
        const selectedLob = (historyOpeningName || '').trim().toLowerCase();
        if (hasLob && selectedLob && customLob !== selectedLob) return false;

        // 5. Are they assigned to an ACTIVE quota?
        // An active quota is an opening in accountDashboardData.openings.
        const hasActiveQuotaForThisLob = accountDashboardData?.openings?.some(o => (o.name || '').trim().toLowerCase() === customLob);
        if (hasLob && hasActiveQuotaForThisLob) {
            return false;
        }

        // 6. Are they assigned to ANY previous LOB (history record)
        const assignedToAnyPrevious = accountDashboardData?.history?.some(h => (h.assignedCandidates || []).includes(app.id));
        if (assignedToAnyPrevious) return false;

        return true;
    };

    const formatDisplayDate = (dateStr?: string | null) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-100 shadow-sm overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 dark:bg-slate-800/30">
                <div>
                    <h3 className="text-[13px] font-bold text-slate-705 uppercase tracking-wider">Hiring Quota History</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Closed seasonal quota archives</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-0.5 rounded-none shrink-0">
                        <button
                            type="button"
                            onClick={() => setQuotaHistoryViewMode('list')}
                            className={cn(
                                "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-none transition-all flex items-center gap-1.5 cursor-pointer border-0 outline-none",
                                quotaHistoryViewMode === 'list'
                                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs"
                                    : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                            )}
                        >
                            <List size={11} />
                            <span>List</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuotaHistoryViewMode('cards')}
                            className={cn(
                                "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-none transition-all flex items-center gap-1.5 cursor-pointer border-0 outline-none",
                                quotaHistoryViewMode === 'cards'
                                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs"
                                    : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                            )}
                        >
                            <LayoutGrid size={11} />
                            <span>Cards</span>
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setEditingHistoryId(null);
                            setHistoryQuota(0);
                            setHistoryHiringType('Billed');
                            setHistoryManualHires(0);
                            setHistoryStart('');
                            setHistoryEnd('');
                            setHistoryTrainingStart('');
                            setHistoryHiringQuotaId('');
                            setHistoryOpeningName('');
                            setIsAddingHistory(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-none transition-all border border-indigo-700 shadow-xs cursor-pointer"
                    >
                        Add Previous Quota
                    </button>
                </div>
            </div>

            <Modal
                open={isAddingHistory}
                onClose={() => { setIsAddingHistory(false); setEditingHistoryId(null); }}
                title={editingHistoryId ? "EDIT PREVIOUS QUOTA RECORD" : "ADD PREVIOUS QUOTA RECORD"}
                size="lg"
            >
                <div className="space-y-6 text-left">
                    <div className="flex space-x-6 border-b border-[#edebe9] dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setModalTab('details')}
                            className={cn(
                                'pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer relative top-[1px] whitespace-nowrap',
                                modalTab === 'details'
                                    ? 'border-[#0078d4] text-[#201f1e] dark:text-slate-200'
                                    : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#201f1e] dark:text-slate-200'
                            )}
                        >
                            Hiring Quota Details
                        </button>
                        <button
                            type="button"
                            onClick={() => setModalTab('candidates')}
                            className={cn(
                                'pb-3 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer relative top-[1px] whitespace-nowrap',
                                modalTab === 'candidates'
                                    ? 'border-[#0078d4] text-[#201f1e] dark:text-slate-200'
                                    : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#201f1e] dark:text-slate-200'
                            )}
                        >
                            Candidates
                            {historyAssignedCandidates.length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-[#0078d4]/10 text-[#0078d4] rounded-full">
                                    {historyAssignedCandidates.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {modalTab === 'details' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
                                {/* LEFT COLUMN */}
                                <div className="md:col-span-7 space-y-8">
                                    {/* Section: Quota Definition */}
                                    <div className="space-y-4">
                                        <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2">Quota Definition</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Opening Name (LOB)</label>
                                                <select
                                                    value={historyOpeningName}
                                                    onChange={e => setHistoryOpeningName(e.target.value)}
                                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none cursor-pointer"
                                                >
                                                    <option value="" disabled>Select LOB...</option>
                                                    {subAccounts.map((lob, idx) => (
                                                        <option key={lob.id || idx} value={lob.name}>{lob.name}</option>
                                                    ))}
                                                    {subAccounts.length === 0 && (
                                                        <option value="" disabled>No LOBs available</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Requirement</label>
                                                <input
                                                    type="number" min="0" value={historyQuota}
                                                    onChange={e => setHistoryQuota(parseInt(e.target.value) || 0)}
                                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[15px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Hiring Req HC (inc. Buffers)</label>
                                                <input
                                                    type="number" min="0" value={historyHiringReqHc}
                                                    onChange={e => setHistoryHiringReqHc(e.target.value === '' ? 0 : parseInt(e.target.value))}
                                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Internal/External</label>
                                                <select
                                                    value={historyHiringType}
                                                    onChange={e => setHistoryHiringType(e.target.value as 'Billed' | 'Non-Billed')}
                                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none cursor-pointer"
                                                >
                                                    <option value="Billed">Internal/External</option>
                                                    <option value="Non-Billed">External</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Active Hires</label>
                                                <input
                                                    type="number" min="0" value={historyManualHires}
                                                    onChange={e => setHistoryManualHires(parseInt(e.target.value) || 0)}
                                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN */}
                                <div className="md:col-span-5 space-y-8">
                                    {/* Section: Timeline & Tracking */}
                                    <div className="space-y-4">
                                        <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2">Timeline & Tracking</h5>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Training Start Date</label>
                                                <div className="h-11">
                                                    <CalendarDropdown
                                                        value={historyTrainingStart}
                                                        onChange={setHistoryTrainingStart}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Hiring Request ID</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text" value={historyHiringQuotaId}
                                                        onChange={e => setHistoryHiringQuotaId(e.target.value)}
                                                        className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                                        placeholder="e.g. Q-101"
                                                    />
                                                    <button 
                                                        onClick={() => setHistoryHiringQuotaId(historyHiringQuotaId ? historyHiringQuotaId + ', ' : '')}
                                                        title="Add another ID"
                                                        className="h-11 w-11 flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 text-[#605e5c] dark:text-slate-400 hover:bg-[#f3f2f1] transition-colors"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FULL WIDTH: Manual Overrides */}
                            <div className="space-y-4 mt-8 border-t border-[#edebe9] dark:border-slate-800 pt-6">
                                <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2">Manual Overrides (Optional)</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Total Offers Extended</label>
                                        <input
                                            type="number" value={historyTotalOffersExtended}
                                            onChange={e => setHistoryTotalOffersExtended(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Total Accepted Job Offers</label>
                                        <input
                                            type="number" value={historyManualJobOffers}
                                            onChange={e => setHistoryManualJobOffers(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Fallout</label>
                                        <input
                                            type="number" value={historyManualFallout}
                                            onChange={e => setHistoryManualFallout(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Net Hires Internal</label>
                                        <input
                                            type="number" value={historyNetHiresInternal}
                                            onChange={e => setHistoryNetHiresInternal(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Net Hires External</label>
                                        <input
                                            type="number" value={historyNetHiresExternal}
                                            onChange={e => setHistoryNetHiresExternal(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Balance (Net Hires)</label>
                                        <input
                                            type="number" value={historyManualBalance}
                                            onChange={e => setHistoryManualBalance(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">JO Balance</label>
                                        <input
                                            type="number" value={historyJoBalance}
                                            onChange={e => setHistoryJoBalance(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Day 1 Show Up</label>
                                        <input
                                            type="number" value={historyManualDay1ShowUp}
                                            onChange={e => setHistoryManualDay1ShowUp(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* FULL WIDTH: Additional Information */}
                            <div className="space-y-4 mt-8 border-t border-[#edebe9] dark:border-slate-800 pt-6 pb-6">
                                <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2">Additional Information</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Salary Matrix Category</label>
                                        <input
                                            type="text" value={historySalaryMatrixCategory}
                                            onChange={e => setHistorySalaryMatrixCategory(e.target.value)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Class Type</label>
                                        <input
                                            type="text" value={historyClassType}
                                            onChange={e => setHistoryClassType(e.target.value)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Roster Date</label>
                                        <div className="h-11">
                                            <CalendarDropdown
                                                value={historyRosterDate}
                                                onChange={setHistoryRosterDate}
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide mb-2">Notes</label>
                                        <input
                                            type="text" value={historyNotes}
                                            onChange={e => setHistoryNotes(e.target.value)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-blue-50/50 p-3 rounded-none border border-blue-100">
                                Select candidates that were assigned to this specific historical quota. This makes it easier to track past assignments.
                            </div>
                            {allApplications.filter(isCandidateEligible).length === 0 ? (
                                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No eligible candidates found.</div>
                            ) : (
                                allApplications
                                    .filter(isCandidateEligible)
                                    .map(app => (
                                        <label key={app.id} className="flex items-center gap-3 p-3 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 border border-slate-100 cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded-none text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                                                checked={historyAssignedCandidates.includes(app.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setHistoryAssignedCandidates([...historyAssignedCandidates, app.id]);
                                                    } else {
                                                        setHistoryAssignedCandidates(historyAssignedCandidates.filter(id => id !== app.id));
                                                    }
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{app.applicant_name}</div>
                                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    Status: {app.current_status || 'Unknown'} 
                                                    {app.applied_at && ` • Applied: ${formatDisplayDate(app.applied_at)}`}
                                                </div>
                                            </div>
                                        </label>
                                    ))
                            )}
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#edebe9] dark:border-slate-800 mt-6">
                        <button
                            onClick={() => { setIsAddingHistory(false); setEditingHistoryId(null); }}
                            className="h-10 px-6 bg-white dark:bg-slate-900 border border-[#c8c6c4] dark:border-slate-700 text-[13px] font-semibold text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] active:bg-[#edebe9] dark:bg-slate-800 rounded-none transition-all text-center cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveHistoryRecord}
                            disabled={savingHistory}
                            className="h-10 px-6 bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white text-[13px] font-semibold rounded-none transition-all disabled:opacity-50 text-center cursor-pointer"
                        >
                            {savingHistory ? 'Saving…' : (editingHistoryId ? 'Save Changes' : 'Save Record')}
                        </button>
                    </div>
                </div>
            </Modal>

            {accountDashboardData.history.length > 0 && (
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 dark:bg-slate-800/20 flex flex-wrap items-center gap-4 text-left">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Filter campaigns:</span>
                    <div className="flex items-center gap-2 max-w-[200px] w-full">
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">From</span>
                        <CalendarDropdown
                            value={filterStartDate}
                            onChange={setFilterStartDate}
                            label="Start Date"
                        />
                    </div>
                    <div className="flex items-center gap-2 max-w-[200px] w-full">
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">To</span>
                        <CalendarDropdown
                            value={filterEndDate}
                            onChange={setFilterEndDate}
                            label="End Date"
                            min={filterStartDate}
                        />
                    </div>
                    {(filterStartDate || filterEndDate) && (
                        <button
                            type="button"
                            onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/60 px-2.5 py-1 rounded-none cursor-pointer transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            )}

            {filteredHistory.length > 0 ? (
                quotaHistoryViewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-5">
                        {filteredHistory.map((item) => {
                            const originalIndex = accountDashboardData.history.findIndex(h => h.id === item.id);
                            const attainment = item.quota > 0 ? Math.round((item.hiredCount / item.quota) * 100) : 0;
                            const duration = getDurationLabel(toDateInputValue(item.startDate), toDateInputValue(item.endDate));
                            const seasonLabel = item.startDate || item.endDate
                                ? `${item.startDate ? formatDisplayDate(item.startDate) : 'No start'} – ${item.endDate ? formatDisplayDate(item.endDate) : 'No end'}`
                                : 'No season dates recorded';
                            const isExpanded = expandedCardId === item.id;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                                    className={cn(
                                        "border rounded-none bg-white dark:bg-slate-900 hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between",
                                        isExpanded ? "border-blue-500 shadow-md ring-1 ring-blue-100" : "border-slate-200 dark:border-slate-800"
                                    )}
                                >
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold rounded-none shadow-xs">
                                                    Season #{accountDashboardData.history.length - originalIndex}
                                                </span>
                                                {item.openingName && (
                                                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                                                        {item.openingName}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-none border",
                                                attainment >= 100
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : attainment >= 50
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                            )}>
                                                {attainment}% Attained
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="text-[13px] font-extrabold text-slate-800 dark:text-slate-200 line-clamp-2 uppercase tracking-tight leading-tight">
                                                {item.openingName ? item.openingName : seasonLabel}
                                            </h4>
                                            {item.openingName && (
                                                <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                                                    {seasonLabel}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                                                <Clock size={11} />
                                                {duration}
                                            </p>
                                        </div>

                                        {isExpanded ? (
                                            <div className="space-y-3 pt-2">
                                                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                                                    {[
                                                        { metric: 'quota' as const, label: 'Target', value: item.quota, color: 'text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800' },
                                                        { metric: 'hired' as const, label: 'Hired', value: item.hiredCount, color: 'text-emerald-700 bg-emerald-50/40 border-emerald-200' },
                                                        { metric: 'processed' as const, label: 'Applicants', value: item.totalApplicants, color: 'text-blue-700 bg-blue-50/40 border-blue-200' },
                                                        { metric: 'fallout' as const, label: 'Rejected', value: item.failedCount, color: 'text-rose-700 bg-rose-50/40 border-rose-200' }
                                                    ].map(stat => (
                                                        <button
                                                            key={stat.label}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setQuotaHistoryDrilldown({ item, metric: stat.metric });
                                                            }}
                                                            className={cn("border p-2.5 text-left rounded-none shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/80 active:scale-[0.98] outline-none cursor-pointer flex flex-col justify-between", stat.color)}
                                                            title={`View ${stat.label.toLowerCase()} details`}
                                                        >
                                                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{stat.label}</span>
                                                            <span className="block text-[13px] font-extrabold leading-none mt-1">{stat.value}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {item.closedAt && (
                                                    <div className="flex justify-between items-center text-[10.5px] border-t border-slate-100 pt-2 text-slate-500 dark:text-slate-400">
                                                        <span className="font-semibold uppercase tracking-wider">Closed At</span>
                                                        <span className="font-bold">{formatDisplayDate(item.closedAt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-[11px]">
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-none border border-slate-100">
                                                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Hired Units</span>
                                                    <span className="text-[12.5px] font-black text-slate-700 dark:text-slate-300 mt-0.5">{item.hiredCount} / {item.quota}</span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-none border border-slate-100">
                                                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Hiring Type</span>
                                                    <span className="text-[12.5px] font-black text-slate-705 mt-0.5">{item.hiringType || 'Billed'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedHistoryDashboard(item); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-none cursor-pointer transition-all bg-white dark:bg-slate-900"
                                        >
                                            <BarChart3 size={12} />
                                            Dashboard
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        <div className="divide-y divide-slate-100">
                            {filteredHistory.map((item) => {
                                const originalIndex = accountDashboardData.history.findIndex(h => h.id === item.id);
                                const attainment = item.quota > 0 ? Math.round((item.hiredCount / item.quota) * 100) : 0;
                                const duration = getDurationLabel(toDateInputValue(item.startDate), toDateInputValue(item.endDate));
                                const seasonLabel = item.startDate || item.endDate
                                    ? `${item.startDate ? formatDisplayDate(item.startDate) : 'No start'} – ${item.endDate ? formatDisplayDate(item.endDate) : 'No end'}`
                                    : 'No season dates recorded';

                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors group/row"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                            <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] font-extrabold text-slate-600 shrink-0 shadow-xs">
                                                {accountDashboardData.history.length - originalIndex}
                                            </span>
                                            <div className="min-w-0">
                                                <h4 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                                                    <span>{item.openingName ? item.openingName : seasonLabel}</span>
                                                    {item.hiringQuotaId && (
                                                        <span className="bg-slate-50 dark:bg-slate-800 border border-slate-150 px-1.5 py-0.5 rounded-none text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                            ID: {item.hiringQuotaId}
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    {item.openingName ? `${seasonLabel} · ${duration}` : duration}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-center shrink-0">
                                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Hired</span>
                                            <span className="text-[13px] font-black text-slate-700 dark:text-slate-300">{item.hiredCount} / {item.quota}</span>
                                        </div>

                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-none border shrink-0",
                                            attainment >= 100
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : attainment >= 50
                                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                        )}>
                                            {attainment}%
                                        </span>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => setSelectedHistoryDashboard(item)}
                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-none cursor-pointer transition-all bg-white dark:bg-slate-900"
                                                title="View dashboard"
                                            >
                                                <BarChart3 size={11} />
                                                Dashboard
                                            </button>
                                            <button
                                                onClick={() => setExpandedCardId(expandedCardId === item.id ? null : item.id)}
                                                className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-none cursor-pointer transition-all bg-white dark:bg-slate-900"
                                                title="Expand details"
                                            >
                                                Expand
                                            </button>
                                            <button
                                                onClick={() => handleEditHistoryClick(item)}
                                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-none cursor-pointer transition-all border border-transparent hover:border-blue-200"
                                                title="Edit"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (handleReactivateHistory) handleReactivateHistory(item);
                                                }}
                                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-none cursor-pointer transition-all border border-transparent hover:border-emerald-200"
                                                title="Set Active Again"
                                            >
                                                <History size={12} />
                                            </button>
                                            <button
                                                onClick={() => { setPendingDeleteId(item.id); setDeleteConfirmOpen(true); }}
                                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-none cursor-pointer transition-all border border-transparent hover:border-rose-200"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )) : (
                <div className="p-16 text-center">
                    <History size={32} className="mx-auto text-slate-300 mb-2.5" />
                    <p className="text-[11px] font-bold text-slate-450">
                        {accountDashboardData.history.length > 0
                            ? "No quota seasons match the filters"
                            : "No closed quota seasons yet"}
                    </p>
                </div>
            )}
        </div>
    );
};
