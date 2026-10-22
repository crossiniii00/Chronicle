import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'INITIALIZING ANALYTICS WORKSPACE...' }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-500 bg-[#f8f9fa]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6)_0%,rgba(248,249,250,1)_100%)] pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Icon / Logo with drop shadow box */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="bg-[#0A0F1D] p-5 rounded-3xl border border-indigo-500/30 shadow-[0_0_60px_rgba(99,102,241,0.25)] mb-10 relative"
        >
          <img
            src="/chronicle-mark.svg"
            alt="Chronicle"
            className="w-16 h-16 object-contain"
          />
        </motion.div>

        {/* Spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" strokeWidth={3} />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <h1 className="text-[13px] font-black text-slate-800 dark:text-slate-100 tracking-[0.3em] uppercase mb-2">
            CHRONICLE
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
            {message}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
