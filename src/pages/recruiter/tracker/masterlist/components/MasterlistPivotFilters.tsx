import React from 'react';

interface MasterlistPivotFiltersProps {
    pivotTraining: string;
    setPivotTraining: (val: string) => void;
    pivotPosition: string;
    setPivotPosition: (val: string) => void;
    pivotStatus: string;
    setPivotStatus: (val: string) => void;
    pivotAccount: string;
    setPivotAccount: (val: string) => void;
    pivotOptions: {
        training: string[];
        positions: string[];
        statuses: (string | any)[];
        accounts: string[];
    };
}

export function MasterlistPivotFilters({
    pivotTraining, setPivotTraining, pivotPosition, setPivotPosition,
    pivotStatus, setPivotStatus, pivotAccount, setPivotAccount, pivotOptions
}: MasterlistPivotFiltersProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-[#faf9f8] p-4 border border-[#edebe9] rounded-none animate-fade-in shadow-sm">
            <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#605e5c] uppercase tracking-wider">TRANING Schedule</label>
                <select
                    value={pivotTraining}
                    onChange={(e) => setPivotTraining(e.target.value)}
                    className="w-full bg-white border border-[#d2d0ce] px-3 py-2 text-[10px] font-bold uppercase focus:border-[#d13438] outline-none transition-colors rounded-none"
                >
                    <option value="ALL">All Schedules</option>
                    {pivotOptions.training.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#605e5c] uppercase tracking-wider">Position</label>
                <select
                    value={pivotPosition}
                    onChange={(e) => setPivotPosition(e.target.value)}
                    className="w-full bg-white border border-[#d2d0ce] px-3 py-2 text-[10px] font-bold uppercase focus:border-[#d13438] outline-none transition-colors rounded-none"
                >
                    <option value="ALL">All Positions</option>
                    {pivotOptions.positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#605e5c] uppercase tracking-wider">Status</label>
                <select
                    value={pivotStatus}
                    onChange={(e) => setPivotStatus(e.target.value)}
                    className="w-full bg-white border border-[#d2d0ce] px-3 py-2 text-[10px] font-bold uppercase focus:border-[#d13438] outline-none transition-colors rounded-none"
                >
                    <option value="ALL">All Statuses</option>
                    {pivotOptions.statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#605e5c] uppercase tracking-wider">Account</label>
                <select
                    value={pivotAccount}
                    onChange={(e) => setPivotAccount(e.target.value)}
                    className="w-full bg-white border border-[#d2d0ce] px-3 py-2 text-[10px] font-bold uppercase focus:border-[#d13438] outline-none transition-colors rounded-none"
                >
                    <option value="ALL">All Accounts</option>
                    {pivotOptions.accounts.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
        </div>
    );
}
