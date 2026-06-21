import React from 'react';
import { Search } from 'lucide-react';
import { useSalaryReference } from './hooks/useSalaryReference';
import { SalaryHeader, AccountCard, TierTable, SalaryIntro } from './components/SalaryUI';

export default function SalaryReferenceView() {
    const {
        searchTerm,
        setSearchTerm,
        selectedAccount,
        setSelectedAccount,
        filteredAccounts
    } = useSalaryReference();

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in font-sans bg-surface-50 min-h-screen text-left">
            <SalaryHeader searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

            {!selectedAccount ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAccounts.map((acc, idx) => (
                        <AccountCard key={idx} account={acc} onSelect={setSelectedAccount} />
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white p-4 border border-surface-200 rounded-none">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedAccount(null)}
                                className="px-4 py-2 text-[10px] font-bold uppercase text-surface-500 hover:text-surface-900 transition-colors bg-surface-50 border border-surface-200 rounded-none"
                            >
                                ← Back to Grid
                            </button>
                            <h2 className="text-xl font-bold text-[#002060] uppercase tracking-tighter">{selectedAccount.account}</h2>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-none text-[10px] font-bold uppercase tracking-widest">
                            Official Matrix
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {selectedAccount.tiers.map((tier, idx) => (
                            <TierTable key={idx} tier={tier} />
                        ))}
                    </div>
                </div>
            )}

            {filteredAccounts.length === 0 && (
                <div className="p-20 text-center flex flex-col items-center gap-4 bg-white border border-dashed border-surface-300 rounded-none">
                    <div className="w-16 h-16 bg-surface-100 rounded-none flex items-center justify-center text-surface-400">
                        <Search size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-surface-900 uppercase tracking-tight">No Matching Matrices</h3>
                        <p className="text-[11px] font-bold text-surface-400 uppercase tracking-widest italic">Try adjusting your search filters</p>
                    </div>
                    <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 px-6 py-2 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-none hover:bg-[#002060]/90 transition-all"
                    >
                        Clear Search
                    </button>
                </div>
            )}
        </div>
    );
}
