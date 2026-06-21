import React, { useState, useMemo } from 'react';
import { Users, Search, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

interface RecruiterActivityModalProps {
    open: boolean;
    onClose: () => void;
    recruiterData: Array<{ name: string; screened: number; endorsed: number; rate: number }>;
}

export const RecruiterActivityModal: React.FC<RecruiterActivityModalProps> = ({
    open,
    onClose,
    recruiterData
}) => {
    const [search, setSearch] = useState('');

    const filteredData = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return recruiterData;
        return recruiterData.filter(r => r.name.toLowerCase().includes(term));
    }, [recruiterData, search]);

    return (
        <Modal
            open={open}
            onClose={() => {
                onClose();
                setSearch('');
            }}
            title={
                <span className="flex items-center gap-2">
                    <Users size={16} />
                    Recruiter activity analysis
                </span>
            }
            size="2xl"
        >
            <div className="relative mb-6 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search recruiter…"
                    className="w-full pl-9 pr-9 py-2 bg-white border border-surface-200 text-[12px] font-medium placeholder:text-surface-400 focus:border-black transition-all outline-none rounded-none"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-black transition-colors p-1"
                        title="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <div className="overflow-x-auto -mx-2">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-surface-200">
                            <th className="px-2 pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider">Recruiter</th>
                            <th className="px-2 pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-center">Screened</th>
                            <th className="px-2 pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-center">Endorsed</th>
                            <th className="px-2 pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-right">Endorsement Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-[12px] font-medium text-surface-400">
                                    {search ? 'No recruiters match your search' : 'No recruiter activity recorded in this period'}
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((rec) => (
                                <tr key={rec.name} className="group hover:bg-surface-50/50 transition-colors">
                                    <td className="px-2 py-3.5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-black/5 text-black flex items-center justify-center font-bold text-xs uppercase tracking-tight">
                                            {rec.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-semibold text-surface-900">{rec.name}</p>
                                            <p className="text-[10px] font-medium text-surface-400">Active recruiter</p>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3.5 text-center text-[12px] font-medium text-surface-700">{rec.screened}</td>
                                    <td className="px-2 py-3.5 text-center text-[12px] font-semibold text-surface-900">{rec.endorsed}</td>
                                    <td className="px-2 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-1.5 bg-surface-100 rounded-full overflow-hidden hidden sm:block">
                                                <div
                                                    className="h-full bg-black rounded-full"
                                                    style={{ width: `${rec.rate}%` }}
                                                />
                                            </div>
                                            <span className="text-[12px] font-semibold text-surface-900">{rec.rate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {filteredData.length > 0 && (
                <p className="text-[10px] text-surface-400 font-medium text-center mt-4">
                    {filteredData.length} {filteredData.length === 1 ? 'recruiter' : 'recruiters'} total
                </p>
            )}
        </Modal>
    );
};
