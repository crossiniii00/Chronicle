import React from 'react';
import { Modal } from '@/components/common/Modal';
import {
    Target, UserCheck, Users, Ban, Activity, TrendingUp, Percent,
    Calendar, Clock, Briefcase, X, BarChart3, History, CheckCircle2
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
    RadialBarChart, RadialBar, LineChart, Line, CartesianGrid, Legend,
    PieChart, Pie
} from 'recharts';
import type { HiringQuotaHistory } from '@/services/PositionService';
import type { AccountDashboardData, Opening } from './AccountDashboardModal';
import type { Application } from '@/types';

interface LOBDashboardModalProps {
    lob: { id: string; name: string; description?: string } | null;
    onClose: () => void;
    accountDashboardData: AccountDashboardData | null;
    allApplications?: Application[];
    departmentName?: string;
}

export function LOBDashboardModal({ lob, onClose, accountDashboardData, allApplications = [], departmentName }: LOBDashboardModalProps) {
    if (!lob || !accountDashboardData) return null;

    const lobName = lob.name.trim().toLowerCase();

    // ── Active openings for this LOB ──
    const activeOpenings = accountDashboardData.openings.filter(
        o => (o.name || '').trim().toLowerCase() === lobName
    );

    // ── Historical campaigns for this LOB ──
    const historicalCampaigns = accountDashboardData.history.filter(
        h => (h.openingName || '').trim().toLowerCase() === lobName
    );

    // ── Aggregate active metrics ──
    const activeQuota = activeOpenings.reduce((s, o) => s + (o.quota || 0), 0);
    const activeHired = activeOpenings.reduce((s, o) => s + (o.hired || 0) + (o.manualHired || 0), 0);
    const activeInPipeline = activeOpenings.reduce((s, o) => s + (o.inPipeline || 0), 0);
    const activeFailed = activeOpenings.reduce((s, o) => s + (o.failedCount || 0), 0);
    const activeApplicants = activeOpenings.reduce((s, o) => s + (o.totalApplicants || 0), 0);

    // ── Aggregate historical metrics ──
    const histQuota = historicalCampaigns.reduce((s, h) => s + (h.quota || 0), 0);
    const histHired = historicalCampaigns.reduce((s, h) => s + (h.hiredCount || 0), 0);
    const histFailed = historicalCampaigns.reduce((s, h) => s + (h.failedCount || 0), 0);
    const histApplicants = historicalCampaigns.reduce((s, h) => s + (h.totalApplicants || 0), 0);
    const histInPipeline = historicalCampaigns.reduce((s, h) => s + (h.inPipeline || 0), 0);

    // ── Grand totals (all time) ──
    const totalQuota = activeQuota + histQuota;
    const totalHired = activeHired + histHired;
    const totalFailed = activeFailed + histFailed;
    const totalApplicants = activeApplicants + histApplicants;
    const overallAttainment = totalQuota > 0 ? Math.round((totalHired / totalQuota) * 100) : 0;
    const hireRate = totalApplicants > 0 ? Math.round((totalHired / totalApplicants) * 100) : 0;
    const falloutRate = totalApplicants > 0 ? Math.round((totalFailed / totalApplicants) * 100) : 0;

    // ── Date formatting ──
    const formatDisplayDate = (dateStr?: string | null) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // ── Build timeline data for line chart (historical seasons) ──
    const allSeasons = [
        ...historicalCampaigns.map((h, i) => ({
            label: h.openingName ? `S${historicalCampaigns.length - i}` : `Season ${historicalCampaigns.length - i}`,
            fullLabel: h.startDate ? formatDisplayDate(h.startDate) : `Season ${historicalCampaigns.length - i}`,
            quota: h.quota,
            hired: h.hiredCount,
            failed: h.failedCount,
            applicants: h.totalApplicants,
            attainment: h.quota > 0 ? Math.round((h.hiredCount / h.quota) * 100) : 0,
            isCurrent: false
        })),
        ...(activeQuota > 0 ? [{
            label: 'Current',
            fullLabel: 'Active Campaign',
            quota: activeQuota,
            hired: activeHired,
            failed: activeFailed,
            applicants: activeApplicants,
            attainment: activeQuota > 0 ? Math.round((activeHired / activeQuota) * 100) : 0,
            isCurrent: true
        }] : [])
    ].reverse();

    // ── Pie chart data ──
    const pieData = [
        { name: 'Hired', value: totalHired, color: '#107c10' },
        { name: 'Remaining', value: Math.max(0, totalQuota - totalHired), color: '#a19f9d' },
        { name: 'Rejected', value: totalFailed, color: '#a4262c' }
    ].filter(d => d.value > 0);
    const finalPieData = pieData.length > 0 ? pieData : [{ name: 'No Data', value: 1, color: '#edebe9' }];

    // ── Bar chart data for conversion metrics ──
    const metricsData = [
        { name: 'Fill Rate', percentage: overallAttainment, color: '#107c10' },
        { name: 'Hire Rate', percentage: hireRate, color: '#0078d4' },
        { name: 'Fallout Rate', percentage: falloutRate, color: '#a4262c' }
    ];

    return (
        <Modal
            open={!!lob}
            onClose={onClose}
            title=""
            size="2xl"
            className="max-w-[1100px] w-full"
        >
            <div className="space-y-5 text-left font-sans p-6 select-none max-h-[85vh] overflow-y-auto custom-scrollbar">
                {/* ── Close Button ── */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:bg-slate-800/50 text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-all cursor-pointer z-50"
                >
                    <X size={18} />
                </button>

                {/* ── Header Banner ── */}
                <div className="bg-gradient-to-r from-[#1a365d] to-[#2d4a7c] rounded-none p-5 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest rounded-none border bg-white/10 dark:bg-slate-900/10 text-blue-100 border-blue-300/30 uppercase">
                                Line of Business Dashboard
                            </span>
                            <h2 className="text-xl font-black text-white mt-2 uppercase tracking-tight">
                                {lob.name}
                            </h2>
                            <p className="text-[11px] text-blue-200/80 font-semibold mt-0.5 flex items-center gap-1.5">
                                <Briefcase size={12} />
                                {departmentName || 'Account'} • {activeOpenings.length} active opening{activeOpenings.length !== 1 ? 's' : ''} • {historicalCampaigns.length} past campaign{historicalCampaigns.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="bg-white/10 dark:bg-slate-900/10 backdrop-blur-sm border border-white/20 px-5 py-3 rounded-none text-center shrink-0 flex flex-col justify-center min-w-[130px]">
                            <span className="block text-[8px] font-black text-blue-200 uppercase tracking-widest">All-Time Fill Rate</span>
                            <span className="block text-3xl font-black text-white mt-0.5">{overallAttainment}%</span>
                        </div>
                    </div>
                </div>

                {/* ── KPI Cards Row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        {
                            label: 'Total Requirement',
                            value: totalQuota,
                            sub: `${activeQuota} active, ${histQuota} historical`,
                            borderColor: 'border-slate-200 dark:border-slate-800',
                            bgColor: 'bg-slate-50 dark:bg-slate-800/30',
                            iconColor: 'text-slate-500 dark:text-slate-400',
                            textColor: 'text-slate-900 dark:text-white',
                            icon: <Target size={18} />
                        },
                        {
                            label: 'Total Hired',
                            value: totalHired,
                            sub: `${activeHired} current, ${histHired} past`,
                            borderColor: 'border-emerald-250',
                            bgColor: 'bg-emerald-50/20',
                            iconColor: 'text-emerald-600',
                            textColor: 'text-emerald-850',
                            icon: <UserCheck size={18} />
                        },
                        {
                            label: 'Total Applicants',
                            value: totalApplicants,
                            sub: `${activeInPipeline + histInPipeline} in pipeline`,
                            borderColor: 'border-blue-200',
                            bgColor: 'bg-blue-50/20',
                            iconColor: 'text-blue-600',
                            textColor: 'text-blue-800',
                            icon: <Users size={18} />
                        },
                        {
                            label: 'Total Fallout',
                            value: totalFailed,
                            sub: `${falloutRate}% fallout rate`,
                            borderColor: 'border-rose-200',
                            bgColor: 'bg-rose-50/20',
                            iconColor: 'text-rose-600',
                            textColor: 'text-rose-800',
                            icon: <Ban size={18} />
                        }
                    ].map(card => (
                        <div key={card.label} className={`border ${card.borderColor} ${card.bgColor} p-4 rounded-none shadow-2xs hover:shadow-xs transition-all duration-200 flex items-start justify-between`}>
                            <div className="space-y-1">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">{card.label}</span>
                                <span className={`block text-2xl font-black leading-none ${card.textColor}`}>{card.value}</span>
                                <span className="block text-[9px] text-slate-400 font-semibold">{card.sub}</span>
                            </div>
                            <div className={`p-1.5 rounded-none bg-white dark:bg-slate-900 border ${card.borderColor} ${card.iconColor} shadow-3xs shrink-0`}>
                                {card.icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Charts Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Chart 1: Season-over-Season Performance (Line Chart) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-xs">
                        <div className="mb-3">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <TrendingUp size={13} className="text-[#0078d4]" /> SEASON-OVER-SEASON PERFORMANCE
                            </span>
                            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Quota and hire trends across campaigns</span>
                        </div>
                        {allSeasons.length > 0 ? (
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={allSeasons} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#605e5c' }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: '#a19f9d' }} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                            labelFormatter={(val, payload) => {
                                                const item = payload?.[0]?.payload;
                                                return item?.fullLabel || val;
                                            }}
                                        />
                                        <Bar dataKey="quota" name="Quota" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={18} />
                                        <Bar dataKey="hired" name="Hired" fill="#107c10" radius={[4, 4, 0, 0]} barSize={18} />
                                        <Bar dataKey="failed" name="Fallout" fill="#a4262c" radius={[4, 4, 0, 0]} barSize={18} />
                                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-[11px] text-slate-400 font-semibold">
                                No campaign data available for this LOB
                            </div>
                        )}
                    </div>

                    {/* Chart 2: Attainment Rate Trend (Line Chart) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-xs">
                        <div className="mb-3">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Activity size={13} className="text-[#0078d4]" /> ATTAINMENT RATE TREND
                            </span>
                            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Fill rate % progression over each campaign</span>
                        </div>
                        {allSeasons.length > 0 ? (
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={allSeasons} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#605e5c' }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: '#a19f9d' }} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                        <Line type="monotone" dataKey="attainment" name="Fill Rate %" stroke="#0078d4" strokeWidth={2.5} dot={{ r: 4, fill: '#0078d4', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-[11px] text-slate-400 font-semibold">
                                No campaign data available
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Second Charts Row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Chart 3: Overall Distribution (Pie) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs flex flex-col justify-between">
                        <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-[#0078d4]" /> OUTCOME DISTRIBUTION
                            </span>
                            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">All-time hire vs remaining vs fallout</span>
                        </div>
                        <div className="h-[160px] mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={finalPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={65}
                                        paddingAngle={3}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {finalPieData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-2">
                            {finalPieData.filter(d => d.name !== 'No Data').map(d => (
                                <span key={d.name} className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    {d.name}: {d.value}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Chart 4: Conversion Metrics Bar */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs flex flex-col justify-between">
                        <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Percent size={12} className="text-[#0078d4]" /> CONVERSION METRICS
                            </span>
                            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Overall rates across all campaigns</span>
                        </div>
                        <div className="h-[160px] mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#605e5c' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 9, fill: '#a19f9d' }} tickLine={false} axisLine={false} unit="%" />
                                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]} barSize={24}>
                                        {metricsData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-2">
                            <span>Fill: <strong className="text-[#107c10]">{overallAttainment}%</strong></span>
                            <span>Hire: <strong className="text-[#0078d4]">{hireRate}%</strong></span>
                            <span>Fallout: <strong className="text-[#a4262c]">{falloutRate}%</strong></span>
                        </div>
                    </div>

                    {/* Chart 5: Fill Rate Gauge */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs flex flex-col justify-between">
                        <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Target size={12} className="text-[#0078d4]" /> OVERALL FILL RATE
                            </span>
                            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">All-time target fulfillment</span>
                        </div>
                        <div className="h-[160px] mt-2 flex flex-col items-center justify-center relative">
                            <span className="absolute text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{overallAttainment}%</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="70%"
                                    outerRadius="100%"
                                    barSize={12}
                                    data={[{ name: 'Fill Rate', value: Math.min(overallAttainment, 100), fill: overallAttainment >= 100 ? '#107c10' : overallAttainment >= 50 ? '#ffb900' : '#a4262c' }]}
                                    startAngle={90}
                                    endAngle={90 - (3.6 * Math.min(overallAttainment, 100))}
                                >
                                    <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f5f9' }} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-2">
                            <span>Target: <strong className="text-slate-700 dark:text-slate-300">{totalQuota}</strong></span>
                            <span>Hired: <strong className="text-[#107c10]">{totalHired}</strong></span>
                        </div>
                    </div>
                </div>

                {/* ── Campaign History Table ── */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs overflow-hidden">
                    <div className="bg-[#1a365d] px-5 py-3">
                        <h3 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <History size={14} className="text-blue-300" /> CAMPAIGN HISTORY
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-[#24426b] text-white divide-x divide-slate-400/25">
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-left">Campaign</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Period</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Target</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Hired</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Applicants</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Fallout</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Fill Rate</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#edebe9]">
                                {/* Active openings first */}
                                {activeOpenings.map((opening, i) => {
                                    const fillRate = opening.quota > 0 ? Math.round(((opening.hired + (opening.manualHired || 0)) / opening.quota) * 100) : 0;
                                    return (
                                        <tr key={`active-${i}`} className="hover:bg-blue-50/30 font-semibold text-[12px] text-slate-700 dark:text-slate-300 divide-x divide-[#edebe9] bg-blue-50/10">
                                            <td className="px-4 py-3 text-left font-bold text-slate-800 dark:text-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                                    {opening.name || lob.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[11px]">
                                                {opening.quotaStart ? formatDisplayDate(opening.quotaStart) : 'N/A'} – {opening.quotaEnd ? formatDisplayDate(opening.quotaEnd) : 'Ongoing'}
                                            </td>
                                            <td className="px-4 py-3 font-bold">{opening.quota}</td>
                                            <td className="px-4 py-3 text-[#107c10]">{opening.hired + (opening.manualHired || 0)}</td>
                                            <td className="px-4 py-3 text-[#005a9e]">{opening.totalApplicants}</td>
                                            <td className="px-4 py-3 text-[#a4262c]">{opening.failedCount}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-none text-[10px] font-black ${fillRate >= 100 ? 'bg-emerald-50 text-emerald-700' : fillRate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                                    {fillRate}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black rounded-none uppercase tracking-wider">Active</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Historical campaigns */}
                                {historicalCampaigns.map((h, i) => {
                                    const fillRate = h.quota > 0 ? Math.round((h.hiredCount / h.quota) * 100) : 0;
                                    return (
                                        <tr key={`hist-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 font-semibold text-[12px] text-slate-600 divide-x divide-[#edebe9]">
                                            <td className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                                                    Season {historicalCampaigns.length - i}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[11px]">
                                                {h.startDate ? formatDisplayDate(h.startDate) : 'N/A'} – {h.endDate ? formatDisplayDate(h.endDate) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 font-bold">{h.quota}</td>
                                            <td className="px-4 py-3 text-[#107c10]">{h.hiredCount}</td>
                                            <td className="px-4 py-3 text-[#005a9e]">{h.totalApplicants}</td>
                                            <td className="px-4 py-3 text-[#a4262c]">{h.failedCount}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-none text-[10px] font-black ${fillRate >= 100 ? 'bg-emerald-50 text-emerald-700' : fillRate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                                    {fillRate}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[9px] font-black rounded-none uppercase tracking-wider">
                                                    {h.closedAt ? 'Closed' : 'Archived'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {activeOpenings.length === 0 && historicalCampaigns.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-[11px] text-slate-400 font-semibold">
                                            No campaign data found for this Line of Business
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── LOB Info Footer ── */}
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-none p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                    {[
                        { label: 'LOB Name', value: lob.name },
                        { label: 'Account', value: departmentName || 'N/A' },
                        { label: 'Total Campaigns', value: `${activeOpenings.length + historicalCampaigns.length}` },
                        { label: 'Description', value: lob.description || 'No description' }
                    ].map(detail => (
                        <div key={detail.label} className="space-y-0.5">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">{detail.label}</span>
                            <span className="block font-bold text-slate-700 dark:text-slate-300">{detail.value}</span>
                        </div>
                    ))}
                </div>

                {/* ── Close Footer ── */}
                <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-[11px] font-bold rounded-none transition-all shadow-2xs cursor-pointer"
                    >
                        Close Dashboard
                    </button>
                </div>
            </div>
        </Modal>
    );
}
