/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

export interface AnalyticsTabProps {
    selectedDeptName: string;
    setSelectedDeptName: (name: string) => void;
    dateMode: string;
    setDateMode: (mode: string) => void;
    apps: any[];
    [key: string]: any;
}

export const GlassTooltip = () => {
    return <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2.5 rounded shadow-lg border border-slate-200 dark:border-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300" />;
};

export const FullAnalysisModal = ({ isOpen, onClose, type, data, metrics, trend, passFail, processedData, setType }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-none w-[90vw] h-[90vh] flex flex-col relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { if (setType) setType(null); onClose(); }} className="absolute top-4 right-4 font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300">✕</button>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">Full Analysis — {type}</h2>
                <div className="flex-1 overflow-auto text-sm text-slate-500 dark:text-slate-400">Analysis content for {type}...</div>
            </div>
        </div>
    );
};

export const DemographicDetailsModal = ({ isOpen, onClose, passingRateMetrics }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-none max-w-4xl w-full relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300">✕</button>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">Demographic Details</h2>
                <div className="h-64 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">Demographic charts...</div>
            </div>
        </div>
    );
};
