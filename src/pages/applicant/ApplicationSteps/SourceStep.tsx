import React, { useState, useRef, useEffect } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronDown,
    Users,
    Briefcase,
    Linkedin,
    Facebook,
    Instagram,
    Music,
    Search,
    Globe,
    Calendar,
    Megaphone,
    MoreHorizontal
} from 'lucide-react';

interface SourceStepProps {
    form: {
        hiring_source?: string;
    };
    updateForm: (field: string, value: any) => void;
    onBack: () => void;
    onNext: () => void;
}

const SOURCES_WITH_ICONS = [
    { id: 'Employee referral', label: 'Employee Referral', icon: Users },
    { id: 'jobstreet', label: 'JobStreet', icon: Briefcase },
    { id: 'Linkedin', label: 'LinkedIn', icon: Linkedin },
    { id: 'Facebook', label: 'Facebook', icon: Facebook },
    { id: 'Instagram', label: 'Instagram', icon: Instagram },
    { id: 'Tiktok', label: 'TikTok', icon: Music },
    { id: 'Indeed', label: 'Indeed', icon: Search },
    { id: 'Career Site', label: 'Career Site', icon: Globe },
    { id: 'Recruitment Events', label: 'Recruitment Events', icon: Calendar },
    { id: 'Recruitment Banners/ Billboards', label: 'Recruitment Banners/Billboards', icon: Megaphone },
    { id: 'Others', label: 'Others', icon: MoreHorizontal }
];

export function SourceStep({ form, updateForm, onBack, onNext }: SourceStepProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isStandardSource = (src: string) => {
        return SOURCES_WITH_ICONS.some(s => s.id === src && s.id !== 'Others');
    };

    const getSelectedOption = () => {
        const value = form.hiring_source;
        if (!value) return null;
        if (isStandardSource(value)) {
            return SOURCES_WITH_ICONS.find(s => s.id === value) || null;
        }
        return SOURCES_WITH_ICONS.find(s => s.id === 'Others') || null;
    };

    const selectedOption = getSelectedOption();
    const isOthersSelected = selectedOption?.id === 'Others';
    const customSourceValue = isOthersSelected && form.hiring_source !== 'Others' ? form.hiring_source : '';

    const handleSelect = (optionId: string) => {
        if (optionId === 'Others') {
            updateForm('hiring_source', 'Others');
        } else {
            updateForm('hiring_source', optionId);
        }
        setIsOpen(false);
    };

    const handleCustomValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateForm('hiring_source', e.target.value);
    };

    const SelectedIcon = selectedOption ? selectedOption.icon : null;

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
                        Hiring Source
                    </div>
                </div>
            </header>

            <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
                {/* Form Card */}
                <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-visible text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />

                    <h2 className="mb-6 text-3xl font-black text-surface-900 tracking-tight uppercase border-b border-surface-100 pb-4">
                        Application Source
                    </h2>

                    <div className="space-y-6">
                        <div className="flex flex-col relative" ref={dropdownRef}>
                            <label className="text-sm font-bold uppercase tracking-widest text-surface-500 mb-2">
                                Where have you heard from us?
                            </label>

                            {/* Custom Dropdown Trigger Button */}
                            <button
                                type="button"
                                onClick={() => setIsOpen(!isOpen)}
                                className="w-full rounded-md border-2 border-surface-200 px-4 py-4 bg-white dark:bg-slate-900 text-left flex items-center justify-between hover:border-surface-300 transition-colors focus:outline-none focus:border-[#ef3e36]"
                            >
                                <div className="flex items-center gap-3">
                                    {SelectedIcon ? (
                                        <SelectedIcon size={20} className="text-[#ef3e36]" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border border-dashed border-surface-300" />
                                    )}
                                    <span className="text-base font-semibold text-surface-800">
                                        {selectedOption ? selectedOption.label : '-- Select Source --'}
                                    </span>
                                </div>
                                <ChevronDown size={20} className={`text-surface-500 transition-transform ${isOpen ? 'rotate-185' : ''}`} />
                            </button>

                            {/* Dropdown Menu Portal/Overlay */}
                            {isOpen && (
                                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 overflow-y-auto rounded-lg border border-surface-200 bg-white dark:bg-slate-900 py-1.5 shadow-xl custom-scrollbar animate-fade-in">
                                    {SOURCES_WITH_ICONS.map((opt) => {
                                        const OptIcon = opt.icon;
                                        const isSelected = selectedOption?.id === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => handleSelect(opt.id)}
                                                className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${isSelected
                                                        ? 'bg-[#ef3e36]/5 text-[#ef3e36]'
                                                        : 'text-surface-700 hover:bg-surface-50 hover:text-surface-900'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <OptIcon size={18} className={isSelected ? 'text-[#ef3e36]' : 'text-surface-400'} />
                                                    <span className="text-sm font-semibold">{opt.label}</span>
                                                </div>
                                                {isSelected && <Check size={16} className="text-[#ef3e36]" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Others specification field (Type-down specification) */}
                        {isOthersSelected && (
                            <div className="animate-fade-in flex flex-col mt-4">
                                <label htmlFor="custom_source" className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36]">
                                    Please specify source *
                                </label>
                                <input
                                    id="custom_source"
                                    type="text"
                                    required
                                    value={customSourceValue}
                                    onChange={handleCustomValueChange}
                                    placeholder="Type other source here..."
                                    className="w-full mt-1.5 rounded-md border-2 border-surface-200 px-4 py-3.5 text-base bg-white dark:bg-slate-900 focus:outline-none focus:border-[#ef3e36] text-surface-900 font-medium shadow-sm transition-all"
                                />
                            </div>
                        )}
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
                            disabled={!form.hiring_source || form.hiring_source === 'Others'}
                            className="inline-flex items-center gap-2 rounded-md bg-[#ef3e36] hover:bg-[#d32f2f] px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all shadow-md shadow-[#ef3e36]/10 hover:shadow-[#ef3e36]/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            NEXT: SIGNATURE
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

