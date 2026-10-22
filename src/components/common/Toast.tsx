import React, { useState, createContext, ReactNode, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils/formatters';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    timestamp: number;
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
const BORDER_COLORS = {
    success: 'border-l-emerald-500',
    error: 'border-l-rose-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
};
const ICON_COLORS = { 
    success: 'text-emerald-500', 
    error: 'text-rose-500', 
    warning: 'text-amber-500', 
    info: 'text-blue-500' 
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, title: string, message?: string) => {
        const isNotificationsDisabled = typeof window !== 'undefined' && localStorage.getItem('chronicle_notifications_disabled') === 'true';
        if (isNotificationsDisabled) {
            return;
        }
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, type, title, message, timestamp: Date.now() }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000); // slightly longer for reading time
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
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
                {toasts.map(t => {
                    const Icon = ICONS[t.type];
                    const dateObj = new Date(t.timestamp);
                    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                    return (
                        <div 
                            key={t.id} 
                            className={cn(
                                "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-[3px] rounded shadow-lg p-3 flex gap-3 animate-fade-in",
                                BORDER_COLORS[t.type]
                            )}
                        >
                            <Icon size={16} className={cn("mt-0.5 shrink-0", ICON_COLORS[t.type])} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.title}</p>
                                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                                        {dateStr}, {timeStr}
                                    </span>
                                </div>
                                {t.message && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{t.message}</p>}
                            </div>
                            <button
                                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 -mt-0.5"
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
