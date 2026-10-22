import React from 'react';
import { CheckCircle2, XCircle, Clock, User as UserIcon } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { extractRemarks } from '../utils/evaluationHelpers';

interface EndorsementHistoryViewProps {
    failedAccounts: string[];
    evaluationAttempts: Array<{
        status: string;
        account: string;
        validatorName?: string;
        validatorEmail?: string;
        notes?: string;
        date?: string;
    }>;
}

export const EndorsementHistoryView: React.FC<EndorsementHistoryViewProps> = ({ failedAccounts, evaluationAttempts }) => {
    if (failedAccounts.length === 0) return null;

    return (
        <div className="mt-8 border-t border-slate-100 pt-6 text-left w-full max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-6 bg-primary-600 rounded-full" />
                <h4 className="text-[14px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Evaluation Tracking Details
                </h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {evaluationAttempts.map((attempt, idx) => {
                    const isPassed = attempt.status === 'PASSED';
                    const isFailed = attempt.status === 'FAILED';
                    const isPending = attempt.status === 'PENDING';

                    return (
                        <div
                            key={idx}
                            className={cn(
                                "p-4 rounded-xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between",
                                isPassed ? "border-emerald-100 hover:border-emerald-200" :
                                    isFailed ? "border-red-100 hover:border-red-200" :
                                        "border-amber-100 hover:border-amber-200"
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide truncate max-w-[70%]" title={attempt.account}>
                                        {attempt.account}
                                    </span>
                                    <span className={cn(
                                        "px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md inline-flex items-center gap-1 shrink-0",
                                        isPassed ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" :
                                            isFailed ? "bg-red-50 text-red-700 border border-red-200/50" :
                                                "bg-amber-50 text-amber-700 border border-amber-200/50"
                                    )}>
                                        {isPassed && <CheckCircle2 size={10} />}
                                        {isFailed && <XCircle size={10} />}
                                        {isPending && <Clock size={10} />}
                                        {attempt.status}
                                    </span>
                                </div>

                                {(attempt.validatorName || attempt.validatorEmail) && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                                        <UserIcon size={12} className="text-slate-400 shrink-0" />
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {attempt.validatorName || 'Validator'}
                                        </span>
                                        {attempt.validatorEmail && (
                                            <span className="text-slate-400 truncate">({attempt.validatorEmail})</span>
                                        )}
                                    </div>
                                )}

                                {attempt.notes && (
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 border border-slate-100/80 mb-2 max-h-24 overflow-y-auto custom-scrollbar text-[11.5px] text-slate-600 leading-relaxed italic">
                                        "{extractRemarks(attempt.notes)}"
                                    </div>
                                )}
                            </div>

                            {attempt.date && (
                                <div className="text-[9.5px] font-bold text-slate-400 mt-2 border-t border-slate-100/50 pt-2 flex items-center justify-between">
                                    <span>PROCESSED DATE</span>
                                    <span>{new Date(attempt.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
