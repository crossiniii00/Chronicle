import React from 'react';
import { Users, LayoutDashboard } from 'lucide-react';

interface RecruiterActivityTableProps {
    recruiterData: Array<{ name: string; screened: number; endorsed: number; rate: number }>;
    onViewDashboard: () => void;
}

export const RecruiterActivityTable: React.FC<RecruiterActivityTableProps> = ({
    recruiterData,
    onViewDashboard
}) => {
    return (
        <div className="bg-white border border-surface-200 rounded-sm p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-black text-surface-900 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} className="text-black" /> Recruiter Activity Analysis
                </h3>
                <button
                    onClick={onViewDashboard}
                    className="p-1.5 px-2.5 hover:bg-surface-100 rounded-sm transition-colors text-surface-600 hover:text-black flex items-center gap-1.5 text-[11px] font-medium border border-surface-200 hover:border-black"
                >
                    <LayoutDashboard size={12} /> View dashboard
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-surface-200">
                            <th className="pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider">Recruiter</th>
                            <th className="pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-center">Screened</th>
                            <th className="pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-center">Endorsed</th>
                            <th className="pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-right">Endorsement Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {recruiterData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-[11px] font-medium text-surface-400 uppercase tracking-wider italic">
                                    No recruiter activity recorded in this period
                                </td>
                            </tr>
                        ) : (
                            recruiterData.slice(0, 5).map((rec) => (
                                <tr key={rec.name} className="group hover:bg-surface-50/50 transition-colors">
                                    <td className="py-3.5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-black/5 text-black flex items-center justify-center font-bold text-xs uppercase tracking-tight">
                                            {rec.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-surface-900 uppercase tracking-wide">{rec.name}</p>
                                            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Active Recruiter</p>
                                        </div>
                                    </td>
                                    <td className="py-3.5 text-center text-xs font-bold text-surface-700">{rec.screened}</td>
                                    <td className="py-3.5 text-center text-xs font-black text-black">{rec.endorsed}</td>
                                    <td className="py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-1.5 bg-surface-100 rounded-full overflow-hidden hidden sm:block">
                                                <div
                                                    className="h-full bg-black rounded-full"
                                                    style={{ width: `${rec.rate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-black text-surface-900">{rec.rate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {recruiterData.length > 5 && (
                    <p className="text-[10px] text-surface-400 font-medium text-center mt-3">
                        Showing 5 of {recruiterData.length} recruiters
                    </p>
                )}
            </div>
        </div>
    );
};
