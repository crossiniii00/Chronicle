import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, XOctagon, Download, CheckCircle2, XCircle, Clock, ChevronRight, Lock, Mic } from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { QueueService } from '@/services/QueueService';
import { useRoomStore } from '@/store/roomStore';
import { useToast } from '@/components/common/useToast';
import { useLoading } from '@/components/common/useLoading';
import { ConfirmDialog, Modal } from '@/components/common/Modal';
import { cn } from '@/utils/formatters';
import type { Application, InterviewRoom, InterviewQuestion } from '@/types';
import { useInterviewSession } from './hooks/useInterviewSession';
import { useAuthStore } from '@/store/authStore';
import { SessionHeader, QuestionCard } from './components/InterviewSessionUI';
import { MedicalIndicator } from '@/components/common/MedicalIndicator';
import { AlertTriangle, Sparkles, Shield } from 'lucide-react';
import { UserService } from '@/services/UserService';
import type { User } from '@/types/user';
import { FinalInterviewTab } from '../ApplicantManagement/DetailTabs/FinalInterviewTab';

interface InterviewSessionProps {
    roomId: string;
    rooms: InterviewRoom[];
    applications: Application[];
    onClose: () => void;
    onComplete: (summary: any) => void;
}

interface VerdictButtonProps {
    active: boolean;
    missing: boolean;
    disabled: boolean;
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
    activeBg: string;
    baseBg: string;
    hoverBg: string;
    ringColor: string;
    chevron: React.ReactNode;
}

function VerdictButton({ active, missing, disabled, onClick, label, icon, activeBg, baseBg, hoverBg, ringColor, chevron }: VerdictButtonProps) {
    // Continuous "breathe" pulse when the button is idle (not active) to draw the eye
    // in. The pulse is more aggressive when validation has flagged the section as
    // "missing" — a quick double-pulse + tremor to make the requirement obvious.
    const breathe = active
        ? { scale: 1.03, opacity: 1 }
        : missing
            ? { scale: [1, 1.04, 1, 1.04, 1], opacity: [0.85, 1, 0.85, 1, 0.85] }
            : { scale: [1, 1.015, 1], opacity: [0.78, 1, 0.78] };

    const transition = active
        ? { type: 'spring' as const, stiffness: 380, damping: 22 }
        : missing
            ? { duration: 0.6, ease: 'easeInOut' as const }
            : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const };

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            animate={breathe}
            transition={transition}
            whileHover={!disabled ? { scale: 1.035, opacity: 1 } : {}}
            whileTap={!disabled ? { scale: 0.97 } : {}}
            className={cn(
                "relative w-full flex items-center justify-between px-3 py-2.5 text-white rounded-sm overflow-hidden text-left border border-white/10 group",
                "shadow-[0_1px_3px_rgba(0,0,0,0.1)]",
                active ? "ring-2 ring-offset-1" : "",
                disabled ? "opacity-30 cursor-not-allowed select-none pointer-events-none" : ""
            )}
            style={{
                backgroundColor: active ? activeBg : (disabled ? '#a19f9d' : baseBg),
                // @ts-ignore - CSS custom prop
                '--ring': ringColor,
                boxShadow: active
                    ? `0 0 0 2px ${ringColor}, 0 0 18px -2px ${ringColor}80, 0 6px 14px -4px ${activeBg}cc`
                    : missing
                        ? `0 0 0 2px #ef4444, 0 0 16px -2px #ef444488`
                        : '0 1px 3px rgba(0,0,0,0.1)',
            } as React.CSSProperties}
        >
            {/* Diagonal shimmer sweep on hover/active */}
            <motion.div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.32) 50%, transparent 70%)',
                }}
                animate={{ x: active ? ['-100%', '220%'] : ['-100%', '-100%'] }}
                transition={active
                    ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }
                    : { duration: 0 }
                }
            />
            {/* Diagonal sheen base layer for depth */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 55%, rgba(0,0,0,0.18) 100%)' }}
            />
            {/* Missing-verdict pulsing rose border glow (only when missing & not active) */}
            {!active && missing && (
                <motion.div
                    aria-hidden
                    className="absolute inset-0 rounded-sm pointer-events-none"
                    style={{ boxShadow: 'inset 0 0 0 1px #ef4444' }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            <div className="relative z-10 flex items-center gap-3 text-left">
                <div
                    className={cn(
                        "w-5 h-5 bg-white/20 rounded-sm flex items-center justify-center text-left transition-transform",
                        active && "scale-110"
                    )}
                >
                    {icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-left">{label}</span>
                {active && (
                    <motion.span
                        initial={{ opacity: 0, scale: 0, x: -4 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.05 }}
                        className="inline-flex items-center text-left"
                    >
                        <Sparkles size={11} className="text-white" strokeWidth={2.5} />
                    </motion.span>
                )}
            </div>
            <span
                className={cn(
                    "relative z-10 transition-all duration-200 text-left",
                    active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0"
                )}
            >
                {chevron}
            </span>
        </motion.button>
    );
}

export function InterviewSession({ roomId, rooms, applications, onClose, onComplete }: InterviewSessionProps) {
    const { success, error, warning } = useToast();
    const { withLoading } = useLoading();
    const {
        room, application, questions, loadingQuestions, isStarted, setIsStarted,
        seconds, formatTime, scores, setScores, observations, setObservations,
        currentStep, isRecording, recordingSeconds, audioBlob, setAudioBlob,
        startRecording, stopRecording, finalizeSession, isTranscribing, setIsTranscribing,
        activeSpeaker, setActiveSpeaker, transcriptBlocks, setTranscriptBlocks,
        interimTranscript, setInterimTranscript, recognitionRef, activeSpeakerRef,
        setRecordingSeconds,
        isFinalStage,
        
        // Destructuring the centralized assessment states from our custom hook
        checklist, setChecklist,
        ratings, setRatings,
        background, setBackground
    } = useInterviewSession(roomId, rooms, applications, onComplete);

    const { user } = useAuthStore();
    const isFinalInterview = application?.queue_type === 'FINAL';
    const isRecruiterOrAdmin = user?.role === 'recruiter' || user?.role === 'admin';
    const viewOnlyMode = isFinalInterview && isRecruiterOrAdmin;

    const readOnly = isFinalStage || viewOnlyMode;

    const [verdict, setVerdict] = useState<'PASSED' | 'FAILED' | 'PENDING' | null>(null);

    const hasScoreOfOne = Object.values(scores).some(val => {
        if (val === 1) return true;
        if (typeof val === 'string') {
            const lower = val.toLowerCase();
            const matched = lower.includes('(1)') || lower === '1' || lower.includes('below expectation') || lower.includes('below expectations');
            return matched;
        }
        return false;
    });

    const [showAutoFailModal, setShowAutoFailModal] = useState(false);

    useEffect(() => {
        if (hasScoreOfOne && verdict !== 'FAILED') {
            setVerdict('FAILED');
            setShowAutoFailModal(true);
            warning(
                'Auto-Fail Triggered', 
                'The candidate received a Below Expectations score of 1. The candidate is now not eligible to pass.'
            );
        }
    }, [hasScoreOfOne, verdict, warning]);

    const [showCompleteConfirm, setShowCompleteConfirm] = useState<any>(false);
    const [missingVerdict, setMissingVerdict] = useState(false);
    const [activeRubricTab, setActiveRubricTab] = useState<'checklist' | 'background' | 'ratings'>('checklist');
    const [transcriptionMode, setTranscriptionMode] = useState<'hotkey' | 'auto'>('hotkey');

    const [showConsentModal, setShowConsentModal] = useState(false);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');

    // Endorsement state variables
    const [validators, setValidators] = useState<User[]>([]);
    const [localApplication, setLocalApplication] = useState<Application | null>(null);
    const [endorsementTabMode, setEndorsementTabMode] = useState<'endorsement' | 'scheduling'>('endorsement');
    const [endorsementNotes, setEndorsementNotes] = useState('');
    const [isEndorsedRoom, setIsEndorsedRoom] = useState(false);

    const prevAppIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (application) {
            // Enforce that only the assigned interviewer can enter/reenter the room
            const isFinal = application.queue_type === 'FINAL';
            const assignedId = isFinal 
                ? (application.assigned_ops_validator_id || application.metadata?.assigned_ops_validator_id)
                : (application.assigned_recruiter_id || application.metadata?.assigned_recruiter_id);
            const assignedName = isFinal
                ? (application.assigned_ops_validator_name || application.metadata?.assigned_ops_validator_name)
                : (application.assigned_recruiter_name || application.metadata?.assigned_recruiter_name);
            
            const userDepts = (user?.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            const appDepts = (application.department || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            const sharesDept = userDepts.some(ud => appDepts.includes(ud));

            const isMatch = (assignedId && String(assignedId) === String(user?.id)) ||
                (assignedName && user?.full_name && assignedName.toLowerCase().trim() === user.full_name.toLowerCase().trim()) ||
                sharesDept;
            
            if (!isMatch) {
                error('Access Denied', `Only the assigned interviewer (${assignedName || 'assigned interviewer'}) can enter this room.`);
                onClose();
                return;
            }

            setLocalApplication(application);

            if (prevAppIdRef.current !== application.id) {
                prevAppIdRef.current = application.id;
                setVerdict(null);
                setEndorsementTabMode('endorsement');
                setIsEndorsedRoom(false);
                setEndorsementNotes('');
            }
        }
    }, [application, user, error, onClose]);

    useEffect(() => {
        UserService.getAll()
            .then(users => {
                setValidators(users.filter(u => u.role === 'ops_validator'));
            })
            .catch(err => console.error('Failed to load validators:', err));
    }, []);

    const handleLocalUpdateApplication = (id: string, patch: any) => {
        setLocalApplication(prev => {
            if (!prev) return null;
            return {
                ...prev,
                ...patch,
                metadata: {
                    ...(prev.metadata || {}),
                    ...(patch.metadata || {})
                }
            };
        });
    };

    const handleRouteToSpecialized = async (app: Application, name: string) => {
        const params = {
            isSpecialized: true,
            department: app.department
        };
        if (isRecording) {
            setShowCompleteConfirm(params);
        } else {
            await finalizeSession('PASSED', params);
        }
        return true;
    };

    const handleEndorsementClose = async () => {
        const targetApp = localApplication || application;
        if (!targetApp) return;

        const valObj = validators.find(v => v.id === targetApp.assigned_ops_validator_id);
        const params = {
            isSpecialized: false,
            department: targetApp.department,
            meetingDate: targetApp.endorsement_meeting_date,
            meetingEndDate: targetApp.endorsement_meeting_end_date,
            meetingBody: targetApp.endorsement_meeting_body,
            assignedOpsValidatorId: targetApp.assigned_ops_validator_id,
            assignedOpsValidatorName: valObj?.full_name || targetApp.assigned_ops_validator_name,
            withOutlook: targetApp.recruiter_s_scheduling_status === 'SCHEDULED'
        };

        if (isRecording) {
            setShowCompleteConfirm(params);
        } else {
            await finalizeSession('PASSED', params);
        }
    };

    const handleStartRecordingClick = () => {
        setShowConsentModal(true);
    };

    const handleConsentYes = async () => {
        setShowConsentModal(false);
        if (!isStarted) {
            setIsStarted(true);
            success('Protocol Live', 'Audit session start time logged.');
        }
        try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            tempStream.getTracks().forEach(track => track.stop());
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(d => d.kind === 'audioinput');
            setAudioDevices(audioInputs);
            if (audioInputs.length > 0) {
                setSelectedDevice(audioInputs[0].deviceId);
            }
            setShowDeviceModal(true);
        } catch (err) {
            error('Hardware Error', 'Microphone permission denied or no devices found.');
        }
    };

    const handleConsentNo = () => {
        setShowConsentModal(false);
        if (!isStarted) {
            setIsStarted(true);
            success('Protocol Live', 'Audit session start time logged.');
        }
        success('Recording Consent Declined', 'Proceeding with the interview without recording.');
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && isTranscribing && transcriptionMode === 'hotkey') {
                e.preventDefault();
                setActiveSpeaker(prev => prev === 'Interviewer' ? 'Applicant' : 'Interviewer');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTranscribing, transcriptionMode, setActiveSpeaker]);

    const isTranscribingRef = useRef(isTranscribing);
    useEffect(() => {
        isTranscribingRef.current = isTranscribing;
    }, [isTranscribing]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition && !recognitionRef.current) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) final += event.results[i][0].transcript;
                    else interim += event.results[i][0].transcript;
                }
                console.log('SpeechRecognition result - Final:', final, 'Interim:', interim);
                if (final) {
                    setTranscriptBlocks(prev => {
                        const currentSpeaker = activeSpeakerRef.current;
                        const lastBlock = prev[prev.length - 1];
                        if (lastBlock && lastBlock.speaker === currentSpeaker) {
                            return [...prev.slice(0, -1), { ...lastBlock, text: lastBlock.text + ' ' + final }];
                        }
                        return [...prev, { speaker: currentSpeaker, text: final }];
                    });
                }
                setInterimTranscript(interim);
            };

            recognition.onstart = () => {
                console.log('SpeechRecognition instance started successfully.');
            };

            recognition.onerror = (event: any) => {
                console.error('SpeechRecognition error event:', event.error, event.message);
                error('Speech recognition error', `Error type: ${event.error}. Make sure microphone permission is granted.`);
            };

            recognition.onend = () => {
                console.log('SpeechRecognition instance ended. isTranscribingRef:', isTranscribingRef.current);
                if (isTranscribingRef.current) {
                    try { 
                        recognition.start(); 
                    } catch (err) { 
                        console.warn('SpeechRecognition failed to restart synchronously:', err);
                        setTimeout(() => { if (isTranscribingRef.current) recognition.start(); }, 1000); 
                    }
                }
            };
            recognitionRef.current = recognition;
        }
    }, [recognitionRef, setActiveSpeaker, setInterimTranscript, setTranscriptBlocks, activeSpeakerRef]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (err) { console.warn('Clean stop recognition failed:', err); }
            }
            if (isRecording) {
                stopRecording();
            }
        };
    }, [isRecording, stopRecording, recognitionRef]);

    const startTranscription = () => {
        console.log('startTranscription called. recognitionRef:', recognitionRef.current);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsTranscribing(true);
                success('Transcription Engaged', 'Real-time speech analytics active.');
            } catch (err) { 
                console.error('recognitionRef.current.start() threw error:', err);
                // Try stopping first and then restarting
                try {
                    recognitionRef.current.stop();
                    setTimeout(() => {
                        recognitionRef.current.start();
                        setIsTranscribing(true);
                    }, 300);
                } catch (stopErr) {
                    console.error('Reset start failed:', stopErr);
                }
            }
        } else {
            console.error('SpeechRecognition is not supported or not initialized on this browser.');
            error('Feature Unavailable', 'Speech recognition API is not supported in this browser.');
        }
    };

    useEffect(() => {
        if (roomId && (!room || !application)) {
            const targetRoom = rooms.find(r => r.id === roomId);
            if (targetRoom && targetRoom.current_application_id) {
                const appExists = applications.some(a => a.id === targetRoom.current_application_id);
                if (!appExists) {
                    error('Telemetry Error', 'Candidate application registry record not found or mismatched. Try clearing the room.');
                    onClose();
                }
            }
        }
    }, [roomId, room, application, rooms, applications, error, onClose]);

    if (!room || !application) return null;

    const ACCENT_CRITERIA = {
        categoryC: ['Close to English Native Speaker', 'Neutral Accent'],
        categoryB: ['Filipino Sounding to Neutral', 'Filipino Sounding'],
        categoryA: ['Filipino Sounding to Regional', 'Painfully Regional']
    };

    const PRONUNCIATION_CRITERIA = {
        categoryC: ['Able to produce all vowels and consonants'],
        categoryB: [
            'Mild or Inconsistent /i/ vs /I/ vs /E/',
            'Mild or Inconsistent /u/ vs /U/ vs /o/ vs /aw/',
            '/ae/ vs /a/ vs /uh/ or misuse of /ae/',
            '/d/ or /t/ vs /th/',
            '/p/ vs /f/'
        ],
        categoryA: [
            'Consistent /i/ vs /I/ vs /E/',
            'Consistent /u/ vs /U/ vs /o/',
            'Consistent /ae/ vs /a/ vs /uh/',
            '/b/ vs /v/ consistent',
            '4 or More Sound Challenges'
        ]
    };

    const GRAMMAR_CRITERIA = {
        categoryC: ['Grammar is Good', 'Good Vocabulary'],
        categoryB: [
            'Subject - Verb Agreement',
            'Tenses (Past Tense vs Present Tense)',
            'Prepositions (in, on, at...etc)',
            'Conjunctions (and, but, for, because...etc)',
            'Noun vs Adjective | verb vs adjective',
            'Articles',
            'Pluralization',
            'Can make complete sentences',
            'Few Challenges in Vocabulary'
        ],
        categoryA: [
            'Too Many lapses / Consistent lapses on Tenses',
            'Can only make Fragments / cannot construct proper sentences',
            '3 More Grammar Lapses',
            'Cannot convey thoughts or limited vocabulary'
        ]
    };

    const FLUENCY_CRITERIA = {
        categoryC: [
            'Thought Organization is good',
            'Can answer questions immediately and directly',
            'Answers are clear and concise'
        ],
        categoryB: [
            'Has Dead Air but able to convey thoughts',
            'Has Few Fillers / Fillers are habitual',
            'Answers are related to the question'
        ],
        categoryA: [
            'Habitual Cebuano Fillers',
            'Lots of Fillers while thinking about the answer',
            'Lots of stuttering',
            'Answers are not related to the question / unclear',
            'Stuck on questions'
        ]
    };



    const stopTranscription = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsTranscribing(false);
            setInterimTranscript('');
        }
    };

    const handleInitialize = () => {
        setShowConsentModal(true);
    };

    const handleNoShow = async () => {
        await withLoading(async () => {
            if (application) {
                const qEntries = await QueueService.getTodaysQueue();
                const entry = qEntries.find((e: any) => e.application_id === application.id);
                if (entry) await QueueService.delete(entry.id);
                await ApplicationService.updateStatus({
                    id: application.id,
                    fromStatus: application.current_status,
                    toStatus: 'REJECTED',
                    changedByName: 'System (No-Show)',
                    reason: 'Applicant failed to attend interview protocol'
                });
            }
            await useRoomStore.getState().updateRoom(roomId, { status: 'AVAILABLE', current_application_id: null, current_applicant_name: null, occupied_since: null });
            onComplete(null);
        }, 'Marking as no-show...');
    };

    const renderRubricSection = (title: string, criteria: any, prefix: string) => {
        return (
            <div className="space-y-3 bg-white border border-surface-200 p-4 rounded-sm shadow-sm">
                <h4 className="text-[10px] font-black text-surface-800 uppercase tracking-widest border-b border-surface-150 pb-2 flex items-center justify-between">
                    <span>{title}</span>
                </h4>
                
                {/* Category C */}
                <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-sm inline-block">Category C</span>
                    <div className="space-y-1 pl-1">
                        {criteria.categoryC.map((c: string) => {
                            const key = `${prefix}_c_${c.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                            return (
                                <label key={c} className={cn("flex items-start gap-2 text-[11px] text-surface-600 font-bold select-none py-0.5", !readOnly && "hover:text-surface-900 cursor-pointer")}>
                                    {readOnly ? (
                                        !!checklist[key] ? (
                                            <div className="mt-0.5 w-3.5 h-3.5 rounded-sm bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div className="mt-0.5 w-3.5 h-3.5 rounded-sm border border-surface-300 bg-white shrink-0" />
                                        )
                                    ) : (
                                        <input
                                            type="checkbox"
                                            checked={!!checklist[key]}
                                            onChange={(e) => setChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                                            className="mt-0.5 rounded-sm border-surface-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                                        />
                                    )}
                                    <span>{c}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Category B */}
                <div className="space-y-1.5 pt-2 border-t border-dashed border-surface-100">
                    <span className="text-[8px] font-black text-amber-800 uppercase tracking-widest bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-sm inline-block">Category B</span>
                    <div className="space-y-1 pl-1">
                        {criteria.categoryB.map((c: string) => {
                            const key = `${prefix}_b_${c.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                            return (
                                <label key={c} className={cn("flex items-start gap-2 text-[11px] text-surface-600 font-bold select-none py-0.5", !readOnly && "hover:text-surface-900 cursor-pointer")}>
                                    {readOnly ? (
                                        !!checklist[key] ? (
                                            <div className="mt-0.5 w-3.5 h-3.5 rounded-sm bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div className="mt-0.5 w-3.5 h-3.5 rounded-sm border border-surface-300 bg-white shrink-0" />
                                        )
                                    ) : (
                                        <input
                                            type="checkbox"
                                            checked={!!checklist[key]}
                                            onChange={(e) => setChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                                            className="mt-0.5 rounded-sm border-surface-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                                        />
                                    )}
                                    <span>{c}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Category A */}
                <div className="space-y-1.5 pt-2 border-t border-dashed border-surface-100">
                    <span className="text-[8px] font-black text-rose-800 uppercase tracking-widest bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-sm inline-block">Category A</span>
                    <div className="space-y-1 pl-1">
                        {criteria.categoryA.map((c: string) => {
                            const key = `${prefix}_a_${c.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                            return (
                                <label key={c} className={cn("flex items-start gap-2 text-[11px] text-surface-600 font-bold select-none py-0.5", !readOnly && "hover:text-surface-900 cursor-pointer")}>
                                    {readOnly ? (
                                        !!checklist[key] ? (
                                            <div className="mt-0.5 w-3.5 h-3.5 rounded-sm bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div className="mt-0.5 w-3.5 h-3.5 rounded-sm border border-surface-300 bg-white shrink-0" />
                                        )
                                    ) : (
                                        <input
                                            type="checkbox"
                                            checked={!!checklist[key]}
                                            onChange={(e) => setChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                                            className="mt-0.5 rounded-sm border-surface-300 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 cursor-pointer"
                                        />
                                    )}
                                    <span>{c}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return createPortal(
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-surface-900/90 backdrop-blur-sm flex items-center justify-center p-3 text-left">
                <div className="w-full max-w-[1550px] h-full max-h-[96vh] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col border border-surface-300 rounded-sm text-left">
                    <SessionHeader
                        room={room} isStarted={isStarted} seconds={seconds} formatTime={formatTime}
                        priorRecordingUrl={isFinalStage ? ((application as any).interview_recording_url || null) : null}
                        interviewMode={(room.room_type === 'online' || application.metadata?.interview_mode === 'ONLINE') ? 'ONLINE' : 'ON-SITE'}
                        viewOnlyMode={viewOnlyMode}
                        onInitialize={handleInitialize}
                        onClose={onClose}
                    />

                    <div className="flex-1 overflow-y-auto xl:overflow-hidden flex flex-col xl:flex-row text-left">
                        {/* Left Column: Identity & Verdict Panel */}
                        <div className="w-full xl:w-72 bg-[#fafafa] border-b xl:border-b-0 xl:border-r border-surface-300 p-5 xl:overflow-y-auto text-left flex flex-col gap-5 shrink-0">
                            <div className="space-y-5 text-left">
                                <div className="space-y-3 text-left">
                                    <h4 className="text-[9px] font-extrabold text-surface-500 uppercase tracking-[0.2em] border-l-[3px] border-primary-600 pl-2.5 text-left">Identity</h4>
                                    <div className="p-4 bg-white border border-surface-200 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-left">
                                        <div className="flex items-center gap-3 mb-3 text-left">
                                            <div className="w-11 h-11 bg-primary-700 text-white flex justify-center items-center font-black text-lg rounded-sm text-left">{application.applicant_name.charAt(0)}</div>
                                            <div className="text-left flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 text-left">
                                                    <h3 className="font-extrabold text-surface-900 leading-tight text-sm text-left truncate">{application.applicant_name}</h3>
                                                    <MedicalIndicator application={application} size="sm" />
                                                </div>
                                                <p className="text-[9px] font-semibold text-surface-400 mt-0.5 text-left">{application.applicant_id}</p>
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t border-surface-100 space-y-2.5 text-left">
                                            <div className="text-left">
                                                <p className="text-[8px] font-extrabold text-surface-400 uppercase tracking-[0.15em] mb-0.5 leading-none text-left">Position</p>
                                                <p className="text-xs font-bold text-surface-900 text-left">{application.position_title}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[8px] font-extrabold text-surface-400 uppercase tracking-[0.15em] mb-0.5 leading-none text-left">Department</p>
                                                <p className="text-xs font-bold text-primary-700 text-left">{application.department}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 text-left">
                                    <h4 className="text-[9px] font-extrabold text-surface-500 uppercase tracking-[0.2em] border-l-[3px] border-emerald-600 pl-2.5 text-left">Candidate Details</h4>
                                    <div className="p-4 bg-white border border-surface-200 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3 text-left">
                                        <div className="text-left">
                                            <p className="text-[8px] font-extrabold text-surface-400 uppercase tracking-[0.15em] mb-0.5 text-left">Education</p>
                                            <p className="text-xs font-bold text-surface-900 leading-relaxed text-left">{application.pis?.course_year || application.pis?.highest_education || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-surface-200 text-left">
                                    <div className="flex items-center justify-between text-left">
                                        <h4 className="text-[9px] font-extrabold text-surface-500 uppercase tracking-[0.2em] border-l-[3px] border-primary-600 pl-2.5 text-left">Recording & Analytics</h4>
                                        {isRecording && (
                                            <span className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.15em] text-rose-600 animate-pulse">
                                                <Mic size={10} /> {formatTime(recordingSeconds)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex gap-2 w-full">
                                            {!isRecording && !audioBlob && (
                                                <button
                                                    onClick={handleStartRecordingClick}
                                                    disabled={!isStarted || viewOnlyMode}
                                                    className={cn(
                                                        "flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-surface-300 text-surface-700 text-[10px] font-bold rounded-sm hover:bg-surface-50 transition-all text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
                                                        (!isStarted || viewOnlyMode) && "opacity-40 pointer-events-none"
                                                    )}
                                                >
                                                    <Mic size={12} /> Record Audio
                                                </button>
                                            )}
                                            {isRecording && (
                                                <button
                                                    onClick={stopRecording}
                                                    className="flex-1 py-2 bg-rose-600 text-white text-[10px] font-bold rounded-sm hover:bg-rose-700 transition-all text-center"
                                                >
                                                    Stop Recording
                                                </button>
                                            )}
                                            {audioBlob && !isRecording && (
                                                <div className="flex gap-1.5 flex-1">
                                                    <button
                                                        onClick={() => {
                                                            const url = URL.createObjectURL(audioBlob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `interview_recording_${application.id}.webm`;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                        }}
                                                        className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-1 text-left"
                                                    >
                                                        <Download size={11} /> Download
                                                    </button>
                                                    <button
                                                        onClick={() => { setAudioBlob(null); setRecordingSeconds(0); }}
                                                        className="px-2.5 py-2 bg-white border border-surface-200 text-surface-600 text-[10px] font-bold rounded-sm hover:bg-surface-50 transition-all text-center"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            )}

                                            {!isTranscribing ? (
                                                <button
                                                    onClick={startTranscription}
                                                    disabled={!isStarted || viewOnlyMode}
                                                    className={cn(
                                                        "flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 text-white text-[10px] font-bold rounded-sm hover:bg-purple-700 transition-all text-left",
                                                        (!isStarted || viewOnlyMode) && "opacity-40 pointer-events-none"
                                                    )}
                                                >
                                                    <Activity size={12} /> Transcribe
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={stopTranscription}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded-sm hover:bg-purple-100 transition-all text-left"
                                                >
                                                    <Activity size={12} className="animate-spin" /> Stop
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-surface-200 text-left">
                                    <div className="flex items-center justify-between text-left">
                                        <div className="flex flex-col text-left">
                                            <h4 className="text-[9px] font-extrabold text-surface-500 uppercase tracking-[0.2em] border-l-[3px] border-purple-600 pl-2.5 text-left">Live Transcript</h4>
                                            
                                            {/* Mode Selector */}
                                            {!isFinalStage && (
                                                <div className="mt-1 flex bg-surface-150 p-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider w-fit border border-surface-200">
                                                    <button
                                                        onClick={() => setTranscriptionMode('hotkey')}
                                                        className={cn("px-1.5 py-0.5 rounded-sm transition-all", transcriptionMode === 'hotkey' ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-800")}
                                                        title="Use Alt key or click to switch speaker"
                                                    >
                                                        Hotkey
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setTranscriptionMode('auto');
                                                            success('Auto Mode Active', 'Transcription will split streams automatically.');
                                                        }}
                                                        className={cn("px-1.5 py-0.5 rounded-sm transition-all", transcriptionMode === 'auto' ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-800")}
                                                        title="Separates speaker streams automatically"
                                                    >
                                                        Auto
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-left">
                                            {transcriptionMode === 'hotkey' && (
                                                <button
                                                    onClick={() => setActiveSpeaker(prev => prev === 'Interviewer' ? 'Applicant' : 'Interviewer')}
                                                    disabled={!isStarted}
                                                    className={cn(
                                                        "px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.15em] border rounded-sm transition-all text-left",
                                                        !isStarted ? "opacity-50 cursor-not-allowed" :
                                                            activeSpeaker === 'Interviewer' ? "bg-primary-600 text-white border-primary-600" : "bg-purple-600 text-white border-purple-600"
                                                    )}
                                                >
                                                    {activeSpeaker} (ALT)
                                                </button>
                                            )}
                                            {isTranscribing && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
                                        </div>
                                    </div>
                                    {isFinalStage && transcriptBlocks.length > 0 && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-sm text-left">
                                            <Lock size={10} className="text-indigo-600 shrink-0" />
                                            <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-[0.15em] text-left">From Initial Interview — read-only</span>
                                        </div>
                                    )}
                                    <div className="bg-white border border-surface-200 p-3 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)] min-h-[160px] flex flex-col text-left">
                                        <div className="flex-1 text-[11px] text-surface-700 leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar mb-2 bg-[#f8f8f8] p-2.5 border border-surface-100 rounded-sm flex flex-col gap-2 text-left">
                                            {transcriptBlocks.map((block, idx) => (
                                                <div key={idx} className="space-y-0.5 text-left">
                                                    <span className={cn("text-[9px] font-bold uppercase tracking-wider text-left", block.speaker === 'Interviewer' ? "text-primary-600" : "text-purple-600")}>{block.speaker}:</span>
                                                    <p className="pl-2 border-l-2 border-surface-200 text-surface-600 leading-snug text-left">{block.text}</p>
                                                </div>
                                            ))}
                                            {interimTranscript && !isFinalStage && (
                                                <div className="space-y-0.5 opacity-60 text-left">
                                                    <span className={cn("text-[9px] font-bold uppercase tracking-wider text-left", activeSpeaker === 'Interviewer' ? "text-primary-600" : "text-purple-600")}>{activeSpeaker}:</span>
                                                    <p className="pl-2 border-l-2 border-surface-200 text-purple-500 animate-pulse leading-snug text-left">{interimTranscript}...</p>
                                                </div>
                                            )}
                                        </div>
                                        {transcriptBlocks.length > 0 && (
                                            <div className="w-full">
                                                <button
                                                    onClick={() => {
                                                        try {
                                                            const text = transcriptBlocks.map(b => `[${b.speaker}]: ${b.text}`).join('\n\n');
                                                            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `transcript_${application.applicant_name.replace(/\s+/g, '_')}_${application.id.split('-')[0]}.txt`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                            success('Download Started', 'Transcript text file generated.');
                                                        } catch (e) {
                                                            console.error('Failed to export transcript:', e);
                                                        }
                                                    }}
                                                    className="w-full flex items-center justify-center gap-1 py-1.5 bg-white text-surface-700 text-[8px] font-extrabold uppercase tracking-[0.12em] hover:bg-surface-50 transition-all border border-surface-300 rounded-sm text-left"
                                                >
                                                    <Download size={11} /> Download TXT
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-surface-200 text-left">
                                    <div className="flex items-center justify-between text-left">
                                        <h4 className={cn("text-[9px] font-extrabold text-surface-500 uppercase tracking-[0.2em] border-l-[3px] border-emerald-600 pl-2.5 text-left transition-opacity", !isStarted && "opacity-40")}>Outcome Decision</h4>
                                        <AnimatePresence>
                                            {missingVerdict && (
                                                <motion.span
                                                    initial={{ opacity: 0, scale: 0.8, x: 8 }}
                                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-[0.15em] text-rose-600 text-left"
                                                >
                                                    <AlertTriangle size={10} strokeWidth={2.5} /> Required
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <motion.div
                                        animate={missingVerdict ? { x: [0, -6, 6, -5, 5, -3, 3, 0] } : { x: 0 }}
                                        transition={{ duration: 0.55, ease: 'easeInOut' }}
                                        className={cn("grid grid-cols-1 gap-2 text-left transition-all", (!isStarted || viewOnlyMode) && "opacity-40 pointer-events-none select-none")}
                                    >
                                        <VerdictButton
                                            active={verdict === 'PASSED'}
                                            missing={missingVerdict}
                                            disabled={!isStarted || viewOnlyMode || hasScoreOfOne}
                                            onClick={() => { setVerdict('PASSED'); setMissingVerdict(false); }}
                                            label="Pass Candidate"
                                            icon={<CheckCircle2 size={12} strokeWidth={2.5} />}
                                            activeBg="#0b590b"
                                            baseBg="#107c10"
                                            hoverBg="#0b590b"
                                            ringColor="#34d399"
                                            chevron={<ChevronRight size={14} />}
                                        />
                                        <VerdictButton
                                            active={verdict === 'FAILED'}
                                            missing={missingVerdict}
                                            disabled={!isStarted || viewOnlyMode}
                                            onClick={() => { setVerdict('FAILED'); setMissingVerdict(false); }}
                                            label="Fail Candidate"
                                            icon={<XCircle size={12} strokeWidth={2.5} />}
                                            activeBg="#a4262c"
                                            baseBg="#d13438"
                                            hoverBg="#a4262c"
                                            ringColor="#fb7185"
                                            chevron={<ChevronRight size={14} />}
                                        />
                                        <VerdictButton
                                            active={verdict === 'PENDING'}
                                            missing={missingVerdict}
                                            disabled={!isStarted || viewOnlyMode || hasScoreOfOne}
                                            onClick={() => { setVerdict('PENDING'); setMissingVerdict(false); }}
                                            label="Mark Pending"
                                            icon={<Clock size={12} strokeWidth={2.5} />}
                                            activeBg="#d87a00"
                                            baseBg="#ff8c00"
                                            hoverBg="#d87a00"
                                            ringColor="#fbbf24"
                                            chevron={<ChevronRight size={14} />}
                                        />
                                    </motion.div>
                                </div>
 
                                <button onClick={handleNoShow} disabled={!isStarted || viewOnlyMode} className={cn("w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-rose-300 text-rose-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-sm hover:bg-rose-50 transition-all text-left bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]", (!isStarted || viewOnlyMode) && "opacity-40 pointer-events-none")}>
                                    <XOctagon size={14} /> Mark as No-Show
                                </button>

                                <button
                                    onClick={() => {
                                        if (!verdict) {
                                            setMissingVerdict(true);
                                            const pendingItems: string[] = [];
                                            if (isRecording) {
                                                pendingItems.push("stop the audio recording");
                                            }
                                            if (isTranscribing) {
                                                pendingItems.push("stop the active transcription");
                                            }
                                            pendingItems.push("choose an outcome decision");

                                            const formattedMsg = "Please " + pendingItems.join(", ") + " before ending the interview.";
                                            warning('Incomplete Session', formattedMsg);
                                            return;
                                        }
                                        if (!isFinalStage && verdict === 'PASSED') {
                                            const targetApp = localApplication || application;
                                            const isConfirmed = targetApp.metadata?.endorsement_confirmed === true || 
                                                                targetApp.metadata?.endorsement_confirmed === 'true';
                                            if (!isConfirmed) {
                                                warning('Endorsement Required', 'Please complete the endorsement configuration in the center panel to finalize the pass verdict.');
                                                return;
                                            }
                                            
                                            const valObj = validators.find(v => v.id === targetApp.assigned_ops_validator_id);
                                            const params = {
                                                isSpecialized: false,
                                                department: targetApp.department,
                                                meetingDate: targetApp.endorsement_meeting_date,
                                                meetingEndDate: targetApp.endorsement_meeting_end_date,
                                                meetingBody: targetApp.endorsement_meeting_body,
                                                assignedOpsValidatorId: targetApp.assigned_ops_validator_id,
                                                assignedOpsValidatorName: valObj?.full_name || targetApp.assigned_ops_validator_name,
                                                withOutlook: targetApp.recruiter_s_scheduling_status === 'SCHEDULED'
                                            };

                                            if (isRecording) setShowCompleteConfirm(params);
                                            else finalizeSession('PASSED', params);
                                            return;
                                        }
                                        if (isRecording) setShowCompleteConfirm(verdict);
                                        else finalizeSession(verdict as any);
                                    }}
                                    disabled={!isStarted || viewOnlyMode}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-sm transition-all text-left shadow-[0_1px_3px_rgba(0,0,0,0.1)]",
                                        (!isStarted || viewOnlyMode)
                                            ? "opacity-40 pointer-events-none"
                                            : verdict
                                                ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                                : "bg-[#e1dfdd] text-[#a19f9d] border border-[#c8c6c4] cursor-not-allowed hover:bg-[#d2d0ce]"
                                    )}
                                >
                                    End Interview
                                </button>
                            </div>
                        </div>

                        {/* Center Column: Standard Evaluation Form or Endorsement Configuration */}
                        <div className="w-full xl:flex-1 bg-white p-6 xl:overflow-y-auto border-b xl:border-b-0 xl:border-r border-surface-200 text-left shrink-0 xl:shrink">
                            {!isFinalStage && verdict === 'PASSED' ? (
                                <div className="space-y-6">
                                    {isEndorsedRoom ? (
                                        <div className="max-w-md mx-auto py-12 px-6 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-6 shadow-sm">
                                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold text-surface-900 tracking-tight">Interview Results Summary</h3>
                                                <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider">Initial Screening & Endorsement Complete</p>
                                            </div>

                                            <div className="w-full bg-white border border-surface-200 rounded-md p-4 space-y-3.5 text-left shadow-sm">
                                                <div className="flex justify-between items-center text-xs border-b border-surface-100 pb-2">
                                                    <span className="text-surface-400 font-bold uppercase tracking-wider">Candidate Name</span>
                                                    <span className="text-surface-800 font-extrabold">{localApplication?.applicant_name || application?.applicant_name}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs border-b border-surface-100 pb-2">
                                                    <span className="text-surface-400 font-bold uppercase tracking-wider">Accounts Endorsed To</span>
                                                    <span className="text-surface-800 font-extrabold uppercase tracking-widest text-[10px] bg-slate-100 px-2 py-0.5 rounded">{localApplication?.department || application?.department || 'N/A'}</span>
                                                </div>
                                                <div className="text-xs space-y-1">
                                                    <span className="text-surface-400 font-bold uppercase tracking-wider block">Overall Analysis of the Interview</span>
                                                    <p className="text-surface-700 font-medium bg-slate-50 p-2 border border-slate-100 rounded text-[11px] leading-relaxed max-h-24 overflow-y-auto">
                                                        {ratings.remarks || 'No remarks recorded.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="w-full p-4 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-sm flex items-center justify-center gap-2 shadow-sm animate-pulse">
                                                <Clock size={16} />
                                                <span>Scheduling Configured! Please click the "End Interview" button on the left panel to finalize the session.</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <FinalInterviewTab
                                            mode={endorsementTabMode}
                                            applicant={localApplication || application}
                                            finalInterviewNotes={endorsementNotes}
                                            setFinalInterviewNotes={setEndorsementNotes}
                                            onQueue={() => {}}
                                            setModalTab={(tab: any) => {
                                                if (tab === 'scheduling' || tab === 'final' || tab === 'assessment') {
                                                    setIsEndorsedRoom(true);
                                                } else {
                                                    setEndorsementTabMode(tab);
                                                }
                                            }}
                                            validators={validators}
                                            handleUpdateApplication={handleLocalUpdateApplication}
                                            onRouteToSpecialized={async (app: Application, name: string) => {
                                                setIsEndorsedRoom(true);
                                                return true;
                                            }}
                                            onClose={handleEndorsementClose}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="max-w-2xl mx-auto space-y-6 text-left">
                                    <div className="flex justify-between items-end border-b border-surface-200 pb-4 text-left">
                                        <div className="text-left">
                                            <h3 className="text-lg font-extrabold text-surface-900 tracking-tight mb-0.5 text-left">Interview Evaluation</h3>
                                            <p className="text-[11px] text-surface-400 font-semibold text-left">Please record scores and observations for each question.</p>
                                        </div>
                                        <div className="text-right text-left">
                                            <p className="text-[8px] font-extrabold text-surface-400 uppercase tracking-[0.2em] mb-1 text-left">Progress</p>
                                            <div className="flex gap-1 text-left">
                                                {questions.map((_, idx) => (
                                                    <div key={idx} className={cn("h-1 transition-all duration-300 rounded-sm text-left", idx < currentStep ? "w-3.5 bg-emerald-600" : idx === currentStep ? "w-6 bg-primary-700" : "w-3.5 bg-surface-200")} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {loadingQuestions ? (
                                        <div className="flex flex-col items-center justify-center py-32 gap-4 text-left">
                                            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin text-left" />
                                            <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest text-left">Loading questions...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 pb-16 text-left">
                                            {Array.from(new Set(questions.map(q => q.category || 'General Evaluation'))).map(category => (
                                                <div key={category} className="space-y-4 pt-2 text-left">
                                                    <div className="py-2.5 border-b border-surface-900 mb-4 text-left">
                                                        <h3 className="text-xs font-extrabold text-surface-900 uppercase tracking-[0.15em] flex items-center gap-2 text-left">
                                                            <div className="w-1.5 h-4 bg-primary-700 rounded-sm text-left" />
                                                            {category}
                                                        </h3>
                                                    </div>
                                                    {questions.filter(q => (q.category || 'General Evaluation') === category).map((q) => {
                                                        const globalIdx = questions.findIndex(orig => orig.id === q.id);
                                                        return (
                                                            <QuestionCard
                                                                key={q.id} q={q} globalIdx={globalIdx}
                                                                score={scores[q.id]} observation={observations[q.id]}
                                                                onScoreChange={(val) => setScores(s => ({ ...s, [q.id]: val }))}
                                                                onObservationChange={(val) => setObservations(obs => ({ ...obs, [q.id]: val }))}
                                                                disabled={!isStarted || viewOnlyMode}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Premium Interactive Form Checklist */}
                        <div className={cn("w-full xl:w-[430px] bg-[#f8fafc] xl:overflow-y-auto text-left flex flex-col select-none border-t xl:border-t-0 xl:border-l border-surface-200 transition-all duration-300 shrink-0", !isStarted && "opacity-40 pointer-events-none")}>
                            <div className="p-4 border-b border-surface-200 bg-white flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-extrabold text-surface-900 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                        <Activity size={14} className="text-primary-600 animate-pulse" />
                                        Interviewer's Assessment
                                    </h3>
                                    <div className="flex bg-surface-100 p-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider">
                                        <button
                                            onClick={() => setActiveRubricTab('checklist')}
                                            className={cn("px-2 py-1 rounded-sm transition-all", activeRubricTab === 'checklist' ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-800")}
                                        >
                                            Rubrics
                                        </button>
                                        <button
                                            onClick={() => setActiveRubricTab('background')}
                                            className={cn("px-2 py-1 rounded-sm transition-all", activeRubricTab === 'background' ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-800")}
                                        >
                                            Background
                                        </button>
                                        <button
                                            onClick={() => setActiveRubricTab('ratings')}
                                            className={cn("px-2 py-1 rounded-sm transition-all", activeRubricTab === 'ratings' ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-800")}
                                        >
                                            Ratings
                                        </button>
                                    </div>
                                </div>
                                {readOnly && (
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-sm text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                                        <Lock size={11} className="shrink-0" />
                                        <span>Carried over from Initial Interview — read-only</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 space-y-4 flex-1">
                                {activeRubricTab === 'checklist' ? (
                                    <div className="space-y-4">
                                        {renderRubricSection('Accent Assessment', ACCENT_CRITERIA, 'accent')}
                                        {renderRubricSection('Pronunciation Assessment', PRONUNCIATION_CRITERIA, 'pron')}
                                        {renderRubricSection('Grammar & Vocabulary', GRAMMAR_CRITERIA, 'gram')}
                                        {renderRubricSection('Fluency & Comprehension', FLUENCY_CRITERIA, 'fluency')}
                                    </div>
                                ) : activeRubricTab === 'background' ? (
                                    <div className="space-y-4 bg-white border border-surface-200 p-4 rounded-sm shadow-sm">
                                        <h4 className="text-[10px] font-black text-surface-800 uppercase tracking-widest border-b border-surface-150 pb-2">Background & Experience</h4>
                                        
                                        <div className="space-y-3.5">
                                            {/* Experience Column */}
                                            <div className="space-y-2.5">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">BPO Experience (Chat)</label>
                                                    <input
                                                        type="text"
                                                        value={background.bpoChat}
                                                        placeholder="e.g. 1 Year Chat Support"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, bpoChat: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">BPO Experience (Voice)</label>
                                                    <input
                                                        type="text"
                                                        value={background.bpoVoice}
                                                        placeholder="e.g. 2 Years Voice Support"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, bpoVoice: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Non-BPO Experience</label>
                                                    <input
                                                        type="text"
                                                        value={background.nonBpo}
                                                        placeholder="e.g. Sales Clerk"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, nonBpo: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Issues with Shifting Schedules</label>
                                                    <input
                                                        type="text"
                                                        value={background.shiftingIssues}
                                                        placeholder="e.g. None / Highly Flexible"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, shiftingIssues: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            {/* Plans and Transportation Column */}
                                            <div className="border-t border-dashed border-surface-150 pt-3 space-y-2.5">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Highest Educational Background</label>
                                                    <input
                                                        type="text"
                                                        value={background.education}
                                                        placeholder="e.g. College Graduate"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, education: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Strand (if applicable)</label>
                                                    <input
                                                        type="text"
                                                        value={background.shsStrand}
                                                        placeholder="e.g. STEM"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, shsStrand: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Plans to Pursue Studies</label>
                                                    <input
                                                        type="text"
                                                        value={background.pursueStudies}
                                                        placeholder="e.g. No immediate plans"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, pursueStudies: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Plans to Go Abroad</label>
                                                    <input
                                                        type="text"
                                                        value={background.goAbroad}
                                                        placeholder="e.g. None"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, goAbroad: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Mode of Transportation</label>
                                                    <input
                                                        type="text"
                                                        value={background.transportMode}
                                                        placeholder="e.g. Public commute / Transit"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, transportMode: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            {/* Health and Recruitment Column */}
                                            <div className="border-t border-dashed border-surface-150 pt-3 space-y-2.5">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Medical Issues</label>
                                                    <input
                                                        type="text"
                                                        value={background.medicalIssues}
                                                        placeholder="e.g. None / Fit to Work"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, medicalIssues: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Availability to Start</label>
                                                    <input
                                                        type="text"
                                                        value={background.startAvailability}
                                                        placeholder="e.g. Immediately"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, startAvailability: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Salary Expectations</label>
                                                    <input
                                                        type="text"
                                                        value={background.salaryExpectation}
                                                        placeholder="e.g. 25,000 PHP"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, salaryExpectation: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Candidate Source</label>
                                                    <input
                                                        type="text"
                                                        value={background.candidateSource}
                                                        placeholder="e.g. Indeed / Referral"
                                                        disabled={readOnly}
                                                        onChange={(e) => setBackground(prev => ({ ...prev, candidateSource: e.target.value }))}
                                                        className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 bg-white border border-surface-200 p-4 rounded-sm shadow-sm">
                                        <h4 className="text-[10px] font-black text-surface-800 uppercase tracking-widest border-b border-surface-150 pb-2">Ratings & Classifications</h4>
                                        
                                        {/* Personal Rating Slider */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                                <span>Personal Rating (1-10)</span>
                                                <span className="text-primary-700 font-extrabold">{ratings.personalRating} / 10</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={ratings.personalRating}
                                                disabled={readOnly}
                                                onChange={(e) => setRatings(prev => ({ ...prev, personalRating: parseInt(e.target.value) }))}
                                                className="w-full h-1 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Rating Input Grid */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Work Habits / Attitude</label>
                                                <input
                                                    type="text"
                                                    value={ratings.workHabits}
                                                    placeholder="e.g. Cooperative"
                                                    disabled={readOnly}
                                                    onChange={(e) => setRatings(prev => ({ ...prev, workHabits: e.target.value }))}
                                                    className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Communication Skills</label>
                                                <input
                                                    type="text"
                                                    value={ratings.communicationSkills}
                                                    placeholder="e.g. Excellent"
                                                    disabled={readOnly}
                                                    onChange={(e) => setRatings(prev => ({ ...prev, communicationSkills: e.target.value }))}
                                                    className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Empathy</label>
                                                <input
                                                    type="text"
                                                    value={ratings.empathy}
                                                    placeholder="e.g. Highly Empathetic"
                                                    disabled={readOnly}
                                                    onChange={(e) => setRatings(prev => ({ ...prev, empathy: e.target.value }))}
                                                    className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Confidence</label>
                                                <input
                                                    type="text"
                                                    value={ratings.confidence}
                                                    placeholder="e.g. Very Confident"
                                                    disabled={readOnly}
                                                    onChange={(e) => setRatings(prev => ({ ...prev, confidence: e.target.value }))}
                                                    className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1 pt-2 border-t border-dashed border-surface-150">
                                            <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider">Language Classification</label>
                                            <input
                                                type="text"
                                                value={ratings.languageClassification}
                                                placeholder="e.g. Category C (Advanced BPO)"
                                                disabled={readOnly}
                                                onChange={(e) => setRatings(prev => ({ ...prev, languageClassification: e.target.value }))}
                                                className="w-full px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        <div className="space-y-1 pt-2 border-t border-dashed border-surface-150">
                                            <label className="text-[8px] font-black text-surface-400 uppercase tracking-wider font-extrabold text-surface-500">Remarks</label>
                                            <textarea
                                                value={ratings.remarks}
                                                rows={3}
                                                placeholder="Add general remarks, strengths, or focus areas..."
                                                disabled={readOnly}
                                                onChange={(e) => setRatings(prev => ({ ...prev, remarks: e.target.value }))}
                                                className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded-sm text-[11px] font-semibold focus:outline-none focus:border-primary-500 uppercase resize-none leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <ConfirmDialog
                open={!!showCompleteConfirm}
                title="End Interview Session?"
                message="A recording is currently in progress. Ending the session will stop the recording and save all interview data."
                confirmText="End & Save"
                confirmClass="bg-rose-600 text-white font-bold text-sm rounded-lg shadow-md text-left"
                onConfirm={async () => {
                    let verdictVal: any = undefined;
                    let paramsVal: any = undefined;

                    if (typeof showCompleteConfirm === 'string') {
                        verdictVal = showCompleteConfirm;
                    } else if (showCompleteConfirm && typeof showCompleteConfirm === 'object') {
                        verdictVal = 'PASSED';
                        paramsVal = showCompleteConfirm;
                    }

                    setShowCompleteConfirm(false);
                    stopRecording();

                    setTimeout(async () => {
                        try {
                            await finalizeSession(verdictVal, paramsVal);
                        } catch (err) {
                            console.error('[InterviewSession] Finalization failed:', err);
                            error('Critical Exception', 'Failed to finalize session. Please verify connectivity and try again.');
                        }
                    }, 500);
                }}
                onClose={() => setShowCompleteConfirm(false)}
            />

            <Modal
                open={showConsentModal}
                onClose={() => { setShowConsentModal(false); }}
                title="Candidate Consent"
                size="md"
                className="max-w-[480px] w-full"
            >
                <div className="space-y-5 text-left font-sans select-none p-1">
                    <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 p-4 rounded-sm">
                        <div className="p-1 rounded-sm bg-slate-100 text-slate-600 shrink-0">
                            <Shield size={16} className="text-slate-700" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Consent Statement</h4>
                            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                "We record this interview session to ensure quality assurance, standard evaluation across candidates, and internal training. The recording is encrypted, stored securely, and accessible only to authorized personnel."
                            </p>
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-755 font-bold leading-normal">
                        Does the candidate consent to be recorded?
                    </p>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                        <button
                            onClick={handleConsentNo}
                            className="px-6 py-2.5 bg-[#fdf3f2] hover:bg-[#fde7e5] border border-[#f5c2c2] text-[#a4262c] text-[11px] font-black uppercase tracking-widest rounded-sm transition-all shadow-xs cursor-pointer"
                        >
                            No
                        </button>
                        <button
                            onClick={handleConsentYes}
                            className="px-6 py-2.5 bg-[#107c10] hover:bg-[#0b590b] text-white border border-[#107c10] text-[11px] font-black uppercase tracking-widest rounded-sm transition-all shadow-sm cursor-pointer"
                        >
                            Yes
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={showDeviceModal}
                onClose={() => setShowDeviceModal(false)}
                title="Select Recording Device"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-surface-500 font-medium leading-relaxed">
                        Please choose the microphone you want to use for this recording:
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {audioDevices.map((device, idx) => (
                            <button
                                key={device.deviceId || idx}
                                onClick={() => setSelectedDevice(device.deviceId)}
                                className={cn(
                                    "w-full px-4 py-3 text-left border rounded-sm flex items-center justify-between transition-all",
                                    selectedDevice === device.deviceId
                                        ? "border-primary-600 bg-primary-50 text-primary-700"
                                        : "border-surface-200 hover:border-surface-300 text-surface-700 bg-white"
                                )}
                            >
                                <span className="text-xs font-bold truncate pr-2">
                                    {device.label || `Microphone ${idx + 1}`}
                                </span>
                                {selectedDevice === device.deviceId && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0" />
                                )}
                            </button>
                        ))}
                        {audioDevices.length === 0 && (
                            <p className="text-xs text-rose-500 font-bold py-2">No audio input devices found.</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
                        <button
                            onClick={() => setShowDeviceModal(false)}
                            className="px-4 py-2 bg-white border border-surface-200 text-surface-600 text-[11px] font-black uppercase tracking-widest hover:bg-surface-50 transition-all rounded-none"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setShowDeviceModal(false);
                                void startRecording(selectedDevice);
                            }}
                            disabled={audioDevices.length === 0}
                            className="px-6 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-surface-300 disabled:cursor-not-allowed text-white text-[11px] font-black uppercase tracking-widest transition-all rounded-none"
                        >
                            Start Recording
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={showAutoFailModal}
                onClose={() => setShowAutoFailModal(false)}
                title="Auto-Fail Triggered"
                size="md"
                className="max-w-[480px] w-full"
            >
                <div className="space-y-5 text-left font-sans select-none p-1">
                    <div className="border-l-4 border-rose-600 bg-rose-50/30 p-4 space-y-1 rounded-sm">
                        <div className="flex items-center gap-2 text-rose-800">
                            <AlertTriangle size={14} className="shrink-0" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Critical Notice</h4>
                        </div>
                        <p className="text-[11px] text-surface-700 font-semibold leading-relaxed pt-1">
                            The candidate received a Below Expectations score of 1. The candidate is now not eligible to pass and has been automatically set to FAILED status.
                        </p>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-surface-150">
                        <button
                            onClick={() => setShowAutoFailModal(false)}
                            className="px-6 py-2.5 bg-[#a4262c] hover:bg-[#8a1f24] text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-sm cursor-pointer border border-[#a4262c]"
                        >
                            Acknowledge
                        </button>
                    </div>
                </div>
            </Modal>
        </>,
        document.body
    );
}
