import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Clock3, FileOutput, Download, Lock, CheckCircle2, Info, Loader2, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatDate } from '@/utils/formatters';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Application } from '@/types/application';
import { User as UserType } from '@/types/user';
import { PISExportTemplate } from '@/components/features/ApplicantManagement/PISExportTemplate';

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
import { QuestionService } from '@/services/QuestionService';
import { ConfirmDialog } from '@/components/common/Modal';

type ModalTab = 'application' | 'typing' | 'initial' | 'assessment' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';

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
    onRegress: (app: Application) => void;
    onWithdraw: (app: Application) => void;
    validators: UserType[];
    handleUpdateApplication: (id: string, patch: any) => void;
    onRouteToSpecialized: (app: Application, name: string) => boolean | void | Promise<boolean | void>;
    onDelete: (app: Application) => void;
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

function formatStatusLabel(status: string | undefined): string {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
                                    : "bg-white border-surface-200 hover:border-surface-300 hover:shadow-md"
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
                                        {formatStatusLabel(app.current_status)}
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
                                                                        {formatStatusLabel(t.to_status)}
                                                                    </span>
                                                                    {t.from_status && (
                                                                        <span className="text-surface-400 text-[10px] ml-1.5 font-medium">
                                                                            (from {formatStatusLabel(t.from_status)})
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
                                                                            {" · "}
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

const CONCLUDED_STATUSES = [
    'For Job Offer', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 
    'HIRED', 'HIRED_PROCESSED', 'PASSED', 'FINAL_VERDICT', 
    'FOR PAN', 'For PAN', 'FOR_PAN', 
    'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'Accepted Offer', 
    'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'Sent JO and BGC'
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
    validators, handleUpdateApplication, onRouteToSpecialized, onDelete
}: DetailModalPortalProps) {
    const [topTab, setTopTab] = useState<'process' | 'log'>('process');
    const [showPIS, setShowPIS] = useState(false);
    const [showEvaluationResults, setShowEvaluationResults] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [showRejectionPrompt, setShowRejectionPrompt] = useState(false);
    const [showRegressPrompt, setShowRegressPrompt] = useState(false);
    const [showCustomRegressConfirm, setShowCustomRegressConfirm] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [allQuestions, setAllQuestions] = useState<any[]>([]);
    
    const exportRef = useRef<HTMLDivElement>(null);
    const stepperRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const statusesWithTimer = ['INITIAL_INTERVIEW', 'ASSESSMENT', 'FINAL_INTERVIEW'];
        if (!statusesWithTimer.includes(applicant.current_status)) {
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

    const handleDownloadPDF = async () => {
        if (!exportRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width / 2, canvas.height / 2]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save(`PIS-${applicant.applicant_name.replace(/\s+/g, '_')}-${formatDate(new Date().toISOString())}.pdf`);
        } catch (error) {
            console.error('PDF Export failed:', error);
        } finally {
            setIsExporting(false);
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

    const isKellerPostman = targetDept === 'KELLER POSTMAN';
    const isSpecializedClient = ['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE', 'AUTO APPROVE'].includes(targetDept);
    const isSpecialized = isKellerPostman || isSpecializedClient;

    const finalInterviewLabel = isSpecialized ? 'Ops Validator' : 'Final Interview';

    const requiredProcesses: string[] | undefined = applicant.pis?.required_processes || applicant.metadata?.required_processes;

    let processOrder: string[] = applicant.pis?.process_order || applicant.metadata?.process_order || [
        'TYPING_TEST',
        'INITIAL_INTERVIEW',
        'OPS_VALIDATION',
        'ASSESSMENT',
        'CLIENT_ASSESSMENT',
        'CLIENT_INTERVIEW'
    ];

    if (processOrder.indexOf('ASSESSMENT') !== -1 && processOrder.indexOf('OPS_VALIDATION') !== -1) {
        const idxAssess = processOrder.indexOf('ASSESSMENT');
        const idxOps = processOrder.indexOf('OPS_VALIDATION');
        if (idxAssess < idxOps) {
            const newOrder = [...processOrder];
            newOrder[idxAssess] = 'OPS_VALIDATION';
            newOrder[idxOps] = 'ASSESSMENT';
            processOrder = newOrder;
        }
    }

    const activeStages = processOrder.filter(stageId => {
        if (requiredProcesses && !requiredProcesses.includes(stageId)) return false;
        if (stageId === 'CLIENT_ASSESSMENT') {
            return (isKellerPostman || targetDept === 'AUTO APPROVE');
        }
        if (stageId === 'CLIENT_INTERVIEW') {
            return (isKellerPostman || ['AUTO APPROVE', 'TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].includes(targetDept));
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
            baseTabs.push({ id: 'initial', label: 'Initial Screening' });
        } else if (stageId === 'OPS_VALIDATION') {
            baseTabs.push({ id: 'endorsement', label: isSpecialized ? 'Ops Val Endorsement' : 'Endorsement' });
        } else if (stageId === 'ASSESSMENT') {
            baseTabs.push({ id: 'assessment', label: 'Technical Assessment' });
            baseTabs.push({ id: 'scheduling', label: 'Scheduling' });
        } else if (stageId === 'CLIENT_ASSESSMENT') {
            baseTabs.push({ id: 'client_assessment', label: 'Client Assessment' });
        } else if (stageId === 'CLIENT_INTERVIEW') {
            baseTabs.push({ id: 'client_interview', label: targetDept === 'ENERCARE' ? 'Client Interview (Optional)' : 'Client Interview' });
        }
    });

    baseTabs.push({ id: 'verdict', label: 'Verdict' });

    let seqVal = 1;
    const tabs = baseTabs.map(tab => {
        if (tab.id === 'application' || tab.id === 'verdict') return tab;
        return { ...tab, label: `${seqVal++}. ${tab.label}` };
    });

    const getTabRank = (tId: ModalTab): number => {
        if (tId === 'application') return -1;
        if (tId === 'verdict') return 99;

        let stageId = '';
        if (tId === 'typing') stageId = 'TYPING_TEST';
        else if (tId === 'initial') stageId = 'INITIAL_INTERVIEW';
        else if (tId === 'endorsement') stageId = 'OPS_VALIDATION';
        else if (tId === 'assessment' || tId === 'scheduling') stageId = 'ASSESSMENT';
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
        'FINAL_INTERVIEW': 'OPS_VALIDATION',
        'FINAL_INTERVIEW_SCHEDULED': 'ASSESSMENT',
        'CLIENT_ASSESSMENT': 'CLIENT_ASSESSMENT',
        'CLIENT_INTERVIEW': 'CLIENT_INTERVIEW',
        'FOR_JOB_OFFER': 'VERDICT',
        'FOR JOB OFFER': 'VERDICT',
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
    const getTabStatus = (tabId: ModalTab): 'passed' | 'failed' | 'active' | 'locked' => {
        const currentRank = getApplicantStatusRank(applicant.current_status, applicant);
        const isRejected = ['REJECTED', 'FAILED', 'WITHDRAWN'].includes(applicant.current_status);

        const processSettings = applicant.process_settings || applicant.pis?.process_settings || applicant.metadata?.process_settings || {};
        const isStagePassedInSettings = (tId: ModalTab): boolean => {
            if (tId === 'typing') return processSettings['TYPING_TEST'] === 'PASSED';
            if (tId === 'initial') return processSettings['INITIAL_INTERVIEW'] === 'PASSED';
            if (tId === 'endorsement') return processSettings['OPS_VALIDATION'] === 'PASSED';
            if (tId === 'assessment' || tId === 'scheduling') return processSettings['ASSESSMENT'] === 'PASSED';
            if (tId === 'client_assessment') return processSettings['CLIENT_ASSESSMENT'] === 'PASSED';
            if (tId === 'client_interview') return processSettings['CLIENT_INTERVIEW'] === 'PASSED';
            return false;
        };

        // Helper to determine if a specific tab has been completed/passed
        const isTabPassed = (tId: ModalTab): boolean => {
            if (tId === 'application') return true;
            if (tId === 'verdict') return false;

            const tRank = getTabRank(tId);
            const hasDataPassed = 
                (tId === 'typing' && applicant.typing_test_wpm !== undefined) ||
                (tId === 'initial' && Object.keys(applicant.interview_responses || {}).length > 0) ||
                (tId === 'assessment' && applicant.assessment_score !== undefined) ||
                (tId === 'endorsement' && !!applicant.department) ||
                (tId === 'scheduling' && (applicant.current_status === 'FINAL_INTERVIEW_SCHEDULED' || !!applicant.endorsement_meeting_date)) ||
                (tId === 'client_assessment' && ['CLIENT_INTERVIEW', 'PASSED', 'HIRED', 'FOR_JOB_OFFER', 'For Job Offer', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'FOR_PAN', 'FOR PAN', 'For PAN'].includes(applicant.current_status)) ||
                (tId === 'client_interview' && ['PASSED', 'HIRED', 'FOR_JOB_OFFER', 'For Job Offer', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'FOR_PAN', 'FOR PAN', 'For PAN'].includes(applicant.current_status));

            return (tRank !== -1 && tRank < currentRank) || isStagePassedInSettings(tId) || hasDataPassed;
        };

        // Lock check: if this stage is after the candidate's current stage in activeStages sequence, lock it!
        const statusUpper = (applicant.current_status || '').toUpperCase().trim();
        const currentStage = statusToStageMap[statusUpper] || (applicant.current_status ? 'VERDICT' : 'TYPING_TEST');
        const currentStageIdx = activeStages.indexOf(currentStage);
        let stageId = '';
        if (tabId === 'typing') stageId = 'TYPING_TEST';
        else if (tabId === 'initial') stageId = 'INITIAL_INTERVIEW';
        else if (tabId === 'endorsement') stageId = 'OPS_VALIDATION';
        else if (tabId === 'assessment' || tabId === 'scheduling') stageId = 'ASSESSMENT';
        else if (tabId === 'client_assessment') stageId = 'CLIENT_ASSESSMENT';
        else if (tabId === 'client_interview') stageId = 'CLIENT_INTERVIEW';

        const tabStageIdx = activeStages.indexOf(stageId);
        
        // Find if previous tab in the tabs array is completed/passed.
        // If the previous tab is completed, this tab is unlocked even if the backend status is still transitioning.
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        const isPreviousTabPassed = tabIndex > 0 ? isTabPassed(tabs[tabIndex - 1].id) : true;

        if (currentStageIdx !== -1 && tabStageIdx !== -1 && tabStageIdx > currentStageIdx && !isPreviousTabPassed) {
            return 'locked';
        }

        const hasEndorsement = !!applicant.department;
        if (tabId === 'scheduling' && (!hasEndorsement || !isTabPassed('assessment'))) {
            return 'locked';
        }

        const isPassed = isTabPassed(tabId);

        if (isPassed) {
            if (modalTab === tabId) return 'active';
            return 'passed';
        }

        // Verdict tab logic
        if (tabId === 'verdict') {
            if (applicant.current_status === 'PASSED' || applicant.current_status === 'HIRED') return 'passed';
            if (isRejected) return 'failed';
            return 'active';
        }

        // If not passed and status is rejected, this is likely where they failed
        if (isRejected) return 'failed';

        // Otherwise, if it's the current tab, it's active
        if (modalTab === tabId) return 'active';

        return 'active'; // Default for not-yet-completed stages (always reachable)
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
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
                className="relative w-full max-w-7xl bg-white shadow-[0_32px_128px_-16px_rgba(0,0,0,0.35)] overflow-hidden rounded-xl flex flex-col max-h-[95vh] border border-surface-200 z-[110]"
            >
                {/* Header Information Area */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-surface-100 bg-white">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-primary-900 rounded-lg flex items-center justify-center text-white shadow-lg ring-4 ring-primary-50 overflow-hidden">
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
                            <h1 className="text-2xl font-bold text-surface-900 tracking-tight leading-none">
                                {applicant.applicant_name}
                            </h1>
                            <div className="flex items-center gap-4 text-surface-500">
                                <p className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                    <Briefcase size={13} className="text-primary-600" /> {(applicant.position_title || '').replace(/\[INTERNAL\]/gi, '[ON-CALL]')}
                                </p>
                                <span className="w-1 h-1 bg-surface-200 rounded-full" />
                                <p className="text-[11px] font-bold uppercase tracking-[0.1em]">
                                    ID: <span className="text-surface-900">{applicant.applicant_id}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right flex flex-col items-end gap-2">
                            <span className={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                applicant.current_status === 'PASSED' || applicant.current_status === 'HIRED' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                    applicant.current_status === 'REJECTED' || applicant.current_status === 'FAILED' ? "bg-red-50 border-red-200 text-red-700" :
                                        "bg-blue-50 border-blue-200 text-blue-700"
                            )}>
                                {applicant.current_status.replace(/_/g, ' ')}
                            </span>
                            {timeLeft !== null && (
                                <p className="text-[10px] font-black text-primary-600 flex items-center gap-1.5 uppercase tracking-[0.15em] opacity-80">
                                    <Clock3 size={12} className="animate-pulse" /> {formatTime(timeLeft)}
                                </p>
                            )}
                        </div>
                        <div className="w-[1px] h-10 bg-surface-100" />
                        <div className="flex items-center gap-2">
                            <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-sm text-[10px] font-bold text-surface-700 uppercase tracking-widest hover:bg-surface-50 transition-all shadow-sm">
                                <Download size={14} className="text-primary-600" /> Export PIS
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-surface-50 text-surface-400 hover:text-surface-900 transition-all rounded-sm">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Top-Level Navigation Tabs */}
                <div className="bg-white px-8 border-b border-surface-100 flex gap-6 shrink-0 overflow-x-auto">
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
                </div>

                {/* Modern Tab Strip Navigation */}
                {topTab === 'process' && (
                    <div ref={stepperRef} className="bg-slate-50/50 px-8 py-3.5 border-b border-surface-100 overflow-x-auto scrollbar-none shrink-0">
                        <div className="flex items-center justify-start gap-2 min-w-max py-1">
                            {tabs.map((tab, index) => {
                                const status = getTabStatus(tab.id);
                                const isActive = modalTab === tab.id;
                                const isLocked = status === 'locked';
                                const isLast = index === tabs.length - 1;
                                
                                let stepStyle = '';
                                let iconColor = '';
                                let IconComp: any = null;
                                
                                if (status === 'passed') {
                                    stepStyle = 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200/85';
                                    iconColor = 'text-emerald-500';
                                    IconComp = CheckCircle2;
                                } else if (status === 'active') {
                                    stepStyle = 'text-blue-900 bg-blue-50 border-blue-300 ring-2 ring-blue-100/50';
                                    iconColor = 'text-blue-600';
                                    IconComp = Clock3;
                                } else if (status === 'failed') {
                                    stepStyle = 'text-rose-800 bg-rose-50 hover:bg-rose-100/70 border-rose-200';
                                    iconColor = 'text-rose-500';
                                    IconComp = X;
                                } else { // locked
                                    stepStyle = 'text-slate-400 bg-slate-50 border-slate-200/60 cursor-not-allowed opacity-80';
                                    iconColor = 'text-slate-300';
                                    IconComp = Lock;
                                }
                                
                                return (
                                    <React.Fragment key={tab.id}>
                                        <button
                                            onClick={() => !isLocked && setModalTab(tab.id)}
                                            disabled={isLocked}
                                            className={cn(
                                                "px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 flex items-center gap-2 group outline-none",
                                                stepStyle,
                                                isActive ? "ring-2 ring-offset-1 ring-primary-600 font-extrabold shadow-sm bg-white" : ""
                                            )}
                                        >
                                            {IconComp && <IconComp size={13} className={cn(iconColor, status === 'active' && isActive ? 'animate-pulse' : '')} />}
                                            <span>{tab.label}</span>
                                        </button>
                                        
                                        {!isLast && (
                                            <div className="flex items-center justify-center px-1">
                                                <div className={cn(
                                                    "w-5.5 h-5.5 rounded-full flex items-center justify-center border shadow-sm transition-all duration-300",
                                                    status === 'passed' ? 'bg-emerald-50 border-emerald-200 text-emerald-500' :
                                                    status === 'active' ? 'bg-blue-50 border-blue-200 text-blue-500' :
                                                    'bg-slate-50 border-slate-200 text-slate-400'
                                                )}>
                                                    {tab.id === 'initial' && tabs[index + 1]?.id === 'endorsement' ? (
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 bg-white custom-scrollbar">
                    {topTab === 'process' ? (
                        <>
                            {(() => {
                                const isPassed = ['PASSED', 'HIRED', 'FOR_JOB_OFFER', 'For Job Offer'].includes(applicant.current_status) || 
                                                 (applicant as any).pis_final_specific_status?.toUpperCase().includes('PASSED') ||
                                                 applicant.current_status?.toUpperCase().includes('PASSED') ||
                                                 applicant.current_status?.toUpperCase().includes('HIRE') ||
                                                 applicant.current_status?.toUpperCase().includes('JOB OFFER');
                                const isDeletedFromMaster = applicant.metadata?.deleted_from_masterlist;
                                const isMaster = applicant.master_column === 'MASTERLIST' || applicant.master_status || applicant.current_status === 'HIRED' || applicant.current_status === 'PASSED';

                                if (isDeletedFromMaster) {
                                    return (
                                        <div className="mb-6 p-4 bg-red-50/80 border border-red-200/60 rounded-lg flex gap-3 text-red-900 shadow-sm animate-fade-in text-left">
                                            <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-red-800">Removed from Masterlist</h4>
                                                <p className="text-xs font-medium opacity-90 leading-relaxed">
                                                    This candidate is hidden from the Masterlist because they were explicitly archived or removed from the registry by a recruiter. Their active screening forms remain fully intact.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                if (!isPassed && !isMaster) {
                                    return (
                                        <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200/60 rounded-lg flex gap-3 text-amber-900 shadow-sm animate-fade-in text-left">
                                            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <div className="space-y-1 text-left">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Masterlist Inclusion Notice</h4>
                                                <p className="text-xs font-medium opacity-90 leading-relaxed text-left">
                                                    This candidate is not on the Masterlist yet. Candidates are automatically enrolled in the Masterlist once they achieve a final status of <strong className="font-bold">Passed</strong>, <strong className="font-bold">Hired</strong>, or <strong className="font-bold">For Job Offer</strong>. Currently, this applicant is active in the interview pipeline with the status of <strong className="font-bold uppercase">{applicant.current_status.replace(/_/g, ' ')}</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                return null;
                            })()}

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={modalTab}
                                    initial={{ opacity: 0, x: 5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -5 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {modalTab === 'application' && (
                                        <ApplicationTab
                                            applicant={applicant}
                                            showPIS={showPIS}
                                            setShowPIS={setShowPIS}
                                        />
                                    )}

                                    {modalTab === 'typing' && (
                                        <TypingTab
                                            applicant={applicant}
                                            onQueue={onQueue}
                                            handlePromote={handlePromote}
                                        />
                                    )}

                                    {modalTab === 'initial' && (
                                        <InitialInterviewTab
                                            applicant={applicant}
                                            onQueue={onQueue}
                                            handlePromote={handlePromote}
                                            onRegress={onRegress}
                                            setShowEvaluationResults={setShowEvaluationResults}
                                            showRejectionPrompt={showRejectionPrompt}
                                            setShowRejectionPrompt={setShowRejectionPrompt}
                                            rejectionReasonInput={rejectionReasonInput}
                                            setRejectionReasonInput={setRejectionReasonInput}
                                            showRegressPrompt={showRegressPrompt}
                                            setShowRegressPrompt={setShowRegressPrompt}
                                            onDelete={onDelete}
                                        />
                                    )}

                                    {modalTab === 'assessment' && (
                                        <AssessmentTab
                                            applicant={applicant}
                                            assessmentScore={assessmentScore}
                                            setAssessmentScore={setAssessmentScore}
                                            handleGiveGrade={handleGiveGrade}
                                            handlePromote={handlePromote}
                                            onRegress={onRegress}
                                            showRegressPrompt={showRegressPrompt}
                                            setShowRegressPrompt={setShowRegressPrompt}
                                            showRejectionPrompt={showRejectionPrompt}
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

                                    {modalTab === 'verdict' && (
                                        <VerdictTab
                                            applicant={applicant}
                                            showRejectionPrompt={showRejectionPrompt}
                                            setShowRejectionPrompt={setShowRejectionPrompt}
                                            rejectionReasonInput={rejectionReasonInput}
                                            setRejectionReasonInput={setRejectionReasonInput}
                                            handlePromote={handlePromote}
                                            onRegress={() => onRegress(applicant)}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </>
                    ) : (
                        <ApplicationLogTab applicant={applicant} />
                    )}
                </div>

                <div className="px-8 py-3 bg-surface-50 border-t border-surface-300 flex items-center justify-between shrink-0 select-none">
                    <div className="flex items-center gap-4">
                        <p className="text-[9px] font-bold text-surface-400 tracking-widest uppercase">RecruitMS v1.0</p>
                        
                        {/* Combined Internal Record Management */}
                        {modalTab !== 'application' && modalTab !== 'verdict' && (
                            <div className="flex items-center gap-2 border-l border-surface-200 pl-4">
                                {modalTab !== 'typing' && !(applicant.master_column === 'MASTERLIST' || CONCLUDED_STATUSES.includes(applicant.current_status)) && (
                                    <button
                                        onClick={() => setShowCustomRegressConfirm(true)}
                                        className="px-3 py-1.5 bg-white border border-amber-300 hover:border-amber-400 text-amber-600 text-[9px] font-bold uppercase tracking-wider rounded-sm shadow-2xs hover:bg-amber-50/50 transition-all cursor-pointer"
                                    >
                                        Revert Back
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(applicant)}
                                    className="px-3 py-1.5 bg-white border border-red-200 hover:border-red-300 text-red-500 text-[9px] font-bold uppercase tracking-wider rounded-sm shadow-2xs hover:bg-red-50/50 transition-all cursor-pointer"
                                >
                                    Purge Data
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {modalTab === 'application' && (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isExporting || applicant.current_status === 'WITHDRAWN'}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0078D4] text-white hover:bg-[#106EBE] text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-sm rounded-sm cursor-pointer"
                            >
                                <FileOutput size={11} />
                                {isExporting ? 'Processing...' : 'Export PIS'}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 bg-white border border-surface-200 text-surface-900 text-[9px] font-bold uppercase tracking-wider shadow-2xs hover:bg-surface-100 transition-all rounded-sm cursor-pointer"
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
                        onRegress(applicant);
                    }}
                    title="Revert Stage Progress"
                    message="Are you sure you want to revert this candidate's application back to the previous stage? Mapped progress and status details for the current stage will be cleared."
                    confirmText="Revert Stage"
                    confirmClass="bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
                />

                {/* Hidden Export Template */}
                <div className="fixed -left-[9999px] top-0 pointer-events-none">
                    <PISExportTemplate ref={exportRef} application={applicant} />
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
