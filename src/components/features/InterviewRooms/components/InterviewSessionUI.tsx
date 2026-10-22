import React from 'react';
import { Radio, Timer, Mic, Activity, XOctagon, Download, User, Headphones, Eye, CheckCircle2 } from 'lucide-react';
import { SecretGamesDashboardModal } from './SecretGamesDashboardModal';
import { cn } from '@/utils/formatters';
import type { Application, InterviewRoom, InterviewQuestion } from '@/types';

interface SessionHeaderProps {
    room?: InterviewRoom;
    isStarted: boolean;
    seconds: number;
    formatTime: (s: number) => string;
    interviewMode?: 'ONLINE' | 'ON-SITE';
    priorRecordingUrl?: string | null;
    viewOnlyMode?: boolean;
    onInitialize: () => void;
    onClose: () => void;
    onViewPIS?: () => void;
    saveStatus?: 'saved' | 'saving' | 'error' | null;
}

export const SessionHeader = React.memo(function SessionHeader({
    room, isStarted, seconds, formatTime, interviewMode, priorRecordingUrl, viewOnlyMode,
    onInitialize, onClose, onViewPIS, saveStatus
}: SessionHeaderProps) {
    const [secretGamesOpen, setSecretGamesOpen] = React.useState(false);

    return (
        <>
        <div className="min-h-14 py-3 xl:py-0 xl:h-14 shrink-0 bg-transparent text-surface-900  flex flex-col xl:flex-row xl:items-center justify-between px-6 border-b-2 border-surface-200  gap-3 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-left">
                <div className="flex items-center gap-2.5 sm:pr-5 sm:border-r border-surface-200 text-left">
                    <div 
                        className="w-7 h-7 bg-primary-700 text-white flex items-center justify-center rounded-sm shadow-sm text-left shrink-0 cursor-default"
                        onClick={() => setSecretGamesOpen(true)}
                    >
                        <Radio size={16} className={cn(isStarted && "animate-pulse")} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-xs font-extrabold text-surface-900  text-left truncate max-w-[120px] sm:max-w-none">{room?.room_name || 'Draft Session'}</h2>
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
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface-50  border-surface-200  rounded-sm text-left">
                        <Timer size={13} className={cn(isStarted ? "text-primary-700" : "text-surface-400")} />
                        <span className="text-xs font-black font-mono text-surface-900  text-left">{formatTime(seconds)}</span>
                    </div>
                    {isStarted && saveStatus && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-50  border-surface-200  rounded-sm text-[10px] font-bold uppercase tracking-wider select-none shrink-0 h-[26px]">
                            {saveStatus === 'saving' && (
                                <div className="flex items-center gap-1.5">
                                    <Activity size={12} className="text-primary-500 animate-pulse" />
                                    <span className="text-primary-700">Saving...</span>
                                </div>
                            )}
                            {saveStatus === 'saved' && (
                                <div className="flex items-center gap-1.5">
                                    <Download size={12} className="text-emerald-500" />
                                    <span className="text-emerald-700">Saved</span>
                                </div>
                            )}
                            {saveStatus === 'error' && (
                                <div className="flex items-center gap-1.5">
                                    <Activity size={12} className="text-rose-500" />
                                    <span className="text-rose-700">Error Saving</span>
                                </div>
                            )}
                        </div>
                    )}
                    {priorRecordingUrl && (
                        <div className="flex items-center gap-2.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-sm text-left shrink-0" title="Listen to the initial interview recording">
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
                {onViewPIS && (
                    <button onClick={onViewPIS} className="px-5 py-1.5 bg-surface-50  text-surface-900  border border-surface-200  text-xs font-extrabold rounded-sm hover:bg-surface-200 transition-all shadow-sm uppercase tracking-wider text-left mr-2">
                        View PIS
                    </button>
                )}
                {viewOnlyMode ? (
                    <div className="flex items-center gap-3.5 text-left">
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-sm text-[10px] font-extrabold text-amber-700 uppercase tracking-wider select-none">
                            <Eye size={12} /> Observing Session
                        </span>
                        <button onClick={onClose} className="px-4.5 py-1.5 bg-surface-900 hover:bg-black text-surface-900  text-xs font-extrabold rounded-sm transition-all shadow-sm uppercase tracking-wider text-left">
                            Close View
                        </button>
                    </div>
                ) : !isStarted && (
                    <button onClick={onInitialize} className="px-5 py-1.5 bg-primary-700 text-white text-xs font-extrabold rounded-sm hover:bg-primary-800 transition-all shadow-sm uppercase tracking-wider text-left">
                        Enter Room
                    </button>
                )}
                {!viewOnlyMode && (
                    <button
                        onClick={onClose}
                        disabled={saveStatus === 'saving'}
                        className={cn(
                            "p-1.5 text-surface-400 hover:text-rose-500 transition-colors ml-1 sm:ml-3 text-left",
                            saveStatus === 'saving' && "opacity-30 cursor-not-allowed pointer-events-none"
                        )}
                    >
                        <XOctagon size={20} />
                    </button>
                )}
            </div>
        </div>
        <SecretGamesDashboardModal open={secretGamesOpen} onClose={() => setSecretGamesOpen(false)} />
        </>
    );
});

interface QuestionCardProps {
    q: InterviewQuestion;
    globalIdx: number;
    score: any;
    observation: string;
    onScoreChange: (qId: string, val: any) => void;
    onObservationChange: (qId: string, val: string) => void;
    disabled?: boolean;
    showNotes?: boolean;
    onBlur?: () => void;
    saveStatus?: 'saved' | 'saving' | 'error' | null;
}

export const QuestionCard = React.memo(function QuestionCard({ q, globalIdx, score, observation, onScoreChange, onObservationChange, disabled, showNotes, onBlur, saveStatus }: QuestionCardProps) {
    const textRef = React.useRef<HTMLTextAreaElement>(null);
    const notesRef = React.useRef<HTMLTextAreaElement>(null);

    const [localObservation, setLocalObservation] = React.useState(observation || '');
    const [localTextScore, setLocalTextScore] = React.useState(score || '');

    React.useEffect(() => {
        setLocalObservation(observation || '');
    }, [observation]);

    React.useEffect(() => {
        if (q.answer_type === 'text') {
            setLocalTextScore(score || '');
        }
    }, [score, q.answer_type]);

    const adjustHeight = (el: HTMLTextAreaElement | null) => {
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    };

    React.useEffect(() => {
        if (q.answer_type === 'text') adjustHeight(textRef.current);
        if (showNotes) adjustHeight(notesRef.current);
    }, [localTextScore, localObservation, q.answer_type, showNotes]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (localObservation !== observation && localObservation !== (observation || '')) {
                onObservationChange(q.id, localObservation);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localObservation, observation, q.id, onObservationChange]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (q.answer_type === 'text' && localTextScore !== score && localTextScore !== (score || '')) {
                onScoreChange(q.id, localTextScore);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localTextScore, score, q.id, onScoreChange, q.answer_type]);

    const hasNotes = String(score || '').includes(' | Notes: ') || String(score || '').startsWith('Other:');
    const getNotesValue = () => {
        const str = String(score || '');
        if (str.includes(' | Notes: ')) return str.split(' | Notes: ')[1];
        if (str.startsWith('Other: ')) return str.replace('Other: ', '');
        return '';
    };

    const [otherClicked, setOtherClicked] = React.useState(() => hasNotes);
    const [otherValue, setOtherValue] = React.useState(() => getNotesValue());

    // Update state when score changes externally
    React.useEffect(() => {
        setOtherClicked(hasNotes);
        setOtherValue(getNotesValue());
    }, [score]);

    const isAnswered = score !== undefined || (observation && observation.trim().length > 0);

    return (
        <div className={cn("relative group p-6 bg-white dark:bg-slate-900  border border-surface-200  rounded-sm transition-all text-left", disabled ? "opacity-50 pointer-events-none select-none" : "hover:bg-surface-50  hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:border-primary-300")}>
            <div className="absolute top-0 left-0 w-[3px] h-full bg-surface-200 group-hover:bg-primary-600 transition-all rounded-l-sm text-left" />

            <div className="mb-5 text-left">
                <div className="flex items-center gap-2.5 mb-2.5 text-left">
                    <span className="text-[9px] font-extrabold text-primary-700 uppercase tracking-[0.15em] bg-primary-50 px-2.5 py-0.5 rounded-sm border border-primary-100 text-left flex items-center gap-1.5">
                        Question {globalIdx + 1}
                        {isAnswered && saveStatus === 'saved' && (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                        )}
                    </span>
                    <span className="text-[9px] font-bold text-surface-400 uppercase tracking-[0.15em] text-left">{q.answer_type.replace('_', ' ')}</span>
                </div>
                <h4 className="text-sm font-extrabold text-surface-900  leading-normal text-left">
                    {q.question_text}{q.is_required && <span className="text-rose-500 ml-2">*</span>}
                </h4>
                {q.instructions && (
                    <div className="mt-3 p-3 bg-surface-50  border-surface-200  rounded-sm text-[11px] text-surface-500 leading-relaxed font-semibold text-left border-l-[3px] border-surface-300">
                        {q.instructions}
                    </div>
                )}
            </div>

            <div className="space-y-5 text-left">
                {q.answer_type === 'rating' && (
                    <div className="flex flex-wrap gap-2 text-left">
                        {[...Array(q.max_rating || 5)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => onScoreChange(q.id, i + 1)}
                                disabled={disabled}
                                className={cn(
                                    "w-10 h-10 text-xs font-bold border-2 transition-all rounded-sm",
                                    score === i + 1
                                        ? "bg-primary-700 text-white border-primary-700 shadow-md shadow-primary-200"
                                        : "bg-surface-50  text-surface-500  border-surface-200  hover:bg-surface-100 hover:border-primary-400"
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
                                    className="force-white-field w-full bg-surface-50  border border-surface-200  px-4 py-2.5 text-sm font-semibold text-surface-500  rounded-sm text-left cursor-not-allowed"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3 text-left">
                                    {(q.options || []).map(opt => {
                                        const isSelected = opt.toLowerCase() === 'other'
                                            ? otherClicked
                                            : String(score || '').startsWith(opt);
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    if (opt.toLowerCase() === 'other') {
                                                        const nextState = !otherClicked;
                                                        setOtherClicked(nextState);
                                                        if (nextState) {
                                                            const currentChoice = (q.options || []).find(o => o.toLowerCase() !== 'other' && String(score || '').startsWith(o));
                                                            if (currentChoice) {
                                                                onScoreChange(q.id, `${currentChoice} | Notes: ${otherValue}`);
                                                            } else {
                                                                onScoreChange(q.id, `Other: ${otherValue}`);
                                                            }
                                                        } else {
                                                            setOtherValue('');
                                                            const currentChoice = (q.options || []).find(o => o.toLowerCase() !== 'other' && String(score || '').startsWith(o));
                                                            if (currentChoice) {
                                                                onScoreChange(q.id, currentChoice);
                                                            } else {
                                                                onScoreChange(q.id, '');
                                                            }
                                                        }
                                                    } else {
                                                        if (otherClicked) {
                                                            onScoreChange(q.id, `${opt} | Notes: ${otherValue}`);
                                                        } else {
                                                            onScoreChange(q.id, opt);
                                                        }
                                                    }
                                                }}
                                                disabled={disabled}
                                                className={cn(
                                                    "px-4 py-2.5 text-xs font-bold border-2 transition-all text-left",
                                                    isSelected
                                                        ? "bg-primary-700 text-white border-primary-700 shadow-md shadow-primary-200"
                                                        : "bg-surface-50  text-surface-500  border-surface-200  hover:bg-surface-100 hover:border-primary-400"
                                                )}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                                {otherClicked && (
                                    <div className="animate-fade-in-down text-left">
                                        <input
                                            type="text"
                                            placeholder="Please specify..."
                                            value={otherValue}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setOtherValue(val);
                                                const currentChoice = (q.options || []).find(o => o.toLowerCase() !== 'other' && String(score || '').startsWith(o));
                                                if (currentChoice) {
                                                    onScoreChange(q.id, `${currentChoice} | Notes: ${val}`);
                                                } else {
                                                    onScoreChange(q.id, `Other: ${val}`);
                                                }
                                            }}
                                            disabled={disabled}
                                            className="force-white-field w-full bg-surface-50  border-2 border-dashed border-primary-500 text-surface-900  px-4 py-2.5 text-sm font-semibold text-primary-700 focus:border-solid focus:outline-none transition-all rounded-sm text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
                                onClick={() => onScoreChange(q.id, opt)}
                                disabled={disabled}
                                className={cn(
                                    "flex-1 py-3 text-sm font-bold border-2 transition-all rounded-sm shadow-sm text-left",
                                    score === opt
                                        ? (opt.toLowerCase() === 'yes' || (q.options && opt === q.options[0]) ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" : "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100")
                                        : "bg-surface-50  text-surface-500  border-surface-200  hover:bg-surface-100"
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
                            onChange={(e) => onScoreChange(q.id, e.target.value)}
                            disabled={disabled}
                            className="force-white-field w-full bg-surface-50  border-2 border-surface-200  px-4 py-2.5 text-sm font-semibold text-surface-900  focus:border-primary-600 focus:outline-none transition-all rounded-sm cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                )}

                 {q.answer_type === 'text' && (
                    <div className="w-full text-left">
                        <textarea
                            ref={textRef}
                            value={localTextScore}
                            onChange={(e) => {
                                setLocalTextScore(e.target.value);
                                adjustHeight(e.target);
                            }}
                            onBlur={() => {
                                if (localTextScore !== score && localTextScore !== (score || '')) {
                                    onScoreChange(q.id, localTextScore);
                                }
                                if (onBlur) onBlur();
                            }}
                            disabled={disabled}
                            placeholder="Enter applicant response..."
                            className="force-white-field w-full min-h-[112px] bg-surface-50  border border-surface-200  rounded-sm p-4 text-sm font-semibold text-surface-900  placeholder:text-surface-500  focus:border-primary-600 focus:outline-none transition-all resize-none overflow-hidden leading-relaxed text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                )}

                {showNotes && (
                    <div className="mt-5 text-left border-t border-surface-200 pt-5">
                        <p className="text-[10px] font-extrabold text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Interviewer Notes
                        </p>
                        <textarea
                            ref={notesRef}
                            value={localObservation}
                            onChange={(e) => {
                                setLocalObservation(e.target.value);
                                adjustHeight(e.target);
                            }}
                            onBlur={() => {
                                if (localObservation !== observation && localObservation !== (observation || '')) {
                                    onObservationChange(q.id, localObservation);
                                }
                                if (onBlur) onBlur();
                            }}
                            disabled={disabled}
                            placeholder="Enter detailed notes or observations here..."
                            className="w-full min-h-[96px] bg-[#fffbfa] border border-orange-200 rounded-sm p-3.5 text-xs font-medium text-surface-800 placeholder:text-orange-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none overflow-hidden disabled:opacity-50"
                        />
                    </div>
                )}

            </div>
        </div>
    );
});
