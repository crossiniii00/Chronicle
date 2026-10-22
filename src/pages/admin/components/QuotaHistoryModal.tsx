import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Users } from 'lucide-react';
import type { HiringQuotaHistory } from '@/services/PositionService';
import type { Application } from '@/types';

export type QuotaHistoryMetric = 'quota' | 'hired' | 'processed' | 'fallout';

export interface QuotaHistoryDrilldownData {
    item: HiringQuotaHistory;
    metric: QuotaHistoryMetric;
}

interface QuotaHistoryModalProps {
    quotaHistoryDrilldown: QuotaHistoryDrilldownData | null;
    setQuotaHistoryDrilldown: (drilldown: QuotaHistoryDrilldownData | null) => void;
    quotaHistoryMetricLabels: Record<QuotaHistoryMetric, string>;
    getDurationLabel: (start?: string | null, end?: string | null) => string;
    toDateInputValue: (value?: string | null) => string;
    quotaHistoryDrilldownApps: Application[];
    getSeasonActivityDate: (app: Application) => string;
}

export function QuotaHistoryModal({
    quotaHistoryDrilldown, setQuotaHistoryDrilldown, quotaHistoryMetricLabels, getDurationLabel, toDateInputValue, quotaHistoryDrilldownApps, getSeasonActivityDate
}: QuotaHistoryModalProps) {
    if (!quotaHistoryDrilldown) return null;

    return (
        <Modal
            open={!!quotaHistoryDrilldown}
            onClose={() => setQuotaHistoryDrilldown(null)}
            title={`${quotaHistoryDrilldown ? quotaHistoryMetricLabels[quotaHistoryDrilldown.metric] : 'Quota'} Details`}
            size="lg"
        >
            <div className="space-y-5 text-left">
                <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 rounded-none p-4 grid grid-cols-4 gap-4">
                    <div>
                        <span className="block text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide">Season</span>
                        <span className="block text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 mt-1">
                            {quotaHistoryDrilldown.item.startDate ? new Date(quotaHistoryDrilldown.item.startDate).toLocaleDateString() : 'No start'} - {quotaHistoryDrilldown.item.endDate ? new Date(quotaHistoryDrilldown.item.endDate).toLocaleDateString() : 'No end'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide">Duration</span>
                        <span className="block text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 mt-1">
                            {getDurationLabel(toDateInputValue(quotaHistoryDrilldown.item.startDate), toDateInputValue(quotaHistoryDrilldown.item.endDate))}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide">Closed</span>
                        <span className="block text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 mt-1">
                            {new Date(quotaHistoryDrilldown.item.closedAt).toLocaleString()}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide">Selected Metric</span>
                        <span className="block text-[13px] font-semibold text-[#0078d4] mt-1">
                            {quotaHistoryMetricLabels[quotaHistoryDrilldown.metric]}
                        </span>
                    </div>
                </div>

                {quotaHistoryDrilldown.metric === 'quota' ? (
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Quota', value: quotaHistoryDrilldown.item.quota, tone: 'text-[#201f1e] dark:text-slate-200' },
                            { label: 'Hired', value: quotaHistoryDrilldown.item.hiredCount, tone: 'text-[#107c10]' },
                            { label: 'Processed', value: quotaHistoryDrilldown.item.totalApplicants, tone: 'text-[#005a9e]' },
                            { label: 'Fallout', value: quotaHistoryDrilldown.item.failedCount, tone: 'text-[#a4262c]' }
                        ].map(stat => (
                            <div key={stat.label} className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none px-4 py-3">
                                <span className="block text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wide">{stat.label}</span>
                                <span className={`block text-2xl font-semibold mt-2 ${stat.tone}`}>{stat.value}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none overflow-hidden">
                        <div className="px-4 py-3 bg-[#faf9f8] border-b border-[#edebe9] dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-[12px] font-semibold text-[#201f1e] dark:text-slate-200 uppercase tracking-wide">
                                {quotaHistoryMetricLabels[quotaHistoryDrilldown.metric]} Candidates
                            </h3>
                            <span className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400">{quotaHistoryDrilldownApps.length} records</span>
                        </div>
                        {quotaHistoryDrilldownApps.length > 0 ? (
                            <div className="max-h-[360px] overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[#faf9f8] z-10">
                                        <tr className="border-b border-[#edebe9] dark:border-slate-800">
                                            <th className="px-4 py-2.5 text-[9px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Candidate</th>
                                            <th className="px-4 py-2.5 text-[9px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Position</th>
                                            <th className="px-4 py-2.5 text-[9px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-2.5 text-[9px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider text-right">Activity Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#edebe9]">
                                        {quotaHistoryDrilldownApps.map(app => (
                                            <tr key={app.id} className="hover:bg-[#faf9f8]">
                                                <td className="px-4 py-3">
                                                    <div className="text-[12px] font-semibold text-[#201f1e] dark:text-slate-200">{app.applicant_name}</div>
                                                    <div className="text-[9px] font-mono text-[#a19f9d] uppercase">{app.applicant_id || app.id.slice(0, 8)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-tight">{app.position_title}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 bg-[#eff6fc] dark:bg-slate-800 text-[#005a9e] border border-[#c7e0f4] rounded-none text-[9px] font-bold uppercase tracking-wide">
                                                        {app.current_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-[11px] font-semibold text-[#605e5c] dark:text-slate-400">
                                                    {new Date(getSeasonActivityDate(app) || app.updated_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-10 text-center">
                                <Users size={28} className="mx-auto text-[#c8c6c4] mb-3" />
                                <p className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-widest">No candidate records found for this metric</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
