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

export function useInterviewSession(roomId: string, rooms: InterviewRoom[], applications: Application[], onComplete: (summary: any) => void) {
    const { user } = useAuthStore();
    const { success, error } = useToast();
    const { withLoading } = useLoading();

    const room = rooms.find(r => r.id === roomId);
    const application = applications.find(a => a.id === room?.current_application_id);

    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(true);
    const [isStarted, setIsStarted] = useState(false);

    const isFinalStage =
        user?.role === 'ops_validator' ||
        application?.current_status === 'FINAL_INTERVIEW' ||
        application?.current_status === 'FINAL_INTERVIEW_SCHEDULED' ||
        application?.current_status === 'ENDORSED' ||
        application?.queue_type === 'FINAL' ||
        application?.metadata?.active_interview_type === 'FINAL';
    const [seconds, setSeconds] = useState(0);
    const [scores, setScores] = useState<Record<string, any>>({});
    const [observations, setObservations] = useState<Record<string, string>>({});
    const [currentStep, setCurrentStep] = useState(0);

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
        candidateSource: ''
    });

    useEffect(() => {
        activeSpeakerRef.current = activeSpeaker;
    }, [activeSpeaker]);

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

            setBackground(prev => ({
                ...prev,
                bpoChat: metadata.bpo_experience_chat || prev.bpoChat || '',
                bpoVoice: metadata.bpo_experience_voice || prev.bpoVoice || '',
                nonBpo: metadata.non_bpo_experience || prev.nonBpo || '',
                shiftingIssues: metadata.issues_shifting_schedules || prev.shiftingIssues || '',
                education: educationString || prev.education || '',
                shsStrand: isSHS ? (application.pis?.course_strand || '') : '',
                pursueStudies: metadata.plans_to_pursue_studies || prev.pursueStudies || '',
                goAbroad: metadata.plans_to_go_abroad || prev.goAbroad || '',
                transportMode: metadata.mode_of_transportation || prev.transportMode || '',
                medicalIssues: metadata.medical_issues || prev.medicalIssues || '',
                startAvailability: metadata.availability_to_start || prev.startAvailability || '',
                salaryExpectation: metadata.salary_expectations || prev.salaryExpectation || '',
                candidateSource: metadata.candidate_source || (application.pis as any)?.how_did_you_hear || prev.candidateSource || ''
            }));

            // In a final interview, the right-panel assessment is read-only and
            // carried over from the initial interview. Hydrate the local state
            // from application.metadata so the values are visible but not editable.
            if (isFinalStage) {
                if (Object.keys(savedChecklist).length > 0) {
                    setChecklist(savedChecklist);
                }
                if (Object.keys(savedRatings).length > 0) {
                    setRatings(prev => ({
                        personalRating: savedRatings.personalRating ?? prev.personalRating,
                        workHabits: savedRatings.workHabits ?? prev.workHabits,
                        communicationSkills: savedRatings.communicationSkills ?? prev.communicationSkills,
                        empathy: savedRatings.empathy ?? prev.empathy,
                        confidence: savedRatings.confidence ?? prev.confidence,
                        languageClassification: savedRatings.languageClassification ?? prev.languageClassification,
                        remarks: savedRatings.remarks ?? prev.remarks,
                    }));
                }
                // Hydrate the initial interview's transcript blocks so the
                // final interviewer can review what was said without running
                // live transcription again. Read-only via `readOnly` flag.
                const savedTranscript = metadata.initial_transcript?.blocks;
                if (Array.isArray(savedTranscript) && savedTranscript.length > 0) {
                    setTranscriptBlocks(savedTranscript);
                }
            }
        }
    }, [application, isFinalStage]);

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

    const loadQuestions = useCallback(async () => {
        setLoadingQuestions(true);
        try {
            const allQ = await QuestionService.getAll();
            const isFinalStage =
                user?.role === 'ops_validator' ||
                application?.current_status === 'FINAL_INTERVIEW' ||
                application?.current_status === 'FINAL_INTERVIEW_SCHEDULED' ||
                application?.current_status === 'ENDORSED' ||
                application?.queue_type === 'FINAL';

            const targetType = isFinalStage ? 'final' : 'initial';

            const filteredQs = allQ
                .filter(q => q.is_active && q.question_type === targetType)
                .sort((a, b) => (a.question_order || 0) - (b.question_order || 0));

            setQuestions(filteredQs);
        } catch {
            error('Protocol Error', 'Failed to retrieve assessment criteria.');
        } finally {
            setLoadingQuestions(false);
        }
    }, [error, application?.current_status, application?.queue_type]);

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
            interval = setInterval(() => setSeconds(s => s + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isStarted]);

    useEffect(() => {
        if (application?.current_status === 'INTERVIEW_IN_PROGRESS') {
            setIsStarted(true);
        }
    }, [application?.current_status]);

    useEffect(() => {
        if (isStarted && application && application.current_status !== 'INTERVIEW_IN_PROGRESS') {
            void ApplicationService.updateStatus({
                id: application.id,
                fromStatus: application.current_status,
                toStatus: 'INTERVIEW_IN_PROGRESS',
                changedByName: user?.full_name || 'Interviewer',
                reason: 'Interview session started',
                patch: {
                    metadata: {
                        ...(application.metadata || {}),
                        active_interview_type: isFinalStage ? 'FINAL' : 'INITIAL'
                    }
                }
            }).catch(err => {
                console.error('[useInterviewSession] Failed to update status to INTERVIEW_IN_PROGRESS:', err);
            });
        }
    }, [isStarted, application, user?.full_name, isFinalStage]);

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
        verdict?: 'PASSED' | 'FAILED' | 'PENDING',
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
                const combinedResponses: Record<string, string> = { ...observations };

                Object.entries(scores).forEach(([qId, value]) => {
                    if (typeof value === 'number') {
                        interviewGrading[qId] = value;
                    } else if (value && typeof value === 'string') {
                        const currentObs = combinedResponses[qId] || '';
                        combinedResponses[qId] = `${value.toUpperCase()}${currentObs ? '\n\n' + currentObs : ''}`;
                    }
                });

                let nextStatus: ApplicationStatus;
                let targetColumn: string | undefined;
                const additionalPatch: any = {};
                const interviewDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                additionalPatch.interview_completed_at = new Date().toISOString();

                const isFinalStage =
                    user?.role === 'ops_validator' ||
                    application.current_status === 'FINAL_INTERVIEW' ||
                    application.current_status === 'FINAL_INTERVIEW_SCHEDULED' ||
                    application.current_status === 'ENDORSED' ||
                    application.queue_type === 'FINAL';

                const globalActiveAccount = useActiveAccountStore.getState().activeAccount;
                const userAccounts = parseAccounts(user?.department);
                const resolvedActiveAccount = (globalActiveAccount && userAccounts.map(a => a.toUpperCase()).includes(globalActiveAccount.toUpperCase()))
                    ? globalActiveAccount
                    : (userAccounts[0] || 'DOORDASH');

                const depts = (application.department || '').split(',').map((s: any) => s.trim()).filter(Boolean);
                const failedAccounts = application.metadata?.failed_accounts || [];
                const matchedActive = depts.find(d => d.trim().toLowerCase() === resolvedActiveAccount.trim().toLowerCase());
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
                            nextStatus = 'For Job Offer';
                        }
                        if (nextStatus === 'PASSED' || nextStatus === 'For Job Offer') {
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
                            final_specific_status: application.current_status?.includes('CLIENT')
                                ? 'Client Interview - Passed'
                                : 'OV - Passed',
                            interview_completed_at: interviewDate,
                            ops_validator_email: user?.email || 'System',
                            ops_validator_status: 'PASSED',
                            ops_validator_notes: Object.values(combinedResponses).join('\n\n'),
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };
                    } else {
                        // Initial Interview Pass
                        nextStatus = 'ASSESSMENT';
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
                            final_specific_status: 'Recruitment Interview - Passed',
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
                                ops_validator_notes: Object.values(combinedResponses).join('\n\n'),
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
                                ops_validator_notes: Object.values(combinedResponses).join('\n\n'),
                                last_updated_by: user?.full_name || 'System (Interview)',
                            };
                        }
                    } else {
                        nextStatus = 'REJECTED';
                        additionalPatch.pis = {
                            ...(application.pis || {}),
                            initial_interview_results: 'FAILED',
                            final_specific_status: 'Recruitment Interview - Failed',
                            interview_type: 'INITIAL',
                            interview_completed_at: interviewDate,
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };
                    }
                } else if (verdict === 'PENDING') {
                    nextStatus = 'ASSESSMENT';
                    if (isFinalStage) {
                        additionalPatch.pis = {
                            ...(application.pis || {}),
                            final_specific_status: 'OV - Pending',
                            interview_completed_at: interviewDate,
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };
                    } else {
                        additionalPatch.pis = {
                            ...(application.pis || {}),
                            final_specific_status: 'Recruitment Interview - Pending',
                            interview_type: 'INITIAL',
                            interview_completed_at: interviewDate,
                            last_updated_by: user?.full_name || 'System (Interview)',
                        };
                    }
                } else {
                    nextStatus = isFinalStage ? 'FINAL_VERDICT' : 'ASSESSMENT';
                }

                let recordingUrl: string | undefined;
                if (audioBlob) {
                    console.log('[useInterviewSession] Uploading interview recording...');
                    try {
                        recordingUrl = await RecordingService.upload(audioBlob, application.id);
                        console.log('[useInterviewSession] Recording uploaded:', recordingUrl);
                    } catch (err) {
                        console.error('[useInterviewSession] Failed to upload recording:', err);
                    }
                }

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
                        ...(application.metadata || {}),
                        initial_account_assignment: endorsementParams?.department || application.department,
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
                        // Recording URLs
                        ...(recordingUrl ? (
                            isFinalStage 
                                ? { final_recording_url: recordingUrl }
                                : { initial_recording_url: recordingUrl }
                        ) : {}),
                        // Transcripts
                        ...(transcriptBlocks.length > 0 ? (
                            isFinalStage
                                ? { final_transcript: { blocks: transcriptBlocks, saved_at: new Date().toISOString() } }
                                : { initial_transcript: { blocks: transcriptBlocks, saved_at: new Date().toISOString() } }
                        ) : {})
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
                        checklist
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
                        interview_grading: {
                            ...(application.interview_grading || {}),
                            ...interviewGrading
                        },
                        interview_responses: {
                            ...(application.interview_responses || {}),
                            ...combinedResponses
                        },
                        interview_room: room?.room_name,
                        interview_recording_url: recordingUrl,
                        final_verdict: verdict === 'PASSED' ? 'PASSED' : (verdict === 'FAILED' && remainingAccounts.length === 0) ? 'REJECTED' : undefined,
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
                    applicantId: application.applicant_id,
                    positionTitle: application.position_title,
                    department: application.department,
                    duration: formatTime(seconds),
                    recordingPath: recordingUrl,
                    totalQuestions: questions.length,
                    answeredQuestions: Object.keys(scores).length,
                    roomName: room?.room_name,
                    interviewMode: room?.room_type === 'online' || application?.metadata?.interview_mode === 'ONLINE' ? 'ONLINE' : 'ON-SITE',
                    completedAt: new Date().toLocaleTimeString(),
                    verdict,
                    ratings,
                    endorsementParams
                };

                console.log('[useInterviewSession] Updating room status to AVAILABLE...');
                await useRoomStore.getState().updateRoom(roomId, roomPatch);

                console.log('[useInterviewSession] Session finalized successfully. Calling onComplete.');
                onComplete(summary);
            } catch (err: any) {
                console.error('[useInterviewSession] FATAL ERROR during finalizeSession:', err);
                error('Protocol Termination Failure', err?.message || 'An unexpected error occurred while saving the session.');
            }
        }, 'Finalizing session...');
    }, [application, observations, scores, audioBlob, room, roomId, questions.length, seconds, onComplete, withLoading, error, user, checklist, ratings, background]);

    return {
        room, application, questions, loadingQuestions, isStarted, setIsStarted,
        seconds, formatTime, scores, setScores, observations, setObservations,
        currentStep, isRecording, recordingSeconds, audioBlob, setAudioBlob,
        startRecording, stopRecording, finalizeSession, isTranscribing, setIsTranscribing,
        activeSpeaker, setActiveSpeaker, transcriptBlocks, setTranscriptBlocks,
        interimTranscript, setInterimTranscript, recognitionRef, activeSpeakerRef,
        setRecordingSeconds,
        isFinalStage,

        // Exposing background & assessment state to UI components
        checklist, setChecklist,
        ratings, setRatings,
        background, setBackground
    };
}
