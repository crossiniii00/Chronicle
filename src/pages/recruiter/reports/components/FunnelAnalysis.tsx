import React from 'react';
import { motion } from 'framer-motion';
import { Filter, ArrowDown, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface FunnelStage {
    stage: string;
    count: number;
    color: string;
}

interface FunnelAnalysisProps {
    data: FunnelStage[];
}

export function FunnelAnalysis({ data: funnelData }: FunnelAnalysisProps) {
    if (!funnelData || funnelData.length === 0) return null;

    const totalYield = ((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100).toFixed(1);

    return (
        <div className="bg-white border border-surface-200 rounded-sm shadow-sm overflow-hidden flex flex-col h-full min-h-[420px]">
            <div className="px-5 py-3 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary-50 text-primary-600 rounded-sm">
                        <Filter size={14} />
                    </div>
                    <h3 className="text-[11px] font-bold text-surface-900 uppercase tracking-wide">Funnel Dynamics</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600">{totalYield}%</span>
                    <span className="text-[8px] font-bold text-surface-400 uppercase">Yield</span>
                </div>
            </div>

            <div className="p-6 flex flex-col items-center justify-center flex-grow bg-white">
                <div className="relative w-full max-w-[280px] flex items-center gap-6">
                    {/* Visual Funnel (Triangle) */}
                    <div className="relative w-28 h-64 flex flex-col">
                        {funnelData.map((stage, idx) => {
                            const topWidth = 100 - (idx * (80 / funnelData.length));
                            const bottomWidth = 100 - ((idx + 1) * (80 / funnelData.length));
                            
                            return (
                                <motion.div
                                    key={stage.stage}
                                    initial={{ opacity: 0, scaleX: 0 }}
                                    animate={{ opacity: 1, scaleX: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative flex-1 group"
                                    style={{
                                        clipPath: `polygon(${(100 - topWidth) / 2}% 0%, ${100 - (100 - topWidth) / 2}% 0%, ${100 - (100 - bottomWidth) / 2}% 100%, ${(100 - bottomWidth) / 2}% 100%)`,
                                        backgroundColor: stage.color,
                                        filter: 'brightness(1.05)'
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Labels and Metrics */}
                    <div className="flex-1 flex flex-col justify-between h-64 py-2">
                        {funnelData.map((stage, idx) => {
                            const nextStage = funnelData[idx + 1];
                            const yieldRate = ((stage.count / funnelData[0].count) * 100).toFixed(0);
                            
                            return (
                                <div key={stage.stage} className="flex flex-col">
                                    <div className="flex items-baseline justify-between gap-2 border-b border-surface-50 pb-1">
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-semibold text-surface-500 uppercase truncate">{stage.stage}</p>
                                            <p className="text-sm font-bold text-surface-900 leading-tight">{stage.count.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-surface-700">{yieldRate}%</p>
                                        </div>
                                    </div>
                                    {nextStage && (
                                        <div className="h-4 flex items-center">
                                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full scale-75 origin-left">
                                                <ArrowDown size={8} className="text-emerald-500" />
                                                <span className="text-[8px] font-bold text-emerald-600">
                                                    {((nextStage.count / stage.count) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="px-4 py-2 bg-surface-50 border-t border-surface-100">
                <div className="flex items-center gap-2">
                    <Info size={10} className="text-primary-400" />
                    <span className="text-[8px] font-medium text-surface-400">Geometry represents population distribution.</span>
                </div>
            </div>
        </div>
    );
}
