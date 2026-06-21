import React, { createContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingContextType {
    isLoading: boolean;
    loadingMessage: string;
    showLoading: (message?: string) => void;
    hideLoading: () => void;
    withLoading: <T>(fn: () => Promise<T>, message?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>({
    isLoading: false,
    loadingMessage: '',
    showLoading: () => { },
    hideLoading: () => { },
    withLoading: async (fn) => fn(),
});

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Processing...');

    const showLoading = useCallback((message = 'Processing...') => {
        setLoadingMessage(message);
        setIsLoading(true);
    }, []);

    const hideLoading = useCallback(() => {
        setIsLoading(false);
    }, []);

    const withLoading = useCallback(async <T,>(fn: () => Promise<T>, message = 'Processing...') => {
        setLoadingMessage(message);
        setIsLoading(true);
        try {
            const result = await fn();
            return result;
        } finally {
            // Small delay so the user sees the completion
            await new Promise(r => setTimeout(r, 350));
            setIsLoading(false);
        }
    }, []);

    return (
        <LoadingContext.Provider value={{ isLoading, loadingMessage, showLoading, hideLoading, withLoading }}>
            {children}
            <AnimatePresence>
                {isLoading && <LoadingOverlay message={loadingMessage} />}
            </AnimatePresence>
        </LoadingContext.Provider>
    );
}

export { LoadingContext };

function LoadingOverlay({ message }: { message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-surface-900/20 backdrop-blur-[2px]"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.15)] border border-surface-200 px-8 py-6 flex items-center gap-4 min-w-[240px]"
            >
                <div className="relative w-8 h-8 shrink-0">
                    <div className="absolute inset-0 border-[2.5px] border-surface-200 rounded-full" />
                    <div className="absolute inset-0 border-[2.5px] border-brand-red border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                    <p className="text-sm font-bold text-surface-800 tracking-tight">{message}</p>
                    <p className="text-[10px] font-semibold text-surface-400 mt-0.5 tracking-wide">Please wait...</p>
                </div>
            </motion.div>
        </motion.div>
    );
}
