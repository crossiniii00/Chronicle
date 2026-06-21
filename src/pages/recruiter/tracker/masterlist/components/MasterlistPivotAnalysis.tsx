import React, { useMemo } from 'react';
import { Application } from '@/types/application';
import { 
    BarChart3, Users, Calendar, Target, 
    ShieldCheck, Activity, Layers, 
    TrendingUp, Zap, PieChart as PieIcon,
    Globe, Briefcase, FileText, Share2
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

interface PivotAnalysisProps {
    data: Application[];
}

function getWeekInfo(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `W${weekNo} ${d.getUTCFullYear()}`;
}

const STATUS_COLORS = [
    '#002060', '#d13438', '#107c10', '#0078d4', '#8764b8',
    '#ff8c00', '#00bfff', '#ff1493', '#32cd32', '#ff4500',
    '#605e5c', '#c239b3', '#008272', '#a4262c', '#005a9e'
];

export function MasterlistPivotAnalysis({ data }: PivotAnalysisProps) {
    const analysis = useMemo(() => {
        const stats = {
            byMonth: {} as Record<string, Record<string, number>>,
            byWeek: {} as Record<string, Record<string, number>>,
            byAccount: {} as Record<string, number>,
            byOverallStatus: {} as Record<string, number>,
            byHiringId: {} as Record<string, number>,
            byPeme: {} as Record<string, number>,
            byBi: {} as Record<string, number>,
            conversion: { totalHires: 0, todayIntake: 0, todayHires: 0 },
            accountMobility: {
                initial: {} as Record<string, number>,
                final: {} as Record<string, number>,
                changed: 0,
                stayed: 0,
                moves: {} as Record<string, Record<string, number>>
            },
            failRate: {} as Record<string, { total: number, failed: number }>,
            typing: {} as Record<string, number>,
            exam: {} as Record<string, number>,
            position: {} as Record<string, number>,
            source: {} as Record<string, number>,
            remarks: {} as Record<string, number>
        };

        const today = new Date().toISOString().split('T')[0];
        const allStatuses = new Set<string>();
        
        // Fail-equivalent statuses based on DB analysis
        const FAIL_STATUSES = new Set(['REJECTED', 'FAILED', 'WITHDRAWN', 'HIRED_ELSEWHERE', 'CHOOSES_TO_PURSUE_OTHER_OPPORTUNITIES', 'CLOSED', 'REJECTED_BY_CLIENT']);
        const HIRE_STATUSES = new Set(['ACCEPTED OFFER', 'HIRED', 'PASSED']);

        data.forEach(app => {
            const rawStat = (app.current_status || 'APPLIED').toUpperCase();
            const acc = app.department || 'Unspecified';
            const hrid = app.master_hiring_request_id || 'No ID';
            const peme = app.master_peme_status || 'Pending';
            const bi = app.master_bi_result || 'Pending';

            // 1. Account Mobility Analysis
            let metadata = app.metadata || {};
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
            }
            
            const initialAcc = metadata.initial_account_assignment || acc;
            const finalAcc = metadata.final_account || acc;

            stats.accountMobility.initial[initialAcc] = (stats.accountMobility.initial[initialAcc] || 0) + 1;
            stats.accountMobility.final[finalAcc] = (stats.accountMobility.final[finalAcc] || 0) + 1;

            if (initialAcc !== finalAcc && initialAcc !== 'Unspecified' && finalAcc !== 'Unspecified') {
                stats.accountMobility.changed++;
                if (!stats.accountMobility.moves[initialAcc]) stats.accountMobility.moves[initialAcc] = {};
                stats.accountMobility.moves[initialAcc][finalAcc] = (stats.accountMobility.moves[initialAcc][finalAcc] || 0) + 1;
            } else {
                stats.accountMobility.stayed++;
            }

            // 2. Fail Rate Analysis
            const isFailed = FAIL_STATUSES.has(rawStat);
            if (!stats.failRate[acc]) stats.failRate[acc] = { total: 0, failed: 0 };
            stats.failRate[acc].total++;
            if (isFailed) stats.failRate[acc].failed++;

            // 3. Performance Analysis (Typing & Exam)
            const wpm = typeof app.typing_test_wpm === 'number' ? app.typing_test_wpm : parseInt(app.typing_test_wpm || metadata.typing_speed_num || '0');
            const wpmRange = wpm >= 60 ? '60+ WPM' : 
                             wpm >= 50 ? '50-59 WPM' : 
                             wpm >= 40 ? '40-49 WPM' : 
                             wpm >= 30 ? '30-39 WPM' : 
                             wpm > 0 ? '< 30 WPM' : 'No Test';
            stats.typing[wpmRange] = (stats.typing[wpmRange] || 0) + 1;

            const score = typeof app.assessment_score === 'number' ? app.assessment_score : parseInt(app.assessment_score || '0');
            const scoreRange = score >= 90 ? '90-100%' : 
                               score >= 80 ? '80-89%' : 
                               score >= 70 ? '70-79%' : 
                               score >= 60 ? '60-69%' : 
                               score > 0 ? '< 60%' : 'No Exam';
            stats.exam[scoreRange] = (stats.exam[scoreRange] || 0) + 1;

            const pos = app.position_title || 'Unspecified';
            stats.position[pos] = (stats.position[pos] || 0) + 1;

            const srcKey = Object.keys(metadata).find(k => k.toUpperCase().includes('HEAR THAT WE ARE HIRING')) || 'hiring_source_detailed';
            const src = metadata[srcKey] || app.pis?.hiring_source || app.source || 'Unknown';
            stats.source[src] = (stats.source[src] || 0) + 1;

            // 4. Remarks Analysis
            const remarkText = (app.master_remarks || '').trim();
            if (remarkText && remarkText !== '---') {
                const upper = remarkText.toUpperCase();
                
                // Categorization logic
                if (upper.includes('PASSED') || upper.includes('ENDORSED') || upper.includes('OE SENT')) {
                    stats.remarks['Passed/Endorsed'] = (stats.remarks['Passed/Endorsed'] || 0) + 1;
                } else if (upper.includes('FAILED') || upper.includes('REJECTED')) {
                    stats.remarks['Failed/Rejected'] = (stats.remarks['Failed/Rejected'] || 0) + 1;
                } else if (upper.includes('BGC') || upper.includes('NBI')) {
                    stats.remarks['BGC & NBI Prep'] = (stats.remarks['BGC & NBI Prep'] || 0) + 1;
                } else if (upper.includes('TRAINING') || upper.includes('CONFIRMED TRAINING')) {
                    stats.remarks['Training Confirmed'] = (stats.remarks['Training Confirmed'] || 0) + 1;
                } else if (upper.includes('AVAILABLE') || upper.includes('START')) {
                    stats.remarks['Availability/Start Dates'] = (stats.remarks['Availability/Start Dates'] || 0) + 1;
                } else if (upper.includes('WITHDRAWN') || upper.includes('NOT INTERESTED')) {
                    stats.remarks['Withdrawals'] = (stats.remarks['Withdrawals'] || 0) + 1;
                } else if (upper.includes('REPROFILED') || upper.includes('TRANSFER')) {
                    stats.remarks['Account Transfers'] = (stats.remarks['Account Transfers'] || 0) + 1;
                } else {
                    stats.remarks['General Admin'] = (stats.remarks['General Admin'] || 0) + 1;
                }

                // Top Exact Remarks analysis
                if (!stats.remarks[`EXACT_${remarkText}`]) stats.remarks[`EXACT_${remarkText}`] = 0;
                stats.remarks[`EXACT_${remarkText}`]++;
            }

            // 5. Global Aggregates
            stats.byAccount[acc] = (stats.byAccount[acc] || 0) + 1;
            stats.byOverallStatus[app.current_status || 'APPLIED'] = (stats.byOverallStatus[app.current_status || 'APPLIED'] || 0) + 1;
            stats.byHiringId[hrid] = (stats.byHiringId[hrid] || 0) + 1;
            stats.byPeme[peme] = (stats.byPeme[peme] || 0) + 1;
            stats.byBi[bi] = (stats.byBi[bi] || 0) + 1;
            allStatuses.add(app.current_status || 'APPLIED');

            // 6. Conversion logic
            const isAccepted = HIRE_STATUSES.has(rawStat);
            if (isAccepted) stats.conversion.totalHires++;
            if (app.applied_at?.startsWith(today)) stats.conversion.todayIntake++;
            if (isAccepted && (app.updated_at?.startsWith(today) || app.hired_at?.startsWith(today))) {
                stats.conversion.todayHires++;
            }

            // 7. Time-Series Logic
            const dateStr = app.master_training_start_date || app.applied_at;
            if (dateStr) {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
                    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                    const week = getWeekInfo(date);

                    if (!stats.byMonth[month]) stats.byMonth[month] = {};
                    stats.byMonth[month][app.current_status || 'APPLIED'] = (stats.byMonth[month][app.current_status || 'APPLIED'] || 0) + 1;

                    if (!stats.byWeek[week]) stats.byWeek[week] = {};
                    stats.byWeek[week][app.current_status || 'APPLIED'] = (stats.byWeek[week][app.current_status || 'APPLIED'] || 0) + 1;
                }
            }
        });

        return {
            stats,
            statuses: Array.from(allStatuses),
            monthData: Object.entries(stats.byMonth).map(([name, statuses]) => ({ name, ...statuses })),
            weekData: Object.entries(stats.byWeek).map(([name, statuses]) => ({ name, ...statuses })),
            failRateData: Object.entries(stats.failRate)
                .map(([name, { total, failed }]) => ({
                    name,
                    rate: total > 0 ? Number(((failed / total) * 100).toFixed(1)) : 0,
                    total,
                    failed
                }))
                .sort((a, b) => b.rate - a.rate),
            mobilityData: Object.entries(stats.accountMobility.initial)
                .map(([name, count]) => ({
                    name,
                    initial: count,
                    final: stats.accountMobility.final[name] || 0
                }))
                .sort((a, b) => b.initial - a.initial)
                .slice(0, 10),
            typingData: ['60+ WPM', '50-59 WPM', '40-49 WPM', '30-39 WPM', '< 30 WPM', 'No Test']
                .map(name => ({ name, count: stats.typing[name] || 0 })),
            examData: ['90-100%', '80-89%', '70-79%', '60-69%', '< 60%', 'No Exam']
                .map(name => ({ name, count: stats.exam[name] || 0 })),
            positionData: Object.entries(stats.position).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
            sourceData: Object.entries(stats.source).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
            remarksCategories: Object.entries(stats.remarks)
                .filter(([name]) => !name.startsWith('EXACT_'))
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count),
            topExactRemarks: Object.entries(stats.remarks)
                .filter(([name]) => name.startsWith('EXACT_'))
                .map(([name, count]) => ({ name: name.replace('EXACT_', ''), count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
        };
    }, [data]);

    const AnalysisCard = ({ title, icon: Icon, data, field, subField, color, filterType = 'account' }: { 
        title: string, 
        icon: any, 
        data: Application[], 
        field: keyof Application | 'hiring_id' | 'peme' | 'bi' | 'department',
        subField?: string,
        color: string,
        filterType?: 'account' | 'status'
    }) => {
        const [filterVal, setFilterVal] = React.useState('ALL');

        const filterOptions = useMemo(() => {
            const set = new Set<string>();
            data.forEach(app => { 
                const val = filterType === 'account' ? app.department : app.current_status;
                if (val) set.add(val); 
            });
            return Array.from(set).sort();
        }, [data, filterType]);

        const stats = useMemo(() => {
            const counts: Record<string, number> = {};
            data.forEach(app => {
                if (filterVal !== 'ALL') {
                    const actualVal = filterType === 'account' ? app.department : app.current_status;
                    if (actualVal !== filterVal) return;
                }

                let val = '';
                if (field === 'hiring_id') val = app.master_hiring_request_id || 'No ID';
                else if (field === 'peme') val = app.master_peme_status || 'Pending';
                else if (field === 'bi') val = app.master_bi_result || 'Pending';
                else if (field === 'department') val = app.department || 'Unspecified';
                else if (subField) val = (app as any)[field]?.[subField] || 'N/A';
                else val = (app as any)[field] || 'Unspecified';

                counts[val] = (counts[val] || 0) + 1;
            });
            return counts;
        }, [data, filterVal, field, subField, filterType]);

        const sorted = Object.entries(stats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        const total = Object.values(stats).reduce((a, b) => a + b, 0);

        return (
            <div className="bg-white border border-[#edebe9] rounded-none shadow-sm overflow-hidden flex flex-col h-full group/card">
                <div className={cn("px-4 py-2 text-white flex items-center justify-between transition-colors", color)}>
                    <div className="flex items-center gap-2">
                        <Icon size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <select 
                            value={filterVal}
                            onChange={(e) => setFilterVal(e.target.value)}
                            className="bg-white/20 border-none text-[8px] font-bold uppercase text-white outline-none rounded-none px-1 py-0.5 cursor-pointer hover:bg-white/30 transition-colors max-w-[100px]"
                        >
                            <option value="ALL" className="text-black">ALL {filterType === 'account' ? 'ACCOUNTS' : 'STATUSES'}</option>
                            {filterOptions.map(opt => (
                                <option key={opt} value={opt} className="text-black">{opt}</option>
                            ))}
                        </select>
                        <span className="text-[10px] font-black opacity-80 border-l border-white/20 pl-2">{total}</span>
                    </div>
                </div>
                <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                    {sorted.length > 0 ? sorted.map(([label, count]) => {
                        const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
                        return (
                            <div key={label} className="space-y-1">
                                <div className="flex justify-between items-center text-[9px] font-bold text-[#323130] uppercase">
                                    <span className="truncate pr-2">{label.replace(/_/g, ' ')}</span>
                                    <span>{count}</span>
                                </div>
                                <div className="h-1.5 bg-[#f3f2f1] rounded-none overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-none transition-all duration-500", color.split(' ')[0])}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-[9px] text-[#a19f9d] font-bold uppercase gap-2">
                            <Activity size={24} className="opacity-20" />
                            No Data Found
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* 1. Summary Analysis Cards (Top Priority) */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <AnalysisCard
                    title="Per Account"
                    icon={Users}
                    data={data}
                    field="department"
                    color="bg-[#d13438]"
                    filterType="status"
                />
                <AnalysisCard
                    title="Overall Status"
                    icon={Activity}
                    data={data}
                    field="current_status"
                    color="bg-[#107c10]"
                    filterType="account"
                />
                <AnalysisCard
                    title="Hiring ID"
                    icon={Layers}
                    data={data}
                    field="hiring_id"
                    color="bg-[#323130]"
                    filterType="account"
                />
                <AnalysisCard
                    title="PEME Status"
                    icon={ShieldCheck}
                    data={data}
                    field="peme"
                    color="bg-[#0078d4]"
                    filterType="account"
                />
                <AnalysisCard
                    title="BI Status"
                    icon={ShieldCheck}
                    data={data}
                    field="bi"
                    color="bg-[#5c2d91]"
                    filterType="account"
                />
            </div>
            
            {/* 2. Mobility & Success Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Account Mobility Analysis */}
                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[11px] font-bold text-[#0078d4] uppercase flex items-center gap-2">
                            <Target size={14} /> Account Assignment Mobility
                        </h3>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <div className="text-[9px] font-black text-surface-400 uppercase leading-none">Stayed</div>
                                <div className="text-xs font-black text-[#107c10]">{analysis.stats.accountMobility.stayed}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black text-surface-400 uppercase leading-none">Reprofiled</div>
                                <div className="text-xs font-black text-[#d13438]">{analysis.stats.accountMobility.changed}</div>
                            </div>
                        </div>
                    </div>
                    <div className="h-64 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.mobilityData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edebe9" />
                                <XAxis type="number" tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} width={100} />
                                <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', borderRadius: '0' }} cursor={{ fill: '#f3f2f1' }} />
                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} verticalAlign="top" align="right" />
                                <Bar name="Initial Assignment" dataKey="initial" fill="#0078d4" radius={0} barSize={12} />
                                <Bar name="Final Assignment" dataKey="final" fill="#5c2d91" radius={0} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[9px] text-surface-400 font-medium italic mt-2">
                        *Comparison between initial recruitment assignment and final deployed account.
                    </p>
                </div>

                {/* Account Fail Rate Analysis */}
                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4">
                    <h3 className="text-[11px] font-bold text-[#d13438] uppercase mb-4 flex items-center gap-2">
                        <Activity size={14} /> Fail Rate Heatmap by Account
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.failRateData.slice(0, 12)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edebe9" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip 
                                    contentStyle={{ fontSize: '10px', fontWeight: 'bold', borderRadius: '0' }}
                                    formatter={(value: any, name: any, props: any) => [`${value}% (${props.payload.failed}/${props.payload.total})`, 'Failure Rate']}
                                />
                                <Bar 
                                    dataKey="rate" 
                                    fill="#d13438" 
                                    radius={0} 
                                    maxBarSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-[#d13438] rounded-none" />
                            <span className="text-[9px] font-bold text-surface-400 uppercase">Fail Rate %</span>
                        </div>
                        <span className="text-[9px] text-surface-400 font-medium italic">
                            *Fail rate includes Rejected, Failed, and Withdrawn statuses.
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Remarks Intelligence (High Impact) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4 col-span-1 lg:col-span-2">
                    <h3 className="text-[11px] font-bold text-[#323130] uppercase mb-4 flex items-center gap-2">
                        <FileText size={14} /> Remarks Intelligence Analysis
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-surface-400 uppercase tracking-widest border-b border-surface-100 pb-2">
                                Keyword Categorization
                            </h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysis.remarksCategories} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edebe9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#605e5c' }} width={140} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ fontSize: '10px', fontWeight: 'bold', borderRadius: '0' }}
                                            formatter={(value: any) => [value, 'Candidates']}
                                        />
                                        <Bar dataKey="count" fill="#323130" radius={0} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-surface-400 uppercase tracking-widest border-b border-surface-100 pb-2">
                                Top 10 Exact Remarks
                            </h4>
                            <div className="h-64 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black text-surface-400 uppercase tracking-tight border-b border-surface-100">
                                            <th className="py-2">Remark String</th>
                                            <th className="py-2 text-right">Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-50">
                                        {analysis.topExactRemarks.map((rem, i) => (
                                            <tr key={i} className="hover:bg-surface-50 transition-colors">
                                                <td className="py-2 text-[10px] font-bold text-surface-700 truncate max-w-[200px]" title={rem.name}>
                                                    {rem.name}
                                                </td>
                                                <td className="py-2 text-[10px] font-black text-[#d13438] text-right">
                                                    {rem.count}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Time-Series Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Month Chart */}
                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4">
                    <h3 className="text-[11px] font-bold text-[#002060] uppercase mb-4 flex items-center gap-2">
                        <Calendar size={14} /> Per Month Status Analysis
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.monthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edebe9" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', borderRadius: '0' }} />
                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                                {analysis.statuses.map((status, idx) => (
                                    <Bar key={status} dataKey={status} stackId="a" maxBarSize={60} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Week Chart */}
                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4">
                    <h3 className="text-[11px] font-bold text-[#d13438] uppercase mb-4 flex items-center gap-2">
                        <BarChart3 size={14} /> Per Week Status Analysis
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.weekData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edebe9" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', borderRadius: '0' }} />
                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                                {analysis.statuses.map((status, idx) => (
                                    <Bar key={status} dataKey={status} stackId="a" maxBarSize={60} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 5. Skills & Sourcing Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Performance Analysis: Typing & Exam */}
                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4">
                    <h3 className="text-[11px] font-bold text-[#0078d4] uppercase mb-4 flex items-center gap-2">
                        <Zap size={14} /> Typing Speed Distribution (WPM)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.typingData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edebe9" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 0 }} />
                                <Bar dataKey="count" fill="#0078d4" radius={0} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4">
                    <h3 className="text-[11px] font-bold text-[#107c10] uppercase mb-4 flex items-center gap-2">
                        <Target size={14} /> Assessment Score Distribution
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.examData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edebe9" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#605e5c' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 0 }} />
                                <Bar dataKey="count" fill="#107c10" radius={0} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Position Distribution */}
                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4">
                    <h3 className="text-[11px] font-bold text-[#5c2d91] uppercase mb-4 flex items-center gap-2">
                        <Users size={14} /> Candidate Distribution by Position
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.positionData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edebe9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#605e5c' }} width={150} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 0 }} />
                                <Bar dataKey="count" fill="#5c2d91" radius={0} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sourcing Analysis */}
                <div className="bg-white border border-[#edebe9] rounded-none shadow-sm p-4">
                    <h3 className="text-[11px] font-bold text-[#ffb900] uppercase mb-4 flex items-center gap-2">
                        <Share2 size={14} /> Top Hiring Sources
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.sourceData.slice(0, 8)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edebe9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#605e5c' }} width={120} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 0 }} />
                                <Bar dataKey="count" fill="#ffb900" radius={0} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
