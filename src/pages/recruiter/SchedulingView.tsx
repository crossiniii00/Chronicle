import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Search, Clock,
    User, Building2, Loader2,
    CalendarCheck, AlertCircle, CheckCircle2,
    Send, ExternalLink, Target, Users, Mail,
    Info, ChevronRight, Globe, FileText, Trash2, Edit3, ArrowRightLeft, XCircle, Check, X, Eye, EyeOff
} from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { UserService } from '@/services/UserService';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { REAL_ACCOUNTS } from '@/pages/recruiter/mhrt/constants/accountConstants';
import { useAuthStore } from '@/store/authStore';
import { Application, ApplicationStatus } from '@/types/application';
import type { User as UserType } from '@/types/user';
import { cn } from '@/utils/formatters';
import { useToast } from '@/components/common/useToast';
import { DetailModalPortal } from '@/components/common/DetailModalPortal';
import { RequestDetailModalPortal } from '@/components/common/RequestDetailModalPortal';
import { apiClient } from '@/utils/apiClient';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';
import { ResumeManagerModal } from '@/components/features/ApplicantManagement/ResumeManagerModal';
import { DateFilterState, AdvancedDateFilter } from '@/components/common/AdvancedDateFilter';
import { ConfirmDialog } from '@/components/common/Modal';
type ModalTab = 'application' | 'typing' | 'initial' | 'assessment' | 'assessment_ii' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';

const getNoShowAndPassedStatus = (app: Application) => {
    const specStatus = String((app.pis as any)?.final_specific_status || app.metadata?.final_specific_status || '').toLowerCase();
    const ovStatus = String((app.pis as any)?.ops_validator_status || app.metadata?.ops_validator_status || (app as any).ops_validator_status || '').toUpperCase();

    const isOVNoShowText = specStatus.includes('ov - no show') ||
        specStatus.includes('operations validator - no show') ||
        specStatus.includes('final interviewer - no show') ||
        specStatus.includes('final interview - no show') ||
        specStatus.includes('no show final interview') ||
        specStatus.includes('no_show') ||
        specStatus.includes('no show');
    const isOVNoShowStatus = ovStatus === 'NO_SHOW' || ovStatus === 'NO SHOW';
    const isLegacyOVNoShow = app.current_status === 'NO_SHOW' || app.current_status === 'NO SHOW';

    const isNoShowStatus = isOVNoShowText || isOVNoShowStatus || isLegacyOVNoShow;

    const effectiveStatus = (app.master_status && app.master_status.toUpperCase() !== 'OPEN' ? app.master_status : app.current_status) || '';
    const rawPassed = ['PASSED', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'HIRED', 'FINAL_VERDICT', 'FOR_PAN', 'FOR PAN', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'HIRED_PROCESSED', 'PAN_COMPLETED', 'PAN COMPLETED'].includes(effectiveStatus.toUpperCase());

    const isPassedStatus = !isNoShowStatus && rawPassed;

    return { isNoShowStatus, isPassedStatus };
};

const isReprofileApp = (app: Application) => {
    const { isNoShowStatus, isPassedStatus } = getNoShowAndPassedStatus(app);
    if (isNoShowStatus || isPassedStatus) return false;

    const history = app.pis?.reprofile_history || app.metadata?.reprofile_history || [];
    const hasHistory = Array.isArray(history) && history.length > 0;
    const hasReprofileFlag = app.metadata?.is_reprofiled === true || app.metadata?.is_reprofiled === 'true' || (app as any).is_reprofiled === true || (app as any).is_reprofiled === 'true';
    const failedAccounts = app.metadata?.failed_accounts || (app.pis as any)?.failed_accounts || [];
    const hasFailedAccounts = Array.isArray(failedAccounts) && failedAccounts.length > 0;

    const reprofileAccounts = app.metadata?.reprofile_accounts || (app.pis as any)?.reprofile_accounts || [];
    const hasPendingReprofileAcc = Array.isArray(reprofileAccounts) && reprofileAccounts.some((a: any) => a.status === 'PENDING' || a.status === 'ACTIVE' || a.status === 'REPROFILE');

    return hasHistory || hasReprofileFlag || hasFailedAccounts || hasPendingReprofileAcc;
};


export function SchedulingView() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [resumeManagerApp, setResumeManagerApp] = useState<Application | null>(null);
    const [search, setSearch] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
    const [accountDropdownSearch, setAccountDropdownSearch] = useState('');
    const accountDropdownRef = useRef<HTMLDivElement>(null);

    const [selectedLob, setSelectedLob] = useState('');
    const [isLobDropdownOpen, setIsLobDropdownOpen] = useState(false);
    const [lobDropdownSearch, setLobDropdownSearch] = useState('');
    const lobDropdownRef = useRef<HTMLDivElement>(null);

    const [selectedEndorser, setSelectedEndorser] = useState('');
    const [isEndorserDropdownOpen, setIsEndorserDropdownOpen] = useState(false);
    const [endorserDropdownSearch, setEndorserDropdownSearch] = useState('');
    const endorserDropdownRef = useRef<HTMLDivElement>(null);

    const [selectedScheduler, setSelectedScheduler] = useState('');
    const [isSchedulerDropdownOpen, setIsSchedulerDropdownOpen] = useState(false);
    const [schedulerDropdownSearch, setSchedulerDropdownSearch] = useState('');
    const schedulerDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
                setIsAccountDropdownOpen(false);
            }
            if (lobDropdownRef.current && !lobDropdownRef.current.contains(event.target as Node)) {
                setIsLobDropdownOpen(false);
            }
            if (endorserDropdownRef.current && !endorserDropdownRef.current.contains(event.target as Node)) {
                setIsEndorserDropdownOpen(false);
            }
            if (schedulerDropdownRef.current && !schedulerDropdownRef.current.contains(event.target as Node)) {
                setIsSchedulerDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const accountOptions = useMemo(() => {
        // Collect all sub-account names so we can exclude them from the top-level list
        const subAccountNames = new Set<string>();
        departments.forEach(d => {
            const subs = d.subAccounts || (d as any).sub_accounts || [];
            subs.forEach((sub: any) => {
                const name = typeof sub === 'string' ? sub : sub.name;
                if (name) subAccountNames.add(name.toLowerCase());
            });
        });

        const list: string[] = [];
        departments.forEach(d => {
            if (d.type === 'SUPPORT_ROLES') return;
            // Skip departments whose name matches a sub-account of another department
            if (subAccountNames.has(d.name.toLowerCase())) return;
            if (!list.includes(d.name)) {
                list.push(d.name);
            }
        });
        return list.sort((a, b) => a.localeCompare(b));
    }, [departments]);

    const filteredAccountOptions = useMemo(() => {
        return accountOptions.filter(opt =>
            opt.toLowerCase().includes(accountDropdownSearch.toLowerCase())
        );
    }, [accountOptions, accountDropdownSearch]);

    const lobOptions = useMemo(() => {
        if (selectedAccount) {
            const dept = departments.find(d => d.name === selectedAccount);
            if (!dept) return [];
            const subs = dept.subAccounts || (dept as any).sub_accounts || [];
            return subs.map((sub: any) => typeof sub === 'string' ? sub : sub.name).filter(Boolean);
        } else {
            const list: string[] = [];
            departments.forEach(d => {
                if (d.type === 'SUPPORT_ROLES') return;
                const subs = d.subAccounts || (d as any).sub_accounts || [];
                subs.forEach((sub: any) => {
                    const name = typeof sub === 'string' ? sub : sub.name;
                    if (name && !list.includes(name)) list.push(name);
                });
            });
            return list.sort();
        }
    }, [departments, selectedAccount]);

    const filteredLobOptions = useMemo(() => {
        return lobOptions.filter((opt: string) =>
            opt.toLowerCase().includes(lobDropdownSearch.toLowerCase())
        );
    }, [lobOptions, lobDropdownSearch]);

    const endorserOptions = useMemo(() => {
        const names = new Set<string>();
        applications.forEach(app => {
            if (app.assigned_recruiter_name) names.add(app.assigned_recruiter_name);
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [applications]);

    const filteredEndorserOptions = useMemo(() => {
        return endorserOptions.filter((name: string) =>
            name.toLowerCase().includes(endorserDropdownSearch.toLowerCase())
        );
    }, [endorserOptions, endorserDropdownSearch]);

    const getActiveScheduler = (app: Application) => {
        const activeDepts = (app.department || '').split(',').map(s => s.trim()).filter(Boolean);
        const failedAccounts = app.metadata?.failed_accounts || [];
        const remainingAccounts = activeDepts.filter(d => !failedAccounts.some((f: string) => (f || '').toLowerCase() === (d || '').toLowerCase()));

        let activeAccount = '';
        if (isReprofileApp(app) && app.metadata?.reprofile_accounts?.[0]) {
            activeAccount = app.metadata.reprofile_accounts[0].account || '';
        } else {
            activeAccount = remainingAccounts[0] || app.department || '';
        }

        const accountSchedules = app.metadata?.account_schedules || {};

        for (const [key, scheduler] of Object.entries(accountSchedules)) {
            const k = (key || '').toLowerCase();
            const act = (activeAccount || '').toLowerCase();
            if (k && act && (k === act || act.includes(k) || k.includes(act))) {
                return scheduler as string;
            }
        }

        return app.scheduled_by || '';
    };

    const schedulerOptions = useMemo(() => {
        const names = new Set<string>();
        applications.forEach(app => {
            const currentScheduler = getActiveScheduler(app);
            if (currentScheduler) {
                const hasMeetingDate = !!app.endorsement_meeting_date;
                const effectiveStatus = (app.master_status && app.master_status.toUpperCase() !== 'OPEN' ? app.master_status : app.current_status) || '';
                const isFinished = ['PASSED', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'HIRED', 'FINAL_VERDICT', 'FOR_PAN', 'FOR PAN', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'HIRED_PROCESSED', 'REJECTED', 'FAILED'].includes(effectiveStatus.toUpperCase());
                const isFullyScheduled = hasMeetingDate || isFinished || app.current_status === 'REPROFILE_FINAL_INTERVIEW';
                if (isFullyScheduled) {
                    names.add(currentScheduler);
                }
            }
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [applications]);

    const filteredSchedulerOptions = useMemo(() => {
        return schedulerOptions.filter((name: string) =>
            name.toLowerCase().includes(schedulerDropdownSearch.toLowerCase())
        );
    }, [schedulerOptions, schedulerDropdownSearch]);

    const [dateFilter, setDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [dateTargetFilter, setDateTargetFilter] = useState<'ALL' | 'SCHEDULED' | 'ENDORSED' | 'CONCLUDED'>('SCHEDULED');
    const [resultsStatusFilter, setResultsStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED' | 'NO_SHOW'>('ALL');
    const [activeTab, setActiveTab] = useState<'REPROFILE' | 'REQUESTS' | 'PENDING' | 'ACTIVE' | 'RESULTS' | 'NO_SHOW' | 'CLIENT_INTERVIEW'>('PENDING');
    const [focusedApplicant, setFocusedApplicant] = useState<Application | null>(null);
    const [pisApplicant, setPisApplicant] = useState<Application | null>(null);
    const [rescheduleModalApp, setRescheduleModalApp] = useState<Application | null>(null);
    const [modalTab, setModalTab] = useState<ModalTab>('application');
    const [validators, setValidators] = useState<UserType[]>([]);
    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [editingApp, setEditingApp] = useState<Application | null>(null);
    const [editDepts, setEditDepts] = useState<string[]>([]);
    const [editEndorser, setEditEndorser] = useState('');
    const [editName, setEditName] = useState('');
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [appToDelete, setAppToDelete] = useState<Application | null>(null);
    const [warningTargetApp, setWarningTargetApp] = useState<Application | null>(null);

    const [clientAssessmentScore, setClientAssessmentScore] = useState("");
    const [clientInterviewRemarks, setClientInterviewRemarks] = useState("");

    const [editingOpsValidatorAppId, setEditingOpsValidatorAppId] = useState<string | null>(null);
    const [selectedOpsValidator, setSelectedOpsValidator] = useState<string>('');
    const [finalInterviewNotes, setFinalInterviewNotes] = useState("");
    const [assessmentScore, setAssessmentScore] = useState("");

    const toast = useToast();
    const { user, isAccountFilterEnabled } = useAuthStore();
    const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'superadmin' || user?.role === 'ops_val_admin';
    const [isExclusiveMode, setIsExclusiveMode] = useState(false);
    const navigate = useNavigate();
    const { getReroutedAccounts } = useAccountTypeSettings();
    const reroutedAccounts = getReroutedAccounts();



    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [allApps, allUsers, allDeps] = await Promise.all([
                ApplicationService.getAll(),
                UserService.getAll(),
                DepartmentService.getAll()
            ]);
            // Filter candidates that are either:
            // 1. Explicitly endorsed to recruiter S
            // 2. Marked as FINAL_INTERVIEW_SCHEDULED but in PENDING/SCHEDULED status
            const candidates = allApps.filter(app => {
                const depts = (app.department || '').split(',').map(s => String(s || '').trim().toLowerCase()).filter(Boolean);
                const failedAccounts = (app.metadata?.failed_accounts || []).map((f: any) => String(f || '').trim().toLowerCase()).filter(Boolean);
                const remainingAccounts = depts.filter(d => !failedAccounts.includes(d));
                const { isNoShowStatus, isPassedStatus } = getNoShowAndPassedStatus(app);
                const isFailedAllAccounts = ['REJECTED', 'FAILED'].includes((app.current_status || '').toUpperCase()) && remainingAccounts.length === 0 && failedAccounts.length > 0;
                const hasFinalResult = isPassedStatus || isFailedAllAccounts || isNoShowStatus;

                return app.endorsed_to_recruiter_s === true ||
                    (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && app.recruiter_s_scheduling_status) ||
                    ['ENDORSED', 'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'ENDORSEMENT'].includes(app.current_status || '') ||
                    (app.current_status === 'FINAL_INTERVIEW' && app.department) ||
                    ((app.current_status === 'REJECTED' || app.current_status === 'FAILED') && failedAccounts.length > 0 && remainingAccounts.length > 0) ||
                    hasFinalResult ||
                    isReprofileApp(app);
            });

            const uniqueMap = new Map();
            candidates.forEach(app => {
                const key = String(app.applicant_email || app.applicant_name || app.id || '').trim().toLowerCase();
                const existing = uniqueMap.get(key);
                if (!existing || new Date(app.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
                    uniqueMap.set(key, app);
                }
            });
            setApplications(Array.from(uniqueMap.values()));
            setAllUsers(allUsers);
            setValidators(allUsers.filter(user => user.role === 'ops_validator'));
            setDepartments(allDeps);
        } catch (error) {
            console.error("Failed to load candidates for scheduling:", error);
            toast.error('Sync Error', 'Failed to retrieve scheduling registry.');
        } finally {
            if (!silent) setLoading(false);
        }
    };

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
        const assignedId = (app.assigned_ops_validator_id || '').trim();
        const assignedName = (app.assigned_ops_validator_name || '').trim().toLowerCase();

        return validators.find(validator => validator.id === assignedId)
            || validators.find(validator => (validator?.full_name || '').trim().toLowerCase() === assignedName);
    };

    const getValidatorEmail = (app: Application) => {
        return getValidatorForApplication(app)?.email || app.pis?.ops_validator_email || '';
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredList = useMemo(() => {
        const list = applications.filter(app => {
            const isHiddenRecord = app.is_hidden === true || (app.is_hidden as any) === 1 || String(app.is_hidden).toLowerCase() === 'true' || String(app.is_hidden) === '1';
            if (isExclusiveMode && !isHiddenRecord) return false;
            if (!isExclusiveMode && isHiddenRecord) return false;

            const nameLower = (app.applicant_name || '').toLowerCase();
            const emailLower = (app.applicant_email || '').toLowerCase();
            const deptLower = (app.department || '').toLowerCase();
            const searchLower = (search || '').toLowerCase();

            const matchesSearch = nameLower.includes(searchLower) ||
                emailLower.includes(searchLower) ||
                deptLower.includes(searchLower);

            const depts = (app.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const failedAccounts = app.metadata?.failed_accounts || [];
            const remainingAccounts = depts.filter(d => !failedAccounts.some((f: string) => (f || '').trim().toLowerCase() === d));

            // If no accounts are remaining (i.e. all failed) and we are not in RESULTS, don't show
            if (remainingAccounts.length === 0 && !isReprofileApp(app) && activeTab !== 'RESULTS') return false;



            if (selectedAccount) {
                const deptObj = departments.find(d => d.name === selectedAccount);
                const subNames = deptObj ? (deptObj.subAccounts || (deptObj as any).sub_accounts || []).map((sub: any) => (typeof sub === 'string' ? sub : sub.name).toLowerCase()) : [];
                const allowedNames = [selectedAccount.toLowerCase(), ...subNames];
                const hasMatch = depts.some(d => allowedNames.some(allowed => d.includes(allowed) || allowed.includes(d)));
                if (!hasMatch) return false;
            }

            if (selectedLob) {
                const lobLower = selectedLob.toLowerCase();
                const hasMatch = depts.some(d => d.includes(lobLower) || lobLower.includes(d));
                if (!hasMatch) return false;
            }

            if (selectedEndorser) {
                if ((app.assigned_recruiter_name || '') !== selectedEndorser) return false;
            }



            const { isNoShowStatus, isPassedStatus } = getNoShowAndPassedStatus(app);
            const isHistoricalFinalFail = ['REJECTED', 'FAILED'].includes((app.current_status || '').toUpperCase()) && (app.pis?.final_interview_result === 'FAILED' || app.pis?.ops_validator_status === 'FAILED' || app.metadata?.final_interview_result === 'FAILED' || app.metadata?.ops_validator_status === 'FAILED' || (app.pis as any)?.client_interview_result === 'FAILED' || app.metadata?.client_interview_result === 'FAILED');
            const isFailedAllAccounts = (['REJECTED', 'FAILED'].includes((app.current_status || '').toUpperCase()) && remainingAccounts.length === 0 && failedAccounts.length > 0) || isHistoricalFinalFail;
            const deptsUpper = (app.department || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            const isAutoApprove = deptsUpper.includes('AUTO APPROVE');
            const hasFinalResult = isPassedStatus || isFailedAllAccounts || isNoShowStatus;

            const isFullyScheduled = !!app.endorsement_meeting_date || hasFinalResult || app.current_status === 'REPROFILE_FINAL_INTERVIEW';
            const currentScheduler = getActiveScheduler(app);
            if (selectedScheduler) {
                if ((currentScheduler || '') !== selectedScheduler || !isFullyScheduled) return false;
            }

            if (dateFilter.type !== 'ALL' && dateFilter.start && dateFilter.end) {
                let targetDateStrs: (string | null | undefined)[] = [];
                if (dateTargetFilter === 'ALL') {
                    targetDateStrs = [
                        (app.pis as any)?.interview_completed_at || app.interview_completed_at,
                        app.metadata?.date_endorsed_to_over || app.updated_at,
                        app.endorsement_meeting_date
                    ];
                } else if (dateTargetFilter === 'CONCLUDED') {
                    targetDateStrs = [(app.pis as any)?.interview_completed_at || app.interview_completed_at];
                } else if (dateTargetFilter === 'ENDORSED') {
                    targetDateStrs = [app.metadata?.date_endorsed_to_over || app.updated_at];
                } else {
                    targetDateStrs = [app.endorsement_meeting_date];
                }

                const hasValidDate = targetDateStrs.some(targetDateStr => {
                    if (!targetDateStr) return false;
                    const localDate = new Date(targetDateStr);
                    if (isNaN(localDate.getTime())) return false;
                    const y = localDate.getFullYear();
                    const m = String(localDate.getMonth() + 1).padStart(2, '0');
                    const d = String(localDate.getDate()).padStart(2, '0');
                    const iso = `${y}-${m}-${d}`;
                    return iso >= dateFilter.start! && iso <= dateFilter.end!;
                });

                if (!hasValidDate) return false;
            }

            const isReprofileCandidate = isReprofileApp(app);
            const isRescheduleRequest = app.pis?.final_specific_status === 'OV - Reschedule' && !isReprofileCandidate;
            const hasMeetingDate = !!app.endorsement_meeting_date;

            const isClientInterview = !hasFinalResult && ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_CLIENT_INTERVIEW'].includes(app.current_status || '');

            const isScheduledStatus = !hasFinalResult && !isClientInterview &&
                (app.current_status !== 'REJECTED' && app.current_status !== 'FAILED' || isReprofileCandidate) &&
                (app.recruiter_s_scheduling_status === 'SCHEDULED' ||
                    (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && hasMeetingDate) ||
                    app.current_status === 'REPROFILE_FINAL_INTERVIEW' ||
                    ['ENDORSEMENT'].includes(app.current_status || ''));
            const isPendingStatus = !hasFinalResult && !isScheduledStatus && !isClientInterview && (
                ((app.current_status !== 'REJECTED' && app.current_status !== 'FAILED') && (app.recruiter_s_scheduling_status === 'PENDING' || app.recruiter_s_scheduling_status === 'RECEIVED')) ||
                app.current_status === 'FINAL_INTERVIEW' ||
                (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && !hasMeetingDate) ||
                ((app.current_status === 'REJECTED' || app.current_status === 'FAILED') && failedAccounts.length > 0 && remainingAccounts.length > 0)
            );

            const isReprofile = isReprofileCandidate && !hasFinalResult && remainingAccounts.length > 0 && !isScheduledStatus && !isClientInterview;
            const isActive = isScheduledStatus && !isRescheduleRequest && !isReprofile && !isClientInterview;
            const isPending = isPendingStatus && !isRescheduleRequest && !isReprofile && !isClientInterview;
            const isResults = hasFinalResult && !isNoShowStatus;

            if (activeTab === 'RESULTS' && resultsStatusFilter !== 'ALL') {
                if (resultsStatusFilter === 'PASSED' && !isPassedStatus) return false;
                if (resultsStatusFilter === 'FAILED' && !isFailedAllAccounts) return false;
                if (resultsStatusFilter === 'NO_SHOW' && !isNoShowStatus) return false;
            }

            const matchesTab = (activeTab === 'REQUESTS' && isRescheduleRequest) ||
                (activeTab === 'REPROFILE' && isReprofile) ||
                (activeTab === 'PENDING' && isPending) ||
                (activeTab === 'CLIENT_INTERVIEW' && isClientInterview) ||
                (activeTab === 'ACTIVE' && isActive) ||
                (activeTab === 'RESULTS' && isResults) ||
                (activeTab === 'NO_SHOW' && isNoShowStatus);

            return matchesSearch && matchesTab;
        });

        return list.sort((a, b) => {
            const getTimestamp = (app: any) => {
                let dateStr = app.updated_at || app.applied_at || app.created_at;

                // Safely handle metadata whether it's an object or a JSON string
                if (app.metadata) {
                    if (typeof app.metadata === 'string') {
                        try {
                            const parsed = JSON.parse(app.metadata);
                            if (parsed.date_endorsed_to_over) dateStr = parsed.date_endorsed_to_over;
                        } catch (e) { }
                    } else if (app.metadata.date_endorsed_to_over) {
                        dateStr = app.metadata.date_endorsed_to_over;
                    }
                }

                if (!dateStr) return Number.MAX_SAFE_INTEGER;
                const time = new Date(dateStr).getTime();
                return isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
            };

            const tA = getTimestamp(a);
            const tB = getTimestamp(b);

            if (tA < tB) return -1;
            if (tA > tB) return 1;
            return 0;
        });
    }, [applications, search, activeTab, user?.role, isAccountFilterEnabled, selectedAccount, selectedLob, selectedEndorser, selectedScheduler, reroutedAccounts, dateFilter, dateTargetFilter, resultsStatusFilter, departments]);

    const tabCounts = useMemo(() => {
        const counts = {
            REPROFILE: 0,
            REQUESTS: 0,
            PENDING: 0,
            ACTIVE: 0,
            RESULTS: 0,
            NO_SHOW: 0,
            CLIENT_INTERVIEW: 0
        };
        applications.forEach(app => {
            const depts = (app.department || '').split(',').map(s => String(s || '').trim().toLowerCase()).filter(Boolean);
            const failedAccounts = (app.metadata?.failed_accounts || []).map((f: any) => String(f || '').trim().toLowerCase()).filter(Boolean);
            const remainingAccounts = depts.filter(d => !failedAccounts.includes(d));
            const { isNoShowStatus, isPassedStatus } = getNoShowAndPassedStatus(app);
            const isHistoricalFinalFail = ['REJECTED', 'FAILED'].includes((app.current_status || '').toUpperCase()) && (app.pis?.final_interview_result === 'FAILED' || app.pis?.ops_validator_status === 'FAILED' || app.metadata?.final_interview_result === 'FAILED' || app.metadata?.ops_validator_status === 'FAILED' || (app.pis as any)?.client_interview_result === 'FAILED' || app.metadata?.client_interview_result === 'FAILED');
            const isFailedAllAccounts = (['REJECTED', 'FAILED'].includes((app.current_status || '').toUpperCase()) && remainingAccounts.length === 0 && failedAccounts.length > 0) || isHistoricalFinalFail;
            const deptsUpper = (app.department || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            const isAutoApprove = deptsUpper.includes('AUTO APPROVE');
            const hasFinalResult = isPassedStatus || isFailedAllAccounts || isNoShowStatus;



            if (selectedAccount) {
                const deptObj = departments.find(d => d.name === selectedAccount);
                const subNames = deptObj ? (deptObj.subAccounts || (deptObj as any).sub_accounts || []).map((sub: any) => (typeof sub === 'string' ? sub : sub.name).toLowerCase()) : [];
                const allowedNames = [selectedAccount.toLowerCase(), ...subNames];
                const hasMatch = depts.some(d => allowedNames.some(allowed => d.includes(allowed) || allowed.includes(d)));
                if (!hasMatch) return;
            }

            if (selectedLob) {
                const lobLower = selectedLob.toLowerCase();
                const hasMatch = depts.some(d => d.includes(lobLower) || lobLower.includes(d));
                if (!hasMatch) return;
            }

            if (selectedEndorser) {
                if ((app.assigned_recruiter_name || '') !== selectedEndorser) return;
            }

            const isFullyScheduled = !!app.endorsement_meeting_date || hasFinalResult || app.current_status === 'REPROFILE_FINAL_INTERVIEW';
            const currentScheduler = getActiveScheduler(app);
            if (selectedScheduler) {
                if ((currentScheduler || '') !== selectedScheduler || !isFullyScheduled) return;
            }

            if (dateFilter.type !== 'ALL' && dateFilter.start && dateFilter.end) {
                let targetDateStrs: (string | null | undefined)[] = [];
                if (dateTargetFilter === 'ALL') {
                    targetDateStrs = [
                        (app.pis as any)?.interview_completed_at || app.interview_completed_at,
                        app.metadata?.date_endorsed_to_over || app.updated_at,
                        app.endorsement_meeting_date
                    ];
                } else if (dateTargetFilter === 'CONCLUDED') {
                    targetDateStrs = [(app.pis as any)?.interview_completed_at || app.interview_completed_at];
                } else if (dateTargetFilter === 'ENDORSED') {
                    targetDateStrs = [app.metadata?.date_endorsed_to_over || app.updated_at];
                } else {
                    targetDateStrs = [app.endorsement_meeting_date];
                }

                const hasValidDate = targetDateStrs.some(targetDateStr => {
                    if (!targetDateStr) return false;
                    const localDate = new Date(targetDateStr);
                    if (isNaN(localDate.getTime())) return false;
                    const y = localDate.getFullYear();
                    const m = String(localDate.getMonth() + 1).padStart(2, '0');
                    const d = String(localDate.getDate()).padStart(2, '0');
                    const iso = `${y}-${m}-${d}`;
                    return iso >= dateFilter.start! && iso <= dateFilter.end!;
                });

                if (!hasValidDate) return;
            }

            const isReprofileCandidate = isReprofileApp(app);
            const isRescheduleRequest = app.pis?.final_specific_status === 'OV - Reschedule' && !isReprofileCandidate;
            const hasMeetingDate = !!app.endorsement_meeting_date;

            const isClientInterview = !hasFinalResult && ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_CLIENT_INTERVIEW'].includes(app.current_status || '');

            const isScheduledStatus = !hasFinalResult && !isClientInterview &&
                (app.current_status !== 'REJECTED' && app.current_status !== 'FAILED' || isReprofileCandidate) &&
                (app.recruiter_s_scheduling_status === 'SCHEDULED' ||
                    (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && hasMeetingDate) ||
                    app.current_status === 'REPROFILE_FINAL_INTERVIEW' ||
                    ['ENDORSEMENT'].includes(app.current_status || ''));
            const isPendingStatus = !hasFinalResult && !isScheduledStatus && !isClientInterview && (
                ((app.current_status !== 'REJECTED' && app.current_status !== 'FAILED') && (app.recruiter_s_scheduling_status === 'PENDING' || app.recruiter_s_scheduling_status === 'RECEIVED')) ||
                app.current_status === 'FINAL_INTERVIEW' ||
                (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && !hasMeetingDate) ||
                ((app.current_status === 'REJECTED' || app.current_status === 'FAILED') && failedAccounts.length > 0 && remainingAccounts.length > 0)
            );

            const isReprofile = isReprofileCandidate && !hasFinalResult && remainingAccounts.length > 0 && !isScheduledStatus && !isClientInterview;
            const isActive = isScheduledStatus && !isRescheduleRequest && !isReprofile && !isClientInterview;
            const isPending = isPendingStatus && !isRescheduleRequest && !isReprofile && !isClientInterview;
            const isResults = hasFinalResult && !isNoShowStatus;

            const canShowInNonResults = !(remainingAccounts.length === 0 && !isReprofileCandidate);

            if (isRescheduleRequest && canShowInNonResults) counts.REQUESTS++;
            else if (isReprofile && canShowInNonResults) counts.REPROFILE++;
            else if (isPending && canShowInNonResults) counts.PENDING++;
            else if (isClientInterview && canShowInNonResults) counts.CLIENT_INTERVIEW++;
            else if (isActive && canShowInNonResults) counts.ACTIVE++;
            else if (isResults) counts.RESULTS++;
            else if (isNoShowStatus && canShowInNonResults) counts.NO_SHOW++;
        });
        return counts;
    }, [applications, selectedAccount, selectedLob, selectedEndorser, selectedScheduler, user?.role, isAccountFilterEnabled, reroutedAccounts, dateFilter, departments]);

    const handleScheduleOutlook = async (app: Application) => {
        const convertOnsiteToOnline = (str: string) => {
            if (!str) return '';
            return str
                .replace(/On-Site/g, 'Online')
                .replace(/on-site/g, 'online')
                .replace(/On-site/g, 'Online')
                .replace(/ON-SITE/g, 'ONLINE')
                .replace(/Onsite/g, 'Online')
                .replace(/onsite/g, 'online')
                .replace(/ONSITE/g, 'ONLINE')
                .replace(/On Site/g, 'Online')
                .replace(/on site/g, 'online')
                .replace(/On site/g, 'Online')
                .replace(/ON SITE/g, 'ONLINE');
        };

        // Logic similar to FinalInterviewTab.tsx handleOutlookSchedule
        const validator = getValidatorForApplication(app);
        const validatorName = validator?.full_name || app.assigned_ops_validator_name || 'OPS Validator';
        const validatorEmail = getValidatorEmail(app);
        const startTime = app.endorsement_meeting_date ? new Date(app.endorsement_meeting_date) : new Date();
        const endTime = app.endorsement_meeting_end_date ? new Date(app.endorsement_meeting_end_date) : new Date(startTime.getTime() + 60 * 60 * 1000);

        const isOnline =
            (app.assigned_interview_room_name || '').toLowerCase().includes('online') ||
            (app.interview_room || '').toLowerCase().includes('online') ||
            app.metadata?.interview_mode === 'ONLINE' ||
            app.pis?.preferred_setup?.toLowerCase().includes('online');
        const modeLabel = isOnline ? 'Online' : 'On-Site';
        const modeEmoji = isOnline ? '🎥' : '🏢';
        const locationVal = isOnline ? 'Online Interview Room' : 'On-Site Office';

        const activeTemplate = emailTemplates.find(t => t.isActive && t.type === 'INTERVIEW_INVITE');

        const formattedDate = startTime.toLocaleString();
        let finalSubject = activeTemplate
            ? replacePlaceholders(activeTemplate.subject, app, validatorName, formattedDate)
            : `Endorsement Meeting: ${app.applicant_name} (${modeEmoji} ${modeLabel})`;

        let finalBody = activeTemplate
            ? formatBodyText(replacePlaceholders(activeTemplate.body, app, validatorName, formattedDate))
            : formatBodyText(app.endorsement_meeting_body || '') || formatBodyText(`Candidate: ${app.applicant_name}\nPosition: ${app.position_title}\nOPS Validator: ${validatorName}\nInterview Mode: ${modeEmoji} ${modeLabel}\n\nNotes from Recruiter:\n${app.final_interview_notes || 'N/A'}`);

        if (isOnline) {
            finalSubject = convertOnsiteToOnline(finalSubject);
            finalBody = convertOnsiteToOnline(finalBody);
        }

        const baseUrl = "https://outlook.office.com/calendar/0/deeplink/compose";
        const recipients = [validatorEmail, app.applicant_email].filter(Boolean).join(';');
        const formattedBodyForOutlook = finalBody.replace(/\r?\n/g, '\r\n');

        const url = `${baseUrl}?path=${encodeURIComponent("/calendar/action/compose")}&rru=addevent` +
            `&subject=${encodeURIComponent(finalSubject)}` +
            `&body=${encodeURIComponent(formattedBodyForOutlook)}` +
            `&startdt=${encodeURIComponent(startTime.toISOString())}` +
            `&enddt=${encodeURIComponent(endTime.toISOString())}` +
            `&to=${encodeURIComponent(recipients)}` +
            `&location=${encodeURIComponent(locationVal)}`;

        // Automatically copy formatted body to clipboard since Outlook strips URL newlines
        try {
            await navigator.clipboard.writeText(finalBody);
            toast.success('Description Copied!', 'Outlook Web strips newlines. Press Ctrl + V in the description box to format it perfectly.');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }

        window.open(url, '_blank');

        // Update status to SCHEDULED if not already scheduled
        if (app.recruiter_s_scheduling_status !== 'SCHEDULED') {
            try {
                await ApplicationService.patch(app.id, { recruiter_s_scheduling_status: 'SCHEDULED' });
                setApplications(prev => prev.map(a => a.id === app.id ? { ...a, recruiter_s_scheduling_status: 'SCHEDULED' } : a));
                toast.success('Outlook Sync', `Candidate ${app.applicant_name} marked as ACTIVE.`);
                navigate('/recruiter/dashboard');
            } catch (err) {
                toast.error('Sync Error', 'Failed to update scheduling status.');
            }
        } else {
            toast.success('Outlook Sync', 'Outlook deep-link generated successfully.');
        }
    };

    const handleRevertToPending = async (app: Application) => {
        try {
            await ApplicationService.patch(app.id, { recruiter_s_scheduling_status: 'RECEIVED' });
            setApplications(prev => prev.map(a => a.id === app.id ? { ...a, recruiter_s_scheduling_status: 'RECEIVED' } : a));
            toast.warning('Reverted', `${app.applicant_name} moved back to active pending.`);
        } catch (err) {
            toast.error('Error', 'Failed to revert status.');
        }
    };

    const handleComplyReschedule = async (app: Application) => {
        try {
            const patch: any = {
                recruiter_s_scheduling_status: 'RECEIVED',
                final_specific_status: 'PENDING',
                pis: {
                    ...(app.pis || {}),
                    final_specific_status: 'PENDING'
                }
            };
            await ApplicationService.patch(app.id, patch);
            setApplications(prev => prev.map(a => a.id === app.id ? { ...a, ...patch } : a));

            setRescheduleModalApp(null);
            setActiveTab('PENDING');
            setFocusedApplicant(app);
            setModalTab('scheduling');
        } catch (err) {
            toast.error('Error', 'Failed to comply to reschedule.');
        }
    };

    const handleDeleteApplication = async (app: Application) => {
        try {
            await ApplicationService.delete(app.id);
            setApplications(prev => prev.filter(a => a.id !== app.id));
            toast.success('Deleted', `${app.applicant_name} has been removed from the registry.`);
            setAppToDelete(null);
        } catch (err) {
            console.error('Failed to delete applicant:', err);
            toast.error('Error', 'Failed to delete applicant.');
        }
    };

    const handleUpdateApplication = async (id: string, patch: Partial<Application>) => {
        try {
            const updated = await ApplicationService.patch(id, patch);
            setApplications(prev => prev.map(app => app.id === id ? { ...app, ...updated } : app));
            if (focusedApplicant?.id === id) {
                setFocusedApplicant(prev => prev ? { ...prev, ...updated } : null);
            }
            toast.success('System Registry', 'Candidate record updated successfully.');
            return updated;
        } catch (err) {
            console.error('Failed to update candidate record:', err);
            toast.error('Sync Error', 'Failed to save application updates.');
            throw err;
        }
    };

    if (loading && applications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Synchronizing Calendar Hub...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 w-full bg-surface-50/50 animate-fade-in overflow-visible">
            {/* Centered Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-surface-100 py-8 px-8 flex flex-col items-center gap-5 shrink-0 relative z-20 overflow-visible shadow-sm">
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-primary-600 text-[10px] font-bold uppercase tracking-widest bg-primary-50/80 px-2.5 py-0.5 rounded-full ring-1 ring-primary-100/50">
                        <Globe size={12} /> Ops Validator
                    </div>
                    <h1
                        className="text-[34px] leading-tight text-surface-900 tracking-tight mt-1"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600 }}
                    >
                        Scheduling Hub
                    </h1>
                    <p className="text-[13px] font-medium text-surface-500 tracking-wide">
                        Manage pending schedules and active bookings
                    </p>
                </div>

                {/* Centered Action Controls */}
                <div className="flex flex-wrap items-center justify-center gap-5 mt-4 w-full max-w-5xl overflow-visible">
                    {/* Custom Tab Switcher */}
                    <div className="flex items-center gap-1 p-1 bg-surface-50 rounded-xl border border-surface-200/60 shadow-sm">
                        <button
                            onClick={() => setActiveTab('REQUESTS')}
                            className={cn(
                                "px-5 py-2 text-[12px] font-semibold transition-all rounded-lg flex items-center gap-2.5 cursor-pointer",
                                activeTab === 'REQUESTS'
                                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm ring-1 ring-surface-200/50"
                                    : "text-surface-500 hover:text-surface-800 hover:bg-surface-100/50"
                            )}
                        >
                            <Clock size={15} /> Requests
                            {tabCounts.REQUESTS > 0 && (
                                <span className={cn(
                                    "px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    activeTab === 'REQUESTS' ? "bg-blue-100 text-blue-700" : "bg-surface-200 text-surface-600"
                                )}>
                                    {tabCounts.REQUESTS}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('PENDING')}
                            className={cn(
                                "px-5 py-2 text-[12px] font-semibold transition-all rounded-lg flex items-center gap-2.5 cursor-pointer",
                                activeTab === 'PENDING'
                                    ? "bg-white dark:bg-slate-900 text-primary-600 shadow-sm ring-1 ring-surface-200/50"
                                    : "text-surface-500 hover:text-surface-800 hover:bg-surface-100/50"
                            )}
                        >
                            <AlertCircle size={15} /> Pending
                            {tabCounts.PENDING > 0 && (
                                <span className={cn(
                                    "px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    activeTab === 'PENDING' ? "bg-primary-100 text-primary-700" : "bg-surface-200 text-surface-600"
                                )}>
                                    {tabCounts.PENDING}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('REPROFILE')}
                            className={cn(
                                "px-5 py-2 text-[12px] font-semibold transition-all rounded-lg flex items-center gap-2.5 cursor-pointer",
                                activeTab === 'REPROFILE'
                                    ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/50"
                                    : "text-surface-500 hover:text-surface-800 hover:bg-surface-100/50"
                            )}
                        >
                            <CalendarCheck size={15} /> Reprofile
                            {tabCounts.REPROFILE > 0 && (
                                <span className={cn(
                                    "px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    activeTab === 'REPROFILE' ? "bg-white/20 dark:bg-slate-900/20 text-white" : "bg-surface-200 text-surface-600"
                                )}>
                                    {tabCounts.REPROFILE}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('ACTIVE')}
                            className={cn(
                                "px-5 py-2 text-[12px] font-semibold transition-all rounded-lg flex items-center gap-2.5 cursor-pointer",
                                activeTab === 'ACTIVE'
                                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-sm ring-1 ring-surface-200/50"
                                    : "text-surface-500 hover:text-surface-800 hover:bg-surface-100/50"
                            )}
                        >
                            <CheckCircle2 size={15} /> Active
                            {tabCounts.ACTIVE > 0 && (
                                <span className={cn(
                                    "px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    activeTab === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-surface-200 text-surface-600"
                                )}>
                                    {tabCounts.ACTIVE}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('RESULTS')}
                            className={cn(
                                "px-5 py-2 text-[12px] font-semibold transition-all rounded-lg flex items-center gap-2.5 cursor-pointer",
                                activeTab === 'RESULTS'
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm ring-1 ring-surface-200/50"
                                    : "text-surface-500 hover:text-surface-800 hover:bg-surface-100/50"
                            )}
                        >
                            <User size={15} /> Final Results
                            {tabCounts.RESULTS > 0 && (
                                <span className={cn(
                                    "px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    activeTab === 'RESULTS' ? "bg-indigo-100 text-indigo-700" : "bg-surface-200 text-surface-600"
                                )}>
                                    {tabCounts.RESULTS}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('CLIENT_INTERVIEW')}
                            className={cn(
                                "px-5 py-2 text-[12px] font-semibold transition-all rounded-lg flex items-center gap-2.5 cursor-pointer",
                                activeTab === 'CLIENT_INTERVIEW'
                                    ? "bg-white dark:bg-slate-900 text-orange-600 shadow-sm ring-1 ring-surface-200/50"
                                    : "text-surface-500 hover:text-surface-800 hover:bg-surface-100/50"
                            )}
                        >
                            <Users size={15} /> Client Interview
                            {tabCounts.CLIENT_INTERVIEW > 0 && (
                                <span className={cn(
                                    "px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    activeTab === 'CLIENT_INTERVIEW' ? "bg-orange-100 text-orange-700" : "bg-surface-200 text-surface-600"
                                )}>
                                    {tabCounts.CLIENT_INTERVIEW}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('NO_SHOW')}
                            className={cn(
                                "px-5 py-2 text-[12px] font-semibold transition-all rounded-lg flex items-center gap-2.5 cursor-pointer",
                                activeTab === 'NO_SHOW'
                                    ? "bg-white dark:bg-slate-900 text-red-600 shadow-sm ring-1 ring-surface-200/50"
                                    : "text-surface-500 hover:text-surface-800 hover:bg-surface-100/50"
                            )}
                        >
                            <AlertCircle size={15} /> No Show
                            {tabCounts.NO_SHOW > 0 && (
                                <span className={cn(
                                    "px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    activeTab === 'NO_SHOW' ? "bg-red-100 text-red-700" : "bg-surface-200 text-surface-600"
                                )}>
                                    {tabCounts.NO_SHOW}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search Input and Filters */}
                    <div className="flex flex-col gap-3 w-full">
                        {/* Row 1: Search and Core Filters */}
                        <div className="flex flex-wrap items-center gap-2.5 w-full overflow-visible">
                            <div className="relative group flex-1 min-w-[260px]">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search candidate..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 h-9 bg-white dark:bg-slate-900 border border-surface-200 rounded-md text-[12px] font-medium placeholder-surface-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none shadow-sm"
                                />
                            </div>

                            {/* Exclusive Candidates Toggle */}
                            {isAdminOrSuperAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setIsExclusiveMode(!isExclusiveMode)}
                                    className={cn(
                                        "flex items-center justify-center gap-1.5 px-3 h-9 text-[11.5px] font-semibold transition-all rounded-[4px] focus:outline-none border",
                                        isExclusiveMode
                                            ? "bg-slate-900 border-slate-900 text-white dark:text-slate-900 shadow-sm"
                                            : "bg-white dark:bg-slate-900 border-surface-200 dark:border-slate-800 text-surface-700 dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-slate-800"
                                    )}
                                    title="Toggle Hidden Candidates"
                                >
                                    {isExclusiveMode ? <Eye size={14} strokeWidth={2.5} /> : <EyeOff size={14} strokeWidth={2.5} />}
                                    Hidden (Exclusive)
                                </button>
                            )}

                            {/* Custom Searchable Account Dropdown */}
                            <div ref={accountDropdownRef} className="relative select-none z-30">
                                <button
                                    type="button"
                                    onClick={() => setIsAccountDropdownOpen(prev => !prev)}
                                    className="h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-md text-[12px] font-medium text-surface-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm cursor-pointer min-w-[140px] flex items-center justify-between gap-2 transition-all hover:border-primary-500 hover:bg-surface-50"
                                >
                                    <span className="truncate max-w-[110px]">{selectedAccount || 'All Accounts'}</span>
                                    <ChevronRight size={14} className={cn("transform transition-transform text-surface-400 shrink-0", isAccountDropdownOpen ? "rotate-90" : "rotate-0")} />
                                </button>

                                {isAccountDropdownOpen && (
                                    <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-surface-200 rounded-xl shadow-xl z-50 p-2.5 text-left flex flex-col gap-2 max-h-[350px] overflow-hidden ring-1 ring-black/5">
                                        <div className="relative group shrink-0">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search accounts..."
                                                value={accountDropdownSearch}
                                                onChange={e => setAccountDropdownSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-surface-50 border border-surface-200 rounded-md text-[12px] font-medium placeholder-surface-400 focus:bg-white dark:bg-slate-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="overflow-y-auto flex-1 flex flex-col gap-0.5 no-scrollbar pr-0.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAccount('');
                                                    setIsAccountDropdownOpen(false);
                                                    setAccountDropdownSearch('');
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-[12px] font-bold rounded-md transition-colors cursor-pointer",
                                                    !selectedAccount ? "bg-primary-50 text-primary-700" : "text-surface-700 hover:bg-surface-50"
                                                )}
                                            >
                                                All Accounts
                                            </button>
                                            <div className="h-px bg-surface-100 my-1" />
                                            {filteredAccountOptions.length === 0 ? (
                                                <div className="py-4 text-center text-[11px] text-surface-400 font-semibold uppercase tracking-wider">No matching accounts</div>
                                            ) : (
                                                filteredAccountOptions.map(option => {
                                                    const isSub = option.startsWith(selectedAccount + ' ') && option !== selectedAccount;
                                                    return (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedAccount(option);
                                                                setSelectedLob('');
                                                                setIsAccountDropdownOpen(false);
                                                                setAccountDropdownSearch('');
                                                            }}
                                                            className={cn(
                                                                "w-full text-left py-1.5 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer flex items-center justify-between",
                                                                selectedAccount === option ? "bg-primary-50 text-primary-700 font-bold" : "text-surface-700 hover:bg-surface-50"
                                                            )}
                                                        >
                                                            <span className="truncate">{option}</span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Custom Searchable Job Position Dropdown */}
                            <div ref={lobDropdownRef} className="relative select-none z-30">
                                <button
                                    type="button"
                                    onClick={() => setIsLobDropdownOpen(prev => !prev)}
                                    className="h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-md text-[12px] font-medium text-surface-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm cursor-pointer min-w-[140px] flex items-center justify-between gap-2 transition-all hover:border-primary-500 hover:bg-surface-50"
                                >
                                    <span className="truncate max-w-[110px]">{selectedLob || 'All Job Positions'}</span>
                                    <ChevronRight size={14} className={cn("transform transition-transform text-surface-400 shrink-0", isLobDropdownOpen ? "rotate-90" : "rotate-0")} />
                                </button>

                                {isLobDropdownOpen && (
                                    <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-surface-200 rounded-xl shadow-xl z-50 p-2.5 text-left flex flex-col gap-2 max-h-[350px] overflow-hidden ring-1 ring-black/5">
                                        <div className="relative group shrink-0">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search Job Positions..."
                                                value={lobDropdownSearch}
                                                onChange={e => setLobDropdownSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-surface-50 border border-surface-200 rounded-md text-[12px] font-medium placeholder-surface-400 focus:bg-white dark:bg-slate-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="overflow-y-auto flex-1 flex flex-col gap-0.5 no-scrollbar pr-0.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedLob('');
                                                    setIsLobDropdownOpen(false);
                                                    setLobDropdownSearch('');
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-[12px] font-bold rounded-md transition-colors cursor-pointer",
                                                    !selectedLob ? "bg-primary-50 text-primary-700" : "text-surface-700 hover:bg-surface-50"
                                                )}
                                            >
                                                All Job Positions
                                            </button>
                                            <div className="h-px bg-surface-100 my-1" />
                                            {filteredLobOptions.length === 0 ? (
                                                <div className="py-4 text-center text-[11px] text-surface-400 font-semibold uppercase tracking-wider">No matching Job Positions</div>
                                            ) : (
                                                filteredLobOptions.map((option: string) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedLob(option);
                                                            setIsLobDropdownOpen(false);
                                                            setLobDropdownSearch('');
                                                        }}
                                                        className={cn(
                                                            "w-full text-left py-1.5 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer flex items-center justify-between",
                                                            selectedLob === option ? "bg-primary-50 text-primary-700 font-bold" : "text-surface-700 hover:bg-surface-50"
                                                        )}
                                                    >
                                                        <span className="truncate">{option}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Custom Searchable Endorser Dropdown */}
                            <div ref={endorserDropdownRef} className="relative select-none z-30">
                                <button
                                    type="button"
                                    onClick={() => setIsEndorserDropdownOpen(prev => !prev)}
                                    className="h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-md text-[12px] font-medium text-surface-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm cursor-pointer min-w-[140px] flex items-center justify-between gap-2 transition-all hover:border-primary-500 hover:bg-surface-50"
                                >
                                    <span className="truncate max-w-[110px]">{selectedEndorser || 'All Endorsers'}</span>
                                    <ChevronRight size={14} className={cn("transform transition-transform text-surface-400 shrink-0", isEndorserDropdownOpen ? "rotate-90" : "rotate-0")} />
                                </button>

                                {isEndorserDropdownOpen && (
                                    <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-surface-200 rounded-xl shadow-xl z-50 p-2.5 text-left flex flex-col gap-2 max-h-[350px] overflow-hidden ring-1 ring-black/5">
                                        <div className="relative group shrink-0">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search endorsers..."
                                                value={endorserDropdownSearch}
                                                onChange={e => setEndorserDropdownSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-surface-50 border border-surface-200 rounded-md text-[12px] font-medium placeholder-surface-400 focus:bg-white dark:bg-slate-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="overflow-y-auto flex-1 flex flex-col gap-0.5 no-scrollbar pr-0.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedEndorser('');
                                                    setIsEndorserDropdownOpen(false);
                                                    setEndorserDropdownSearch('');
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-[12px] font-bold rounded-md transition-colors cursor-pointer",
                                                    !selectedEndorser ? "bg-primary-50 text-primary-700" : "text-surface-700 hover:bg-surface-50"
                                                )}
                                            >
                                                All Endorsers
                                            </button>
                                            <div className="h-px bg-surface-100 my-1" />
                                            {filteredEndorserOptions.length === 0 ? (
                                                <div className="py-4 text-center text-[11px] text-surface-400 font-semibold uppercase tracking-wider">No matching endorsers</div>
                                            ) : (
                                                filteredEndorserOptions.map((option: string) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedEndorser(option);
                                                            setIsEndorserDropdownOpen(false);
                                                            setEndorserDropdownSearch('');
                                                        }}
                                                        className={cn(
                                                            "w-full text-left py-1.5 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer flex items-center justify-between",
                                                            selectedEndorser === option ? "bg-primary-50 text-primary-700 font-bold" : "text-surface-700 hover:bg-surface-50"
                                                        )}
                                                    >
                                                        <span className="truncate">{option}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Custom Searchable Scheduler Dropdown */}
                            <div ref={schedulerDropdownRef} className="relative select-none z-30">
                                <button
                                    type="button"
                                    onClick={() => setIsSchedulerDropdownOpen(prev => !prev)}
                                    className="h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-md text-[12px] font-medium text-surface-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm cursor-pointer min-w-[140px] flex items-center justify-between gap-2 transition-all hover:border-primary-500 hover:bg-surface-50"
                                >
                                    <span className="truncate max-w-[110px]">{selectedScheduler || 'All Schedulers'}</span>
                                    <ChevronRight size={14} className={cn("transform transition-transform text-surface-400 shrink-0", isSchedulerDropdownOpen ? "rotate-90" : "rotate-0")} />
                                </button>

                                {isSchedulerDropdownOpen && (
                                    <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-surface-200 rounded-xl shadow-xl z-50 p-2.5 text-left flex flex-col gap-2 max-h-[350px] overflow-hidden ring-1 ring-black/5">
                                        <div className="relative group shrink-0">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search schedulers..."
                                                value={schedulerDropdownSearch}
                                                onChange={e => setSchedulerDropdownSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-surface-50 border border-surface-200 rounded-md text-[12px] font-medium placeholder-surface-400 focus:bg-white dark:bg-slate-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="overflow-y-auto flex-1 flex flex-col gap-0.5 no-scrollbar pr-0.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedScheduler('');
                                                    setIsSchedulerDropdownOpen(false);
                                                    setSchedulerDropdownSearch('');
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-[12px] font-bold rounded-md transition-colors cursor-pointer",
                                                    !selectedScheduler ? "bg-primary-50 text-primary-700" : "text-surface-700 hover:bg-surface-50"
                                                )}
                                            >
                                                All Schedulers
                                            </button>
                                            <div className="h-px bg-surface-100 my-1" />
                                            {filteredSchedulerOptions.length === 0 ? (
                                                <div className="py-4 text-center text-[11px] text-surface-400 font-semibold uppercase tracking-wider">No matching schedulers</div>
                                            ) : (
                                                filteredSchedulerOptions.map((option: string) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedScheduler(option);
                                                            setIsSchedulerDropdownOpen(false);
                                                            setSchedulerDropdownSearch('');
                                                        }}
                                                        className={cn(
                                                            "w-full text-left py-1.5 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer flex items-center justify-between",
                                                            selectedScheduler === option ? "bg-primary-50 text-primary-700 font-bold" : "text-surface-700 hover:bg-surface-50"
                                                        )}
                                                    >
                                                        <span className="truncate">{option}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Date Filters and Refresh */}
                        <div className="flex flex-wrap items-center gap-3 w-full">
                            <AdvancedDateFilter
                                value={dateFilter}
                                onChange={setDateFilter}
                            />

                            {/* Date target selector */}
                            <div className="relative select-none z-20 group">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 group-hover:text-primary-500 transition-colors pointer-events-none" />
                                <select
                                    value={dateTargetFilter}
                                    onChange={(e) => setDateTargetFilter(e.target.value as any)}
                                    className="h-9 pl-9 pr-8 bg-white dark:bg-slate-900 border border-surface-200 rounded-md text-[12px] font-medium text-surface-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm cursor-pointer appearance-none transition-all hover:border-primary-500 hover:bg-surface-50 min-w-[170px]"
                                    title="Choose which date field to filter by"
                                >
                                    <option value="ALL">All Date Types</option>
                                    <option value="SCHEDULED">Scheduled Date</option>
                                    <option value="ENDORSED">Endorsed Date</option>
                                    <option value="CONCLUDED">Interview Concluded</option>
                                </select>
                                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none rotate-90 transition-colors group-hover:text-primary-500" />
                            </div>

                            {activeTab === 'RESULTS' && (
                                <div className="relative select-none z-20 group">
                                    <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 group-hover:text-primary-500 transition-colors pointer-events-none" />
                                    <select
                                        value={resultsStatusFilter}
                                        onChange={(e) => setResultsStatusFilter(e.target.value as any)}
                                        className="h-9 pl-9 pr-8 bg-white dark:bg-slate-900 border border-surface-200 rounded-md text-[12px] font-medium text-surface-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm cursor-pointer appearance-none transition-all hover:border-primary-500 hover:bg-surface-50 min-w-[140px]"
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PASSED">Passed</option>
                                        <option value="FAILED">Failed</option>
                                        <option value="NO_SHOW">No Show</option>
                                    </select>
                                    <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none rotate-90 transition-colors group-hover:text-primary-500" />
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Grid Layout */}
            {filteredList.length === 0 ? (
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-surface-200 rounded-sm p-24 text-center max-w-lg w-full shadow-sm">
                        <div className="w-16 h-16 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            {activeTab === 'PENDING' ? <AlertCircle size={32} className="text-surface-300" /> : <CheckCircle2 size={32} className="text-surface-300" />}
                        </div>
                        <h3 className="text-xs font-black text-surface-900 uppercase tracking-[0.2em]">No {activeTab.toLowerCase()} records</h3>
                        <p className="text-[9px] text-surface-500 mt-1.5 uppercase tracking-widest font-bold">Synchronize the registry or check the other tab.</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 flex flex-col p-6 space-y-3">
                    {activeTab !== 'REQUESTS' && (
                        <div className={cn(
                            "hidden xl:grid py-4 text-surface-500 shrink-0 bg-transparent items-center border-b border-surface-200",
                            activeTab === 'PENDING'
                                ? "xl:grid-cols-[minmax(280px,2.5fr)_minmax(150px,1.5fr)_minmax(200px,1.5fr)_220px]"
                                : "xl:grid-cols-[minmax(260px,2.5fr)_minmax(140px,1.2fr)_minmax(160px,1.2fr)_minmax(160px,1.2fr)_minmax(180px,1.5fr)_310px]"
                        )}>
                            {(activeTab === 'PENDING'
                                ? ['Candidate', 'Account', 'Schedule', 'Actions']
                                : ['Candidate', 'Account', 'Schedule', 'Interview Concluded', 'Ops Validator', 'Actions']
                            ).map((label, idx) => (
                                <p key={label} className={cn(
                                    "px-6 text-[11px] font-semibold text-surface-500 uppercase tracking-wider flex items-center h-full",
                                    label === 'Actions' ? "justify-end pr-6 pl-2" : "justify-start"
                                )}>
                                    {label}
                                </p>
                            ))}
                        </div>
                    )}

                    <div className={cn(
                        "flex-1 overflow-y-auto custom-scrollbar pb-6 px-1",
                        activeTab === 'REQUESTS' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 auto-rows-max content-start" : "space-y-3"
                    )}>
                        <AnimatePresence mode="popLayout">
                            {filteredList.map((app, index) => {
                                const validatorEmail = getValidatorEmail(app);
                                const statusLabel =
                                    activeTab === 'PENDING' ? 'Awaiting Schedule' :
                                        activeTab === 'REPROFILE' ? 'Reprofiled' :
                                            activeTab === 'REQUESTS' ? 'Reschedule Requested' :
                                                'Scheduled';

                                if (activeTab === 'REQUESTS') {
                                    return (
                                        <motion.div
                                            key={app.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            className="bg-white dark:bg-slate-900 rounded-lg border border-surface-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer"
                                            onClick={() => setRescheduleModalApp(app)}
                                        >
                                            {/* Top accent bar */}
                                            <div className="h-[3px] bg-gradient-to-r from-amber-400 to-amber-500"></div>

                                            <div className="px-4 pt-3.5 pb-3">
                                                {/* Header row: avatar + name + badge */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-surface-50 border border-surface-200 text-surface-500 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {app.pis?.photo_data_url ? (
                                                            <img src={app.pis.photo_data_url} alt={app.applicant_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[11px] font-bold opacity-70">{(app.applicant_name || '?').charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-[13px] font-bold text-surface-900 truncate leading-tight">{app.applicant_name}</h4>
                                                        <p className="text-[11px] text-surface-500 truncate leading-tight mt-0.5">{app.position_title || 'Candidate'}</p>
                                                    </div>
                                                    <span className="bg-amber-50 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-200/50 shrink-0 leading-tight">
                                                        Resched
                                                    </span>
                                                </div>

                                                {/* Reason */}
                                                <div className="mt-3 bg-surface-50/80 border border-surface-100 rounded-md px-3 py-2.5 relative">
                                                    <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-400 rounded-l-md"></div>
                                                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1 pl-1.5">{app.assigned_ops_validator_name || 'Ops Validator'}</p>
                                                    <p className="text-[11px] text-surface-700 leading-snug pl-1.5 line-clamp-3 italic">
                                                        "{app.pis?.ops_validator_notes || 'No reason provided.'}"
                                                    </p>
                                                </div>

                                                {/* Footer */}
                                                <div className="mt-3 flex items-center justify-between gap-2">
                                                    <span className="text-[10px] text-surface-400 font-medium">
                                                        {(() => {
                                                            const rawDate = app.metadata?.date_endorsed_to_over || app.updated_at;
                                                            if (!rawDate) return '';
                                                            try {
                                                                return new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                            } catch { return ''; }
                                                        })()}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRescheduleModalApp(app);
                                                        }}
                                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-md shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wider"
                                                    >
                                                        <CalendarCheck size={12} />
                                                        Review
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                }

                                return (
                                    <motion.div
                                        key={app.id}
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        onClick={() => {
                                            setFocusedApplicant(app);
                                        }}
                                        className={cn(
                                            "grid grid-cols-1 items-stretch bg-white dark:bg-slate-900 rounded-xl border border-surface-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer",
                                            activeTab === 'PENDING'
                                                ? "xl:grid-cols-[minmax(280px,2.5fr)_minmax(150px,1.5fr)_minmax(200px,1.5fr)_220px]"
                                                : "xl:grid-cols-[minmax(260px,2.5fr)_minmax(140px,1.2fr)_minmax(160px,1.2fr)_minmax(160px,1.2fr)_minmax(180px,1.5fr)_310px]"
                                        )}
                                    >
                                        <div className="min-w-0 px-6 py-4 flex items-center xl:border-r border-surface-100">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-11 h-11 rounded-full bg-surface-50 border border-surface-200 text-surface-500 flex items-center justify-center shrink-0 overflow-hidden relative">
                                                    {app.pis?.photo_data_url ? (
                                                        <img
                                                            src={app.pis.photo_data_url}
                                                            alt={app.applicant_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-[14px] font-semibold opacity-80">{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-[14px] font-semibold text-surface-900 truncate group-hover:text-primary-600 transition-colors">
                                                        {app.applicant_name}
                                                    </h4>
                                                    <p className="text-[12px] text-surface-500 truncate mt-0.5">
                                                        {app.position_title || 'Candidate'}
                                                    </p>
                                                    <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide mt-1.5 flex items-center gap-1">
                                                        Endorsed:
                                                        <span className="text-surface-600 font-medium bg-surface-50 px-1.5 py-0.5 rounded border border-surface-200/40">
                                                            {(() => {
                                                                const rawDate = app.metadata?.date_endorsed_to_over || app.updated_at || app.applied_at;
                                                                if (!rawDate) return 'N/A';
                                                                try {
                                                                    const dateObj = new Date(rawDate);
                                                                    if (isNaN(dateObj.getTime())) return 'N/A';
                                                                    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                                } catch {
                                                                    return 'N/A';
                                                                }
                                                            })()}
                                                        </span>
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5 text-[11px] text-surface-500 font-medium">
                                                        <span className="flex items-center gap-1 bg-surface-50/50 px-2 py-1 rounded-md">
                                                            <span className="text-[10px] text-surface-400">Endorser:</span>
                                                            <span className="text-surface-700 font-medium">{app.assigned_recruiter_name || 'Unassigned'}</span>
                                                        </span>
                                                        {activeTab !== 'PENDING' && getActiveScheduler(app) && (
                                                            <span className="flex items-center gap-1 bg-blue-50/50 px-2 py-1 rounded-md">
                                                                <span className="text-[10px] text-blue-500">Scheduler:</span>
                                                                <span className="text-blue-700 font-medium">{getActiveScheduler(app)}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="min-w-0 px-6 py-4 flex flex-col items-start justify-center xl:border-r border-surface-100">
                                            <p className="xl:hidden text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5 text-left">Account</p>
                                            <div className="flex flex-col gap-2 items-start justify-center w-full overflow-hidden">
                                                {(() => {
                                                    const activeDepts = (app.department || '').split(',').map(s => String(s || '').trim()).filter(Boolean);
                                                    const failedAccounts = (app.metadata?.failed_accounts || []).map((f: any) => String(f || '').trim()).filter(Boolean);
                                                    const allDepts = Array.from(new Set([...activeDepts, ...failedAccounts]));
                                                    return allDepts.map((deptName, idx) => {
                                                        const deptLower = String(deptName || '').trim().toLowerCase();
                                                        if (!deptLower) return null;
                                                        const matchingDep = departments.find(d => String(d?.name || '').trim().toLowerCase() === deptLower) || [...departments].sort((a, b) => (b?.name?.length || 0) - (a?.name?.length || 0)).find(d => deptLower.startsWith(String(d?.name || '').trim().toLowerCase()));
                                                        const displayName = String(deptName).toUpperCase();
                                                        const isFailed = failedAccounts.some((f: any) => String(f || '').trim().toLowerCase() === deptLower);
                                                        const isValidEndorsement = app.endorsement_account && !['---', 'n/a', 'null'].includes(String(app.endorsement_account).trim().toLowerCase());
                                                        const isEndorsed = activeTab !== 'PENDING' && (isValidEndorsement
                                                            ? String(app.endorsement_account).trim().toLowerCase() === deptLower
                                                            : idx === 0);
                                                        const isReprofiledAcc = (app.metadata?.is_reprofiled === true || app.metadata?.is_reprofiled === 'true') &&
                                                            deptLower === String(app.pis?.initial_account_assignment || app.metadata?.initial_account_assignment || '').trim().toLowerCase();

                                                        const isPassedStatus = ['PASSED', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'HIRED', 'FINAL_VERDICT', 'FOR_PAN', 'FOR PAN', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'HIRED_PROCESSED'].includes(app.current_status || '');
                                                        const isPassedAccount = activeTab === 'RESULTS' && isEndorsed && !isFailed && isPassedStatus;

                                                        return (
                                                            <span
                                                                key={deptName}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setFocusedApplicant(app);
                                                                }}
                                                                className={cn(
                                                                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 text-[11px] font-semibold text-surface-600 rounded-md shadow-sm relative shrink-0 transition-all cursor-pointer hover:border-primary-400 hover:shadow-md max-w-full",
                                                                    isFailed && "opacity-75 bg-red-50 border-red-100 text-red-600",
                                                                    (!isFailed && isEndorsed && !isPassedAccount) && "border-blue-200 bg-blue-50 text-blue-700",
                                                                    isPassedAccount && "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm z-10"
                                                                )}
                                                            >
                                                                {(isEndorsed && !isFailed) && (
                                                                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 drop-shadow-sm" strokeWidth={3} />
                                                                )}
                                                                {isReprofiledAcc && (
                                                                    <span
                                                                        className="text-[11px] text-blue-600 font-black shrink-0 select-none mr-0.5 animate-pulse"
                                                                        style={{
                                                                            textShadow: '0 0 8px rgba(37, 99, 235, 0.95), 0 0 16px rgba(37, 99, 235, 0.45)',
                                                                            filter: 'drop-shadow(0 0 1px rgba(37, 99, 235, 0.65))'
                                                                        }}
                                                                        title="Original account assignment (Not Reprofile)"
                                                                    >
                                                                        @
                                                                    </span>
                                                                )}
                                                                <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 border border-surface-200 bg-white dark:bg-slate-900">
                                                                    {matchingDep && (matchingDep.accountImageUrl || matchingDep.accountImageData) ? (
                                                                        <img
                                                                            src={matchingDep.accountImageUrl ? (matchingDep.accountImageUrl.startsWith('/') ? `/api${matchingDep.accountImageUrl}` : matchingDep.accountImageUrl) : (matchingDep.accountImageData || '')}
                                                                            alt={displayName}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <img src="/contactpoint-logo.png?v=2" alt="Logo" className="w-full h-full object-contain p-0.5" />
                                                                    )}
                                                                </div>
                                                                <span className={cn("truncate max-w-[130px]", isFailed && "line-through opacity-80 decoration-rose-500 decoration-2")} title={displayName}>{displayName}</span>
                                                                {isFailed && (
                                                                    <XCircle size={14} className="text-rose-600 shrink-0 drop-shadow-sm" strokeWidth={3} />
                                                                )}
                                                            </span>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>

                                        <div className="min-w-0 px-6 py-4 flex flex-col justify-center xl:border-r border-surface-100 gap-1.5">
                                            <p className="xl:hidden text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5">Schedule</p>
                                            {(() => {
                                                const effectiveMeetingDate = (app.current_status === 'REJECTED' || app.current_status === 'FAILED') ? null : app.endorsement_meeting_date;
                                                if (!effectiveMeetingDate) {
                                                    return (
                                                        <div className="flex items-center gap-2 text-[12px] font-medium text-surface-500">
                                                            <Calendar size={15} className="shrink-0" />
                                                            <span>No date set</span>
                                                        </div>
                                                    );
                                                }
                                                const startDate = new Date(effectiveMeetingDate);
                                                const dateString = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                const startTimeString = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                                let timeLabel = startTimeString;
                                                const effectiveEndDate = (app.current_status === 'REJECTED' || app.current_status === 'FAILED') ? null : app.endorsement_meeting_end_date;
                                                if (effectiveEndDate) {
                                                    const endDate = new Date(effectiveEndDate);
                                                    const endTimeString = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                                    const diffMs = endDate.getTime() - startDate.getTime();
                                                    const diffMins = Math.round(diffMs / (60 * 1000));
                                                    let durationStr = '';
                                                    if (diffMins > 0) {
                                                        if (diffMins >= 60) {
                                                            const hrs = Math.floor(diffMins / 60);
                                                            const mins = diffMins % 60;
                                                            durationStr = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hr${hrs > 1 ? 's' : ''}`;
                                                        } else {
                                                            durationStr = `${diffMins}m`;
                                                        }
                                                    }
                                                    timeLabel = `${startTimeString} - ${endTimeString} ${durationStr ? `(${durationStr})` : ''}`;
                                                }

                                                return (
                                                    <div className="flex flex-col text-left">
                                                        <div className="flex items-center gap-2 text-[13px] font-semibold text-surface-800 whitespace-nowrap">
                                                            <Calendar size={15} className="shrink-0 text-blue-500" />
                                                            <span>{dateString}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-surface-500 mt-1 whitespace-nowrap pl-[23px]">
                                                            <span>{timeLabel}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex mt-1.5 pl-[23px]">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center whitespace-nowrap",
                                                    statusLabel === 'Awaiting Schedule' ? "bg-amber-50 text-amber-700" :
                                                        statusLabel === 'Reschedule Requested' ? "bg-red-50 text-red-700" :
                                                            "bg-emerald-50 text-emerald-700"
                                                )}>
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        </div>

                                        {activeTab !== 'PENDING' && (
                                            <div className="min-w-0 px-6 py-4 flex flex-col justify-center xl:border-r border-surface-100 space-y-1">
                                                <p className="xl:hidden text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Interview Concluded</p>
                                                {(() => {
                                                    const concludedDate = (app.pis as any)?.interview_completed_at || app.interview_completed_at;
                                                    if (!concludedDate) {
                                                        return (
                                                            <span className="text-[12px] text-surface-400 font-medium italic">Not concluded</span>
                                                        );
                                                    }
                                                    try {
                                                        const dateObj = new Date(concludedDate);
                                                        if (isNaN(dateObj.getTime())) return <span className="text-[12px] text-surface-400 font-medium italic">Invalid date</span>;
                                                        return (
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-semibold text-surface-700">
                                                                    {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </span>
                                                                <span className="text-[10px] text-surface-400 mt-0.5">
                                                                    {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        );
                                                    } catch {
                                                        return <span className="text-[12px] text-surface-400 font-medium italic">—</span>;
                                                    }
                                                })()}
                                            </div>
                                        )}

                                        {activeTab !== 'PENDING' && (
                                            <div className="min-w-0 px-6 py-4 flex flex-col justify-center xl:border-r border-surface-100 space-y-1.5 group/validator relative">
                                                <p className="xl:hidden text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Ops Validator</p>

                                                {editingOpsValidatorAppId === app.id ? (
                                                    <div className="flex flex-col gap-1.5 w-full">
                                                        {(() => {
                                                            const activeDepts = (app.department || '').split(',').map(s => String(s || '').trim()).filter(Boolean);
                                                            const failedAccounts = (app.metadata?.failed_accounts || []).map((f: any) => String(f || '').trim()).filter(Boolean);
                                                            const candidateAccounts = Array.from(new Set([
                                                                ...activeDepts,
                                                                ...failedAccounts,
                                                                app.endorsement_account
                                                            ])).filter(Boolean).map(s => String(s).trim().toLowerCase());

                                                            const accountValidators = REAL_ACCOUNTS.filter(a => {
                                                                const acc = String(a.account || '').trim().toLowerCase();
                                                                const pseudo = String(a.pseudonym || '').trim().toLowerCase();
                                                                return candidateAccounts.some(ca =>
                                                                    ca === acc || ca === pseudo || acc.startsWith(ca) || ca.startsWith(acc)
                                                                );
                                                            })
                                                                .flatMap(a => (a.opsValidator || '').split(',').map(s => s.trim()).filter(Boolean))
                                                                .filter((v, i, a) => a.indexOf(v) === i)
                                                                .sort();

                                                            return (
                                                                <div className="flex items-center gap-1 w-full max-w-[180px]">
                                                                    <select
                                                                        value={selectedOpsValidator}
                                                                        onChange={(e) => setSelectedOpsValidator(e.target.value)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex-1 min-w-0 h-7 text-[11px] border border-surface-300 rounded px-1.5 py-0 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                                                    >
                                                                        <option value="">None (Remove)</option>
                                                                        {accountValidators.map(v => (
                                                                            <option key={v} value={v}>{v}</option>
                                                                        ))}
                                                                        {selectedOpsValidator && !accountValidators.includes(selectedOpsValidator) && (
                                                                            <option value={selectedOpsValidator}>{selectedOpsValidator}</option>
                                                                        )}
                                                                    </select>
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            await handleUpdateApplication(app.id, { assigned_ops_validator_name: selectedOpsValidator || null } as any);
                                                                            setEditingOpsValidatorAppId(null);
                                                                            toast.success('Updated', 'Ops Validator updated successfully');
                                                                        }}
                                                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded shrink-0 transition-colors"
                                                                        title="Save changes"
                                                                    >
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingOpsValidatorAppId(null);
                                                                        }}
                                                                        className="p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-50 rounded shrink-0 transition-colors"
                                                                        title="Cancel"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[13px] font-semibold text-surface-700 truncate">{app.assigned_ops_validator_name || 'Unassigned'}</p>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingOpsValidatorAppId(app.id);
                                                                    setSelectedOpsValidator(app.assigned_ops_validator_name || '');
                                                                }}
                                                                className="p-1 text-surface-300 hover:text-primary-600 hover:bg-primary-50 rounded opacity-0 group-hover/validator:opacity-100 transition-all shrink-0"
                                                                title="Edit Ops Validator"
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-surface-500 min-w-0">
                                                            <Mail size={13} className="shrink-0 text-surface-400" />
                                                            <span className="truncate" title={validatorEmail || 'No email found'}>
                                                                {validatorEmail || 'No email found'}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        <div className="pr-6 pl-2 py-4 flex flex-row flex-nowrap items-center justify-end gap-2 min-w-0">
                                            {activeTab === 'RESULTS' ? (() => {
                                                const effectiveStatus = (app.master_status && app.master_status.toUpperCase() !== 'OPEN' ? app.master_status : app.current_status) || '';
                                                const isPassed = ['PASSED', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'HIRED', 'FINAL_VERDICT', 'FOR_PAN', 'FOR PAN', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC', 'HIRED_PROCESSED'].includes(effectiveStatus.toUpperCase());
                                                const isReprofile = isReprofileApp(app);

                                                let text = "";
                                                let colorClass = "";

                                                if (isPassed && isReprofile) {
                                                    text = "Reprofile Passed";
                                                    colorClass = "bg-teal-50 text-teal-700 border border-teal-200";
                                                } else if (isPassed && !isReprofile) {
                                                    text = "Passed";
                                                    colorClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                                } else if (!isPassed && isReprofile) {
                                                    text = "Reprofile Failed";
                                                    colorClass = "bg-orange-50 text-orange-700 border border-orange-200";
                                                } else {
                                                    text = "Failed";
                                                    colorClass = "bg-red-50 text-red-700 border border-red-200";
                                                }

                                                return (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={cn("px-2.5 py-1 rounded text-[11px] font-semibold text-center whitespace-nowrap", colorClass)}>
                                                            {text}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFocusedApplicant(app);
                                                                setModalTab('scheduling');
                                                            }}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-md transition-all cursor-pointer shadow-2xs flex items-center gap-1 shrink-0 active:scale-95"
                                                            title="Reprofile candidate to a new account"
                                                        >
                                                            <ArrowRightLeft size={12} /> Reprofile
                                                        </button>
                                                    </div>
                                                );
                                            })() : (() => {
                                                let currentStatus = app.current_status || '';
                                                const depts = (app.department || '').toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
                                                const isAutoApprove = depts.includes('AUTO APPROVE');
                                                if (currentStatus === 'CLIENT_ASSESSMENT' && isAutoApprove) {
                                                    currentStatus = 'CLIENT_INTERVIEW';
                                                }

                                                const isSpecializedStatus = ['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'ENDORSEMENT'].includes(currentStatus);
                                                const isReprofileBtn = isReprofileApp(app) && activeTab === 'REPROFILE';

                                                let btnText = "";
                                                let icon = <CalendarCheck size={14} />;
                                                let bgClass = "bg-primary-600 hover:bg-primary-700 focus:ring-primary-500/20";
                                                let modalTarget = 'scheduling';

                                                if (isSpecializedStatus) {
                                                    btnText = currentStatus.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
                                                    bgClass = "bg-violet-600 hover:bg-violet-700 focus:ring-violet-500/20";
                                                    if (currentStatus === 'CLIENT_ASSESSMENT') modalTarget = 'client_assessment';
                                                    if (currentStatus === 'CLIENT_INTERVIEW') modalTarget = 'client_interview';
                                                    if (currentStatus === 'ENDORSEMENT') modalTarget = 'endorsement';
                                                } else if (isReprofileBtn) {
                                                    btnText = "Reprofile";
                                                    bgClass = "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/20";
                                                } else {
                                                    btnText = ((currentStatus === 'REJECTED' || currentStatus === 'FAILED') ? null : (app.endorsement_meeting_date || (app.pis as any)?.endorsement_meeting_date || app.metadata?.endorsement_meeting_date)) ? 'Reschedule' : 'Schedule';
                                                }

                                                return (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFocusedApplicant(app);
                                                            setModalTab(modalTarget as any);
                                                        }}
                                                        className={cn("px-4 py-1.5 text-white text-[12px] font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap outline-none focus:ring-2 focus:ring-offset-1 shrink-0", bgClass)}
                                                    >
                                                        {icon} {btnText}
                                                    </button>
                                                );
                                            })()}


                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setResumeManagerApp(app);
                                                }}
                                                className="p-2 text-surface-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors outline-none focus:ring-2 shrink-0"
                                                title="Manage Resume"
                                            >
                                                <FileText size={15} />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFocusedApplicant(app);
                                                }}
                                                className="p-2 text-surface-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors outline-none focus:ring-2 shrink-0"
                                                title="View PIS Form"
                                            >
                                                <User size={15} />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingApp(app);
                                                    const currentDepts = (app.department || '').split(',').map(s => s.trim()).filter(Boolean);
                                                    // Normalize to canonical department names (case-insensitive match)
                                                    const normalizedDepts = currentDepts.map(raw => {
                                                        const match = departments.find(d => d.name.trim().toLowerCase() === raw.toLowerCase());
                                                        return match ? match.name : raw;
                                                    });
                                                    setEditDepts(normalizedDepts);
                                                    setEditEndorser(app.assigned_recruiter_name || '');
                                                    setEditName(app.applicant_name || '');
                                                }}
                                                className="p-2 text-surface-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors outline-none focus:ring-2 shrink-0"
                                                title="Edit Details"
                                            >
                                                <Edit3 size={15} />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAppToDelete(app);
                                                }}
                                                className="p-2 text-surface-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors outline-none focus:ring-2 shrink-0"
                                                title="Delete Candidate"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Profile Viewer Overlay */}
            <AnimatePresence>
                {focusedApplicant && (
                    <DetailModalPortal
                        applicant={focusedApplicant}
                        onClose={() => setFocusedApplicant(null)}
                        modalTab={modalTab}
                        setModalTab={setModalTab}
                        getApplicantStatusRank={() => 4}
                        handlePromote={async (app, result, reason) => {
                            if (result === 'fail') {
                                const patch: any = {
                                    current_status: 'FAILED',
                                    pis: { ...app.pis, client_assessment_status: 'Failed', client_assessment_notes: reason }
                                };
                                await handleUpdateApplication(app.id, patch);
                                toast.error('Failed', 'Candidate failed client assessment.');
                                setModalTab('verdict');
                            }
                        }}
                        handleGiveGrade={(_app) => { }}
                        handleGiveClientAssessmentGrade={async (app) => {
                            await handleUpdateApplication(app.id, { current_status: 'CLIENT_INTERVIEW' } as any);
                            toast.success('Passed', 'Candidate passed client assessment.');
                            setModalTab('client_interview');
                        }}
                        handleGiveClientInterviewVerdict={async (app, result, reason) => {
                            const patch: any = { client_interview_remarks: clientInterviewRemarks };
                            if (result === 'pass') {
                                patch.current_status = 'FOR_JOB_OFFER';
                                toast.success('Passed', 'Candidate passed client interview!');
                            } else {
                                patch.current_status = 'FAILED';
                                patch.pis = { ...app.pis, client_interview_status: 'Failed', client_interview_notes: reason };
                                toast.error('Failed', 'Candidate failed client interview.');
                            }
                            await handleUpdateApplication(app.id, patch);
                            setModalTab('verdict');
                        }}
                        assessmentScore={assessmentScore}
                        setAssessmentScore={setAssessmentScore}
                        clientAssessmentScore={clientAssessmentScore}
                        setClientAssessmentScore={setClientAssessmentScore}
                        clientInterviewRemarks={clientInterviewRemarks}
                        setClientInterviewRemarks={setClientInterviewRemarks}
                        finalInterviewNotes={finalInterviewNotes}
                        setFinalInterviewNotes={setFinalInterviewNotes}
                        onQueue={(_app, _type) => { }}
                        onRegress={async (app) => {
                            const dept = (app.department || '').toUpperCase();
                            const metadata = app.metadata || {};
                            const isExplicitlyEndorsed = !!app.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
                            const isSpecialized = isExplicitlyEndorsed || reroutedAccounts.some(d => dept.includes(d));

                            let prevStatus: string | null = null;

                            if (app.current_status === 'TYPING_TEST') {
                                prevStatus = 'APPLIED';
                            } else if (app.current_status === 'INITIAL_INTERVIEW') {
                                prevStatus = 'TYPING_TEST';
                            } else if (app.current_status === 'QUEUE_ASSIGNED' || app.current_status === 'INTERVIEW_IN_PROGRESS') {
                                prevStatus = 'INITIAL_INTERVIEW';
                            } else if (app.current_status === 'ASSESSMENT') {
                                prevStatus = 'INITIAL_INTERVIEW';
                            } else if (app.current_status === 'FINAL_INTERVIEW_SCHEDULED') {
                                prevStatus = 'FINAL_INTERVIEW';
                            } else if (app.current_status === 'FINAL_INTERVIEW') {
                                prevStatus = 'ASSESSMENT';
                            } else if (app.current_status === 'CLIENT_ASSESSMENT') {
                                prevStatus = 'FINAL_INTERVIEW';
                            } else if (app.current_status === 'CLIENT_INTERVIEW') {
                                prevStatus = isSpecialized ? 'CLIENT_ASSESSMENT' : 'FINAL_INTERVIEW';
                            } else if (['FINAL_VERDICT', 'PASSED', 'FAILED', 'CONDITIONAL', 'WAITLISTED', 'HIRED', 'REJECTED', 'For Job Offer', 'FOR_JOB_OFFER', 'HIRED_PROCESSED', 'FOR PAN', 'OPEN', 'PENDING'].includes(app.current_status)) {
                                const finalSpecific = String(app.pis?.final_specific_status || app.metadata?.final_specific_status || (app as any).final_specific_status || '').toLowerCase();
                                const isClientInterviewFailed = finalSpecific.includes('client interview');
                                const isClientAssessmentFailed = finalSpecific.includes('client assessment');

                                if (isClientInterviewFailed) {
                                    prevStatus = 'CLIENT_INTERVIEW';
                                } else if (isClientAssessmentFailed) {
                                    prevStatus = 'CLIENT_ASSESSMENT';
                                } else if (isSpecialized) {
                                    prevStatus = 'CLIENT_INTERVIEW';
                                } else if (['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].some(d => dept.includes(d))) {
                                    prevStatus = 'CLIENT_INTERVIEW';
                                } else {
                                    prevStatus = 'FINAL_INTERVIEW';
                                }
                            } else if (app.current_status === 'WITHDRAWN') {
                                prevStatus = 'INITIAL_INTERVIEW';
                            } else {
                                prevStatus = 'FINAL_INTERVIEW';
                            }

                            if (!prevStatus) {
                                toast.error('Cannot Regress', 'No previous stage found for this status.');
                                return;
                            }

                            try {
                                const patch: any = { overall_status: 'OPEN' };
                                await ApplicationService.updateStatus({
                                    id: app.id,
                                    fromStatus: app.current_status,
                                    toStatus: prevStatus as ApplicationStatus,
                                    changedByName: user?.full_name || 'System (Regression)',
                                    reason: 'Undo Decision Protocol',
                                    patch
                                });

                                const backTabMap: Record<string, string> = {
                                    APPLIED: 'application',
                                    TYPING_TEST: 'typing',
                                    INITIAL_INTERVIEW: 'initial',
                                    ASSESSMENT: 'assessment',
                                    FINAL_INTERVIEW: 'endorsement',
                                    CLIENT_ASSESSMENT: 'client_assessment',
                                    CLIENT_INTERVIEW: 'client_interview'
                                };
                                setModalTab(backTabMap[prevStatus] as any || 'application');

                                const updated = await ApplicationService.getById(app.id);
                                if (updated) {
                                    setApplications(prev => prev.map(a => a.id === app.id ? updated : a));
                                    if (focusedApplicant?.id === app.id) {
                                        setFocusedApplicant(updated);
                                    }
                                }
                                toast.success('Regressed', `Applicant moved back to ${prevStatus.replace(/_/g, ' ')}`);
                            } catch (err) {
                                console.error('Regression failed:', err);
                                toast.error('Error', 'Failed to regress applicant stage.');
                            }
                        }}
                        onWithdraw={(_app) => { }}
                        validators={validators}
                        handleUpdateApplication={handleUpdateApplication}
                        onDelete={(_app) => { }}
                    />
                )}
            </AnimatePresence>

            {/* PIS Dashboard Modal */}
            <FullscreenProfileView
                open={!!pisApplicant}
                onClose={() => setFocusedApplicant(null)}
                applicant={pisApplicant!}
                pisOnly={false}
            />

            {rescheduleModalApp && (
                <RequestDetailModalPortal
                    applicant={rescheduleModalApp}
                    onClose={() => setRescheduleModalApp(null)}
                    modalTab={modalTab as 'application' | 'typing'}
                    setModalTab={setModalTab as any}
                    onAccept={() => { }}
                    onDecline={() => { }}
                    isRescheduleMode={true}
                    onComplyReschedule={() => handleComplyReschedule(rescheduleModalApp)}
                />
            )}

            {resumeManagerApp && (
                <ResumeManagerModal
                    applicant={resumeManagerApp}
                    onClose={() => setResumeManagerApp(null)}
                    handleUpdateApplication={async (id: string, patch: any) => {
                        try {
                            const { ApplicationService } = await import('@/services/ApplicationService');
                            await ApplicationService.patch(id, patch);
                            setResumeManagerApp(prev => prev ? { ...prev, ...patch } : null);
                            setApplications(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
                        } catch (e) {
                            console.error('Failed to update resume:', e);
                        }
                    }}
                />
            )}

            {/* Dedicated Warning Modal */}
            {showWarningModal && warningTargetApp && createPortal(
                <AnimatePresence>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        {/* Backdrop: no darkening, just blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowWarningModal(false);
                                setWarningTargetApp(null);
                            }}
                            className="absolute inset-0 bg-transparent backdrop-blur-md"
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ type: 'spring', duration: 0.4 }}
                            className="bg-white dark:bg-slate-900 border border-surface-200 shadow-2xl rounded-lg max-w-md w-full p-6 relative z-10 space-y-4"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-full shrink-0">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        Specialized Routing Check
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                        This candidate belongs to a <span className="font-extrabold text-slate-700 dark:text-slate-300">Recruiter S!</span> account (<span className="text-slate-800 dark:text-slate-200 font-black">{warningTargetApp.department}</span>).
                                        Standard scheduling protocols recommend that Recruiter S! handles this.
                                    </p>
                                    <p className="text-xs text-slate-400 font-semibold">
                                        Do you want to proceed anyway?
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        setShowWarningModal(false);
                                        setWarningTargetApp(null);
                                    }}
                                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-surface-205 text-surface-600 hover:bg-surface-50 text-[10px] font-black rounded-sm transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowWarningModal(false);
                                        if (warningTargetApp) {
                                            setFocusedApplicant(warningTargetApp);
                                            setModalTab('scheduling');
                                        }
                                        setWarningTargetApp(null);
                                    }}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-sm shadow-md transition-all cursor-pointer"
                                >
                                    Proceed
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>,
                document.body
            )}
            <ConfirmDialog
                open={!!appToDelete}
                title="Delete Candidate"
                message={`Are you sure you want to permanently delete candidate ${appToDelete?.applicant_name}? This action cannot be undone.`}
                confirmText="Delete"
                confirmClass="bg-red-600 hover:bg-red-700 text-white font-bold"
                onConfirm={() => appToDelete && handleDeleteApplication(appToDelete)}
                onClose={() => setAppToDelete(null)}
            />

            {/* Edit Candidate Details Modal */}
            {editingApp && (
                <ConfirmDialog
                    open={!!editingApp}
                    title="Edit Candidate Details"
                    confirmText="Save Changes"
                    confirmClass="bg-primary-600 hover:bg-primary-700 text-white font-bold"
                    onConfirm={async () => {
                        const patch: any = {
                            department: editDepts.join(', '),
                            applicant_name: editName.trim() || editingApp.applicant_name,
                            assigned_recruiter_name: editEndorser,
                            metadata: {
                                ...(editingApp.metadata || {}),
                                department: editDepts.join(', '),
                                initial_account_assignment: editDepts.join(', '),
                                endorsement_confirmed: true
                            },
                            pis: {
                                ...(editingApp.pis || {}),
                                department: editDepts.join(', '),
                                initial_account_assignment: editDepts.join(', '),
                                endorsement_confirmed: true
                            }
                        };
                        await handleUpdateApplication(editingApp.id, patch);
                        setEditingApp(null);
                    }}
                    onClose={() => setEditingApp(null)}
                >
                    <div className="space-y-5 py-2 text-left">
                        {/* Endorsed By / Assigned Recruiter */}
                        <div>
                            <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2">Endorsed By (Recruiter)</label>
                            <select
                                value={editEndorser}
                                onChange={e => setEditEndorser(e.target.value)}
                                className="w-full h-10 px-3 border border-surface-200 rounded-md text-[13px] font-medium text-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-900"
                            >
                                <option value="">Unassigned</option>
                                {allUsers
                                    .filter(u => u.role === 'recruiter' || u.role === 'admin' || u.role === 'recruiter_interviewer')
                                    .map(u => (
                                        <option key={u.id} value={u.full_name}>{u.full_name}</option>
                                    ))}
                            </select>
                        </div>

                        {/* Assigned Accounts */}
                        <div>
                            <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-2">Assigned Accounts (Select Multiple)</label>
                            <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto rounded-xl p-2 bg-surface-50/50 custom-scrollbar border border-surface-100 shadow-inner">
                                {(() => {
                                    const list: string[] = [];
                                    const sortedDepts = [...departments].sort((a, b) => a.name.localeCompare(b.name));
                                    sortedDepts.forEach(d => {
                                        if (d.type === 'SUPPORT_ROLES') return;
                                        if (!list.includes(d.name)) list.push(d.name);

                                        // Only show LOBs if this parent account is currently selected (either as generic or with a LOB)
                                        const isParentChecked = editDepts.some(ed =>
                                            ed.toLowerCase() === d.name.toLowerCase() ||
                                            ed.toLowerCase().startsWith(d.name.toLowerCase() + ' - ')
                                        );
                                        if (isParentChecked) {
                                            const subs = d.subAccounts || (d as any).sub_accounts || [];
                                            const sortedSubs = [...subs].map((s: any) => typeof s === 'string' ? s : s.name).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
                                            sortedSubs.forEach((subName: string) => {
                                                const combinedValue = `${d.name} - ${subName}`;
                                                if (!list.includes(combinedValue)) list.push(combinedValue);
                                            });
                                        }
                                    });

                                    return list.map(name => {
                                        const isChecked = editDepts.some(ed => ed.toLowerCase() === name.toLowerCase());
                                        const parentDepMatch = departments.find(d => {
                                            if (name.toLowerCase() === d.name.toLowerCase()) return true;
                                            return name.toLowerCase().startsWith(d.name.toLowerCase() + ' - ');
                                        });
                                        const isSub = !!parentDepMatch && name.toLowerCase() !== parentDepMatch.name.toLowerCase();
                                        const displayLabel = isSub ? name.substring(parentDepMatch!.name.length + 3) : name;

                                        return (
                                            <label
                                                key={name}
                                                className={cn(
                                                    "flex items-center gap-3 text-[13px] font-medium cursor-pointer p-3 rounded-xl border transition-all select-none group",
                                                    isChecked
                                                        ? "bg-blue-50/50 border-blue-500 text-blue-900 shadow-[0_2px_10px_-3px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/20"
                                                        : "bg-white dark:bg-slate-900 border-surface-200 text-surface-700 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm"
                                                )}
                                                style={isSub ? { marginLeft: '1rem', gridColumn: '1 / -1' } : {}}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            if (isSub && parentDepMatch) {
                                                                // When checking a LOB, remove the standalone generic parent account
                                                                setEditDepts([...editDepts.filter(ed => ed.toLowerCase() !== parentDepMatch.name.toLowerCase()), name]);
                                                            } else {
                                                                setEditDepts([...editDepts, name]);
                                                            }
                                                        } else {
                                                            if (!isSub) {
                                                                // If unchecking a parent account, also uncheck all its LOBs
                                                                setEditDepts(editDepts.filter(dName =>
                                                                    dName.toLowerCase() !== name.toLowerCase() &&
                                                                    !dName.toLowerCase().startsWith(name.toLowerCase() + ' - ')
                                                                ));
                                                            } else {
                                                                // Unchecking a LOB
                                                                const newDepts = editDepts.filter(dName => dName !== name);
                                                                // If no LOBs left for this parent, restore the generic parent so it doesn't disappear
                                                                const remainingLobs = newDepts.filter(dName => dName.toLowerCase().startsWith(parentDepMatch!.name.toLowerCase() + ' - '));
                                                                if (remainingLobs.length === 0) {
                                                                    setEditDepts([...newDepts, parentDepMatch!.name]);
                                                                } else {
                                                                    setEditDepts(newDepts);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    className="rounded-[4px] border-surface-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer transition-colors"
                                                />

                                                <div className={cn(
                                                    "flex items-center justify-center shrink-0 w-8 h-8 rounded-lg font-bold textxs shadow-sm transition-transform group-hover:scale-105",
                                                    isChecked ? "bg-blue-600 text-white" : "bg-surface-100 text-surface-600 border border-surface-200/60"
                                                )}>
                                                    {displayLabel.substring(0, 2).toUpperCase()}
                                                </div>

                                                <span className={cn(
                                                    "truncate tracking-tight",
                                                    isSub ? "text-slate-500 dark:text-slate-400 font-semibold" : "font-bold",
                                                    isChecked ? "text-blue-900" : "text-surface-700 group-hover:text-surface-900"
                                                )}>
                                                    {displayLabel}
                                                </span>
                                            </label>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </ConfirmDialog>
            )}
        </div>
    );
}
