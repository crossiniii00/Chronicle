import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, FileOutput, Download, CheckCircle2, XCircle } from 'lucide-react';
import { cn, formatDate } from '@/utils/formatters';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Application } from '@/types/application';
import { PISExportTemplate } from '@/components/features/ApplicantManagement/PISExportTemplate';
import { ApplicationTab } from '../features/ApplicantManagement/DetailTabs/ApplicationTab';
import { TypingTab } from '../features/ApplicantManagement/DetailTabs/TypingTab';

type RequestModalTab = 'application' | 'typing';

interface RequestDetailModalPortalProps {
    applicant: Application;
    onClose: () => void;
    modalTab: RequestModalTab;
    setModalTab: (tab: RequestModalTab) => void;
    onAccept: () => void;
    onDecline: () => void;
}

export function RequestDetailModalPortal({
    applicant,
    onClose,
    modalTab,
    setModalTab,
    onAccept,
    onDecline,
}: RequestDetailModalPortalProps) {
    const [showPIS, setShowPIS] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

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

    const tabs: Array<{ id: RequestModalTab; label: string }> = [
        { id: 'application', label: 'Candidate Profile' },
        { id: 'typing', label: 'Typing Test' },
    ];

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
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-5xl bg-white shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden rounded-none flex flex-col max-h-[95vh] border border-surface-200 z-[110]"
            >
                {/* Header Information Area - Synchronized with Dashboard */}
                <div className="flex items-center justify-between px-10 py-6 border-b border-surface-100 bg-white">
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
                                <span className="w-1 h-1 bg-surface-200 rounded-full" />
                                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                    CAS: <span className="text-surface-700">{applicant.applicant_id || 'PENDING'}</span>
                                </p>
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
                            <button 
                                onClick={handleDownloadPDF} 
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-sm text-[10px] font-bold text-surface-700 uppercase tracking-widest hover:bg-surface-50 transition-all shadow-sm"
                            >
                                <Download size={14} className="text-primary-600" /> Export PIS
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-surface-50 text-surface-400 hover:text-surface-900 transition-all rounded-sm">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

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
                <div className="flex-1 overflow-y-auto px-10 py-10 bg-white">
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
                                    onQueue={(app) => {
                                        // Auto-accept then open queue?
                                        // For now, Requests view handles this via footer buttons.
                                        console.log('Queueing from requests', app);
                                    }}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer - Synchronized with Dashboard Actions */}
                <div className="px-10 py-5 bg-surface-50 border-t border-surface-100 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <p className="text-[10px] font-bold text-surface-400 tracking-wider uppercase">RecruitMS v1.0</p>
                        <div className="flex items-center gap-3">
                             <button
                                onClick={onDecline}
                                className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                            >
                                <XCircle size={12} />
                                Decline Application
                            </button>
                            <button
                                onClick={onAccept}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
                            >
                                <CheckCircle2 size={12} />
                                Accept Application
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {modalTab === 'application' && (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isExporting}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0078D4] text-white hover:bg-[#106EBE] text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-sm"
                            >
                                <FileOutput size={12} />
                                {isExporting ? 'Processing...' : 'Export PIS'}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-surface-200 text-surface-900 text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-surface-100 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Hidden Export Template */}
                <div className="fixed -left-[9999px] top-0 pointer-events-none">
                    <PISExportTemplate ref={exportRef} application={applicant} />
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
