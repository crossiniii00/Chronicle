import React, { useState, useEffect, useRef } from 'react';
import { Clock, Target, Award, Play, AlertCircle, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { cooldownService } from '@/services/cooldownService';
import LocalTypingTest from './LocalTypingTest';
import { createPortal } from 'react-dom';
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
    onComplete: (result: TypingTestResult, isPassed: boolean) => void;
    onCancel: () => void;
    isRetake?: boolean;
}

const getBestAttempt = (attemptsList: TypingTestResult[], minWpm: number = 40, minAccuracy: number = 90): TypingTestResult | null => {
    if (!attemptsList || attemptsList.length === 0) return null;
    
    // 1. Always prioritize passing attempts (wpm >= minWpm AND accuracy >= minAccuracy)
    const passing = attemptsList.filter(a => a.wpm >= minWpm && a.accuracy >= minAccuracy);
    if (passing.length > 0) {
        // Sort by highest WPM first, then highest accuracy as tiebreaker
        return passing.sort((a, b) => {
            if (b.wpm !== a.wpm) return b.wpm - a.wpm;
            return b.accuracy - a.accuracy;
        })[0];
    }
    
    // 2. No passing attempts — pick the one closest to meeting BOTH thresholds
    //    Score = how close they are to passing (higher is better, max 0 means they passed)
    return [...attemptsList].sort((a, b) => {
        const scoreA = Math.min(a.wpm - minWpm, 0) + Math.min(a.accuracy - minAccuracy, 0);
        const scoreB = Math.min(b.wpm - minWpm, 0) + Math.min(b.accuracy - minAccuracy, 0);
        if (scoreB !== scoreA) return scoreB - scoreA; // closer to 0 is better
        if (b.wpm !== a.wpm) return b.wpm - a.wpm;
        return b.accuracy - a.accuracy;
    })[0];
};

export function TypingTestComponent({ applicantName, applicantEmail, onComplete, onCancel, isRetake }: TypingTestProps) {
    const safeEmail = (applicantEmail || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeName = applicantName.trim().toLowerCase().replace(/\s+/g, '_');
    const storageId = safeEmail || safeName;
    const storageKey = `typing_test_all_attempts_${storageId}`;
    const resultKey = `typing_test_latest_result_${storageId}`;

    const [testState, setTestState] = useState<'idle' | 'ready' | 'running' | 'completed'>(() => {
        try {
            const resultSaved = localStorage.getItem(resultKey);
            const attemptsSaved = localStorage.getItem(storageKey);
            if (resultSaved || (attemptsSaved && JSON.parse(attemptsSaved).length > 0)) {
                return 'completed';
            }
        } catch (e) {}
        return 'idle';
    });
    const [currentText, setCurrentText] = useState('');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [showLocalTest, setShowLocalTest] = useState(false);
    
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [errors, setErrors] = useState(0);
    const [result, setResult] = useState<TypingTestResult | null>(() => {
        try {
            const saved = localStorage.getItem(resultKey);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return null;
    });
    const [allAttempts, setAllAttempts] = useState<TypingTestResult[]>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [];
    });
    const [attempts, setAttempts] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed: TypingTestResult[] = JSON.parse(saved);
                // We'll re-evaluate this when minWpm/minAccuracy loads
                const hasPass = parsed.some(att => att.wpm >= minWpm && att.accuracy >= minAccuracy);
                if (hasPass) return 0;
                return parsed.filter(att => att.wpm < minWpm || att.accuracy < minAccuracy).length;
            }
        } catch (e) {}
        return cooldownService.getAttempts(applicantName);
    });
    const isVoided = false; // Completely removed lock mechanism
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
    const [preset, setPreset] = useState<string>('10FASTFINGERS PRESET (GROSS WPM)');
    const [strictCapitals, setStrictCapitals] = useState(true);
    const [strictSpaces, setStrictSpaces] = useState(true);

    const [selectedText, setSelectedText] = useState("");

    const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number | null>(null);

    const bestAttempt = getBestAttempt(allAttempts, minWpm, minAccuracy);
    const chosenAttempt = selectedAttemptIndex !== null && allAttempts[selectedAttemptIndex]
        ? allAttempts[selectedAttemptIndex]
        : bestAttempt || result;

    useEffect(() => {
        try {
            if (result) {
                localStorage.setItem(resultKey, JSON.stringify(result));
            } else {
                localStorage.removeItem(resultKey);
            }
        } catch (e) {}
    }, [result, resultKey]);

    useEffect(() => {
        try {
            if (allAttempts && allAttempts.length > 0) {
                localStorage.setItem(storageKey, JSON.stringify(allAttempts));
            } else {
                localStorage.removeItem(storageKey);
            }
        } catch (e) {}
    }, [allAttempts, storageKey]);

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
                    if (cfg.minWpm !== undefined) setMinWpm(cfg.minWpm);
                    if (cfg.minAccuracy !== undefined) setMinAccuracy(cfg.minAccuracy);
                    if (cfg.duration !== undefined) setDurationLimit(cfg.duration);
                    if (cfg.allowBackspace !== undefined) setAllowBackspace(cfg.allowBackspace);
                    if (cfg.showLiveStats !== undefined) setShowLiveStats(cfg.showLiveStats);
                    if (cfg.difficultyLevel !== undefined) setDifficultyLevel(cfg.difficultyLevel);
                    if (cfg.preset !== undefined) setPreset(cfg.preset);
                    if (cfg.strictCapitals !== undefined) setStrictCapitals(cfg.strictCapitals);
                    if (cfg.strictSpaces !== undefined) setStrictSpaces(cfg.strictSpaces);
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

    // Re-evaluate attempts and void status when minWpm/minAccuracy updates
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed: TypingTestResult[] = JSON.parse(saved);
                const hasPass = parsed.some(att => att.wpm >= minWpm && att.accuracy >= minAccuracy);
                const failedCount = parsed.filter(att => att.wpm < minWpm || att.accuracy < minAccuracy).length;
                
                if (hasPass) {
                    setAttempts(0);
                } else {
                    setAttempts(failedCount);
                }
            }
        } catch (e) {}
    }, [minWpm, minAccuracy, storageKey]);



    const handleLocalTestFinish = async (metrics: { wpm: number; accuracy: number; errors: number; timeElapsed: number }) => {
        const testResult: any = {
            wpm: metrics.wpm,
            accuracy: metrics.accuracy,
            timeTaken: metrics.timeElapsed,
            errors: metrics.errors,
            totalWords: Math.round((metrics.wpm * (metrics.timeElapsed || 60)) / 60) || metrics.wpm,
            timedOut: metrics.timeElapsed >= durationLimit
        };

        setResult(testResult);
        setTestState('completed');
        setShowLocalTest(false);

        const newAllAttempts = [...allAttempts, testResult];
        setAllAttempts(newAllAttempts);

        const newAttempts = cooldownService.incrementAttempt(applicantName);
        setAttempts(newAttempts);
        
        let voided = false;
        
        try {
            const { apiClient } = await import('@/utils/apiClient');
            await apiClient.post('/typing-test/log', {
                applicantName: applicantName,
                applicantEmail: applicantEmail || '',
                wpm: testResult.wpm,
                accuracy: testResult.accuracy,
                timeTaken: testResult.timeTaken,
                errors: testResult.errors,
                totalWords: testResult.totalWords,
                isPassed: !voided && testResult.wpm >= minWpm && testResult.accuracy >= minAccuracy,
                attemptNumber: newAttempts
            });
        } catch (e) {
            console.error('Failed to log attempt to backend', e);
        }
    };


    const startTest = () => {
        setTestState('running');
        setCurrentText('');
        setErrors(0);
        setTimeElapsed(0);
        setResult(null);
    };

    const handleManualSubmit = async () => {
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

        const newAttempts = cooldownService.incrementAttempt(applicantName);
        setAttempts(newAttempts);
        
        let voided = false;
        
        try {
            const { apiClient } = await import('@/utils/apiClient');
            await apiClient.post('/typing-test/log', {
                applicantName: applicantName,
                applicantEmail: applicantEmail || '',
                wpm: testResult.wpm,
                accuracy: testResult.accuracy,
                timeTaken: testResult.timeTaken,
                errors: testResult.errors,
                totalWords: testResult.totalWords,
                isPassed: !voided && testResult.wpm >= minWpm && testResult.accuracy >= minAccuracy,
                attemptNumber: newAttempts
            });
        } catch (e) {
            console.error('Failed to log attempt to backend', e);
        }
    };

    const handleDemoSkip = async () => {
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
        
        try {
            const { apiClient } = await import('@/utils/apiClient');
            await apiClient.post('/typing-test/log', {
                applicantName: applicantName,
                applicantEmail: applicantEmail || '',
                wpm: demoResult.wpm,
                accuracy: demoResult.accuracy,
                timeTaken: demoResult.timeTaken,
                errors: demoResult.errors,
                totalWords: demoResult.totalWords,
                isPassed: true,
                attemptNumber: 1
            });
        } catch (e) {
            console.error('Failed to log demo attempt', e);
        }
    };



    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-xl border border-surface-200 p-8 md:p-12 shadow-2xl relative text-surface-900 text-left">
            {/* Brand Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ef3e36] rounded-t-xl" />

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
                <div className="text-center py-6 space-y-8 animate-fade-in max-w-md mx-auto flex flex-col items-center relative">
                    
                    <div className="space-y-3">
                        <h3 className="text-2xl font-black text-surface-900 tracking-tight uppercase">Secure Assessment Ready</h3>
                        <p className="text-surface-650 text-sm leading-relaxed font-bold">
                            Click the button below to launch your typing speed assessment in a secure, full-screen environment. 
                        </p>
                    </div>

                    <div className="bg-[#ef3e36]/5 border-l-4 border-[#ef3e36] p-5 rounded-r-xl flex items-start gap-3.5 text-left w-full transition-all duration-1000">
                        <AlertCircle className="w-5.5 h-5.5 text-[#ef3e36] shrink-0 mt-0.5 animate-pulse" />
                        <p className="text-xs text-surface-650 font-bold leading-relaxed">
                            Once you complete the typing test, your scores will sync here automatically and you will proceed to the next step.
                        </p>
                    </div>

                    <div className="space-y-4 w-full">
                        <button
                            onClick={() => setShowLocalTest(true)}
                            className="w-full py-4.5 text-white font-black rounded-lg transition-all flex items-center justify-center gap-2 tracking-widest uppercase text-xs active:scale-[0.98] bg-[#ef3e36] hover:bg-[#d32f2f] shadow-lg shadow-[#ef3e36]/10 hover:shadow-[#ef3e36]/20"
                        >
                            <Play size={16} />
                            Launch Typing Test
                        </button>

                        <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-surface-400 mt-6">
                            <button
                                onClick={onCancel}
                                className="hover:text-surface-900 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {testState === 'completed' && chosenAttempt && (
                <div className="text-center py-8">
                    {chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy ? (
                        <div className="w-14 h-14 bg-emerald-50 border border-emerald-150 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Award size={28} className="text-emerald-600" />
                        </div>
                    ) : isVoided ? (
                        <div className="w-14 h-14 bg-emerald-50 border border-emerald-150 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle size={28} className="text-emerald-600" />
                        </div>
                    ) : (
                        <div className="w-14 h-14 bg-amber-50 border border-amber-150 text-amber-650 rounded-full flex items-center justify-center mx-auto mb-3">
                            <AlertCircle size={28} className="text-amber-605 animate-pulse" />
                        </div>
                    )}

                    <h3 className={`text-xl font-black uppercase tracking-tight mb-1 ${
                        (chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy) || isVoided ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                        {chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy 
                            ? 'Assessment Passed!' 
                            : isVoided 
                                ? 'Session Concluded' 
                                : chosenAttempt.wpm < minWpm 
                                    ? 'Minimum WPM Not Met' 
                                    : 'Minimum Accuracy Not Met'}
                    </h3>

                    {(chosenAttempt.wpm < minWpm || chosenAttempt.accuracy < minAccuracy) && (
                        <p className="text-xs text-surface-500 mb-3 font-bold">
                            You need at least <span className="font-black text-surface-950">{minWpm} WPM</span> and <span className="font-black text-surface-950">{minAccuracy}% Accuracy</span> to proceed.
                            {attempts < 3 
                                ? <> You have <span className="font-black text-red-650">{3 - attempts} retakes</span> remaining. Click the Retry button below to take the test again.</>
                                : <> You have exhausted all 3 attempts. You can still retry, but your handling recruiter will be notified.</>}
                        </p>
                    )}

                    {chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy && (
                        <p className="text-xs text-emerald-600 mb-3 font-bold">
                            Excellent! You've met the requirements to proceed.
                        </p>
                    )}

                    <p className="text-[10px] text-surface-400 font-black uppercase tracking-wider text-center mb-2">
                        💡 Click on any attempt card to select it for submission.
                    </p>

                    <div className="space-y-2 mb-4 max-h-[350px] overflow-y-auto pr-1">
                        {(allAttempts.length > 0 ? allAttempts : [chosenAttempt]).map((attempt, index, arr) => {
                            const attemptNum = arr.length - index;
                            const isPass = attempt.wpm >= minWpm && attempt.accuracy >= minAccuracy;
                            const isChosen = attempt === chosenAttempt;
                            const isSystemRecommended = attempt === bestAttempt;
                            return (
                                <div 
                                    key={index} 
                                    onClick={() => setSelectedAttemptIndex(index)}
                                    className={cn(
                                        "border rounded-xl p-2.5 bg-white dark:bg-slate-900 shadow-sm space-y-2 cursor-pointer transition-all text-left relative",
                                        isChosen 
                                            ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                                            : "border-surface-200 hover:border-surface-300"
                                    )}
                                >
                                    <div className="flex justify-between items-center border-b border-surface-100 pb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                                                isChosen ? "border-emerald-500 bg-emerald-500 text-white" : "border-surface-300 bg-white dark:bg-slate-900"
                                            )}>
                                                {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900" />}
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-wider text-surface-500">Attempt #{attemptNum}</span>
                                            {isSystemRecommended && (
                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                    Chosen (System Recommended)
                                                </span>
                                            )}
                                            {isChosen && !isSystemRecommended && (
                                                <span className="text-[8px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isPass ? 'bg-emerald-50 text-emerald-700 border-emerald-250 animate-pulse' : 'bg-red-50 text-red-750 border-red-250'}`}>
                                            {isPass ? 'Passed' : 'Failed'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className={`p-1.5 border rounded-lg text-center ${isPass ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                                            <div className={`text-sm font-black ${attempt.wpm >= minWpm ? 'text-emerald-600' : 'text-red-650'}`}>{attempt.wpm}</div>
                                            <div className="text-[7.5px] font-bold uppercase tracking-wider text-surface-400">WPM</div>
                                        </div>
                                        <div className={`p-1.5 border rounded-lg text-center ${isPass ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                                            <div className={`text-sm font-black ${attempt.accuracy >= minAccuracy ? 'text-emerald-600' : 'text-red-650'}`}>{attempt.accuracy}%</div>
                                            <div className="text-[7.5px] font-bold uppercase tracking-wider text-surface-400">Accuracy</div>
                                        </div>
                                        <div className="p-1.5 border border-surface-150 rounded-lg text-center bg-surface-50/50">
                                            <div className="text-sm font-black text-surface-800">{formatTime(attempt.timeTaken)}</div>
                                            <div className="text-[7.5px] font-bold uppercase tracking-wider text-surface-400">Time</div>
                                        </div>
                                        <div className="p-1.5 border border-surface-150 rounded-lg text-center bg-surface-50/50">
                                            <div className="text-sm font-black text-red-600">{attempt.errors}</div>
                                            <div className="text-[7.5px] font-bold uppercase tracking-wider text-surface-400">Errors</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center gap-4 w-full mt-10">
                        {(!(chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy)) && attempts < 3 && (
                            <button
                                onClick={() => {
                                    startTest();
                                    setShowLocalTest(true);
                                }}
                                className="px-10 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-md shadow-md transition-all active:scale-[0.98]"
                            >
                                Retry Test
                            </button>
                        )}
                        {(!(chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy)) && attempts >= 3 && (
                            <button
                                onClick={() => {
                                    if (window.confirm("You already have failed all 3 attempts. TRY AGAIN? This will notify the handling recruiter")) {
                                        startTest();
                                        setShowLocalTest(true);
                                    }
                                }}
                                className="px-10 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-xs rounded-md shadow-md transition-all active:scale-[0.98]"
                            >
                                Retry Attempts
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const isPassed = (chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy);
                                onComplete(chosenAttempt, isPassed);
                            }}
                            className={cn(
                                "px-10 py-3.5 text-white font-black uppercase tracking-widest text-xs rounded-md shadow-md transition-all active:scale-[0.98]",
                                (chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                            )}
                        >
                            {(chosenAttempt.wpm >= minWpm && chosenAttempt.accuracy >= minAccuracy) ? (isRetake ? 'Submit Retake' : 'Proceed to Review') : 'Submit Application'}
                        </button>
                      </div>
                </div>
            )}
            {showLocalTest && createPortal(
                <LocalTypingTest 
                    userName={applicantName} 
                    text={selectedText} 
                    durationLimit={durationLimit}
                    allowBackspace={allowBackspace}
                    showLiveStats={showLiveStats}
                    preset={preset}
                    strictCapitals={strictCapitals}
                    strictSpaces={strictSpaces}
                    onFinish={handleLocalTestFinish} 
                    onCancel={() => setShowLocalTest(false)}
                />,
                document.body
            )}
        </div>
    );
}
