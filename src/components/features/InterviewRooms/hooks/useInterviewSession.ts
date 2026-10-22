import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ApplicationService } from '@/services/ApplicationService';
import { QueueService } from '@/services/QueueService';
import { QuestionService } from '@/services/QuestionService';
import { RecordingService } from '@/services/RecordingService';
import { SALARY_DATA } from '@/pages/recruiter/tracker/constants/salaryConstants';
import { useRoomStore } from '@/store/roomStore';
import { useToast } from '@/components/common/useToast';
import { useLoading } from '@/components/common/useLoading';
import type { Application, InterviewRoom, InterviewQuestion, ApplicationStatus } from '@/types';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';

const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function useInterviewSession(
    roomId: string | null,
    rooms: InterviewRoom[],
    applications: Application[],
    onComplete: (summary: any) => void,
    draftApplicantId?: string,
    forcedStage?: 'INITIAL' | 'FINAL'
) {
    const { user } = useAuthStore();
    const { success, error } = useToast();
    const { withLoading } = useLoading();
    const { activeAccount } = useActiveAccountStore();
    
    const userAccounts = parseAccounts(user?.department);
    const resolvedActiveAccount = (activeAccount && userAccounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase()))
        ? activeAccount
        : (userAccounts[0] || 'DOORDASH');

    const room = roomId ? rooms.find(r => r.id === roomId) : undefined;
    const application = draftApplicantId
        ? applications.find(a => a.id === draftApplicantId)
        : applications.find(a => a.id === room?.current_application_id);

    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(true);
    const [isStarted, setIsStarted] = useState(false);

    const isFinalStage = (() => {
        if (forcedStage) return forcedStage === 'FINAL';
        if (!application) return false;
        const meta = typeof application.metadata === 'string' ? (() => { try { return JSON.parse(application.metadata); } catch { return {}; } })() : (application.metadata || {});
        if (meta.active_interview_type) {
            return meta.active_interview_type === 'FINAL';
        }
        if (application.current_status === 'FINAL_INTERVIEW') return true;
        if (application.current_status === 'FINAL_INTERVIEW_SCHEDULED') return true;
        if (application.current_status === 'ACCOUNT_ASSIGNMENT') return true;
        if (application.current_status === 'INITIAL_INTERVIEW') return false;
        return application.queue_type === 'FINAL';
    })();
    const [seconds, setSeconds] = useState(0);
    const secondsRef = useRef(0);
    const [scores, setScores] = useState<Record<string, any>>({});
    const [observations, setObservations] = useState<Record<string, string>>({});
    const [questionNotes, setQuestionNotes] = useState<Record<string, string>>({});
    const [showQuestionNotes, setShowQuestionNotes] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isRestored, setIsRestored] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const [isTranscribing, setIsTranscribing] = useState(false);
    const [activeSpeaker, setActiveSpeaker] = useState<'Interviewer' | 'Applicant'>('Interviewer');
    const [transcriptBlocks, setTranscriptBlocks] = useState<{ speaker: string, text: string }[]>([]);
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const activeSpeakerRef = useRef(activeSpeaker);

    // Rubric, Checklist & Background Profile State
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});
    const [ratings, setRatings] = useState({
        personalRating: 5,
        workHabits: '',
        communicationSkills: '',
        empathy: '',
        confidence: '',
        languageClassification: '',
        remarks: ''
    });
    const [background, setBackground] = useState({
        bpoChat: '',
        bpoVoice: '',
        nonBpo: '',
        shiftingIssues: '',
        education: '',
        shsStrand: '',
        pursueStudies: '',
        goAbroad: '',
        transportMode: '',
        medicalIssues: '',
        startAvailability: '',
        salaryExpectation: '',
        candidateSource: '',
        dateOfBirth: '',
        contactNumber: '',
        emailAddress: ''
    });

    useEffect(() => {
        activeSpeakerRef.current = activeSpeaker;
    }, [activeSpeaker]);

    // Reset Hook state on candidate change to prevent carrying data over from the previous candidate
    useEffect(() => {
        if (!application?.id) return;
        setQuestions([]);
        setScores({});
        setObservations({});
        setQuestionNotes({});
        setChecklist({});
        setTranscriptBlocks([]);
        setSeconds(0);
        secondsRef.current = 0;
        setRecordingSeconds(0);
        setIsRecording(false);
        setIsStarted(false);
        setAudioBlob(null);
        setRatings({
            personalRating: 5,
            workHabits: '',
            communicationSkills: '',
            empathy: '',
            confidence: '',
            languageClassification: '',
            remarks: ''
        });
        setBackground({
            bpoChat: '',
            bpoVoice: '',
            nonBpo: '',
            shiftingIssues: '',
            education: '',
            shsStrand: '',
            pursueStudies: '',
            goAbroad: '',
            transportMode: '',
            medicalIssues: '',
            startAvailability: '',
            salaryExpectation: '',
            candidateSource: '',
            dateOfBirth: '',
            contactNumber: '',
            emailAddress: ''
        });
    }, [application?.id]);

    // Pre-populate background fields if application has them
    useEffect(() => {
        if (application) {
            const isSHS = application.pis?.highest_education === 'Senior High School Level' || application.pis?.highest_education === 'Senior High School Graduate';

            let educationString = (application as any).highest_education || application.pis?.highest_education || '';
            if (application.pis) {
                if (application.pis.is_graduated === false) {
                    if (application.pis.highest_education === 'College Graduate / Level') {
                        educationString = 'College Undergrad';
                    } else if (application.pis.highest_education === 'Senior High School Level') {
                        educationString = 'Senior High School Undergrad';
                    } else if (application.pis.course_year) {
                        educationString = application.pis.course_year;
                    }
                } else if (application.pis.is_graduated === true) {
                    if (application.pis.highest_education === 'College Graduate / Level') {
                        educationString = 'College Graduate';
                    } else if (application.pis.highest_education === 'Senior High School Level') {
                        educationString = 'Senior High School Graduate';
                    } else if (application.pis.course_year) {
                        educationString = application.pis.course_year;
                    }
                }
            }

            const metadata = (application as any).metadata || {};
            const savedChecklist = (metadata.checklist as Record<string, boolean>) || {};
            const savedRatings = (metadata.ratings as Record<string, any>) || {};
            const savedNotes = (metadata.question_notes as Record<string, string>) || {};

            if (Object.keys(savedNotes).length > 0) {
                setQuestionNotes(savedNotes);
            } else {
                setQuestionNotes({});
            }

            setBackground({
                bpoChat: metadata.bpo_experience_chat || '',
                bpoVoice: metadata.bpo_experience_voice || '',
                nonBpo: metadata.non_bpo_experience || '',
                shiftingIssues: metadata.issues_shifting_schedules || '',
                education: educationString || '',
                shsStrand: isSHS ? (application.pis?.course_strand || '') : '',
                pursueStudies: metadata.plans_to_pursue_studies || '',
                goAbroad: metadata.plans_to_go_abroad || '',
                transportMode: metadata.mode_of_transportation || '',
                medicalIssues: metadata.medical_issues || '',
                startAvailability: metadata.availability_to_start || '',
                salaryExpectation: metadata.salary_expectations || '',
                candidateSource: metadata.candidate_source || (application.pis as any)?.how_did_you_hear || '',
                dateOfBirth: metadata.date_of_birth || application.pis?.date_of_birth || '',
                contactNumber: metadata.contact_number || application.pis?.contact_number || '',
                emailAddress: metadata.email_address || application.pis?.email_address || application.applicant_email || ''
            });

            // In a final interview, the right-panel assessment is read-only and
            // carried over from the initial interview. Hydrate the local state
            // from application.metadata so the values are visible but not editable.
            if (isFinalStage) {
                if (Object.keys(savedChecklist).length > 0) {
                    setChecklist(savedChecklist);
                } else {
                    setChecklist({});
                }
                if (Object.keys(savedRatings).length > 0) {
                    setRatings({
                        personalRating: savedRatings.personalRating ?? 5,
                        workHabits: savedRatings.workHabits ?? '',
                        communicationSkills: savedRatings.communicationSkills ?? '',
                        empathy: savedRatings.empathy ?? '',
                        confidence: savedRatings.confidence ?? '',
                        languageClassification: savedRatings.languageClassification ?? '',
                        remarks: savedRatings.remarks ?? '',
                    });
                } else {
                    setRatings({
                        personalRating: 5,
                        workHabits: '',
                        communicationSkills: '',
                        empathy: '',
                        confidence: '',
                        languageClassification: '',
                        remarks: ''
                    });
                }
                // Hydrate the initial interview's transcript blocks so the
                // final interviewer can review what was said without running
                // live transcription again. Read-only via `readOnly` flag.
                const savedTranscript = metadata.initial_transcript?.blocks;
                if (Array.isArray(savedTranscript) && savedTranscript.length > 0) {
                    setTranscriptBlocks(savedTranscript);
                } else {
                    setTranscriptBlocks([]);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [application?.id, isFinalStage]);

    // Compile observations.checklist on change
    useEffect(() => {
        const formatCheckedLabel = (k: string, prefix: string) => {
            const parts = k.replace(`${prefix}_`, '').split('_');
            const cat = parts[0].toUpperCase();
            const label = parts.slice(1).join(' ').toUpperCase();
            return `[Category ${cat}] ${label}`;
        };

        const accentChecks = Object.keys(checklist)
            .filter(k => k.startsWith('accent_') && checklist[k])
            .map(k => formatCheckedLabel(k, 'accent'));

        const pronunciationChecks = Object.keys(checklist)
            .filter(k => k.startsWith('pron_') && checklist[k])
            .map(k => formatCheckedLabel(k, 'pron'));

        const grammarChecks = Object.keys(checklist)
            .filter(k => k.startsWith('gram_') && checklist[k])
            .map(k => formatCheckedLabel(k, 'gram'));

        const fluencyChecks = Object.keys(checklist)
            .filter(k => k.startsWith('fluency_') && checklist[k])
            .map(k => formatCheckedLabel(k, 'fluency'));

        let summaryText = '=========================================\n';
        summaryText += '        INTERVIEWER ASSESSMENT RUBRIC     \n';
        summaryText += '=========================================\n\n';

        summaryText += 'ACCENT:\n';
        summaryText += accentChecks.length > 0 ? accentChecks.map(c => `  [x] ${c}`).join('\n') : '  No specific observations';
        summaryText += '\n\n';

        summaryText += 'PRONUNCIATION:\n';
        summaryText += pronunciationChecks.length > 0 ? pronunciationChecks.map(c => `  [x] ${c}`).join('\n') : '  No specific observations';
        summaryText += '\n\n';

        summaryText += 'GRAMMAR & VOCABULARY:\n';
        summaryText += grammarChecks.length > 0 ? grammarChecks.map(c => `  [x] ${c}`).join('\n') : '  No specific observations';
        summaryText += '\n\n';

        summaryText += 'FLUENCY & COMPREHENSION:\n';
        summaryText += fluencyChecks.length > 0 ? fluencyChecks.map(c => `  [x] ${c}`).join('\n') : '  No specific observations';
        summaryText += '\n\n';

        summaryText += '=========================================\n';
        summaryText += '        APPLICANT BACKGROUND & EXP       \n';
        summaryText += '=========================================\n';
        summaryText += `BPO Experience (Chat): ${background.bpoChat || 'N/A'}\n`;
        summaryText += `BPO Experience (Voice): ${background.bpoVoice || 'N/A'}\n`;
        summaryText += `Non-BPO Experience: ${background.nonBpo || 'N/A'}\n`;
        summaryText += `Issues with Shifting Schedules: ${background.shiftingIssues || 'None'}\n`;
        summaryText += `Highest Educational Background: ${background.education || 'N/A'}\n`;
        if (background.shsStrand) {
            summaryText += `Strand: ${background.shsStrand}\n`;
        }
        summaryText += `Plans to Pursue Studies: ${background.pursueStudies || 'None'}\n`;
        summaryText += `Plans to Go Abroad: ${background.goAbroad || 'None'}\n`;
        summaryText += `Mode of Transportation: ${background.transportMode || 'N/A'}\n`;
        summaryText += `Medical Issues: ${background.medicalIssues || 'None'}\n`;
        summaryText += `Availability to Start: ${background.startAvailability || 'N/A'}\n`;
        summaryText += `Salary Expectations: ${background.salaryExpectation || 'N/A'}\n`;
        summaryText += `Candidate Source: ${background.candidateSource || 'N/A'}\n\n`;

        summaryText += '=========================================\n';
        summaryText += '        RATINGS & CLASSIFICATIONS        \n';
        summaryText += '=========================================\n';
        summaryText += `Personal Rating: ${ratings.personalRating}/10\n`;
        if (ratings.workHabits) summaryText += `Work Habits/Attitude: ${ratings.workHabits}\n`;
        if (ratings.communicationSkills) summaryText += `Communication Skills: ${ratings.communicationSkills}\n`;
        if (ratings.empathy) summaryText += `Empathy: ${ratings.empathy}\n`;
        if (ratings.confidence) summaryText += `Confidence: ${ratings.confidence}\n`;
        if (ratings.languageClassification) summaryText += `Language Classification: ${ratings.languageClassification}\n`;
        if (ratings.remarks) summaryText += `\nRemarks:\n${ratings.remarks}\n`;

        setObservations(prev => ({
            ...prev,
            checklist: summaryText
        }));
    }, [checklist, ratings, background]);

    const [selectedLob, setSelectedLobState] = useState<string>('');
    const [availableLobs, setAvailableLobs] = useState<string[]>([]);

    useEffect(() => {
        if (application) {
            const initLob = application.metadata?.custom_lob || (application as any).custom_lob || '';
            setSelectedLobState(initLob);
        }
    }, [application?.id]);

    const setSelectedLob = useCallback((newLob: string) => {
        setSelectedLobState(newLob);
        if (application?.id) {
            void ApplicationService.patch(application.id, {
                metadata: {
                    ...(application.metadata || {}),
                    custom_lob: newLob
                }
            });
        }
    }, [application]);

    const loadQuestions = useCallback(async () => {
        if (!application) return;
        setLoadingQuestions(true);
        try {
            const allQ = await QuestionService.getAll();

            const targetType = isFinalStage ? 'final' : 'initial';
            
            const rawVal = application.pis?.final_account || application.endorsement_account || application.department || (application as any).account || '';
            const failedAccounts = (application.metadata?.failed_accounts || []).map((f: any) => String(f || '').trim().toLowerCase()).filter(Boolean);
            const isAccFailed = (accName: string) => {
                const accLower = String(accName || '').trim().toLowerCase();
                if (!accLower) return false;
                return failedAccounts.some((f: string) => accLower === f || accLower.startsWith(f) || f.startsWith(accLower) || accLower.includes(f) || f.includes(accLower));
            };

            const accounts = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
            const remaining = accounts.filter((acc: string) => !isAccFailed(acc));
            
            let matchedString = remaining[0] || accounts[0] || '';

            if (resolvedActiveAccount && resolvedActiveAccount.toLowerCase() !== 'all') {
                const activeUpper = resolvedActiveAccount.trim().toUpperCase();
                const matched = remaining.find((acc: string) => acc.trim().toUpperCase() === activeUpper || acc.trim().toUpperCase().startsWith(activeUpper));
                if (matched) {
                    matchedString = matched;
                } else {
                    const fallbackMatched = accounts.find((acc: string) => acc.trim().toUpperCase() === activeUpper || acc.trim().toUpperCase().startsWith(activeUpper));
                    if (fallbackMatched) matchedString = fallbackMatched;
                }
            }

            let candidateAcc = resolvedActiveAccount || '';
            let candidateLob = '';

            if (resolvedActiveAccount && resolvedActiveAccount.toLowerCase() !== 'all') {
                const accountPrefixRegex = new RegExp(`^${resolvedActiveAccount}\\b\\s*[-:]*\\s*`, 'i');
                if (accountPrefixRegex.test(matchedString)) {
                    const stripped = matchedString.replace(accountPrefixRegex, '').trim();
                    if (stripped) {
                        candidateLob = stripped;
                    } else {
                        candidateLob = matchedString;
                    }
                } else {
                    candidateLob = matchedString;
                }
            } else {
                candidateAcc = matchedString;
                candidateLob = (application as any).custom_lob || application.metadata?.custom_lob || application.pis?.custom_lob || application.pis?.hiring_type || (application as any).hiring_type || (application as any).lob || '';
            }

            const candidateAccUpper = candidateAcc ? candidateAcc.trim().toUpperCase() : '';
            const isAbbottAcc = candidateAccUpper.includes('ABBOT');
            const lobsForAcc = new Set<string>();
            if (candidateAcc && !isAbbottAcc) lobsForAcc.add(candidateAcc.trim());

            allQ.forEach(q => {
                const qAcc = String(q.account || 'ALL').trim().toUpperCase();
                if (qAcc !== 'ALL' && (qAcc === candidateAccUpper || (candidateAccUpper && (candidateAccUpper.includes(qAcc) || qAcc.includes(candidateAccUpper))))) {
                    if (q.lob && q.lob.toUpperCase() !== 'ALL') {
                        lobsForAcc.add(q.lob.trim());
                    }
                }
            });
            accounts.forEach((acc: string) => {
                if (candidateAccUpper && acc.toUpperCase().startsWith(candidateAccUpper)) {
                    const accountPrefixRegex = new RegExp(`^${candidateAccUpper}\\b\\s*[-:]*\\s*`, 'i');
                    const stripped = acc.replace(accountPrefixRegex, '').trim();
                    if (stripped && stripped.toUpperCase() !== candidateAccUpper) {
                        lobsForAcc.add(stripped);
                    }
                }
            });
            if (candidateLob && candidateLob.toUpperCase() !== candidateAccUpper) {
                if (isAbbottAcc || (!candidateLob.toUpperCase().includes('INBOUND PATIENT') && !candidateLob.toUpperCase().includes('EXTENDED ADHERENCE'))) {
                    lobsForAcc.add(candidateLob.trim());
                }
            }

            const uniqueLobs = new Set<string>();
            Array.from(lobsForAcc).forEach(l => {
                const lUpper = l.trim().toUpperCase();
                if (!isAbbottAcc && (lUpper.includes('ABBOTT') || lUpper.includes('ABBOT') || lUpper.includes('INBOUND PATIENT') || lUpper.includes('EXTENDED ADHERENCE'))) {
                    return;
                }
                uniqueLobs.add(lUpper);
            });
            const filteredLobs = Array.from(uniqueLobs);

            setAvailableLobs(filteredLobs);

            let effectiveLob = selectedLob || candidateLob;
            if (!isAbbottAcc && effectiveLob) {
                const effUpper = effectiveLob.trim().toUpperCase();
                if (effUpper.includes('INBOUND PATIENT') || effUpper.includes('EXTENDED ADHERENCE') || effUpper.includes('ABBOTT')) {
                    effectiveLob = candidateAcc;
                }
            }

            const accountAndLobFiltered = QuestionService.filterForApplication(allQ, candidateAcc, effectiveLob);

            const filteredQs = accountAndLobFiltered
                .filter(q => q.is_active && (q.question_type === targetType || (q as any).questionType === targetType))
                .sort((a, b) => (a.question_order || 0) - (b.question_order || 0));

            setQuestions(filteredQs);
        } catch {
            error('Protocol Error', 'Failed to retrieve assessment criteria.');
        } finally {
            setLoadingQuestions(false);
        }
    }, [error, application?.id, application?.current_status, application?.queue_type, isFinalStage, selectedLob, resolvedActiveAccount]);

    useEffect(() => {
        void loadQuestions();
    }, [loadQuestions]);

    useEffect(() => {
        if (application && questions.length > 0) {
            setScores(prev => {
                const newScores = { ...prev };
                let updated = false;

                questions.forEach(q => {
                    if (newScores[q.id] === undefined) {
                        const txt = q.question_text.toLowerCase();

                        if (txt.includes('interview date') || (txt.includes('date') && !txt.includes('birth') && !txt.includes('candidate') && !txt.includes('applicant'))) {
                            const today = new Date().toISOString().split('T')[0];
                            newScores[q.id] = today;
                            updated = true;
                        }
                        else if (txt.includes("candidate's complete name") || txt.includes("candidate's name") || txt.includes("applicant's name") || (txt.includes("name") && txt.includes("complete"))) {
                            newScores[q.id] = application.applicant_name;
                            updated = true;
                        }
                        else if (txt.includes("position") && (txt.includes("apply") || txt.includes("applying"))) {
                            const pos = application.position_title || '';
                            const options = q.options || [];

                            const matchedOpt = options.find(opt => opt.toLowerCase() === pos.toLowerCase());
                            if (matchedOpt) {
                                newScores[q.id] = matchedOpt;
                            } else {
                                newScores[q.id] = `Other: ${pos}`;
                            }
                            updated = true;
                        }
                    }
                });

                return updated ? newScores : prev;
            });
        }
    }, [questions, application]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isStarted) {
            interval = setInterval(() => {
                setSeconds(s => {
                    const newVal = s + 1;
                    secondsRef.current = newVal;
                    return newVal;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isStarted]);

    useEffect(() => {
        if (application?.current_status === 'INTERVIEW_IN_PROGRESS') {
            setIsStarted(true);
        }
    }, [application?.current_status]);

    const statusUpdatingRef = useRef(false);
    const isFinalizingRef = useRef(false);

    useEffect(() => {
        if (!isStarted || !application || statusUpdatingRef.current || isFinalizingRef.current) return;

        const syncStatus = async () => {
            if (application.current_status !== 'INTERVIEW_IN_PROGRESS') {
                statusUpdatingRef.current = true;
                const isRecruiterUnassigned = !application.assigned_recruiter_id && !application.assigned_ops_validator_id;
                
                const patch: any = {
                    metadata: {
                        ...(application.metadata || {}),
                        active_interview_type: isFinalStage ? 'FINAL' : 'INITIAL'
                    }
                };

                if (isRecruiterUnassigned && user?.full_name) {
                    if (isFinalStage) {
                        patch.assigned_ops_validator_id = String(user.id);
                        patch.assigned_ops_validator_name = user.full_name;
                        patch.metadata.assigned_ops_validator_id = String(user.id);
                        patch.metadata.assigned_ops_validator_name = user.full_name;
                        patch.metadata.active_ops_validator_name = user.full_name;
                    } else {
                        patch.assigned_recruiter_id = String(user.id);
                        patch.assigned_recruiter_name = user.full_name;
                        patch.metadata.assigned_recruiter_id = String(user.id);
                        patch.metadata.assigned_recruiter_name = user.full_name;
                    }
                }

                void ApplicationService.updateStatus({
                    id: application.id,
                    fromStatus: application.current_status,
                    toStatus: 'INTERVIEW_IN_PROGRESS',
                    changedByName: user?.full_name || 'Interviewer',
                    reason: 'Interview session started',
                    patch
                }).catch(err => {
                    statusUpdatingRef.current = false;
                    console.error('[useInterviewSession] Failed to update status to INTERVIEW_IN_PROGRESS:', err);
                });
            }
        };

        syncStatus();
    }, [isStarted, application, user?.id, user?.full_name, isFinalStage]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isRecording) {
            interval = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    useEffect(() => {
        if (questions.length === 0) return;
        const firstUnanswered = questions.findIndex(q => scores[q.id] === undefined);
        setCurrentStep(firstUnanswered === -1 ? questions.length : firstUnanswered);
    }, [scores, questions]);

    // Load from cache on init
    useEffect(() => {
        if (!application?.id) return;
        setIsRestored(false);
        try {
            const cacheKey = `interview_session_${application.id}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                if (data.scores) setScores(data.scores);
                if (data.observations) setObservations(data.observations);
                if (data.questionNotes) setQuestionNotes(data.questionNotes);
                if (data.checklist) setChecklist(data.checklist);
                if (data.ratings) setRatings(data.ratings);
                if (data.background) setBackground(data.background);
                if (typeof data.seconds === 'number') {
                    setSeconds(data.seconds);
                    secondsRef.current = data.seconds;
                }
                console.log('[useInterviewSession] Restored interview progress from smart cache.');
            }
        } catch (e) {
            console.warn('[useInterviewSession] Failed to restore progress from cache:', e);
        } finally {
            setIsRestored(true);
        }
    }, [application?.id]);

    useEffect(() => {
        if (!application || !isRestored) return;
        const cacheKey = `interview_session_${application.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) {
            const grading = application.interview_grading || {};
            if (Object.keys(grading).length > 0) {
                setScores(prev => ({ ...prev, ...grading }));
            }
            const meta = typeof application.metadata === 'string' ? JSON.parse(application.metadata) : (application.metadata || {});
            if (meta.background) setBackground(prev => ({ ...prev, ...meta.background }));
            if (meta.checklist) setChecklist(prev => ({ ...prev, ...meta.checklist }));
            if (meta.ratings) setRatings(prev => ({ ...prev, ...meta.ratings }));
            if (meta.question_notes) setQuestionNotes(prev => ({ ...prev, ...meta.question_notes }));
            if (typeof meta.draft_seconds === 'number') {
                setSeconds(meta.draft_seconds);
                secondsRef.current = meta.draft_seconds;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [application?.id, isRestored]);

    // Save to cache on any state change after initial restore has finished
    useEffect(() => {
        if (!application?.id || !isRestored) return;
        try {
            const cacheKey = `interview_session_${application.id}`;
            const payload = {
                scores,
                observations,
                questionNotes,
                checklist,
                ratings,
                background,
                seconds: secondsRef.current
            };
            localStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch (e) {
            console.warn('[useInterviewSession] Failed to cache progress:', e);
        }
    }, [application?.id, isRestored, scores, observations, questionNotes, checklist, ratings, background]);

    const stateRef = useRef({ scores, questionNotes, checklist, ratings, background, observations });
    useEffect(() => {
        stateRef.current = { scores, questionNotes, checklist, ratings, background, observations };
    }, [scores, questionNotes, checklist, ratings, background, observations]);

    const saveProgress = useCallback(async () => {
        if (!application?.id || !isRestored || !isStarted || isFinalizingRef.current) return;
        setSaveStatus('saving');
        try {
            const currentData = stateRef.current;
            const meta = typeof application.metadata === 'string' ? JSON.parse(application.metadata) : (application.metadata || {});
            const updatedMeta = {
                ...meta,
                question_notes: currentData.questionNotes,
                checklist: currentData.checklist,
                ratings: currentData.ratings,
                background: currentData.background,
                draft_seconds: secondsRef.current
            };
            const interviewGrading: Record<string, number> = {};
            const { default: _defaultObs, ...filteredObservations } = currentData.observations || {};
            const combinedResponses: Record<string, string> = { ...filteredObservations };

            Object.entries(currentData.scores).forEach(([qId, value]) => {
                if (typeof value === 'number') {
                    interviewGrading[qId] = value;
                } else if (value && typeof value === 'string') {
                    const currentObs = combinedResponses[qId] || '';
                    combinedResponses[qId] = `${value.toUpperCase()}${currentObs ? '\n\n' + currentObs : ''}`;
                }
            });

            const patchPayload = {
                interview_grading: { ...(typeof application.interview_grading === 'string' ? JSON.parse(application.interview_grading || '{}') : (application.interview_grading || {})), ...interviewGrading },
                interview_responses: { ...(typeof application.interview_responses === 'string' ? JSON.parse(application.interview_responses || '{}') : (application.interview_responses || {})), ...combinedResponses },
                metadata: updatedMeta,
                change_reason: 'Autosave'
            };

            await ApplicationService.patch(application.id, patchPayload as any);
            setSaveStatus('saved');
        } catch (err) {
            console.error('[useInterviewSession] Auto-save to database failed:', err);
            setSaveStatus('error');
        }
    }, [application?.id, isRestored, isStarted]);

    // Debounced database sync for all evaluation changes
    useEffect(() => {
        if (!application?.id || !isRestored || !isStarted) return;

        const timer = setTimeout(() => {
            void saveProgress();
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timer);
    }, [application?.id, isRestored, isStarted, checklist, ratings, background, scores, questionNotes, observations]);

    const startRecording = async (deviceId?: string) => {
        try {
            // 1. Prompt for display media to capture system/internal audio
            let systemStream: MediaStream | null = null;
            try {
                systemStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { width: 1, height: 1 },
                    audio: true
                });
            } catch (systemErr) {
                console.warn('[startRecording] System audio/display media capture bypassed or failed:', systemErr);
            }

            // 2. Prompt for microphone audio
            const constraints: MediaStreamConstraints = {
                audio: deviceId ? { deviceId: deviceId } : true
            };
            const micStream = await navigator.mediaDevices.getUserMedia(constraints);
            micStreamRef.current = micStream;

            let finalStream: MediaStream = micStream;

            // 3. Mix streams if system audio is present
            if (systemStream && systemStream.getAudioTracks().length > 0) {
                screenStreamRef.current = systemStream;
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioCtxRef.current = audioCtx;

                const destination = audioCtx.createMediaStreamDestination();

                const micSource = audioCtx.createMediaStreamSource(micStream);
                micSource.connect(destination);

                const systemSource = audioCtx.createMediaStreamSource(new MediaStream(systemStream.getAudioTracks()));
                systemSource.connect(destination);

                finalStream = destination.stream;
            } else if (systemStream) {
                // Clean up display stream tracks if no audio was captured/provided
                systemStream.getTracks().forEach(track => track.stop());
            }

            const recorder = new MediaRecorder(finalStream, { mimeType: 'audio/webm' });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);

                // Safe cleanup of all media resources
                if (micStreamRef.current) {
                    micStreamRef.current.getTracks().forEach(track => track.stop());
                    micStreamRef.current = null;
                }
                if (screenStreamRef.current) {
                    screenStreamRef.current.getTracks().forEach(track => track.stop());
                    screenStreamRef.current = null;
                }
                if (audioCtxRef.current) {
                    void audioCtxRef.current.close();
                    audioCtxRef.current = null;
                }
            };
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            success('Recording Initialized', 'Microphone and system audio loopback mixed successfully.');
        } catch (err) {
            console.error('[startRecording] Failed:', err);
            error('Hardware Error', 'Could not initialize mixed capture stream.');
        }
    };

    const stopRecording = useCallback(() => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
            success('Recording Logged', 'Audio telemetry finalized.');
        }
    }, [mediaRecorder, success]);

    const finalizeSession = useCallback(async (
        verdict?: 'PASSED' | 'FAILED' | 'PENDING' | 'WAITLISTED' | 'WITHDRAWN' | 'NOT_ELIGIBLE' | 'BLACKLIST' | 'PROMOTED' | 'LATERAL',
        endorsementParams?: {
            isSpecialized?: boolean;
            department?: string;
            meetingDate?: string;
            meetingEndDate?: string;
            meetingBody?: string;
            assignedOpsValidatorId?: string;
            assignedOpsValidatorName?: string;
            withOutlook?: boolean;
        }
    ) => {
        isFinalizingRef.current = true;
        if (!application) {
            console.error('[useInterviewSession] Cannot finalize session: No application linked to room.');
            error('Critical Error', 'Session data integrity failure. No application identified.');
            return;
        }

        console.log('[useInterviewSession] Starting session finalization...', {
            appId: application.id,
            roomId,
            scoresCount: Object.keys(scores).length,
            hasEndorsementParams: !!endorsementParams
        });

        await withLoading(async () => {
            try {
                const roomPatch = { status: 'AVAILABLE' as const, current_application_id: null, current_applicant_name: null, occupied_since: null };

                console.log('[useInterviewSession] Cleaning up queue entries...');
                const qEntries = await QueueService.getTodaysQueue();
                const entry = qEntries.find((e: any) => e.application_id === application.id);
                if (entry) {
                    try {
                        await QueueService.delete(entry.id);
                        console.log('[useInterviewSession] Queue entry deleted:', entry.id);
                    } catch (e) {
                        console.warn('[useInterviewSession] Failed to delete queue entry:', e);
                    }
                }

                const interviewGrading: Record<string, number> = {};
                const { default: _defaultObs, ...filteredObservations } = observations;
                const combinedResponses: Record<string, string> = { ...filteredObservations };

                Object.entries(scores).forEach(([qId, value]) => {
                    if (typeof value === 'number') {
                        interviewGrading[qId] = value;
                    } else if (value && typeof value === 'string') {
                        const currentObs = combinedResponses[qId] || '';
                        combinedResponses[qId] = `${value.toUpperCase()}${currentObs ? '\n\n' + currentObs : ''}`;
                    }
                });

                const generateNotesString = () => {
                    const uniqueNotes = Array.from(new Set(Object.values(combinedResponses).map(s => String(s).trim()).filter(Boolean)));
                    return uniqueNotes.join('\n\n');
                };

                let nextStatus: ApplicationStatus;
                let targetColumn: string | undefined;
                const additionalPatch: any = {};
                const interviewDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                additionalPatch.interview_completed_at = new Date().toISOString();

                // Set interviewer as the person who actually entered the room and completed the interview
                if (isFinalStage) {
                    additionalPatch.assigned_ops_validator_id = user?.id || null;
                    additionalPatch.assigned_ops_validator_name = user?.full_name || 'System';
                } else {
                    additionalPatch.assigned_recruiter_id = user?.id || null;
                    additionalPatch.assigned_recruiter_name = user?.full_name || 'System';
                }



                const globalActiveAccount = useActiveAccountStore.getState().activeAccount;
                const userAccounts = parseAccounts(user?.department);
                const resolvedActiveAccount = (globalActiveAccount && userAccounts.map(a => a.toUpperCase()).includes(globalActiveAccount.toUpperCase()))
                    ? globalActiveAccount
                    : (userAccounts[0] || 'DOORDASH');

                const depts = (application.department || '').split(',').map((s: any) => s.trim()).filter(Boolean);
                const failedAccounts = application.metadata?.failed_accounts || [];
                const matchedActive = depts.find(d => {
                    const dl = d.trim().toLowerCase();
                    const al = resolvedActiveAccount.trim().toLowerCase();
                    return dl === al || dl.startsWith(al) || al.startsWith(dl);
                });
                const activeAccount = matchedActive || depts.find((d: any) => !failedAccounts.some((f: any) => f.trim().toLowerCase() === d.toLowerCase()));
                const newFailedAccounts = [...failedAccounts];
                if (verdict === 'FAILED' && activeAccount && !newFailedAccounts.some((f: any) => f.trim().toLowerCase() === activeAccount.toLowerCase())) {
                    newFailedAccounts.push(activeAccount);
                }
                const remainingAccounts = depts.filter((d: any) => !newFailedAccounts.some((f: any) => f.trim().toLowerCase() === d.toLowerCase()));

                if (verdict === 'PASSED') {
                    if (isFinalStage) {
                        const dept = (application.department || '').toUpperCase();
                        const metadata = application.metadata || {};
                        const isExplicitlyEndorsed = !!application.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';

                        if (isExplicitlyEndorsed || ['KELLER POSTMAN', 'AUTO APPROVE'].includes(dept)) {
                            nextStatus = 'CLIENT_ASSESSMENT';
                        } else if (['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].includes(dept)) {
                            nextStatus = 'CLIENT_INTERVIEW';
                        } else {
                            nextStatus = 'FOR_JOB_OFFER';
                        }
                        if (nextStatus === 'PASSED' || nextStatus === 'FOR_JOB_OFFER') {
                            targetColumn = 'MASTERLIST';

                            // Automate Masterlist Fields on Final Pass
                            additionalPatch.hired_at = new Date().toISOString();
                            additionalPatch.master_remarks = `Ops Val Interview PASSED - Endorsed to ${activeAccount || application.department}`;

                            // Enhanced Name Parsing
                            if (!application.master_last_name || !application.master_first_name) {
                                const name = application.applicant_name;
                                if (name.includes(',')) {
                                    const parts = name.split(',').map(s => s.trim());
                                    additionalPatch.master_last_name = parts[0];
                                    if (parts[1]) {
                                        const subParts = parts[1].split(' ');
                                        additionalPatch.master_first_name = subParts[0];
                                        additionalPatch.master_middle_name = subParts.slice(1).join(' ');
                                    }
                                } else {
                                    const parts = name.split(' ');
                                    if (parts.length >= 2) {
                                        additionalPatch.master_last_name = parts[parts.length - 1];
                                        additionalPatch.master_first_name = parts[0];
                                        additionalPatch.master_middle_name = parts.slice(1, -1).join(' ');
                                    }
                                }
                            }
                        }

                        // Intelligent Salary Lookup
                        const salaryInfo = SALARY_DATA.find(s => s.account.toLowerCase().includes((application.department || '').toLowerCase()) || (application.department || '').toLowerCase().includes(s.account.toLowerCase()));
                        if (salaryInfo) {
                            const tier = salaryInfo.tiers[0];
                            const entry = tier.entries.find(e =>
                                application.position_title.toLowerCase().includes(e.position.toLowerCase()) ||
                                e.position.toLowerCase().includes(application.position_title.toLowerCase())
                            );
                            if (entry) {
                                const parseSal = (s: string) => {
                                    const cleaned = s.replace(/[^\d.]/g, '');
                                    const val = parseFloat(cleaned);
                                    return isNaN(val) ? 0 : val;
                                };
                                additionalPatch.master_basic_salary = parseSal(entry.salary);
                                additionalPatch.master_allowance = parseSal(entry.incentives);
                            }
                        }

                        // Ensure PIS fields are updated
                        additionalPatch.pis = {
                            ...(application.pis || {}),
                            final_account: activeAccount || application.department,
                            final_interview_result: 'PASSED',
                            overall_status: 'PASSED',
                            final_specific_status: 'OV - Passed',
                            interview_completed_at: interviewDate,
                            ops_validator_email: user?.email || 'System',
                            ops_validator_status: 'PASSED',
                            ops_validator_notes: generateNotesString(),
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };
                    } else {
                        // Initial Interview Pass
                        const isOnCall = (application.position_title || '').toLowerCase().includes('[on-call]') ||
                            (application.position_title || '').toLowerCase().includes('[on call]') ||
                            String(application.metadata?.interview_mode || '').toLowerCase() === 'online' ||
                            String(application.metadata?.interview_mode || '').toLowerCase() === 'on-call' ||
                            String(application.pis?.preferred_setup || '').toLowerCase() === 'online' ||
                            String(application.pis?.preferred_setup || '').toLowerCase() === 'on-call';
                        nextStatus = isOnCall ? 'TYPING_TEST' : 'ASSESSMENT';
                        if (endorsementParams) {
                            if (endorsementParams.isSpecialized) {
                                additionalPatch.endorsed_to_recruiter_s = true;
                                additionalPatch.recruiter_s_scheduling_status = 'PENDING';
                                if (endorsementParams.department) {
                                    additionalPatch.department = endorsementParams.department;
                                }
                            } else {
                                additionalPatch.endorsement_meeting_date = endorsementParams.meetingDate;
                                additionalPatch.endorsement_meeting_end_date = endorsementParams.meetingEndDate;
                                additionalPatch.endorsement_meeting_body = endorsementParams.meetingBody;
                                additionalPatch.assigned_ops_validator_id = endorsementParams.assignedOpsValidatorId;
                                additionalPatch.assigned_ops_validator_name = endorsementParams.assignedOpsValidatorName;
                                if (endorsementParams.department) {
                                    additionalPatch.department = endorsementParams.department;
                                }
                                additionalPatch.recruiter_s_scheduling_status = endorsementParams.withOutlook ? 'SCHEDULED' : 'PENDING';
                            }
                        }

                        // Automate PIS Fields on Initial Pass
                        additionalPatch.pis = {
                            ...(application.pis || {}),
                            initial_account_assignment: endorsementParams?.department || application.department,
                            initial_interview_results: 'PASSED',
                            final_specific_status: 'Initial Interview - Passed',
                            interview_type: 'INITIAL',
                            interview_completed_at: interviewDate,
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };

                        // Ensure final remarks are set
                        additionalPatch.master_remarks = `Initial Interview PASSED - For Endorsement/Assessment`;
                    }
                } else if (verdict === 'FAILED') {
                    if (isFinalStage) {
                        if (remainingAccounts.length > 0) {
                            nextStatus = 'FINAL_INTERVIEW';
                            additionalPatch.endorsement_meeting_date = null;
                            additionalPatch.endorsement_meeting_end_date = null;
                            additionalPatch.assigned_ops_validator_id = null;
                            additionalPatch.assigned_ops_validator_name = "";
                            additionalPatch.recruiter_s_scheduling_status = "PENDING";
                            additionalPatch.pis = {
                                ...(application.pis || {}),
                                final_interview_result: 'FAILED',
                                overall_status: 'FINAL_INTERVIEW',
                                final_specific_status: 'OV - Failed (Reschedule)',
                                interview_completed_at: interviewDate,
                                ops_validator_email: user?.email || 'System',
                                ops_validator_status: 'FAILED',
                                ops_validator_notes: generateNotesString(),
                                last_updated_by: user?.full_name || 'System (Interview)',
                            };
                        } else {
                            nextStatus = 'REJECTED';
                            additionalPatch.pis = {
                                ...(application.pis || {}),
                                final_interview_result: 'FAILED',
                                overall_status: 'REJECTED',
                                final_specific_status: 'OV - Failed',
                                interview_completed_at: interviewDate,
                                ops_validator_email: user?.email || 'System',
                                ops_validator_status: 'FAILED',
                                ops_validator_notes: generateNotesString(),
                                last_updated_by: user?.full_name || 'System (Interview)',
                            };
                        }
                    } else {
                        nextStatus = 'REJECTED';
                        additionalPatch.department = null;
                        additionalPatch.pis = {
                            ...(application.pis || {}),
                            initial_account_assignment: null,
                            initial_interview_results: 'FAILED',
                            final_specific_status: 'Initial Interview - Failed',
                            interview_type: 'INITIAL',
                            interview_completed_at: interviewDate,
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };
                    }
                } else if (verdict === 'PENDING') {
                    nextStatus = 'MARKED_PENDING';
                    additionalPatch.metadata = {
                        ...(application.metadata || {}),
                        pending_from_status: isFinalStage ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW'
                    };
                    if (isFinalStage) {
                        additionalPatch.pis = {
                            ...(application.pis || {}),
                            final_specific_status: 'Marked Pending - Final Interview',
                            interview_completed_at: interviewDate,
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };
                    } else {
                        additionalPatch.pis = {
                            ...(application.pis || {}),
                            final_specific_status: 'Initial Interview - Pending',
                            specific_status: 'Marked Pending - Initial Interview',
                            interview_type: 'INITIAL',
                            interview_completed_at: interviewDate,
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };
                    }
                } else if (verdict === 'WAITLISTED') {
                    nextStatus = 'WAITLISTED';
                } else if (verdict === 'WITHDRAWN') {
                    nextStatus = 'WITHDRAWN';
                } else if (verdict === 'NOT_ELIGIBLE') {
                    nextStatus = 'NOT_ELIGIBLE_FOR_REHIRE';
                } else if (verdict === 'BLACKLIST') {
                    nextStatus = 'REJECTED';
                    additionalPatch.department = null;
                    additionalPatch.pis = {
                        ...(application.pis || {}),
                        initial_account_assignment: null,
                        final_specific_status: 'Blacklist',
                        last_updated_by: user?.full_name || 'System (Interview)',
                    };
                } else if (verdict === 'PROMOTED') {
                    additionalPatch.metadata = { ...(application.metadata || {}), is_promotion: true, is_lateral_transfer: false };
                    nextStatus = isFinalStage ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                } else if (verdict === 'LATERAL') {
                    additionalPatch.metadata = { ...(application.metadata || {}), is_promotion: false, is_lateral_transfer: true };
                    nextStatus = isFinalStage ? 'FINAL_INTERVIEW' : 'INITIAL_INTERVIEW';
                } else {
                    nextStatus = isFinalStage ? 'FINAL_VERDICT' : 'ASSESSMENT';
                }

                let audioUploadUrl: string | undefined;
                if (audioBlob) {
                    console.log('[useInterviewSession] Uploading interview recording...');
                    try {
                        audioUploadUrl = await RecordingService.upload(audioBlob, application.id);
                        console.log('[useInterviewSession] Recording uploaded:', audioUploadUrl);
                    } catch (err) {
                        console.error('[useInterviewSession] Failed to upload recording:', err);
                    }
                }

                const transcriptData = transcriptBlocks.length > 0 ? { blocks: transcriptBlocks, saved_at: new Date().toISOString() } : undefined;

                // Define Double-Redundant Background & Experience DB patch
                const backgroundPatch = {
                    highest_education: background.education || undefined,
                    plans_to_pursue_studies: background.pursueStudies || undefined,
                    plans_to_go_abroad: background.goAbroad || undefined,
                    travel_method: background.transportMode || undefined,
                    flexible_schedule: undefined,
                    medical_history_notes: background.medicalIssues || undefined,

                    // Fallback JSON metadata for full offline-resiliency and backend variations
                    metadata: {
                        ...(typeof application.metadata === 'string' ? JSON.parse(application.metadata) : application.metadata),
                        hiring_type: (application as any).hiring_type || application.metadata?.hiring_type || application.pis?.hiring_type,
                        initial_account_assignment: (!isFinalStage && verdict === 'FAILED') ? null : (endorsementParams?.department || application.department),
                        failed_accounts: newFailedAccounts,
                        ...(verdict === 'FAILED' && remainingAccounts.length > 0 ? { recruiter_s_scheduling_status: 'PENDING' } : {}),
                        bpo_experience_chat: background.bpoChat || null,
                        bpo_experience_voice: background.bpoVoice || null,
                        non_bpo_experience: background.nonBpo || null,
                        issues_shifting_schedules: background.shiftingIssues || null,
                        highest_education: background.education || null,
                        shs_strand: background.shsStrand || null,
                        plans_to_pursue_studies: background.pursueStudies || null,
                        plans_to_go_abroad: background.goAbroad || null,
                        mode_of_transportation: background.transportMode || null,
                        medical_issues: background.medicalIssues || null,
                        availability_to_start: background.startAvailability || null,
                        salary_expectations: background.salaryExpectation || null,
                        candidate_source: background.candidateSource || null,
                        ratings: ratings || null,
                        checklist: checklist || null,
                        question_notes: questionNotes || null,
                        // Endorsement flags
                        ...(endorsementParams ? (
                            endorsementParams.isSpecialized ? {
                                endorsed_to_recruiter_s: true,
                                recruiter_s_scheduling_status: 'PENDING'
                            } : {
                                endorsement_confirmed: true,
                                recruiter_s_scheduling_status: endorsementParams.withOutlook ? 'SCHEDULED' : 'PENDING'
                            }
                        ) : {}),
                        // Recording/Transcript URLs
                        initial_recording_url: isFinalStage ? (typeof application.metadata === 'string' ? JSON.parse(application.metadata).initial_recording_url : application.metadata?.initial_recording_url) : audioUploadUrl,
                        initial_transcript: isFinalStage ? (typeof application.metadata === 'string' ? JSON.parse(application.metadata).initial_transcript : application.metadata?.initial_transcript) : transcriptData,
                        final_recording_url: isFinalStage ? audioUploadUrl : undefined,
                        final_transcript: isFinalStage ? transcriptData : undefined
                    }
                };

                // Local storage backup database fallback for catastrophic hardware/API disconnects
                try {
                    localStorage.setItem(`interview_backup_${application.id}`, JSON.stringify({
                        timestamp: new Date().toISOString(),
                        applicantId: application.id,
                        applicantName: application.applicant_name,
                        verdict,
                        scores,
                        observations: combinedResponses,
                        background,
                        ratings,
                        checklist,
                        questionNotes,
                        metadata: JSON.stringify({
                            ...(typeof application.metadata === 'string' ? JSON.parse(application.metadata) : application.metadata),
                            checklist,
                            ratings,
                            background,
                            question_notes: questionNotes,
                            initial_recording_url: isFinalStage ? (typeof application.metadata === 'string' ? JSON.parse(application.metadata).initial_recording_url : application.metadata?.initial_recording_url) : audioUploadUrl,
                            initial_transcript: isFinalStage ? (typeof application.metadata === 'string' ? JSON.parse(application.metadata).initial_transcript : application.metadata?.initial_transcript) : transcriptData,
                            final_recording_url: isFinalStage ? audioUploadUrl : undefined,
                            final_transcript: isFinalStage ? transcriptData : undefined
                        })
                    }));
                    console.log('[useInterviewSession] Local storage database fallback backup successfully saved.');
                } catch (backupErr) {
                    console.warn('[useInterviewSession] Failed to write local storage fallback backup:', backupErr);
                }

                console.log('[useInterviewSession] Updating application status...', { nextStatus });
                await ApplicationService.updateStatus({
                    id: application.id,
                    fromStatus: application.current_status,
                    toStatus: nextStatus,
                    changedByName: 'Audit Officer',
                    reason: 'Protocol completed successfully',
                    patch: {
                        ...additionalPatch,
                        ...backgroundPatch,
                        metadata: {
                            ...(backgroundPatch.metadata || {}),
                            failed_accounts: newFailedAccounts,
                            initial_interview_results: !isFinalStage ? verdict : (application.metadata?.initial_interview_results || 'PASSED'),
                            ops_validator_status: isFinalStage ? (verdict === 'PASSED' ? 'PASSED' : (verdict === 'FAILED' ? 'FAILED' : verdict)) : (application.metadata?.ops_validator_status || 'PENDING'),
                            final_interview_result: isFinalStage ? (verdict === 'PASSED' ? 'PASSED' : (verdict === 'FAILED' ? 'FAILED' : verdict)) : (application.metadata?.final_interview_result || 'PASSED'),
                            final_specific_status: isFinalStage ? (verdict === 'PASSED' ? 'OV - Passed' : (verdict === 'FAILED' ? 'OV - Failed' : 'OV - Pending')) : (verdict === 'PASSED' ? 'Initial Interview - Passed' : 'Initial Interview - Failed'),
                            ops_validator_notes: isFinalStage ? generateNotesString() : (application.metadata?.ops_validator_notes || '')
                        },
                        interview_grading: {
                            ...(application.interview_grading || {}),
                            ...interviewGrading
                        },
                        interview_responses: {
                            ...(application.interview_responses || {}),
                            ...combinedResponses
                        },
                        interview_room: room?.room_name,
                        interview_recording_url: audioUploadUrl,
                        final_verdict: verdict === 'PASSED' ? 'PASSED' : (verdict === 'FAILED' && remainingAccounts.length === 0) ? 'REJECTED' : verdict,
                        master_column: targetColumn || application.master_column
                    }
                });

                if (endorsementParams && !endorsementParams.isSpecialized && endorsementParams.assignedOpsValidatorId && endorsementParams.meetingDate) {
                    try {
                        const { NotificationService } = await import('@/services/NotificationService');
                        await NotificationService.notify(
                            endorsementParams.assignedOpsValidatorId,
                            'New Ops Val Interview Scheduled',
                            `You have been assigned an ops val interview for ${application.applicant_name} on ${new Date(endorsementParams.meetingDate).toLocaleString()}.`,
                            'final_interview_scheduled'
                        );
                    } catch (notificationErr) {
                        console.warn('[finalizeSession] Failed to send in-app notification to validator:', notificationErr);
                    }
                }

                const summary = {
                    applicantName: application.applicant_name,
                    applicantId: application.id,
                    positionTitle: application.position_title,
                    department: application.department,
                    duration: formatTime(seconds),
                    recordingPath: audioUploadUrl,
                    totalQuestions: questions.length,
                    answeredQuestions: Object.keys(scores).length,
                    roomName: room?.room_name,
                    interviewMode: room?.room_type === 'online' || application?.metadata?.interview_mode === 'ONLINE' ? 'ONLINE' : 'ON-SITE',
                    completedAt: new Date().toLocaleTimeString(),
                    verdict,
                    ratings,
                    endorsementParams
                };

                if (roomId && room) {
                    console.log('[useInterviewSession] Updating room status to AVAILABLE...');
                    await useRoomStore.getState().updateRoom(roomId, roomPatch);
                }

                // Mark active or draft queue entries for this applicant as SERVED
                try {
                    const { QueueService } = await import('@/services/QueueService');
                    const activeQueues = await QueueService.getTodayActive();
                    
                    const targetApplicantId = draftApplicantId || application.id;
                    // Find any active queue entry that is not already terminal (SERVED/SKIPPED)
                    const activeEntry = activeQueues.find((q: any) => 
                        q.application_id === targetApplicantId && 
                        q.status !== 'SERVED' && 
                        q.status !== 'SKIPPED'
                    );
                    
                    if (activeEntry) {
                        console.log('[useInterviewSession] Finalizing session - updating queue entry status to SERVED:', activeEntry.id);
                        await QueueService.update(activeEntry.id, { status: 'SERVED', completed_at: new Date().toISOString() });
                        const { useQueueStore } = await import('@/store/queueStore');
                        useQueueStore.getState().loadQueue();
                    }
                } catch (queueErr) {
                    console.warn('[finalizeSession] Failed to update queue entry status to SERVED:', queueErr);
                }

                console.log('[useInterviewSession] Session finalized successfully. Calling onComplete.');
                try {
                    localStorage.removeItem(`interview_session_${application.id}`);
                } catch (clearErr) {
                    console.warn('[useInterviewSession] Failed to clear local storage cache:', clearErr);
                }
                onComplete(summary);
            } catch (err: any) {
                console.error('[useInterviewSession] FATAL ERROR during finalizeSession:', err);
                error('Protocol Termination Failure', err?.message || 'An unexpected error occurred while saving the session.');
            }
        }, 'Finalizing session...');
    }, [application, observations, scores, audioBlob, room, roomId, questions.length, seconds, onComplete, withLoading, error, user, checklist, ratings, background, questionNotes, transcriptBlocks, isFinalStage, draftApplicantId]);

    return {
        room, application, questions, loadingQuestions, isStarted, setIsStarted,
        seconds, formatTime, scores, setScores, observations, setObservations,
        questionNotes, setQuestionNotes, showQuestionNotes, setShowQuestionNotes,
        currentStep, setCurrentStep, isRecording, recordingSeconds, audioBlob, setAudioBlob,
        startRecording, stopRecording, finalizeSession, isTranscribing, setIsTranscribing,
        activeSpeaker, setActiveSpeaker, transcriptBlocks, setTranscriptBlocks,
        interimTranscript, setInterimTranscript, recognitionRef, activeSpeakerRef,
        setRecordingSeconds,
        isFinalStage,
        saveStatus,
        saveProgress,

        // Exposing background & assessment state to UI components
        checklist, setChecklist,
        ratings, setRatings,
        background, setBackground,
        selectedLob, setSelectedLob, availableLobs
    };
}
