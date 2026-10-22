import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Database, ChevronRight } from 'lucide-react';

interface AccountGridProps {
    accountMetrics: any[];
    setSelectedAccount: (name: string) => void;
}

export function AccountGrid({ accountMetrics, setSelectedAccount }: AccountGridProps) {
    return (
        <motion.div
            key="accounts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4 overflow-y-auto custom-scrollbar pr-2 pb-8"
        >
            {accountMetrics.map((dept, index) => (
                <motion.button
                    key={dept.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedAccount(dept.name)}
                    className="group relative text-left bg-white dark:bg-slate-900 border border-surface-200 p-8 hover:border-[#d13438] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden rounded-sm"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Building2 size={80} />
                    </div>

                    <div className="mb-8">
                        <div className="w-12 h-12 bg-surface-50 border border-surface-100 flex items-center justify-center text-surface-400 group-hover:text-[#d13438] group-hover:bg-[#d13438]/5 group-hover:border-[#d13438]/10 transition-all rounded-sm mb-4">
                            <Database size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-surface-900 mb-1 line-clamp-1">{dept.name}</h3>
                        <p className="text-[10px] text-surface-400">Corporate Registry</p>
                    </div>

                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-3xl font-bold text-surface-900 mb-1">{dept.count}</div>
                            <div className="text-[9px] font-bold text-[#d13438] uppercase tracking-wider">Candidates in Review</div>
                        </div>
                        <div className="p-2 bg-surface-50 text-surface-300 group-hover:bg-[#d13438] group-hover:text-white transition-all rounded-sm translate-x-4 group-hover:translate-x-0 overflow-hidden shadow-sm">
                            <ChevronRight size={16} />
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#d13438] translate-y-full group-hover:translate-y-0 transition-transform" />
                </motion.button>
            ))}
        </motion.div>
    );
}

