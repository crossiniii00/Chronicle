import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Calendar } from 'lucide-react';
import { Application } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';
import { cn } from '@/utils/formatters';

interface AssessmentsTabProps {
    applicant: Application;
    handlePromote: (app: Application, result: 'pass' | 'fail', score?: number, remarks?: string, failedAccounts?: string[]) => void;
    onRegress: (app: Application) => void;
    isClient?: boolean;
    isStageTwo?: boolean;
    availableDepts?: string[];
}

export const AssessmentsTab: React.FC<AssessmentsTabProps> = ({ 
    applicant, 
    handlePromote, 
    onRegress,
    isClient = false,
    isStageTwo = false,
    availableDepts = []
}) => {
    const [scoreInput, setScoreInput] = useState('');
    const [remarksInput, setRemarksInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showReschedulePrompt, setShowReschedulePrompt] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [isRescheduling, setIsRescheduling] = useState(false);

    const scores = [
        { label: 'General Assessment', value: applicant.assessment_score, icon: FileText, max: 100 },
        { label: 'Client Assessment', value: applicant.client_assessment_score, icon: Target, max: 100 },
        { label: 'Leadership Score', value: applicant.leadership_score, icon: Award, max: 100 }
    ];

    const getScoreColor = (score?: number | string | null) => {
        if (!score) return 'text-[#a19f9d]';
        const num = Number(score);
        if (num >= 80) return 'text-[#107c10]'; // Green
        if (num >= 60) return 'text-[#d83b01]'; // Orange/Amber
        return 'text-[#a4262c]'; // Red
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in py-4 px-2">
            <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-[#0078d4]" />
                <h2 className="text-lg font-semibold text-[#323130] dark:text-slate-300">Assessments</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scores.map((score, idx) => {
                    const Icon = score.icon;
                    return (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-lg p-5 flex flex-col items-center justify-center text-center shadow-sm">
                            <Icon className="w-8 h-8 text-[#0078d4] mb-3 opacity-80" />
                            <div className="flex items-baseline gap-1">
                                <span className={cn("text-3xl font-bold", getScoreColor(score.value))}>
                                    {score.value || '-'}
                                </span>
                                {score.value && <span className="text-sm font-semibold text-[#605e5c] dark:text-slate-400">/ {score.max}</span>}
                            </div>
                            <span className="text-xs font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider mt-2">{score.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-lg p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[#323130] dark:text-slate-300 mb-1">Wonderlic Status</p>
                        <p className="text-xs text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Cognitive Ability Test</p>
                    </div>
                    <div className="text-right">
                        <span className={cn(
                            "px-3 py-1 text-sm font-bold rounded-full",
                            application.wonderlic_status === 'Passed' ? 'bg-[#dff6dd] text-[#107c10]' : 
                            application.wonderlic_status === 'Failed' ? 'bg-[#fde7e9] text-[#a4262c]' : 'bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400'
                        )}>
                            {application.wonderlic_status || 'Pending'}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-lg p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[#323130] dark:text-slate-300 mb-1">Leadership Status</p>
                        <p className="text-xs text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Management Potential</p>
                    </div>
                    <div className="text-right">
                        <span className={cn(
                            "px-3 py-1 text-sm font-bold rounded-full",
                            application.leadership_assessment_status === 'Passed' ? 'bg-[#dff6dd] text-[#107c10]' : 
                            application.leadership_assessment_status === 'Failed' ? 'bg-[#fde7e9] text-[#a4262c]' : 'bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400'
                        )}>
                            {application.leadership_assessment_status || 'Pending'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
