import React from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function Field({ label, value, onChange, type = 'text', textarea = false, placeholder = '' }: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
    textarea?: boolean;
    placeholder?: string;
}) {
    const className = 'w-full rounded-md border border-surface-200 px-4 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white text-surface-900 shadow-sm';
    return (
        <label className="block space-y-1.5 text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">{label}</span>
            {textarea
                ? <textarea value={value as string} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} min-h-24`} />
                : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />
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
    const className = 'w-full rounded-md border border-surface-200 px-4 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white text-surface-900 shadow-sm';
    return (
        <label className="block space-y-1.5 text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} className={className}>
                <option value="">Select...</option>
                {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </label>
    );
}

const EDUCATION_ATTAINMENT_OPTIONS = [
    'High School Graduate (Old Curriculum)',
    'Senior High School Level',
    'College Graduate / Level'
];

const SHS_STRANDS = [
    'STEM (Science, Technology, Engineering, and Mathematics)',
    'ABM (Accountancy, Business, and Management)',
    'HUMSS (Humanities and Social Sciences)',
    'GAS (General Academic Strand)',
    'TVL - ICT (Information and Communications Technology)',
    'TVL - HE (Home Economics)',
    'TVL - IA (Industrial Arts)',
    'TVL - AFA (Agri-Fishery Arts)',
    'Arts and Design Track',
    'Sports Track'
];

const COMMON_DEGREES = [
    'Bachelor of Science in Information Technology (BSIT)',
    'Bachelor of Science in Computer Science (BSCS)',
    'Bachelor of Science in Business Administration (BSBA)',
    'Bachelor of Science in Hospitality Management (BSHM)',
    'Bachelor of Science in Tourism Management (BSTM)',
    'Bachelor of Science in Nursing (BSN)',
    'Bachelor of Science in Psychology',
    'Bachelor of Science in Accountancy (BSA)',
    'Bachelor of Arts in Communication (AB Comm)',
    'Bachelor of Elementary Education (BEEd)',
    'Bachelor of Secondary Education (BSEd)',
    'Bachelor of Science in Civil Engineering (BSCE)',
    'Bachelor of Science in Mechanical Engineering (BSME)',
    'Bachelor of Science in Electrical Engineering (BSEE)',
    'Bachelor of Science in Criminology (BSCrim)',
    'Bachelor of Science in Marine Engineering (BSMarE)'
];

function AutocompleteField({ label, value, onChange, options, placeholder = '' }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [filteredOptions, setFilteredOptions] = React.useState<string[]>([]);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!value.trim()) {
            setFilteredOptions([]);
            return;
        }
        const matches = options.filter(opt =>
            opt.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredOptions(matches);
    }, [value, options]);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const className = 'w-full rounded-md border border-surface-200 px-4 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white text-surface-900 shadow-sm';

    return (
        <div ref={containerRef} className="relative block space-y-1.5 text-left w-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">{label}</span>
            <input
                type="text"
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className={className}
            />
            {isOpen && filteredOptions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 max-h-60 overflow-y-auto bg-white border border-surface-200 rounded-md shadow-lg mt-1 text-surface-900">
                    {filteredOptions.map((opt) => (
                        <li
                            key={opt}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            className="px-4 py-2.5 hover:bg-[#ef3e36]/10 hover:text-[#ef3e36] text-xs font-bold transition-colors cursor-pointer"
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function PlanDropdownField({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    
    const isTypedValue = value !== '' && value !== 'No';
    const [isEnteringDetails, setIsEnteringDetails] = React.useState(isTypedValue);

    React.useEffect(() => {
        if (isTypedValue) {
            setIsEnteringDetails(true);
        } else if (value === '' || value === 'No') {
            setIsEnteringDetails(false);
        }
    }, [value, isTypedValue]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectOption = (opt: string) => {
        setIsOpen(false);
        if (opt === 'Yes') {
            setIsEnteringDetails(true);
            onChange('');
        } else {
            setIsEnteringDetails(false);
            onChange(opt);
        }
    };

    const handleClear = () => {
        setIsEnteringDetails(false);
        onChange('');
    };

    const displayValue = value === '' ? '' : value;

    return (
        <div ref={containerRef} className="block space-y-1.5 text-left relative">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">{label}</span>
            
            {isEnteringDetails ? (
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={value === 'Yes' ? '' : value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-md border border-surface-200 pl-4 pr-10 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white text-surface-900 shadow-sm"
                        placeholder={`Details about plans...`}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 text-surface-400 hover:text-brand-red transition-colors"
                        title="Change option"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full rounded-md border border-surface-200 px-4 py-3 text-sm text-left focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white text-surface-900 shadow-sm flex justify-between items-center select-none"
                    >
                        <span className={displayValue ? "text-surface-900 font-medium" : "text-surface-400"}>
                            {displayValue || 'Choose option'}
                        </span>
                        <motion.svg
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            className="w-4 h-4 text-surface-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </motion.svg>
                    </button>

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 mt-1 bg-white border border-surface-200 rounded-md shadow-lg overflow-hidden z-50 py-1"
                            >
                                {['Yes', 'No'].map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => handleSelectOption(opt)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export function Education({ form, updateForm, onBack, onNext }: { 
    form: any; 
    updateForm: (f: string, v: any) => void; 
    onBack: () => void; 
    onNext: () => void; 
}) {
    const handleEducationChange = (value: string) => {
        updateForm('highest_education', value);
        updateForm('course_strand', '');
        if (value === 'College Graduate / Level') {
            updateForm('course_year', form.is_graduated === true ? 'College Graduate' : form.is_graduated === false ? 'College Undergrad' : '');
        } else if (value === 'Senior High School Level') {
            updateForm('course_year', form.is_graduated === true ? 'Senior High School Graduate' : form.is_graduated === false ? 'Senior High School Undergrad' : '');
        } else {
            updateForm('course_year', '');
        }
    };

    const handleGraduatedChange = (isGraduated: boolean) => {
        updateForm('is_graduated', isGraduated);
        if (form.highest_education === 'College Graduate / Level') {
            updateForm('course_year', isGraduated ? 'College Graduate' : 'College Undergrad');
        } else if (form.highest_education === 'Senior High School Level') {
            updateForm('course_year', isGraduated ? 'Senior High School Graduate' : 'Senior High School Undergrad');
        }
    };

    return (
        <div 
            className="min-h-screen w-full relative text-white pt-36 pb-16 px-4 overflow-x-hidden brand-gradient flex flex-col items-center justify-start"
            style={{ 
                fontFamily: "'Mulish', 'Segoe UI', 'Inter', sans-serif"
            }}
        >
            {/* Cinematic Background Glow Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#ef3e36]/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#622B89]/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDuration: '8s' }} />
            </div>

            {/* Premium Transparent Header */}
            <header className="fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-6 md:px-10 py-5 bg-black/20 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center gap-4 cursor-pointer group">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden border border-white/20">
                        <img src="/contactpoint-logo.png?v=2" alt="CP360" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="flex flex-col text-left">
                        <h1 className="text-white font-black text-[15px] tracking-[0.1em] uppercase leading-none">
                             ContactPoint<span className="text-[#ef3e36]">360</span>
                        </h1>
                        <span className="text-white/60 font-black text-[9px] tracking-[0.3em] uppercase mt-1">
                            Talent Acquisition
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                    <button 
                        onClick={onBack} 
                        className="inline-flex items-center gap-2 text-white/70 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                    >
                        <ArrowLeft size={14} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] bg-[#ef3e36]/10 px-3.5 py-2 border border-[#ef3e36]/20 rounded-full">
                        Step 3 of 6: Education
                    </div>
                </div>
            </header>

            <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">


                {/* Form Card */}
                <div className="w-full bg-white rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />
                    
                    <h2 className="mb-8 text-3xl font-black text-surface-900 tracking-tight uppercase border-b border-surface-100 pb-4">
                        Educational Background
                    </h2>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <SelectField 
                                label="Highest Educational Attained" 
                                value={form.highest_education || ''} 
                                onChange={handleEducationChange} 
                                options={EDUCATION_ATTAINMENT_OPTIONS} 
                            />
                        </div>

                        <Field label="School" value={form.school_name || ''} onChange={(value) => updateForm('school_name', value)} />
                        <Field label="School Year Attended" value={form.school_year_attended || ''} onChange={(value) => updateForm('school_year_attended', value)} />
                        
                        <div className="flex flex-col space-y-1.5 text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">Graduated</span>
                            <div className="flex gap-4">
                                <button 
                                    type="button"
                                    onClick={() => handleGraduatedChange(true)}
                                    className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                        form.is_graduated === true 
                                            ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md shadow-[#ef3e36]/20' 
                                            : 'bg-surface-50 border-surface-200 text-surface-400 hover:bg-surface-100 hover:text-surface-600'
                                    }`}
                                > YES </button>
                                <button 
                                    type="button"
                                    onClick={() => handleGraduatedChange(false)}
                                    className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                        form.is_graduated === false 
                                            ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md shadow-[#ef3e36]/20' 
                                            : 'bg-surface-50 border-surface-200 text-surface-400 hover:bg-surface-100 hover:text-surface-600'
                                    }`}
                                > NO </button>
                            </div>
                        </div>

                        {form.highest_education === 'Senior High School Level' && (
                            <>
                                <SelectField 
                                    label="Strand" 
                                    value={form.course_strand || ''} 
                                    onChange={(value) => updateForm('course_strand', value)} 
                                    options={SHS_STRANDS}
                                />
                                <Field 
                                    label="Year Level" 
                                    value={form.course_year || ''} 
                                    onChange={(value) => updateForm('course_year', value)} 
                                />
                            </>
                        )}

                        {form.highest_education === 'College Graduate / Level' && (
                            <>
                                <AutocompleteField 
                                    label="Degree / Course" 
                                    value={form.course_strand || ''} 
                                    onChange={(value) => updateForm('course_strand', value)} 
                                    options={COMMON_DEGREES}
                                    placeholder="Type to search e.g. Computer Science"
                                />
                                <Field 
                                    label="Year Level" 
                                    value={form.course_year || ''} 
                                    onChange={(value) => updateForm('course_year', value)} 
                                />
                            </>
                        )}
                        <Field label="Number of Semesters Finished" type="number" value={form.num_semesters || 0} onChange={(value) => updateForm('num_semesters', parseInt(value) || 0)} />
                        
                        <div className="md:col-span-2 grid md:grid-cols-2 gap-6 pt-6 border-t border-surface-100">
                            <PlanDropdownField label="Plans to Pursue Studies" value={form.plans_to_pursue_studies || ''} onChange={(value) => updateForm('plans_to_pursue_studies', value)} />
                            <PlanDropdownField label="Plans to go Abroad" value={form.plans_to_go_abroad || ''} onChange={(value) => updateForm('plans_to_go_abroad', value)} />
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-10 flex justify-between items-center border-t border-surface-100 pt-8">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center gap-2 px-6 py-3 border border-surface-200 hover:border-surface-300 rounded-md text-surface-600 hover:text-surface-850 hover:bg-surface-50 font-bold transition-all text-xs uppercase tracking-widest"
                        >
                            <ArrowLeft size={14} />
                            Back
                        </button>
                        <button
                            onClick={onNext}
                            className="inline-flex items-center gap-2 rounded-md bg-[#ef3e36] hover:bg-[#d32f2f] px-8 py-3 text-xs font-black uppercase tracking-widest text-white transition-all shadow-md shadow-[#ef3e36]/10 hover:shadow-[#ef3e36]/20 active:scale-[0.98]"
                        >
                            Next: Work Experience
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
