import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Application } from '@/types/application';
import { User } from '@/types/user';
import { cn } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';
import { NotificationService } from '@/services/NotificationService';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { Mail, Bell, Globe, Calendar, CheckCircle2, Building2, Clock, Pause, Play, Copy, Check, XCircle, AlertCircle, Hourglass, ChevronDown, User as UserIcon, Upload, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { EndorsementHistoryView } from './EndorsementHistoryView';
import { PremiumDateTimePicker } from '@/components/common/PremiumDateTimePicker';
import { ConfirmDialog, Modal } from '@/components/common/Modal';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/utils/apiClient';
import { useRoomStore } from '@/store/roomStore';
import { useLoading } from '@/components/common/useLoading';
import { ApplicationService } from '@/services/ApplicationService';
import { REAL_ACCOUNTS } from '@/pages/recruiter/mhrt/constants/accountConstants';
import { extractRemarks, renderAccountLogo, getEvaluationAttempts, replacePlaceholders, formatBodyText, formatDateWithWeekday } from '../utils/evaluationHelpers';

interface FinalInterviewTabProps {
    mode?: 'endorsement' | 'scheduling';
    applicant: Application;
    finalInterviewNotes: string;
    setFinalInterviewNotes: (notes: string) => void;
    onQueue: (app: Application, type: 'INITIAL' | 'FINAL') => void;
    setModalTab: (tab: any) => void;
    validators: User[];
    handleUpdateApplication: (id: string, patch: any) => void;
    onRouteToSpecialized?: (app: Application, name: string) => boolean | void | Promise<boolean | void>;
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
    const { showLoading, hideLoading } = useLoading();


    const [candidateApplications, setCandidateApplications] = useState<Application[]>([]);

    useEffect(() => {
        let isMounted = true;
        apiClient.get('/applications').then(res => {
            if (isMounted && Array.isArray(res.data)) {
                const matched = res.data.filter((a: any) =>
                    (a.applicant_email && applicant.applicant_email && a.applicant_email.toLowerCase() === applicant.applicant_email.toLowerCase()) ||
                    (applicant.applicant_id && a.applicant_id === applicant.applicant_id) ||
                    (a.applicant_name && applicant.applicant_name && a.applicant_name.toLowerCase() === applicant.applicant_name.toLowerCase())
                );
                setCandidateApplications(matched);
            }
        }).catch(err => console.error('Failed to load candidate applications history:', err));
        return () => { isMounted = false; };
    }, [applicant]);

    const [departments, setDepartments] = useState<Department[]>([]);
    const [showPassModal, setShowPassModal] = useState(false);
    const [showFailModal, setShowFailModal] = useState(false);
    const [forceOpsValidatorAccount, setForceOpsValidatorAccount] = useState('');
    const [forceOpsValidatorLob, setForceOpsValidatorLob] = useState('');
    const [forceOpsValidatorName, setForceOpsValidatorName] = useState('');
    const [forceOpsValidatorRemarks, setForceOpsValidatorRemarks] = useState('');

    const availableAccountsList = useMemo(() => {
        const isSupportDept = (dept: Department) => {
            if (dept.type) return dept.type === 'SUPPORT_ROLES';
            const lower = dept.name.toLowerCase().trim();
            return ['admin', 'hr', 'support', 'recruitment', 'it', 'support and leadership', 'workforce', 'revenue & invoicing', 'quality assurance', 'training & development', 'engagement & social media', 'human resources', 'it department', 'facilities', 'security', 'safety', 'client engagement & asset control', 'process optimization'].includes(lower) || lower.includes('support');
        };
        const accountDepts = departments.filter(d => !isSupportDept(d) && d.name.toUpperCase() !== 'PENDING').sort((a, b) => a.name.localeCompare(b.name));
        const supportDepts = departments.filter(d => isSupportDept(d)).sort((a, b) => a.name.localeCompare(b.name));
        // Merge with REAL_ACCOUNTS names that may not be in departments yet
        const deptNames = new Set(departments.map(d => (d?.name || '').trim().toLowerCase()));
        const extraFromReal = Array.from(new Set(REAL_ACCOUNTS.map(a => a.account))).filter(a => !deptNames.has((a || '').trim().toLowerCase())).sort();
        return { accountDepts, supportDepts, extraFromReal };
    }, [departments]);
    const availableLobsList = useMemo(() => {
        if (!forceOpsValidatorAccount) return [];
        const dept = departments.find(d => d.name === forceOpsValidatorAccount);
        if (dept && dept.subAccounts && dept.subAccounts.length > 0) {
            return dept.subAccounts.map(sub => sub.name).sort();
        }
        return Array.from(new Set(REAL_ACCOUNTS.filter(a => a.account === forceOpsValidatorAccount).map(a => a.lob))).sort();
    }, [forceOpsValidatorAccount, departments]);
    const availableOpsValidatorsList = useMemo(() => {
        if (!forceOpsValidatorAccount) return [];

        const getParentName = (deptName: string) => {
            if (!deptName) return '';
            const lowerName = deptName.toLowerCase();
            const parent = departments.find(d =>
                lowerName === d.name.toLowerCase() ||
                (d.subAccounts && d.subAccounts.some(sub => lowerName === `${d?.name || ''} ${sub?.name || ''}`.toLowerCase() || lowerName === sub.name.toLowerCase()))
            );
            return parent ? parent.name.toLowerCase() : lowerName;
        };

        const targetAccountLower = getParentName(forceOpsValidatorAccount);

        const matchingValidators = validators.filter(v => {
            if (!v.department) return false;
            const validatorDepts = (v?.department || '').split(',').map(d => getParentName((d || '').trim())).filter(Boolean);
            return validatorDepts.includes(targetAccountLower);
        });

        if (matchingValidators.length > 0) {
            return Array.from(new Set(matchingValidators.map(v => v.full_name))).sort();
        }

        if (!forceOpsValidatorLob) return [];
        const match = REAL_ACCOUNTS.find(a => a.account === forceOpsValidatorAccount && a.lob === forceOpsValidatorLob);
        if (!match || !match.opsValidator || match.opsValidator === 'N/A') return [];
        return (match?.opsValidator || '').split(/[,/]/).map(s => (s || '').trim()).filter(Boolean);
    }, [forceOpsValidatorAccount, forceOpsValidatorLob, validators, departments]);
    const isSpecialRemarksAccount = forceOpsValidatorAccount.toLowerCase().includes('abbott');
    const remarksLabelText = isSpecialRemarksAccount ? "Operations Validation Remarks / Special Questions" : "Final Specific Remarks";

    const [passAttachment, setPassAttachment] = useState<File | null>(null);
    const passFileInputRef = useRef<HTMLInputElement>(null);
    const [meetingDate, setMeetingDate] = useState(applicant.endorsement_meeting_date || '');
    const [meetingEndDate, setMeetingEndDate] = useState(applicant.endorsement_meeting_end_date || '');
    const [endorsementBody, setEndorsementBody] = useState(applicant.endorsement_meeting_body || '');
    const [selectedValidatorId, setSelectedValidatorId] = useState(applicant.assigned_ops_validator_id || '');
    const [selectedValidatorIds, setSelectedValidatorIds] = useState<string[]>(() => {
        const metadata = applicant.metadata ? (typeof applicant.metadata === 'string' ? JSON.parse(applicant.metadata) : applicant.metadata) : {};
        const ids = metadata.assigned_ops_validator_ids || [];
        if (Array.isArray(ids) && ids.length > 0) return ids.filter(Boolean);
        if (typeof ids === 'string' && (ids || '').trim()) return ids.split(',').map((s: string) => (s || '').trim()).filter(Boolean);
        return applicant.assigned_ops_validator_id ? [applicant.assigned_ops_validator_id] : [];
    });
    const [isValidatorDropdownOpen, setIsValidatorDropdownOpen] = useState(false);
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

    const [showNoShowPrompt, setShowNoShowPrompt] = useState(false);
    const [selectedNoShowCategory, setSelectedNoShowCategory] = useState('');
    const [noShowDropdownOpen, setNoShowDropdownOpen] = useState(false);
    const [isNoShowFailed, setIsNoShowFailed] = useState(true);
    const [showReprofilePassedWarningModal, setShowReprofilePassedWarningModal] = useState(false);

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

    const [localEndorsementConfirmed, setLocalEndorsementConfirmed] = useState(false);

    const [showOutlookConfirm, setShowOutlookConfirm] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isEditingOpsValidator, setIsEditingOpsValidator] = useState(false);

    const accountValidatorsList = useMemo(() => {
        const accountStr = String(
            applicant.pis?.final_account ||
            applicant.endorsement_account ||
            applicant.department ||
            ''
        ).toLowerCase().trim();

        const matches = REAL_ACCOUNTS.filter(a => String(a.account).toLowerCase().trim() === accountStr);
        const opsValidators = new Set<string>();
        for (const match of matches) {
            if (match.opsValidator && match.opsValidator !== 'N/A') {
                (match?.opsValidator || '').split(/[,/]/).forEach(s => {
                    const trimmed = (s || '').trim();
                    if (trimmed) opsValidators.add(trimmed);
                });
            }
        }
        return Array.from(opsValidators).sort();
    }, [applicant]);

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
    const [isLaunching, setIsLaunching] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(applicant.department || '');
    const isSupportRole = (name: string) => {
        const lower = (name || '').trim().toLowerCase();
        return [
            'admin', 'hr', 'it', 'workforce', 'security', 'ta', 'team leader position',
            'managerial position', 'safety officer', 'facilities', 'finance', 'engagement',
            'pending', 'open house', 'quality assurance', 'qa', 'quality analyst', 'trainer', 'training', 'sme', 'subject matter expert', 'wfm', 'rta', 'real time analyst', 'mis', 'supervisor', 'team leader', 'tl', 'operations manager', 'om', 'coach', 'quality', 'support and leadership', 'revenue & invoicing', 'training & development', 'engagement & social media', 'human resources', 'it department', 'client engagement & asset control', 'process optimization'
        ].includes(lower) || lower.includes('position') || lower.includes('officer') || lower.includes('manager') || lower.includes('lead') || lower.includes('quality') || lower.includes('train') || lower.includes('qa ');
    };

    const [category, setCategory] = useState<'accounts' | 'support'>(() => {
        const currentDepts = (applicant.department || '').split(',').map(s => (s || '').trim().toLowerCase());
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
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const handleConfirmScheduleLater = async () => {
        setIsProcessing(true);
        try {
            await handleUpdateApplication(applicant.id, {
                recruiter_s_scheduling_status: 'PENDING',
                endorsed_to_recruiter_s: true,
                current_status: 'FINAL_INTERVIEW',
                department: activeAccount || applicant.department,
                final_verdict: '',
                metadata: {
                    ...(applicant.metadata || {}),
                    recruiter_s_scheduling_status: 'PENDING',
                    endorsed_to_recruiter_s: true,
                    final_interview_result: '',
                    ops_validator_status: 'PENDING',
                    final_specific_status: '',
                    'Specific Status': '',
                    'Final Specific Status': ''
                },
                pis: {
                    ...(applicant.pis || {}),
                    final_interview_result: '',
                    ops_validator_status: 'PENDING',
                    overall_status: 'OPEN',
                    final_specific_status: '',
                    'Specific Status': '',
                    'Final Specific Status': ''
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
                department: activeAccount || applicant.department,
                final_verdict: '',
                metadata: {
                    ...(applicant.metadata || {}),
                    recruiter_s_scheduling_status: 'PENDING',
                    endorsed_to_recruiter_s: true,
                    assigned_ops_validator_ids: selectedValidatorIds,
                    final_interview_result: '',
                    ops_validator_status: 'PENDING',
                    final_specific_status: '',
                    'Specific Status': '',
                    'Final Specific Status': ''
                },
                pis: {
                    ...(applicant.pis || {}),
                    final_interview_result: '',
                    ops_validator_status: 'PENDING',
                    overall_status: 'OPEN',
                    final_specific_status: '',
                    'Specific Status': '',
                    'Final Specific Status': ''
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
        .map(s => (s || '').trim().toLowerCase())
        .filter(Boolean);
    const failedAccounts = applicant.metadata?.failed_accounts || [];
    const activeDepts = selectedDepts.filter(d => !failedAccounts.some((f: string) => (f || '').trim().toLowerCase() === d.toLowerCase()));
    const rawTargetDept = activeDepts[0] || selectedDepts[0];
    const getParentAccountName = (deptName: string) => {
        if (!deptName) return '';
        const lowerName = deptName.toLowerCase();
        const parent = departments.find(d =>
            lowerName === d.name.toLowerCase() ||
            (d.subAccounts && d.subAccounts.some(sub => lowerName === `${d?.name || ''} ${sub?.name || ''}`.toLowerCase() || lowerName === sub.name.toLowerCase()))
        );
        return parent ? parent.name.toLowerCase() : lowerName;
    };
    const targetDeptForValidators = getParentAccountName(rawTargetDept);

    const availableValidators = validators.filter(
        v => {
            if (!targetDeptForValidators) return false;
            const validatorDepts = (v.department || '')
                .split(',')
                .map(d => getParentAccountName((d || '').trim()))
                .filter(Boolean);
            return validatorDepts.includes(targetDeptForValidators);
        }
    );
    const isSpecializedAccount = false;

    // Only "grey out" or force routing if it's a specialized account AND the user is NOT Recruiter S!
    // If it IS Recruiter S!, they should have full control to schedule.
    const shouldRestrictCoordination = false;
    const isPendingLater = false;
    const isAlreadyEndorsed =
        localEndorsementConfirmed ||
        applicant.metadata?.endorsement_confirmed === true ||
        applicant.metadata?.endorsement_confirmed === 'true' ||
        ['FINAL_INTERVIEW_SCHEDULED', 'ASSESSMENT_II', 'SCHEDULING', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FINAL_VERDICT', 'PASSED', 'HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'NO_SHOW', 'RESCHEDULED'].includes(applicant.current_status);

    useEffect(() => {
        if (applicant.endorsement_meeting_date) setMeetingDate(applicant.endorsement_meeting_date);
        if (applicant.endorsement_meeting_end_date) setMeetingEndDate(applicant.endorsement_meeting_end_date);
        if (applicant.endorsement_meeting_body) setEndorsementBody(applicant.endorsement_meeting_body);
        if (applicant.assigned_ops_validator_id) setSelectedValidatorId(applicant.assigned_ops_validator_id);

        const metadata = applicant.metadata ? (typeof applicant.metadata === 'string' ? JSON.parse(applicant.metadata) : applicant.metadata) : {};
        const ids = metadata.assigned_ops_validator_ids || [];
        if (ids.length > 0) {
            setSelectedValidatorIds(ids.filter(Boolean));
        } else if (applicant.assigned_ops_validator_id) {
            setSelectedValidatorIds([applicant.assigned_ops_validator_id]);
        } else {
            setSelectedValidatorIds([]);
        }

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

                    const matchedNames = (applicant.department || '').split(',')
                        .map(s => (s || '').trim())
                        .map(name => {
                            const match = deps.find(d =>
                                (d?.name || '').trim().toLowerCase() === name.toLowerCase() ||
                                (d.subAccounts && d.subAccounts.some(sub => `${d?.name || ''} ${sub?.name || ''}`.trim().toLowerCase() === name.toLowerCase()))
                            );
                            if (match) {
                                const exactMatch = (match?.name || '').trim().toLowerCase() === name.toLowerCase();
                                if (exactMatch) return match.name;
                                const subMatch = match.subAccounts?.find(sub => `${match?.name || ''} ${sub?.name || ''}`.trim().toLowerCase() === name.toLowerCase());
                                return subMatch ? `${match.name} ${subMatch.name}` : name;
                            }
                            return name;
                        })
                        .filter(Boolean)
                        // Auto-filter out failed accounts from the default selection
                        .filter(name => !failedSet.has((name as string).toLowerCase()));
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


    const getValidatorForApplication = (app: Application) => {
        if (selectedValidatorIds.length > 0) {
            const selected = validators.filter(v => selectedValidatorIds.includes(v.id));
            if (selected.length > 0) {
                return {
                    ...selected[0],
                    full_name: selected.map(v => v.full_name).join(', '),
                    email: selected.map(v => v.email).filter(Boolean).join(';')
                };
            }
        }
        const assignedId = (selectedValidatorId || app.assigned_ops_validator_id || '').trim();
        const assignedName = (app.assigned_ops_validator_name || '').trim().toLowerCase();

        return validators.find(validator => validator.id === assignedId)
            || validators.find(validator => (validator?.full_name || '').trim().toLowerCase() === assignedName);
    };

    const getValidatorEmail = (app: Application) => {
        if (selectedValidatorIds.length > 0) {
            const emails = validators
                .filter(v => selectedValidatorIds.includes(v.id))
                .map(v => v.email)
                .filter(Boolean);
            if (emails.length > 0) return emails.join(';');
        }
        return getValidatorForApplication(app)?.email || app.pis?.ops_validator_email || '';
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
                const validatorName = validator?.full_name || applicant.assigned_ops_validator_name || 'Final Interview';
                const formattedDate = meetingDate ? formatDateWithWeekday(meetingDate) : 'N/A';
                const compiled = replacePlaceholders(activeTemplate.body, applicant, validatorName, formattedDate);
                setEndorsementBody(formatBodyText(compiled));
            }
        }
    }, [emailTemplates, applicant, meetingDate, selectedValidatorId, activeAccount, isBodyManuallyEdited, interviewMode]);

    const handleOutlookSchedule = () => {
        if (!meetingDate) return;

        const validator = getValidatorForApplication(applicant);
        const validatorName = validator?.full_name || applicant.assigned_ops_validator_name || 'Final Interview';
        const validatorEmail = getValidatorEmail(applicant);

        const startTime = new Date(meetingDate);
        const endTime = meetingEndDate ? new Date(meetingEndDate) : new Date(startTime.getTime() + 60 * 60 * 1000);

        const isOnline = interviewMode === 'ONLINE';
        const modeLabel = isOnline ? 'Online' : 'On-Site';
        const modeEmoji = isOnline ? '🎥' : 'ðŸ¢';
        const locationVal = isOnline ? 'Online Interview Room' : 'On-Site Office';

        const templateType = isOnline ? 'INTERVIEW_INVITE_ONLINE' : 'INTERVIEW_INVITE';
        const activeTemplate = emailTemplates.find(t => t.isActive && t.type === templateType);

        const formattedDate = formatDateWithWeekday(meetingDate);
        const finalSubject = activeTemplate
            ? replacePlaceholders(activeTemplate.subject, applicant, validatorName, formattedDate)
            : `Endorsement Meeting: ${applicant.applicant_name} (${modeEmoji} ${modeLabel})`;

        const finalBody = activeTemplate
            ? formatBodyText(replacePlaceholders(activeTemplate.body, applicant, validatorName, formattedDate))
            : formatBodyText(endorsementBody) || formatBodyText(`Candidate: ${applicant.applicant_name}\nPosition: ${applicant.position_title}\nFinal Interview: ${validatorName}\nInterview Mode: ${modeEmoji} ${modeLabel}\n\nNotes from Recruiter:\n${finalInterviewNotes || 'N/A'}`);

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

        const currentAccountSchedules = applicant.metadata?.account_schedules || {};
        const rawTargetDept = activeDepts[0] || selectedDepts[0];
        const targetDeptForValidators = getParentAccountName(rawTargetDept);
        const accountKey = targetDeptForValidators || activeAccount || applicant.department || 'Unknown';
        const updatedAccountSchedules = {
            ...currentAccountSchedules,
            [accountKey]: authUser?.full_name || 'System'
        };

        const newMetadata: Record<string, any> = {
            ...(applicant.metadata || {}),
            assigned_ops_validator_ids: selectedValidatorIds,
            interview_mode: interviewMode,
            account_schedules: updatedAccountSchedules,
            final_interview_result: '',
            ops_validator_status: 'PENDING',
            final_specific_status: ''
        };
        // Remove old 'PASSED' status keys if they exist so it's not cached
        newMetadata['Final Specific Status'] = '';
        newMetadata['Specific Status'] = '';

        handleUpdateApplication(applicant.id, {
            endorsement_meeting_date: meetingDate,
            endorsement_meeting_end_date: meetingEndDate,
            endorsement_meeting_body: endorsementBody,
            assigned_ops_validator_id: selectedValidatorId,
            assigned_ops_validator_name: validator?.full_name || '',
            final_verdict: '',
            metadata: newMetadata
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
            const patchPis: any = { ...(applicant.pis || {}) };
            // Clear reschedule request status so candidate moves from REQUESTS -> ACTIVE
            if (patchPis.final_specific_status === 'OV - Reschedule') {
                patchPis.final_specific_status = 'OV - Rescheduled';
            } else {
                patchPis.final_specific_status = '';
            }
            patchPis.final_interview_result = '';
            patchPis.ops_validator_status = 'PENDING';
            patchPis.overall_status = 'OPEN';

            const newMetadata: Record<string, any> = {
                ...(applicant.metadata || {}),
                assigned_ops_validator_ids: selectedValidatorIds,
                interview_mode: interviewMode,
                final_interview_result: '',
                ops_validator_status: 'PENDING',
                final_specific_status: ''
            };
            newMetadata['Final Specific Status'] = '';
            newMetadata['Specific Status'] = '';

            await handleUpdateApplication(applicant.id, {
                current_status: 'FINAL_INTERVIEW_SCHEDULED',
                endorsement_meeting_date: meetingDate,
                endorsement_meeting_end_date: meetingEndDate,
                assigned_ops_validator_id: selectedValidatorId,
                assigned_ops_validator_name: validator?.full_name || '',
                department: activeAccount || applicant.department,
                final_verdict: '',
                // Track if actually scheduled in outlook or "maybe later"
                recruiter_s_scheduling_status: withOutlook ? 'SCHEDULED' : 'PENDING',
                pis: patchPis,
                metadata: newMetadata
            });

            // 2. Notify Validator in-app
            if (sendWebAppAlert && selectedValidatorIds.length > 0) {
                for (const valId of selectedValidatorIds) {
                    await NotificationService.notify(
                        valId,
                        'New Final Interview Scheduled',
                        `You have been assigned an Final Interview for ${applicant.applicant_name} on ${new Date(meetingDate).toLocaleString()}.`,
                        'final_interview_scheduled'
                    );
                }
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

    const handleForcePass = async () => {
        setIsProcessing(true);
        showLoading('Confirming validator endorsement and updating pipeline...');
        try {
            const convertToBase64 = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
            };

            let attachmentData = '';
            let attachmentName = '';
            if (passAttachment) {
                attachmentData = await convertToBase64(passAttachment);
                attachmentName = passAttachment.name;
            }

            const deptName = activeAccount || applicant.department || 'DOORDASH';
            const selectedDepts = (applicant.department || '')
                .split(',')
                .map((s: string) => (s || '').trim().toUpperCase())
                .filter(Boolean);

            const hasKeller = selectedDepts.some((d: string) => d.includes('KELLER POSTMAN'));
            const hasSpecialized = selectedDepts.some((d: string) => ['AUTO APPROVE', 'TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].some(p => d.includes(p)));

            let nextStatus: string;
            if (hasKeller) {
                nextStatus = 'CLIENT_ASSESSMENT';
            } else if (hasSpecialized) {
                nextStatus = 'CLIENT_INTERVIEW';
            } else {
                nextStatus = 'For Job Offer';
            }

            const patch: any = {
                current_status: nextStatus as any,
                department: deptName,
                master_column: 'MASTERLIST',
                final_verdict: 'PASSED',
                hired_at: new Date().toISOString(),
                master_remarks: `FOR JOB OFFER - Endorsed to ${forceOpsValidatorAccount || deptName}`,
                assigned_ops_validator_name: forceOpsValidatorName || authUser?.full_name || 'System (Force Pass)',
                pis: {
                    ...(applicant.pis || {}),
                    final_account: forceOpsValidatorAccount || deptName,
                    final_lob: forceOpsValidatorLob || undefined,
                    final_interview_result: 'PASSED',
                    overall_status: 'PASSED',
                    final_specific_status: 'OV - Passed',
                    interview_completed_at: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }),
                    ops_validator_email: authUser?.email || 'System (Force Pass)',
                    ops_validator_status: 'PASSED',
                    ops_validator_notes: forceOpsValidatorRemarks || 'Final Interview Passed (Force Pass)',
                    ops_validator_name: forceOpsValidatorName || authUser?.full_name || 'System (Force Pass)',
                    ops_validator_attachment_name: attachmentName || undefined,
                    ops_validator_attachment_data: attachmentData || undefined,
                    last_updated_by: authUser?.full_name || 'System (Force Pass)',
                },
                updated_at: new Date().toISOString()
            };

            await ApplicationService.updateStatus({
                id: applicant.id,
                fromStatus: applicant.current_status,
                toStatus: nextStatus as any,
                changedByName: authUser?.full_name || 'System',
                reason: 'Final Interview Passed (Force Pass)',
                patch
            });

            await handleUpdateApplication(applicant.id, {
                current_status: nextStatus as any,
                ...patch
            });

        } catch (err) {
            console.error('Failed to force pass final interview:', err);
        } finally {
            setIsProcessing(false);
            hideLoading();
        }
    };

    const handleForceFail = async () => {
        setIsProcessing(true);
        showLoading('Recording evaluation result...');
        try {
            const deptName = activeAccount || applicant.department || 'DOORDASH';
            const accountToFail = forceOpsValidatorAccount || deptName;
            const newFailedAccounts = [...failedAccounts];
            const activeDeptsToFail = (accountToFail || '').split(',').map(s => (s || '').trim()).filter(Boolean);
            activeDeptsToFail.forEach(dept => {
                if (!newFailedAccounts.some((f: any) => (f || '').trim().toLowerCase() === dept.toLowerCase())) {
                    newFailedAccounts.push(dept);
                }
            });

            const patch: any = {
                current_status: 'FAILED',
                master_column: 'FAILED',
                final_verdict: 'FAILED',
                master_remarks: `Final Interview FAILED - ${accountToFail}`,
                assigned_ops_validator_name: forceOpsValidatorName || authUser?.full_name || 'System (Force Fail)',
                metadata: {
                    ...(applicant.metadata || {}),
                    failed_accounts: newFailedAccounts,
                    final_lob: forceOpsValidatorLob || undefined
                },
                pis: {
                    ...(applicant.pis || {}),
                    final_account: accountToFail,
                    final_lob: forceOpsValidatorLob || undefined,
                    final_interview_result: 'FAILED',
                    overall_status: 'FAILED',
                    final_specific_status: 'OV - Failed',
                    interview_completed_at: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }),
                    ops_validator_email: authUser?.email || 'System (Force Fail)',
                    ops_validator_status: 'FAILED',
                    ops_validator_notes: forceOpsValidatorRemarks || 'Final Interview Failed (Force Fail)',
                    ops_validator_name: forceOpsValidatorName || authUser?.full_name || 'System (Force Fail)',
                    last_updated_by: authUser?.full_name || 'System (Force Fail)',
                },
                updated_at: new Date().toISOString()
            };

            await ApplicationService.updateStatus({
                id: applicant.id,
                fromStatus: applicant.current_status,
                toStatus: 'FAILED',
                changedByName: authUser?.full_name || 'System',
                reason: 'Final Interview Failed (Force Fail)',
                patch
            });

            await handleUpdateApplication(applicant.id, {
                current_status: 'FAILED',
                ...patch
            });

        } catch (err) {
            console.error('Failed to force fail final interview:', err);
        } finally {
            setIsProcessing(false);
            hideLoading();
        }
    };

    const handleNoShow = async () => {
        setIsProcessing(true);
        showLoading('Recording no show...');
        try {
            let currentStep = String(applicant.current_status || '');
            currentStep = currentStep.replace(/no_show_-_/gi, '').replace(/no show - /gi, '').replace(/no show/gi, '').replace(/no_show/gi, '').replace(/noshow/gi, '');
            currentStep = currentStep.replace(/^- /, '').trim();
            if (currentStep.includes('_')) {
                currentStep = currentStep.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            } else {
                currentStep = currentStep.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
            const nextStatus = `No show - ${currentStep}${isNoShowFailed ? ' - failed' : ''}`;

            const patch: any = {
                current_status: nextStatus as any,
                master_column: isNoShowFailed ? 'FAILED' : 'MASTERLIST',
                final_verdict: isNoShowFailed ? 'FAILED' : 'NO SHOW',
                pis: {
                    ...(applicant.pis || {}),
                    overall_status: isNoShowFailed ? 'FAILED' : 'NO_SHOW',
                    final_specific_status: `OV - No Show${selectedNoShowCategory ? ` (${selectedNoShowCategory})` : ''}`,
                    ops_validator_email: authUser?.email || 'System',
                    ops_validator_status: 'NO_SHOW',
                    ops_validator_notes: `Final Interview No Show${selectedNoShowCategory ? ` - ${selectedNoShowCategory}` : ''}`,
                    last_updated_by: authUser?.full_name || 'System',
                },
                updated_at: new Date().toISOString()
            };

            if (selectedNoShowCategory) {
                patch.metadata = {
                    ...(applicant.metadata || {}),
                    no_show_category: selectedNoShowCategory
                };
            }

            await ApplicationService.updateStatus({
                id: applicant.id,
                fromStatus: applicant.current_status,
                toStatus: nextStatus,
                changedByName: authUser?.full_name || 'System',
                reason: `Final Interview No Show${selectedNoShowCategory ? ` - ${selectedNoShowCategory}` : ''}`,
                patch
            });

            await handleUpdateApplication(applicant.id, {
                current_status: nextStatus,
                ...patch
            });
            if (setModalTab) setModalTab('verdict');
        } catch (err) {
            console.error('Failed to mark no show for final interview:', err);
        } finally {
            setIsProcessing(false);
            hideLoading();
        }
    };

    const isAlreadyRouted = false;

    const isStatusHiredOrPassed = [
        'PASSED', 'HIRED', 'HIRED_PROCESSED', 'CLIENT_ASSESSMENT',
        'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR JOB OFFER',
        'CONTRACT_SENT', 'ACCEPTED_OFFER', 'ACCEPTED OFFER',
        'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED'
    ].includes(applicant.current_status?.toUpperCase()) || applicant.final_verdict === 'PASSED';

    const failedFromStatus = String(applicant.failure_details?.from_status || '').toUpperCase();
    const specStatus = String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase();

    const isOpsValFailure = (
        applicant.final_verdict === 'REJECTED' ||
        (applicant as any).ops_validator_status === 'FAILED' ||
        applicant.pis?.ops_validator_status === 'FAILED' ||
        applicant.metadata?.ops_validator_status === 'FAILED' ||
        applicant.metadata?.final_interview_result === 'FAILED' ||
        failedFromStatus.includes('FINAL') ||
        failedFromStatus.includes('OPS') ||
        failedFromStatus === 'ACCOUNT_ASSIGNMENT' ||
        (failedFromStatus === '' && (specStatus.includes('ov') || specStatus.includes('final')) && !specStatus.includes('initial'))
    );

    const isStatusFailedOrRejected = ([
        'REJECTED', 'FAILED', 'DISQUALIFIED', 'NOT_ELIGIBLE_FOR_REHIRE', 'WITHDRAWN'
    ].includes(applicant.current_status?.toUpperCase()) || applicant.final_verdict === 'REJECTED') && isOpsValFailure;

    const isOnCall = (applicant.position_title || '').toLowerCase().includes('[on-call]') ||
        (applicant.position_title || '').toLowerCase().includes('[on call]') ||
        String(applicant.metadata?.interview_mode || '').toLowerCase() === 'on-call' ||
        String(applicant.metadata?.interview_mode || '').toLowerCase() === 'online' ||
        String(applicant.pis?.preferred_setup || '').toLowerCase() === 'on-call' ||
        String(applicant.pis?.preferred_setup || '').toLowerCase() === 'online';

    const isNoShow = String(applicant.current_status || '').toLowerCase().includes('no show') ||
        String(applicant.current_status || '').toLowerCase().includes('noshow') ||
        String(applicant.current_status || '').toLowerCase().includes('no_show');

    const statusUpperClean = (applicant.current_status || '').toUpperCase().replace(/_/g, ' ');
    const STAGES_ALLOWING_TAB = [
        'INITIAL INTERVIEW', 'INITIAL_INTERVIEW',
        'INTERVIEW IN PROGRESS', 'INTERVIEW_IN_PROGRESS',
        'ASSESSMENT', 'ASSESSMENT II', 'ASSESSMENT_II',
        'SCHEDULING', 'FINAL INTERVIEW', 'FINAL_INTERVIEW',
        'FINAL INTERVIEW SCHEDULED', 'FINAL_INTERVIEW_SCHEDULED',
        'PASSED', 'REJECTED', 'FAILED', 'DISQUALIFIED',
        'FOR SCHEDULING', 'FOR_SCHEDULING',
        'ACCOUNT ASSIGNMENT', 'ACCOUNT_ASSIGNMENT',
        'CLIENT ASSESSMENT', 'CLIENT_ASSESSMENT',
        'CLIENT INTERVIEW', 'CLIENT_INTERVIEW',
        'FINAL VERDICT', 'FINAL_VERDICT',
        'HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER',
        'WITHDRAWN', 'NO SHOW', 'NO_SHOW',
        'RESCHEDULED', 'PAN COMPLETED', 'PAN_COMPLETED',
        'FOR JOB OFFER', 'FOR_JOB_OFFER',
        'SENT JO AND BGC', 'SENT_JO_AND_BGC',
        'CONTRACT SENT', 'CONTRACT_SENT',
        'FOR PAN', 'FOR_PAN', 'VERDICT',
        ...(isOnCall ? ['TYPING TEST', 'TYPING_TEST'] : [])
    ];

    const failedAccountsForConfig = applicant.metadata?.failed_accounts || [];
    const deptsForConfig = (applicant.department || '').split(',').filter(Boolean);
    const remainingAccountsForConfig = deptsForConfig.filter((d: string) => !failedAccountsForConfig.some((f: string) => (f || '').trim().toLowerCase() === (d || '').trim().toLowerCase()));
    const isReprofileScenario = (applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true') || (failedAccountsForConfig.length > 0 && remainingAccountsForConfig.length > 0);

    const hasOpsValAssigned = applicant.assigned_ops_validator_name || (applicant.metadata?.assigned_ops_validator_ids && applicant.metadata.assigned_ops_validator_ids.length > 0) || applicant.endorsed_to_recruiter_s || applicant.metadata?.endorsed_to_recruiter_s;

    const meetingDateCheck = (applicant.endorsement_meeting_date || applicant.metadata?.endorsement_meeting_date || (applicant.pis as any)?.endorsement_meeting_date || '').trim();
    const isActuallyScheduled = Boolean(meetingDateCheck && meetingDateCheck !== '—' && meetingDateCheck !== 'Pending');

    const STAGES_SHOWING_CONFIG = [
        'INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'ASSESSMENT',
        'FINAL_INTERVIEW', 'QUEUE_ASSIGNED', 'FOR_SCHEDULING', 'ACCOUNT_ASSIGNMENT',
        ...(!isActuallyScheduled && applicant.current_status === 'FINAL_INTERVIEW_SCHEDULED' ? ['FINAL_INTERVIEW_SCHEDULED'] : []),
        ...(isOnCall ? ['TYPING_TEST'] : [])
    ];

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
            {(() => {
                const stageKey = mode === 'endorsement' ? 'ACCOUNT_ASSIGNMENT' : 'FINAL_INTERVIEW';
                const revertedData = applicant.metadata?.reverted_stages?.[stageKey];
                if (!revertedData) return null;
                return (
                    <div className="mb-6 relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                                <RefreshCw size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">
                                    Previous {mode === 'endorsement' ? 'Account Assignment' : 'Evaluation'} Available
                                </h4>
                                <p className="text-xs text-amber-700 font-medium mt-0.5">
                                    Candidate was reverted.
                                    {mode === 'endorsement' && revertedData.department ? ` Previous account: ${revertedData.department}.` : ''}
                                    {mode !== 'endorsement' && revertedData.final_interview_result ? ` Previous result: ${revertedData.final_interview_result}.` : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                const newRevertedStages = { ...(applicant.metadata?.reverted_stages || {}) };
                                delete newRevertedStages[stageKey];

                                const patch: any = {
                                    metadata: {
                                        ...(applicant.metadata || {}),
                                        reverted_stages: newRevertedStages
                                    }
                                };

                                if (mode === 'endorsement') {
                                    patch.current_status = 'ASSESSMENT';
                                    patch.department = revertedData.department;
                                    if (revertedData.final_account) {
                                        patch.pis = { ...(applicant.pis || {}), final_account: revertedData.final_account };
                                    }
                                } else {
                                    patch.current_status = 'FOR_JOB_OFFER';
                                    patch.assigned_ops_validator_id = revertedData.assigned_ops_validator_id;
                                    patch.assigned_ops_validator_name = revertedData.assigned_ops_validator_name;
                                    patch.endorsement_meeting_date = revertedData.endorsement_meeting_date;
                                    patch.endorsement_meeting_end_date = revertedData.endorsement_meeting_end_date;
                                    patch.pis = {
                                        ...(applicant.pis || {}),
                                        ops_validator_notes: revertedData.ops_validator_notes,
                                        ops_validator_status: revertedData.ops_validator_status,
                                        final_interview_result: revertedData.final_interview_result
                                    };
                                }

                                await handleUpdateApplication(applicant.id, patch);
                                if (mode === 'endorsement' && revertedData.department) {
                                    setSelectedAccount(revertedData.department);
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
            <div className="space-y-4 flex flex-col items-center text-center mb-6">
                <div className="flex flex-col items-center gap-3">
                    {(() => {
                        const failedAccounts = applicant.metadata?.failed_accounts || [];
                        const isReprofileFlag = applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true';

                        // Hide title and subtitle for the scheduling view
                        if (!isSpecializedAccount && mode !== 'endorsement' && !isReprofileFlag && failedAccounts.length === 0) {
                            return null;
                        }

                        return (
                            <>
                                <div className="w-12 h-1 bg-primary-500 rounded-full mb-2" />
                                <h3 className="text-2xl font-semibold text-surface-900 tracking-tight">
                                    {(() => {
                                        if (isSpecializedAccount) return 'Operations Validator';
                                        if (mode === 'endorsement') return 'Candidate Endorsement';
                                        if (isReprofileFlag || failedAccounts.length > 0) return 'Reprofile Dashboard';
                                        return null;
                                    })()}
                                </h3>
                                <p className="text-[14px] text-surface-500 font-medium max-w-lg leading-relaxed">
                                    {(() => {
                                        if (mode === 'endorsement') return 'Endorse candidate to the Operations Validator or client for final review.';
                                        if (isReprofileFlag || failedAccounts.length > 0) return 'Coordinate reprofiling to an alternative account following a previous unsuccessful evaluation.';
                                        return null;
                                    })()}
                                </p>
                            </>
                        );
                    })()}
                </div>

                {STAGES_ALLOWING_TAB.includes(applicant.current_status) || STAGES_ALLOWING_TAB.includes(statusUpperClean) || (applicant.current_status === 'QUEUE_ASSIGNED' && applicant.queue_type === 'FINAL') || true ? (
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
                        ) : (!STAGES_SHOWING_CONFIG.includes(applicant.current_status) && !isPendingLater && mode !== 'endorsement') ? (
                            <div className={cn(
                                "p-8 rounded-lg space-y-5 shadow-sm text-left border relative overflow-hidden",
                                applicant.current_status === 'RESCHEDULED' ? "bg-purple-50 border-purple-200" :
                                    isStatusHiredOrPassed ? "bg-emerald-50 border-emerald-100" :
                                        isStatusFailedOrRejected ? "bg-red-50 border-red-100" :
                                            "bg-primary-50 border-primary-100"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "font-bold text-[11px] uppercase tracking-wider",
                                        applicant.current_status === 'RESCHEDULED' ? "text-purple-700" :
                                            isStatusHiredOrPassed ? "text-emerald-700" :
                                                isStatusFailedOrRejected ? "text-red-700" :
                                                    "text-primary-700"
                                    )}>
                                        {(applicant.final_verdict || isStatusHiredOrPassed || isStatusFailedOrRejected) ? `Evaluation Concluded: ${applicant.final_verdict || (isStatusHiredOrPassed ? 'PASSED' : 'FAILED')}` : applicant.current_status === 'RESCHEDULED' ? 'Pending Reschedule' : 'Session Provisioned'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(applicant.current_status === 'FINAL_INTERVIEW_SCHEDULED' || applicant.current_status === 'RESCHEDULED') && !applicant.final_verdict && (
                                            <>
                                                {applicant.current_status !== 'RESCHEDULED' && (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await handleUpdateApplication(applicant.id, {
                                                                    current_status: 'RESCHEDULED',
                                                                    metadata: {
                                                                        ...(applicant.metadata || {}),
                                                                        endorsement_confirmed: "false"
                                                                    },
                                                                    pis: {
                                                                        ...(applicant.pis || {}),
                                                                        final_specific_status: 'OV - Rescheduled'
                                                                    } as any
                                                                });
                                                            } catch (err) {
                                                                console.error('Failed to reschedule:', err);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-[#0c2461] border border-[#0c2461] text-white hover:bg-[#0c2461]/90 text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm transition-all flex items-center gap-1.5"
                                                    >
                                                        <Calendar size={12} />
                                                        Reschedule
                                                    </button>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Are you sure you want to revert scheduling and go back to configuration?')) {
                                                            try {
                                                                await handleUpdateApplication(applicant.id, {
                                                                    current_status: 'FINAL_INTERVIEW',
                                                                    recruiter_s_scheduling_status: 'PENDING',
                                                                    endorsement_meeting_date: null as any,
                                                                    endorsement_meeting_end_date: null as any,
                                                                    assigned_ops_validator_id: null as any,
                                                                    assigned_ops_validator_name: '',
                                                                    metadata: {
                                                                        ...(applicant.metadata || {}),
                                                                        endorsement_confirmed: "false",
                                                                        assigned_ops_validator_ids: []
                                                                    },
                                                                    pis: {
                                                                        ...(applicant.pis || {}),
                                                                        final_specific_status: 'OV - Pending'
                                                                    } as any
                                                                });
                                                            } catch (err) {
                                                                console.error('Failed to revert scheduling:', err);
                                                            }
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-primary-200 text-primary-700 hover:bg-primary-50 text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm transition-all"
                                                >
                                                    Step Back
                                                </button>
                                            </>
                                        )}
                                        <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-md border border-white/40">
                                            <Calendar size={14} className="text-surface-400" />
                                            <span className="text-[11px] font-bold text-surface-600">
                                                {applicant.endorsement_meeting_date ? new Date(applicant.endorsement_meeting_date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'Asia/Manila' }) : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "flex flex-wrap items-center gap-2",
                                    isStatusHiredOrPassed ? "text-emerald-800" :
                                        isStatusFailedOrRejected ? "text-red-800" :
                                            "text-primary-800"
                                )}>
                                    <p className="text-[13px] font-medium leading-relaxed flex-1 min-w-0 break-words">
                                        {(applicant.final_verdict || isStatusHiredOrPassed || isStatusFailedOrRejected)
                                            ? <span>Protocol complete. Finalization handled by <span className="font-bold">{applicant.assigned_ops_validator_name || (applicant.pis as any)?.ops_validator_name || 'an Operations Validator'}</span>.</span>
                                            : <span>The evaluation session has been scheduled. Awaiting input from <span className="font-bold">{applicant.assigned_ops_validator_name || (applicant.pis as any)?.ops_validator_name || 'an Operations Validator'}</span>.</span>
                                        }
                                    </p>

                                    {isEditingOpsValidator ? (
                                        <select
                                            autoFocus
                                            className="text-xs px-2 py-1.5 border rounded bg-white dark:bg-slate-900 text-surface-900 focus:outline-none focus:ring-1 focus:ring-primary-500 max-w-[250px]"
                                            value={applicant.assigned_ops_validator_name || ''}
                                            onChange={(e) => {
                                                const newVal = e.target.value;
                                                if (newVal && newVal !== applicant.assigned_ops_validator_name) {
                                                    handleUpdateApplication(applicant.id, { assigned_ops_validator_name: newVal });
                                                }
                                                setIsEditingOpsValidator(false);
                                            }}
                                            onBlur={() => setIsEditingOpsValidator(false)}
                                        >
                                            <option value="" disabled>Select Ops Validator...</option>
                                            {accountValidatorsList.length > 0 ? (
                                                accountValidatorsList.map(v => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))
                                            ) : (
                                                <option value="" disabled>No validators found for this account</option>
                                            )}
                                        </select>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingOpsValidator(true)}
                                            className="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                            title="Edit Assigned Operations Validator"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                        </button>
                                    )}
                                </div>

                                {/* Audit Info */}
                                {(applicant.pis?.last_updated_by || applicant.assigned_recruiter_name || applicant.updated_at) && (
                                    <div className={cn(
                                        "mt-4 pt-3 border-t space-y-1",
                                        isStatusHiredOrPassed ? "border-emerald-200/50" :
                                            isStatusFailedOrRejected ? "border-red-200/50" :
                                                "border-primary-200/50"
                                    )}>
                                        {(applicant.pis?.last_updated_by || applicant.assigned_recruiter_name) && (
                                            <p className={cn(
                                                "text-[10px] font-semibold",
                                                isStatusHiredOrPassed ? "text-emerald-600/80" :
                                                    isStatusFailedOrRejected ? "text-red-600/80" :
                                                        "text-primary-600/80"
                                            )}>
                                                Processed by <span className="font-bold">{applicant.pis?.last_updated_by || applicant.assigned_recruiter_name}</span>
                                            </p>
                                        )}
                                        {applicant.updated_at && (
                                            <p className={cn(
                                                "text-[10px] font-medium",
                                                isStatusHiredOrPassed ? "text-emerald-500/70" :
                                                    isStatusFailedOrRejected ? "text-red-500/70" :
                                                        "text-primary-500/70"
                                            )}>
                                                {new Date(applicant.updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div className="mt-6 flex justify-start gap-3">
                                    {(() => {
                                        // Detect if the failure originated from the Initial Interview stage
                                        const failFrom = String(applicant.failure_details?.from_status || applicant.metadata?.failure_from_status || '').toUpperCase().trim();
                                        const iiResult = String(applicant.metadata?.initial_interview_result || '').toUpperCase();
                                        const hasAssessmentScore = applicant.assessment_score !== null && applicant.assessment_score !== undefined && String(applicant.assessment_score).trim() !== '';
                                        const isFailedFromInitial = (
                                            failFrom === 'INITIAL_INTERVIEW' || failFrom === 'INTERVIEW_IN_PROGRESS' || failFrom === 'QUEUE_ASSIGNED' ||
                                            (iiResult === 'FAILED' && !hasAssessmentScore) ||
                                            (!failFrom && !hasAssessmentScore && ['FAILED', 'REJECTED'].includes(applicant.current_status?.toUpperCase()))
                                        );

                                        if (isFailedFromInitial) {
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!window.confirm('Are you sure you want to undo the failure and revert this candidate back to Interview In Progress?')) return;
                                                        setIsProcessing(true);
                                                        try {
                                                            await handleUpdateApplication(applicant.id, {
                                                                current_status: 'INTERVIEW_IN_PROGRESS',
                                                                final_verdict: null as any,
                                                                metadata: {
                                                                    ...(applicant.metadata || {}),
                                                                    initial_interview_result: null,
                                                                    final_specific_status: null,
                                                                    ops_validator_status: null,
                                                                    'Specific Status': null,
                                                                    'Final Specific Status': null,
                                                                },
                                                            });
                                                            setModalTab('initial');
                                                        } catch (err) {
                                                            console.error('Failed to undo:', err);
                                                        } finally {
                                                            setIsProcessing(false);
                                                        }
                                                    }}
                                                    disabled={isProcessing}
                                                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    <ArrowRightLeft size={14} />
                                                    {isProcessing ? 'Reverting...' : 'Undo Failure'}
                                                </button>
                                            );
                                        }

                                        return (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    setIsProcessing(true);
                                                    try {
                                                        await handleUpdateApplication(applicant.id, {
                                                            current_status: 'ACCOUNT_ASSIGNMENT',
                                                            final_verdict: null as any,
                                                            recruiter_s_scheduling_status: 'PENDING',
                                                            endorsement_meeting_date: null as any,
                                                            endorsement_meeting_end_date: null as any,
                                                            assigned_ops_validator_id: null as any,
                                                            assigned_ops_validator_name: '',
                                                            metadata: {
                                                                ...(applicant.metadata || {}),
                                                                is_reprofiled: true,
                                                                recruiter_s_scheduling_status: 'PENDING',
                                                                assigned_ops_validator_ids: [],
                                                                final_interview_result: null,
                                                                final_specific_status: null,
                                                                ops_validator_status: null,
                                                                'Specific Status': null,
                                                                'Final Specific Status': null,
                                                                endorsement_confirmed: "false"
                                                            },
                                                            pis: {
                                                                ...(applicant.pis || {}),
                                                                overall_status: 'OPEN',
                                                                final_specific_status: 'OV - Pending',
                                                                final_interview_result: null as any,
                                                                ops_validator_status: 'Pending'
                                                            } as any
                                                        });
                                                        setModalTab('endorsement');
                                                    } catch (err) {
                                                        console.error('Failed to initiate reprofile:', err);
                                                    } finally {
                                                        setIsProcessing(false);
                                                    }
                                                }}
                                                disabled={isProcessing}
                                                className="px-6 py-2.5 bg-[#0c2461] hover:bg-[#0c2461]/90 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                <ArrowRightLeft size={14} />
                                                {isProcessing ? 'Initiating Reprofile...' : 'Reprofile Candidate'}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="max-w-4xl mx-auto w-full">
                                    <div className="bg-white dark:bg-slate-900 border border-surface-200 shadow-premium rounded-lg relative">
                                        {isNoShow && (
                                            <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[8px] z-30 flex flex-col items-center justify-center p-8 animate-fade-in">
                                                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-[16px] border border-white shadow-2xl rounded-2xl p-8 max-w-md w-full flex flex-col items-center text-center space-y-6 transform transition-all duration-300 scale-100 hover:scale-[1.01]">
                                                    <div className="w-16 h-16 bg-red-50 border border-red-200/60 rounded-full flex items-center justify-center relative shadow-inner">
                                                        <div className="absolute inset-0 bg-red-500/10 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
                                                        <UserIcon size={24} className="text-red-600 relative z-10" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <span className="px-3.5 py-1 bg-red-50 border border-red-200/50 text-red-700 text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-[0_2px_10px_rgba(239,68,68,0.08)]">
                                                            Final Interview
                                                        </span>
                                                        <h4 className="text-[20px] font-black text-slate-900 dark:text-white tracking-tight">
                                                            Candidate No Show
                                                        </h4>
                                                        <p className="text-[12.5px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-2">
                                                            The candidate was marked as a no-show for this session. You can restore their session below.
                                                        </p>
                                                    </div>

                                                    <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100/80 rounded-xl p-4.5 space-y-3.5 text-left shadow-inner">
                                                        <div className="flex justify-between items-center text-[11px] border-b border-slate-200 dark:border-slate-800/40 pb-2.5">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Category</span>
                                                            <span className="text-slate-800 dark:text-slate-200 font-extrabold">{applicant.metadata?.no_show_category || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px]">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Status</span>
                                                            <span className="text-slate-800 dark:text-slate-200 font-extrabold uppercase tracking-widest text-[10px] bg-red-100 px-2 py-0.5 rounded text-red-700">No Show</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={async () => {
                                                            setIsProcessing(true);
                                                            try {
                                                                await handleUpdateApplication(applicant.id, {
                                                                    current_status: 'FINAL_INTERVIEW',
                                                                    metadata: {
                                                                        ...(applicant.metadata || {}),
                                                                        no_show_category: null
                                                                    }
                                                                });
                                                            } catch (err) {
                                                                console.error('Failed to resume from no show:', err);
                                                            } finally {
                                                                setIsProcessing(false);
                                                            }
                                                        }}
                                                        disabled={isProcessing}
                                                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[13px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-slate-950/10 active:scale-[0.98] border border-slate-800"
                                                    >
                                                        {isProcessing ? 'Restoring Session...' : 'Resume Coordination'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {isPendingLater && (
                                            <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[8px] z-30 flex flex-col items-center justify-center p-8 animate-fade-in">
                                                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-[16px] border border-white shadow-2xl rounded-2xl p-8 max-w-md w-full flex flex-col items-center text-center space-y-6 transform transition-all duration-300 scale-100 hover:scale-[1.01]">
                                                    <div className="w-16 h-16 bg-amber-50 border border-amber-200/60 rounded-full flex items-center justify-center relative shadow-inner">
                                                        <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
                                                        <Pause size={24} className="text-amber-600 relative z-10 animate-pulse" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <span className="px-3.5 py-1 bg-amber-50 border border-amber-200/50 text-amber-700 text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-[0_2px_10px_rgba(245,158,11,0.08)]">
                                                            For Final Interview Scheduling
                                                        </span>
                                                        <h4 className="text-[20px] font-black text-slate-900 dark:text-white tracking-tight">
                                                            Coordination Paused
                                                        </h4>
                                                        <p className="text-[12.5px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-2">
                                                            All configuration inputs are locked while coordination is deferred. Manage or restore coordination below.
                                                        </p>
                                                    </div>

                                                    {/* Paused Dashboard Mini-Insight */}
                                                    <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100/80 rounded-xl p-4.5 space-y-3.5 text-left shadow-inner">
                                                        <div className="flex justify-between items-center text-[11px] border-b border-slate-200 dark:border-slate-800/40 pb-2.5">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Candidate</span>
                                                            <span className="text-slate-800 dark:text-slate-200 font-extrabold">{applicant.applicant_name}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px] border-b border-slate-200 dark:border-slate-800/40 pb-2.5">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Target Account</span>
                                                            <span className="text-slate-800 dark:text-slate-200 font-extrabold uppercase tracking-widest text-[10px] bg-slate-200/60 px-2 py-0.5 rounded">{activeAccount || 'Keller Postman'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px]">
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Stage Deferral</span>
                                                            <span className="text-amber-700 font-extrabold flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/30">
                                                                <Pause size={10} className="fill-current" />
                                                                Final Interview
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
                                                        <p className="text-[16px] font-extrabold uppercase tracking-wider bg-white dark:bg-slate-900 py-2 px-4 border border-surface-200 rounded-md shadow-sm flex flex-wrap items-center justify-center gap-1.5 mt-1">
                                                            {!(applicant.department) ? (
                                                                <span className="text-[#0078D4]">General</span>
                                                            ) : (
                                                                (applicant.department || '').split(',').map(s => (s || '').trim()).filter(Boolean).map((dep, idx, arr) => {
                                                                    const isFailed = failedAccounts.some((f: string) => (f || '').trim().toLowerCase() === dep.toLowerCase());
                                                                    return (
                                                                        <React.Fragment key={idx}>
                                                                            <span className={cn(
                                                                                isFailed ? "line-through text-red-400 opacity-75" : "text-[#0078D4]"
                                                                            )}>
                                                                                {dep}
                                                                            </span>
                                                                            {idx < arr.length - 1 && <span className="text-surface-300">,</span>}
                                                                        </React.Fragment>
                                                                    );
                                                                })
                                                            )}
                                                        </p>
                                                    </div>

                                                    {/* Audit Info */}
                                                    <div className="pt-3 border-t border-surface-100 space-y-1">
                                                        {(applicant.pis?.last_updated_by || applicant.assigned_recruiter_name) && (
                                                            <p className="text-[10px] font-semibold text-surface-500">
                                                                Endorsed by <span className="font-bold text-surface-700">{applicant.pis?.last_updated_by || applicant.assigned_recruiter_name}</span>
                                                            </p>
                                                        )}
                                                        {applicant.updated_at && (
                                                            <p className="text-[10px] font-medium text-surface-400">
                                                                {new Date(applicant.updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="pt-4 flex justify-center">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await handleUpdateApplication(applicant.id, {
                                                                        current_status: 'ACCOUNT_ASSIGNMENT',
                                                                        metadata: {
                                                                            ...(applicant.metadata || {}),
                                                                            endorsement_confirmed: "false",
                                                                            ops_validator_status: null,
                                                                            final_interview_result: null,
                                                                            final_specific_status: null,
                                                                            assigned_ops_validator_ids: []
                                                                        }
                                                                    });
                                                                } catch (err) {
                                                                    console.error('Failed to edit endorsement:', err);
                                                                }
                                                            }}
                                                            className="px-6 py-2 bg-white dark:bg-slate-900 border border-surface-300 hover:bg-surface-50 text-surface-700 text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-all shadow-sm"
                                                        >
                                                            Edit Endorsement
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="px-8 py-6 bg-surface-50/50 border-b border-surface-100 flex flex-col items-center justify-center text-center">
                                                        <div>
                                                            <h4 className="text-[16px] font-semibold text-surface-900 tracking-tight">
                                                                Endorsement Configuration
                                                            </h4>
                                                            <p className="text-[11px] text-surface-400 mt-1 font-medium uppercase tracking-wider">Configure session parameters for Operations Validator.</p>
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
                                                                            setSelectedValidatorIds([]);
                                                                        }}
                                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 text-[14px] font-medium text-surface-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all rounded-md"
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
                                                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 text-[14px] font-medium text-surface-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all rounded-md text-left flex justify-between items-center cursor-pointer"
                                                                            >
                                                                                <span className="truncate max-w-[240px] flex items-center gap-1.5">
                                                                                    {selectedAccount ? (
                                                                                        <>
                                                                                            {category === 'accounts' && (
                                                                                                <div className="flex -space-x-1 overflow-hidden shrink-0 mr-1">
                                                                                                    {selectedAccount.split(',').map(s => (s || '').trim()).filter(Boolean).map(name => {
                                                                                                        const depMatch = departments.find(d => d.name.toLowerCase() === name.toLowerCase());
                                                                                                        if (!depMatch) return null;
                                                                                                        return (
                                                                                                            <div key={depMatch.id} className="ring-1 ring-white rounded overflow-hidden shadow-sm shrink-0">
                                                                                                                {renderAccountLogo(depMatch)}
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            )}
                                                                                            <span>{selectedAccount}</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        `Select ${category === 'accounts' ? 'accounts' : 'roles'}...`
                                                                                    )}
                                                                                </span>
                                                                                <ChevronDown size={16} className="text-surface-400 shrink-0" />
                                                                            </button>

                                                                            {isDropdownOpen && (
                                                                                <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-surface-200 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                                                    {departments
                                                                                        .filter(d => category === 'support' ? isSupportRole(d.name) : !isSupportRole(d.name))
                                                                                        .flatMap(dep => {
                                                                                            const renderOption = (fullDeptName: string, isSubAccount: boolean = false) => {
                                                                                                const isSelected = selectedDepts.some(s => s === (fullDeptName || '').trim().toLowerCase() || s.startsWith((fullDeptName || '').trim().toLowerCase() + " "));
                                                                                                const isFailed = failedAccounts.some((f: string) => (f || '').trim().toLowerCase() === (fullDeptName || '').trim().toLowerCase());
                                                                                                return (
                                                                                                    <label
                                                                                                        key={fullDeptName}
                                                                                                        className={cn(
                                                                                                            "flex items-center gap-2.5 px-3 py-2 rounded hover:bg-surface-50 transition-all select-none text-xs font-medium w-full relative",
                                                                                                            isFailed
                                                                                                                ? "opacity-50 text-red-500 cursor-not-allowed bg-red-50/20"
                                                                                                                : "text-surface-700 cursor-pointer",
                                                                                                            isSelected && !isFailed && "bg-primary-50/50 text-primary-900 font-semibold",
                                                                                                            isSubAccount && "pl-8 bg-surface-50/30 border-l-2 border-surface-200"
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
                                                                                                                    .map(s => (s || '').trim())
                                                                                                                    .filter(Boolean);
                                                                                                                const existingItem = currentList.find(item => item.toLowerCase() === (fullDeptName || '').trim().toLowerCase() || item.toLowerCase().startsWith((fullDeptName || '').trim().toLowerCase() + " "));
                                                                                                                if (existingItem) {
                                                                                                                    updated = currentList.filter(item => item !== existingItem);
                                                                                                                } else {
                                                                                                                    updated = [...currentList, (fullDeptName || '').trim()];
                                                                                                                }
                                                                                                                const joined = updated.join(', ');
                                                                                                                setSelectedAccount(joined);
                                                                                                                setSelectedValidatorId('');
                                                                                                                setSelectedValidatorIds([]);
                                                                                                            }}
                                                                                                            className={cn(
                                                                                                                "rounded border-surface-300 text-primary-600 focus:ring-primary-500",
                                                                                                                isFailed ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                                                                                            )}
                                                                                                        />
                                                                                                        {category === 'accounts' && !isSubAccount && renderAccountLogo(dep)}
                                                                                                        <span className={cn(isFailed && "line-through decoration-red-500 decoration-2")}>{fullDeptName}</span>
                                                                                                        {isFailed && (
                                                                                                            <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-750 px-1.5 py-0.5 rounded shrink-0">Failed</span>
                                                                                                        )}
                                                                                                    </label>
                                                                                                );
                                                                                            };

                                                                                            return [renderOption(dep.name)];
                                                                                        })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Sub Accounts Dropdowns */}
                                                            {selectedDepts.map(deptName => {
                                                                const parentDep = departments.find(d =>
                                                                    (d?.name || '').trim().toLowerCase() === deptName ||
                                                                    (d.subAccounts || []).some(sub => `${d?.name || ''} ${sub?.name || ''}`.trim().toLowerCase() === deptName)
                                                                );

                                                                if (parentDep && parentDep.subAccounts && parentDep.subAccounts.length > 0) {
                                                                    const matchedSub = parentDep.subAccounts.find(sub => `${parentDep?.name || ''} ${sub?.name || ''}`.trim().toLowerCase() === deptName);
                                                                    const currentSubValue = matchedSub ? matchedSub.name : "";

                                                                    return (
                                                                        <div key={parentDep.id} className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                                                            <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                                                                                {parentDep.name} Type
                                                                            </label>
                                                                            <select
                                                                                value={currentSubValue}
                                                                                onChange={(e) => {
                                                                                    const newSub = e.target.value;
                                                                                    const newFullName = newSub ? `${parentDep.name} ${newSub}` : parentDep.name;

                                                                                    const currentList = (selectedAccount || '').split(',').map(s => (s || '').trim()).filter(Boolean);
                                                                                    const updated = currentList.map(item => {
                                                                                        if (item.toLowerCase() === deptName || item.toLowerCase().startsWith(parentDep.name.toLowerCase() + " ")) {
                                                                                            return newFullName;
                                                                                        }
                                                                                        return item;
                                                                                    });

                                                                                    setSelectedAccount(updated.join(', '));
                                                                                    setSelectedValidatorId('');
                                                                                    setSelectedValidatorIds([]);
                                                                                }}
                                                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 text-[14px] font-medium text-surface-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all rounded-md"
                                                                            >
                                                                                <option value="">(None)</option>
                                                                                {parentDep.subAccounts.map(sub => (
                                                                                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })}

                                                            {shouldRestrictCoordination && (
                                                                <div className="p-4 bg-primary-50 border border-primary-100 rounded-md flex items-start gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                                                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-md shadow-sm">
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
                                                                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                                                            setLocalEndorsementConfirmed(true);
                                                                            setIsProcessing(true);
                                                                            try {
                                                                                const success = await onRouteToSpecialized?.({ ...applicant, department: selectedAccount }, 'Recruiter S!');
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
                                                                        onClick={async () => {
                                                                            if (!selectedAccount) {
                                                                                alert('Please select an account or role before confirming.');
                                                                                return;
                                                                            }
                                                                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                                                            setLocalEndorsementConfirmed(true);
                                                                            setIsProcessing(true);
                                                                            try {
                                                                                await handleUpdateApplication(applicant.id, {
                                                                                    current_status: 'ASSESSMENT',
                                                                                    department: selectedAccount,
                                                                                    metadata: {
                                                                                        ...(applicant.metadata || {}),
                                                                                        endorsement_confirmed: "true",
                                                                                        pending_from_status: null
                                                                                    }
                                                                                });
                                                                            } catch (err) {
                                                                                console.error('Failed to confirm endorsement:', err);
                                                                            } finally {
                                                                                setIsProcessing(false);
                                                                            }
                                                                        }}
                                                                        disabled={isProcessing || !selectedAccount}
                                                                        className="px-8 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-[12px] font-bold uppercase tracking-wider rounded transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        Confirm Endorsement
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )
                                        ) : (
                                            <>
                                                <div className="text-left space-y-6">
                                                    <div className="bg-white dark:bg-slate-900 p-6 border border-surface-200 space-y-8">

                                                        {/* Accounts Priority */}
                                                        {selectedDepts.length > 0 && (
                                                            <div className="space-y-3">
                                                                <label className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block border-b border-surface-200 pb-2">Selected Accounts Priority</label>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {[...selectedDepts].sort((a, b) => a.localeCompare(b)).map((deptName) => {
                                                                        const isFailed = failedAccounts.some((f: string) => (f || '').trim().toLowerCase() === deptName);
                                                                        const isFirst = rawTargetDept === deptName;
                                                                        const parentNameLower = getParentAccountName(deptName).toLowerCase();
                                                                        const matchingDep = departments.find(d => (d?.name || '').trim().toLowerCase() === parentNameLower);
                                                                        const displayName = deptName.toUpperCase();
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                key={deptName}
                                                                                disabled={isFailed}
                                                                                onClick={() => {
                                                                                    if (isFailed) return;
                                                                                    const rest = selectedDepts.filter(d => d !== deptName);
                                                                                    const newOrder = [deptName.toUpperCase(), ...rest.map(r => r.toUpperCase())];
                                                                                    const joined = newOrder.join(', ');
                                                                                    setSelectedAccount(joined);
                                                                                }}
                                                                                className={cn(
                                                                                    "px-4 py-2 text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer select-none relative",
                                                                                    isFirst
                                                                                        ? "bg-[#0c2461] text-white border-[#0c2461]"
                                                                                        : "bg-[#f3f2f1] text-[#323130] dark:text-slate-300 border-surface-200 hover:bg-white dark:bg-slate-900 hover:border-[#605e5c]",
                                                                                    isFailed && "opacity-50 cursor-not-allowed border-red-200 bg-red-50/50 text-red-700"
                                                                                )}
                                                                            >
                                                                                {matchingDep && (
                                                                                    <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 border border-white/20 bg-white dark:bg-slate-900">
                                                                                        {matchingDep.accountImageUrl || matchingDep.accountImageData ? (
                                                                                            <img
                                                                                                src={matchingDep.accountImageUrl ? (matchingDep.accountImageUrl.startsWith('/') ? `/api${matchingDep.accountImageUrl}` : matchingDep.accountImageUrl) : (matchingDep.accountImageData || '')}
                                                                                                alt={displayName}
                                                                                                className="w-full h-full object-cover"
                                                                                            />
                                                                                        ) : (
                                                                                            <img src="/contactpoint-logo.png?v=2" alt="Logo" className="w-full h-full object-contain p-0.5" />
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                {isFirst && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900 animate-pulse" />}
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

                                                        <div className="flex flex-col gap-4">
                                                            {/* Top Row: Validator (60%) and Mode (40%) */}
                                                            <div className="flex flex-col lg:flex-row gap-4">
                                                                {/* Validator - 60% */}
                                                                <div className="flex-[3] space-y-3 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                                                                    <label className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block border-b border-surface-200 pb-2">Assigned Validator</label>
                                                                    <div className="relative">
                                                                        <button
                                                                            type="button"
                                                                            disabled={!activeAccount || shouldRestrictCoordination}
                                                                            onClick={() => setIsValidatorDropdownOpen(!isValidatorDropdownOpen)}
                                                                            className={cn(
                                                                                "w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded text-[14px] font-medium text-[#323130] dark:text-slate-300 outline-none transition-all flex justify-between items-center text-left hover:border-[#605e5c]",
                                                                                (!activeAccount || shouldRestrictCoordination) && "bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400 cursor-not-allowed opacity-60"
                                                                            )}
                                                                        >
                                                                            <span className="truncate">
                                                                                {selectedValidatorIds.length > 0
                                                                                    ? availableValidators
                                                                                        .filter(v => selectedValidatorIds.includes(v.id))
                                                                                        .map(v => v.full_name)
                                                                                        .join(', ')
                                                                                    : (shouldRestrictCoordination
                                                                                        ? 'Handled by Recruiter S! (specialized)'
                                                                                        : activeAccount
                                                                                            ? (availableValidators.length ? 'Select Validators...' : `No validators assigned to ${activeAccount}`)
                                                                                            : 'Select an account first')}
                                                                            </span>
                                                                            <ChevronDown size={16} className="text-[#605e5c] dark:text-slate-400" />
                                                                        </button>

                                                                        {isValidatorDropdownOpen && !shouldRestrictCoordination && activeAccount && availableValidators.length > 0 && (
                                                                            <>
                                                                                <div className="fixed inset-0 z-30" onClick={() => setIsValidatorDropdownOpen(false)} />
                                                                                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-surface-200 rounded shadow-lg max-h-60 overflow-y-auto z-40 p-1 space-y-0.5">
                                                                                    {availableValidators.map(v => {
                                                                                        const isChecked = selectedValidatorIds.includes(v.id);
                                                                                        return (
                                                                                            <label
                                                                                                key={v.id}
                                                                                                className={cn(
                                                                                                    "flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold cursor-pointer hover:bg-[#f3f2f1] rounded transition-colors select-none",
                                                                                                    isChecked && "bg-[#f3f2f1] text-[#0c2461]"
                                                                                                )}
                                                                                            >
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isChecked}
                                                                                                    onChange={() => {
                                                                                                        let updatedIds: string[];
                                                                                                        if (isChecked) {
                                                                                                            updatedIds = selectedValidatorIds.filter(id => id !== v.id);
                                                                                                        } else {
                                                                                                            updatedIds = [...selectedValidatorIds, v.id];
                                                                                                        }
                                                                                                        setSelectedValidatorIds(updatedIds);
                                                                                                        setSelectedValidatorId(updatedIds[0] || '');
                                                                                                    }}
                                                                                                    className="rounded-sm border-[#605e5c] text-[#0c2461] focus:ring-[#0c2461]/25 w-4 h-4 cursor-pointer"
                                                                                                />
                                                                                                <span>{v.full_name}</span>
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    {targetDeptForValidators && !shouldRestrictCoordination && (
                                                                        <p className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider mt-2">
                                                                            Showing validators for: {(departments.find(d => (d?.name || '').trim().toLowerCase() === targetDeptForValidators)?.name || targetDeptForValidators.toUpperCase())}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {/* Mode - 40% */}
                                                                <div className="flex-[2] space-y-3 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                                                                    <label className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block border-b border-surface-200 pb-2">Interview Mode</label>
                                                                    <div className="flex flex-col gap-2 w-full h-[42px]">
                                                                        <div className="flex bg-[#f3f2f1] p-1 border border-surface-200 rounded w-full h-full">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setInterviewMode('ONLINE');
                                                                                }}
                                                                                className={cn(
                                                                                    "flex-1 py-1.5 px-2 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 rounded-sm",
                                                                                    interviewMode === 'ONLINE'
                                                                                        ? "bg-white dark:bg-slate-900 text-[#0c2461] border border-surface-200 shadow-sm"
                                                                                        : "text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300 border border-transparent"
                                                                                )}
                                                                            >
                                                                                🎥 Online
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setInterviewMode('ONSITE');
                                                                                }}
                                                                                className={cn(
                                                                                    "flex-1 py-1.5 px-2 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 rounded-sm",
                                                                                    interviewMode === 'ONSITE'
                                                                                        ? "bg-white dark:bg-slate-900 text-[#0c2461] border border-surface-200 shadow-sm"
                                                                                        : "text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300 border border-transparent"
                                                                                )}
                                                                            >
                                                                                🏢 On-Site
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Bottom Row: Schedule (100%) */}
                                                            <div className="w-full space-y-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                                                                <label className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block border-b border-surface-200 pb-2">Schedule</label>
                                                                <div className="flex flex-col lg:flex-row gap-4 items-end">
                                                                    <div className="flex-1 space-y-3 w-full">
                                                                        <PremiumDateTimePicker
                                                                            label={
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Play size={12} className="text-[#0c2461]" />
                                                                                    <span>Session Start</span>
                                                                                </div>
                                                                            }
                                                                            value={meetingDate}
                                                                            onChange={(val) => {
                                                                                setMeetingDate(val);
                                                                            }}
                                                                            disabled={shouldRestrictCoordination}
                                                                            dropUp={true}
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1 space-y-3 w-full">
                                                                        <PremiumDateTimePicker
                                                                            label={
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Pause size={12} className="text-[#0c2461]" />
                                                                                    <span>Session End</span>
                                                                                </div>
                                                                            }
                                                                            value={meetingEndDate}
                                                                            onChange={(val) => {
                                                                                setMeetingEndDate(val);
                                                                            }}
                                                                            minDate={meetingDate || undefined}
                                                                            disabled={shouldRestrictCoordination}
                                                                            dropUp={true}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>



                                                    <button
                                                        onClick={handleConfirmEndorse}
                                                        disabled={(!shouldRestrictCoordination && !meetingDate) || !activeAccount || isProcessing}
                                                        className="w-full py-4 bg-[#0c2461] hover:bg-[#0c2461]/90 text-white text-[12px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] border border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessing ? 'Processing Sequence...' : (
                                                            <>
                                                                <Globe size={14} />
                                                                Schedule for Interview
                                                            </>
                                                        )}
                                                    </button>


                                                    {(() => {
                                                        const isCandidateAlreadyPassed = ['PASSED', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'HIRED', 'FINAL_VERDICT', 'FOR_PAN', 'FOR PAN', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'HIRED_PROCESSED'].includes((applicant.current_status || '').toUpperCase()) || applicant.final_verdict === 'PASSED';
                                                        return isCandidateAlreadyPassed ? (
                                                            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                                                                <div className="flex items-center gap-3 text-left">
                                                                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                                                                    <div>
                                                                        <h5 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Ops Val Status: PASSED ({activeAccount || applicant.department})</h5>
                                                                        <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">Candidate has passed evaluation. You can reprofile them to a new account while retaining previous results.</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowReprofilePassedWarningModal(true)}
                                                                    disabled={isProcessing}
                                                                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-md shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 active:scale-95 border border-teal-700"
                                                                >
                                                                    <ArrowRightLeft size={14} /> Reprofile Candidate
                                                                </button>
                                                            </div>
                                                        ) : null;
                                                    })()}

                                                    <div className="flex gap-3 mt-3 w-full">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassModal(true)}
                                                            disabled={isProcessing || !activeAccount}
                                                            className="flex-1 py-4 bg-emerald-700 hover:bg-emerald-800 text-white text-[12px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] border border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <CheckCircle2 size={14} />
                                                            Final Interview Passed
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowFailModal(true)}
                                                            disabled={isProcessing || !activeAccount}
                                                            className="flex-1 py-4 bg-red-700 hover:bg-red-800 text-white text-[12px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] border border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <XCircle size={14} />
                                                            Final Interview Failed
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNoShowPrompt(!showNoShowPrompt)}
                                                        disabled={isProcessing || !activeAccount}
                                                        className="w-full mt-3 py-4 bg-slate-700 hover:bg-slate-800 text-white text-[12px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] border border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <XCircle size={14} />
                                                        Final Interview No Show
                                                    </button>

                                                    <AnimatePresence>
                                                        {showNoShowPrompt && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0, y: -10 }}
                                                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                                exit={{ opacity: 0, height: 0, y: -10 }}
                                                                className="space-y-1 mt-4 overflow-visible bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-sm shadow-sm"
                                                            >
                                                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Select No Show Category</p>
                                                                <div className="relative z-[70]">
                                                                    <button
                                                                        onClick={() => setNoShowDropdownOpen(!noShowDropdownOpen)}
                                                                        className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 border border-surface-200 rounded-sm hover:border-surface-300 transition-colors"
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
                                                                                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-sm shadow-lg border border-surface-100 overflow-hidden z-[100]"
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
                                                                <div className="pt-2 flex items-center gap-2 px-1 mb-4">
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
                                                                <div className="flex gap-3 mt-4">
                                                                    <button
                                                                        onClick={() => {
                                                                            handleNoShow();
                                                                            setShowNoShowPrompt(false);
                                                                        }}
                                                                        disabled={isProcessing}
                                                                        className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                                                    >
                                                                        Confirm No Show
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowNoShowPrompt(false)}
                                                                        className="px-6 py-3.5 bg-white dark:bg-slate-900 border border-surface-200 text-surface-600 font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-50"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {isSpecializedAccount && !isPendingLater && !isRecruiterS && (
                                                        <button
                                                            onClick={() => setShowScheduleLaterConfirm(true)}
                                                            disabled={isProcessing}
                                                            className="w-full py-2 bg-white dark:bg-slate-900 border border-surface-200 text-[#605e5c] dark:text-slate-400 hover:bg-[#f3f2f1] hover:text-[#323130] dark:text-slate-300 transition-all text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                                                            title="Defer scheduling and manage from your Scheduling Hub"
                                                        >
                                                            <Clock size={14} className="text-[#605e5c] dark:text-slate-400" />
                                                            Schedule Later
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {showOutlookConfirm && createPortal(
                                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
                                        <div className="bg-white dark:bg-slate-900 max-w-4xl w-full p-8 shadow-lg border border-surface-200 animate-in fade-in zoom-in duration-300 flex flex-col gap-6 my-8 text-left">
                                            {/* Header */}
                                            <div className="flex items-start justify-between border-b border-surface-200 pb-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#f3f2f1] border border-surface-200 rounded-sm flex items-center justify-center text-[#0c2461]">
                                                        <Globe size={24} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-widest block mb-1">Session Provisioned</span>
                                                        <h3 className="text-2xl font-bold text-[#323130] dark:text-slate-300 tracking-tight">Endorsement & Coordination Dashboard</h3>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Session Metadata Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="p-4 bg-[#f3f2f1] border border-surface-200">
                                                    <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block mb-1.5">Candidate</span>
                                                    <span className="text-sm font-bold text-[#323130] dark:text-slate-300 truncate block">{applicant.applicant_name}</span>
                                                </div>
                                                <div className="p-4 bg-[#f3f2f1] border border-surface-200">
                                                    <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block mb-1.5">Final Interview</span>
                                                    <span className="text-sm font-bold text-[#323130] dark:text-slate-300 truncate block">
                                                        {getValidatorForApplication(applicant)?.full_name || applicant.assigned_ops_validator_name || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="p-4 bg-[#f3f2f1] border border-surface-200">
                                                    <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block mb-1.5">Account Unit</span>
                                                    <span className="text-sm font-bold text-[#323130] dark:text-slate-300 truncate block uppercase">{activeAccount || 'General'}</span>
                                                </div>
                                                <div className="p-4 bg-[#f3f2f1] border border-surface-200">
                                                    <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block mb-1.5">Date & Time</span>
                                                    <span className="text-sm font-bold text-[#323130] dark:text-slate-300 truncate block">
                                                        {meetingDate ? formatDateWithWeekday(meetingDate) : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Endorsement Context Box with Copy Button */}
                                            <div className="space-y-2 relative">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Endorsement Context Message</label>
                                                    <button
                                                        onClick={handleCopy}
                                                        className={cn(
                                                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm",
                                                            isCopied
                                                                ? "bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]"
                                                                : "bg-[#f3f2f1] text-[#323130] dark:text-slate-300 hover:bg-[#edebe9] dark:bg-slate-800 border border-surface-200"
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
                                                    placeholder="Provide essential background for the Final Interview..."
                                                    className="w-full p-4 bg-white dark:bg-slate-900 border border-surface-200 text-[14px] font-mono whitespace-pre-wrap text-[#323130] dark:text-slate-300 h-64 resize-y focus:border-[#0c2461] outline-none transition-all focus:ring-1 focus:ring-[#0c2461] leading-relaxed shadow-sm rounded-sm"
                                                />
                                            </div>

                                            {/* Notice Alert */}
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm flex gap-3 text-left">
                                                <div className="shrink-0 text-amber-600 pt-0.5">
                                                    <Mail size={16} />
                                                </div>
                                                <div className="space-y-1">
                                                    <h5 className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">💡 Clipboard Auto-Load</h5>
                                                    <p className="text-[11px] text-amber-950 font-medium leading-relaxed">
                                                        To preserve beautiful paragraph formatting inside Outlook Web's calendar description, simply press <kbd className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-amber-200 shadow-sm font-bold">Ctrl + V</kbd> after launching Outlook!
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-surface-200">
                                                <button
                                                    onClick={() => completeEndorsement(true)}
                                                    className="flex-1 px-6 py-2 bg-[#242424] hover:bg-black text-white text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-all shadow-sm active:scale-95 border border-transparent cursor-pointer flex items-center justify-center gap-2"
                                                >
                                                    <Mail size={14} />
                                                    Sync with Outlook Calendar
                                                </button>
                                                <button
                                                    onClick={() => completeEndorsement(false)}
                                                    className="px-6 py-2 bg-white dark:bg-slate-900 border border-surface-200 text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                                                >
                                                    Complete & Close
                                                </button>
                                            </div>
                                        </div>
                                    </div>,
                                    document.body
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
                                    <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-lg text-center shadow-sm flex flex-col items-center">
                                        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-md">
                                            <CheckCircle2 size={28} className="text-white" />
                                        </div>
                                        <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Final Interview Status</p>
                                        <p className="text-2xl font-bold text-emerald-900 tracking-tight">Passed</p>
                                        <p className="text-[13px] text-emerald-700 font-medium mt-2">
                                            Candidate successfully cleared the final interview.
                                        </p>
                                        <div className="mt-6 flex items-center justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (window.confirm('Are you sure you want to edit the endorsement? This will reset the candidate to the Account Assignment phase.')) {
                                                        try {
                                                            await handleUpdateApplication(applicant.id, {
                                                                current_status: 'ACCOUNT_ASSIGNMENT',
                                                                metadata: {
                                                                    ...(applicant.metadata || {}),
                                                                    endorsement_confirmed: "false",
                                                                    ops_validator_status: null,
                                                                    final_interview_result: null,
                                                                    final_specific_status: null,
                                                                    assigned_ops_validator_ids: []
                                                                }
                                                            });
                                                        } catch (err) {
                                                            console.error('Failed to edit endorsement:', err);
                                                        }
                                                    }
                                                }}
                                                className="px-6 py-2.5 bg-white dark:bg-slate-900 text-emerald-700 hover:bg-emerald-50 text-[12px] font-extrabold uppercase tracking-wider rounded-md shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-emerald-200"
                                            >
                                                Edit Endorsement
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            if (rejected) {
                                return (
                                    <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center shadow-sm flex flex-col items-center">
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
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setIsProcessing(true);
                                                try {
                                                    const currentHistory = applicant.metadata?.reprofile_history || applicant.pis?.reprofile_history || [];
                                                    const newHistoryEntry = {
                                                        previous_account: activeAccount || applicant.department,
                                                        previous_ops_validator_name: applicant.assigned_ops_validator_name || (applicant.pis as any)?.ops_validator_name || 'System',
                                                        previous_ops_validator_email: applicant.pis?.ops_validator_email || applicant.metadata?.ops_validator_email,
                                                        previous_ops_validator_notes: applicant.final_interview_notes || applicant.pis?.ops_validator_notes || 'Failed initial account evaluation',
                                                        previous_ops_validator_status: 'FAILED',
                                                        changed_at: new Date().toISOString(),
                                                        status: 'FAILED_REPROFILED'
                                                    };
                                                    const updatedHistory = [...currentHistory, newHistoryEntry];

                                                    const patch: any = {
                                                        current_status: 'FOR_OPS_VAL_SCHEDULING',
                                                        master_column: 'MASTERLIST',
                                                        metadata: {
                                                            ...(applicant.metadata || {}),
                                                            is_reprofiled: true,
                                                            reprofile_history: updatedHistory,
                                                            failed_accounts: Array.from(new Set([...(applicant.metadata?.failed_accounts || []), activeAccount || applicant.department].filter(Boolean))),
                                                            ops_validator_status: null,
                                                            final_interview_result: null,
                                                            final_specific_status: null,
                                                            assigned_ops_validator_ids: [],
                                                            endorsement_confirmed: "false"
                                                        },
                                                        pis: {
                                                            ...(applicant.pis || {}),
                                                            reprofile_history: updatedHistory
                                                        }
                                                    };

                                                    await handleUpdateApplication(applicant.id, patch);
                                                    if (setModalTab) setModalTab('final');
                                                } catch (err) {
                                                    console.error('Failed to reprofile failed candidate:', err);
                                                } finally {
                                                    setIsProcessing(false);
                                                }
                                            }}
                                            disabled={isProcessing}
                                            className="mt-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-[12px] font-extrabold uppercase tracking-wider rounded-md shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-orange-700"
                                        >
                                            <ArrowRightLeft size={16} /> Reprofile Candidate
                                        </button>
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
                            return null;
                        })()}
                        {applicant.rejection_reason && (
                            <div className="p-8 bg-white dark:bg-slate-900 border border-red-100 rounded-lg text-left relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
                                <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mb-3">Post-Evaluation Note</p>
                                <p className="text-[14px] font-medium text-surface-700 leading-relaxed italic">"{applicant.rejection_reason}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Account Evaluation Tracking (Passed & Failed Accounts) */}
            <EndorsementHistoryView
                failedAccounts={failedAccounts}
                evaluationAttempts={getEvaluationAttempts(applicant, candidateApplications)}
            />

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

            <Modal
                open={showPassModal}
                onClose={() => {
                    setShowPassModal(false);
                    setPassAttachment(null);
                }}
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl ring-1 ring-emerald-500/20">
                            <CheckCircle2 className="text-emerald-600 shrink-0" size={22} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-surface-900 leading-tight">Mark Candidate as Passed</span>
                            <span className="text-[13px] text-surface-500 font-medium leading-tight mt-0.5">Final Interview (Final Interview)</span>
                        </div>
                    </div>
                }
                size="lg"
            >
                <div className="p-6 md:p-8">
                    <div className="mb-8 px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-4">
                        <div className="p-2 bg-emerald-100 rounded-full shrink-0 mt-0.5">
                            <AlertCircle className="text-emerald-700" size={16} strokeWidth={3} />
                        </div>
                        <p className="text-[14px] text-emerald-900 leading-relaxed font-medium">
                            You are about to finalize this candidate's evaluation and mark them as <span className="font-bold text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded">Passed</span>. This action will endorse them for the next stage.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Account Assignment</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsValidatorDropdownOpen(!isValidatorDropdownOpen)}
                                        className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:border-emerald-300 text-[13px] font-semibold text-surface-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all rounded-xl flex items-center justify-between"
                                    >
                                        {forceOpsValidatorAccount ? (
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const match = [...availableAccountsList.accountDepts, ...availableAccountsList.supportDepts].find(d => d.name === forceOpsValidatorAccount);
                                                    return match ? renderAccountLogo(match) : null;
                                                })()}
                                                <span>{forceOpsValidatorAccount}</span>
                                            </div>
                                        ) : (
                                            <span className="text-surface-400 font-medium">Select Account...</span>
                                        )}
                                        <ChevronDown size={16} className={cn("text-surface-400 transition-transform", isValidatorDropdownOpen && "rotate-180")} />
                                    </button>

                                    {isValidatorDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-h-[250px] overflow-y-auto z-50 custom-scrollbar overflow-hidden">
                                            <div className="p-1.5">
                                                <div className="px-3 py-2 text-[10px] font-extrabold text-surface-400 uppercase tracking-wider bg-surface-50/50 rounded-lg mb-1">Verification Accounts</div>
                                                {availableAccountsList.accountDepts.map(dept => (
                                                    <button
                                                        key={dept.id}
                                                        type="button"
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-surface-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg cursor-pointer text-left transition-colors"
                                                        onClick={() => {
                                                            setForceOpsValidatorAccount(dept.name);
                                                            setForceOpsValidatorLob('');
                                                            setForceOpsValidatorName('');
                                                            setIsValidatorDropdownOpen(false);
                                                        }}
                                                    >
                                                        {renderAccountLogo(dept)}
                                                        {dept.name}
                                                    </button>
                                                ))}

                                                {availableAccountsList.extraFromReal.length > 0 && (
                                                    <>
                                                        <div className="px-3 py-2 mt-2 text-[10px] font-extrabold text-surface-400 uppercase tracking-wider bg-surface-50/50 rounded-lg mb-1">Other Accounts</div>
                                                        {availableAccountsList.extraFromReal.map(acc => (
                                                            <button
                                                                key={acc}
                                                                type="button"
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-surface-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg cursor-pointer text-left transition-colors"
                                                                onClick={() => {
                                                                    setForceOpsValidatorAccount(acc);
                                                                    setForceOpsValidatorLob('');
                                                                    setForceOpsValidatorName('');
                                                                    setIsValidatorDropdownOpen(false);
                                                                }}
                                                            >
                                                                {acc}
                                                            </button>
                                                        ))}
                                                    </>
                                                )}

                                                {availableAccountsList.supportDepts.length > 0 && (
                                                    <>
                                                        <div className="px-3 py-2 mt-2 text-[10px] font-extrabold text-surface-400 uppercase tracking-wider bg-surface-50/50 rounded-lg mb-1">Support Hiring Roles</div>
                                                        {availableAccountsList.supportDepts.map(dept => (
                                                            <button
                                                                key={dept.id}
                                                                type="button"
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-surface-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg cursor-pointer text-left transition-colors"
                                                                onClick={() => {
                                                                    setForceOpsValidatorAccount(dept.name);
                                                                    setForceOpsValidatorLob('');
                                                                    setForceOpsValidatorName('');
                                                                    setIsValidatorDropdownOpen(false);
                                                                }}
                                                            >
                                                                {renderAccountLogo(dept)}
                                                                {dept.name}
                                                            </button>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Line of Business (LOB) / Job Position</label>
                                <select
                                    value={forceOpsValidatorLob}
                                    onChange={e => {
                                        setForceOpsValidatorLob(e.target.value);
                                        setForceOpsValidatorName('');
                                    }}
                                    disabled={!forceOpsValidatorAccount}
                                    className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:border-emerald-300 text-[13px] font-semibold text-surface-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                >
                                    <option value="" disabled>Select LOB...</option>
                                    {availableLobsList.map((lob: string) => (
                                        <option key={lob} value={lob}>{lob}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Operations Validator</label>
                                {availableOpsValidatorsList.length > 0 ? (
                                    <select
                                        value={forceOpsValidatorName}
                                        onChange={e => setForceOpsValidatorName(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:border-emerald-300 text-[13px] font-semibold text-surface-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all rounded-xl appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                    >
                                        <option value="" disabled>Select Validator...</option>
                                        {availableOpsValidatorsList.map((val: string) => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={forceOpsValidatorName}
                                        onChange={e => setForceOpsValidatorName(e.target.value)}
                                        disabled={!forceOpsValidatorLob}
                                        placeholder="Enter validator name..."
                                        className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:border-emerald-300 text-[13px] font-semibold text-surface-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 flex flex-col h-full">
                            <div className="space-y-2 flex-grow flex flex-col">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">{remarksLabelText}</label>
                                <textarea
                                    value={forceOpsValidatorRemarks}
                                    onChange={e => setForceOpsValidatorRemarks(e.target.value)}
                                    placeholder="Enter detailed remarks, notes, or special questions here..."
                                    className="w-full px-4 py-3 flex-grow min-h-[140px] bg-surface-50 border border-surface-200 hover:border-emerald-300 text-[13px] font-medium text-surface-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all rounded-xl custom-scrollbar resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>Attachment</span>
                                    <span className="text-[9px] font-extrabold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-md">OPTIONAL</span>
                                </label>
                                <div
                                    className={cn(
                                        "relative overflow-hidden group border-2 border-dashed rounded-xl p-5 transition-all duration-300 cursor-pointer",
                                        passAttachment
                                            ? "border-emerald-400 bg-emerald-50/80"
                                            : "border-surface-200 bg-surface-50 hover:bg-emerald-50/50 hover:border-emerald-300"
                                    )}
                                    onClick={() => passFileInputRef.current?.click()}
                                >
                                    <div className="flex flex-col items-center justify-center gap-2 relative z-10">
                                        <div className={cn(
                                            "p-2.5 rounded-full transition-all duration-300",
                                            passAttachment ? "bg-emerald-100 text-emerald-600 scale-90" : "bg-white shadow-sm ring-1 ring-surface-900/5 text-surface-400 group-hover:text-emerald-500 group-hover:scale-110"
                                        )}>
                                            <Upload strokeWidth={2.5} size={18} />
                                        </div>
                                        {uploadProgress !== null ? (
                                            <div className="w-full max-w-[200px] mt-2">
                                                <div className="flex justify-between text-[10px] font-bold text-emerald-700 mb-1.5 uppercase tracking-wider">
                                                    <span>Uploading...</span>
                                                    <span>{uploadProgress}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 transition-all duration-200 ease-out"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : passAttachment ? (
                                            <div className="text-center mt-1">
                                                <p className="text-[13px] font-bold text-emerald-800 truncate max-w-[200px] mx-auto">{passAttachment.name}</p>
                                                <p className="text-[11px] font-semibold text-emerald-600/70 mt-1 uppercase tracking-wider">Click to replace</p>
                                            </div>
                                        ) : (
                                            <div className="text-center mt-1">
                                                <p className="text-[13px] font-bold text-surface-700 group-hover:text-emerald-700 transition-colors">Upload evidence</p>
                                                <p className="text-[11px] font-medium text-surface-500 mt-1">Screenshot or results file</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={passFileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                const file = e.target.files[0];
                                                setUploadProgress(0);
                                                const interval = setInterval(() => {
                                                    setUploadProgress(prev => {
                                                        if (prev !== null && prev >= 100) {
                                                            clearInterval(interval);
                                                            setPassAttachment(file);
                                                            setUploadProgress(null);
                                                            return null;
                                                        }
                                                        return (prev !== null ? prev : 0) + 10;
                                                    });
                                                }, 80);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-surface-100">
                        <button
                            onClick={() => {
                                setShowPassModal(false);
                                setPassAttachment(null);
                            }}
                            className="px-6 py-3 text-[13px] font-bold text-surface-600 bg-surface-100 hover:bg-surface-200 active:bg-surface-300 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setShowPassModal(false);
                                handleForcePass();
                            }}
                            className="px-8 py-3 text-[13px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <CheckCircle2 size={18} strokeWidth={2.5} />
                            Confirm for Job Offer
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={showFailModal}
                onClose={() => setShowFailModal(false)}
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-50 rounded-xl ring-1 ring-red-500/20">
                            <XCircle className="text-red-600 shrink-0" size={22} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-surface-900 leading-tight">Mark Candidate as Failed</span>
                            <span className="text-[13px] text-surface-500 font-medium leading-tight mt-0.5">Final Interview (Final Interview)</span>
                        </div>
                    </div>
                }
                size="lg"
            >
                <div className="p-6 md:p-8">
                    <div className="mb-8 px-5 py-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-4">
                        <div className="p-2 bg-red-100 rounded-full shrink-0 mt-0.5">
                            <AlertCircle className="text-red-700" size={16} strokeWidth={3} />
                        </div>
                        <p className="text-[14px] text-red-900 leading-relaxed font-medium">
                            You are about to finalize this candidate's evaluation and mark them as <span className="font-bold text-red-700 bg-red-100/50 px-1.5 py-0.5 rounded">Failed</span>. This will stop their application process.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Account Assignment</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsValidatorDropdownOpen(!isValidatorDropdownOpen)}
                                        className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:border-red-300 text-[13px] font-semibold text-surface-900 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all rounded-xl flex items-center justify-between"
                                    >
                                        {forceOpsValidatorAccount ? (
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const match = [...availableAccountsList.accountDepts, ...availableAccountsList.supportDepts].find(d => d.name === forceOpsValidatorAccount);
                                                    return match ? renderAccountLogo(match) : null;
                                                })()}
                                                <span>{forceOpsValidatorAccount}</span>
                                            </div>
                                        ) : (
                                            <span className="text-surface-400 font-medium">Select Account...</span>
                                        )}
                                        <ChevronDown size={16} className={cn("text-surface-400 transition-transform", isValidatorDropdownOpen && "rotate-180")} />
                                    </button>

                                    {isValidatorDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-h-[250px] overflow-y-auto z-50 custom-scrollbar overflow-hidden">
                                            <div className="p-1.5">
                                                <div className="px-3 py-2 text-[10px] font-extrabold text-surface-400 uppercase tracking-wider bg-surface-50/50 rounded-lg mb-1">Verification Accounts</div>
                                                {availableAccountsList.accountDepts.map(dept => (
                                                    <button
                                                        key={dept.id}
                                                        type="button"
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-surface-700 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer text-left transition-colors"
                                                        onClick={() => {
                                                            setForceOpsValidatorAccount(dept.name);
                                                            setForceOpsValidatorLob('');
                                                            setForceOpsValidatorName('');
                                                            setIsValidatorDropdownOpen(false);
                                                        }}
                                                    >
                                                        {renderAccountLogo(dept)}
                                                        {dept.name}
                                                    </button>
                                                ))}

                                                {availableAccountsList.extraFromReal.length > 0 && (
                                                    <>
                                                        <div className="px-3 py-2 mt-2 text-[10px] font-extrabold text-surface-400 uppercase tracking-wider bg-surface-50/50 rounded-lg mb-1">Other Accounts</div>
                                                        {availableAccountsList.extraFromReal.map(acc => (
                                                            <button
                                                                key={acc}
                                                                type="button"
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-surface-700 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer text-left transition-colors"
                                                                onClick={() => {
                                                                    setForceOpsValidatorAccount(acc);
                                                                    setForceOpsValidatorLob('');
                                                                    setForceOpsValidatorName('');
                                                                    setIsValidatorDropdownOpen(false);
                                                                }}
                                                            >
                                                                {acc}
                                                            </button>
                                                        ))}
                                                    </>
                                                )}

                                                {availableAccountsList.supportDepts.length > 0 && (
                                                    <>
                                                        <div className="px-3 py-2 mt-2 text-[10px] font-extrabold text-surface-400 uppercase tracking-wider bg-surface-50/50 rounded-lg mb-1">Support Hiring Roles</div>
                                                        {availableAccountsList.supportDepts.map(dept => (
                                                            <button
                                                                key={dept.id}
                                                                type="button"
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-surface-700 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer text-left transition-colors"
                                                                onClick={() => {
                                                                    setForceOpsValidatorAccount(dept.name);
                                                                    setForceOpsValidatorLob('');
                                                                    setForceOpsValidatorName('');
                                                                    setIsValidatorDropdownOpen(false);
                                                                }}
                                                            >
                                                                {renderAccountLogo(dept)}
                                                                {dept.name}
                                                            </button>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Line of Business (LOB) / Job Position</label>
                                <select
                                    value={forceOpsValidatorLob}
                                    onChange={e => {
                                        setForceOpsValidatorLob(e.target.value);
                                        setForceOpsValidatorName('');
                                    }}
                                    disabled={!forceOpsValidatorAccount}
                                    className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:border-red-300 text-[13px] font-semibold text-surface-900 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                >
                                    <option value="" disabled>Select LOB...</option>
                                    {availableLobsList.map((lob: string) => (
                                        <option key={lob} value={lob}>{lob}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">Operations Validator</label>
                                {availableOpsValidatorsList.length > 0 ? (
                                    <select
                                        value={forceOpsValidatorName}
                                        onChange={e => setForceOpsValidatorName(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:border-red-300 text-[13px] font-semibold text-surface-900 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all rounded-xl appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                    >
                                        <option value="" disabled>Select Validator...</option>
                                        {availableOpsValidatorsList.map((val: string) => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={forceOpsValidatorName}
                                        onChange={e => setForceOpsValidatorName(e.target.value)}
                                        disabled={!forceOpsValidatorLob}
                                        placeholder="Enter validator name..."
                                        className="w-full px-4 py-3 bg-surface-50 border border-surface-200 hover:border-red-300 text-[13px] font-semibold text-surface-900 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 flex flex-col h-full">
                            <div className="space-y-2 flex-grow flex flex-col">
                                <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">{remarksLabelText}</label>
                                <textarea
                                    value={forceOpsValidatorRemarks}
                                    onChange={e => setForceOpsValidatorRemarks(e.target.value)}
                                    placeholder="Enter detailed failure remarks..."
                                    className="w-full px-4 py-3 flex-grow min-h-[140px] bg-surface-50 border border-surface-200 hover:border-red-300 text-[13px] font-medium text-surface-900 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all rounded-xl custom-scrollbar resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-surface-100">
                        <button
                            onClick={() => setShowFailModal(false)}
                            className="px-6 py-3 text-[13px] font-bold text-surface-600 bg-surface-100 hover:bg-surface-200 active:bg-surface-300 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setShowFailModal(false);
                                handleForceFail();
                            }}
                            className="px-8 py-3 text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <XCircle size={18} strokeWidth={2.5} />
                            Confirm Failure
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reprofile Passed Candidate Warning Modal */}
            {showReprofilePassedWarningModal && (
                <ConfirmDialog
                    open={showReprofilePassedWarningModal}
                    title="Reprofile Candidate (Passed Account Warning)"
                    confirmText="Proceed for Reprofile"
                    confirmClass="bg-teal-600 hover:bg-teal-700 text-white font-bold"
                    onConfirm={async () => {
                        setShowReprofilePassedWarningModal(false);
                        setIsProcessing(true);
                        showLoading('Initiating reprofile workflow...');
                        try {
                            const currentHistory = applicant.metadata?.reprofile_history || applicant.pis?.reprofile_history || [];
                            const newHistoryEntry = {
                                previous_account: activeAccount || applicant.department,
                                previous_ops_validator_name: applicant.assigned_ops_validator_name || (applicant.pis as any)?.ops_validator_name || 'System',
                                previous_ops_validator_email: applicant.pis?.ops_validator_email || applicant.metadata?.ops_validator_email,
                                previous_ops_validator_notes: applicant.final_interview_notes || applicant.pis?.ops_validator_notes || 'Passed initial account evaluation',
                                previous_ops_validator_status: 'PASSED',
                                changed_at: new Date().toISOString(),
                                status: 'PASSED_REPROFILED'
                            };
                            const updatedHistory = [...currentHistory, newHistoryEntry];

                            const patch: any = {
                                current_status: 'FOR_OPS_VAL_SCHEDULING',
                                master_column: 'MASTERLIST',
                                metadata: {
                                    ...(applicant.metadata || {}),
                                    is_reprofiled: true,
                                    reprofile_history: updatedHistory,
                                    initial_account_assignment: applicant.metadata?.initial_account_assignment || activeAccount || applicant.department,
                                    ops_validator_status: null,
                                    final_interview_result: null,
                                    final_specific_status: null,
                                    assigned_ops_validator_ids: [],
                                    endorsement_confirmed: "false"
                                },
                                pis: {
                                    ...(applicant.pis || {}),
                                    reprofile_history: updatedHistory,
                                    initial_account_assignment: applicant.pis?.initial_account_assignment || activeAccount || applicant.department
                                }
                            };

                            await handleUpdateApplication(applicant.id, patch);
                            if (setModalTab) setModalTab('final');
                        } catch (err) {
                            console.error('Failed to reprofile passed candidate:', err);
                        } finally {
                            setIsProcessing(false);
                            hideLoading();
                        }
                    }}
                    onClose={() => setShowReprofilePassedWarningModal(false)}
                >
                    <div className="space-y-3 py-2 text-left">
                        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-semibold leading-relaxed flex items-start gap-3">
                            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-black uppercase tracking-wider block text-amber-950 mb-1">Candidate Already Passed</span>
                                Candidate <span className="font-bold text-slate-900 dark:text-white">{applicant.applicant_name}</span> has already passed evaluation for <span className="font-bold text-slate-900 dark:text-white">{activeAccount || applicant.department}</span>.
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-normal">
                            Are you sure you want to proceed for reprofile? The candidate's previous account results, evaluation attempts, and notes will be strictly retained in their profile history.
                        </p>
                    </div>
                </ConfirmDialog>
            )}
        </div>
    );
};

