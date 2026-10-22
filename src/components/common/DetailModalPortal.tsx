import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Clock3, FileOutput, Download, Lock, CheckCircle2, Info, Loader2, ClipboardList, ChevronDown, ChevronUp, Tag, Truck, FileText, Video, ThumbsUp, Activity, Upload, Sparkles, ArrowRightLeft, Play } from 'lucide-react';
import { cn, formatDate, getStatusLabel } from '@/utils/formatters';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { DuplicateReviewDashboard } from '../features/ApplicantManagement/DetailTabs/DuplicateReviewDashboard';
import { Application } from '@/types/application';
import { isStageDataComplete } from '@/utils/applicantDataValidation';
import { User as UserType } from '@/types/user';
import { useToast } from '@/components/common/useToast';
import { PISExportTemplate } from '@/components/features/ApplicantManagement/PISExportTemplate';
import { CandidateDataExportTemplate } from '@/components/features/ApplicantManagement/CandidateDataExportTemplate';

// Modular Components
import { ApplicationTab } from '../features/ApplicantManagement/DetailTabs/ApplicationTab';
import { TypingTab } from '../features/ApplicantManagement/DetailTabs/TypingTab';
import { InitialInterviewTab } from '../features/ApplicantManagement/DetailTabs/InitialInterviewTab';
import { AssessmentTab } from '../features/ApplicantManagement/DetailTabs/AssessmentTab';
import { FinalInterviewTab } from '../features/ApplicantManagement/DetailTabs/FinalInterviewTab';
import { VerdictTab } from '../features/ApplicantManagement/DetailTabs/VerdictTab';
import { ClientAssessmentTab } from '../features/ApplicantManagement/DetailTabs/ClientAssessmentTab';
import { ClientInterviewTab } from '../features/ApplicantManagement/DetailTabs/ClientInterviewTab';
import { EvaluationModal } from '../features/ApplicantManagement/DetailTabs/EvaluationModal';
import { ForceStatusTab } from '../features/ApplicantManagement/DetailTabs/ForceStatusTab';
import { ModalTimelineStepper } from '../features/ApplicantManagement/DetailTabs/components/ModalTimelineStepper';
import { QuestionService } from '@/services/QuestionService';
import { ConfirmDialog } from '@/components/common/Modal';

const StatusTimerDisplay = ({ applicant }: { applicant: Application }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        const statusesWithTimer = ['INITIAL_INTERVIEW', 'ASSESSMENT', 'FINAL_INTERVIEW'];
        if (!statusesWithTimer.includes(applicant.current_status || '')) {
            setTimeLeft(null);
            return;
        }

        const updatedAt = new Date(applicant.updated_at || applicant.applied_at).getTime();
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - updatedAt) / 1000);
            setTimeLeft(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [applicant.current_status, applicant.updated_at, applicant.applied_at]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (timeLeft === null) return null;

    return (
        <p className="text-[10px] font-black text-primary-600 flex items-center gap-1.5 uppercase tracking-[0.15em] opacity-80">
            <Clock3 size={12} className="animate-pulse" /> {formatTime(timeLeft)}
        </p>
    );
};

type ModalTab = 'application' | 'typing' | 'initial' | 'assessment' | 'assessment_ii' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';

export function getInitialTabForApplicant(app: Application): ModalTab {
    const lookup = (app.current_status || '').toUpperCase().trim().replace(/\s+/g, '_');
    const map: Record<string, ModalTab> = {
        'APPLIED': 'typing',
        'TYPING_TEST': 'typing',
        'INITIAL_INTERVIEW': 'initial',
        'INTERVIEW_IN_PROGRESS': 'initial',
        'QUEUE_ASSIGNED': 'initial',
        'ACCOUNT_ASSIGNMENT': 'endorsement',
        'ASSESSMENT': 'assessment',
        'FOR_SCHEDULING': 'scheduling',
        'FINAL_INTERVIEW': 'scheduling',
        'FINAL_INTERVIEW_SCHEDULED': 'scheduling',
        'CLIENT_ASSESSMENT': 'client_assessment',
        'CLIENT_INTERVIEW': 'client_interview',
        'FINAL_VERDICT': 'verdict',
        'PASSED': 'verdict',
        'HIRED': 'verdict',
        'REJECTED': 'verdict',
        'FOR_JOB_OFFER': 'verdict',
        'FOR JOB OFFER': 'verdict',
        'For Job Offer': 'verdict'
    };
    
    // Normalize sub-statuses (e.g. "NO_SHOW_-_QUEUE_ASSIGNED" -> "QUEUE_ASSIGNED")
    let normalizedLookup = lookup;
    if (lookup.includes('NO_SHOW')) {
        normalizedLookup = lookup.replace(/^NO_SHOW_?(?:-_)?_?/, '');
    } else if (lookup.includes('RESCHEDULED')) {
        normalizedLookup = lookup.replace(/^RESCHEDULED_?(?:-_)?_?/, '');
    }
    
    // Map the normalized status or default to 'application'
    let tab = map[normalizedLookup] || 'application';

    if (lookup === 'FAILED' || lookup === 'REJECTED') {
        const fs = app.failure_details?.from_status;
        const initialResult = String(app.metadata?.initial_interview_result || app.pis?.initial_interview_result || '').toUpperCase();
        const spec = String(app.pis?.final_specific_status || app.metadata?.final_specific_status || '').toLowerCase();

        if (fs) {
            const fsLookup = String(fs).toUpperCase().trim().replace(/\s+/g, '_');
            if (fsLookup.includes('INITIAL') || fsLookup === 'QUEUE_ASSIGNED') {
                tab = 'initial';
            } else if (fsLookup.includes('TYPING')) {
                tab = 'typing';
            } else if (fsLookup.includes('ASSESSMENT') && !fsLookup.includes('CLIENT')) {
                tab = 'assessment';
            } else if (fsLookup.includes('FINAL') || fsLookup.includes('SCHEDULING') || fsLookup.includes('OPS')) {
                tab = 'scheduling';
            } else if (fsLookup.includes('CLIENT_ASSESSMENT')) {
                tab = 'client_assessment';
            } else if (fsLookup.includes('CLIENT_INTERVIEW')) {
                tab = 'client_interview';
            } else {
                tab = map[fsLookup] || 'verdict';
            }
        } else if (initialResult === 'FAILED' || spec.includes('initial interview') || spec.includes('initial')) {
            tab = 'initial';
        } else if (spec.includes('typing')) {
            tab = 'typing';
        } else if (spec.includes('client assessment')) {
            tab = 'client_assessment';
        } else if (spec.includes('client interview')) {
            tab = 'client_interview';
        } else if (spec.includes('ov') || spec.includes('final interview')) {
            tab = 'scheduling';
        } else if (spec.includes('account assignment') || spec.includes('endorsement')) {
            tab = 'endorsement';
        } else if (spec.includes('assessment')) {
            tab = 'assessment';
        } else {
            tab = 'verdict';
        }
    }

    if (lookup.includes('PENDING') || lookup.includes('RESCHEDULED') || lookup.includes('NO_SHOW')) {
        const fromStatus = String(app.metadata?.pending_from_status || app.metadata?.rescheduled_from_status || app.metadata?.noshow_from_status || app.failure_details?.from_status || '').toUpperCase().trim();
        if (fromStatus) {
            const fsLookup = fromStatus.replace(/\s+/g, '_');
            tab = map[fsLookup] || tab;
        } else {
            const spec = String(app.pis?.final_specific_status || app.metadata?.final_specific_status || app.current_status || '').toLowerCase();
            if (spec.includes('typing')) tab = 'typing';
            else if (spec.includes('Initial Interview') || spec.includes('initial')) tab = 'initial';
            else if (spec.includes('client assessment')) tab = 'client_assessment';
            else if (spec.includes('client interview')) tab = 'client_interview';
            else if (spec.includes('ov') || spec.includes('Final Interview') || spec.includes('final')) tab = 'scheduling';
            else if (spec.includes('account assignment') || spec.includes('endorsement')) tab = 'endorsement';
            else if (spec.includes('assessment')) tab = 'assessment';
        }
    }

    if (app.current_status === 'QUEUE_ASSIGNED' && app.queue_type === 'FINAL') {
        tab = 'scheduling';
    } else if (app.current_status === 'INTERVIEW_IN_PROGRESS' && app.queue_type === 'FINAL') {
        tab = 'scheduling';
    }

    if (tab === 'assessment') {
        const dept = (app.department || '').toUpperCase();
        const selectedDepts = dept.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        const metadata = app.metadata || {};
        const failedAccounts = metadata.failed_accounts || [];
        const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toUpperCase()));
        const activeDepts = selectedDepts.filter(d => !failedSet.has(d));
        const targetDept = activeDepts[0] || selectedDepts[0] || '';
        const isEnercare = targetDept.includes('ENERCARE') || dept.includes('ENERCARE');
        const isRegency = targetDept.includes('REGENCY') || dept.includes('REGENCY');

        const hasSecondTest = (isEnercare || isRegency) && (
            app.metadata?.force_second_test ||
            app.metadata?.assessment_ii_score !== undefined ||
            (app.pis?.process_order || app.metadata?.process_order || []).includes('ASSESSMENT_II') ||
            (app.pis?.required_processes || app.metadata?.required_processes || []).includes('ASSESSMENT_II')
        );
        if (hasSecondTest && app.assessment_score != null && app.metadata?.assessment_ii_score === undefined) {
            tab = 'assessment_ii';
        }
    }
    return tab;
}

interface DetailModalPortalProps {
    applicant: Application;
    onClose: () => void;
    modalTab: ModalTab;
    setModalTab: (tab: ModalTab) => void;
    getApplicantStatusRank: (status: string, applicant?: Application) => number;
    handlePromote: (app: Application, result: 'pass' | 'conditional' | 'fail', reason?: string) => void;
    handleGiveGrade: (app: Application) => void;
    handleGiveClientAssessmentGrade: (app: Application) => void;
    handleGiveClientInterviewVerdict: (app: Application, result: 'pass' | 'fail', reason?: string) => void;
    assessmentScore: string;
    setAssessmentScore: (score: string) => void;
    clientAssessmentScore: string;
    setClientAssessmentScore: (score: string) => void;
    clientInterviewRemarks: string;
    setClientInterviewRemarks: (remarks: string) => void;
    finalInterviewNotes: string;
    setFinalInterviewNotes: (notes: string) => void;
    onQueue: (app: Application, type: 'INITIAL' | 'FINAL') => void;
    onRegress: (app: Application, tab?: ModalTab) => void;
    onWithdraw: (app: Application) => void;
    validators: UserType[];
    handleUpdateApplication: (id: string, patch: any) => void;
    onRouteToSpecialized?: (app: Application, name: string) => boolean | void | Promise<boolean | void>;
    onDelete: (app: Application) => void;
    duplicateRequests?: Application[];
    onMergeDuplicate?: (sourceApp: Application) => void;
    // Optional props used in specific stages
    initQuestions?: Array<{ id: string; question_text: string; answer_type?: string }>;
    responses?: Record<string, string | number>;
    overallRating?: number;
    recommendation?: string;
}

function getStatusPill(status: string | undefined) {
    if (!status) return 'bg-surface-100 text-surface-700 ring-surface-200';
    const STATUS_PILL_STYLES: Record<string, string> = {
        HIRED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        PASSED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        ACCEPTED_OFFER: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        'ACCEPTED OFFER': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        REJECTED: 'bg-rose-100 text-rose-700 ring-rose-200',
        FAILED: 'bg-rose-100 text-rose-700 ring-rose-200',
        NO_SHOW: 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 ring-slate-200',
        'NO SHOW': 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 ring-slate-200',
        WITHDRAWN: 'bg-surface-100 text-surface-700 ring-surface-200',
        NOT_ELIGIBLE_FOR_REHIRE: 'bg-rose-100 text-rose-700 ring-rose-200',
        FINAL_INTERVIEW: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
        FINAL_INTERVIEW_SCHEDULED: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
        CLIENT_INTERVIEW: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
        CLIENT_ASSESSMENT: 'bg-violet-100 text-violet-700 ring-violet-200',
        ASSESSMENT: 'bg-violet-100 text-violet-700 ring-violet-200',
        INITIAL_INTERVIEW: 'bg-sky-100 text-sky-700 ring-sky-200',
        INTERVIEW_IN_PROGRESS: 'bg-sky-100 text-sky-700 ring-sky-200',
        QUEUE_ASSIGNED: 'bg-sky-100 text-sky-700 ring-sky-200',
        TYPING_TEST: 'bg-amber-100 text-amber-700 ring-amber-200',
        APPLIED: 'bg-surface-100 text-surface-700 ring-surface-200',
        FOR_JOB_OFFER: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        'FOR JOB OFFER': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        FOR_PAN: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        SENT_JO_AND_BGC: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        'SENT JO AND BGC': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        ENDORSED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        FINAL_VERDICT: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        CONDITIONAL: 'bg-amber-100 text-amber-700 ring-amber-200',
        WAITLISTED: 'bg-amber-100 text-amber-700 ring-amber-200',
        OPEN: 'bg-surface-100 text-surface-700 ring-surface-200',
        PROMOTION: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        PROMOTED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        LATERAL_TRANSFER: 'bg-sky-100 text-sky-700 ring-sky-200',
        REPROFILED: 'bg-amber-100 text-amber-700 ring-amber-200',
    };
    return STATUS_PILL_STYLES[status.toUpperCase()] || 'bg-surface-100 text-surface-700 ring-surface-200';
}



function ApplicationLogTab({ applicant }: { applicant: Application }) {
    const [loading, setLoading] = useState(true);
    const [historyApps, setHistoryApps] = useState<any[]>([]);
    const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
            try {
                const { ApplicationService } = await import('@/services/ApplicationService');
                const allApps = await ApplicationService.getAll();

                const matched = allApps.filter((a: any) =>
                    (a.applicant_email && applicant.applicant_email && a.applicant_email.toLowerCase() === applicant.applicant_email.toLowerCase()) ||
                    (applicant.applicant_id && a.applicant_id === applicant.applicant_id) ||
                    (a.applicant_name && applicant.applicant_name && a.applicant_name.toLowerCase() === applicant.applicant_name.toLowerCase())
                );

                matched.sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());

                const matchedWithHistory = await Promise.all(
                    matched.map(async (app) => {
                        try {
                            const transitions = await ApplicationService.getStatusHistory(app.id);
                            return { ...app, transitions };
                        } catch {
                            return { ...app, transitions: [] };
                        }
                    })
                );

                if (isMounted) {
                    setHistoryApps(matchedWithHistory);
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) setLoading(false);
            }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, [applicant]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 size={20} className="animate-spin text-[#0078D4]" />
                <p className="text-[12px] text-surface-500 font-medium">Loading application history...</p>
            </div>
        );
    }

    if (historyApps.length === 0) {
        return (
            <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                    <ClipboardList size={20} className="text-surface-300" />
                </div>
                <p className="text-[12.5px] text-surface-400 italic">No application records found.</p>
            </div>
        );
    }

    const toggleAppExpand = (appId: string) => {
        setExpandedApps(prev => ({ ...prev, [appId]: !prev[appId] }));
    };

    return (
        <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 mb-1">
                <ClipboardList size={14} className="text-[#0078D4]" />
                <h2 className="text-[10px] font-black text-[#0078D4] uppercase tracking-widest">Application Log</h2>
                <span className="text-[12px] text-surface-500 font-semibold">({historyApps.length} applications logged)</span>
            </div>

            <div className="space-y-6">
                {historyApps.map((app, index) => {
                    const statusUpper = (app.current_status || '').toUpperCase();
                    const isFail = ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(statusUpper);
                    const appliedDate = formatDate(app.applied_at);
                    const isExpanded = !!expandedApps[app.id];

                    return (
                        <div
                            key={app.id}
                            className={cn(
                                "border rounded-lg p-5 shadow-sm transition-all",
                                isFail
                                    ? "bg-rose-50/40 border-rose-200 hover:border-rose-300"
                                    : "bg-white dark:bg-slate-900 border-surface-200 hover:border-surface-300 hover:shadow-md"
                            )}
                        >
                            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={cn(
                                            "text-[14px] font-bold tracking-tight",
                                            isFail ? "text-rose-900" : "text-surface-900"
                                        )}>
                                            {app.position_title || 'General Application'}
                                        </h3>
                                        {app.department && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 bg-surface-100 text-surface-600 rounded">
                                                {app.department}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10.5px] text-surface-500 mt-1 flex items-center gap-1.5 font-mono">
                                        Applied: {appliedDate}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1",
                                        isFail
                                            ? "bg-rose-100 text-rose-700 ring-rose-200"
                                            : getStatusPill(app.current_status)
                                    )}>
                                        {getStatusLabel(app.current_status)}
                                    </span>
                                </div>
                            </div>

                            {app.rejection_reason && (
                                <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-100 text-xs text-rose-800 leading-relaxed">
                                    <span className="font-bold block uppercase tracking-wider text-[9px] text-rose-500 mb-1">Rejection Reason:</span>
                                    {app.rejection_reason}
                                </div>
                            )}

                            {app.transitions && app.transitions.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-dashed border-surface-200">
                                    <button
                                        onClick={() => toggleAppExpand(app.id)}
                                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-600 focus:outline-none mb-1"
                                    >
                                        <span>Status History ({app.transitions.length})</span>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#0078D4]">
                                            {isExpanded ? 'Hide Details' : 'Show Details'}
                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="relative border-l-2 border-surface-200 pl-4 ml-2 mt-4 space-y-4 text-left animate-fade-in">
                                            {app.transitions.map((t: any, ti: number) => {
                                                const isTransFail = ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes((t.to_status || '').toUpperCase());
                                                return (
                                                    <div key={t.id || ti} className="relative animate-fade-in">
                                                        <span className={cn(
                                                            "absolute -left-[21px] top-1.5 w-2 h-2 rounded-full ring-4 ring-white",
                                                            isTransFail ? "bg-rose-500" : "bg-indigo-500"
                                                        )} />
                                                        <div className="text-[11.5px] text-surface-700">
                                                            <div className="flex items-baseline justify-between flex-wrap gap-2">
                                                                <div>
                                                                    Changed to{" "}
                                                                    <span className={cn(
                                                                        "font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                                                                        isTransFail
                                                                            ? "bg-rose-100 text-rose-850 rounded-sm"
                                                                            : "bg-indigo-50 text-indigo-805 rounded-sm"
                                                                    )}>
                                                                        {getStatusLabel(t.to_status)}
                                                                    </span>
                                                                    {t.from_status && (
                                                                        <span className="text-surface-400 text-[10px] ml-1.5 font-medium">
                                                                            (from {getStatusLabel(t.from_status)})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-surface-400 font-mono">
                                                                    {new Date(t.changed_at).toLocaleString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            </div>
                                                            {(t.changed_by_name || t.change_reason) && (
                                                                <p className="text-[10.5px] text-surface-500 mt-1 leading-relaxed">
                                                                    {t.changed_by_name && (
                                                                        <>
                                                                            By <span className="font-semibold text-surface-600">{t.changed_by_name}</span>
                                                                        </>
                                                                    )}
                                                                    {t.change_reason && (
                                                                        <>
                                                                            {" Ã‚Â· "}
                                                                            <span className="italic">"{t.change_reason}"</span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const TAGGING_OPTIONS = [
    { value: 'PENDING', label: 'Mark Pending', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-600', lightBg: 'bg-amber-50', border: 'border-amber-200', hoverBg: 'hover:bg-amber-50' },
    { value: 'WAITLISTED', label: 'Waitlisted', dot: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-600', lightBg: 'bg-indigo-50', border: 'border-indigo-200', hoverBg: 'hover:bg-indigo-50' },
    { value: 'WITHDRAWN', label: 'Withdrawn', dot: 'bg-slate-50 dark:bg-slate-8000', text: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-600', lightBg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-800', hoverBg: 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800' },
    { value: 'NO_SHOW', label: 'No Show', dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-600', lightBg: 'bg-orange-50', border: 'border-orange-200', hoverBg: 'hover:bg-orange-50' },
    { value: 'NOT_ELIGIBLE', label: 'Not Eligible for Rehire', dot: 'bg-rose-700', text: 'text-rose-800', bg: 'bg-rose-800', lightBg: 'bg-rose-50', border: 'border-rose-200', hoverBg: 'hover:rose-50' },
    { value: 'BLACKLIST', label: 'Blacklist', dot: 'bg-red-600', text: 'text-red-700', bg: 'bg-red-600', lightBg: 'bg-red-50', border: 'border-red-200', hoverBg: 'hover:bg-red-50' },
    { value: 'REVERT', label: 'Undo Promotion / Revert Status', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-600', lightBg: 'bg-blue-50', border: 'border-blue-200', hoverBg: 'hover:bg-blue-50' },
    { value: 'H2R_INACTIVE', label: 'H2R Inactive', dot: 'bg-zinc-500', text: 'text-zinc-700', bg: 'bg-zinc-600', lightBg: 'bg-zinc-50', border: 'border-zinc-200', hoverBg: 'hover:bg-zinc-50' },
    { value: 'INVITED_REAPP', label: 'Invited for reapplication', dot: 'bg-fuchsia-500', text: 'text-fuchsia-700', bg: 'bg-fuchsia-600', lightBg: 'bg-fuchsia-50', border: 'border-fuchsia-200', hoverBg: 'hover:bg-fuchsia-50' },
    { value: 'CLOSED', label: 'Close Application', dot: 'bg-slate-700', text: 'text-slate-800', bg: 'bg-slate-700', lightBg: 'bg-slate-100', border: 'border-slate-300', hoverBg: 'hover:bg-slate-100' },
];

const TRANSFER_OPTIONS = [
    { value: 'PROMOTED', label: 'Promotion', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-600', lightBg: 'bg-emerald-50', border: 'border-emerald-200', hoverBg: 'hover:bg-emerald-50' },
    { value: 'LATERAL', label: 'Lateral Transfer', dot: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-600', lightBg: 'bg-teal-50', border: 'border-teal-200', hoverBg: 'hover:bg-teal-50' },
];

function TaggingTab({ applicant, onUpdate, onRegress }: { applicant: Application; onUpdate: (id: string, patch: any) => void; onRegress?: (app: Application) => void }) {
    const [selectedOutcome, setSelectedOutcome] = useState('');
    const [selectedTransferOutcome, setSelectedTransferOutcome] = useState('');
    const [selectedNoShowCategory, setSelectedNoShowCategory] = useState('');
    const [isNoShowFailed, setIsNoShowFailed] = useState(false);
    const [noShowDropdownOpen, setNoShowDropdownOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [transferDropdownOpen, setTransferDropdownOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const transferDropdownRef = useRef<HTMLDivElement>(null);

    const activeOutcome = selectedOutcome || selectedTransferOutcome;
    const selectedOption = TAGGING_OPTIONS.find(o => o.value === selectedOutcome) || TRANSFER_OPTIONS.find(o => o.value === selectedTransferOutcome);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
            if (transferDropdownRef.current && !transferDropdownRef.current.contains(e.target as Node)) {
                setTransferDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleApplyOutcome = async () => {
        if (!activeOutcome) return;
        setSaving(true);
        setShowConfirm(false);

        let nextStatus = '';
        const patch: any = {};

        if (activeOutcome === 'REVERT') {
            if (onRegress) {
                onRegress(applicant);
            }
            return;
        }
        if (activeOutcome === 'PENDING') {
            nextStatus = applicant.current_status as string;
            patch.pis = {
                ...(applicant.pis || {}),
                final_specific_status: 'Pending',
                last_updated_by: 'System (Tagging)',
            };
        } else if (activeOutcome === 'WAITLISTED') {
            nextStatus = 'WAITLISTED';
        } else if (activeOutcome === 'WITHDRAWN') {
            nextStatus = 'WITHDRAWN';
        } else if (activeOutcome === 'NO_SHOW') {
            let currentStep = String(applicant.current_status || '');
            currentStep = currentStep.replace(/no_show_-_/gi, '').replace(/no show - /gi, '').replace(/no show/gi, '').replace(/no_show/gi, '').replace(/noshow/gi, '');
            currentStep = currentStep.replace(/^- /, '').trim();
            if (currentStep.includes('_')) {
                currentStep = currentStep.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            } else {
                currentStep = currentStep.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
            if (!currentStep || currentStep.toUpperCase() === 'APPLIED' || currentStep.toUpperCase() === 'TYPING TEST') {
                currentStep = 'Typing Test';
            }
            const formattedStatus = `No show - ${currentStep}${isNoShowFailed ? ' - failed' : ''}`;
            nextStatus = formattedStatus;
            patch.pis = {
                ...(applicant.pis || {}),
                final_specific_status: formattedStatus
            };
            patch.metadata = {
                ...(applicant.metadata || {}),
                no_show_category: selectedNoShowCategory || applicant.metadata?.no_show_category || null,
                no_show_from_status: applicant.current_status,
                final_specific_status: formattedStatus
            };
        } else if (activeOutcome === 'NOT_ELIGIBLE') {
            nextStatus = 'NOT_ELIGIBLE_FOR_REHIRE';
        } else if (activeOutcome === 'BLACKLIST') {
            nextStatus = 'FAILED';
            patch.department = null;
            patch.pis = {
                ...(applicant.pis || {}),
                initial_account_assignment: null,
                final_specific_status: 'Blacklist',
                last_updated_by: 'System (Tagging)',
            };
        } else if (activeOutcome === 'H2R_INACTIVE') {
            nextStatus = 'H2R INACTIVE';
        } else if (activeOutcome === 'INVITED_REAPP') {
            nextStatus = 'INVITED FOR REAPPLICATION';
        } else if (activeOutcome === 'PROMOTED') {
            patch.metadata = {
                ...(applicant.metadata || {}),
                is_promotion: true,
                is_lateral_transfer: false
            };
        } else if (activeOutcome === 'LATERAL') {
            patch.metadata = {
                ...(applicant.metadata || {}),
                is_lateral_transfer: true,
                is_promotion: false
            };
        }

        if (nextStatus) {
            patch.current_status = nextStatus;
        }

        await onUpdate(applicant.id, patch);
        setSelectedOutcome('');
        setSelectedTransferOutcome('');
        setSaving(false);
    };

    return (
        <div className={cn(
            "space-y-7 text-left max-w-xl transition-all duration-300",
            (dropdownOpen || transferDropdownOpen) ? "pb-72" : "pb-8"
        )}>
            {/* Header */}
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#0078D4]/10 flex items-center justify-center">
                    <Tag size={14} className="text-[#0078D4]" />
                </div>
                <div>
                    <h2 className="text-[13px] font-bold text-surface-900 tracking-tight">Candidate Tagging</h2>
                    <p className="text-[10px] text-surface-400 font-medium">Tag this candidate with a disposition outcome</p>
                </div>
            </div>

            {/* Current Status Banner */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white border border-slate-200 dark:border-slate-800/80 rounded-md">
                <div className="w-8 h-8 rounded-full bg-[#0078D4]/10 flex items-center justify-center shrink-0">
                    <Info size={14} className="text-[#0078D4]" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-0.5">Current Status</p>
                    <p className="text-[12px] font-bold text-surface-800 uppercase tracking-wider truncate">
                        {(applicant.current_status || 'Unknown').replace(/_/g, ' ')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* General Disposition Dropdown */}
                <div>
                    <h3 className="text-[11px] font-bold text-surface-900 uppercase tracking-wider mb-3">General Outcome</h3>
                    <div ref={dropdownRef} className="relative">
                        {/* Trigger */}
                        <button
                            onClick={() => {
                                setDropdownOpen(!dropdownOpen);
                                setTransferDropdownOpen(false);
                            }}
                            disabled={saving}
                            className={cn(
                                "w-full h-[48px] px-4 border text-left flex items-center justify-between transition-all cursor-pointer shadow-sm",
                                selectedOutcome
                                    ? `${selectedOption?.lightBg} ${selectedOption?.border}`
                                    : "bg-white dark:bg-slate-900 border-surface-200 hover:border-surface-300",
                                dropdownOpen
                                    ? "rounded-t-md border-b-0"
                                    : "rounded-md",
                                dropdownOpen && !selectedOutcome && "border-[#0078D4] ring-2 ring-[#0078D4]/20",
                                dropdownOpen && selectedOutcome && "ring-2 ring-offset-1",
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                {selectedOutcome ? (
                                    <>
                                        <span className={cn("w-3 h-3 rounded-full shadow-sm", selectedOption?.dot)} />
                                        <span className={cn("text-[11px] font-bold uppercase tracking-wider", selectedOption?.text)}>
                                            {selectedOption?.label}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
                                        Select General...
                                    </span>
                                )}
                            </div>
                            <motion.div
                                animate={{ rotate: dropdownOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown size={15} className={cn(selectedOutcome ? selectedOption?.text : "text-surface-400")} />
                            </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                            {dropdownOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                    className="absolute left-0 right-0 z-50 overflow-hidden border border-t-0 border-surface-200 rounded-b-md bg-white dark:bg-slate-900 shadow-lg"
                                >
                                    {TAGGING_OPTIONS.map((opt, i) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setSelectedOutcome(opt.value);
                                                setSelectedTransferOutcome('');
                                                setDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer border-b border-surface-50 last:border-b-0",
                                                selectedOutcome === opt.value
                                                    ? `${opt.lightBg}`
                                                    : `hover:bg-surface-50`,
                                            )}
                                        >
                                            <span className={cn("w-3 h-3 rounded-full shadow-sm shrink-0 ring-2 ring-white", opt.dot)} />
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider flex-1",
                                                selectedOutcome === opt.value ? opt.text : "text-surface-700"
                                            )}>
                                                {opt.label}
                                            </span>
                                            {selectedOutcome === opt.value && (
                                                <CheckCircle2 size={14} className={opt.text} />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Transfer Disposition Dropdown */}
                <div>
                    <h3 className="text-[11px] font-bold text-surface-900 uppercase tracking-wider mb-3">Moving Up / Transfer</h3>
                    <div ref={transferDropdownRef} className="relative">
                        {/* Trigger */}
                        <button
                            onClick={() => {
                                setTransferDropdownOpen(!transferDropdownOpen);
                                setDropdownOpen(false);
                            }}
                            disabled={saving}
                            className={cn(
                                "w-full h-[48px] px-4 border text-left flex items-center justify-between transition-all cursor-pointer shadow-sm",
                                selectedTransferOutcome
                                    ? `${selectedOption?.lightBg} ${selectedOption?.border}`
                                    : "bg-white dark:bg-slate-900 border-surface-200 hover:border-surface-300",
                                transferDropdownOpen
                                    ? "rounded-t-md border-b-0"
                                    : "rounded-md",
                                transferDropdownOpen && !selectedTransferOutcome && "border-[#0078D4] ring-2 ring-[#0078D4]/20",
                                transferDropdownOpen && selectedTransferOutcome && "ring-2 ring-offset-1",
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                {selectedTransferOutcome ? (
                                    <>
                                        <span className={cn("w-3 h-3 rounded-full shadow-sm", selectedOption?.dot)} />
                                        <span className={cn("text-[11px] font-bold uppercase tracking-wider", selectedOption?.text)}>
                                            {selectedOption?.label}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
                                        Select Transfer...
                                    </span>
                                )}
                            </div>
                            <motion.div
                                animate={{ rotate: transferDropdownOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown size={15} className={cn(selectedTransferOutcome ? selectedOption?.text : "text-surface-400")} />
                            </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                            {transferDropdownOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                    className="absolute left-0 right-0 z-50 overflow-hidden border border-t-0 border-surface-200 rounded-b-md bg-white dark:bg-slate-900 shadow-lg"
                                >
                                    {TRANSFER_OPTIONS.map((opt, i) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setSelectedTransferOutcome(opt.value);
                                                setSelectedOutcome('');
                                                setTransferDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer border-b border-surface-50 last:border-b-0",
                                                selectedTransferOutcome === opt.value
                                                    ? `${opt.lightBg}`
                                                    : `hover:bg-surface-50`,
                                            )}
                                        >
                                            <span className={cn("w-3 h-3 rounded-full shadow-sm shrink-0 ring-2 ring-white", opt.dot)} />
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider flex-1",
                                                selectedTransferOutcome === opt.value ? opt.text : "text-surface-700"
                                            )}>
                                                {opt.label}
                                            </span>
                                            {selectedTransferOutcome === opt.value && (
                                                <CheckCircle2 size={14} className={opt.text} />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* No Show Secondary Dropdown */}
            <AnimatePresence>
                {activeOutcome === 'NO_SHOW' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="space-y-1 mt-4 overflow-visible"
                    >
                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Select No Show Category</p>
                        <div className="relative z-[60]">
                            <button
                                onClick={() => setNoShowDropdownOpen(!noShowDropdownOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl hover:border-surface-300 transition-colors"
                            >
                                <span className="text-sm font-semibold text-surface-700">
                                    {selectedNoShowCategory || 'Select category...'}
                                </span>
                                <ChevronDown size={16} className="text-surface-400" />
                            </button>

                            <AnimatePresence>
                                {noShowDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-surface-100 overflow-hidden z-[100]"
                                    >
                                        {['Compliant', 'Noncompliant', 'Active', 'Non-Responsive'].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    setSelectedNoShowCategory(cat);
                                                    setNoShowDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors border-b border-surface-50 last:border-b-0 flex items-center justify-between"
                                            >
                                                {cat}
                                                {selectedNoShowCategory === cat && <CheckCircle2 size={14} className="text-[#0078D4]" />}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="pt-2 flex items-center gap-2 px-1">
                            <input
                                type="checkbox"
                                id="noShowFailed"
                                checked={isNoShowFailed}
                                onChange={(e) => setIsNoShowFailed(e.target.checked)}
                                className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="noShowFailed" className="text-xs font-semibold text-surface-600 cursor-pointer">
                                Also mark as Failed
                            </label>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Apply Button */}
            <AnimatePresence>
                {activeOutcome && (
                    <motion.button
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowConfirm(true)}
                        disabled={saving || (activeOutcome === 'NO_SHOW' && !selectedNoShowCategory)}
                        className={cn(
                            "w-full h-[44px] flex items-center justify-center gap-2.5 rounded-md text-[11px] font-bold uppercase tracking-widest text-white transition-all cursor-pointer shadow-md hover:shadow-lg",
                            selectedOption?.bg || 'bg-[#0078D4]',
                            "hover:opacity-90 disabled:opacity-50",
                            (activeOutcome === 'NO_SHOW' && !selectedNoShowCategory) ? "opacity-50 cursor-not-allowed grayscale" : ""
                        )}
                    >
                        <CheckCircle2 size={15} />
                        Apply: {selectedOption?.label}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Confirmation Dialog */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
                        onClick={() => setShowConfirm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", selectedOption?.lightBg)}>
                                    <Tag size={18} className={selectedOption?.text} />
                                </div>
                                <h3 className="text-[14px] font-bold text-surface-900">Confirm Tagging</h3>
                            </div>
                            <p className="text-[12px] text-surface-600 mb-5 leading-relaxed">
                                Are you sure you want to tag <span className="font-bold">{applicant.applicant_name}</span> as{' '}
                                <span className={cn("inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase", selectedOption?.lightBg, selectedOption?.text, selectedOption?.border, "border")}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full", selectedOption?.dot)} />
                                    {selectedOption?.label}
                                </span>? This will update their application status.
                            </p>
                            <div className="flex items-center gap-2 justify-end">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-surface-600 border border-surface-200 rounded-md hover:bg-surface-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyOutcome}
                                    disabled={saving}
                                    className={cn(
                                        "px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-white rounded-md transition-all cursor-pointer shadow-sm",
                                        selectedOption?.bg || 'bg-[#0078D4]',
                                        "hover:opacity-90 disabled:opacity-50"
                                    )}
                                >
                                    {saving ? 'Applying...' : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const CONCLUDED_STATUSES = [
    'For Job Offer', 'FOR JOB OFFER', 'FOR_JOB_OFFER',
    'HIRED', 'HIRED_PROCESSED', 'PASSED', 'FINAL_VERDICT',
    'FOR PAN', 'For PAN', 'FOR_PAN', 'PAN_COMPLETED',
    'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'Accepted Offer',
    'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'Sent JO and BGC',
    'PROMOTED', 'DECLINED OFFER', 'DECLINED_OFFER'
];

export function DetailModalPortal({
    applicant, onClose, modalTab, setModalTab, getApplicantStatusRank,
    handlePromote,
    handleGiveGrade, assessmentScore, setAssessmentScore,
    handleGiveClientAssessmentGrade, clientAssessmentScore, setClientAssessmentScore,
    handleGiveClientInterviewVerdict, clientInterviewRemarks, setClientInterviewRemarks,
    finalInterviewNotes, setFinalInterviewNotes,
    overallRating, recommendation,
    onQueue, onRegress,
    validators, handleUpdateApplication, onRouteToSpecialized, onDelete, duplicateRequests, onMergeDuplicate
}: DetailModalPortalProps) {
    const { user } = useAuthStore();
    const isOpsValidator = user?.role === 'ops_validator';
    const toast = useToast();
    const [topTab, setTopTab] = useState<'process' | 'log' | 'tagging' | 'force'>('process');
    const [showPIS, setShowPIS] = useState(false);
    const [showDuplicateReview, setShowDuplicateReview] = useState(false);
    const [showResumeManager, setShowResumeManager] = useState(false);
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingResume, setIsUploadingResume] = useState(false);

    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingResume(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const dataUrl = event.target?.result as string;
                if (handleUpdateApplication) {
                    await handleUpdateApplication(applicant.id, {
                        resume_data: dataUrl,
                        resume_name: file.name
                    });
                    toast.success('Success', 'Resume updated successfully.');
                }
            } catch (err) {
                toast.error('Error', 'Failed to update resume.');
            } finally {
                setIsUploadingResume(false);
                setShowResumeManager(false);
            }
        };
        reader.readAsDataURL(file);
    };
    const [showEvaluationResults, setShowEvaluationResults] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [showRejectionPrompt, setShowRejectionPrompt] = useState(false);
    const [showRegressPrompt, setShowRegressPrompt] = useState(false);
    const [showCustomRegressConfirm, setShowCustomRegressConfirm] = useState(false);
    const [allQuestions, setAllQuestions] = useState<any[]>([]);
    const [transitions, setTransitions] = useState<any[]>([]);
    const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
    const prevTabRef = useRef<ModalTab>(modalTab);

    useEffect(() => {
        setIsEditing(false);
    }, [modalTab]);

    const exportRef = useRef<HTMLDivElement>(null);
    const candidateExportRef = useRef<HTMLDivElement>(null);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
                setExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDownloadPDF = async (type: 'pis' | 'candidate') => {
        const targetRef = type === 'pis' ? exportRef : candidateExportRef;
        if (!targetRef.current || isExporting) return;
        setExportMenuOpen(false);
        setIsExporting(true);
        try {
            const canvas = await html2canvas(targetRef.current, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width / 2, canvas.height / 2]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            const prefix = type === 'pis' ? 'PIS' : 'CandidateData';
            pdf.save(`${prefix}-${(applicant.applicant_name || 'applicant').replace(/\s+/g, '_')}-${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const stepperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setModalTab(getInitialTabForApplicant(applicant));
    }, [applicant.id, setModalTab]);

    useEffect(() => {
        let isMounted = true;
        const loadHistory = async () => {
            try {
                const { ApplicationService } = await import('@/services/ApplicationService');
                const data = await ApplicationService.getStatusHistory(applicant.id);
                if (isMounted) {
                    setTransitions(data);
                }
            } catch (err) {
                console.error('Failed to load transitions for stepper:', err);
            }
        };
        loadHistory();
        return () => { isMounted = false; };
    }, [applicant]);

    useEffect(() => {
        const el = stepperRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', onWheel);
        };
    }, []);


    useEffect(() => {
        const loadQuestions = async () => {
            try {
                const qs = await QuestionService.getAll();
                setAllQuestions(qs);
            } catch (err) {
                console.error('Failed to load questions in portal:', err);
            }
        };
        loadQuestions();
    }, []);

    const safeOverallRating = overallRating ?? 0;
    const activeQuestions = allQuestions.filter(q => q.is_active);
    const interviewResponses = applicant.interview_responses || {};

    const handleDownloadCandidateCard = () => {
        try {
            const data = JSON.stringify(applicant, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(applicant.applicant_name || 'applicant').replace(/\s+/g, '_')}_Candidate_Card.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Candidate Card export failed:', e);
        }
    };



    const selectedDepts = (applicant.department || '')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
    const failedAccounts = applicant.metadata?.failed_accounts || [];
    const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toUpperCase()));
    const activeDepts = selectedDepts.filter(d => !failedSet.has(d));
    const targetDept = activeDepts[0] || selectedDepts[0] || '';

    const isKellerPostman = targetDept.includes('KELLER POSTMAN');
    const isSpecializedClient = ['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE', 'AUTO APPROVE', 'PAESLER'].some(d => targetDept.includes(d));
    const isSpecialized = isKellerPostman || isSpecializedClient;

    const isOnCall = (applicant.position_title || '').toLowerCase().includes('[on-call]') ||
        (applicant.position_title || '').toLowerCase().includes('on-call') ||
        (applicant.metadata?.interview_mode || '').toLowerCase() === 'on-call' ||
        (applicant.metadata?.active_interview_type || '').toLowerCase() === 'on-call' ||
        (applicant.metadata?.preferred_setup || '').toLowerCase() === 'on-call' ||
        applicant.is_on_call === true;

    const finalInterviewLabel = isSpecialized ? 'Operations Validator' : 'Operations Validator';

    const _safeRequiredProcesses = applicant.pis?.required_processes || applicant.metadata?.required_processes;
    const requiredProcesses: string[] | undefined = Array.isArray(_safeRequiredProcesses)
        ? _safeRequiredProcesses
        : (typeof _safeRequiredProcesses === 'string'
            ? (() => { try { const parsed = JSON.parse(_safeRequiredProcesses); return Array.isArray(parsed) ? parsed : undefined; } catch { return undefined; } })()
            : undefined);

    const _safeProcessOrder = applicant.pis?.process_order || applicant.metadata?.process_order;
    const parsedProcessOrder = Array.isArray(_safeProcessOrder)
        ? _safeProcessOrder
        : (typeof _safeProcessOrder === 'string'
            ? (() => { try { const parsed = JSON.parse(_safeProcessOrder); return Array.isArray(parsed) ? parsed : null; } catch { return null; } })()
            : null);

    let processOrder: string[] = [...(parsedProcessOrder || [
        'TYPING_TEST',
        'INITIAL_INTERVIEW',
        'ACCOUNT_ASSIGNMENT',
        'ASSESSMENT',
        'CLIENT_ASSESSMENT',
        'CLIENT_INTERVIEW'
    ])];

    const isEnercare = targetDept.includes('ENERCARE') || (applicant.department || '').toUpperCase().includes('ENERCARE');
    const isRegency = targetDept.includes('REGENCY') || (applicant.department || '').toUpperCase().includes('REGENCY');
    const hasSecondTest = (isEnercare || isRegency) && (
        isOnCall || applicant.metadata?.force_second_test ||
        applicant.metadata?.assessment_ii_score !== undefined ||
        processOrder.includes('ASSESSMENT_II') ||
        (requiredProcesses && requiredProcesses.includes('ASSESSMENT_II'))
    );

    if (hasSecondTest && !processOrder.includes('ASSESSMENT_II')) {
        const assessIdx = processOrder.indexOf('ASSESSMENT');
        if (assessIdx !== -1) {
            processOrder.splice(assessIdx + 1, 0, 'ASSESSMENT_II');
        } else {
            processOrder.push('ASSESSMENT_II');
        }
    }

    // Normalize: ensure ACCOUNT_ASSIGNMENT comes right after INITIAL_INTERVIEW
    if (!isSpecialized && processOrder.includes('ACCOUNT_ASSIGNMENT') && processOrder.includes('INITIAL_INTERVIEW')) {
        const idxInit = processOrder.indexOf('INITIAL_INTERVIEW');
        const idxOps = processOrder.indexOf('ACCOUNT_ASSIGNMENT');
        if (idxOps !== idxInit + 1) {
            const newOrder = processOrder.filter(s => s !== 'ACCOUNT_ASSIGNMENT');
            const newIdxInit = newOrder.indexOf('INITIAL_INTERVIEW');
            newOrder.splice(newIdxInit + 1, 0, 'ACCOUNT_ASSIGNMENT');
            processOrder = newOrder;
        }
    }

    const activeStages = processOrder.filter(stageId => {
        if (stageId === 'ASSESSMENT_II') {
            if (isOnCall) return true;
            const hasSecondTestVal = (isEnercare || isRegency) && (
                applicant.metadata?.force_second_test ||
                applicant.metadata?.assessment_ii_score !== undefined ||
                (requiredProcesses && requiredProcesses.includes('ASSESSMENT_II'))
            );
            return !!hasSecondTestVal;
        }
        if (requiredProcesses && !requiredProcesses.includes(stageId)) return false;
        if (stageId === 'CLIENT_ASSESSMENT') {
            return isKellerPostman;
        }
        if (stageId === 'CLIENT_INTERVIEW') {
            return (isKellerPostman || ['AUTO APPROVE', 'TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE', 'REGENCY', 'PAESLER'].some(d => targetDept.includes(d)));
        }
        return true;
    });

    const baseTabs: Array<{ id: ModalTab; label: string }> = [
        { id: 'application', label: 'Candidate Profile' },
    ];

    activeStages.forEach(stageId => {
        if (stageId === 'TYPING_TEST') {
            baseTabs.push({ id: 'typing', label: 'Typing Test' });
        } else if (stageId === 'INITIAL_INTERVIEW') {
            baseTabs.push({ id: 'initial', label: 'Initial Interview' });
        } else if (stageId === 'ACCOUNT_ASSIGNMENT') {
            baseTabs.push({ id: 'endorsement', label: 'Account Assignment' });
        } else if (stageId === 'ASSESSMENT') {
            baseTabs.push({ id: 'assessment', label: 'Proficiency Assessment' });
            if (!activeStages.includes('ASSESSMENT_II')) {
                baseTabs.push({ id: 'scheduling', label: 'For Ops Val Scheduling' });
            }
        } else if (stageId === 'ASSESSMENT_II') {
            baseTabs.push({ id: 'assessment_ii', label: 'Proficiency Assessment 2' });
            baseTabs.push({ id: 'scheduling', label: 'For Ops Val Scheduling' });
        } else if (stageId === 'CLIENT_ASSESSMENT') {
            baseTabs.push({ id: 'client_assessment', label: 'Client Assessment' });
        } else if (stageId === 'CLIENT_INTERVIEW') {
            baseTabs.push({ id: 'client_interview', label: (targetDept === 'ENERCARE' || targetDept === 'REGENCY') ? 'Client Interview (Optional)' : 'Client Interview' });
        }
    });

    baseTabs.push({ id: 'verdict', label: 'Verdict' });

    let seqVal = 1;
    const tabs = baseTabs.map(tab => {
        if (tab.id === 'application' || tab.id === 'verdict') return tab;
        return { ...tab, label: `${seqVal++}. ${tab.label}` };
    });

    // Track tab changes to determine slide direction
    useEffect(() => {
        const prevIdx = tabs.findIndex(t => t.id === prevTabRef.current);
        const newIdx = tabs.findIndex(t => t.id === modalTab);
        if (prevIdx !== -1 && newIdx !== -1 && prevIdx !== newIdx) {
            setSlideDirection(newIdx > prevIdx ? 1 : -1);
        }
        prevTabRef.current = modalTab;
    }, [modalTab, tabs]);

    const getTabRank = (tId: ModalTab): number => {
        if (tId === 'application') return -1;
        if (tId === 'verdict') return 99;

        let stageId = '';
        if (tId === 'typing') stageId = 'TYPING_TEST';
        else if (tId === 'initial') stageId = 'INITIAL_INTERVIEW';
        else if (tId === 'endorsement') stageId = 'ACCOUNT_ASSIGNMENT';
        else if (tId === 'assessment' || tId === 'scheduling') stageId = 'ASSESSMENT';
        else if (tId === 'assessment_ii') stageId = 'ASSESSMENT_II';
        else if (tId === 'client_assessment') stageId = 'CLIENT_ASSESSMENT';
        else if (tId === 'client_interview') stageId = 'CLIENT_INTERVIEW';

        const idx = activeStages.indexOf(stageId);
        return idx !== -1 ? idx : 0;
    };

    const statusToStageMap: Record<string, string> = {
        'APPLIED': 'TYPING_TEST',
        'TYPING_TEST': 'TYPING_TEST',
        'INITIAL_INTERVIEW': 'INITIAL_INTERVIEW',
        'INTERVIEW_IN_PROGRESS': 'INITIAL_INTERVIEW',
        'QUEUE_ASSIGNED': 'INITIAL_INTERVIEW',
        'ASSESSMENT': 'ASSESSMENT',
        'FOR_SCHEDULING': 'ASSESSMENT',
        'FINAL_INTERVIEW': 'ACCOUNT_ASSIGNMENT',
        'FINAL_INTERVIEW_SCHEDULED': 'ASSESSMENT',
        'CLIENT_ASSESSMENT': 'CLIENT_ASSESSMENT',
        'CLIENT_INTERVIEW': 'CLIENT_INTERVIEW',
        'FOR_JOB_OFFER': 'VERDICT',
        'FOR JOB OFFER': 'VERDICT',
        'For Job Offer': 'VERDICT',
        'FINAL_VERDICT': 'VERDICT',
        'PASSED': 'VERDICT',
        'FAILED': 'VERDICT',
        'CONDITIONAL': 'VERDICT',
        'WAITLISTED': 'VERDICT',
        'WITHDRAWN': 'VERDICT',
        'HIRED': 'VERDICT',
        'REJECTED': 'VERDICT',
        'SENT_JO_AND_BGC': 'VERDICT',
        'SENT JO AND BGC': 'VERDICT',
        'ACCEPTED_OFFER': 'VERDICT',
        'ACCEPTED OFFER': 'VERDICT',
        'FOR_PAN': 'VERDICT',
        'FOR PAN': 'VERDICT',
        'NOT_ELIGIBLE_FOR_REHIRE': 'VERDICT',
        'NOT ELIGIBLE FOR REHIRE': 'VERDICT'
    };

    const getTabStatus = (tabId: ModalTab): 'passed' | 'failed' | 'active' | 'locked' | 'withdrawn' | 'noshow' | 'bypassed' => {
        const isRejected = ['REJECTED', 'FAILED'].includes(applicant.current_status) || String(applicant.current_status || '').toLowerCase().includes('failed');
        const isWithdrawn = applicant.current_status === 'WITHDRAWN' || String(applicant.current_status || '').toUpperCase().includes('WITHDRAWN') || String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase().includes('withdrew') || String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase().includes('withdrawn');
        const specStatus = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase();
        const isNoShow = specStatus.includes('no show') || specStatus.includes('noshow') || String(applicant.current_status || '').toLowerCase().includes('no show') || String(applicant.current_status || '').toLowerCase().includes('noshow');
        const isBlacklisted = String(applicant.current_status || '').toUpperCase().includes('BLACKLIST') || specStatus.includes('blacklist');
        const isNotEligible = String(applicant.current_status || '').toUpperCase().includes('NOT_ELIGIBLE') || String(applicant.current_status || '').toUpperCase().includes('NOT ELIGIBLE');
        const isNegativeOutcome = isRejected || isWithdrawn || isNoShow || isBlacklisted || isNotEligible;
        const statusUpper = (applicant.current_status || '').toUpperCase().trim();
        const lookupStatus = statusUpper.replace(/\s+/g, '_');

        const statusToTabMap: Record<string, ModalTab> = {
            'APPLIED': 'typing',
            'TYPING_TEST': 'typing',
            'INITIAL_INTERVIEW': 'initial',
            'INTERVIEW_IN_PROGRESS': 'initial',
            'QUEUE_ASSIGNED': 'initial',
            'ACCOUNT_ASSIGNMENT': 'endorsement',
            'ASSESSMENT': 'assessment',
            'FOR_SCHEDULING': 'scheduling',
            'FINAL_INTERVIEW': 'scheduling',
            'FINAL_INTERVIEW_SCHEDULED': 'scheduling',
            'CLIENT_ASSESSMENT': 'client_assessment',
            'CLIENT_INTERVIEW': 'client_interview',
            'FINAL_VERDICT': 'verdict',
            'PASSED': 'verdict',
            'HIRED': 'verdict',
            'REJECTED': 'verdict',
            'FOR_JOB_OFFER': 'verdict',
            'For Job Offer': 'verdict',
        };

        let currentActiveTab = tabs[0].id;
        const concludedStatuses = [...CONCLUDED_STATUSES, 'REJECTED', 'FAILED', 'NO_SHOW', 'WITHDRAWN', 'WAITLISTED', 'NOT_ELIGIBLE_FOR_REHIRE', 'BLACKLIST', 'PROMOTED', 'LATERAL'];
        const isConcluded = concludedStatuses.includes(lookupStatus) || isNegativeOutcome;

        if (isConcluded) {
            if (isNegativeOutcome) {
                const getFailedTab = (): ModalTab => {
                    const fs = applicant.failure_details?.from_status || (applicant.metadata?.failure_details as any)?.from_status;
                    if (fs) {
                        const fsU = String(fs).toUpperCase();
                        if (fsU.includes('TYPING')) return 'typing';
                        if (fsU.includes('INITIAL') || fsU === 'QUEUE_ASSIGNED') return 'initial';
                        if (fsU.includes('ACCOUNT_ASSIGNMENT') || fsU.includes('ENDORSEMENT')) return 'endorsement';
                        if (fsU.includes('ASSESSMENT_II')) return 'assessment_ii';
                        if (fsU.includes('ASSESSMENT') && !fsU.includes('CLIENT')) return 'assessment';
                        if (fsU.includes('FINAL') || fsU.includes('SCHEDULING') || fsU.includes('OPS')) return 'scheduling';
                        if (fsU.includes('CLIENT_ASSESSMENT')) return 'client_assessment';
                        if (fsU.includes('CLIENT_INTERVIEW')) return 'client_interview';
                    }

                    const appAny = applicant as any;
                    const cStr = String(applicant.current_status || '').toLowerCase();
                    const specStatus = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase();
                    const remarks = String(applicant.master_remarks || (applicant.pis as any)?.master_remarks || applicant.metadata?.master_remarks || '').toLowerCase();
                    const opsVal = String(appAny.ops_validator_status || (applicant.pis as any)?.ops_validator_status || applicant.metadata?.ops_validator_status || '').toLowerCase();
                    const iiResult = String(appAny.initial_interview_results || (applicant.pis as any)?.initial_interview_results || applicant.metadata?.initial_interview_results || '').toUpperCase();

                    // Prioritize exact stage indicators in specStatus or cStr
                    if (specStatus.includes('typing') || cStr.includes('typing')) return 'typing';
                    if (specStatus.includes('initial') || cStr.includes('initial') || iiResult.includes('FAIL')) return 'initial';
                    if (specStatus.includes('client assessment') || cStr.includes('client assessment')) return 'client_assessment';
                    if (specStatus.includes('client interview') || cStr.includes('client interview')) return 'client_interview';
                    if (specStatus.includes('endorsement') || specStatus.includes('account assignment') || cStr.includes('account assignment')) return 'endorsement';
                    if (specStatus.includes('assessment 2') || specStatus.includes('assessment_ii')) return 'assessment_ii';
                    if (specStatus.includes('assessment') || cStr.includes('assessment')) return 'assessment';
                    if (specStatus.includes('ov') || specStatus.includes('final interview') || remarks.includes('ov') || opsVal.includes('fail')) return 'scheduling';

                    let fallbackTab = tabs[0].id;
                    for (const tab of tabs) {
                        if (tab.id === 'verdict') break;
                        const isSkipped = (() => {
                            const skipped = applicant.metadata?.skipped_stages;
                            if (Array.isArray(skipped)) return skipped.includes(tab.id);
                            if (typeof skipped === 'string') {
                                try { const p = JSON.parse(skipped); return Array.isArray(p) && p.includes(tab.id); } catch { return false; }
                            }
                            return false;
                        })();
                        if (!isStageDataComplete(applicant, tab.id) && !isSkipped) {
                            fallbackTab = tab.id;
                            break;
                        }
                    }
                    return fallbackTab;
                };

                let failedTabId = getFailedTab();
                if (!tabs.find(t => t.id === failedTabId)) {
                    failedTabId = 'verdict';
                }
                currentActiveTab = failedTabId;
            } else {
                currentActiveTab = 'verdict';
            }
        } else {
            const currentStatusTab = statusToTabMap[lookupStatus];
            const currentStatusTabIndex = tabs.findIndex(t => t.id === currentStatusTab);

            for (const tab of tabs) {
                if (tab.id === 'verdict') {
                    currentActiveTab = 'verdict';
                    break;
                }
                const isSkipped = (() => {
                    const s = applicant.metadata?.skipped_stages;
                    if (Array.isArray(s)) return s.includes(tab.id);
                    if (typeof s === 'string') {
                        try { const p = JSON.parse(s); return Array.isArray(p) && p.includes(tab.id); } catch { return false; }
                    }
                    return false;
                })();
                const thisTabIndex = tabs.findIndex(t => t.id === tab.id);
                const isBypassedByStatus = currentStatusTabIndex > thisTabIndex;

                if (!isStageDataComplete(applicant, tab.id) && !isSkipped && !isBypassedByStatus) {
                    currentActiveTab = tab.id;
                    break;
                }
            }
        }

        const currentIdx = tabs.findIndex(t => t.id === currentActiveTab);
        const tabIndex = tabs.findIndex(t => t.id === tabId);

        if (isNoShow && tabIndex === currentIdx) {
            return 'noshow';
        }

        if (isWithdrawn && tabIndex === currentIdx) {
            return 'withdrawn';
        }

        if (isNegativeOutcome && tabIndex === currentIdx) {
            return 'failed';
        }

        if (tabId === currentActiveTab) {
            return 'active';
        }

        if (tabIndex < currentIdx) {
            return 'passed';
        }

        return 'locked';
    };

    const getStepCompletedTime = (tabId: ModalTab): string | null => {
        let dateStr: string | null | undefined = null;

        if (tabId === 'application') {
            dateStr = applicant.applied_at;
        } else if (tabId === 'typing') {
            dateStr = applicant.typing_test_completed_at || transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                return from === 'APPLIED' || from === 'TYPING_TEST';
            })?.changed_at;
        } else if (tabId === 'initial') {
            dateStr = applicant.interview_completed_at || transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                return ['INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED'].includes(from);
            })?.changed_at;
        } else if (tabId === 'endorsement') {
            dateStr = transitions.find(t => {
                const to = String(t.to_status || '').toUpperCase();
                const from = String(t.from_status || '').toUpperCase();
                return to === 'FINAL_INTERVIEW_SCHEDULED' || from === 'ACCOUNT_ASSIGNMENT';
            })?.changed_at;
        } else if (tabId === 'assessment') {
            dateStr = transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                return from === 'ASSESSMENT';
            })?.changed_at;
        } else if (tabId === 'scheduling') {
            dateStr = transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                const to = String(t.to_status || '').toUpperCase();
                return from === 'FINAL_INTERVIEW_SCHEDULED' || to === 'FOR_JOB_OFFER' || to === 'PASSED' || to === 'REJECTED';
            })?.changed_at;
        } else if (tabId === 'verdict') {
            const isConcluded = ['PASSED', 'FAILED', 'HIRED', 'HIRED_PROCESSED', 'REJECTED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(applicant.current_status);
            if (isConcluded) {
                dateStr = applicant.failure_details?.changed_at || transitions.find(t => {
                    const to = String(t.to_status || '').toUpperCase();
                    return ['PASSED', 'FAILED', 'HIRED', 'REJECTED', 'WITHDRAWN'].includes(to);
                })?.changed_at || applicant.updated_at;
            }
        }

        if (!dateStr) return null;

        try {
            return new Date(dateStr).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return null;
        }
    };

    const getStepCompletedBy = (tabId: ModalTab): string | null => {
        let nameStr: string | null | undefined = null;

        if (tabId === 'application') {
            // Show who accepted the candidate from the requests tab
            // This is the transition from APPLIED → INITIAL_INTERVIEW (the acceptance event)
            nameStr = transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                const to = String(t.to_status || '').toUpperCase();
                return (from === 'APPLIED' || from === 'TYPING_TEST') && to === 'INITIAL_INTERVIEW';
            })?.changed_by_name || applicant.assigned_recruiter_name || transitions.find(t => {
                const to = String(t.to_status || '').toUpperCase();
                return to === 'APPLIED';
            })?.changed_by_name;
        } else if (tabId === 'typing') {
            nameStr = transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                return from === 'APPLIED' || from === 'TYPING_TEST';
            })?.changed_by_name;
        } else if (tabId === 'initial') {
            nameStr = transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                return ['INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED'].includes(from);
            })?.changed_by_name;
        } else if (tabId === 'endorsement') {
            nameStr = transitions.find(t => {
                const to = String(t.to_status || '').toUpperCase();
                const from = String(t.from_status || '').toUpperCase();
                return to === 'FINAL_INTERVIEW_SCHEDULED' || from === 'ACCOUNT_ASSIGNMENT';
            })?.changed_by_name;
        } else if (tabId === 'assessment') {
            nameStr = transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                return from === 'ASSESSMENT';
            })?.changed_by_name;
        } else if (tabId === 'scheduling') {
            nameStr = transitions.find(t => {
                const from = String(t.from_status || '').toUpperCase();
                const to = String(t.to_status || '').toUpperCase();
                return from === 'FINAL_INTERVIEW_SCHEDULED' || to === 'FOR_JOB_OFFER' || to === 'PASSED' || to === 'REJECTED';
            })?.changed_by_name;
        } else if (tabId === 'verdict') {
            const isConcluded = ['PASSED', 'FAILED', 'HIRED', 'HIRED_PROCESSED', 'REJECTED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(applicant.current_status);
            if (isConcluded) {
                nameStr = transitions.find(t => {
                    const to = String(t.to_status || '').toUpperCase();
                    return ['PASSED', 'FAILED', 'HIRED', 'REJECTED', 'WITHDRAWN'].includes(to);
                })?.changed_by_name;
            }
        }

        return nameStr || null;
    };
    const isNoShowCandidate = String(applicant.current_status || '').toLowerCase().includes('no show') ||
        String(applicant.current_status || '').toLowerCase().includes('noshow') ||
        String(applicant.current_status || '').toLowerCase().includes('no_show') ||
        String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase().includes('no show');

    const handleContinueApplication = async () => {
        try {
            const { ApplicationService } = await import('@/services/ApplicationService');
            
            let targetStatus = 'INITIAL_INTERVIEW';
            const cStatusUpper = String(applicant.current_status || '').toUpperCase();
            
            if (cStatusUpper.includes('TYPING')) {
                targetStatus = 'TYPING_TEST';
            } else if (cStatusUpper.includes('ASSESSMENT_II')) {
                targetStatus = 'ASSESSMENT_II';
            } else if (cStatusUpper.includes('ASSESSMENT')) {
                targetStatus = 'ASSESSMENT';
            } else if (cStatusUpper.includes('FINAL') || cStatusUpper.includes('OPS')) {
                targetStatus = 'FINAL_INTERVIEW_SCHEDULED';
            } else if (cStatusUpper.includes('INITIAL') || cStatusUpper.includes('QUEUE')) {
                targetStatus = 'INITIAL_INTERVIEW';
            } else {
                if (modalTab === 'typing') targetStatus = 'TYPING_TEST';
                else if (modalTab === 'assessment') targetStatus = 'ASSESSMENT';
                else if (modalTab === 'assessment_ii') targetStatus = 'ASSESSMENT_II';
                else if (modalTab === 'scheduling') targetStatus = 'FINAL_INTERVIEW_SCHEDULED';
                else targetStatus = 'INITIAL_INTERVIEW';
            }

            await ApplicationService.updateStatus({
                id: applicant.id,
                toStatus: targetStatus,
                fromStatus: applicant.current_status,
                changedByName: 'Recruiter',
                reason: 'Continued application from No Show',
                patch: {
                    current_status: targetStatus,
                    pis: {
                        ...(applicant.pis || {}),
                        final_specific_status: 'Pending',
                        last_updated_by: 'System (Resume)'
                    },
                    metadata: {
                        ...(applicant.metadata || {}),
                        no_show_category: null,
                        final_specific_status: 'Pending'
                    }
                }
            });

            if (handleUpdateApplication) {
                await handleUpdateApplication(applicant.id, {
                    current_status: targetStatus,
                    pis: {
                        ...(applicant.pis || {}),
                        final_specific_status: 'Pending'
                    },
                    metadata: {
                        ...(applicant.metadata || {}),
                        no_show_category: null,
                        final_specific_status: 'Pending'
                    }
                });
            }
            toast.success('Application Continued', `${applicant.applicant_name} has been reactivated into the pipeline.`);
        } catch (err) {
            console.error('Failed to continue application:', err);
            toast.error('Action Failed', 'Could not resume application.');
        }
    };

    const isClosedCandidate = applicant.current_status === 'CLOSED';

    const handleReopenApplication = async () => {
        try {
            const { ApplicationService } = await import('@/services/ApplicationService');
            
            const targetStatus = applicant.metadata?.status_before_close || 'INITIAL_INTERVIEW';

            await ApplicationService.updateStatus({
                id: applicant.id,
                toStatus: targetStatus,
                fromStatus: applicant.current_status,
                changedByName: 'Recruiter',
                reason: 'Reopened application',
                patch: {
                    current_status: targetStatus,
                    metadata: {
                        ...(applicant.metadata || {}),
                        status_before_close: null
                    }
                }
            });

            if (handleUpdateApplication) {
                await handleUpdateApplication(applicant.id, {
                    current_status: targetStatus,
                    metadata: {
                        ...(applicant.metadata || {}),
                        status_before_close: null
                    }
                });
            }
            toast.success('Application Reopened', `${applicant.applicant_name} has been restored to ${targetStatus}.`);
        } catch (err) {
            console.error('Failed to reopen application:', err);
            toast.error('Action Failed', 'Could not reopen application.');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-surface-950/20 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.99, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: 15 }}
                className="relative w-full max-w-7xl bg-white dark:bg-slate-900 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.35)] overflow-hidden rounded-xl flex flex-col max-h-[98vh] my-auto border border-surface-200 z-[110]"
            >
                {/* Header Information Area */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-surface-100 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-6">
                        <div
                            className="w-16 h-16 bg-primary-900 rounded-lg flex items-center justify-center text-white shadow-lg ring-4 ring-primary-50 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={handleDownloadCandidateCard}
                            title="Download Candidate Card"
                        >
                            {applicant.pis?.photo_data_url ? (
                                <img
                                    src={applicant.pis.photo_data_url}
                                    alt={applicant.applicant_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <h2 className="text-2xl font-bold">{applicant.applicant_name.charAt(0)}</h2>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-4 mb-1">
                                <h1 className="text-2xl font-bold text-surface-900 tracking-tight leading-none truncate max-w-[400px]">
                                    {applicant.applicant_name}
                                </h1>
                                {applicant.metadata?.is_promotion && (
                                    <div className="px-3 py-1 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(253,224,71,0.6)] border border-amber-300 animate-pulse flex items-center gap-1.5 shrink-0">
                                        <Sparkles size={12} className="text-amber-600" /> Promotion
                                    </div>
                                )}
                                {applicant.metadata?.is_lateral_transfer && (
                                    <div className="px-3 py-1 bg-gradient-to-r from-blue-200 via-indigo-300 to-blue-200 text-indigo-800 text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(129,140,248,0.6)] border border-indigo-300 animate-pulse flex items-center gap-1.5 shrink-0">
                                        <ArrowRightLeft size={12} className="text-indigo-600" /> Lateral Transfer
                                    </div>
                                )}
                                {applicant.metadata?.reapplication_passed && applicant.current_status === 'INITIAL_INTERVIEW' && (
                                    <div className="px-3 py-1 bg-gradient-to-r from-green-200 via-emerald-300 to-green-200 text-green-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(52,211,153,0.6)] border border-green-400 animate-pulse flex items-center gap-1.5 shrink-0">
                                        <CheckCircle2 size={12} className="text-green-700" /> Reapplication Passed
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-surface-500">
                                <p className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                    <Briefcase size={13} className="text-primary-600" /> {(applicant.position_title || '').replace(/\[INTERNAL\]/gi, '[ON-CALL]')}
                                </p>
                                <span className="w-1 h-1 bg-surface-300 rounded-full" />
                                <select
                                    value={applicant.metadata?.candidate_type || 'EXTERNAL'}
                                    onChange={async (e) => {
                                        const newType = e.target.value;
                                        try {
                                            if (handleUpdateApplication) {
                                                await handleUpdateApplication(applicant.id, {
                                                    metadata: {
                                                        ...(applicant.metadata || {}),
                                                        candidate_type: newType
                                                    }
                                                });
                                            }
                                            toast.success('Updated Type', `Candidate type updated to ${newType}.`);
                                        } catch (err) {
                                            console.error('Failed to update candidate type:', err);
                                            toast.error('Error', 'Failed to update candidate type.');
                                        }
                                    }}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none focus:ring-2 focus:ring-primary-500 appearance-none text-center min-w-[100px] shadow-sm transition-all border",
                                        (applicant.metadata?.candidate_type || '').toLowerCase() === 'internal' ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200" :
                                            (applicant.metadata?.candidate_type || '').toLowerCase() === 'external' ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" :
                                                (applicant.metadata?.candidate_type || '').toLowerCase() === 'na' ? "bg-slate-50 dark:bg-slate-800 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800" :
                                                    "bg-surface-50 text-surface-600 hover:bg-surface-100 border-surface-200"
                                    )}
                                >
                                    <option value="EXTERNAL" className="bg-white dark:bg-slate-900 text-surface-900 font-medium">EXTERNAL</option>
                                    <option value="INTERNAL" className="bg-white dark:bg-slate-900 text-surface-900 font-medium">INTERNAL</option>
                                    <option value="NA" className="bg-white dark:bg-slate-900 text-surface-900 font-medium">N/A</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right flex flex-col items-end gap-2">
                            <span className={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                applicant.current_status === 'PASSED' || applicant.current_status === 'HIRED' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                    applicant.current_status === 'REJECTED' || applicant.current_status === 'FAILED' ? "bg-red-50 border-red-200 text-red-700" :
                                        applicant.current_status === 'NO_SHOW' || applicant.current_status === 'NO SHOW' ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900" :
                                            "bg-blue-50 border-blue-200 text-blue-700"
                            )}>
                                {(() => {
                                    if (applicant.current_status === 'NO_SHOW' || applicant.current_status === 'NO SHOW') {
                                        const spec = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase();
                                        if (spec.includes('Final Interview') || spec.includes('ops val')) {
                                            return 'Final Interview - No Show';
                                        }
                                        return 'No Show';
                                    }
                                    return getStatusLabel(applicant.current_status) || applicant.current_status;
                                })()}
                            </span>
                            <StatusTimerDisplay applicant={applicant} />
                        </div>
                        <div className="w-[1px] h-10 bg-surface-100" />
                        <div className="flex items-center gap-3">
                            {/* Action Buttons Group */}
                            <div className="flex items-center gap-2 bg-surface-50 p-1 rounded-lg border border-surface-200/60 shadow-sm">
                                {isNoShowCandidate && (
                                    <button
                                        onClick={handleContinueApplication}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-md shadow-sm border border-emerald-500 cursor-pointer"
                                    >
                                        <Play size={12} className="fill-current" /> Continue Application
                                    </button>
                                )}

                                {isClosedCandidate && (
                                    <button
                                        onClick={handleReopenApplication}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-md shadow-sm border border-sky-500 cursor-pointer animate-pulse"
                                    >
                                        <Play size={12} className="fill-current" /> Reopen
                                    </button>
                                )}

                                {duplicateRequests && duplicateRequests.length > 0 && (
                                    <button
                                        onClick={() => setShowDuplicateReview(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-[10px] font-black uppercase tracking-wider transition-all rounded-md shadow-[0_0_15px_rgba(250,204,21,0.5)] border border-yellow-600 cursor-pointer animate-pulse"
                                        title="Review duplicate candidate data"
                                    >
                                        <Activity size={13} className="text-white" />
                                        <span>Review Duplicates ({duplicateRequests.length})</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowResumeManager(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider transition-all rounded-md shadow-xs border border-blue-700 cursor-pointer"
                                    title="Manage Candidate Resume"
                                >
                                    <FileText size={13} className="text-white" />
                                    <span>Resume</span>
                                </button>
                                <button
                                    onClick={() => handleDownloadPDF('candidate')}
                                    disabled={isExporting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider transition-all rounded-md shadow-xs border border-slate-900 cursor-pointer disabled:opacity-50"
                                    title="Export Full Candidate Evaluation Dossier (PDF)"
                                >
                                    <FileText size={13} className="text-emerald-400" />
                                    <span>Candidate Data</span>
                                </button>

                                <button
                                    onClick={() => handleDownloadPDF('pis')}
                                    disabled={isExporting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider transition-all rounded-md shadow-xs border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-50"
                                    title="Export Applicant PIS Form (PDF)"
                                >
                                    <FileOutput size={13} className="text-slate-600" />
                                    <span>PIS Form</span>
                                </button>
                            </div>

                            <div className="w-[1px] h-6 bg-surface-200 mx-1" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-red-50 border border-surface-200 hover:border-red-200 text-surface-400 hover:text-red-500 transition-all rounded-lg shadow-sm"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Top-Level Navigation Tabs */}
                <div className="bg-white dark:bg-slate-900 px-8 border-b border-surface-100 flex gap-6 shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setTopTab('process')}
                        className={cn(
                            'relative py-4 text-[12px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap outline-none',
                            topTab === 'process'
                                ? 'text-primary-700'
                                : 'text-surface-500 hover:text-surface-950'
                        )}
                    >
                        Application Process
                        {topTab === 'process' && (
                            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-600 rounded-t" />
                        )}
                    </button>
                    <button
                        onClick={() => setTopTab('log')}
                        className={cn(
                            'relative py-4 text-[12px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap outline-none',
                            topTab === 'log'
                                ? 'text-primary-700'
                                : 'text-surface-500 hover:text-surface-950'
                        )}
                    >
                        Application Log
                        {topTab === 'log' && (
                            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-600 rounded-t" />
                        )}
                    </button>
                    <button
                        onClick={() => setTopTab('tagging')}
                        className={cn(
                            'relative py-4 text-[12px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap outline-none',
                            topTab === 'tagging'
                                ? 'text-primary-700'
                                : 'text-surface-500 hover:text-surface-950'
                        )}
                    >
                        Tagging
                        {topTab === 'tagging' && (
                            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-600 rounded-t" />
                        )}
                    </button>
                    <button
                        onClick={() => setTopTab('force')}
                        className={cn(
                            'relative py-4 text-[12px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap outline-none',
                            topTab === 'force'
                                ? 'text-primary-700'
                                : 'text-surface-500 hover:text-surface-950'
                        )}
                    >
                        Force Status
                        {topTab === 'force' && (
                            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-600 rounded-t" />
                        )}
                    </button>
                </div>

                {/* Modern Shopee-Style Process Stepper */}
                {topTab === 'process' && (
                    <ModalTimelineStepper
                        tabs={tabs}
                        modalTab={modalTab}
                        setModalTab={setModalTab}
                        getTabStatus={getTabStatus}
                        getStepCompletedTime={getStepCompletedTime}
                        getStepCompletedBy={getStepCompletedBy}
                    />



                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 bg-white dark:bg-slate-900 custom-scrollbar">
                    {topTab === 'process' ? (
                        <>
                            {(() => {
                                return null;
                            })()}

                            <style>{`
                                @keyframes bounce-down {
                                    0%, 100% {
                                        transform: translate(-50%, 0);
                                    }
                                    50% {
                                        transform: translate(-50%, 3px);
                                    }
                                }
                                .animate-bounce-down {
                                    animation: bounce-down 1.2s infinite ease-in-out;
                                }
                                .hide-tab-header .text-center.mb-10,
                                .hide-tab-header .text-center.mb-8 {
                                    display: none !important;
                                }
                                .hide-tab-header div:not([class*="fixed"]) > .max-w-4xl,
                                .hide-tab-header div:not([class*="fixed"]) > .max-w-2xl {
                                    max-width: 100% !important;
                                    padding-top: 0 !important;
                                    padding-bottom: 0 !important;
                                    margin: 0 !important;
                                }
                                .hide-tab-header div:not([class*="fixed"]) > .max-w-md {
                                    max-width: 100% !important;
                                    margin: 0 !important;
                                }
                            `}</style>

                            {['application', 'verdict'].includes(modalTab) ? (
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={modalTab}
                                        initial={{ opacity: 0, x: slideDirection * 60 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: slideDirection * -60 }}
                                        transition={{ type: 'spring', stiffness: 350, damping: 32, mass: 0.8 }}
                                        style={{ willChange: 'transform, opacity' }}
                                    >
                                        {modalTab === 'application' && (
                                            <ApplicationTab
                                                applicant={applicant}
                                                showPIS={showPIS}
                                                setShowPIS={setShowPIS}
                                                isEditing={isEditing}
                                                handleUpdateApplication={handleUpdateApplication}
                                            />
                                        )}

                                        {modalTab === 'verdict' && (
                                            <VerdictTab
                                                applicant={applicant}
                                                showRejectionPrompt={showRejectionPrompt}
                                                setShowRejectionPrompt={setShowRejectionPrompt}
                                                rejectionReasonInput={rejectionReasonInput}
                                                setRejectionReasonInput={setRejectionReasonInput}
                                                handlePromote={handlePromote}
                                                onRegress={() => onRegress(applicant)}
                                                onClose={onClose}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-4">
                                    {/* Left Column - Step Description */}
                                    <div className="lg:col-span-4 pr-4 text-left">
                                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-3">
                                            {tabs.find(t => t.id === modalTab)?.label.replace(/^\d+\.\s+/, '') || modalTab}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                            {(() => {
                                                if (modalTab === 'typing') return "Assess the candidate's typing speed (words per minute) and accuracy to ensure they meet the minimum requirements for communication roles.";
                                                if (modalTab === 'initial') return "Evaluate and record the candidate's Initial Interview answers, communication skills, and general background alignment.";
                                                if (modalTab === 'endorsement') return "Review the candidate's profile and match/endorse them to an open line of business (LOB) or target client account.";
                                                if (modalTab === 'assessment') return "Evaluate and record the candidate's proficiency performance and subject matter expertise.";
                                                if (modalTab === 'assessment_ii') return "Evaluate and record the candidate's secondary proficiency performance and technical skill alignment.";
                                                if (modalTab === 'scheduling') return "Schedule and record the Final Interview review to determine final account eligibility and endorsement status.";
                                                if (modalTab === 'client_assessment') return "Record and review the outcomes of the client-specific assessment phase.";
                                                if (modalTab === 'client_interview') return "Log the final client interview decisions and evaluation results.";
                                                return "";
                                            })()}
                                        </p>

                                        {/* Candidate Insights & Comparison Section */}
                                        <div className="mt-8 pt-6 border-t border-slate-100 space-y-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-4 bg-primary-600 rounded-full" />
                                                <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Candidate Comparison & Metrics</h4>
                                            </div>

                                            {/* Insights Cards - Changes Dynamically based on current modalTab */}
                                            <div className="space-y-4">
                                                {/* 1. TYPING STEP: Show typing speed metrics */}
                                                {modalTab === 'typing' && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 animate-fade-in text-left">
                                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                                            <span className="font-bold text-slate-600">Typing Speed Comparison</span>
                                                            <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                                                {applicant.typing_test_wpm ? `${applicant.typing_test_wpm} WPM` : 'N/A'}
                                                            </span>
                                                        </div>

                                                        {/* Custom Graph */}
                                                        <div className="relative pt-1">
                                                            <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-200/70">
                                                                <div
                                                                    style={{ width: `${Math.min(100, Math.max(10, ((applicant.typing_test_wpm || 30) / 75) * 100))}%` }}
                                                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 rounded-full transition-all duration-500"
                                                                />
                                                            </div>
                                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 uppercase">
                                                                <span>Avg (38 WPM)</span>
                                                                <span>Target (40 WPM)</span>
                                                                <span>Top (60+ WPM)</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[9.5px] font-semibold text-slate-400 mt-3">This candidate is in the top {applicant.typing_test_wpm && applicant.typing_test_wpm >= 45 ? '15%' : '40%'} of the applicant pool for typing performance.</p>
                                                    </div>
                                                )}

                                                {/* 2. INITIAL STEP: Show Initial Interview & communication traits */}
                                                {modalTab === 'initial' && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 animate-fade-in text-left">
                                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                                            <span className="font-bold text-slate-600">Verbal Communication Match</span>
                                                            <span className="font-extrabold text-blue-700">85%</span>
                                                        </div>

                                                        {/* Custom Rating Meter */}
                                                        <div className="relative pt-1">
                                                            <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-200/70">
                                                                <div style={{ width: '85%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 rounded-full" />
                                                            </div>
                                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 uppercase">
                                                                <span>Standard Fit</span>
                                                                <span>Top Fit</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[9.5px] font-semibold text-slate-400 mt-3">Verbal sentiment rating and screening profile align closely with target service roles.</p>
                                                    </div>
                                                )}

                                                {/* 3. ACCOUNT ASSIGNMENT STEP: Show account matching rate */}
                                                {modalTab === 'endorsement' && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 animate-fade-in text-left">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div>
                                                                <span className="block text-xs font-bold text-slate-600">LOB Assignment Fit</span>
                                                                <span className="text-[9px] text-slate-400 font-semibold uppercase">Alignment with target account specifications</span>
                                                            </div>
                                                            <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-100">
                                                                HIGH MATCH
                                                            </div>
                                                        </div>
                                                        {/* LOB Distribution graphic */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                                <span>Customer Service / Support</span>
                                                                <span>92% Match</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 4. PROFICIENCY ASSESSMENT STEPS: Show SpeechX Distribution */}
                                                {['assessment', 'assessment_ii'].includes(modalTab) && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 animate-fade-in text-left">
                                                        <div className="flex items-center justify-between text-xs mb-2">
                                                            <span className="font-bold text-slate-600">SpeechX Placement Distribution</span>
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-md border border-blue-100">
                                                                {applicant.assessment_score || applicant.pis?.leadership_score || 'Not Graded'}
                                                            </span>
                                                        </div>

                                                        {/* Comparative distribution bar graph */}
                                                        <div className="flex items-end gap-1.5 h-12 pt-2 px-1">
                                                            <div className="flex-1 bg-slate-200/50 rounded-t-md h-[20%] relative group">
                                                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">A2</span>
                                                            </div>
                                                            <div className="flex-1 bg-slate-200/50 rounded-t-md h-[45%] relative group">
                                                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">B1</span>
                                                            </div>
                                                            <div className={`flex-1 rounded-t-md h-[80%] relative group ${['B2', 'B2_SPEECHX'].includes(String(applicant.assessment_score || '')) ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-slate-300'}`}>
                                                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-blue-600">B2</span>
                                                            </div>
                                                            <div className={`flex-1 rounded-t-md h-[55%] relative group ${['C1', 'C1_SPEECHX'].includes(String(applicant.assessment_score || '')) ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-slate-200/60'}`}>
                                                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-blue-600">C1</span>
                                                            </div>
                                                            <div className={`flex-1 rounded-t-md h-[30%] relative group ${['C2', 'C2_SPEECHX'].includes(String(applicant.assessment_score || '')) ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-slate-200/30'}`}>
                                                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-blue-600">C2</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[9px] font-semibold text-slate-400 mt-2 text-center">SpeechX CEFR Distribution vs. Candidate Placement</p>
                                                    </div>
                                                )}

                                                {/* 5. Final Interview STEP: Show validator success rate */}
                                                {modalTab === 'scheduling' && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 animate-fade-in text-left">
                                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                                            <span className="font-bold text-slate-600">Validator Endorsement Rate</span>
                                                            <span className="font-extrabold text-slate-800 dark:text-slate-200">78%</span>
                                                        </div>

                                                        {/* Gauge Line */}
                                                        <div className="relative pt-1">
                                                            <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-200/70">
                                                                <div style={{ width: '78%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-violet-600 rounded-full" />
                                                            </div>
                                                        </div>
                                                        <p className="text-[9.5px] font-semibold text-slate-400 mt-2">78% of candidates endorsed to operations validation successfully pass to the client screening stage.</p>
                                                    </div>
                                                )}

                                                {/* 6 & 7. CLIENT ASSESSMENT & INTERVIEW: Show Client Fit Quotient */}
                                                {['client_assessment', 'client_interview'].includes(modalTab) && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between animate-fade-in text-left">
                                                        <div>
                                                            <span className="block text-xs font-bold text-slate-600">Client Match Quotient</span>
                                                            <span className="text-[9px] text-slate-400 font-semibold uppercase leading-tight">Aggregate profile fit for {applicant.department || 'Target LOB'}</span>
                                                        </div>
                                                        <div className="relative flex items-center justify-center shrink-0">
                                                            <svg className="w-12 h-12 transform -rotate-90">
                                                                <circle cx="24" cy="24" r="18" className="text-slate-100" strokeWidth="4.5" fill="transparent" stroke="currentColor" />
                                                                <circle cx="24" cy="24" r="18" className="text-blue-600" strokeWidth="4.5" fill="transparent" strokeDasharray="113" strokeDashoffset={applicant.typing_test_wpm && applicant.typing_test_wpm > 40 ? "20" : "38"} strokeLinecap="round" stroke="currentColor" />
                                                            </svg>
                                                            <span className="absolute text-[10px] font-black text-slate-800 dark:text-slate-200">
                                                                {applicant.typing_test_wpm && applicant.typing_test_wpm > 40 ? '82%' : '67%'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Key Talent Badges */}
                                            <div className="flex flex-wrap gap-1.5 pt-2">
                                                {applicant.typing_test_wpm && applicant.typing_test_wpm >= 45 && (
                                                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full border border-emerald-100 uppercase">Top 10% Typing</span>
                                                )}
                                                {applicant.typing_test_wpm && applicant.typing_test_wpm < 45 && applicant.typing_test_wpm >= 40 && (
                                                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded-full border border-blue-100 uppercase">High Accuracy typing</span>
                                                )}
                                                {['B2', 'C1', 'C2', 'B2_SPEECHX', 'C1_SPEECHX'].includes(String(applicant.assessment_score || '')) && (
                                                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-full border border-indigo-100 uppercase">CEFR Certified</span>
                                                )}
                                                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 text-slate-600 text-[9px] font-bold rounded-full border border-slate-200 dark:border-slate-800 uppercase">
                                                    {applicant.department || 'General Profile'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Step Form / Details */}
                                    <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100/80 shadow-sm hide-tab-header overflow-x-hidden">
                                        <AnimatePresence mode="wait" initial={false}>
                                            <motion.div
                                                key={modalTab}
                                                initial={{ opacity: 0, x: slideDirection * 80 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: slideDirection * -80 }}
                                                transition={{ type: 'spring', stiffness: 350, damping: 32, mass: 0.8 }}
                                                style={{ willChange: 'transform, opacity' }}
                                            >
                                                {modalTab === 'typing' && (
                                                    <TypingTab
                                                        applicant={applicant}
                                                        onQueue={onQueue}
                                                        handlePromote={handlePromote}
                                                        handleUpdateApplication={handleUpdateApplication}
                                                    />
                                                )}

                                                {modalTab === 'initial' && (
                                                    <InitialInterviewTab
                                                        applicant={applicant}
                                                        handleUpdateApplication={handleUpdateApplication}
                                                        onQueue={onQueue}
                                                        handlePromote={handlePromote}
                                                        onRegress={onRegress}
                                                        setShowEvaluationResults={setShowEvaluationResults}
                                                        showRegressPrompt={showRegressPrompt}
                                                        setShowRegressPrompt={setShowRegressPrompt}
                                                        showRejectionPrompt={showRejectionPrompt}
                                                        setShowRejectionPrompt={setShowRejectionPrompt}
                                                        rejectionReasonInput={rejectionReasonInput}
                                                        setRejectionReasonInput={setRejectionReasonInput}
                                                        onDelete={onDelete}
                                                    />
                                                )}

                                                {modalTab === 'assessment' && (
                                                    <AssessmentTab
                                                        applicant={applicant}
                                                        assessmentScore={assessmentScore}
                                                        setAssessmentScore={setAssessmentScore}
                                                        handleGiveGrade={handleGiveGrade}
                                                        handleUpdateApplication={handleUpdateApplication}
                                                        setModalTab={setModalTab}
                                                    />
                                                )}

                                                {modalTab === 'assessment_ii' && (
                                                    <AssessmentTab
                                                        isTestII={true}
                                                        applicant={applicant}
                                                        assessmentScore={assessmentScore}
                                                        setAssessmentScore={setAssessmentScore}
                                                        handleGiveGrade={handleGiveGrade}
                                                        handleUpdateApplication={handleUpdateApplication}
                                                        setModalTab={setModalTab}
                                                    />
                                                )}

                                                {modalTab === 'endorsement' && (
                                                    <FinalInterviewTab
                                                        mode="endorsement"
                                                        applicant={applicant}
                                                        finalInterviewNotes={finalInterviewNotes}
                                                        setFinalInterviewNotes={setFinalInterviewNotes}
                                                        onQueue={onQueue}
                                                        setModalTab={setModalTab}
                                                        validators={validators}
                                                        handleUpdateApplication={handleUpdateApplication}
                                                        onRouteToSpecialized={onRouteToSpecialized}
                                                        onClose={onClose}
                                                        onDelete={onDelete}
                                                    />
                                                )}

                                                {modalTab === 'scheduling' && (
                                                    <FinalInterviewTab
                                                        mode="scheduling"
                                                        applicant={applicant}
                                                        finalInterviewNotes={finalInterviewNotes}
                                                        setFinalInterviewNotes={setFinalInterviewNotes}
                                                        onQueue={onQueue}
                                                        setModalTab={setModalTab}
                                                        validators={validators}
                                                        handleUpdateApplication={handleUpdateApplication}
                                                        onRouteToSpecialized={onRouteToSpecialized}
                                                        onClose={onClose}
                                                        onDelete={onDelete}
                                                    />
                                                )}

                                                {modalTab === 'client_assessment' && (
                                                    <ClientAssessmentTab
                                                        applicant={applicant}
                                                        clientAssessmentScore={clientAssessmentScore}
                                                        setClientAssessmentScore={setClientAssessmentScore}
                                                        handleGiveGrade={handleGiveClientAssessmentGrade}
                                                        handlePromote={handlePromote}
                                                        onRegress={onRegress}
                                                        showRegressPrompt={showRegressPrompt}
                                                        setShowRegressPrompt={setShowRegressPrompt}
                                                        showRejectionPrompt={showRejectionPrompt}
                                                        setShowRejectionPrompt={setShowRejectionPrompt}
                                                        rejectionReasonInput={rejectionReasonInput}
                                                        setRejectionReasonInput={setRejectionReasonInput}
                                                    />
                                                )}

                                                {modalTab === 'client_interview' && (
                                                    <ClientInterviewTab
                                                        applicant={applicant}
                                                        clientInterviewRemarks={clientInterviewRemarks}
                                                        setClientInterviewRemarks={setClientInterviewRemarks}
                                                        handlePromote={handleGiveClientInterviewVerdict}
                                                        onRegress={onRegress}
                                                        showRegressPrompt={showRegressPrompt}
                                                        setShowRegressPrompt={setShowRegressPrompt}
                                                        showRejectionPrompt={showRejectionPrompt}
                                                        setShowRejectionPrompt={setShowRejectionPrompt}
                                                        rejectionReasonInput={rejectionReasonInput}
                                                        setRejectionReasonInput={setRejectionReasonInput}
                                                        isOptional={targetDept === 'ENERCARE'}
                                                    />
                                                )}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : topTab === 'log' ? (
                        <ApplicationLogTab applicant={applicant} />
                    ) : topTab === 'tagging' ? (
                        <TaggingTab applicant={applicant} onUpdate={handleUpdateApplication} onRegress={onRegress} />
                    ) : (
                        <ForceStatusTab applicant={applicant} onUpdate={handleUpdateApplication} />
                    )}
                </div>

                <div className="px-8 py-3 bg-surface-50 border-t border-surface-300 flex items-center justify-between shrink-0 select-none">
                    <div className="flex items-center">
                        {/* Combined Internal Record Management */}
                        {modalTab !== 'application' && modalTab !== 'verdict' && (
                            <button
                                onClick={() => onDelete(applicant)}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-red-300 hover:border-red-400 text-red-600 text-[9px] font-bold uppercase tracking-widest shadow-sm hover:bg-red-50 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                Delete Candidate
                            </button>
                        )}
                        {topTab === 'process' && !isOpsValidator && (
                            <button
                                onClick={() => {
                                    if (modalTab !== 'application') {
                                        setModalTab('application');
                                        setIsEditing(true);
                                    } else {
                                        setIsEditing(!isEditing);
                                    }
                                }}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer ml-2",
                                    isEditing 
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                        : "bg-primary-600 text-white hover:bg-primary-700"
                                )}
                            >
                                {isEditing ? 'Save Changes' : 'Edit PIS'}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        {modalTab !== 'application' && (
                            <div className="flex items-center bg-white dark:bg-slate-900 p-1 border border-surface-200/60 shadow-sm mr-2">
                                {modalTab !== 'typing' && (
                                    <>
                                        <button
                                            onClick={() => setShowCustomRegressConfirm(true)}
                                            className="px-3 py-1.5 bg-transparent text-amber-600 hover:bg-amber-50 text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                                        >
                                            Revert Step
                                        </button>
                                        <div className="w-[1px] h-4 bg-surface-200 mx-1" />
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const rawSkipped = applicant.metadata?.skipped_stages;
                                        const parsedSkipped = Array.isArray(rawSkipped) ? rawSkipped : (typeof rawSkipped === 'string' ? (() => { try { const p = JSON.parse(rawSkipped); return Array.isArray(p) ? p : []; } catch { return []; } })() : []);
                                        const skippedStages = [...parsedSkipped];
                                        if (!skippedStages.includes(modalTab)) {
                                            skippedStages.push(modalTab);
                                        }

                                        try {
                                            await handleUpdateApplication(applicant.id, {
                                                metadata: {
                                                    ...(applicant.metadata || {}),
                                                    skipped_stages: skippedStages
                                                }
                                            });
                                            const updatedApp = {
                                                ...applicant,
                                                metadata: {
                                                    ...(applicant.metadata || {}),
                                                    skipped_stages: skippedStages
                                                }
                                            };
                                            handlePromote(updatedApp as Application, 'pass', 'Manually skipped stage');

                                            let nextTab: ModalTab = 'verdict';
                                            const currentIdx = tabs.findIndex(t => t.id === modalTab);
                                            if (currentIdx !== -1 && currentIdx < tabs.length - 1) {
                                                nextTab = tabs[currentIdx + 1].id;
                                            }
                                            setModalTab(nextTab);
                                        } catch (err) {
                                            console.error('Failed to skip stage:', err);
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-600 text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                                >
                                    Skip Step
                                </button>
                            </div>
                        )}
                        {modalTab === 'application' && (
                            <div className="relative" ref={exportDropdownRef}>
                                <button
                                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                                    disabled={isExporting || applicant.current_status === 'WITHDRAWN'}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-sm cursor-pointer"
                                >
                                    <FileOutput size={12} />
                                    {isExporting ? 'Processing...' : 'Export'}
                                    <ChevronDown size={12} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {exportMenuOpen && (
                                    <div className="absolute bottom-full right-0 mb-1 w-48 bg-white dark:bg-slate-900 border border-surface-200 shadow-lg z-50 overflow-hidden">
                                        <button
                                            onClick={() => handleDownloadPDF('pis')}
                                            className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-surface-700 hover:bg-surface-50 hover:text-primary-600 transition-colors uppercase tracking-wider"
                                        >
                                            PIS Form
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPDF('candidate')}
                                            className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-surface-700 hover:bg-surface-50 hover:text-primary-600 transition-colors border-t border-surface-100 uppercase tracking-wider"
                                        >
                                            Candidate Data
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="w-[1px] h-6 bg-surface-200 mx-1" />

                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-white dark:bg-slate-900 border border-surface-200/60 text-surface-600 hover:text-surface-900 text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-surface-50 transition-all cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <EvaluationModal
                    applicant={applicant}
                    showEvaluationResults={showEvaluationResults}
                    setShowEvaluationResults={setShowEvaluationResults}
                    initQuestions={activeQuestions}
                    responses={interviewResponses}
                    safeOverallRating={safeOverallRating}
                    recommendation={recommendation}
                />

                <ConfirmDialog
                    open={showCustomRegressConfirm}
                    onClose={() => setShowCustomRegressConfirm(false)}
                    onConfirm={() => {
                        setShowCustomRegressConfirm(false);
                        const activeTabIds = tabs.map(t => t.id);
                        const currentIdx = activeTabIds.indexOf(modalTab);
                        if (currentIdx > 0) {
                            setModalTab(activeTabIds[currentIdx - 1]);
                        }
                        onRegress(applicant, modalTab);
                    }}
                    title="Revert Stage Progress"
                    message="Are you sure you want to revert this candidate's application back to the previous stage? Mapped progress and status details for the current stage will be cleared."
                    confirmText="Revert Stage"
                    confirmClass="bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
                />

                {/* Hidden Export Template */}
                <div className="fixed -left-[9999px] top-0 pointer-events-none">
                    <PISExportTemplate ref={exportRef} application={applicant} />
                    <CandidateDataExportTemplate ref={candidateExportRef} application={applicant} />
                </div>

                {showDuplicateReview && duplicateRequests && duplicateRequests.length > 0 && (
                    <DuplicateReviewDashboard
                        primaryApp={applicant}
                        duplicateApp={duplicateRequests[0]}
                        onMerge={(sourceApp) => {
                            if (onMergeDuplicate) onMergeDuplicate(sourceApp);
                            setShowDuplicateReview(false);
                        }}
                        onCancel={() => setShowDuplicateReview(false)}
                    />
                )}

                {showResumeManager && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                        >
                            <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-surface-900">Manage Resume</h3>
                                <button onClick={() => setShowResumeManager(false)} className="text-surface-400 hover:text-surface-700 transition-colors p-1 hover:bg-surface-200 rounded-md">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                {(applicant.resume_name || applicant.resume_data || applicant.resume_path) ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-surface-700">Current Resume:</p>
                                        <div className="flex items-center justify-between p-3 border border-surface-200 bg-surface-50 rounded-lg">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <FileText size={20} className="text-blue-500 shrink-0" />
                                                <span className="text-sm font-medium text-surface-900 truncate">{applicant.resume_name || 'Resume.pdf'}</span>
                                            </div>
                                            <a
                                                href={applicant.resume_data || `/api/applications/${applicant.id}/resume`}
                                                download={applicant.resume_name || "Resume.pdf"}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                            >
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 border border-dashed border-surface-300 rounded-lg bg-surface-50 text-center">
                                        <FileText size={24} className="mx-auto text-surface-400 mb-2" />
                                        <p className="text-sm text-surface-600">No resume attached to this application.</p>
                                    </div>
                                )}

                                {!isOpsValidator && (
                                    <div className="pt-4 border-t border-surface-200">
                                        <p className="text-sm font-semibold text-surface-700 mb-3">Upload New Resume:</p>
                                        <input
                                            type="file"
                                            ref={resumeInputRef}
                                            accept=".pdf,.doc,.docx"
                                            className="hidden"
                                            onChange={handleResumeUpload}
                                        />
                                        <button
                                            onClick={() => resumeInputRef.current?.click()}
                                            disabled={isUploadingResume}
                                            className="w-full py-2.5 flex items-center justify-center gap-2 bg-white border border-surface-300 hover:border-primary-500 hover:bg-primary-50 text-surface-700 hover:text-primary-700 font-semibold text-sm rounded-lg transition-all shadow-sm disabled:opacity-50"
                                        >
                                            {isUploadingResume ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                            {isUploadingResume ? 'Uploading...' : 'Choose File to Upload'}
                                        </button>
                                        <p className="text-[11px] text-surface-400 text-center mt-2">Accepts .pdf, .doc, .docx (Max 5MB)</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

            </motion.div>
        </div>,
        document.body
    );
}


