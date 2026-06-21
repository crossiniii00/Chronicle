import React from 'react';
import { ArrowRight, Bell, CalendarClock, Check, CheckCircle2, ClipboardCheck, Lock, RotateCcw, Send, Trophy, UserCheck, XCircle } from 'lucide-react';
import type { Application } from '@/types/application';
import type { User } from '@/types/user';
import { cn } from '@/utils/formatters';
import { getActiveReprofileAccount, getReprofileQueue } from '@/utils/reprofileQueue';
import { FinalInterviewTab } from '@/components/features/ApplicantManagement/DetailTabs/FinalInterviewTab';
import { ClientAssessmentTab } from '@/components/features/ApplicantManagement/DetailTabs/ClientAssessmentTab';
import { ClientInterviewTab } from '@/components/features/ApplicantManagement/DetailTabs/ClientInterviewTab';
import { VerdictTab } from '@/components/features/ApplicantManagement/DetailTabs/VerdictTab';

type ReprofileProcessTab = 'queue' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';

interface ReprofileDetailModalProps {
    applicant: Application;
    onClose: () => void;
    onSetActiveAccount: (app: Application, account: string) => void;
    onFailActiveAccount: (app: Application) => void;
    validators: User[];
    finalInterviewNotes: string;
    setFinalInterviewNotes: (notes: string) => void;
    clientAssessmentScore: string;
    setClientAssessmentScore: (score: string) => void;
    clientInterviewRemarks: string;
    setClientInterviewRemarks: (remarks: string) => void;
    handleUpdateApplication: (id: string, patch: any) => void;
    onQueue: (app: Application, type: 'INITIAL' | 'FINAL') => void;
    onRouteToSpecialized: (app: Application, name: string) => boolean | void | Promise<boolean | void>;
    handleGiveClientAssessmentGrade: (app: Application) => void;
    handleGiveClientInterviewVerdict: (app: Application, result: 'pass' | 'fail', reason?: string) => void;
    handlePromote: (app: Application, result: 'pass' | 'conditional' | 'fail', reason?: string) => void;
    onRegress: (app: Application) => void;
}

const getReprofileStageRank = (app: Application): number => {
    const status = app.current_status.toUpperCase();
    if (status === 'CLIENT_ASSESSMENT') return 2;
    if (status === 'CLIENT_INTERVIEW') return 3;
    if (['FINAL_VERDICT', 'PASSED', 'HIRED', 'HIRED_PROCESSED'].includes(status)) return 4;
    
    if (['REJECTED', 'FAILED', 'WITHDRAWN'].includes(status)) {
        if (app.client_interview_remarks) return 3;
        if (app.client_assessment_score !== undefined && app.client_assessment_score !== null) return 2;
        return 1;
    }
    
    return 1;
};

export function ReprofileDetailModal({
    applicant,
    onClose,
    onSetActiveAccount,
    onFailActiveAccount,
    validators,
    finalInterviewNotes,
    setFinalInterviewNotes,
    clientAssessmentScore,
    setClientAssessmentScore,
    clientInterviewRemarks,
    setClientInterviewRemarks,
    handleUpdateApplication,
    onQueue,
    onRouteToSpecialized,
    handleGiveClientAssessmentGrade,
    handleGiveClientInterviewVerdict,
    handlePromote,
    onRegress
}: ReprofileDetailModalProps) {
    const queue = getReprofileQueue(applicant);
    const hasCompletedAccount = queue.some(item => item.status === 'COMPLETED');
    const isFinished = ['PASSED', 'FAILED', 'HIRED', 'HIRED_PROCESSED', 'REJECTED', 'WITHDRAWN', 'FOR_JOB_OFFER', 'For Job Offer', 'FOR PAN', 'For PAN', 'FOR_PAN', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'Accepted Offer', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'Sent JO and BGC'].includes(applicant.current_status) ||
                       applicant.pis?.ops_validator_status === 'PASSED' ||
                       applicant.pis?.ops_validator_status === 'FAILED' ||
                       hasCompletedAccount;
    const [processTab, setProcessTab] = React.useState<ReprofileProcessTab>(isFinished ? 'verdict' : 'queue');
    const [showRegressPrompt, setShowRegressPrompt] = React.useState(false);
    const [showRejectionPrompt, setShowRejectionPrompt] = React.useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = React.useState('');
    const activeAccount = getActiveReprofileAccount(applicant);
    const cleanAccountString = (val: string | null | undefined): string => {
        if (!val) return '';
        return val
            .split(',')
            .map(s => s.trim())
            .filter(s => s && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined')
            .join(', ');
    };
    const cleanDepartment = cleanAccountString(applicant.department);
    const waitingAccounts = queue.filter(item => item.status === 'WAITING');
    const failedAccounts = queue.filter(item => item.status === 'FAILED');
    const activeDepartment = activeAccount.toUpperCase();
    const needsClientAssessment = ['KELLER POSTMAN', 'AUTO APPROVE'].includes(activeDepartment);
    const needsClientInterview = needsClientAssessment || ['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].includes(activeDepartment);
    const hasOpsEndorsement = applicant.current_status === 'FINAL_INTERVIEW_SCHEDULED';
    const formatSessionDate = (value?: string) => {
        if (!value) return 'Not set';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return value;
        return parsed.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };
    const processStatusByTab: Record<ReprofileProcessTab, Application['current_status']> = {
        queue: 'FINAL_INTERVIEW',
        endorsement: 'FINAL_INTERVIEW',
        scheduling: 'FINAL_INTERVIEW',
        client_assessment: 'CLIENT_ASSESSMENT',
        client_interview: 'CLIENT_INTERVIEW',
        verdict: 'FINAL_VERDICT'
    };
    const isSpecialized = ['KELLER POSTMAN', 'AUTO APPROVE'].includes(activeAccount.toUpperCase());
    const processApplicant = {
        ...applicant,
        department: activeAccount || cleanDepartment,
        current_status: (isFinished 
            ? applicant.current_status 
            : (applicant.metadata?.reprofile_stage || 
               (processTab === 'scheduling' && applicant.current_status === 'FINAL_INTERVIEW_SCHEDULED' 
                   ? 'FINAL_INTERVIEW_SCHEDULED' 
                   : processStatusByTab[processTab]))) as Application['current_status'],
        endorsed_to_recruiter_s: isSpecialized ? applicant.endorsed_to_recruiter_s : false,
        metadata: {
            ...(applicant.metadata || {}),
            endorsed_to_recruiter_s: isSpecialized ? applicant.metadata?.endorsed_to_recruiter_s : false
        }
    };
    const currentRank = getReprofileStageRank(applicant);
    const processTabs = [
        { id: 'queue', label: 'Reprofile Queue' },
        { id: 'endorsement', label: 'Endorsement', locked: !activeAccount || currentRank < 1 },
        { id: 'scheduling', label: 'Scheduling', locked: !activeAccount || currentRank < 1 || !applicant.metadata?.endorsement_confirmed },
        ...(needsClientAssessment ? [{ id: 'client_assessment' as const, label: 'Client Assessment', locked: !activeAccount || currentRank < 2 }] : []),
        ...(needsClientInterview ? [{ id: 'client_interview' as const, label: activeDepartment === 'ENERCARE' ? 'Client Interview Optional' : 'Client Interview', locked: !activeAccount || currentRank < 3 }] : []),
        { id: 'verdict', label: 'Verdict', locked: !activeAccount || currentRank < (needsClientInterview ? 4 : (needsClientAssessment ? 3 : 1)) }
    ] satisfies Array<{ id: ReprofileProcessTab; label: string; locked?: boolean }>;

    React.useEffect(() => {
        const currentTabConfig = processTabs.find(tab => tab.id === processTab);
        if (!currentTabConfig || currentTabConfig.locked) {
            setProcessTab('queue');
        }
    }, [processTab, processTabs]);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div
                className="absolute inset-0 bg-surface-900/35 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className="relative w-full max-w-6xl bg-white border border-surface-200 rounded-md shadow-premium overflow-hidden flex flex-col max-h-[92vh]"
            >
                <div className="flex items-start justify-between p-6 border-b border-surface-100 bg-surface-50">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 h-14 rounded-md bg-primary-900 text-white flex items-center justify-center text-xl font-semibold shadow-sm shrink-0">
                            {applicant.applicant_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-primary-600">Reprofile tracker</p>
                            <h2 className="text-xl font-semibold text-surface-900 truncate">{applicant.applicant_name}</h2>
                            <p className="text-xs font-medium text-surface-500 mt-1">{applicant.position_title || 'Candidate'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-800 hover:bg-white rounded-sm transition-all">
                        <XCircle size={18} />
                    </button>
                </div>

                <div className="px-6 border-b border-surface-100 bg-white overflow-x-auto">
                    <div className="flex gap-5">
                        {processTabs.map(tab => {
                            const isActive = processTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    disabled={tab.locked}
                                    onClick={() => !tab.locked && setProcessTab(tab.id)}
                                    className={cn(
                                        "relative py-4 text-xs font-semibold flex items-center gap-2 transition-all shrink-0",
                                        tab.locked ? "text-surface-300 cursor-not-allowed" : isActive ? "text-primary-700" : "text-surface-500 hover:text-primary-700"
                                    )}
                                >
                                    {tab.locked && <Lock size={12} />}
                                    {tab.label}
                                    {isActive && <span className="absolute left-0 right-0 bottom-0 h-1 bg-primary-600 rounded-t-full" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {processTab === 'queue' && (
                        <div className="grid grid-cols-[1fr_1.25fr] gap-0 min-h-[420px]">
                            <section className="p-6 border-r border-surface-100 bg-white">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-3">Current Active Account</p>
                                <div className={cn(
                                    "p-5 border rounded-sm",
                                    isFinished ? "border-emerald-500 bg-emerald-50/50" : "border-emerald-200 bg-emerald-50"
                                )}>
                                    <div className="flex items-center gap-3">
                                        {isFinished ? (
                                            <Trophy size={18} className="text-emerald-700 shrink-0" />
                                        ) : (
                                            <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                                        )}
                                        <div>
                                            <p className={cn(
                                                "text-lg font-bold uppercase",
                                                isFinished ? "text-emerald-800" : "text-emerald-900"
                                            )}>{activeAccount || 'No Active Account'}</p>
                                            <p className={cn(
                                                "text-[11px] font-semibold mt-1",
                                                isFinished ? "text-emerald-800" : "text-emerald-700"
                                            )}>
                                                {isFinished ? 'Candidate successfully passed for this account.' : 'This is the account currently being tried for reprofile.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button
                                        type="button"
                                        disabled={!activeAccount || isFinished}
                                        onClick={() => setProcessTab(isFinished ? 'verdict' : 'endorsement')}
                                        className="px-4 py-3 bg-primary-600 text-white text-[11px] font-bold uppercase rounded-sm hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {isFinished ? 'View Details' : 'Go to Scheduling'} <ArrowRight size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!activeAccount || waitingAccounts.length === 0 || isFinished}
                                        onClick={() => onFailActiveAccount(applicant)}
                                        className="px-4 py-3 bg-red-600 text-white text-[11px] font-bold uppercase rounded-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <RotateCcw size={14} />
                                        Fail and Move Next
                                    </button>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Waiting Accounts</p>
                                        <p className="text-[11px] text-surface-500 mt-1">These stay parked until the active account fails.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {waitingAccounts.length ? waitingAccounts.map(item => (
                                            <span
                                                key={item.account}
                                                className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase rounded-sm"
                                            >
                                                {item.account}
                                            </span>
                                        )) : (
                                            <span className="text-xs font-semibold text-surface-400">No waiting accounts.</span>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section className="p-6 bg-surface-50/50">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-4">Reprofile Queue</p>
                                <div className="space-y-2">
                                    {queue.map((item, index) => (
                                        <div
                                            key={`${item.account}-${item.status}`}
                                            className={cn(
                                                "flex items-center justify-between gap-4 p-4 border rounded-sm bg-white shadow-sm",
                                                item.status === 'ACTIVE' && "border-emerald-200 bg-emerald-50/60",
                                                item.status === 'COMPLETED' && "border-emerald-500 bg-emerald-50/30",
                                                item.status === 'WAITING' && "border-amber-200",
                                                item.status === 'FAILED' && "border-red-100 bg-red-50/60"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={cn(
                                                    "w-7 h-7 rounded-sm border flex items-center justify-center text-[10px] font-bold",
                                                    item.status === 'COMPLETED' ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-surface-200 text-surface-500"
                                                )}>
                                                    {item.status === 'COMPLETED' ? <Check size={12} /> : index + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-surface-900 uppercase truncate">{item.account}</p>
                                                    <p className={cn(
                                                        "text-[10px] font-bold uppercase tracking-wider",
                                                        item.status === 'COMPLETED' ? "text-emerald-700" :
                                                        item.status === 'ACTIVE' ? "text-emerald-600" :
                                                        item.status === 'FAILED' ? "text-red-500" : "text-surface-400"
                                                    )}>{item.status}</p>
                                                </div>
                                            </div>
                                            {item.status === 'WAITING' && !isFinished && (
                                                <button
                                                    type="button"
                                                    onClick={() => onSetActiveAccount(applicant, item.account)}
                                                    className="px-3 py-2 bg-primary-600 text-white text-[10px] font-bold uppercase rounded-sm hover:bg-primary-700 transition-all flex items-center gap-2"
                                                >
                                                    Set Active <ArrowRight size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {failedAccounts.length > 0 && (
                                    <p className="mt-4 text-[11px] font-semibold text-red-600">
                                        Failed accounts remain in the queue history and will not be selected again automatically.
                                    </p>
                                )}
                            </section>
                        </div>
                    )}

                    {processTab === 'endorsement' && (
                        <div className="p-6">
                            <FinalInterviewTab
                                mode="endorsement"
                                applicant={processApplicant}
                                finalInterviewNotes={finalInterviewNotes}
                                setFinalInterviewNotes={setFinalInterviewNotes}
                                onQueue={onQueue}
                                setModalTab={(tab) => {
                                    if (tab === 'final') setProcessTab('scheduling');
                                    else setProcessTab(tab);
                                }}
                                validators={validators}
                                handleUpdateApplication={handleUpdateApplication}
                                onRouteToSpecialized={onRouteToSpecialized}
                                onClose={onClose}
                                fixedAccount={activeAccount}
                            />
                        </div>
                    )}

                    {processTab === 'scheduling' && (
                        <div className="p-6">
                            <FinalInterviewTab
                                mode="scheduling"
                                applicant={processApplicant}
                                finalInterviewNotes={finalInterviewNotes}
                                setFinalInterviewNotes={setFinalInterviewNotes}
                                onQueue={onQueue}
                                setModalTab={(tab) => {
                                    if (tab === 'final') setProcessTab('scheduling');
                                    else setProcessTab(tab);
                                }}
                                validators={validators}
                                handleUpdateApplication={handleUpdateApplication}
                                onRouteToSpecialized={onRouteToSpecialized}
                                onClose={onClose}
                                fixedAccount={activeAccount}
                            />
                        </div>
                    )}

                    {processTab === 'client_assessment' && (
                        <div className="p-6">
                            <ClientAssessmentTab
                                applicant={processApplicant}
                                clientAssessmentScore={clientAssessmentScore}
                                setClientAssessmentScore={setClientAssessmentScore}
                                handleGiveGrade={handleGiveClientAssessmentGrade}
                                handlePromote={handlePromote as any}
                                onRegress={onRegress}
                                showRegressPrompt={showRegressPrompt}
                                setShowRegressPrompt={setShowRegressPrompt}
                                showRejectionPrompt={showRejectionPrompt}
                                setShowRejectionPrompt={setShowRejectionPrompt}
                                rejectionReasonInput={rejectionReasonInput}
                                setRejectionReasonInput={setRejectionReasonInput}
                            />
                        </div>
                    )}

                    {processTab === 'client_interview' && (
                        <div className="p-6">
                            <ClientInterviewTab
                                applicant={processApplicant}
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
                                isOptional={activeDepartment === 'ENERCARE'}
                            />
                        </div>
                    )}

                    {processTab === 'verdict' && (
                        <div className="p-6">
                            <VerdictTab
                                applicant={processApplicant}
                                showRejectionPrompt={showRejectionPrompt}
                                setShowRejectionPrompt={setShowRejectionPrompt}
                                rejectionReasonInput={rejectionReasonInput}
                                setRejectionReasonInput={setRejectionReasonInput}
                                handlePromote={handlePromote}
                                onRegress={() => onRegress(processApplicant)}
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end p-5 border-t border-surface-100 bg-white">
                    <button onClick={onClose} className="px-8 py-3 border border-surface-200 text-surface-700 text-xs font-semibold rounded-sm hover:bg-surface-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
