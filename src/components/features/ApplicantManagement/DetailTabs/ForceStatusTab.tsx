import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database, FileSpreadsheet, List, UploadCloud, Loader2, CheckCircle2, AlertCircle,
    UserCheck, UserX, Sliders, Save, Building2, User, Maximize2, Minimize2
} from 'lucide-react';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { ApplicationService } from '@/services/ApplicationService';
import { DepartmentService, KNOWN_ACCOUNTS } from '@/services/DepartmentService';
import { UserService } from '@/services/UserService';
import { User as UserType } from '@/types/user';
import { extractRemarks } from '@/components/features/ApplicantManagement/utils/evaluationHelpers';

interface ForceStatusTabProps {
    applicant: Application;
    onUpdate?: (id: string, patch: any) => void;
}

export function ForceStatusTab({ applicant, onUpdate }: ForceStatusTabProps) {
    const [subTab, setSubTab] = useState<'forms' | 'application'>('forms');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Application Sub-Tab State
    const initialStatus = (applicant.ops_validator_status || applicant.overall_status || applicant.current_status || 'PASSED').toUpperCase() === 'FAILED' ? 'FAILED' : 'PASSED';
    const [targetStatus, setTargetStatus] = useState<'PASSED' | 'FAILED'>(initialStatus);

    // Accounts & Validators lists
    const [accounts, setAccounts] = useState<string[]>(KNOWN_ACCOUNTS);
    const [users, setUsers] = useState<UserType[]>([]);

    // Selected values for Application sub-tab
    const initialAssignedAccount = applicant.final_account || applicant.department || (applicant.pis as any)?.initial_account_assignment || KNOWN_ACCOUNTS[0] || '';
    const initialFailedAccounts = applicant.metadata?.failed_accounts || (applicant.pis as any)?.failed_accounts || [];
    const initialFailedAccount = Array.isArray(initialFailedAccounts) && initialFailedAccounts.length > 0 ? initialFailedAccounts[0] : (initialAssignedAccount || KNOWN_ACCOUNTS[0] || '');

    const [selectedAccount, setSelectedAccount] = useState<string>(targetStatus === 'FAILED' ? initialFailedAccount : initialAssignedAccount);
    const [selectedValidatorEmail, setSelectedValidatorEmail] = useState<string>(applicant.ops_validator_email || (applicant.metadata as any)?.ops_validator_email || '');

    // Pre-fill initial remarks so existing notes carry over unless modified
    const getCleanInitialRemarks = (app: Application): string => {
        const raw = app.ops_validator_notes ||
            app.pis?.ops_validator_notes ||
            (app.metadata as any)?.ops_validator_notes ||
            app.final_interview_notes ||
            (app.pis as any)?.notes ||
            (app.metadata as any)?.notes ||
            app.notes ||
            '';
        return extractRemarks(raw);
    };

    const [remarks, setRemarks] = useState<string>(getCleanInitialRemarks(applicant));
    const [isRemarksExpanded, setIsRemarksExpanded] = useState<boolean>(false);

    // Fetch accounts and users on mount
    useEffect(() => {
        let isMounted = true;
        DepartmentService.getAll()
            .then(depts => {
                if (isMounted && depts && depts.length > 0) {
                    const names = Array.from(new Set([...depts.map(d => d.name), ...KNOWN_ACCOUNTS])).filter(Boolean);
                    setAccounts(names);
                }
            })
            .catch(() => { });

        UserService.getAll()
            .then(uList => {
                if (isMounted && uList) {
                    setUsers(uList);
                }
            })
            .catch(() => { });

        return () => { isMounted = false; };
    }, []);

    // Synchronize account state when status changes
    useEffect(() => {
        if (targetStatus === 'FAILED') {
            setSelectedAccount(initialFailedAccount);
        } else {
            setSelectedAccount(initialAssignedAccount);
        }
    }, [targetStatus]);

    // Handle Forms Sync actions
    const handleFormsAction = async (actionId: string) => {
        setLoadingAction(actionId);
        setFeedback(null);
        try {
            let patch: Record<string, any> = {};
            let destinationName = '';

            if (actionId === 'initial_sheet') {
                patch = { master_column: 'SHEET' };
                destinationName = 'Initial Interview Google Sheet';
            } else if (actionId === 'masterlist') {
                patch = { master_column: 'MASTERLIST' };
                destinationName = 'Centralized Masterlist';
            } else if (actionId === 'ACCOUNT_ASSIGNMENT') {
                patch = { master_column: 'ACCOUNT_ASSIGNMENT' };
                destinationName = 'Account Assignment tab';
            }

            await ApplicationService.patch(applicant.id, patch);

            if (onUpdate) {
                onUpdate(applicant.id, patch);
            }

            setFeedback({
                type: 'success',
                message: `Successfully force pushed applicant data to ${destinationName}.`
            });
        } catch (error: any) {
            console.error(`Error during force status sync (${actionId}):`, error);
            setFeedback({
                type: 'error',
                message: error?.message || `Failed to force push status. Please try again.`
            });
        } finally {
            setLoadingAction(null);
        }
    };

    // Handle Application Override Save
    const handleSaveApplicationOverride = async () => {
        setLoadingAction('save_application');
        setFeedback(null);
        try {
            const validatorObj = users.find(u => u.email === selectedValidatorEmail);
            const validatorName = validatorObj ? (validatorObj.full_name || validatorObj.name) : (selectedValidatorEmail || 'System');

            const isPassed = targetStatus === 'PASSED';
            const newStatus = isPassed ? 'PASSED' : 'FAILED';
            const specStatus = isPassed ? 'OV - Passed' : 'OV - Failed';

            let failedAccountsList: string[] = [];
            if (!isPassed) {
                failedAccountsList = Array.from(new Set([
                    ...(applicant.metadata?.failed_accounts || []),
                    ...(applicant.pis?.failed_accounts || []),
                    selectedAccount
                ])).filter(Boolean);
            } else {
                failedAccountsList = (applicant.metadata?.failed_accounts || []).filter(
                    (f: string) => f.toLowerCase() !== selectedAccount.toLowerCase()
                );
            }

            let patch: Record<string, any> = {
                current_status: newStatus,
                overall_status: newStatus,
                ops_validator_status: newStatus,
                final_interview_result: newStatus,
                final_specific_status: specStatus,
                'Specific Status': specStatus,
                'Final Specific Status': specStatus,
                ops_validator_email: selectedValidatorEmail || null,
                active_ops_validator_name: validatorName || null,
                ops_validator_notes: remarks,
                final_interview_notes: remarks,
                failed_accounts: failedAccountsList,
                department: isPassed ? selectedAccount : (applicant.department || selectedAccount),
                final_account: isPassed ? selectedAccount : (applicant.final_account || selectedAccount),
                pis: {
                    ...(applicant.pis || {}),
                    ops_validator_email: selectedValidatorEmail || null,
                    ops_validator_status: newStatus,
                    ops_validator_notes: remarks,
                    final_specific_status: specStatus,
                    'Specific Status': specStatus,
                    'Final Specific Status': specStatus,
                    failed_accounts: failedAccountsList,
                    final_account: isPassed ? selectedAccount : (applicant.pis?.final_account || selectedAccount)
                },
                metadata: {
                    ...(applicant.metadata || {}),
                    ops_validator_email: selectedValidatorEmail || null,
                    ops_validator_status: newStatus,
                    ops_validator_notes: remarks,
                    active_ops_validator_name: validatorName,
                    final_specific_status: specStatus,
                    'Specific Status': specStatus,
                    'Final Specific Status': specStatus,
                    failed_accounts: failedAccountsList,
                    final_account: isPassed ? selectedAccount : (applicant.metadata?.final_account || selectedAccount)
                }
            };

            await ApplicationService.patch(applicant.id, patch);

            try {
                await ApplicationService.updateStatus({
                    id: applicant.id,
                    fromStatus: applicant.current_status || 'OPEN',
                    toStatus: newStatus,
                    changedByName: validatorName,
                    reason: remarks || `Force status update to ${newStatus}`,
                    patch
                });
            } catch (statusErr) {
                console.warn('updateStatus log error:', statusErr);
            }

            if (onUpdate) {
                onUpdate(applicant.id, patch);
            }

            setFeedback({
                type: 'success',
                message: `Successfully updated Ops Validation status to ${newStatus} for ${applicant.applicant_name || 'applicant'}.`
            });
        } catch (error: any) {
            console.error(`Error saving application override:`, error);
            setFeedback({
                type: 'error',
                message: error?.message || `Failed to apply application override. Please try again.`
            });
        } finally {
            setLoadingAction(null);
        }
    };

    const actionButtons = [
        {
            id: 'initial_sheet',
            targetColumn: 'SHEET',
            label: 'Force push initial interview SHEET',
            description: 'Push applicant data to the Initial Interview Google Sheet.',
            icon: <FileSpreadsheet size={16} className="text-emerald-600" />,
            colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ring-emerald-500/20'
        },
        {
            id: 'masterlist',
            targetColumn: 'MASTERLIST',
            label: 'Force push masterlist',
            description: 'Push candidate record to the centralized Masterlist.',
            icon: <List size={16} className="text-blue-600" />,
            colorClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 ring-blue-500/20'
        },
        {
            id: 'ACCOUNT_ASSIGNMENT',
            targetColumn: 'ACCOUNT_ASSIGNMENT',
            label: 'Force push Final results Account Assignment tab',
            description: 'Push final disposition results to the Account Assignment tab.',
            icon: <Database size={16} className="text-indigo-600" />,
            colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 ring-indigo-500/20'
        }
    ];

    return (
        <div className="space-y-6 text-left max-w-xl">
            {/* Header & Sub-Tab Navigation */}
            <div className="space-y-4 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800">
                        <Sliders size={16} className="text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-bold text-slate-900 dark:text-white tracking-tight">Force Status Synchronization</h2>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Manually override application disposition or trigger data pushes to external master records.
                        </p>
                    </div>
                </div>

                {/* Sub-Tab Navigation Bar */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/80 rounded-lg max-w-xs">
                    <button
                        type="button"
                        onClick={() => { setSubTab('forms'); setFeedback(null); }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                            subTab === 'forms'
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-800/60"
                                : "text-slate-600 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50"
                        )}
                    >
                        <FileSpreadsheet size={14} />
                        <span>Forms</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSubTab('application'); setFeedback(null); }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                            subTab === 'application'
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-800/60"
                                : "text-slate-600 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50"
                        )}
                    >
                        <UserCheck size={14} />
                        <span>Application</span>
                    </button>
                </div>
            </div>

            {/* Feedback Alert */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold border",
                            feedback.type === 'success'
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                        )}
                    >
                        {feedback.type === 'success' ? (
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle size={16} className="text-rose-600 shrink-0" />
                        )}
                        <span>{feedback.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Forms Sub-Tab */}
            {subTab === 'forms' && (
                <div className="space-y-3">
                    {actionButtons.map((btn) => {
                        const isCurrentColumn = applicant.master_column === btn.targetColumn;
                        return (
                            <motion.button
                                key={btn.id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleFormsAction(btn.id)}
                                disabled={loadingAction !== null}
                                className={cn(
                                    "w-full flex items-center gap-4 px-5 py-4 rounded-lg border text-left transition-all outline-none relative",
                                    btn.colorClass,
                                    loadingAction === btn.id ? "opacity-90 ring-4 shadow-sm" : "hover:shadow-sm",
                                    loadingAction !== null && loadingAction !== btn.id ? "opacity-50 grayscale pointer-events-none" : ""
                                )}
                            >
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border shrink-0", btn.colorClass.split(' ')[2])}>
                                    {loadingAction === btn.id ? (
                                        <Loader2 size={16} className="animate-spin text-current" />
                                    ) : (
                                        btn.icon
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-[12px] font-bold uppercase tracking-wider truncate">
                                            {btn.label}
                                        </h3>
                                        {isCurrentColumn && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase bg-slate-900 text-white rounded">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10.5px] font-medium opacity-80 leading-relaxed truncate">
                                        {btn.description}
                                    </p>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            )}

            {/* Application Sub-Tab */}
            {subTab === 'application' && (
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/80 rounded-lg p-5 space-y-5">
                    {/* Status Switcher */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                            Ops Validation Status
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setTargetStatus('PASSED')}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border text-xs font-bold transition-all",
                                    targetStatus === 'PASSED'
                                        ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 hover:text-emerald-700"
                                )}
                            >
                                <UserCheck size={16} />
                                <span>PASSED</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetStatus('FAILED')}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border text-xs font-bold transition-all",
                                    targetStatus === 'FAILED'
                                        ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-rose-50 hover:text-rose-700"
                                )}
                            >
                                <UserX size={16} />
                                <span>FAILED</span>
                            </button>
                        </div>
                    </div>

                    {/* Account Selection */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-500 dark:text-slate-400" />
                            <span>{targetStatus === 'FAILED' ? 'Failed Account' : 'Assigned Account'}</span>
                        </label>
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">-- Select Account --</option>
                            {accounts.map(acc => (
                                <option key={acc} value={acc}>{acc}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {targetStatus === 'FAILED'
                                ? 'Select the account for which this candidate failed validation.'
                                : 'Select the target account assigned to this candidate.'}
                        </p>
                    </div>

                    {/* Ops Validator Selection */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <User size={13} className="text-slate-500 dark:text-slate-400" />
                            <span>Assigned Ops Validator</span>
                        </label>
                        <select
                            value={selectedValidatorEmail}
                            onChange={(e) => setSelectedValidatorEmail(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">-- Unassigned --</option>
                            {users.map(u => (
                                <option key={u.id || u.email} value={u.email}>
                                    {u.full_name || u.name || u.email} ({u.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Remarks / Interviewer Notes (Expandable) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Interviewer Remarks / Ops Val Notes
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsRemarksExpanded(!isRemarksExpanded)}
                                className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                            >
                                {isRemarksExpanded ? (
                                    <>
                                        <Minimize2 size={12} />
                                        <span>Collapse</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 size={12} />
                                        <span>Expand</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <textarea
                            rows={isRemarksExpanded ? 10 : 4}
                            value={remarks}
                            onClick={() => setIsRemarksExpanded(true)}
                            onFocus={() => setIsRemarksExpanded(true)}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Enter interviewer feedback, evaluation notes, or failure reasons..."
                            className={cn(
                                "w-full px-3 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-300",
                                isRemarksExpanded ? "min-h-[220px] shadow-md" : "min-h-[90px]"
                            )}
                        />
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleSaveApplicationOverride}
                            disabled={loadingAction !== null}
                            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-wider rounded-md shadow transition-all cursor-pointer disabled:opacity-50"
                        >
                            {loadingAction === 'save_application' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            <span>Apply Force Update</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
