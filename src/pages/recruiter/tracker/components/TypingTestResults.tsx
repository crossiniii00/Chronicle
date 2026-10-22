import React, { useState, useEffect } from 'react';
import { Keyboard, Activity, Clock, Calendar, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { cn, formatDateTime } from '@/utils/formatters';
import { ApplicationService } from '@/services/ApplicationService';
import type { Application, TypingTestResult } from '@/types/application';

interface TypingTestResultsProps {
    application: Application;
    onEdit?: (appId: string, field: keyof Application, value: any) => void;
    readOnly?: boolean;
}

export function TypingTestResults({ application, onEdit, readOnly = false }: TypingTestResultsProps) {
    const [history, setHistory] = useState<TypingTestResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [editingField, setEditingField] = useState<'wpm' | 'accuracy' | null>(null);
    const [wpmInput, setWpmInput] = useState(String(application.typing_test_wpm || 0));
    const [accuracyInput, setAccuracyInput] = useState(String(application.typing_test_accuracy || 0));

    useEffect(() => {
        setWpmInput(String(application.typing_test_wpm || 0));
        setAccuracyInput(String(application.typing_test_accuracy || 0));
    }, [application.typing_test_wpm, application.typing_test_accuracy]);

    useEffect(() => {
        setIsLoading(true);
        ApplicationService.getTypingTestResults(application.id)
            .then(data => setHistory(data || []))
            .catch(err => console.error("Failed to load typing test history", err))
            .finally(() => setIsLoading(false));
    }, [application.id]);

    const bestWpm = application.typing_test_wpm || 0;
    const bestAccuracy = application.typing_test_accuracy || 0;
    
    return (
        <div className="flex flex-col gap-6 animate-fade-in py-4 px-2">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-[#0078d4]" />
                    <h2 className="text-lg font-semibold text-[#323130] dark:text-slate-300">Typing Test Results</h2>
                </div>
                {!readOnly && (
                    <button
                        onClick={() => {
                            setIsEditingMode(!isEditingMode);
                            if (isEditingMode) setEditingField(null);
                        }}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors shrink-0",
                            isEditingMode 
                                ? "bg-[#0078d4] text-white hover:bg-[#005a9e]" 
                                : "bg-white dark:bg-slate-900 border border-[#e1dfdd] text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1]"
                        )}
                    >
                        <Pencil size={12} className={cn(isEditingMode ? "text-blue-200" : "text-[#a19f9d]")} />
                        {isEditingMode ? 'Done Editing' : 'Edit Typing Test'}
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-lg p-5 flex flex-col items-center justify-center text-center shadow-sm">
                    <Activity className="w-8 h-8 text-[#0078d4] mb-3" />
                    {editingField === 'wpm' ? (
                        <input
                            autoFocus
                            type="text"
                            value={wpmInput}
                            onChange={e => setWpmInput(e.target.value)}
                            onBlur={() => {
                                if (onEdit) onEdit(application.id, 'typing_test_wpm', parseInt(wpmInput) || 0);
                                setEditingField(null);
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    if (onEdit) onEdit(application.id, 'typing_test_wpm', parseInt(wpmInput) || 0);
                                    setEditingField(null);
                                } else if (e.key === 'Escape') setEditingField(null);
                            }}
                            className="bg-white dark:bg-slate-900 text-[#323130] dark:text-slate-300 border border-[#0078d4] rounded px-2 py-0.5 text-3xl font-bold outline-none w-24 text-center mb-1"
                        />
                    ) : (
                        <div 
                            className={cn("flex items-center gap-1.5 group/score", (!readOnly && isEditingMode) && "cursor-pointer")}
                            onClick={() => (!readOnly && isEditingMode) && setEditingField('wpm')}
                        >
                            <span className="text-3xl font-bold text-[#323130] dark:text-slate-300">{bestWpm}</span>
                            {(!readOnly && isEditingMode) && <Pencil size={12} className="text-[#0078d4] opacity-0 group-hover/score:opacity-100 transition-opacity" />}
                        </div>
                    )}
                    <span className="text-xs font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider mt-1">Best WPM</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-lg p-5 flex flex-col items-center justify-center text-center shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-[#107c10] mb-3" />
                    {editingField === 'accuracy' ? (
                        <input
                            autoFocus
                            type="text"
                            value={accuracyInput}
                            onChange={e => setAccuracyInput(e.target.value)}
                            onBlur={() => {
                                if (onEdit) onEdit(application.id, 'typing_test_accuracy', parseInt(accuracyInput) || 0);
                                setEditingField(null);
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    if (onEdit) onEdit(application.id, 'typing_test_accuracy', parseInt(accuracyInput) || 0);
                                    setEditingField(null);
                                } else if (e.key === 'Escape') setEditingField(null);
                            }}
                            className="bg-white dark:bg-slate-900 text-[#323130] dark:text-slate-300 border border-[#107c10] rounded px-2 py-0.5 text-3xl font-bold outline-none w-24 text-center mb-1"
                        />
                    ) : (
                        <div 
                            className={cn("flex items-center gap-1.5 group/score", (!readOnly && isEditingMode) && "cursor-pointer")}
                            onClick={() => (!readOnly && isEditingMode) && setEditingField('accuracy')}
                        >
                            <span className="text-3xl font-bold text-[#323130] dark:text-slate-300">{bestAccuracy}%</span>
                            {(!readOnly && isEditingMode) && <Pencil size={12} className="text-[#107c10] opacity-0 group-hover/score:opacity-100 transition-opacity" />}
                        </div>
                    )}
                    <span className="text-xs font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider mt-1">Best Accuracy</span>
                </div>
            </div>

            <div className="mt-4">
                <h3 className="text-sm font-semibold text-[#323130] dark:text-slate-300 mb-3">Attempt History</h3>
                {isLoading ? (
                    <LoadingScreen message="LOADING TYPING TESTS..." />
                ) : history.length === 0 ? (
                    <div className="text-center bg-[#faf9f8] rounded border border-[#e1dfdd] py-8 flex flex-col items-center">
                        <AlertCircle className="w-6 h-6 text-[#a19f9d] mb-2" />
                        <span className="text-sm text-[#605e5c] dark:text-slate-400">No typing test attempts recorded yet.</span>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#faf9f8] text-[#605e5c] dark:text-slate-400 border-b border-[#e1dfdd]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Date & Time</th>
                                    <th className="px-4 py-3 font-semibold text-right">WPM</th>
                                    <th className="px-4 py-3 font-semibold text-right">Accuracy</th>
                                    <th className="px-4 py-3 font-semibold text-right">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e1dfdd]">
                                {history.map((attempt, idx) => (
                                    <tr key={idx} className="hover:bg-[#f3f2f1] transition-colors">
                                        <td className="px-4 py-3 text-[#323130] dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-[#a19f9d]" />
                                                {formatDateTime(attempt.completed_at)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-[#323130] dark:text-slate-300">
                                            {attempt.words_per_minute}
                                        </td>
                                        <td className="px-4 py-3 text-right text-[#323130] dark:text-slate-300">
                                            {attempt.accuracy_percent}%
                                        </td>
                                        <td className="px-4 py-3 text-right text-[#605e5c] dark:text-slate-400">
                                            {attempt.duration_seconds}s
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
