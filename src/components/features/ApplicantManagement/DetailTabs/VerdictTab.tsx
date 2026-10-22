import { Download, User, Mail, Briefcase, FileText, CheckCircle2, Shield, Award, GraduationCap, Activity, Search, Calendar, MapPin, Building2, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Application } from '@/types/application';
import { extractRemarks } from '../utils/evaluationHelpers';

interface VerdictTabProps {
    applicant: Application;
    showRejectionPrompt: boolean;
    setShowRejectionPrompt: (show: boolean) => void;
    rejectionReasonInput: string;
    setRejectionReasonInput: (reason: string) => void;
    handlePromote: (app: Application, result: 'pass' | 'fail', reason?: string) => void;
    onRegress?: () => void;
    onClose?: () => void;
}

const InfoBadge = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number | undefined }) => (
    <div className="flex items-start gap-3 p-3 rounded-none bg-surface-50 border border-surface-100 hover:bg-surface-100/80 transition-colors">
        <div className="p-2 bg-white dark:bg-slate-900 rounded-none shadow-none ring-1 ring-surface-200 shrink-0">
            <Icon size={16} className="text-surface-500" strokeWidth={2.5} />
        </div>
        <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-[13px] font-semibold text-surface-900 leading-tight">{value || 'N/A'}</p>
        </div>
    </div>
);

const ScoreCard = ({ title, score, subtitle, colorClass }: { title: string, score: string | number | undefined, subtitle?: string, colorClass: string }) => (
    <div className={`p-5 rounded-none border ${colorClass} bg-white dark:bg-slate-900 shadow-none hover:shadow-none transition-shadow relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${colorClass.split(' ')[0].replace('border-', 'bg-')}`} />
        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-2 relative z-10">{title}</p>
        <p className="text-3xl font-black text-surface-900 relative z-10 tracking-tight">{score || '0'}</p>
        {subtitle && <p className="text-[11px] font-bold text-surface-400 uppercase mt-1 relative z-10">{subtitle}</p>}
    </div>
);

export const VerdictTab: React.FC<VerdictTabProps> = ({
    applicant,
    onClose
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isPassed = ['PASSED', 'HIRED', 'CONDITIONAL', 'FOR_JOB_OFFER', 'For Job Offer'].includes(applicant.current_status);
    const isRejected = ['REJECTED', 'FAILED'].includes(applicant.current_status);
    const isNoShow = ['NO_SHOW', 'NO SHOW'].includes(applicant.current_status);
    const pathPrefix = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-surface-200">
                <div>
                    <h2 className="text-2xl font-black text-surface-900 tracking-tight uppercase flex items-center gap-3">
                        <Terminal size={24} className="text-primary-600" />
                        Executive Verdict Summary
                    </h2>
                    <p className="text-xs text-surface-500 font-medium uppercase tracking-widest mt-2">Comprehensive Candidate Evaluation Dossier</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => {
                            sessionStorage.setItem('spotlight_candidate_id', applicant.id);
                            if (onClose) onClose();
                            navigate(`${pathPrefix}/tracker/interview-form`);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-surface-200 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer border border-slate-250 shadow-xs outline-none"
                    >
                        <FileText size={14} />
                        Interview Form
                    </button>
                    <button
                        onClick={() => {
                            sessionStorage.setItem('spotlight_candidate_id', applicant.id);
                            if (onClose) onClose();
                            navigate(`${pathPrefix}/tracker/masterlist`);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-[0_3px_10px_rgba(37,99,235,0.2)] transition-all cursor-pointer outline-none"
                    >
                        <GraduationCap size={14} />
                        Masterlist
                    </button>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-none font-black text-xs tracking-wider uppercase border ${isPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            isRejected ? 'bg-red-50 text-red-700 border-red-200' :
                                isNoShow ? 'bg-surface-50 text-slate-700 dark:text-slate-300 border-surface-200' :
                                    'bg-surface-100 text-surface-700 border-surface-250'
                        }`}>
                        {isPassed && <CheckCircle2 size={14} strokeWidth={3} />}
                        {isRejected && <Shield size={14} strokeWidth={3} />}
                        {isNoShow && <User size={14} strokeWidth={3} />}
                        {!isPassed && !isRejected && !isNoShow && <Activity size={14} strokeWidth={3} />}
                        {(() => {
                            if (isNoShow) {
                                const spec = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase();
                                if (spec.includes('final interviewer') || spec.includes('Final Interview')) {
                                    return 'final interviewer - No Show';
                                }
                                return 'No Show';
                            }
                            return applicant.current_status.replace(/_/g, ' ');
                        })()}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Profile & Process */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-none border border-surface-200 shadow-none p-6">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-surface-400 flex items-center gap-2 mb-5">
                            <User size={14} /> Profile Intelligence
                        </h3>
                        <div className="space-y-3">
                            <InfoBadge icon={User} label="Full Name" value={applicant.applicant_name} />
                            <InfoBadge icon={Mail} label="Contact Email" value={applicant.applicant_email} />
                            <InfoBadge icon={Briefcase} label="Target Position" value={applicant.position_title} />
                            {applicant.pis?.highest_education && (
                                <InfoBadge icon={GraduationCap} label="Highest Education" value={applicant.pis.highest_education} />
                            )}
                            {applicant.pis?.current_address && (
                                <InfoBadge icon={MapPin} label="Current Location" value={applicant.pis.current_address} />
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-none border border-surface-200 shadow-none p-6 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
                            <Award size={120} className="-mr-6 -mb-6" />
                        </div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-surface-400 flex items-center gap-2 mb-5 relative z-10">
                            <Activity size={14} /> Process Trajectory
                        </h3>
                        <div className="space-y-4 relative z-10">
                            <div>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Acquisition Source</p>
                                <p className="text-sm font-semibold text-surface-800">{applicant.source || 'Standard Application'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Endorsed Department</p>
                                <p className="text-sm font-semibold text-primary-700 flex items-center gap-2">
                                    <Building2 size={14} />
                                    {applicant.pis?.final_account || applicant.department || 'Pending Allocation'}
                                </p>
                            </div>
                            {isRejected && applicant.rejection_reason && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-none">
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Rejection Rationale</p>
                                    <p className="text-xs font-semibold text-red-800 leading-relaxed italic">"{applicant.rejection_reason}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Scores & Remarks */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-none border border-surface-200 shadow-none p-6">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-surface-400 flex items-center gap-2 mb-5">
                            <Activity size={14} /> Performance Metrics
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <ScoreCard
                                title="Typing Speed"
                                score={`${applicant.typing_test_wpm || 0} WPM`}
                                subtitle={`${applicant.typing_test_accuracy || 0}% Accuracy`}
                                colorClass="border-blue-200 hover:border-blue-300"
                            />
                            <ScoreCard
                                title="Technical Score"
                                score={`${applicant.assessment_score || 0}${applicant.assessment_score && !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(String(applicant.assessment_score).toUpperCase()) ? '%' : ''}`}
                                subtitle="Core Assessment"
                                colorClass="border-purple-200 hover:border-purple-300"
                            />
                            {applicant.pis?.leadership_score && (
                                <ScoreCard
                                    title="Leadership"
                                    score={applicant.pis.leadership_score}
                                    subtitle="Assessment Score"
                                    colorClass="border-amber-200 hover:border-amber-300"
                                />
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-none border border-surface-200 shadow-none p-6">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-surface-400 flex items-center gap-2 mb-6">
                            <Search size={14} /> Evaluator Remarks & Observations
                        </h3>

                        <div className="space-y-6">
                            {/* Final Interview Notes */}
                            <div className="relative pl-6 border-l-2 border-primary-200">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-100 ring-4 ring-white flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                                </div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-2 flex justify-between items-center">
                                    Operations Validation Remarks
                                </h4>
                                <p className="text-[13px] text-surface-800 leading-relaxed font-medium bg-surface-50 p-4 rounded-none border border-surface-100">
                                    {(() => {
                                        const appPis = applicant.pis || {};
                                        const appMeta = applicant.metadata || {};
                                        const r = appPis.ops_validator_notes?.trim() ||
                                                  appPis.ops_validation_remarks?.trim() ||
                                                  (appPis as any).ops_val_notes?.trim() ||
                                                  appMeta.ops_validator_notes?.trim() ||
                                                  appMeta.ops_validation_remarks?.trim() ||
                                                  (applicant as any)?.ops_validator_notes?.trim() ||
                                                  applicant.final_interview_notes?.trim() ||
                                                  (applicant as any).master_remarks?.trim() ||
                                                  '';
                                        return extractRemarks(r) || 'No final validation notes recorded.';
                                    })()}
                                </p>
                            </div>

                            {/* Initial Notes */}
                            {applicant.interview_notes && (
                                <div className="relative pl-6 border-l-2 border-indigo-200">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-100 ring-4 ring-white flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                    </div>
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-2">
                                        Initial Screening Intelligence
                                    </h4>
                                    <p className="text-[13px] text-surface-700 leading-relaxed italic bg-indigo-50/50 p-4 rounded-none border border-indigo-50">
                                        {applicant.interview_notes}
                                    </p>
                                </div>
                            )}

                            {/* Attachments */}
                            {applicant.pis?.ops_validator_attachment_data && (
                                <div className="relative pl-6 border-l-2 border-emerald-200 pt-2">
                                    <div className="absolute -left-[9px] top-[14px] w-4 h-4 rounded-full bg-emerald-100 ring-4 ring-white flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                    </div>
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-3">
                                        Validation Evidence
                                    </h4>
                                    <a
                                        href={applicant.pis.ops_validator_attachment_data}
                                        download={applicant.pis.ops_validator_attachment_name || 'ops_val_attachment'}
                                        className="group inline-flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-none rounded-none text-[13px] font-bold text-emerald-800 transition-all"
                                    >
                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-none group-hover:bg-emerald-200 transition-colors">
                                            <Download size={16} strokeWidth={2.5} />
                                        </div>
                                        <span className="truncate max-w-[250px]">{applicant.pis.ops_validator_attachment_name || 'Download Evidence Attachment'}</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

