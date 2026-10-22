import React from 'react';
import { Application } from '@/types/application';
import { User, Copy, FileText, Activity } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

interface DuplicateReviewDashboardProps {
    primaryApp: Application;
    duplicateApp: Application;
    onMerge: (sourceApp: Application) => void;
    onCancel: () => void;
}

export function DuplicateReviewDashboard({
    primaryApp,
    duplicateApp,
    onMerge,
    onCancel
}: DuplicateReviewDashboardProps) {
    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col rounded-b-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-200 bg-surface-50 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-surface-900 flex items-center gap-2">
                        <Copy className="text-yellow-500" size={20} />
                        Review Duplicate Data
                    </h3>
                    <p className="text-xs text-surface-500 font-medium mt-1">
                        Compare data from the duplicate request and merge it into the ongoing application.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-[10px] font-bold text-surface-600 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm hover:bg-surface-50 transition-all uppercase tracking-widest shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onMerge(duplicateApp)}
                        className="px-4 py-2 text-[10px] font-bold text-white bg-yellow-500 border border-yellow-600 rounded-sm hover:bg-yellow-600 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse flex items-center gap-2"
                    >
                        <Activity size={12} />
                        Merge Data
                    </button>
                </div>
            </div>

            {/* Comparison Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Side - Primary App */}
                <div className="flex-1 border-r border-surface-200 bg-surface-50 p-6 overflow-y-auto">
                    <div className="mb-4 flex items-center gap-2 pb-2 border-b border-surface-200">
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Target</span>
                        <h4 className="text-sm font-black text-surface-900 uppercase tracking-widest">Ongoing Application</h4>
                    </div>
                    
                    <div className="space-y-6">
                        <DataCard title="Basic Info" icon={<User size={14} className="text-surface-400" />}>
                            <DataRow label="Name" value={primaryApp.applicant_name} />
                            <DataRow label="Email" value={primaryApp.applicant_email} />
                            <DataRow label="Position" value={primaryApp.position_title} />
                            <DataRow label="Stage" value={primaryApp.current_status} />
                            <DataRow label="Applied Date" value={formatDate(primaryApp.applied_at)} />
                        </DataCard>

                        <DataCard title="Typing Test" icon={<Activity size={14} className="text-surface-400" />}>
                            <DataRow label="WPM" value={primaryApp.typing_test_wpm ?? 'N/A'} />
                            <DataRow label="Accuracy" value={primaryApp.typing_test_accuracy ? `${primaryApp.typing_test_accuracy}%` : 'N/A'} />
                            <DataRow label="Completed" value={formatDate(primaryApp.typing_test_completed_at) || 'N/A'} />
                        </DataCard>

                        <DataCard title="Assessment" icon={<FileText size={14} className="text-surface-400" />}>
                            <DataRow label="Score" value={primaryApp.assessment_score ?? 'N/A'} />
                        </DataCard>

                        <DataCard title="Notes & Remarks" icon={<FileText size={14} className="text-surface-400" />}>
                            <div className="text-sm text-surface-700 whitespace-pre-wrap">
                                {primaryApp.interview_notes || 'No interview notes'}
                            </div>
                        </DataCard>
                    </div>
                </div>

                {/* Right Side - Duplicate Request */}
                <div className="flex-1 bg-white dark:bg-slate-900 p-6 overflow-y-auto relative">
                    <div className="absolute inset-0 bg-yellow-50/30 pointer-events-none" />
                    
                    <div className="mb-4 flex items-center gap-2 pb-2 border-b border-surface-200 relative z-10">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Source</span>
                        <h4 className="text-sm font-black text-surface-900 uppercase tracking-widest">Duplicate Request</h4>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <DataCard title="Basic Info" icon={<User size={14} className="text-yellow-500" />} highlightBorder>
                            <DataRow label="Name" value={duplicateApp.applicant_name} highlight={duplicateApp.applicant_name !== primaryApp.applicant_name} />
                            <DataRow label="Email" value={duplicateApp.applicant_email} highlight={duplicateApp.applicant_email !== primaryApp.applicant_email} />
                            <DataRow label="Position" value={duplicateApp.position_title} />
                            <DataRow label="Stage" value={duplicateApp.current_status} />
                            <DataRow label="Applied Date" value={formatDate(duplicateApp.applied_at)} />
                        </DataCard>

                        <DataCard title="Typing Test (Incoming)" icon={<Activity size={14} className="text-yellow-500" />} highlightBorder>
                            <DataRow label="WPM" value={duplicateApp.typing_test_wpm ?? 'N/A'} highlight={duplicateApp.typing_test_wpm != null && duplicateApp.typing_test_wpm !== primaryApp.typing_test_wpm} />
                            <DataRow label="Accuracy" value={duplicateApp.typing_test_accuracy ? `${duplicateApp.typing_test_accuracy}%` : 'N/A'} highlight={duplicateApp.typing_test_accuracy != null && duplicateApp.typing_test_accuracy !== primaryApp.typing_test_accuracy} />
                            <DataRow label="Completed" value={formatDate(duplicateApp.typing_test_completed_at) || 'N/A'} highlight={!!duplicateApp.typing_test_completed_at && duplicateApp.typing_test_completed_at !== primaryApp.typing_test_completed_at} />
                        </DataCard>

                        <DataCard title="Assessment (Incoming)" icon={<FileText size={14} className="text-yellow-500" />} highlightBorder>
                            <DataRow label="Score" value={duplicateApp.assessment_score ?? 'N/A'} highlight={duplicateApp.assessment_score != null && duplicateApp.assessment_score !== primaryApp.assessment_score} />
                        </DataCard>

                        <DataCard title="Incoming Notes" icon={<FileText size={14} className="text-yellow-500" />} highlightBorder>
                            <div className="text-sm text-surface-700 whitespace-pre-wrap bg-yellow-50/50 p-3 rounded-md border border-yellow-100">
                                {duplicateApp.interview_notes || 'No incoming notes'}
                            </div>
                        </DataCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DataCard({ title, children, icon, highlightBorder = false }: { title: string; children: React.ReactNode; icon?: React.ReactNode; highlightBorder?: boolean }) {
    return (
        <div className={`bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm transition-all ${highlightBorder ? 'border-2 border-yellow-200 hover:border-yellow-300' : 'border border-surface-200'}`}>
            <h5 className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3 pb-2 border-b border-surface-100 flex items-center gap-2">
                {icon}
                {title}
            </h5>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

function DataRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider shrink-0 mt-0.5">{label}</span>
            <span className={`text-sm font-medium text-right transition-colors ${highlight ? 'text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-md border border-yellow-200 shadow-sm' : 'text-surface-900'}`}>
                {value}
            </span>
        </div>
    );
}
