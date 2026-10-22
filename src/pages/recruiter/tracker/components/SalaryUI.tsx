import React from 'react';
import { Search, Building2, Wallet, Info } from 'lucide-react';
import type { AccountSalary, Tier } from '../constants/salaryConstants';

interface SalaryHeaderProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
}

export function SalaryHeader({ searchTerm, setSearchTerm }: SalaryHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-surface-200 bg-white dark:bg-slate-900 px-2 mb-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#002060]/5 rounded-sm text-[#002060] border border-[#002060]/10">
                    <Wallet size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[#002060] leading-none mb-1">Salary Guide</h2>
                    <p className="text-[11px] font-medium text-surface-500 text-left">Salary ranges by account and tier</p>
                </div>
            </div>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
                <input
                    type="text"
                    placeholder="Search accounts or positions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface-50 border border-surface-200 text-[11px] py-2 pl-10 pr-4 rounded-none focus:ring-1 focus:ring-[#002060] outline-none font-medium text-left"
                />
            </div>
        </div>
    );
}

interface AccountCardProps {
    account: AccountSalary;
    onSelect: (acc: AccountSalary) => void;
}

export function AccountCard({ account, onSelect }: AccountCardProps) {
    return (
        <div
            onClick={() => onSelect(account)}
            className="group p-4 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm hover:shadow-md hover:border-[#002060]/30 transition-all cursor-pointer text-left"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#002060]/5 rounded-none flex items-center justify-center text-[#002060] border border-[#002060]/10">
                        <Building2 size={16} />
                    </div>
                    <span className="text-[13px] font-bold text-surface-900">{account.account}</span>
                </div>
                <div className="px-2 py-0.5 bg-surface-100 rounded-none text-[9px] font-bold text-surface-500 uppercase">
                    {account.tiers.length} Tiers
                </div>
            </div>
            <div className="space-y-1">
                {account.tiers.slice(0, 2).map((tier, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px]">
                        <span className="text-surface-500 font-medium">{tier.name}</span>
                        <span className="text-surface-500">{tier.entries.length} positions</span>
                    </div>
                ))}
                {account.tiers.length > 2 && (
                    <div className="text-[10px] text-[#002060] font-medium pt-1">+ {account.tiers.length - 2} more</div>
                )}
            </div>
        </div>
    );
}

interface TierTableProps {
    tier: Tier;
}

export function TierTable({ tier }: TierTableProps) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-surface-300 rounded-sm overflow-hidden shadow-sm">
            <div className="bg-surface-50 px-4 py-2 border-b border-surface-300 flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#002060]">{tier.name}</span>
                <span className="text-[10px] text-surface-400">Position grid</span>
            </div>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-surface-100">
                        <th className="p-3 text-[11px] font-semibold text-surface-600 text-left border-b border-r border-surface-300">Position</th>
                        <th className="p-3 text-[11px] font-semibold text-surface-600 text-left border-b border-r border-surface-300">Experience</th>
                        <th className="p-3 text-[11px] font-semibold text-surface-600 text-left border-b border-r border-surface-300">Base Salary</th>
                        <th className="p-3 text-[11px] font-semibold text-surface-600 text-left border-b border-r border-surface-300">Incentives</th>
                        <th className="p-3 text-[11px] font-semibold text-surface-600 text-left border-b border-surface-300">Total Package</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                    {tier.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-surface-50/80 transition-colors">
                            <td className="p-3 text-[12px] font-medium text-surface-900 text-left border-r border-surface-300">{entry.position}</td>
                            <td className="p-3 text-[11px] font-medium text-surface-700 text-left border-r border-surface-300">{entry.experience}</td>
                            <td className="p-3 text-[11px] font-bold text-surface-900 text-left border-r border-surface-300">{entry.salary}</td>
                            <td className="p-3 text-[11px] font-bold text-surface-600 text-left border-r border-surface-300">{entry.incentives}</td>
                            <td className="p-3 text-[11px] font-bold text-[#002060] text-left border-surface-300">
                                {entry.total || entry.salary}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function SalaryIntro() {
    return (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-sm mb-6 flex items-start gap-4 text-left">
            <div className="p-3 bg-blue-100 rounded-sm text-blue-600 shadow-sm">
                <Info size={24} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-tight mb-1">Policy & Transparency Notice</h3>
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium opacity-80">
                    The salary matrices below are confidential and should only be used as a reference for official recruitment activities.
                    Packages are inclusive of base pay and non-taxable allowances as specified. Always verify with the Compensation and Benefits team for the latest revisions.
                </p>
            </div>
        </div>
    );
}
