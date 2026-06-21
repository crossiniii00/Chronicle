import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, Upload, PenTool } from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { SignaturePad } from '@/components/common/SignaturePad';
import { useToast } from '@/components/common/useToast';
import type { Position } from '@/types';
import { CIVIL_STATUS_OPTIONS, EDUCATION_LEVELS, GENDER_OPTIONS } from '@/utils/formatters';

type WorkExperience = {
    company: string;
    position: string;
    duration_from: string;
    duration_to: string;
    description: string;
};

const EMPTY_EXPERIENCE: WorkExperience = {
    company: '',
    position: '',
    duration_from: '',
    duration_to: '',
    description: '',
};

export function ApplicationForm() {
    const location = useLocation();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [positions, setPositions] = useState<Position[]>([]);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedQueueNumber, setSubmittedQueueNumber] = useState<number | null>(null);

    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        birth_date: '',
        gender: '',
        civil_status: '',
        nationality: '',
        current_address: '',
        permanent_address: '',
        highest_education: '',
        school_name: '',
        degree: '',
        graduation_year: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
    });

    const [workExperience, setWorkExperience] = useState<WorkExperience[]>([{ ...EMPTY_EXPERIENCE }]);

    useEffect(() => {
        PositionService.getAllOpen().then((items) => {
            setPositions(items);
            const positionId = new URLSearchParams(location.search).get('position_id');
            if (positionId) {
                setSelectedPosition(items.find((item) => item.id === positionId) ?? null);
            }
        });
    }, [location.search]);

    const applicantId = () => {
        const email = form.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `public-${email || 'walk-in'}-${Date.now()}`;
    };

    const updateForm = (key: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const updateExperience = (index: number, key: keyof WorkExperience, value: string) => {
        setWorkExperience((current) =>
            current.map((item, currentIndex) => currentIndex === index ? { ...item, [key]: value } : item),
        );
    };

    const submit = async () => {
        if (!selectedPosition) {
            error('Position Required', 'Please choose an open position first.');
            return;
        }
        if (!form.full_name.trim() || !form.email.trim()) {
            error('Missing Info', 'Full name and email are required.');
            return;
        }
        if (!resumeFile) {
            error('Resume Required', 'Please upload your resume before submitting.');
            return;
        }
        if (!signatureDataUrl) {
            error('Signature Required', 'Please sign the application before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            const app = await ApplicationService.submit({
                applicant_id: applicantId(),
                applicant_name: form.full_name.trim(),
                applicant_email: form.email.trim().toLowerCase(),
                position: selectedPosition,
                resume_file: resumeFile,
                resume_name: resumeFile.name,
                pis: {
                    ...form,
                    full_name: form.full_name.trim(),
                    email: form.email.trim().toLowerCase(),
                    graduation_year: form.graduation_year ? Number(form.graduation_year) : undefined,
                    work_experience: workExperience.filter((item) => Object.values(item).some(Boolean)),
                    signature_data_url: signatureDataUrl,
                    skills: [],
                    languages: [],
                    certifications: [],
                },
            });
            console.log('[ApplicationForm] Submit response app:', app);
            if (app && app.queue_number) {
                setSubmittedQueueNumber(app.queue_number);
            }
            setSubmitted(true);
            success('Application Submitted', 'The application is now in the recruiter queue.');
        } catch (submissionError: unknown) {
            error('Submission Failed', submissionError instanceof Error ? submissionError.message : 'Unable to submit application.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="mx-auto max-w-2xl py-16">
                <div className="rounded-sm border border-surface-200 bg-white p-10 text-center shadow-sm flex flex-col items-center">
                    <CheckCircle2 className="mx-auto mb-4 text-emerald-600" size={40} />
                    <h1 className="mb-3 text-2xl font-bold text-surface-900">Application Submitted</h1>
                    <p className="mb-6 text-sm text-surface-600">Your application has been recorded for local recruiter review.</p>
                    
                    {submittedQueueNumber && (
                        <div className="mb-6 px-6 py-4 bg-[#622B89]/10 border border-[#622B89]/20 rounded-sm text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#622B89] block mb-1">Generated Queue Number</span>
                            <span className="text-3xl font-black text-[#622B89] tracking-tight">#{String(submittedQueueNumber).padStart(3, '0')}</span>
                        </div>
                    )}

                    <button onClick={() => navigate('/jobs')} className="rounded-sm bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700">
                        Back to Job Listings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 py-8">
            <div className="flex items-center justify-between border-b border-surface-200 pb-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Public Intake</p>
                    <h1 className="text-2xl font-bold text-surface-900">Application Form</h1>
                </div>
                <button onClick={() => navigate('/jobs')} className="inline-flex items-center gap-2 text-sm font-semibold text-surface-600 hover:text-surface-900">
                    <ArrowLeft size={16} /> Back to Jobs
                </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-6 rounded-sm border border-surface-200 bg-white p-6 shadow-sm">
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-surface-900">1. Position</h2>
                        <select
                            value={selectedPosition?.id ?? ''}
                            onChange={(event) => setSelectedPosition(positions.find((item) => item.id === event.target.value) ?? null)}
                            className="w-full rounded-sm border border-surface-200 px-4 py-3 text-sm"
                        >
                            <option value="">Select an open position</option>
                            {positions.map((position) => (
                                <option key={position.id} value={position.id}>{position.title} - {position.department}</option>
                            ))}
                        </select>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-surface-900">2. Personal Information</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Full Name" value={form.full_name} onChange={(value) => updateForm('full_name', value)} />
                            <Field label="Email" type="email" value={form.email} onChange={(value) => updateForm('email', value)} />
                            <Field label="Phone" value={form.phone} onChange={(value) => updateForm('phone', value)} />
                            <Field label="Birth Date" type="date" value={form.birth_date} onChange={(value) => updateForm('birth_date', value)} />
                            <SelectField label="Gender" value={form.gender} onChange={(value) => updateForm('gender', value)} options={GENDER_OPTIONS} />
                            <SelectField label="Civil Status" value={form.civil_status} onChange={(value) => updateForm('civil_status', value)} options={CIVIL_STATUS_OPTIONS} />
                            <Field label="Nationality" value={form.nationality} onChange={(value) => updateForm('nationality', value)} />
                            <Field label="Current Address" value={form.current_address} onChange={(value) => updateForm('current_address', value)} />
                            <Field label="Permanent Address" value={form.permanent_address} onChange={(value) => updateForm('permanent_address', value)} />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-surface-900">3. Education and Experience</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <SelectField label="Highest Education" value={form.highest_education} onChange={(value) => updateForm('highest_education', value)} options={EDUCATION_LEVELS} />
                            <Field label="School" value={form.school_name} onChange={(value) => updateForm('school_name', value)} />
                            <Field label="Degree" value={form.degree} onChange={(value) => updateForm('degree', value)} />
                            <Field label="Graduation Year" type="number" value={form.graduation_year} onChange={(value) => updateForm('graduation_year', value)} />
                        </div>

                        <div className="space-y-3">
                            {workExperience.map((item, index) => (
                                <div key={index} className="grid gap-3 rounded-sm border border-surface-200 bg-surface-50 p-4">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Field label="Company" value={item.company} onChange={(value) => updateExperience(index, 'company', value)} />
                                        <Field label="Position" value={item.position} onChange={(value) => updateExperience(index, 'position', value)} />
                                        <Field label="Start Date" value={item.duration_from} onChange={(value) => updateExperience(index, 'duration_from', value)} />
                                        <Field label="End Date" value={item.duration_to} onChange={(value) => updateExperience(index, 'duration_to', value)} />
                                    </div>
                                    <Field label="Responsibilities" value={item.description} onChange={(value) => updateExperience(index, 'description', value)} textarea />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setWorkExperience((current) => [...current, { ...EMPTY_EXPERIENCE }])}
                                className="rounded-sm border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100"
                            >
                                Add Experience
                            </button>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-surface-900">4. Emergency Contact and Resume</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Contact Name" value={form.emergency_contact_name} onChange={(value) => updateForm('emergency_contact_name', value)} />
                            <Field label="Phone" value={form.emergency_contact_phone} onChange={(value) => updateForm('emergency_contact_phone', value)} />
                            <Field label="Relationship" value={form.emergency_contact_relationship} onChange={(value) => updateForm('emergency_contact_relationship', value)} />
                        </div>

                        <label className="block rounded-sm border border-dashed border-surface-300 p-6 text-center">
                            <Upload className="mx-auto mb-3 text-primary-600" size={24} />
                            <p className="text-sm font-semibold text-surface-900">Upload Resume</p>
                            <p className="mb-3 text-xs text-surface-500">PDF or DOCX, up to 5MB</p>
                            <input
                                type="file"
                                accept=".pdf,.docx"
                                className="mx-auto block text-xs"
                                onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                            />
                            {resumeFile && <p className="mt-3 text-xs font-semibold text-emerald-700">{resumeFile.name}</p>}
                        </label>
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-surface-900">5. Digital Attestation</h2>
                        <div className="rounded-sm border border-surface-200 bg-surface-50 p-6">
                            <div className="mb-4 text-xs text-surface-600 leading-relaxed">
                                By affixing your digital signature below, you certify that all information provided in this application is true and complete to the best of your knowledge. You understand that any false statements or omissions may result in your disqualification or termination.
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest italic">Captured Signature</span>
                                    {signatureDataUrl && (
                                        <button 
                                            type="button"
                                            onClick={() => setSignatureDataUrl('')}
                                            className="text-[10px] font-bold text-red-600 uppercase tracking-widest hover:underline"
                                        >
                                            Redo Signature
                                        </button>
                                    )}
                                </div>
                                
                                {signatureDataUrl ? (
                                    <div className="flex h-32 items-center justify-center rounded-sm border border-surface-200 bg-white p-2">
                                        <img src={signatureDataUrl} alt="Signature" className="max-h-full" />
                                    </div>
                                ) : (
                                    <SignaturePad onSave={setSignatureDataUrl} />
                                )}
                                
                                <p className="text-[9px] font-medium text-surface-400 uppercase tracking-widest text-center mt-2 italic">
                                    Digital Signature recorded on {new Date().toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </section>
                </section>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={submit}
                            disabled={submitting}
                            className="inline-flex items-center gap-2 rounded-sm bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? 'Submitting...' : 'Submit Application'} <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                <aside className="space-y-4 rounded-sm border border-surface-200 bg-surface-900 p-6 text-white shadow-sm">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Selected Role</p>
                        <h2 className="mt-2 text-xl font-bold">{selectedPosition?.title ?? 'No position selected'}</h2>
                    </div>
                    <div className="space-y-3 text-sm text-surface-200">
                        <div className="flex items-center gap-2">
                            <Briefcase size={16} />
                            <span>{selectedPosition?.department ?? 'Choose a position to start'}</span>
                        </div>
                        <p>{selectedPosition?.description ?? 'This public form is used for walk-in or local-server applications. No applicant account is required.'}</p>
                    </div>
                    <div className="rounded-sm bg-white/10 p-4 text-xs uppercase tracking-widest text-surface-200">
                        Intake Step 1 of 1
                    </div>
                </aside>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text', textarea = false }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    textarea?: boolean;
}) {
    const className = 'w-full rounded-sm border border-surface-200 px-4 py-3 text-sm';
    return (
        <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-surface-500">{label}</span>
            {textarea
                ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className={`${className} min-h-24`} />
                : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={className} />
            }
        </label>
    );
}

function SelectField({ label, value, onChange, options }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
}) {
    return (
        <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-surface-500">{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-sm border border-surface-200 px-4 py-3 text-sm">
                <option value="">Select option</option>
                {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </label>
    );
}
