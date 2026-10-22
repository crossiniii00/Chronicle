import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { useToast } from '@/components/common/useToast';
import { cooldownService } from '@/services/cooldownService';
import type { Position, WorkExperience } from '@/types';
import { DEMO_APPLICANT_DATA } from '@/constants/demoCredentials';
import { getRandomDemoCharacter } from '@/utils/demoCharacters';
import { capitalizeName } from '@/utils/formatters';
import { apiClient } from '@/utils/apiClient';

interface TypingTestResult {
    wpm: number;
    accuracy: number;
    timeTaken: number;
    errors: number;
    totalWords: number;
}

const EMPTY_EXPERIENCE: WorkExperience = {
    company: '',
    position: '',
    duration_from: '',
    duration_to: '',
    description: '',
};

export function useApplicationFlow() {
    const location = useLocation();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(() => {
        try {
            const saved = localStorage.getItem('candidate_form_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.photoDataUrl) return parsed.photoDataUrl;
            }
        } catch (e) {}
        return null;
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [currentStep, setCurrentStep] = useState(() => {
        try {
            const saved = localStorage.getItem('candidate_form_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.currentStep === 'number') return parsed.currentStep;
            }
        } catch (e) {}
        return 1;
    });
    const [typingTestResult, setTypingTestResult] = useState<TypingTestResult | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [submittedQueueNumber, setSubmittedQueueNumber] = useState<number | null>(null);
    const [submittedQueuePrefix, setSubmittedQueuePrefix] = useState<string | null>(null);
    const [typingTestPassed, setTypingTestPassed] = useState<boolean | null>(null);
    const [demoMode, setDemoMode] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [form, setForm] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('candidate_form_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.form) return parsed.form;
            }
        } catch (e) {}
        return {
            first_name: '', last_name: '', full_name: '', nick_name: '', email: '', phone: '', birth_date: '',
            place_of_birth: '', sex: '', civil_status: '', nationality: '',
            current_address: '', permanent_address: '', sss_no: '', tin_no: '',
            pagibig_no: '', philhealth_no: '', flexible_schedule: null, travel_method: '',
            religion: '',
            spouse_name: '', spouse_occupation: '', father_name: '', father_occupation: '',
            mother_name: '', mother_occupation: '', num_children: 0, num_siblings: 0,
            highest_education: '', school_name: '', school_year_attended: '',
            is_graduated: null, course_strand: '', course_year: '', num_semesters: 0,
            plans_to_pursue_studies: '', plans_to_go_abroad: '',
            has_medical_conditions: null, medical_conditions: [], medical_history_notes: '',
            drinks_alcohol: null, smokes: null, is_pregnant: null,
            skills: '', languages: '', certifications: '',
            bpo_experience: '', tenure_bpo: '',
            emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
            signature_data_url: '', form_submitted_at: '',
            hiring_source: '',
        };
    });

    const [workExperience, setWorkExperience] = useState<WorkExperience[]>(() => {
        try {
            const saved = localStorage.getItem('candidate_form_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.workExperience) return parsed.workExperience;
            }
        } catch (e) {}
        return [EMPTY_EXPERIENCE];
    });

    // Sync draft state to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('candidate_form_draft', JSON.stringify({
                form,
                workExperience,
                currentStep,
                photoDataUrl
            }));
        } catch (e) {
            console.error('Failed to save draft to localStorage:', e);
        }
    }, [form, workExperience, currentStep, photoDataUrl]);

    useEffect(() => {
        let mounted = true;
        
        const params = new URLSearchParams(location.search);
        const appId = params.get('app_id');
        const positionId = params.get('position_id');

        PositionService.getAll().then((items: Position[]) => {
            if (!mounted) return;

            if (appId) {
                ApplicationService.getPublicById(appId).then(app => {
                    if (!mounted || !app) return;
                    setForm((prev: any) => ({
                        ...prev,
                        full_name: app.applicant_name,
                        email: app.applicant_email,
                        phone: app.pis?.phone || prev.phone,
                        birth_date: app.pis?.birth_date || prev.birth_date,
                        sex: app.pis?.sex || prev.sex,
                        civil_status: app.pis?.civil_status || prev.civil_status,
                        nationality: app.pis?.nationality || prev.nationality,
                        current_address: app.pis?.current_address || prev.current_address,
                        permanent_address: app.pis?.permanent_address || prev.permanent_address,
                    }));
                    if (app.position_id) {
                        const position = items.find((p: Position) => p.id === app.position_id);
                        if (position) setSelectedPosition(position);
                    }
                }).catch(err => {
                    console.error('[ApplicationFlow] Failed to fetch on-call candidate details:', err);
                });
            } else if (positionId && !selectedPosition) {
                const position = items.find((p: Position) => p.id === positionId);
                if (position) {
                    setSelectedPosition(position);
                } else {
                    console.error(`[ApplicationFlow] Position ID ${positionId} not found in available positions.`);
                }
            }
        });
        
        apiClient.get('/report-configs/public/typing_test_settings')
            .then(res => {
                if (!mounted) return;
                if (res.data?.config_data?.demoMode) {
                    setDemoMode(true);
                }
            })
            .catch(() => {});
        
        return () => { mounted = false; };
    }, [location.search, selectedPosition]);

    const updateForm = (field: string, value: any) => {
        setForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const highlightAndFocusField = (fieldId: string) => {
        setTimeout(() => {
            const target = 
                document.getElementById(fieldId) || 
                document.getElementById(`field_${fieldId}`) || 
                document.querySelector(`[data-field="${fieldId}"]`) ||
                document.querySelector(`input[name="${fieldId}"]`) ||
                document.querySelector(`select[name="${fieldId}"]`);
                
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.focus();
                
                target.classList.add('ring-4', 'ring-red-500', 'border-red-500', 'bg-red-50');
                setTimeout(() => {
                    target.classList.remove('ring-4', 'ring-red-500', 'border-red-500', 'bg-red-50');
                }, 3500);
            }
        }, 50);
    };

    const validateCurrentStep = () => {
        if (!selectedPosition) {
            error('Session Error', 'Position information is missing. Please select a job from the listings again.');
            return false;
        }
        if (currentStep === 1) {
            if (!form.first_name?.trim()) { error('Validation Error', 'First name is required.'); highlightAndFocusField('first_name'); return false; }
            if (!form.nick_name?.trim()) { error('Validation Error', 'Middle name is required.'); highlightAndFocusField('nick_name'); return false; }
            if (!form.last_name?.trim()) { error('Validation Error', 'Last name is required.'); highlightAndFocusField('last_name'); return false; }
            if (!form.preferred_nickname?.trim()) { error('Validation Error', 'Preferred Nickname is required.'); highlightAndFocusField('preferred_nickname'); return false; }
            
            const fullName = `${form.first_name?.trim()} ${form.last_name?.trim()}`.trim();
            if (cooldownService.isNameOnCooldown(fullName)) {
                const remaining = cooldownService.getRemainingCooldown(fullName);
                error('Application Blocked', `Please try again in ${remaining}.`);
                return false;
            }
            if (!form.email?.trim()) { error('Validation Error', 'Email address is required.'); highlightAndFocusField('email'); return false; }
            if (!form.phone?.trim()) { error('Validation Error', 'Contact number is required.'); highlightAndFocusField('phone'); return false; }
            if (!form.birth_date) { error('Validation Error', 'Date of birth is required.'); highlightAndFocusField('birth_date'); return false; }
            if (!form.sex) { error('Validation Error', 'Sex selection is required.'); highlightAndFocusField('sex'); return false; }
            if (!form.civil_status) { error('Validation Error', 'Civil status is required.'); highlightAndFocusField('civil_status'); return false; }
            if (!form.nationality?.trim()) { error('Validation Error', 'Nationality is required.'); highlightAndFocusField('nationality'); return false; }
            if (!form.current_address?.trim()) { error('Validation Error', 'Current address is required.'); highlightAndFocusField('current_address'); return false; }
            if (!resumeFile && !form.resume_later) {
                error('Validation Error', 'Resume upload is required unless you choose to email/upload it later.');
                highlightAndFocusField('resume_section');
                return false;
            }
        }
        if (currentStep === 2) {
            if (!form.emergency_contact_name?.trim()) { error('Validation Error', 'Emergency contact name is required.'); highlightAndFocusField('emergency_contact_name'); return false; }
            if (!form.emergency_contact_phone?.trim()) { error('Validation Error', 'Emergency contact phone is required.'); highlightAndFocusField('emergency_contact_phone'); return false; }
        }
        if (currentStep === 3) {
            if (!form.school_name?.trim()) {
                error('Validation Error', 'School name is required.');
                highlightAndFocusField('school_name');
                return false;
            }
            if (form.highest_education === 'Senior High School Level' && !form.course_strand?.trim()) {
                error('Validation Error', 'Strand selection is required.');
                highlightAndFocusField('course_strand');
                return false;
            }
            if (form.highest_education === 'College Graduate / Level' && !form.course_strand?.trim()) {
                error('Validation Error', 'Degree / Course is required.');
                highlightAndFocusField('course_strand');
                return false;
            }
        }
        if (currentStep === 6 && !form.hiring_source) {
            error('Validation Error', 'Please select where you heard from us.');
            highlightAndFocusField('hiring_source');
            return false;
        }
        if (currentStep === 7 && !form.signature_data_url) {
            error('Signature Required', 'Digital signature is mandatory.');
            highlightAndFocusField('signature_data_url');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (!validateCurrentStep()) return;
        if (currentStep === 7) {
            setCurrentStep(typingTestResult ? 10 : 8);
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep === 1) navigate('/jobs');
        else if (currentStep === 8) setCurrentStep(7);
        else setCurrentStep(currentStep - 1);
    };

    const handleTypingTestComplete = (result: TypingTestResult, isPassed: boolean) => {
        setTypingTestResult(result);
        setTypingTestPassed(isPassed);
        if (isPassed) {
            setCurrentStep(10);
        } else {
            submitApplication(result, isPassed);
        }
    };

    const handleTypingTestCancel = () => {
        const fullName = `${form.first_name?.trim()} ${form.last_name?.trim()}`.trim();
        if (cooldownService.isNameOnCooldown(fullName)) setCurrentStep(11);
        else setCurrentStep(8);
    };



    const submitApplication = async (directResult?: TypingTestResult, directIsPassed?: boolean) => {
        if (submitting) return;
        if (!selectedPosition) {
            error('Error', 'Position data is missing. Please restart the application.');
            return;
        }
        const activeTestResult = directResult || typingTestResult;
        if (!activeTestResult) {
            error('Error', 'Please complete the typing test before submitting.');
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            const params = new URLSearchParams(location.search);
            const appId = params.get('app_id');

            const firstNameClean = capitalizeName(form.first_name || '');
            const lastNameClean = capitalizeName(form.last_name || '');
            const fullName = capitalizeName(`${firstNameClean} ${lastNameClean}`.trim());

            const payloadPayload = {
                applicant_id: appId || `app_${Date.now()}`,
                applicant_name: fullName,
                applicant_email: form.email.trim().toLowerCase(),
                position: selectedPosition,
                resume_file: resumeFile || undefined,
                resume_name: resumeFile?.name || 'resume.pdf',
                typing_test_passed: typeof directIsPassed === 'boolean' ? directIsPassed : true,
                signature_data_url: form.signature_data_url,
                pis: {
                    ...form,
                    full_name: fullName,
                    photo_data_url: photoDataUrl || undefined,
                    skills: (form.skills || '').split(',').map((s: string) => s.trim()).filter((s: string) => s),
                    languages: (form.languages || '').split(',').map((l: string) => l.trim()).filter((l: string) => l).map((l: string) => ({ language: l, proficiency: '' })),
                    certifications: (form.certifications || '').split(',').map((c: string) => c.trim()).filter((c: string) => c).map((c: string) => ({ name: c, issuer: '', date: '' })),
                    work_experience: workExperience.filter((exp: WorkExperience) => exp.company.trim() || exp.position.trim()),
                },
                onProgress: (p: number) => setUploadProgress(p),
                typing_test: {
                    wpm: activeTestResult.wpm,
                    accuracy: activeTestResult.accuracy,
                    duration: activeTestResult.timeTaken
                }
            };

            let app;
            if (appId) {
                app = await ApplicationService.patchPublicOnCall(appId, payloadPayload);
            } else {
                app = await ApplicationService.submit(payloadPayload);
            }

            console.log('[useApplicationFlow] Submit response app:', app);
            if (app && app.queue_number) {
                setSubmittedQueueNumber(app.queue_number);
            }
            if (app && app.queue_prefix) {
                setSubmittedQueuePrefix(app.queue_prefix);
            }
            try {
                const safeName = fullName.trim().toLowerCase().replace(/\s+/g, '_');
                const safeEmail = form.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                localStorage.removeItem('candidate_form_draft');
                localStorage.removeItem(`typing_test_latest_result_${safeName}`);
                localStorage.removeItem(`typing_test_all_attempts_${safeName}`);
                if (safeEmail) {
                    localStorage.removeItem(`typing_test_latest_result_${safeEmail}`);
                    localStorage.removeItem(`typing_test_all_attempts_${safeEmail}`);
                }
                localStorage.removeItem('typing_test_latest_result');
                localStorage.removeItem('typing_test_all_attempts');
            } catch (e) {}
            
            // If they failed, we don't need a success toast, they will see the failed dashboard.
            if (typeof directIsPassed === 'boolean' && !directIsPassed) {
                setSubmitted(true);
            } else {
                setSubmitted(true);
                success('Submitted', 'Application recorded successfully.');
            }
        } catch (err: any) {
            error('Submission Failed', err.message || 'Unable to submit.');
            setSubmitError(err.message || 'Network error — please check your connection and try again.');
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    const fillDemoData = useCallback(() => {
        const char = getRandomDemoCharacter();
        const uniqueEmail = `${char.nick_name.toLowerCase()}.${Date.now()}@example.com`;
        const nameParts = char.full_name.split(' ');
        const first_name = nameParts[0];
        const last_name = nameParts.slice(1).join(' ');
        setForm((prev: any) => ({
            ...prev,
            ...DEMO_APPLICANT_DATA.form,
            first_name,
            last_name,
            full_name: char.full_name,
            nick_name: char.nick_name,
            sex: char.sex,
            email: uniqueEmail
        }));
        setWorkExperience([
            {
                company: char.company,
                position: char.position,
                duration_from: '2018-01',
                duration_to: '2023-12',
                description: char.description
            }
        ]);
        const mockFile = new File(['mock resume content'], `${char.nick_name.toLowerCase()}_resume.pdf`, { type: 'application/pdf' });
        setResumeFile(mockFile);
    }, [setResumeFile]);

    return {
        form, updateForm, workExperience, setWorkExperience,
        currentStep, setCurrentStep, handleNext, handleBack,
        selectedPosition, resumeFile, setResumeFile,
        photoDataUrl, setPhotoDataUrl,
        submitting, submitted, typingTestResult, uploadProgress, submittedQueueNumber, submittedQueuePrefix, typingTestPassed,
        submitError,
        handleTypingTestComplete, handleTypingTestCancel, submitApplication, navigate,
        fillDemoData, demoMode
    };
}
