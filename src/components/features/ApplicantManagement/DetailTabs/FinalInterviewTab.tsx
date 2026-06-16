import React, { useState, useEffect, useRef } from 'react';
import { Application } from '@/types/application';
import { User } from '@/types/user';
import { cn } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';
import { NotificationService } from '@/services/NotificationService';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { Mail, Bell, Globe, Calendar, CheckCircle2, Building2, Clock, Pause, Play, Copy, Check, XCircle, AlertCircle, Hourglass, ChevronDown } from 'lucide-react';
import { PremiumDateTimePicker } from '@/components/common/PremiumDateTimePicker';
import { ConfirmDialog } from '@/components/common/Modal';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/utils/apiClient';

interface FinalInterviewTabProps {
    mode?: 'endorsement' | 'scheduling';
    applicant: Application;
    finalInterviewNotes: string;
    setFinalInterviewNotes: (notes: string) => void;
    onQueue: (app: Application, type: 'INITIAL' | 'FINAL') => void;
    setModalTab: (tab: any) => void;
    validators: User[];
    handleUpdateApplication: (id: string, patch: any) => void;
    onRouteToSpecialized: (app: Application, name: string) => boolean | void | Promise<boolean | void>;
    onClose: () => void;
    onDelete?: (app: Application) => void;
    fixedAccount?: string;
}

export const FinalInterviewTab: React.FC<FinalInterviewTabProps> = ({
    mode = 'endorsement', applicant, finalInterviewNotes, setFinalInterviewNotes, onQueue, setModalTab,
    validators, handleUpdateApplication, onRouteToSpecialized, onClose, onDelete,
    fixedAccount
}) => {
    const { user: authUser } = useAuthStore();
    const navigate = useNavigate();
    const [meetingDate, setMeetingDate] = useState(applicant.endorsement_meeting_date || '');
    const [meetingEndDate, setMeetingEndDate] = useState(applicant.endorsement_meeting_end_date || '');
    const [endorsementBody, setEndorsementBody] = useState(applicant.endorsement_meeting_body || '');
    const [selectedValidatorId, setSelectedValidatorId] = useState(applicant.assigned_ops_validator_id || '');
    const [interviewMode, setInterviewMode] = useState<'ONLINE' | 'ONSITE'>(() => {
        if (applicant.metadata?.interview_mode === 'ONSITE') return 'ONSITE';
        if (applicant.metadata?.interview_mode === 'ONLINE') return 'ONLINE';
        const isOnlineFallback = 
            (applicant.assigned_interview_room_name || '').toLowerCase().includes('online') ||
            (applicant.interview_room || '').toLowerCase().includes('online') ||
            applicant.pis?.preferred_setup?.toLowerCase().includes('online');
        return isOnlineFallback ? 'ONLINE' : 'ONSITE';
    });
    const saveTimeoutRef = useRef<any>(null);
    const [isBodyManuallyEdited, setIsBodyManuallyEdited] = useState(false);

    const handleTextChange = (val: string) => {
        setEndorsementBody(val);
        setIsBodyManuallyEdited(true);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            handleUpdateApplication(applicant.id, { endorsement_meeting_body: val });
        }, 500);
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const [showOutlookConfirm, setShowOutlookConfirm] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        try {
            navigator.clipboard.writeText(endorsementBody);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };
    const [sendWebAppAlert, setSendWebAppAlert] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedAccount, setSelectedAccount] = useState(applicant.department || '');
    const isSupportRole = (name: string) => {
        const lower = name.trim().toLowerCase();
        return [
            'admin', 'hr', 'it', 'workforce', 'security', 'ta', 'team leader position', 
            'managerial position', 'safety officer', 'facilities', 'finance', 'engagement', 
            'pending', 'njs', 'open house', 'purolater', 'regency assurance', 'riipen'
        ].includes(lower) || lower.includes('position') || lower.includes('officer');
    };

    const [category, setCategory] = useState<'accounts' | 'support'>(() => {
        const currentDepts = (applicant.department || '').split(',').map(s => s.trim().toLowerCase());
        const hasSupport = currentDepts.some(name => isSupportRole(name));
        return hasSupport ? 'support' : 'accounts';
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [routedToS, setRoutedToS] = useState(false);
    const [showScheduleLaterConfirm, setShowScheduleLaterConfirm] = useState(false);

    const handleConfirmScheduleLater = async () => {
        setIsProcessing(true);
        try {
            await handleUpdateApplication(applicant.id, {
                recruiter_s_scheduling_status: 'PENDING',
                endorsed_to_recruiter_s: true,
                current_status: 'FINAL_INTERVIEW',
                metadata: {
                    ...(applicant.metadata || {}),
                    recruiter_s_scheduling_status: 'PENDING',
                    endorsed_to_recruiter_s: true
                }
            });
        } catch (err) {
            console.error('Failed to schedule later:', err);
        } finally {
            setIsProcessing(false);
            setShowScheduleLaterConfirm(false);
        }
    };

    const handleScheduleForLater = async () => {
        setIsProcessing(true);
        try {
            const validator = getValidatorForApplication(applicant);
            await handleUpdateApplication(applicant.id, {
                current_status: 'FINAL_INTERVIEW',
                endorsement_meeting_date: meetingDate,
                endorsement_meeting_end_date: meetingEndDate,
                endorsement_meeting_body: endorsementBody,
                assigned_ops_validator_id: selectedValidatorId,
                assigned_ops_validator_name: validator?.full_name || '',
                recruiter_s_scheduling_status: 'PENDING',
                endorsed_to_recruiter_s: true,
                metadata: {
                    ...(applicant.metadata || {}),
                    recruiter_s_scheduling_status: 'PENDING',
                    endorsed_to_recruiter_s: true
                }
            });
        } catch (err) {
            console.error('Failed to schedule for later:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const isRecruiterS = authUser?.role === 'recruiter_s';
    const activeAccount = fixedAccount || selectedAccount;
    const selectedDepts = (activeAccount || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    const failedAccounts = applicant.metadata?.failed_accounts || [];
    const activeDepts = selectedDepts.filter(d => !failedAccounts.some((f: string) => f.trim().toLowerCase() === d.toLowerCase()));
    const targetDeptForValidators = activeDepts[0] || selectedDepts[0];
    const availableValidators = validators.filter(
        v => targetDeptForValidators && (v.department || '').trim().toLowerCase() === targetDeptForValidators
    );
    const isSpecializedAccount = 
        selectedDepts.some(dept => ['keller postman', 'auto approve'].includes(dept)) ||
        applicant.endorsed_to_recruiter_s === true ||
        applicant.metadata?.endorsed_to_recruiter_s === true ||
        applicant.metadata?.endorsed_to_recruiter_s === 'true';
    
    // Only "grey out" or force routing if it's a specialized account AND the user is NOT Recruiter S!
    // If it IS Recruiter S!, they should have full control to schedule.
    const shouldRestrictCoordination = isSpecializedAccount && !isRecruiterS;
    const isPendingLater = (applicant.recruiter_s_scheduling_status || applicant.metadata?.recruiter_s_scheduling_status) === 'PENDING';
    const isAlreadyEndorsed = 
        applicant.metadata?.endorsement_confirmed === true || 
        applicant.metadata?.endorsement_confirmed === 'true' ||
        ['FINAL_INTERVIEW_SCHEDULED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FINAL_VERDICT', 'PASSED', 'HIRED', 'REJECTED', 'FAILED'].includes(applicant.current_status);

    useEffect(() => {
        if (applicant.endorsement_meeting_date) setMeetingDate(applicant.endorsement_meeting_date);
        if (applicant.endorsement_meeting_end_date) setMeetingEndDate(applicant.endorsement_meeting_end_date);
        if (applicant.endorsement_meeting_body) setEndorsementBody(applicant.endorsement_meeting_body);
        if (applicant.assigned_ops_validator_id) setSelectedValidatorId(applicant.assigned_ops_validator_id);
        if (fixedAccount) setSelectedAccount(fixedAccount);
        if (applicant.metadata?.interview_mode) {
            setInterviewMode(applicant.metadata.interview_mode as 'ONLINE' | 'ONSITE');
        }
    }, [applicant, fixedAccount]);

    useEffect(() => {
        const loadDeps = async () => {
            try {
                const deps = await DepartmentService.getAll();
                setDepartments(deps);

                // Re-sync selectedAccount once departments are loaded to ensure case-insensitive match for multiple values
                if (!fixedAccount && applicant.department) {
                    const failedAccounts = applicant.metadata?.failed_accounts || [];
                    const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));

                    const matchedNames = applicant.department.split(',')
                        .map(s => s.trim())
                        .map(name => {
                            const match = deps.find(d => d.name.trim().toLowerCase() === name.toLowerCase());
                            return match ? match.name : name;
                        })
                        // Auto-filter out failed accounts from the default selection
                        .filter(name => !failedSet.has(name.toLowerCase()));
                    setSelectedAccount(matchedNames.join(', '));
                }
            } catch (err) {
                console.error('Failed to load accounts for endorsement:', err);
            }
        };
        loadDeps();
    }, [applicant.department, fixedAccount, applicant.metadata?.failed_accounts]);

    const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

    useEffect(() => {
        apiClient.get('/email-templates').then(res => {
            if (Array.isArray(res.data)) {
                setEmailTemplates(res.data);
            }
        }).catch(err => console.error('Failed to load email templates:', err));
    }, []);

    const replacePlaceholders = (text: string, app: Application, validatorName: string, dateStr: string) => {
        if (!text) return '';
        return text
            .replace(/{{candidate_name}}/gi, app.applicant_name)
            .replace(/{{position_title}}/gi, app.position_title || 'Candidate')
            .replace(/{{department}}/gi, app.department || 'General')
            .replace(/{{validator_name}}/gi, validatorName)
            .replace(/{{date}}/gi, dateStr)
            .replace(/{{schedule}}/gi, dateStr);
    };

    const formatBodyText = (text: string) => {
        if (!text) return '';
        let formatted = text.trim();
        
        // Dynamic sentence separation to organize the single-line layout into premium paragraph breaks
        formatted = formatted
            .replace(/(Hello\s+[^,]+,)/gi, "$1\n\n")
            .replace(/(We would like to invite you[^.]+\.)/gi, "$1\n\n")
            .replace(/(Please be in[^.]+\.)/gi, "$1\n\n")
            .replace(/(We are located on[^.]+\.)/gi, "$1\n\n")
            .replace(/(Bring any Valid ID[^.]+\.)/gi, "$1\n\n")
            .replace(/(Thank you!)/gi, "\n\n$1");
            
        return formatted.replace(/\n{3,}/g, '\n\n').trim();
    };

    const getValidatorForApplication = (app: Application) => {
        const assignedId = (selectedValidatorId || app.assigned_ops_validator_id || '').trim();
        const assignedName = (app.assigned_ops_validator_name || '').trim().toLowerCase();

        return validators.find(validator => validator.id === assignedId)
            || validators.find(validator => validator.full_name.trim().toLowerCase() === assignedName);
    };

    const getValidatorEmail = (app: Application) => {
        return getValidatorForApplication(app)?.email || app.pis?.ops_validator_email || '';
    };

    const formatDateWithWeekday = (dateVal: string | Date) => {
        if (!dateVal) return 'N/A';
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return 'N/A';
        
        const dayName = d.toLocaleDateString(undefined, { weekday: 'long' });
        const dateStr = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
        const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
        
        return `${dayName}, ${dateStr}, ${timeStr}`;
    };

    // Pre-populate or dynamically update endorsementBody when schedule parameters change, unless manual edits exist.
    useEffect(() => {
        if (isBodyManuallyEdited) return;
        if (emailTemplates.length > 0) {
            const isOnline = interviewMode === 'ONLINE';
            const templateType = isOnline ? 'INTERVIEW_INVITE_ONLINE' : 'INTERVIEW_INVITE';
            const activeTemplate = emailTemplates.find(t => t.isActive && t.type === templateType);
            if (activeTemplate) {
                const validator = getValidatorForApplication(applicant);
                const validatorName = validator?.full_name || applicant.assigned_ops_validator_name || 'OPS Validator';
                const formattedDate = meetingDate ? formatDateWithWeekday(meetingDate) : 'N/A';
                const compiled = replacePlaceholders(activeTemplate.body, applicant, validatorName, formattedDate);
                setEndorsementBody(formatBodyText(compiled));
            }
        }
    }, [emailTemplates, applicant, meetingDate, selectedValidatorId, activeAccount, isBodyManuallyEdited, interviewMode]);

    const handleOutlookSchedule = () => {
        if (!meetingDate) return;

        const validator = getValidatorForApplication(applicant);
        const validatorName = validator?.full_name || applicant.assigned_ops_validator_name || 'OPS Validator';
        const validatorEmail = getValidatorEmail(applicant);

        const startTime = new Date(meetingDate);
        const endTime = meetingEndDate ? new Date(meetingEndDate) : new Date(startTime.getTime() + 60 * 60 * 1000);

        const isOnline = interviewMode === 'ONLINE';
        const modeLabel = isOnline ? 'Online' : 'On-Site';
        const modeEmoji = isOnline ? '🎥' : '🏢';
        const locationVal = isOnline ? 'Online Interview Room' : 'On-Site Office';

        const templateType = isOnline ? 'INTERVIEW_INVITE_ONLINE' : 'INTERVIEW_INVITE';
        const activeTemplate = emailTemplates.find(t => t.isActive && t.type === templateType);

        const formattedDate = formatDateWithWeekday(meetingDate);
        const finalSubject = activeTemplate 
            ? replacePlaceholders(activeTemplate.subject, applicant, validatorName, formattedDate)
            : `Endorsement Meeting: ${applicant.applicant_name} (${modeEmoji} ${modeLabel})`;

        const finalBody = activeTemplate
            ? formatBodyText(replacePlaceholders(activeTemplate.body, applicant, validatorName, formattedDate))
            : formatBodyText(endorsementBody) || formatBodyText(`Candidate: ${applicant.applicant_name}\nPosition: ${applicant.position_title}\nOPS Validator: ${validatorName}\nInterview Mode: ${modeEmoji} ${modeLabel}\n\nNotes from Recruiter:\n${finalInterviewNotes || 'N/A'}`);

        const baseUrl = "https://outlook.office.com/calendar/0/deeplink/compose";
        const recipients = [validatorEmail, applicant.applicant_email].filter(Boolean).join(';');
        const formattedBodyForOutlook = finalBody.replace(/\r?\n/g, '\r\n');

        let url = `${baseUrl}?path=${encodeURIComponent("/calendar/action/compose")}&rru=addevent` +
            `&subject=${encodeURIComponent(finalSubject)}` +
            `&body=${encodeURIComponent(formattedBodyForOutlook)}` +
            `&startdt=${encodeURIComponent(startTime.toISOString())}` +
            `&enddt=${encodeURIComponent(endTime.toISOString())}` +
            `&to=${encodeURIComponent(recipients)}` +
            `&location=${encodeURIComponent(locationVal)}`;

        if (isOnline) {
            url += `&isOnlineMeeting=true&onlineMeetingProvider=teams`;
        }

        // Automatically copy formatted body to clipboard since Outlook strips URL newlines
        try {
            navigator.clipboard.writeText(finalBody);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }

        window.open(url, '_blank');
    };

    const handleConfirmEndorse = () => {
        const validator = getValidatorForApplication(applicant);
        handleUpdateApplication(applicant.id, {
            endorsement_meeting_date: meetingDate,
            endorsement_meeting_end_date: meetingEndDate,
            endorsement_meeting_body: endorsementBody,
            assigned_ops_validator_id: selectedValidatorId,
            assigned_ops_validator_name: validator?.full_name || ''
        });
        setShowOutlookConfirm(true);
    };

    const completeEndorsement = async (withOutlook: boolean) => {
        // Trigger Outlook Sync immediately to preserve the synchronous user-gesture context
        if (withOutlook) {
            handleOutlookSchedule();
        }

        setIsProcessing(true);
        try {
            const validator = getValidatorForApplication(applicant);
            
            // 1. Update Status to Scheduled
            await handleUpdateApplication(applicant.id, {
                current_status: 'FINAL_INTERVIEW_SCHEDULED',
                endorsement_meeting_date: meetingDate,
                endorsement_meeting_end_date: meetingEndDate,
                assigned_ops_validator_id: selectedValidatorId,
                assigned_ops_validator_name: validator?.full_name || '',
                department: activeAccount,
                // Track if actually scheduled in outlook or "maybe later"
                recruiter_s_scheduling_status: withOutlook ? 'SCHEDULED' : 'PENDING'
            });

            // 2. Notify Validator in-app
            if (sendWebAppAlert && selectedValidatorId) {
                await NotificationService.notify(
                    selectedValidatorId,
                    'New Ops Val Interview Scheduled',
                    `You have been assigned an ops val interview for ${applicant.applicant_name} on ${new Date(meetingDate).toLocaleString()}.`,
                    'final_interview_scheduled'
                );
            }

            setShowOutlookConfirm(false);
            onClose?.();
        } catch (err) {
            console.error('Failed to complete endorsement workflow:', err);
        } finally {
            setIsProcessing(false);
            setModalTab('final'); 
        }
    };
    const isAlreadyRouted = 
        routedToS || 
        applicant.endorsed_to_recruiter_s === true || 
        applicant.metadata?.endorsed_to_recruiter_s === true || 
        applicant.metadata?.endorsed_to_recruiter_s === 'true';

    const isStatusHiredOrPassed = [
        'PASSED', 'HIRED', 'HIRED_PROCESSED', 'CLIENT_ASSESSMENT', 
        'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 
        'CONTRACT_SENT', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 
        'FOR_PAN', 'FOR PAN'
    ].includes(applicant.current_status?.toUpperCase()) || applicant.final_verdict === 'PASSED';

    const isStatusFailedOrRejected = [
        'REJECTED', 'FAILED', 'DISQUALIFIED', 'NOT_ELIGIBLE_FOR_REHIRE', 'WITHDRAWN'
    ].includes(applicant.current_status?.toUpperCase()) || applicant.final_verdict === 'REJECTED';

    if (isAlreadyRouted && !isRecruiterS) {
        return (
            <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-10 relative">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping" />
                    <CheckCircle2 size={48} className="text-emerald-600 relative z-10" />
                </div>
                <h3 className="text-3xl font-bold text-surface-900 mb-4 tracking-tight text-center px-4">
                    Successfully Routed to Recruiter S!
                </h3>
                <p className="text-[15px] text-surface-500 text-center max-w-sm font-medium leading-relaxed mb-12 px-6">
                    Handover complete. Candidate <span className="text-surface-900 font-bold">{applicant.applicant_name}</span> has been transferred to the specialized recruitment channel for final coordination.
                </p>
                <button 
                    onClick={onClose}
                    className="px-14 py-4 bg-primary-600 text-white font-bold text-[12px] uppercase tracking-[0.2em] rounded-md hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 active:scale-95"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-4 px-6">
            <div className="space-y-4 flex flex-col items-center text-center mb-6">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-1 bg-primary-500 rounded-full mb-2" />
                    <h3 className="text-2xl font-semibold text-surface-900 tracking-tight">
                        {isSpecializedAccount ? 'Ops Validator Interview' : 'Final Interview Scheduling'}
                    </h3>
                    <p className="text-[14px] text-surface-500 font-medium max-w-lg leading-relaxed">
                        Finalize candidate assessment and coordinate executive evaluation scheduling.
                    </p>
                </div>

                {['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'PASSED', 'REJECTED', 'FAILED'].includes(applicant.current_status) || (applicant.current_status === 'QUEUE_ASSIGNED' && applicant.queue_type === 'FINAL') ? (
                    <div className="w-full space-y-6">
                        {applicant.current_status === 'QUEUE_ASSIGNED' && applicant.queue_type === 'FINAL' ? (
                            <div className="p-8 bg-primary-50 border border-primary-100 rounded-lg space-y-4 shadow-sm text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/50 rounded-full -mr-16 -mt-16 blur-2xl" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
                                        <span className="text-[11px] font-bold text-primary-700 uppercase tracking-wider">Queue Active</span>
                                    </div>
                                    {applicant.queue_number && (
                                        <div className="px-4 py-1.5 bg-primary-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-md shadow-md">
                                            Priority #{String(applicant.queue_number).padStart(3, '0')}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[13px] text-primary-800 font-medium leading-relaxed relative z-10">
                                    The candidate is currently positioned in the automated validation queue.
                                </p>
                            </div>
                        ) : (!['FINAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS'].includes(applicant.current_status) && !isPendingLater) ? (
                            <div className={cn(
                                "p-8 rounded-lg space-y-5 shadow-sm text-left border relative overflow-hidden",
                                isStatusHiredOrPassed ? "bg-emerald-50 border-emerald-100" :
                                isStatusFailedOrRejected ? "bg-red-50 border-red-100" :
                                "bg-primary-50 border-primary-100"
                            )}>
                                <div className="flex items-center justify-between">
                                     <div className={cn(
                                         "font-bold text-[11px] uppercase tracking-wider",
                                         isStatusHiredOrPassed ? "text-emerald-700" :
                                         isStatusFailedOrRejected ? "text-red-700" :
                                         "text-primary-700"
                                     )}>
                                         {applicant.final_verdict ? `Evaluation Concluded: ${applicant.final_verdict}` : 'Session Provisioned'}
                                     </div>
                                     <div className="flex items-center gap-2">
                                         {applicant.current_status === 'FINAL_INTERVIEW_SCHEDULED' && !applicant.final_verdict && (
                                             <button
                                                 onClick={async () => {
                                                     if (window.confirm('Are you sure you want to revert scheduling and go back to configuration?')) {
                                                         try {
                                                             handleUpdateApplication(applicant.id, {
                                                                 current_status: 'FINAL_INTERVIEW',
                                                                 recruiter_s_scheduling_status: 'PENDING',
                                                                 metadata: {
                                                                     ...(applicant.metadata || {}),
                                                                     endorsement_confirmed: false
                                                                 }
                                                             });
                                                         } catch (err) {
                                                             console.error('Failed to revert scheduling:', err);
                                                         }
                                                     }
                                                 }}
                                                 className="px-3 py-1.5 bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm transition-all"
                                             >
                                                 Step Back
                                             </button>
                                         )}
                                         <div className="flex items-center gap-3 bg-white/60 px-3 py-1.5 rounded-md border border-white/40">
                                             <Calendar size={14} className="text-surface-400" />
                                             <span className="text-[11px] font-bold text-surface-600">
                                                 {applicant.endorsement_meeting_date ? new Date(applicant.endorsement_meeting_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                             </span>
                                         </div>
                                     </div>
                                 </div>
                                <p className={cn(
                                    "text-[13px] font-medium leading-relaxed",
                                    isStatusHiredOrPassed ? "text-emerald-800" :
                                    isStatusFailedOrRejected ? "text-red-800" :
                                    "text-primary-800"
                                )}>
                                    {applicant.final_verdict 
                                        ? `Protocol complete. Finalization handled by ${applicant.assigned_ops_validator_name || 'Designated Validator'}.`
                                        : `The evaluation session has been scheduled. Awaiting input from ${applicant.assigned_ops_validator_name || 'Designated Validator'}.`
                                    }
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="max-w-4xl mx-auto w-full">
                                    <div className="bg-white border border-surface-200 shadow-premium rounded-lg relative">
                                        {isPendingLater && (
                                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[8px] z-30 flex flex-col items-center justify-center p-8 animate-fade-in">
                                                <div className="bg-white/95 backdrop-blur-[16px] border border-white shadow-2xl rounded-2xl p-8 max-w-md w-full flex flex-col items-center text-center space-y-6 transform transition-all duration-300 scale-100 hover:scale-[1.01]">
                                                    <div className="w-16 h-16 bg-amber-50 border border-amber-200/60 rounded-full flex items-center justify-center relative shadow-inner">
                                                        <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
                                                        <Pause size={24} className="text-amber-600 relative z-10 animate-pulse" />
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <span className="px-3.5 py-1 bg-amber-50 border border-amber-200/50 text-amber-700 text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-[0_2px_10px_rgba(245,158,11,0.08)]">
                                                            Scheduled for Later
                                                        </span>
                                                        <h4 className="text-[20px] font-black text-slate-900 tracking-tight">
                                                            Coordination Paused
                                                        </h4>
                                                        <p className="text-[12.5px] text-slate-500 font-medium leading-relaxed px-2">
                                                            All configuration inputs are locked while coordination is deferred. Manage or restore coordination below.
                                                        </p>
                                                    </div>

                                                    {/* Paused Dashboard Mini-Insight */}
                                                    <div className="w-full bg-slate-50/80 border border-slate-100/80 rounded-xl p-4.5 space-y-3.5 text-left shadow-inner">
                                                        <div className="flex justify-between items-center text-[11px] border-b border-slate-200/40 pb-2.5">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Candidate</span>
                                                            <span className="text-slate-800 font-extrabold">{applicant.applicant_name}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px] border-b border-slate-200/40 pb-2.5">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Target Account</span>
                                                            <span className="text-slate-800 font-extrabold uppercase tracking-widest text-[10px] bg-slate-200/60 px-2 py-0.5 rounded">{activeAccount || 'Keller Postman'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px]">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Stage Deferral</span>
                                                            <span className="text-amber-700 font-extrabold flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/30">
                                                                <Pause size={10} className="fill-current" />
                                                                Ops Validation
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={async () => {
                                                            setIsProcessing(true);
                                                            try {
                                                                await handleUpdateApplication(applicant.id, {
                                                                    recruiter_s_scheduling_status: 'RECEIVED',
                                                                    current_status: 'FINAL_INTERVIEW',
                                                                    metadata: {
                                                                        ...(applicant.metadata || {}),
                                                                        recruiter_s_scheduling_status: 'RECEIVED'
                                                                    }
                                                                });
                                                            } catch (err) {
                                                                console.error('Failed to resume coordination:', err);
                                                            } finally {
                                                                setIsProcessing(false);
                                                            }
                                                        }}
                                                        disabled={isProcessing}
                                                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[13px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-slate-950/10 active:scale-[0.98] border border-slate-800"
                                                    >
                                                        {isProcessing ? (
                                                            'Restoring Session...'
                                                        ) : (
                                                            <>
                                                                <Play size={14} fill="currentColor" className="text-amber-400" />
                                                                Resume Coordination
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {mode === 'endorsement' ? (
                                            isAlreadyEndorsed ? (
                                                <div className="p-8 bg-surface-50 border border-surface-200 rounded-lg text-center space-y-4 shadow-sm max-w-xl mx-auto my-12 animate-fade-in">
                                                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-inner text-emerald-600">
                                                        <CheckCircle2 size={28} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Stage Completed</span>
                                                        <h4 className="text-xl font-bold text-surface-900 tracking-tight">Endorsement Configured</h4>
                                                        <p className="text-[13px] text-surface-500 font-medium leading-relaxed">
                                                            This candidate has already been successfully endorsed to:
                                                        </p>
                                                        <p className="text-[16px] font-extrabold text-[#0078D4] uppercase tracking-wider bg-white py-2 px-4 border border-surface-200 rounded-md shadow-sm inline-block mt-1">
                                                            {applicant.department || 'General'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                <div className="px-8 py-6 bg-surface-50/50 border-b border-surface-100 flex flex-col items-center justify-center text-center">
                                                    <div>
                                                        <h4 className="text-[16px] font-semibold text-surface-900 tracking-tight">
                                                            Endorsement Configuration
                                                        </h4>
                                                        <p className="text-[11px] text-surface-400 mt-1 font-medium uppercase tracking-wider">Configure session parameters for ops validation.</p>
                                                    </div>
                                                </div>

                                                <div className={cn("p-6 text-left space-y-6 transition-all duration-200", isDropdownOpen && "pb-48")}>
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Endorsement Category</label>
                                                                <select
                                                                    value={category}
                                                                    onChange={(e) => {
                                                                        const newCat = e.target.value as 'accounts' | 'support';
                                                                        setCategory(newCat);
                                                                        setSelectedAccount('');
                                                                        setSelectedValidatorId('');
                                                                        handleUpdateApplication(applicant.id, {
                                                                            department: '',
                                                                            assigned_ops_validator_id: null,
                                                                            assigned_ops_validator_name: ''
                                                                        });
                                                                    }}
                                                                    className="w-full px-4 py-2.5 bg-white border border-surface-200 text-[14px] font-medium text-surface-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all rounded-md"
                                                                >
                                                                    <option value="accounts">Accounts</option>
                                                                    <option value="support">Support hiring roles</option>
                                                                </select>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                                                                    {category === 'accounts' ? 'Verification Accounts' : 'Support Hiring Roles'}
                                                                </label>
                                                                {fixedAccount ? (
                                                                    <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-surface-200 bg-surface-50 text-surface-500 cursor-not-allowed opacity-60">
                                                                        <Building2 size={14} className="text-surface-400" />
                                                                        <span className="text-xs font-semibold">{fixedAccount}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="relative" ref={dropdownRef}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                                            className="w-full px-4 py-2.5 bg-white border border-surface-200 text-[14px] font-medium text-surface-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all rounded-md text-left flex justify-between items-center cursor-pointer"
                                                                        >
                                                                            <span className="truncate max-w-[200px]">
                                                                                {selectedAccount || `Select ${category === 'accounts' ? 'accounts' : 'roles'}...`}
                                                                            </span>
                                                                            <ChevronDown size={16} className="text-surface-400 shrink-0" />
                                                                        </button>

                                                                        {isDropdownOpen && (
                                                                            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-surface-200 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                                                {departments
                                                                                    .filter(d => category === 'support' ? isSupportRole(d.name) : !isSupportRole(d.name))
                                                                                    .map(dep => {
                                                                                        const isSelected = selectedDepts.includes(dep.name.trim().toLowerCase());
                                                                                        const isFailed = failedAccounts.some((f: string) => f.trim().toLowerCase() === dep.name.trim().toLowerCase());
                                                                                        return (
                                                                                            <label
                                                                                                key={dep.id}
                                                                                                className={cn(
                                                                                                    "flex items-center gap-2.5 px-3 py-2 rounded hover:bg-surface-50 transition-all select-none text-xs font-medium w-full relative",
                                                                                                    isFailed 
                                                                                                        ? "opacity-50 text-red-500 cursor-not-allowed bg-red-50/20" 
                                                                                                        : "text-surface-700 cursor-pointer",
                                                                                                    isSelected && !isFailed && "bg-primary-50/50 text-primary-900 font-semibold"
                                                                                                )}
                                                                                                onClick={(e) => {
                                                                                                    if (isFailed) {
                                                                                                        e.preventDefault();
                                                                                                        e.stopPropagation();
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isSelected}
                                                                                                    disabled={isFailed}
                                                                                                    onChange={() => {
                                                                                                        if (isFailed) return;
                                                                                                        let updated: string[];
                                                                                                        const currentList = (selectedAccount || '')
                                                                                                            .split(',')
                                                                                                            .map(s => s.trim())
                                                                                                            .filter(Boolean);
                                                                                                        const exists = currentList.some(item => item.toLowerCase() === dep.name.trim().toLowerCase());
                                                                                                        if (exists) {
                                                                                                            updated = currentList.filter(item => item.toLowerCase() !== dep.name.trim().toLowerCase());
                                                                                                        } else {
                                                                                                            updated = [...currentList, dep.name.trim()];
                                                                                                        }
                                                                                                        const joined = updated.join(', ');
                                                                                                        setSelectedAccount(joined);
                                                                                                        setSelectedValidatorId('');
                                                                                                        handleUpdateApplication(applicant.id, {
                                                                                                            department: joined,
                                                                                                            assigned_ops_validator_id: null,
                                                                                                            assigned_ops_validator_name: ''
                                                                                                        });
                                                                                                    }}
                                                                                                    className={cn(
                                                                                                        "rounded border-surface-300 text-primary-600 focus:ring-primary-500",
                                                                                                        isFailed ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                                                                                    )}
                                                                                                />
                                                                                                <span className={cn(isFailed && "line-through decoration-red-500 decoration-2")}>{dep.name}</span>
                                                                                                {isFailed && (
                                                                                                    <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-750 px-1.5 py-0.5 rounded shrink-0">Failed</span>
                                                                                                )}
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                        {shouldRestrictCoordination && (
                                                            <div className="p-4 bg-primary-50 border border-primary-100 rounded-md flex items-start gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                                                                <div className="p-2 bg-white rounded-md shadow-sm">
                                                                    <Globe size={18} className="text-primary-600" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <h5 className="text-[13px] font-bold text-surface-900 leading-none">Specialized Channel Routing</h5>
                                                                    <p className="text-[11px] text-surface-500 font-medium mt-1.5 leading-relaxed">
                                                                        This selection contains a specialized recruitment pipeline. By routing this candidate, you are handing over the final coordination and scheduling to <span className="text-primary-700 font-bold uppercase tracking-tight">Recruiter S! (Specialized Team)</span>.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                    <div className="pt-6 border-t border-surface-100 flex justify-center">
                                                        {shouldRestrictCoordination ? (
                                                            <button
                                                                onClick={async () => {
                                                                    setIsProcessing(true);
                                                                    try {
                                                                        const success = await onRouteToSpecialized(applicant, 'Recruiter S!');
                                                                        if (success !== false) {
                                                                            setRoutedToS(true);
                                                                        }
                                                                    } catch (err) {
                                                                        console.error('Failed to route specialized:', err);
                                                                    } finally {
                                                                        setIsProcessing(false);
                                                                    }
                                                                }}
                                                                disabled={isProcessing}
                                                                className="px-6 py-2 bg-[#0078D4] hover:bg-[#106EBE] text-white text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-all shadow-sm active:scale-95 border border-transparent cursor-pointer disabled:opacity-50"
                                                            >
                                                                Route to Specialized Recruiter S!
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    if (!activeAccount) return;
                                                                    handleUpdateApplication(applicant.id, {
                                                                        metadata: {
                                                                            ...(applicant.metadata || {}),
                                                                            endorsement_confirmed: true
                                                                        }
                                                                    });
                                                                    setModalTab('scheduling');
                                                                }}
                                                                disabled={!activeAccount}
                                                                className="px-6 py-2 bg-[#0078D4] hover:bg-[#106EBE] disabled:bg-surface-150 disabled:text-surface-400 disabled:cursor-not-allowed text-white text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-all shadow-sm active:scale-95 border border-transparent cursor-pointer"
                                                            >
                                                                Confirm & Proceed to Scheduling
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                </>
                                            )
                                        ) : (
                                            <>
                                                <div className="px-8 py-6 bg-surface-50/50 border-b border-surface-100 flex flex-col items-center justify-center text-center">
                                                    <div>
                                                        <h4 className="text-[16px] font-semibold text-surface-900 tracking-tight">
                                                            Interview Scheduling
                                                        </h4>
                                                        <p className="text-[11px] text-surface-400 mt-1 font-medium uppercase tracking-wider">Coordinate session parameters, validator, mode, and synchronization.</p>
                                                    </div>
                                                </div>

                                                <div className="p-6 text-left space-y-6">
                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                         
                                                         {/* Left Column: Accounts Priority & Validator Assignment */}
                                                         <div className="space-y-6 bg-surface-50/40 p-5 rounded-lg border border-surface-150">
                                                             {selectedDepts.length > 0 && (
                                                                 <div className="space-y-2.5">
                                                                     <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Selected Accounts Priority (Click to toggle which goes first)</label>
                                                                     <div className="flex flex-wrap gap-2">
                                                                         {[...selectedDepts].sort((a, b) => a.localeCompare(b)).map((deptName) => {
                                                                             const isFailed = failedAccounts.some((f: string) => f.trim().toLowerCase() === deptName);
                                                                             const isFirst = targetDeptForValidators === deptName;
                                                                             const matchingDep = departments.find(d => d.name.trim().toLowerCase() === deptName);
                                                                             const displayName = matchingDep ? matchingDep.name : deptName.toUpperCase();
                                                                             return (
                                                                                 <button
                                                                                     type="button"
                                                                                     key={deptName}
                                                                                     disabled={isFailed}
                                                                                     onClick={() => {
                                                                                         if (isFailed) return;
                                                                                         const rest = selectedDepts.filter(d => d !== deptName);
                                                                                         const newOrder = [matchingDep ? matchingDep.name : deptName.toUpperCase(), ...rest.map(r => {
                                                                                             const match = departments.find(d => d.name.trim().toLowerCase() === r);
                                                                                             return match ? match.name : r.toUpperCase();
                                                                                         })];
                                                                                         const joined = newOrder.join(', ');
                                                                                         setSelectedAccount(joined);
                                                                                         handleUpdateApplication(applicant.id, { department: joined });
                                                                                    }}
                                                                                     className={cn(
                                                                                         "px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer select-none relative",
                                                                                         isFirst 
                                                                                             ? "bg-[#0078D4] text-white border-[#0078D4] shadow-sm" 
                                                                                             : "bg-white text-surface-600 border-surface-200 hover:border-surface-300",
                                                                                         isFailed && "opacity-50 cursor-not-allowed border-red-200 bg-red-50/50 text-red-700"
                                                                                     )}
                                                                                 >
                                                                                     {matchingDep && (
                                                                                         <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 border border-white/20 bg-white">
                                                                                             {matchingDep.accountImageUrl || matchingDep.accountImageData ? (
                                                                                                 <img 
                                                                                                     src={matchingDep.accountImageUrl || matchingDep.accountImageData || ''} 
                                                                                                     alt={displayName} 
                                                                                                     className="w-full h-full object-cover" 
                                                                                                 />
                                                                                             ) : (
                                                                                                 <img src="/contactpoint-logo.png?v=2" alt="Logo" className="w-full h-full object-contain p-0.5" />
                                                                                             )}
                                                                                         </div>
                                                                                     )}
                                                                                     {isFirst && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                                                     {displayName}
                                                                                     {isFirst && <span className="text-[9px] font-medium opacity-80 uppercase ml-0.5">(First)</span>}
                                                                                     {isFailed && (
                                                                                         <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                                                                                             <line x1="-5%" y1="-5%" x2="105%" y2="105%" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                                                                                             <line x1="105%" y1="-5%" x2="-5%" y2="105%" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                                                                                         </svg>
                                                                                     )}
                                                                                 </button>
                                                                             );
                                                                         })}
                                                                     </div>
                                                                 </div>
                                                             )}

                                                             <div className="space-y-2 pt-2">
                                                                 <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Assigned Validator</label>
                                                                 <select
                                                                     disabled={!activeAccount || shouldRestrictCoordination}
                                                                     value={selectedValidatorId}
                                                                     onChange={e => {
                                                                         const validatorId = e.target.value;
                                                                         const v = availableValidators.find(val => val.id === validatorId);
                                                                         setSelectedValidatorId(validatorId);
                                                                         handleUpdateApplication(applicant.id, {
                                                                             assigned_ops_validator_id: validatorId || null,
                                                                             assigned_ops_validator_name: v?.full_name || ''
                                                                         });
                                                                     }}
                                                                     className={cn(
                                                                         "w-full px-4 py-2.5 bg-white border border-surface-200 text-[14px] font-medium text-surface-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all rounded-md",
                                                                         (!activeAccount || shouldRestrictCoordination) && "bg-surface-50 text-surface-500 cursor-not-allowed opacity-60"
                                                                     )}
                                                                 >
                                                                     <option value="">
                                                                         {shouldRestrictCoordination
                                                                             ? 'Handled by Recruiter S! (specialized)'
                                                                             : activeAccount
                                                                                 ? (availableValidators.length ? 'Select Validator...' : `No validators assigned to ${activeAccount}`)
                                                                                 : 'Select an account first'}
                                                                     </option>
                                                                     {availableValidators.map(v => (
                                                                         <option key={v.id} value={v.id}>{v.full_name}</option>
                                                                     ))}
                                                                 </select>
                                                                 {targetDeptForValidators && !shouldRestrictCoordination && (
                                                                     <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mt-1.5">
                                                                         Showing validators assigned to: {(departments.find(d => d.name.trim().toLowerCase() === targetDeptForValidators)?.name || targetDeptForValidators.toUpperCase())}.
                                                                     </p>
                                                                 )}
                                                             </div>
                                                         </div>

                                                         {/* Right Column: Interview Mode, Date & Time Session parameters */}
                                                         <div className="space-y-5">
                                                             <div className="space-y-2">
                                                                 <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Interview Mode</label>
                                                                 <div className="flex bg-surface-100 p-1 rounded-xl border border-surface-200/60 shadow-inner w-full max-w-xs">
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => {
                                                                             setInterviewMode('ONLINE');
                                                                             handleUpdateApplication(applicant.id, {
                                                                                 metadata: {
                                                                                     ...(applicant.metadata || {}),
                                                                                     interview_mode: 'ONLINE'
                                                                                 }
                                                                             });
                                                                         }}
                                                                         className={cn(
                                                                             "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                                                                             interviewMode === 'ONLINE'
                                                                                 ? "bg-white text-[#0078D4] shadow-sm scale-105"
                                                                                 : "text-surface-500 hover:text-surface-800"
                                                                         )}
                                                                     >
                                                                         🎥 Online (Teams)
                                                                     </button>
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => {
                                                                             setInterviewMode('ONSITE');
                                                                             handleUpdateApplication(applicant.id, {
                                                                                 metadata: {
                                                                                     ...(applicant.metadata || {}),
                                                                                     interview_mode: 'ONSITE'
                                                                                 }
                                                                             });
                                                                         }}
                                                                         className={cn(
                                                                             "flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                                                                             interviewMode === 'ONSITE'
                                                                                 ? "bg-white text-[#0078D4] shadow-sm scale-105"
                                                                                 : "text-surface-500 hover:text-surface-800"
                                                                         )}
                                                                     >
                                                                         🏢 On-Site
                                                                     </button>
                                                                 </div>
                                                             </div>

                                                             <div className="grid grid-cols-2 gap-4">
                                                                 <PremiumDateTimePicker
                                                                     label="Session Start"
                                                                     value={meetingDate}
                                                                     onChange={(val) => {
                                                                         setMeetingDate(val);
                                                                         handleUpdateApplication(applicant.id, { endorsement_meeting_date: val });
                                                                     }}
                                                                     disabled={shouldRestrictCoordination}
                                                                 />
                                                                 <PremiumDateTimePicker
                                                                     label="Session End"
                                                                     value={meetingEndDate}
                                                                     onChange={(val) => {
                                                                         setMeetingEndDate(val);
                                                                         handleUpdateApplication(applicant.id, { endorsement_meeting_end_date: val });
                                                                     }}
                                                                     minDate={meetingDate || undefined}
                                                                     disabled={shouldRestrictCoordination}
                                                                 />
                                                             </div>
                                                         </div>

                                                     </div>

                                                     {/* Push Notification Panel */}
                                                     <div className="pt-6 border-t border-surface-150 flex items-center justify-between">
                                                         <div className="flex items-center gap-4">
                                                             <div className="p-2.5 bg-primary-50 rounded-md">
                                                                 <Bell size={18} className="text-[#0078D4]" />
                                                             </div>
                                                             <div>
                                                                 <h5 className="text-[13px] font-semibold text-surface-900">Push Notification</h5>
                                                                 <p className="text-[11px] text-surface-400 font-medium">Transmit real-time system alert to validator.</p>
                                                             </div>
                                                         </div>
                                                         <label className={cn(
                                                             "flex items-center cursor-pointer group",
                                                             shouldRestrictCoordination && "cursor-not-allowed opacity-50"
                                                         )}>
                                                             <div className={cn(
                                                                 "w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out",
                                                                 sendWebAppAlert ? "bg-[#0078D4]" : "bg-surface-200"
                                                             )}>
                                                                 <input 
                                                                     type="checkbox" 
                                                                     className="hidden" 
                                                                     checked={sendWebAppAlert} 
                                                                     disabled={shouldRestrictCoordination}
                                                                     onChange={e => !shouldRestrictCoordination && setSendWebAppAlert(e.target.checked)} 
                                                                 />
                                                                 <div className={cn(
                                                                     "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm",
                                                                     sendWebAppAlert ? "translate-x-6" : "translate-x-1"
                                                                 )} />
                                                             </div>
                                                         </label>
                                                     </div>

                                                    <button
                                                        onClick={handleConfirmEndorse}
                                                        disabled={(!shouldRestrictCoordination && (!meetingDate || !selectedValidatorId)) || !activeAccount || isProcessing}
                                                        className="w-full py-4 bg-[#0078D4] hover:bg-[#106EBE] text-white text-[12px] font-semibold uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] border border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessing ? 'Processing Sequence...' : (
                                                            <>
                                                                <Globe size={14} /> 
                                                                Schedule for Interview
                                                            </>
                                                        )}
                                                    </button>

                                                    {!shouldRestrictCoordination && (
                                                        <button
                                                            onClick={handleScheduleForLater}
                                                            disabled={(!meetingDate || !selectedValidatorId) || !activeAccount || isProcessing}
                                                            className="mt-3 w-full py-2 bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 transition-all text-[11px] font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm disabled:opacity-50 cursor-pointer"
                                                            title="Schedule this session in-app now without syncing to Outlook"
                                                        >
                                                            <Clock size={14} className="text-surface-500" />
                                                            Schedule for Later
                                                        </button>
                                                    )}

                                                    {isSpecializedAccount && !isPendingLater && !isRecruiterS && (
                                                        <button
                                                            onClick={() => setShowScheduleLaterConfirm(true)}
                                                            disabled={isProcessing}
                                                            className="w-full py-2 bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-all text-[11px] font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm cursor-pointer"
                                                            title="Defer scheduling and manage from your Scheduling Hub"
                                                        >
                                                            <Clock size={14} className="text-surface-500" />
                                                            Schedule Later
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {showOutlookConfirm && (
                                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
                                        <div className="bg-white max-w-4xl w-full rounded-2xl p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300 flex flex-col gap-6 my-8 text-left">
                                            {/* Header */}
                                            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                                        <Globe size={24} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest block mb-1">Session Provisioned</span>
                                                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Endorsement & Coordination Dashboard</h3>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Session Metadata Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/70">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Candidate</span>
                                                    <span className="text-sm font-bold text-slate-800 truncate block">{applicant.applicant_name}</span>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/70">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Ops Validator</span>
                                                    <span className="text-sm font-bold text-slate-800 truncate block">
                                                        {getValidatorForApplication(applicant)?.full_name || applicant.assigned_ops_validator_name || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/70">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Account Unit</span>
                                                    <span className="text-sm font-bold text-slate-800 truncate block uppercase">{activeAccount || 'General'}</span>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/70">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Date & Time</span>
                                                    <span className="text-sm font-bold text-slate-800 truncate block">
                                                        {meetingDate ? formatDateWithWeekday(meetingDate) : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Endorsement Context Box with Copy Button */}
                                            <div className="space-y-2 relative">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Endorsement Context Message</label>
                                                    <button
                                                        onClick={handleCopy}
                                                        className={cn(
                                                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm",
                                                            isCopied 
                                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                                                        )}
                                                    >
                                                        {isCopied ? (
                                                            <>
                                                                <Check size={12} />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy size={12} />
                                                                Copy Text
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={endorsementBody}
                                                    onChange={e => handleTextChange(e.target.value)}
                                                    placeholder="Provide essential background for the ops validator..."
                                                    className="w-full p-4 bg-slate-900/5 border border-slate-200 text-[14px] font-mono text-slate-800 h-64 resize-y focus:border-primary-500 outline-none transition-all rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-500/5 leading-relaxed shadow-inner"
                                                />
                                            </div>

                                            {/* Notice Alert */}
                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-left">
                                                <div className="shrink-0 text-amber-500 pt-0.5">
                                                    <Mail size={16} />
                                                </div>
                                                <div className="space-y-1">
                                                    <h5 className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">💡 Clipboard Auto-Load</h5>
                                                    <p className="text-[11px] text-amber-950 font-medium leading-relaxed">
                                                        To preserve beautiful paragraph formatting inside Outlook Web's calendar description, simply press <kbd className="bg-white px-1.5 py-0.5 rounded border border-amber-200 shadow-sm font-bold">Ctrl + V</kbd> after launching Outlook!
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                                                <button 
                                                    onClick={() => completeEndorsement(true)}
                                                    className="flex-1 py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-bold text-[13px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2 active:scale-[0.98]"
                                                >
                                                    <Mail size={16} />
                                                    Sync with Outlook Calendar
                                                </button>
                                                <button 
                                                    onClick={() => completeEndorsement(false)}
                                                    className="py-3 px-6 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[13px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                                >
                                                    Complete & Close
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="w-full max-w-lg mx-auto space-y-6">
                        {(() => {
                            const status = (applicant.final_verdict || applicant.current_status || '').toUpperCase();
                            const passed = [
                                'PASSED', 'HIRED', 'HIRED_PROCESSED', 'CLIENT_ASSESSMENT', 
                                'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR JOB OFFER',
                                'CONTRACT_SENT', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 
                                'FOR_PAN', 'FOR PAN'
                            ].includes(status);
                            const rejected = [
                                'REJECTED', 'FAILED', 'WITHDRAWN', 'DISQUALIFIED', 
                                'NOT_ELIGIBLE_FOR_REHIRE'
                            ].includes(status);
                            const conditional = status === 'CONDITIONAL' || status === 'WAITLISTED';

                            if (passed) {
                                return (
                                    <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-lg text-center shadow-sm">
                                        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-md">
                                            <CheckCircle2 size={28} className="text-white" />
                                        </div>
                                        <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Final Interview Status</p>
                                        <p className="text-2xl font-bold text-emerald-900 tracking-tight">Passed</p>
                                        <p className="text-[13px] text-emerald-700 font-medium mt-2">
                                            Candidate successfully cleared the final interview.
                                        </p>
                                    </div>
                                );
                            }

                            if (rejected) {
                                return (
                                    <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center shadow-sm">
                                        <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4 shadow-md">
                                            <XCircle size={28} className="text-white" />
                                        </div>
                                        <p className="text-[11px] font-bold text-red-700 uppercase tracking-widest mb-2">Final Interview Status</p>
                                        <p className="text-2xl font-bold text-red-900 tracking-tight">
                                            {status === 'WITHDRAWN' ? 'Withdrawn' : 'Did Not Pass'}
                                        </p>
                                        <p className="text-[13px] text-red-700 font-medium mt-2">
                                            {status === 'WITHDRAWN'
                                                ? 'Candidate withdrew from the final interview.'
                                                : 'Candidate did not pass the final interview.'}
                                        </p>
                                    </div>
                                );
                            }

                            if (conditional) {
                                return (
                                    <div className="p-8 bg-amber-50 border border-amber-200 rounded-lg text-center shadow-sm">
                                        <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-4 shadow-md">
                                            <AlertCircle size={28} className="text-white" />
                                        </div>
                                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-2">Final Interview Status</p>
                                        <p className="text-2xl font-bold text-amber-900 tracking-tight">
                                            {status === 'WAITLISTED' ? 'Waitlisted' : 'Conditional'}
                                        </p>
                                        <p className="text-[13px] text-amber-700 font-medium mt-2">
                                            {status === 'WAITLISTED'
                                                ? 'Candidate is on the waitlist pending final decision.'
                                                : 'Candidate passed with conditions.'}
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div className="p-8 bg-surface-50 border border-surface-200 rounded-lg text-center shadow-sm">
                                    <div className="w-14 h-14 rounded-full bg-surface-300 flex items-center justify-center mx-auto mb-4">
                                        <Hourglass size={24} className="text-surface-500" />
                                    </div>
                                    <p className="text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-2">Final Interview Status</p>
                                    <p className="text-2xl font-bold text-surface-700 tracking-tight">Pending Evaluation</p>
                                    <p className="text-[13px] text-surface-500 font-medium mt-2">
                                        Final interview status will be available once evaluation is complete.
                                    </p>
                                </div>
                            );
                        })()}
                        {applicant.rejection_reason && (
                            <div className="p-8 bg-white border border-red-100 rounded-lg text-left relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
                                <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mb-3">Post-Evaluation Note</p>
                                <p className="text-[14px] font-medium text-surface-700 leading-relaxed italic">"{applicant.rejection_reason}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={showScheduleLaterConfirm}
                onClose={() => setShowScheduleLaterConfirm(false)}
                onConfirm={handleConfirmScheduleLater}
                title="Pause Candidate Coordination"
                message={`Are you sure you want to defer coordination and schedule "${applicant.applicant_name}" later? This will pause active scheduling.`}
                confirmText="Schedule Later"
                confirmClass="bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
                loading={isProcessing}
            />
        </div>
    );
};
