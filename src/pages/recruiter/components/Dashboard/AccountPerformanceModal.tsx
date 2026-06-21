import React, { useState, useMemo } from 'react';
import { Building2, Search, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

interface AccountPerformanceModalProps {
    open: boolean;
    onClose: () => void;
    accountPerformanceData: Array<{ name: string; endorsed: number; hired: number; rate: number }>;
}

export const AccountPerformanceModal: React.FC<AccountPerformanceModalProps> = ({
    open,
    onClose,
    accountPerformanceData
}) => {
    const [search, setSearch] = useState('');

    const filteredData = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return accountPerformanceData;
        return accountPerformanceData.filter(a => a.name.toLowerCase().includes(term));
    }, [accountPerformanceData, search]);

    return (
        <Modal
            open={open}
            onClose={() => {
                onClose();
                setSearch('');
            }}
            title={
                <span className="flex items-center gap-2">
                    <Building2 size={16} />
                    Account performance analysis
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
                    placeholder="Search account…"
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
                            <th className="px-2 pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider">Account</th>
                            <th className="px-2 pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-center">Endorsed</th>
                            <th className="px-2 pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-center">Hired</th>
                            <th className="px-2 pb-3 text-[10px] font-black text-surface-400 uppercase tracking-wider text-right">Hiring Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-[12px] font-medium text-surface-400">
                                    {search ? 'No accounts match your search' : 'No account activity recorded in this period'}
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((acc) => (
                                <tr key={acc.name} className="group hover:bg-surface-50/50 transition-colors">
                                    <td className="px-2 py-3.5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-black/5 text-black flex items-center justify-center font-bold text-xs uppercase tracking-tight">
                                            {acc.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-semibold text-surface-900 truncate max-w-[180px]">{acc.name}</p>
                                            <p className="text-[10px] font-medium text-surface-400">Active client</p>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3.5 text-center text-[12px] font-medium text-surface-700">{acc.endorsed}</td>
                                    <td className="px-2 py-3.5 text-center text-[12px] font-semibold text-surface-900">{acc.hired}</td>
                                    <td className="px-2 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-1.5 bg-surface-100 rounded-full overflow-hidden hidden sm:block">
                                                <div
                                                    className="h-full bg-black rounded-full"
                                                    style={{ width: `${acc.rate}%` }}
                                                />
                                            </div>
                                            <span className="text-[12px] font-semibold text-surface-900">{acc.rate}%</span>
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
                    {filteredData.length} {filteredData.length === 1 ? 'account' : 'accounts'} total
                </p>
            )}
        </Modal>
    );
};
