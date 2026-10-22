import React, { useMemo } from 'react';
import { MessageSquare, Clock, User } from 'lucide-react';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';

interface ValidatorRemarksSectionProps {
    applicant: Application;
    isEditing?: boolean;
    remarksRaw: string | null | undefined;
    onUpdate?: (newRemarks: string) => void;
    account?: string;
}

interface Note {
    id: string;
    author: string;
    createdAt?: string;
    content: string;
    type: string;
}

export const ValidatorRemarksSection: React.FC<ValidatorRemarksSectionProps> = ({
    applicant,
    isEditing = false,
    remarksRaw,
    onUpdate,
    account
}) => {
    const notes = useMemo<Note[]>(() => {
        const raw = (remarksRaw || '').trim();
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (e) {
            // Not a JSON string, fallback to legacy text
        }

        // Parse legacy string into a single note
        return [{
            id: 'legacy-1',
            content: raw,
            author: applicant.assigned_ops_validator_name || applicant.assigned_recruiter_name || 'System',
            createdAt: applicant.updated_at,
            type: 'VALIDATOR REMARK'
        }];
    }, [remarksRaw, applicant.assigned_ops_validator_name, applicant.assigned_recruiter_name, applicant.updated_at]);

    const noteCount = notes.length;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return `${formattedDate} · ${formattedTime}`;
        } catch {
            return '';
        }
    };

    return (
        <div className="w-full bg-[#fcfcfc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 transition-all">
            {/* Header Area */}
            <div className="flex items-start justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <MessageSquare size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 leading-tight uppercase tracking-wide">Validator Remarks</h4>
                        <p className="text-[12px] text-slate-500 mt-1">Notes and observations recorded by the Operations Validator</p>
                    </div>
                </div>
                <div className="shrink-0 flex items-center bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-[4px] border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {noteCount} {noteCount === 1 ? 'Note' : 'Notes'}
                    </span>
                </div>
            </div>

            {/* Note List Workspace */}
            <div className="w-full">
                {isEditing ? (
                    <div className="w-full">
                        <textarea
                            value={remarksRaw || ''}
                            onChange={(e) => onUpdate?.(e.target.value)}
                            placeholder="Enter operations validation remarks..."
                            className="w-full min-h-[140px] text-[13px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-[6px] px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-y shadow-sm"
                        />
                        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            Use this workspace to append or update the operations validation remarks.
                        </p>
                    </div>
                ) : (
                    <div className={cn(
                        "grid gap-4",
                        noteCount > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                    )}>
                        {notes.map((note) => {
                            const dateDisplay = formatDate(note.createdAt);
                            
                            return (
                                <div key={note.id} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[6px] p-4 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all flex flex-col h-full">
                                    <div className="mb-3">
                                        <span className="inline-block text-[10px] font-semibold text-slate-500 tracking-[0.05em] uppercase">
                                            {note.type}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <p className="text-[13px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                            {note.content}
                                        </p>
                                    </div>

                                    {(note.author || dateDisplay) && (
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
                                            {note.author && (
                                                <div className="flex items-center gap-1.5">
                                                    <User size={12} className="text-slate-400" />
                                                    <span className="text-[11px] text-slate-500">Added by <span className="font-medium text-slate-600 dark:text-slate-300">{note.author}</span></span>
                                                </div>
                                            )}
                                            {note.author && dateDisplay && (
                                                <span className="text-[11px] text-slate-300 dark:text-slate-600">•</span>
                                            )}
                                            {dateDisplay && (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <span className="text-[11px] text-slate-500">{dateDisplay}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {noteCount === 0 && (
                            <div className="col-span-full py-8 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3 border border-slate-100 dark:border-slate-700">
                                    <MessageSquare size={16} className="text-slate-300 dark:text-slate-500" />
                                </div>
                                <h5 className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1">No validator remarks recorded</h5>
                                <p className="text-[12px] text-slate-500 max-w-[250px]">
                                    No operations validator remarks logged{account ? ` for ${account}` : ' yet'}.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
