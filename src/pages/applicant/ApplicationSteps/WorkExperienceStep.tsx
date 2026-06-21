import React from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import type { WorkExperience } from '@/types';

interface WorkExperienceStepProps {
    workExperience: WorkExperience[];
    setWorkExperience: (exp: WorkExperience[]) => void;
    onBack: () => void;
    onNext: () => void;

}

function Field({ label, value, onChange, placeholder, type = 'text', textarea = false }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    textarea?: boolean;
}) {
    const className = 'w-full rounded-md border border-surface-200 px-4 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white text-surface-900 shadow-sm';
    return (
        <label className="block space-y-1.5 text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">{label}</span>
            {textarea
                ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} min-h-24`} />
                : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />
            }
        </label>
    );
}

const EMPTY_EXPERIENCE: WorkExperience = {
    company: '',
    position: '',
    duration_from: '',
    duration_to: '',
    description: '',
};

export function WorkExperienceStep({ workExperience, setWorkExperience, onBack, onNext }: WorkExperienceStepProps) {
    const updateExperience = (index: number, field: string, value: string) => {
        setWorkExperience(workExperience.map((exp, i) =>
            i === index ? { ...exp, [field]: value } : exp
        ));
    };

    const addExperience = () => {
        setWorkExperience([...workExperience, { ...EMPTY_EXPERIENCE }]);
    };

    const removeExperience = (index: number) => {
        if (workExperience.length > 1) {
            setWorkExperience(workExperience.filter((_, i) => i !== index));
        }
    };

    const hasNoExperience = workExperience.length === 0;

    const handleCheckboxChange = (checked: boolean) => {
        if (checked) {
            setWorkExperience([]);
        } else {
            setWorkExperience([{ ...EMPTY_EXPERIENCE }]);
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
                        Step 4 of 6: Work Exp
                    </div>
                </div>
            </header>

            <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">


                {/* Form Card */}
                <div className="w-full bg-white rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />
                    
                    <h2 className="mb-8 text-3xl font-black text-surface-900 tracking-tight uppercase border-b border-surface-100 pb-4">
                        Employment History
                    </h2>

                    {/* No Experience Checkbox */}
                    <div className="mb-8 flex items-center gap-3 p-4 bg-surface-50 border border-surface-200 rounded-lg hover:border-surface-300 transition-all select-none">
                        <input
                            type="checkbox"
                            id="no-experience"
                            checked={hasNoExperience}
                            onChange={(e) => handleCheckboxChange(e.target.checked)}
                            className="w-4 h-4 text-[#ef3e36] focus:ring-[#ef3e36] border-surface-300 rounded cursor-pointer"
                        />
                        <label htmlFor="no-experience" className="text-sm font-bold text-surface-700 cursor-pointer flex-1">
                            I do not have any professional work experience (Fresh Graduate / Entry Level)
                        </label>
                    </div>
                    
                    <div className="space-y-8">
                        {hasNoExperience ? (
                            <div className="py-12 text-center bg-surface-50 border border-dashed border-surface-200 rounded-lg p-6 flex flex-col items-center justify-center">
                                <p className="text-sm text-surface-500 font-bold uppercase tracking-wider">No Professional Experience Indicated</p>
                                <p className="text-xs text-surface-400 mt-1 font-medium">Click "Next" at the bottom of the page to proceed to Medical Info.</p>
                            </div>
                        ) : (
                            <>
                                {workExperience.map((item, index) => (
                                    <div key={index} className="relative border border-surface-200 rounded-lg p-6 bg-surface-50 hover:bg-white hover:border-[#ef3e36]/30 transition-all shadow-sm">
                                        <div className="absolute top-4 right-4">
                                            <button 
                                                onClick={() => removeExperience(index)}
                                                className="p-2 text-surface-450 hover:text-red-600 transition-all"
                                                title="Remove Entry"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <Field label="Employer / Company" value={item.company} onChange={(value) => updateExperience(index, 'company', value)} />
                                            <Field label="Position" value={item.position} onChange={(value) => updateExperience(index, 'position', value)} />
                                            <Field label="Inclusive Dates (From)" value={item.duration_from} onChange={(value) => updateExperience(index, 'duration_from', value)} placeholder="e.g. Jan 2020" />
                                            <Field label="Inclusive Dates (To)" value={item.duration_to} onChange={(value) => updateExperience(index, 'duration_to', value)} placeholder="e.g. Dec 2022" />
                                        </div>
                                        <div className="mt-6">
                                            <Field label="Reason for Leaving" value={item.description} onChange={(value) => updateExperience(index, 'description', value)} textarea />
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addExperience}
                                    className="w-full py-4 border-2 border-dashed border-surface-200 hover:border-[#ef3e36]/30 rounded-lg text-surface-400 hover:text-[#ef3e36] bg-surface-50/50 hover:bg-surface-50 transition-all flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs"
                                >
                                    <Plus size={18} /> Add Another Employer
                                </button>
                            </>
                        )}
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
                            Next: Medical Info
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
