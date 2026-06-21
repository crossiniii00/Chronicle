import React from 'react';
import { Radio, Timer, Mic, Activity, XOctagon, Download, User, Headphones, Eye } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application, InterviewRoom, InterviewQuestion } from '@/types';

interface SessionHeaderProps {
    room: InterviewRoom;
    isStarted: boolean;
    seconds: number;
    formatTime: (s: number) => string;
    interviewMode?: 'ONLINE' | 'ON-SITE';
    priorRecordingUrl?: string | null;
    viewOnlyMode?: boolean;
    onInitialize: () => void;
    onClose: () => void;
}

export function SessionHeader({
    room, isStarted, seconds, formatTime, interviewMode, priorRecordingUrl, viewOnlyMode,
    onInitialize, onClose
}: SessionHeaderProps) {
    return (
        <div className="min-h-14 py-3 xl:py-0 xl:h-14 shrink-0 bg-white text-surface-900 flex flex-col xl:flex-row xl:items-center justify-between px-6 border-b-2 border-surface-200 gap-3 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-left">
                <div className="flex items-center gap-2.5 sm:pr-5 sm:border-r border-surface-200 text-left">
                    <div className="w-7 h-7 bg-primary-700 text-white flex items-center justify-center rounded-sm shadow-sm text-left shrink-0">
                        <Radio size={16} className={cn(isStarted && "animate-pulse")} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-xs font-extrabold text-surface-900 text-left truncate max-w-[120px] sm:max-w-none">{room.room_name}</h2>
                        <div className="flex items-center gap-2 text-left">
                            <p className={cn(
                                "text-[9px] font-bold uppercase tracking-[0.15em] text-left",
                                interviewMode === 'ONLINE' ? "text-purple-700" : "text-primary-700"
                            )}>
                                {interviewMode === 'ONLINE' ? 'Online Interview' : interviewMode === 'ON-SITE' ? 'On-Site Interview' : 'Live Interview'}
                            </p>
                            {interviewMode && (
                                <span className={cn(
                                    "px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.15em] rounded-sm border",
                                    interviewMode === 'ONLINE' 
                                        ? "bg-purple-50 text-purple-700 border-purple-200" 
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                )}>
                                    {interviewMode}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-left">
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface-50 border border-surface-200 rounded-sm text-left">
                        <Timer size={13} className={cn(isStarted ? "text-primary-700" : "text-surface-400")} />
                        <span className="text-xs font-black font-mono text-surface-800 text-left">{formatTime(seconds)}</span>
                    </div>
                    {priorRecordingUrl && (
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-sm text-left" title="Listen to the initial interview recording">
                            <Headphones size={12} className="text-indigo-600 shrink-0" />
                            <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-[0.15em] text-left shrink-0">Initial</span>
                            <audio
                                src={priorRecordingUrl}
                                controls
                                preload="none"
                                className="h-6 max-w-[150px] sm:max-w-[200px] shrink"
                                style={{ filter: 'sepia(20%) saturate(150%) hue-rotate(190deg)' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-left">
                {viewOnlyMode ? (
                    <div className="flex items-center gap-3.5 text-left">
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-sm text-[10px] font-extrabold text-amber-700 uppercase tracking-wider select-none">
                            <Eye size={12} /> Observing Session
                        </span>
                        <button onClick={onClose} className="px-4.5 py-1.5 bg-surface-900 hover:bg-black text-white text-xs font-extrabold rounded-sm transition-all shadow-sm uppercase tracking-wider text-left">
                            Close View
                        </button>
                    </div>
                ) : !isStarted && (
                    <button onClick={onInitialize} className="px-5 py-1.5 bg-primary-700 text-white text-xs font-extrabold rounded-sm hover:bg-primary-800 transition-all shadow-sm uppercase tracking-wider text-left">
                        Enter Room
                    </button>
                )}
                {!viewOnlyMode && (
                    <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-rose-500 transition-colors ml-1 sm:ml-3 text-left">
                        <XOctagon size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}

interface QuestionCardProps {
    q: InterviewQuestion;
    globalIdx: number;
    score: any;
    observation: string;
    onScoreChange: (val: any) => void;
    onObservationChange: (val: string) => void;
    disabled?: boolean;
}

export function QuestionCard({ q, globalIdx, score, observation, onScoreChange, onObservationChange, disabled }: QuestionCardProps) {
    return (
        <div className={cn("relative group p-6 bg-[#fafafa] border border-surface-200 rounded-sm transition-all text-left", disabled ? "opacity-50 pointer-events-none select-none" : "hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:border-primary-300")}>
            <div className="absolute top-0 left-0 w-[3px] h-full bg-surface-200 group-hover:bg-primary-600 transition-all rounded-l-sm text-left" />

            <div className="mb-5 text-left">
                <div className="flex items-center gap-2.5 mb-2.5 text-left">
                    <span className="text-[9px] font-extrabold text-primary-700 uppercase tracking-[0.15em] bg-primary-50 px-2.5 py-0.5 rounded-sm border border-primary-100 text-left">Question {globalIdx + 1}</span>
                    <span className="text-[9px] font-bold text-surface-400 uppercase tracking-[0.15em] text-left">{q.answer_type.replace('_', ' ')}</span>
                </div>
                <h4 className="text-lg font-extrabold text-surface-900 tracking-tight leading-snug text-left">
                    {q.question_text}{q.is_required && <span className="text-rose-500 ml-2">*</span>}
                </h4>
                {q.instructions && (
                    <div className="mt-3 p-3 bg-primary-50/60 border-l-[3px] border-primary-600 rounded-r-sm text-xs text-surface-600 leading-relaxed italic whitespace-pre-wrap text-left">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-primary-700 mb-1 text-left">Guidelines</p>
                        {q.instructions}
                    </div>
                )}
            </div>

            <div className="space-y-5 text-left">
                {q.answer_type === 'rating' && (
                    <div className="flex flex-wrap gap-3 text-left">
                        {[...Array(q.max_rating || 5)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => onScoreChange(i + 1)}
                                disabled={disabled}
                                className={cn(
                                    "w-11 h-11 text-xs font-black transition-all border-2 rounded-sm text-left",
                                    score === i + 1
                                        ? "bg-primary-700 text-white border-primary-700 shadow-md shadow-primary-200 scale-110 z-10"
                                        : "bg-white text-surface-700 border-surface-200 hover:border-primary-500 hover:bg-surface-50 active:scale-95"
                                )}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}

                {q.answer_type === 'multiple_choice' && (
                    <div className="space-y-4 text-left">
                        {q.question_text.toLowerCase().includes('position applying') ? (
                            <div className="w-full text-left">
                                <input
                                    type="text"
                                    value={score ? String(score).replace('Other: ', '') : ''}
                                    disabled
                                    className="w-full bg-[#f3f4f6] border border-surface-300 px-4 py-2.5 text-sm font-semibold text-surface-700 rounded-sm text-left cursor-not-allowed"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3 text-left">
                                    {(q.options || []).map(opt => {
                                        const isSelected = String(score || '').startsWith(opt);
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => onScoreChange(opt.toLowerCase() === 'other' ? 'Other: ' : opt)}
                                                disabled={disabled}
                                                className={cn(
                                                    "px-4 py-2.5 text-xs font-bold border-2 transition-all text-left",
                                                    isSelected
                                                        ? "bg-primary-700 text-white border-primary-700 shadow-md shadow-primary-200"
                                                        : "bg-white text-surface-700 border-surface-300 hover:bg-surface-50 hover:border-primary-400"
                                                )}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                                {String(score || '').startsWith('Other') && (
                                    <div className="animate-fade-in-down text-left">
                                        <input
                                            type="text"
                                            placeholder="Please specify..."
                                            value={String(score || '').replace('Other: ', '')}
                                            onChange={(e) => onScoreChange(`Other: ${e.target.value}`)}
                                            disabled={disabled}
                                            className="w-full bg-white border-2 border-dashed border-primary-500 px-4 py-2.5 text-sm font-semibold text-primary-700 focus:border-solid focus:outline-none transition-all rounded-sm text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {q.answer_type === 'yes_no' && (
                    <div className="flex gap-4 text-left">
                        {(q.options && q.options.length >= 2 ? q.options : ['Yes', 'No']).map(opt => (
                            <button
                                key={opt}
                                onClick={() => onScoreChange(opt)}
                                disabled={disabled}
                                className={cn(
                                    "flex-1 py-3 text-sm font-bold border-2 transition-all rounded-sm shadow-sm text-left",
                                    score === opt
                                        ? (opt.toLowerCase() === 'yes' || (q.options && opt === q.options[0]) ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" : "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100")
                                        : "bg-white text-surface-700 border-surface-200 hover:bg-surface-50"
                                )}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}

                {q.answer_type === 'date' && (
                    <div className="max-w-xs text-left">
                        <input
                            type="date"
                            value={String(score || '')}
                            onChange={(e) => onScoreChange(e.target.value)}
                            disabled={disabled}
                            className="w-full bg-white border-2 border-surface-200 px-4 py-2.5 text-sm font-semibold text-surface-900 focus:border-primary-600 focus:outline-none transition-all rounded-sm cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                )}

                {q.answer_type === 'text' && (
                    <div className="w-full text-left">
                        <textarea
                            value={score || ''}
                            onChange={(e) => onScoreChange(e.target.value)}
                            disabled={disabled}
                            placeholder="Enter applicant response..."
                            className="w-full h-28 bg-white border border-surface-300 rounded-sm p-4 text-sm font-semibold text-surface-700 placeholder:text-surface-400 focus:border-primary-600 focus:outline-none transition-all resize-none leading-relaxed text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                )}

            </div>
        </div>
    );
}
