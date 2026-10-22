import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ArrowLeft, RefreshCw, Unlock } from 'lucide-react';
import { Application } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';
import { QueueService } from '@/services/QueueService';
interface AssessmentTabProps {
    applicant: Application;
    assessmentScore: string;
    setAssessmentScore: (score: string) => void;
    handleGiveGrade: (app: Application, assessmentType?: any, isFail?: boolean, isTestII?: boolean, forceSecondTest?: boolean) => void;
    handleUpdateApplication?: (id: string, patch: any) => void;
    setModalTab?: (tab: any) => void;
    isTestII?: boolean;
}

export const getAssessmentTypeLabel = (type: string) => {
    switch (type) {
        case 'speechx': return 'Speech X (CEFR)';
        case 'leadership': return 'Leadership Assessment';
        case 'personality': return 'Personality Map';
        case 'critical_thinking': return 'Critical Thinking Assessment';
        case 'critical_thinking_personality': return 'Critical Thinking and Personality Map';
        case 'not_applicable': return 'Not Applicable';
        default: return type || 'Assessment';
    }
};

export const AssessmentTab: React.FC<AssessmentTabProps> = ({
    applicant, assessmentScore, setAssessmentScore, handleGiveGrade,
    handleUpdateApplication, setModalTab,
    isTestII = false
}) => {
    const [assessmentType, setAssessmentType] = React.useState<any>(isTestII ? 'leadership' : 'speechx');
    const [showSecondTestPrompt, setShowSecondTestPrompt] = React.useState(false);

    React.useEffect(() => {
        // Clear score when type changes
        setAssessmentScore('');
    }, [assessmentType, setAssessmentScore]);

    const [showReschedulePrompt, setShowReschedulePrompt] = React.useState(false);
    const [rescheduleDate, setRescheduleDate] = React.useState('');
    const [isRescheduling, setIsRescheduling] = React.useState(false);

    const scoreVal = isTestII
        ? applicant.metadata?.assessment_ii_score
        : (applicant.assessment_score !== null && applicant.assessment_score !== undefined ? applicant.assessment_score : applicant.pis?.leadership_score);

    const isScoreConfirmed = scoreVal !== null && scoreVal !== undefined && scoreVal !== '';

    const isNoShow = String(applicant.current_status || '').toLowerCase().includes('no show') ||
        String(applicant.current_status || '').toLowerCase().includes('noshow') ||
        String(applicant.current_status || '').toLowerCase().includes('no_show');

    return (
        <div className="max-w-4xl mx-auto py-10">
            <div className="text-center mb-10">
                <h3 className="text-xl font-bold text-surface-900 tracking-tight mb-2 uppercase tracking-wider">
                    {isTestII ? 'Proficiency Assessment II' : 'Proficiency Assessment'}
                </h3>
                <p className="text-sm text-surface-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Evaluate and record the candidate's proficiency performance and subject matter expertise.
                </p>
            </div>

            <div className="max-w-md mx-auto space-y-8">
                {(() => {
                    const revertedData = applicant.metadata?.reverted_stages?.ASSESSMENT;
                    if (!revertedData) return null;
                    return (
                        <div className="mb-6 relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                                    <RefreshCw size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">Previous Score Available</h4>
                                    <p className="text-xs text-amber-700 font-medium mt-0.5">
                                        Candidate was reverted. Previous score: <strong className="text-amber-900">{revertedData.assessment_score || 'N/A'}</strong>.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (handleUpdateApplication) {
                                        const { assessment_score } = revertedData;
                                        const newRevertedStages = { ...(applicant.metadata?.reverted_stages || {}) };
                                        delete newRevertedStages.ASSESSMENT;
                                        
                                        await handleUpdateApplication(applicant.id, {
                                            assessment_score,
                                            metadata: {
                                                ...(applicant.metadata || {}),
                                                reverted_stages: newRevertedStages
                                            }
                                        });
                                        setAssessmentScore(assessment_score || '');
                                    }
                                }}
                                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
                            >
                                <RefreshCw size={14} />
                                <span>Undo Reversal</span>
                            </button>
                        </div>
                    );
                })()}
                {isNoShow ? (
                    <div className="relative bg-red-50 border border-red-200 p-8 rounded-sm overflow-hidden text-center">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                        <h3 className="text-xl font-bold text-surface-900 tracking-tight mb-2 uppercase tracking-wider text-red-600">Candidate No Show</h3>
                        <p className="text-sm text-surface-500 font-medium max-w-sm mx-auto leading-relaxed mb-6">
                            The candidate was marked as a no-show. You can restore their session below.
                        </p>
                        <div className="flex gap-3 mt-4 flex-col text-left mb-6">
                            <div className="bg-white dark:bg-slate-900 p-3 rounded border border-red-100 flex justify-between">
                                <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Category</span>
                                <span className="text-sm font-black text-surface-700">{applicant.metadata?.no_show_category || 'N/A'}</span>
                            </div>
                        </div>
                        <button
                            disabled={isRescheduling}
                            onClick={async () => {
                                setIsRescheduling(true);
                                try {
                                    await ApplicationService.updateStatus({
                                        id: applicant.id,
                                        toStatus: isTestII ? 'ASSESSMENT_II' : 'ASSESSMENT',
                                        fromStatus: applicant.current_status,
                                        changedByName: 'Recruiter',
                                        reason: 'Resumed from no show',
                                        patch: {
                                            metadata: {
                                                ...(applicant.metadata || {}),
                                                no_show_category: null
                                            }
                                        }
                                    });
                                    if (handleUpdateApplication) {
                                        await handleUpdateApplication(applicant.id, {
                                            current_status: isTestII ? 'ASSESSMENT_II' : 'ASSESSMENT',
                                            metadata: {
                                                ...(applicant.metadata || {}),
                                                no_show_category: null
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                                setIsRescheduling(false);
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span>{isRescheduling ? 'Continuing...' : 'Continue Application'}</span>
                        </button>
                    </div>
                ) : applicant.current_status === 'Marked Pending - Initial Interview' || applicant.current_status === 'Marked Pending - Final Interview' ? (
                    <div className="relative bg-amber-50 border border-amber-200 p-8 rounded-sm overflow-hidden text-center">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                        <h3 className="text-xl font-bold text-surface-900 tracking-tight mb-2 uppercase tracking-wider text-amber-600">Application Paused (Pending)</h3>
                        <p className="text-sm text-surface-500 font-medium max-w-sm mx-auto leading-relaxed mb-6">
                            This candidate has been marked as pending.
                        </p>
                        <button
                            disabled={isRescheduling}
                            onClick={async () => {
                                setIsRescheduling(true);
                                try {
                                    await ApplicationService.updateStatus({
                                        id: applicant.id,
                                        toStatus: applicant.metadata?.pending_from_status || 'ASSESSMENT',
                                        changedByName: 'Recruiter',
                                        reason: 'Overrode pending status and resumed application'
                                    });
                                    applicant.current_status = applicant.metadata?.pending_from_status || 'ASSESSMENT';
                                } catch (e) {
                                    console.error(e);
                                }
                                setIsRescheduling(false);
                            }}
                            className="w-full py-4 bg-white dark:bg-slate-900 hover:bg-amber-100 text-amber-700 font-bold text-[11px] uppercase tracking-wider rounded-sm transition-all shadow-sm border border-amber-300 flex items-center justify-center gap-2"
                        >
                            {isRescheduling ? 'Resuming...' : 'Override & Resume'}
                        </button>
                    </div>
                ) : applicant.current_status === 'RESCHEDULED' && ['ASSESSMENT', 'FOR_SCHEDULING'].includes(applicant.metadata?.rescheduled_from_status || '') ? (
                    <div className="relative bg-amber-50 border border-amber-200 p-8 rounded-sm overflow-hidden text-center">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                        <h3 className="text-xl font-bold text-surface-900 tracking-tight mb-2 uppercase tracking-wider text-amber-600">Application Paused (Rescheduled)</h3>
                        <p className="text-sm text-surface-500 font-medium max-w-sm mx-auto leading-relaxed mb-6">
                            This candidate has requested to reschedule.
                        </p>
                        <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Scheduled Date</h4>
                        <p className="text-lg text-amber-900 font-black mb-5">
                            {applicant.metadata?.reschedule_date ? new Date(applicant.metadata.reschedule_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                disabled={isRescheduling}
                                onClick={async () => {
                                    setIsRescheduling(true);
                                    try {
                                        await ApplicationService.updateStatus({
                                            id: applicant.id,
                                            toStatus: applicant.metadata?.rescheduled_from_status || 'ASSESSMENT',
                                            changedByName: 'Recruiter',
                                            reason: 'Overrode reschedule and resumed application',
                                            patch: { queue_number: null as any, queue_type: null as any }
                                        });
                                        try {
                                            const qEntries = await QueueService.getTodaysQueue();
                                            const entry = qEntries.find((e: any) => e.application_id === applicant.id);
                                            if (entry) await QueueService.delete(entry.id);
                                        } catch (qe) { console.error('Failed to remove queue entry:', qe); }
                                        applicant.current_status = applicant.metadata?.rescheduled_from_status || 'ASSESSMENT';
                                        applicant.queue_number = undefined;
                                        applicant.queue_type = undefined;
                                    } catch (e) {
                                        console.error(e);
                                    }
                                    setIsRescheduling(false);
                                }}
                                className="flex-1 py-4 bg-white dark:bg-slate-900 hover:bg-amber-100 text-amber-700 font-bold text-[11px] uppercase tracking-wider rounded-sm transition-all shadow-sm border border-amber-300 flex items-center justify-center gap-2"
                            >
                                {isRescheduling ? 'Resuming...' : 'Override & Resume'}
                            </button>
                            <button
                                disabled={isRescheduling}
                                onClick={() => setShowReschedulePrompt(true)}
                                className="flex-1 py-4 bg-white dark:bg-slate-900 hover:bg-amber-100 text-amber-700 font-bold text-[11px] uppercase tracking-wider rounded-sm transition-all shadow-sm border border-amber-300 flex items-center justify-center gap-2"
                            >
                                Reschedule Again
                            </button>
                        </div>
                        {showReschedulePrompt && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm space-y-4 shadow-sm"
                            >
                                <div>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                                        Reschedule Date
                                    </p>
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        onChange={e => setRescheduleDate(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-sm text-sm font-medium text-surface-900 focus:outline-none focus:border-slate-500"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={async () => {
                                            if (rescheduleDate) {
                                                setIsRescheduling(true);
                                                try {
                                                    await ApplicationService.updateStatus({
                                                        id: applicant.id,
                                                        toStatus: 'RESCHEDULED',
                                                        changedByName: 'Recruiter',
                                                        reason: 'Rescheduled interview again',
                                                        patch: {
                                                            queue_number: null as any,
                                                            queue_type: null as any,
                                                            metadata: {
                                                                ...(applicant.metadata || {}),
                                                                reschedule_date: rescheduleDate,
                                                                rescheduled_from_status: applicant.metadata?.rescheduled_from_status || applicant.current_status
                                                            }
                                                        }
                                                    });
                                                    try {
                                                        const qEntries = await QueueService.getTodaysQueue();
                                                        const entry = qEntries.find((e: any) => e.application_id === applicant.id);
                                                        if (entry) await QueueService.delete(entry.id);
                                                    } catch (qe) { console.error('Failed to delete queue entry:', qe); }
                                                    applicant.metadata = {
                                                        ...(applicant.metadata || {}),
                                                        reschedule_date: rescheduleDate,
                                                        rescheduled_from_status: applicant.metadata?.rescheduled_from_status || applicant.current_status
                                                    };
                                                    applicant.current_status = 'RESCHEDULED';
                                                    applicant.queue_number = undefined;
                                                    applicant.queue_type = undefined;
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                                setIsRescheduling(false);
                                                setShowReschedulePrompt(false);
                                            }
                                        }}
                                        disabled={!rescheduleDate || isRescheduling}
                                        className="flex-1 py-3.5 bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-slate-900 transition-all disabled:opacity-50"
                                    >
                                        {isRescheduling ? 'Confirming...' : 'Confirm'}
                                    </button>
                                    <button
                                        onClick={() => setShowReschedulePrompt(false)}
                                        className="px-6 py-3.5 bg-white dark:bg-slate-900 border border-surface-200 text-surface-600 font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                ) : isScoreConfirmed ? (
                    <div className="relative bg-emerald-50 border border-emerald-100 p-8 rounded-sm overflow-hidden text-center">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12" />
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                            {isTestII ? 'Confirmed Score II' : 'Confirmed Score'}
                        </p>
                        {applicant.metadata?.last_assessment_type && (
                            <p className="text-[11px] font-bold text-emerald-500/80 mb-2">
                                {getAssessmentTypeLabel(applicant.metadata.last_assessment_type)}
                            </p>
                        )}
                        <h4 className="text-3xl font-black text-emerald-700 tracking-tight">{scoreVal}</h4>

                        {/* Audit Info */}
                        <div className="mt-4 pt-4 border-t border-emerald-200/50 space-y-1.5">
                            {(applicant.pis?.last_updated_by || applicant.assigned_recruiter_name) && (
                                <p className="text-[10px] font-semibold text-emerald-600/80">
                                    Scored by <span className="font-bold text-emerald-700">{applicant.pis?.last_updated_by || applicant.assigned_recruiter_name}</span>
                                </p>
                            )}
                            {(applicant.metadata?.assessment_scored_at || applicant.metadata?.assessment_ii_scored_at || applicant.updated_at) && (
                                <p className="text-[10px] font-medium text-emerald-500/80">
                                    {new Date((isTestII ? applicant.metadata?.assessment_ii_scored_at : applicant.metadata?.assessment_scored_at) || applicant.updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            )}
                        </div>

                        {!['REJECTED', 'FAILED', 'PASSED'].includes((applicant.current_status || '').toUpperCase()) && (
                            <button
                                onClick={() => {
                                    setAssessmentScore('');
                                    if (handleUpdateApplication) {
                                        if (isTestII) {
                                            const newMeta = { ...applicant.metadata, assessment_ii_score: null };
                                            handleUpdateApplication(applicant.id, { metadata: newMeta });
                                        } else {
                                            handleUpdateApplication(applicant.id, {
                                                assessment_score: null,
                                                pis: { ...(applicant.pis || {}), leadership_score: null } as any
                                            });
                                        }
                                    }
                                }}
                                className="mt-6 px-5 py-2 bg-white dark:bg-slate-900 border border-surface-200 text-surface-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all inline-flex items-center gap-2"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                </svg>
                                Edit Score
                            </button>
                        )}
                    </div>
                ) : ['ASSESSMENT', 'FOR_SCHEDULING', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'REPROFILE_FINAL_INTERVIEW', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'For Job Offer', 'PASSED', 'HIRED'].includes(applicant.current_status || '') || (Array.isArray(applicant.metadata?.skipped_stages) ? applicant.metadata.skipped_stages : []).includes(isTestII ? 'assessment_ii' : 'assessment') ? (
                    <div className="space-y-8">
                        <div className="relative bg-white dark:bg-slate-900 border border-surface-200 rounded-sm p-8 overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-12 -mt-12 transition-transform duration-700" />

                            <div className="text-center relative flex flex-col items-center">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">Assessment Type</p>
                                <div className="inline-flex items-center gap-2 w-full max-w-[240px] mb-6">
                                    <select
                                        value={assessmentType}
                                        onChange={e => setAssessmentType(e.target.value as any)}
                                        className="w-full bg-white dark:bg-slate-900 border border-surface-300 rounded-sm px-4 py-2.5 text-center text-[13px] font-bold text-surface-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                    >
                                        {!isTestII && <option value="speechx">Speech X (CEFR)</option>}
                                        <option value="leadership">Leadership Assessment</option>
                                        {!isTestII && <option value="personality">Personality Map</option>}
                                        {!isTestII && <option value="critical_thinking">Critical Thinking Assessment</option>}
                                        {isTestII && <option value="critical_thinking_personality">Critical Thinking and Personality Map</option>}
                                        <option value="not_applicable">Not Applicable</option>
                                    </select>
                                </div>

                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">Metric Score Entry</p>
                                <div className="inline-flex items-center gap-2 w-full max-w-[240px] relative">
                                    <select
                                        value={assessmentScore}
                                        onChange={e => setAssessmentScore(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-surface-300 rounded-sm px-4 py-2.5 text-center text-lg font-bold text-surface-900 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                    >
                                        <option value="">Select Score</option>
                                        {assessmentType === 'speechx' ? (
                                            <>
                                                <option value="A1">A1 (Fail)</option>
                                                <option value="A2">A2 (Fail)</option>
                                                <option value="B1">B1 (Fail)</option>
                                                <option value="B2">B2 (Pass)</option>
                                                <option value="C1">C1 (Pass)</option>
                                                <option value="C2">C2 (Pass)</option>
                                            </>
                                        ) : assessmentType === 'not_applicable' ? (
                                            <option value="Not Applicable">Not Applicable</option>
                                        ) : (
                                            <>
                                                <option value="High">High (Pass)</option>
                                                <option value="Moderate">Moderate (Pass)</option>
                                                <option value="Low">Low (Pass)</option>
                                            </>
                                        )}
                                    </select>
                                    {!assessmentScore && (
                                        <motion.div
                                            animate={{ x: [0, -6, 0] }}
                                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none drop-shadow-sm"
                                        >
                                            <ArrowLeft size={16} strokeWidth={3} />
                                        </motion.div>
                                    )}
                                </div>
                                <div className="mt-5 w-12 h-1 bg-primary-500 mx-auto rounded-full" />
                            </div>
                        </div>

                        <div className="flex justify-center w-full my-4">
                            <button
                                onClick={async () => {
                                        const finalSpecific = `no show - Proficiency assessment ${isTestII ? '2' : '1'} ${getAssessmentTypeLabel(assessmentType)}`;
                                    try {
                                        if (handleUpdateApplication) {
                                            await handleUpdateApplication(applicant.id, {
                                                current_status: 'NO_SHOW',
                                                pis: {
                                                    ...(applicant.pis || {}),
                                                    final_specific_status: finalSpecific
                                                }
                                            });
                                            if (setModalTab) setModalTab('verdict');
                                        }
                                    } catch (err) {
                                        console.error('Failed to mark as no show:', err);
                                    }
                                }}
                                className="w-full py-3.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-[11px] uppercase tracking-wider rounded-sm transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                                Mark as No Show
                            </button>
                        </div>

                        <div className="flex justify-center w-full my-2">
                            <button
                                onClick={() => setShowReschedulePrompt(true)}
                                className="w-full py-3.5 bg-white dark:bg-slate-900 border border-amber-200 text-amber-600 font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-amber-50 transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                <Calendar size={14} /> Reschedule
                            </button>
                        </div>
                        {showReschedulePrompt && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2 mb-4 p-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-sm space-y-4"
                            >
                                <div>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                                        Reschedule Date
                                    </p>
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        onChange={e => setRescheduleDate(e.target.value)}
                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm text-sm font-medium text-surface-900 focus:outline-none focus:border-slate-500"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={async () => {
                                            if (rescheduleDate) {
                                                setIsRescheduling(true);
                                                try {
                                                    await ApplicationService.updateStatus({
                                                        id: applicant.id,
                                                        toStatus: 'RESCHEDULED',
                                                        changedByName: 'Recruiter',
                                                        reason: 'Rescheduled interview',
                                                        patch: {
                                                            metadata: {
                                                                ...(applicant.metadata || {}),
                                                                reschedule_date: rescheduleDate,
                                                                rescheduled_from_status: applicant.current_status
                                                            }
                                                        }
                                                    });
                                                    try {
                                                        const qEntries = await QueueService.getTodaysQueue();
                                                        const entry = qEntries.find((e: any) => e.application_id === applicant.id);
                                                        if (entry) await QueueService.delete(entry.id);
                                                    } catch (qe) { console.error('Failed to remove queue entry:', qe); }
                                                    applicant.metadata = {
                                                        ...(applicant.metadata || {}),
                                                        reschedule_date: rescheduleDate,
                                                        rescheduled_from_status: applicant.current_status
                                                    };
                                                    applicant.current_status = 'RESCHEDULED';
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                                setIsRescheduling(false);
                                                setShowReschedulePrompt(false);
                                            }
                                        }}
                                        disabled={!rescheduleDate || isRescheduling}
                                        className="flex-1 py-3.5 bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-slate-900 transition-all disabled:opacity-50"
                                    >
                                        {isRescheduling ? 'Confirming...' : 'Confirm'}
                                    </button>
                                    <button
                                        onClick={() => setShowReschedulePrompt(false)}
                                        className="px-6 py-3.5 bg-white dark:bg-slate-900 border border-surface-200 text-surface-600 font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {assessmentScore && (
                            <div className="flex justify-center w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="grid grid-cols-2 gap-3 mb-4 w-full">
                                    <button
                                        onClick={() => {
                                            if (!isTestII) {
                                                const isEnercare = (applicant.department || '').toLowerCase().includes('enercare');
                                                const isRegency = (applicant.department || '').toLowerCase().includes('regency');
                                                if (isEnercare || isRegency) {
                                                    setShowSecondTestPrompt(true);
                                                } else {
                                                    handleGiveGrade(applicant, assessmentType, false, isTestII, false);
                                                }
                                            } else {
                                                handleGiveGrade(applicant, assessmentType, false, isTestII);
                                            }
                                        }}
                                        className="py-4 bg-emerald-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-emerald-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        Pass
                                    </button>
                                    <button
                                        onClick={() => handleGiveGrade(applicant, assessmentType, true, isTestII)}
                                        className="py-4 bg-rose-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-rose-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                                    >
                                        Fail
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 bg-surface-50 border border-surface-200 rounded-sm text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-surface-500">
                            {['REJECTED', 'FAILED'].includes(applicant.current_status || '') ? (
                                'Stage Locked'
                            ) : ['NOT_ELIGIBLE_FOR_REHIRE', 'NOT_ELIGIBLE'].includes(applicant.current_status || '') || String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase().includes('not eligible') ? (
                                'Registry Locked'
                            ) : ['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'ACCOUNT_ASSIGNMENT'].includes(applicant.current_status || '') ? (
                                'Stage Pending'
                            ) : (
                                'Assessment Completed'
                            )}
                        </p>
                        {['REJECTED', 'FAILED'].includes(applicant.current_status || '') ? (
                            <p className="text-sm text-surface-500 font-medium">
                                Candidate has been marked as failed / rejected. Revert back to modify.
                            </p>
                        ) : ['NOT_ELIGIBLE_FOR_REHIRE', 'NOT_ELIGIBLE'].includes(applicant.current_status || '') || String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase().includes('not eligible') ? (
                            <p className="text-sm text-surface-500 font-medium">
                                Candidate has been marked as not eligible for rehire. Revert back to modify.
                            </p>
                        ) : applicant.current_status === 'WAITLISTED' ? (
                            <p className="text-sm text-surface-500 font-medium">
                                Candidate has been waitlisted.
                            </p>
                        ) : ['WITHDRAWN', 'WITHDRAWN_BY_APPLICANT'].includes(applicant.current_status || '') ? (
                            <p className="text-sm text-surface-500 font-medium">
                                Candidate has withdrawn from the application.
                            </p>
                        ) : ['BLACKLISTED', 'BLACKLIST'].includes(applicant.current_status || '') ? (
                            <p className="text-sm text-surface-500 font-medium">
                                Candidate has been blacklisted.
                            </p>
                        ) : ['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'ACCOUNT_ASSIGNMENT'].includes(applicant.current_status || '') ? (
                            <div className="flex flex-col items-center gap-4">
                                <p className="text-sm text-surface-500 font-medium">
                                    Please complete the previous stage first.
                                </p>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const rawSkipped = applicant.metadata?.skipped_stages;
                                        const parsedSkipped = Array.isArray(rawSkipped) ? rawSkipped : (typeof rawSkipped === 'string' ? (() => { try { const p = JSON.parse(rawSkipped); return Array.isArray(p) ? p : []; } catch { return []; } })() : []);
                                        const skippedStages = [...parsedSkipped];
                                        const stageToSkip = isTestII ? 'assessment_ii' : 'assessment';
                                        
                                        if (!skippedStages.includes(stageToSkip)) {
                                            skippedStages.push(stageToSkip);
                                            try {
                                                if (handleUpdateApplication) {
                                                    await handleUpdateApplication(applicant.id, {
                                                        metadata: {
                                                            ...(applicant.metadata || {}),
                                                            skipped_stages: skippedStages
                                                        }
                                                    });
                                                    // Immediately update the local object so the UI updates
                                                    applicant.metadata = {
                                                        ...(applicant.metadata || {}),
                                                        skipped_stages: skippedStages
                                                    };
                                                    // Trigger a re-render
                                                    setAssessmentScore(''); 
                                                }
                                            } catch (err) {
                                                console.error('Failed to force unlock stage:', err);
                                            }
                                        }
                                    }}
                                    className="px-4 py-2 border border-amber-500/30 text-amber-600 hover:bg-amber-50 bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Unlock size={12} />
                                    Force Unlock Stage
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-surface-500 font-medium mt-4">
                                Candidate has progressed past this stage. No score was recorded.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* 2nd Assessment Prompt Modal */}
            <AnimatePresence>
                {showSecondTestPrompt && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: -15 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-md w-full overflow-hidden border border-slate-100 p-6 flex flex-col items-center text-center relative"
                        >
                            {/* Premium Icon Badge */}
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner mb-4 relative">
                                <div className="absolute inset-0 rounded-full bg-indigo-100/60 animate-ping opacity-75" />
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="M12 8v4" />
                                    <path d="M12 16h.01" />
                                </svg>
                            </div>

                            {/* Text Content */}
                            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Additional Assessment</h4>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px]">
                                Will the candidate take a 2nd Proficiency Assessment? If yes, a new tab will be opened for grading.
                            </p>

                            {/* Modern Actions Layout */}
                            <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
                                <button
                                    onClick={() => {
                                        setShowSecondTestPrompt(false);
                                        handleGiveGrade(applicant, assessmentType, false, isTestII, false);
                                    }}
                                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer outline-none"
                                >
                                    No, Skip & Proceed
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSecondTestPrompt(false);
                                        handleGiveGrade(applicant, assessmentType, false, isTestII, true);
                                        if (setModalTab) setModalTab('assessment_ii');
                                    }}
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.35)] transition-all cursor-pointer outline-none"
                                >
                                    Yes, Proceed to Proficiency Assessment 2
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
