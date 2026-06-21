import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface BulkDeleteProgressProps {
    isVisible: boolean;
    progress: number;
    totalCount: number;
}

export function BulkDeleteProgress({ isVisible, progress, totalCount }: BulkDeleteProgressProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white w-full max-w-md p-8 shadow-2xl border border-surface-200 flex flex-col items-center text-center"
                    >
                        <div className="w-16 h-16 bg-red-50 text-red-600 flex items-center justify-center mb-6 animate-pulse">
                            <Trash2 size={32} />
                        </div>
                        
                        <h3 className="text-lg font-black text-surface-900 uppercase tracking-tighter mb-2">
                            PROTOCOL: MASS DATA PURGE
                        </h3>
                        <p className="text-[11px] font-bold text-surface-500 uppercase tracking-widest mb-8">
                            Eliminating {totalCount} records from registry
                        </p>

                        <div className="w-full bg-surface-100 h-1.5 overflow-hidden mb-3">
                            <motion.div 
                                className="h-full bg-red-600"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        
                        <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest text-surface-400">
                            <span>Processing Sequence</span>
                            <span className="text-red-600">{progress}% Complete</span>
                        </div>

                        <p className="mt-8 text-[9px] font-bold text-surface-400 uppercase tracking-[0.2em] animate-pulse">
                            Do not close this window until sequence completes
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
