import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Application } from '@/types/application';

interface ClientAssessmentTabProps {
    applicant: Application;
    clientAssessmentScore: string;
    setClientAssessmentScore: (score: string) => void;
    handleGiveGrade: (app: Application) => void;
    handlePromote: (app: Application, result: 'pass' | 'fail', reason?: string) => void;
    onRegress: (app: Application) => void;
    showRegressPrompt: boolean;
    setShowRegressPrompt: (show: boolean) => void;
    showRejectionPrompt: boolean;
    setShowRejectionPrompt: (show: boolean) => void;
    rejectionReasonInput: string;
    setRejectionReasonInput: (reason: string) => void;
}

export const ClientAssessmentTab: React.FC<ClientAssessmentTabProps> = ({
    applicant, clientAssessmentScore, setClientAssessmentScore, handleGiveGrade, handlePromote,
    onRegress, showRegressPrompt, setShowRegressPrompt,
    showRejectionPrompt, setShowRejectionPrompt,
    rejectionReasonInput, setRejectionReasonInput
}) => {
    return (
        <div className="max-w-4xl mx-auto py-10">
            <div className="text-center mb-10">
                <h3 className="text-xl font-bold text-surface-900 tracking-tight mb-2 uppercase tracking-wider">Client Assessment</h3>
                <p className="text-sm text-surface-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Log the outcome of the client-specific assessment phase.
                </p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
                {applicant.current_status === 'CLIENT_ASSESSMENT' ? (
                    <div className="space-y-8">
                        <div className="relative bg-white border border-surface-200 rounded-sm p-8 overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-12 -mt-12 transition-transform duration-700" />
                            
                            <div className="text-center relative">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">Client Metric Score</p>
                                <div className="inline-flex items-center gap-2">
                                    <input
                                        type="number" min={1} max={100}
                                        value={clientAssessmentScore}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setClientAssessmentScore('');
                                                return;
                                            }
                                            const num = parseInt(val, 10);
                                            if (!isNaN(num)) {
                                                if (num > 100) {
                                                    setClientAssessmentScore('100');
                                                } else if (num < 0) {
                                                    setClientAssessmentScore('1');
                                                } else {
                                                    setClientAssessmentScore(String(num));
                                                }
                                            }
                                        }}
                                        onBlur={() => {
                                            if (clientAssessmentScore !== '') {
                                                const num = parseInt(clientAssessmentScore, 10);
                                                if (!isNaN(num)) {
                                                    const clamped = Math.max(1, Math.min(100, num));
                                                    setClientAssessmentScore(String(clamped));
                                                }
                                            }
                                        }}
                                        className="w-24 bg-transparent text-center text-4xl font-bold text-surface-900 border-none focus:ring-0 placeholder-surface-100 p-0"
                                        placeholder="00"
                                    />
                                    <span className="text-2xl font-bold text-primary-500/30">%</span>
                                </div>
                                <div className="mt-4 w-12 h-1 bg-primary-500 mx-auto rounded-full" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="pt-4 space-y-3">
                                {showRejectionPrompt ? (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-5 bg-red-50 border border-red-100 rounded-sm space-y-4"
                                    >
                                        <div>
                                            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2">
                                                Rejection Reason
                                            </p>
                                            <textarea
                                                value={rejectionReasonInput}
                                                onChange={e => setRejectionReasonInput(e.target.value)}
                                                placeholder="Provide specific feedback..."
                                                className="w-full p-4 bg-white border border-red-100 rounded-sm text-xs font-medium text-surface-900 focus:outline-none focus:border-red-500 h-28 resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    if (rejectionReasonInput.trim()) {
                                                        handlePromote(applicant, 'fail', rejectionReasonInput);
                                                        setShowRejectionPrompt(false);
                                                        setRejectionReasonInput('');
                                                    }
                                                }}
                                                disabled={!rejectionReasonInput.trim()}
                                                className="flex-1 py-3.5 bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-red-700 transition-all disabled:opacity-50"
                                            >
                                                Confirm Rejection
                                            </button>
                                            <button
                                                onClick={() => setShowRejectionPrompt(false)}
                                                className="px-6 py-3.5 bg-white border border-surface-200 text-surface-600 font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            disabled={!clientAssessmentScore}
                                            onClick={() => handleGiveGrade(applicant)}
                                            className="py-4 bg-emerald-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                                        >
                                            Pass
                                        </button>
                                        <button
                                            onClick={() => setShowRejectionPrompt(true)}
                                            className="py-4 bg-white border border-red-200 text-red-600 font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-red-50 transition-all shadow-sm"
                                        >
                                            Fail
                                        </button>
                                    </div>
                                )}

                                {/* Regression System */}
                                {!showRejectionPrompt && (
                                    <div className="mt-10 pt-8 border-t border-surface-100">
                                        {showRegressPrompt ? (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="p-6 bg-orange-50 border border-orange-200 rounded-sm space-y-4"
                                            >
                                                <div className="text-orange-700 font-bold text-[10px] uppercase tracking-wider">
                                                    Stage Regression Notice
                                                </div>
                                                <p className="text-[12px] text-orange-900 font-medium leading-relaxed">
                                                    Are you certain you want to move this candidate back to the previous stage? 
                                                </p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => { onRegress(applicant); setShowRegressPrompt(false); }}
                                                        className="flex-1 py-3 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-orange-700 transition-all shadow-sm"
                                                    >
                                                        Move Back
                                                    </button>
                                                    <button onClick={() => setShowRegressPrompt(false)} className="px-6 py-3 bg-white border border-orange-200 text-orange-600 font-bold text-[10px] uppercase tracking-wider rounded-sm">
                                                        Abort
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <button
                                                onClick={() => setShowRegressPrompt(true)}
                                                className="w-full py-3 text-surface-400 hover:text-orange-600 hover:bg-orange-50/50 transition-all text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                                            >
                                                Return to Previous Stage
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative bg-emerald-50 border border-emerald-100 p-8 rounded-sm overflow-hidden text-center mb-6">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Evaluation Confirmed</p>
                            <div className="text-3xl font-bold text-surface-900 tracking-tight">
                                {applicant.client_assessment_score}<span className="text-emerald-500">%</span>
                            </div>
                            <p className="text-xs font-medium text-surface-500 mt-2 uppercase tracking-widest italic">Client Performance metric recorded</p>
                        </div>
                        <div className="p-4 bg-surface-50 border border-surface-100 text-surface-600 rounded-sm text-sm font-medium">
                            {applicant.current_status === 'REJECTED' ? 'Applicant has been REJECTED at this stage.' : 'Stage completed. Candidate has moved to the next step.'}
                        </div>
                        {applicant.rejection_reason && (
                            <div className="p-5 bg-white border border-red-200 rounded-sm text-left relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">
                                    Rejection Reason
                                </p>
                                <p className="text-xs font-medium text-surface-800 leading-relaxed">"{applicant.rejection_reason}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
