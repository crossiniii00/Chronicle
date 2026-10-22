import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Upload, Loader2 } from 'lucide-react';
import { Application } from '@/types/application';
import { useToast } from '@/components/common/useToast';
import { useAuthStore } from '@/store/authStore';

interface ResumeManagerModalProps {
    applicant: Application;
    onClose: () => void;
    handleUpdateApplication?: (id: string, patch: any) => Promise<any>;
}

export function ResumeManagerModal({ applicant, onClose, handleUpdateApplication }: ResumeManagerModalProps) {
    const toast = useToast();
    const { user } = useAuthStore();
    const isOpsValidator = user?.role === 'ops_validator';
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingResume, setIsUploadingResume] = useState(false);

    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingResume(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const dataUrl = event.target?.result as string;
                if (handleUpdateApplication) {
                    await handleUpdateApplication(applicant.id, {
                        resume_data: dataUrl,
                        resume_name: file.name
                    });
                    toast.success('Success', 'Resume updated successfully.');
                }
            } catch (err) {
                toast.error('Error', 'Failed to update resume.');
            } finally {
                setIsUploadingResume(false);
                onClose();
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-surface-200 bg-surface-50/50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-surface-900">Manage Resume</h3>
                    <button onClick={onClose} className="text-surface-400 hover:text-surface-700 transition-colors p-1 hover:bg-surface-200 rounded-md">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {(applicant.resume_name || applicant.resume_data || applicant.resume_path) ? (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-surface-700">Current Resume:</p>
                            <div className="flex items-center justify-between p-3 border border-surface-200 bg-surface-50 rounded-lg">
                                <div className="flex items-center gap-3 min-w-0">
                                    <FileText size={20} className="text-blue-500 shrink-0" />
                                    <span className="text-sm font-medium text-surface-900 truncate">{applicant.resume_name || 'Resume.pdf'}</span>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <a
                                        href={applicant.resume_data || `/api/applications/${applicant.id}/resume`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                                    >
                                        View
                                    </a>
                                    <a
                                        href={applicant.resume_data || `/api/applications/${applicant.id}/resume`}
                                        download={applicant.resume_name || "Resume.pdf"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                    >
                                        Download
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 border border-dashed border-surface-300 rounded-lg bg-surface-50 text-center flex flex-col items-center">
                            <FileText size={24} className="mx-auto text-surface-400 mb-2" />
                            {applicant.metadata?.resume_later ? (
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-amber-600">Resume Pending</p>
                                    <p className="text-xs text-surface-600">The candidate has opted to email or upload their resume at a later time.</p>
                                </div>
                            ) : (
                                <p className="text-sm text-surface-600">No resume attached to this application.</p>
                            )}
                        </div>
                    )}

                    {!isOpsValidator && (
                        <div className="pt-4 border-t border-surface-200">
                            <p className="text-sm font-semibold text-surface-700 mb-3">Upload New Resume:</p>
                            <input
                                type="file"
                                ref={resumeInputRef}
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                onChange={handleResumeUpload}
                            />
                            <button
                                onClick={() => resumeInputRef.current?.click()}
                                disabled={isUploadingResume}
                                className="w-full py-2.5 flex items-center justify-center gap-2 bg-white border border-surface-300 hover:border-primary-500 hover:bg-primary-50 text-surface-700 hover:text-primary-700 font-semibold text-sm rounded-lg transition-all shadow-sm disabled:opacity-50"
                            >
                                {isUploadingResume ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {isUploadingResume ? 'Uploading...' : 'Choose File to Upload'}
                            </button>
                            <p className="text-[11px] text-surface-400 text-center mt-2">Accepts .pdf, .doc, .docx (Max 5MB)</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
