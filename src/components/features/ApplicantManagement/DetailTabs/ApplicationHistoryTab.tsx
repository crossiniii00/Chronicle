import React, { useState, useMemo } from 'react';
import {
    History, ArrowRightLeft, ShieldAlert, UserX, LogOut, Trophy,
    Calendar, User as UserIcon, Mail, Building2, CheckCircle2,
    XCircle, Clock, AlertCircle, FileText, Filter, ChevronRight
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application, PersonalInfoSheet } from '@/types/application';
import { extractRemarks } from '../utils/evaluationHelpers';

interface ApplicationHistoryTabProps {
    applicant: Application;
    pis?: Partial<PersonalInfoSheet>;
}

type HistoryCategory = 'ALL' | 'REPROFILE' | 'BLACKLIST' | 'NO_SHOW' | 'WITHDRAWN' | 'ONBOARDING';

interface HistoryEvent {
    id: string;
    category: HistoryCategory;
    title: string;
    account?: string;
    status: string;
    statusType: 'success' | 'danger' | 'warning' | 'info' | 'slate';
    date?: string;
    actorName?: string;
    actorEmail?: string;
    reason?: string;
    notes?: string;
    details?: Record<string, any>;
}

export const ApplicationHistoryTab: React.FC<ApplicationHistoryTabProps> = ({ applicant, pis }) => {
    const [selectedCategory, setSelectedCategory] = useState<HistoryCategory>('ALL');

    const historyEvents = useMemo(() => {
        const events: HistoryEvent[] = [];
        const appMeta = applicant.metadata || {};
        const appPis = applicant.pis || pis || {};

        // 1. Reprofile History
        const reprofileList = appMeta.reprofile_history || (appPis as any).reprofile_history || (appPis as any).reprofile_accounts || [];
        const failedAccountsList: string[] = Array.from(new Set([
            ...(appMeta.failed_accounts || []),
            ...((appPis as any).failed_accounts || []),
            ...((applicant as any).failed_accounts || [])
        ].filter(Boolean)));

        const initialAssignments = String((appPis as any).initial_account_assignment || appMeta.initial_account_assignment || (applicant as any).initial_account_assignment || '')
            .split(/[,|]/)
            .map(s => s.trim())
            .filter(Boolean);

        const currentFinalAccount = applicant.department || (appPis as any).final_account || appMeta.final_account || '';

        if (Array.isArray(reprofileList) && reprofileList.length > 0) {
            reprofileList.forEach((entry: any, index: number) => {
                const acc = entry.previous_account || entry.account || 'Previous Account';
                const statusStr = (entry.previous_ops_validator_status || entry.status || 'REPROFILED').toUpperCase();
                const isPassed = statusStr.includes('PASS');
                const isFailed = statusStr.includes('FAIL');

                events.push({
                    id: `reprofile-${index}`,
                    category: 'REPROFILE',
                    title: `Reprofiled from ${acc}`,
                    account: acc,
                    status: isPassed ? 'Reprofiled (Passed)' : isFailed ? 'Reprofiled (Failed)' : 'Reprofiled',
                    statusType: isPassed ? 'info' : isFailed ? 'warning' : 'slate',
                    date: entry.changed_at || entry.date || applicant.updated_at,
                    actorName: entry.previous_ops_validator_name || applicant.assigned_ops_validator_name || 'Ops Validator',
                    actorEmail: entry.previous_ops_validator_email,
                    notes: entry.previous_ops_validator_notes || entry.notes || `Candidate was reprofiled from ${acc} to ${currentFinalAccount || 'new account'}.`,
                    details: {
                        'Previous Account': acc,
                        'Verdict': entry.previous_ops_validator_status || 'Moved to Reprofile'
                    }
                });
            });
        } else {
            // Fallback: Synthesize from failed_accounts and initial_account_assignment
            if (failedAccountsList.length > 0) {
                failedAccountsList.forEach((acc, index) => {
                    events.push({
                        id: `reprofile-failed-${index}`,
                        category: 'REPROFILE',
                        title: `Reprofiled from ${acc}`,
                        account: acc,
                        status: 'Reprofiled (Failed)',
                        statusType: 'warning',
                        date: applicant.updated_at,
                        actorName: applicant.assigned_ops_validator_name || (appPis as any).interviewer_name || 'Ops Validator',
                        notes: (appPis as any).ops_validator_notes || applicant.final_interview_notes || `Evaluated for ${acc} (Did not pass). Reprofiled to ${currentFinalAccount || 'new account'}.`,
                        details: {
                            'Previous Account': acc,
                            'Verdict': 'FAILED'
                        }
                    });
                });
            }

            if (initialAssignments.length > 1) {
                initialAssignments.forEach((acc, index) => {
                    if (acc.toLowerCase() !== currentFinalAccount.toLowerCase() && !failedAccountsList.some(fa => fa.toLowerCase() === acc.toLowerCase())) {
                        events.push({
                            id: `reprofile-init-${index}`,
                            category: 'REPROFILE',
                            title: `Reprofiled / Endorsed from ${acc}`,
                            account: acc,
                            status: 'Reprofiled',
                            statusType: 'info',
                            date: applicant.created_at || applicant.updated_at,
                            actorName: applicant.assigned_ops_validator_name || (appPis as any).interviewer_name || 'Recruiter',
                            notes: `Candidate initially assigned/endorsed for ${acc} before reprofiling to ${currentFinalAccount}.`,
                            details: {
                                'Initial Assignment': acc,
                                'Target Account': currentFinalAccount
                            }
                        });
                    }
                });
            }
        }

        // 2. Blacklist History
        const isBlacklisted = (applicant as any).is_blacklisted || applicant.current_status === 'NOT_ELIGIBLE_FOR_REHIRE' || appMeta.is_blacklisted || (appPis as any).is_blacklisted;
        const blacklistList = appMeta.blacklist_history || (appPis as any).blacklist_history || [];
        if (Array.isArray(blacklistList) && blacklistList.length > 0) {
            blacklistList.forEach((entry: any, index: number) => {
                events.push({
                    id: `blacklist-${index}`,
                    category: 'BLACKLIST',
                    title: 'Blacklist Record Added',
                    status: 'Ineligible for Rehire',
                    statusType: 'danger',
                    date: entry.date || entry.created_at || applicant.updated_at,
                    actorName: entry.blacklisted_by || appMeta.blacklisted_by || 'System Administrator',
                    reason: entry.reason || appMeta.blacklist_reason || (appPis as any).blacklist_reason || 'Marked as ineligible for future hiring.',
                    notes: entry.notes || appMeta.blacklist_notes
                });
            });
        } else if (isBlacklisted) {
            events.push({
                id: 'blacklist-primary',
                category: 'BLACKLIST',
                title: 'Candidate Blacklisted',
                status: 'Ineligible for Rehire',
                statusType: 'danger',
                date: appMeta.blacklisted_at || applicant.updated_at,
                actorName: appMeta.blacklisted_by || 'Compliance / HR',
                reason: appMeta.blacklist_reason || (appPis as any).blacklist_reason || 'Flagged as Ineligible for Rehire in System.',
                notes: 'Candidate is barred from active recruitment pipelines.'
            });
        }

        // 3. No Show History
        const noShowList = appMeta.no_show_history || (appPis as any).no_show_history || [];
        const isCurrentNoShow = ['NO_SHOW', 'NO SHOW'].includes(applicant.current_status || '');
        if (Array.isArray(noShowList) && noShowList.length > 0) {
            noShowList.forEach((entry: any, index: number) => {
                events.push({
                    id: `noshow-${index}`,
                    category: 'NO_SHOW',
                    title: `No Show - ${entry.stage || 'Ops Validation'}`,
                    status: `No Show (${entry.category || 'Noncompliant'})`,
                    statusType: 'warning',
                    date: entry.date || entry.created_at || applicant.updated_at,
                    actorName: entry.recorded_by || applicant.assigned_ops_validator_name,
                    notes: entry.notes || (appPis as any).ops_validator_notes || 'Candidate missed scheduled interview session.'
                });
            });
        } else if (isCurrentNoShow) {
            events.push({
                id: 'noshow-primary',
                category: 'NO_SHOW',
                title: 'No Show Event Recorded',
                status: `No Show (${appMeta.no_show_category || 'Flagged'})`,
                statusType: 'warning',
                date: applicant.updated_at || applicant.endorsement_meeting_date,
                actorName: applicant.assigned_ops_validator_name || 'Ops Validator',
                notes: (appPis as any).ops_validator_notes || applicant.final_interview_notes || 'Candidate did not show up for scheduled final evaluation.'
            });
        }

        // 4. Withdrawn History
        const withdrawnList = appMeta.withdrawn_history || (appPis as any).withdrawn_history || [];
        const isCurrentWithdrawn = applicant.current_status === 'WITHDRAWN';
        if (Array.isArray(withdrawnList) && withdrawnList.length > 0) {
            withdrawnList.forEach((entry: any, index: number) => {
                events.push({
                    id: `withdrawn-${index}`,
                    category: 'WITHDRAWN',
                    title: 'Application Withdrawn',
                    status: 'Withdrawn',
                    statusType: 'slate',
                    date: entry.date || entry.created_at || applicant.updated_at,
                    reason: entry.reason || appMeta.withdrawal_reason || 'Applicant voluntarily withdrew from process.',
                    notes: entry.notes
                });
            });
        } else if (isCurrentWithdrawn) {
            events.push({
                id: 'withdrawn-primary',
                category: 'WITHDRAWN',
                title: 'Candidate Withdrew Application',
                status: 'Withdrawn',
                statusType: 'slate',
                date: applicant.updated_at,
                reason: appMeta.withdrawal_reason || (appPis as any).withdrawal_reason || applicant.rejection_reason || 'Candidate requested withdrawal from hiring pipeline.',
                notes: 'Application cancelled per candidate request.'
            });
        }

        // 5. Onboarding Winners / PAN History
        const onboardingList = appMeta.onboarding_history || appMeta.pan_history || (appPis as any).pan_history || [];
        const isOnboarded = ['CONFIRMED_TRAINING', 'CONFIRMED TRAINING', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'HIRED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(applicant.current_status || '');
        if (Array.isArray(onboardingList) && onboardingList.length > 0) {
            onboardingList.forEach((entry: any, index: number) => {
                events.push({
                    id: `onboarding-${index}`,
                    category: 'ONBOARDING',
                    title: `Onboarding & PAN - ${entry.account || applicant.department || 'Hired Role'}`,
                    account: entry.account || applicant.department,
                    status: entry.status || 'Confirmed Training',
                    statusType: 'success',
                    date: entry.date || appMeta.pan_completed_at || applicant.updated_at,
                    actorName: entry.confirmed_by || applicant.assigned_recruiter_name,
                    notes: entry.notes || 'Onboarding winner confirmed for training deployment.'
                });
            });
        } else if (isOnboarded) {
            events.push({
                id: 'onboarding-primary',
                category: 'ONBOARDING',
                title: `Onboarding Winner - ${applicant.department || 'Target Account'}`,
                account: applicant.department,
                status: applicant.current_status?.replace(/_/g, ' ') || 'Confirmed Training',
                statusType: 'success',
                date: appMeta.pan_completed_at || appMeta.date_hired || applicant.updated_at,
                actorName: applicant.assigned_recruiter_name || 'Recruitment Team',
                notes: 'Candidate successfully placed and cleared for onboarding training class.'
            });
        }

        // Sort all events descending by date
        return events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [applicant, pis]);

    const counts = useMemo(() => {
        return {
            ALL: historyEvents.length,
            REPROFILE: historyEvents.filter(e => e.category === 'REPROFILE').length,
            BLACKLIST: historyEvents.filter(e => e.category === 'BLACKLIST').length,
            NO_SHOW: historyEvents.filter(e => e.category === 'NO_SHOW').length,
            WITHDRAWN: historyEvents.filter(e => e.category === 'WITHDRAWN').length,
            ONBOARDING: historyEvents.filter(e => e.category === 'ONBOARDING').length,
        };
    }, [historyEvents]);

    const filteredEvents = useMemo(() => {
        if (selectedCategory === 'ALL') return historyEvents;
        return historyEvents.filter(e => e.category === selectedCategory);
    }, [historyEvents, selectedCategory]);

    const getCategoryBadge = (cat: HistoryCategory) => {
        switch (cat) {
            case 'REPROFILE':
                return { label: 'Reprofile History', icon: ArrowRightLeft, color: 'text-teal-700 bg-teal-50 border-teal-200' };
            case 'BLACKLIST':
                return { label: 'Blacklist History', icon: ShieldAlert, color: 'text-rose-700 bg-rose-50 border-rose-200' };
            case 'NO_SHOW':
                return { label: 'No Show History', icon: UserX, color: 'text-amber-700 bg-amber-50 border-amber-200' };
            case 'WITHDRAWN':
                return { label: 'Withdrawn History', icon: LogOut, color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800' };
            case 'ONBOARDING':
                return { label: 'Onboarding Winners History', icon: Trophy, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
            default:
                return { label: 'General Record', icon: History, color: 'text-blue-700 bg-blue-50 border-blue-200' };
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-6 px-4 space-y-6 text-left font-sans text-slate-800 dark:text-slate-200">
            {/* Top Summary Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 -mr-16 -mt-16 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                            <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-300">
                                <History size={20} />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight uppercase">Application History & Audit Log</h2>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">
                            Comprehensive record of reprofiles, blacklist entries, no-show logs, withdrawals, and onboarding winners.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 dark:bg-slate-900/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-center">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Total Events</p>
                            <p className="text-xl font-black text-white mt-0.5">{counts.ALL}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none border-b border-slate-200 dark:border-slate-800">
                {[
                    { id: 'ALL', label: 'All History', count: counts.ALL, icon: History },
                    { id: 'REPROFILE', label: 'Reprofile History', count: counts.REPROFILE, icon: ArrowRightLeft },
                    { id: 'BLACKLIST', label: 'Blacklist History', count: counts.BLACKLIST, icon: ShieldAlert },
                    { id: 'NO_SHOW', label: 'No Show History', count: counts.NO_SHOW, icon: UserX },
                    { id: 'WITHDRAWN', label: 'Withdrawn History', count: counts.WITHDRAWN, icon: LogOut },
                    { id: 'ONBOARDING', label: 'Onboarding Winners', count: counts.ONBOARDING, icon: Trophy },
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = selectedCategory === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedCategory(tab.id as HistoryCategory)}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-[1px] whitespace-nowrap",
                                isActive
                                    ? "border-blue-600 text-blue-700 bg-blue-50/60"
                                    : "border-transparent text-slate-600 hover:text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                            )}
                        >
                            <Icon size={14} className={isActive ? "text-blue-600" : "text-slate-400"} />
                            <span>{tab.label}</span>
                            <span className={cn(
                                "px-1.5 py-0.5 text-[10px] font-extrabold rounded-full",
                                isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700 dark:text-slate-300"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Main History Feed */}
            {filteredEvents.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center my-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <History size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">No {selectedCategory !== 'ALL' ? selectedCategory.replace('_', ' ') : ''} Records Found</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">There are no history entries logged under this category for {applicant.applicant_name}.</p>
                </div>
            ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200/80 before:z-0">
                    {filteredEvents.map((evt) => {
                        const meta = getCategoryBadge(evt.category);
                        const Icon = meta.icon;

                        return (
                            <div key={evt.id} className="relative z-10 flex items-start gap-4 group">
                                {/* Icon Badge */}
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105 bg-white dark:bg-slate-900",
                                    meta.color
                                )}>
                                    <Icon size={20} />
                                </div>

                                {/* Event Card */}
                                <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 space-y-3">
                                    {/* Header Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={cn("px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border", meta.color)}>
                                                {meta.label}
                                            </span>
                                            {evt.account && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-800">
                                                    <Building2 size={11} className="text-slate-500 dark:text-slate-400" />
                                                    {evt.account}
                                                </span>
                                            )}
                                        </div>

                                        {evt.date && (
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                                <Calendar size={13} className="text-slate-400" />
                                                <span>{new Date(evt.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Body Row */}
                                    <div>
                                        <h4 className="text-[14px] font-bold text-slate-900 dark:text-white">{evt.title}</h4>
                                        
                                        {evt.reason && (
                                            <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[12px] text-amber-900 font-medium leading-relaxed">
                                                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block mb-0.5">Reason / Rationale:</span>
                                                "{evt.reason}"
                                            </div>
                                        )}

                                        {evt.notes && !evt.reason && (
                                            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 rounded-lg text-[12px] text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                                "{extractRemarks(evt.notes)}"
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Details */}
                                    {(evt.actorName || evt.actorEmail) && (
                                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                            <UserIcon size={12} className="text-slate-400 shrink-0" />
                                            <span>Log Recorded By:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{evt.actorName || 'System'}</span>
                                            {evt.actorEmail && <span className="text-slate-400">({evt.actorEmail})</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
