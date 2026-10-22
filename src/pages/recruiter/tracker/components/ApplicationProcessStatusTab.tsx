import React, { useState, useEffect, useRef } from 'react';
import { CandidatePerformanceMetrics } from './CandidatePerformanceMetrics';
import { createPortal } from 'react-dom';
import { Truck, CheckCircle, Clock, Package, FileText, User, Briefcase, CheckCircle2, Clock3, Lock, X, FastForward } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application } from '@/types/application';
import { isStageDataComplete } from '@/utils/applicantDataValidation';

const getApplicantStatusRank = (status: string | undefined, applicant?: any): number => {
    if (!status) return 0;
    if ((status === 'OPEN' || !status) && applicant) {
        const spec = String(applicant.pis?.final_specific_status || applicant.final_specific_status || '').toLowerCase();
        if (spec.includes('hired')) return 6;
        if (spec.includes('jo -') || spec.includes('job offer')) return 6;
        if (spec.includes('client interview')) return 5;
        if (spec.includes('client assessment')) return 4;
        if (spec.includes('ov - passed') || spec.includes('ops val') || spec.includes('final') || spec.includes('ov -')) return 3;
        if (spec.includes('wonderlic') || spec.includes('speechx') || spec.includes('personality') || spec.includes('assessment')) return 2;
        if (spec.includes('recruitment interview') || spec.includes('initial')) return 1;
        if (spec.includes('typing')) return 0;
    }

    const ranks: Record<string, number> = {
        'APPLIED': 0,
        'TYPING_TEST': 0,
        'INITIAL_INTERVIEW': 1,
        'INTERVIEW_IN_PROGRESS': 1,
        'QUEUE_ASSIGNED': 1,
        'ASSESSMENT': 2,
        'FINAL_INTERVIEW': 3,
        'FINAL_INTERVIEW_SCHEDULED': 3,
        'CLIENT_ASSESSMENT': 4,
        'CLIENT_INTERVIEW': 5,
        'FOR_JOB_OFFER': 6,
        'For Job Offer': 6,
        'FINAL_VERDICT': 6,
        'PASSED': 6,
        'FAILED': 6,
        'CONDITIONAL': 6,
        'WAITLISTED': 6,
        'WITHDRAWN': 6,
        'HIRED': 6,
        'REJECTED': 6
    };
    return ranks[status] ?? 0;
};
// Import the sub-components that used to be separate tabs
import { TypingTestResults } from './TypingTestResults';
import { AssessmentsTab } from './AssessmentsTab';
import { AssessmentSidebarDisplay } from './AssessmentSidebarDisplay'; // Assuming we can use this for Application Details

type ModalTab = 'application' | 'typing' | 'initial' | 'assessment' | 'assessment_ii' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';

interface ApplicationProcessStatusTabProps {
    application: Application;
}

export function ApplicationProcessStatusTab({ application }: ApplicationProcessStatusTabProps) {
    const stepperRef = useRef<HTMLDivElement>(null);
    const [modalTab, setModalTab] = useState<ModalTab>('application');

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
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const selectedDepts = (application.department || '')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
    const failedAccounts = application.metadata?.failed_accounts || [];
    const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toUpperCase()));
    const activeDepts = selectedDepts.filter(d => !failedSet.has(d));
    const targetDept = activeDepts[0] || selectedDepts[0] || '';

    const isKellerPostman = targetDept.includes('KELLER POSTMAN');
    const isSpecializedClient = ['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE', 'AUTO APPROVE', 'PAESLER'].some(d => targetDept.includes(d));
    const isSpecialized = isKellerPostman || isSpecializedClient;

    const isOnCall = (application.position_title || '').toLowerCase().includes('[on-call]') ||
                     (application.position_title || '').toLowerCase().includes('on-call') ||
                     (application.metadata?.interview_mode || '').toLowerCase() === 'on-call' ||
                     (application.metadata?.active_interview_type || '').toLowerCase() === 'on-call' ||
                     (application.metadata?.preferred_setup || '').toLowerCase() === 'on-call' ||
                     application.is_on_call === true;

    const requiredProcesses: string[] | undefined = application.pis?.required_processes || application.metadata?.required_processes;

    let processOrder: string[] = application.pis?.process_order || application.metadata?.process_order || [
        'TYPING_TEST',
        'INITIAL_INTERVIEW',
        'ACCOUNT_ASSIGNMENT',
        'ASSESSMENT',
        'CLIENT_ASSESSMENT',
        'CLIENT_INTERVIEW'
    ];

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

    const isEnercare = targetDept.includes('ENERCARE') || (application.department || '').toUpperCase().includes('ENERCARE');
    const hasSecondTest = isEnercare && (
                          isOnCall || application.metadata?.force_second_test || 
                          application.metadata?.assessment_ii_score !== undefined ||
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

    const activeStages = processOrder.filter(stageId => {
        if (stageId === 'ASSESSMENT' && isOnCall) {
            return false;
        }
        if (stageId === 'ASSESSMENT_II') {
            if (isOnCall) return true;
            const hasSecondTestVal = isEnercare && (
                                     application.metadata?.force_second_test || 
                                     application.metadata?.assessment_ii_score !== undefined ||
                                     (requiredProcesses && requiredProcesses.includes('ASSESSMENT_II'))
            );
            return !!hasSecondTestVal;
        }
        if (requiredProcesses && !requiredProcesses.includes(stageId)) return false;
        if (stageId === 'CLIENT_ASSESSMENT') {
            return isKellerPostman;
        }
        if (stageId === 'CLIENT_INTERVIEW') {
            return (isKellerPostman || ['AUTO APPROVE', 'TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].some(d => targetDept.includes(d)));
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
        } else if (stageId === 'ACCOUNT_ASSIGNMENT') {
            baseTabs.push({ id: 'endorsement', label: 'For Ops Val Scheduling' });
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
            baseTabs.push({ id: 'client_interview', label: targetDept === 'ENERCARE' ? 'Client Interview (Optional)' : 'Client Interview' });
        }
    });

    baseTabs.push({ id: 'verdict', label: 'Verdict' });

    let seqVal = 1;
    const tabs = baseTabs.map(tab => {
        if (tab.id === 'application' || tab.id === 'verdict') return tab;
        return { ...tab, label: `${seqVal++}. ${tab.label}` };
    });

    const [hoverState, setHoverState] = useState<{ tabId: ModalTab | null, rect: DOMRect | null }>({ tabId: null, rect: null });
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = (e: React.MouseEvent, tabId: ModalTab) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverState({ tabId, rect });
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoverState({ tabId: null, rect: null });
        }, 150); // slight delay to allow moving mouse into the popup
    };

    const handlePopupMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };

    const renderHoverContent = () => {
        if (!hoverState.tabId || !hoverState.rect) return null;
        const tabId = hoverState.tabId;
        
        let content = null;
        if (tabId === 'typing') {
            content = <TypingTestResults application={application} />;
        } else if (tabId === 'assessment' || tabId === 'assessment_ii') {
            content = <AssessmentsTab applicant={application} handlePromote={() => {}} onRegress={() => {}} />;
        } else if (tabId === 'application') {
            const pis = application.metadata;
            content = (
                <div className="p-5 flex flex-col gap-4 min-w-[350px]">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                            <User size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg leading-tight">{application.applicant_name}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{application.applicant_email}</p>
                        </div>
                    </div>
                    {pis && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Phone</p>
                                <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{pis.phone || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Source</p>
                                <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{pis.hiring_source || '-'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Education</p>
                                <p className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{pis.highest_education || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Work Experience</p>
                                <p className="font-medium text-slate-700 dark:text-slate-300">{pis.work_experience?.length || 0} roles listed</p>
                            </div>
                        </div>
                    )}
                </div>
            );
        } else if (tabId === 'initial') {
            const responses = application.interview_responses || {};
            const keys = Object.keys(responses).filter(k => responses[k] && responses[k].trim() !== '').slice(0, 3);
            content = (
                <div className="p-5 flex flex-col gap-3 min-w-[350px] max-w-[450px]">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-3 mb-1 flex items-center gap-2">
                        <Briefcase size={18} className="text-primary-600" />
                        Initial Interview Snippet
                    </h4>
                    {keys.length > 0 ? (
                        <div className="flex flex-col gap-2 mt-2">
                            {keys.map((k, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 line-clamp-1">{k}</p>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">{responses[k]}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100">
                            No interview responses recorded yet.
                        </div>
                    )}
                </div>
            );
        } else if (tabId === 'verdict') {
            content = (
                <div className="p-5 flex flex-col gap-3 min-w-[300px]">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-3 mb-1 flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-600" />
                        Verdict Details
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-100 text-sm mt-2">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Current Status</p>
                        <p className="font-black text-lg text-slate-800 dark:text-slate-200 tracking-tight">{application.current_status || 'N/A'}</p>
                    </div>
                </div>
            );
        } else {
            content = (
                <div className="p-5 flex flex-col gap-3 min-w-[300px]">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-3 mb-1 flex items-center gap-2 capitalize">
                        <Clock size={18} className="text-indigo-600" />
                        {tabId.replace('_', ' ')}
                    </h4>
                    <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100/50 mt-2">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            This stage is currently part of the active pipeline.
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            Assigned to: {application.assigned_ops_validator_name || 'System / Unassigned'}
                        </p>
                    </div>
                </div>
            );
        }

        const cardWidth = 500;
        // Position to the right by default
        let left = hoverState.rect.right + 16;
        let isRight = true;
        
        // If it goes off-screen to the right, place it to the left instead
        if (left + cardWidth > window.innerWidth - 16) {
            left = hoverState.rect.left - cardWidth - 16;
            isRight = false;
        }

        // Align vertically with the item
        let top = hoverState.rect.top + hoverState.rect.height / 2;

        return createPortal(
            <div 
                className="fixed z-[9999] animate-fade-in transition-all duration-200"
                style={{
                    top: top,
                    left: left,
                    transform: 'translateY(-50%)',
                    width: cardWidth,
                }}
                onMouseEnter={handlePopupMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Arrow pointing left or right */}
                {isRight ? (
                    <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-b border-l border-surface-200 rotate-45 shadow-[-2px_2px_4px_rgba(0,0,0,0.02)] z-10"></div>
                ) : (
                    <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-t border-r border-surface-200 rotate-45 shadow-[2px_-2px_4px_rgba(0,0,0,0.02)] z-10"></div>
                )}
                
                {/* Content Container */}
                <div className="relative bg-white dark:bg-slate-900 border border-surface-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {content}
                </div>
            </div>,
            document.body
        );
    };



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
        'FINAL_INTERVIEW_SCHEDULED': 'SCHEDULING',
        'REPROFILE_FINAL_INTERVIEW': 'SCHEDULING',
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

    const getTabStatus = (tabId: ModalTab): 'passed' | 'failed' | 'active' | 'locked' => {
        const currentRank = getApplicantStatusRank(application.current_status, application);
        const isRejected = ['REJECTED', 'FAILED', 'WITHDRAWN'].includes(application.current_status);

        const processSettings = application.process_settings || application.pis?.process_settings || application.metadata?.process_settings || {};
        const isStagePassedInSettings = (tId: ModalTab): boolean => {
            if (tId === 'typing') return processSettings['TYPING_TEST'] === 'PASSED';
            if (tId === 'initial') return processSettings['INITIAL_INTERVIEW'] === 'PASSED';
            if (tId === 'endorsement') return processSettings['ACCOUNT_ASSIGNMENT'] === 'PASSED';
            if (tId === 'assessment') return processSettings['ASSESSMENT'] === 'PASSED';
            if (tId === 'scheduling') return processSettings['SCHEDULING'] === 'PASSED';
            if (tId === 'client_assessment') return processSettings['CLIENT_ASSESSMENT'] === 'PASSED';
            if (tId === 'client_interview') return processSettings['CLIENT_INTERVIEW'] === 'PASSED';
            return false;
        };

        const isTabPassed = (tId: ModalTab): boolean => {
            if (tId === 'application') return true;
            if (tId === 'verdict') return false;

            const skippedStages = application.metadata?.skipped_stages || [];
            const isSkipped = skippedStages.includes(tId);

            const hasDataPassed = isStageDataComplete(application, tId);

            const clientStageId = tId === 'client_assessment' ? 'CLIENT_ASSESSMENT' : tId === 'client_interview' ? 'CLIENT_INTERVIEW' : '';
            if (clientStageId && activeStages.includes(clientStageId)) {
                return isStagePassedInSettings(tId) || hasDataPassed || isSkipped;
            }

            if (hasDataPassed || isStagePassedInSettings(tId) || isSkipped) {
                return true;
            }

            return false;
        };

        const statusUpper = (application.current_status || '').toUpperCase().trim();
        const currentStage = statusToStageMap[statusUpper] || (application.current_status ? 'VERDICT' : 'TYPING_TEST');
        
        let expectedTabForCurrentStage: ModalTab = 'typing';
        if (isOnCall && currentStage === 'ASSESSMENT') expectedTabForCurrentStage = 'assessment_ii';
        else if (currentStage === 'TYPING_TEST') expectedTabForCurrentStage = 'typing';
        else if (currentStage === 'INITIAL_INTERVIEW') expectedTabForCurrentStage = 'initial';
        else if (currentStage === 'ACCOUNT_ASSIGNMENT') expectedTabForCurrentStage = 'endorsement';
        else if (currentStage === 'ASSESSMENT') expectedTabForCurrentStage = 'assessment';
        else if (currentStage === 'CLIENT_ASSESSMENT') expectedTabForCurrentStage = 'client_assessment';
        else if (currentStage === 'CLIENT_INTERVIEW') expectedTabForCurrentStage = 'client_interview';
        else if (currentStage === 'VERDICT') expectedTabForCurrentStage = 'verdict';

        const currentStageRank = getTabRank(expectedTabForCurrentStage);
        const thisTabRank = getTabRank(tabId);

        if (isRejected) {
            if (isTabPassed(tabId)) return 'passed';
            if (thisTabRank === currentStageRank) return 'failed';
            return 'locked';
        }

        if (isTabPassed(tabId)) return 'passed';
        if (thisTabRank < currentStageRank) return 'passed';
        if (thisTabRank === currentStageRank) return 'active';
        return 'locked';
    };

    return (
        <div className="flex flex-col lg:flex-row bg-white dark:bg-slate-900 rounded-lg h-full overflow-hidden">
            {renderHoverContent()}
            
            {/* Left Column: Vertical Stepper */}
            <div ref={stepperRef} className="lg:w-[350px] shrink-0 border-b lg:border-b-0 lg:border-r border-surface-200 bg-slate-50 dark:bg-slate-800/50 px-6 py-6 overflow-y-auto custom-scrollbar h-full flex flex-col">
                <div className="flex flex-col items-stretch justify-start w-full relative">
                    {tabs.map((tab, index) => {
                        const status = getTabStatus(tab.id);
                        const isHovered = hoverState.tabId === tab.id;
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
                            stepStyle = 'text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800/60 cursor-not-allowed opacity-80';
                            iconColor = 'text-slate-300';
                            IconComp = Lock;
                        }
                        
                        return (
                            <React.Fragment key={tab.id}>
                                <button
                                    onMouseEnter={(e) => handleMouseEnter(e, tab.id)}
                                    onMouseLeave={handleMouseLeave}
                                    className={cn(
                                        "w-full px-4 py-3.5 text-[10.5px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 flex items-center justify-start gap-3 outline-none relative",
                                        stepStyle,
                                        isHovered ? "ring-2 ring-offset-1 ring-primary-500 font-extrabold shadow-md scale-[1.02]" : "shadow-sm"
                                    )}
                                >
                                    {IconComp && <IconComp size={15} className={cn("shrink-0", iconColor, status === 'active' ? 'animate-pulse' : '')} />}
                                    <span className="text-left leading-tight">{tab.label}</span>
                                </button>
                                
                                {!isLast && (
                                    <div className="flex items-center justify-center py-2">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center border shadow-sm transition-all duration-300",
                                            status === 'passed' ? 'bg-emerald-50 border-emerald-200 text-emerald-500' :
                                            status === 'active' ? 'bg-blue-50 border-blue-200 text-blue-500' :
                                            'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400'
                                        )}>
                                            {tab.id === 'initial' && tabs[index + 1]?.id === 'endorsement' ? (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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

            {/* Right Column: Analytics Dashboard */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#faf9f8]">
                <CandidatePerformanceMetrics application={application} />
            </div>
        </div>
    );
}
