import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface AccountPerformanceFunnelProps {
    data: any[];
}

export function AccountPerformanceFunnel({ data }: AccountPerformanceFunnelProps) {
    const topAccounts = [...data]
        .sort((a, b) => b.total.Hired - a.total.Hired)
        .slice(0, 5);

    if (topAccounts.length === 0) return null;

    const maxHires = topAccounts[0].total.Hired;

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-amber-500" />
                    <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-wide">Elite Account Funnel</h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-sm">
                    <Trophy size={12} />
                    TOP PERFORMERS
                </div>
            </div>

            <div className="relative flex flex-col items-center">
                {topAccounts.map((account, idx) => {
                    const widthPercent = 100 - (idx * 12); // Tapered effect
                    const hiringRate = account.total.yieldRate;
                    
                    return (
                        <motion.div
                            key={account.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative flex items-center justify-center mb-1 group cursor-default"
                            style={{ width: `${widthPercent}%` }}
                        >
                            {/* Funnel Segment */}
                            <div 
                                className={cn(
                                    "h-16 flex items-center justify-between px-8 relative transition-all group-hover:brightness-110",
                                    idx === 0 ? "bg-[#0078d4] text-white" :
                                    idx === 1 ? "bg-[#2b88d8] text-white" :
                                    idx === 2 ? "bg-[#5ca2df] text-white" :
                                    idx === 3 ? "bg-[#8ebce6] text-surface-900" :
                                    "bg-[#c0d6ee] text-surface-900"
                                )}
                                style={{
                                    width: '100%',
                                    clipPath: `polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)`
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-widest leading-none mb-1">
                                            {account.name}
                                        </div>
                                        <div className="text-[9px] opacity-80 font-bold uppercase tracking-tighter">
                                            {account.total.Applicants} Candidates Pool
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <div className="text-xl font-black leading-none">{account.total.Hired}</div>
                                        <div className="text-[8px] font-bold uppercase opacity-70">Hires</div>
                                    </div>
                                    <div className="w-px h-8 bg-white/20" />
                                    <div className="text-right">
                                        <div className="text-xl font-black leading-none">{hiringRate.toFixed(1)}%</div>
                                        <div className="text-[8px] font-bold uppercase opacity-70">Hiring Rate</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Vertical Connector */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-surface-100 -z-10" />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-surface-50 p-4 rounded-sm border border-surface-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={14} className="text-primary-600" />
                        <span className="text-[9px] font-black text-surface-400 uppercase">Champion Account</span>
                    </div>
                    <div className="text-sm font-bold text-surface-900 uppercase">{topAccounts[0].name}</div>
                </div>
                <div className="bg-surface-50 p-4 rounded-sm border border-surface-100">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-emerald-600" />
                        <span className="text-[9px] font-black text-surface-400 uppercase">Avg. Elite Rate</span>
                    </div>
                    <div className="text-sm font-bold text-emerald-600">
                        {(topAccounts.reduce((acc, curr) => acc + curr.total.yieldRate, 0) / 5).toFixed(1)}%
                    </div>
                </div>
                <div className="bg-surface-50 p-4 rounded-sm border border-surface-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy size={14} className="text-amber-500" />
                        <span className="text-[9px] font-black text-surface-400 uppercase">Elite Pool Depth</span>
                    </div>
                    <div className="text-sm font-bold text-surface-900">
                        {topAccounts.reduce((acc, curr) => acc + curr.total.Applicants, 0).toLocaleString()}
                    </div>
                </div>
            </div>
        </section>
    );
}
