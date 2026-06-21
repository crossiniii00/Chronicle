import React from 'react';

export const CustomTooltip = ({ active, payload, label, unit = 'count' }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-surface-900 border border-white/10 p-4 shadow-2xl rounded-sm backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3 border-b border-white/5 pb-2 italic">
                    {label}
                </p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-8">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                                <span className="text-[10px] font-bold text-white/80 uppercase">{entry.name}:</span>
                            </div>
                            <span className="text-[11px] font-black text-white italic">
                                {unit === 'percent' ? `${entry.value.toFixed(1)}%` : entry.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Account Breakdown Identifier */}
                {payload[0]?.payload?.breakdown && Object.keys(payload[0].payload.breakdown).length > 1 && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Volume by Account</p>
                        {Object.entries(payload[0].payload.breakdown as Record<string, number>)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5) // Show top 5 accounts to keep it clean
                            .map(([acc, val], idx) => (
                                <div key={idx} className="flex justify-between items-center gap-4">
                                    <span className="text-[9px] font-bold text-white/60 truncate uppercase max-w-[120px]">{acc}</span>
                                    <span className="text-[9px] font-black text-primary-400 italic">{val}</span>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        );
    }
    return null;
};
