import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, Calendar, Search, Mail, ExternalLink,
    Clock, User, Building2, Clipboard, Download, RefreshCw,
    Filter, ArrowUpDown, ChevronRight, Loader2, Sparkles, Briefcase
} from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { useAuthStore } from '@/store/authStore';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { useToast } from '@/components/common/useToast';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';
import * as XLSX from 'xlsx-js-style';
import { useApplicantManagement } from '../applicant-management/hooks/useApplicantManagement';
import { DetailModalPortal } from '@/components/common/DetailModalPortal';
import { ConfirmDialog } from '@/components/common/Modal';

export function PromotionView() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [accountFilter, setAccountFilter] = useState('ALL');
    const toast = useToast();
    const { user } = useAuthStore();
    const { getReroutedAccounts } = useAccountTypeSettings();
    const reroutedAccounts = getReroutedAccounts();

    // Leverage useApplicantManagement hook for modal details and handlers
    const {
        selectedApplicant, setSelectedApplicant,
        modalTab, setModalTab,
        getApplicantStatusRank,
        handlePromote,
        handleGiveGrade,
        handleGiveClientAssessmentGrade,
        handleGiveClientInterviewVerdict,
        assessmentScore, setAssessmentScore,
        clientAssessmentScore, setClientAssessmentScore,
        clientInterviewRemarks, setClientInterviewRemarks,
        finalInterviewNotes, setFinalInterviewNotes,
        handleQueue: onQueue, handleRegress: onRegress, handleWithdraw: onWithdraw,
        validators,
        handleUpdateApplication,
        promotionPromptApp, setPromotionPromptApp, confirmPromotion,
        refresh
    } = useApplicantManagement({ initialTab: 'ongoing' });

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const allApps = await ApplicationService.getAll();
            // Filter for apps in the promotion process
            const filtered = allApps.filter(app =>
                app.current_status === 'FOR_PAN' ||
                app.metadata?.is_promotion === true
            );
            setApplications(filtered);
        } catch (error) {
            console.error("Failed to load promotion applicants:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Sync updates when detail modal modifications are made
    const handleCloseModal = () => {
        setSelectedApplicant(null);
        loadData(true);
    };

    const departments = useMemo(() => {
        const set = new Set(applications.map(a => a.department).filter(Boolean));
        return Array.from(set).sort() as string[];
    }, [applications]);

    const filteredList = useMemo(() => {
        return applications.filter(app => {
            const matchesSearch =
                app.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
                app.applicant_email.toLowerCase().includes(search.toLowerCase()) ||
                (app.position_title || '').toLowerCase().includes(search.toLowerCase()) ||
                (app.department || '').toLowerCase().includes(search.toLowerCase());

            const matchesAccount = accountFilter === 'ALL' || app.department === accountFilter;

            return matchesSearch && matchesAccount;
        });
    }, [applications, search, accountFilter]);

    const handleSchedule = (e: React.MouseEvent, app: Application) => {
        e.stopPropagation();
        const subject = encodeURIComponent(`Interview Schedule: ${app.applicant_name} - ${app.department}`);
        const body = encodeURIComponent(`Hi ${app.applicant_name},\n\nWe would like to schedule your interview for the ${app.department} account.\n\nPlease let us know your availability.\n\nRegards,\n${user?.full_name || 'Recruitment Team'}`);
        const toEmail = app.applicant_name ? `${app.applicant_name} <${app.applicant_email}>` : app.applicant_email;
        const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(toEmail)}&subject=${subject}&body=${body}`;
        window.open(url, '_blank');

        // Update status if needed
        const patchData = { metadata: { ...app.metadata, is_scheduled_for_promotion: true } };
        ApplicationService.patch(app.id, patchData);
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, metadata: { ...a.metadata, is_scheduled_for_promotion: true } } : a));
        toast.success('Redirecting to Outlook Web', 'Opening interview schedule template in browser...');
    };

    const handleExportExcel = () => {
        if (filteredList.length === 0) return;
        const exportData = filteredList.map(app => ({
            'Name': app.applicant_name,
            'Email': app.applicant_email,
            'Position': app.position_title || '',
            'Target Account': app.department || '',
            'Active Promotion Stage': app.metadata?.promotion_current_status || app.current_status,
            'Typing WPM': app.typing_test_wpm || '',
            'Typing Accuracy': app.typing_test_accuracy ? `${app.typing_test_accuracy}%` : '',
            'Technical Assessment Score': app.assessment_score || '',
            'Client Assessment Score': app.client_assessment_score || '',
            'Routed On': new Date(app.updated_at).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Promotion Candidates');
        XLSX.writeFile(workbook, `PROMOTION_TRACKER_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Exported', 'Promotion candidates list saved as Excel.');
    };

    if (loading) {
        return <LoadingScreen message="LOADING PROMOTION TRACKER..." />;
    }

    return (
        <div className="h-full flex flex-col gap-4 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-surface-200">
                <div>
                    <div className="flex items-center gap-2 text-primary-600 text-[10px] font-black uppercase tracking-widest bg-primary-50 px-3 py-1 border border-primary-100 rounded-sm w-fit mb-2">
                        <CheckCircle2 size={12} /> Promotion Queue
                    </div>
                    <h1 className="text-2xl font-black text-surface-900 tracking-tight flex items-center gap-3 uppercase">
                        <Clipboard size={24} className="text-primary-600" /> Promotion Tracker
                    </h1>
                    <p className="text-[9px] font-bold text-surface-500 uppercase tracking-[0.2em] mt-1">
                        Active pipeline for {reroutedAccounts.map(a => a.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' & ')} Accounts
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Account Filter */}
                    <div className="flex items-center bg-white dark:bg-slate-900 border border-surface-200 px-3 py-2 shadow-sm">
                        <Filter size={14} className="text-surface-400 mr-2" />
                        <select
                            value={accountFilter}
                            onChange={(e) => setAccountFilter(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-surface-700 uppercase focus:outline-none outline-none border-none cursor-pointer"
                        >
                            <option value="ALL">All Accounts</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group min-w-[250px]">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="SEARCH PROMOTION PIPELINE..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 text-[11px] font-bold placeholder-surface-400 focus:border-primary-500 transition-all outline-none uppercase tracking-tight shadow-sm rounded-none"
                        />
                    </div>

                    {/* Excel Export */}
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all"
                        title="Export to Excel"
                    >
                        <Download size={14} /> Export
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={() => loadData()}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none hover:bg-surface-50 transition-colors shadow-sm"
                        title="Refresh List"
                    >
                        <RefreshCw size={14} className="text-surface-600" />
                    </button>
                </div>
            </div>

            {/* Spreadsheet Table View */}
            {filteredList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-surface-200 rounded-none p-20 text-center flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-surface-50 rounded-none flex items-center justify-center mx-auto mb-4">
                        <User size={32} className="text-surface-300" />
                    </div>
                    <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest">No Records Found</h3>
                    <p className="text-[10px] text-surface-500 mt-1 uppercase">No candidates matching the current filters are in the promotion process.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-auto border border-surface-200 bg-white dark:bg-slate-900">
                    <table className="w-full border-collapse text-left text-xs">
                        <thead>
                            <tr className="bg-[#fafafb] border-b border-surface-200 select-none">
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10">Name</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10">Target Account</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10">Position</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10">Promotion Stage</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10 text-center">Typing Speed</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10 text-center">Typing Accuracy</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10 text-center">Exam Score</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10 text-center">Client Score</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10">Routed Date</th>
                                <th className="sticky top-0 bg-[#fafafb] border-b border-surface-200 px-4 py-3 text-[9px] font-black uppercase tracking-wider text-surface-500 z-10 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {filteredList.map((app) => {
                                const stage = app.metadata?.promotion_current_status || app.current_status;
                                return (
                                    <tr
                                        key={app.id}
                                        onClick={() => setSelectedApplicant(app)}
                                        className="hover:bg-surface-50/80 transition-colors cursor-pointer group h-11"
                                    >
                                        {/* Name */}
                                        <td className="px-4 py-2 font-semibold text-surface-900 truncate max-w-[180px]">
                                            <div className="flex items-center gap-2">
                                                <span>{app.applicant_name}</span>
                                                {app.metadata?.is_promotion && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[hsla(217,91%,60%,0.08)] text-[hsl(217,91%,55%)] border border-[hsla(217,91%,60%,0.2)] shrink-0">
                                                        For promotion
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Target Account */}
                                        <td className="px-4 py-2 text-surface-600 font-medium">{app.department}</td>

                                        {/* Position */}
                                        <td className="px-4 py-2 text-surface-500 font-medium truncate max-w-[150px]">{app.position_title || 'N/A'}</td>

                                        {/* Stage */}
                                        <td className="px-4 py-2">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                                stage === 'TYPING_TEST' ? "bg-amber-50 border-amber-200 text-amber-700" :
                                                    stage === 'INITIAL_INTERVIEW' ? "bg-sky-50 border-sky-200 text-sky-700" :
                                                        stage === 'FINAL_INTERVIEW' ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                                                            stage === 'FINAL_INTERVIEW_SCHEDULED' ? "bg-blue-50 border-blue-200 text-blue-700" :
                                                                stage === 'CLIENT_ASSESSMENT' ? "bg-violet-50 border-violet-200 text-violet-700" :
                                                                    stage === 'CLIENT_INTERVIEW' ? "bg-purple-50 border-purple-200 text-purple-700" :
                                                                        stage === 'For Job Offer' || stage === 'FOR_JOB_OFFER' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                                                            "bg-surface-50 border-surface-200 text-surface-600"
                                            )}>
                                                {stage.replace(/_/g, ' ')}
                                            </span>
                                        </td>

                                        {/* Typing Speed */}
                                        <td className="px-4 py-2 text-center text-surface-900 tabular-nums">
                                            {app.typing_test_wpm !== undefined ? `${app.typing_test_wpm} WPM` : '—'}
                                        </td>

                                        {/* Typing Accuracy */}
                                        <td className="px-4 py-2 text-center text-surface-500 tabular-nums">
                                            {app.typing_test_accuracy !== undefined ? `${app.typing_test_accuracy}%` : '—'}
                                        </td>

                                        {/* Exam Score */}
                                        <td className="px-4 py-2 text-center font-bold text-surface-700 tabular-nums">
                                            {app.assessment_score !== undefined ? `${app.assessment_score}%` : '—'}
                                        </td>

                                        {/* Client Score */}
                                        <td className="px-4 py-2 text-center font-bold text-surface-700 tabular-nums">
                                            {app.client_assessment_score !== undefined ? `${app.client_assessment_score}%` : '—'}
                                        </td>

                                        {/* Routed Date */}
                                        <td className="px-4 py-2 text-surface-400 font-medium">
                                            {new Date(app.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-2 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => handleSchedule(e, app)}
                                                    className={cn(
                                                        "flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all",
                                                        app.metadata?.is_scheduled_for_promotion
                                                            ? "bg-surface-100 text-surface-400 cursor-default"
                                                            : "bg-primary-600 text-white hover:bg-primary-700"
                                                    )}
                                                    title={app.metadata?.is_scheduled_for_promotion ? 'Already Scheduled' : 'Schedule Interview via Outlook'}
                                                >
                                                    <Calendar size={12} />
                                                    {app.metadata?.is_scheduled_for_promotion ? 'Scheduled' : 'Schedule'}
                                                </button>
                                                <button
                                                    className="p-1.5 bg-white dark:bg-slate-900 border border-surface-200 hover:border-primary-600 hover:text-primary-600 transition-colors shadow-sm"
                                                    title="View Profile Details"
                                                >
                                                    <ExternalLink size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal Portal */}
            {selectedApplicant && (
                <DetailModalPortal
                    applicant={selectedApplicant}
                    onClose={handleCloseModal}
                    modalTab={modalTab}
                    setModalTab={setModalTab}
                    getApplicantStatusRank={getApplicantStatusRank}
                    handlePromote={handlePromote}
                    handleGiveGrade={handleGiveGrade}
                    handleGiveClientAssessmentGrade={handleGiveClientAssessmentGrade}
                    handleGiveClientInterviewVerdict={handleGiveClientInterviewVerdict}
                    assessmentScore={assessmentScore}
                    setAssessmentScore={setAssessmentScore}
                    clientAssessmentScore={clientAssessmentScore}
                    setClientAssessmentScore={setClientAssessmentScore}
                    clientInterviewRemarks={clientInterviewRemarks}
                    setClientInterviewRemarks={setClientInterviewRemarks}
                    finalInterviewNotes={finalInterviewNotes}
                    setFinalInterviewNotes={setFinalInterviewNotes}
                    onQueue={onQueue}
                    onRegress={onRegress}
                    onWithdraw={onWithdraw}
                    validators={validators}
                    handleUpdateApplication={handleUpdateApplication}
                    onDelete={(app) => {
                        setSelectedApplicant(null);
                        loadData(true);
                    }}
                />
            )}

            {/* Promotion Confirmation Pop-up Warning */}
            {promotionPromptApp && (
                <ConfirmDialog
                    open={!!promotionPromptApp}
                    title="Candidate Promotion Process"
                    message={`Candidate ${promotionPromptApp.applicant_name} is for promotion, proceed with the promotion process? This will reset all evaluation data and restart them at the typing test stage.`}
                    confirmText="Proceed with Promotion"
                    confirmClass="bg-blue-600 hover:bg-blue-700 text-white"
                    onConfirm={() => {
                        if (promotionPromptApp) {
                            confirmPromotion(promotionPromptApp);
                        }
                    }}
                    onClose={() => setPromotionPromptApp(null)}
                />
            )}
        </div>
    );
}
