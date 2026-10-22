import React, { useState, useMemo } from 'react';
import { Users, Clock, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';
import { Department } from '@/services/DepartmentService';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import type { Application } from '@/types';
import type { AccountDashboardData } from '../AccountDashboardModal';
import { DetailModalPortal } from '@/components/common/DetailModalPortal';
import { useToast } from '@/components/common/useToast';
import { ConfirmDialog } from '@/components/common/Modal';

interface UnassignedTabProps {
    selectedAccount: Department;
    allApplications: Application[];
    accountDashboardData: AccountDashboardData | null;
    loadData?: () => Promise<void>;
}

export const UnassignedTab: React.FC<UnassignedTabProps> = ({
    selectedAccount,
    allApplications,
    accountDashboardData,
    loadData
}) => {
    const { success, error } = useToast();
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [selectedLob, setSelectedLob] = useState<Record<string, string>>({});
    const [assigningAppId, setAssigningAppId] = useState<string | null>(null);
    const [confirmAssignApp, setConfirmAssignApp] = useState<Application | null>(null);
    const [incrementHires, setIncrementHires] = useState(true);
    const [selectedQuotaId, setSelectedQuotaId] = useState<string>('');

    const unassignedCandidates = useMemo(() => {
        const targetDeptName = selectedAccount.name.trim().toLowerCase();
        
        return allApplications.filter(a => {
            const appDept = (a.department || '').trim().toLowerCase();
            const finalAcc = (a.pis?.final_account || '').trim().toLowerCase();
            const initAcc = (a.pis?.initial_account_assignment || '').trim().toLowerCase();
            const endorseAcc = (a.endorsement_account || '').trim().toLowerCase();
            
            const belongsToAccount = appDept.includes(targetDeptName) || 
                                   finalAcc.includes(targetDeptName) || 
                                   initAcc.includes(targetDeptName) || 
                                   endorseAcc.includes(targetDeptName);

            if (!belongsToAccount) return false;

            const currentStatus = (a.current_status || '').toUpperCase();
            const finalSpecific = (a.pis?.final_specific_status || '').toUpperCase();
            const overallStatus = (a.pis?.overall_status || '').toUpperCase();
            const remarks = (a.remarks || '').toUpperCase();
            const finalNotes = (a.final_interview_notes || '').toUpperCase();
            const masterStatus = (a.master_status || '').toUpperCase();

            const isAcceptedOffer = currentStatus === 'ACCEPTED OFFER' || 
                                    currentStatus === 'ACCEPTED_OFFER' ||
                                    finalSpecific === 'ACCEPTED OFFER' ||
                                    overallStatus === 'ACCEPTED OFFER' ||
                                    remarks === 'ACCEPTED OFFER' ||
                                    finalNotes === 'ACCEPTED OFFER' ||
                                    masterStatus === 'ACCEPTED OFFER';

            if (!isAcceptedOffer) return false;

            const customLob = (a.pis?.custom_lob || '').trim().toLowerCase();
            const hasLob = !!customLob && customLob !== 'agent';

            return !hasLob;
        });
    }, [allApplications, selectedAccount]);

    const activeLobs = useMemo(() => {
        return accountDashboardData?.openings || [];
    }, [accountDashboardData]);

    const handleAssignLob = async (app: Application) => {
        const lobName = selectedLob[app.id];
        if (!lobName) {
            error('Missing LOB', 'Please select a Line of Business first.');
            return;
        }
        setConfirmAssignApp(app);
        setIncrementHires(true);
        const matching = activeLobs.filter(l => l.name === lobName);
        if (matching.length > 0) {
            setSelectedQuotaId(matching[0].id);
        } else {
            setSelectedQuotaId('');
        }
    };

    const confirmAssign = async () => {
        if (!confirmAssignApp) return;
        const app = confirmAssignApp;
        const lobName = selectedLob[app.id];

        setAssigningAppId(app.id);
        try {
            const patch = {
                metadata: {
                    ...(app.metadata || {}),
                    custom_lob: lobName
                },
                pis: {
                    ...(app.pis || {}),
                    custom_lob: lobName
                }
            };
            
            await ApplicationService.patch(app.id, patch);
            
            if (incrementHires && selectedQuotaId) {
                const targetLob = activeLobs.find(l => l.id === selectedQuotaId);
                if (targetLob) {
                    await PositionService.update(targetLob.id, {
                        manual_hired: (targetLob.manualHired || 0) + 1
                    });
                }
            }
            
            success('LOB Assigned', `${app.applicant_name} has been assigned to ${lobName}`);
            
            if (loadData) {
                await loadData();
            }
        } catch (err) {
            error('Assignment Failed', 'Could not assign the LOB to the candidate.');
        } finally {
            setAssigningAppId(null);
            setConfirmAssignApp(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Users className="text-blue-500" size={16} />
                        Unassigned Candidates
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        These candidates have an accepted offer but lack a specific LOB assignment.
                    </p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-none text-xs font-bold border border-blue-200">
                    {unassignedCandidates.length} Candidates
                </div>
            </div>

            {unassignedCandidates.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-none p-12 text-center">
                    <UserCheck className="mx-auto text-emerald-400 mb-3" size={32} />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">All Caught Up!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        There are currently no candidates for {selectedAccount.name} that are awaiting LOB assignment.
                    </p>
                </div>
            ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-4 py-3">Candidate</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Assign LOB</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {unassignedCandidates.map(app => (
                                <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <button 
                                            onClick={() => setSelectedApplicant(app)}
                                            className="font-semibold text-blue-600 hover:text-blue-800 text-left"
                                        >
                                            {app.applicant_name}
                                        </button>
                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                            {app.id.substring(0, 8)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-none text-[10px] font-bold uppercase tracking-wide">
                                            <CheckCircle2 size={10} />
                                            Confirmed Training
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <select
                                                value={selectedLob[app.id] || ''}
                                                onChange={(e) => setSelectedLob(prev => ({ ...prev, [app.id]: e.target.value }))}
                                                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs px-2 py-1.5 rounded-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300 min-w-[140px]"
                                            >
                                                <option value="" disabled>Select active LOB...</option>
                                                {activeLobs.map(lob => (
                                                    <option key={lob.id} value={lob.name}>
                                                        {lob.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => void handleAssignLob(app)}
                                                disabled={assigningAppId === app.id || !selectedLob[app.id]}
                                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-none text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                                            >
                                                {assigningAppId === app.id ? (
                                                    <Clock size={12} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        Assign <ArrowRight size={12} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedApplicant && (
                <DetailModalPortal
                    applicant={selectedApplicant}
                    onClose={() => setSelectedApplicant(null)}
                    modalTab="application"
                    setModalTab={() => {}}
                    getApplicantStatusRank={() => 0}
                    handlePromote={() => {}}
                    handleGiveGrade={() => {}}
                    handleGiveClientAssessmentGrade={() => {}}
                    handleGiveClientInterviewVerdict={() => {}}
                    assessmentScore=""
                    setAssessmentScore={() => {}}
                    clientAssessmentScore=""
                    setClientAssessmentScore={() => {}}
                    clientInterviewRemarks=""
                    setClientInterviewRemarks={() => {}}
                    finalInterviewNotes=""
                    setFinalInterviewNotes={() => {}}
                    onQueue={() => {}}
                    onRegress={() => {}}
                    validators={{} as any}
                    handleUpdateApplication={async () => true}
                    onWithdraw={() => {}}
                    onDelete={() => {}}
                />
            )}

            <ConfirmDialog
                open={!!confirmAssignApp}
                onClose={() => setConfirmAssignApp(null)}
                onConfirm={confirmAssign}
                title="Confirm Assignment"
                confirmText="Assign Candidate"
                loading={assigningAppId === confirmAssignApp?.id}
            >
                {confirmAssignApp && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            You are about to assign <strong>{confirmAssignApp.applicant_name}</strong> to the <strong>{selectedLob[confirmAssignApp.id]}</strong> Line of Business.
                        </p>
                        <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="mt-1"
                                checked={incrementHires}
                                onChange={e => setIncrementHires(e.target.checked)}
                            />
                            <div className="text-sm text-slate-700 dark:text-slate-300 w-full">
                                <span className="font-bold block mb-1">Increment Active Hires (+1)</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-3">Uncheck this if you have already manually adjusted the hired count for this quota.</span>
                                
                                {incrementHires && (
                                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                                        <span className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wider">Select Target Quota</span>
                                        <select 
                                            value={selectedQuotaId}
                                            onChange={e => setSelectedQuotaId(e.target.value)}
                                            className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none outline-none focus:border-blue-500"
                                        >
                                            {activeLobs.filter(l => l.name === selectedLob[confirmAssignApp.id]).map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {l.hiringQuotaId ? `[${l.hiringQuotaId}] ` : ''}{l.name} {l.trainingStartDate ? `- Class ${new Date(l.trainingStartDate).toLocaleDateString()}` : ''} ({l.hiringType})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                )}
            </ConfirmDialog>
        </div>
    );
};
