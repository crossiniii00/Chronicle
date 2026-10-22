/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AdvancedDateFilter, DateFilterState } from '@/components/common/AdvancedDateFilter';
import { Search, X } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface JobPositionBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountName: string | null;
}

export const JobPositionBreakdownModal: React.FC<JobPositionBreakdownModalProps> = ({
    isOpen,
    onClose,
    accountName
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [recruiterFilter, setRecruiterFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });

    const pipelineData = [
        { name: 'Applied', value: 120 },
        { name: 'Interviewed', value: 80 },
        { name: 'Assessment', value: 60 },
        { name: 'Validation', value: 40 },
        { name: 'Job Offer', value: 20 },
        { name: 'Signed', value: 18 },
    ];

    const sourceData = [
        { name: 'Walk-in', value: 45 },
        { name: 'Facebook', value: 30 },
        { name: 'Jobstreet', value: 25 },
        { name: 'Referral', value: 20 },
    ];

    const statusData = [
        { name: 'Active', value: 40 },
        { name: 'Failed', value: 30 },
        { name: 'Passed', value: 30 },
    ];
    const COLORS = ['#0ea5e9', '#ef4444', '#10b981'];

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-surface-900/20 to-black/25 backdrop-blur-[3px]" />
            <div
                className="w-full max-w-7xl h-[90vh] bg-white dark:bg-slate-900 border border-surface-200 shadow-2xl rounded-none overflow-hidden relative text-left flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {accountName || 'ACCOUNT'} — Job Position Breakdown
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:bg-slate-800/50 rounded-lg transition-colors">
                        <X size={18} className="text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-800/50">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Job Position..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                        </div>
                        <select
                            value={recruiterFilter}
                            onChange={(e) => setRecruiterFilter(e.target.value)}
                            className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="All">All Recruiters</option>
                            <option value="R1">Recruiter 1</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                        </select>
                        <div className="min-w-[280px]">
                            <AdvancedDateFilter
                                value={dateFilter}
                                onChange={setDateFilter}
                            />
                        </div>
                    </div>

                    {/* LOB Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">UNSPECIFIED JOB POSITION</h3>
                        </div>

                        <div className="p-6">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <div className="bg-blue-50/50 p-4 border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">ASSIGNED</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tabular-nums">145</p>
                                </div>
                                <div className="bg-emerald-50/50 p-4 border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">HIRES</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tabular-nums">18</p>
                                </div>
                                <div className="bg-purple-50/50 p-4 border border-purple-100">
                                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">HIRE RATE</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tabular-nums">12.4%</p>
                                </div>
                                <div className="bg-amber-50/50 p-4 border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">SOURCING (EXT/INT)</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tabular-nums">85 / 15</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Pipeline Progression */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 p-5 shadow-sm">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Pipeline Progression</h4>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsBarChart data={pipelineData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 2, 2, 0]} />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Candidate Sources */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 p-5 shadow-sm">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Candidate Sources</h4>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsBarChart data={sourceData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 2, 2, 0]} />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Statuses */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 p-5 shadow-sm">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Statuses</h4>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsPieChart>
                                                <Pie
                                                    data={statusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {statusData.map((_entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Conversion Journey */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-100 p-5 shadow-sm flex flex-col justify-center">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">Conversion Journey</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800">
                                            <span className="text-xs font-semibold text-slate-600">INT → ASSMT</span>
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-200 tabular-nums">75%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800">
                                            <span className="text-xs font-semibold text-slate-600">ASSMT → OPS</span>
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-200 tabular-nums">66%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800">
                                            <span className="text-xs font-semibold text-slate-600">OPS → OFFER</span>
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-200 tabular-nums">50%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-100">
                                            <span className="text-xs font-bold text-emerald-700">OFFER → HIRED</span>
                                            <span className="text-sm font-black text-emerald-700 tabular-nums">90%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
