import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { SignaturePad } from '@/components/common/SignaturePad';

interface SignatureStepProps {
    form: {
        full_name: string;
        signature_data_url?: string;
        form_submitted_at?: string;
    };
    updateForm: (field: string, value: any) => void;
    onBack: () => void;
    onNext: () => void;

}

export function SignatureStep({ form, updateForm, onBack, onNext }: SignatureStepProps) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSignatureSave = (dataUrl: string) => {
        updateForm('signature_data_url', dataUrl);
        updateForm('form_submitted_at', new Date().toISOString());
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
                        Step 6 of 6: Sign Form
                    </div>
                </div>
            </header>

            <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">


                {/* Form Card */}
                <div className="w-full bg-white rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />
                    
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-surface-900 pointer-events-none">
                        <ShieldCheck size={120} />
                    </div>

                    <h2 className="mb-8 text-3xl font-black text-surface-900 tracking-tight uppercase border-b border-surface-100 pb-4">
                        Legal Declaration
                    </h2>

                    <div className="space-y-8">
                        {/* Legal Declaration Text */}
                        <div className="space-y-4 text-sm text-surface-650 leading-relaxed italic border-b border-surface-100 pb-8">
                            <p>
                                By affixing your name and signature below, you hereby declare that all information provided on this form is true and correct and was written voluntarily to the best of your knowledge.
                            </p>
                            <p>
                                Additionally, you have agreed and given your consent to ContactPoint 360 Philippines Inc., including its authorized personnel, to conduct verification in relation to your application for employment. Furthermore, you understand that any misrepresentation or false information will be taken against your application and may result in disqualification.
                            </p>
                        </div>

                        {/* Verification Consent Banner */}
                        <div className="p-6 border border-[#ef3e36]/20 bg-[#ef3e36]/5 rounded-lg">
                            <div className="flex items-center gap-3 mb-3 text-[#ef3e36]">
                                <ShieldCheck size={18} />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Verification Consent & Data Privacy</span>
                            </div>
                            <p className="text-xs text-surface-650 font-medium italic leading-relaxed">
                                In accordance with the Data Privacy Act of 2012, this application form may contain personal and sensitive information. These data are handled in compliance with Data Protection Policy. I hereby authorize the company to verify any information provided.
                            </p>
                        </div>

                        {/* Signature Area - Now Full Width and Dedicated */}
                        <div className="pt-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-surface-900 uppercase tracking-[0.25em] italic">Digital Signature</span>
                                    <span className="text-[10px] text-surface-500 font-medium italic mt-0.5">Please sign clearly within the box below</span>
                                </div>
                                {form.signature_data_url && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                                        <ShieldCheck size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Verified Digitally</span>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                {form.signature_data_url ? (
                                    <div className="space-y-6">
                                        <div className="bg-surface-50 border-2 border-surface-200 rounded-xl p-8 flex items-center justify-center h-80 relative group shadow-inner">
                                            <img src={form.signature_data_url} alt="Signature" className="max-h-full drop-shadow-md" />
                                            <button 
                                                onClick={() => updateForm('signature_data_url', undefined)}
                                                className="absolute inset-0 bg-surface-900/60 text-white opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] rounded-xl"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                                    <ArrowLeft size={20} />
                                                </div>
                                                <span className="font-black text-sm uppercase tracking-[0.2em]">Clear & Re-sign</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-surface-200 rounded-xl overflow-hidden shadow-sm hover:border-[#ef3e36]/30 transition-colors bg-white">
                                        <SignaturePad onSave={handleSignatureSave} height="h-80" />
                                    </div>
                                )}

                                {/* Printed Name Area - Integrated below signature */}
                                <div className="mt-8 flex flex-col items-center justify-center pb-6">
                                    <div className="w-64 h-[2px] bg-surface-900 mb-4 opacity-80" />
                                    <p className="text-xl font-bold text-surface-900 text-center italic tracking-tight">
                                        {form.full_name}
                                    </p>
                                    <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.3em] text-center mt-3 italic">Signature Over Printed Name</p>
                                    
                                    <div className="mt-6 flex items-center gap-4 text-surface-450">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 rounded-md border border-surface-150">
                                            <Clock size={12} />
                                            <span className="text-[10px] font-bold tracking-wider">
                                                {now.toLocaleDateString()} {now.toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-12 flex justify-between items-center border-t border-surface-100 pt-8">
                        <button 
                            onClick={onBack} 
                            className="inline-flex items-center gap-2 px-6 py-3 border border-surface-200 hover:border-surface-300 rounded-md text-surface-600 hover:text-surface-850 hover:bg-surface-50 font-bold transition-all text-xs uppercase tracking-widest"
                        >
                            <ArrowLeft size={14} />
                            Back
                        </button>
                        <button 
                            onClick={onNext} 
                            disabled={!form.signature_data_url}
                            className="inline-flex items-center gap-2 rounded-md bg-[#ef3e36] hover:bg-[#d32f2f] px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all shadow-md shadow-[#ef3e36]/10 hover:shadow-[#ef3e36]/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Finalize Application
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
