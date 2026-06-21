import { useState, useCallback } from 'react';
import type { Application } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';
import { buildReprofileQueue, splitReprofileAccounts } from '@/utils/reprofileQueue';

const cleanAccountValue = (val: any): string => {
    if (!val) return '';
    const s = String(val).trim();
    if (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
    return s.split(/[|,]/)
        .map(p => p.trim())
        .filter(p => p && p.toLowerCase() !== 'null' && p.toLowerCase() !== 'undefined')
        .join(' | ');
};

interface ReprofileProps {
    user: any;
    setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
    setLocalChanges: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>>>>;
    success: (title: string, message: string) => void;
    error: (title: string, message: string) => void;
    loadData: () => Promise<void>;
}

export function useInterviewReprofile({
    user,
    setApplications,
    setLocalChanges,
    success,
    error,
    loadData
}: ReprofileProps) {
    const [pendingReprofile, setPendingReprofile] = useState<{
        app: Application;
        previousAccount: string;
        newAccount: string;
    } | null>(null);

    const appendReprofileLocalChanges = useCallback((
        app: Application,
        previousAccount: string,
        newAccount: string,
        selectedActiveAccount?: string
    ) => {
        const existingHistory = app.pis?.reprofile_history || app.metadata?.reprofile_history || [];
        const accounts = splitReprofileAccounts(newAccount);
        const activeAccount = selectedActiveAccount || accounts[0] || newAccount;
        const waitingAccounts = accounts.filter(account => account.toLowerCase() !== activeAccount.toLowerCase());
        const reprofileQueue = buildReprofileQueue(accounts, activeAccount);
        
        const prevValidatorName = app.assigned_ops_validator_name || app.pis?.last_updated_by || '';
        const prevValidatorEmail = app.pis?.ops_validator_email || '';
        const prevValidatorStatus = app.pis?.ops_validator_status || '';
        const prevValidatorNotes = app.pis?.ops_validator_notes || '';

        const entry = {
            previous_account: previousAccount || 'Unassigned',
            new_account: activeAccount,
            accounts,
            active_account: activeAccount,
            waiting_accounts: waitingAccounts,
            changed_at: new Date().toISOString(),
            changed_by: user?.full_name || 'Recruiter',
            status: 'MOVED_TO_REPROFILE',
            previous_ops_validator_name: prevValidatorName,
            previous_ops_validator_email: prevValidatorEmail,
            previous_ops_validator_status: prevValidatorStatus,
            previous_ops_validator_notes: prevValidatorNotes
        };

        setLocalChanges(prev => {
            const current = prev[app.id] || {};
            
            const failedAccounts = app.metadata?.failed_accounts || [];
            const combinedDepts = [...failedAccounts];
            for (const acc of accounts) {
                if (!combinedDepts.some(c => c.toLowerCase() === acc.toLowerCase())) {
                    combinedDepts.push(acc);
                }
            }
            const finalDept = combinedDepts.join(', ');

            return {
                ...prev,
                [app.id]: {
                    ...current,
                    pis_initial_account_assignment: newAccount,
                    department: finalDept,
                    current_status: 'FINAL_INTERVIEW',
                    endorsement_meeting_date: null,
                    endorsement_meeting_end_date: null,
                    endorsement_meeting_body: '',
                    assigned_ops_validator_id: null,
                    assigned_ops_validator_name: '',
                    recruiter_s_scheduling_status: 'PENDING',
                    pis_reprofile_history: [...existingHistory, entry],
                    pis_final_specific_status: 'OV - Pending',
                    pis_ops_validator_email: '',
                    pis_ops_validator_status: 'Pending',
                    pis_ops_validator_notes: '',
                    metadata: {
                        ...(app.metadata || {}),
                        is_reprofiled: true,
                        reprofile_accounts: reprofileQueue,
                        reprofile_active_account: activeAccount,
                        ops_validator_email: '',
                        ops_validator_status: 'Pending',
                        ops_validator_notes: '',
                        final_specific_status: 'OV - Pending'
                    }
                }
            };
        });
    }, [user?.full_name, setLocalChanges]);

    const confirmReprofile = useCallback(async (activeAccount?: string) => {
        if (!pendingReprofile) return;
        appendReprofileLocalChanges(
            pendingReprofile.app,
            pendingReprofile.previousAccount,
            pendingReprofile.newAccount,
            activeAccount
        );
        const accounts = splitReprofileAccounts(pendingReprofile.newAccount);
        const selectedActiveAccount = activeAccount || accounts[0] || pendingReprofile.newAccount;
        const waitingCount = accounts.filter(account => account.toLowerCase() !== selectedActiveAccount.toLowerCase()).length;
        const existingHistory = pendingReprofile.app.pis?.reprofile_history || pendingReprofile.app.metadata?.reprofile_history || [];
        const waitingAccounts = accounts.filter(account => account.toLowerCase() !== selectedActiveAccount.toLowerCase());
        const reprofileQueue = buildReprofileQueue(accounts, selectedActiveAccount);
        
        const prevValidatorName = pendingReprofile.app.assigned_ops_validator_name || pendingReprofile.app.pis?.last_updated_by || '';
        const prevValidatorEmail = pendingReprofile.app.pis?.ops_validator_email || '';
        const prevValidatorStatus = pendingReprofile.app.pis?.ops_validator_status || '';
        const prevValidatorNotes = pendingReprofile.app.pis?.ops_validator_notes || '';

        const entry = {
            previous_account: pendingReprofile.previousAccount || 'Unassigned',
            new_account: selectedActiveAccount,
            accounts,
            active_account: selectedActiveAccount,
            waiting_accounts: waitingAccounts,
            changed_at: new Date().toISOString(),
            changed_by: user?.full_name || 'Recruiter',
            status: 'MOVED_TO_REPROFILE',
            previous_ops_validator_name: prevValidatorName,
            previous_ops_validator_email: prevValidatorEmail,
            previous_ops_validator_status: prevValidatorStatus,
            previous_ops_validator_notes: prevValidatorNotes
        };
        const failedAccounts = pendingReprofile.app.metadata?.failed_accounts || [];
        const combinedDepts = [...failedAccounts];
        for (const acc of accounts) {
            if (!combinedDepts.some(c => c.toLowerCase() === acc.toLowerCase())) {
                combinedDepts.push(acc);
            }
        }
        const finalDept = combinedDepts.join(', ');

        const metadata = {
            ...(pendingReprofile.app.metadata || pendingReprofile.app.pis || {}),
            initial_account_assignment: pendingReprofile.newAccount,
            reprofile_history: [...existingHistory, entry],
            is_reprofiled: true,
            reprofile_accounts: reprofileQueue,
            reprofile_active_account: selectedActiveAccount,
            ops_validator_email: '',
            ops_validator_status: 'Pending',
            ops_validator_notes: '',
            final_specific_status: 'OV - Pending',
            endorsement_confirmed: false
        };

        try {
            await ApplicationService.patch(pendingReprofile.app.id, {
                department: finalDept,
                current_status: 'FINAL_INTERVIEW',
                endorsement_meeting_date: null as any,
                endorsement_meeting_end_date: null as any,
                endorsement_meeting_body: '',
                assigned_ops_validator_id: null as any,
                assigned_ops_validator_name: '',
                recruiter_s_scheduling_status: 'PENDING',
                metadata,
                pis: {
                    ...(pendingReprofile.app.pis || {}),
                    initial_account_assignment: pendingReprofile.newAccount,
                    final_specific_status: 'OV - Pending',
                    ops_validator_email: '',
                    ops_validator_status: 'Pending',
                    ops_validator_notes: ''
                }
            });
            setApplications(prev => prev.map(app => {
                if (app.id !== pendingReprofile.app.id) return app;
                const cleanedPis = { ...(app.pis || {}) };
                delete (cleanedPis as any).reprofile_accounts;
                delete (cleanedPis as any).reprofile_active_account;
                delete (cleanedPis as any).reprofile_history;
                delete (cleanedPis as any).is_reprofiled;
                return {
                    ...app,
                    department: finalDept,
                    current_status: 'FINAL_INTERVIEW',
                    endorsement_meeting_date: null as any,
                    endorsement_meeting_end_date: null as any,
                    endorsement_meeting_body: '',
                    assigned_ops_validator_id: null as any,
                    assigned_ops_validator_name: '',
                    recruiter_s_scheduling_status: 'PENDING',
                    metadata: metadata as Record<string, any>,
                    pis: {
                        ...cleanedPis,
                        initial_account_assignment: pendingReprofile.newAccount,
                        final_specific_status: 'OV - Pending',
                        ops_validator_email: '',
                        ops_validator_status: 'Pending',
                        ops_validator_notes: ''
                    } as any
                };
            }));
            setLocalChanges(prev => {
                const next = { ...prev };
                delete next[pendingReprofile.app.id];
                return next;
            });
            success(
                'Moved to Reprofile',
                `${pendingReprofile.app.applicant_name} is active for ${selectedActiveAccount}${waitingCount ? ` with ${waitingCount} waiting account${waitingCount > 1 ? 's' : ''}` : ''}.`
            );
            setPendingReprofile(null);
            loadData();
        } catch (err) {
            console.error('Failed to persist reprofile move:', err);
            error('Reprofile Error', 'Failed to move candidate to the Reprofile tab.');
        }
    }, [appendReprofileLocalChanges, error, loadData, pendingReprofile, success, user?.full_name, setApplications, setLocalChanges]);

    const cancelReprofile = useCallback(() => {
        if (pendingReprofile) {
            setLocalChanges(prev => ({
                ...prev,
                [pendingReprofile.app.id]: {
                    ...(prev[pendingReprofile.app.id] || {}),
                    pis_initial_account_assignment: pendingReprofile.previousAccount
                }
            }));
        }
        setPendingReprofile(null);
    }, [pendingReprofile, setLocalChanges]);

    return {
        pendingReprofile,
        setPendingReprofile,
        appendReprofileLocalChanges,
        confirmReprofile,
        cancelReprofile
    };
}
