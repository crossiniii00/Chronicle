import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, MessageSquare, ArrowRight, Building2 } from 'lucide-react';

interface RecruiterSpotlightData {
    id: string;
    full_name: string;
    role?: string;
    avatar_data?: string | null;
    hires: number;
    active: number;
    accolade: string;
}

interface AccountHighlightData {
    id: string;
    name: string;
    head: string;
    budgetCode: string;
    accountImageUrl: string | null;
    hiring_quota: number;
    hired: number;
    active: number;
}

interface DashboardSpotlightProps {
    currentRecruiter: RecruiterSpotlightData | null;
    currentAccount: AccountHighlightData | null;
}

export const DashboardSpotlight: React.FC<DashboardSpotlightProps> = ({
    currentRecruiter,
    currentAccount
}) => {
    return (
        <div className="grid md:grid-cols-3 gap-6">
            {/* Recruiter Spotlight */}
            <div className="bg-gradient-to-br from-white via-amber-50/15 to-orange-50/5 border border-amber-200/60 rounded-xl p-8 shadow-premium flex flex-col justify-between min-h-[250px] relative overflow-hidden group hover:shadow-premium-hover transition-all duration-300">
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-200/10 rounded-full blur-3xl -z-10 group-hover:bg-amber-200/25 transition-colors duration-500" />
                
                <div className="flex items-center justify-between mb-4 z-10">
                    <h3 
                        className="text-xs text-surface-600 uppercase tracking-[0.15em] flex items-center gap-2"
                        style={{ fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 }}
                    >
                        <Sparkles size={14} className="text-amber-500 animate-pulse" /> Recruiter Spotlight
                    </h3>
                    {currentRecruiter && (
                        <span className="px-3 py-1 text-[8px] font-black uppercase bg-amber-50/80 border border-amber-200 text-amber-700 tracking-widest rounded-full shadow-sm">
                            {currentRecruiter.accolade}
                        </span>
                    )}
                </div>

                <div className="relative flex-1 z-10 flex items-center min-h-[120px]">
                    <AnimatePresence mode="wait">
                        {currentRecruiter && (
                            <motion.div
                                key={currentRecruiter.id}
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.25 }}
                                className="flex items-center gap-6 w-full"
                            >
                                <div className="p-1 bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-300 rounded-full shadow-xl shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 ring-4 ring-amber-400/20">
                                    <div className="w-20 h-20 rounded-full border-2 border-white bg-surface-50 flex items-center justify-center overflow-hidden shadow-inner">
                                        {currentRecruiter.avatar_data ? (
                                            <img src={currentRecruiter.avatar_data} alt={currentRecruiter.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-black text-surface-400 uppercase">
                                                {currentRecruiter.full_name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 text-left">
                                    <h4 
                                        className="text-xl text-surface-900 leading-snug tracking-tight truncate"
                                        style={{ fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 }}
                                    >
                                        {currentRecruiter.full_name}
                                    </h4>
                                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-0.5">
                                        {currentRecruiter.role?.replace(/_/g, ' ')}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="bg-amber-50/40 border border-amber-100/50 p-3 rounded-lg text-left shadow-sm">
                                            <p className="text-[8px] font-black text-amber-600 uppercase tracking-wider leading-none">Hires Placed</p>
                                            <p className="text-xl font-black text-amber-700 mt-1">{currentRecruiter.hires}</p>
                                        </div>
                                        <div className="bg-slate-50/50 border border-slate-200/50 p-3 rounded-lg text-left shadow-sm">
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-wider leading-none">Candidates</p>
                                            <p className="text-xl font-black text-slate-800 mt-1">{currentRecruiter.active}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Account Highlights */}
            <div className="bg-gradient-to-br from-white via-violet-50/15 to-indigo-50/5 border border-violet-200/60 rounded-xl p-8 shadow-premium flex flex-col justify-between min-h-[250px] relative overflow-hidden group hover:shadow-premium-hover transition-all duration-300">
                <div className="absolute top-0 right-0 w-36 h-36 bg-violet-200/10 rounded-full blur-3xl -z-10 group-hover:bg-violet-200/25 transition-colors duration-500" />

                <div className="flex items-center justify-between mb-4 z-10">
                    <h3 
                        className="text-xs text-surface-600 uppercase tracking-[0.15em] flex items-center gap-2"
                        style={{ fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 }}
                    >
                        <Target size={14} className="text-violet-600" /> Account Highlights
                    </h3>
                    <span className="px-3 py-1 text-[8px] font-black uppercase bg-violet-50/80 border border-violet-200 text-violet-700 tracking-widest rounded-full shadow-sm">
                        Client Metrics
                    </span>
                </div>

                <div className="relative flex-1 z-10 flex flex-col justify-center min-h-[120px]">
                    <AnimatePresence mode="wait">
                        {currentAccount && (
                            <motion.div
                                key={currentAccount.id}
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.25 }}
                                className="w-full"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-xl border border-violet-100 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xl p-2 group-hover:scale-105 group-hover:-rotate-3 transition-all duration-500 ring-4 ring-violet-500/10">
                                        {currentAccount.accountImageUrl ? (
                                            <img src={currentAccount.accountImageUrl} alt={currentAccount.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 size={32} className="text-violet-300" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 text-left">
                                        <h4 
                                            className="text-xl text-surface-900 leading-snug tracking-tight truncate uppercase"
                                            style={{ fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 }}
                                        >
                                            {currentAccount.name}
                                        </h4>
                                        <p className="text-[10px] font-medium text-surface-400 mt-1 flex flex-col gap-1">
                                            <span>Lead: <strong className="text-surface-700 font-semibold">{currentAccount.head}</strong></span>
                                            <span>Code: <strong className="text-surface-600 font-semibold">{currentAccount.budgetCode}</strong></span>
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <div className="flex justify-between items-end mb-1.5 text-[8px] font-black uppercase tracking-wider text-surface-400">
                                        <span>Hiring Target Progress ({currentAccount.hired} / {currentAccount.hiring_quota})</span>
                                        <span className="text-violet-700 font-black">{Math.round((currentAccount.hired / currentAccount.hiring_quota) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (currentAccount.hired / currentAccount.hiring_quota) * 100)}%` }}
                                            transition={{ duration: 0.8 }}
                                            className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Spotlight Topic - Forum Link */}
            <Link to="/recruiter/forums" className="bg-gradient-to-br from-white via-emerald-50/15 to-teal-50/5 border border-emerald-200/60 rounded-xl p-8 shadow-premium flex flex-col justify-between min-h-[250px] relative overflow-hidden group hover:shadow-premium-hover transition-all duration-300 cursor-pointer">
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-200/10 rounded-full blur-3xl -z-10 group-hover:bg-emerald-200/25 transition-colors duration-500" />

                <div className="flex items-center justify-between mb-4 z-10">
                    <h3 
                        className="text-xs text-surface-600 uppercase tracking-[0.15em] flex items-center gap-2"
                        style={{ fontFamily: 'var(--font-family-display)', fontStyle: 'italic', fontWeight: 500 }}
                    >
                        <MessageSquare size={14} className="text-emerald-600" /> Spotlight Topic
                    </h3>
                    <span className="px-3 py-1 text-[8px] font-black uppercase bg-emerald-50/80 border border-emerald-200 text-emerald-700 tracking-widest rounded-full shadow-sm">
                        Forum
                    </span>
                </div>

                <div className="relative flex-1 z-10 flex flex-col justify-center items-center text-center min-h-[120px]">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <MessageSquare size={28} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-surface-700">Join the Discussion</p>
                            <p className="text-[10px] text-surface-400 mt-1 font-medium">Share insights, ask questions, and collaborate with your team</p>
                        </div>
                        <div className="pt-2">
                            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-600 group-hover:text-emerald-700 transition-colors">
                                Go to Forum <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </div>
                    </motion.div>
                </div>
            </Link>
        </div>
    );
};
