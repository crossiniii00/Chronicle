import { RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Application } from '@/types/application';

interface VerdictTabProps {
    applicant: Application;
    showRejectionPrompt: boolean;
    setShowRejectionPrompt: (show: boolean) => void;
    rejectionReasonInput: string;
    setRejectionReasonInput: (reason: string) => void;
    handlePromote: (app: Application, result: 'pass' | 'fail', reason?: string) => void;
    onRegress?: () => void;
}

export const VerdictTab: React.FC<VerdictTabProps> = ({
    applicant, showRejectionPrompt, setShowRejectionPrompt, rejectionReasonInput, setRejectionReasonInput,
    handlePromote, onRegress
}) => {
    return (
        <div className="max-w-4xl mx-auto py-16 text-center">
            {applicant.current_status === 'PASSED' || applicant.current_status === 'HIRED' || applicant.current_status === 'CONDITIONAL' ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                >
                    <div className="space-y-3">
                        <h3 className="text-3xl font-black text-surface-900 tracking-tight uppercase">Applicant Passed</h3>
                        <div className="flex items-center justify-center gap-3">
                            <span className="h-[1px] w-8 bg-emerald-200" />
                            <p className="text-emerald-600 font-black uppercase tracking-[0.2em] text-[10px]">Registry Status: Verified</p>
                            <span className="h-[1px] w-8 bg-emerald-200" />
                        </div>
                    </div>

                    <div className="max-w-md mx-auto bg-white border border-surface-100 rounded-xl shadow-premium p-10 space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 opacity-20" />
                        
                        <p className="text-sm text-surface-600 font-medium leading-relaxed">
                            The comprehensive recruitment protocol for <span className="text-surface-900 font-black">{applicant.applicant_name}</span> has been successfully concluded.
                        </p>

                        <div className="pt-4 border-t border-surface-50">
                            <button
                                onClick={onRegress}
                                className="w-full flex items-center justify-center gap-3 py-3.5 bg-surface-50 text-surface-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg text-[11px] font-black uppercase tracking-[0.15em] transition-all border border-transparent hover:border-primary-100"
                            >
                                <RotateCcw size={14} />
                                Undo Decision Protocol
                            </button>
                        </div>
                    </div>
                </motion.div>
            ) : applicant.current_status === 'REJECTED' || applicant.current_status === 'FAILED' ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                >
                    <div className="space-y-3">
                        <h3 className="text-3xl font-black text-surface-900 tracking-tight uppercase">Application Rejected</h3>
                        <div className="flex items-center justify-center gap-3">
                            <span className="h-[1px] w-8 bg-red-200" />
                            <p className="text-red-600 font-black uppercase tracking-[0.2em] text-[10px]">Decision Recorded</p>
                            <span className="h-[1px] w-8 bg-red-200" />
                        </div>
                    </div>

                    <div className="max-w-md mx-auto space-y-6">
                        {applicant.rejection_reason && (
                            <div className="bg-white border border-red-100 rounded-xl p-8 text-left relative overflow-hidden shadow-premium">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600" />
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.15em] mb-4 opacity-70">
                                    Official Protocol Reason
                                </p>
                                <p className="text-[13px] font-semibold text-surface-800 leading-relaxed italic border-l-2 border-red-50 pl-5">
                                    "{applicant.rejection_reason}"
                                </p>
                            </div>
                        )}
                        
                        <button
                            onClick={onRegress}
                            className="flex items-center justify-center gap-3 w-full py-4 bg-white border border-surface-200 text-surface-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all shadow-sm"
                        >
                            <RotateCcw size={15} />
                            Undo Decision & Reset Protocol
                        </button>
                    </div>
                </motion.div>
            ) : applicant.current_status === 'WITHDRAWN' ? (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <h3 className="text-2xl font-bold text-surface-900 tracking-tight uppercase tracking-wider">Application Withdrawn</h3>
                    <p className="text-surface-400 font-bold uppercase tracking-wider text-[10px]">Process Concluded</p>
                </motion.div>
            ) : (
                <div className="flex flex-col items-center gap-8">
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-surface-900 tracking-tight uppercase tracking-wider">Process Summary</h3>
                        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest">Brief review of candidate performance</p>
                    </div>

                    <div className="w-full max-w-2xl grid grid-cols-3 gap-4">
                        <div className="p-4 bg-surface-50 border border-surface-100 rounded-sm">
                            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-1">Typing Speed</p>
                            <p className="text-lg font-black text-surface-900">{applicant.typing_test_wpm || 0} WPM</p>
                            <p className="text-[8px] font-bold text-surface-400 uppercase tracking-tighter">{applicant.typing_test_accuracy || 0}% Accuracy</p>
                        </div>
                        <div className="p-4 bg-surface-50 border border-surface-100 rounded-sm">
                            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-1">Assessment</p>
                            <p className="text-lg font-black text-primary-600">
                                {applicant.assessment_score || 0}
                                {applicant.assessment_score && !['A1','A2','B1','B2','C1','C2'].includes(String(applicant.assessment_score).toUpperCase()) && '%'}
                            </p>
                            <p className="text-[8px] font-bold text-surface-400 uppercase tracking-tighter">Technical Module</p>
                        </div>
                        <div className="p-4 bg-surface-50 border border-surface-100 rounded-sm">
                            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-1">Final Status</p>
                            <p className="text-lg font-black text-surface-900 uppercase">{applicant.current_status.replace(/_/g, ' ')}</p>
                            <p className="text-[8px] font-bold text-surface-400 uppercase tracking-tighter">Active Pipeline</p>
                        </div>
                    </div>

                    <div className="w-full max-w-2xl p-6 bg-white border border-surface-200 rounded-sm text-left">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-4 flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary-600 rounded-full" /> 
                            Final Intelligence Summary
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] font-bold text-surface-400 uppercase mb-1">Recruiter Observations</p>
                                <p className="text-xs text-surface-700 leading-relaxed italic">
                                    {applicant.final_interview_notes || 'No ops val interview notes recorded.'}
                                </p>
                            </div>
                            {applicant.interview_notes && (
                                <div>
                                    <p className="text-[9px] font-bold text-surface-400 uppercase mb-1">Initial Screening Notes</p>
                                    <p className="text-xs text-surface-600 leading-relaxed italic">
                                        {applicant.interview_notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-10">
                        <button
                            onClick={onRegress}
                            className="flex items-center gap-3 px-10 py-4 bg-white border border-surface-200 text-surface-500 hover:text-primary-700 hover:border-primary-200 hover:bg-primary-50 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-sm"
                        >
                            <RotateCcw size={16} />
                            Undo Decision Protocol
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
