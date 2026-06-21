import React from 'react';

interface PassFailDonutProps {
    passed: number;
    failed: number;
    pending: number;
    onSelect?: (filter: 'PASSED' | 'FAILED' | 'PENDING' | 'ALL') => void;
}

export const PassFailDonut = React.memo(function PassFailDonut({
    passed,
    failed,
    pending,
    onSelect
}: PassFailDonutProps) {
    const total = passed + failed + pending;
    const concluded = passed + failed;
    const passRate = concluded > 0 ? (passed / concluded) * 100 : 0;

    const r = 35;
    const cx = 50;
    const cy = 50;
    const circ = 2 * Math.PI * r;

    // Calculate segments
    const passLen = total > 0 ? (passed / total) * circ : 0;
    const failLen = total > 0 ? (failed / total) * circ : 0;
    const pendLen = total > 0 ? (pending / total) * circ : 0;

    return (
        <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f2f1" strokeWidth="12" />
                    {total > 0 ? (
                        <>
                            {/* Passed segment (Green) */}
                            {passed > 0 && (
                                <circle
                                    cx={cx} cy={cy} r={r} fill="none"
                                    stroke="#107c10" strokeWidth="12"
                                    strokeDasharray={`${passLen} ${circ}`}
                                    strokeDashoffset={0}
                                    className="cursor-pointer hover:opacity-85 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); onSelect?.('PASSED'); }}
                                />
                            )}
                            {/* Failed segment (Red) */}
                            {failed > 0 && (
                                <circle
                                    cx={cx} cy={cy} r={r} fill="none"
                                    stroke="#a4262c" strokeWidth="12"
                                    strokeDasharray={`${failLen} ${circ}`}
                                    strokeDashoffset={-passLen}
                                    className="cursor-pointer hover:opacity-85 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); onSelect?.('FAILED'); }}
                                />
                            )}
                            {/* Pending segment (Yellow) */}
                            {pending > 0 && (
                                <circle
                                    cx={cx} cy={cy} r={r} fill="none"
                                    stroke="#ffb900" strokeWidth="12"
                                    strokeDasharray={`${pendLen} ${circ}`}
                                    strokeDashoffset={-(passLen + failLen)}
                                    className="cursor-pointer hover:opacity-85 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); onSelect?.('PENDING'); }}
                                />
                            )}
                        </>
                    ) : (
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#edebe9" strokeWidth="12" />
                    )}
                </svg>
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect?.('ALL'); }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-80 transition-opacity"
                >
                    <span className="text-xl font-bold text-[#201f1e] tabular-nums">
                        {concluded > 0 ? `${Math.round(passRate)}%` : '0%'}
                    </span>
                    <span className="text-[9px] font-bold text-[#605e5c] uppercase tracking-wider">Pass Rate</span>
                </div>
            </div>

            <div className="flex-1 space-y-2.5">
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect?.('PASSED'); }}
                    className="flex items-center justify-between text-xs border-b border-[#f3f2f1] pb-1.5 cursor-pointer hover:bg-[#f3f2f1]/50 px-1.5 py-0.5 rounded transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#107c10]" />
                        <span className="text-[#323130] font-medium">Passed</span>
                    </div>
                    <span className="font-semibold text-[#201f1e]">{passed}</span>
                </div>
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect?.('FAILED'); }}
                    className="flex items-center justify-between text-xs border-b border-[#f3f2f1] pb-1.5 cursor-pointer hover:bg-[#f3f2f1]/50 px-1.5 py-0.5 rounded transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#a4262c]" />
                        <span className="text-[#323130] font-medium">Failed</span>
                    </div>
                    <span className="font-semibold text-[#201f1e]">{failed}</span>
                </div>
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect?.('PENDING'); }}
                    className="flex items-center justify-between text-xs border-b border-[#f3f2f1] pb-1.5 cursor-pointer hover:bg-[#f3f2f1]/50 px-1.5 py-0.5 rounded transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#ffb900]" />
                        <span className="text-[#323130] font-medium">Pending</span>
                    </div>
                    <span className="font-semibold text-[#201f1e]">{pending}</span>
                </div>
                <div 
                    onClick={(e) => { e.stopPropagation(); onSelect?.('ALL'); }}
                    className="flex items-center justify-between text-xs pt-0.5 font-bold cursor-pointer hover:bg-[#f3f2f1]/50 px-1.5 py-0.5 rounded transition-colors"
                >
                    <span className="text-[#323130]">Total Candidates</span>
                    <span className="text-[#201f1e]">{total}</span>
                </div>
            </div>
        </div>
    );
});
