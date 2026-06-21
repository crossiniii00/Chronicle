import React from 'react';
import { createPortal } from 'react-dom';
import { X, BriefcaseMedical, Cigarette, Wine, Baby, AlertCircle } from 'lucide-react';
import type { Application } from '@/types';

interface MedicalDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    application: Application;
}

export function MedicalDashboardModal({ isOpen, onClose, application }: MedicalDashboardModalProps) {
    if (!isOpen) return null;

    const pis = application.pis || {};
    const conditions = pis.medical_conditions || [];
    const notes = pis.medical_history_notes || 'No additional history provided.';
    const drinks = pis.drinks_alcohol;
    const smokes = pis.smokes;
    const pregnant = pis.is_pregnant;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-surface-900/20 to-black/25 backdrop-blur-[3px] transition-opacity" />
            <div className="w-full max-w-lg bg-white border border-surface-200 shadow-2xl rounded-2xl overflow-hidden relative text-left ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
                {/* Accent Top Border */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-surface-900" />
                
                {/* Header */}
                <div className="p-6 border-b border-surface-150 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-900/10 text-surface-900 flex items-center justify-center rounded-lg">
                            <BriefcaseMedical size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-surface-900 tracking-tight uppercase leading-none">
                                Medical Dashboard
                            </h3>
                            <p className="text-[10px] text-surface-400 font-extrabold uppercase tracking-widest mt-1">
                                {application.applicant_name} ({application.applicant_id})
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1 text-surface-400 hover:text-surface-650 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Declared Sicknesses */}
                    <div className="space-y-2 text-left">
                        <h4 className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                            Declared Sicknesses / Conditions
                        </h4>
                        {conditions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {conditions.map((cond) => (
                                    <span 
                                        key={cond} 
                                        className="px-3 py-1.5 bg-surface-50 text-surface-900 text-[10px] font-black uppercase tracking-wider rounded-md border border-surface-200 flex items-center gap-1.5"
                                    >
                                        <AlertCircle size={12} />
                                        {cond}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-surface-500 italic">No specific medical conditions selected.</p>
                        )}
                    </div>

                    {/* Medical History Notes */}
                    <div className="space-y-2 text-left">
                        <h4 className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                            Medical History & Details
                        </h4>
                        <div className="p-4 bg-surface-50 border border-surface-200 rounded-md text-xs text-surface-700 leading-relaxed whitespace-pre-wrap">
                            {notes}
                        </div>
                    </div>

                    {/* Habits and Vitals */}
                    <div className="space-y-3 text-left">
                        <h4 className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                            Habits & Declarations
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            {/* Smoker */}
                            <div className="p-4 bg-surface-50 border border-surface-200 rounded-md flex flex-col items-center justify-center text-center">
                                <div className="w-8 h-8 rounded-full bg-surface-150 flex items-center justify-center text-surface-600 mb-2">
                                    <Cigarette size={16} />
                                </div>
                                <span className="text-[9px] font-black text-surface-400 uppercase tracking-wider">Smokes</span>
                                <span className={`text-[10px] font-black uppercase tracking-wider mt-1 ${smokes ? 'text-surface-900' : 'text-emerald-600'}`}>
                                    {smokes === true ? 'YES' : smokes === false ? 'NO' : 'UNDECLARED'}
                                </span>
                            </div>

                            {/* Drinks */}
                            <div className="p-4 bg-surface-50 border border-surface-200 rounded-md flex flex-col items-center justify-center text-center">
                                <div className="w-8 h-8 rounded-full bg-surface-150 flex items-center justify-center text-surface-600 mb-2">
                                    <Wine size={16} />
                                </div>
                                <span className="text-[9px] font-black text-surface-400 uppercase tracking-wider">Drinks Alcohol</span>
                                <span className={`text-[10px] font-black uppercase tracking-wider mt-1 ${drinks ? 'text-surface-900' : 'text-emerald-600'}`}>
                                    {drinks === true ? 'YES' : drinks === false ? 'NO' : 'UNDECLARED'}
                                </span>
                            </div>

                            {/* Pregnant */}
                            <div className="p-4 bg-surface-50 border border-surface-200 rounded-md flex flex-col items-center justify-center text-center">
                                <div className="w-8 h-8 rounded-full bg-surface-150 flex items-center justify-center text-surface-600 mb-2">
                                    <Baby size={16} />
                                </div>
                                <span className="text-[9px] font-black text-surface-400 uppercase tracking-wider">Pregnant</span>
                                <span className={`text-[10px] font-black uppercase tracking-wider mt-1 ${pregnant ? 'text-surface-900' : pregnant === false ? 'text-emerald-600' : 'text-surface-500'}`}>
                                    {pregnant === true ? 'YES' : pregnant === false ? 'NO' : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-surface-150 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-surface-900 hover:bg-surface-800 text-white text-[10px] font-black uppercase tracking-widest rounded-md transition-all shadow-md shadow-surface-900/10 cursor-pointer"
                    >
                        Close Dashboard
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
