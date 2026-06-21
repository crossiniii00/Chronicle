import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Keyboard, Gauge, Target, Clock, TrendingUp, Award, Zap, CheckCircle2 } from 'lucide-react';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';

interface TypingTabProps {
    applicant: Application;
    onQueue: (app: Application, type: 'INITIAL' | 'FINAL') => void;
    handlePromote?: (app: Application, result: 'pass' | 'fail', reason?: string) => void;
}

export const TypingTab: React.FC<TypingTabProps> = ({ applicant, onQueue, handlePromote }) => {
    const [showRejectionPrompt, setShowRejectionPrompt] = useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const wpm = Number(applicant.typing_test_wpm) || 0;
    const accuracy = Number(applicant.typing_test_accuracy) || 0;
    const duration = applicant.typing_test_duration_seconds || 0;
    const minutes = Math.round(duration / 60);
    const seconds = (duration % 60).toString().padStart(2, '0');

    const level = wpm >= 60 ? 'Expert' : wpm >= 45 ? 'Advanced' : wpm >= 30 ? 'Intermediate' : 'Beginner';
    const levelColor = wpm >= 60 ? 'text-emerald-500' : wpm >= 45 ? 'text-blue-500' : wpm >= 30 ? 'text-amber-500' : 'text-red-400';
    const levelBg = wpm >= 60 ? 'bg-emerald-500' : wpm >= 45 ? 'bg-blue-500' : wpm >= 30 ? 'bg-amber-500' : 'bg-red-400';

    // WPM gauge: % fill (max scale = 80 WPM)
    const wpmPercent = Math.min(100, Math.round((wpm / 80) * 100));
    const accPercent = Math.round(accuracy);

    const analysis = wpm >= 60
        ? 'Excellent typing speed, highly suitable for data entry and customer support roles.'
        : wpm >= 45
            ? 'Good typing proficiency with solid accuracy. Meets requirements for most operational roles.'
            : wpm >= 30
                ? 'Average typing speed. Additional practice recommended before deployment.'
                : 'Below average speed. Requires improvement for operational readiness.';

    if (!applicant.typing_test_wpm) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-none bg-surface-100 mb-5 border border-surface-200">
                    <Keyboard size={28} className="text-surface-300" />
                </div>
                <h3 className="text-lg font-bold text-surface-800 tracking-tight mb-2">No Typing Test Data</h3>
                <p className="text-sm text-surface-400 font-medium max-w-sm mx-auto leading-relaxed">
                    This applicant has not completed the typing assessment yet. Results will appear here once submitted.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-none bg-primary-900 border border-primary-800">
                    <Keyboard size={18} className="text-white" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-surface-900 tracking-tight uppercase">Typing Assessment</h3>
                    <p className="text-[11px] text-surface-400 font-medium">
                        {applicant.typing_test_completed_at
                            ? `Completed ${new Date(applicant.typing_test_completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                            : 'Completion date unavailable'}
                    </p>
                </div>
                <div className="ml-auto">
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest text-white",
                        levelBg
                    )}>
                        <Award size={11} />
                        {level}
                    </span>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* WPM Card */}
                <div className="bg-white border border-surface-200 rounded-none p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Gauge size={14} className="text-primary-600" />
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Words per Minute</span>
                    </div>
                    <div className="flex items-end gap-2 mb-3">
                        <span className="text-4xl font-black text-surface-900 leading-none">{wpm}</span>
                        <span className="text-sm font-bold text-surface-300 mb-1">WPM</span>
                    </div>
                    <div className="w-full h-2 bg-surface-100 rounded-none overflow-hidden border border-surface-200">
                        <div
                            className="h-full rounded-none bg-surface-900 transition-all duration-1000"
                            style={{ width: `${wpmPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-surface-300 font-bold">0</span>
                        <span className="text-[9px] text-surface-300 font-bold">80+</span>
                    </div>
                </div>

                {/* Accuracy Card */}
                <div className="bg-white border border-surface-200 rounded-none p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Target size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Accuracy Rate</span>
                    </div>
                    <div className="flex items-end gap-2 mb-3">
                        <span className="text-4xl font-black text-surface-900 leading-none">{accuracy}</span>
                        <span className="text-sm font-bold text-surface-300 mb-1">%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-100 rounded-none overflow-hidden border border-surface-200">
                        <div
                            className={cn(
                                "h-full rounded-none transition-all duration-1000",
                                accPercent >= 95 ? "bg-emerald-600" :
                                    accPercent >= 85 ? "bg-blue-600" :
                                        "bg-amber-600"
                            )}
                            style={{ width: `${accPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-surface-300 font-bold">0%</span>
                        <span className="text-[9px] text-surface-300 font-bold">100%</span>
                    </div>
                </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Duration */}
                <div className="bg-white border border-surface-200 rounded-none p-4 flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-none bg-violet-50 border border-violet-100">
                        <Clock size={18} className="text-violet-500" />
                    </div>
                    <div>
                        <div className="text-xl font-black text-surface-900 leading-none">{minutes}:{seconds}</div>
                        <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-1">Duration</div>
                    </div>
                </div>

                {/* Level */}
                <div className="bg-white border border-surface-200 rounded-none p-4 flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-none bg-amber-50 border border-amber-100">
                        <TrendingUp size={18} className="text-amber-500" />
                    </div>
                    <div>
                        <div className={cn("text-xl font-black leading-none", levelColor)}>{level}</div>
                        <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-1">Proficiency</div>
                    </div>
                </div>

                {/* Net Speed */}
                <div className="bg-white border border-surface-200 rounded-none p-4 flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-none bg-sky-50 border border-sky-100">
                        <Zap size={18} className="text-sky-500" />
                    </div>
                    <div>
                        <div className="text-xl font-black text-surface-900 leading-none">{Math.round(wpm * (accuracy / 100))}</div>
                        <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-1">Net WPM</div>
                    </div>
                </div>
            </div>

            {/* Performance Analysis */}
            <div className="bg-white border border-surface-200 rounded-none p-5 mb-6">
                <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-none bg-primary-50 mt-0.5 shrink-0 border border-primary-100">
                        <CheckCircle2 size={16} className="text-primary-500" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1.5">Performance Analysis</div>
                        <p className="text-sm text-surface-700 font-medium leading-relaxed">{analysis}</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            {applicant.current_status === 'TYPING_TEST' && (
                <div className="mt-8 pt-8 border-t border-surface-100">
                    {showRejectionPrompt ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 bg-red-50/50 border border-red-100 rounded-sm space-y-4"
                        >
                            <div>
                                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2">
                                    Rejection Reason
                                </p>
                                <textarea
                                    value={rejectionReasonInput}
                                    onChange={e => setRejectionReasonInput(e.target.value)}
                                    placeholder="Provide specific feedback on why the candidate did not pass the typing test..."
                                    className="w-full p-4 bg-white border border-red-100 rounded-sm text-xs font-medium text-surface-900 focus:outline-none focus:border-red-500 h-28 resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        if (rejectionReasonInput.trim()) {
                                            handlePromote?.(applicant, 'fail', rejectionReasonInput);
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
                                    className="px-6 py-3.5 bg-white border border-surface-200 text-surface-600 font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handlePromote?.(applicant, 'pass')}
                                className="py-4 bg-emerald-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-emerald-700 transition-all shadow-sm"
                            >
                                Pass Stage
                            </button>
                            <button
                                onClick={() => setShowRejectionPrompt(true)}
                                className="py-4 bg-red-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-red-700 transition-all shadow-sm"
                            >
                                Reject
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
