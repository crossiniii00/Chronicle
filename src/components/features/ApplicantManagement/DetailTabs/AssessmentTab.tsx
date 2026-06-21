import React from 'react';
import { motion } from 'framer-motion';
import { Application } from '@/types/application';

interface AssessmentTabProps {
    applicant: Application;
    assessmentScore: string;
    setAssessmentScore: (score: string) => void;
    handleGiveGrade: (app: Application) => void;
    handlePromote: (app: Application, result: 'pass' | 'fail') => void;
    onRegress: (app: Application) => void;
    showRegressPrompt: boolean;
    setShowRegressPrompt: (show: boolean) => void;
    showRejectionPrompt: boolean;
    handleUpdateApplication?: (id: string, patch: any) => void;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({
    applicant, assessmentScore, setAssessmentScore, handleGiveGrade, handlePromote,
    onRegress, showRegressPrompt, setShowRegressPrompt, showRejectionPrompt, handleUpdateApplication
}) => {
    return (
        <div className="max-w-4xl mx-auto py-10">
            <div className="text-center mb-10">
                <h3 className="text-xl font-bold text-surface-900 tracking-tight mb-2 uppercase tracking-wider">Technical Assessment</h3>
                <p className="text-sm text-surface-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Evaluate and record the candidate's technical performance and subject matter expertise.
                </p>
            </div>

            <div className="max-w-md mx-auto space-y-8">
                {applicant.assessment_score !== null && applicant.assessment_score !== undefined ? (
                    <div className="relative bg-emerald-50 border border-emerald-100 p-8 rounded-sm overflow-hidden text-center">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Evaluation Confirmed</p>
                        <div className="text-3xl font-bold text-surface-900 tracking-tight">
                            {applicant.assessment_score}
                            {!['A1','A2','B1','B2','C1','C2'].includes(String(applicant.assessment_score).toUpperCase()) && <span className="text-emerald-500">%</span>}
                        </div>
                        <p className="text-xs font-medium text-surface-500 mt-2 uppercase tracking-widest italic">Performance metric recorded</p>
                    </div>
                ) : applicant.current_status === 'ASSESSMENT' ? (
                    <div className="space-y-8">
                        <div className="relative bg-white border border-surface-200 rounded-sm p-8 overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-12 -mt-12 transition-transform duration-700" />
                            
                            <div className="text-center relative flex flex-col items-center">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">Metric Score Entry</p>
                                <div className="inline-flex items-center gap-2 w-full max-w-[240px]">
                                    <select
                                        value={assessmentScore}
                                        onChange={e => setAssessmentScore(e.target.value)}
                                        className="w-full bg-white border border-surface-300 rounded-sm px-4 py-2.5 text-center text-lg font-bold text-surface-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                    >
                                        <option value="">Select Score</option>
                                        <option value="A1">A1 (Fail)</option>
                                        <option value="A2">A2 (Fail)</option>
                                        <option value="B1">B1 (Fail)</option>
                                        <option value="B2">B2 (Pass)</option>
                                        <option value="C1">C1 (Pass)</option>
                                        <option value="C2">C2 (Pass)</option>
                                    </select>
                                </div>
                                <div className="mt-5 w-12 h-1 bg-primary-500 mx-auto rounded-full" />
                            </div>
                        </div>

                        {assessmentScore && (
                            <div className="flex justify-center w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
                                {['B2', 'C1', 'C2'].includes(assessmentScore.toUpperCase()) ? (
                                    <button
                                        onClick={() => handleGiveGrade(applicant)}
                                        className="w-full py-4 bg-primary-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-primary-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        Pass Candidate
                                    </button>
                                ) : ['A1', 'A2', 'B1'].includes(assessmentScore.toUpperCase()) ? (
                                    <button
                                        onClick={() => handlePromote(applicant, 'fail')}
                                        className="w-full py-4 bg-red-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-red-750 transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        Fail Candidate
                                    </button>
                                ) : null}
                            </div>
                        )}

                        {/* Regression Capability */}
                        {!showRejectionPrompt && (
                            <div className="mt-10 pt-8 border-t border-surface-100">
                                {showRegressPrompt ? (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-6 bg-orange-50 border border-orange-100 rounded-sm space-y-4"
                                    >
                                        <div className="text-orange-700 font-bold text-[10px] uppercase tracking-widest">
                                            Stage Regression notice
                                        </div>
                                        <p className="text-[12px] text-orange-900 font-medium leading-relaxed italic">
                                            "Are you absolutely certain about reverting this candidate back to the initial interview?"
                                        </p>
                                        <div className="flex gap-3">
                                            <button onClick={() => { onRegress(applicant); setShowRegressPrompt(false); }} className="flex-1 py-3 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm">
                                                Confirm Revert
                                            </button>
                                            <button onClick={() => setShowRegressPrompt(false)} className="px-6 py-3 bg-white border border-orange-200 text-orange-600 font-bold text-[10px] uppercase tracking-widest rounded-sm">
                                                Cancel
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <button
                                        onClick={() => setShowRegressPrompt(true)}
                                        className="w-full py-3 text-surface-300 hover:text-orange-600 hover:bg-orange-50 transition-all text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 italic"
                                    >
                                        Step Back to Interview
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 bg-surface-50 border border-surface-200 rounded-sm text-center">
                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">
                            {['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'FINAL_INTERVIEW'].includes(applicant.current_status) 
                                ? 'Stage Pending' 
                                : 'Assessment Completed'}
                        </p>
                        {['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'FINAL_INTERVIEW'].includes(applicant.current_status) ? (
                            <p className="text-sm text-surface-500 font-medium">
                                Please complete the Endorsement stage first.
                            </p>
                        ) : (
                            <p className="text-sm text-surface-500 font-medium mt-4">
                                Candidate has progressed past this stage. No score was recorded.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
