import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRecruiterReports } from './reports/hooks/useRecruiterReports';
import AccountAnalytics from './reports/AccountAnalytics';

export function RecruiterReports() {
    const { user } = useAuthStore();
    const reportsState = useRecruiterReports(user);

    if (!reportsState.isInitialized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm">
                    <div className="relative group">
                        <div className="absolute -inset-1.5 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse" />
                        <div className="relative w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-lg flex items-center justify-center p-2 border border-surface-100 transition-all duration-300">
                            <img
                                src="/contactpoint-logo.png?v=2"
                                alt="ContactPoint 360"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <div className="w-6 h-6 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-surface-900">
                                ContactPoint 360
                            </h4>
                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest animate-pulse">
                                Initializing Analytics Workspace...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AccountAnalytics
            reportsState={reportsState}
        />
    );
}
