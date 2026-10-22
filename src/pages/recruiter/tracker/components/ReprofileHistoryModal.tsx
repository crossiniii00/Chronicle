import React from 'react';
import { History, X, Clock, User, ArrowRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';
import type { Application } from '@/types/application';

interface ReprofileHistoryModalProps {
    app: Application | null;
    localChanges?: any;
    onClose: () => void;
}

function extractRemarks(notes: string): string {
    if (!notes) return '';
    
    let text = notes;

    if (/^\s*\d{4}-\d{2}-\d{2}/.test(text) || text.includes('NO PLANS TO PURSUE STUDIES') || text.includes('OTHER:') || text.includes('COMFORTABLE WITH PEME')) {
        const match = text.match(/Remarks:?\s*\n*([\s\S]*)$/i);
        if (match && match[1].trim()) {
            text = match[1].trim();
        } else {
            return '';
        }
    } else {
        const match = text.match(/Remarks:?\s*\n*([\s\S]*)$/i);
        if (match && match[1].trim()) {
            text = match[1].trim();
        } else if (text.includes('INTERVIEWER ASSESSMENT RUBRIC') || text.includes('APPLICANT BACKGROUND & EXP')) {
            return '';
        }
    }

    // Strip out initial interview recruiter form / questionnaire blocks
    text = text.split(/\n\s*\n\d{4}-\d{2}-\d{2}\s*\n/)[0];
    text = text.split(/\n\s*\n[A-Z\s\(\)-]{5,}\n/)[0];
    text = text.split(/\n\s*\nNO PLANS TO PURSUE STUDIES/i)[0];
    text = text.split(/\n\s*\nOTHER:\s*\[/i)[0];
    text = text.split(/\n\s*\nMEETS EXPECTATIONS/i)[0];
    text = text.split(/\n\s*\nCOMFORTABLE WITH PEME/i)[0];

    if (/^(NO PLANS TO PURSUE|OTHER:|MEETS EXPECTATIONS|YES,|NO,)/i.test(text.trim())) {
        return '';
    }

    return text.trim();
}

export function ReprofileHistoryModal({ app, localChanges, onClose }: ReprofileHistoryModalProps) {
    if (!app) return null;

    // Merge history from DB with any unsaved local changes history
    const dbHistory = app.pis?.reprofile_history || [];
    const localHistory = localChanges?.[app.id]?.pis_reprofile_history;
    const rawHistory = localHistory || dbHistory;

    // Check if we have an initial account assignment to serve as the start of the timeline
    const initialAccount = localChanges?.[app.id]?.pis_initial_account_assignment || 
                           app.pis?.initial_account_assignment || 
                           app.metadata?.['INITIAL ACCOUNT ASSIGNMENT'] || 
                           app.metadata?.['Account Assignment'] || 
                           app.metadata?.['Account'] ||
                           app.department;
    
    let displayHistory = [...rawHistory];
    
    if (displayHistory.length === 0) {
        if (initialAccount && initialAccount !== 'Unassigned' && initialAccount !== '---' && initialAccount !== '') {
            displayHistory = [{
                is_initial: true,
                new_account: initialAccount,
                changed_at: app.applied_at || app.updated_at || new Date().toISOString(),
                changed_by: 'System (Initial Data)'
            }];
        }
    } else {
        const firstEntry = displayHistory[0];
        if (firstEntry.previous_account && firstEntry.previous_account !== 'Unassigned' && firstEntry.previous_account !== '---' && firstEntry.previous_account !== '') {
            displayHistory = [
                {
                    is_initial: true,
                    new_account: firstEntry.previous_account,
                    changed_at: app.applied_at || app.updated_at || new Date().toISOString(),
                    changed_by: 'System (Initial Data)'
                },
                ...displayHistory
            ];
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-surface-900/30 transition-opacity"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-md shadow-premium border border-surface-200 overflow-hidden flex flex-col"
                    style={{ maxHeight: 'calc(100vh - 4rem)' }}
                >
                    <div className="flex items-center justify-between p-4 border-b border-surface-100 bg-surface-50 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 text-primary-600 rounded-sm">
                                <History size={16} />
                            </div>
                            <div>
                                <h3 className="text-[14px] font-bold text-surface-900 uppercase tracking-tight leading-none">Reprofile History</h3>
                                <p className="text-[10px] text-surface-500 font-medium mt-1">{app.applicant_name}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-200 rounded-sm transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        {(!displayHistory || displayHistory.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mb-3">
                                    <History className="text-surface-300" size={24} />
                                </div>
                                <h4 className="text-[12px] font-bold text-surface-900">No Reprofile History</h4>
                                <p className="text-[10px] text-surface-500 mt-1 max-w-[200px]">This applicant has not been moved to any other accounts yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-0.5 before:bg-surface-200">
                                {displayHistory.map((entry: any, i: number) => {
                                    const date = new Date(entry.changed_at);
                                    const isCurrent = i === displayHistory.length - 1;
                                    const isLatest = isCurrent && !entry.is_initial;
                                    
                                    const validatorName = isCurrent 
                                        ? (app.assigned_ops_validator_name || '') 
                                        : (entry.previous_ops_validator_name || '');
                                    const validatorEmail = isCurrent 
                                        ? (app.pis?.ops_validator_email || app.metadata?.ops_validator_email || '') 
                                        : (entry.previous_ops_validator_email || '');
                                    const validatorStatus = isCurrent 
                                        ? (app.pis?.ops_validator_status || app.metadata?.ops_validator_status || '') 
                                        : (entry.previous_ops_validator_status || '');
                                    const validatorNotes = isCurrent 
                                        ? (app.final_interview_notes || app.pis?.ops_validator_notes || app.metadata?.ops_validator_notes || '') 
                                        : (entry.previous_ops_validator_notes || '');
                                    
                                    return (
                                        <div key={i} className="relative flex items-start gap-4">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-primary-100 text-primary-600 shadow-sm shrink-0 z-10">
                                                {isLatest ? <Activity size={12} className="animate-pulse" /> : <Clock size={12} />}
                                            </div>
                                            
                                            <div className="flex-1 p-3 rounded-sm border border-surface-200 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-primary-200 hover:shadow-md">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">
                                                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-sm animate-pulse">
                                                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
                                                            Current Active Profile
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {entry.is_initial ? (
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-[11px] font-bold text-surface-700 px-2 py-0.5 bg-surface-100 border border-surface-200 rounded-sm truncate max-w-[200px]" title={entry.new_account}>
                                                            {entry.new_account}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-primary-500 uppercase tracking-widest ml-1">Initial Profile</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-[11px] font-medium text-surface-500 px-2 py-0.5 bg-surface-100 rounded-sm truncate max-w-[120px]" title={entry.previous_account}>
                                                            {entry.previous_account}
                                                        </span>
                                                        <ArrowRight size={12} className="text-surface-300 shrink-0" />
                                                        <span className="text-[11px] font-bold text-primary-700 px-2 py-0.5 bg-primary-50 border border-primary-100 rounded-sm truncate max-w-[120px]" title={entry.new_account}>
                                                            {entry.new_account}
                                                        </span>
                                                    </div>
                                                )}
                                                {(validatorEmail || isCurrent) && (
                                                      <div className="mt-3 pt-3 border-t border-surface-100 flex flex-col gap-1.5 text-[11px] text-left">
                                                          <div className="text-[9px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1.5">
                                                              Account Assignment Verdict
                                                              {isCurrent && (
                                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-sm animate-pulse">
                                                                      <span className="w-1 h-1 rounded-full bg-yellow-500 animate-ping" />
                                                                      Active Verdict
                                                                  </span>
                                                              )}
                                                          </div>
                                                          <div className="flex items-baseline gap-1.5 text-surface-700">
                                                              <span className="font-bold text-surface-400 uppercase text-[9px] shrink-0">Validator:</span> 
                                                              <span className="font-semibold">{validatorName || 'N/A'}</span>
                                                              {validatorEmail && (
                                                                  <span className="text-surface-400 font-medium truncate flex items-center gap-1">
                                                                      ({validatorEmail})
                                                                      {isCurrent && (
                                                                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                                                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500"></span>
                                                                          </span>
                                                                      )}
                                                                  </span>
                                                              )}
                                                          </div>
                                                          <div className="flex items-center gap-1.5 text-surface-700">
                                                              <span className="font-bold text-surface-400 uppercase text-[9px] shrink-0">Verdict:</span>
                                                              <span className={cn(
                                                                  "px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none flex items-center gap-1",
                                                                  validatorStatus?.toUpperCase() === 'PASSED' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : 
                                                                  validatorStatus?.toUpperCase() === 'FAILED' ? "bg-red-50 text-red-700 border border-red-200" : 
                                                                  "bg-amber-50 text-amber-700 border border-amber-200"
                                                              )}>
                                                                  {validatorStatus || 'Pending'}
                                                                  {isCurrent && (
                                                                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                                                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500"></span>
                                                                      </span>
                                                                  )}
                                                              </span>
                                                          </div>
                                                          <div className="flex flex-col gap-1 text-surface-700 bg-surface-50 p-2.5 border border-surface-200 mt-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                              <div className="flex items-center justify-between">
                                                                  <span className="font-bold text-[9px] text-surface-400 uppercase tracking-wider">Interviewer's Remarks</span>
                                                                  {isCurrent && (
                                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-sm animate-pulse">
                                                                          <span className="w-1 h-1 rounded-full bg-yellow-500 animate-ping" />
                                                                          Active Notes
                                                                      </span>
                                                                  )}
                                                              </div>
                                                              <p className="whitespace-pre-line text-xs font-semibold leading-relaxed text-surface-800">
                                                                  {extractRemarks(validatorNotes) || 'No remarks available.'}
                                                              </p>
                                                          </div>
                                                      </div>
                                                  )}
                                                 
                                                 <div className="flex items-center gap-1.5 text-[9px] text-surface-500 mt-2 pt-2 border-t border-surface-100">
                                                     <User size={10} />
                                                     <span>Reprofiled by <span className="font-bold text-surface-700">{entry.changed_by}</span></span>
                                                 </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
