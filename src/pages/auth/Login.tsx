import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import RotatingText from '@/components/common/RotatingText';
import { PageTransition } from '@/components/common/PageTransition';
import { SlideshowBackground } from '@/components/common/SlideshowBackground';

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
                            className="flex items-center gap-4 cursor-pointer group transition-all"
                        >
                            <div className="p-1.5 bg-white rounded-lg shadow-xl shadow-white/5 group-hover:bg-white/90 transition-colors">
                                <img
                                    src="/contactpoint-logo.png?v=3"
                                    alt="CP360"
                                    className="w-8 h-8 object-contain"
                                />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-white font-black text-[11px] uppercase leading-tight">
                                    <span className="tracking-widest">CONTACTPOINT</span> <span className="tracking-[0.35em]">360</span>
                                </h1>
                                <span className="text-white/30 font-bold text-[8px] tracking-[0.5em] uppercase">
                                    RECRUITMENT
                                </span>
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
                                        CONTACTPOINT 360 RECRUITMENT HUB
                                    </p>

                                    <motion.h1
                                        className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-8 flex flex-col md:flex-row items-center justify-center gap-x-4"
                                    >
                                        <span className="whitespace-nowrap">Where Talent Meets</span>
                                        <RotatingText
                                            texts={['Opportunity', 'Potential', 'Growth']}
                                            mainClassName="px-6 py-2 bg-[#FF0000] text-white rounded-2xl overflow-hidden justify-center shadow-[0_10px_30px_rgba(255,0,0,0.3)]"
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
                                    initial={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" }}
                                    transition={{
                                        type: "spring",
                                        damping: 25,
                                        stiffness: 200,
                                        mass: 1
                                    }}
                                    className="w-full max-w-[440px] z-50 px-4"
                                >
                                    <div className="bg-white p-11 shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-[4px] text-left relative min-h-[360px] flex flex-col border border-white/10">
                                        <div className="flex items-center gap-2.5 mb-6">
                                            <img
                                                src="/contactpoint-logo.png?v=3"
                                                alt="ContactPoint 360"
                                                className="w-6 h-6 object-contain"
                                            />
                                            <span className="text-[17px] font-semibold text-[#5e5e5e] tracking-tight">
                                                ContactPoint 360
                                            </span>
                                        </div>

                                        <h1 className="text-2xl font-bold text-[#1b1b1b] mb-2">
                                            Sign in
                                        </h1>

                                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                                            <div className="space-y-4 mb-4">
                                                {error && (
                                                    <div className="text-[13px] text-[#e81123] mb-2 animate-in fade-in slide-in-from-top-1">
                                                        {error}
                                                    </div>
                                                )}

                                                <div className="space-y-4">
                                                    <div className="relative group">
                                                        <input
                                                            type="email"
                                                            value={email}
                                                            onChange={e => setEmail(e.target.value)}
                                                            className="w-full border-b border-[#e5e5e5] focus:border-brand-red py-3 text-[15px] outline-none transition-all placeholder:text-[#999999] bg-transparent"
                                                            placeholder="Username"
                                                        />
                                                        <div className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-brand-red transition-all duration-300 group-focus-within:w-full" />
                                                    </div>

                                                    <div className="relative group">
                                                        <input
                                                            type={showPw ? 'text' : 'password'}
                                                            value={password}
                                                            onChange={e => setPassword(e.target.value)}
                                                            className="w-full border-b border-[#e5e5e5] focus:border-brand-red py-3 text-[15px] outline-none transition-all placeholder:text-[#999999] bg-transparent"
                                                            placeholder="Password"
                                                        />
                                                        <div className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-brand-red transition-all duration-300 group-focus-within:w-full" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPw(!showPw)}
                                                            className="absolute right-0 top-1/2 -translate-y-1/2 text-[#999999] hover:text-brand-red transition-colors p-1"
                                                        >
                                                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-auto flex items-center justify-end pt-6">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    type="submit"
                                                    disabled={loading}
                                                    className="px-10 py-2.5 text-[15px] font-bold bg-brand-red hover:bg-red-700 text-white disabled:opacity-50 transition-all rounded-[2px] shadow-lg shadow-red-500/20"
                                                >
                                                    {loading ? 'Processing...' : 'Log in'}
                                                </motion.button>
                                            </div>
                                        </form>
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
