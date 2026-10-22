import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, FileOutput, Download, CheckCircle2, XCircle, Save, AlertCircle, CalendarCheck } from 'lucide-react';
import { cn, formatDate } from '@/utils/formatters';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Application } from '@/types/application';
import { PISExportTemplate } from '@/components/features/ApplicantManagement/PISExportTemplate';
import { CandidateDataExportTemplate } from '@/components/features/ApplicantManagement/CandidateDataExportTemplate';
import { ApplicationTab } from '../features/ApplicantManagement/DetailTabs/ApplicationTab';
import { TypingTab } from '../features/ApplicantManagement/DetailTabs/TypingTab';
import { ChevronDown, Loader2 } from 'lucide-react';

type RequestModalTab = 'application' | 'typing';

interface RequestDetailModalPortalProps {
    applicant: Application;
    onClose: () => void;
    modalTab: RequestModalTab;
    setModalTab: (tab: RequestModalTab) => void;
    onAccept?: (candidateType?: 'INTERNAL' | 'EXTERNAL' | 'NA') => void;
    onDecline?: (candidateType?: 'INTERNAL' | 'EXTERNAL' | 'NA') => void;
    isRescheduleMode?: boolean;
    onComplyReschedule?: () => void;
    handleUpdateApplication?: (id: string, patch: any) => void;
    duplicateApps?: Application[];
    onMerge?: (targetAppId: string) => void;
}

export function RequestDetailModalPortal({
    applicant,
    onClose,
    modalTab,
    setModalTab,
    onAccept,
    onDecline,
    isRescheduleMode = false,
    onComplyReschedule,
    handleUpdateApplication,
    duplicateApps,
    onMerge
}: RequestDetailModalPortalProps) {
    const [showPIS, setShowPIS] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isApplicationEditing, setIsApplicationEditing] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<'accept' | 'decline' | null>(null);
    const saveApplicationRef = useRef<(() => void) | undefined>(undefined);
    
    // Export state
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const pisExportRef = useRef<HTMLDivElement>(null);
    const candidateExportRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (exportMenuOpen && exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
                setExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [exportMenuOpen]);

    const handleConfirmAction = (candidateType: 'INTERNAL' | 'EXTERNAL' | 'NA') => {
        if (actionToConfirm === 'accept' && onAccept) {
            onAccept(candidateType);
        } else if (actionToConfirm === 'decline' && onDecline) {
            onDecline(candidateType);
        }
        setActionToConfirm(null);
    };

    const handleDownloadPDF = async (type: 'pis' | 'candidate') => {
        const targetRef = type === 'pis' ? pisExportRef : candidateExportRef;
        if (!targetRef.current) return;
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
            pdf.save(`${prefix}-${applicant.applicant_name.replace(/\s+/g, '_')}-${formatDate(new Date().toISOString())}.pdf`);
        } catch (error) {
            console.error('PDF Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const tabs: Array<{ id: RequestModalTab; label: string }> = [
        { id: 'application', label: 'Candidate Profile' },
        { id: 'typing', label: 'Typing Test' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-surface-950/20"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-5xl bg-white dark:bg-slate-900 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden rounded-none flex flex-col max-h-[95vh] border border-surface-200 z-[110]"
            >
                {/* Header Information Area - Synchronized with Dashboard */}
                <div className="flex items-center justify-between px-10 py-6 border-b border-surface-100 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-primary-600 rounded-sm flex items-center justify-center text-white shadow-sm ring-1 ring-primary-700/10 overflow-hidden shrink-0">
                            {applicant.pis?.photo_data_url ? (
                                <img
                                    src={applicant.pis.photo_data_url}
                                    alt={applicant.applicant_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <h2 className="text-xl font-bold">{applicant.applicant_name.charAt(0)}</h2>
                            )}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-surface-900 tracking-tight">
                                    {applicant.applicant_name}
                                </h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-xs font-semibold text-surface-500 flex items-center gap-2">
                                    <Briefcase size={12} className="text-primary-600" /> {applicant.position_title}
                                </p>
                                {applicant.metadata?.candidate_type && (
                                    <>
                                        <span className="w-1 h-1 bg-surface-200 rounded-full" />
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm ring-1 ring-inset",
                                            (applicant.metadata?.candidate_type || '').toLowerCase() === 'internal' ? "bg-indigo-50 text-indigo-700 ring-indigo-200" :
                                            (applicant.metadata?.candidate_type || '').toLowerCase() === 'external' ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                                            "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 ring-slate-200"
                                        )}>
                                            {applicant.metadata?.candidate_type}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right flex flex-col items-end gap-1.5">
                            <span className="px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border shadow-sm bg-primary-50 border-primary-200 text-primary-600">
                                NEW APPLICATION
                            </span>
                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                                Screening Phase
                            </p>
                        </div>
                        <div className="w-[1px] h-10 bg-surface-100" />
                        <div className="flex items-center gap-2">
                            {duplicateApps && duplicateApps.length > 0 && (
                                <div className="relative group">
                                    <button
                                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 border border-yellow-600 rounded-sm text-[10px] font-bold text-white uppercase tracking-widest hover:bg-yellow-600 transition-all shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse"
                                        title="This candidate seems to be a duplicate. Merge their recent test data into their ongoing application."
                                    >
                                        Merge Data
                                        <ChevronDown size={14} className="text-white" />
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-surface-200 shadow-xl rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100]">
                                        <div className="px-4 py-2 border-b border-surface-100 bg-surface-50 rounded-t-md">
                                            <p className="text-[10px] font-bold text-surface-700 uppercase tracking-wider">Merge into Application:</p>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {duplicateApps.map(dup => (
                                                <button
                                                    key={dup.id}
                                                    onClick={() => onMerge?.(dup.id)}
                                                    className="w-full text-left px-4 py-3 hover:bg-yellow-50 border-b border-surface-100 last:border-0 transition-colors"
                                                >
                                                    <p className="text-xs font-bold text-surface-900 truncate">{dup.position_title}</p>
                                                    <p className="text-[10px] font-semibold text-surface-500 mt-1 uppercase tracking-wider">{String(dup.current_status || '').replace(/_/g, ' ')}</p>
                                                    <p className="text-[9px] text-surface-400 mt-1 font-medium">{dup.created_at ? formatDate(dup.created_at) : ''}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => setIsApplicationEditing(!isApplicationEditing)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 border rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm",
                                    isApplicationEditing 
                                        ? "bg-primary-600 border-primary-700 text-white hover:bg-primary-700" 
                                        : "bg-white dark:bg-slate-900 border-surface-200 text-surface-700 hover:bg-surface-50"
                                )}
                            >
                                {isApplicationEditing ? (
                                    <>
                                        <Save size={14} /> Save Changes
                                    </>
                                ) : (
                                    <>
                                        <Briefcase size={14} className="text-primary-600" /> Edit PIS
                                    </>
                                )}
                            </button>
                            <div className="relative" ref={exportDropdownRef}>
                                <button 
                                    onClick={() => setExportMenuOpen(!exportMenuOpen)} 
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm text-[10px] font-bold text-surface-700 uppercase tracking-widest hover:bg-surface-50 transition-all shadow-sm"
                                >
                                    {isExporting ? <Loader2 size={14} className="text-primary-600 animate-spin" /> : <Download size={14} className="text-primary-600" />}
                                    {isExporting ? 'Exporting...' : 'Export'}
                                    <ChevronDown size={14} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {exportMenuOpen && (
                                    <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-surface-200 shadow-lg rounded-sm z-50 overflow-hidden">
                                        <button
                                            onClick={() => handleDownloadPDF('pis')}
                                            className="w-full text-left px-4 py-2 text-[10px] font-bold text-surface-700 uppercase tracking-widest hover:bg-surface-50 hover:text-primary-600 transition-colors"
                                        >
                                            PIS Form
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPDF('candidate')}
                                            className="w-full text-left px-4 py-2 text-[10px] font-bold text-surface-700 uppercase tracking-widest hover:bg-surface-50 hover:text-primary-600 transition-colors border-t border-surface-100"
                                        >
                                            Candidate Data
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-surface-50 text-surface-400 hover:text-surface-900 transition-all rounded-sm">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Optional Reschedule Banner */}
                {isRescheduleMode && (
                    <div className="bg-amber-50 border-b border-amber-200 px-10 py-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm uppercase tracking-wider">
                            <AlertCircle size={16} />
                            Reschedule Requested by Ops Validator
                        </div>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider">
                                Validator: {applicant.assigned_ops_validator_name || 'Unknown Validator'}
                            </p>
                            <div className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-md border border-amber-200/50 mt-1">
                                <p className="text-sm text-amber-900 whitespace-pre-wrap font-medium">
                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Reason for Reschedule:</span>
                                    {applicant.pis?.ops_validator_notes?.includes('INTERVIEWER ASSESSMENT RUBRIC') 
                                        ? 'Reschedule requested (No specific reason provided)' 
                                        : (applicant.pis?.ops_validator_notes || 'No specific reason provided.')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs Wrapper - Synchronized with Dashboard */}
                <div className="border-b border-surface-100 bg-surface-50/50 px-10">
                    <div className="flex gap-10">
                        {tabs.map((tab) => {
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setModalTab(tab.id)}
                                    className={cn(
                                        "py-4 text-xs font-semibold transition-all relative flex items-center",
                                        modalTab === tab.id 
                                            ? "text-primary-600" 
                                            : "text-surface-500 hover:text-surface-900",
                                        "group"
                                    )}
                                >
                                    {tab.label}
                                    {modalTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content - Using Modular Components */}
                <div className="flex-1 overflow-y-auto px-10 py-10 bg-white dark:bg-slate-900">
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
                                     saveTriggerRef={saveApplicationRef}
                                     onEditingStateChange={setIsApplicationEditing}
                                     isEditing={isApplicationEditing}
                                     handleUpdateApplication={handleUpdateApplication}
                                 />
                             )}

                            {modalTab === 'typing' && (
                                <TypingTab
                                    applicant={applicant}
                                    onQueue={(app) => {
                                        // Auto-accept then open queue?
                                        // For now, Requests view handles this via footer buttons.
                                    }}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer - Synchronized with Dashboard Actions */}
                <div className="px-10 py-5 bg-surface-50 border-t border-surface-100 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            {isRescheduleMode ? (
                                <button
                                    onClick={onComplyReschedule}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white hover:bg-amber-700 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                                >
                                    <CalendarCheck size={12} />
                                    Comply & Reschedule
                                </button>
                            ) : (
                                <>
                                    {onDecline && (
                                    <button
                                        onClick={() => setActionToConfirm('decline')}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                                    >
                                        <XCircle size={12} />
                                        Decline Application
                                    </button>
                                    )}
                                    {onAccept && (
                                    <button
                                        onClick={() => setActionToConfirm('accept')}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                                    >
                                        <CheckCircle2 size={12} />
                                        Accept Application
                                    </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {modalTab === 'application' && (
                            <button
                                onClick={() => saveApplicationRef.current?.()}
                                disabled={!isApplicationEditing}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0078D4] text-white hover:bg-[#106EBE] text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-sm cursor-pointer"
                            >
                                <Save size={12} />
                                Save
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 text-surface-900 text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-surface-100 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>


                {actionToConfirm && (
                    <div className="absolute inset-0 z-[120] bg-surface-950/20 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-6 w-full max-w-sm border border-surface-200">
                            <h3 className="text-lg font-bold text-surface-900 mb-2">
                                {actionToConfirm === 'accept' ? 'Accept Application' : 'Decline Application'}
                            </h3>
                            <p className="text-sm text-surface-500 mb-6">
                                Please select the candidate's hiring type before proceeding.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleConfirmAction('INTERNAL')}
                                    className="w-full flex items-center justify-between p-3 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                                >
                                    <span className="font-bold text-indigo-700">Internal Hire</span>
                                    <CheckCircle2 size={16} className="text-indigo-500" />
                                </button>
                                <button
                                    onClick={() => handleConfirmAction('EXTERNAL')}
                                    className="w-full flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                                >
                                    <span className="font-bold text-emerald-700">External Hire</span>
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                </button>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setActionToConfirm(null)}
                                    className="px-4 py-2 text-sm font-bold text-surface-500 hover:bg-surface-100 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="fixed -left-[9999px] top-0 pointer-events-none">
                    <PISExportTemplate ref={pisExportRef} application={applicant} />
                    <CandidateDataExportTemplate ref={candidateExportRef} application={applicant} />
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
