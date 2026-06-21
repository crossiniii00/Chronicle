import React from 'react';

interface ActivityTrendChartProps {
    data: { label: string; total: number; passed: number }[];
    onSelectDot?: (dateLabel: string, type: 'endorsed' | 'passed') => void;
}

export const ActivityTrendChart = React.memo(function ActivityTrendChart({
    data,
    onSelectDot
}: ActivityTrendChartProps) {
    const maxVal = Math.max(4, ...data.map(d => d.total));
    
    // Choose step size dynamically to ensure ticks are integers
    let step = 1;
    if (maxVal > 20) step = 5;
    else if (maxVal > 10) step = 2;
    
    const ticks: number[] = [];
    for (let i = 0; i <= maxVal; i += step) {
        ticks.push(i);
    }
    if (ticks[ticks.length - 1] < maxVal) {
        ticks.push(ticks[ticks.length - 1] + step);
    }
    const limitVal = ticks[ticks.length - 1];

    const height = 180;
    const width = 800;
    const paddingLeft = 40;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 30;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // Compute coordinate points
    const points = data.map((d, i) => {
        const x = paddingLeft + (i / (data.length - 1)) * plotWidth;
        const y = paddingTop + plotHeight - (d.total / limitVal) * plotHeight;
        return { x, y, label: d.label, val: d.total };
    });

    const passedPoints = data.map((d, i) => {
        const x = paddingLeft + (i / (data.length - 1)) * plotWidth;
        const y = paddingTop + plotHeight - (d.passed / limitVal) * plotHeight;
        return { x, y, label: d.label, val: d.passed };
    });

    return (
        <div className="w-full">
            <div className="relative w-full overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px] h-auto overflow-visible">
                    {/* Horizontal Grid lines at exact integer values */}
                    {ticks.map((val) => {
                        const y = paddingTop + plotHeight - (val / limitVal) * plotHeight;
                        return (
                            <g key={val} className="opacity-30">
                                <line 
                                    x1={paddingLeft} 
                                    y1={y} 
                                    x2={width - paddingRight} 
                                    y2={y} 
                                    stroke="#edebe9" 
                                    strokeWidth="1" 
                                />
                                <text 
                                    x={paddingLeft - 10} 
                                    y={y + 3.5} 
                                    textAnchor="end" 
                                    className="text-[9px] fill-[#605e5c] font-semibold"
                                >
                                    {val}
                                </text>
                            </g>
                        );
                    })}

                    {/* Vertical Column Guidelines for each date */}
                    {points.map((p, idx) => {
                        const maxY = Math.min(p.y, passedPoints[idx].y);
                        return (
                            <line 
                                key={`col-line-${idx}`}
                                x1={p.x} 
                                y1={maxY} 
                                x2={p.x} 
                                y2={paddingTop + plotHeight} 
                                stroke="#edebe9" 
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                            />
                        );
                    })}

                    {/* Dots for Total Candidates (Blue) */}
                    {points.map((p, idx) => (
                        <g 
                            key={`total-${idx}`} 
                            className="group cursor-pointer"
                            onClick={() => onSelectDot?.(p.label, 'endorsed')}
                        >
                            {/* Inner dot with outer border */}
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r="6.5"
                                fill="#0078d4"
                                stroke="white"
                                strokeWidth="2"
                                className="shadow-sm transition-all duration-200 group-hover:scale-110"
                            />
                            {/* Glow circle */}
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r="10"
                                fill="#0078d4"
                                className="opacity-0 group-hover:opacity-15 transition-opacity duration-200"
                            />
                            {/* Value Label above dot */}
                            <text
                                x={p.x}
                                y={p.y - 10}
                                textAnchor="middle"
                                className="text-[9px] font-extrabold fill-[#0078d4] drop-shadow-sm pointer-events-none"
                            >
                                {p.val}
                            </text>
                        </g>
                    ))}

                    {/* Dots for Passed Candidates (Green) */}
                    {passedPoints.map((p, idx) => (
                        <g 
                            key={`passed-${idx}`} 
                            className="group cursor-pointer"
                            onClick={() => onSelectDot?.(p.label, 'passed')}
                        >
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r="5.5"
                                fill="#107c10"
                                stroke="white"
                                strokeWidth="1.5"
                                className="shadow-sm"
                            />
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r="9"
                                fill="#107c10"
                                className="opacity-0 group-hover:opacity-15 transition-opacity duration-200"
                            />
                            {/* Value Label above dot if not overlapping with total or is different */}
                            {p.y !== points[idx].y && (
                                <text
                                    x={p.x}
                                    y={p.y - 9}
                                    textAnchor="middle"
                                    className="text-[9px] font-extrabold fill-[#107c10] pointer-events-none"
                                >
                                    {p.val}
                                </text>
                            )}
                        </g>
                    ))}

                    {/* Date labels on X-axis */}
                    {points.map((p, idx) => (
                        <text
                            key={`lbl-${idx}`}
                            x={p.x}
                            y={height - 8}
                            textAnchor="middle"
                            className="text-[9px] font-bold fill-[#605e5c]"
                        >
                            {p.label}
                        </text>
                    ))}
                </svg>
            </div>
        </div>
    );
});
