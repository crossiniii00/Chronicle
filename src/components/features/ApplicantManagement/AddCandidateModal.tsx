import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { useToast } from '@/components/common/useToast';
import type { Position } from '@/types';
import { CIVIL_STATUS_OPTIONS, EDUCATION_LEVELS, GENDER_OPTIONS } from '@/utils/formatters';
import { useRoomStore } from '@/store/roomStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRandomDemoCharacter } from '@/utils/demoCharacters';

interface AddCandidateModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

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

function Field({ label, value, onChange, type = 'text', textarea = false, placeholder = '' }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    textarea?: boolean;
    placeholder?: string;
}) {
    const className = 'w-full rounded-sm border border-surface-200 px-3 py-2 text-sm focus:border-black transition-colors outline-none';
    return (
        <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">{label}</span>
            {textarea
                ? <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${className} min-h-[80px] resize-y`} />
                : <input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className={className} />
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
        <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-sm border border-surface-200 px-3 py-2 text-sm focus:border-black transition-colors outline-none">
                <option value="">Select option</option>
                {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </label>
    );
}

function SearchablePositionSelect({ positions, value, onChange }: { positions: Position[], value: string, onChange: (id: string) => void }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const selected = positions.find(p => p.id === value);
        if (selected) {
            setSearch(`${selected.title} - ${selected.department}`);
        } else {
            setSearch('');
        }
    }, [value, positions]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
                const selected = positions.find(p => p.id === value);
                if (selected) setSearch(`${selected.title} - ${selected.department}`);
                else setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, positions]);

    const filtered = positions.filter(p => 
        !p.title.toUpperCase().includes('[INTERNAL]') && 
        !p.title.toUpperCase().includes('[ON-CALL]') && 
        (`${p.title} ${p.department}`).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                value={search}
                onChange={e => {
                    setSearch(e.target.value);
                    setOpen(true);
                    if (e.target.value === '') onChange('');
                }}
                onFocus={() => setOpen(true)}
                placeholder="Search open positions..."
                className="w-full rounded-sm border border-surface-200 px-3 py-2 text-sm focus:border-black transition-colors outline-none bg-white"
            />
            {open && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-surface-200 bg-white shadow-lg custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-surface-400">No positions found</div>
                    ) : (
                        filtered.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                    onChange(p.id);
                                    setSearch(`${p.title} - ${p.department}`);
                                    setOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-surface-50 focus:bg-surface-50 focus:outline-none border-b border-surface-100 last:border-0"
                            >
                                {p.title} <span className="text-surface-400 text-xs">- {p.department}</span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

const PROCESS_STEPS = [
    { id: 'TYPING_TEST', label: 'Typing Test Assessment' },
    { id: 'INITIAL_INTERVIEW', label: 'Initial Recruitment Interview' },
    { id: 'ASSESSMENT', label: 'Technical / Skills Assessment' },
    { id: 'OPS_VALIDATION', label: 'Operations Validation (Final Interview)' },
    { id: 'CLIENT_ASSESSMENT', label: 'Client Assessment' },
    { id: 'CLIENT_INTERVIEW', label: 'Client Interview Evaluation' }
];

export function AddCandidateModal({ open, onClose, onSuccess }: AddCandidateModalProps) {
    const { success, error } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [positions, setPositions] = useState<Position[]>([]);
    const [selectedPositionId, setSelectedPositionId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    
    // Online Interview Toggle & Room selection state
    const [isOnlineInterview, setIsOnlineInterview] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    
    // Typing Test Variables
    const [wpm, setWpm] = useState<string>('');
    const [accuracy, setAccuracy] = useState<string>('');
    const [duration, setDuration] = useState<string>('');

    // Recruitment process stages checklist with Pass/Fail/Skip settings
    const [processSettings, setProcessSettings] = useState<Record<string, 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED'>>({});
    const [processOrder, setProcessOrder] = useState<string[]>([]);

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
        source: 'MANUAL_ENTRY'
    });

    const [workExperience, setWorkExperience] = useState<WorkExperience[]>([{ ...EMPTY_EXPERIENCE }]);

    useEffect(() => {
        if (open) {
            PositionService.getAllOpen().then((items) => {
                setPositions(items);
            });
            useRoomStore.getState().loadRooms(true);
            setIsOnlineInterview(false);
            setSelectedRoomId('');
            // Reset form
            setForm({
                full_name: '', email: '', phone: '', birth_date: '', gender: '', civil_status: '', nationality: '', current_address: '', permanent_address: '', highest_education: '', school_name: '', degree: '', graduation_year: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '', source: 'MANUAL_ENTRY'
            });
            setWorkExperience([{ ...EMPTY_EXPERIENCE }]);
            setSelectedPositionId('');
            setWpm(''); setAccuracy(''); setDuration('');
            const initialSettings: Record<string, 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED'> = {};
            PROCESS_STEPS.forEach(p => {
                initialSettings[p.id] = 'PENDING';
            });
            setProcessSettings(initialSettings);
            setProcessOrder([
                'TYPING_TEST',
                'INITIAL_INTERVIEW',
                'ASSESSMENT',
                'OPS_VALIDATION',
                'CLIENT_ASSESSMENT',
                'CLIENT_INTERVIEW'
            ]);
        }
    }, [open]);

    const updateForm = (key: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const updateExperience = (index: number, key: keyof WorkExperience, value: string) => {
        setWorkExperience((current) =>
            current.map((item, currentIndex) => currentIndex === index ? { ...item, [key]: value } : item),
        );
    };

    const applicantId = () => {
        const email = form.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `manual-${email || 'applicant'}-${Date.now()}`;
    };

    const submit = async () => {
        const selectedPosition = positions.find((p) => p.id === selectedPositionId);
        if (!selectedPosition) {
            error('Position Required', 'Please choose a position for this candidate.');
            return;
        }
        if (!form.full_name.trim() || !form.email.trim()) {
            error('Missing Info', 'Full name and email are strictly required.');
            return;
        }
        if (isOnlineInterview && !selectedRoomId) {
            error('Room Required', 'Please select an available interview room.');
            return;
        }

        setSubmitting(true);
        try {
            // Compute initial status and PIS values based on settings
            let currentStatus = isOnlineInterview ? 'INTERVIEW_IN_PROGRESS' : 'APPLIED';
            const dept = (selectedPosition.department || '').toUpperCase();
            
            const updatedPis: any = {
                ...form,
                full_name: form.full_name.trim(),
                email: form.email.trim().toLowerCase(),
                graduation_year: form.graduation_year ? Number(form.graduation_year) : undefined,
                work_experience: workExperience.filter((item) => Object.values(item).some(Boolean)),
                skills: [],
                languages: [],
                certifications: [],
                required_processes: Object.keys(processSettings).filter(k => processSettings[k] !== 'SKIPPED'),
                process_settings: processSettings,
                process_order: processOrder
            };

            const updatedMetadata: any = {
                required_processes: Object.keys(processSettings).filter(k => processSettings[k] !== 'SKIPPED'),
                process_settings: processSettings,
                process_order: processOrder
            };

            if (isOnlineInterview) {
                updatedMetadata.interview_mode = 'ONLINE';
                updatedMetadata.active_interview_type = 'INITIAL';
                updatedPis.process_settings = {
                    ...processSettings,
                    INITIAL_INTERVIEW: 'PENDING'
                };
            }

            // Let's determine if any stage is failed
            const firstFailedId = processOrder.find(stepId => processSettings[stepId] === 'FAILED');
            if (firstFailedId && !isOnlineInterview) {
                // If any stage is failed, the candidate fails at that stage
                if (firstFailedId === 'TYPING_TEST') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'Typing Test - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                } else if (firstFailedId === 'INITIAL_INTERVIEW') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'Recruitment Interview - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                    updatedPis.initial_interview_result = 'Failed';
                    updatedPis.initial_interview_results = 'Failed';
                } else if (firstFailedId === 'ASSESSMENT') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'Personality Test - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                } else if (firstFailedId === 'OPS_VALIDATION') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'OV - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                    updatedPis.ops_validator_status = 'Failed';
                } else if (firstFailedId === 'CLIENT_ASSESSMENT') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'Client Assessment - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                    updatedPis.client_assessment_status = 'Failed';
                } else if (firstFailedId === 'CLIENT_INTERVIEW') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'Client Interview - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                    updatedPis.client_interview_status = 'Failed';
                }
            } else if (!isOnlineInterview) {
                // Find the first pending stage in order
                const firstPendingId = processOrder.find(stepId => processSettings[stepId] === 'PENDING');
                if (firstPendingId) {
                    if (firstPendingId === 'TYPING_TEST') {
                        currentStatus = 'TYPING_TEST';
                    } else if (firstPendingId === 'INITIAL_INTERVIEW') {
                        currentStatus = 'INITIAL_INTERVIEW';
                    } else if (firstPendingId === 'ASSESSMENT') {
                        currentStatus = 'ASSESSMENT';
                    } else if (firstPendingId === 'OPS_VALIDATION') {
                        currentStatus = 'FINAL_INTERVIEW';
                    } else if (firstPendingId === 'CLIENT_ASSESSMENT') {
                        currentStatus = 'CLIENT_ASSESSMENT';
                    } else if (firstPendingId === 'CLIENT_INTERVIEW') {
                        currentStatus = 'CLIENT_INTERVIEW';
                    }
                } else {
                    // If everything is passed or skipped, they pass!
                    currentStatus = 'PASSED';
                    updatedPis.final_specific_status = 'JO - Pending';
                    updatedPis.final_interview_result = 'PASSED';
                }

                // Fill results for PASSED stages
                PROCESS_STEPS.forEach(step => {
                    if (processSettings[step.id] === 'PASSED') {
                        if (step.id === 'TYPING_TEST') {
                            if (!wpm) setWpm('70');
                            if (!accuracy) setAccuracy('98');
                            if (!duration) setDuration('60');
                        } else if (step.id === 'INITIAL_INTERVIEW') {
                            updatedPis.initial_interview_result = 'Passed';
                            updatedPis.initial_interview_results = 'Passed';
                        } else if (step.id === 'ASSESSMENT') {
                            updatedPis.assessment_score = 85;
                        } else if (step.id === 'OPS_VALIDATION') {
                            updatedPis.ops_validator_status = 'Passed';
                            updatedPis.final_interview_result = 'PASSED';
                        } else if (step.id === 'CLIENT_ASSESSMENT') {
                            updatedPis.client_assessment_status = 'Passed';
                            updatedPis.client_assessment_score = 90;
                        } else if (step.id === 'CLIENT_INTERVIEW') {
                            updatedPis.client_interview_status = 'Passed';
                        }
                    }
                });
            }

            const typingTestPayload = (wpm || accuracy || processSettings['TYPING_TEST'] === 'PASSED') ? {
                wpm: wpm ? Number(wpm) : (processSettings['TYPING_TEST'] === 'PASSED' ? 70 : 0),
                accuracy: accuracy ? Number(accuracy) : (processSettings['TYPING_TEST'] === 'PASSED' ? 98 : 0),
                duration: duration ? Number(duration) : (processSettings['TYPING_TEST'] === 'PASSED' ? 60 : 0)
            } : undefined;

            const createdApp = await ApplicationService.submit({
                applicant_id: applicantId(),
                applicant_name: form.full_name.trim(),
                applicant_email: form.email.trim().toLowerCase(),
                position: selectedPosition,
                resume_name: 'Manual Entry (No File)',
                typing_test: typingTestPayload,
                pis: updatedPis,
            });

            if (createdApp && createdApp.id) {
                await ApplicationService.patch(createdApp.id, {
                    current_status: currentStatus as any,
                    master_status: currentStatus === 'PASSED' ? 'For Job Offer' : (currentStatus === 'FAILED' ? 'REJECTED' : undefined),
                    master_column: currentStatus === 'PASSED' ? 'MASTERLIST' : undefined,
                    pis: updatedPis,
                    metadata: updatedMetadata
                });

                if (isOnlineInterview) {
                    // 2. Assign applicant to the room
                    await useRoomStore.getState().updateRoom(selectedRoomId, {
                        status: 'OCCUPIED',
                        current_application_id: createdApp.id,
                        current_applicant_name: createdApp.applicant_name,
                        occupied_since: new Date().toISOString()
                    });
                }
            }

            success('Candidate Added', `${form.full_name} has been manually added to the pipeline.`);
            onSuccess();
            
            if (isOnlineInterview && createdApp && createdApp.id) {
                 // Navigate to interview rooms with autoOpenRoomId
                 const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                 navigate(`${basePath}/interview/rooms`, { 
                     state: { autoOpenRoomId: selectedRoomId } 
                 });
            }
        } catch (submissionError: unknown) {
            error('Creation Failed', submissionError instanceof Error ? submissionError.message : 'Unable to create candidate.');
        } finally {
            setSubmitting(false);
        }
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === processOrder.length - 1) return;
        const newOrder = [...processOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newOrder[index];
        newOrder[index] = newOrder[targetIndex];
        newOrder[targetIndex] = temp;
        setProcessOrder(newOrder);
    };

    const handleDemoFill = () => {
        const char = getRandomDemoCharacter();
        if (positions.length > 0) {
            const externalPos = positions.find(p => 
                !p.title.toUpperCase().includes('[INTERNAL]') && 
                !p.title.toUpperCase().includes('[ON-CALL]')
            );
            setSelectedPositionId(externalPos ? externalPos.id : positions[0].id);
        }
        setWpm('72');
        setAccuracy('98');
        setDuration('60');
        setForm({
            full_name: char.full_name,
            email: `${char.nick_name.toLowerCase()}.${Date.now()}@example.com`,
            phone: '+63 917 123 4567',
            birth_date: '1992-04-20',
            gender: char.gender,
            civil_status: 'Single',
            nationality: 'Filipino',
            current_address: '123 Alpha St, IT Park, Lahug, Cebu City',
            permanent_address: '123 Alpha St, IT Park, Lahug, Cebu City',
            highest_education: 'College Graduate',
            school_name: 'University of San Carlos',
            degree: 'BS Information Technology',
            graduation_year: '2014',
            emergency_contact_name: 'Robert Doe',
            emergency_contact_phone: '+63 918 765 4321',
            emergency_contact_relationship: 'Father',
            source: 'MANUAL_ENTRY'
        });
        setWorkExperience([{
            company: char.company,
            position: char.position,
            duration_from: '2018-01',
            duration_to: '2023-12',
            description: char.description
        }]);
    };

    return (
        <Modal open={open} onClose={onClose} title="Add Candidate (Manual Entry)" size="xl">
            <div className="flex flex-col gap-8 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
                

                {/* 1. Core Assignment */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                        <span className="bg-black text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-sm">1</span>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-surface-900">Role Assignment</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block space-y-1.5 md:col-span-2 relative">
                            <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">Target Position *</span>
                            <SearchablePositionSelect 
                                positions={positions} 
                                value={selectedPositionId} 
                                onChange={setSelectedPositionId} 
                            />
                        </label>
                    </div>
                </section>

                {/* 2. Personal Information */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                        <span className="bg-black text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-sm">2</span>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-surface-900">Personal Information</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label="Full Name *" value={form.full_name} onChange={(value) => updateForm('full_name', value)} />
                        <Field label="Email Address *" type="email" value={form.email} onChange={(value) => updateForm('email', value)} />
                        <Field label="Phone Number" value={form.phone} onChange={(value) => updateForm('phone', value)} />
                        
                        <Field label="Birth Date" type="date" value={form.birth_date} onChange={(value) => updateForm('birth_date', value)} />
                        <SelectField label="Gender" value={form.gender} onChange={(value) => updateForm('gender', value)} options={GENDER_OPTIONS} />
                        <SelectField label="Civil Status" value={form.civil_status} onChange={(value) => updateForm('civil_status', value)} options={CIVIL_STATUS_OPTIONS} />
                        
                        <Field label="Nationality" value={form.nationality} onChange={(value) => updateForm('nationality', value)} />
                        <Field label="Current Address" value={form.current_address} onChange={(value) => updateForm('current_address', value)} />
                        <Field label="Permanent Address" value={form.permanent_address} onChange={(value) => updateForm('permanent_address', value)} />
                    </div>
                </section>

                {/* 3. Typing Test Variables */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                        <span className="bg-black text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-sm">3</span>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-surface-900">Typing Test Data (Optional)</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label="WPM" type="number" value={wpm} onChange={setWpm} placeholder="e.g. 65" />
                        <Field label="Accuracy (%)" type="number" value={accuracy} onChange={setAccuracy} placeholder="e.g. 98" />
                        <Field label="Duration (Seconds)" type="number" value={duration} onChange={setDuration} placeholder="e.g. 60" />
                    </div>
                </section>

                {/* 4. Education */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                        <span className="bg-black text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-sm">4</span>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-surface-900">Education Details</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <SelectField label="Highest Education" value={form.highest_education} onChange={(value) => updateForm('highest_education', value)} options={EDUCATION_LEVELS} />
                        <Field label="School / University" value={form.school_name} onChange={(value) => updateForm('school_name', value)} />
                        <Field label="Degree / Course Strand" value={form.degree} onChange={(value) => updateForm('degree', value)} />
                        <Field label="Graduation Year" type="number" value={form.graduation_year} onChange={(value) => updateForm('graduation_year', value)} />
                    </div>
                </section>

                {/* 5. Work Experience */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                        <span className="bg-black text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-sm">5</span>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-surface-900">Work Experience</h2>
                    </div>
                    <div className="space-y-4">
                        {workExperience.map((item, index) => (
                            <div key={index} className="grid gap-3 rounded-sm border border-surface-200 bg-surface-50 p-4 relative">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <Field label="Company" value={item.company} onChange={(value) => updateExperience(index, 'company', value)} />
                                    <Field label="Position" value={item.position} onChange={(value) => updateExperience(index, 'position', value)} />
                                    <Field label="Start Date" type="month" value={item.duration_from} onChange={(value) => updateExperience(index, 'duration_from', value)} />
                                    <Field label="End Date" type="month" value={item.duration_to} onChange={(value) => updateExperience(index, 'duration_to', value)} />
                                </div>
                                <Field label="Responsibilities / Notes" value={item.description} onChange={(value) => updateExperience(index, 'description', value)} textarea />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setWorkExperience((current) => [...current, { ...EMPTY_EXPERIENCE }])}
                            className="rounded-none border border-surface-300 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-surface-600 hover:bg-black hover:text-white hover:border-black transition-all"
                        >
                            + Add Another Experience
                        </button>
                    </div>
                </section>

                {/* 6. Emergency Contact */}
                <section className="space-y-4 pb-8">
                    <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                        <span className="bg-black text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-sm">6</span>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-surface-900">Emergency Contact</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label="Contact Name" value={form.emergency_contact_name} onChange={(value) => updateForm('emergency_contact_name', value)} />
                        <Field label="Phone Number" value={form.emergency_contact_phone} onChange={(value) => updateForm('emergency_contact_phone', value)} />
                        <Field label="Relationship" value={form.emergency_contact_relationship} onChange={(value) => updateForm('emergency_contact_relationship', value)} />
                    </div>
                </section>

                {/* 7. Recruitment Process Checklist */}
                <section className="space-y-4 pb-8">
                    <div className="flex items-center gap-2 border-b border-surface-200 pb-2">
                        <span className="bg-black text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-sm">7</span>
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-surface-900">Recruitment Process Checklist</h2>
                    </div>
                    <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">
                        Configure the evaluation stages and starting status for this candidate:
                    </p>
                    <div className="space-y-3">
                        {(() => {
                            let seq = 1;
                            return processOrder.map((stepId, idx) => {
                                const step = PROCESS_STEPS.find(s => s.id === stepId);
                                if (!step) return null;
                                const currentVal = processSettings[step.id] || 'PENDING';
                                const isActive = currentVal !== 'SKIPPED';
                                const stepNum = isActive ? seq++ : null;
                                return (
                                    <div key={step.id} className="flex flex-col gap-3 p-3 rounded-sm border border-surface-200 bg-surface-50 transition-all">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                {/* Reorder Up/Down Controls */}
                                                <div className="flex flex-col gap-0.5 select-none mr-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveStep(idx, 'up')}
                                                        disabled={idx === 0}
                                                        title="Move Up"
                                                        className="text-[9px] hover:text-black text-surface-400 disabled:opacity-20 cursor-pointer p-0.5 leading-none transition-colors"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveStep(idx, 'down')}
                                                        disabled={idx === processOrder.length - 1}
                                                        title="Move Down"
                                                        className="text-[9px] hover:text-black text-surface-400 disabled:opacity-20 cursor-pointer p-0.5 leading-none transition-colors"
                                                    >
                                                        ▼
                                                    </button>
                                                </div>
                                                {stepNum ? (
                                                    <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                                        {stepNum}
                                                    </span>
                                                ) : (
                                                    <span className="w-5 h-5 rounded-full bg-surface-200 text-surface-400 text-[10px] font-black flex items-center justify-center shrink-0">
                                                        —
                                                    </span>
                                                )}
                                                <span className={`text-xs font-bold transition-all ${isActive ? 'text-surface-800' : 'text-surface-450 line-through'}`}>{step.label}</span>
                                            </div>
                                            {!(step.id === 'INITIAL_INTERVIEW' && isOnlineInterview) ? (
                                                <div className="flex border border-surface-200 rounded-sm overflow-hidden text-[10px] font-black uppercase tracking-wider bg-white shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setProcessSettings(prev => ({ ...prev, [step.id]: 'PENDING' }))}
                                                        className={`px-3 py-1.5 cursor-pointer transition-all border-r border-surface-200 ${
                                                            currentVal === 'PENDING' 
                                                                ? 'bg-surface-800 text-white' 
                                                                : 'text-surface-600 hover:bg-surface-50'
                                                        }`}
                                                    >
                                                        Pending
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setProcessSettings(prev => ({ ...prev, [step.id]: 'PASSED' }));
                                                            if (step.id === 'INITIAL_INTERVIEW') {
                                                                setIsOnlineInterview(false);
                                                                setSelectedRoomId('');
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 cursor-pointer transition-all border-r border-surface-200 ${
                                                            currentVal === 'PASSED' 
                                                                ? 'bg-emerald-600 text-white' 
                                                                : 'text-surface-600 hover:bg-surface-50'
                                                        }`}
                                                    >
                                                        Pass
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setProcessSettings(prev => ({ ...prev, [step.id]: 'FAILED' }));
                                                            if (step.id === 'INITIAL_INTERVIEW') {
                                                                setIsOnlineInterview(false);
                                                                setSelectedRoomId('');
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 cursor-pointer transition-all border-r border-surface-200 ${
                                                            currentVal === 'FAILED' 
                                                                ? 'bg-rose-600 text-white' 
                                                                : 'text-surface-600 hover:bg-surface-50'
                                                        }`}
                                                    >
                                                        Fail
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setProcessSettings(prev => ({ ...prev, [step.id]: 'SKIPPED' }));
                                                            if (step.id === 'INITIAL_INTERVIEW') {
                                                                setIsOnlineInterview(false);
                                                                setSelectedRoomId('');
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 cursor-pointer transition-all last:border-r-0 ${
                                                            currentVal === 'SKIPPED' 
                                                                ? 'bg-amber-600 text-white' 
                                                                : 'text-surface-600 hover:bg-surface-50'
                                                        }`}
                                                    >
                                                        Skip
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-sm border border-purple-200 select-none shrink-0">
                                                    Online Interview Mode
                                                </span>
                                            )}
                                        </div>
                                        {step.id === 'INITIAL_INTERVIEW' && currentVal === 'PENDING' && (
                                            <div className="mt-1 pt-3 border-t border-dashed border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300">
                                                <div className="space-y-0.5 text-left">
                                                    <h4 className="text-[10px] font-black text-purple-950 uppercase tracking-widest flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                                                        Conduct Online Interview Directly
                                                    </h4>
                                                    <p className="text-[9px] font-bold text-purple-700/80 uppercase tracking-wider leading-relaxed">
                                                        Manually register and immediately launch an active online interview session in a selected room
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {isOnlineInterview && (
                                                        <div className="relative w-60 text-left">
                                                            <select
                                                                value={selectedRoomId}
                                                                onChange={(e) => setSelectedRoomId(e.target.value)}
                                                                className="w-full bg-white border border-purple-200 text-[10px] px-2.5 py-1.5 rounded-md font-bold text-slate-700 outline-none focus:border-purple-500 transition-colors cursor-pointer appearance-none pr-7"
                                                            >
                                                                <option value="">Select Interview Room...</option>
                                                                {useRoomStore.getState().rooms
                                                                    .filter(r => r.is_active && r.room_type === 'online')
                                                                    .map(r => (
                                                                        <option key={r.id} value={r.id}>
                                                                            {r.room_name} {r.status === 'OCCUPIED' ? `(Occupied - ${r.current_applicant_name || 'Active'})` : '(Available)'}
                                                                        </option>
                                                                    ))
                                                                }
                                                            </select>
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-purple-400 text-[8px]">
                                                                ▼
                                                            </div>
                                                        </div>
                                                    )}
                                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={isOnlineInterview}
                                                            onChange={(e) => {
                                                                setIsOnlineInterview(e.target.checked);
                                                                if (e.target.checked) {
                                                                    const avail = useRoomStore.getState().rooms.find(r => r.status === 'AVAILABLE' && r.is_active && r.room_type === 'online');
                                                                    if (avail) setSelectedRoomId(avail.id);
                                                                } else {
                                                                    setSelectedRoomId('');
                                                                }
                                                            }}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </section>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                    type="button"
                    onClick={handleDemoFill}
                    className="px-6 py-2.5 text-[11px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-all mr-auto cursor-pointer"
                >
                    ⚡ Demo Fill
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-[11px] font-black text-surface-500 uppercase tracking-widest hover:text-black transition-all cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="px-8 py-2.5 bg-black text-white text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 hover:bg-surface-800 cursor-pointer"
                >
                    {submitting ? 'Creating...' : 'Create Candidate'}
                </button>
            </div>
        </Modal>
    );
}
