import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Send, X, Layers, AlertCircle, Check } from 'lucide-react';
import type { Application } from '@/types/application';
import { splitReprofileAccounts } from '@/utils/reprofileQueue';
import { cn } from '@/utils/formatters';

interface ReprofilePromptModalProps {
    app: Application | null;
    previousAccount: string;
    newAccount: string;
    onClose: () => void;
    onConfirm: (activeAccount: string) => void;
}

export function ReprofilePromptModal({
    app,
    previousAccount,
    newAccount,
    onClose,
    onConfirm
}: ReprofilePromptModalProps) {
    const accounts = splitReprofileAccounts(newAccount);
    const [activeAccount, setActiveAccount] = React.useState('');
    const waitingAccounts = accounts.filter(account => account !== activeAccount);

    React.useEffect(() => {
        setActiveAccount('');
    }, [app?.id, newAccount]);

    if (!app) return null;

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            >
                {/* Header with gradient pattern */}
                <div className="relative px-6 py-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white flex items-start justify-between">
                    <div className="flex items-center gap-3.5 z-10">
                        <div className="w-11 h-11 bg-white/10 backdrop-blur-md text-emerald-400 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                            <Layers size={20} className="animate-pulse" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-base font-black tracking-tight uppercase">Move to Reprofile</h2>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">Applicant: <span className="text-white font-bold">{app.applicant_name}</span></p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all z-10"
                    >
                        <X size={16} />
                    </button>
                    {/* Glowing decorative sphere */}
                    <div className="absolute -right-10 -top-10 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
                </div>

                <div className="p-6 space-y-6">
                    {/* Flow Transition */}
                    <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-5 space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pipeline Redirect</span>
                        
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-left">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Previous Account</span>
                                <span className="text-xs font-black text-rose-600 uppercase tracking-wide truncate block">{previousAccount || 'Unassigned'}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                <ArrowRight size={14} />
                            </div>
                            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-left">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Next Options</span>
                                <span className="text-xs font-black text-emerald-600 uppercase tracking-wide truncate block">{accounts.length} Account{accounts.length === 1 ? '' : 's'}</span>
                            </div>
                        </div>

                        {/* Account Selector */}
                        <div className="pt-2 text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2.5">
                                Select Primary Target Account (Goes First)
                            </label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {accounts.map(account => {
                                    const isActive = activeAccount === account;
                                    return (
                                        <button
                                            key={account}
                                            type="button"
                                            onClick={() => setActiveAccount(account)}
                                            className={cn(
                                                "px-4 py-3 rounded-xl border text-[11px] font-black uppercase transition-all flex items-center justify-between gap-2 text-left shadow-sm",
                                                isActive 
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            )}
                                        >
                                            <span className="truncate">{account}</span>
                                            {isActive && (
                                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                                    <Check size={10} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <AnimatePresence>
                            {activeAccount && waitingAccounts.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pt-2"
                                >
                                    <div className="bg-slate-100/80 rounded-lg p-3 text-[10px] text-slate-600 font-medium text-left border border-slate-200/50">
                                        <span className="font-extrabold text-slate-700 uppercase tracking-wider block mb-0.5">Secondary Deferral Order:</span>
                                        {waitingAccounts.join(' → ')} (will remain waiting in queue)
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Hint / Explanation */}
                    <div className="flex items-start gap-2.5 text-left bg-blue-50/50 border border-blue-100 rounded-xl p-3.5">
                        <AlertCircle size={14} className="text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed text-blue-800 font-medium">
                            This action transfers the candidate to the specialized Reprofile queue, prioritizing the selected account first. The remaining accounts stay parked in waiting status.
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!activeAccount}
                            onClick={() => onConfirm(activeAccount)}
                            className="flex-[1.5] px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-250 active:scale-95"
                        >
                            Move to Reprofile <Send size={13} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
