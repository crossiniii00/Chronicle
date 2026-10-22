import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown, CheckCircle, XCircle, Users, Award } from 'lucide-react';
import type { Application } from '@/types/application';
import { cn } from '@/utils/formatters';


interface InitialInterviewTabProps {
    applications: Application[];
    statusFilter?: 'ALL' | 'PASSED' | 'FAILED';
}

export function InitialInterviewTab({ applications, statusFilter = 'ALL' }: InitialInterviewTabProps) {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<keyof Application | 'status'>('updated_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const initialCandidates = useMemo(() => {
        return applications.filter(app => {
            const status = String(app.current_status || '').toUpperCase();
            
            const p = app.pis || app.metadata?.pis || {};
            const rawResult = String((app as any).initial_interview_results || (app as any).initial_interview_result || (app as any).ii_result || app.pis?.initial_interview_results || app.pis?.initial_interview_result || app.metadata?.initial_interview_results || p['Initial Interview Result'] || p['Initial Interview Results'] || '').toUpperCase();
            const activeType = app.metadata?.active_interview_type;
            const pisInitial = (app.pis?.process_settings as any)?.INITIAL_INTERVIEW;
            
            const isInitialCandidate = status.includes('INITIAL') || rawResult !== '' || activeType === 'INITIAL' || pisInitial;
            if (!isInitialCandidate) return false;

            // Filter out PENDING candidates
            let displayStatus = 'PENDING';
            if (rawResult.includes('PASS')) displayStatus = 'PASSED';
            else if (rawResult.includes('FAIL')) displayStatus = 'FAILED';
            else if (rawResult.includes('RESCHEDULED') || status.includes('RESCHEDULED')) displayStatus = 'RESCHEDULED';
            else if (rawResult.includes('NO SHOW') || status.includes('NO SHOW')) displayStatus = 'NO SHOW';

            return displayStatus !== 'PENDING';
        });
    }, [applications]);

    const sortedAndFiltered = useMemo(() => {
        let result = [...initialCandidates];

        if (statusFilter === 'PASSED') {
            result = result.filter(app => {
                const p = app.pis || app.metadata?.pis || {};
                const rawResult = String((app as any).initial_interview_results || (app as any).initial_interview_result || (app as any).ii_result || app.pis?.initial_interview_results || app.pis?.initial_interview_result || app.metadata?.initial_interview_results || p['Initial Interview Result'] || p['Initial Interview Results'] || '').toUpperCase();
                return rawResult.includes('PASS');
            });
        } else if (statusFilter === 'FAILED') {
            result = result.filter(app => {
                const p = app.pis || app.metadata?.pis || {};
                const rawResult = String((app as any).initial_interview_results || (app as any).initial_interview_result || (app as any).ii_result || app.pis?.initial_interview_results || app.pis?.initial_interview_result || app.metadata?.initial_interview_results || p['Initial Interview Result'] || p['Initial Interview Results'] || '').toUpperCase();
                return rawResult.includes('FAIL');
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
    }, [initialCandidates, search, sortField, sortDirection, statusFilter]);

    const handleSort = (field: keyof Application | 'status') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const statusCounts = useMemo(() => {
        let passed = 0;
        let failed = 0;
        let rescheduled = 0;
        let noShow = 0;
        for (const app of initialCandidates) {
            const p = app.pis || app.metadata?.pis || {};
            const rawResult = String((app as any).initial_interview_results || (app as any).initial_interview_result || (app as any).ii_result || app.pis?.initial_interview_results || app.pis?.initial_interview_result || app.metadata?.initial_interview_results || p['Initial Interview Result'] || p['Initial Interview Results'] || '').toUpperCase();
            const currentStatus = String(app.current_status || '').toUpperCase();
            if (rawResult.includes('PASS')) passed++;
            else if (rawResult.includes('FAIL')) failed++;
            else if (rawResult.includes('RESCHEDULED') || currentStatus.includes('RESCHEDULED')) rescheduled++;
            else if (rawResult.includes('NO SHOW') || currentStatus.includes('NO SHOW')) noShow++;
        }
        const passRate = initialCandidates.length > 0 ? Math.round((passed / initialCandidates.length) * 100) : 0;
        return { passed, failed, rescheduled, noShow, total: initialCandidates.length, passRate };
    }, [initialCandidates]);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { title: 'Total Interviewed', value: statusCounts.total, subtitle: 'Completed interviews', color: 'border-slate-200 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 hover:shadow-[0_0_25px_rgba(100,116,139,0.12)]', icon: Users, bg: 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/50' },
                    { title: 'Passed', value: statusCounts.passed, subtitle: 'Met interview criteria', color: 'border-emerald-200/40 text-emerald-600 bg-emerald-50/40 hover:shadow-[0_0_25px_rgba(10,185,129,0.12)]', icon: CheckCircle, bg: 'bg-emerald-50/50 border border-emerald-200/40' },
                    { title: 'Failed', value: statusCounts.failed, subtitle: 'Did not meet criteria', color: 'border-rose-200/40 text-rose-600 bg-rose-50/40 hover:shadow-[0_0_25px_rgba(244,63,94,0.12)]', icon: XCircle, bg: 'bg-rose-50/50 border border-rose-200/40' },
                    { title: 'Pass Rate', value: `${statusCounts.passRate}%`, subtitle: 'Overall pass percentage', color: 'border-violet-200/40 text-violet-600 bg-violet-50/40 hover:shadow-[0_0_25px_rgba(139,92,246,0.12)]', icon: Award, bg: 'bg-violet-50/50 border border-violet-200/40' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800/60 flex items-center justify-between group transition-all duration-300">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
                            <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2 font-sans tabular-nums">{stat.value}</h4>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{stat.subtitle}</p>
                        </div>
                        <div className={cn("p-2.5 rounded-xl transition-all group-hover:scale-110", stat.bg)}>
                            <stat.icon size={18} />
                        </div>
                    </div>
                ))}
            </div>

        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none flex flex-col w-full shadow-sm">
            <div className="p-4 border-b border-surface-200 bg-[#faf9f8] flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-[#323130] dark:text-slate-300 tracking-tight">Initial Interview Candidates ({initialCandidates.length})</h3>
                <div className="relative w-72">
                    <input
                        type="text"
                        placeholder="Search candidates, roles, accounts..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 pl-8 pr-4 py-1.5 rounded-none text-[13px] outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-colors"
                    />
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#605e5c] dark:text-slate-400" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#faf9f8] text-[#323130] dark:text-slate-300 font-semibold border-b border-surface-200 select-none text-[11px] uppercase tracking-wide">
                            <th onClick={() => handleSort('applicant_name')} className="px-5 py-3 cursor-pointer hover:bg-[#edebe9] dark:bg-slate-800 transition-none">
                                <div className="flex items-center gap-1">Candidate <ArrowUpDown size={12} className="text-[#605e5c] dark:text-slate-400" /></div>
                            </th>
                            <th onClick={() => handleSort('position_title')} className="px-5 py-3 cursor-pointer hover:bg-[#edebe9] dark:bg-slate-800 transition-none">
                                <div className="flex items-center gap-1">Position <ArrowUpDown size={12} className="text-[#605e5c] dark:text-slate-400" /></div>
                            </th>
                            <th onClick={() => handleSort('department')} className="px-5 py-3 cursor-pointer hover:bg-[#edebe9] dark:bg-slate-800 transition-none">
                                <div className="flex items-center gap-1">Account <ArrowUpDown size={12} className="text-[#605e5c] dark:text-slate-400" /></div>
                            </th>
                            <th onClick={() => handleSort('initial_interview_date' as any)} className="px-5 py-3 cursor-pointer hover:bg-[#edebe9] dark:bg-slate-800 transition-none">
                                <div className="flex items-center gap-1">Date Interviewed <ArrowUpDown size={12} className="text-[#605e5c] dark:text-slate-400" /></div>
                            </th>
                            <th className="px-5 py-3">
                                <div className="flex items-center gap-1">Assigned Recruiter</div>
                            </th>
                            <th className="px-5 py-3 text-center">
                                <div className="flex items-center gap-1 justify-center">Status</div>
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
                                const recruiter = c.assigned_recruiter_name || c.interviewer_name || c.metadata?.assigned_recruiter_name || 'Unassigned';
                                const p = c.pis || c.metadata?.pis || {};
                                const rawResult = String((c as any).initial_interview_results || (c as any).initial_interview_result || (c as any).ii_result || c.pis?.initial_interview_results || c.pis?.initial_interview_result || c.metadata?.initial_interview_results || p['Initial Interview Result'] || p['Initial Interview Results'] || '').toUpperCase();
                                const currentStatus = String(c.current_status || '').toUpperCase();
                                
                                let displayStatus = 'PENDING';
                                if (rawResult.includes('PASS')) displayStatus = 'PASSED';
                                else if (rawResult.includes('FAIL')) displayStatus = 'FAILED';
                                else if (rawResult.includes('RESCHEDULED') || currentStatus.includes('RESCHEDULED')) displayStatus = 'RESCHEDULED';
                                else if (rawResult.includes('NO SHOW') || currentStatus.includes('NO SHOW')) displayStatus = 'NO SHOW';

                                let statusColor = "text-[#605e5c] dark:text-slate-400 bg-[#f3f2f1] border-surface-200";
                                if (displayStatus === 'PASSED') statusColor = "text-[#107c10] bg-[#dff6dd] border-[#107c10]";
                                else if (displayStatus === 'FAILED') statusColor = "text-[#a4262c] bg-[#fde7e9] border-[#a4262c]";
                                else if (displayStatus === 'RESCHEDULED') statusColor = "text-[#d83b01] bg-[#fdf3f0] border-[#d83b01]";
                                else if (displayStatus === 'NO SHOW') statusColor = "text-[#323130] dark:text-slate-300 bg-[#e1dfdd] border-[#8a8886] dark:border-slate-700";

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
                                        <td className="px-5 py-3 text-[11px] text-[#605e5c] dark:text-slate-400 font-medium">
                                            {(c as any).initial_interview_date 
                                                ? new Date((c as any).initial_interview_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
                                                : (c.updated_at ? new Date(c.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A')}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[12px] text-[#323130] dark:text-slate-300 font-medium">
                                                {recruiter}
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
        </div>
    );
}
