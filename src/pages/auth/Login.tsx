import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import RotatingText from '@/components/common/RotatingText';
import { PageTransition } from '@/components/common/PageTransition';
import { SlideshowBackground } from '@/components/common/SlideshowBackground';
import { DEMO_CREDENTIALS } from '@/constants/demoCredentials';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const loading = false;
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setTimeout(() => {
            if (params.get('auth') === 'true') {
                setShowAuth(true);
            } else {
                setShowAuth(false);
            }
        }, 0);
    }, [location.search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Account credentials required.');
            return;
        }

        const result = await login(email.trim(), password);

        if (result.success) {
            const user = useAuthStore.getState().user!;
            const roleHome: Record<string, string> = {
                applicant: '/applicant/dashboard',
                recruiter_interviewer: '/recruiter/dashboard',
                recruiter_s: '/recruiter/dashboard',
                recruiter_a: '/recruiter/dashboard',
                recruiter_jc: '/recruiter/dashboard',
                recruiter_sy: '/recruiter/dashboard',
                ops_validator: '/final-interview/dashboard',
                admin: '/admin/dashboard',
                recruiter: '/recruiter/dashboard',
                guest_interviewer: '/final-interview/dashboard',
            };
            navigate(roleHome[user.role] || '/');
        } else {
            setError(result.message);
        }
    };


    return (
        <PageTransition>
            <div className="w-full bg-black min-h-screen overflow-x-hidden relative">
                <SlideshowBackground />
                <div
                    className="min-h-screen w-full text-white select-none relative z-10 overflow-hidden"
                    style={{
                        fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif"
                    }}
                >

                    <header className="absolute top-0 left-0 w-full z-30 flex items-center justify-between px-10 py-8">
                        <div
                            onClick={() => setShowAuth(false)}
                            className="flex items-center gap-3 cursor-pointer group transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-white text-black font-black flex items-center justify-center text-sm shadow-xl shadow-white/5">
                                C
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-white font-black text-sm uppercase leading-tight tracking-tight">
                                    CHRONICLE<span className="text-neutral-400">CRM</span>
                                </h1>
                            </div>
                        </div>

                        <nav className="hidden md:flex items-center gap-8" onMouseLeave={() => setHoveredTab(null)}>
                            {['HOME', 'JOB POSTINGS', 'SIGN IN'].map(item => {
                                const params = new URLSearchParams(window.location.search);
                                const isAuth = params.get('auth') === 'true';
                                const isHome = !isAuth && !showAuth;

                                let isActive = false;
                                if (item === 'HOME') isActive = isHome;
                                if (item === 'SIGN IN') isActive = isAuth || showAuth;

                                return (
                                    <div key={item} className="relative flex items-center justify-center">
                                        <button
                                            onMouseEnter={() => setHoveredTab(item)}
                                            onClick={() => {
                                                if (item === 'HOME') navigate('/login');
                                                if (item === 'JOB POSTINGS') navigate('/jobs');
                                                if (item === 'SIGN IN') navigate('/login?auth=true');
                                            }}
                                            className={`text-[10px] font-bold tracking-[0.15em] transition-opacity cursor-pointer uppercase py-1 ${isActive || hoveredTab === item ? 'text-white' : 'text-white/50'
                                                }`}
                                        >
                                            {item}
                                        </button>
                                        {(hoveredTab === item || (hoveredTab === null && isActive)) && (
                                            <motion.div
                                                layoutId="login-nav-underline"
                                                className="absolute left-0 right-0 h-[2px] bg-white -bottom-1"
                                                transition={{ duration: 0.3, type: "spring", stiffness: 350, damping: 30 }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    </header>

                    <div className="absolute right-0 top-24 z-30 flex flex-col gap-[1px]">
                        <button className="w-8 h-8 bg-black/60 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                            <span className="text-[10px]">?</span>
                        </button>
                        <button className="w-8 h-8 bg-black/60 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                            <span className="text-[10px]">?</span>
                        </button>
                    </div>

                    <main className="relative z-20 min-h-screen flex flex-col items-center justify-center text-center px-4">
                        <AnimatePresence mode="wait">
                            {!showAuth ? (
                                <motion.div
                                    key="home-content"
                                    initial={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, scale: 0.95, filter: "blur(20px)", y: -20 }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex flex-col items-center justify-center"
                                >
                                    <p className="text-[10px] font-bold tracking-[0.3em] text-white/50 uppercase mb-4">
                                        CHRONICLECRM TALENT PLATFORM
                                    </p>

                                    <motion.h1
                                        className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-8 flex flex-col md:flex-row items-center justify-center gap-x-4"
                                    >
                                        <span className="whitespace-nowrap">Where Talent Meets</span>
                                        <RotatingText
                                            texts={['Opportunity', 'Potential', 'Growth']}
                                            mainClassName="px-6 py-2 bg-white text-black rounded-2xl overflow-hidden justify-center shadow-[0_10px_30px_rgba(255,255,255,0.2)] font-black"
                                            staggerFrom={"last"}
                                            initial={{ y: "100%", opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: "-100%", opacity: 0 }}
                                            staggerDuration={0.025}
                                            splitLevelClassName="overflow-hidden"
                                            transition={{ type: "spring", damping: 20, stiffness: 120, mass: 0.8 }}
                                            rotationInterval={3000}
                                        />
                                    </motion.h1>

                                    <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-12 font-medium">
                                        Explore open roles, apply seamlessly, and take the next step in your career.
                                    </p>

                                    <div className="flex items-center justify-center gap-5">
                                        <motion.button
                                            whileHover={{
                                                scale: 1.05,
                                                boxShadow: "0 0 20px rgba(255,255,255,0.3)",
                                                backgroundColor: "rgba(255,255,255,1)",
                                                color: "#000"
                                            }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={async () => {
                                                await new Promise(r => setTimeout(r, 100));
                                                navigate('/jobs');
                                            }}
                                            className="bg-transparent text-white px-12 py-4 text-[11px] font-black tracking-[0.25em] uppercase border border-white transition-all shadow-2xl relative overflow-hidden group"
                                        >
                                            <motion.span
                                                initial={{ x: '-100%' }}
                                                whileHover={{ x: '100%' }}
                                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                                className="absolute inset-0 bg-white/20 skew-x-12"
                                            />
                                            <span className="relative z-10">APPLY NOW</span>
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="auth-form"
                                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.96 }}
                                    transition={{
                                        type: "spring",
                                        damping: 26,
                                        stiffness: 240,
                                        mass: 0.9
                                    }}
                                    className="w-full max-w-[460px] z-50 px-4"
                                >
                                    <div className="bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-neutral-200/80 text-left overflow-hidden">
                                        {/* Card Header */}
                                        <div className="px-8 pt-8 pb-5 border-b border-neutral-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-black text-white font-black flex items-center justify-center text-xs tracking-tight shadow-md">
                                                    C
                                                </div>
                                                <div>
                                                    <span className="text-[15px] font-black text-black tracking-tight block leading-tight">
                                                        Chronicle<span className="text-neutral-400 font-semibold">CRM</span>
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                                                        Sign in to portal
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowAuth(false)}
                                                className="text-xs font-semibold text-neutral-400 hover:text-black transition-colors"
                                            >
                                                Back
                                            </button>
                                        </div>

                                        <div className="p-8">
                                            {/* Demo Credentials Quick Switcher */}
                                            <div className="mb-6">
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                                                        Quick Demo Access
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400">Click to fill</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/60">
                                                    {DEMO_CREDENTIALS.map(cred => {
                                                        const isSelected = email === cred.email;
                                                        return (
                                                            <button
                                                                key={cred.role}
                                                                type="button"
                                                                onClick={() => {
                                                                    setEmail(cred.email);
                                                                    setPassword(cred.password);
                                                                    setError(null);
                                                                }}
                                                                className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center transition-all ${
                                                                    isSelected
                                                                        ? 'bg-black text-white shadow-sm'
                                                                        : 'text-neutral-600 hover:text-black hover:bg-white/60'
                                                                }`}
                                                            >
                                                                {cred.role}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Form */}
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                {error && (
                                                    <div className="text-[12px] font-bold text-red-600 bg-red-50 border border-red-200 py-2.5 px-3.5 rounded-lg">
                                                        {error}
                                                    </div>
                                                )}

                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 block">
                                                        Username or Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        className="w-full px-3.5 py-3 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-[14px] font-medium outline-none focus:border-black focus:bg-white focus:ring-1 focus:ring-black transition-all placeholder:text-neutral-400"
                                                        placeholder="name@company.com"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 block">
                                                            Password
                                                        </label>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type={showPw ? 'text' : 'password'}
                                                            value={password}
                                                            onChange={e => setPassword(e.target.value)}
                                                            className="w-full px-3.5 py-3 pr-10 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-[14px] font-medium outline-none focus:border-black focus:bg-white focus:ring-1 focus:ring-black transition-all placeholder:text-neutral-400"
                                                            placeholder="••••••••"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPw(!showPw)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors p-1"
                                                            tabIndex={-1}
                                                        >
                                                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="pt-2">
                                                    <motion.button
                                                        whileHover={{ scale: 1.01 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full py-3.5 text-[13px] font-black uppercase tracking-widest bg-black hover:bg-neutral-800 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {loading ? 'Processing...' : 'Sign In'}
                                                    </motion.button>
                                                </div>
                                            </form>
                                        </div>

                                        {/* Card Footer */}
                                        <div className="px-8 py-3.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                                            <span>Secure Authentication</span>
                                            <span className="font-semibold text-neutral-500">v8.2</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </PageTransition>
    );
}
