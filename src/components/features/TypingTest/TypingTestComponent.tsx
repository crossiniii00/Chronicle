import React, { useState, useEffect, useRef } from 'react';
import { Clock, Target, Zap, Award, RotateCcw, Play, AlertCircle, XCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { cooldownService } from '@/services/cooldownService';
import axios from 'axios';

interface TypingTestResult {
    wpm: number;
    accuracy: number;
    timeTaken: number;
    errors: number;
    totalWords: number;
}

interface TypingTestProps {
    applicantName: string;
    applicantEmail?: string;
    onComplete: (result: TypingTestResult) => void;
    onCancel: () => void;
}

export function TypingTestComponent({ applicantName, applicantEmail, onComplete, onCancel }: TypingTestProps) {
    const [testState, setTestState] = useState<'idle' | 'ready' | 'running' | 'completed'>('running');
    const [currentText, setCurrentText] = useState('');
    const lastKnownResultTime = useRef<string | null>(null);
    const initialCheckDone = useRef(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    const fallbackCopy = (text: string) => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.position = 'fixed';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                setCopied(true);
                setHasCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                console.error('Fallback copy command failed');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
    };

    const handleCopy = () => {
        if (!applicantEmail) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(applicantEmail)
                .then(() => {
                    setCopied(true);
                    setHasCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch((err) => {
                    console.error('Failed to copy using clipboard API, using fallback:', err);
                    fallbackCopy(applicantEmail);
                });
        } else {
            fallbackCopy(applicantEmail);
        }
    };
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [errors, setErrors] = useState(0);
    const [result, setResult] = useState<TypingTestResult | null>(null);
    const [attempts, setAttempts] = useState(() => cooldownService.getAttempts(applicantName));
    const [isVoided, setIsVoided] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualWpm, setManualWpm] = useState('');
    const [manualAccuracy, setManualAccuracy] = useState('');

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [sampleTexts, setSampleTexts] = useState([
        "The quick brown fox jumps over the lazy dog. This pangram sentence contains every letter of the alphabet at least once, making it perfect for testing typing speed and accuracy.",
        "In today's digital world, typing skills are essential for productivity. Fast and accurate typing can significantly improve your efficiency in various professional tasks.",
        "Technology continues to evolve rapidly, bringing new innovations that transform how we work and communicate. Staying updated with these changes is crucial for success.",
        "Effective communication is the cornerstone of successful business relationships. Clear and concise messaging helps prevent misunderstandings and promotes collaboration."
    ]);
    const [minWpm, setMinWpm] = useState(40);
    const [minAccuracy, setMinAccuracy] = useState(90);
    const [durationLimit, setDurationLimit] = useState(60);
    const [allowBackspace, setAllowBackspace] = useState(true);
    const [showLiveStats, setShowLiveStats] = useState(true);
    const [difficultyLevel, setDifficultyLevel] = useState<'easy' | 'normal' | 'hard'>('normal');

    const [selectedText, setSelectedText] = useState("");

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { apiClient } = await import('@/utils/apiClient');
                const res = await apiClient.get('/report-configs/typing_test_settings');
                if (res.data && res.data.config_data) {
                    const cfg = res.data.config_data;
                    if (cfg.prompts && cfg.prompts.length > 0) {
                        setSampleTexts(cfg.prompts);
                        setSelectedText(cfg.prompts[Math.floor(Math.random() * cfg.prompts.length)]);
                    } else {
                        setSelectedText(sampleTexts[Math.floor(Math.random() * sampleTexts.length)]);
                    }
                    if (cfg.minWpm) setMinWpm(cfg.minWpm);
                    if (cfg.minAccuracy) setMinAccuracy(cfg.minAccuracy);
                    if (cfg.duration) setDurationLimit(cfg.duration);
                    if (cfg.allowBackspace !== undefined) setAllowBackspace(cfg.allowBackspace);
                    if (cfg.showLiveStats !== undefined) setShowLiveStats(cfg.showLiveStats);
                    if (cfg.difficultyLevel) setDifficultyLevel(cfg.difficultyLevel);
                } else {
                    setSelectedText(sampleTexts[Math.floor(Math.random() * sampleTexts.length)]);
                }
            } catch (err) {
                console.warn('Failed to load typing test settings, using defaults');
                setSelectedText(sampleTexts[Math.floor(Math.random() * sampleTexts.length)]);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (testState !== 'running' || !applicantEmail) return;

        const checkResults = async () => {
            try {
                const upperEmail = applicantEmail.trim().toUpperCase();
                const url = 'https://firestore.googleapis.com/v1/projects/cptypefinal/databases/(default)/documents:runQuery';
                const query = {
                    structuredQuery: {
                        from: [{ collectionId: 'applicant_results' }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: 'applicantEmail' },
                                op: 'EQUAL',
                                value: { stringValue: upperEmail }
                            }
                        }
                    }
                };

                const res = await axios.post(url, query);
                
                // Firestore runQuery returns an array of documents. We extract them.
                const docs = (res.data || [])
                    .filter((item: any) => item.document)
                    .map((item: any) => item.document);

                // Sort by createdAt descending
                docs.sort((a: any, b: any) => {
                    const timeA = new Date(a.fields.createdAt?.timestampValue || a.fields.createdAt?.stringValue || 0).getTime();
                    const timeB = new Date(b.fields.createdAt?.timestampValue || b.fields.createdAt?.stringValue || 0).getTime();
                    return timeB - timeA;
                });

                const latestDoc = docs[0];
                const latestCreatedAt = latestDoc 
                    ? (latestDoc.fields.createdAt?.timestampValue || latestDoc.fields.createdAt?.stringValue || null)
                    : null;

                if (!initialCheckDone.current) {
                    // Baseline: record whatever latest score currently exists in database
                    lastKnownResultTime.current = latestCreatedAt;
                    initialCheckDone.current = true;
                    console.log('Established typing result baseline. Latest result time:', latestCreatedAt);
                    return;
                }

                // If a new test result is found
                if (latestCreatedAt && latestCreatedAt !== lastKnownResultTime.current) {
                    const fields = latestDoc.fields;
                    
                    const wpm = fields.wpm ? parseInt(fields.wpm.integerValue || fields.wpm.doubleValue || fields.wpm.stringValue || '0', 10) : 0;
                    const accuracy = fields.accuracy ? parseInt(fields.accuracy.integerValue || fields.accuracy.doubleValue || fields.accuracy.stringValue || '0', 10) : 0;
                    const errors = fields.errors ? parseInt(fields.errors.integerValue || fields.errors.doubleValue || fields.errors.stringValue || '0', 10) : 0;
                    const totalWords = fields.totalWords ? parseInt(fields.totalWords.integerValue || fields.totalWords.doubleValue || fields.totalWords.stringValue || '0', 10) : 0;
                    const timeTaken = durationLimit;

                    console.log('New typing result fetched via REST:', { wpm, accuracy, createdAt: latestCreatedAt });

                    if (wpm > 0) {
                        const testResult: TypingTestResult = {
                            wpm: Math.round(wpm),
                            accuracy: Math.round(accuracy),
                            timeTaken: Math.round(timeTaken),
                            errors: Math.round(errors),
                            totalWords: Math.round(totalWords || (wpm * timeTaken) / 60)
                        };

                        setResult(testResult);
                        setTestState('completed');
                        lastKnownResultTime.current = latestCreatedAt;

                        if (wpm >= minWpm && accuracy >= minAccuracy) {
                            cooldownService.clearAttempts(applicantName);
                        } else {
                            const newAttempts = cooldownService.incrementAttempt(applicantName);
                            setAttempts(newAttempts);

                            if (newAttempts >= 3) {
                                setIsVoided(true);
                                cooldownService.addNameToCooldown(applicantName);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching typing test results via REST:', err);
            }
        };

        // Poll every 3 seconds for instant retrieval
        const interval = setInterval(checkResults, 3000);
        
        // Execute baseline check immediately
        checkResults();

        return () => {
            clearInterval(interval);
        };
    }, [testState, applicantEmail, minWpm, minAccuracy, applicantName, durationLimit]);

    useEffect(() => {
        if (testState === 'running' && startTime) {
            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                setTimeElapsed(elapsed);

                if (elapsed >= durationLimit) {
                    calculateResult(true);
                }
            }, 100);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [testState, startTime]);

    const startTest = () => {
        setTestState('running');
        setCurrentText('');
        setErrors(0);
        setTimeElapsed(0);
        setResult(null);
    };

    const handleManualSubmit = () => {
        const wpm = parseInt(manualWpm, 10);
        const accuracy = parseInt(manualAccuracy, 10);

        if (isNaN(wpm) || isNaN(accuracy)) {
            alert('Please enter valid numeric scores for WPM and Accuracy.');
            return;
        }

        const testResult: TypingTestResult = {
            wpm,
            accuracy,
            timeTaken: 60,
            errors: 0,
            totalWords: wpm
        };

        setResult(testResult);
        setTestState('completed');

        if (wpm >= minWpm && accuracy >= minAccuracy) {
            cooldownService.clearAttempts(applicantName);
        } else {
            const newAttempts = cooldownService.incrementAttempt(applicantName);
            setAttempts(newAttempts);
            if (newAttempts >= 3) {
                setIsVoided(true);
                cooldownService.addNameToCooldown(applicantName);
            }
        }
    };

    const handleDemoSkip = () => {
        const demoResult: any = {
            wpm: 68,
            accuracy: 98,
            timeTaken: 42,
            errors: 1,
            totalWords: 48,
            timedOut: false
        };
        setResult(demoResult);
        setTestState('completed');
        cooldownService.clearAttempts(applicantName);
    };

    const calculateResult = (isTimeout = false) => {
        if (!startTime) return;

        const timeInMinutes = Math.max(timeElapsed, 1) / 60; // Ensure at least 1 second to avoid Infinity
        const wordsTyped = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
        const wpm = Math.round(wordsTyped / timeInMinutes);

        // Calculate accuracy
        const typedChars = currentText.length;
        const correctChars = currentText.split('').filter((char, index) => char === selectedText[index]).length;
        const accuracy = typedChars > 0 ? Math.round((correctChars / typedChars) * 100) : 0;

        const testResult: any = {
            wpm,
            accuracy,
            timeTaken: timeElapsed,
            errors,
            totalWords: wordsTyped,
            timedOut: isTimeout
        };

        setResult(testResult);
        setTestState('completed');

        if (wpm >= minWpm && accuracy >= minAccuracy) {
            // Passed!
            cooldownService.clearAttempts(applicantName);
        } else {
            // Failed this attempt
            const newAttempts = cooldownService.incrementAttempt(applicantName);
            setAttempts(newAttempts);

            if (newAttempts >= 3) {
                // All attempts exhausted
                setIsVoided(true);
                cooldownService.addNameToCooldown(applicantName);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Backspace' && !allowBackspace) {
            e.preventDefault();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;

        // Only allow typing if we haven't exceeded the sample text
        if (newText.length <= selectedText.length) {
            setCurrentText(newText);

            // Calculate errors
            let errorCount = 0;
            for (let i = 0; i < newText.length; i++) {
                if (newText[i] !== selectedText[i]) {
                    errorCount++;
                }
            }
            setErrors(errorCount);
        }

        // Auto-complete when text matches
        if (newText === selectedText) {
            calculateResult();
        }
    };

    const getCharClass = (index: number) => {
        if (index >= currentText.length) return 'text-gray-600';
        return currentText[index] === selectedText[index] ? 'text-green-600' : 'text-red-500 bg-red-100';
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPerformanceLevel = (wpm: number) => {
        if (wpm >= 70) return { level: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100' };
        if (wpm >= 50) return { level: 'Advanced', color: 'text-blue-600', bg: 'bg-blue-100' };
        if (wpm >= 35) return { level: 'Intermediate', color: 'text-green-600', bg: 'bg-green-100' };
        return { level: 'Beginner', color: 'text-amber-600', bg: 'bg-amber-100' };
    };

    return (
        <div className="w-full bg-white rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative overflow-hidden text-surface-900 text-left">
            {/* Brand Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36]" />

            {/* Header */}
            <div className="text-center mb-8 border-b border-surface-100 pb-6">
                <h2 className="text-3xl font-black text-surface-900 tracking-tight uppercase mb-1">Typing Speed Test</h2>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider">
                    Assessing typing skills for: <span className="text-surface-900 font-black">{applicantName}</span>
                </p>
            </div>

            {/* Test States */}
            {testState === 'idle' && (
                <div className="text-center py-12 flex flex-col items-center">
                    <div className="w-20 h-20 bg-[#ef3e36]/5 border border-[#ef3e36]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Target size={40} className="text-[#ef3e36]" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4">Ready to Test Your Typing?</h3>
                    <p className="text-surface-650 text-sm mb-8 max-w-md mx-auto font-medium leading-relaxed">
                        This test will measure your typing speed and accuracy. You'll have {durationLimit} seconds to type as much of the provided text as possible.
                    </p>
                    <button
                        onClick={startTest}
                        className="bg-[#ef3e36] hover:bg-[#d32f2f] text-white px-8 py-3.5 rounded-md font-black uppercase tracking-widest text-xs transition-all shadow-md flex items-center gap-2 mx-auto active:scale-[0.98]"
                    >
                        <Play size={14} />
                        Start Test
                    </button>
                </div>
            )}

            {testState === 'ready' && (
                <div className="text-center py-12 flex flex-col items-center">
                    <div className="w-20 h-20 bg-[#ef3e36]/5 border border-[#ef3e36]/15 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Clock size={40} className="text-[#ef3e36]" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4">Get Ready...</h3>
                    <p className="text-surface-500 font-bold uppercase tracking-wider text-sm">The test will begin in 3 seconds</p>
                    <div className="flex justify-center gap-3 mt-6">
                        {[1, 2, 3].map((num) => (
                            <div
                                key={num}
                                className="w-12 h-12 bg-surface-100 border border-surface-200 rounded-full flex items-center justify-center font-black text-surface-700 animate-pulse"
                                style={{ animationDelay: `${(num - 1) * 0.3}s` }}
                            >
                                {num}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {testState === 'running' && (
                <div className="text-center py-6 space-y-8 animate-fade-in max-w-md mx-auto flex flex-col items-center">
                    <div className="relative w-24 h-24 bg-[#ef3e36]/5 border border-[#ef3e36]/15 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-[#ef3e36]/5">
                        <img src="/contactpoint-logo.png?v=2" alt="CP360" className="w-12 h-12 object-contain animate-bounce" />
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                        </span>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-surface-900 tracking-tight uppercase">Secure Assessment Ready</h3>
                        <p className="text-surface-650 text-sm leading-relaxed font-bold">
                            Click the button below to launch your dedicated <strong className="text-[#ef3e36]">CPTYPE</strong> typing speed assessment in a secure, full-screen tab. 
                        </p>
                    </div>

                    <div className="bg-[#ef3e36]/5 border-l-4 border-[#ef3e36] p-5 rounded-r-xl flex items-start gap-3.5 text-left w-full">
                        <AlertCircle className="w-5.5 h-5.5 text-[#ef3e36] shrink-0 mt-0.5" />
                        <p className="text-xs text-surface-650 font-bold leading-relaxed">
                            Do not close this main application window. Once you complete the typing test in the new tab, your scores will sync here automatically in real time.
                        </p>
                    </div>

                    {applicantEmail && (
                        <div className="bg-[#ef3e36]/5 border border-[#ef3e36]/15 rounded-xl p-6 text-center space-y-3.5 w-full">
                            <p className="text-[10px] text-surface-500 font-black uppercase tracking-[0.2em]">Candidate Email for Assessment</p>
                            <div className="flex items-center justify-center gap-2 w-full relative">
                                <code className="bg-white border border-surface-200 px-3.5 py-2.5 rounded-lg text-xs font-mono text-surface-900 select-all font-black truncate flex-1 text-center shadow-inner">
                                    {applicantEmail}
                                </code>
                                <div className="relative shrink-0">
                                    <button
                                        onClick={handleCopy}
                                        className={`p-3 border rounded-lg transition-all flex items-center justify-center shadow-sm relative ${
                                            !hasCopied 
                                                ? 'border-[#ef3e36] bg-[#ef3e36]/10 text-[#ef3e36] animate-pulse ring-4 ring-[#ef3e36]/20' 
                                                : 'border-surface-200 bg-white hover:bg-surface-50 text-surface-700'
                                        }`}
                                        title="Copy Email"
                                    >
                                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    </button>
                                    
                                    {!hasCopied && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-[#ef3e36] text-white text-[10px] font-black uppercase tracking-wider rounded-md shadow-md whitespace-nowrap animate-bounce flex items-center gap-1.5 z-10">
                                            <span>Copy Email</span>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-[#ef3e36]" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] text-[#ef3e36] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                                ⚠️ You MUST enter this exact email on the CPTYPE page to link your results.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600 bg-emerald-50 border border-emerald-150 py-2.5 px-5 rounded-full mx-auto w-fit shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        Real-time score sync active
                    </div>

                    <div className="space-y-4 w-full">
                        <button
                            onClick={() => {
                                if (!hasCopied) {
                                    alert("Please copy your email first using the button above so you can link your test results on the CPTYPE page.");
                                    return;
                                }
                                const name = applicantName || '';
                                const nameParts = name.trim().split(/\s+/);
                                const firstName = nameParts[0] || '';
                                const lastName = nameParts.slice(1).join(' ') || '';
                                const email = applicantEmail || '';
                                
                                const url = `https://cptypefinal.web.app/?name=${encodeURIComponent(name)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&email=${encodeURIComponent(email)}`;
                                window.open(url, '_blank');
                            }}
                            className={`w-full py-4.5 text-white font-black rounded-lg transition-all flex items-center justify-center gap-2 tracking-widest uppercase text-xs active:scale-[0.98] ${
                                !hasCopied 
                                    ? 'bg-surface-300 cursor-not-allowed opacity-75' 
                                    : 'bg-[#ef3e36] hover:bg-[#d32f2f] shadow-lg shadow-[#ef3e36]/10 hover:shadow-[#ef3e36]/20'
                            }`}
                        >
                            <ExternalLink size={16} />
                            Launch Typing Test
                        </button>

                        <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-surface-400 mt-6">
                            <button
                                onClick={onCancel}
                                className="hover:text-surface-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <span className="text-surface-200">|</span>
                            <button
                                onClick={handleDemoSkip}
                                className="hover:text-[#ef3e36] transition-colors"
                            >
                                Demo Skip (Bypass)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {testState === 'completed' && result && (
                <div className="text-center py-8">
                    {result.wpm >= minWpm && result.accuracy >= minAccuracy ? (
                        <div className="w-20 h-20 bg-emerald-50 border border-emerald-150 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Award size={40} className="text-emerald-600" />
                        </div>
                    ) : isVoided ? (
                        <div className="w-20 h-20 bg-red-50 border border-red-150 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={40} className="text-red-600" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-amber-50 border border-amber-150 text-amber-650 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle size={40} className="text-amber-605 animate-pulse" />
                        </div>
                    )}

                    <h3 className={`text-2xl font-black uppercase tracking-tight mb-2 ${
                        result.wpm >= minWpm && result.accuracy >= minAccuracy ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                        {result.wpm >= minWpm && result.accuracy >= minAccuracy 
                            ? 'Assessment Passed!' 
                            : isVoided 
                                ? 'Assessment Voided' 
                                : result.wpm < minWpm 
                                    ? 'Minimum WPM Not Met' 
                                    : 'Minimum Accuracy Not Met'}
                    </h3>

                    {!isVoided && (result.wpm < minWpm || result.accuracy < minAccuracy) && (
                        <p className="text-sm text-surface-500 mb-6 font-bold">
                            You need at least <span className="font-black text-surface-950">{minWpm} WPM</span> and <span className="font-black text-surface-950">{minAccuracy}% Accuracy</span> to proceed.
                            You have <span className="font-black text-red-650">{3 - attempts} retakes</span> remaining.
                        </p>
                    )}

                    {isVoided && (
                        <p className="text-sm text-red-600 mb-8 max-w-sm mx-auto font-bold">
                            You have exhausted all 3 attempts. Your application has been voided.
                            You may try again after <span className="font-black">24 hours</span>.
                        </p>
                    )}

                    {result.wpm >= minWpm && result.accuracy >= minAccuracy && (
                        <p className="text-sm text-emerald-600 mb-6 font-bold">
                            Excellent! You've met the requirements to proceed.
                        </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className={`rounded-xl p-5 border text-center ${result.wpm >= minWpm ? 'bg-emerald-50 border-emerald-150' : 'bg-red-50 border-red-150'}`}>
                            <div className={`text-3xl font-black ${result.wpm >= minWpm ? 'text-emerald-600' : 'text-red-600'}`}>{result.wpm}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-surface-450 mt-1">Words Per Minute</div>
                        </div>
                        <div className={`rounded-xl p-5 border text-center ${result.accuracy >= minAccuracy ? 'bg-emerald-50 border-emerald-150' : 'bg-red-50 border-red-150'}`}>
                            <div className={`text-3xl font-black ${result.accuracy >= minAccuracy ? 'text-emerald-600' : 'text-red-600'}`}>{result.accuracy}%</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-surface-450 mt-1">Accuracy</div>
                        </div>
                        <div className="bg-surface-50 border border-surface-150 rounded-xl p-5 text-center">
                            <div className="text-3xl font-black text-surface-900">{formatTime(result.timeTaken)}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-surface-450 mt-1">Time Taken</div>
                        </div>
                        <div className="bg-surface-50 border border-surface-150 rounded-xl p-5 text-center">
                            <div className="text-3xl font-black text-red-650">{result.errors}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-surface-450 mt-1">Errors</div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        {!isVoided && (result.wpm < minWpm || result.accuracy < minAccuracy) && (
                            <button
                                onClick={startTest}
                                className="bg-[#ef3e36] hover:bg-[#d32f2f] text-white px-8 py-3.5 rounded-md font-black uppercase tracking-widest text-xs transition-all shadow-md flex items-center gap-2 active:scale-[0.98]"
                            >
                                <RotateCcw size={14} />
                                Retake Test ({3 - attempts} left)
                            </button>
                        )}

                        <button
                            onClick={() => onComplete(result)}
                            className="px-10 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-md shadow-md transition-all active:scale-[0.98]"
                        >
                            Proceed to Review
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
