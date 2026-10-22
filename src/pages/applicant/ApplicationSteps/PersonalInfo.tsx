import React from 'react';
import { ArrowLeft, ArrowRight, Camera, RefreshCw, X, AlertCircle, UploadCloud, File as FileIcon } from 'lucide-react';
import { GENDER_OPTIONS, CIVIL_STATUS_OPTIONS, capitalizeName } from '@/utils/formatters';
import type { Position } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface PersonalInfoProps {
    form: {
        full_name: string;
        first_name?: string;
        last_name?: string;
        email: string;
        phone: string;
        birth_date: string;
        sex: string;
        civil_status: string;
        nationality: string;
        current_address: string;
        permanent_address: string;
        nick_name?: string;
        place_of_birth?: string;
        preferred_nickname?: string;
        sss_no?: string;
        tin_no?: string;
        pagibig_no?: string;
        philhealth_no?: string;
        flexible_schedule?: boolean;
        travel_method?: string;
        religion?: string;
    };
    updateForm: (field: string, value: string | boolean) => void;
    onBack: () => void;
    onNext: () => void;
    selectedPosition: Position | null;
    resumeFile: File | null;
    setResumeFile: (file: File | null) => void;
    photoDataUrl: string | null;
    setPhotoDataUrl: (dataUrl: string | null) => void;
    onDemoFill?: () => void;
    demoMode?: boolean;
}

function renderLabel(label: string) {
    if (!label) return null;
    if (label.includes('*')) {
        const parts = label.split('*');
        return (
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-900 inline-flex items-center gap-0.5">
                {parts[0]}
                <span className="text-red-500 font-black text-[13px] leading-none animate-pulse ml-0.5" title="Mandatory field">*</span>
                {parts.slice(1).join('*')}
            </span>
        );
    }
    return <span className="text-[10px] font-black uppercase tracking-widest text-surface-900">{label}</span>;
}

function Field({ label, value, onChange, type = 'text', textarea = false, placeholder = '' }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    textarea?: boolean;
    placeholder?: string;
}) {
    const className = 'w-full rounded-md border border-surface-200 px-4 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white dark:bg-slate-900 text-surface-900 shadow-sm';
    return (
        <label className="block space-y-1.5 text-left">
            {renderLabel(label)}
            {textarea
                ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} min-h-24`} />
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
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

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
        onChange(opt);
    };

    return (
        <div ref={containerRef} className="block space-y-1.5 text-left relative">
            {renderLabel(label)}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full rounded-md border border-surface-200 px-4 py-3 text-sm text-left focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white dark:bg-slate-900 text-surface-900 shadow-sm flex justify-between items-center select-none"
                >
                    <span className={value ? "text-surface-900 font-medium" : "text-surface-400"}>
                        {value || 'Choose option'}
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
                            className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-surface-200 rounded-md shadow-lg overflow-hidden z-50 py-1 max-h-60 overflow-y-auto"
                        >
                            {options.map((opt) => (
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
        </div>
    );
}

function GovIdField({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const isTypedValue = value !== '' && value !== 'No' && value !== 'Yes / To be followed';
    const [isEnteringId, setIsEnteringId] = React.useState(isTypedValue);

    React.useEffect(() => {
        if (isTypedValue) {
            setIsEnteringId(true);
        } else if (value === '' || value === 'No' || value === 'Yes / To be followed') {
            setIsEnteringId(false);
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
            setIsEnteringId(true);
            onChange('');
        } else {
            setIsEnteringId(false);
            onChange(opt);
        }
    };

    const handleClear = () => {
        setIsEnteringId(false);
        onChange('');
    };

    const displayValue = value === '' ? '' : value;

    return (
        <div ref={containerRef} className="block space-y-1.5 text-left relative">
            {renderLabel(label)}

            {isEnteringId ? (
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={value === 'Yes' ? '' : value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-md border border-surface-200 pl-4 pr-10 py-3 text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white dark:bg-slate-900 text-surface-900 shadow-sm"
                        placeholder={`Enter ${label.replace(' *', '')}...`}
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
                        className="w-full rounded-md border border-surface-200 px-4 py-3 text-sm text-left focus:border-brand-red focus:ring-1 focus:ring-brand-red focus:outline-none transition-all bg-white dark:bg-slate-900 text-surface-900 shadow-sm flex justify-between items-center select-none"
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
                                className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-surface-200 rounded-md shadow-lg overflow-hidden z-50 py-1"
                            >
                                {['Yes', 'No', 'Yes / To be followed'].map((opt) => (
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

function CameraCapture({ photo, onCapture, onClear }: {
    photo: string | null;
    onCapture: (dataUrl: string) => void;
    onClear: () => void;
}) {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = React.useState<MediaStream | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(null);
    const [opening, setOpening] = React.useState(false);

    React.useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        navigator.mediaDevices.enumerateDevices()
            .then(devs => setDevices(devs.filter(d => d.kind === 'videoinput')))
            .catch(() => { });
        return () => {
            // cleanup handled by stopCamera via stream state
        };
    }, []);

    const stopCamera = React.useCallback(() => {
        setStream(prev => {
            if (prev) {
                prev.getTracks().forEach(track => track.stop());
            }
            return null;
        });
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    React.useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    React.useEffect(() => {
        if (!stream || !videoRef.current) return;
        const video = videoRef.current;
        if (video.srcObject !== stream) {
            video.srcObject = stream;
        }
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => { /* autoplay blocked — user gesture will retry */ });
        }
    }, [stream]);

    const startCamera = async () => {
        setError(null);
        setOpening(true);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported by your browser or requires a secure connection (HTTPS).');
            }
            const constraints: MediaStreamConstraints = selectedDeviceId
                ? { video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } } }
                : { video: { width: { ideal: 640 }, height: { ideal: 480 } } };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                const playPromise = videoRef.current.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => { /* autoplay blocked — user gesture will retry */ });
                }
            }
        } catch (err: any) {
            setError(err?.message || 'Could not access camera. Please allow camera permission.');
        } finally {
            setOpening(false);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const maxW = 480;
        const scale = Math.min(1, maxW / (video.videoWidth || 1));
        canvas.width = Math.round((video.videoWidth || 640) * scale);
        canvas.height = Math.round((video.videoHeight || 480) * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        onCapture(dataUrl);
        stopCamera();
    };

    const handleRetake = async () => {
        onClear();
        await startCamera();
    };

    return (
        <div className="space-y-3">
            <canvas ref={canvasRef} className="hidden" />

            {photo ? (
                <div className="flex items-center gap-4 p-4 border-2 border-emerald-200 bg-emerald-50/50 rounded-lg">
                    <div className="w-28 h-28 rounded-lg overflow-hidden border-2 border-emerald-200 bg-emerald-50 shrink-0">
                        <img src={photo} alt="Candidate" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-800">Photo captured</p>
                        <p className="text-xs text-emerald-700/80 mt-1">JPEG, ready to submit with your application</p>
                        <div className="flex flex-wrap gap-3 mt-3">
                            <button
                                type="button"
                                onClick={handleRetake}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ef3e36] hover:text-[#d32f2f] uppercase tracking-widest"
                            >
                                <RefreshCw size={12} /> Retake Photo
                            </button>
                        </div>
                    </div>
                </div>
            ) : stream ? (
                <div className="space-y-3">
                    <div className="relative w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden aspect-[4/3] ring-2 ring-[#ef3e36]/30">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                            <button
                                type="button"
                                onClick={capturePhoto}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white dark:bg-slate-900 text-surface-900 font-black uppercase tracking-widest text-xs rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
                            >
                                <Camera size={14} /> Capture
                            </button>
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-surface-900/80 backdrop-blur text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-surface-900"
                            >
                                <X size={12} /> Cancel
                            </button>
                        </div>
                    </div>
                    {devices.length > 1 && (
                        <div className="max-w-md mx-auto">
                            <select
                                value={selectedDeviceId || ''}
                                onChange={(e) => {
                                    setSelectedDeviceId(e.target.value || null);
                                    stopCamera();
                                    setTimeout(() => startCamera(), 100);
                                }}
                                className="w-full text-xs px-3 py-2 border border-surface-200 rounded-md bg-white dark:bg-slate-900 text-surface-700 focus:border-[#ef3e36] focus:outline-none"
                            >
                                <option value="">Default camera</option>
                                {devices.map((d, i) => (
                                    <option key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Camera ${i + 1}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-surface-200 rounded-lg bg-surface-50">
                    <div className="w-14 h-14 rounded-full bg-[#ef3e36]/10 text-[#ef3e36] flex items-center justify-center mb-3">
                        <Camera size={26} />
                    </div>
                    <p className="text-sm font-bold text-surface-900 mb-1">Take your candidate picture</p>
                    <p className="text-xs text-surface-500 mb-4">Use your webcam to take a photo</p>
                    {error && (
                        <div className="mb-3 max-w-sm flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2.5">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <p className="text-left">{error}</p>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={startCamera}
                            disabled={opening}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ef3e36] hover:bg-[#d32f2f] text-white font-black uppercase tracking-widest text-xs rounded-md transition-all shadow-md shadow-[#ef3e36]/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Camera size={14} />
                            {opening ? 'Starting…' : 'Open Camera'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function PersonalInfo({
    form,
    updateForm,
    onBack,
    onNext,
    selectedPosition,
    resumeFile,
    setResumeFile,
    photoDataUrl,
    setPhotoDataUrl,
    onDemoFill,
    demoMode
}: PersonalInfoProps) {

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
                        <span className="hidden sm:inline">Back to Listings</span>
                    </button>
                    <div className="h-4 w-[1px] bg-white/20 dark:bg-slate-900/20" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] bg-[#ef3e36]/10 px-3.5 py-2 border border-[#ef3e36]/20 rounded-full">
                        Step 1 of 6: Personal Info
                    </div>
                </div>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-4xl relative z-10 flex flex-col items-center"
            >

                {/* Position Banner */}
                <div className="w-full mb-6 bg-white/5 dark:bg-slate-900/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                    <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] mb-1">Position Applied For</div>
                        <div className="text-2xl font-black text-white tracking-tight leading-none mb-1.5">
                            {selectedPosition?.title || 'No position selected'}
                        </div>
                        <div className="text-xs text-white/50 font-bold uppercase tracking-wider">
                            {selectedPosition?.department || 'General Operations'}
                        </div>
                    </div>

                </div>

                {/* Form Content Card */}
                <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />

                    <div className="mb-8 border-b border-surface-100 pb-4 flex justify-between items-center">
                        <h2 className="text-3xl font-black text-surface-900 tracking-tight uppercase">
                            Personal Details
                        </h2>
                        {demoMode && onDemoFill && (
                            <button
                                type="button"
                                onClick={onDemoFill}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
                            >
                                Demo Fill
                            </button>
                        )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                            <Field label="First Name *" placeholder="Include second names (if any)" value={form.first_name || ''} onChange={(value) => updateForm('first_name', capitalizeName(value))} />
                            <Field label="Middle Name *" placeholder="Mother's maiden surname" value={form.nick_name || ''} onChange={(value) => updateForm('nick_name', capitalizeName(value))} />
                            <Field label="Last Name *" placeholder="Enter last name" value={form.last_name || ''} onChange={(value) => updateForm('last_name', capitalizeName(value))} />
                            <Field label="Preferred Nickname *" placeholder="e.g. John" value={form.preferred_nickname || ''} onChange={(value) => updateForm('preferred_nickname', capitalizeName(value))} />
                        </div>
                        <Field label="Email *" type="email" value={form.email} onChange={(value) => updateForm('email', value)} />
                        <Field label="Phone *" value={form.phone || ''} onChange={(value) => updateForm('phone', value)} />
                        <Field label="Birth Date *" type="date" value={form.birth_date || ''} onChange={(value) => updateForm('birth_date', value)} />
                        <Field label="Place of Birth" value={form.place_of_birth || ''} onChange={(value) => updateForm('place_of_birth', value)} />
                        <SelectField label="Sex *" value={form.sex || ''} onChange={(value) => updateForm('sex', value)} options={GENDER_OPTIONS} />
                        <SelectField label="Civil Status *" value={form.civil_status || ''} onChange={(value) => updateForm('civil_status', value)} options={CIVIL_STATUS_OPTIONS} />
                        <Field label="Nationality *" value={form.nationality || ''} onChange={(value) => updateForm('nationality', value)} />
                        <Field label="Religion" value={form.religion || ''} onChange={(value) => updateForm('religion', value)} />
                        <Field label="Current Address *" value={form.current_address || ''} onChange={(value) => updateForm('current_address', value)} />
                        <div className="md:col-span-2">
                            <Field label="Permanent Address" value={form.permanent_address || ''} onChange={(value) => updateForm('permanent_address', value)} />
                        </div>

                        <div className="md:col-span-2 grid md:grid-cols-2 gap-6 pt-6 border-t border-surface-100">
                            <GovIdField label="SSS No. *" value={form.sss_no || ''} onChange={(value) => updateForm('sss_no', value)} />
                            <GovIdField label="BIR TIN No. *" value={form.tin_no || ''} onChange={(value) => updateForm('tin_no', value)} />
                            <GovIdField label="PAG-IBIG No. *" value={form.pagibig_no || ''} onChange={(value) => updateForm('pagibig_no', value)} />
                            <GovIdField label="Philhealth No. *" value={form.philhealth_no || ''} onChange={(value) => updateForm('philhealth_no', value)} />
                        </div>

                        <div className="md:col-span-2 pt-6 border-t border-surface-100 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <span className="text-xs font-bold uppercase tracking-widest text-surface-500">Are you okay working with a flexible schedule?</span>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => updateForm('flexible_schedule', true)}
                                        className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-md transition-all ${form.flexible_schedule === true
                                                ? 'bg-[#ef3e36] text-white shadow-md shadow-[#ef3e36]/20'
                                                : 'bg-surface-100 text-surface-400 hover:bg-surface-200 hover:text-surface-700'
                                            }`}
                                    >
                                        YES
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateForm('flexible_schedule', false)}
                                        className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-md transition-all ${form.flexible_schedule === false
                                                ? 'bg-[#ef3e36] text-white shadow-md shadow-[#ef3e36]/20'
                                                : 'bg-surface-100 text-surface-400 hover:bg-surface-200 hover:text-surface-700'
                                            }`}
                                    >
                                        NO
                                    </button>
                                </div>
                            </div>
                            <Field label="How do you travel from your house to IT Park?" value={form.travel_method || ''} onChange={(value) => updateForm('travel_method', value)} />
                        </div>

                        {/* 
                        <div className="md:col-span-2 pt-6 border-t border-surface-100 space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">Candidate Picture (Optional)</span>
                            <CameraCapture 
                                photo={photoDataUrl} 
                                onCapture={(dataUrl) => setPhotoDataUrl(dataUrl)} 
                                onClear={() => setPhotoDataUrl(null)} 
                            />
                        </div>
                        */}



                        <div id="resume_section" className="md:col-span-2 pt-8 border-t border-surface-100 space-y-3">
                            <h4 className="text-sm font-black uppercase tracking-widest text-surface-900 flex items-center gap-2">
                                Resume / CV <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">MANDATORY</span>
                            </h4>
                            <div className="flex items-center gap-4 mt-2">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface-50 border border-surface-200 hover:border-surface-300 rounded-md text-surface-700 hover:text-surface-900 transition-colors text-xs font-semibold shadow-sm">
                                    <UploadCloud size={16} className="text-surface-400" />
                                    <span>{resumeFile ? 'Change Resume' : 'Upload Resume'}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setResumeFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </label>
                                {resumeFile && (
                                    <div className="flex items-center gap-2 text-xs text-surface-600 bg-surface-50 px-3 py-1.5 rounded-md border border-surface-200">
                                        <FileIcon size={14} className="text-blue-500" />
                                        <span className="max-w-[200px] truncate font-medium">{resumeFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setResumeFile(null)}
                                            className="text-surface-400 hover:text-red-500 ml-1 transition-colors focus:outline-none"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-surface-400 italic mt-1">Accepts .pdf, .doc, .docx (Max 5MB)</p>

                            <label className="flex items-center gap-2 cursor-pointer mt-3 w-max">
                                <input
                                    type="checkbox"
                                    checked={!!form.resume_later}
                                    onChange={(e) => updateForm('resume_later', e.target.checked)}
                                    className="rounded border-surface-300 text-[#ef3e36] focus:ring-[#ef3e36] w-4 h-4 cursor-pointer"
                                />
                                <span className="text-xs text-surface-600 font-bold uppercase tracking-wide">I will email or upload my resume later</span>
                            </label>
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
                            NEXT: SOURCE
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
