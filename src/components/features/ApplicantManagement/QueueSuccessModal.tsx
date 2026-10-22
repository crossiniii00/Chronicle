import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface QueueSuccessModalProps {
    showQueueSuccess: {
        name: string;
        queueType: 'INITIAL' | 'FINAL';
    } | null;
    onStay: () => void;
    onGoToConsole: () => void;
}

export function QueueSuccessModal({
    showQueueSuccess, onStay, onGoToConsole
}: QueueSuccessModalProps) {
    if (!showQueueSuccess) return null;

    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onStay}
                className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-surface-200 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)] rounded-sm overflow-hidden"
            >
                <div className="p-8 space-y-6">
                    <div className="space-y-3 text-center">
                        <div className="w-12 h-12 bg-emerald-50 rounded-sm flex items-center justify-center mx-auto border border-emerald-100 mb-1">
                            <CheckCircle2 size={22} className="text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em]">
                            Added to queue
                        </h2>
                        <p className="text-[#605e5c] dark:text-slate-400 font-medium text-[12px] leading-relaxed">
                            <span className="text-[#0078d4] font-semibold">{showQueueSuccess.name}</span> has been added to the {showQueueSuccess.queueType.toLowerCase()} interview queue.
                        </p>
                    </div>

                    <div className="p-3.5 bg-blue-50 border border-blue-200/60 rounded-sm flex items-start gap-2.5">
                        <ArrowRight size={14} className="text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[11.5px] font-medium text-blue-900 leading-relaxed tracking-[-0.005em]">
                            Go to the queue console now to manage the line and call the next candidate?
                        </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onStay}
                            className="flex-1 h-9 px-4 text-[11.5px] font-medium tracking-[-0.005em] text-[#605e5c] dark:text-slate-400 border border-surface-200 rounded-sm hover:bg-[#f3f2f1] transition-colors"
                        >
                            Stay here
                        </button>
                        <button
                            onClick={onGoToConsole}
                            className="flex-[2] h-9 px-4 bg-[#0078d4] text-white text-[11.5px] font-medium tracking-[-0.005em] rounded-sm shadow-sm hover:bg-[#005a9e] transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            Go to console
                            <ArrowRight size={12} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
