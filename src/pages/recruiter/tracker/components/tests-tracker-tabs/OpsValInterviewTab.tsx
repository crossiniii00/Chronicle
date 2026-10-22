import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown, Layers } from 'lucide-react';
import type { Application } from '@/types/application';
import { cn } from '@/utils/formatters';

interface OpsValInterviewTabProps {
    applications: Application[];
    statusFilter?: 'ALL' | 'PASSED' | 'FAILED';
}

export function OpsValInterviewTab({ applications, statusFilter = 'ALL' }: OpsValInterviewTabProps) {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<keyof Application | 'status'>('updated_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const opsValCandidates = useMemo(() => {
        return applications.filter(app => {
            const status = String(app.current_status || '').toUpperCase();
            const ovStatus = String(app.metadata?.ops_validator_status || '').toUpperCase();
            const ovEmail = app.metadata?.ops_validator_email;
            
            const isOpsVal = status.includes('OPS_VAL') || status === 'ENDORSED' || app.metadata?.ops_validator_status || ovEmail;
            if (!isOpsVal) return false;

            let displayStatus = 'PENDING';
            if (ovStatus.includes('PASS')) displayStatus = 'PASSED';
            else if (ovStatus.includes('FAIL')) displayStatus = 'FAILED';

            return displayStatus === 'PASSED' || displayStatus === 'FAILED';
        });
    }, [applications]);

    const sortedAndFiltered = useMemo(() => {
        let result = [...opsValCandidates];

        if (statusFilter === 'PASSED') {
            result = result.filter(c => {
                const ovStatus = String(c.metadata?.ops_validator_status || '').toUpperCase();
                return ovStatus.includes('PASS');
            });
        } else if (statusFilter === 'FAILED') {
            result = result.filter(c => {
                const ovStatus = String(c.metadata?.ops_validator_status || '').toUpperCase();
                return ovStatus.includes('FAIL');
            });
        }

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(c =>
                c.applicant_name.toLowerCase().includes(q) ||
                (c.position_title || '').toLowerCase().includes(q) ||
                (c.department || '').toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            let valA: any = a[sortField as keyof Application];
            let valB: any = b[sortField as keyof Application];

            if (sortField === 'status') {
                valA = a.current_status || '';
                valB = b.current_status || '';
            }

            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            if (typeof valA === 'string') {
                return sortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            } else {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
        });

        return result;
    }, [opsValCandidates, search, sortField, sortDirection, statusFilter]);

    const handleSort = (field: keyof Application | 'status') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none flex flex-col overflow-hidden w-full">
            <div className="p-4 border-b border-surface-200 flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-[#323130] dark:text-slate-300 tracking-tight">Ops Val Interview Candidates ({opsValCandidates.length})</h3>
                <div className="relative w-72">
                    <input
                        type="text"
                        placeholder="Search candidates, roles, accounts..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-surface-200 pl-8 pr-4 py-1.5 rounded-none text-[12px] outline-none focus:border-[#323130] transition-colors placeholder:text-[#a19f9d] text-[#323130] dark:text-slate-300"
                    />
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605e5c] dark:text-slate-400" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                    <thead>
                        <tr className="bg-white dark:bg-slate-900 text-[#605e5c] dark:text-slate-400 font-semibold border-b border-surface-200 select-none text-[11px] tracking-wide">
                            <th onClick={() => handleSort('applicant_name')} className="px-5 py-3 cursor-pointer hover:bg-[#f3f2f1] transition-none">
                                <div className="flex items-center gap-1">Candidate <ArrowUpDown size={12} /></div>
                            </th>
                            <th onClick={() => handleSort('position_title')} className="px-5 py-3 cursor-pointer hover:bg-[#f3f2f1] transition-none">
                                <div className="flex items-center gap-1">Position <ArrowUpDown size={12} /></div>
                            </th>
                            <th onClick={() => handleSort('department')} className="px-5 py-3 cursor-pointer hover:bg-[#f3f2f1] transition-none">
                                <div className="flex items-center gap-1">Account <ArrowUpDown size={12} /></div>
                            </th>
                            <th className="px-5 py-3">
                                <div className="flex items-center gap-1">Ops Validator</div>
                            </th>
                            <th onClick={() => handleSort('status')} className="px-5 py-3 cursor-pointer hover:bg-[#f3f2f1] transition-none text-center">
                                <div className="flex items-center gap-1 justify-center">Status <ArrowUpDown size={12} /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edebe9]">
                        {sortedAndFiltered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-[#605e5c] dark:text-slate-400 font-semibold uppercase text-[12px] tracking-wide">
                                    No candidates found.
                                </td>
                            </tr>
                        ) : (
                            sortedAndFiltered.map((c, idx) => {
                                const rawResult = String(c.metadata?.ops_validator_status || '').toUpperCase();
                                let displayStatus = 'PENDING';
                                if (rawResult.includes('PASS')) displayStatus = 'PASSED';
                                else if (rawResult.includes('FAIL')) displayStatus = 'FAILED';

                                let statusColor = "text-[#605e5c] dark:text-slate-400 bg-[#f3f2f1] border-surface-200";
                                if (displayStatus === 'PASSED') statusColor = "text-[#107c10] bg-[#dff6dd] border-[#107c10]";
                                else if (displayStatus === 'FAILED') statusColor = "text-[#a4262c] bg-[#fde7e9] border-[#a4262c]";

                                return (
                                    <tr key={c.id} className="hover:bg-[#f3f2f1] transition-none group">
                                        <td className="px-5 py-3">
                                            <div className="font-semibold text-[#323130] dark:text-slate-300 text-[13px]">{idx + 1}. {c.applicant_name}</div>
                                            <div className="text-[11px] text-[#605e5c] dark:text-slate-400">{c.applicant_email}</div>
                                        </td>
                                        <td className="px-5 py-3 font-semibold text-[#323130] dark:text-slate-300 text-[12px]">{c.position_title || 'N/A'}</td>
                                        <td className="px-5 py-3">
                                            <span className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-surface-200 text-[#605e5c] dark:text-slate-400 font-semibold uppercase tracking-wide text-[10px] rounded-none">
                                                {c.department || 'GENERAL'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[12px] text-[#323130] dark:text-slate-300 font-medium">
                                                {c.assigned_ops_validator_name || c.metadata?.ops_validator_name || c.metadata?.ops_validator_email || 'Unassigned'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={cn("px-3 py-1 rounded-none text-[11px] font-semibold uppercase tracking-wide border", statusColor)}>
                                                {displayStatus}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
