import React from 'react';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { Tag, ArrowUpRight, GitMerge, RefreshCw } from 'lucide-react';

interface TaggingTabProps {
    applicant: Application;
    onUpdate: (id: string, patch: any) => void;
}

export const TaggingTab: React.FC<TaggingTabProps> = ({ applicant, onUpdate }) => {
    const isPromotion = !!applicant.metadata?.is_promotion;
    const isLateral = !!applicant.metadata?.is_lateral_transfer;

    const setPromotion = () => {
        onUpdate(applicant.id, {
            metadata: {
                ...(applicant.metadata || {}),
                is_promotion: true,
                is_lateral_transfer: false
            }
        });
    };

    const setLateralTransfer = () => {
        onUpdate(applicant.id, {
            metadata: {
                ...(applicant.metadata || {}),
                is_promotion: false,
                is_lateral_transfer: true
            }
        });
    };

    const clearTags = () => {
        onUpdate(applicant.id, {
            metadata: {
                ...(applicant.metadata || {}),
                is_promotion: false,
                is_lateral_transfer: false
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8 pb-6 border-b border-surface-200">
                <h2 className="text-2xl font-black text-surface-900 tracking-tight uppercase flex items-center gap-3">
                    <Tag size={24} className="text-primary-600" />
                    Candidate Tagging
                </h2>
                <p className="text-xs text-surface-500 font-medium uppercase tracking-widest mt-2">
                    Apply specialized tags without altering the candidate's core process flow
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    onClick={setPromotion}
                    disabled={isPromotion}
                    className={cn(
                        "p-6 rounded-xl border text-left transition-all duration-200 group relative overflow-hidden",
                        isPromotion
                            ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500 ring-offset-2 cursor-default"
                            : "bg-white dark:bg-slate-900 border-surface-200 hover:border-blue-300 hover:shadow-md cursor-pointer"
                    )}
                >
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    isPromotion ? "bg-blue-100 text-blue-700" : "bg-surface-100 text-surface-600 group-hover:bg-blue-50 group-hover:text-blue-600"
                                )}>
                                    <ArrowUpRight size={20} />
                                </div>
                                <h3 className={cn(
                                    "font-black tracking-tight",
                                    isPromotion ? "text-blue-900" : "text-surface-900"
                                )}>FOR PROMOTION</h3>
                            </div>
                            <p className="text-[11px] font-medium text-surface-500 leading-relaxed max-w-xs">
                                Tag this candidate as applying for a promotion. They will continue their normal process.
                            </p>
                        </div>
                        {isPromotion && (
                            <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                Active Tag
                            </span>
                        )}
                    </div>
                </button>

                <button
                    onClick={setLateralTransfer}
                    disabled={isLateral}
                    className={cn(
                        "p-6 rounded-xl border text-left transition-all duration-200 group relative overflow-hidden",
                        isLateral
                            ? "bg-teal-50 border-teal-200 ring-2 ring-teal-500 ring-offset-2 cursor-default"
                            : "bg-white dark:bg-slate-900 border-surface-200 hover:border-teal-300 hover:shadow-md cursor-pointer"
                    )}
                >
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    isLateral ? "bg-teal-100 text-teal-700" : "bg-surface-100 text-surface-600 group-hover:bg-teal-50 group-hover:text-teal-600"
                                )}>
                                    <GitMerge size={20} />
                                </div>
                                <h3 className={cn(
                                    "font-black tracking-tight",
                                    isLateral ? "text-teal-900" : "text-surface-900"
                                )}>LATERAL TRANSFER</h3>
                            </div>
                            <p className="text-[11px] font-medium text-surface-500 leading-relaxed max-w-xs">
                                Tag this candidate as a lateral transfer. They will continue their normal process.
                            </p>
                        </div>
                        {isLateral && (
                            <span className="bg-teal-600 text-white text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                Active Tag
                            </span>
                        )}
                    </div>
                </button>
            </div>

            {(isPromotion || isLateral) && (
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={clearTags}
                        className="flex items-center gap-2 px-4 py-2 bg-surface-100 hover:bg-rose-50 text-surface-600 hover:text-rose-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                        <RefreshCw size={14} />
                        Clear Tags
                    </button>
                </div>
            )}
        </div>
    );
};
