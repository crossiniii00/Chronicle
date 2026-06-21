import React from 'react';
import { DollarSign } from 'lucide-react';

export function SalaryTab() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-green-50 rounded-xl text-green-600 shadow-sm border border-green-100/50">
                    <DollarSign size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-surface-900 tracking-tight leading-none mb-1">Salary Management</h2>
                    <p className="text-[11px] font-medium text-surface-500 uppercase tracking-widest opacity-60">Monitor and adjust compensation packages.</p>
                </div>
            </div>
            
            {/* Placeholder Content */}
            <div className="p-12 border-2 border-dashed border-surface-200 rounded-xl bg-surface-50/50 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-surface-200">
                    <DollarSign className="text-surface-300" size={32} />
                </div>
                <h3 className="text-lg font-bold text-surface-900 mb-2">Configure Salary Structures</h3>
                <p className="text-surface-500 max-w-md text-sm leading-relaxed">
                    This module will allow recruiters to define and manage salary ranges and benefits for upcoming hiring requirements.
                </p>
            </div>
        </div>
    );
}
