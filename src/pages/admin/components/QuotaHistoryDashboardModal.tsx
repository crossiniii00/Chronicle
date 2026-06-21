import React from 'react';
import { Modal } from '@/components/common/Modal';
import { BarChart3, PieChart as PieIcon, Award, Activity, Calendar, Shield, Target, UserCheck, Users, Ban } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { HiringQuotaHistory } from '@/services/PositionService';

interface QuotaHistoryDashboardModalProps {
    item: HiringQuotaHistory | null;
    onClose: () => void;
    onEdit?: (item: HiringQuotaHistory) => void;
}

export function QuotaHistoryDashboardModal({ item, onClose, onEdit }: QuotaHistoryDashboardModalProps) {
    if (!item) return null;

    const attainment = item.quota > 0 ? Math.round((item.hiredCount / item.quota) * 100) : 0;
    const appToHire = item.totalApplicants > 0 ? Math.round((item.hiredCount / item.totalApplicants) * 100) : 0;
    const falloutRate = item.totalApplicants > 0 ? Math.round((item.failedCount / item.totalApplicants) * 100) : 0;
    const pipelineConv = item.totalApplicants > 0 ? Math.round((item.inPipeline / item.totalApplicants) * 100) : 0;

    const formatDisplayDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const seasonLabel = item.startDate || item.endDate
        ? `${item.startDate ? formatDisplayDate(item.startDate) : 'No Start'} – ${item.endDate ? formatDisplayDate(item.endDate) : 'No End'}`
        : 'No dates recorded';

    // Data for PieChart (Distribution of Quota Targets & Rejections)
    const distributionData = [
        { name: 'Hired', value: item.hiredCount, color: '#107c10' },
        { name: 'Remaining / Unfilled', value: Math.max(0, item.quota - item.hiredCount), color: '#a19f9d' },
        { name: 'Rejected / Dropped Out', value: item.failedCount, color: '#a4262c' }
    ].filter(d => d.value > 0);

    // If all values are 0, put a placeholder to prevent chart breaking
    const finalDistributionData = distributionData.length > 0 ? distributionData : [
        { name: 'No candidates', value: 1, color: '#edebe9' }
    ];

    // Data for BarChart (Conversion Metrics)
    const metricsData = [
        { name: 'Conversion Rate', percentage: attainment, color: '#107c10' },
        { name: 'Hire Rate', percentage: appToHire, color: '#0078d4' },
        { name: 'Rejection Rate', percentage: falloutRate, color: '#a4262c' },
        { name: 'Pipeline Progress', percentage: pipelineConv, color: '#ffb900' }
    ];

    return (
        <Modal
            open={!!item}
            onClose={onClose}
            title=""
            size="lg"
            className="max-w-[950px] w-full"
        >
            <div className="space-y-6 text-left font-sans p-6 select-none">
                {/* Header Banner */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest rounded-sm border bg-blue-50 text-blue-700 border-blue-150 uppercase">
                                Closed Campaign Dashboard
                            </span>
                            <h2 className="text-xl font-black text-slate-900 mt-2 uppercase tracking-tight">
                                {item.department} – Historical Review
                            </h2>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{seasonLabel}</p>
                        </div>
                        <div className="bg-emerald-50/40 border border-emerald-200 px-4 py-2 rounded-sm text-center shrink-0 flex flex-col justify-center min-w-[120px]">
                            <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-widest">Conversion Rate</span>
                            <span className="block text-2xl font-black text-emerald-700 mt-0.5">{attainment}%</span>
                        </div>
                    </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { 
                            label: 'Hiring Target', 
                            value: item.quota, 
                            sub: 'Positions needed', 
                            borderColor: 'border-slate-200',
                            bgColor: 'bg-slate-50/30',
                            iconColor: 'text-slate-500', 
                            textColor: 'text-slate-900', 
                            icon: <Target size={18} /> 
                        },
                        { 
                            label: 'Hired Candidates', 
                            value: item.hiredCount, 
                            sub: `${item.manualHires || 0} manual additions`, 
                            borderColor: 'border-emerald-250',
                            bgColor: 'bg-emerald-50/20',
                            iconColor: 'text-emerald-600', 
                            textColor: 'text-emerald-850', 
                            icon: <UserCheck size={18} /> 
                        },
                        { 
                            label: 'Total Applicants', 
                            value: item.totalApplicants, 
                            sub: `${item.inPipeline} in progress`, 
                            borderColor: 'border-blue-200',
                            bgColor: 'bg-blue-50/20',
                            iconColor: 'text-blue-600', 
                            textColor: 'text-blue-800', 
                            icon: <Users size={18} /> 
                        },
                        { 
                            label: 'Rejected / Dropped Out', 
                            value: item.failedCount, 
                            sub: 'Total rejections/withdrawals', 
                            borderColor: 'border-rose-200',
                            bgColor: 'bg-rose-50/20',
                            iconColor: 'text-rose-600', 
                            textColor: 'text-rose-800', 
                            icon: <Ban size={18} /> 
                        }
                    ].map(card => (
                        <div key={card.label} className={`border ${card.borderColor} ${card.bgColor} p-4 rounded-sm shadow-2xs hover:shadow-xs transition-all duration-200 flex items-start justify-between`}>
                            <div className="space-y-1">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">{card.label}</span>
                                <span className={`block text-2xl font-black leading-none ${card.textColor}`}>{card.value}</span>
                                <span className="block text-[9px] text-slate-400 font-semibold">{card.sub}</span>
                            </div>
                            <div className={`p-1.5 rounded-sm bg-white border ${card.borderColor} ${card.iconColor} shadow-3xs shrink-0`}>
                                {card.icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Visual Charts Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Pie Chart: Distribution (5/12 width) */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-sm p-4 shadow-2xs">
                        <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <PieIcon size={14} className="text-blue-600" /> Pipeline Distribution
                        </h3>
                        <div className="h-[200px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={finalDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {finalDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ fontSize: '10px', borderRadius: '2px', border: '1px solid #edebe9', background: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-1.5 mt-3">
                            {finalDistributionData.map((d, i) => (
                                <div key={d.name} className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: d.color }} />
                                        <span>{d.name}</span>
                                    </div>
                                    <span className="font-extrabold text-slate-800">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bar Chart: Conversion Analysis (7/12 width) */}
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-sm p-4 shadow-2xs">
                        <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 size={14} className="text-blue-600" /> Rate & Conversion Analysis
                        </h3>
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={metricsData}
                                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 'bold' }}
                                        axisLine={{ stroke: '#e5e7eb' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fill: '#9ca3af', fontSize: 9 }}
                                        axisLine={false}
                                        tickLine={false}
                                        unit="%"
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ fontSize: '10px', borderRadius: '2px', border: '1px solid #edebe9', background: '#fff' }}
                                        formatter={(val: any) => [`${val}%`, 'Percentage']}
                                    />
                                    <Bar dataKey="percentage" barSize={32}>
                                        {metricsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Campaign Detail Info Footer bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                    {[
                        { label: 'Hiring Quota ID', value: item.hiringQuotaId || 'N/A' },
                        { label: 'Job Type', value: item.hiringType || 'Billed' },
                        { label: 'Start Date', value: item.trainingStartDate ? formatDisplayDate(item.trainingStartDate) : 'N/A' },
                        { label: 'End Date', value: formatDisplayDate(item.closedAt) }
                    ].map(detail => (
                        <div key={detail.label} className="space-y-0.5">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">{detail.label}</span>
                            <span className="block font-bold text-slate-700">{detail.value}</span>
                        </div>
                    ))}
                </div>

                {/* Close Button Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                    {onEdit && (
                        <button
                            onClick={() => {
                                onEdit(item);
                                onClose();
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-sm transition-all shadow-sm cursor-pointer border border-blue-750"
                        >
                            Edit Record
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 text-[11px] font-bold rounded-sm transition-all shadow-2xs cursor-pointer"
                    >
                        Close Dashboard
                    </button>
                </div>
            </div>
        </Modal>
    );
}
