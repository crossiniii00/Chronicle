import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutGrid, ClipboardCheck, Star, Shield } from 'lucide-react';
import { Application } from '@/types/application';
import { cn, formatDate } from '@/utils/formatters';

interface EvaluationModalProps {
    applicant: Application;
    showEvaluationResults: boolean;
    setShowEvaluationResults: (show: boolean) => void;
    initQuestions?: Array<{ id: string; question_text: string; answer_type?: string }>;
    responses?: Record<string, string | number>;
    safeOverallRating: number;
    recommendation?: string;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
    applicant, showEvaluationResults, setShowEvaluationResults, initQuestions,
    responses, safeOverallRating, recommendation
}) => {
    return (
        <AnimatePresence>
            {showEvaluationResults && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-surface-900/40 flex items-center justify-center p-4 md:p-8"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-surface-200 rounded-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-surface-200 bg-surface-50">
                            <div>
                                <h2 className="text-xl font-bold text-surface-900 uppercase tracking-tight leading-none">Evaluation Questions</h2>
                                <p className="text-surface-500 text-[10px] font-bold uppercase tracking-wider mt-2 flex items-center gap-2">
                                    <LayoutGrid size={12} /> Stage: Initial Interview
                                </p>
                            </div>
                            <button
                                onClick={() => setShowEvaluationResults(false)}
                                className="p-2 hover:bg-surface-200 rounded-sm text-surface-400 hover:text-surface-900 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-12">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-4 border border-surface-300 rounded-sm overflow-hidden">
                                <div className="p-4 bg-surface-50 border-r border-surface-300">
                                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-wider mb-1">Interviewer</p>
                                    <p className="text-xs font-bold text-surface-900">{applicant.interviewer_name || 'Recruiter/System'}</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900 border-r border-surface-300">
                                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-wider mb-1">Interview Room</p>
                                    <p className="text-xs font-bold text-surface-900">{applicant.interview_room || 'Room Alpha'}</p>
                                </div>
                                <div className="p-4 bg-surface-50 border-r border-surface-300">
                                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-wider mb-1">Date</p>
                                    <p className="text-xs font-bold text-surface-900">{applicant.interview_completed_at ? formatDate(applicant.interview_completed_at) : '—'}</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900">
                                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-wider mb-1">Evaluation Status</p>
                                    <p className="text-xs font-bold text-vibrant-emerald">VERIFIED</p>
                                </div>
                            </div>

                            {/* Questions & Responses */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-sm bg-primary-50 flex items-center justify-center border border-primary-100">
                                        <ClipboardCheck size={16} className="text-primary-600" />
                                    </div>
                                    <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Evaluation Responses</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {(initQuestions || []).map((q, i: number) => (
                                        <div key={q.id} className="p-6 bg-surface-50 border border-surface-200 rounded-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="text-xs font-bold text-surface-800 uppercase tracking-tight flex items-center gap-3">
                                                    <span className="w-5 h-5 bg-surface-200 flex items-center justify-center text-[10px] rounded-full">{i + 1}</span>
                                                    {q.question_text}
                                                </h4>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 border border-surface-200 rounded-sm min-h-[60px]">
                                                {q.answer_type === 'rating' ? (
                                                    <div className="flex gap-2">
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <Star
                                                                key={star}
                                                                size={18}
                                                                fill={Number(responses && responses[q.id]) >= star ? "#0078D4" : "none"}
                                                                className={Number(responses && responses[q.id]) >= star ? "text-primary-600" : "text-surface-300"}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-surface-600 leading-relaxed">
                                                        {responses && responses[q.id] ? String(responses[q.id]) : 'No observations logged for this metric.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Final Summary */}
                            <div className="pt-10 border-t border-surface-200 grid md:grid-cols-2 gap-8">
                                <div className="p-6 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm">
                                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-4">Overall Rating</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <Star key={n} size={28} fill={safeOverallRating >= n ? "#EAB308" : "none"} className={safeOverallRating >= n ? "text-yellow-500" : "text-surface-200"} />
                                            ))}
                                        </div>
                                        <span className="text-2xl font-bold text-surface-900">{safeOverallRating}/5</span>
                                    </div>
                                </div>
                                <div className="p-6 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm">
                                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-4">Recommendation</p>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "px-6 py-3 rounded-sm text-xs font-bold uppercase tracking-wider border",
                                            recommendation === 'PASSED' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                                                recommendation === 'FAILED' ? "bg-red-50 border-red-200 text-red-600" :
                                                    "bg-primary-50 border-primary-200 text-primary-600"
                                        )}>
                                            {recommendation || 'PENDING_DECISION'}
                                        </div>
                                        <Shield size={24} className={recommendation === 'PASSED' ? "text-emerald-600" : "text-surface-300"} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 bg-surface-50 border-t border-surface-200 flex justify-between items-center">
                            <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Shield size={12} /> Confidential - Internal Use Only
                            </p>
                            <button
                                onClick={() => setShowEvaluationResults(false)}
                                className="px-8 py-3 bg-surface-900 text-white rounded-sm text-[10px] font-bold uppercase tracking-wider hover:bg-surface-800 transition-all shadow-sm"
                            >
                                Close Details
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
