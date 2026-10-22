import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { useToast } from '@/components/common/useToast';
import type { Position } from '@/types';
import { CIVIL_STATUS_OPTIONS, EDUCATION_LEVELS, GENDER_OPTIONS, formatCandidateName } from '@/utils/formatters';
import { useRoomStore } from '@/store/roomStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRandomDemoCharacter } from '@/utils/demoCharacters';
import {
    User, UserCheck, UserPlus, Briefcase, GraduationCap, Building2, Tag,
    Keyboard, Sparkles, ShieldAlert, Check, ChevronDown, Search, Zap, X,
    FileText, PhoneCall, CreditCard, Clock, DollarSign, Calendar, ArrowUp, ArrowDown
} from 'lucide-react';

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
    exit_reason?: string;
    description: string;
};

const EMPTY_EXPERIENCE: WorkExperience = {
    company: '',
    position: '',
    duration_from: '',
    duration_to: '',
    exit_reason: '',
    description: '',
};

function Field({ label, value, onChange, type = 'text', textarea = false, placeholder = '', required = false }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    textarea?: boolean;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <label className="block space-y-1 text-left">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#605E5C] flex items-center gap-1">
                {label}
                {required && <span className="text-[#D13438] font-bold text-xs">*</span>}
            </span>
            {textarea ? (
                <textarea
                    value={value}
                    placeholder={placeholder}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-full rounded-none border border-[#D1D5DB] bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-[#242424] placeholder:text-[#a19f9d] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none transition-all min-h-[70px] resize-y"
                />
            ) : (
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-full rounded-none border border-[#D1D5DB] bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-[#242424] placeholder:text-[#a19f9d] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none transition-all"
                />
            )}
        </label>
    );
}

function SelectField({ label, value, onChange, options, required = false }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    required?: boolean;
}) {
    return (
        <label className="block space-y-1 text-left">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#605E5C] flex items-center gap-1">
                {label}
                {required && <span className="text-[#D13438] font-bold text-xs">*</span>}
            </span>
            <div className="relative">
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-full rounded-none border border-[#D1D5DB] bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-[#242424] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none transition-all cursor-pointer appearance-none pr-8"
                >
                    <option value="">Select option</option>
                    {options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#605E5C]">
                    <ChevronDown size={13} />
                </div>
            </div>
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
        (`${p.title} ${p.department}`).toLowerCase().includes(search.toLowerCase())
    ).reduce((acc, current) => {
        const isDuplicate = acc.some(item => item.title === current.title && item.department === current.department);
        if (!isDuplicate) {
            acc.push(current);
        }
        return acc;
    }, [] as Position[]);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
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
                    className="w-full rounded-none border border-[#D1D5DB] bg-white dark:bg-slate-900 px-3 py-1.5 pr-8 text-xs text-[#242424] placeholder:text-[#a19f9d] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none transition-all font-medium"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#605E5C]">
                    <Search size={13} />
                </div>
            </div>
            {open && (
                <div className="absolute z-50 mt-0.5 max-h-60 w-full overflow-auto rounded-none border border-[#D1D5DB] bg-white dark:bg-slate-900 shadow-xl custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] font-semibold text-[#605E5C]">No positions found</div>
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
                                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#EFF6FF] focus:bg-[#EFF6FF] focus:outline-none border-b border-[#F3F2F1] last:border-0 flex items-center justify-between transition-colors"
                            >
                                <span className="text-[#242424]">{p.title}</span>
                                <span className="text-[#605E5C] text-[11px]">{p.department}</span>
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
    { id: 'INITIAL_INTERVIEW', label: 'Initial Interview' },
    { id: 'ACCOUNT_ASSIGNMENT', label: 'Operations Validation (Final Interview)' },
    { id: 'ASSESSMENT', label: 'Technical / Skills Assessment' },
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
    
    // Interview Mode & Room selection state
    const [interviewMode, setInterviewMode] = useState<'MANUAL' | 'ONLINE' | 'ONSITE' | 'ONCALL'>('MANUAL');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    
    // Typing Test Variables
    const [wpm, setWpm] = useState<string>('');
    const [accuracy, setAccuracy] = useState<string>('');
    const [duration, setDuration] = useState<string>('');

    // Initial process stages checklist with Pass/Fail/Skip settings
    const [processSettings, setProcessSettings] = useState<Record<string, 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED'>>({});
    const [processOrder, setProcessOrder] = useState<string[]>([]);

    const [form, setForm] = useState({
        full_name: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        preferred_nickname: '',
        email: '',
        phone: '',
        birth_date: '',
        sex: '',
        civil_status: '',
        nationality: '',
        place_of_birth: '',
        religion: '',
        current_address: '',
        permanent_address: '',
        sss_no: '',
        tin_no: '',
        pagibig_no: '',
        philhealth_no: '',
        bpo_experience_tenure: '',
        salary_expectation: '',
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
            setInterviewMode('MANUAL');
            setSelectedRoomId('');
            // Reset form
            setForm({
                full_name: '', first_name: '', middle_name: '', last_name: '', preferred_nickname: '',
                email: '', phone: '', birth_date: '', sex: '', civil_status: '', nationality: '',
                place_of_birth: '', religion: '', current_address: '', permanent_address: '',
                sss_no: '', tin_no: '', pagibig_no: '', philhealth_no: '',
                bpo_experience_tenure: '', salary_expectation: '',
                highest_education: '', school_name: '', degree: '', graduation_year: '',
                emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
                source: 'MANUAL_ENTRY'
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
                'ACCOUNT_ASSIGNMENT',
                'ASSESSMENT',
                'CLIENT_ASSESSMENT',
                'CLIENT_INTERVIEW'
            ]);
        }
    }, [open]);

    const updateForm = (key: keyof typeof form, value: string) => {
        setForm((current) => {
            const next = { ...current, [key]: value };
            // Auto sync full_name if user types first, middle, or last name
            if (key === 'first_name' || key === 'middle_name' || key === 'last_name') {
                const combined = `${next.first_name} ${next.middle_name} ${next.last_name}`.replace(/\s+/g, ' ').trim();
                next.full_name = combined;
            }
            return next;
        });
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
            error('Position Required', 'Please choose a target position for this candidate.');
            return;
        }
        
        const candidateFullName = form.full_name.trim() || `${form.first_name} ${form.middle_name} ${form.last_name}`.replace(/\s+/g, ' ').trim();
        
        if (!candidateFullName || !form.email.trim()) {
            error('Missing Information', 'Full candidate name and email address are strictly required.');
            return;
        }
        if ((interviewMode === 'ONLINE' || interviewMode === 'ONSITE') && !selectedRoomId) {
            error('Room Required', 'Please select an active interview room for this mode.');
            return;
        }

        setSubmitting(true);
        try {
            let currentStatus = (interviewMode !== 'MANUAL') ? 'INTERVIEW_IN_PROGRESS' : 'APPLIED';
            
            const updatedPis: any = {
                ...form,
                full_name: formatCandidateName(candidateFullName),
                first_name: form.first_name.trim() || undefined,
                middle_name: form.middle_name.trim() || undefined,
                last_name: form.last_name.trim() || undefined,
                preferred_nickname: form.preferred_nickname.trim() || undefined,
                email: form.email.trim().toLowerCase(),
                place_of_birth: form.place_of_birth.trim() || undefined,
                religion: form.religion.trim() || undefined,
                sss_no: form.sss_no.trim() || undefined,
                tin_no: form.tin_no.trim() || undefined,
                pagibig_no: form.pagibig_no.trim() || undefined,
                philhealth_no: form.philhealth_no.trim() || undefined,
                bpo_experience_tenure: form.bpo_experience_tenure.trim() || undefined,
                salary_expectation: form.salary_expectation.trim() || undefined,
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

            if (interviewMode !== 'MANUAL') {
                updatedMetadata.interview_mode = interviewMode;
                updatedMetadata.active_interview_type = 'INITIAL';
                updatedPis.process_settings = {
                    ...processSettings,
                    INITIAL_INTERVIEW: 'PENDING'
                };
            }

            const firstFailedId = processOrder.find(stepId => processSettings[stepId] === 'FAILED');
            if (firstFailedId && interviewMode === 'MANUAL') {
                if (firstFailedId === 'TYPING_TEST') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'Typing Test - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                } else if (firstFailedId === 'INITIAL_INTERVIEW') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'Initial Interview - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                    updatedPis.initial_interview_result = 'Failed';
                    updatedPis.initial_interview_results = 'Failed';
                } else if (firstFailedId === 'ASSESSMENT') {
                    currentStatus = 'FAILED';
                    updatedPis.final_specific_status = 'Personality Test - Failed';
                    updatedPis.final_interview_result = 'FAILED';
                } else if (firstFailedId === 'ACCOUNT_ASSIGNMENT') {
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
            } else if (interviewMode === 'MANUAL') {
                const firstPendingId = processOrder.find(stepId => processSettings[stepId] === 'PENDING');
                if (firstPendingId) {
                    if (firstPendingId === 'TYPING_TEST') {
                        currentStatus = 'TYPING_TEST';
                    } else if (firstPendingId === 'INITIAL_INTERVIEW') {
                        currentStatus = 'INITIAL_INTERVIEW';
                    } else if (firstPendingId === 'ASSESSMENT') {
                        currentStatus = 'ASSESSMENT';
                    } else if (firstPendingId === 'ACCOUNT_ASSIGNMENT') {
                        currentStatus = 'FINAL_INTERVIEW';
                    } else if (firstPendingId === 'CLIENT_ASSESSMENT') {
                        currentStatus = 'CLIENT_ASSESSMENT';
                    } else if (firstPendingId === 'CLIENT_INTERVIEW') {
                        currentStatus = 'CLIENT_INTERVIEW';
                    }
                } else {
                    currentStatus = 'PASSED';
                    updatedPis.final_specific_status = 'JO - Pending';
                    updatedPis.final_interview_result = 'PASSED';
                }

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
                        } else if (step.id === 'ACCOUNT_ASSIGNMENT') {
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
                applicant_name: candidateFullName,
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

                if ((interviewMode === 'ONLINE' || interviewMode === 'ONSITE') && selectedRoomId) {
                    await useRoomStore.getState().updateRoom(selectedRoomId, {
                        status: 'OCCUPIED',
                        current_application_id: createdApp.id,
                        current_applicant_name: createdApp.applicant_name,
                        occupied_since: new Date().toISOString()
                    });
                }
            }

            success('Candidate Created', `${candidateFullName} was successfully registered.`);
            onSuccess();
            
            if ((interviewMode === 'ONLINE' || interviewMode === 'ONSITE') && createdApp && createdApp.id && selectedRoomId) {
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
        const firstName = char.full_name.split(' ')[0] || 'Johnny';
        const lastName = char.full_name.split(' ').slice(1).join(' ') || 'Silverhand';
        
        setForm({
            full_name: char.full_name,
            first_name: firstName,
            middle_name: 'V',
            last_name: lastName,
            preferred_nickname: char.nick_name || firstName,
            email: `${(char.nick_name || 'johnny').toLowerCase()}.${Date.now()}@example.com`,
            phone: '+63 917 123 4567',
            birth_date: '1992-04-20',
            sex: char.sex || 'Male',
            civil_status: 'Single',
            nationality: 'Filipino',
            place_of_birth: 'Cebu City',
            religion: 'Catholic',
            current_address: '123 Alpha St, IT Park, Lahug, Cebu City',
            permanent_address: '123 Alpha St, IT Park, Lahug, Cebu City',
            sss_no: '34-1234567-8',
            tin_no: '123-456-789-000',
            pagibig_no: '1212-3434-5656',
            philhealth_no: '12-345678901-2',
            bpo_experience_tenure: '2 Years',
            salary_expectation: '25,000 PHP',
            highest_education: 'College Graduate',
            school_name: 'University of San Carlos',
            degree: 'BS Information Technology',
            graduation_year: '2014',
            emergency_contact_name: 'Robert Silverhand',
            emergency_contact_phone: '+63 918 765 4321',
            emergency_contact_relationship: 'Father',
            source: 'MANUAL_ENTRY'
        });
        setWorkExperience([{
            company: char.company,
            position: char.position,
            duration_from: '2018-01',
            duration_to: '2023-12',
            exit_reason: 'Career Advancement',
            description: char.description
        }]);
    };

    return (
        <Modal 
            open={open} 
            onClose={onClose} 
            title={
                <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 bg-[#0078D4] text-white flex items-center justify-center rounded-none font-bold text-xs shrink-0 shadow-2xs">
                        +
                    </div>
                    <span className="text-[13px] font-semibold text-[#242424] tracking-tight">Add Candidate (Manual Entry)</span>
                </div>
            }
            size="xl"
            className="rounded-none border border-[#D1D5DB] shadow-2xl overflow-hidden font-sans"
            headerClassName="bg-white dark:bg-slate-900 border-b border-[#E1DFDD] px-6 py-3.5"
            closeButtonClassName="text-[#605E5C] hover:bg-[#F3F2F1] hover:text-[#242424] rounded-none transition-colors p-1"
        >
            <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar text-[#242424] p-1">
                
                {/* 1. Target Position */}
                <section className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 rounded-none space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E1DFDD] pb-2">
                        <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none shrink-0">1</span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#242424]">Role Assignment</h2>
                    </div>
                    <div className="grid gap-3">
                        <label className="block space-y-1 relative">
                            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#605E5C] flex items-center gap-1">
                                Target Position <span className="text-[#D13438] font-bold">*</span>
                            </span>
                            <SearchablePositionSelect 
                                positions={positions} 
                                value={selectedPositionId} 
                                onChange={setSelectedPositionId} 
                            />
                        </label>
                    </div>
                </section>

                {/* 2. Personal Information */}
                <section className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 rounded-none space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E1DFDD] pb-2">
                        <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none shrink-0">2</span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#242424]">Personal Information (PIS Details)</h2>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-4">
                        <Field label="First Name" value={form.first_name} onChange={(val) => updateForm('first_name', val)} placeholder="e.g. Johnny" />
                        <Field label="Middle Name" value={form.middle_name} onChange={(val) => updateForm('middle_name', val)} placeholder="e.g. V." />
                        <Field label="Last Name" value={form.last_name} onChange={(val) => updateForm('last_name', val)} placeholder="e.g. Silverhand" />
                        <Field label="Preferred Nickname" value={form.preferred_nickname} onChange={(val) => updateForm('preferred_nickname', val)} placeholder="e.g. Johnny" />
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <Field label="Full Name" required value={form.full_name} onChange={(val) => updateForm('full_name', val)} placeholder="Full legal name" />
                        <Field label="Email Address" required type="email" value={form.email} onChange={(val) => updateForm('email', val)} placeholder="name@example.com" />
                        <Field label="Phone Number" value={form.phone} onChange={(val) => updateForm('phone', val)} placeholder="+63 9XX XXX XXXX" />
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                        <Field label="Birth Date" type="date" value={form.birth_date} onChange={(val) => updateForm('birth_date', val)} />
                        <SelectField label="Sex" value={form.sex} onChange={(val) => updateForm('sex', val)} options={GENDER_OPTIONS} />
                        <SelectField label="Civil Status" value={form.civil_status} onChange={(val) => updateForm('civil_status', val)} options={CIVIL_STATUS_OPTIONS} />
                        <Field label="Nationality" value={form.nationality} onChange={(val) => updateForm('nationality', val)} placeholder="Filipino" />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Place of Birth" value={form.place_of_birth} onChange={(val) => updateForm('place_of_birth', val)} placeholder="City / Province" />
                        <Field label="Religion" value={form.religion} onChange={(val) => updateForm('religion', val)} placeholder="e.g. Roman Catholic" />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Current Address" value={form.current_address} onChange={(val) => updateForm('current_address', val)} placeholder="Present residential address" />
                        <Field label="Permanent Address" value={form.permanent_address} onChange={(val) => updateForm('permanent_address', val)} placeholder="Home address" />
                    </div>
                </section>

                {/* 3. Government IDs & Tenure */}
                <section className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 rounded-none space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E1DFDD] pb-2">
                        <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none shrink-0">3</span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#242424]">Government IDs & Tenure</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                        <Field label="SSS No." value={form.sss_no} onChange={(val) => updateForm('sss_no', val)} placeholder="XX-XXXXXXX-X" />
                        <Field label="TIN No." value={form.tin_no} onChange={(val) => updateForm('tin_no', val)} placeholder="XXX-XXX-XXX-000" />
                        <Field label="Pag-IBIG No." value={form.pagibig_no} onChange={(val) => updateForm('pagibig_no', val)} placeholder="XXXX-XXXX-XXXX" />
                        <Field label="PhilHealth No." value={form.philhealth_no} onChange={(val) => updateForm('philhealth_no', val)} placeholder="XX-XXXXXXXXX-X" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <Field label="BPO Experience Tenure" value={form.bpo_experience_tenure} onChange={(val) => updateForm('bpo_experience_tenure', val)} placeholder="e.g. 2 Years 6 Months" />
                        <Field label="Expected Salary" value={form.salary_expectation} onChange={(val) => updateForm('salary_expectation', val)} placeholder="e.g. 25,000 PHP" />
                    </div>
                </section>

                {/* 4. Typing Test Data */}
                <section className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 rounded-none space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E1DFDD] pb-2">
                        <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none shrink-0">4</span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#242424]">Typing Test Data (Optional)</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <Field label="WPM" type="number" value={wpm} onChange={setWpm} placeholder="e.g. 65" />
                        <Field label="Accuracy (%)" type="number" value={accuracy} onChange={setAccuracy} placeholder="e.g. 98" />
                        <Field label="Duration (Seconds)" type="number" value={duration} onChange={setDuration} placeholder="e.g. 60" />
                    </div>
                </section>

                {/* 5. Education Details */}
                <section className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 rounded-none space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E1DFDD] pb-2">
                        <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none shrink-0">5</span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#242424]">Education Details</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <SelectField label="Highest Education" value={form.highest_education} onChange={(val) => updateForm('highest_education', val)} options={EDUCATION_LEVELS} />
                        <Field label="School / University" value={form.school_name} onChange={(val) => updateForm('school_name', val)} placeholder="Name of institution" />
                        <Field label="Degree / Course Strand" value={form.degree} onChange={(val) => updateForm('degree', val)} placeholder="e.g. BS Computer Science" />
                        <Field label="Graduation Year" type="number" value={form.graduation_year} onChange={(val) => updateForm('graduation_year', val)} placeholder="e.g. 2022" />
                    </div>
                </section>

                {/* 6. Work Experience */}
                <section className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 rounded-none space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E1DFDD] pb-2">
                        <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none shrink-0">6</span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#242424]">Work Experience</h2>
                    </div>
                    <div className="space-y-3">
                        {workExperience.map((item, index) => (
                            <div key={index} className="grid gap-3 border border-[#E1DFDD] bg-white dark:bg-slate-900 p-3.5 rounded-none relative">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <Field label="Company" value={item.company} onChange={(val) => updateExperience(index, 'company', val)} placeholder="Company Name" />
                                    <Field label="Position" value={item.position} onChange={(val) => updateExperience(index, 'position', val)} placeholder="Role Title" />
                                    <Field label="Start Date" type="month" value={item.duration_from} onChange={(val) => updateExperience(index, 'duration_from', val)} />
                                    <Field label="End Date" type="month" value={item.duration_to} onChange={(val) => updateExperience(index, 'duration_to', val)} />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <Field label="Reason for Leaving" value={item.exit_reason || ''} onChange={(val) => updateExperience(index, 'exit_reason', val)} placeholder="e.g. Career Growth" />
                                </div>
                                <Field label="Responsibilities / Notes" value={item.description} onChange={(val) => updateExperience(index, 'description', val)} textarea placeholder="Key duties and achievements..." />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setWorkExperience((current) => [...current, { ...EMPTY_EXPERIENCE }])}
                            className="border border-[#0078D4] text-[#0078D4] bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold hover:bg-[#EFF6FF] transition-all rounded-none cursor-pointer flex items-center gap-1.5"
                        >
                            + Add Experience Entry
                        </button>
                    </div>
                </section>

                {/* 7. Emergency Contact */}
                <section className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 rounded-none space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E1DFDD] pb-2">
                        <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none shrink-0">7</span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#242424]">Emergency Contact</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <Field label="Contact Person" value={form.emergency_contact_name} onChange={(val) => updateForm('emergency_contact_name', val)} placeholder="Full Name" />
                        <Field label="Phone Number" value={form.emergency_contact_phone} onChange={(val) => updateForm('emergency_contact_phone', val)} placeholder="+63 9XX XXX XXXX" />
                        <Field label="Relationship" value={form.emergency_contact_relationship} onChange={(val) => updateForm('emergency_contact_relationship', val)} placeholder="e.g. Parent / Spouse" />
                    </div>
                </section>

                {/* 8. Initial Process Checklist */}
                <section className="bg-[#F9FAFB] border border-[#E1DFDD] p-4 rounded-none space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E1DFDD] pb-2">
                        <span className="bg-[#0078D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none shrink-0">8</span>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#242424]">Initial Process Checklist</h2>
                    </div>
                    <p className="text-[11px] text-[#605E5C] font-normal">
                        Configure candidate evaluation stage outcomes and starting workflow sequence:
                    </p>
                    <div className="space-y-2">
                        {(() => {
                            let seq = 1;
                            return processOrder.map((stepId, idx) => {
                                const step = PROCESS_STEPS.find(s => s.id === stepId);
                                if (!step) return null;
                                const currentVal = processSettings[step.id] || 'PENDING';
                                const isActive = currentVal !== 'SKIPPED';
                                const stepNum = isActive ? seq++ : null;
                                return (
                                    <div key={step.id} className="flex flex-col gap-2 p-2.5 rounded-none border border-[#E1DFDD] bg-white dark:bg-slate-900 transition-all">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-0.5 shrink-0 select-none">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveStep(idx, 'up')}
                                                        disabled={idx === 0}
                                                        title="Move Up"
                                                        className="text-[#605E5C] hover:text-[#0078D4] disabled:opacity-20 cursor-pointer p-0.5 transition-colors"
                                                    >
                                                        <ArrowUp size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveStep(idx, 'down')}
                                                        disabled={idx === processOrder.length - 1}
                                                        title="Move Down"
                                                        className="text-[#605E5C] hover:text-[#0078D4] disabled:opacity-20 cursor-pointer p-0.5 transition-colors"
                                                    >
                                                        <ArrowDown size={12} />
                                                    </button>
                                                </div>
                                                {stepNum ? (
                                                    <span className="w-4 h-4 bg-[#0078D4] text-white text-[10px] font-bold flex items-center justify-center shrink-0 rounded-none">
                                                        {stepNum}
                                                    </span>
                                                ) : (
                                                    <span className="w-4 h-4 bg-[#E1DFDD] text-[#605E5C] text-[10px] font-bold flex items-center justify-center shrink-0 rounded-none">
                                                        —
                                                    </span>
                                                )}
                                                <span className={`text-xs font-semibold transition-all ${isActive ? 'text-[#242424]' : 'text-[#a19f9d] line-through'}`}>{step.label}</span>
                                            </div>

                                            {!(step.id === 'INITIAL_INTERVIEW' && interviewMode !== 'MANUAL') ? (
                                                <div className="flex border border-[#D1D5DB] rounded-none overflow-hidden text-[11px] font-semibold bg-white dark:bg-slate-900 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setProcessSettings(prev => ({ ...prev, [step.id]: 'PENDING' }))}
                                                        className={`px-3 py-1 cursor-pointer transition-all border-r border-[#D1D5DB] ${
                                                            currentVal === 'PENDING' 
                                                                ? 'bg-[#0078D4] text-white' 
                                                                : 'text-[#242424] hover:bg-[#F3F2F1]'
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
                                                        className={`px-3 py-1 cursor-pointer transition-all border-r border-[#D1D5DB] ${
                                                            currentVal === 'PASSED' 
                                                                ? 'bg-[#107C41] text-white' 
                                                                : 'text-[#242424] hover:bg-[#F3F2F1]'
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
                                                        className={`px-3 py-1 cursor-pointer transition-all border-r border-[#D1D5DB] ${
                                                            currentVal === 'FAILED' 
                                                                ? 'bg-[#D13438] text-white' 
                                                                : 'text-[#242424] hover:bg-[#F3F2F1]'
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
                                                        className={`px-3 py-1 cursor-pointer transition-all last:border-r-0 ${
                                                            currentVal === 'SKIPPED' 
                                                                ? 'bg-[#F2C811] text-[#242424] font-bold' 
                                                                : 'text-[#242424] hover:bg-[#F3F2F1]'
                                                        }`}
                                                    >
                                                        Skip
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-[#0078D4] bg-[#EFF6FF] px-2.5 py-1 rounded-none border border-[#0078D4] shrink-0">
                                                    Direct Interview Mode Active
                                                </span>
                                            )}
                                        </div>
                                        {step.id === 'INITIAL_INTERVIEW' && currentVal === 'PENDING' && (
                                            <div className="mt-1 pt-2.5 border-t border-dashed border-[#E1DFDD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                                                <div className="space-y-0.5 text-left">
                                                    <h4 className="text-[11px] font-semibold text-[#0078D4] flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-[#0078D4] animate-pulse" />
                                                        Interview Mode
                                                    </h4>
                                                    <p className="text-[10.5px] font-normal text-[#605E5C]">
                                                        Start an active interview session or just create the candidate
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {(interviewMode === 'ONLINE' || interviewMode === 'ONSITE') && (
                                                        <div className="relative w-56 text-left">
                                                            <select
                                                                value={selectedRoomId}
                                                                onChange={(e) => setSelectedRoomId(e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-900 border border-[#D1D5DB] text-xs px-2.5 py-1 rounded-none font-medium text-[#242424] outline-none focus:border-[#0078D4] transition-colors cursor-pointer appearance-none pr-7"
                                                            >
                                                                <option value="">Select Interview Room...</option>
                                                                {useRoomStore.getState().rooms
                                                                    .filter(r => r.is_active && (interviewMode === 'ONSITE' ? r.room_type === 'onsite' : r.room_type === 'online'))
                                                                    .map(r => (
                                                                        <option key={r.id} value={r.id}>
                                                                            {r.room_name} {r.status === 'OCCUPIED' ? `(Occupied - ${r.current_applicant_name || 'Active'})` : '(Available)'}
                                                                        </option>
                                                                    ))
                                                                }
                                                            </select>
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#605E5C]">
                                                                <ChevronDown size={12} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="relative w-40 text-left">
                                                        <select
                                                            value={interviewMode}
                                                            onChange={(e) => {
                                                                const mode = e.target.value as any;
                                                                setInterviewMode(mode);
                                                                if (mode === 'ONLINE' || mode === 'ONSITE') {
                                                                    const targetType = mode === 'ONSITE' ? 'onsite' : 'online';
                                                                    const avail = useRoomStore.getState().rooms.find(r => r.status === 'AVAILABLE' && r.is_active && r.room_type === targetType);
                                                                    if (avail) setSelectedRoomId(avail.id);
                                                                    else setSelectedRoomId('');
                                                                } else {
                                                                    setSelectedRoomId('');
                                                                }
                                                            }}
                                                            className="w-full bg-[#0078D4] text-white border border-[#0078D4] text-xs px-2.5 py-1.5 rounded-none font-medium outline-none hover:bg-[#106EBE] transition-colors cursor-pointer appearance-none pr-7"
                                                        >
                                                            <option value="MANUAL">Manual Entry</option>
                                                            <option value="ONLINE">Online Interview</option>
                                                            <option value="ONSITE">Onsite Interview</option>
                                                            <option value="ONCALL">On-call Interview</option>
                                                        </select>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                                                            <ChevronDown size={12} />
                                                        </div>
                                                    </div>
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

            {/* Modal Actions Footer */}
            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-[#E1DFDD]">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 border border-[#D1D5DB] text-[#242424] hover:bg-[#F3F2F1] text-xs font-semibold rounded-none transition-all cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="px-6 py-2 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-semibold rounded-none shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                    {submitting ? 'Creating Candidate...' : 'Create Candidate'}
                </button>
            </div>
        </Modal>
    );
}
