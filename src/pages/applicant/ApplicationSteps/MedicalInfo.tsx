import React from 'react';
import { ArrowLeft, ArrowRight, Activity, AlertCircle } from 'lucide-react';

interface MedicalInfoProps {
    form: {
        has_medical_conditions?: boolean;
        medical_conditions?: string[];
        medical_history_notes?: string;
        drinks_alcohol?: boolean;
        smokes?: boolean;
        is_pregnant?: boolean;
    };
    updateForm: (field: string, value: any) => void;
    onBack: () => void;
    onNext: () => void;

}

const CONDITION_CHECKLIST = [
    'High Blood Pressure', 'Pneumonia', 'Migraine',
    'Chest Pain', 'Bronchitis', 'Urinary Tract Infection (UTI)',
    'Stroke', 'Tuberculosis', 'Diabetes Type',
    'Panic Attack', 'Asthma', 'Allergies'
];

export function MedicalInfo({ form, updateForm, onBack, onNext }: MedicalInfoProps) {
    const toggleCondition = (condition: string) => {
        const current = form.medical_conditions || [];
        if (current.includes(condition)) {
            updateForm('medical_conditions', current.filter(c => c !== condition));
        } else {
            updateForm('medical_conditions', [...current, condition]);
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
                        Step 5 of 6: Medical Info
                    </div>
                </div>
            </header>

            <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">


                {/* Form Card */}
                <div className="w-full bg-white rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />
                    
                    <div className="flex items-center gap-3 mb-6 border-b border-surface-100 pb-4">
                        <Activity className="text-[#ef3e36]" size={28} />
                        <h2 className="text-3xl font-black text-surface-900 tracking-tight uppercase">
                            Medical Information
                        </h2>
                    </div>

                    <div className="bg-[#ef3e36]/5 border-l-4 border-[#ef3e36] p-5 rounded-r-lg mb-8 text-left">
                        <div className="flex gap-3">
                            <AlertCircle className="text-[#ef3e36] shrink-0" size={20} />
                            <p className="text-xs text-surface-650 leading-relaxed font-bold">
                                Please answer the following questions and declare any medical history or conditions. This information is confidential and will only be used for occupational health assessment.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Medical Conditions Toggle */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-black text-surface-700 uppercase tracking-widest">Do you have any medical conditions?</h2>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => updateForm('has_medical_conditions', true)}
                                    className={`flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                        form.has_medical_conditions === true 
                                            ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md shadow-[#ef3e36]/20' 
                                            : 'bg-white border-surface-200 text-surface-400 hover:bg-surface-50'
                                    }`}
                                > YES </button>
                                <button
                                    type="button"
                                    onClick={() => updateForm('has_medical_conditions', false)}
                                    className={`flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                        form.has_medical_conditions === false 
                                            ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md shadow-[#ef3e36]/20' 
                                            : 'bg-white border-surface-200 text-surface-400 hover:bg-surface-50'
                                    }`}
                                > NO </button>
                            </div>
                        </div>

                        {/* Checklist */}
                        {/* Checklist */}
                        {form.has_medical_conditions && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {CONDITION_CHECKLIST.map(condition => (
                                        <button
                                            key={condition}
                                            type="button"
                                            onClick={() => toggleCondition(condition)}
                                            className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                                                form.medical_conditions?.includes(condition) 
                                                    ? 'bg-[#ef3e36]/5 border-[#ef3e36]/30 text-surface-900 shadow-sm font-bold' 
                                                    : 'bg-white border-surface-200 text-surface-500 hover:border-surface-300'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${
                                                form.medical_conditions?.includes(condition) 
                                                    ? 'bg-[#ef3e36] border-[#ef3e36]' 
                                                    : 'border-surface-300'
                                            }`}>
                                                {form.medical_conditions?.includes(condition) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-tight">{condition}</span>
                                        </button>
                                    ))}
                                    {/* Other button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = form.medical_conditions || [];
                                            const hasOther = current.some(c => !CONDITION_CHECKLIST.includes(c));
                                            if (hasOther) {
                                                // Remove any custom condition
                                                updateForm('medical_conditions', current.filter(c => CONDITION_CHECKLIST.includes(c)));
                                            } else {
                                                // Add a placeholder custom condition
                                                updateForm('medical_conditions', [...current, 'Custom Condition']);
                                            }
                                        }}
                                        className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                                            (form.medical_conditions || []).some(c => !CONDITION_CHECKLIST.includes(c)) 
                                                ? 'bg-[#ef3e36]/5 border-[#ef3e36]/30 text-surface-900 shadow-sm font-bold' 
                                                : 'bg-white border-surface-200 text-surface-500 hover:border-surface-300'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${
                                            (form.medical_conditions || []).some(c => !CONDITION_CHECKLIST.includes(c)) 
                                                ? 'bg-[#ef3e36] border-[#ef3e36]' 
                                                : 'border-surface-300'
                                        }`}>
                                            {(form.medical_conditions || []).some(c => !CONDITION_CHECKLIST.includes(c)) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-tight">Other</span>
                                    </button>
                                </div>

                                {/* Custom condition text input */}
                                {(form.medical_conditions || []).some(c => !CONDITION_CHECKLIST.includes(c)) && (
                                    <div className="pt-2 animate-fade-in">
                                        <label className="block space-y-1.5 text-left">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">Please specify your medical condition</span>
                                            <input 
                                                type="text"
                                                value={(form.medical_conditions || []).find(c => !CONDITION_CHECKLIST.includes(c)) === 'Custom Condition' ? '' : ((form.medical_conditions || []).find(c => !CONDITION_CHECKLIST.includes(c)) || '')}
                                                onChange={(e) => {
                                                    const typed = e.target.value;
                                                    const current = form.medical_conditions || [];
                                                    const filtered = current.filter(c => CONDITION_CHECKLIST.includes(c));
                                                    if (typed.trim()) {
                                                        updateForm('medical_conditions', [...filtered, typed]);
                                                    } else {
                                                        updateForm('medical_conditions', [...filtered, 'Custom Condition']);
                                                    }
                                                }}
                                                placeholder="Type here..."
                                                className="w-full rounded-md border border-surface-200 px-4 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white text-surface-900 shadow-sm"
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Habits */}
                        <div className="pt-8 border-t border-surface-100 grid md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Alcohol Intake</span>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => updateForm('drinks_alcohol', true)} 
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                            form.drinks_alcohol === true 
                                                ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md' 
                                                : 'bg-white border-surface-200 text-surface-400 hover:bg-surface-50'
                                        }`}
                                    >YES</button>
                                    <button 
                                        type="button" 
                                        onClick={() => updateForm('drinks_alcohol', false)} 
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                            form.drinks_alcohol === false 
                                                ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md' 
                                                : 'bg-white border-surface-200 text-surface-400 hover:bg-surface-50'
                                        }`}
                                    >NO</button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Smoker</span>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => updateForm('smokes', true)} 
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                            form.smokes === true 
                                                ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md' 
                                                : 'bg-white border-surface-200 text-surface-400 hover:bg-surface-50'
                                        }`}
                                    >YES</button>
                                    <button 
                                        type="button" 
                                        onClick={() => updateForm('smokes', false)} 
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                            form.smokes === false 
                                                ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md' 
                                                : 'bg-white border-surface-200 text-surface-400 hover:bg-surface-50'
                                        }`}
                                    >NO</button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Pregnant</span>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => updateForm('is_pregnant', true)} 
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                            form.is_pregnant === true 
                                                ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md' 
                                                : 'bg-white border-surface-200 text-surface-400 hover:bg-surface-50'
                                        }`}
                                    >YES</button>
                                    <button 
                                        type="button" 
                                        onClick={() => updateForm('is_pregnant', false)} 
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-md border transition-all ${
                                            form.is_pregnant === false 
                                                ? 'bg-[#ef3e36] border-[#ef3e36] text-white shadow-md' 
                                                : 'bg-white border-surface-200 text-surface-400 hover:bg-surface-50'
                                        }`}
                                    >NO</button>
                                </div>
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
                            Next: Signature
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
