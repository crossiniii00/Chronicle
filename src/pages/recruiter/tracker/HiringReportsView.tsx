import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, List, FileSpreadsheet, Download,
    Filter, TrendingUp, Users, Target, CheckCircle2,
    Calendar, Building2, Layers, Edit3, Plus, Trash,
    Check, X, Save
} from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { formatDate } from './utils/tableHelpers';

import { Loader2, AlertCircle } from 'lucide-react';
import { PositionService } from '@/services/PositionService';
import type { Position } from '@/types/position';
import { ReportConfigService } from '@/services/ReportConfigService';
import { DepartmentService, type Department } from '@/services/DepartmentService';

interface ReportGroup {
    requisitionType: 'Growth' | 'Attrition';
    account: string;
    lob: string;
    month: string;
    wave: string;
    classDate: string;
    hcReq: number;
    hired: number;
    day1Hc: number;
    applicants: Application[];
}

export function HiringReportsView({ hideHeader = false, applications: propApps }: { hideHeader?: boolean, applications?: Application[] }) {
    const [applications, setApplications] = useState<Application[]>(propApps || []);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [reportData, setReportData] = useState<ReportGroup[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [originalData, setOriginalData] = useState<ReportGroup[]>([]);
    const [reportConfigs, setReportConfigs] = useState<any>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);

    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    useEffect(() => {
        if (propApps) {
            setApplications(propApps);
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                const [apps, configs, depts, pos] = await Promise.all([
                    ApplicationService.getAll(),
                    ReportConfigService.getAll(),
                    DepartmentService.getAll(),
                    PositionService.getAll()
                ]);
                const appsList = Array.isArray(apps) ? apps : (apps as any)?.data || [];
                const posList = Array.isArray(pos) ? pos : (pos as any)?.data || [];

                console.log('[ReportsView] Apps count:', appsList.length);
                console.log('[ReportsView] Configs:', configs);
                console.log('[ReportsView] Depts:', depts);
                console.log('[ReportsView] Positions count:', posList.length);
                
                setApplications(appsList as Application[]);
                setReportConfigs(configs as Record<string, Record<string, any>>);
                setDepartments(Array.isArray(depts) ? depts : (depts as any)?.data || []);
                setPositions(posList as Position[]);
            } catch (err) {
                console.error('[ReportsView] Load Error:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (applications.length > 0) {
            const groups: Record<string, ReportGroup> = {};
            const hiringOverrides = reportConfigs?.hiring_report?.overrides || {};

            // SYNC ACCOUNTS FROM REGISTRY
            const appAccounts = Array.from(new Set(applications.map(a => (a.department || 'General Pool').trim().toUpperCase())));
            
            applications.forEach(app => {
                // Normalize Account Name
                let account = (app.department || 'General Pool').trim().toUpperCase();
                
                // Anomaly Safeguard
                const anomalyKeywords = [
                    'YES', 'ASAP', 'NO', 'WILLING', 'NEXT WEEK', 'EFFECTIVE DATE', 'TBD', '-', 'N/A', 
                    'NOTICE', 'WEEK', 'MONTH', 'MARCH', 'APRIL', 'IMMEDIATELY', 'ANYTIME', 'PROCESS', 'HAVE', 'WORK'
                ];
                const isAnomaly = anomalyKeywords.some(word => account.includes(word)) || 
                                 /^\d/.test(account) || 
                                 account.length > 30;

                if (isAnomaly) {
                    account = 'GENERAL POOL';
                }

                if (account === 'EXACT SCIENCE') account = 'EXACT SCIENCES';
                if (account === 'DOOR DASH') account = 'DOORDASH';
                if (account.includes('PUROLATOR')) account = 'PUROLATOR';
                
                let lob = (app.position_title || 'General LOB').trim().toUpperCase();
                lob = lob.replace(/ & /g, ' AND ');

                const wave = (app.master_wave || 'Unassigned').trim().toUpperCase();
                const key = `${account}-${wave}`;

                if (!groups[key]) {
                    const override = hiringOverrides[key] || {};
                    
                    let month = 'TBD';
                    if (app.master_training_start_date && app.master_training_start_date !== 'TBD') {
                        const d = new Date(app.master_training_start_date);
                        if (!isNaN(d.getTime())) {
                            month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
                        }
                    }

                    const targetDeptName = account.trim().toLowerCase();
                    const internalPos = positions.find(p => p.department?.trim().toLowerCase() === targetDeptName && p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA'));
                    const databaseQuota = internalPos ? Number(internalPos.hiring_quota) : 0;
                    
                    const deptObj = departments.find(d => {
                        const cleanD = d.name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                        const cleanA = account.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                        return cleanD === cleanA;
                    });
                    const deptHiringQuota = deptObj?.hiring_quota || 0;
                    
                    const localQuota = parseInt(localStorage.getItem(`hiring_quota_${targetDeptName}`) || '0');
                    const deptQuota = databaseQuota || deptHiringQuota || localQuota || 0;

                    groups[key] = {
                        requisitionType: override.requisitionType || 'Growth',
                        account: account,
                        lob: lob,
                        month: month,
                        wave: wave,
                        classDate: app.master_training_start_date || 'TBD',
                        hcReq: override.hcReq !== undefined ? override.hcReq : deptQuota,
                        hired: 0,
                        day1Hc: 0,
                        applicants: []
                    };
                }

                groups[key].applicants.push(app);
                
                // BROAD STATUS MAPPING
                const status = (app.current_status || '').toUpperCase().replace(/_/g, ' ');
                const isHired = ['HIRED', 'HIRED PROCESSED', 'ACCEPTED OFFER'].includes(status);
                
                if (isHired) {
                    groups[key].hired++;
                    groups[key].day1Hc++;
                }
            });

            // Merge any manual rows that don't have apps
            Object.keys(hiringOverrides).forEach(key => {
                if (!groups[key]) {
                    const override = hiringOverrides[key];
                    groups[key] = {
                        ...override,
                        applicants: []
                    };
                }
            });

            const initialData = Object.values(groups);
            setReportData(initialData);
            setOriginalData(JSON.parse(JSON.stringify(initialData)));
            if (initialData.length > 0 && selectedIdx === null) setSelectedIdx(0);
        }
    }, [applications, reportConfigs, departments, positions]);

    const handleAddRow = () => {
        const newRow: ReportGroup = {
            requisitionType: 'Growth',
            account: 'New Account',
            lob: 'New Position',
            month: 'DECEMBER',
            wave: 'WAVE 00',
            classDate: 'TBD',
            hcReq: 0,
            hired: 0,
            day1Hc: 0,
            applicants: []
        };
        setReportData(prev => [...prev, newRow]);
    };

    const handleDeleteRow = (index: number) => {
        setReportData(prev => prev.filter((_, i) => i !== index));
        if (selectedIdx === index) setSelectedIdx(null);
    };

    const handleUpdateCell = (index: number, field: keyof ReportGroup, value: any) => {
        setReportData(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const toggleEdit = () => {
        if (isEditing) {
            setReportData(JSON.parse(JSON.stringify(originalData)));
        } else {
            setOriginalData(JSON.parse(JSON.stringify(reportData)));
        }
        setIsEditing(!isEditing);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Build overrides map
            const overrides: any = {};
            reportData.forEach(group => {
                const key = `${group.account}-${group.wave}`;
                overrides[key] = {
                    requisitionType: group.requisitionType,
                    hcReq: group.hcReq,
                    // If it's a manual row, save other fields too
                    ...(group.applicants.length === 0 ? {
                        account: group.account,
                        lob: group.lob,
                        month: group.month,
                        wave: group.wave,
                        classDate: group.classDate
                    } : {})
                };
            });

            await ReportConfigService.update('hiring_report', { overrides });
            setOriginalData(JSON.parse(JSON.stringify(reportData)));
            setIsEditing(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const totals = useMemo(() => {
        return reportData.reduce((acc, curr) => ({
            hcReq: acc.hcReq + Number(curr.hcReq || 0),
            hired: acc.hired + Number(curr.hired || 0),
            day1Hc: acc.day1Hc + Number(curr.day1Hc || 0)
        }), { hcReq: 0, hired: 0, day1Hc: 0 });
    }, [reportData]);

    const selectedApplicants = useMemo(() => {
        if (selectedIdx === null || !reportData[selectedIdx]) return [];
        return reportData[selectedIdx].applicants.filter(a => {
            const status = (a.current_status || '').toUpperCase().replace(/_/g, ' ');
            return ['HIRED', 'HIRED PROCESSED', 'ACCEPTED OFFER'].includes(status);
        });
    }, [selectedIdx, reportData]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#002060] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Compiling Report...</p>
        </div>
    );

    return (
        <div className="space-y-6 font-sans">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#002060] tracking-tight">Hiring Update Report</h1>
                    <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mt-1">
                        Operational Metrics • {new Date().getFullYear()}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <div className="flex items-center gap-2 mr-2 border-r border-surface-200 pr-4">
                            <button
                                onClick={handleAddRow}
                                className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 text-[10px] font-bold uppercase rounded-none hover:bg-primary-100 transition-all shadow-sm"
                            >
                                <Plus size={14} /> Add Row
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-3 py-2 bg-[#107c10] text-white text-[10px] font-bold uppercase rounded-none hover:bg-[#107c10]/90 transition-all shadow-sm disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {isSaving ? 'Saving' : 'Save'}
                            </button>
                            <button
                                onClick={toggleEdit}
                                className="flex items-center gap-2 px-3 py-2 bg-surface-100 text-surface-600 text-[10px] font-bold uppercase rounded-none hover:bg-surface-200 transition-all shadow-sm"
                            >
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={toggleEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 text-surface-700 text-[10px] font-bold uppercase rounded-none hover:bg-surface-50 transition-all shadow-sm mr-2"
                        >
                            <Edit3 size={14} /> Edit Report
                        </button>
                    )}

                    <button className="flex items-center gap-2 px-4 py-2 bg-[#107c10] hover:bg-[#107c10]/90 text-white text-[10px] font-bold uppercase rounded-none transition-all shadow-sm">
                        <Download size={14} /> Export XLS
                    </button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 items-start">
                {/* Left Table: Aggregate Summary */}
                <div className="w-full xl:w-[70%] overflow-x-auto bg-white border border-surface-200 rounded-none shadow-md">
                    <div className="min-w-[900px]">
                        {/* Main Title Row */}
                        <div className="bg-[#002060] text-white py-3 px-6 text-center border-b border-surface-200">
                            <h2 className="text-[12px] font-bold uppercase tracking-[0.4em]">
                                HIRING UPDATE FOR {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                            </h2>
                        </div>

                        {/* Excel Headers */}
                        <div className={cn(
                            "grid bg-[#002060] text-white text-[10px] font-bold uppercase border-b border-white/20",
                            isEditing ? "grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_1fr_80px_80px_80px_80px_80px_80px_40px]" : "grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_1fr_80px_80px_80px_80px_80px_80px]"
                        )}>
                            <div className="p-3 border-r border-white/20 text-center">Requisition</div>
                            <div className="p-3 border-r border-white/20">Account</div>
                            <div className="p-3 border-r border-white/20">LOB</div>
                            <div className="p-3 border-r border-white/20 text-center">Month</div>
                            <div className="p-3 border-r border-white/20 text-center">Wave</div>
                            <div className="p-3 border-r border-white/20 text-center">Class</div>
                            <div className="p-3 border-r border-white/20 text-center bg-[#ead1dc]/20">HC REQ</div>
                            <div className="p-3 border-r border-white/20 text-center">Passed</div>
                            <div className="p-3 border-r border-white/20 text-center bg-[#cfe2f3]/20">Fill %</div>
                            <div className="p-3 border-r border-white/20 text-center">D1 HC</div>
                            <div className="p-3 border-r border-white/20 text-center">Fallout</div>
                            <div className="p-3 text-center border-r border-white/20">Show %</div>
                            {isEditing && <div className="p-3 text-center">Actions</div>}
                        </div>

                        {/* Grouped Rows */}
                        <div className="divide-y divide-surface-100">
                            {reportData.map((group, idx) => {
                                const fillRate = Number(group.hcReq) > 0 ? (Number(group.hired || 0) / Number(group.hcReq)) * 100 : 0;
                                const fallout = Number(group.hired || 0) - Number(group.day1Hc || 0);
                                const showRate = Number(group.hired || 0) > 0 ? (Number(group.day1Hc || 0) / Number(group.hired || 0)) * 100 : 0;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => !isEditing && setSelectedIdx(idx)}
                                        className={cn(
                                            "grid text-[10px] font-bold text-[#323130] transition-all cursor-pointer",
                                            selectedIdx === idx ? "bg-[#cfe2f3]/30 ring-1 ring-inset ring-[#cfe2f3]" : "hover:bg-surface-50",
                                            isEditing ? "grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_1fr_80px_80px_80px_80px_80px_80px_40px]" : "grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_1fr_80px_80px_80px_80px_80px_80px]"
                                        )}
                                    >
                                        {isEditing ? (
                                            <>
                                                <div className="border-r border-surface-100 flex items-center px-1">
                                                    <input type="text" value={group.requisitionType} onChange={(e) => handleUpdateCell(idx, 'requisitionType', e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold text-center focus:ring-0 uppercase" />
                                                </div>
                                                <div className="border-r border-surface-100 flex items-center px-1">
                                                    <input type="text" value={group.account} onChange={(e) => handleUpdateCell(idx, 'account', e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold focus:ring-0 uppercase" />
                                                </div>
                                                <div className="border-r border-surface-100 flex items-center px-1">
                                                    <input type="text" value={group.lob} onChange={(e) => handleUpdateCell(idx, 'lob', e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold focus:ring-0 uppercase" />
                                                </div>
                                                <div className="border-r border-surface-100 flex items-center px-1">
                                                    <input type="text" value={group.month} onChange={(e) => handleUpdateCell(idx, 'month', e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold text-center focus:ring-0 uppercase" />
                                                </div>
                                                <div className="border-r border-surface-100 flex items-center px-1">
                                                    <input type="text" value={group.wave} onChange={(e) => handleUpdateCell(idx, 'wave', e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold text-center focus:ring-0 uppercase" />
                                                </div>
                                                <div className="border-r border-surface-100 flex items-center px-1">
                                                    <input type="text" value={group.classDate} onChange={(e) => handleUpdateCell(idx, 'classDate', e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold text-center focus:ring-0 uppercase" />
                                                </div>
                                                <div className="border-r border-surface-100 flex items-center px-1 bg-[#ead1dc]/30">
                                                    <input type="number" value={group.hcReq} onChange={(e) => handleUpdateCell(idx, 'hcReq', parseInt(e.target.value) || 0)} className="w-full bg-transparent border-none text-[9px] font-bold text-center focus:ring-0" />
                                                </div>
                                                <div className="border-r border-surface-100 flex items-center px-1">
                                                    <input type="number" value={group.hired} onChange={(e) => handleUpdateCell(idx, 'hired', parseInt(e.target.value) || 0)} className="w-full bg-transparent border-none text-[9px] font-bold text-center focus:ring-0" />
                                                </div>
                                                <div className="p-3 border-r border-surface-100 text-center bg-[#cfe2f3]/30">{fillRate.toFixed(1)}%</div>
                                                <div className="border-r border-surface-100 flex items-center px-1">
                                                    <input type="number" value={group.day1Hc} onChange={(e) => handleUpdateCell(idx, 'day1Hc', parseInt(e.target.value) || 0)} className="w-full bg-transparent border-none text-[9px] font-bold text-center focus:ring-0" />
                                                </div>
                                                <div className="p-3 border-r border-surface-100 text-center text-red-600">{fallout}</div>
                                                <div className="p-3 border-r border-surface-100 text-center font-bold">{showRate.toFixed(1)}%</div>
                                                <div className="flex items-center justify-center">
                                                    <button onClick={() => handleDeleteRow(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded-sm"><Trash size={12} /></button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-3 border-r border-surface-100 text-center uppercase">{group.requisitionType}</div>
                                                <div className="p-3 border-r border-surface-100 uppercase">{group.account}</div>
                                                <div className="p-3 border-r border-surface-100 uppercase">{group.lob}</div>
                                                <div className="p-3 border-r border-surface-100 text-center uppercase">{group.month}</div>
                                                <div className="p-3 border-r border-surface-100 text-center uppercase">{group.wave}</div>
                                                <div className="p-3 border-r border-surface-100 text-center uppercase">{group.classDate}</div>
                                                <div className="p-3 border-r border-surface-100 text-center bg-[#ead1dc]/30 font-black">{group.hcReq}</div>
                                                <div className="p-3 border-r border-surface-100 text-center">{group.hired}</div>
                                                <div className={cn(
                                                    "p-3 border-r border-surface-100 text-center font-black",
                                                    fillRate < 80 ? "text-red-500 bg-red-50/50" : 
                                                    fillRate < 100 ? "text-amber-600 bg-amber-50/50" : 
                                                    "text-emerald-600 bg-emerald-50/50"
                                                )}>
                                                    {fillRate.toFixed(1)}%
                                                </div>
                                                <div className="p-3 border-r border-surface-100 text-center">{group.day1Hc}</div>
                                                <div className={cn(
                                                    "p-3 border-r border-surface-100 text-center font-bold",
                                                    fallout > 0 ? "text-red-600 bg-red-50" : "text-surface-400"
                                                )}>
                                                    {fallout}
                                                </div>
                                                <div className="p-3 text-center font-black">{showRate.toFixed(1)}%</div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total Footer */}
                        <div className={cn(
                            "grid bg-[#002060] text-white text-[10px] font-black uppercase",
                            isEditing ? "grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_1fr_80px_80px_80px_80px_80px_80px_40px]" : "grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_1fr_80px_80px_80px_80px_80px_80px]"
                        )}>
                            <div className="p-3 border-r border-white/20 col-span-6 pl-6 tracking-widest">TOTAL</div>
                            <div className="p-3 border-r border-white/20 text-center">{totals.hcReq}</div>
                            <div className="p-3 border-r border-white/20 text-center">{totals.hired}</div>
                            <div className="p-3 border-r border-white/20 text-center">{totals.hcReq > 0 ? (totals.hired / totals.hcReq * 100).toFixed(1) : '0.0'}%</div>
                            <div className="p-3 border-r border-white/20 text-center">{totals.day1Hc}</div>
                            <div className="p-3 border-r border-white/20 text-center">{totals.hired - totals.day1Hc}</div>
                            <div className="p-3 border-r border-white/20 text-center">{totals.hired > 0 ? (totals.day1Hc / totals.hired * 100).toFixed(1) : '0.0'}%</div>
                        </div>
                    </div>
                </div>

                {/* Right Table: Candidate Breakdown */}
                <div className="flex-1 w-full bg-white border border-surface-200 rounded-sm shadow-md overflow-hidden min-h-[400px]">
                    <div className="bg-[#f8f9fa] border-b border-surface-200 p-3 flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-[#002060] uppercase tracking-widest">Candidate Breakdown</h3>
                        <span className="text-[9px] font-bold text-surface-400 uppercase tracking-tighter">
                            {selectedIdx !== null ? reportData[selectedIdx]?.account : 'Select a row'} • {selectedApplicants.length} Passed
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f3f2f1] text-[9px] font-black text-[#605e5c] uppercase border-b border-surface-200">
                                    <th className="p-3 w-10 text-center">#</th>
                                    <th className="p-3">Legal Name</th>
                                    <th className="p-3">Preferred Name</th>
                                    <th className="p-3">Date of Birth</th>
                                    <th className="p-3">JO Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100">
                                {selectedApplicants.length > 0 ? (
                                    selectedApplicants.map((app, i) => (
                                        <tr key={app.id} className="text-[10px] font-bold text-[#323130] hover:bg-[#faf9f8] transition-colors">
                                            <td className="p-3 text-center text-surface-400">{i + 1}</td>
                                            <td className="p-3 uppercase">{app.applicant_name}</td>
                                            <td className="p-3 uppercase text-[#d13438]">{app.master_first_name || '-'}</td>
                                            <td className="p-3 text-surface-500">{formatDate((app.pis as any)?.birth_date, false) || '-'}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase tracking-tighter">
                                                    Hired
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-surface-300 text-[10px] font-bold uppercase tracking-widest">
                                            No candidates in this group yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
