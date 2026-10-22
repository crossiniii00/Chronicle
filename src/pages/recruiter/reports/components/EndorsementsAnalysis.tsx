import React, { useMemo, useState } from 'react';
import { getTrueAccount } from '../hooks/useRecruiterReports';
import { Users, Calendar, RotateCcw, CheckCircle, X } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

function getCandidateName(c: any): string {
    if (!c) return 'Unknown Candidate';
    const pis = c.pis || c.metadata?.pis || {};
    if (pis.first_name || pis.last_name) return `${pis.first_name || ''} ${pis.last_name || ''}`.trim();
    if (c.applicant_name) return c.applicant_name;
    if (c.first_name || c.last_name) return `${c.first_name || ''} ${c.last_name || ''}`.trim();
    return 'Unknown Candidate';
}

interface EndorsementsAnalysisProps {
    apps: any[];
    departmentsList: any[];
}

export function EndorsementsAnalysis({ apps, departmentsList }: EndorsementsAnalysisProps) {
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<'DASHBOARD' | 'TOTAL' | 'SCHEDULED' | 'REPROFILING' | 'CONCLUDED' | null>(null);
    const [filterRecruiter, setFilterRecruiter] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    const accountMetrics = useMemo(() => {
        const metrics: Record<string, {
            account: string;
            totalEndorsed: number;
            scheduledOpsVal: number;
            forReprofiling: number;
            concludedOpsVal: number;
        }> = {};

        apps.forEach(app => {
            const account = getTrueAccount(app);
            if (!account || account === 'Unassigned') return;

            if (!metrics[account]) {
                metrics[account] = {
                    account,
                    totalEndorsed: 0,
                    scheduledOpsVal: 0,
                    forReprofiling: 0,
                    concludedOpsVal: 0
                };
            }

            const stats = metrics[account];

            // 1. Total Endorsed: Since they are grouped into this account and not rejected at initial stage,
            // we'll count all applicants mapped to this account as "endorsed to the account" for this filtered view.
            stats.totalEndorsed++;

            const status = String(app.current_status || '').toUpperCase();
            const ovStatus = String(app.pis?.ops_validator_status || app.metadata?.ops_validator_status || '').toUpperCase();
            const schedulingStatus = String(app.recruiter_s_scheduling_status || app.metadata?.recruiter_s_scheduling_status || '').toUpperCase();
            const isReprofiled = app.is_reprofiled === true || status.includes('REPROFILING') || ovStatus.includes('REPROFILING');

            const isConcludedOV = ovStatus === 'PASSED' || ovStatus === 'FAILED' || status.includes('OV - PASSED') || status.includes('OV - FAILED') || status === 'OPS_VALIDATION_PASSED' || status === 'OPS_VALIDATION_FAILED';
            const isTerminatedOverall = ['FAILED', 'REJECTED', 'WITHDRAWN', 'FALLOUT', 'NOT_ELIGIBLE_FOR_REHIRE', 'NOT ELIGIBLE FOR REHIRE'].includes(status) || status.includes('NO_SHOW') || status.includes('NO SHOW');

            // 2. Scheduled for Ops Val
            const isScheduledOV = ovStatus === 'SCHEDULED' || schedulingStatus === 'SCHEDULED' || status === 'OPS_VALIDATION_SCHEDULED' || status === 'FOR OPS VAL SCHEDULING';
            if (isScheduledOV && !isConcludedOV && !isTerminatedOverall) {
                stats.scheduledOpsVal++;
            }

            // 3. For Reprofiling
            if (isReprofiled) {
                stats.forReprofiling++;
            }

            // 4. Concluded Ops Val
            if (isConcludedOV) {
                stats.concludedOpsVal++;
            }
        });

        // Sort by total endorsed descending
        return Object.values(metrics).sort((a, b) => b.totalEndorsed - a.totalEndorsed);
    }, [apps]);

    const baseCandidates = useMemo(() => {
        if (!selectedAccount || selectedFilter === 'DASHBOARD' || !selectedFilter) return [];
        return apps.filter(app => {
            if (getTrueAccount(app) !== selectedAccount) return false;

            const status = String(app.current_status || '').toUpperCase();
            const ovStatus = String(app.pis?.ops_validator_status || app.metadata?.ops_validator_status || '').toUpperCase();
            const schedulingStatus = String(app.recruiter_s_scheduling_status || app.metadata?.recruiter_s_scheduling_status || '').toUpperCase();
            const isReprofiled = app.is_reprofiled === true || status.includes('REPROFILING') || ovStatus.includes('REPROFILING');

            const isConcludedOV = ovStatus === 'PASSED' || ovStatus === 'FAILED' || status.includes('OV - PASSED') || status.includes('OV - FAILED') || status === 'OPS_VALIDATION_PASSED' || status === 'OPS_VALIDATION_FAILED';
            const isTerminatedOverall = ['FAILED', 'REJECTED', 'WITHDRAWN', 'FALLOUT', 'NOT_ELIGIBLE_FOR_REHIRE', 'NOT ELIGIBLE FOR REHIRE'].includes(status) || status.includes('NO_SHOW') || status.includes('NO SHOW');
            const isScheduledOV = ovStatus === 'SCHEDULED' || schedulingStatus === 'SCHEDULED' || status === 'OPS_VALIDATION_SCHEDULED' || status === 'FOR OPS VAL SCHEDULING';

            let matchType = false;
            if (selectedFilter === 'SCHEDULED') {
                matchType = isScheduledOV && !isConcludedOV && !isTerminatedOverall;
            } else if (selectedFilter === 'REPROFILING') {
                matchType = isReprofiled;
            } else if (selectedFilter === 'CONCLUDED') {
                matchType = isConcludedOV;
            } else {
                matchType = true; // TOTAL
            }
            if (!matchType) return false;
            return true;
        });
    }, [apps, selectedAccount, selectedFilter]);

    const uniqueRecruiters = useMemo(() => {
        const set = new Set<string>();
        baseCandidates.forEach(app => {
            set.add(app.assigned_recruiter_name || app.interviewer_name || 'System');
        });
        return Array.from(set).sort();
    }, [baseCandidates]);

    const uniqueStatuses = useMemo(() => {
        const set = new Set<string>();
        baseCandidates.forEach(app => {
            if (app.current_status) {
                set.add(app.current_status.replace(/_/g, ' '));
            } else {
                set.add('UNKNOWN');
            }
        });
        return Array.from(set).sort();
    }, [baseCandidates]);

    const filteredCandidates = useMemo(() => {
        return baseCandidates.filter(app => {
            if (filterRecruiter) {
                const recruiter = String(app.assigned_recruiter_name || app.interviewer_name || 'System');
                if (recruiter !== filterRecruiter) return false;
            }

            if (filterStatus) {
                const s = app.current_status ? app.current_status.replace(/_/g, ' ') : 'UNKNOWN';
                if (s !== filterStatus) return false;
            }

            return true;
        });
    }, [baseCandidates, filterRecruiter, filterStatus]);

    const getAccountImage = (accountName: string) => {
        const dept = (departmentsList || []).find((d: any) => (d.name || '').toUpperCase() === accountName.toUpperCase());
        if (dept && (dept.accountImageUrl || dept.accountImageData)) {
            if (dept.accountImageUrl) {
                return dept.accountImageUrl.startsWith('/') ? `/api${dept.accountImageUrl}` : dept.accountImageUrl;
            }
            return `data:image/jpeg;base64,${dept.accountImageData}`;
        }
        return '/chronicle-mark.svg';
    };

    if (accountMetrics.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-6 rounded-none shadow-sm text-center animate-fade-in py-20">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">No Endorsements Found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Try adjusting your filters to see account data.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 p-6 rounded-none shadow-sm text-left animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    Endorsements Analysis by Account
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {accountMetrics.map(stats => (
                    <div
                        key={stats.account}
                        onClick={() => { setSelectedAccount(stats.account); setSelectedFilter('DASHBOARD'); }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group transform hover:-translate-y-1"
                    >
                        <div className="p-4 border-b border-slate-100 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center p-1.5">
                                <img
                                    src={getAccountImage(stats.account)}
                                    alt={stats.account}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/chronicle-mark.svg';
                                    }}
                                />
                            </div>
                            <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm truncate uppercase tracking-wider">
                                {stats.account}
                            </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800/50">
                            {/* Total Endorsed */}
                            <div
                                onClick={(e) => { e.stopPropagation(); setSelectedAccount(stats.account); setSelectedFilter('TOTAL'); }}
                                className="bg-white dark:bg-slate-900 p-4 transition-colors cursor-pointer hover:bg-blue-50/50"
                            >
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Users size={12} className="text-blue-500" />
                                    Total Endorsed
                                </p>
                                <p className="text-2xl font-black text-slate-800 dark:text-slate-200">{stats.totalEndorsed}</p>
                            </div>

                            {/* Scheduled Ops Val */}
                            <div
                                onClick={(e) => { e.stopPropagation(); setSelectedAccount(stats.account); setSelectedFilter('SCHEDULED'); }}
                                className="bg-white dark:bg-slate-900 p-4 transition-colors cursor-pointer hover:bg-emerald-50/50"
                            >
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Calendar size={12} className="text-emerald-500" />
                                    Scheduled OV
                                </p>
                                <p className="text-2xl font-black text-emerald-600">{stats.scheduledOpsVal}</p>
                            </div>

                            {/* For Reprofiling */}
                            <div
                                onClick={(e) => { e.stopPropagation(); setSelectedAccount(stats.account); setSelectedFilter('REPROFILING'); }}
                                className="bg-white dark:bg-slate-900 p-4 transition-colors cursor-pointer hover:bg-amber-50/50"
                            >
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <RotateCcw size={12} className="text-amber-500" />
                                    Reprofiling
                                </p>
                                <p className="text-2xl font-black text-amber-600">{stats.forReprofiling}</p>
                            </div>

                            {/* Concluded Ops Val */}
                            <div
                                onClick={(e) => { e.stopPropagation(); setSelectedAccount(stats.account); setSelectedFilter('CONCLUDED'); }}
                                className="bg-white dark:bg-slate-900 p-4 transition-colors cursor-pointer hover:bg-purple-50/50"
                            >
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <CheckCircle size={12} className="text-purple-500" />
                                    Concluded OV
                                </p>
                                <p className="text-2xl font-black text-purple-600">{stats.concludedOpsVal}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                open={!!selectedAccount}
                onClose={() => { setSelectedAccount(null); setSelectedFilter(null); setFilterRecruiter(''); setFilterStatus(''); }}
                size="7xl"
                title={`${selectedAccount} - ${selectedFilter === 'DASHBOARD' ? 'Overview Dashboard' :
                        selectedFilter === 'SCHEDULED' ? 'Scheduled OV Candidates' :
                            selectedFilter === 'REPROFILING' ? 'Reprofiling Candidates' :
                                selectedFilter === 'CONCLUDED' ? 'Concluded OV Candidates' :
                                    'Endorsed Candidates'
                    }`}
            >
                {selectedFilter === 'DASHBOARD' ? (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex items-center justify-center min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Scheduled OV', value: accountMetrics.find(m => m.account === selectedAccount)?.scheduledOpsVal || 0 },
                                                { name: 'Reprofiling', value: accountMetrics.find(m => m.account === selectedAccount)?.forReprofiling || 0 },
                                                { name: 'Concluded OV', value: accountMetrics.find(m => m.account === selectedAccount)?.concludedOpsVal || 0 },
                                                { name: 'Other/Pending', value: Math.max(0, (accountMetrics.find(m => m.account === selectedAccount)?.totalEndorsed || 0) - (accountMetrics.find(m => m.account === selectedAccount)?.scheduledOpsVal || 0) - (accountMetrics.find(m => m.account === selectedAccount)?.forReprofiling || 0) - (accountMetrics.find(m => m.account === selectedAccount)?.concludedOpsVal || 0)) }
                                            ].filter(d => d.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {
                                                [
                                                    { name: 'Scheduled OV', value: accountMetrics.find(m => m.account === selectedAccount)?.scheduledOpsVal || 0 },
                                                    { name: 'Reprofiling', value: accountMetrics.find(m => m.account === selectedAccount)?.forReprofiling || 0 },
                                                    { name: 'Concluded OV', value: accountMetrics.find(m => m.account === selectedAccount)?.concludedOpsVal || 0 },
                                                    { name: 'Other/Pending', value: Math.max(0, (accountMetrics.find(m => m.account === selectedAccount)?.totalEndorsed || 0) - (accountMetrics.find(m => m.account === selectedAccount)?.scheduledOpsVal || 0) - (accountMetrics.find(m => m.account === selectedAccount)?.forReprofiling || 0) - (accountMetrics.find(m => m.account === selectedAccount)?.concludedOpsVal || 0)) }
                                                ].filter(d => d.value > 0).map((entry, index) => {
                                                    if (entry.name === 'Scheduled OV') return <Cell key={`cell-${index}`} fill="#10B981" />;
                                                    if (entry.name === 'Reprofiling') return <Cell key={`cell-${index}`} fill="#F59E0B" />;
                                                    if (entry.name === 'Concluded OV') return <Cell key={`cell-${index}`} fill="#8B5CF6" />;
                                                    return <Cell key={`cell-${index}`} fill="#CBD5E1" />;
                                                })
                                            }
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-4 place-content-center">
                                <div
                                    onClick={() => setSelectedFilter('TOTAL')}
                                    className="bg-white dark:bg-slate-900 border-2 border-blue-100 hover:border-blue-300 p-6 rounded-none cursor-pointer transition-all hover:shadow-md group"
                                >
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 group-hover:text-blue-500 transition-colors">
                                        <Users size={16} /> Total Endorsed
                                    </p>
                                    <p className="text-4xl font-black text-slate-800 dark:text-slate-200">{accountMetrics.find(m => m.account === selectedAccount)?.totalEndorsed || 0}</p>
                                </div>
                                <div
                                    onClick={() => setSelectedFilter('SCHEDULED')}
                                    className="bg-white dark:bg-slate-900 border-2 border-emerald-100 hover:border-emerald-300 p-6 rounded-none cursor-pointer transition-all hover:shadow-md group"
                                >
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 group-hover:text-emerald-500 transition-colors">
                                        <Calendar size={16} /> Scheduled OV
                                    </p>
                                    <p className="text-4xl font-black text-emerald-600">{accountMetrics.find(m => m.account === selectedAccount)?.scheduledOpsVal || 0}</p>
                                </div>
                                <div
                                    onClick={() => setSelectedFilter('REPROFILING')}
                                    className="bg-white dark:bg-slate-900 border-2 border-amber-100 hover:border-amber-300 p-6 rounded-none cursor-pointer transition-all hover:shadow-md group"
                                >
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 group-hover:text-amber-500 transition-colors">
                                        <RotateCcw size={16} /> Reprofiling
                                    </p>
                                    <p className="text-4xl font-black text-amber-600">{accountMetrics.find(m => m.account === selectedAccount)?.forReprofiling || 0}</p>
                                </div>
                                <div
                                    onClick={() => setSelectedFilter('CONCLUDED')}
                                    className="bg-white dark:bg-slate-900 border-2 border-purple-100 hover:border-purple-300 p-6 rounded-none cursor-pointer transition-all hover:shadow-md group"
                                >
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 group-hover:text-purple-500 transition-colors">
                                        <CheckCircle size={16} /> Concluded OV
                                    </p>
                                    <p className="text-4xl font-black text-purple-600">{accountMetrics.find(m => m.account === selectedAccount)?.concludedOpsVal || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex gap-4 items-center shrink-0">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                Total: {filteredCandidates.length}
                            </span>
                            <div className="flex-1" />
                            <select
                                value={filterRecruiter}
                                onChange={e => setFilterRecruiter(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 shadow-sm bg-white dark:bg-slate-900"
                            >
                                <option value="">Filter by Recruiter...</option>
                                {uniqueRecruiters.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-800 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 shadow-sm bg-white dark:bg-slate-900 uppercase"
                            >
                                <option value="">Filter by Status...</option>
                                {uniqueStatuses.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="max-h-[65vh] overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white dark:bg-slate-900 shadow-sm z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-800">
                                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-12 text-center">#</th>
                                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Candidate Name</th>
                                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Current Status</th>
                                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Endorsing Recruiter</th>
                                        <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Assigned Ops Val</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredCandidates.map((app, index) => {
                                        const ovStatus = String(app.pis?.ops_validator_status || app.metadata?.ops_validator_status || '').toUpperCase();
                                        return (
                                            <tr key={app.id || Math.random()} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/80 transition-colors">
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 text-center">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                                    {getCandidateName(app)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-semibold text-slate-600">
                                                            {app.current_status?.replace(/_/g, ' ') || 'UNKNOWN'}
                                                        </span>
                                                        {ovStatus && (
                                                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-none w-fit uppercase">
                                                                OV: {ovStatus}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-600 capitalize">
                                                    {app.assigned_recruiter_name || app.interviewer_name || 'System'}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-600 capitalize">
                                                    {app.assigned_ops_validator_name || app.metadata?.assigned_ops_validator_name || app.pis?.ops_validator_name || 'Unassigned'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
