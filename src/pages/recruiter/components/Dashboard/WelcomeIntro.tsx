import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowRight, Quote, CheckCircle2, TrendingUp, Users, Briefcase, Clock, BarChart3, Building2, Zap, Globe, Shield, Heart, Eye, Coffee } from 'lucide-react';
import type { Application } from '@/types/application';
import type { Position } from '@/types';
import { ApplicationService } from '@/services/ApplicationService';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import { PositionService } from '@/services/PositionService';

interface WelcomeIntroProps {
    user: any;
    applications?: Application[];
    onClose: () => void;
}

/* ── Animated Counter ── */
function AnimatedCounter({ target, duration = 2, delay = 0, suffix = '' }: { target: number; duration?: number; delay?: number; suffix?: string }) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (v) => Math.round(v));
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        const controls = animate(count, target, {
            duration,
            delay,
            ease: [0.25, 0.46, 0.45, 0.94],
        });
        const unsub = rounded-none.on('change', (v) => setDisplay(v));
        return () => { controls.stop(); unsub(); };
    }, [target, duration, delay]);

    return <span>{display}{suffix}</span>;
}

/* ── Cozy Starry Cosmic Sky Background with Hyperspace Warp Speed ── */
function CosmicBackground({ isWarpSpeed }: { isWarpSpeed: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const warpFactorRef = useRef(1);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        // Generate stars/nodes
        const stars: { x: number; y: number; vx: number; vy: number; radius: number }[] = [];
        const numStars = 75;

        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.16, // Ultra-slow drift
                vy: (Math.random() - 0.5) * 0.16,
                radius: Math.random() * 1.6 + 0.6,
            });
        }

        const draw = () => {
            if (!ctx) return;

            // Draw deep space base radial gradient (only clear fully if not warp speeding to keep streak trails)
            if (isWarpSpeed) {
                warpFactorRef.current = Math.min(80, warpFactorRef.current * 1.12 + 0.45);
                ctx.fillStyle = 'rgba(3, 7, 18, 0.18)';
                ctx.fillRect(0, 0, width, height);
            } else {
                ctx.clearRect(0, 0, width, height);
                const radialGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height));
                radialGrad.addColorStop(0, '#0a142e');
                radialGrad.addColorStop(0.5, '#050b18');
                radialGrad.addColorStop(1, '#02050c');
                ctx.fillStyle = radialGrad;
                ctx.fillRect(0, 0, width, height);
            }

            // Draw nebulas (only if not warping to prevent render clutter)
            if (!isWarpSpeed) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                const nebulaGrad1 = ctx.createRadialGradient(width * 0.3, height * 0.3, 0, width * 0.3, height * 0.3, Math.min(width, height) * 0.4);
                nebulaGrad1.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
                nebulaGrad1.addColorStop(0.5, 'rgba(124, 58, 237, 0.03)');
                nebulaGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = nebulaGrad1;
                ctx.beginPath();
                ctx.arc(width * 0.3, height * 0.3, Math.min(width, height) * 0.4, 0, Math.PI * 2);
                ctx.fill();

                const nebulaGrad2 = ctx.createRadialGradient(width * 0.7, height * 0.7, 0, width * 0.7, height * 0.7, Math.min(width, height) * 0.45);
                nebulaGrad2.addColorStop(0, 'rgba(209, 52, 56, 0.06)');
                nebulaGrad2.addColorStop(0.6, 'rgba(225, 29, 72, 0.02)');
                nebulaGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = nebulaGrad2;
                ctx.beginPath();
                ctx.arc(width * 0.7, height * 0.7, Math.min(width, height) * 0.45, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Draw links (only if not warping)
            if (!isWarpSpeed) {
                ctx.lineWidth = 0.55;
                for (let i = 0; i < numStars; i++) {
                    for (let j = i + 1; j < numStars; j++) {
                        const dx = stars[i].x - stars[j].x;
                        const dy = stars[i].y - stars[j].y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 135) {
                            ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist / 135) * 0.06})`;
                            ctx.beginPath();
                            ctx.moveTo(stars[i].x, stars[i].y);
                            ctx.lineTo(stars[j].x, stars[j].y);
                            ctx.stroke();
                        }
                    }
                }
            }

            // Draw and update stars
            const centerX = width / 2;
            const centerY = height / 2;

            for (let i = 0; i < numStars; i++) {
                const s = stars[i];

                if (isWarpSpeed) {
                    // Warp outwards from center
                    const dx = s.x - centerX;
                    const dy = s.y - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                    // Draw line trail
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                    ctx.lineWidth = s.radius * 0.8;
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    
                    const warpForce = warpFactorRef.current * 1.5;
                    s.x += (dx / dist) * warpForce;
                    s.y += (dy / dist) * warpForce;
                    
                    ctx.lineTo(s.x, s.y);
                    ctx.stroke();

                    // Re-seed star at center if it flies off-screen
                    if (s.x < 0 || s.x > width || s.y < 0 || s.y > height) {
                        s.x = centerX + (Math.random() - 0.5) * 30;
                        s.y = centerY + (Math.random() - 0.5) * 30;
                        s.radius = Math.random() * 1.2 + 0.4;
                    }
                } else {
                    const pulse = Math.sin(Date.now() * 0.0018 + i) * 0.25 + 0.85;
                    const alpha = 0.4 + Math.sin(Date.now() * 0.0012 + i) * 0.35;

                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.radius * pulse, 0, Math.PI * 2);
                    ctx.fill();

                    s.x += s.vx;
                    s.y += s.vy;

                    // Boundary wrap
                    if (s.x < 0) s.x = width;
                    if (s.x > width) s.x = 0;
                    if (s.y < 0) s.y = height;
                    if (s.y > height) s.y = 0;
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isWarpSpeed]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
}

const QUOTES = [
    { text: "一期一会", translation: "Ichigo Ichie", meaning: "Treasure every encounter, for it will never recur.", culture: "Japanese Proverb" },
    { text: "千里之行，始於足下", translation: "Qiānlǐ zhī xíng, shǐyú zúxià", meaning: "A journey of a thousand miles begins with a single step.", culture: "Chinese Proverb" },
    { text: "티끌 모아 태산", translation: "Tikkeul moa taesan", meaning: "Gather dust to build a mountain. (Great things accumulate from small efforts.)", culture: "Korean Proverb" },
    { text: "Übung macht den Meister", translation: "Practice makes the master.", meaning: "Continuous practice leads to mastery.", culture: "German Proverb" },
    { text: "Семь раз отмерь, один раз отрежь", translation: "Sem' raz otmer', odin raz otrezh'", meaning: "Measure seven times, cut once. (Deliberate thoroughly before deciding.)", culture: "Russian Proverb" },
    { text: "Χαλεπά τα καλά", translation: "Khalepá tá kalá", meaning: "What is good is difficult. (Worthwhile targets require dedication.)", culture: "Ancient Greek Proverb" }
];

export function WelcomeIntro({ user, applications: initialApps, onClose }: WelcomeIntroProps) {
    const [apps, setApps] = useState<Application[]>(initialApps || []);
    const [accounts, setAccounts] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [phase, setPhase] = useState<'hero' | 'dashboard' | 'self-check'>('hero');
    const [heroReady, setHeroReady] = useState(false);
    const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
    const [activeStatIndex, setActiveStatIndex] = useState(0);
    const [progressCount, setProgressCount] = useState(1);
    const [activeMinutes, setActiveMinutes] = useState(0);

    // Warp state triggers cinematic closing animation
    const [isWarping, setIsWarping] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIndex(prev => (prev + 1) % QUOTES.length);
        }, 7000);
        return () => clearInterval(interval);
    }, []);

    // Track active session duration
    useEffect(() => {
        const userId = user?.id || 'default';
        const sessionKey = `workspace_session_start_${userId}`;
        
        const getLast4AMPHTime = () => {
            const now = new Date();
            const utc = now.getTime() + now.getTimezoneOffset() * 60000;
            const phNow = new Date(utc + (3600000 * 8));
            const phReset = new Date(phNow);
            phReset.setHours(4, 0, 0, 0);
            if (phNow.getTime() < phReset.getTime()) {
                phReset.setDate(phReset.getDate() - 1);
            }
            return phReset.getTime() - (3600000 * 8);
        };

        const lastReset = getLast4AMPHTime();
        let sessionStart = localStorage.getItem(sessionKey);
        
        // If session start does not exist or was set before the last 4 AM reset, refresh it
        if (!sessionStart || Number(sessionStart) < lastReset) {
            sessionStart = Date.now().toString();
            localStorage.setItem(sessionKey, sessionStart);
        }
        
        const updateMinutes = () => {
            const diffMs = Date.now() - Number(sessionStart);
            const diffMin = Math.max(1, Math.floor(diffMs / 60000));
            setActiveMinutes(diffMin);
        };
        
        updateMinutes();
        const timer = setInterval(updateMinutes, 15000); // update every 15s
        return () => clearInterval(timer);
    }, [user?.id]);

    useEffect(() => {
        if (phase === 'hero') {
            const interval = setInterval(() => {
                setProgressCount(prev => (prev === 10 ? 1 : prev + 1));
            }, 600);
            return () => clearInterval(interval);
        }
    }, [phase]);

    useEffect(() => {
        if (!initialApps) {
            ApplicationService.getAll().then(setApps).catch(console.error);
        }
    }, [initialApps]);

    useEffect(() => {
        DepartmentService.getAll().then(setAccounts).catch(console.error);
        PositionService.getAll().then(setPositions).catch(console.error);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setHeroReady(true), 300);
        return () => clearTimeout(t);
    }, []);

    const firstName = user?.full_name?.split(' ')[0] ?? 'Leader';
    const totalApps = apps.length;
    const hiredCount = apps.filter(a => a.current_status === 'HIRED').length;
    const inProcessCount = apps.filter(a => ['INITIAL_INTERVIEW', 'ASSESSMENT', 'FINAL_INTERVIEW'].includes(a.current_status)).length;
    const pendingCount = apps.filter(a => a.current_status === 'APPLIED').length;
    const declinedCount = apps.filter(a => a.current_status === 'DECLINED').length;
    const hireRate = totalApps > 0 ? Math.round((hiredCount / totalApps) * 100) : 0;

    const statsList = [
        { label: 'Total Pipeline', value: totalApps, icon: Users },
        { label: 'Hired', value: hiredCount, icon: CheckCircle2 },
        { label: 'In Process', value: inProcessCount, icon: Clock },
        { label: 'Pending Review', value: pendingCount, icon: BarChart3 },
        { label: 'Accounts', value: accounts.length, icon: Building2 },
    ];

    useEffect(() => {
        if (phase === 'hero') {
            const interval = setInterval(() => {
                setActiveStatIndex(prev => (prev + 1) % statsList.length);
            }, 3800);
            return () => clearInterval(interval);
        }
    }, [phase, statsList.length]);

    const funnelStages = [
        { label: 'Intake (Applied)', key: 'APPLIED', count: apps.filter(a => a.current_status === 'APPLIED').length, color: 'bg-slate-400' },
        { label: 'Initial Interview', key: 'INITIAL_INTERVIEW', count: apps.filter(a => a.current_status === 'INITIAL_INTERVIEW').length, color: 'bg-[#d13438]' },
        { label: 'Assessment Stage', key: 'ASSESSMENT', count: apps.filter(a => a.current_status === 'ASSESSMENT').length, color: 'bg-amber-500' },
        { label: 'Final Interview', key: 'FINAL_INTERVIEW', count: apps.filter(a => a.current_status === 'FINAL_INTERVIEW').length, color: 'bg-blue-600' },
        { label: 'Concluded Offers', key: 'HIRED', count: hiredCount, color: 'bg-emerald-600' }
    ];

    const maxStageCount = Math.max(...funnelStages.map(s => s.count), 1);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let funnelInsight = "System health: Stable. Distribution across all hiring stages is balanced.";
    if (pendingCount > totalApps * 0.4) {
        funnelInsight = "Pipeline warning: Large influx of unprocessed intake forms. Recommend dispatching recruiters to clear pending reviews.";
    } else if (inProcessCount > totalApps * 0.5) {
        funnelInsight = "High Activity: Intense interview coordination schedule detected. Ops validators should verify queue slots are open.";
    }

    // Handles the smooth hyperspace warp drive exit transition
    const handleProceed = () => {
        setIsWarping(true);
        setTimeout(() => {
            onClose();
        }, 3000);
    };

    return (
        <motion.div
            initial={{ opacity: 1 }}
            animate={isWarping ? { opacity: 0, scale: 1.15, filter: 'blur(10px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 3.0, ease: 'easeInOut' }}
            className={`fixed inset-0 z-[2147483647] flex flex-col select-none overflow-hidden transition-colors duration-500 ${
                phase === 'dashboard' ? 'bg-[#fafafa] text-surface-900' : 'bg-[#030712] text-slate-100'
            }`}
            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
        >
            {phase !== 'dashboard' && <CosmicBackground isWarpSpeed={isWarping} />}

            <AnimatePresence mode="wait">
                {phase === 'hero' ? (
                    /* ════════════════════════════════════════════
                       PHASE 1 — CINEMATIC SPACE WELCOME
                       ════════════════════════════════════════════ */
                    <motion.div
                        key="hero-phase"
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
                        transition={{ duration: 0.6 }}
                        className="flex-1 flex flex-col relative"
                    >
                        {/* Top bar */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={heroReady ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="flex items-center justify-between px-10 py-6 shrink-0 relative z-10"
                        >
                            <div />
                            <div className="flex items-center gap-6">
                                <div className="text-right hidden md:block">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{dateStr}</p>
                                    <p className="text-[10px] font-black text-slate-300">{timeStr}</p>
                                </div>
                                <button
                                    onClick={() => setPhase('self-check')}
                                    className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-[#d13438] transition-colors px-3 py-1.5 border border-slate-700/60 hover:border-[#d13438]/50 rounded-none bg-white/5 dark:bg-slate-900/5 backdrop-blur-xs"
                                >
                                    Skip →
                                </button>
                            </div>
                        </motion.div>

                        {/* Center hero */}
                        <div className="flex-1 flex items-center justify-center relative">
                            <div className="text-center max-w-2xl mx-auto px-6 relative z-10">
                                {/* Greeting badge */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                    animate={heroReady ? { opacity: 1, y: 0, scale: 1 } : {}}
                                    transition={{ delay: 0.4, duration: 0.7, type: 'spring', stiffness: 100 }}
                                    className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-[#d13438]/10 border border-[#d13438]/25 rounded-full mb-8"
                                >
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: 10 }).map((_, idx) => {
                                            const dotNum = idx + 1;
                                            const isActive = dotNum <= progressCount;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                                        isActive ? 'bg-[#ff4c4f] scale-110 shadow-[0_0_8px_rgba(255,76,79,0.8)]' : 'bg-slate-700 opacity-40'
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#ff4c4f] ml-1">
                                        DECK INDEX // 0{progressCount}
                                    </span>
                                </motion.div>

                                {/* Main heading */}
                                <motion.h1
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={heroReady ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-3"
                                >
                                    Welcome back,
                                </motion.h1>
                                <motion.h2
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={heroReady ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 0.75, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-8"
                                    style={{ color: '#ff4c4f' }}
                                >
                                    {firstName}.
                                </motion.h2>

                                 {/* Subtitle / Quote */}
                                 <motion.div
                                     initial={{ opacity: 0, y: 20 }}
                                     animate={heroReady ? { opacity: 1, y: 0 } : {}}
                                     transition={{ delay: 0.95, duration: 0.6 }}
                                     className="max-w-md mx-auto mb-10 text-center min-h-[85px] flex flex-col justify-center overflow-hidden"
                                 >
                                     <AnimatePresence mode="wait">
                                         <motion.div
                                             key={quoteIndex}
                                             initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                             animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                             exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                                             transition={{ duration: 0.4, ease: 'easeInOut' }}
                                         >
                                             <p className="text-lg font-black text-slate-100 tracking-wide">
                                                 {QUOTES[quoteIndex].text}
                                             </p>
                                             <p className="text-[10.5px] font-semibold text-slate-400 mt-1">
                                                 {QUOTES[quoteIndex].meaning}
                                             </p>
                                             <p className="text-[8px] font-black uppercase tracking-wider text-[#ff4c4f] mt-1.5">
                                                 — {QUOTES[quoteIndex].culture} ({QUOTES[quoteIndex].translation})
                                             </p>
                                         </motion.div>
                                     </AnimatePresence>
                                 </motion.div>

                                {/* CTA */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={heroReady ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 1.1, duration: 0.6 }}
                                    className="flex items-center justify-center gap-4"
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(209,52,56,0.3)' }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setPhase('dashboard')}
                                        className="px-10 py-3.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 dark:bg-slate-800/50 transition-all flex items-center gap-2.5 rounded-none shadow-xl"
                                    >
                                        View Dashboard Brief <ArrowRight size={13} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setPhase('self-check')}
                                        className="px-8 py-3.5 bg-transparent text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] border border-slate-700 hover:border-slate-500 transition-all rounded-none"
                                    >
                                        Go to Workspace
                                    </motion.button>
                                </motion.div>
                            </div>
                        </div>

                        {/* Bottom stats ticker carousel */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={heroReady ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: 1.3, duration: 0.6 }}
                            className="px-10 py-5 border-t border-white/10 flex flex-col items-center justify-center gap-2 shrink-0 bg-black/25 backdrop-blur-xs w-full"
                        >
                            <div className="h-10 overflow-hidden relative w-full max-w-[280px] flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeStatIndex}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.4 }}
                                        className="flex items-center gap-3 justify-center text-center cursor-pointer"
                                        onClick={() => setActiveStatIndex(prev => (prev + 1) % statsList.length)}
                                    >
                                        {React.createElement(statsList[activeStatIndex].icon, { size: 14, className: "text-slate-400 shrink-0" })}
                                        <div className="text-left">
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 leading-none">{statsList[activeStatIndex].label}</p>
                                            <p className="text-sm font-black text-white leading-none mt-1">
                                                <AnimatedCounter target={statsList[activeStatIndex].value} delay={0} duration={1} />
                                            </p>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Carousel Indicators / Dots */}
                            <div className="flex items-center gap-1.5 mt-1">
                                {statsList.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveStatIndex(i)}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeStatIndex ? 'bg-[#ff4c4f] w-3' : 'bg-slate-600'}`}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                ) : phase === 'dashboard' ? (
                    /* ════════════════════════════════════════════
                       PHASE 2 — LIGHT/WHITE COZY ANALYTICS BRIEF
                       ════════════════════════════════════════════ */
                    <motion.div
                        key="dashboard-phase"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex-1 flex flex-col overflow-y-auto"
                    >
                        {/* Sticky top bar */}
                        <div className="flex items-center justify-between px-10 py-4 border-b border-surface-200 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-[#d13438] rounded-none flex items-center justify-center text-white font-black text-[9px]">
                                    CP
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-900">Dashboard Brief</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setPhase('hero')}
                                    className="text-[9px] font-black uppercase tracking-widest text-surface-450 hover:text-surface-650 transition-colors px-3 py-1.5 border border-surface-200 hover:border-surface-300 rounded-none bg-white dark:bg-slate-900"
                                >
                                    ← Back
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-8 md:px-12 lg:px-16 space-y-8 max-w-[1600px] mx-auto w-full">

                            {/* KPI Cards */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.5 }}
                            >
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-1 h-5 bg-[#d13438] rounded-full" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-900">System Performance KPI</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {[
                                        { label: 'Total Pipeline', value: totalApps, icon: Users, color: 'text-surface-900', bg: 'bg-white dark:bg-slate-900', border: 'border-surface-200' },
                                        { label: 'Hired', value: hiredCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-200' },
                                        { label: 'In Process', value: inProcessCount, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-200' },
                                        { label: 'Pending Review', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-200' },
                                        { label: 'Declined', value: declinedCount, icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-200' },
                                        { label: 'Hire Rate', value: hireRate, icon: Zap, color: 'text-[#d13438]', bg: 'bg-red-50/50', border: 'border-red-200', suffix: '%' },
                                    ].map((kpi, i) => (
                                        <motion.div
                                            key={kpi.label}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
                                            className={`${kpi.bg} border ${kpi.border} p-4 rounded-none hover:shadow-xs transition-shadow`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <kpi.icon size={11} className="text-surface-400" />
                                                <p className="text-[8px] font-black uppercase tracking-wider text-surface-400">{kpi.label}</p>
                                            </div>
                                            <p className={`text-2xl font-black ${kpi.color} leading-none`}>
                                                <AnimatedCounter target={kpi.value} delay={0.3 + i * 0.08} duration={1.2} suffix={kpi.suffix || ''} />
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Candidate Hiring Funnel & Analytics */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="grid lg:grid-cols-12 gap-6"
                            >
                                <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-surface-200 p-6 rounded-none">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={14} className="text-[#d13438]" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-900">Conversion Funnel Stages</h3>
                                        </div>
                                        <span className="text-[8.5px] font-black text-surface-400 uppercase tracking-widest">Candidate intake flows</span>
                                    </div>

                                    <div className="space-y-4">
                                        {funnelStages.map((stage, idx) => {
                                            const pct = Math.round((stage.count / maxStageCount) * 100);
                                            const funnelConversion = totalApps > 0 ? Math.round((stage.count / totalApps) * 100) : 0;
                                            return (
                                                <div key={stage.label} className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-surface-600">
                                                        <span>{stage.label}</span>
                                                        <span className="text-surface-900">{stage.count} candidates <span className="text-surface-400 font-medium text-[9px]">({funnelConversion}%)</span></span>
                                                    </div>
                                                    <div className="w-full h-8 bg-surface-50 border border-surface-200 overflow-hidden relative flex items-center px-3 rounded-none-xs">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.max(4, pct)}%` }}
                                                            transition={{ delay: 0.3 + idx * 0.08, duration: 1, ease: 'easeOut' }}
                                                            className={`absolute top-0 bottom-0 left-0 ${stage.color} opacity-[0.88]`}
                                                        />
                                                        <span className="relative z-10 text-[9px] font-bold text-white uppercase mix-blend-difference drop-shadow-sm">
                                                            Stage conversion weight: {pct}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="lg:col-span-4 bg-surface-50 border border-surface-200 p-6 rounded-none flex flex-col justify-between">
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 size={14} className="text-[#d13438]" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-900">Pipeline Insights</h3>
                                        </div>
                                        
                                        <div className="p-4 bg-white dark:bg-slate-900 border border-surface-150 rounded-none">
                                            <p className="text-[8px] font-black text-[#d13438] uppercase tracking-widest mb-1.5">System Recommendation</p>
                                            <p className="text-[10.5px] font-medium leading-relaxed text-surface-600">
                                                {funnelInsight}
                                            </p>
                                        </div>

                                        <div className="space-y-2.5">
                                            <div className="flex justify-between items-center py-1.5 border-b border-surface-200">
                                                <span className="text-[10px] font-semibold text-surface-500 uppercase">Fulfillment Efficiency</span>
                                                <span className="text-xs font-black text-emerald-600">{hireRate}% Conversion</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5 border-b border-surface-200">
                                                <span className="text-[10px] font-semibold text-surface-500 uppercase">Process Velocity</span>
                                                <span className="text-xs font-black text-surface-900">Optimal (2.4 days)</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1.5">
                                                <span className="text-[10px] font-semibold text-surface-500 uppercase">Active Recruiter Slots</span>
                                                <span className="text-xs font-black text-blue-600">Fully Loaded</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-surface-200 text-left">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-surface-400 mb-1">Intelligent Quota Sync</p>
                                        <p className="text-[9.5px] font-medium text-surface-500 leading-snug">
                                            Recruitment projections are generated using local class history and historical operational capacities.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Active Accounts Showcase */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-5 bg-[#d13438] rounded-full" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-900">Active Accounts & Targets</h3>
                                        <span className="px-2 py-0.5 bg-surface-100 text-[8px] font-black text-surface-500 uppercase tracking-wider rounded-full">
                                            {accounts.length} Total Accounts
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {accounts.map((acc, index) => {
                                        const coverImage = acc.accountImageUrl || acc.accountImageData;
                                        const initials = (acc.name || '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

                                        const targetName = (acc.name || '').trim().toLowerCase();
                                        const deptQuotaPositions = positions.filter(p =>
                                            p.department?.trim()?.toLowerCase() === targetName &&
                                            (p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA') || p.title.includes('[INTERNAL]')) &&
                                            p.status === 'OPEN'
                                        );

                                        let totalQuota = 0;
                                        let totalHired = 0;
                                        deptQuotaPositions.forEach(p => {
                                            const quota = Number(p.hiring_quota) || 0;
                                            const manualHired = Number(p.manual_hired || p.manualHired || 0);
                                            const hired = (p.current_hired || 0) + manualHired;
                                            totalQuota += quota;
                                            totalHired += hired;
                                        });

                                        const progress = totalQuota > 0 ? (totalHired / totalQuota) * 100 : 0;
                                        const isClosing = totalQuota > 0 && progress >= 100;

                                        return (
                                            <motion.div
                                                key={acc.id}
                                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: 0.35 + index * 0.03, duration: 0.4, type: 'spring', stiffness: 120 }}
                                                whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}
                                                className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none overflow-hidden hover:border-[#d13438]/30 transition-all duration-300 group cursor-default flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="h-24 w-full bg-surface-50 border-b border-surface-150 flex items-center justify-center overflow-hidden relative shrink-0">
                                                        {coverImage ? (
                                                            <img
                                                                src={coverImage}
                                                                alt={acc.name}
                                                                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 bg-white dark:bg-slate-900"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-none bg-gradient-to-br from-surface-200 to-surface-300 flex items-center justify-center text-surface-500 font-black text-xs">
                                                                {initials}
                                                            </div>
                                                        )}
                                                        {totalQuota > 0 && (
                                                            <span className={`absolute top-2 right-2 px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider border rounded-none-xs shadow-3xs ${isClosing ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-primary-50 text-primary-700 border-primary-100'}`}>
                                                                {isClosing ? 'FILLED' : 'ACTIVE'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="p-4 pt-3 pb-2 text-left">
                                                        <h4 className="text-[11.5px] font-black text-surface-900 uppercase tracking-tight truncate">{acc.name}</h4>
                                                        {acc.head && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Shield size={8.5} className="text-surface-300 shrink-0" />
                                                                <p className="text-[8.5px] text-surface-400 font-semibold truncate">Lead: {acc.head}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-4 pt-0 border-t border-surface-50 bg-surface-50/40">
                                                    {totalQuota > 0 ? (
                                                        <div className="space-y-1.5 pt-2 text-left">
                                                            <div className="flex justify-between items-center text-[8.5px] font-black uppercase tracking-wider text-surface-500">
                                                                <span>{totalHired} / {totalQuota} Hires</span>
                                                                <span className={isClosing ? 'text-emerald-600' : 'text-primary-600'}>{Math.round(progress)}%</span>
                                                            </div>
                                                            <div className="w-full h-1 bg-surface-100 overflow-hidden rounded-full border border-surface-200">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(100, progress)}%` }}
                                                                    className={`h-full rounded-full ${isClosing ? 'bg-emerald-500' : 'bg-[#d13438]'}`}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="pt-2 text-left">
                                                            <p className="text-[8px] font-black text-surface-400 uppercase tracking-widest">No target set</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>

                            {/* System & Quote Footer */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="grid md:grid-cols-12 gap-3 pb-6"
                            >
                                <div className="md:col-span-5 bg-surface-900 text-white p-7 rounded-none relative overflow-hidden flex flex-col justify-center min-h-[145px]">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#d13438]/10 rounded-full blur-3xl pointer-events-none" />
                                    <Quote className="text-white/10 mb-4" size={28} />
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={quoteIndex}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.4 }}
                                        >
                                            <p className="text-[13px] font-black leading-relaxed text-white/90 relative z-10">
                                                {QUOTES[quoteIndex].text}
                                            </p>
                                            <p className="text-[10px] font-semibold text-white/60 relative z-10 mt-1">
                                                {QUOTES[quoteIndex].meaning}
                                            </p>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff4c4f] mt-3 relative z-10">
                                                — {QUOTES[quoteIndex].culture} ({QUOTES[quoteIndex].translation})
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <div className="md:col-span-4 bg-surface-50 border border-surface-200 p-6 rounded-none flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Globe size={12} className="text-surface-400" />
                                            <p className="text-[9px] font-black uppercase tracking-wider text-surface-400">System Status</p>
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Interview Room Systems', status: 'Operational' },
                                                { label: 'Queue Controllers', status: 'Active' },
                                                { label: 'Typing Test Module', status: 'Online' },
                                            ].map(item => (
                                                <div key={item.label} className="flex items-center justify-between">
                                                    <span className="text-[10px] font-semibold text-surface-600">{item.label}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        <span className="text-[9px] font-bold text-emerald-600">{item.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-3 bg-surface-50 border border-surface-200 p-6 rounded-none flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Briefcase size={12} className="text-surface-400" />
                                            <p className="text-[9px] font-black uppercase tracking-wider text-surface-400">Session Info</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-wider text-surface-400 mb-0.5">Logged in as</p>
                                                <p className="text-[11px] font-black text-surface-900">{user?.full_name || 'User'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-wider text-surface-400 mb-0.5">Role</p>
                                                <p className="text-[11px] font-bold text-surface-700 uppercase">{user?.role?.replace(/_/g, ' ') || 'Staff'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-wider text-surface-400 mb-0.5">Date</p>
                                                <p className="text-[10px] font-semibold text-surface-600">{dateStr}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Sticky bottom CTA */}
                        <div className="px-10 py-4 border-t border-surface-200 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between shrink-0 sticky bottom-0 z-20">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Ready when you are, {firstName}.
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(209,52,56,0.3)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setPhase('self-check')}
                                className="px-8 py-2.5 bg-[#d13438] text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-red-700 transition-all rounded-none flex items-center gap-2 shadow-lg"
                            >
                                Enter the Workspace <ArrowRight size={12} />
                            </motion.button>
                        </div>
                    </motion.div>
                ) : (
                    /* ════════════════════════════════════════════
                       PHASE 3 — MINDFULNESS COZY SELF-CARE PORTAL
                       ════════════════════════════════════════════ */
                    <motion.div
                        key="self-check-phase"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.5 }}
                        className="flex-1 flex flex-col justify-center items-center p-8 relative"
                    >
                        <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900/50 to-slate-950/60 border border-white/10 backdrop-blur-2xl rounded-none p-10 md:p-12 shadow-[0_24px_60px_rgba(0,0,0,0.4)] text-center space-y-9 relative">
                            {/* Gradient accent line */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff4c4f] to-transparent rounded-none-t-2xl" />

                            <div className="space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#ff4c4f] drop-shadow-sm">
                                    ✦ Cozy Wellness Check ✦
                                </p>
                                <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                                    Pace yourself today ☕
                                </h2>
                                <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                                    Before launching into today's recruitment queue, take a brief moment to check in. Operational success starts with your well-being.
                                </p>
                            </div>

                            {/* Self-Care Cozy Checklist */}
                            <div className="flex flex-col gap-4 py-6 px-4 md:px-8 border-y border-white/5 text-left">
                                {[
                                    { 
                                        title: `Active Screen Time ⏱️`, 
                                        text: `You've been active for ${activeMinutes} minutes this session. ${activeMinutes > 45 ? "Time for a quick stretch! 🚶‍♂️" : "Pace looks great, keep it up! 🌟"}`, 
                                        icon: Clock, 
                                        color: 'text-amber-400', 
                                        iconBg: 'bg-amber-500/10' 
                                    },
                                    { 
                                        title: 'Stay Hydrated 💧', 
                                        text: `Keep a glass of water nearby. Sip count check: recommended ${Math.max(1, Math.floor(activeMinutes / 30) + 1)} cups so far! 🥤`, 
                                        icon: Coffee, 
                                        color: 'text-blue-400', 
                                        iconBg: 'bg-blue-500/10' 
                                    },
                                    { 
                                        title: 'Protect Your Eyes 👁️', 
                                        text: 'Follow the 20-20-20 rule. Rest your vision by looking away from the screen. 💆‍♀️', 
                                        icon: Eye, 
                                        color: 'text-emerald-400', 
                                        iconBg: 'bg-emerald-500/10' 
                                    }
                                ].map((item) => (
                                    <div 
                                        key={item.title} 
                                        className="flex items-center gap-4 bg-white/[0.02] dark:bg-slate-900/[0.02] border border-white/5 p-4 rounded-none hover:bg-white/[0.04] dark:hover:bg-slate-900/[0.04] hover:border-white/10 transition-all duration-300 group"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${item.iconBg}`}>
                                            <item.icon size={18} className={item.color} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-200">{item.title}</p>
                                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Proceed Launcher */}
                            <div className="pt-2 flex justify-between items-center gap-4 relative z-10">
                                <button
                                    onClick={() => setPhase('dashboard')}
                                    className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                                >
                                    ← Review Brief
                                </button>

                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(255,76,79,0.45)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleProceed}
                                    className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-[#ff4c4f] text-white hover:bg-[#e1383b] shadow-lg cursor-pointer rounded-full flex items-center gap-2 border border-transparent transition-all"
                                >
                                    Proceed to Workspace <ArrowRight size={12} />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
