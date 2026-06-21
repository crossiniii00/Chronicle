import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Search, Clock,
    User, Building2, Loader2,
    CalendarCheck, AlertCircle, CheckCircle2,
    Send, ExternalLink, Target, Users, Mail,
    Info, ChevronRight, Globe
} from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { UserService } from '@/services/UserService';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { useAuthStore } from '@/store/authStore';
import { Application } from '@/types/application';
import type { User as UserType } from '@/types/user';
import { cn } from '@/utils/formatters';
import { useToast } from '@/components/common/useToast';
import { DetailModalPortal } from '@/components/common/DetailModalPortal';
import { apiClient } from '@/utils/apiClient';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';

type ModalTab = 'application' | 'typing' | 'initial' | 'assessment' | 'endorsement' | 'scheduling' | 'client_assessment' | 'client_interview' | 'verdict';

export function SchedulingView() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'REROUTED' | 'REQUESTS' | 'REPROFILE' | 'PENDING' | 'ACTIVE'>('REROUTED');
    const [focusedApplicant, setFocusedApplicant] = useState<Application | null>(null);
    const [modalTab, setModalTab] = useState<ModalTab>('application');
    const [validators, setValidators] = useState<UserType[]>([]);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningTargetApp, setWarningTargetApp] = useState<Application | null>(null);

    const toast = useToast();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { getReroutedAccounts } = useAccountTypeSettings();
    const reroutedAccounts = getReroutedAccounts();

    const isReprofileApp = (app: Application) => {
        const history = app.pis?.reprofile_history || app.metadata?.reprofile_history || [];
        const hasHistory = Array.isArray(history) && history.length > 0;
        const hasReprofileFlag = app.metadata?.is_reprofiled === true || app.metadata?.is_reprofiled === 'true';
        return hasHistory || hasReprofileFlag;
    };

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
            const candidates = allApps.filter(app =>
                app.endorsed_to_recruiter_s === true ||
                (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && app.recruiter_s_scheduling_status) ||
                ['ENDORSED', 'FINAL_INTERVIEW_SCHEDULED'].includes(app.current_status || '') ||
                (app.current_status === 'FINAL_INTERVIEW' && app.department)
            );
            setApplications(candidates);
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
            || validators.find(validator => validator.full_name.trim().toLowerCase() === assignedName);
    };

    const getValidatorEmail = (app: Application) => {
        return getValidatorForApplication(app)?.email || app.pis?.ops_validator_email || '';
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredList = useMemo(() => {
        return applications.filter(app => {
            const matchesSearch = app.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
                app.applicant_email.toLowerCase().includes(search.toLowerCase()) ||
                (app.department || '').toLowerCase().includes(search.toLowerCase());

            const depts = (app.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const failedAccounts = app.metadata?.failed_accounts || [];
            const remainingAccounts = depts.filter(d => !failedAccounts.some((f: string) => f.trim().toLowerCase() === d));

            // If no accounts are remaining (i.e. all failed), they are fully rejected/failed and shouldn't show in scheduling
            if (remainingAccounts.length === 0) return false;

            const isSpecialAccount = reroutedAccounts.some(sa => 
                (app.department || '').toLowerCase().includes(sa)
            ) || app.endorsed_to_recruiter_s === true || app.metadata?.endorsed_to_recruiter_s === true || app.metadata?.endorsed_to_recruiter_s === 'true';

            const isReprofile = isReprofileApp(app);
            const isRescheduleRequest = app.pis?.final_specific_status === 'OV - Reschedule' && !isReprofile;
            const isRerouted = app.recruiter_s_scheduling_status === 'RECEIVED' && !isRescheduleRequest && !isReprofile && isSpecialAccount;
            const hasMeetingDate = !!app.endorsement_meeting_date;
            const isActive = (app.recruiter_s_scheduling_status === 'SCHEDULED' || (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && hasMeetingDate)) && !isRescheduleRequest && !isReprofile;
            const isPending = !isActive && !isRerouted && (app.recruiter_s_scheduling_status === 'PENDING' || app.current_status === 'FINAL_INTERVIEW' || (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && !hasMeetingDate)) && !isRescheduleRequest && !isReprofile;

            const matchesTab = (activeTab === 'REQUESTS' && isRescheduleRequest) || 
                               (activeTab === 'REROUTED' && isRerouted) || 
                               (activeTab === 'PENDING' && isPending) || 
                               (activeTab === 'ACTIVE' && isActive) ||
                               (activeTab === 'REPROFILE' && isReprofile);

            return matchesSearch && matchesTab;
        });
    }, [applications, search, activeTab]);

    const tabCounts = useMemo(() => {
        const counts = { REROUTED: 0, REQUESTS: 0, REPROFILE: 0, PENDING: 0, ACTIVE: 0 };
        applications.forEach(app => {
            const depts = (app.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const failedAccounts = app.metadata?.failed_accounts || [];
            const remainingAccounts = depts.filter(d => !failedAccounts.some((f: string) => f.trim().toLowerCase() === d));
            if (remainingAccounts.length === 0) return;

            const isSpecialAccount = reroutedAccounts.some(sa => 
                (app.department || '').toLowerCase().includes(sa)
            ) || app.endorsed_to_recruiter_s === true || app.metadata?.endorsed_to_recruiter_s === true || app.metadata?.endorsed_to_recruiter_s === 'true';

            const isReprofile = isReprofileApp(app);
            const isRescheduleRequest = app.pis?.final_specific_status === 'OV - Reschedule' && !isReprofile;
            const isRerouted = app.recruiter_s_scheduling_status === 'RECEIVED' && !isRescheduleRequest && !isReprofile && isSpecialAccount;
            const hasMeetingDate = !!app.endorsement_meeting_date;
            const isActive = (app.recruiter_s_scheduling_status === 'SCHEDULED' || (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && hasMeetingDate)) && !isRescheduleRequest && !isReprofile;
            const isPending = !isActive && !isRerouted && (app.recruiter_s_scheduling_status === 'PENDING' || app.current_status === 'FINAL_INTERVIEW' || (app.current_status === 'FINAL_INTERVIEW_SCHEDULED' && !hasMeetingDate)) && !isRescheduleRequest && !isReprofile;

            if (isRescheduleRequest) counts.REQUESTS++;
            else if (isRerouted) counts.REROUTED++;
            else if (isReprofile) counts.REPROFILE++;
            else if (isPending) counts.PENDING++;
            else if (isActive) counts.ACTIVE++;
        });
        return counts;
    }, [applications]);

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
        <div className="space-y-4 w-full animate-fade-in -mt-4">
            {/* Centered Header */}
            <div className="bg-white border-b border-surface-200 py-8 px-8 flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-primary-600 text-[10px] font-bold uppercase tracking-widest bg-primary-50 px-2 py-0.5 border border-primary-100 rounded-sm">
                        <Globe size={12} /> Ops Validator
                    </div>
                    <h1
                        className="text-[32px] leading-none text-surface-900 tracking-[-0.02em] mt-1"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                    >
                        Scheduling Hub
                    </h1>
                    <p className="text-[12px] font-medium text-surface-400 tracking-[0.04em] uppercase">
                        Manage pending schedules and active bookings
                    </p>
                </div>

                {/* Centered Action Controls */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-2 w-full max-w-4xl">
                    {/* Custom Tab Switcher */}
                    <div className="flex items-center gap-1 p-1 bg-surface-100/50 rounded-lg border border-surface-200/50 shadow-2xs">
                        <button
                            onClick={() => setActiveTab('REROUTED')}
                            className={cn(
                                "px-6 py-1.5 text-[11px] font-bold transition-all rounded-md flex items-center gap-2 cursor-pointer",
                                activeTab === 'REROUTED'
                                    ? "bg-white text-blue-600 shadow-sm border border-surface-200"
                                    : "text-surface-500 hover:text-surface-700"
                            )}
                        >
                            <Users size={14} /> Rerouted
                            {tabCounts.REROUTED > 0 && (
                                <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                                    {tabCounts.REROUTED}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('REQUESTS')}
                            className={cn(
                                "px-6 py-1.5 text-[11px] font-bold transition-all rounded-md flex items-center gap-2 cursor-pointer",
                                activeTab === 'REQUESTS'
                                    ? "bg-white text-blue-600 shadow-sm border border-surface-200"
                                    : "text-surface-500 hover:text-surface-700"
                            )}
                        >
                            <Clock size={14} /> Requests
                            {tabCounts.REQUESTS > 0 && (
                                <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                                    {tabCounts.REQUESTS}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('REPROFILE')}
                            className={cn(
                                "px-6 py-1.5 text-[11px] font-bold transition-all rounded-md flex items-center gap-2 cursor-pointer",
                                activeTab === 'REPROFILE'
                                    ? "bg-white text-purple-600 shadow-sm border border-surface-200"
                                    : "text-surface-500 hover:text-surface-700"
                            )}
                        >
                            <Target size={14} /> Reprofile
                            {tabCounts.REPROFILE > 0 && (
                                <span className="w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                                    {tabCounts.REPROFILE}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('PENDING')}
                            className={cn(
                                "px-6 py-1.5 text-[11px] font-bold transition-all rounded-md flex items-center gap-2 cursor-pointer",
                                activeTab === 'PENDING'
                                    ? "bg-white text-primary-600 shadow-sm border border-surface-200"
                                    : "text-surface-500 hover:text-surface-700"
                            )}
                        >
                            <AlertCircle size={14} /> Pending
                            {tabCounts.PENDING > 0 && (
                                <span className="w-4 h-4 bg-primary-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                                    {tabCounts.PENDING}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('ACTIVE')}
                            className={cn(
                                "px-6 py-1.5 text-[11px] font-bold transition-all rounded-md flex items-center gap-2 cursor-pointer",
                                activeTab === 'ACTIVE'
                                    ? "bg-white text-emerald-600 shadow-sm border border-surface-200"
                                    : "text-surface-500 hover:text-surface-700"
                            )}
                        >
                            <CheckCircle2 size={14} /> Active
                            {tabCounts.ACTIVE > 0 && (
                                <span className="w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                                    {tabCounts.ACTIVE}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search Input & Refresh */}
                    <div className="flex items-center gap-2 min-w-[320px]">
                        <div className="relative group flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                            <input
                                type="text"
                                placeholder="Search candidate or account..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-surface-200 text-xs font-medium placeholder-surface-400 focus:border-primary-500 transition-all outline-none shadow-sm rounded-md"
                            />
                        </div>

                        <button
                            onClick={() => loadData()}
                            className="p-2 bg-white border border-surface-200 rounded-md hover:bg-surface-50 transition-colors shadow-sm cursor-pointer"
                        >
                            <Clock size={16} className="text-surface-600" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid Layout */}
            {filteredList.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-surface-200 rounded-sm p-32 text-center">
                    <div className="w-20 h-20 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        {activeTab === 'PENDING' ? <AlertCircle size={40} className="text-surface-300" /> : <CheckCircle2 size={40} className="text-surface-300" />}
                    </div>
                    <h3 className="text-sm font-black text-surface-900 uppercase tracking-[0.2em]">No {activeTab.toLowerCase()} records</h3>
                    <p className="text-[10px] text-surface-500 mt-2 uppercase tracking-widest font-bold">Synchronize the registry or check the other tab.</p>
                </div>
            ) : (
                <div className="bg-white border border-surface-200 rounded-md shadow-sm overflow-hidden">
                    <div className={cn(
                        "hidden xl:grid gap-4 px-5 py-3 bg-surface-50 border-b border-surface-100",
                        (activeTab === 'PENDING' || activeTab === 'REQUESTS')
                            ? "grid-cols-[minmax(260px,1.35fr)_160px_160px_230px]"
                            : "grid-cols-[minmax(260px,1.35fr)_160px_minmax(240px,1fr)_160px_230px]"
                    )}>
                        {((activeTab === 'PENDING' || activeTab === 'REQUESTS')
                            ? ['Candidate', 'Account', 'Schedule', 'Actions']
                            : ['Candidate', 'Account', 'Ops Validator', 'Schedule', 'Actions']
                        ).map(label => (
                            <p key={label} className="text-[10px] font-black text-surface-400 uppercase tracking-[0.16em]">
                                {label}
                            </p>
                        ))}
                    </div>
 
                    <div className="divide-y divide-surface-100">
                        <AnimatePresence mode="popLayout">
                            {filteredList.map((app) => {
                                const validatorEmail = getValidatorEmail(app);
                                const statusLabel = 
                                    activeTab === 'PENDING' ? 'Awaiting Schedule' :
                                    activeTab === 'REROUTED' ? 'Rerouted' :
                                    activeTab === 'REQUESTS' ? 'Reschedule Requested' :
                                    activeTab === 'REPROFILE' ? (app.recruiter_s_scheduling_status === 'SCHEDULED' ? 'Scheduled' : 'Awaiting Schedule') :
                                    'Scheduled';
 
                                return (
                                    <motion.div
                                        key={app.id}
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className={cn(
                                            "grid grid-cols-1 gap-4 px-5 py-4 items-center hover:bg-primary-50/30 transition-colors",
                                            (activeTab === 'PENDING' || activeTab === 'REQUESTS')
                                                ? "xl:grid-cols-[minmax(260px,1.35fr)_160px_160px_230px]"
                                                : "xl:grid-cols-[minmax(260px,1.35fr)_160px_minmax(240px,1fr)_160px_230px]"
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-md bg-primary-50 border border-primary-100 text-primary-700 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {app.pis?.photo_data_url ? (
                                                        <img
                                                            src={app.pis.photo_data_url}
                                                            alt={app.applicant_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <User size={17} />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-black text-surface-955 truncate">
                                                        {app.applicant_name}
                                                    </h4>
                                                    <p className="text-[11px] font-semibold text-surface-500 truncate">
                                                        {app.position_title || 'Candidate'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
 
                                                    <div className="min-w-0 flex flex-wrap gap-1.5 items-center">
                                                        <p className="xl:hidden text-[9px] font-black text-surface-400 uppercase tracking-[0.16em] mb-1">Account</p>
                                                        {(app.department || 'General').split(',').map(s => s.trim()).filter(Boolean).map((deptName, idx) => {
                                                            const matchingDep = departments.find(d => d.name.trim().toLowerCase() === deptName.toLowerCase());
                                                            const displayName = matchingDep ? matchingDep.name : deptName.toUpperCase();
                                                            const failedAccounts = app.metadata?.failed_accounts || [];
                                                            const isFailed = failedAccounts.some((f: string) => f.trim().toLowerCase() === deptName.toLowerCase());
                                                            const isEndorsed = activeTab !== 'PENDING' && (app.endorsement_account
                                                                ? app.endorsement_account.trim().toLowerCase() === deptName.toLowerCase()
                                                                : idx === 0);
                                                            const isReprofiledAcc = (app.metadata?.is_reprofiled === true || app.metadata?.is_reprofiled === 'true') &&
                                                                deptName.toLowerCase() === (app.pis?.initial_account_assignment || app.metadata?.initial_account_assignment || '').toLowerCase();
                                                            return (
                                                                <span 
                                                                    key={deptName} 
                                                                    className={cn(
                                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-50 border border-surface-200 text-[10px] font-bold text-surface-700 uppercase tracking-wide rounded-full shadow-2xs relative",
                                                                        isFailed && "opacity-60 bg-red-50/50 border-red-200 text-red-750",
                                                                        isEndorsed && "border-emerald-300 bg-emerald-50 text-emerald-800"
                                                                    )}
                                                                >
                                                                    {isEndorsed && (
                                                                        <CheckCircle2 size={10} className="text-emerald-600 shrink-0" strokeWidth={3} />
                                                                    )}
                                                                    {isReprofiledAcc && (
                                                                         <span 
                                                                             className="text-[10px] text-blue-600 font-black shrink-0 select-none mr-0.5 animate-pulse"
                                                                             style={{ 
                                                                                 textShadow: '0 0 8px rgba(37, 99, 235, 0.95), 0 0 16px rgba(37, 99, 235, 0.45)', 
                                                                                 filter: 'drop-shadow(0 0 1px rgba(37, 99, 235, 0.65))' 
                                                                             }}
                                                                             title="Original account assignment (Not Reprofile)"
                                                                         >
                                                                             @
                                                                         </span>
                                                                     )}
                                                                    <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 border border-surface-200 bg-white">
                                                                        {matchingDep && (matchingDep.accountImageUrl || matchingDep.accountImageData) ? (
                                                                            <img 
                                                                                src={matchingDep.accountImageUrl || matchingDep.accountImageData || ''} 
                                                                                alt={displayName} 
                                                                                className="w-full h-full object-cover" 
                                                                                />
                                                                        ) : (
                                                                            <img src="/contactpoint-logo.png?v=2" alt="Logo" className="w-full h-full object-contain p-0.5" />
                                                                        )}
                                                                    </div>
                                                                    <span className="truncate max-w-[95px]">{displayName}</span>
                                                                    {isFailed && (
                                                                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                                                                            <line x1="-5%" y1="-5%" x2="105%" y2="105%" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                                                                            <line x1="105%" y1="-5%" x2="-5%" y2="105%" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                                                                        </svg>
                                                                    )}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
 
                                                    {activeTab !== 'PENDING' && activeTab !== 'REQUESTS' && (
                                                        <div className="min-w-0 space-y-1">
                                                            <p className="xl:hidden text-[9px] font-black text-surface-400 uppercase tracking-[0.16em]">Ops Validator</p>
                                                            <p className="text-xs font-black text-surface-800 truncate">{app.assigned_ops_validator_name || 'Unassigned'}</p>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-surface-500 min-w-0">
                                                                <Mail size={12} className="shrink-0 text-surface-400" />
                                                                <span className="truncate" title={validatorEmail || 'No email found'}>
                                                                    {validatorEmail || 'No email found'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
 
                                                    <div className="min-w-0">
                                                        <p className="xl:hidden text-[9px] font-black text-surface-400 uppercase tracking-[0.16em] mb-1">Schedule</p>
                                                        <div className="flex items-center gap-2 text-xs font-black text-primary-700 whitespace-nowrap">
                                                            <Calendar size={14} className="shrink-0" />
                                                            {app.endorsement_meeting_date ? new Date(app.endorsement_meeting_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set'}
                                                        </div>
                                                        <span className={cn(
                                                            "mt-1 inline-flex px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider border",
                                                            activeTab === 'PENDING'
                                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                : activeTab === 'REROUTED'
                                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                    : activeTab === 'REQUESTS'
                                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                        : activeTab === 'REPROFILE'
                                                                            ? (app.recruiter_s_scheduling_status === 'SCHEDULED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-purple-50 text-purple-700 border-purple-200")
                                                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        )}>
                                                            {statusLabel}
                                                        </span>
                                                    </div>
 
                                        <div className="flex items-center gap-2 justify-start xl:justify-end">
                                            {(activeTab === 'PENDING' || activeTab === 'REQUESTS' || activeTab === 'REROUTED' || (activeTab === 'REPROFILE' && app.recruiter_s_scheduling_status !== 'SCHEDULED')) ? (
                                                <button
                                                    onClick={() => {
                                                        setFocusedApplicant(app);
                                                        setModalTab('scheduling');
                                                    }}
                                                    className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-sm transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Send size={13} /> Schedule
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setFocusedApplicant(app);
                                                            setModalTab('scheduling');
                                                        }}
                                                        className="h-9 px-4 bg-primary-600 text-white text-[10px] font-black rounded-sm hover:bg-primary-700 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                                                    >
                                                        <Calendar size={13} /> Reschedule
                                                    </button>
                                                    <button
                                                        onClick={() => handleRevertToPending(app)}
                                                        className="h-9 px-4 bg-white border border-surface-200 text-surface-600 text-[10px] font-black rounded-sm hover:bg-surface-50 transition-all active:scale-95 flex items-center gap-2"
                                                    >
                                                        <Clock size={13} /> Revert
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                onClick={() => {
                                                    setFocusedApplicant(app);
                                                    setModalTab('scheduling');
                                                }}
                                                className="h-9 w-9 bg-white border border-surface-200 rounded-sm text-surface-400 hover:text-primary-600 hover:border-primary-600 transition-all active:scale-95 flex items-center justify-center"
                                                title="View Details"
                                            >
                                                <ExternalLink size={15} />
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
                        handlePromote={(_app, _result, _reason?) => { }}
                        handleGiveGrade={(_app) => { }}
                        handleGiveClientAssessmentGrade={(_app) => { }}
                        handleGiveClientInterviewVerdict={(_app, _result, _reason?) => { }}
                        assessmentScore=""
                        setAssessmentScore={(_score) => { }}
                        clientAssessmentScore=""
                        setClientAssessmentScore={(_score) => { }}
                        clientInterviewRemarks=""
                        setClientInterviewRemarks={(_remarks) => { }}
                        finalInterviewNotes=""
                        setFinalInterviewNotes={(_notes) => { }}
                        onQueue={(_app, _type) => { }}
                        onRegress={(_app) => { }}
                        onWithdraw={(_app) => { }}
                        validators={validators}
                        handleUpdateApplication={handleUpdateApplication}
                        onRouteToSpecialized={async (_app, _name) => { }}
                        onDelete={(_app) => { }}
                    />
                )}
            </AnimatePresence>

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
                            className="bg-white border border-surface-200 shadow-2xl rounded-lg max-w-md w-full p-6 relative z-10 space-y-4"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-full shrink-0">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                                        Specialized Routing Check
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                                        This candidate belongs to a <span className="font-extrabold text-slate-700">Recruiter S!</span> account (<span className="text-slate-800 font-black">{warningTargetApp.department}</span>). 
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
                                    className="px-4 py-2 bg-white border border-surface-205 text-surface-600 hover:bg-surface-50 text-[10px] font-black rounded-sm transition-all cursor-pointer"
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
        </div>
    );
}
