import React from 'react';
import { Building2, LayoutDashboard } from 'lucide-react';

interface AccountPerformanceTableProps {
    accountPerformanceData: Array<{ name: string; endorsed: number; hired: number; rate: number }>;
    onViewDashboard: () => void;
}

export const AccountPerformanceTable: React.FC<AccountPerformanceTableProps> = ({
    accountPerformanceData,
    onViewDashboard
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-black text-surface-900 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={14} className="text-black" /> Account Performance Analysis
                </h3>
                <button
                    onClick={onViewDashboard}
                    className="p-1.5 px-2.5 hover:bg-surface-100 rounded-none transition-colors text-surface-600 hover:text-black flex items-center gap-1.5 text-[11px] font-medium border border-surface-200 hover:border-black"
                >
                    <LayoutDashboard size={12} /> View dashboard
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-surface-200">
                            <th className="pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider">Account</th>
                            <th className="pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-center">Endorsed</th>
                            <th className="pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-center">Hired</th>
                            <th className="pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-right">Hiring Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {accountPerformanceData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-[11px] font-medium text-surface-400 uppercase tracking-wider italic">
                                    No account activity recorded in this period
                                </td>
                            </tr>
                        ) : (
                            accountPerformanceData.slice(0, 5).map((acc) => (
                                <tr key={acc.name} className="group hover:bg-surface-50/50 transition-colors">
                                    <td className="py-3.5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-black/5 text-black flex items-center justify-center font-bold text-xs uppercase tracking-tight">
                                            {acc.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-surface-900 uppercase tracking-wide truncate max-w-[120px]">{acc.name}</p>
                                            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Active Client</p>
                                        </div>
                                    </td>
                                    <td className="py-3.5 text-center text-xs font-bold text-surface-700">{acc.endorsed}</td>
                                    <td className="py-3.5 text-center text-xs font-black text-black">{acc.hired}</td>
                                    <td className="py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-1.5 bg-surface-100 rounded-full overflow-hidden hidden sm:block">
                                                <div
                                                    className="h-full bg-black rounded-full"
                                                    style={{ width: `${acc.rate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-black text-surface-900">{acc.rate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {accountPerformanceData.length > 5 && (
                    <p className="text-[10px] text-surface-400 font-medium text-center mt-3">
                        Showing 5 of {accountPerformanceData.length} accounts
                    </p>
                )}
            </div>
        </div>
    );
};
