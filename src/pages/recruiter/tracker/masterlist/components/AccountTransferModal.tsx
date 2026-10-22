import React, { useState, useEffect } from 'react';
import { Building2, UserCheck, MessageSquare, Hash, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { UserService } from '@/services/UserService';
import { PositionService } from '@/services/PositionService';
import type { Application } from '@/types/application';

interface AccountTransferModalProps {
    open: boolean;
    app: Application | null;
    targetAccount: string;
    onClose: () => void;
    onConfirm: (transferData: {
        targetAccount: string;
        opsValidatorId?: string | null;
        opsValidatorName?: string | null;
        opsRemarks?: string | null;
        hiringRequestId?: string | null;
        positionId?: string | null;
        positionTitle?: string | null;
        jobPosition?: string | null;
    }) => void;
    isSyncing?: boolean;
}

export function AccountTransferModal({ open, app, targetAccount, onClose, onConfirm, isSyncing }: AccountTransferModalProps) {
    const [opsValidators, setOpsValidators] = useState<any[]>([]);
    const [loadingValidators, setLoadingValidators] = useState(false);
    
    const [positions, setPositions] = useState<any[]>([]);
    const [loadingPositions, setLoadingPositions] = useState(false);
    
    // Optional form state
    const [selectedValidatorId, setSelectedValidatorId] = useState<string>('AUTO_RESET');
    const [customRemarks, setCustomRemarks] = useState<string>('Pending Ops Validation');
    const [selectedPositionId, setSelectedPositionId] = useState<string>('');

    const currentAccount = app?.department || app?.endorsement_account || app?.pis?.final_account || 'Unassigned';

    useEffect(() => {
        if (open) {
            setSelectedValidatorId('AUTO_RESET');
            setCustomRemarks('Pending Ops Validation');
            setSelectedPositionId('');
            
            // Load available Ops Validators belonging strictly to targetAccount
            setLoadingValidators(true);
            UserService.getAll()
                .then(users => {
                    const normTarget = (targetAccount || '').trim().toLowerCase();
                    const validators = (users || []).filter((u: any) => {
                        if (u.is_active === false) return false;
                        
                        const isOpsVal = u.role === 'ops_validator' || (u.role && String(u.role).includes('validator'));
                        if (!isOpsVal) return false;

                        if (!normTarget) return true;

                        const userDepts = String(u.department || u.account || '')
                            .split(/[,|]/)
                            .map((d: string) => d.trim().toLowerCase())
                            .filter(Boolean);

                        return userDepts.some((dept: string) => 
                            dept === normTarget || 
                            normTarget.includes(dept) || 
                            dept.includes(normTarget)
                        );
                    });
                    setOpsValidators(validators);
                })
                .catch(err => {
                    console.error('Failed to load Ops Validators:', err);
                })
                .finally(() => {
                    setLoadingValidators(false);
                });

            // Load available LOBs (Job Positions) belonging strictly to targetAccount from cached_departments
            setLoadingPositions(true);
            setTimeout(() => {
                try {
                    const deptsStr = localStorage.getItem('cached_departments');
                    if (deptsStr) {
                        const allDepts = JSON.parse(deptsStr);
                        const matchedDept = allDepts.find((d: any) => d.name.trim().toLowerCase() === (targetAccount || '').trim().toLowerCase());
                        const dynamicLobs = new Set<string>();
                        if (matchedDept) {
                            let subAccs = matchedDept.subAccounts || matchedDept.sub_accounts;
                            if (typeof subAccs === 'string') {
                                try { subAccs = JSON.parse(subAccs); } catch {}
                            }
                            if (Array.isArray(subAccs)) {
                                subAccs.forEach((sa: any) => {
                                    if (sa.name) {
                                        let name = sa.name.trim();
                                        if (name.toUpperCase() === 'BDR' || name.toUpperCase() === 'AGENT BDR') name = 'AGENT - BDR';
                                        if (name.toUpperCase() === 'DIA' || name.toUpperCase() === 'AGENT DIA') name = 'AGENT - DIA';
                                        dynamicLobs.add(name);
                                    }
                                });
                            }
                        }
                        setPositions(Array.from(dynamicLobs).map(name => ({ id: name, title: name })));
                    } else {
                        setPositions([]);
                    }
                } catch (e) {
                    console.error('Failed to parse cached departments', e);
                    setPositions([]);
                } finally {
                    setLoadingPositions(false);
                }
            }, 0);
        }
    }, [open, targetAccount]);

    if (!open || !app) return null;

    const handleConfirm = () => {
        let valId: string | null = null;
        let valName: string | null = null;

        if (selectedValidatorId && selectedValidatorId !== 'AUTO_RESET') {
            const found = opsValidators.find(u => u.id === selectedValidatorId);
            if (found) {
                valId = found.id;
                valName = found.full_name || found.name;
            }
        }

        let posId: string | null = null;
        let posTitle: string | null = null;
        let hiringReqId: string | null = null;

        if (selectedPositionId) {
            const foundPos = positions.find(p => p.id === selectedPositionId);
            if (foundPos) {
                posId = foundPos.id;
                posTitle = foundPos.title;
                hiringReqId = foundPos.hiring_request_id || foundPos.hiring_quota_id || null;
            }
        }

        onConfirm({
            targetAccount,
            opsValidatorId: valId,
            opsValidatorName: valName,
            opsRemarks: customRemarks.trim() || 'Pending Ops Validation',
            hiringRequestId: null,
            positionId: null,
            positionTitle: null,
            jobPosition: selectedPositionId || posTitle || null
        });
    };

    return (
        <Modal 
            open={open} 
            onClose={onClose} 
            title={
                <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-sm uppercase tracking-wider">
                    <div className="w-7 h-7 bg-slate-900 text-white flex items-center justify-center rounded-none shadow-xs shrink-0">
                        <Building2 size={15} />
                    </div>
                    <span>Account Transfer & Operations Validation</span>
                </div>
            }
            size="lg"
            className="!rounded-none border-2 border-slate-900 shadow-2xl overflow-hidden"
            headerClassName="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/90 px-6 py-4"
        >
            <div className="p-6 flex flex-col gap-6 text-left bg-white dark:bg-slate-900">
                {/* Executive Candidate Transfer Banner Card */}
                <div className="bg-slate-900 text-white border-2 border-slate-900 rounded-none p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none inline-block"></span>
                            Candidate Transfer Target
                        </span>
                        <h3 className="text-base font-black tracking-tight text-white truncate">
                            {app.applicant_name}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2.5 bg-slate-800/90 px-3.5 py-2 border border-slate-700 rounded-none shrink-0">
                        <div className="flex flex-col text-right">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Current</span>
                            <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{currentAccount}</span>
                        </div>
                        <ArrowRight size={15} className="text-emerald-400 shrink-0" />
                        <div className="flex flex-col text-left">
                            <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">New Target</span>
                            <span className="text-xs font-black text-white bg-emerald-600 px-2 py-0.5 rounded-none border border-emerald-400 uppercase tracking-wider truncate max-w-[130px]">
                                {targetAccount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Options */}
                <div className="flex flex-col gap-5">
                    {/* Operations Validator (Optional) */}
                    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-none">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <UserCheck size={15} className="text-purple-600" />
                                Assigned Operations Validator
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase bg-slate-200/80 px-2 py-0.5 rounded-none">Optional</span>
                        </label>
                        <select
                            value={selectedValidatorId}
                            onChange={(e) => setSelectedValidatorId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-slate-900 rounded-none px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none transition-all"
                        >
                            <option value="AUTO_RESET">-- Reset / Leave Unassigned (Recommended) --</option>
                            {loadingValidators ? (
                                <option disabled>Loading Ops Validators for {targetAccount}...</option>
                            ) : opsValidators.length === 0 ? (
                                <option disabled>No Operations Validators assigned to {targetAccount}</option>
                            ) : (
                                opsValidators.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.full_name || v.name} {v.department ? `(${v.department})` : ''}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                            Filter target: Showing only Operations Validators assigned to <strong className="text-slate-900 dark:text-white font-bold">{targetAccount}</strong>.
                        </p>
                    </div>

                    {/* Operations Validation Remarks (Optional) */}
                    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-none">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <MessageSquare size={15} className="text-blue-600" />
                                Operations Validation Remarks
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase bg-slate-200/80 px-2 py-0.5 rounded-none">Optional</span>
                        </label>
                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="Enter custom remarks..."
                                value={customRemarks}
                                onChange={(e) => setCustomRemarks(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-slate-900 rounded-none px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none transition-all"
                            />
                        </div>
                        <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                            Note: Previous account validation remarks will be automatically archived into candidate activity history.
                        </p>
                    </div>

                    {/* Job Position (Optional) */}
                    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-none">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Hash size={15} className="text-emerald-600" />
                                Job Position
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase bg-slate-200/80 px-2 py-0.5 rounded-none">Optional</span>
                        </label>
                        <select
                            value={selectedPositionId}
                            onChange={(e) => setSelectedPositionId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-slate-900 rounded-none px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none transition-all"
                        >
                            <option value="">-- Select Job Position --</option>
                            {loadingPositions ? (
                                <option disabled>Loading Positions for {targetAccount}...</option>
                            ) : positions.length === 0 ? (
                                <option disabled>No positions found for {targetAccount}</option>
                            ) : (
                                positions.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} {p.hiring_request_id ? `(Req ID: ${p.hiring_request_id})` : ''}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-col border-t-2 border-slate-200 dark:border-slate-800">
                    {isSyncing && (
                        <div className="w-full h-1 bg-slate-200 overflow-hidden relative">
                            <div className="absolute top-0 bottom-0 left-0 bg-emerald-500 w-1/2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" style={{ transform: 'translateX(50%)' }} />
                        </div>
                    )}
                    <div className="flex justify-end items-center gap-3 p-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSyncing}
                            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isSyncing}
                            className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-black border border-slate-900 rounded-none shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSyncing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Transferring...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    <span>Confirm Transfer</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
