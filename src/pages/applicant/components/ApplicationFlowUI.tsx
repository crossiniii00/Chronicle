import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Clock, ArrowRight, ArrowDown, ArrowUp } from 'lucide-react';
import { cooldownService } from '@/services/cooldownService';
import { cn } from '@/utils/formatters';

interface SuccessViewProps {
    typingTestResult: any;
    queueNumber?: number | null;
    onBack: () => void;
}

export function SuccessView({ typingTestResult, queueNumber, onBack }: SuccessViewProps) {
    const [timeLeft, setTimeLeft] = useState(5);
    const [showTutorial, setShowTutorial] = useState(true);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setTimeout(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [timeLeft]);

    return (
        <div 
            className="min-h-screen w-full relative text-white pt-36 pb-16 px-4 overflow-x-hidden brand-gradient flex flex-col items-center justify-start"
            style={{ 
                fontFamily: "'Mulish', 'Segoe UI', 'Inter', sans-serif"
            }}
        >
            {/* Tutorial Overlay Modal */}
            <AnimatePresence>
                {showTutorial && queueNumber && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-6"
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="w-full max-w-md bg-white rounded-2xl p-8 border border-surface-200 text-surface-900 shadow-2xl text-center flex flex-col items-center gap-6"
                        >
                            <div className="w-16 h-16 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center text-3xl animate-pulse">
                                📸
                            </div>
                            
                            <h3 className="text-xl font-black uppercase text-surface-900 tracking-tight leading-none">Save Your Queue Number</h3>
                            
                            <div className="w-full bg-[#622B89]/5 border-2 border-[#622B89]/20 rounded-xl p-5 text-center shadow-inner">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#622B89] block mb-1">Your Interview Queue ID</span>
                                <span className="text-4xl font-black text-[#622B89] tracking-tight">#{String(queueNumber).padStart(3, '0')}</span>
                            </div>

                            {/* Bouncing Arrow Up pointing directly to the number above it */}
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-[#ef3e36] shadow-sm shrink-0"
                            >
                                <ArrowUp size={22} strokeWidth={3} />
                            </motion.div>

                            <p className="text-xs text-surface-500 leading-relaxed font-bold">
                                Please take a picture or screenshot of this number right now. It is required by the recruitment team to verify your application and call your turn.
                            </p>

                            <button
                                type="button"
                                onClick={() => setShowTutorial(false)}
                                className="w-full py-4 bg-[#ef3e36] hover:bg-[#d32f2f] text-white font-black text-xs uppercase tracking-[0.2em] rounded-md transition-all shadow-md active:scale-[0.98] cursor-pointer"
                            >
                                I have screenshotted my number
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                        disabled={timeLeft > 0}
                        className={cn(
                            "inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors",
                            timeLeft > 0 ? "text-white/30 cursor-not-allowed" : "text-white/70 hover:text-white"
                        )}
                    >
                        <ArrowLeft size={14} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] bg-[#ef3e36]/10 px-3.5 py-2 border border-[#ef3e36]/20 rounded-full">
                        Status
                    </div>
                </div>
            </header>

            <div className="w-full max-w-xl relative z-10 flex flex-col items-center">
                {/* Redesigned Form Card */}
                <div className="w-full bg-white rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-center flex flex-col items-center">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />
                    
                    {/* Redesigned Premium Static Checkmark */}
                    <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mb-6 shadow-md shadow-emerald-100/50 shrink-0">
                        <CheckCircle2 className="text-emerald-600" size={32} strokeWidth={2.5} />
                    </div>
                    <h2 className="mb-3 text-3xl font-black text-surface-900 uppercase tracking-tight">Application Recorded!</h2>
                    <p className="mb-8 text-sm text-surface-500 leading-relaxed max-w-md font-medium">
                        Your application and typing test results have been registered successfully in our database.
                    </p>

                    {queueNumber && (
                        <div className="w-full mb-8 bg-[#622B89]/5 border border-[#622B89]/20 rounded-2xl p-6 relative overflow-hidden ring-4 ring-[#622B89]/5">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#622B89]/10 rounded-full -mr-12 -mt-12 blur-xl pointer-events-none" />
                            
                            {/* Step Badge */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ef3e36] text-white text-[9px] font-black uppercase tracking-wider rounded-full mb-4 shadow-sm">
                                <Clock size={10} /> Action Required: Save Queue Token
                            </div>

                            {/* Queue Display Box with Pointing Arrow */}
                            <div className="flex flex-col items-center justify-center gap-4 mb-4 w-full">
                                {/* Bouncing Arrow (points down, slides vertically) */}
                                <motion.div
                                    animate={{ y: [0, 8, 0] }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                                    className="text-[#ef3e36] shrink-0"
                                >
                                    <ArrowDown size={44} strokeWidth={4.5} />
                                </motion.div>

                                <motion.div 
                                    animate={{ 
                                        scale: [1, 1.01, 1],
                                        borderColor: ['rgba(98, 43, 137, 0.2)', 'rgba(98, 43, 137, 0.6)', 'rgba(98, 43, 137, 0.2)']
                                    }}
                                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                                    className="w-full bg-white border-2 rounded-xl p-5 text-center shadow-md"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest text-surface-400 block mb-1">Your Interview Queue ID</span>
                                    <span className="text-4xl font-black text-[#622B89] tracking-tight">#{String(queueNumber).padStart(3, '0')}</span>
                                </motion.div>
                            </div>

                            {/* Tutorial Details */}
                            <div className="flex gap-4 items-start text-left bg-white border border-surface-150 p-4 rounded-xl shadow-sm">
                                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0 animate-pulse">
                                    <span className="text-2xl">📸</span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase text-surface-900 tracking-wider mb-1">Take a Picture / Screenshot</h4>
                                    <p className="text-xs text-surface-500 leading-relaxed font-medium">
                                        Please snap a photo or screenshot of this queue number now. This is your official priority token. You must present it to the coordinators—it is required to verify your application if you are accepted.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="w-full mb-8 p-6 bg-surface-50 border border-surface-150 rounded-xl text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-surface-400 mb-4 text-center">Typing Test Results</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-black text-[#ef3e36]">{typingTestResult?.wpm}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-surface-400 mt-1">WPM</div>
                            </div>
                            <div className="border-x border-surface-200">
                                <div className="text-2xl font-black text-emerald-600">{typingTestResult?.accuracy}%</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-surface-400 mt-1">Accuracy</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-surface-900">
                                    {Math.round((typingTestResult?.timeTaken || 0) / 60)}:{((typingTestResult?.timeTaken || 0) % 60).toString().padStart(2, '0')}
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-surface-400 mt-1">Duration</div>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onBack} 
                        disabled={timeLeft > 0}
                        className={cn(
                            "rounded-md px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all shadow-md active:scale-[0.98]",
                            timeLeft > 0 
                                ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" 
                                : "bg-[#ef3e36] hover:bg-[#d32f2f] shadow-[#ef3e36]/10 hover:shadow-[#ef3e36]/20"
                        )}
                    >
                        {timeLeft > 0 ? `Back to Job Listings (${timeLeft}s)` : "Back to Job Listings"}
                    </button>
                </div>
        </div>
        </div>
    );
}

interface TypingIntroProps {
    onBack: () => void;
    onStart: () => void;
}

export function TypingIntro({ onBack, onStart }: TypingIntroProps) {
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
            <header className="fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-6 md:px-10 py-5 bg-black/20 backdrop-blur-xl border-b border-white/10 text-white">
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
                        <span>← Back</span>
                    </button>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] bg-[#ef3e36]/10 px-3.5 py-2 border border-[#ef3e36]/20 rounded-full">
                        Typing Assessment
                    </div>
                </div>
            </header>

            <div className="w-full max-w-2xl relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-14rem)]">
                {/* Form Card */}
                <div className="w-full bg-white rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />
                    
                    <h2 className="mb-6 text-3xl font-black text-surface-900 tracking-tight uppercase border-b border-surface-100 pb-4 text-center sm:text-left">
                        Ready for Typing Test
                    </h2>
                    
                    <div className="space-y-6">
                        <p className="text-sm text-surface-650 leading-relaxed font-bold">
                            You have completed all sections of the Personal Information Sheet. The next step is a typing speed test to assess your typing skills.
                        </p>
                        
                        <div className="bg-[#ef3e36]/5 border border-[#ef3e36]/10 rounded-xl p-6 text-left">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#ef3e36] mb-3">What to expect:</h3>
                            <ul className="text-sm text-surface-700 space-y-2 font-medium">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#ef3e36] rounded-full" />
                                    A professional 60-second typing test
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#ef3e36] rounded-full" />
                                    Word-per-minute (WPM) and accuracy tracking
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#ef3e36] rounded-full" />
                                    Results will be automatically attached to your profile
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-10 flex justify-between items-center border-t border-surface-100 pt-8">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center gap-2 px-6 py-3 border border-surface-200 hover:border-surface-300 rounded-md text-surface-600 hover:text-surface-850 hover:bg-surface-50 font-bold transition-all text-xs uppercase tracking-widest"
                        >
                            Back
                        </button>
                        <button
                            onClick={onStart}
                            className="inline-flex items-center gap-2 rounded-md bg-[#ef3e36] hover:bg-[#d32f2f] px-8 py-3 text-xs font-black uppercase tracking-widest text-white transition-all shadow-md shadow-[#ef3e36]/10 hover:shadow-[#ef3e36]/20 active:scale-[0.98]"
                        >
                            Start Typing Test →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ReviewViewProps {
    typingTestResult: any;
    submitting: boolean;
    uploadProgress: number;
    onSubmit: () => void;
    onEdit: () => void;
}

export function ReviewView({ typingTestResult, submitting, uploadProgress, onSubmit, onEdit }: ReviewViewProps) {
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
                        onClick={onEdit} 
                        className="inline-flex items-center gap-2 text-white/70 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                    >
                        <span>← Back</span>
                    </button>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] bg-[#ef3e36]/10 px-3.5 py-2 border border-[#ef3e36]/20 rounded-full">
                        Review Details
                    </div>
                </div>
            </header>

            <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
                {/* Form Card */}
                <div className="w-full bg-white rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />
                    
                    <h2 className="mb-6 text-3xl font-black text-surface-900 tracking-tight uppercase border-b border-surface-100 pb-4">
                        Review Complete!
                    </h2>
                    
                    <p className="text-sm text-surface-650 mb-8 font-bold leading-relaxed">
                        All your information including PIS and typing test results are ready for submission.
                    </p>

                    {typingTestResult?.timedOut ? (
                        <div className="mb-8 p-5 bg-amber-50 border border-amber-250 rounded-xl text-amber-850 text-xs font-black flex flex-col gap-1.5">
                            <span className="uppercase tracking-[0.2em] text-[10px] opacity-75">Time Expired</span>
                            Typing Test Result: {typingTestResult?.wpm} WPM | {typingTestResult?.accuracy}% Accuracy
                        </div>
                    ) : (
                        <div className="mb-8 p-5 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-850 text-xs font-black flex flex-col gap-1.5">
                            <span className="uppercase tracking-[0.2em] text-[10px] opacity-75 text-emerald-600">Typing Test Finished</span>
                            Typing Test Result: {typingTestResult?.wpm} WPM | {typingTestResult?.accuracy}% Accuracy
                        </div>
                    )}

                    <div className="flex flex-col gap-4 mt-8 pt-8 border-t border-surface-100">
                        {submitting && (
                            <div className="w-full space-y-2 text-left">
                                <div className="flex justify-between text-[10px] font-black text-surface-400 uppercase tracking-widest">
                                    <span>Uploading Application & Resume</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                    <motion.div className="h-full bg-[#ef3e36]" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ ease: "easeOut", duration: 0.2 }} />
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center w-full">
                            <button 
                                onClick={onEdit} 
                                className="text-surface-500 hover:text-[#ef3e36] font-bold text-xs uppercase tracking-widest transition-colors"
                            >
                                Edit Details
                            </button>
                            <button 
                                onClick={onSubmit} 
                                disabled={submitting} 
                                className="px-8 py-3.5 bg-[#ef3e36] hover:bg-[#d32f2f] text-white font-black text-xs uppercase tracking-widest rounded-md shadow-md shadow-[#ef3e36]/10 hover:shadow-[#ef3e36]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                            >
                                {submitting ? (uploadProgress < 100 ? 'Uploading...' : 'Processing...') : 'Submit Application'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface VoidedViewProps {
    fullName: string;
    onBack: () => void;
}

export function VoidedView({ fullName, onBack }: VoidedViewProps) {
    const remaining = cooldownService.getRemainingCooldown(fullName);
    
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
                        <span>← Return</span>
                    </button>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] bg-[#ef3e36]/10 px-3.5 py-2 border border-[#ef3e36]/20 rounded-full">
                        Status
                    </div>
                </div>
            </header>

            <div className="w-full max-w-lg relative z-10 flex flex-col items-center">
                {/* Form Card */}
                <div className="w-full bg-white rounded-xl border border-red-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-center flex flex-col items-center">
                    {/* Brand Top Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
                    
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-8 border border-red-100">
                        <XCircle size={40} />
                    </div>
                    
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 italic text-red-600">
                        Application Voided
                    </h2>
                    
                    <p className="text-sm text-surface-650 mb-8 leading-relaxed font-bold max-w-sm">
                        We regret to inform you that your application has been voided due to failed assessments. In accordance with our policy, you are ineligible to re-apply for <span className="font-black text-surface-900">24 hours</span>.
                    </p>
                    
                    <div className="w-full bg-surface-50 border border-surface-150 rounded-xl p-6 mb-8 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-2">Cooldown Remaining</p>
                        <p className="text-3xl font-black text-red-600 italic tracking-tighter">{remaining || 'Calculating...'}</p>
                    </div>
                    
                    <button 
                        onClick={onBack} 
                        className="w-full py-4 bg-surface-900 hover:bg-surface-800 text-white font-black text-xs uppercase tracking-[0.2em] rounded-md transition-all shadow-md active:scale-[0.98]"
                    >
                        Return to Jobs
                    </button>
                </div>
            </div>
        </div>
    );
}
