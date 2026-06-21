import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Save, X, FileText, ClipboardList, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';

interface FullscreenInterviewFormProps {
    open: boolean;
    onClose: () => void;
    applicant: Application;
    questions: InterviewQuestion[];
    currentResponses: Record<string, string>;
    onUpdateResponse: (qId: string, value: string) => void;
    onApply: () => void;
}

export const FullscreenInterviewForm: React.FC<FullscreenInterviewFormProps> = ({
    open,
    onClose,
    applicant,
    questions,
    currentResponses,
    onUpdateResponse,
    onApply
}) => {
    const [localDraft, setLocalDraft] = useState<Record<string, string>>(currentResponses);

    const handleApply = () => {
        Object.entries(localDraft).forEach(([qId, value]) => {
            onUpdateResponse(qId, value);
        });
        if (localDraft.final_interview_notes !== undefined) {
            onUpdateResponse('pis_ops_validator_notes', localDraft.final_interview_notes);
        }
        onApply();
    };

    return (
        <Modal 
            open={open} 
            onClose={onClose} 
            title={`Interview Session: ${applicant.applicant_name}`}
            size="full"
            className="flex flex-col bg-[#f0f2f5]"
        >
            <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
                {/* PIS-MATCHED HEADER */}
                <div className="bg-white px-8 py-5 flex items-center justify-between shrink-0 border-b border-surface-200">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-primary-900 flex items-center justify-center text-white text-xl font-bold rounded-sm">
                            {applicant.applicant_name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-surface-900 leading-tight">{applicant.applicant_name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <FileText size={14} className="text-primary-600" />
                                <span className="text-[11px] font-medium text-surface-500">{applicant.position_title}</span>
                                <span className="text-surface-200 mx-1">•</span>
                                <span className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">CAS: {applicant.id.split('-')[0].toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="px-4 py-1.5 border border-[#107c10]/20 text-[#107c10] bg-[#107c10]/5 text-[10px] font-bold uppercase tracking-widest rounded-sm">
                            {applicant.current_status.replace('_', ' ')}
                        </span>
                        <div className="h-8 w-[1px] bg-surface-200 mx-2" />
                        <button
                            onClick={handleApply}
                            className="bg-[#0078d4] text-white px-8 py-2 text-[11px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#005a9e] transition-all"
                        >
                            Sync Changes
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-all rounded-sm"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* HIGH-DENSITY GRID CONTENT (EXACT PIS MATCH) */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    
                    {/* SECTION: INTERVIEW DATA GRID */}
                    <div className="bg-white border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                        <div className="bg-[#f0f6ff] px-6 py-3 flex items-center gap-3 border-b border-[#0078d4]/10">
                            <ClipboardList size={14} className="text-primary-600" />
                            <h3 className="text-[10px] font-bold text-primary-600 uppercase tracking-[0.15em]">INTERVIEW RESPONSES / Matrix Modules</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:border-b border-surface-100">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="p-6 border-r border-b border-surface-100 last:border-r-0">
                                    <label className="block text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-2 truncate">
                                        {q.question_text}
                                    </label>
                                    <textarea
                                        value={localDraft[q.id] || ''}
                                        onChange={(e) => setLocalDraft(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        placeholder="Pending..."
                                        className="w-full min-h-[50px] text-[12px] font-bold text-surface-900 bg-transparent border-none outline-none focus:ring-1 focus:ring-primary-600/10 rounded-sm p-0 placeholder:text-surface-200 placeholder:italic placeholder:font-normal resize-none leading-relaxed"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION: FINAL VERDICT */}
                    <div className="bg-white border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                        <div className="bg-[#fffafa] px-6 py-3 flex items-center gap-3 border-b border-[#d13438]/10">
                            <ShieldCheck size={14} className="text-[#d13438]" />
                            <h3 className="text-[10px] font-bold text-[#d13438] uppercase tracking-[0.15em]">JUSTIFICATION / Final Intelligence</h3>
                        </div>
                        <div className="p-6">
                            <label className="block text-[9px] font-bold text-surface-400 uppercase tracking-widest mb-2">
                                RECRUITMENT VERDICT SUMMARY
                            </label>
                            <textarea
                                value={localDraft.final_interview_notes || ''}
                                onChange={(e) => setLocalDraft(prev => ({ ...prev, final_interview_notes: e.target.value }))}
                                className="w-full min-h-[60px] text-[12px] font-bold text-surface-900 bg-transparent border-none outline-none p-0 placeholder:text-surface-200 placeholder:italic placeholder:font-normal resize-y leading-relaxed"
                                placeholder="Enter justification summary..."
                            />
                        </div>
                    </div>
                </div>

                {/* SIMPLE FOOTER */}
                <div className="bg-white border-t border-surface-200 px-8 py-4 flex items-center justify-between shrink-0">
                    <p className="text-[10px] font-medium text-surface-400 tracking-wider uppercase">RECRUITMS V1.0</p>
                    <div className="flex gap-3">
                        <button
                            onClick={handleApply}
                            className="bg-[#0078d4] text-white px-10 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#005a9e] transition-all"
                        >
                            Export Results
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-white border border-surface-300 text-surface-700 px-10 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-sm hover:bg-surface-50 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
