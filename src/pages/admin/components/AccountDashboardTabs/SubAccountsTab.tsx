import React from 'react';
import { Plus, Trash2, Network, BarChart3, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import { PositionService } from '@/services/PositionService';
import { LOBDashboardModal } from '../LOBDashboardModal';
import type { AccountDashboardData } from '../AccountDashboardModal';
import type { Application } from '@/types';

interface SubAccountsTabProps {
    selectedAccount: Department;
    setSelectedAccount: (dept: Department | null) => void;
    subAccounts: any[];
    setSubAccounts: (val: any[]) => void;
    isAddingSubAccount: boolean;
    setIsAddingSubAccount: (val: boolean) => void;
    newSubAccountName: string;
    setNewSubAccountName: (val: string) => void;
    newSubAccountDesc: string;
    setNewSubAccountDesc: (val: string) => void;
    loadData?: () => Promise<void>;
    accountDashboardData?: AccountDashboardData | null;
    allApplications?: Application[];
}

export const SubAccountsTab: React.FC<SubAccountsTabProps> = ({
    selectedAccount,
    setSelectedAccount,
    subAccounts,
    setSubAccounts,
    isAddingSubAccount,
    setIsAddingSubAccount,
    newSubAccountName,
    setNewSubAccountName,
    newSubAccountDesc,
    setNewSubAccountDesc,
    loadData,
    accountDashboardData,
    allApplications = []
}) => {
    const [selectedLOBDashboard, setSelectedLOBDashboard] = React.useState<{ id: string; name: string; description?: string } | null>(null);

    // Count active openings and history for each LOB
    const getLOBStats = (lobName: string) => {
        if (!accountDashboardData) return { activeCount: 0, historyCount: 0, totalQuota: 0, totalHired: 0 };
        const name = lobName.trim().toLowerCase();
        const activeOpenings = accountDashboardData.openings.filter(o => (o.name || '').trim().toLowerCase() === name);
        const historicalCampaigns = accountDashboardData.history.filter(h => (h.openingName || '').trim().toLowerCase() === name);
        const totalQuota = activeOpenings.reduce((s, o) => s + (o.quota || 0), 0) + historicalCampaigns.reduce((s, h) => s + (h.quota || 0), 0);
        const totalHired = activeOpenings.reduce((s, o) => s + (o.hired || 0) + (o.manualHired || 0), 0) + historicalCampaigns.reduce((s, h) => s + (h.hiredCount || 0), 0);
        return { activeCount: activeOpenings.length, historyCount: historicalCampaigns.length, totalQuota, totalHired };
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-left">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                    <div>
                        <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Job Position</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Manage Job Positions</p>
                    </div>
                    <button
                        onClick={() => setIsAddingSubAccount(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-none shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus size={14} /> Add Job Position
                    </button>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/10">
                    <Modal
                        open={isAddingSubAccount}
                        onClose={() => {
                            setIsAddingSubAccount(false);
                            setNewSubAccountName('');
                            setNewSubAccountDesc('');
                        }}
                        title="Add a Job Position"
                        size="md"
                    >
                        <div className="p-6 space-y-5 bg-slate-50 dark:bg-slate-800/50 text-left">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Name of Job Position</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white dark:bg-slate-900 shadow-sm"
                                        placeholder="e.g. Retail"
                                        value={newSubAccountName}
                                        onChange={(e) => setNewSubAccountName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Description</label>
                                    <textarea
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none min-h-[100px] bg-white dark:bg-slate-900 shadow-sm"
                                        placeholder="Enter Job Position description"
                                        value={newSubAccountDesc}
                                        onChange={(e) => setNewSubAccountDesc(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800/60">
                                <button
                                    onClick={() => {
                                        setIsAddingSubAccount(false);
                                        setNewSubAccountName('');
                                        setNewSubAccountDesc('');
                                    }}
                                    className="px-4 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-none transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (newSubAccountName.trim() && selectedAccount) {
                                            const updatedSubAccounts = [...subAccounts, {
                                                id: Date.now().toString(),
                                                name: newSubAccountName.trim(),
                                                description: newSubAccountDesc.trim()
                                            }];

                                            try {
                                                await DepartmentService.update(selectedAccount.id, {
                                                    subAccounts: updatedSubAccounts
                                                });
                                                setSubAccounts(updatedSubAccounts);
                                                setSelectedAccount({ ...selectedAccount, subAccounts: updatedSubAccounts });
                                                if (loadData) await loadData();
                                                
                                                if (window.confirm("Would you also like to add this job position to the public Job Listings (Candidate View)?")) {
                                                    try {
                                                        await PositionService.add({
                                                            title: newSubAccountName.trim(),
                                                            department: selectedAccount.name,
                                                            description: newSubAccountDesc.trim(),
                                                            status: 'OPEN',
                                                            employment_type: 'Full-time',
                                                            location: 'Remote',
                                                            work_arrangement: 'Remote',
                                                            hiring_quota: 0
                                                        });
                                                    } catch (e) {
                                                        console.error("Failed to create job posting:", e);
                                                    }
                                                }
                                            } catch (error) {
                                                console.error("Failed to save LOB:", error);
                                            }

                                            setIsAddingSubAccount(false);
                                            setNewSubAccountName('');
                                            setNewSubAccountDesc('');
                                        }
                                    }}
                                    disabled={!newSubAccountName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded-none shadow-sm transition-colors cursor-pointer"
                                >
                                    Save LOB
                                </button>
                            </div>
                        </div>
                    </Modal>

                    {subAccounts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subAccounts.map((rawAcc, idx) => {
                                const acc = typeof rawAcc === 'string'
                                    ? { id: `lob-${idx}`, name: rawAcc, description: '' }
                                    : { id: rawAcc.id || `lob-${idx}`, name: rawAcc.name || '', description: rawAcc.description || '' };
                                const stats = getLOBStats(acc.name);
                                const fillRate = stats.totalQuota > 0 ? Math.round((stats.totalHired / stats.totalQuota) * 100) : 0;
                                return (
                                    <div
                                        key={acc.id}
                                        onClick={() => setSelectedLOBDashboard(acc)}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:shadow-md p-4 rounded-none shadow-sm relative group cursor-pointer transition-all duration-200"
                                    >
                                        <div className="pr-8">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h5 className="text-[14px] font-bold text-slate-800 dark:text-slate-200">{acc.name}</h5>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                            {acc.description && (
                                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{acc.description}</p>
                                            )}
                                            {/* LOB Stats Summary */}
                                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                    <BarChart3 size={11} className="text-blue-500" />
                                                    {stats.activeCount} Active
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {stats.historyCount} Past
                                                </span>
                                                {stats.totalQuota > 0 && (
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-none ${fillRate >= 100 ? 'bg-emerald-50 text-emerald-700' : fillRate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'}`}>
                                                        {stats.totalHired}/{stats.totalQuota} hired
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!selectedAccount) return;
                                                const updatedSubAccounts = subAccounts.filter(s => s.id !== acc.id);
                                                try {
                                                    await DepartmentService.update(selectedAccount.id, {
                                                        subAccounts: updatedSubAccounts
                                                    });
                                                    setSubAccounts(updatedSubAccounts);
                                                    setSelectedAccount({ ...selectedAccount, subAccounts: updatedSubAccounts });
                                                    if (loadData) await loadData();
                                                } catch (error) {
                                                    console.error("Failed to delete LOB:", error);
                                                }
                                            }}
                                            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-none transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : !isAddingSubAccount && (
                        <div className="p-16 text-center">
                            <Network size={32} className="mx-auto text-slate-300 mb-2.5" />
                            <p className="text-[11px] font-bold text-slate-400">No Lines of Business (LOB) added yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* LOB Dashboard Modal */}
            <LOBDashboardModal
                lob={selectedLOBDashboard}
                onClose={() => setSelectedLOBDashboard(null)}
                accountDashboardData={accountDashboardData || null}
                allApplications={allApplications}
                departmentName={selectedAccount?.name}
            />
        </div>
    );
};
