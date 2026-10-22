import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Briefcase, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface AccountCardsProps {
    accountMetrics: any[];
    setSelectedAccount: (name: string[]) => void;
}

export function AccountCards({ accountMetrics, setSelectedAccount }: AccountCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {accountMetrics.map((account, index) => (
                <motion.button
                    key={account.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedAccount([account.name])}
                    className="group relative text-left bg-white dark:bg-slate-900 border border-surface-200 p-8 hover:border-[#d13438] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden rounded-none"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:-rotate-12 duration-700">
                        <Building2 size={120} />
                    </div>

                    <div className="mb-8 relative z-10">
                        <div className="w-14 h-14 bg-surface-50 border border-surface-100 flex items-center justify-center text-surface-400 group-hover:text-[#d13438] group-hover:bg-[#d13438]/5 group-hover:border-[#d13438]/10 transition-all duration-300 rounded-none mb-6 shadow-sm">
                            <Briefcase size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-surface-900 tracking-tight mb-1 truncate uppercase">{account.name}</h3>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-none" />
                            <p className="text-[10px] font-bold text-surface-400 tracking-wider font-sans uppercase">{account.positionCount} Active Streams</p>
                        </div>
                    </div>

                    <div className="flex items-end justify-between relative z-10">
                        <div>
                            <div className="text-4xl font-bold text-surface-900 tracking-tighter mb-1">
                                {account.count}
                            </div>
                            <div className="text-[10px] font-bold text-[#d13438] uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 size={10} /> Certified Results
                            </div>
                        </div>
                        <div className={cn(
                            "p-2.5 bg-surface-50 text-surface-300 transition-all duration-300 rounded-none shadow-sm",
                            "group-hover:bg-[#d13438] group-hover:text-white group-hover:translate-x-0 group-hover:opacity-100",
                            "translate-x-4 opacity-0"
                        )}>
                            <ChevronRight size={18} />
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#d13438] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </motion.button>
            ))}
        </div>
    );
}
