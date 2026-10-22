import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, UserCheck, CheckCircle2, X, Send } from 'lucide-react';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';

interface EndorsementSModalProps {
    applicant: Application | null;
    onClose: () => void;
    onSend: (app: Application, recruiterSName: string) => void;
}

export function EndorsementSModal({ applicant, onClose, onSend }: EndorsementSModalProps) {
    if (!applicant) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm"
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-lg shadow-premium border border-surface-200 overflow-hidden"
            >
                {/* Microsoft Inspired Header */}
                <div className="bg-white dark:bg-slate-900 px-10 py-10 border-b border-surface-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-60" />
                    
                    <div className="absolute top-6 right-6">
                        <button onClick={onClose} className="p-2 hover:bg-surface-50 rounded-full transition-colors group">
                            <X size={20} className="text-surface-400 group-hover:text-surface-900" />
                        </button>
                    </div>
                    
                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary-600 rounded-md flex items-center justify-center shadow-lg shadow-primary-200">
                                <Shield size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-surface-900 tracking-tight leading-none">Priority Endorsement</h2>
                                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-2">Specialized Workflow Protocol</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Candidate Name</p>
                                <p className="text-lg font-semibold text-surface-900 truncate">{applicant.applicant_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Strategic Account</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                    <p className="text-lg font-semibold text-primary-600">{applicant.department}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Logic */}
                <div className="px-10 py-10 space-y-10">
                    <div className="p-6 bg-primary-50/50 border border-primary-100 rounded-md space-y-3">
                        <div className="flex items-center gap-2">
                            <UserCheck size={16} className="text-primary-600" />
                            <h3 className="text-[12px] font-bold uppercase tracking-wider text-primary-700">Routing Directive</h3>
                        </div>
                        <p className="text-[14px] font-medium text-surface-700 leading-relaxed">
                            Account protocols for <span className="text-primary-700 font-bold">{applicant.department}</span> require immediate escalation to our <span className="text-primary-700 font-bold">Recruiter S!</span> specialized channel for final validation.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Designated Finalization Node</h3>
                        
                        <div className="p-6 border border-surface-200 rounded-md flex items-center justify-between hover:border-primary-300 transition-all bg-surface-50/30 group">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white dark:bg-slate-900 border border-surface-200 rounded-md flex items-center justify-center font-bold text-primary-600 text-lg shadow-sm">
                                    RS!
                                </div>
                                <div>
                                    <div className="text-[15px] font-semibold text-surface-900">Recruiter S! Division</div>
                                    <div className="text-[11px] text-surface-400 font-medium uppercase tracking-wider mt-1">High-Intensity Talent Pipeline</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-primary-100 px-4 py-2 rounded-full border border-primary-200">
                                <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
                                <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Active Path</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="order-2 sm:order-1 flex-1 py-3 text-[13px] font-semibold text-surface-500 hover:text-surface-900 transition-colors border border-surface-200 rounded-md hover:bg-surface-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSend(applicant, 'Recruiter S!')}
                            className="order-1 sm:order-2 flex-[2] flex items-center justify-center gap-3 bg-primary-600 text-white px-10 py-3 text-[13px] font-semibold rounded-md hover:bg-primary-700 shadow-md shadow-primary-200 transition-all active:scale-[0.98]"
                        >
                            Execute Endorsement <Send size={16} />
                        </button>
                    </div>
                </div>
                
                {/* Fluent Footer */}
                <div className="px-10 py-6 bg-surface-50/50 border-t border-surface-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Shield size={16} className="text-surface-300" />
                        <p className="text-[10px] text-surface-400 font-medium uppercase tracking-wider">
                            Automatic Outlook synchronization enabled
                        </p>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
            </motion.div>
        </div>
    );
}
