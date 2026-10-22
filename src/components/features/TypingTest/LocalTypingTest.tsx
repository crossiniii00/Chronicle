import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sun, Moon, X } from 'lucide-react';
import FireEmbersBackground from './FireEmbersBackground';

interface LocalTypingTestProps {
  userName: string;
  text: string;
  durationLimit: number;
  allowBackspace?: boolean;
  showLiveStats?: boolean;
  preset?: string;
  strictCapitals?: boolean;
  strictSpaces?: boolean;
  onFinish: (metrics: { wpm: number; accuracy: number; errors: number; timeElapsed: number }) => void;
  onCancel: () => void;
}

const LocalTypingTest: React.FC<LocalTypingTestProps> = ({ 
    userName, 
    text, 
    durationLimit,
    allowBackspace = true,
    showLiveStats = true,
    preset = '10FASTFINGERS PRESET (GROSS WPM)',
    strictCapitals = true,
    strictSpaces = true,
    onFinish, 
    onCancel 
}) => {
  const [isLightMode, setIsLightMode] = useState(true);

  const toggleTheme = () => {
    setIsLightMode(prev => !prev);
  };

  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(durationLimit);
  const [isFinished, setIsFinished] = useState(false);
  const [metrics, setMetrics] = useState({ wpm: 0, accuracy: 100, errors: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const hasFinishedRef = useRef(false);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const calculateMetrics = useCallback((input: string, timeElapsed: number) => {
    const minutes = timeElapsed / 60;

    let errors = 0;
    let correctChars = 0;
    const targetChars = text.split('');
    const inputChars = input.split('');

    inputChars.forEach((char, i) => {
      let targetChar = targetChars[i];
      let inputChar = char;
      
      if (!strictCapitals) {
        targetChar = targetChar?.toLowerCase();
        inputChar = inputChar?.toLowerCase();
      }

      if (inputChar !== targetChar) {
        // If not strict spaces, forgive space-related mismatches
        if (!strictSpaces && (targetChar === ' ' || inputChar === ' ')) {
            correctChars++;
        } else {
            errors++;
        }
      } else {
        correctChars++;
      }
    });

    const accuracy = input.length > 0 ? Math.max(0, Math.round(((input.length - errors) / input.length) * 100)) : 100;

    const grossWpm = minutes > 0 ? (input.length / 5) / minutes : 0;
    
    let rawWpm = grossWpm;
    if (preset === '10FASTFINGERS PRESET (GROSS WPM)' || preset === 'DATA ENTRY PRESET (LITERAL WORDS)') {
       rawWpm = grossWpm;
    } else if (preset === 'KEYBR PRESET (DOUBLE ERROR PENALTY)') {
       rawWpm = grossWpm - (minutes > 0 ? (errors * 2) / minutes : 0);
    } else if (preset === 'MONKEYTYPE PRESET (STRICT WPM)') {
       rawWpm = minutes > 0 ? (correctChars / 5) / minutes : 0;
    } else {
       rawWpm = grossWpm - (minutes > 0 ? errors / minutes : 0);
    }
    
    const currentWpm = Math.max(0, Math.round(rawWpm));

    return { wpm: currentWpm, accuracy, errors };
  }, [text, preset, strictCapitals, strictSpaces]);

  const userInputRef = useRef(userInput);
  useEffect(() => { userInputRef.current = userInput; }, [userInput]);

  useEffect(() => {
    let interval: any;
    if (startTime && !isFinished) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTimeLeft = Math.max(0, durationLimit - Math.floor(elapsed));
        setTimeLeft(newTimeLeft);
        setMetrics(calculateMetrics(userInputRef.current, elapsed));
        if (newTimeLeft === 0) setIsFinished(true);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [startTime, isFinished, durationLimit, calculateMetrics]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isFinished) return;
    if (!startTime && e.key === 'Enter') {
      e.preventDefault();
      setStartTime(Date.now());
      return;
    }
  };

  // Optimized Singleton Audio Synthesis for Typing Feedback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playPop = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.04);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Audio context fallback safeguard
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished) return;
    const value = e.target.value;
    if (value.length !== userInput.length) playPop();
    if (value.length > text.length) return;
    if (!startTime) return;
    setUserInput(value);
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0.001;
    setMetrics(calculateMetrics(value, elapsed));
    if (value.length === text.length) setIsFinished(true);
  };

  const words = text.split(' ');
  let charIndexTracker = 0;

  const renderWords = () => {
    charIndexTracker = 0;
    return words.map((word, wordIdx) => {
      const isLastWord = wordIdx === words.length - 1;
      const wordChars = (word + (isLastWord ? '' : ' ')).split('');
      const wordRender = wordChars.map((char, charIdx) => {
        const globalCharIdx = charIndexTracker++;
        let charClass = `transition-colors duration-150 ${isLightMode ? 'text-slate-300' : 'text-white/20'}`;
        let isCorrect = true;
        if (globalCharIdx < userInput.length) {
          let targetChar = char;
          let inputChar = userInput[globalCharIdx];

          if (!strictCapitals) {
            targetChar = targetChar?.toLowerCase();
            inputChar = inputChar?.toLowerCase();
          }

          if (inputChar !== targetChar) {
            if (!strictSpaces && (targetChar === ' ' || inputChar === ' ')) {
                isCorrect = true;
            } else {
                isCorrect = false;
            }
          } else {
            isCorrect = true;
          }

          charClass = isCorrect ? (isLightMode ? 'text-slate-800 dark:text-slate-200' : 'text-white') : 'text-red-500 border-b border-red-500 bg-red-500/20';
        }

        const isCurrent = globalCharIdx === userInput.length;
        const isError = globalCharIdx < userInput.length && !isCorrect;

        return (
          <span 
            key={globalCharIdx} 
            className={`relative inline-block ${charClass} ${isError ? 'animate-[shake_0.15s_ease-in-out]' : ''}`}
          >
            {char === ' ' ? '\u00A0' : char}
            {isCurrent && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-[1.15em] bg-[#7D52FF] shadow-[0_0_12px_rgba(125,82,255,0.9),_0_0_4px_rgba(125,82,255,0.5)] animate-caret-blink" />
            )}
          </span>
        );
      });
      return <div key={wordIdx} className="inline-block mr-[0.35em] mb-1.5">{wordRender}</div>;
    });
  };

  useEffect(() => {
    if (isFinished) {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      const timeElapsed = startTime ? (Date.now() - startTime) / 1000 : durationLimit;
      setTimeout(() => {
        onFinish({ ...metrics, timeElapsed: Math.min(timeElapsed, durationLimit) });
      }, 1500);
    }
  }, [isFinished, metrics, startTime, durationLimit, onFinish]);

  return (
    <div className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center p-8 overflow-hidden font-inter transition-colors duration-300 ${isLightMode ? 'bg-[#f3f4f6] text-slate-800 dark:text-slate-200' : 'bg-[#050404] text-white'}`}>
      <FireEmbersBackground isLightMode={isLightMode} />
      {isLightMode ? (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-[-20%] left-[-20%] w-[1000px] h-[1000px] bg-[#7D52FF]/10 rounded-full blur-[180px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[1000px] h-[1000px] bg-[#FFB659]/10 rounded-full blur-[180px]" />
        </div>
      ) : (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-[#7D52FF]/5 blur-[120px] pointer-events-none" />
      )}

      {/* Header Actions */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3 py-1.5 border transition-all duration-300 text-[10px] uppercase tracking-widest font-bold ${
            isLightMode 
              ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-600 hover:text-black shadow-sm' 
              : 'border-white/10 bg-white/5 dark:bg-slate-900/5 hover:bg-white/10 dark:hover:bg-slate-900/10 text-white/60 hover:text-white'
          }`}
        >
          {isLightMode ? <Moon size={12} className="text-[#7D52FF]" /> : <Sun size={12} className="text-[#FFB659]" />}
          <span>{isLightMode ? 'DARK' : 'LIGHT'}</span>
        </motion.button>
        <button onClick={onCancel} className={`p-1.5 border rounded-sm transition-colors ${isLightMode ? 'text-slate-500 dark:text-slate-400 hover:text-black bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm' : 'text-white/60 hover:text-white bg-white/5 dark:bg-slate-900/5 border-white/10'}`}>
            <X size={16} />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl flex flex-col items-center z-10"
      >
        <div className={`w-full max-w-4xl px-12 py-6 mb-12 flex items-center justify-between relative overflow-hidden group border-t-2 border-[#7D52FF]/20 rounded-2xl shadow-2xl backdrop-blur-xl transition-colors duration-300 ${isLightMode ? 'bg-white/80 dark:bg-slate-900/80' : 'bg-[#0c0907]/90'}`}>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#7D52FF]/40 to-transparent" />
          
          <div className="flex gap-10 items-center">
            <div className="flex flex-col">
              <span className={`text-[8px] uppercase tracking-[0.4em] font-black mb-1 ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>Candidate</span>
              <span className={`text-xs font-black tracking-widest uppercase truncate max-w-[150px] ${isLightMode ? 'text-slate-800 dark:text-slate-200' : 'text-white'}`}>{userName}</span>
            </div>
            
            <div className={`w-px h-8 ${isLightMode ? 'bg-slate-200' : 'bg-white/5 dark:bg-slate-900/5'}`} />

            <div className="flex flex-col">
              <span className={`text-[8px] uppercase tracking-[0.4em] font-black mb-1 ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>Status</span>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#7D52FF] animate-pulse shadow-[0_0_8px_#7D52FF]" />
                <span className={`text-xs font-bold tracking-widest uppercase ${isLightMode ? 'text-slate-800 dark:text-slate-200' : 'text-white'}`}>Protocol Active</span>
              </div>
            </div>
          </div>

          <div className="flex gap-12 items-center">
            <div className="text-center">
              <span className={`text-[8px] uppercase tracking-[0.3em] font-bold block mb-1 ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>Timer</span>
              <span className={`text-2xl font-mono font-bold transition-colors ${timeLeft <= 10 ? 'text-[#FFB659] shadow-[0_0_8px_rgba(255,182,89,0.2)]' : (isLightMode ? 'text-slate-800 dark:text-slate-200' : 'text-white')}`}>
                {timeLeft.toString().padStart(2, '0')}<span className="text-[10px] ml-0.5 opacity-40">s</span>
              </span>
            </div>
            <div className={`w-px h-8 ${isLightMode ? 'bg-slate-200' : 'bg-white/5 dark:bg-slate-900/5'}`} />
            <div className="text-center">
              <span className={`text-[8px] uppercase tracking-[0.3em] font-bold block mb-1 ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>Velocity</span>
              <span className={`text-2xl font-mono font-bold ${isLightMode ? 'text-slate-800 dark:text-slate-200' : 'text-white'}`}>
                {metrics.wpm}<span className="text-[10px] ml-0.5 opacity-40">WPM</span>
              </span>
            </div>
            <div className={`w-px h-8 ${isLightMode ? 'bg-slate-200' : 'bg-white/5 dark:bg-slate-900/5'}`} />
            <div className="text-center">
              <span className={`text-[8px] uppercase tracking-[0.3em] font-bold block mb-1 ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>Precision</span>
              <span className={`text-2xl font-mono font-bold ${isLightMode ? 'text-slate-800 dark:text-slate-200' : 'text-white'}`}>
                {metrics.accuracy}<span className="text-[10px] ml-0.5 opacity-40">%</span>
              </span>
            </div>
          </div>
        </div>

        <div
          className={`relative w-full p-16 min-h-[400px] flex items-center justify-center cursor-text transition-all duration-700 rounded-2xl shadow-2xl backdrop-blur-xl border ${isLightMode ? 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-[#7D52FF]/30' : 'bg-[#0c0907]/90 border-white/5 hover:border-[#7D52FF]/20'} ${isFinished ? 'opacity-20 blur-xl scale-95 pointer-events-none' : ''}`}
          onClick={handleContainerClick}
        >
          <div className={`absolute top-0 left-0 w-full h-[2px] overflow-hidden rounded-t-2xl ${isLightMode ? 'bg-slate-200' : 'bg-white/5 dark:bg-slate-900/5'}`}>
            <motion.div 
              className="h-full bg-gradient-to-r from-[#7D52FF] via-[#D174FF] via-[#F23E70] to-[#FFB659] shadow-[0_0_10px_#7D52FF]"
              initial={{ width: 0 }}
              animate={{ width: `${(userInput.length / text.length) * 100}%` }}
              transition={{ ease: "linear" }}
            />
          </div>

          <input
            ref={inputRef}
            type="text"
            className="absolute opacity-0 pointer-events-none"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          <div className="text-3xl leading-[1.5] text-center max-w-[950px] select-none font-medium tracking-tight">
            {renderWords()}
          </div>

          <AnimatePresence>
            {!startTime && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 flex items-center justify-center rounded-2xl ${
                  isLightMode ? 'bg-white/35 dark:bg-slate-900/35 backdrop-blur-md' : 'bg-black/60 backdrop-blur-sm'
                } z-20 pointer-events-none transition-colors duration-300`}
              >
                <div className="flex flex-col items-center gap-6">
                  <motion.div
                    animate={{
                      scale: [1, 1.04, 1],
                      borderColor: isLightMode 
                        ? ["rgba(125, 82, 255, 0.3)", "rgba(125, 82, 255, 0.6)", "rgba(125, 82, 255, 0.3)"]
                        : ["rgba(255, 255, 255, 0.1)", "rgba(125, 82, 255, 0.4)", "rgba(255, 255, 255, 0.1)"]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`px-14 py-7 border uppercase tracking-[0.5em] text-[13px] font-black transition-all ${
                      isLightMode 
                        ? 'bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 shadow-lg' 
                        : 'bg-white/[0.02] dark:bg-slate-900/[0.02] text-white shadow-[0_0_20px_rgba(125,82,255,0.05)]'
                    }`}
                  >
                    Press Enter to Begin
                  </motion.div>
                  <p className={`text-[8px] uppercase tracking-[0.3em] font-bold ${
                    isLightMode ? 'text-slate-400' : 'text-white/20'
                  }`}>
                    Identity: {userName}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-16 flex flex-col items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setStartTime(null);
              setUserInput("");
              setTimeLeft(durationLimit);
              setIsFinished(false);
              setMetrics({ wpm: 0, accuracy: 100, errors: 0 });
              inputRef.current?.focus();
            }}
            className={`flex items-center gap-3 transition-all uppercase text-[10px] tracking-[0.4em] font-black group ${isLightMode ? 'text-slate-400 hover:text-slate-800 dark:text-slate-200' : 'text-white/40 hover:text-white'}`}
            tabIndex={-1}
          >
            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
            Reset Sequence
          </motion.button>
          
          <div className={`h-px w-32 bg-gradient-to-r from-transparent to-transparent ${isLightMode ? 'via-slate-300' : 'via-white/10'}`} />
          
          <p className={`text-[9px] uppercase tracking-[1em] font-bold ${isLightMode ? 'text-slate-300' : 'text-white/10'}`}>
            CP TYPE // ASSESSMENT ENGINE // V5.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LocalTypingTest;
