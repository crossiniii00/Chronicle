import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface FamilyBackgroundProps {
    form: {
        spouse_name: string;
        spouse_occupation: string;
        father_name: string;
        father_occupation: string;
        mother_name: string;
        mother_occupation: string;
        num_children: number;
        num_siblings: number;
        emergency_contact_name: string;
        emergency_contact_phone: string;
        emergency_contact_relationship: string;
    };
    updateForm: (field: string, value: string | number) => void;
    onBack: () => void;
    onNext: () => void;

}

function Field({ label, value, onChange, type = 'text' }: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
}) {
    const className = 'w-full rounded-md border border-surface-200 px-4 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white dark:bg-slate-900 text-surface-900 shadow-sm';
    return (
        <label className="block space-y-1.5 text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={className}
            />
        </label>
    );
}

export function FamilyBackground({ form, updateForm, onBack, onNext }: FamilyBackgroundProps) {
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
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl shadow-lg flex items-center justify-center overflow-hidden border border-white/20">
                        <img src="/contactpoint-logo.png?v=2" alt="ContactPoint 360" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="flex flex-col text-left">
                        <h1 className="text-white font-black text-[15px] tracking-[0.15em] uppercase leading-none">ContactPoint<span className="text-[#ef3e36]">360</span></h1>
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
                    <div className="h-4 w-[1px] bg-white/20 dark:bg-slate-900/20" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] bg-[#ef3e36]/10 px-3.5 py-2 border border-[#ef3e36]/20 rounded-full">
                        Step 2 of 6: Family
                    </div>
                </div>
            </header>

            <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">


                {/* Form Card */}
                <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />

                    <h2 className="mb-8 text-3xl font-black text-surface-900 tracking-tight uppercase border-b border-surface-100 pb-4">
                        Family Background
                    </h2>

                    <div className="grid gap-8">
                        {/* Household Counts */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <Field label="No. of Children" type="number" value={form.num_children || 0} onChange={(val) => updateForm('num_children', parseInt(val) || 0)} />
                            <Field label="No. of Siblings" type="number" value={form.num_siblings || 0} onChange={(val) => updateForm('num_siblings', parseInt(val) || 0)} />
                        </div>

                        {/* Spouse/Partner */}
                        <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-surface-100">
                            <Field label="Name of Spouse / Partner" value={form.spouse_name || ''} onChange={(val) => updateForm('spouse_name', val)} />
                            <Field label="Occupation" value={form.spouse_occupation || ''} onChange={(val) => updateForm('spouse_occupation', val)} />
                        </div>

                        {/* Father */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <Field label="Father's Name" value={form.father_name || ''} onChange={(val) => updateForm('father_name', val)} />
                            <Field label="Occupation" value={form.father_occupation || ''} onChange={(val) => updateForm('father_occupation', val)} />
                        </div>

                        {/* Mother */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <Field label="Mother's Name" value={form.mother_name || ''} onChange={(val) => updateForm('mother_name', val)} />
                            <Field label="Occupation" value={form.mother_occupation || ''} onChange={(val) => updateForm('mother_occupation', val)} />
                        </div>

                        {/* Emergency Contact */}
                        <div className="pt-8 border-t border-surface-100">
                            <h2 className="text-sm font-black text-surface-900 uppercase tracking-widest mb-6">Emergency Contact Details</h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                <Field label="Contact Person" value={form.emergency_contact_name || ''} onChange={(val) => updateForm('emergency_contact_name', val)} />
                                <Field label="Relationship" value={form.emergency_contact_relationship || ''} onChange={(val) => updateForm('emergency_contact_relationship', val)} />
                                <Field label="Contact Number" value={form.emergency_contact_phone || ''} onChange={(val) => updateForm('emergency_contact_phone', val)} />
                            </div>
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
                            Next: Education
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
