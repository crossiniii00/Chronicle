import React, { useState, createContext, ReactNode, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
}

interface ToastContextValue {
    toast: (type: ToastType, title: string, message?: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
const COLORS = {
    success: 'border-green-500/40 bg-green-500/10',
    error: 'border-red-500/40 bg-red-500/10',
    warning: 'border-yellow-500/40 bg-yellow-500/10',
    info: 'border-blue-500/40 bg-blue-500/10',
};
const ICON_COLORS = { success: 'text-green-400', error: 'text-red-400', warning: 'text-yellow-400', info: 'text-blue-400' };

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const value = useMemo(() => ({
        toast: addToast,
        success: (t: string, m?: string) => addToast('success', t, m),
        error: (t: string, m?: string) => addToast('error', t, m),
        warning: (t: string, m?: string) => addToast('warning', t, m),
        info: (t: string, m?: string) => addToast('info', t, m),
    }), [addToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
                {toasts.map(t => {
                    const Icon = ICONS[t.type];
                    return (
                        <div key={t.id} className={`glass border rounded-xl p-4 flex gap-3 items-start shadow-2xl animate-fade-in ${COLORS[t.type]}`}>
                            <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_COLORS[t.type]}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-surface-800">{t.title}</p>
                                {t.message && <p className="text-xs text-surface-500 mt-0.5">{t.message}</p>}
                            </div>
                            <button
                                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                                className="text-surface-400 hover:text-surface-700 transition-colors shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export { ToastContext };
