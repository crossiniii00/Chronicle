import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { useToast } from '@/components/common/useToast';
import { cooldownService } from '@/services/cooldownService';
import type { Position, WorkExperience } from '@/types';
import { DEMO_APPLICANT_DATA } from '@/constants/demoCredentials';
import { getRandomDemoCharacter } from '@/utils/demoCharacters';

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
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [typingTestResult, setTypingTestResult] = useState<TypingTestResult | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [submittedQueueNumber, setSubmittedQueueNumber] = useState<number | null>(null);

    const [form, setForm] = useState<any>({
        full_name: '', nick_name: '', email: '', phone: '', birth_date: '',
        place_of_birth: '', gender: '', civil_status: '', nationality: '',
        current_address: '', permanent_address: '', sss_no: '', tin_no: '',
        pagibig_no: '', philhealth_no: '', flexible_schedule: null, travel_method: '',
        spouse_name: '', spouse_occupation: '', father_name: '', father_occupation: '',
        mother_name: '', mother_occupation: '', num_children: 0, num_siblings: 0,
        highest_education: '', school_name: '', school_year_attended: '',
        is_graduated: null, course_strand: '', course_year: '', num_semesters: 0,
        plans_to_pursue_studies: '', plans_to_go_abroad: '',
        has_medical_conditions: null, medical_conditions: [], medical_history_notes: '',
        drinks_alcohol: null, smokes: null, is_pregnant: null,
        skills: '', languages: '', certifications: '',
        emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
        signature_data_url: '', form_submitted_at: '',
        hiring_source: '',
    });

    const [workExperience, setWorkExperience] = useState<WorkExperience[]>([EMPTY_EXPERIENCE]);

    useEffect(() => {
        let mounted = true;
        
        // Only fetch if we don't have a position yet
        if (selectedPosition) return;

        PositionService.getAll().then((items: Position[]) => {
            if (!mounted) return;
            
            const params = new URLSearchParams(location.search);
            const positionId = params.get('position_id');
            
            if (positionId) {
                const position = items.find((p: Position) => p.id === positionId);
                if (position) {
                    setSelectedPosition(position);
                } else {
                    console.error(`[ApplicationFlow] Position ID ${positionId} not found in available positions.`);
                }
            }
        });
        
        return () => { mounted = false; };
    }, [location.search, selectedPosition]);

    const updateForm = (field: string, value: any) => {
        setForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const validateCurrentStep = () => {
        if (!selectedPosition) {
            error('Session Error', 'Position information is missing. Please select a job from the listings again.');
            return false;
        }
        if (currentStep === 1) {
            if (!form.full_name?.trim()) { error('Validation Error', 'Full name is required.'); return false; }
            if (cooldownService.isNameOnCooldown(form.full_name.trim())) {
                const remaining = cooldownService.getRemainingCooldown(form.full_name.trim());
                error('Application Blocked', `Please try again in ${remaining}.`);
                return false;
            }
            // Check specific fields instead of a generic "Required fields are missing"
            if (!form.email?.trim()) { error('Validation Error', 'Email address is required.'); return false; }
            if (!form.phone?.trim()) { error('Validation Error', 'Contact number is required.'); return false; }
            if (!form.birth_date) { error('Validation Error', 'Date of birth is required.'); return false; }
            if (!form.gender) { error('Validation Error', 'Gender selection is required.'); return false; }
            if (!form.civil_status) { error('Validation Error', 'Civil status is required.'); return false; }
            if (!form.nationality?.trim()) { error('Validation Error', 'Nationality is required.'); return false; }
            if (!form.current_address?.trim()) { error('Validation Error', 'Current address is required.'); return false; }
        }
        if (currentStep === 2) {
            if (!form.emergency_contact_name?.trim()) { error('Validation Error', 'Emergency contact name is required.'); return false; }
            if (!form.emergency_contact_phone?.trim()) { error('Validation Error', 'Emergency contact phone is required.'); return false; }
        }
        if (currentStep === 3 && !form.school_name?.trim()) {
            error('Validation Error', 'School name is required.');
            return false;
        }
        if (currentStep === 6 && !form.hiring_source) {
            error('Validation Error', 'Please select where you heard from us.');
            return false;
        }
        if (currentStep === 7 && !form.signature_data_url) {
            error('Signature Required', 'Digital signature is mandatory.');
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

    const handleTypingTestComplete = (result: TypingTestResult) => {
        setTypingTestResult(result);
        setCurrentStep(10);
    };

    const handleTypingTestCancel = () => {
        if (cooldownService.isNameOnCooldown(form.full_name)) setCurrentStep(11);
        else setCurrentStep(8);
    };



    const submitApplication = async () => {
        if (!selectedPosition) {
            error('Error', 'Position data is missing. Please restart the application.');
            return;
        }
        if (!typingTestResult) {
            error('Error', 'Please complete the typing test before submitting.');
            return;
        }
        setSubmitting(true);
        try {
            const app = await ApplicationService.submit({
                applicant_id: `app_${Date.now()}`,
                applicant_name: form.full_name.trim(),
                applicant_email: form.email.trim().toLowerCase(),
                position: selectedPosition,
                resume_file: resumeFile || undefined,
                resume_name: resumeFile?.name || 'resume.pdf',
                pis: {
                    ...form,
                    photo_data_url: photoDataUrl || undefined,
                    skills: (form.skills || '').split(',').map((s: string) => s.trim()).filter((s: string) => s),
                    languages: (form.languages || '').split(',').map((l: string) => l.trim()).filter((l: string) => l).map((l: string) => ({ language: l, proficiency: '' })),
                    certifications: (form.certifications || '').split(',').map((c: string) => c.trim()).filter((c: string) => c).map((c: string) => ({ name: c, issuer: '', date: '' })),
                    work_experience: workExperience.filter((exp: WorkExperience) => exp.company.trim() || exp.position.trim()),
                },
                onProgress: (p) => setUploadProgress(p),
                typing_test: {
                    wpm: typingTestResult.wpm,
                    accuracy: typingTestResult.accuracy,
                    duration: typingTestResult.timeTaken
                }
            });
            console.log('[useApplicationFlow] Submit response app:', app);
            if (app && app.queue_number) {
                setSubmittedQueueNumber(app.queue_number);
            }
            setSubmitted(true);
            success('Submitted', 'Application recorded successfully.');
        } catch (err: any) {
            error('Submission Failed', err.message || 'Unable to submit.');
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    const fillDemoData = useCallback(() => {
        const char = getRandomDemoCharacter();
        const uniqueEmail = `${char.nick_name.toLowerCase()}.${Date.now()}@example.com`;
        setForm((prev: any) => ({
            ...prev,
            ...DEMO_APPLICANT_DATA.form,
            full_name: char.full_name,
            nick_name: char.nick_name,
            gender: char.gender,
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
        submitting, submitted, typingTestResult, uploadProgress, submittedQueueNumber,
        handleTypingTestComplete, handleTypingTestCancel, submitApplication, navigate,
        fillDemoData
    };
}
